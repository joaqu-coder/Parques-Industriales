# Qué está faltando

Revisión del estado actual (rama `main`, 157 expedientes). Ordenado por
riesgo, no por esfuerzo. Todo lo de acá está **verificado contra el código y
los datos**, no supuesto.

Lo que ya está resuelto y no vuelve a aparecer acá: manifest e íconos de PWA,
`viewport`, validación del formulario, accesibilidad del modal, backoff del
sync, errores visibles, 7 suites de tests en verde.

---

## 🔴 Críticos — decisiones, no código

### 1. Los datos de producción se escriben en una rama descartable

El Worker ya no hardcodea la rama: si no está `GITHUB_RAMA`, **usa la rama
por defecto del repo**. Y la rama por defecto hoy es
**`claude/adoring-dirac-awnpng`** — una rama de trabajo temporal, no `main`.

Lo que implica:

- Cada expediente que se guarda commitea ahí. `main` —donde vive el código y
  donde cualquiera iría a mirar— **se va quedando atrás en silencio**. Hoy los
  dos `datos.json` todavía son idénticos; en cuanto alguien cargue algo,
  dejan de serlo.
- Si se limpian las ramas `claude/*` (lo normal), **el sync se rompe**. Los
  datos se recuperan del historial, pero la app deja de funcionar.
- Es además la trampa 7 del README: datos y deploy en la misma rama significa
  que **cada guardado puede redeployar el Worker**.

**Arreglo:** crear una rama `datos` dedicada, y cargar `GITHUB_RAMA=datos` en
Cloudflare → Settings → Runtime variables and secrets. De paso, poner `main`
como rama por defecto del repo.

```bash
git branch datos main && git push -u origin datos
```

### 2. El repositorio es público y tiene datos personales

`joaqu-coder/Parques-Industriales` es **público**. `datos.json` tiene nombre y
apellido de 115 representantes, 22 teléfonos y 12 mails, cualquiera los lee
desde github.com sin cuenta. Están además en todo el historial de commits.

Son datos personales de terceros bajo la Ley 25.326. No hay un caso de uso
que lo justifique: es una herramienta interna.

**Arreglo:** pasar el repo a privado (Settings → General → Danger Zone). El
token del Worker sigue funcionando si tiene acceso a ese repo. Ojo: pasarlo a
privado **no borra lo ya expuesto** — si se asume que fue indexado, lo
prolijo es rotar nada (no hay credenciales en los datos) pero sí dejarlo
asentado.

### 3. `/api/sync` no tiene autenticación

Cualquiera que descubra la URL del Worker puede hacer `GET` y bajarse los 157
expedientes completos, o `POST` y reemplazarlos.

El README lo lista como limitación aceptada para el POST, pero **el GET es
igual de grave** y no está mencionado: es exposición de los mismos datos
personales del punto 2, sin necesidad de encontrar el repo.

El Worker ya valida la *forma* de lo que se escribe, así que no se puede
inyectar basura arbitraria — pero sí reemplazar todo por datos válidos.

**Arreglo, de menor a mayor esfuerzo:**

| Opción | Esfuerzo | Nota |
|---|---|---|
| **Cloudflare Access** delante del Worker | bajo, sin tocar código | Login con Google/mail. La recomendada. |
| Header con secreto compartido | medio | Hay que guardarlo en el navegador: protege del escaneo, no de alguien decidido. |
| Login real con usuarios | alto | Recién vale la pena si hay varias personas cargando. |

Los tres puntos de arriba se resuelven en una tarde y **no son de
programación**: son de configuración y de decisión tuya.

---

## 🟠 Altos — baratos y con impacto directo

### 4. Eliminar no pide confirmación

`onDelete()` borra en el acto: un toque accidental y el expediente, con todo
su historial, desaparece. Se recupera del historial de git, pero hay que
pedirlo y saber cuándo pasó.

**Arreglo:** un `confirm()` con el nombre de la empresa. Cinco minutos.

### 5. No se puede filtrar por "Desestimada"

El `<select>` de situación del listado tiene *Sin tratamiento*, *En
tratamiento* y *Adjudicada*. **Falta Desestimada**, aunque es una situación
válida, está en los datos y el dashboard sí la muestra. Quedó afuera cuando
se agregó la situación en el import.

**Arreglo:** una línea de HTML.

### 6. 15 expedientes son invisibles para el seguimiento

Sin `fecha_inicio` no hay semáforo. Hoy **24 expedientes no la tienen**, y
**15 de ellos todavía corren plazo** (no están adjudicados ni desestimados):
no aparecen en Urgencias, no tienen color, nadie los ve.

Y acá está lo bueno: **esos 24 sí tienen `anio_inicio_expediente` cargado**,
un campo que viene de la planilla y que **la app no usa en ningún lado** (0
referencias en el código).

**Dos arreglos posibles:**

- *Rápido:* usar el año como fecha aproximada (`01/01/aaaa`) marcada como
  estimada, para que al menos entren al semáforo y al gráfico anual.
- *Correcto:* sacar las 15 fechas reales de los expedientes y cargarlas.

Lo mejor es hacer los dos: el rápido hoy, el correcto cuando se pueda.

### 7. La tabla de feriados se vence en diciembre de 2026

Cubre 2025–2026. El código es honesto —marca `~` cuando no sabe— pero a
partir de enero de 2027 **todos** los plazos van a mostrar `~`, y el aviso
deja de informar nada por ser universal.

Ya hoy **72 de los 109 expedientes con semáforo** se muestran estimados,
porque arrancaron antes de 2025.

**Arreglo:** agregar los feriados de 2027 al array `FERIADOS` en cuanto salga
el decreto (y considerar cargar 2013–2024 hacia atrás, que es lo que
destrabaría esos 72). Es agregar strings a una lista; el resto se deriva solo.

---

## 🟡 Medios — producto

### 8. No hay forma de sacar los datos

Cero exportación: ni CSV, ni Excel, ni PDF, ni imprimir. Para una oficina que
venía de una planilla, eso es un problema concreto el día que haya que
mandar un informe, presentar algo o cruzar la información con otro sistema.

**Arreglo:** un botón "Exportar CSV" que baje lo que se está viendo (con los
filtros aplicados). Es autocontenido, no necesita librerías.

### 9. No se registra *cuándo* se resolvió un expediente

`situacion` guarda el estado actual, pero no hay fecha de adjudicación ni de
desestimación. Queda la nota de sistema en el historial, pero no es un campo
consultable.

Por eso hoy **no se puede responder**: cuánto tarda en promedio una carta en
adjudicarse, cuántas se adjudicaron este año, si el tiempo de resolución
mejora o empeora. La "tasa de adjudicación" del dashboard es un acumulado
histórico sin dimensión temporal.

**Arreglo:** un campo `fecha_resolucion` que se complete solo al pasar a
Adjudicada o Desestimada. Habilita tiempo de ciclo y adjudicaciones por
período.

### 10. Nadie sabe quién cargó qué

Las intervenciones tienen hora y texto, pero **no autor**. Con una sola
persona da igual; con dos, el historial deja de servir como registro.

Va de la mano del punto 3: si se pone login, el autor sale gratis.

### 11. Calidad de los datos importados

| Hueco | Cuántos | Impacto |
|---|---|---|
| Sin superficie | 50 de 157 | Los totales de m² son un piso, no un número real |
| Sin mail | 145 | No se puede contactar por escrito |
| Sin teléfono | 135 | Casi no hay forma de contactar |
| Sin representante | 42 | No se sabe con quién hablar |
| `nro_expediente` = "Sin expediente" | 7 | Texto basura como número |
| Sin rubro | 2 | Caen en "(sin rubro)" |

Dos cosas puntuales:

- **Un número de expediente duplicado:** `363-55857/2024-0` aparece en
  `exp_imp053` y `exp_imp057` — misma empresa (PANNO TEXTIL S.R.L), mismo
  parque, misma fecha, misma situación. Difieren solo en superficie (2000 vs
  350 m²) y en que uno tiene contacto y el otro no. **O son dos pedidos
  distintos que comparten expediente, o es una fila duplicada en la planilla.
  Hace falta que alguien lo mire.**
- **"Sin expediente" entró como texto** porque esa variante no está en la
  lista `VACIOS` del importador. Deberían ser 7 campos vacíos.

### 12. Los tests no corren solos

7 suites, todas en verde, pero **no hay CI**: no existe `.github/workflows/`.
Hay que acordarse de `npm test` a mano, y es cuestión de tiempo hasta que
alguien no se acuerde.

**Arreglo:** un workflow de GitHub Actions de 15 líneas que corra `npm test`
en cada push. Ojo de excluir la rama de datos, o cada guardado dispara el CI.

---

## 🟢 Bajos — conocidos y razonables por ahora

13. **Última escritura gana.** Dos dispositivos cargando a la vez se pisan. El
    Worker ya recibe el `sha` de GitHub; compararlo antes de escribir sería un
    arreglo chico. Mientras cargue una sola persona, no molesta.
14. **No hay poll continuo.** Los datos se bajan al abrir y al volver a la
    pestaña (piso de 30 s). Documentado y razonable.
15. **No hay paginación.** 157 tarjetas se renderizan de una. Con miles habría
    que virtualizar; con estos volúmenes no es problema.
16. **La empresa es texto libre.** `S.A.` y `SA` son dos empresas distintas
    para la app. La normalización actual (minúsculas, espacios, punto final)
    cubre lo básico. Un catálogo de empresas recién vale la pena si crece.

---

## Lo que necesito que decidas vos

Esto no lo puedo resolver leyendo el código:

1. **¿El repo pasa a privado?** Mi recomendación es que sí, hoy.
2. **¿Quiénes van a usar la app?** Si es una sola persona, varios de los
   puntos de arriba (autoría, concurrencia, login) se pueden postergar
   tranquilos. Si son tres de la oficina, suben de prioridad todos juntos.
3. **¿Importa medir cuánto tarda un trámite?** Si la respuesta es sí, el
   punto 9 hay que hacerlo antes de que se sigan adjudicando expedientes sin
   registrar la fecha — ese dato no se recupera después.
4. **¿Qué informe hay que entregar, a quién y en qué formato?** De eso depende
   si el punto 8 es un CSV simple o algo más.
5. **Las 15 fechas de inicio que faltan, ¿se pueden conseguir?** Son el
   agujero más grande del seguimiento.
6. **El duplicado de PANNO TEXTIL: ¿son dos pedidos o una fila repetida?**
