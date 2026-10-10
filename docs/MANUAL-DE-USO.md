# Manual de uso

Para quien carga y sigue los expedientes. No hace falta saber nada técnico.

> **La regla de oro:** lo que escribís se guarda en tu dispositivo **al
> instante**, siempre, incluso sin internet. La subida al servidor va después,
> sola. Nunca vas a perder algo por tocar Guardar sin señal.

---

## 1. Abrir la app

Entrá a la dirección del Worker desde cualquier navegador. Funciona igual en
celular y en compu.

**Instalala en el celular** (muy recomendado): te queda un ícono como
cualquier otra app, abre a pantalla completa y anda sin conexión.

- **Android / Chrome:** menú `⋮` → *Agregar a la pantalla principal*.
- **iPhone / Safari:** botón compartir → *Agregar a inicio*.

Arriba a la derecha hay un botón **🌙 / ☀️** para cambiar entre modo claro y
oscuro. Esa preferencia es tuya y no afecta a los demás.

---

## 2. Las dos pantallas

Arriba de todo hay dos pestañas:

- **Listado** — el día a día: buscar, cargar y actualizar expedientes.
- **Dashboard** — los números: cuánto, dónde, quién y qué se está venciendo.

---

## 3. El listado

Cada expediente es una tarjeta:

```
┌──────────────────────────────────────────────────────┐
│ 363-65027/2026-0                                     │
│ PREMOLDEADOS DEL NORTE S.A.      🔴 Vencido hace     │
│ Güemes · Manufactura                 12 d háb.       │
│                                   [En tratamiento]   │
└──────────────────────────────────────────────────────┘
```

Arriba el número de expediente, abajo la empresa, y a un costado el **plazo**
y la **situación**.

### El orden no es alfabético: es por urgencia

La lista viene ordenada **de lo más urgente a lo menos urgente**. Lo primero
que ves es lo que hay que atender.

| Chip | Significa |
|---|---|
| 🔴 **Rojo** | Vencido, o vence hoy |
| 🟠 **Naranja** | Crítico — quedan 15 días hábiles o menos |
| 🟡 **Amarillo** | En alerta — quedan 30 días hábiles o menos |
| 🟢 **Verde** | En plazo |
| *(sin chip)* | No corre plazo: está Adjudicada / Desestimada, **o le falta la fecha de inicio** |

Los umbrales de 15 y 30 días son configurables (§7).

### El `~` antes del número

`~45 d háb.` quiere decir **estimado**. La app tiene cargados los feriados de
2025 y 2026 nada más; cuando la cuenta pisa otro año, no puede ser exacta.
Como los feriados que faltan solo suman días, **la fecha real es igual o
posterior** a la que ves. Nunca vas a llegar tarde por confiar en el `~`.

Tocá el chip para ver la explicación.

### Buscar y filtrar

- **Buscador:** busca a la vez en nombre de empresa, actividad, número de
  expediente y representante.
- **Tres filtros:** parque, rubro y situación. Se combinan entre sí y con el
  buscador.

> **Ojo:** el filtro de situación hoy **no incluye Desestimada**. Para ver
> esos expedientes, buscalos por nombre o número.

---

## 4. Cargar un expediente nuevo

1. Tocá **+ Nuevo expediente**.
2. Completá. Solo dos campos son obligatorios, marcados con `*`:
   - **Nombre de la empresa**
   - **Fecha de inicio** — la fecha de presentación, en formato `dd/mm/aaaa`
3. **Guardar.**

### Sobre la fecha de inicio

Es el campo más importante del formulario. **Todo el semáforo depende de
ella.** Sin fecha de inicio el expediente se carga igual, pero queda sin plazo
y sin color: no aparece en la lista de urgencias y es invisible para el
seguimiento.

La app es estricta a propósito: `31/02/2026` se rechaza en vez de guardarse
corrida al 3 de marzo.

### Los demás campos

| Campo | Comentario |
|---|---|
| Nro. de expediente | El número administrativo. Si todavía no lo tenés, dejalo vacío. |
| Parque industrial | Lista de 8. |
| Superficie (m²) | Solo el número. **Si no lo sabés, dejalo vacío** — no pongas 0: el dashboard excluye los vacíos de los totales, pero un 0 lo cuenta como real. |
| Rubro | Lista de 15. Si ninguno encaja, *Otro*. |
| Situación | Arranca en *Sin tratamiento*. |
| Actividad de la empresa | Texto libre: qué hace realmente. |
| Representante / tel / mail | Datos de contacto. |
| Nueva nota | Lo que quieras dejar asentado. Ver §6. |

---

## 5. Ver y editar un expediente

Tocá cualquier tarjeta y se abre la **ficha**: datos del expediente, contacto
e historial completo.

- **Editar** → el formulario, con todo cargado. Cambiá y Guardá.
- **Cancelar** → vuelve a la ficha sin guardar.
- **Escape**, la **×** o tocar afuera → cierra.

---

## 6. El historial

Cada expediente lleva su propio historial. Es la memoria del trámite: quién
llamó, qué documentación falta, qué dijo la empresa.

**Para agregar algo:** abrí el expediente → Editar → escribí en **"Nueva
nota"** → Guardar. Se agrega arriba de todo, con fecha y hora.

Dos tipos de entrada:

- **Manual** — la escribiste vos.
- **`sistema`** — la generó la app. Hoy solo para cambios de situación:
  *"Cambio de situación: Sin tratamiento → Adjudicada"*.

> **El historial no se puede editar ni borrar.** Es a propósito: es el
> registro de lo que pasó. Si te equivocaste, agregá una nota nueva
> aclarándolo.

---

## 7. Cambiar el plazo y los umbrales

El plazo **no es un plazo legal fijo**: es un plazo administrativo estimado
que vos configurás. Por defecto son **90 días hábiles** desde la fecha de
inicio.

Se cambia en dos lugares, y son el mismo valor:

- En el **Listado**, arriba de las tarjetas.
- En **Dashboard → Urgencias**, donde además configurás cuándo pasa a
  **alerta** (amarillo, default 30 días hábiles restantes) y a **crítico**
  (naranja, default 15).

> ⚠️ **Esto es compartido.** El plazo y los umbrales viajan en la base de
> datos: si los cambiás, cambian **para todos los dispositivos**, no solo
> para vos. El tema claro/oscuro, en cambio, es personal.

El semáforo se recalcula entero al instante.

---

## 8. El dashboard

Arriba de todo, **cuándo fue la última sincronización** — para saber qué tan
vieja es la foto que estás mirando. Después, cinco secciones:

### Resumen
Las cinco cifras base: cartas ingresadas, adjudicadas, **tasa de
adjudicación**, superficie total y empresas distintas.

Debajo de cada número hay una nota que dice **de qué campo sale y con qué
filtro**. Y cuando un número puede sorprender, la pantalla lo explica sola:
por qué 157 cartas dan 151 empresas (6 presentaron más de una), o cuántos
expedientes quedaron fuera de la suma de m² por no tener el dato.

### Situación
Cuántos hay en cada estado, con porcentaje. **Tocá una barra** y se despliega
la lista de esos expedientes; tocá cualquiera para abrir su ficha.

### Parques
La sección más analítica. Cuatro gráficos:

1. **Tasa de adjudicación por parque** — qué parque convierte mejor las cartas
   en adjudicaciones, ordenado de mayor a menor, con una **línea de
   referencia** en el promedio general. Los parques con menos de 5
   expedientes se marcan *muestra chica* y se ocultan por defecto: uno con 1
   carta y 1 adjudicación da 100% y no es comparable con uno de 50.
2. **Solicitudes por parque.**
3. **Superficie por parque** — avisa cuántos expedientes de cada parque no
   tienen el dato, así sabés qué tan sólido es el total.
4. **Solicitudes por año** — barras apiladas por parque: qué parque está
   creciendo y cuál se frenó.

### Rubros
Ranking por cantidad de cartas. Tocá un rubro → sus empresas. Tocá una empresa
→ sus cartas.

### Urgencias
La pantalla accionable. Arriba los cuatro contadores (vencidos, críticos, en
alerta, en plazo) y debajo los **10 más urgentes**, con la fecha de
vencimiento y la de inicio. "Ver todos" despliega el resto.

También avisa cuántos expedientes **no se pueden calcular** por no tener fecha
de inicio. **Esos son los primeros a completar**: hoy son 15 y están
invisibles para el seguimiento.

---

## 9. El indicador de sincronización

Arriba a la derecha, siempre visible.

| Estado | Qué significa | Qué hacer |
|---|---|---|
| ☁️ **Sincronizado** | Todo subido. | Nada. |
| ⏳ **Cargando…** | Bajando los datos del servidor. | Esperar. |
| ⏳ **Sin sincronizar** | Guardado acá, todavía no subido. | Nada, sube solo en segundos. |
| ⏳ **Sincronizando…** | Subiendo ahora. | Esperar. |
| ⚠️ **Sin conexión** | No hay red. | Nada. Sube solo cuando vuelva. |
| ⛔ **Error de sincronización** | El servidor rechazó algo. | Leer el banner rojo. |

Cuando algo falla aparece un **banner rojo** con el mensaje exacto y un botón
**Reintentar**. Si el error es de configuración (token vencido, por ejemplo),
la app deja de reintentar sola para no esconder el problema: hay que
arreglar la causa y tocar Reintentar.

**En los dos casos de falla tus datos están guardados en el dispositivo.** No
reescribas nada.

---

## 10. Trabajar sin conexión

Funciona. La app abre, podés ver, cargar y editar todo. Los cambios quedan en
el dispositivo y se suben solos cuando vuelve la señal.

Lo único que no vas a ver sin conexión son los cambios que **otra persona**
hizo mientras tanto.

---

## 11. Usar varios dispositivos

Funciona, con **una regla**: no cargues desde dos dispositivos al mismo
tiempo.

El sistema guarda el archivo completo en cada subida, así que **la última
escritura gana**. Si cargás un expediente en la compu y otro en el celular
casi en simultáneo, uno de los dos se pierde.

En la práctica, si sos una sola persona alternando entre compu y celular, no
hay problema. Antes de empezar a cargar desde otro dispositivo, abrilo y
esperá a que diga **☁️ Sincronizado**.

Los datos se bajan al abrir la app y al volver a la pestaña. Si tenés la
pestaña abierta y adelante, un cambio hecho en otro lado no aparece solo:
cambiá de pestaña y volvé, o recargá.

---

## 12. Eliminar un expediente

Abrí el expediente → **Eliminar**.

> ⚠️ **No pide confirmación: se borra en el acto.** Es un riesgo conocido y
> está en la lista de arreglos pendientes. Por ahora, cuidado con el botón.

**Se puede recuperar.** Cada guardado deja un commit en el repositorio, así
que el expediente sigue en el historial. Pedí que lo restauren desde ahí
indicando, más o menos, cuándo se borró.

---

## 13. Problemas frecuentes

**No veo un expediente que cargué.**
Fijate si hay un filtro o una búsqueda activa. El dashboard, en cambio,
siempre cuenta todo sin filtrar.

**Un expediente no tiene chip de color.**
O está Adjudicado/Desestimado (no corre plazo), o **le falta la fecha de
inicio**. Abrilo y fijate.

**Los números del dashboard no me cierran.**
Leé las notas debajo de cada gráfico: casi siempre explican la diferencia
(campos vacíos excluidos, empresas con más de una carta, expedientes sin
fecha). Si después de eso sigue sin cerrar, es un bug: reportalo.

**Cambié algo en la compu y no aparece en el celular.**
Abrí el celular y esperá a que diga Sincronizado. Si ya estaba abierto, salí
de la pestaña y volvé, o recargá.

**Dice "Error de sincronización" hace rato.**
Leé el mensaje del banner, es específico. Si habla del token o de permisos,
es configuración del servidor: avisá a quien administra el deploy.

**Puse mal un dato y ya guardé.**
Editá y corregí. Si es importante que quede asentado, agregá una nota al
historial explicando la corrección.
