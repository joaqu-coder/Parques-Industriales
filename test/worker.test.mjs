// Mock de la API de GitHub: el repo REAL, sin rama main.
const RAMAS = ["claude/adoring-dirac-awnpng","modo-claro-y-tipografia","rediseno-tarjeta-expediente"];
const DEFAULT_BRANCH = "claude/adoring-dirac-awnpng";
let archivo = null; // datos.json no existe todavia
let puts = [];

function res(status, obj, hdrs={}){ return new Response(JSON.stringify(obj), {status, headers:hdrs}); }

globalThis.fetch = async function(url, opts){
  url = String(url); opts = opts || {};
  const m = url.match(/repos\/[^/]+\/[^/]+(\/.*)?$/);
  const resto = (m && m[1]) || "";
  if(resto === "" ) return res(200, {default_branch: DEFAULT_BRANCH});
  if(resto.startsWith("/branches/")){
    const b = decodeURIComponent(resto.slice("/branches/".length));
    return RAMAS.includes(b) ? res(200,{name:b}) : res(404,{message:"Branch not found"});
  }
  if(resto.startsWith("/contents/datos.json")){
    if(opts.method === "PUT"){
      const body = JSON.parse(opts.body);
      if(!RAMAS.includes(body.branch)) return res(404,{message:"Branch "+body.branch+" not found"});
      puts.push(body);
      archivo = {content: body.content, sha:"sha_"+puts.length};
      return res(200,{commit:{sha:"c0ffee"+puts.length}});
    }
    const ref = decodeURIComponent((url.split("ref=")[1]||""));
    if(!RAMAS.includes(ref)) return res(404,{message:"No commit found for the ref "+ref});
    if(!archivo) return res(404,{message:"Not Found"});
    return res(200,{content:archivo.content, sha:archivo.sha});
  }
  return res(404,{message:"Not Found"});
};

const { default: worker } = await import(new URL("../worker.js", import.meta.url));
const env = { GITHUB_TOKEN: "tok", ASSETS: {fetch: async()=>new Response("<html>")} };
const call = (path, init) => worker.fetch(new Request("https://x.dev"+path, init), env);
const show = async (label, r) => {
  const t = await r.text();
  console.log("  ["+r.status+"] "+label+"\n        "+t.slice(0,300));
};

console.log("=== 1. /api/health ahora prueba GitHub de verdad ===");
await show("GET /api/health", await call("/api/health"));

console.log("\n=== 2. GET /api/sync (datos.json no existe aun) ===");
await show("GET /api/sync", await call("/api/sync"));

console.log("\n=== 3. POST /api/sync -> escribe en la rama CORRECTA ===");
await show("POST /api/sync", await call("/api/sync", {method:"POST", body:JSON.stringify({expedientes:[{id:"a",nombre_empresa:"Güemes S.A."}],plazoDias:90})}));
console.log("        rama usada por el PUT:", puts[0].branch);
console.log("        mensaje de commit:", puts[0].message);

console.log("\n=== 4. round-trip: lo que se escribio se lee igual (con tildes) ===");
const r4 = await call("/api/sync"); const d4 = await r4.json();
console.log("  ["+r4.status+"]", JSON.stringify(d4));

console.log("\n=== 5. Validacion: basura rechazada en vez de escrita ===");
for(const [label,body] of [["no es objeto","[1,2,3]"],["sin expedientes",'{"plazoDias":90}'],["expediente no-objeto",'{"expedientes":[1]}'],["plazoDias absurdo",'{"expedientes":[],"plazoDias":999999999}'],["JSON roto","{nope"]]){
  await show("POST ("+label+")", await call("/api/sync",{method:"POST", body}));
}
console.log("        PUTs totales (deberia seguir en 1):", puts.length);

console.log("\n=== 6. GITHUB_RAMA inexistente -> error claro, no silencio ===");
await show("GET /api/sync", await worker.fetch(new Request("https://x.dev/api/sync"), {GITHUB_TOKEN:"tok", GITHUB_RAMA:"main", ASSETS:env.ASSETS}));

console.log("\n=== 7. Rutas /api/* desconocidas -> 404 JSON, no index.html con 200 ===");
await show("GET /api/pepe", await call("/api/pepe"));
console.log("\n=== 8. Token ausente / invalido -> hint accionable ===");
await show("GET /api/sync sin token", await worker.fetch(new Request("https://x.dev/api/sync"), {ASSETS:env.ASSETS}));
