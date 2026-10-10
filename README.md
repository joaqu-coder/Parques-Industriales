# EGPAIS — Cartas de Intención (Parques Industriales)

PWA estática + Cloudflare Worker. "GitHub como base de datos": un solo
archivo `datos.json` en este repo, versionado, editado solo por el Worker.

Repo de datos: `joaqu-coder/Parques-Industriales` (rama `main`, archivo `datos.json`).

## Deploy

1. `npm install -g wrangler` (si no lo tenés).
2. Generá un **Personal Access Token** de GitHub (classic, con permiso `repo`
   sobre `joaqu-coder/Parques-Industriales`, o un fine-grained token
   restringido a ese único repo con permiso de Contents: Read & write).
3. En el dashboard de Cloudflare → tu Worker → **Settings → Runtime
   variables and secrets** (NO en "Builds"): agregá `GITHUB_TOKEN` con ese
   token.
4. Push de este repo a GitHub y conectalo en Cloudflare Workers Builds, con
   **Build command: None** y deploy command `npx wrangler deploy`.
   (O `npx wrangler deploy` manual desde acá.)
5. Verificá `https://tu-worker.workers.dev/api/health` → debe devolver
   `tiene_github_token: true`. Si da `false`, revisá el paso 3: es el error
   más común (cargarlo en la sección que no corresponde).

## Las 5 trampas (ya pisadas una vez, no repetir)

1. El secret va en **Runtime variables and secrets**, nunca en Builds.
2. No agregues `[env.production]` al `wrangler.toml` si el deploy configurado
   en el dashboard es `npx wrangler deploy` sin `--env` — mover `[assets]`
   ahí rompe el binding y la PWA deja de servirse.
3. Un secret nuevo solo se aplica a deployments creados DESPUÉS de guardarlo
   — hace falta un push nuevo, no es caché del navegador.
4. El Service Worker (`public/sw.js`) ya excluye `/api/*` — si lo tocás, no
   saques ese `if`, o la sync "parece" rota sin estarlo.
5. UTF-8 en base64 ya está resuelto en `worker.js` con
   `decodeURIComponent(escape(atob(...)))` / `btoa(unescape(encodeURIComponent(...)))`
   — no "simplificar" sacando el escape/unescape, rompe tildes y ñ.

## Sección "Resoluciones"

Corpus histórico del Ente: **422 resoluciones (2012–2025)**, en
`public/resoluciones.json`. Es **solo lectura** y se sirve como asset
estático — no viaja por `/api/sync` ni se mezcla con `datos.json`, para que
guardar un expediente no reescriba 300 KB de archivo histórico.

La vista (tab *Resoluciones*, hash `#resoluciones`) filtra por año, tema y
autoridad, busca en texto completo (número, expediente, contenido,
observaciones) y pagina de a 100 tarjetas. El JSON se carga la primera vez
que se entra a la pestaña.

El archivo se genera desde el export crudo normalizando **solo** la
capitalización de `tema` (venía la misma categoría escrita de varias formas:
`requerimiento`/`Requerimiento`, `Des adjudicación`/`Desadjudicación`) y
agregando un `id` estable. El resto queda tal cual: hay fechas que en el
original dicen `Falta` o `Sin fecha` y se muestran literales, no se inventan.

Para reemplazar el corpus: pisar `public/resoluciones.json` manteniendo la
forma `[{id, numero_resolucion, anio, fecha, tema, numero_expediente,
autoridad, observaciones, contenido}]` y hacer push.

## Forma de los datos (`datos.json`)

```json
{
  "expedientes": [ { "id": "...", "nro_expediente": "...", "...": "..." } ],
  "plazoDias": 90
}
```

Los expedientes de ejemplo que sembraba la primera versión (`ejemplo:true`)
ya no existen: la app arranca vacía y descarta esos registros si quedaron en
`localStorage` o en `datos.json`.

## Limitación aceptada por ahora

Última escritura gana — si dos dispositivos postean casi al mismo tiempo,
se pisan. Mientras sea una sola persona cargando datos (aunque sea desde
varios dispositivos, no simultáneamente), no es un problema real. Si en el
futuro carga más de una persona en simultáneo, la solución es comparar el
`sha` que devuelve el GET contra el actual antes de pisar.
