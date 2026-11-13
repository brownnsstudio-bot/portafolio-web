# Escribe CODIGOS.txt (lista de códigos para los nombres de archivo) a partir de datos/categorias.js.
# Uso: python crear_codigos.py ["carpeta extra donde dejar una copia"]
import os, sys, json

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = open(os.path.join(WEB, "datos", "categorias.js"), encoding="utf8").read()
CAT = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])

L = []
L += ["CÓDIGOS DEL PORTAFOLIO LADO",
      "===========================",
      "",
      "Pon los códigos AL FINAL del nombre del archivo, cada uno entre corchetes [ ]:",
      "",
      "    Nombre del archivo [SECTOR-SUBSECTOR] [TIPO-SUBTIPO].ext",
      "",
      "Ejemplos:",
      "    Viggo Burger (2026-04) Reel 07 [ALI-RES] [RED-REE].mp4",
      "    Tezos Animación Logo (9-16) [AUT-EST] [ANI-LOG].mp4",
      "    Bantrophy Catálogo de medallas [COM-TRO] [EDI-CAT].pdf",
      "    Colombian Gymwear Sesión Leydi 03 [MOD-ROP] [FOT-MOD].jpg",
      "",
      "Reglas:",
      "  - Primero el código del sector del cliente y después el del tipo de trabajo.",
      "  - Si no sabes el subsector, basta con el sector solo:  [ALI]",
      "  - Si un archivo es de dos tipos de trabajo, pon los dos:  [RED-REE] [ANI-LOG]",
      "  - Siempre en MAYÚSCULAS, con guion en medio y sin espacios dentro de los corchetes.",
      "  - Si el archivo está dentro de ,Página WEB, la carpeta ya dice el tipo de trabajo;",
      "    el código del nombre manda si los dos no coinciden.",
      "", ""]

def bloque(titulo, lista, nota):
    out = [titulo, "=" * len(titulo), nota, ""]
    for g in lista:
        out.append(f"[{g['cod']}]  {g['nombre']}")
        for c, s in zip(g["cods"], g["sub"]):
            out.append(f"    [{g['cod']}-{c}]  {s}")
        out.append("")
    return out

L += bloque("1. CATEGORÍAS DE NEGOCIO (sector del cliente)", CAT["sectores"], "Código de 3 letras del sector + 3 letras del subsector.")
L += [""]
L += bloque("2. TIPOS DE TRABAJO (el servicio que hicimos)", CAT["tipos"], "Código de 3 letras del tipo + 3 letras del subtipo.")
L += ["", "¿Falta un sector o un tipo de trabajo? Dímelo y lo agrego a la lista oficial (datos/categorias.js)",
      "con un código nuevo; así la página y este archivo siguen iguales."]

contenido = "\n".join(L) + "\n"
destinos = [os.path.join(WEB, "CODIGOS.txt")] + [os.path.join(d, "CODIGOS.txt") for d in sys.argv[1:]]
for d in destinos:
    open(d, "w", encoding="utf-8-sig", newline="\r\n").write(contenido)
    print("escrito:", d)

# comprobación: ningún código repetido
todos = [f"{g['cod']}-{c}" for k in ("sectores", "tipos") for g in CAT[k] for c in g["cods"]] + [g["cod"] for k in ("sectores", "tipos") for g in CAT[k]]
rep = {x for x in todos if todos.count(x) > 1}
print("códigos:", len(todos), "· repetidos:", rep or "ninguno")
assert all(len(g["cods"]) == len(g["sub"]) for k in ("sectores", "tipos") for g in CAT[k])
