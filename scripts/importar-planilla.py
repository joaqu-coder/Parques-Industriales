# Convierte la planilla exportada (Proyectos_*.json) al formato de datos.json
# que consume la PWA / el Worker.
#
#   python3 scripts/importar-planilla.py Proyectos_10102026.json datos.json
#
# Ojo con dos cosas de la planilla:
#  - "Fecha de presetnación" viene en M/D/YY (9/1/26 = 1 de septiembre de 2026)
#    y es la que se usa como fecha_inicio, o sea la que dispara el semáforo.
#  - "Sup. solicitada/m²" mezcla formatos: "15.000,00 m²", "3,000", "800",
#    rangos como "1500/2500" y textos "Sin datos".
import json, re, sys, unicodedata

SRC, DST = sys.argv[1], sys.argv[2]

PARQUES = {
    "SALTA": "Salta", "GUEMES": "Güemes", "R_D_L_F": "RDLF", "MOSCONI": "Mosconi",
    "PICHANAL": "Pichanal", "S_A_C": "SAC", "OLACAPATO": "Olacapato",
    "SALAR_DE_POCITOS": "Salar de Pocitos",
}
RUBROS = {
    "manufactura": "Manufactura", "servicios": "Servicios", "servicio": "Servicios",
    "acopio": "Acopio", "metalmecanica": "Metalmecánica", "metalurgica": "Metalúrgica",
    "quimica": "Química", "logistica": "Logística", "comercio": "Comercio",
    "alimenticias": "Alimenticia", "alimenticia": "Alimenticia",
    "contruccion": "Construcción", "construccion": "Construcción", "textil": "Textil",
}
SITUACIONES = {
    "SIN_TRATAMIENTO": "Sin_tratamiento", "ACTIVO": "En_tratamiento",
    "ADJUDICADA": "Adjudicada", "DESESTIMADO": "Desestimada",
}
VACIOS = {"", "sin dato", "sin datos", "sin contacto", "sin mail", "none", "null", "-", "s/d"}


def limpio(v):
    s = "" if v is None else str(v).strip()
    return "" if s.lower() in VACIOS else s


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def fecha(v):
    """La planilla trae M/D/YY (ej. 9/1/26 = 1 de septiembre de 2026)."""
    s = limpio(v)
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", s)
    if not m:
        return ""
    mes, dia, anio = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if anio < 100:
        anio += 2000
    if not (1 <= mes <= 12 and 1 <= dia <= 31):
        return ""
    return "%02d/%02d/%d" % (dia, mes, anio)


def un_numero(s):
    s = s.replace("m²", "").replace("m2", "").strip()
    if re.match(r"^\d{1,3}(\.\d{3})+(,\d+)?$", s):      # 15.000,00
        s = s.replace(".", "").replace(",", ".")
    elif re.match(r"^\d+,\d{3}$", s):                    # 3,000 => miles
        s = s.replace(",", "")
    elif re.match(r"^\d+,\d{1,2}$", s):                  # 299,73 => decimal
        s = s.replace(",", ".")
    elif not re.match(r"^\d+(\.\d+)?$", s):
        return None
    n = float(s)
    return int(n) if n == int(n) else n


def superficie(v):
    """Devuelve (numero, texto_original_si_es_rango_o_ilegible)."""
    s = limpio(v)
    if not s:
        return "", ""
    partes = [p for p in re.split(r"[/]", s) if p.strip()]
    nums = [un_numero(p) for p in partes]
    if nums and nums[0] is not None:
        return nums[0], (s if len(partes) > 1 else "")
    return "", s


def rubro(v):
    s = limpio(v)
    if not s:
        return ""
    return RUBROS.get(sin_tildes(s).lower(), "Otro")


filas = json.load(open(SRC, encoding="utf-8"))
expedientes = []
alertas = []

for i, r in enumerate(filas):
    f_pres = fecha(r.get("Fecha de presetnación"))
    sup, sup_texto = superficie(r.get("Sup. solicitada/m²"))
    parque_src = limpio(r.get("Parque Industrial"))
    parque = PARQUES.get(parque_src.upper(), "")
    if parque_src and not parque:
        alertas.append("parque sin mapear: %r" % parque_src)
    sit_src = limpio(r.get("Sit. del expe")).upper()
    situacion = SITUACIONES.get(sit_src, "Sin_tratamiento")
    if sit_src and sit_src not in SITUACIONES:
        alertas.append("situación sin mapear: %r" % sit_src)

    anio_src = limpio(r.get("Fecha de inicio expe."))
    anio = anio_src if re.match(r"^\d{4}$", anio_src) else ""

    intervenciones = []
    hora = f_pres or ("01/01/" + anio if anio else "s/f")
    obs = limpio(r.get("Observación"))
    if obs:
        intervenciones.append({"hora": hora, "texto": obs, "tipo": "manual"})
    if sup_texto:
        intervenciones.append({
            "hora": hora,
            "texto": "Superficie según planilla: " + sup_texto + (" m²" if "m²" not in sup_texto else ""),
            "tipo": "sistema",
        })

    expedientes.append({
        "id": "exp_imp%03d" % (i + 1),
        "nro_expediente": limpio(r.get("Nro°. de expe")),
        "fecha_inicio": f_pres,
        "anio_inicio_expediente": anio,
        "nombre_empresa": limpio(r.get("Empresa")),
        "parque_industrial": parque,
        "rubro": rubro(r.get("Actividad")),
        "superficie_solicitada_m2": sup,
        "actividad_empresa": limpio(r.get("Act. de la empresa")),
        "situacion": situacion,
        "representante_nombre": limpio(r.get("Representante")),
        "contacto_tel": limpio(r.get("contacto")),
        "contacto_mail": limpio(r.get("mail")),
        "fecha_ultimo_movimiento": f_pres,
        "intervenciones": intervenciones,
    })

json.dump({"expedientes": expedientes, "plazoDias": 90},
          open(DST, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(DST, "a", encoding="utf-8").write("\n")

print("expedientes:", len(expedientes))
print("sin fecha de presentación:", sum(1 for e in expedientes if not e["fecha_inicio"]))
print("sin superficie:", sum(1 for e in expedientes if e["superficie_solicitada_m2"] == ""))
print("sin parque:", sum(1 for e in expedientes if not e["parque_industrial"]))
print("sin rubro:", sum(1 for e in expedientes if not e["rubro"]))
print("con notas:", sum(1 for e in expedientes if e["intervenciones"]))
print("alertas:", sorted(set(alertas)) or "ninguna")
