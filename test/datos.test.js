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
// La clave se lee de la app: al subirla de versión el test miraba la vieja.
const SK = (html.match(/var STORAGE_KEY\s*=\s*"([^"]+)"/)||[])[1];
if(!SK) throw new Error("index.html no declara STORAGE_KEY");
const settle = ()=>new Promise(r=>setImmediate(r));
const listado = win => Array.from(win.document.querySelectorAll(".exp-card-empresa")).map(e=>e.textContent);

(async()=>{
let fallos=0;
const check=(label,real,esperado)=>{
  const ok = JSON.stringify(real)===JSON.stringify(esperado);
  if(!ok) fallos++;
  console.log((ok?"  ✅ ":"  ❌ ")+label+"  ->  "+JSON.stringify(real)+(ok?"":"   ESPERADO "+JSON.stringify(esperado)));
};

console.log("=== BUG A (antes): borrar el ultimo expediente resucitaba datos de ejemplo ===");
{
  // Escenario real: un usuario con datos propios borra el ultimo expediente.
  // Sin DEMO_KEY: ese flag cortocircuitaba load() antes de llegar a la
  // condicion rota, asi que ponerlo aca ocultaba la regresion.
  const a = nuevaApp({storage:{[SK]:"[]"}, respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  check("lista vacia se respeta (sin DEMO_KEY)", listado(a.win).length, 0);
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

console.log("\n=== BUG B (antes): un repo vacio de verdad se ignoraba ===");
{
  // dispositivo nuevo (sin storage) + repo YA INICIALIZADO pero con cero expedientes
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("adopta el vacio del repo", listado(a.win).length, 0);
  check("y lo persiste local", a.win.localStorage.getItem(SK), "[]");
  check("nada subido", a.posts.length, 0);
}

console.log("\n=== La app NO trae datos de ejemplo ===");
{
  // Decisión del repo (commit "sacar los ejemplos"): si no hay nada local y el
  // repo todavía no existe, la lista arranca vacía. Antes aparecían 5
  // expedientes de muestra que el siguiente guardado subía como reales.
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,_meta:{existe:false}}});
  await settle(); await a.avanzar(0);
  check("arranca vacia, sin ejemplos", listado(a.win).length, 0);
  check("nada en localStorage", a.win.localStorage.getItem(SK), null);
  check("nada subido", a.posts.length, 0);
  console.log("     mensaje:", a.win.document.querySelector(".empty-state").textContent.slice(0,70));
}

console.log("\n=== Los umbrales del semaforo viajan por sync, como el plazo ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:90,umbrales:{alerta:20,critico:5},_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("alerta adoptada", a.win.document.getElementById("uAlerta") ? null : JSON.parse(a.win.localStorage.getItem("cartas_intencion_umbrales_v1")||"null"), {alerta:20,critico:5});
  check("sin POST (no pisa el repo)", a.posts.length, 0);
}

console.log("\n=== Umbrales invalidos que llegan por sync no rompen el semaforo ===");
{
  const a = nuevaApp({respuesta:{expedientes:[{id:"r1",nombre_empresa:"X S.A.",situacion:"Sin_tratamiento",fecha_inicio:"01/09/2026"}],plazoDias:90,umbrales:{alerta:"no",critico:null},_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  // No se exige que persista: si lo que llega normaliza a los valores que ya
  // tenía, no hay cambio que guardar. Lo que sí se exige es que NUNCA quede
  // guardado un umbral inválido.
  const u = JSON.parse(a.win.localStorage.getItem("cartas_intencion_umbrales_v1")||"null");
  check("no persiste un umbral invalido", u===null || (u.alerta===30 && u.critico===15), true);
  check("el expediente igual se renderiza", listado(a.win).length, 1);
}

console.log("\n=== BUG C (antes): plazoDias no viajaba si expedientes venia vacio ===");
{
  const a = nuevaApp({respuesta:{expedientes:[],plazoDias:45,_meta:{existe:true,rama:"x"}}});
  await settle(); await a.avanzar(0);
  check("plazo adoptado con lista vacia", a.win.document.getElementById("plazoDias").value, "45");
  check("persistido", a.win.localStorage.getItem("cartas_intencion_plazo_v1"), "45");
}

console.log("\n=== Recarga tras haber vaciado todo: sigue vacio ===");
{
  const a = nuevaApp({storage:{[SK]:"[]"}, respuesta:{expedientes:[],plazoDias:90,_meta:{existe:true,rama:"x"}}});
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
