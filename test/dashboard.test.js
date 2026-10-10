// Coherencia del dashboard. El dashboard se reescribió entero (secciones con
// navegación propia en vez de cuatro gráficos sueltos), pero lo que este test
// persigue es lo mismo de antes: que ningún expediente se pierda entre una
// sección y otra, que los dos cortes "por parque" vean los mismos datos, y que
// lo que no se puede calcular se declare en vez de desaparecer.
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
// Los números salen formateados en es-AR ("1.216.028 m²", "24,1%"): para
// compararlos hay que sacarles los separadores de miles, no todo lo no-dígito.
const n = s => parseInt(String(s).replace(/[^\d]/g,""),10) || 0;

(async()=>{
// Datos deliberadamente sucios: un parque fuera de la constante PARQUES, uno
// vacio, una situacion desconocida, una fecha invalida y una superficie sin
// cargar. Es exactamente lo que puede llegar por sync o quedar de una version
// anterior.
const sucios = [
  {id:"1", nombre_empresa:"A", parque_industrial:"Salta",    rubro:"Logística", superficie_solicitada_m2:1000, situacion:"En_tratamiento",  fecha_inicio:"10/03/2026"},
  {id:"2", nombre_empresa:"B", parque_industrial:"Cafayate", rubro:"Química",   superficie_solicitada_m2:5000, situacion:"Adjudicada",      fecha_inicio:"12/03/2026"},
  {id:"3", nombre_empresa:"C", parque_industrial:"",         rubro:"",          superficie_solicitada_m2:700,  situacion:"Pendiente",       fecha_inicio:"14/03/2026"},
  {id:"4", nombre_empresa:"D", parque_industrial:"Güemes",   rubro:"Textil",    superficie_solicitada_m2:"",   situacion:"Sin_tratamiento", fecha_inicio:"no es fecha"}
];

const a = app(sucios);
await settle(); await a.avanzar(0);
const d = a.win.document;
d.getElementById("tabDash").click();
await settle(); await a.avanzar(0);

const seccion = async (id)=>{ d.querySelector('[data-sec="'+id+'"]').click(); await settle(); await a.avanzar(0); };
const tiles = ()=>Array.from(d.querySelectorAll("#dashBody .tile")).map(t=>({
  label:t.querySelector(".label").textContent, num:t.querySelector(".num").textContent,
  hint:(t.querySelector(".hint")||{textContent:""}).textContent}));
const filas = ()=>Array.from(d.querySelectorAll("#dashBody .mrow")).map(r=>({
  nombre:r.querySelector(".mrow-name").textContent.replace("muestra chica","").trim(),
  valor:r.querySelector(".mrow-val").textContent.trim()}));
const notas = ()=>Array.from(d.querySelectorAll("#dashBody .note")).map(x=>x.textContent);

console.log("=== Resumen: máximo 5 indicadores y ninguno sin trazabilidad ===");
const t = tiles();
t.forEach(x=>console.log("     "+x.num.padEnd(16)+x.label));
check("cantidad de indicadores grandes", t.length <= 5, true);
check("cartas ingresadas", n(t.find(x=>x.label==="Cartas ingresadas").num), 4);
check("adjudicadas", n(t.find(x=>x.label==="Adjudicadas").num), 1);
check("tasa de adjudicación (1 de 4)", t.find(x=>x.label==="Tasa de adjudicación").num.trim(), "25,0%");
check("todos los indicadores explican de dónde salen", t.every(x=>x.hint.length>20), true);

console.log("\n=== Un campo vacío no es un cero ===");
const tSup = t.find(x=>x.label==="Superficie total solicitada");
console.log("     "+tSup.num+" — "+tSup.hint.slice(0,70));
check("suma solo lo que tiene dato (1000+5000+700)", n(tSup.num), 6700);
check("el indicador declara sobre cuántos expedientes suma", /3/.test(tSup.hint), true);
check("y hay un aviso del que falta", notas().some(x=>/no tienen/.test(x) && /superficie/.test(x)), true);

console.log("\n=== Situación: lo que no entra en una barra se declara ===");
await seccion("situacion");
const fSit = filas();
fSit.forEach(x=>console.log("     "+x.nombre.padEnd(18)+x.valor));
const sumaSit = fSit.reduce((s,x)=>s+n(x.valor.split(" ")[0]),0);
check("las barras suman 3 (la situación desconocida no entra)", sumaSit, 3);
check("y la diferencia está declarada, no escondida",
      notas().some(x=>/fuera de la lista/.test(x) && /1/.test(x)), true);

console.log("\n=== Tocar un estado lista sus expedientes con la tarjeta del listado ===");
d.querySelector('[data-drill="situacion"][data-valor="Adjudicada"]').click();
await settle(); await a.avanzar(0);
check("abre el detalle con 1 expediente", d.querySelectorAll("#dashBody .drill .exp-card").length, 1);
check("y es el adjudicado", d.querySelector("#dashBody .drill .exp-card-empresa").textContent, "B");
d.querySelector("#dashBody .drill-close").click();
await settle(); await a.avanzar(0);
check("cierra el detalle", d.querySelectorAll("#dashBody .drill").length, 0);

console.log("\n=== Por parque: ningún expediente se pierde ===");
await seccion("parques");
const todas = filas();
// 3 tarjetas usan .mrow: tasa, solicitudes y m². Se separan por el formato.
const fTasa = todas.filter(x=>/%\s*—/.test(x.valor));
const fM2   = todas.filter(x=>/m²/.test(x.valor));
const fSol  = todas.filter(x=>!/%\s*—/.test(x.valor) && !/m²/.test(x.valor) && !/sin datos/.test(x.valor));
fM2.forEach(x=>console.log("     m²  "+x.nombre.padEnd(14)+x.valor));
check("m² totales repartidos por parque", fM2.reduce((s,x)=>s+n(x.valor),0), 6700);
check("el parque fuera de la constante aparece", fM2.some(x=>x.nombre==="Cafayate"), true);
check("el parque vacío aparece etiquetado", fM2.some(x=>x.nombre==="(sin parque)"), true);
check("solicitudes suman el total", fSol.reduce((s,x)=>s+n(x.valor.split(" ")[0]),0), 4);

console.log("\n=== Tasa por parque: fracción al lado y muestra chica marcada ===");
fTasa.forEach(x=>console.log("     "+x.nombre.padEnd(14)+x.valor));
check("por defecto no muestra ninguna (todas tienen <5 expedientes)", fTasa.length, 0);
d.querySelector('[data-vertodos="tasaParque"]').click();
await settle(); await a.avanzar(0);
const fTasa2 = filas().filter(x=>/%\s*—/.test(x.valor));
fTasa2.forEach(x=>console.log("     "+x.nombre.padEnd(14)+x.valor));
check("al desplegar aparecen las 4", fTasa2.length, 4);
check("Cafayate: 1 de 1", (fTasa2.find(x=>x.nombre==="Cafayate")||{}).valor, "100,0% — 1/1");
check("todas marcadas como muestra chica",
      d.querySelectorAll("#dashBody .mrow.chica .tag-chica").length, 4);
check("y hay línea de referencia con el promedio general",
      /25,0%/.test(d.querySelector("#dashBody .ref-note").textContent), true);

console.log("\n=== Gráfico anual: el total sobre la barra tiene que ser real ===");
const rects = d.querySelectorAll("#chartAnual rect").length;
// El total de la barra es el unico <text> con font-weight 600; las etiquetas
// del eje Y tambien son <text>, asi que mirar cualquiera no probaba nada.
const totalesBarra = Array.from(d.querySelectorAll('#chartAnual text[font-weight="600"]')).map(x=>x.textContent);
check("rects apilados dibujados", rects, 3);
check("total dibujado encima de la barra", totalesBarra, ["3"]);
const leyenda = Array.from(d.querySelectorAll("#legendAnual span")).map(x=>x.textContent);
console.log("     leyenda: "+leyenda.join(" | "));
check("la leyenda incluye el parque fuera de la constante", leyenda.some(x=>/Cafayate/.test(x)), true);
check("avisa del expediente sin fecha válida", leyenda.some(x=>/sin fecha válida/.test(x)), true);

console.log("\n=== Los dos cortes por parque coinciden ===");
const enM2    = new Set(fM2.filter(x=>n(x.valor)>0).map(x=>x.nombre));
const enAnual = new Set(leyenda.filter(x=>!/sin fecha/.test(x)).map(x=>x.trim()));
// Güemes solo está en m²... no: su expediente no tiene superficie cargada, así
// que no está en ninguno de los dos, y el motivo está declarado en los dos lados.
check("ningún parque aparece en un corte y desaparece del otro sin aviso",
      [...enM2].filter(p=>!enAnual.has(p)), []);

console.log("\n=== Por rubro: empresas distintas y el rubro vacío etiquetado ===");
await seccion("rubros");
const fRub = filas();
fRub.forEach(x=>console.log("     "+x.nombre.padEnd(14)+x.valor));
check("4 rubros (incluye el vacío)", fRub.length, 4);
check("el rubro vacío se etiqueta", fRub.some(x=>x.nombre==="(sin rubro)"), true);
check("y está declarado como dato faltante", notas().some(x=>/sin rubro/.test(x)), true);

console.log("\n=== Urgencias: lo que no se puede calcular se dice ===");
await seccion("urgencias");
const txt = d.querySelector("#dashBody").textContent;
check("el expediente sin fecha válida no entra y se avisa", /fecha_inicio/.test(txt) && /no aparece/.test(txt), true);
check("los resueltos quedan fuera del semáforo y se avisa", /no corren plazo/.test(txt), true);
check("el plazo es configurable desde la pantalla", !!d.getElementById("uPlazo"), true);
check("y los umbrales también", !!d.getElementById("uAlerta") && !!d.getElementById("uCritico"), true);

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
