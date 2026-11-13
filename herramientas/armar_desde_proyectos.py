# Arma datos/portafolio.js leyendo E:\Proyectos (solo lee esa carpeta, nunca la modifica).
#
# Para cada proyecto:
#  1. Si tiene la carpeta ",Página WEB" (la que tú llenas), se usa SOLO esa:
#       00 Logos/Horizontal|Vertical/blanco.png, negro.png, color.png
#       NN Tipo de trabajo/Subtipo/archivos (videos, imágenes, PDF)
#       ficha.txt (sector, subsector, alianza, descripción)
#  2. Si no la tiene todavía (prueba), se toman los videos terminados que haya
#     y se les asigna el tipo de trabajo por el nombre del archivo.
import os, re, json, shutil, sys
from PIL import Image, ImageChops, ImageCms, ImageOps
import io
Image.MAX_IMAGE_PIXELS = None   # banners de gran formato: se reducen a tamaño web, no se copian crudos
_SRGB = ImageCms.createProfile("sRGB")

def a_srgb(im):
    """Convierte a RGB respetando el color real: si trae perfil ICC (CMYK/Adobe), lo pasa a sRGB.
    Así los morados, azules, etc. no se corren al optimizar (p. ej. JPG CMYK de impresión)."""
    icc = im.info.get("icc_profile")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            return ImageCms.profileToProfile(im, src, _SRGB, outputMode="RGB")
        except Exception:
            pass
    return im.convert("RGB") if im.mode != "RGB" else im

RAIZ = r"E:\Proyectos"
WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST_LOGOS = os.path.join(WEB, "assets", "marcas")
DEST_TRAB = os.path.join(WEB, "assets", "trabajos")   # copia web del contenido del Drive (para que el sitio sea publicable)
WEB_MAX = 1600   # lado máximo de las imágenes optimizadas
CAM = re.compile(r"^(c\d{3,}|dji_|dsc|img_|mvi_|gx\d|gopr|gh\d|vid_|pxl_|mah\d|p\d{6,}|clip\d|\d{8}_\d{6}|screen|captura|grabaci|whatsapp video|untitled|sequence|secuencia)", re.I)
VID = (".mp4", ".mov", ".m4v", ".webm")
IMG = (".png", ".svg", ".jpg", ".jpeg", ".webp")
DOC = (".pdf",)
CARPETA_WEB = re.compile(r"^,\s*p[aá]gina\s+web$", re.I)
RECHAZAR_LOGO = {"avips", "coomulpinort", "kdosh", "optiliam", "simon-oligark", "somos-equipo", "tezos", "tierra-santa-visteme", "fotomilenio"}
EXCLUIR = {"Jonathan Pérez Angarita", "Inconcluso", "Nuestra Agencia"}

def cargar_categorias():
    txt = open(os.path.join(WEB, "datos", "categorias.js"), encoding="utf8").read()
    return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
CAT = cargar_categorias()
TIPOS = {t["nombre"]: t["sub"] for t in CAT["tipos"]}
# códigos de CODIGOS.txt:  [SEC-SUB] [TIP-SUB]  al final del nombre del archivo
COD_RX = re.compile(r"\[([A-Z]{3})(?:-([A-Z0-9]{3}))?\]")
def _mapa(lista):
    m = {}
    for g in lista:
        m[(g["cod"], None)] = (g["nombre"], "")
        for c, n in zip(g["cods"], g["sub"]): m[(g["cod"], c)] = (g["nombre"], n)
    return m
COD_TIPO, COD_SECTOR = _mapa(CAT["tipos"]), _mapa(CAT["sectores"])
def codigos(nombre):
    """Devuelve (tipos, sectores) leídos de los [CÓDIGOS] de un nombre de archivo o de un texto de la ficha."""
    tipos, sectores = [], []
    for a, b in COD_RX.findall(nombre.upper() if nombre.strip().startswith("[") else nombre):
        k = (a, b or None)
        if k in COD_TIPO: tipos.append(COD_TIPO[k])
        elif k in COD_SECTOR: sectores.append(COD_SECTOR[k])
    return tipos, sectores
def sin_codigos(t): return re.sub(r"\s*\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]", "", t).strip()

def slug(s):
    s = s.lower()
    for a, b in zip("áéíóúñü´’", "aeiounu--"): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

# Sector de cada cliente (CATEGORIAS.md). La ficha.txt de ",Página WEB" manda sobre esto.
S = {
 "Alimentos y bebidas": {
   "Restaurantes y comidas rápidas": ["Viggo Burger", "Legado", "El Legado"],
   "Bares y discotecas": ["Hangover"],
   "Panadería y repostería": ["La Boulangerie", "Cookiiz"],
   "Productos alimenticios": ["Tienda de Chorizos", "Jombilo´s", "Arroz San Andres", "Centro de Arroces", "Huevos Villa Paula", "Avicola Andina", "Picolandia Ahumados"],
   "Mercados y plazas gastronómicas": ["Mercado del Rio"]},
 "Automotriz y motos": {
   "Concesionarios de motos": ["Yamaha", "Honda Cúcuta", "Honda Aguachica", "AKT Motos del Oriente", "Área Motos", "Nazkar", "Motos Top"],
   "Concesionarios de vehículos": ["Automarcol"],
   "Revisión técnico-mecánica (CDA)": ["CDA Verifycar Villa Rosario", "CDA Verifycar Atalaya", "CDA Verifycar Libertadores"],
   "Estética automotriz": ["Tezos"], "Estaciones de servicio": ["EDS Boconó"], "Movilidad eléctrica": ["Ekomove"]},
 "Salud y bienestar": {
   "Clínicas e IPS": ["IPS Red Salud", "Hospiclinic de Colombia", "Servicios Especializados del Corazón"],
   "Médicos especialistas": ["Dr. José Turizo", "Dr. Juan Carlos Castañeda"],
   "Odontología y estética facial": ["Dr. Albeiro Garcia", "Devolviendo Sonrisas"],
   "Ópticas": ["Óptica Visual", "Optiliam"], "Veterinarias": ["Los Animales de Noé"]},
 "Moda, belleza y cuidado personal": {
   "Ropa y ropa deportiva": ["Colombian GYMWEAR", "Kdosh", "Jeans Maran"], "Calzado": ["Calzados Elite"],
   "Bolsos y accesorios": ["Dukmi", "Bari Bisutería"],
   "Belleza, uñas y spa": ["Self Love", "Braids By DJ", "Hyacinth Nails & Spa", "Janet's Beauty Salón Spa"],
   "Perfumería": ["Perfumería Amsterdan"], "Confección": ["Costuras María"]},
 "Turismo y hotelería": {"Hoteles": ["Hotel Zaraya", "Hotel Exelsior", "Hotel Ibis"], "Agencias de viajes": ["Viajes Dacar L’Alianxa", "Bendito Viaje"]},
 "Construcción, inmobiliaria y hogar": {
   "Constructoras e inmobiliarias": ["Torres del Norte", "Grupo RC"], "Acabados y materiales": ["Cerámicas Duke", "Wally Draywall"],
   "Muebles y decoración": ["Universal del Mueble", "Casa Elegante", "Dolce Riposo"]},
 "Finanzas, seguros y juegos de azar": {"Seguros": ["Meyer Seguros"], "Cooperativas y crédito": ["Coomulpinort", "Credicolombia"], "Juegos de azar": ["Tu Chance"]},
 "Educación": {"Instituciones educativas": ["ISER", "SENA", "Salesiano", "CENSEI"]},
 "Comercio y distribución": {"Tiendas y distribuidoras": ["Tiendas de Colombia", "Distribuidora La 17", "Amex"], "Trofeos, regalos y hobbies": ["Bantrophy", "iHobby"]},
 "Medios, entretenimiento y eventos": {
   "Podcast y creadores de contenido": ["Somos Equipo", "Simón Oligark", "Descubrimientos Impresionantes"],
   "Eventos y decoración": ["Armando Henao Eventos"], "Fotografía": ["Fotomilenio", "Foto Mágica"]},
}
SECTOR = {slug(n): (sec, sub) for sec, d in S.items() for sub, ns in d.items() for n in ns}
SECTOR_NOMBRES = [n for d in S.values() for ns in d.values() for n in ns]

def tipo_por_nombre(rel):
    """Tipo de trabajo provisional para los videos que aún no están en ,Página WEB."""
    n = rel.lower(); b = os.path.basename(n)
    reglas = [
        (r"anima\w*\s*(de\s*)?logo|logo\s*anima|\bintro\b", ("Motion graphics y animación", "Animación de logo")),
        (r"podcast|episodio", ("Producción audiovisual", "Podcast")),
        (r"testimon|entrevista", ("Producción audiovisual", "Testimonios y entrevistas")),
        (r"evento|aniversario|lanzamiento|inaugura|cobertura", ("Producción audiovisual", "Cobertura de eventos")),
        (r"comercial|\bspot\b|cu[ñn]a", ("Producción audiovisual", "Comerciales")),
        (r"tutorial|\btips?\b|consejo|c[oó]mo ", ("Producción audiovisual", "Videos educativos y tutoriales")),
        (r"campa[ñn]a|pauta", ("Social media", "Campañas publicitarias")),
        (r"historia|stor(y|ies)", ("Social media", "Historias")),
        (r"\bia\b|inteligencia artificial", ("Motion graphics y animación", "Video con inteligencia artificial")),
        (r"animaci|motion|\b[23]d\b", ("Motion graphics y animación", "Animación 2D y 3D")),
        (r"reel|tik ?tok|feed|1080x1920|9-16", ("Social media", "Reels")),
    ]
    for rx, t in reglas:
        if re.search(rx, b): return t
    if "redes" in n: return ("Social media", "Reels")
    return ("Producción audiovisual", "Video corporativo e institucional")

def a_blanco(im):
    """Silueta blanca sobre transparente. Si el logo no trae transparencia, se quita el color del fondo (esquinas)."""
    im = im.convert("RGBA"); a = im.getchannel("A")
    if a.getextrema()[0] > 250:
        w, h = im.size
        cs = [im.getpixel(p)[:3] for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
        bg = tuple(sorted(c[i] for c in cs)[1] for i in range(3))
        dif = ImageChops.difference(im.convert("RGB"), Image.new("RGB", im.size, bg)).convert("L")
        a = dif.point(lambda v: 0 if v < 18 else min(255, (v - 18) * 4))
    out = Image.new("RGBA", im.size, (255, 255, 255, 0)); out.putalpha(a)
    bb = a.getbbox()
    return out.crop(bb) if bb else out

def puntaje(rel, tam):
    low = rel.lower(); ext = os.path.splitext(low)[1]; base = os.path.basename(low)
    p = {".svg": 4, ".png": 4, ".webp": 2, ".jpg": 1, ".jpeg": 1}.get(ext, -99)
    if re.search(r"/logos?/", "/" + os.path.dirname(low) + "/"): p += 2
    if re.search(r"mockup|mock up|patr[oó]n|pattern|fondo|aplicaci|papeler|tarjeta|manual|post|historia|story|feed|banner|flyer|plantilla|uniforme|vehicul|valla|presentaci", low): p -= 4
    if re.search(r"principal|oficial|final|horizontal|color|png", base): p += 1
    if re.search(r"blanco|white|negativo", base): p -= 1
    if "implementos" in low: p -= 1
    if 15_000 < tam < 8_000_000: p += 1
    return p

def logo_automatico(logos, sid):
    """Prueba: el mejor archivo «logo» del proyecto, pasado a silueta blanca."""
    if not logos or sid in RECHAZAR_LOGO: return {}
    mejor = max(logos, key=lambda x: puntaje(x[1], x[2]))
    if puntaje(mejor[1], mejor[2]) <= 0: return {}
    try:
        ext = os.path.splitext(mejor[0])[1].lower(); dst = os.path.join(DEST_LOGOS, sid + (".svg" if ext == ".svg" else ".png"))
        if ext == ".svg":
            txt = open(mejor[0], encoding="utf8", errors="ignore").read()
            txt = re.sub(r'fill="(?!none)[^"]*"', 'fill="#FFFFFF"', txt); txt = re.sub(r"fill:\s*(?!none)[^;\"]+", "fill:#FFFFFF", txt)
            open(dst, "w", encoding="utf8").write(txt)
        else:
            im = Image.open(mejor[0]); im.load(); im.thumbnail((900, 900)); a_blanco(im).save(dst, optimize=True)
        return {"H_blanco": "assets/marcas/" + os.path.basename(dst)}
    except Exception as e:
        print("  logo no se pudo leer:", sid, e, file=sys.stderr); return {}

def logos_de_pagina_web(pw, sid):
    """Logos que tú pones: 00 Logos/Horizontal|Vertical/blanco|negro|color.png -> assets/marcas/<id>/H_blanco.png…"""
    out = {}
    base = next((os.path.join(pw, d) for d in os.listdir(pw) if re.match(r"^\d*\s*logos?$", d, re.I)), None)
    if not base: return out
    for orient, letra in (("horizontal", "H"), ("vertical", "V")):
        d = next((os.path.join(base, x) for x in os.listdir(base) if x.lower() == orient), None)
        if not d: continue
        for f in os.listdir(d):
            n, ext = os.path.splitext(f.lower())
            n = sin_codigos(n.upper()).lower()
            # blanco / negro / color; otros colores (beige, marrón…) se guardan como versiones extra
            col = next((c for c in ("blanco", "negro", "color") if c in n), None)
            if not col:
                extra = re.search(r"\(([^)]+)\)\s*$", n)
                col = slug(extra.group(1)) if extra else None
            if col and ext in (".png", ".svg"):
                os.makedirs(os.path.join(DEST_LOGOS, sid), exist_ok=True)
                dst = os.path.join(DEST_LOGOS, sid, f"{letra}_{col}{ext}")
                if ext == ".png":
                    im = Image.open(os.path.join(d, f)); im.load()
                    if im.mode == "RGBA" and im.getchannel("A").getbbox(): im = im.crop(im.getchannel("A").getbbox())   # quita el margen vacío
                    im.thumbnail((900, 900)); im.save(dst, optimize=True)
                else:
                    shutil.copyfile(os.path.join(d, f), dst)
                out[f"{letra}_{col}"] = os.path.relpath(dst, WEB).replace("\\", "/")
    return out

def leer_ficha(pw):
    f = os.path.join(pw, "ficha.txt")
    if not os.path.exists(f): return {}
    d = {}
    for l in open(f, encoding="utf-8-sig", errors="replace"):
        if l.startswith("----"): break
        if ":" in l:
            k, v = l.split(":", 1); v = v.strip()
            if v and not v.startswith("("): d[k.strip().upper()] = v
    return d

def clase(ext):
    return "video" if ext in VID else "imagen" if ext in IMG else "pdf" if ext in DOC else None

def trabajos_de_pagina_web(pw):
    out = []
    for td in sorted(os.listdir(pw)):
        p_t = os.path.join(pw, td)
        tipo = re.sub(r"^\d+\s*", "", td)
        if not os.path.isdir(p_t) or tipo not in TIPOS: continue
        for sd in sorted(os.listdir(p_t)):
            p_s = os.path.join(p_t, sd)
            if not os.path.isdir(p_s): continue
            for dp, _, fns in os.walk(p_s):
                for f in sorted(fns):
                    c = clase(os.path.splitext(f)[1].lower())
                    if c: out.append((os.path.join(dp, f), tipo, sd, c))
    return out

def item(full, tipo, sub, c):
    base = os.path.splitext(os.path.basename(full))[0]
    ts, _ = codigos(base)
    if ts: tipo, sub = ts[0]
    return {"titulo": sin_codigos(base), "clase": c, "tipo": tipo, "sub": sub, "descripcion": "",
            "drive": "", "local": ruta_web(full), "peso": round(os.path.getsize(full) / 1e6)}

def ruta_web(full):
    """Ruta que entiende el navegador: relativa si está en el mismo disco que la página, si no file:///H:/..."""
    try:
        if os.path.splitdrive(full)[0].lower() == os.path.splitdrive(WEB)[0].lower():
            return os.path.relpath(full, WEB).replace("\\", "/")
    except ValueError: pass
    import pathlib
    return pathlib.Path(full).as_uri()

def copiar_trabajo(full, sid):
    """Copia el archivo del Drive DENTRO del proyecto (assets/trabajos/<id>/) con nombre URL-seguro,
    optimizando las imágenes a tamaño web. Devuelve la ruta relativa (para que el sitio sea publicable)."""
    ext = os.path.splitext(full)[1].lower()
    dst_dir = os.path.join(DEST_TRAB, sid); os.makedirs(dst_dir, exist_ok=True)
    nombre = slug(os.path.splitext(os.path.basename(full))[0])
    if ext in (".jpg", ".jpeg", ".png", ".webp"):
        es_png = ext == ".png"
        dst = os.path.join(dst_dir, nombre + (".png" if es_png else ".jpg"))
        try:
            im = Image.open(full); im.load()
            im = ImageOps.exif_transpose(im)   # respeta la orientación EXIF (fotos verticales de cámara/celular no salen giradas)
            w, h = im.size
            if h > 2.5 * w:           # tira muy larga (feed completo, catálogo largo): conservar el alto, limitar solo el ancho
                if w > 900: im = im.resize((900, round(h * 900 / w)), Image.LANCZOS)
            elif max(im.size) > WEB_MAX:
                im.thumbnail((WEB_MAX, WEB_MAX), Image.LANCZOS)
            if es_png:
                if im.mode == "CMYK": im = a_srgb(im)
                im.save(dst, optimize=True)
            else:
                a_srgb(im).save(dst, "JPEG", quality=85, optimize=True)   # respeta perfil ICC → sRGB
        except Exception as e:
            print("  img no se pudo optimizar, se copia tal cual:", os.path.basename(full), e, file=sys.stderr)
            dst = os.path.join(dst_dir, nombre + ext); shutil.copyfile(full, dst)
    elif ext in VID:  # video: se transcodifica a H.264 web (liviano, con faststart)
        dst = os.path.join(dst_dir, nombre + ".mp4")
        try:
            import subprocess
            # limita el LADO LARGO a 1280 px (no solo el ancho): los reels verticales
            # 1080x1920 quedaban enormes. crf 28 + tope de bitrate (maxrate) para un
            # peso liviano sin perder mucha calidad (reels se ven en celular).
            subprocess.run(["ffmpeg", "-y", "-i", full,
                            "-vf", "scale=w=1280:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2",
                            "-c:v", "libx264", "-crf", "28", "-preset", "medium", "-pix_fmt", "yuv420p",
                            "-maxrate", "2.8M", "-bufsize", "5M",
                            "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k",
                            dst], check=True, capture_output=True)
        except Exception as e:
            print("  video no se pudo comprimir, se copia tal cual:", os.path.basename(full), file=sys.stderr)
            dst = os.path.join(dst_dir, nombre + ext); shutil.copyfile(full, dst)
    else:  # pdf u otros: se copian tal cual
        dst = os.path.join(dst_dir, nombre + ext); shutil.copyfile(full, dst)
    return os.path.relpath(dst, WEB).replace("\\", "/")

def fondo_para(im):
    """'claro' si el logo es oscuro (va sobre fondo claro), 'oscuro' si es claro."""
    g = im.convert("RGBA"); px = [p for p in g.resize((80, 80)).get_flattened_data() if p[3] > 128] if hasattr(g, "get_flattened_data") else [p for p in g.resize((80, 80)).getdata() if p[3] > 128]
    if not px: return "oscuro"
    lum = sum(0.2126 * r + 0.7152 * g_ + 0.0722 * b for r, g_, b, a in px) / len(px) / 255
    return "oscuro" if lum > 0.55 else "claro"

# ---------------------------------------------------------------------
#  DRIVE: H:\Mi unidad\Página WEB  (una sola estructura para todos los clientes)
#  El cliente y la fecha salen del NOMBRE del archivo:
#     (2015-04) CerberuS(Blanco) [BRD-LOG] [PSO-MPE].png      ← logo: versión entre paréntesis al final
#     (2026-04) Viggo Burger - Reel 07 [ALI-RES] [RED-REE].mp4 ← trabajo: « - » separa cliente y título
# ---------------------------------------------------------------------
DRIVE = r"H:\Mi unidad\Página WEB"
FECHA_RX = re.compile(r"^\s*\((\d{4})(?:-(\d{2}))?(?:-(\d{2}))?\)\s*(.+)$")

# --- Panel CLIENTES.txt + alias de nombres (los archivos a veces traen otro nombre del cliente) ---
ALIAS = {   # nombre tal como aparece en los ARCHIVOS  ->  nombre del PANEL (CLIENTES.txt)
 "Armando Henao Decorador": "Armando Henao Eventos",
 "Servimpresores La Torre": "Servimpresiones La Torre",
 "Inmobiliaría Aval": "Inmobiliria Aval", "Inmobiliaria Aval": "Inmobiliria Aval", "Inmoviliaria Aval": "Inmobiliria Aval",
 "Aval Inmobiliaria": "Inmobiliria Aval",   # los archivos de logo invierten el orden
 "MIC": "Metales Inoxidables Cúcuta",
 "NR Osorio Motos": "Inversiones NR Osorio Motos",
 "Gladi Accesorios": "Gladi",
 "Vísteme": "Tierra Santa (Visteme)",
 "Viva Fiesta": "Todo Fiesta",
 "Heladería EISS": "Heladeria EISS",
 "Gladys Salòn Spa": "Gladys Salón-Spa",
 "Noé Veterinaria": "Los Animales de Noé",   # cambiaron de nombre; los logos nuevos ya dicen "Noé Veterinaria"
 "Beee": "Beee (Miguel Barragán)",           # los archivos usan solo "Beee"
 "Jennifer Cañizales": "Jennyfer Cañizares", # el PDF del diseño de logo trae otra ortografía del nombre
 "Jennifer Cañizares": "Jennyfer Cañizares",
 "Jennyfer Cañizales": "Jennyfer Cañizares",
}
ALIAS_SLUG = {slug(k): slug(v) for k, v in ALIAS.items()}
# nombre a mostrar en la tarjeta cuando debe diferir del panel (el nombre "de marca" del manual)
DISPLAY_OVERRIDE = {"tierra-santa-visteme": "Vísteme",
                    "los-animales-de-noe": "Noé Veterinaria",   # nombre de marca actual
                    "beee-miguel-barragan": "Beee"}

def canon(raw):
    """slug del cliente, llevando los alias al nombre del panel."""
    s = slug(raw)
    return ALIAS_SLUG.get(s, s)

def leer_panel():
    """CLIENTES.txt -> {slug: {nombre, anio, codigo, desc}}. El usuario pone la descripción; Claude el código."""
    f = os.path.join(DRIVE, "CLIENTES.txt")
    out = {}
    if not os.path.exists(f): return out
    anio = cli = None
    for l in open(f, encoding="utf-8-sig", errors="replace"):
        s = l.strip()
        my = re.match(r"^#+\s*A[ÑN]O\s+(\d{4})", s)
        mc = re.match(r"(?i)^cliente\s*:\s*(.+)$", s)
        md = re.match(r"(?i)^descripci[oó]n\s*:\s*(.*)$", s)
        mk = re.match(r"(?i)^c[oó]digo\s*:\s*(.*)$", s)
        if my: anio = my.group(1); continue
        if mc:
            nom = re.sub(r"\s*\([^)]*\)\s*$", "", mc.group(1).strip())
            cli = slug(nom)
            out.setdefault(cli, {"nombre": nom, "anio": anio, "codigo": None, "desc": ""}); continue
        if cli and md and md.group(1).strip(): out[cli]["desc"] = md.group(1).strip()
        if cli and mk:
            mm = re.search(r"\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]", mk.group(1))
            if mm: out[cli]["codigo"] = mm.group(0)
    return out

PANEL = leer_panel()
CONOCIDOS = sorted(set([d["nombre"] for d in PANEL.values()] + list(ALIAS.keys())), key=len, reverse=True)

def separar_cliente(resto, conocidos):
    """Cliente y título. 1) un cliente conocido al inicio · 2) « - » · 3) hasta el primer paréntesis."""
    n = norm_txt(resto)
    for nombre in sorted(conocidos, key=len, reverse=True):
        k = norm_txt(nombre)
        if n.startswith(k) and (len(n) == len(k) or not n[len(k)].isalnum()):
            return resto[:len(nombre)].strip(), resto[len(nombre):].strip(" -–")
    if " - " in resto: a, b = resto.split(" - ", 1); return a.strip(), b.strip()
    a = re.split(r"\s*\(", resto, 1)[0].strip()
    return a, resto[len(a):].strip()

def norm_txt(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")

def leer_drive(conocidos):
    """Devuelve {id_cliente: {nombre, anio, fecha, logos{}, trabajos[], sectores[]}} leído de DRIVE."""
    out = {}
    if not os.path.isdir(DRIVE): return out
    for dp, _, fns in os.walk(DRIVE):
        partes = os.path.relpath(dp, DRIVE).replace("\\", "/").split("/")
        for f in fns:
            base, ext = os.path.splitext(f); ext = ext.lower()
            if ext in (".txt", ".ini", ".lnk") or f.startswith("~"): continue
            en_galeria = partes[0] == "Galería"
            # dentro de Galería, la subcarpeta "Logos de clientes..." SÍ se usa (solo como logo de la tarjeta)
            logos_ajenos = en_galeria and len(partes) > 1 and partes[1].lower().startswith("logos de clientes")
            if (en_galeria and not logos_ajenos) or any("para info" in p.lower() for p in partes):
                continue   # Galería la arman los pilotos; "(... para info)" es material de referencia
            ts, ss = codigos(base)
            m = FECHA_RX.match(sin_codigos(base))
            if m:
                anio, mes, dia, resto = m.groups()
            else:   # sin (fecha): igual se admite; el año y el cliente los pone el panel
                anio = mes = dia = None
                resto = sin_codigos(base).strip()
            full = os.path.join(dp, f)
            es_logo = (re.match(r"^\d*\s*logos?$", partes[0], re.I) is not None) or logos_ajenos
            # logos "solo para la tarjeta" (recortes del contenido o ajenos): no arman sección de logo
            cover_only = logos_ajenos or (es_logo and any("extra" in p.lower() for p in partes[1:]))
            logo_var = ""
            if es_logo:
                # "Cliente (Variante) H", "Cliente - Propuesta 01 (Color)", "Cliente (Color))", "Cliente Logo (Blanco)"
                # cliente = antes de " - " o del primer "("; variante = el resto, sin la orientación H/V
                corte = len(resto)
                for sep in (" - ", "("):
                    i = resto.find(sep)
                    if i != -1: corte = min(corte, i)
                cliente = re.sub(r"\s+[HVhv]\s*$", "", resto[:corte].strip()).strip()
                cliente = re.sub(r"(?i)\s*\blogos?\b\s*$", "", cliente).strip()   # "Bantrophy Logo" -> "Bantrophy"
                logo_var = re.sub(r"\s+[HVhv]\s*$", "", resto[corte:].strip(" -")).replace("(", "").replace(")", "").strip()
            else:
                cliente, titulo = separar_cliente(resto, conocidos)
            sid = canon(cliente)
            nom = PANEL[sid]["nombre"] if sid in PANEL else cliente
            an = (PANEL[sid]["anio"] if sid in PANEL and PANEL[sid].get("anio") else anio) or "0000"
            fch = f"{anio}-{mes or '01'}-{dia or '01'}" if anio else f"{an}-01-01"
            c = out.setdefault(sid, {"nombre": nom, "anio": an, "fecha": fch, "logos": {}, "trabajos": [], "sectores": [], "galerias": {}})
            c["sectores"] += ss
            if es_logo:
                if ext not in (".png", ".jpg", ".jpeg", ".webp"): continue
                # orientación: primero la letra H/V al final del nombre (p.ej. "Cliente Logo (Color) H");
                # si no la trae, se usa la carpeta (Horizontal/Vertical). Así los logos en
                # "Logos de clientes (que no diseñé yo)" no quedan todos como "H" y pisándose.
                mo = re.search(r"(?i)(?:^|[\s_(-])([HV])\s*$", resto)
                orient = mo.group(1).upper() if mo else ("V" if len(partes) > 1 and partes[1].lower().startswith("v") else "H")
                v = slug(logo_var) or "color"
                v = {"white": "blanco", "black": "negro"}.get(v, v)
                os.makedirs(os.path.join(DEST_LOGOS, sid), exist_ok=True)
                im = Image.open(full); im.load()
                im = ImageOps.exif_transpose(im)
                if ext == ".png":
                    if im.mode == "RGBA" and im.getchannel("A").getbbox(): im = im.crop(im.getchannel("A").getbbox())
                    dst = os.path.join(DEST_LOGOS, sid, f"{orient}_{v}.png")
                    im.thumbnail((900, 900)); im.save(dst, optimize=True)
                else:   # logo en JPG (sin transparencia): se guarda optimizado
                    dst = os.path.join(DEST_LOGOS, sid, f"{orient}_{v}.jpg")
                    im.thumbnail((900, 900)); a_srgb(im).save(dst, "JPEG", quality=88, optimize=True)
                rel = os.path.relpath(dst, WEB).replace("\\", "/")
                c["logos"].setdefault(f"{orient}_{v}", rel)
                if cover_only:
                    continue   # recorte / logo ajeno: sirve para la tarjeta, pero no se arma sección de logo
                logos_tipos = ts if ts else [("Branding e identidad visual", "Diseño de logotipo")]
                for tipo_l, sub_l in logos_tipos:   # ej. [BRD-LOG] → «Diseño de logotipo»; sin código → logotipo por defecto
                    g = c["galerias"].setdefault((tipo_l, sub_l), {"titulo": sub_l or tipo_l, "clase": "galeria", "tipo": tipo_l, "sub": sub_l,
                                                                    "descripcion": "", "drive": "", "local": "", "origen": "drive", "imagenes": []})
                    g["imagenes"].append({"src": rel, "nombre": ("Horizontal" if orient == "H" else "Vertical") + (" · " + logo_var if logo_var else ""), "fondo": fondo_para(im)})
            else:
                k = clase(ext)
                if not k: continue
                tipo = re.sub(r"^\d+\s*", "", partes[0]); sub = partes[1] if len(partes) > 1 else ""
                if tipo not in TIPOS: tipo, sub = ts[0] if ts else ("Sin clasificar", "")
                it = item(full, tipo, sub, k); it["titulo"] = sin_codigos(titulo) or cliente; it["origen"] = "drive"
                it["local"] = copiar_trabajo(full, sid)   # copia optimizada DENTRO del proyecto (publicable)
                c["trabajos"].append(it)
    for sid, c in out.items():
        asegurar_blanco(sid, c["logos"])   # si no hay logo blanco, se crea en PNG (silueta blanca)
        gal = list(c.pop("galerias").values())
        tiene_manual = any(t.get("tipo") == "Branding e identidad visual" and t.get("sub") == "Manual de identidad corporativa" for t in c["trabajos"])
        if tiene_manual:
            gal = []   # prioriza el MANUAL: para ese cliente NO se arma la sección de logo
        # feed de Instagram: piezas "Feed Completo NN" apiladas como un solo feed scrolleable
        def _ncompleto(t):
            m = re.search(r"(\d+)\s*$", t.get("titulo") or ""); return int(m.group(1)) if m else 0
        feed = sorted([t for t in c["trabajos"] if t.get("clase") == "imagen" and re.search(r"feed\s*completo", t.get("titulo") or "", re.I)], key=_ncompleto)
        feed_ids = {id(t) for t in feed}
        feedcol = []
        if feed:
            feedcol = [{"titulo": "Feed de Instagram", "clase": "galeria", "coleccion": "feed-ig", "tipo": "Social media", "sub": "Feed Instagram",
                        "descripcion": "", "drive": "", "local": "", "origen": "drive",
                        "imagenes": [{"src": t["local"], "nombre": "", "fondo": "oscuro"} for t in feed]}]
        # collage de fotografía: todas las fotos del cliente juntas en un mosaico (una sola tarjeta)
        fotos = [t for t in c["trabajos"] if t.get("clase") == "imagen" and t.get("tipo") == "Fotografía"]
        resto_tr = [t for t in c["trabajos"] if id(t) not in feed_ids and not (t.get("clase") == "imagen" and t.get("tipo") == "Fotografía")]
        col = []
        if fotos:
            col = [{"titulo": "Fotografía", "clase": "galeria", "coleccion": "collage", "tipo": "Fotografía", "sub": "",
                    "descripcion": "", "drive": "", "local": "", "origen": "drive",
                    "imagenes": [{"src": t["local"], "nombre": "", "fondo": "oscuro"} for t in fotos]}]
        c["trabajos"] = feedcol + gal + col + resto_tr
    return out

def asegurar_blanco(sid, logos):
    """Si el cliente no tiene logo blanco, lo crea en PNG (silueta blanca sobre transparente),
    guardado como *_blancoauto para que la tarjeta pueda preferir el logo a color cuando exista."""
    if not logos or any("blanco" in k for k in logos):
        return
    src_key = None
    for p in ("_color", "_negro", "_beige", "_marron", "_gris"):
        src_key = next((k for k in logos if k.endswith(p)), None)
        if src_key: break
    src_key = src_key or next(iter(logos))
    orient = src_key.split("_")[0]
    try:
        im = Image.open(os.path.join(WEB, logos[src_key])); im.load()
        sil = a_blanco(im); sil.thumbnail((900, 900))
        dst = os.path.join(DEST_LOGOS, sid, f"{orient}_blancoauto.png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        sil.save(dst, optimize=True)
        logos[f"{orient}_blancoauto"] = os.path.relpath(dst, WEB).replace("\\", "/")
    except Exception as e:
        print("  no se pudo crear logo blanco:", sid, e, file=sys.stderr)

def leer_rubros():
    """Tabla cliente -> rubro (sector) de datos/clientes-rubro.txt. Formato por línea: 'Cliente = [SECTOR-SUB]'.
    Devuelve {slug_cliente: (sector, subsector)}. Así el rubro se asigna automático por cliente."""
    f = os.path.join(WEB, "datos", "clientes-rubro.txt")
    out = {}
    if not os.path.exists(f):
        return out
    for l in open(f, encoding="utf-8-sig", errors="replace"):
        l = l.strip()
        if not l or l.startswith("#") or "=" not in l:
            continue
        cli, cod = l.split("=", 1)
        _, ss = codigos(cod.strip())
        if cli.strip() and ss:
            out[slug(cli.strip())] = ss[0]
    return out

def leer_clientes_drive():
    """Panel de clientes desde H:\\Mi unidad\\Página WEB\\CLIENTES.txt.
    Bloques: 'CLIENTE: ...' + 'DESCRIPCIÓN: ...' + 'CÓDIGO: [SECTOR-SUB]'.
    Devuelve {slug_cliente: (codigo_sector | None, descripcion)}."""
    f = os.path.join(DRIVE, "CLIENTES.txt")
    out = {}
    if not os.path.exists(f):
        return out
    cli = None
    for l in open(f, encoding="utf-8-sig", errors="replace"):
        s = l.strip()
        mc = re.match(r"(?i)^cliente\s*:\s*(.+)$", s)
        md = re.match(r"(?i)^descripci[oó]n\s*:\s*(.*)$", s)
        mk = re.match(r"(?i)^c[oó]digo\s*:\s*(.*)$", s)
        if mc:
            nom = re.sub(r"\s*\([^)]*\)\s*$", "", mc.group(1).strip())  # quita nota "(aliado: ...)"
            cli = slug(nom)
            out.setdefault(cli, [None, ""])
        elif cli and md and md.group(1).strip():
            out[cli][1] = md.group(1).strip()
        elif cli and mk:
            cod = re.search(r"\[[A-Z]{3}(?:-[A-Z0-9]{3})?\]", mk.group(1))
            if cod: out[cli][0] = cod.group(0)
    return {k: tuple(v) for k, v in out.items()}

def main():
    # ===================================================================
    #  SOLO DRIVE (decisión del usuario, 2026-11-05):
    #  la página se llena ÚNICAMENTE con H:\Mi unidad\Página WEB.
    #  NO se lee E:\Proyectos (PC) ni se agrega ISER manual.
    #  (El código que leía el PC quedó respaldado en datos/_backup_predrive/.)
    # ===================================================================
    os.makedirs(DEST_LOGOS, exist_ok=True)
    drive = leer_drive(CONOCIDOS)
    rubros = leer_rubros()           # tabla datos/clientes-rubro.txt (secundaria)
    panel = PANEL                    # panel del Drive CLIENTES.txt: {slug: {nombre, anio, codigo, desc}}
    marcas = []
    for sid, d in sorted(drive.items()):
        if not d["trabajos"]:
            print("  en Drive solo hay logos de", d["nombre"], "(sin trabajos: no se muestra)")
            continue
        pinfo = panel.get(sid, {})
        pcode, pdesc = pinfo.get("codigo"), pinfo.get("desc", "")
        # rubro: 1) código en el archivo · 2) CÓDIGO del panel CLIENTES.txt · 3) tabla clientes-rubro · 4) lista base
        sec, sub = ("Sin clasificar", "")
        if d["sectores"]:
            sec, sub = max(set(d["sectores"]), key=d["sectores"].count)
        elif pcode:
            cs = codigos(pcode)[1]
            if cs: sec, sub = cs[0]
        elif sid in rubros:
            sec, sub = rubros[sid]
        elif sid in SECTOR:
            sec, sub = SECTOR[sid]
        m = {"id": sid, "nombre": DISPLAY_OVERRIDE.get(sid) or d["nombre"], "anio": d["anio"], "fecha": d["fecha"],
             "sector": sec, "subsector": sub, "alianza": "", "descripcion": pdesc,
             "logos": d["logos"], "origen": "Drive", "trabajos": d["trabajos"]}
        marcas.append(m)
        print(f"{len(d['trabajos']):4d} · Drive · logo {'sí' if d['logos'] else 'no'} · {sec[:24]:24s} · {d['nombre']}")
    marcas.sort(key=lambda m: (m["fecha"], m["nombre"].lower()), reverse=True)
    datos = {"marca": "LADO", "frase": "Portafolio de proyectos", "contacto": {"correo": "", "instagram": "", "whatsapp": ""}, "marcas": marcas}
    cab = open(os.path.join(WEB, "datos", "portafolio.js"), encoding="utf8").read().split("window.PORTAFOLIO")[0]
    with open(os.path.join(WEB, "datos", "portafolio.js"), "w", encoding="utf8") as f:
        f.write(cab + "window.PORTAFOLIO = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
    print("SOLO DRIVE · clientes:", len(marcas), "· trabajos:", sum(len(m["trabajos"]) for m in marcas))

main()
