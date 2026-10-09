# EGPAIS — Cartas de Intención (Parques Industriales)

PWA estática + Cloudflare Worker. "GitHub como base de datos": un solo
archivo `datos.json` en este repo, versionado, editado solo por el Worker.

Repo de datos: `joaqu-coder/Parques-Industriales`, archivo `datos.json`.

**La rama ya no está hardcodeada.** El Worker la resuelve así:

1. Si existe la variable de entorno `GITHUB_RAMA`, usa esa — y verifica que la
   rama exista antes de escribir. Si no existe, falla con un mensaje claro.
2. Si no está, consulta la API y usa la **rama por defecto** del repo.

Esto reemplaza el `const RAMA = "main"` original, que apuntaba a una rama que
este repo nunca tuvo. Ver la trampa 6.

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
5. Verificá `https://tu-worker.workers.dev/api/health`. Ahora prueba GitHub de
   verdad, no solo la presencia del secret. Tiene que devolver:

   ```json
   {
     "ok": true,
     "tiene_github_token": true,
     "tiene_assets": true,
     "github": "ok",
     "rama_en_uso": "<la rama real>",
     "datos_json": "presente",
     "expedientes": 12
   }
   ```

   Si `ok` es `false`, el campo `detalle` dice exactamente qué falló (token
   inválido, token sin permiso de Contents, rama inexistente, rate limit).
   Leelo antes de tocar nada.

6. Opcional pero recomendado: creá una rama solo para datos (ej. `datos`) y
   cargá `GITHUB_RAMA=datos` en Runtime variables and secrets. Mirá la trampa 7
   para entender por qué.

## Las trampas (ya pisadas, no repetir)

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
6. **No hardcodear el nombre de la rama.** Esta es la que costó más caro: el
   Worker tenía `const RAMA = "main"` y el repo nunca tuvo una rama `main`. El
   GET de GitHub devolvía 404, el Worker lo interpretaba como "datos.json
   todavía no existe" y `/api/sync` contestaba **200 con la lista vacía**. El
   `/api/health` decía `tiene_github_token: true`. La app decía "☁️
   Sincronizado". Nada funcionaba y todas las señales decían que sí.

   La lección general: **un 404 de la API de GitHub significa cuatro cosas
   distintas** — archivo inexistente, rama inexistente, repo inexistente, o
   token sin acceso (en repos privados GitHub devuelve 404, no 403, para
   ocultar su existencia). Colapsar las cuatro en "está vacío" es cómo un
   sistema roto se reporta sano. Ahora la rama se verifica aparte, así que un
   404 de contents solo puede ser el caso legítimo.
7. **`datos.json` y el deploy no deberían vivir en la misma rama.** Si Workers
   Builds está conectado a la misma rama donde el Worker commitea los datos,
   **cada guardado de un expediente redeploya el Worker**. El commit lleva
   `[skip ci]`, que ayuda si la plataforma lo respeta, pero la solución segura
   es apuntar `GITHUB_RAMA` a una rama que Builds no observe.

## Forma de los datos (`datos.json`)

```json
{
  "expedientes": [ { "id": "...", "nro_expediente": "...", "...": "..." } ],
  "plazoDias": 90
}
```

## Qué pasa cuando el sync falla

El guardado local es instantáneo y pase lo que pase (localStorage primero,
subida después). Si la subida falla:

- El estado arriba a la derecha pasa a **⛔ Error de sincronización** o
  **⚠️ Sin conexión**, nunca más a "Sincronizado".
- Aparece un **banner rojo** con el mensaje exacto del Worker y un botón
  *Reintentar*.
- El reintento usa **backoff exponencial**: 2s, 4s, 8s, 16s, 32s, y después
  cada 60s. Antes el reintento no tenía delay y era un bucle cerrado.
- Un error 4xx (datos rechazados, token mal configurado) se marca como
  **permanente**: no se reintenta en loop, porque reintentar no lo arregla.
  Se arregla la causa y se toca *Reintentar*.
- Cuando vuelve la red (evento `online`) se reintenta de inmediato, sin
  esperar el backoff.

## Limitaciones aceptadas por ahora

1. **Última escritura gana** — si dos dispositivos postean casi al mismo
   tiempo, se pisan. Mientras sea una sola persona cargando datos (aunque sea
   desde varios dispositivos, no simultáneamente), no es un problema real. La
   solución es comparar el `sha` que devuelve el GET contra el actual antes de
   pisar.
2. **`/api/sync` no tiene autenticación.** Cualquiera que descubra la URL del
   Worker puede hacer POST y sobreescribir `datos.json`. El Worker ahora valida
   la *forma* de lo que se escribe (rechaza lo que no sea `{expedientes: [...]}`),
   así que no se puede meter basura arbitraria, pero sí datos válidos de otra
   persona. Pendiente de decisión.
3. **Los datos solo se bajan al abrir la app.** No hay poll ni refresh al volver
   a la pestaña: los cambios hechos en otro dispositivo aparecen recién al
   recargar.
