// Validación del formulario y honestidad del semáforo de plazos.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

let fallos = 0;
const check = (l, real, esp) => {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log((ok?"  ✅ ":"  ❌ ")+l+" -> "+JSON.stringify(real)+(ok?"":"   ESPERADO "+JSON.stringify(esp)));
};
const checkQue = (l, c) => { if(!c) fallos++; console.log((c?"  ✅ ":"  ❌ ")+l); };

function app(respuesta){
  respuesta = respuesta || {expedientes:[],plazoDias:90,_meta:{existe:false}};
  let pend=[], ahora=0; const posts=[];
  const dom = new JSDOM(html, {url:"https://x.dev/", runScripts:"dangerously", pretendToBeVisual:false,
    beforeParse(win){
      win.setTimeout=(fn,ms)=>{const id=pend.length;pend.push({fn,at:ahora+(ms||0),id});return id;};
      win.clearTimeout=(id)=>{if(pend[id])pend[id].cancelado=true;};
      win.Response=Response;
      win.fetch=(u,o)=>{ const m=(o&&o.method)||"GET";
        if(m==="POST"){ posts.push(JSON.parse(o.body));
          return Promise.resolve(new Response('{"ok":true}',{status:200,headers:{"Content-Type":"application/json"}})); }
        return Promise.resolve(new Response(JSON.stringify(respuesta),
          {status:200,headers:{"Content-Type":"application/json"}}));
      };
    }});
  const avanzar=async(ms)=>{ahora+=ms;for(;;){const t=pend.find(t=>!t.cancelado&&!t.corrido&&t.at<=ahora);if(!t)break;
    t.corrido=true;t.fn();for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));}};
  return {win:dom.window, posts, avanzar};
}
const settle=()=>new Promise(r=>setImmediate(r));

async function enviar(a, campos){
  const d=a.win.document;
  d.getElementById("btnNew").click();
  for(const k in campos){ const el=d.getElementById("f_"+k); if(el) el.value=campos[k]; }
  d.getElementById("expForm").dispatchEvent(new a.win.Event("submit",{bubbles:true,cancelable:true}));
  await settle(); await a.avanzar(3000);
  return {
    errores: Array.from(d.querySelectorAll(".field-error")).map(n=>n.textContent),
    abierto: !d.getElementById("veil").hidden,
    creados: a.posts.length ? a.posts[a.posts.length-1].expedientes.length : 0
  };
}

(async()=>{
console.log("=== Formulario vacio: antes creaba un expediente en blanco ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const r=await enviar(a,{});
  checkQue("el modal sigue abierto (no guardo)", r.abierto);
  check("cantidad de errores mostrados", r.errores.length, 2);
  check("no se subio nada", a.posts.length, 0);
  console.log("     "+r.errores.join(" | "));
}

console.log("\n=== Fechas invalidas: antes se aceptaban corridas o en silencio ===");
for(const [fecha,porque] of [["31/02/2026","31 de febrero"],["2026-04-15","ISO pegado"],
                             ["15-04-2026","con guiones"],["99/99/9999","basura"],["1/1/26","anio de 2 digitos"]]){
  const a=app(); await settle(); await a.avanzar(0);
  const r=await enviar(a,{nombre_empresa:"X S.A.", fecha_inicio:fecha});
  const rechazada = r.abierto && r.errores.some(e=>e.indexOf("Fecha inválida")===0);
  checkQue('"'+fecha+'" ('+porque+') rechazada con mensaje', rechazada);
}

console.log("\n=== Fechas validas aceptadas ===");
for(const fecha of ["09/10/2026","1/1/2026","29/02/2024"]){
  const a=app(); await settle(); await a.avanzar(0);
  const r=await enviar(a,{nombre_empresa:"X S.A.", fecha_inicio:fecha});
  checkQue('"'+fecha+'" aceptada', !r.abierto && r.creados===1);
}
{
  const a=app(); await settle(); await a.avanzar(0);
  const r=await enviar(a,{nombre_empresa:"X S.A.", fecha_inicio:"29/02/2025"});
  checkQue('"29/02/2025" rechazada (2025 no es bisiesto)', r.abierto);
}

console.log("\n=== Semaforo honesto: marca ~ cuando calcula sin feriados cargados ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  // 90 dias habiles desde 01/09/2026 caen en enero de 2027, fuera de la tabla.
  await enviar(a,{nombre_empresa:"Cruza 2027 S.A.", fecha_inicio:"01/09/2026"});
  const urg=a.win.document.querySelector(".urg");
  checkQue("el plazo se muestra como estimado (~)", urg && urg.textContent.trim().startsWith("~"));
  // Se chequea la sustancia, no la redacción exacta: el aviso tiene que decir
  // que faltan feriados y nombrar el rango que sí está cargado.
  const titulo = urg ? (urg.getAttribute("title")||"") : "";
  checkQue("explica por que en el title", /feriados/i.test(titulo) && /2026/.test(titulo));
  console.log("     "+(urg?urg.textContent.trim():"(sin urgencia)"));
  console.log("     "+(urg?(urg.getAttribute("title")||"").slice(0,110):""));
}
{
  const a=app(); await settle(); await a.avanzar(0);
  // 90 dias habiles desde 02/02/2026 caen en junio de 2026: dentro de la tabla.
  await enviar(a,{nombre_empresa:"Dentro de tabla S.A.", fecha_inicio:"02/02/2026"});
  const urg=a.win.document.querySelector(".urg");
  checkQue("un plazo dentro de la tabla NO se marca estimado", urg && !urg.textContent.trim().startsWith("~"));
  console.log("     "+(urg?urg.textContent.trim():"(sin urgencia)"));
}

console.log("\n=== Tope del plazo: antes 999999999 congelaba la pestana ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const inp=a.win.document.getElementById("plazoDias");
  check("el input declara un max", inp.getAttribute("max"), "3650");
  const t0=Date.now();
  inp.value="999999999"; inp.dispatchEvent(new a.win.Event("change",{bubbles:true}));
  await settle(); await a.avanzar(3000);
  const ms=Date.now()-t0;
  check("el valor se recorta al tope", inp.value, "3650");
  checkQue("y resuelve rapido (tardo "+ms+"ms)", ms < 10000);

  inp.value="0"; inp.dispatchEvent(new a.win.Event("change",{bubbles:true}));
  await settle();
  check("un valor invalido vuelve al anterior, no queda mintiendo", inp.value, "3650");
}

console.log("\n=== plazoDias absurdo bajando por sync: el input no lo filtra ===");
{
  // Este es el camino que el atributo max del input NO cubre: datos que
  // llegan del repo. Sin el tope dentro de calcularFechaFin, son ~1.450
  // millones de iteraciones y la pestana se congela.
  const a = app({expedientes:[{id:"x", nombre_empresa:"Victima S.A.", fecha_inicio:"02/01/2026",
                               situacion:"En_tratamiento", parque_industrial:"Salta"}],
                 plazoDias: 999999999, _meta:{existe:true, rama:"x"}});
  const t0 = Date.now();
  await settle(); await a.avanzar(0);
  const ms = Date.now() - t0;
  checkQue("la app arranca sin colgarse (tardo "+ms+"ms)", ms < 10000);
  checkQue("renderizo el expediente", a.win.document.querySelectorAll(".exp-card").length === 1);
}

console.log("\n"+(fallos?("❌ "+fallos+" fallos"):"✅ validacion y semaforo OK"));
if(fallos) process.exitCode=1;
})();
