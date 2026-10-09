# Pruebas

```bash
npm install   # solo jsdom
npm test
```

Sale distinto de 0 si algo falla, así que sirve para CI.

| Suite | Qué cubre |
|---|---|
| `sintaxis-html.js` | Cada bloque `<script>` de `index.html` compila; el documento tiene doctype, lang, charset, viewport, manifest y cierre. |
| `worker.test.mjs` | El Worker contra una API de GitHub simulada **con las ramas reales del repo** (sin `main`): resolución de rama, los cuatro significados del 404, validación del POST, rutas `/api/*` desconocidas, round-trip UTF-8. |
| `datos.test.js` | El `index.html` real en jsdom: modo demo, lista vacía como dato legítimo, el repo como fuente de verdad, `plazoDias` independiente, el flujo completo cargar→borrar→recargar. |
| `sync.test.js` | Backoff exponencial medido con el tiempo instrumentado, errores permanentes vs. reintentables, visibilidad del error, recuperación por evento `online`. |
| `sw.test.js` | Service worker en un entorno simulado: precache, limpieza de versiones viejas, `/api/` intacto, non-GET, cross-origin, red-primero en navegación, respaldo offline. |

## Por qué así

Nada de mocks del código propio: las suites cargan `public/index.html`,
`worker.js` y `public/sw.js` **tal cual se despliegan**. Lo único simulado es
lo externo — la API de GitHub, la red, el reloj y la Cache API.

El tiempo está instrumentado (`setTimeout` reemplazado) en vez de esperado de
verdad: así se puede medir la secuencia de backoff completa en milisegundos
reales de CPU.

`sync.test.js` tiene un tope de peticiones y `run.sh` un `timeout`: un bucle
de reintentos cuelga la suite para siempre, y **un test que se cuelga no es un
test que falla**.

## Validadas contra mutaciones

Cada suite se verificó reintroduciendo el bug que debía atrapar. Si agregás
una prueba, hacé lo mismo: rompé el código a propósito y confirmá que pasa a
rojo. Dos veces en este repo una prueba pasó en verde contra código roto
porque el escenario no tocaba el camino que creía tocar.

Mutaciones comprobadas: rama hardcodeada `main` · lista vacía tratada como
"sin inicializar" · reintentos sin backoff (estructura original) · backoff sin
techo · 4xx reintentado en bucle · ejemplos subidos al repo · demo no
descartada al guardar · repo vacío ignorado · `plazoDias` sin adoptar ·
`/api/` cacheado por el service worker · falta del viewport · sintaxis JS rota.
