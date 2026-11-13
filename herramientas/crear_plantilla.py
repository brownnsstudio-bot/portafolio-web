# Crea la carpeta de ejemplo «Página WEB» con todas las categorías y subcategorías.
# Uso: python crear_plantilla.py "H:\Mi unidad"
# Solo crea carpetas y dos archivos de texto; si ya existen, no borra ni sobrescribe nada.
import os, sys, json

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def cargar_categorias():
    txt = open(os.path.join(WEB, "datos", "categorias.js"), encoding="utf8").read()
    return json.loads(txt[txt.index("{"): txt.rindex("}") + 1])

FICHA = """CLIENTE: (si se deja vacío, se toma el nombre de la carpeta del proyecto)
SECTOR: (código de la lista de abajo, ej.: ALI-RES  ·  o el nombre: Alimentos y bebidas)
SUBSECTOR: (solo si en SECTOR pusiste el nombre, ej.: Restaurantes y comidas rápidas)
EN ALIANZA CON: (agencia, si el trabajo se hizo con una; si no, vacío)
DESCRIPCIÓN: (una o dos frases sobre el cliente o el proyecto)

---- Sectores y subsectores disponibles ----
{sectores}
"""

LEEME = """CARPETA «Página WEB» · cómo llenarla
=====================================
Esta es la plantilla general. Cópiala dentro de cada cliente que quieras mostrar
(con el nombre ",Página WEB") y deja solo las carpetas que uses; las vacías se ignoran.

1. 00 Logos
   Horizontal y Vertical, cada uno con tres archivos PNG con fondo transparente:
     blanco.png · negro.png · color.png
   La página usa: blanco en las tarjetas (fondo oscuro), color en la cabecera del cliente,
   negro guardado para fondos claros.

2. Carpetas 01 a 08 = tipo de trabajo › subtipo
   Mete en cada subcarpeta los archivos terminados de ese tipo:
   videos (.mp4), imágenes (.jpg, .png) o PDF.
   El nombre del archivo se usa como título (ej.: «Reel 07 Hamburguesa doble.mp4»).

3. ficha.txt
   Sector (con su código, ej.: ALI-RES), agencia aliada y una descripción corta del cliente.

4. CODIGOS.txt
   Lista de códigos para poner al final del nombre de cada archivo:
   Nombre del archivo [SECTOR-SUBSECTOR] [TIPO-SUBTIPO].ext

El año y el nombre del cliente salen del nombre de la carpeta del proyecto: (2025-11-03) Viggo Burger
"""

def main(destino):
    cat = cargar_categorias()
    raiz = os.path.join(destino, "Página WEB")
    creadas = 0
    def mk(p):
        nonlocal creadas
        if not os.path.isdir(p): os.makedirs(p); creadas += 1
    mk(os.path.join(raiz, "00 Logos", "Horizontal")); mk(os.path.join(raiz, "00 Logos", "Vertical"))
    for i, t in enumerate(cat["tipos"], 1):
        for s in t["sub"]:
            mk(os.path.join(raiz, f"{i:02d} {t['nombre']}", s))
    sect = "\n".join(f"[{s['cod']}] {s['nombre']}" + "".join(f"\n    [{s['cod']}-{c}] {n}" for c, n in zip(s["cods"], s["sub"])) for s in cat["sectores"])
    for nombre, contenido in (("ficha.txt", FICHA.format(sectores=sect)), ("LEEME.txt", LEEME)):
        f = os.path.join(raiz, nombre)
        if not os.path.exists(f) or "--reescribir" in sys.argv:
            open(f, "w", encoding="utf-8-sig", newline=chr(13) + chr(10)).write(contenido)
    print("carpetas nuevas:", creadas, "·", raiz)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
main(args[0] if args else r"H:\Mi unidad")
