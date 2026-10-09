const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

function nuevaApp({storage={}, respuesta, onPost}={}){
  let pend=[], ahora=0;
  const posts=[];
  const dom = new JSDOM(html, {
    url:"https://egpais.workers.dev/", runScripts:"dangerously", pretendToBeVisual:false,
    beforeParse(win){
      win.setTimeout=(fn,ms)=>{const id=pend.length;pend.push({fn,at:ahora+(ms||0),id});return id;};
      win.clearTimeout=(id)=>{if(pend[id])pend[id].cancelado=true;};
      win.Response=Response;
      win.fetch=(url,opts)=>{
        const metodo=(opts&&opts.method)||"GET";
        if(metodo==="POST"){ posts.push(JSON.parse(opts.body)); if(onPost)onPost(JSON.parse(opts.body));
          return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}})); }
        return Promise.resolve(new Response(JSON.stringify(respuesta),{status:200,headers:{"Content-Type":"application/json"}}));
      };
      for(const k in storage) win.localStorage.setItem(k, storage[k]);
    }
  });
  const avanzar = async (ms)=>{ ahora+=ms; for(;;){ const t=pend.find(t=>!t.cancelado&&!t.corrido&&t.at<=ahora); if(!t)break; t.corrido=true; t.fn();
    for(let i=0;i<4;i++) await new Promise(r=>setImmediate(r)); } };
  return {dom, win:dom.window, posts, avanzar};
}
const SK="cartas_intencion_parques_v2", DK="cartas_intencion_demo_descartada_v1";
const settle = ()=>new Promise(r=>setImmediate(r));
const listado = win => Array.from(win.document.querySelectorAll(".exp-card-empresa")).map(e=>e.textContent);

(async()=>{
let fallos=0;
const check=(label,real,esperado)=>{
  const ok = JSON.stringify(real)===JSON.stringify(esperado);
  if(!ok) fallos++;
  console.log((ok?"  ✅ ":"  ❌ ")+label+"  ->  "+JSON.stringify(real)+(ok?"":"   ESPERADO "+JSON.stringify(esperado)));
};

console.log("=== BUG A (antes): borrar el ultimo expediente resucitaba los 5 ejemplos ===");
{
  // Escenario real: un usuario con datos propios borra el ultimo expediente.
  // Sin DEMO_KEY: ese flag cortocircuitaba load() antes de llegar a la
  // condicion rota, asi que ponerlo aca ocultaba la regresion.
  const a = nuevaApp({storage:{[SK]:"[]"}, respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  check("lista vacia se respeta (sin DEMO_KEY)", listado(a.win).length, 0);
  check("no reaparecen ejemplos", a.win.document.querySelectorAll(".example-tag").length, 0);
  check("no se subio nada", a.posts.length, 0);
  console.log("     mensaje:", a.win.document.querySelector(".empty-state").textContent.slice(0,60));
}

console.log("\n=== BUG A, por el flujo completo: cargar, borrar, recargar ===");
{
  // Primera sesion: el usuario carga un expediente real.
  const a1 = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a1.avanzar(0);
  let d = a1.win.document;
  d.getElementById("btnNew").click();
  d.getElementById("f_nro_expediente").value = "363-77777/2026-0";
  d.getElementById("f_nombre_empresa").value = "Unico S.A.";
  d.getElementById("f_fecha_inicio").value = "01/09/2026";
  d.getElementById("expForm").dispatchEvent(new a1.win.Event("submit",{bubbles:true,cancelable:true}));
  await settle(); await a1.avanzar(2000);
  check("quedo 1 expediente real", listado(a1.win), ["Unico S.A."]);

  // Lo borra: queda en cero.
  d.querySelectorAll(".exp-card")[0].click();
  d.getElementById("btnDelete").click();
  await settle(); await a1.avanzar(2000);
  check("quedo en cero", listado(a1.win).length, 0);
  const ultimoPost = a1.posts[a1.posts.length-1];
  check("el POST final sube una lista vacia", ultimoPost.expedientes, []);

  // Segunda sesion: arranca con el localStorage que dejo la primera.
  const traspaso = {};
  for(let i=0;i<a1.win.localStorage.length;i++){
    const k = a1.win.localStorage.key(i);
    traspaso[k] = a1.win.localStorage.getItem(k);
  }
  const a2 = nuevaApp({storage:traspaso, respuesta:{expedientes:[],plazoDias:90,_meta:{existe:true,rama:"x"}}});
  await settle(); await a2.avanzar(0);
  check("al recargar sigue en cero", listado(a2.win).length, 0);
  check("los ejemplos NO volvieron", a2.win.document.querySelectorAll(".example-tag").length, 0);
}

console.log("\n=== BUG B (antes): repo vacio real se ignoraba y la demo sobrevivia ===");
{
  // dispositivo nuevo (sin storage) + repo YA INICIALIZADO pero con cero expedientes
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("adopta el vacio del repo", listado(a.win).length, 0);
  check("demo marcada como descartada", a.win.localStorage.getItem(DK), "1");
  check("nada subido", a.posts.length, 0);
}

console.log("\n=== Demo legitima: repo sin inicializar -> se ven los ejemplos, no se suben ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  check("5 ejemplos visibles", listado(a.win).length, 5);
  check("aviso de demo presente", !!a.win.document.querySelector(".aviso-demo"), true);
  check("localStorage sigue limpio", a.win.localStorage.getItem(SK), null);
  await a.avanzar(300000);
  check("tras 5 minutos: cero POSTs", a.posts.length, 0);
}

console.log("\n=== En demo, cambiar el plazo NO sube los ejemplos ===");
{
  // Este es el camino que motiva la guarda en marcarPendiente(): savePlazo()
  // la llama, y sin guarda el POST sale con los 5 ejemplos adentro.
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  check("arranca en demo", a.win.document.querySelectorAll(".example-tag").length, 5);
  const plazo = a.win.document.getElementById("plazoDias");
  plazo.value = "45";
  plazo.dispatchEvent(new a.win.Event("change", {bubbles:true}));
  await settle(); await a.avanzar(300000);
  check("el plazo se aplico localmente", plazo.value, "45");
  check("pero NO se subio nada", a.posts.length, 0);
  check("y no quedo marcado como pendiente",
        a.win.localStorage.getItem("cartas_intencion_sync_pendiente_v1"), null);
}

console.log("\n=== En demo, borrar un ejemplo descarta la demo y no sube ejemplos ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  const d = a.win.document;
  d.querySelectorAll(".exp-card")[0].click();
  d.getElementById("btnDelete").click();
  await settle(); await a.avanzar(300000);
  check("la demo se fue entera", listado(a.win).length, 0);
  check("ningun ejemplo subido",
        a.posts.every(p => p.expedientes.every(e => !e.ejemplo)), true);
  if(a.posts.length) check("el POST lleva lista vacia", a.posts[a.posts.length-1].expedientes, []);
}

console.log("\n=== Primer guardado real: la demo se reemplaza, solo sube lo del usuario ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  const d=a.win.document;
  d.getElementById("btnNew").click();
  d.getElementById("f_nro_expediente").value="363-11111/2026-0";
  d.getElementById("f_nombre_empresa").value="Real S.A.";
  d.getElementById("f_fecha_inicio").value="01/09/2026";
  d.getElementById("expForm").dispatchEvent(new a.win.Event("submit",{bubbles:true,cancelable:true}));
  await settle(); await a.avanzar(2000);
  check("queda solo el expediente real", listado(a.win), ["Real S.A."]);
  check("se subio 1 vez", a.posts.length, 1);
  check("el POST lleva solo 1 expediente", a.posts[0].expedientes.length, 1);
  check("ningun 'ejemplo:true' subido", a.posts[0].expedientes.some(e=>e.ejemplo), false);
  check("aviso de demo se fue", !!a.win.document.querySelector(".aviso-demo"), false);
}

console.log("\n=== Editar un ejemplo: ese se conserva como real, los otros 4 se van ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  const d=a.win.document;
  d.querySelectorAll(".exp-card")[0].click();          // abre en modo lectura
  d.getElementById("btnEdit").click();                  // pasa a edicion
  const nombre = d.getElementById("f_nombre_empresa").value;
  d.getElementById("expForm").dispatchEvent(new a.win.Event("submit",{bubbles:true,cancelable:true}));
  await settle(); await a.avanzar(2000);
  check("queda 1 expediente", listado(a.win).length, 1);
  check("es el que se edito", listado(a.win)[0], nombre);
  check("ya no es ejemplo", a.posts[0].expedientes[0].ejemplo, false);
}

console.log("\n=== BUG C (antes): plazoDias no viajaba si expedientes venia vacio ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:45,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("plazo adoptado con lista vacia", a.win.document.getElementById("plazoDias").value, "45");
  check("persistido", a.win.localStorage.getItem("cartas_intencion_plazo_v1"), "45");
}

console.log("\n=== Recarga tras haber vaciado todo: los ejemplos NO vuelven ===");
{
  const a = nuevaApp({storage:{[SK]:"[]",[DK]:"1"}, respuesta:{expedientes:[],plazoDias:90,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("sigue vacio", listado(a.win).length, 0);
}

console.log("\n=== Repo con datos reales gana sobre la demo local ===");
{
  const a = nuevaApp({respuesta:{expedientes:[{id:"r1",nombre_empresa:"Del Repo S.R.L.",situacion:"En_tratamiento",fecha_inicio:"01/09/2026"}],plazoDias:90,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("muestra el dato del repo", listado(a.win), ["Del Repo S.R.L."]);
  check("sin POST (no pisa el repo)", a.posts.length, 0);
}

console.log("\n"+(fallos?("❌ "+fallos+" fallos"):"✅ todos los escenarios de datos pasan"));
  if(fallos) process.exitCode = 1;
})();
