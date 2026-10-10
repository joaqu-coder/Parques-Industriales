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
8. **Subí `VERSION` en `public/sw.js` cuando cambies archivos de `public/`.**
   El nombre de la caché depende de ella y `activate` borra las versiones
   anteriores. Si no la subís, los estáticos viejos siguen sirviéndose.
9. **El 6º argumento de `field()` es `mono`, no `required`.** Un `true` ahí no
   marca nada como obligatorio; el 7º sí. Ya pasó una vez.
10. **`JSON.stringify` de un nodo DOM es `{}`.** Un assert que compare dos
    elementos con `JSON.stringify` los da siempre por iguales y pasa en verde
    contra código roto. En los tests, para nodos se usa `checkMismo()`
    (identidad). Esto hizo pasar dos pruebas que no probaban nada.

## Desarrollo

```bash
npm install   # solo jsdom, para los tests
npm test      # 7 suites; sale != 0 si algo falla
npm run deploy
```

Las suites cargan `public/index.html`, `worker.js` y `public/sw.js` tal cual
se despliegan — no hay mocks del código propio. Ver `test/README.md`.

## El semáforo de plazos

El vencimiento se calcula en **días hábiles** desde `fecha_inicio`,
descontando fines de semana y la tabla `FERIADOS` del `index.html`.

**Esa tabla hay que mantenerla a mano cada año.** Los feriados trasladables y
los puentes turísticos los fija el gobierno por decreto, no se pueden
calcular. Cubre 2025-2026.

Cuando el cálculo pisa años sin feriados cargados, el plazo se muestra con `~`
y la app explica por qué (en el `title` del chip y en la ficha del expediente).
No inventa feriados: avisa que está estimando. Pasa de los dos lados:

- hacia adelante, un vencimiento más allá del último año cargado;
- hacia atrás, un expediente iniciado antes del primero — con los datos reales
  esto es la mayoría, porque hay expedientes desde 2013 y la tabla arranca en
  2025.

Para extender, agregá el año al array y el aviso desaparece solo:
`FERIADOS_DESDE_ANIO` y `FERIADOS_HASTA_ANIO` se derivan de los propios datos.

Los umbrales del semáforo (cuándo pasa a alerta y a crítico) y el plazo se
configuran desde el dashboard, sección Urgencias, y viajan en `datos.json`:

- Rojo: plazo vencido o vence hoy.
- Naranja (crítico): quedan `umbrales.critico` días hábiles o menos.
- Amarillo (alerta): quedan `umbrales.alerta` días hábiles o menos.
- Verde: el resto. Adjudicada y Desestimada no corren plazo.

## Forma de los datos (`datos.json`)

```json
{
  "expedientes": [ { "id": "...", "nro_expediente": "...", "...": "..." } ],
  "plazoDias": 90,
  "umbrales": { "alerta": 30, "critico": 15 }
}
```

`plazoDias` y `umbrales` son la configuración del semáforo (ver abajo). Viajan
en el mismo archivo para que valgan en todos los dispositivos. Si `umbrales` no
está, la app usa 30/15 y lo agrega en el próximo guardado.

`datos.json` está versionado en `main` con los 157 expedientes de la planilla
de proyectos. La app no trae datos de ejemplo: si el navegador no tiene nada
guardado, la lista arranca vacía y se llena con lo que devuelve `/api/sync`.

## Las dos pantallas

**Listado** (`#`) — tarjetas filtrables por parque, rubro, situación y texto,
ordenadas por urgencia, con la ficha completa en un modal.

**Dashboard** (`#dashboard`) — pantalla aparte, con la fecha de la última
sincronización con GitHub arriba de todo y cinco secciones navegables por
pestañas (nunca se muestran todas juntas):

| Sección | Qué responde |
| --- | --- |
| Resumen | 5 indicadores: cartas, adjudicadas, tasa, m² y empresas distintas |
| Situación | distribución por estado; tocar un estado lista sus expedientes |
| Parques | **tasa de adjudicación por parque**, solicitudes, m² y evolución anual |
| Rubros | ranking por cartas y empresas distintas; tocar un rubro lista sus empresas |
| Urgencias | los expedientes más atrasados, con el plazo configurable |

Reglas que conviene no romper al tocar esta vista:

1. **Cada cifra se calcula una sola vez**, en `calcularMetricas()`. Las secciones
   solo leen de `state.metricas`. Si una sección necesita un número de otra (la
   tasa general como línea de referencia por parque, por ejemplo) lo referencia;
   no lo vuelve a calcular con otro criterio.
2. **Un campo vacío no es un cero.** Los 50 expedientes sin
   `superficie_solicitada_m2` quedan fuera de la suma y se informan aparte; los
   que no tienen `fecha_inicio` no entran en el semáforo y se avisan. Un
   indicador que no se puede calcular se muestra como tal, no como 0.
3. **Cada número lleva su trazabilidad** (el `<p class="src">` de cada tarjeta:
   qué campo, qué filtro, qué quedó afuera). Si agregás una cifra, agregá la nota.
4. **La tarjeta del listado se reutiliza** (`expCardHtml`) en todos los detalles
   del dashboard. No hay una segunda tarjeta.
5. Rankings: top 5 + "Ver todos" en el mismo lugar, sin tabla aparte que repita
   lo mismo.

### El hallazgo que motivó la vista

La tasa general de adjudicación (20,4% con los 157 expedientes de la planilla)
**no es pareja entre parques**: RDLF 26,1% (6/23), Güemes 24,1% (14/58), Salta
22,0% (11/50), SAC 12,5% (1/8), Mosconi 0% (0/11). Por eso esa comparación es el
primer gráfico de la sección Parques, con la línea de referencia en el promedio
general y la fracción al lado del porcentaje. Los parques con menos de 5
expedientes (Pichanal, Olacapato, Salar de Pocitos) se marcan como muestra chica
y se ocultan por defecto: con 1 o 3 casos la tasa no significa lo mismo.

### Semáforo de urgencia

La sección Urgencias del dashboard es la lista accionable: los expedientes sin
tratar o en tratamiento, del más vencido al que más plazo tiene, con el plazo y
los dos umbrales editables ahí mismo. El detalle del cálculo está arriba, en
**El semáforo de plazos**.

## Importar la planilla (`scripts/importar-planilla.py`)

```
python3 scripts/importar-planilla.py Proyectos_10102026.json datos.json
```

Decisiones de la conversión, por si hay que repetirla:

- `fecha_inicio` ← "Fecha de presetnación" (la planilla la trae en **M/D/YY**:
  `9/1/26` es el 1 de septiembre de 2026). Es la fecha con la que corre el
  semáforo de plazo. 24 expedientes no la tienen: quedan sin semáforo.
- `anio_inicio_expediente` ← "Fecha de inicio expe." (solo el año). Se guarda
  aparte, todavía sin uso en la app. En 18 filas ese año no coincide con el de
  la presentación: es así en la planilla, no se tocó.
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
3. **No hay poll continuo.** Los datos se bajan al abrir la app y al volver a
   la pestaña (con un piso de 30s). Un cambio hecho en otro dispositivo
   mientras tenés la pestaña abierta y en primer plano no aparece solo.
