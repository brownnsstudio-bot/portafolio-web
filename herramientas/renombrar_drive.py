# -*- coding: utf-8 -*-
# Renombra los archivos del Drive (H:\Mi unidad\Página WEB) a la convención con códigos:
#     (fecha) Cliente - Título [TIPO-SUB] [SECTOR-SUB].ext
#   · TIPO-SUB  sale de la CARPETA (categoría/subtipo).
#   · SECTOR-SUB sale del CLIENTE (tabla datos/clientes-rubro.txt).
#   · La fecha: si ya está en el nombre se respeta; si no, se toma del archivo (año-mes).
#   · Archivos que YA tienen los dos códigos se dejan igual. Logos (00) y Galería se saltan.
#
# Uso:
#   python renombrar_drive.py                     -> dry-run: solo muestra qué haría
#   python renombrar_drive.py --apply             -> renombra de verdad (todo Página WEB)
#   python renombrar_drive.py "04 Social media"   -> limita a esa carpeta (dry-run)
#   python renombrar_drive.py "04 Social media" --apply
import os, re, json, sys, datetime

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRIVE = r"H:\Mi unidad\Página WEB"
MEDIA = (".mp4", ".mov", ".m4v", ".webm", ".jpg", ".jpeg", ".png", ".webp", ".pdf")

def slug(s):
    s = s.lower()
    for a, b in zip("áéíóúñü´’", "aeiounu--"): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

# --- tipos desde categorias.js ---
cat_txt = open(os.path.join(WEB, "datos", "categorias.js"), encoding="utf8").read()
CAT = json.loads(cat_txt[cat_txt.index("{"): cat_txt.rindex("}") + 1])
TIPO_COD, SUB_COD = {}, {}
for t in CAT["tipos"]:
    TIPO_COD[t["nombre"]] = t["cod"]
    for nombre, c in zip(t["sub"], t["cods"]):
        SUB_COD[(t["nombre"], nombre)] = (t["cod"], c)

# --- clientes -> código de sector ---
# Fuente principal: el panel del Drive CLIENTES.txt (campo CÓDIGO).
# Secundaria: datos/clientes-rubro.txt.
CLI_SEC = {}
rub = os.path.join(WEB, "datos", "clientes-rubro.txt")
if os.path.exists(rub):
    for l in open(rub, encoding="utf-8-sig", errors="replace"):
        l = l.strip()
        if not l or l.startswith("#") or "=" not in l: continue
        cli, cod = l.split("=", 1)
        m = re.search(r"\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]", cod)
        if cli.strip() and m: CLI_SEC[slug(cli.strip())] = m.group(0)
CONOCIDOS = []   # nombres de cliente del panel, para separar cliente/título cuando no hay " - "
CLI_YEAR = {}    # slug(cliente) -> año del panel (para fechar los que no traen fecha)
panel = os.path.join(DRIVE, "CLIENTES.txt")
if os.path.exists(panel):
    _cli = None; _anio = None
    for l in open(panel, encoding="utf-8-sig", errors="replace"):
        s = l.strip()
        my = re.match(r"^#+\s*A[ÑN]O\s+(\d{4})", s)
        mc = re.match(r"(?i)^cliente\s*:\s*(.+)$", s)
        mk = re.match(r"(?i)^c[oó]digo\s*:\s*(.*)$", s)
        if my: _anio = my.group(1); continue
        if mc:
            nom = re.sub(r"\s*\([^)]*\)\s*$", "", mc.group(1).strip())
            _cli = slug(nom); CONOCIDOS.append(nom)
            if _anio: CLI_YEAR[_cli] = _anio
        elif _cli and mk:
            m = re.search(r"\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]", mk.group(1))
            if m: CLI_SEC[_cli] = m.group(0)   # el panel manda
# alias: nombres que en los ARCHIVOS vienen distintos al panel (orden/ortografía)
ALIAS = {"Armando Henao Decorador": "Armando Henao Eventos", "Servimpresores La Torre": "Servimpresiones La Torre",
         "Inmobiliaría Aval": "Inmobiliria Aval", "Inmobiliaria Aval": "Inmobiliria Aval", "Inmoviliaria Aval": "Inmobiliria Aval",
         "Aval Inmobiliaria": "Inmobiliria Aval", "MIC": "Metales Inoxidables Cúcuta",
         "NR Osorio Motos": "Inversiones NR Osorio Motos", "Gladi Accesorios": "Gladi",
         "Vísteme": "Tierra Santa (Visteme)", "Viva Fiesta": "Todo Fiesta", "Heladería EISS": "Heladeria EISS",
         "Gladys Salòn Spa": "Gladys Salón-Spa", "Noé Veterinaria": "Los Animales de Noé",
         "Beee": "Beee (Miguel Barragán)", "Noé Agropecuaría": "Noé Agropecuaria"}
for a in ALIAS: CONOCIDOS.append(a)
CONOCIDOS = sorted(set(CONOCIDOS), key=len, reverse=True)

def anio_de(nombre):
    return CLI_YEAR.get(slug(ALIAS.get(nombre, nombre)))

def _nt(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")

def sec_de(nombre):
    canon = ALIAS.get(nombre, nombre)
    return CLI_SEC.get(slug(canon))

COD_RX = re.compile(r"\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]")
FECHA_RX = re.compile(r"\(\d{4}(?:-\d{2}){0,2}\)")

def separar(sin_c):
    """(cliente, título). 1) un cliente conocido del panel al inicio · 2) « - » · 3) hasta el primer paréntesis."""
    n = _nt(sin_c)
    for nom in CONOCIDOS:
        k = _nt(nom)
        if n.startswith(k) and (len(n) == len(k) or not n[len(k)].isalnum()):
            return nom, sin_c[len(nom):].strip(" -–")
    if " - " in sin_c:
        a, b = sin_c.split(" - ", 1); return a.strip(), b.strip()
    a = re.split(r"\s*\(", sin_c, 1)[0].strip()
    return a, sin_c[len(a):].strip(" -–")

def procesar(base_dir, apply):
    cambios, faltan = [], []
    root = os.path.join(DRIVE, base_dir) if base_dir else DRIVE
    for dp, _, fns in os.walk(root):
        partes = os.path.relpath(dp, DRIVE).replace("\\", "/").split("/")
        if partes[0] == ".": continue
        if partes[0] == "Galería" or re.match(r"^0*0\s", partes[0] + " "):  # Galería y 00 Logos
            continue
        tipo_nombre = re.sub(r"^\d+\s*", "", partes[0])
        sub_nombre = partes[1] if len(partes) > 1 else ""
        tsub = SUB_COD.get((tipo_nombre, sub_nombre))
        tcod = TIPO_COD.get(tipo_nombre)
        for fn in fns:
            base, ext = os.path.splitext(fn)
            if ext.lower() not in MEDIA: continue
            if len(COD_RX.findall(base)) >= 2: continue          # ya codificado
            sin_c = COD_RX.sub("", FECHA_RX.sub("", base)).strip()
            cli, titulo = separar(sin_c)
            sec = sec_de(cli)
            tipcode = (f"[{tsub[0]}-{tsub[1]}]" if tsub else (f"[{tcod}]" if tcod else ""))
            if not sec or not tipcode:
                faltan.append((os.path.join(dp, fn), cli, bool(sec), bool(tipcode))); continue
            fm = FECHA_RX.search(base)
            if fm:
                fecha = fm.group(0)
            elif anio_de(cli):                       # sin fecha: usar el año del panel
                fecha = f"({anio_de(cli)})"
            else:
                dt = datetime.datetime.fromtimestamp(os.path.getmtime(os.path.join(dp, fn)))
                fecha = f"({dt.year}-{dt.month:02d})"
            cuerpo = f"{cli} - {titulo}" if titulo else cli
            nuevo = re.sub(r"\s+", " ", f"{fecha} {cuerpo} {tipcode} {sec}{ext}").strip()
            if nuevo != fn: cambios.append((dp, fn, nuevo))
    for dp, old, new in cambios:
        print("REN:", old, "->", new)
        if apply: os.rename(os.path.join(dp, old), os.path.join(dp, new))
    for p, cli, hs, ht in faltan:
        falta = "rubro del cliente '%s'" % cli if not hs else "tipo (carpeta)"
        print("  PENDIENTE:", os.path.basename(p), "— falta", falta)
    print(f"\n{'APLICADOS' if apply else 'PROPUESTOS (dry-run, nada tocado)'}: {len(cambios)} · pendientes: {len(faltan)}")

if __name__ == "__main__":
    apply = "--apply" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--apply"]
    procesar(args[0] if args else "", apply)
