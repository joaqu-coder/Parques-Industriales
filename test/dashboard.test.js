// Coherencia del dashboard: los dos graficos "por parque" tienen que ver los
// mismos expedientes, y los tiles tienen que sumar el total.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

let fallos = 0;
const check = (l, real, esp) => {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log((ok?"  ✅ ":"  ❌ ")+l+" -> "+JSON.stringify(real)+(ok?"":"   ESPERADO "+JSON.stringify(esp)));
};

function app(expedientes){
  let pend=[], ahora=0;
  const dom = new JSDOM(html, {url:"https://x.dev/#dashboard", runScripts:"dangerously", pretendToBeVisual:false,
    beforeParse(win){
      win.setTimeout=(fn,ms)=>{const id=pend.length;pend.push({fn,at:ahora+(ms||0),id});return id;};
      win.clearTimeout=(id)=>{if(pend[id])pend[id].cancelado=true;};
      win.Response=Response;
      win.fetch=()=>Promise.resolve(new Response(JSON.stringify({expedientes,plazoDias:90,_meta:{existe:true,rama:"x"}}),
        {status:200,headers:{"Content-Type":"application/json"}}));
    }});
  const avanzar=async(ms)=>{ahora+=ms;for(;;){const t=pend.find(t=>!t.cancelado&&!t.corrido&&t.at<=ahora);if(!t)break;
    t.corrido=true;t.fn();for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));}};
  return {win:dom.window, avanzar};
}
const settle=()=>new Promise(r=>setImmediate(r));
const n = s => parseInt(String(s).replace(/\D/g,""),10) || 0;

(async()=>{
// Datos deliberadamente sucios: un parque fuera de la constante PARQUES, uno
// vacio, una situacion desconocida y una fecha invalida. Es exactamente lo que
// puede llegar por sync o quedar de una version anterior.
const sucios = [
  {id:"1", nombre_empresa:"A", parque_industrial:"Salta",    rubro:"Logística", superficie_solicitada_m2:1000, situacion:"En_tratamiento",  fecha_inicio:"10/03/2026"},
  {id:"2", nombre_empresa:"B", parque_industrial:"Cafayate", rubro:"Química",   superficie_solicitada_m2:5000, situacion:"Adjudicada",      fecha_inicio:"12/03/2026"},
  {id:"3", nombre_empresa:"C", parque_industrial:"",         rubro:"",          superficie_solicitada_m2:700,  situacion:"Pendiente",       fecha_inicio:"14/03/2026"},
  {id:"4", nombre_empresa:"D", parque_industrial:"Güemes",   rubro:"Textil",    superficie_solicitada_m2:300,  situacion:"Sin_tratamiento", fecha_inicio:"no es fecha"}
];

const a = app(sucios);
await settle(); await a.avanzar(0);
const d = a.win.document;
d.getElementById("tabDash").click();
await settle(); await a.avanzar(0);

console.log("=== Los tiles tienen que sumar el total ===");
const tiles = Array.from(d.querySelectorAll("#summary .tile")).map(t=>({
  label:t.querySelector(".label").textContent, num:t.querySelector(".num").textContent}));
tiles.forEach(t=>console.log("     "+t.num.padEnd(14)+t.label));
const total = n(tiles.find(t=>t.label==="Expedientes totales").num);
const porSituacion = tiles.filter(t=>/Adjudicados|En tratamiento|Sin tratamiento|Situación sin reconocer/.test(t.label))
                          .reduce((s,t)=>s+n(t.num),0);
check("total de expedientes", total, 4);
check("suma de los tiles de situación", porSituacion, 4);
check("la situación desconocida aparece", !!tiles.find(t=>t.label==="Situación sin reconocer"), true);

console.log("\n=== m² por parque: ningún expediente se pierde ===");
const barrasM2 = Array.from(d.querySelectorAll("#chartM2 .bar-row")).map(r=>({
  label:r.querySelector(".bar-label").textContent, valor:n(r.querySelector(".bar-value").textContent)}));
barrasM2.filter(b=>b.valor>0).forEach(b=>console.log("     "+b.label.padEnd(14)+b.valor+" m²"));
check("m² totales en el gráfico", barrasM2.reduce((s,b)=>s+b.valor,0), 7000);
check("el parque fuera de la constante aparece", barrasM2.some(b=>b.label==="Cafayate"), true);
check("el parque vacío aparece etiquetado", barrasM2.some(b=>b.label==="(sin parque)"), true);

console.log("\n=== Gráfico anual: el total sobre la barra tiene que ser real ===");
const barras = d.querySelectorAll("#chartAnual rect").length;
// El total de la barra es el unico <text> con font-weight 600; las etiquetas
// del eje Y (0,1,2,3,4,5) tambien contienen "3", asi que mirar cualquier
// <text> no probaba nada.
const totalesBarra = Array.from(d.querySelectorAll('#chartAnual text[font-weight="600"]')).map(t=>t.textContent);
// 3 expedientes con fecha valida, todos en 2026. El 4to no tiene fecha valida.
check("rects apilados dibujados", barras, 3);
check("totales dibujados encima de las barras", totalesBarra, ["3"]);

const leyenda = Array.from(d.querySelectorAll("#legendAnual span")).map(s=>s.textContent);
console.log("     leyenda: "+leyenda.join(" | "));
check("la leyenda incluye Cafayate", leyenda.some(t=>t.indexOf("Cafayate")>=0), true);
check("avisa del expediente sin fecha válida", leyenda.some(t=>/sin fecha válida/.test(t)), true);

console.log("\n=== Los dos gráficos por parque coinciden ===");
const enM2    = new Set(barrasM2.filter(b=>b.valor>0).map(b=>b.label));
const enAnual = new Set(leyenda.filter(t=>!/sin fecha/.test(t)).map(t=>t.trim()));
// "Güemes" solo esta en m2 porque su unico expediente no tiene fecha valida,
// y eso el grafico anual ahora lo declara en la leyenda.
const soloEnM2 = [...enM2].filter(p=>!enAnual.has(p));
check("la única diferencia es el expediente sin fecha", soloEnM2, ["Güemes"]);

console.log("\n=== Buscador: 'undefined' no matchea registros incompletos ===");
{
  const b = app([{id:"x", nombre_empresa:"Sola S.A.", situacion:"En_tratamiento", fecha_inicio:"10/03/2026", parque_industrial:"Salta"}]);
  await settle(); await b.avanzar(0);
  const inp = b.win.document.getElementById("search");
  inp.value = "undefined"; inp.dispatchEvent(new b.win.Event("input",{bubbles:true}));
  await settle();
  check("buscar 'undefined' no devuelve nada", b.win.document.querySelectorAll(".exp-card").length, 0);
  inp.value = "sola"; inp.dispatchEvent(new b.win.Event("input",{bubbles:true}));
  await settle();
  check("buscar por empresa sí funciona", b.win.document.querySelectorAll(".exp-card").length, 1);
}

console.log("\n"+(fallos?("❌ "+fallos+" fallos"):"✅ dashboard coherente"));
if(fallos) process.exitCode=1;
})();
