#!/usr/bin/env bash
# Corre todas las suites. Sale distinto de 0 si alguna falla.
set -u
cd "$(dirname "$0")/.."
fallos=0

echo "── sintaxis ──────────────────────────────────────────"
node --check worker.js   && echo "  ✅ worker.js"   || fallos=$((fallos+1))
node --check public/sw.js && echo "  ✅ public/sw.js" || fallos=$((fallos+1))
node test/sintaxis-html.js || fallos=$((fallos+1))
node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))" \
  && echo "  ✅ manifest.webmanifest" || fallos=$((fallos+1))

for suite in worker.test.mjs datos.test.js sw.test.js sync.test.js; do
  echo
  echo "── $suite ─────────────────────────────────────────"
  # timeout duro: una suite colgada no puede bloquear el resto.
  timeout 120 node "test/$suite" 2>&1 | grep -v "Not implemented" || true
  [ "${PIPESTATUS[0]:-0}" -ne 0 ] && fallos=$((fallos+1))
done

echo
if [ "$fallos" -eq 0 ]; then echo "✅ TODO VERDE"; else echo "❌ $fallos suite(s) con fallos"; fi
exit "$fallos"
