# Manual de funcionamiento

**Cartas de Intención — Parques Industriales (EGPAIS)**

Este manual es para quien usa la app todos los días. Lo técnico (cómo está
hecha, cómo se despliega) está en el [README](README.md).

---

## Índice

1. [Qué hace la app](#1-qué-hace-la-app)
2. [Primer uso e instalación en el celular](#2-primer-uso-e-instalación-en-el-celular)
3. [La pantalla de un vistazo](#3-la-pantalla-de-un-vistazo)
4. [Vista Listado](#4-vista-listado)
5. [El semáforo de plazo](#5-el-semáforo-de-plazo)
6. [Cargar un expediente nuevo](#6-cargar-un-expediente-nuevo)
7. [Ver, editar y eliminar](#7-ver-editar-y-eliminar)
8. [El historial](#8-el-historial)
9. [Buscar y filtrar](#9-buscar-y-filtrar)
10. [Vista Dashboard](#10-vista-dashboard)
11. [Sincronización y trabajo sin internet](#11-sincronización-y-trabajo-sin-internet)
12. [Modo claro y oscuro](#12-modo-claro-y-oscuro)
13. [Problemas frecuentes](#13-problemas-frecuentes)
14. [Mantenimiento](#14-mantenimiento)

---

## 1. Qué hace la app

Lleva el seguimiento de las **cartas de intención** presentadas por empresas
que quieren radicarse en los parques industriales de la provincia. Por cada
carta guarda el expediente, la empresa, el parque, la superficie pedida, el
contacto y todo lo que fue pasando con el trámite.

Responde una pregunta concreta: **qué expedientes hay que mirar hoy**. Por eso
el listado no viene ordenado por fecha de carga sino por urgencia del plazo
administrativo.

Los datos se guardan solos y se comparten entre todos los dispositivos donde
abras la app. No hay que "exportar" ni "guardar archivo" nunca.

---

## 2. Primer uso e instalación en el celular

Entrá a la dirección de la app en el navegador. Listo: no hay usuario ni
contraseña.

La primera vez tarda unos segundos en bajar los expedientes (vas a ver
**⏳ Cargando…** arriba a la derecha). Después abre al instante, incluso sin
señal.

**Para tenerla como una app en el teléfono:**

- **Android (Chrome)**: menú ⋮ → *Agregar a pantalla principal*.
- **iPhone (Safari)**: botón Compartir → *Agregar a inicio*.

Queda con su ícono, abre a pantalla completa y funciona sin conexión.

---

## 3. La pantalla de un vistazo

```
┌──────────────────────────────────────────────────────────────┐
│ EGPAIS · Seguimiento        ☁️ Sincronizado  🌙  + Nuevo exp. │
│ Cartas de Intención — Parques Industriales                   │
├──────────────────────────────────────────────────────────────┤
│  Listado  │  Dashboard                   ← las dos vistas    │
└──────────────────────────────────────────────────────────────┘
```

| Elemento | Para qué |
|---|---|
| **☁️ Sincronizado** | Estado de la sincronización. Ver [sección 11](#11-sincronización-y-trabajo-sin-internet). |
| **🌙 / ☀️** | Cambia entre modo claro y oscuro. |
| **+ Nuevo expediente** | Carga una carta de intención nueva. |
| **Listado / Dashboard** | Las dos vistas. El Dashboard queda guardado en la dirección, así que podés dejarlo como favorito. |

---

## 4. Vista Listado

Cada expediente es una tarjeta:

```
┌────────────────────────────────────────────────────────┐
│ 363-166383/2026-0                                      │
│ SYRER S.R.L                    [12 d háb.] [En tratam.]│
│ Güemes · Manufactura                                   │
└────────────────────────────────────────────────────────┘
```

- Arriba, el **número de expediente**.
- Abajo, la **empresa** (lo que uno busca con la vista).
- En chico, **parque · rubro**.
- A la derecha, el **semáforo de plazo** y la **situación**.

**El orden no es por fecha: es por urgencia.** Primero lo vencido (rojo),
después lo que vence pronto, al final lo que no corre plazo. Si abrís la app y
mirás solo lo de arriba, estás mirando lo que importa.

Tocá cualquier tarjeta para abrir la ficha completa.

### Las cuatro situaciones

| Situación | Significa | ¿Corre plazo? |
|---|---|---|
| **Sin tratamiento** | Presentada, todavía sin movimiento | Sí |
| **En tratamiento** | El expediente está circulando | Sí |
| **Adjudicada** | Terminó bien: se adjudicó el lote | No |
| **Desestimada** | Terminó: se descartó | No |

---

## 5. El semáforo de plazo

Es el cartelito de color al costado de cada expediente. Indica cuánto queda
del plazo administrativo estimado.

| Color | Qué dice | Qué significa |
|---|---|---|
| 🔴 **Rojo** (lleno) | "Vencido hace 8 d háb." / "Vence hoy" | Acción inmediata |
| 🟠 **Naranja** | "12 d háb." | Quedan 15 días hábiles o menos |
| 🟡 **Amarillo** | "25 d háb." | Quedan 30 días hábiles o menos |
| 🟢 **Verde** | "54 d háb." | Hay margen |
| *(nada)* | — | No corre plazo |

**Cómo se cuenta.** Desde la **fecha de inicio** del expediente se cuentan días
**hábiles**: no cuentan sábados, domingos ni feriados (incluido el 17 de junio,
feriado provincial por Güemes). "12 d háb." son doce días de oficina, no doce
días de almanaque.

**Por qué un expediente puede no tener semáforo:**

1. Está **Adjudicada** o **Desestimada** — el trámite terminó.
2. **No tiene fecha de inicio cargada.** Hoy son 24 de los 157 expedientes
   importados de la planilla. Cargando la fecha en la ficha, el semáforo
   aparece solo.

**Cambiar el plazo.** Abajo de los filtros está:

> Plazo administrativo estimado (para el semáforo de urgencia): `90` días
> hábiles desde fecha de inicio

Cambiá el número y todos los semáforos se recalculan al instante. **Ojo:** es
un valor compartido, no una preferencia de tu teléfono. Si lo cambiás acá, se
sincroniza y cambia para todos los dispositivos.

---

## 6. Cargar un expediente nuevo

Tocá **+ Nuevo expediente**. Ningún campo es obligatorio: podés guardar con lo
que tengas a mano y completar después.

| Campo | Cómo cargarlo |
|---|---|
| **Nro. de expediente** | Tal cual figura: `363-166383/2026-0` |
| **Nombre de la empresa** | Razón social |
| **Fecha de inicio** | **`dd/mm/aaaa`**, con barras: `21/08/2026`. Es la fecha de presentación y la que dispara el semáforo — si no la cargás, el expediente no tiene plazo |
| **Parque industrial** | Lista: Salta, Güemes, RDLF, Mosconi, Pichanal, SAC, Olacapato, Salar de Pocitos |
| **Superficie solicitada (m²)** | Solo el número, sin puntos ni "m²": `15000` |
| **Rubro** | Lista de 15 rubros; si ninguno encaja, *Otro* |
| **Situación** | Arranca en *Sin tratamiento* |
| **Actividad de la empresa** | Texto libre: qué va a hacer en el parque |
| **Representante** | Nombre y apellido de quien gestiona |
| **Tel/cel** y **Mail** | Contacto |
| **Nueva nota** | Lo que quieras dejar asentado. Se guarda en el historial con fecha y hora |

Tocá **Guardar**. La tarjeta aparece en el listado en la posición que le
corresponde según su urgencia.

> **El formato de fecha importa.** Tiene que ser `dd/mm/aaaa`. Si escribís
> `21-8-26` o `21/8`, la app no la entiende y el expediente queda sin semáforo.

---

## 7. Ver, editar y eliminar

Al tocar una tarjeta se abre la ficha **en modo lectura** — se ve todo
ordenado, pero no se puede modificar nada sin querer:

- Arriba: empresa, número de expediente, situación y semáforo.
- **Expediente**: parque, superficie, rubro, fecha de inicio y actividad.
- **Contacto**: representante, teléfono y mail.
- **Historial**: todo lo que pasó.

Abajo hay dos botones:

- **Editar** → pasa al formulario, igual al de carga, con los datos cargados.
  Desde ahí: **Guardar**, **Cancelar** (descarta los cambios y vuelve a
  lectura) o **Eliminar**.
- **Eliminar** → **borra el expediente al instante, sin pedir confirmación y
  sin deshacer.** Tratalo con cuidado. Para un expediente que no prosperó, lo
  correcto casi siempre es ponerlo en **Desestimada**, no borrarlo: así queda
  el registro y sale del semáforo igual.

Para cerrar sin tocar nada: la **×** arriba a la derecha, o tocá fuera de la
ventana.

---

## 8. El historial

Cada expediente tiene su propio historial, en orden de lo más nuevo a lo más
viejo. Hay dos tipos de nota:

- **Manuales**: las que escribís vos en *Nueva nota* al guardar. Un llamado,
  documentación que llegó, una reunión.
- **De sistema** (marcadas `SISTEMA`): las escribe la app sola. Hoy se genera
  una cada vez que cambia la situación:
  `Cambio de situación: Sin tratamiento → En tratamiento`.

El historial es **solo de agregar**: no se edita ni se borra. Es el registro de
lo que pasó, y esa es justamente su utilidad.

Los expedientes importados de la planilla ya traen la columna "Observación"
como primera nota.

---

## 9. Buscar y filtrar

Arriba del listado:

- **Todos los parques** — filtra por parque industrial.
- **Todos los rubros** — filtra por rubro.
- **Todas las situaciones** — filtra por estado del trámite.
- **Buscador** — busca mientras escribís en: nombre de empresa, actividad,
  número de expediente y nombre del representante.

Los filtros se combinan (p. ej. *Güemes* + *Manufactura* + "químic"). El orden
por urgencia se mantiene dentro de lo filtrado.

Para limpiar, volvé cada desplegable a la opción "Todos…" y borrá el buscador.
Los filtros no se guardan: al recargar, la app vuelve a mostrar todo.

---

## 10. Vista Dashboard

Todo se calcula en vivo sobre los expedientes cargados. **Los filtros del
listado no afectan al dashboard**: siempre muestra el total.

### Resumen general

Cinco números: **expedientes totales**, **superficie total solicitada** (suma
de m² de todos), **adjudicados**, **en tratamiento** y **sin tratamiento**.

Al costado, *Actualizado: dd/mm/aaaa* — la fecha del movimiento más reciente de
todo el conjunto.

### Por situación

Barras con cuántos expedientes hay en cada etapa, con el color de cada estado
(verde adjudicada, ámbar en tratamiento, gris sin tratamiento, rojo
desestimada).

### Por parque industrial

- **Superficie solicitada** — m² totales pedidos en cada parque. Es la vista de
  presión sobre cada parque.
- **Solicitudes por año** — barras apiladas por año, un color por parque. El
  número arriba de cada barra es el total del año. Tocando (o pasando el mouse
  por) cada tramo se ve el detalle de ese parque en ese año. Abajo, la
  referencia de colores.

Solo entran acá los expedientes **con fecha de inicio cargada**.

### Por rubro

Barras ordenadas de mayor a menor con la cantidad de expedientes por rubro.

---

## 11. Sincronización y trabajo sin internet

El indicador de arriba a la derecha:

| Indicador | Qué pasa | Qué hacer |
|---|---|---|
| **☁️ Sincronizado** | Todo subido y al día | Nada |
| **⏳ Cargando…** | Bajando los datos (al abrir) | Esperar unos segundos |
| **⏳ Sincronizando…** | Hay cambios subiendo | Nada, es automático |
| **⚠️ Sin conexión** | No pudo subir | Seguir trabajando; sube solo al volver la señal |

**Lo importante:**

- **Lo que guardás queda guardado siempre**, haya o no internet. Se guarda
  primero en el teléfono y después se sube; nunca se pierde una carga por
  quedarse sin señal.
- **Podés trabajar offline.** Cargá, editá y borrá tranquilo en el campo o
  donde no haya señal. Cuando vuelva, la app sube todo sola.
- **No cierres la app apenas guardás si estás sin señal.** Dejá que llegue a
  decir *Sincronizado* cuando vuelvas a tener conexión. Si cerrás antes, el
  cambio sigue guardado en ese dispositivo y se sube la próxima vez que abras
  la app ahí mismo.
- **Si estuviste sin señal, abrí primero el dispositivo donde cargaste.** La
  app nunca pisa trabajo sin subir: si hay cambios pendientes, los sube antes
  de bajar nada.

> **Una persona por vez.** Si dos personas cargan al mismo tiempo desde
> dispositivos distintos, gana la última en subir y se pierde lo de la otra.
> Mientras cargue una sola persona (aunque sea desde varios dispositivos, no
> a la vez), no hay problema.

---

## 12. Modo claro y oscuro

El botón **🌙 / ☀️** cambia entre los dos. Queda guardado en ese dispositivo y
se aplica apenas abre, sin destello blanco. Es una preferencia tuya: no se
sincroniza ni afecta a nadie más.

---

## 13. Problemas frecuentes

**"Cargué un expediente y no lo veo en la lista."**
Casi siempre hay un filtro puesto. Poné todos los desplegables en "Todos…" y
vaciá el buscador. Si no, fijate que no esté más abajo: el orden es por
urgencia, y un expediente sin fecha de inicio va al final.

**"Un expediente no tiene semáforo."**
O está Adjudicada/Desestimada (correcto, no corre plazo), o le falta la fecha
de inicio. Editalo y cargala en formato `dd/mm/aaaa`.

**"Dice Sin conexión."**
Es el aviso de que no pudo subir, no de que se perdió algo. Seguí trabajando;
sube solo. Si estás con señal y sigue así, cerrá y volvé a abrir la app.

**"Abrí la app en otro dispositivo y faltan cosas."**
Revisá en el dispositivo donde cargaste que diga *Sincronizado*. Si dice
*Sin conexión* o *Sincronizando*, esos cambios todavía no subieron.

**"Borré un expediente sin querer."**
No hay deshacer en la app. Cada guardado queda registrado en el repositorio de
datos, así que es recuperable, pero hay que pedírselo a quien administra el
sistema. Por eso: para descartar un expediente, usá **Desestimada**.

**"La app no se actualizó después de un cambio."**
Cerrala del todo y volvé a abrirla. En el navegador, recargá dos veces.

---

## 14. Mantenimiento

**Feriados (una vez al año).** La tabla de feriados que usa el semáforo llega
hasta **2026**. A fin de año, cuando el gobierno confirma por decreto los
feriados trasladables, hay que agregar el año siguiente. Si no se hace, el
semáforo cuenta como hábiles días que no lo son y los vencimientos aparecen
antes de lo que corresponde. Es un cambio de código: ver la sección
*Mantenimiento anual* del [README](README.md).

**Carga masiva desde planilla.** Si hay que volver a importar el Excel de
proyectos, está el script `scripts/importar-planilla.py`, documentado en el
README. **Pisa todos los datos**: no es para uso cotidiano.
