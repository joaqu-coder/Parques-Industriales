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

El plazo es **estimado, no legal**: se configura desde el dashboard (sección
Urgencias) junto con los dos umbrales, y se guarda en `datos.json`.

- Rojo: plazo vencido o vence hoy.
- Naranja (crítico): quedan `umbrales.critico` días hábiles o menos.
- Amarillo (alerta): quedan `umbrales.alerta` días hábiles o menos.
- Verde: el resto. Adjudicada y Desestimada no corren plazo.

Se cuenta en días hábiles descontando sábados, domingos y la tabla `FERIADOS`
de `public/index.html`, que hoy cubre **2025 y 2026**. En expedientes anteriores
solo se descuentan los fines de semana, así que el atraso puede quedar levemente
sobreestimado; la app lo aclara en la sección. Al empezar un año nuevo hay que
agregar sus feriados a mano.

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

## Limitación aceptada por ahora

Última escritura gana — si dos dispositivos postean casi al mismo tiempo,
se pisan. Mientras sea una sola persona cargando datos (aunque sea desde
varios dispositivos, no simultáneamente), no es un problema real. Si en el
futuro carga más de una persona en simultáneo, la solución es comparar el
`sha` que devuelve el GET contra el actual antes de pisar.
