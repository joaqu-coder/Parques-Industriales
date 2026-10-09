// Navegacion, modal y accesibilidad.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

let fallos = 0;
const check = (l, real, esp) => {
  const ok = JSON.stringify(real) === JSON.stringify(esp);
  if (!ok) fallos++;
  console.log((ok?"  ✅ ":"  ❌ ")+l+" -> "+JSON.stringify(real)+(ok?"":"   ESPERADO "+JSON.stringify(esp)));
};
const checkQue = (l,c)=>{ if(!c) fallos++; console.log((c?"  ✅ ":"  ❌ ")+l); };
// OJO: JSON.stringify de un nodo DOM es "{}", asi que check() considera
// iguales a dos elementos cualesquiera. Para nodos, identidad.
const checkMismo = (l, real, esp) => {
  const ok = real === esp;
  if (!ok) fallos++;
  const nom = n => n ? (n.id ? "#"+n.id : n.tagName+(n.className?"."+String(n.className).split(" ")[0]:"")) : String(n);
  console.log((ok?"  ✅ ":"  ❌ ")+l+" -> "+nom(real)+(ok?"":"   ESPERADO "+nom(esp)));
};

function app(url){
  let pend=[], ahora=0;
  const dom = new JSDOM(html, {url: url||"https://x.dev/", runScripts:"dangerously", pretendToBeVisual:false,
    beforeParse(win){
      win.setTimeout=(fn,ms)=>{const id=pend.length;pend.push({fn,at:ahora+(ms||0),id});return id;};
      win.clearTimeout=(id)=>{if(pend[id])pend[id].cancelado=true;};
      win.Response=Response;
      win.fetch=()=>Promise.resolve(new Response(JSON.stringify({
        expedientes:[{id:"a",nombre_empresa:"Uno S.A.",parque_industrial:"Salta",rubro:"Textil",
                      situacion:"En_tratamiento",fecha_inicio:"10/03/2026",superficie_solicitada_m2:500,
                      intervenciones:[]}],
        plazoDias:90,_meta:{existe:true,rama:"x"}}),
        {status:200,headers:{"Content-Type":"application/json"}}));
    }});
  const avanzar=async(ms)=>{ahora+=ms;for(;;){const t=pend.find(t=>!t.cancelado&&!t.corrido&&t.at<=ahora);if(!t)break;
    t.corrido=true;t.fn();for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));}};
  return {win:dom.window, avanzar};
}
const settle=()=>new Promise(r=>setImmediate(r));
const tecla = (win, el, key) => el.dispatchEvent(new win.KeyboardEvent("keydown",{key,bubbles:true,cancelable:true}));

(async()=>{
console.log("=== Tabs: semantica ARIA ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const d=a.win.document;
  check("tablist presente", d.querySelector('[role="tablist"]')!==null, true);
  check("Listado seleccionado al arrancar", d.getElementById("tabList").getAttribute("aria-selected"), "true");
  check("Dashboard no seleccionado", d.getElementById("tabDash").getAttribute("aria-selected"), "false");
  d.getElementById("tabDash").click(); await settle();
  check("tras clickear Dashboard, se invierte", 
        [d.getElementById("tabList").getAttribute("aria-selected"), d.getElementById("tabDash").getAttribute("aria-selected")],
        ["false","true"]);
  check("los paneles declaran su tab", 
        [d.getElementById("viewList").getAttribute("role"), d.getElementById("viewDash").getAttribute("role")],
        ["tabpanel","tabpanel"]);
}

console.log("\n=== Boton atras: antes cambiaba la URL y no la vista ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const d=a.win.document;
  d.getElementById("tabDash").click(); await settle();
  check("el hash refleja el dashboard", a.win.location.hash, "#dashboard");
  checkQue("la vista dashboard esta visible", !d.getElementById("viewDash").hidden);

  // Simular el "atras": el navegador cambia el hash y emite hashchange.
  a.win.location.hash = "#listado";
  a.win.dispatchEvent(new a.win.HashChangeEvent("hashchange"));
  await settle();
  checkQue("la vista volvio al listado", !d.getElementById("viewList").hidden);
  check("y el tab acompaña", d.getElementById("tabList").getAttribute("aria-selected"), "true");
}

console.log("\n=== Entrar directo por #dashboard ===");
{
  const a=app("https://x.dev/#dashboard"); await settle(); await a.avanzar(0);
  checkQue("abre en dashboard", !a.win.document.getElementById("viewDash").hidden);
}

console.log("\n=== Modal: dialogo, foco, Escape y scroll ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const d=a.win.document, win=a.win;
  const modal=d.getElementById("modal"), veil=d.getElementById("veil");
  check("el modal se declara dialogo modal",
        [modal.getAttribute("role"), modal.getAttribute("aria-modal")], ["dialog","true"]);

  const botonNuevo = d.getElementById("btnNew");
  botonNuevo.focus();
  botonNuevo.click(); await settle();
  checkQue("el modal esta abierto", !veil.hidden);
  checkQue("el foco entro al modal", modal.contains(d.activeElement));
  check("el fondo no scrollea", d.body.style.overflow, "hidden");

  // Trampa de foco: Tab desde el ultimo vuelve al primero.
  const f = Array.prototype.filter.call(
    modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'),
    el => !el.disabled);
  const primero = f[0], ultimo = f[f.length-1];
  ultimo.focus();
  tecla(win, ultimo, "Tab"); await settle();
  // Sin trampa, el foco NO se mueve (jsdom no implementa Tab), asi que
  // "sigue dentro del modal" pasaba igual. Hay que exigir que haya saltado
  // al primero.
  checkMismo("Tab desde el ultimo salta al primero", d.activeElement, primero);
  primero.focus();
  tecla(win, primero, "Tab", true);
  const evShift = new win.KeyboardEvent("keydown",{key:"Tab",shiftKey:true,bubbles:true,cancelable:true});
  primero.dispatchEvent(evShift); await settle();
  checkMismo("Shift+Tab desde el primero salta al ultimo", d.activeElement, ultimo);

  tecla(win, d.body, "Escape"); await settle();
  checkQue("Escape cierra el modal", veil.hidden);
  check("el scroll del fondo vuelve", d.body.style.overflow, "");
  checkMismo("el foco vuelve a donde estaba", d.activeElement, botonNuevo);
}

console.log("\n=== Modal de lectura tambien cierra con Escape ===");
{
  const a=app(); await settle(); await a.avanzar(0);
  const d=a.win.document;
  d.querySelectorAll(".exp-card")[0].click(); await settle();
  checkQue("abrio la ficha", !d.getElementById("veil").hidden);
  tecla(a.win, d.body, "Escape"); await settle();
  checkQue("cerro con Escape", d.getElementById("veil").hidden);
}

console.log("\n"+(fallos?("❌ "+fallos+" fallos"):"✅ UX y accesibilidad OK"));
if(fallos) process.exitCode=1;
})();
