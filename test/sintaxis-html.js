// Verifica que cada bloque <script> de index.html sea JS valido y que el
// documento tenga la estructura minima. Sin esto, un error de sintaxis en el
// HTML solo se descubre abriendo la app.
const fs = require("fs"), path = require("path"), vm = require("vm");
const p = path.join(__dirname, "../public/index.html");
const html = fs.readFileSync(p, "utf8");

let fallos = 0;
const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!bloques.length) { console.log("  ❌ index.html: no se encontro ningun <script>"); fallos++; }
bloques.forEach((src, i) => {
  try { new vm.Script(src, {filename: `index.html#script[${i}]`}); }
  catch (e) { console.log(`  ❌ index.html script[${i}]: ${e.message}`); fallos++; }
});

const obligatorios = [
  [/^<!doctype html>/i, "<!doctype html>"],
  [/<html lang="/, '<html lang>'],
  [/<meta charset="utf-8">/i, "<meta charset>"],
  [/<meta name="viewport"/, "<meta viewport>"],
  [/<link rel="manifest"/, "<link manifest>"],
  [/<\/body>\s*<\/html>\s*$/, "cierre de body/html"]
];
for (const [re, nombre] of obligatorios) {
  if (!re.test(html)) { console.log(`  ❌ index.html: falta ${nombre}`); fallos++; }
}
if (!fallos) console.log(`  ✅ index.html (${bloques.length} bloques <script>, estructura completa)`);
process.exitCode = fallos ? 1 : 0;
