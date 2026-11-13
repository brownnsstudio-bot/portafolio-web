# -*- coding: utf-8 -*-
import os, re
RAIZ = r"E:\Proyectos"
OUT = r"H:\Mi unidad\Página WEB\CLIENTES.txt"
# Se incluye TODO (también las agencias: Intermedios, Custom Ideas, etc. — también son clientes).
EXCLUIR = {"Jonathan Pérez Angarita", "Inconcluso"}
AG_RX = re.compile(r"marketing|publicidad|agencia|creative|custom ideas|fans club|intermedios", re.I)

def slug(s):
    s = s.lower()
    for a, b in zip("áéíóúñü´’", "aeiounu--"): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

# pre-llenado de los clientes que ya conozco (rubro, código, descripción web)
KNOWN = {
 "cerberus": ("marca personal de gamer / streamer", "[MED-GAM]", "Marca personal de un gamer: identidad visual y aplicaciones para su comunidad."),
 "la-boulangerie": ("panadería y pastelería francesa", "[ALI-PAN]", "Panadería y pastelería de inspiración francesa."),
 "dolce-riposo": ("objetos fúnebres (urnas, cofres, cruces)", "[SER-FUN]", "Línea elegante de objetos fúnebres: urnas, cofres, cruces y accesorios."),
 "angarita-premiaciones": ("trofeos, medallas y placas de premiación", "[COM-TRO]", "Trofeos, copas, medallas y placas personalizadas para premiaciones y reconocimientos."),
 "bantrophy": ("distribuidora de trofeos y premiación", "[COM-TRO]", "Distribuidora de trofeos, medallas y artículos de premiación."),
 "fotomilenio": ("fotografía y artículos personalizados", "[COM-PER]", "Estudio de fotografía y artículos personalizados / souvenirs."),
 "ihobby": ("hobbies, coleccionables y personalizados", "[COM-PER]", "Tienda de hobbies, coleccionables y artículos personalizados."),
}

# recoger clientes: {sid: {nombre, anios:set, aliado}}
cli = {}
for anio in sorted(os.listdir(RAIZ)):
    pa = os.path.join(RAIZ, anio)
    if not os.path.isdir(pa): continue
    for carp in sorted(os.listdir(pa)):
        if not os.path.isdir(os.path.join(pa, carp)): continue
        m = re.match(r"\((\d{4})-\d\d-\d\d\)\s*(.+)$", carp)
        nombre_full = m.group(2).strip() if m else carp
        ag = re.search(r"\(([^)]*)\)\s*$", nombre_full)
        aliado = ag.group(1) if ag and AG_RX.search(ag.group(1)) else ""
        nombre = nombre_full[:ag.start()].strip() if aliado else nombre_full
        if nombre in EXCLUIR or not nombre: continue
        sid = slug(nombre)
        c = cli.setdefault(sid, {"nombre": nombre, "anios": set(), "aliado": aliado})
        c["anios"].add(anio)
        if aliado and not c["aliado"]: c["aliado"] = aliado
        # la agencia/aliado también es cliente propio (se le hicieron trabajos)
        if aliado:
            ca = cli.setdefault(slug(aliado), {"nombre": aliado, "anios": set(), "aliado": ""})
            ca["anios"].add(anio)

# conservar lo ya escrito (descripción/rubro/código) si el archivo ya existe
prev = {}
if os.path.exists(OUT):
    _c = None
    for l in open(OUT, encoding="utf-8-sig", errors="replace"):
        s = l.strip()
        mc = re.match(r"(?i)^cliente\s*:\s*(.+)$", s)
        if mc:
            _c = slug(re.sub(r"\s*\([^)]*\)\s*$", "", mc.group(1).strip()))
            prev.setdefault(_c, {"desc": "", "rubro": "", "cod": ""})
        elif _c:
            for key, rx in (("desc", r"(?i)^descripci[oó]n\s*:\s*(.*)$"),
                            ("rubro", r"(?i)^rubro\s*:\s*(.*)$"),
                            ("cod", r"(?i)^c[oó]digo\s*:\s*(.*)$")):
                m = re.match(rx, s)
                if m and m.group(1).strip(): prev[_c][key] = m.group(1).strip()

# cada cliente va bajo su PRIMER año
por_anio = {}
for sid, c in cli.items():
    primero = min(c["anios"])
    por_anio.setdefault(primero, []).append((c["nombre"], sid, c))

lineas = []
A = lineas.append
A("PANEL DE CLIENTES · tú pones la DESCRIPCIÓN, Claude pone el rubro")
A("=" * 62)
A("Tú SOLO escribes la DESCRIPCIÓN de cada cliente (algo general, como salga).")
A("Claude se encarga del resto:")
A("  • deduce el RUBRO y le pone el CÓDIGO (crea uno nuevo si hace falta),")
A("  • y MAQUILLA la descripción para la web (ni muy corta ni muy larga).")
A("Deja en blanco la descripción de los que aún no quieras mostrar.")
A("")
A("Por cliente:")
A("  CLIENTE: ...        (ya está, no lo cambies)")
A("  DESCRIPCIÓN: <escribe aquí>")
A("  RUBRO:   (lo pone Claude)")
A("  CÓDIGO:  (lo pone Claude)")
A("=" * 62)
A("")
total = 0
for anio in sorted(por_anio):
    A("")
    A(f"######## AÑO {anio} ########")
    A("")
    for nombre, sid, c in sorted(por_anio[anio], key=lambda x: x[0].lower()):
        total += 1
        extra_anios = sorted(c["anios"] - {anio})
        nota = []
        if extra_anios: nota.append("también: " + ", ".join(extra_anios))
        if c["aliado"]: nota.append("aliado: " + c["aliado"])
        A(f"CLIENTE: {nombre}" + (f"   ({' · '.join(nota)})" if nota else ""))
        p = prev.get(sid)
        if p and (p["desc"] or p["rubro"] or p["cod"]):   # conserva lo ya escrito
            A(f"DESCRIPCIÓN: {p['desc']}")
            A(f"RUBRO: {p['rubro']}")
            A(f"CÓDIGO: {p['cod']}")
        elif sid in KNOWN:
            rub, cod, desc = KNOWN[sid]
            A(f"DESCRIPCIÓN: {desc}")
            A(f"RUBRO: {rub}")
            A(f"CÓDIGO: {cod}")
        else:
            A("DESCRIPCIÓN: ")
            A("RUBRO: ")
            A("CÓDIGO: ")
        A("")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write("\n".join(lineas) + "\n")
print("clientes únicos:", total, "· años:", len(por_anio))
print("archivo:", OUT)
