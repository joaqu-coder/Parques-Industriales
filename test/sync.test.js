const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

// La clave de localStorage se lee de la app: al subirla de versión (v2 -> v3)
// el test seguía mirando la vieja y daba null sin que nada estuviera roto.
function claveStorage(){
  const m = html.match(/var STORAGE_KEY\s*=\s*"([^"]+)"/);
  if(!m) throw new Error("index.html no declara STORAGE_KEY");
  return m[1];
}

// --- control manual del tiempo ---
let pendientes = [], ahora = 0, delaysRegistrados = [];
function instalar(win){
  win.setTimeout = function(fn, ms){
    ms = ms || 0;
    delaysRegistrados.push(ms);
    const id = pendientes.length;
    pendientes.push({fn, at: ahora + ms, id, cancelado:false});
    return id;
  };
  win.clearTimeout = function(id){ if(pendientes[id]) pendientes[id].cancelado = true; };
}
async function avanzar(ms){
  ahora += ms;
  for(;;){
    const t = pendientes.find(t => !t.cancelado && !t.corrido && t.at <= ahora);
    if(!t) break;
    t.corrido = true;
    t.fn();
    await new Promise(r => setImmediate(r));
    await new Promise(r => setImmediate(r));
    await new Promise(r => setImmediate(r));
  }
}

// --- fetch controlable ---
let modo = "500";
let llamadas = 0;
// Un bucle de reintentos sin backoff hace que esta suite no termine nunca, y
// un test que se cuelga no es un test que falla: no dice nada y bloquea el
// resto. Lo convertimos en un fallo limpio y con nombre.
const TOPE_LLAMADAS = 200;
function fakeFetch(url, opts){
  llamadas++;
  if(llamadas > TOPE_LLAMADAS){
    throw new Error("BUCLE DE REINTENTOS: mas de "+TOPE_LLAMADAS+" peticiones en la "+
                    "misma fase. El backoff no esta frenando los reintentos.");
  }
  const metodo = (opts && opts.method) || "GET";
  if(modo === "red")  return Promise.reject(new TypeError("Failed to fetch"));
  if(modo === "500")  return Promise.resolve(new Response(JSON.stringify({error:"No se pudo escribir datos.json", detalle:'La rama "main" no existe en joaqu-coder/Parques-Industriales.'}), {status:502, headers:{"Content-Type":"application/json"}}));
  if(modo === "422")  return Promise.resolve(new Response(JSON.stringify({error:"Datos rechazados", detalle:"Falta el array 'expedientes'."}), {status:422, headers:{"Content-Type":"application/json"}}));
  if(modo === "ok" && metodo === "POST") return Promise.resolve(new Response(JSON.stringify({ok:true}), {status:200, headers:{"Content-Type":"application/json"}}));
  return Promise.resolve(new Response(JSON.stringify({expedientes:[],plazoDias:90}), {status:200, headers:{"Content-Type":"application/json"}}));
}

let fallos = 0;
const check = (l, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log((ok ? "  \u2705 " : "  \u274c ") + l + " -> " + JSON.stringify(real) + (ok ? "" : "   ESPERADO " + JSON.stringify(esperado)));
};
const checkQue = (l, cond) => { if(!cond) fallos++; console.log((cond?"  \u2705 ":"  \u274c ")+l); };

(async () => {
  const dom = new JSDOM(html, {
    url: "https://egpais.workers.dev/",
    runScripts: "dangerously",
    pretendToBeVisual: false,
    beforeParse(win){
      instalar(win);
      win.fetch = fakeFetch;
      win.Response = Response;
      Object.defineProperty(win.navigator, "onLine", {value: true, configurable: true});
    }
  });
  const win = dom.window, doc = win.document;
  const $ = id => doc.getElementById(id);
  const estado = () => ({
    status: $("syncStatus").textContent,
    clase: $("syncStatus").className,
    banner: $("alertaSync").hidden ? "(oculto)" : $("alertaTitulo").textContent,
    detalle: $("alertaSync").hidden ? "" : $("alertaDetalle").textContent
  });

  await new Promise(r => setImmediate(r));
  await avanzar(0);

  console.log("=== 1. Arranque con el Worker devolviendo 502 (el bug real) ===");
  const e1 = estado();
  console.log("   status :", e1.status, "| clase:", JSON.stringify(e1.clase));
  console.log("   banner :", e1.banner);
  console.log("   detalle:", e1.detalle);
  console.log("   >>> antes decia '☁️ Sincronizado'.");

  console.log("\n=== 2. El usuario guarda algo y el POST falla: secuencia de backoff ===");
  delaysRegistrados = []; llamadas = 0;
  // simulo un guardado: creo un expediente por el formulario
  $("btnNew").click();
  $("f_nro_expediente").value = "363-99999/2026-0";
  $("f_nombre_empresa").value = "Prueba Güemes S.A.";
  $("f_fecha_inicio").value = "01/09/2026";
  $("expForm").dispatchEvent(new win.Event("submit", {bubbles:true, cancelable:true}));
  await new Promise(r => setImmediate(r));
  console.log("   delay del debounce inicial:", delaysRegistrados[0]+"ms");
  for(let i=0;i<7;i++){ await avanzar(70000); }
  const backoffs = delaysRegistrados.slice(1);
  console.log("   reintentos agendados (ms):", backoffs.join(", "));
  check("debounce inicial de 1500ms", delaysRegistrados[0], 1500);
  check("secuencia de backoff exponencial topada", backoffs, [4000,8000,16000,32000,60000,60000,60000]);
  checkQue("ningun reintento con delay 0 (eso era el bucle)", backoffs.every(v => v >= 2000));
  checkQue("crece monotonicamente", backoffs.every((v,i)=> i===0 || v>=backoffs[i-1]));
  checkQue("topado en 60s", backoffs.every(v => v <= 60000));
  // En ~470s de tiempo simulado, con backoff, no puede haber mas de un punado
  // de POSTs. Sin backoff eran cientos en una sola llamada.
  checkQue("POSTs acotados en ~8 min simulados (fueron "+llamadas+")", llamadas <= 12);
  console.log("   >>> antes: 201 POSTs en una sola llamada, sin delay.");

  console.log("\n=== 3. El expediente se guardo localmente igual (local-first intacto) ===");
  const guardado = JSON.parse(win.localStorage.getItem(claveStorage()));
  console.log("   expedientes en localStorage:", guardado.length);
  console.log("   el nuevo esta:", guardado.some(e=>e.nro_expediente==="363-99999/2026-0"));
  console.log("   pendiente de sync marcado:", win.localStorage.getItem("cartas_intencion_sync_pendiente_v1"));

  console.log("\n=== 4. 422 (datos rechazados) -> NO reintenta en loop ===");
  modo = "422"; delaysRegistrados = []; llamadas = 0;
  $("alertaReintentar").click();
  await new Promise(r => setImmediate(r));
  await avanzar(0);
  for(let i=0;i<5;i++) await avanzar(70000);
  check("POSTs tras el 422 (error permanente, no reintenta)", llamadas, 1);
  console.log("   banner:", estado().banner);
  console.log("   detalle:", estado().detalle);

  console.log("\n=== 5. Fallo de red con navigator.onLine=false -> 'Sin conexion' ===");
  modo = "red";
  Object.defineProperty(win.navigator, "onLine", {value:false, configurable:true});
  $("alertaReintentar").click();
  await new Promise(r => setImmediate(r)); await avanzar(0);
  console.log("   status:", estado().status, "| banner:", estado().banner);
  console.log("   detalle:", estado().detalle);

  console.log("\n=== 6. Vuelve la red (evento 'online') -> reintenta sin esperar el backoff ===");
  modo = "ok";
  Object.defineProperty(win.navigator, "onLine", {value:true, configurable:true});
  delaysRegistrados = []; llamadas = 0;
  win.dispatchEvent(new win.Event("online"));
  await new Promise(r => setImmediate(r));
  check("el evento 'online' reintenta sin esperar", delaysRegistrados[0], 0);
  await avanzar(0);
  console.log("   status final:", estado().status, "| banner:", estado().banner);
  console.log("   pendiente limpiado:", win.localStorage.getItem("cartas_intencion_sync_pendiente_v1"));

  check("estado final tras recuperarse", estado().status, "\u2601\ufe0f Sincronizado");
  check("banner oculto tras recuperarse", estado().banner, "(oculto)");
  check("pendiente limpiado", win.localStorage.getItem("cartas_intencion_sync_pendiente_v1"), null);

  console.log("\n" + (fallos ? ("\u274c " + fallos + " fallos") : "\u2705 sync OK"));
  if (fallos) process.exitCode = 1;
})();
