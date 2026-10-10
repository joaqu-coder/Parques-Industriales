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

## Forma de los datos (`datos.json`)

```json
{
  "expedientes": [ { "id": "...", "nro_expediente": "...", "...": "..." } ],
  "plazoDias": 90
}
```

`datos.json` está versionado en `main` con los 157 expedientes de la planilla
de proyectos. La app no trae datos de ejemplo: si el navegador no tiene nada
guardado, la lista arranca vacía y se llena con lo que devuelve `/api/sync`.

## Importar la planilla (`scripts/importar-planilla.py`)

```
python3 scripts/importar-planilla.py Proyectos_10102026.json datos.json
```

Decisiones de la conversión, por si hay que repetirla:

- `fecha_inicio` ← "Fecha de presetnación" (la planilla la trae en **M/D/YY**:
  `9/1/26` es el 1 de septiembre de 2026). Es la fecha con la que corre el
  semáforo de plazo. 24 expedientes no la tienen: quedan sin semáforo.
- `anio_inicio_expediente` ← "Fecha de inicio expe." (solo el año). Se guarda
  aparte y el gráfico anual lo usa como respaldo cuando no hay fecha de
  presentación. En 18 filas ese año no coincide con el de la presentación: es
  así en la planilla, no se tocó.
- Situación: `ACTIVO` → **En tratamiento**, `DESESTIMADO` → **Desestimada**
  (situación nueva, no corre plazo, igual que Adjudicada).
- Rubro ← "Actividad", normalizando mayúsculas y typos (`Contrucción` →
  Construcción, `Alimenticias` → Alimenticia, `servicios`/`Servicio` →
  Servicios). Rubros nuevos: Manufactura, Servicios, Acopio, Metalúrgica,
  Comercio, Construcción.
- Parques nuevos: **Olacapato** y **Salar de Pocitos** (colores `--s7`/`--s8`,
  validados para daltonismo junto con los otros seis).
- Superficie: se guarda el número; cuando la planilla trae un rango
  (`1500/2500`) se guarda el primer valor y el texto original va al historial.
- "Observación" de la planilla → una nota en el historial del expediente.
- `Sin dato` / `Sin datos` / `Sin contacto` / `Sin mail` → campo vacío.

## Limitación aceptada por ahora

Última escritura gana — si dos dispositivos postean casi al mismo tiempo,
se pisan. Mientras sea una sola persona cargando datos (aunque sea desde
varios dispositivos, no simultáneamente), no es un problema real. Si en el
futuro carga más de una persona en simultáneo, la solución es comparar el
`sha` que devuelve el GET contra el actual antes de pisar.
