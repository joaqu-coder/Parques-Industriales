// Entorno simulado de Service Worker
// La Cache API real normaliza una Request-o-string contra el origen antes de
// buscar; el doble tiene que hacer lo mismo o da falsos negativos.
const clave = r => new URL(typeof r==="string" ? r : r.url, "https://x.dev").href;
class FakeCache {
  constructor(n){ this.n=n; this.m=new Map(); }
  async match(req){ return this.m.get(clave(req)) || undefined; }
  async put(req,resp){ this.m.set(clave(req), resp); }
  async addAll(urls){ for(const u of urls){ const r=await globalThis.fetch(u); if(!r.ok) throw new Error("addAll "+u); this.m.set(new URL(u,"https://x.dev").href, r); } }
}
const almacen = new Map();
const caches = {
  async open(n){ if(!almacen.has(n)) almacen.set(n,new FakeCache(n)); return almacen.get(n); },
  async keys(){ return [...almacen.keys()]; },
  async delete(n){ return almacen.delete(n); },
  async match(req){ for(const c of almacen.values()){ const r=await c.match(req); if(r) return r; } }
};
let redCaida=false, pedidosRed=[];
globalThis.fetch = async (req)=>{
  const url = typeof req==="string" ? new URL(req,"https://x.dev").href : req.url;
  pedidosRed.push(url);
  if(redCaida) throw new TypeError("offline");
  return { ok:true, url, cuerpo:"RED:"+url, clone(){ return {...this, clone(){return this;}}; } };
};
const handlers={};
globalThis.self = {
  location:{origin:"https://x.dev"},
  addEventListener:(t,f)=>{ (handlers[t]=handlers[t]||[]).push(f); },
  skipWaiting:async()=>"skipWaiting",
  clients:{claim:async()=>"claim"}
};
globalThis.caches = caches;
globalThis.URL = URL;

const RUTA_SW = require("path").join(__dirname, "../public/sw.js");
// La versión se lee del propio archivo: subir la caché en un deploy no tiene
// por qué romper el test, pero sí tiene que seguir borrando las viejas.
const VERSION_SW = (require("fs").readFileSync(RUTA_SW, "utf8")
  .match(/const VERSION\s*=\s*"([^"]+)"/) || [])[1];
if(!VERSION_SW) throw new Error("sw.js no declara const VERSION");
const CACHE_ESPERADA = "egpais-cartas-intencion-" + VERSION_SW;
require(RUTA_SW);

function ev(tipo, extra){
  const e = Object.assign({ waitUntilP:null, respondWithP:null,
    waitUntil(p){ this.waitUntilP=p; }, respondWith(p){ this.respondWithP=p; } }, extra);
  for(const f of (handlers[tipo]||[])) f(e);
  return e;
}
const pedido = (url,{method="GET",mode="no-cors"}={}) => ({url:new URL(url,"https://x.dev").href, method, mode});

(async()=>{
let fallos=0;
const check=(l,r,e)=>{const ok=JSON.stringify(r)===JSON.stringify(e); if(!ok)fallos++; console.log((ok?"  ✅ ":"  ❌ ")+l+" -> "+JSON.stringify(r)+(ok?"":"  ESPERADO "+JSON.stringify(e)));};

console.log("=== 1. install: precachea el shell ===");
await ev("install").waitUntilP;
const c2 = almacen.get(CACHE_ESPERADA);
check("caché "+VERSION_SW+" creada", !!c2, true);
check("entradas precacheadas", c2.m.size, 4);

console.log("\n=== 2. activate: borra cachés de versiones viejas ===");
almacen.set("egpais-cartas-intencion-v1", new FakeCache("v1"));
almacen.set("otra-app-cache", new FakeCache("otra"));
await ev("activate").waitUntilP;
check("v1 borrada", almacen.has("egpais-cartas-intencion-v1"), false);
check(VERSION_SW+" conservada", almacen.has(CACHE_ESPERADA), true);
check("caché ajena NO tocada", almacen.has("otra-app-cache"), true);

console.log("\n=== 3. /api/* nunca se intercepta (trampa 4 del README) ===");
for(const p of ["/api/sync","/api/health"]){
  const e = ev("fetch",{request:pedido(p)});
  check(p+" sin respondWith", e.respondWithP, null);
}
const ePost = ev("fetch",{request:pedido("/api/sync",{method:"POST"})});
check("POST a /api sin interceptar", ePost.respondWithP, null);

console.log("\n=== 4. POST a otra ruta tampoco se cachea (Cache API solo admite GET) ===");
check("POST / sin respondWith", ev("fetch",{request:pedido("/",{method:"POST"})}).respondWithP, null);

console.log("\n=== 5. Otro origen se ignora ===");
check("cross-origin sin respondWith", ev("fetch",{request:pedido("https://otro.com/x.js")}).respondWithP, null);

console.log("\n=== 6. Navegación: RED PRIMERO (un deploy se ve en la 1ra recarga) ===");
pedidosRed=[];
let r = await ev("fetch",{request:pedido("/",{mode:"navigate"})}).respondWithP;
check("vino de la red", r.cuerpo, "RED:https://x.dev/");
console.log("     >>> antes era cache-first: el HTML viejo ganaba hasta la 2da recarga.");

console.log("\n=== 7. Navegación sin red: cae a la caché ===");
redCaida=true;
r = await ev("fetch",{request:pedido("/",{mode:"navigate"})}).respondWithP;
check("respondió desde caché", !!r, true);
check("es contenido cacheado", String(r.cuerpo).startsWith("RED:"), true);

console.log("\n=== 8. Navegación a ruta no cacheada sin red: cae a '/' ===");
r = await ev("fetch",{request:pedido("/cualquiera",{mode:"navigate"})}).respondWithP;
check("hay respaldo", !!r, true);

console.log("\n=== 9. Estáticos: caché primero, refresco en segundo plano ===");
redCaida=false;
await ev("fetch",{request:pedido("/icons/icon-512.png")}).respondWithP;
pedidosRed=[];
r = await ev("fetch",{request:pedido("/icons/icon-512.png")}).respondWithP;
check("sirvió de caché", !!r, true);
check("igual revalidó contra la red", pedidosRed.length >= 1, true);

console.log("\n"+(fallos?("❌ "+fallos+" fallos"):"✅ service worker OK"));
  if(fallos) process.exitCode = 1;
})();
