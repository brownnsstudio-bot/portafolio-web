# Cómo retomar y crear la página web (portafolio) — SE TRABAJA DESDE EL DRIVE

> **Cuando el usuario diga "continuemos con la página web", empezar por aquí.**

## Regla de oro
La página se arma **SOLO con el contenido que está en el Drive**:

```
H:\Mi unidad\Página WEB\
```

**Nada sale del PC** (`E:\Proyectos`). Si algo no está en el Drive, **no aparece** en la página.
Para que algo se vea en la web, tiene que estar en el Drive con el nombre bien puesto.

---

## 1. Qué hay en el Drive
`H:\Mi unidad\Página WEB\`, organizado por **tipo de trabajo**:

| Carpeta | Para qué |
|---|---|
| `00 Logos` | `Horizontal/` y `Vertical/`, PNG fondo transparente: blanco, negro, color (y variantes) |
| `01 Branding e identidad visual` | logos, papelería, señalética, merchandising |
| `02 Diseño gráfico y editorial` | catálogos, brochures, menús, publicidad impresa |
| `03 Packaging` | etiquetas, empaques |
| `04 Social media` | piezas de feed, historias, reels |
| `05 Producción audiovisual` | videos corporativos, comerciales, eventos, podcast |
| `06 Motion graphics y animación` | animación de logo, 2D/3D, video IA |
| `07 Fotografía` | producto, moda, corporativa |
| `08 Diseño web y experiencias digitales` | páginas, UI/UX, OVA |
| `09 Stickers` | stickers digitales / impresos |
| `Galería` | **casos de marca** (presentación de logo con mockups y videos). NO es contenido normal del portafolio |

Archivos guía dentro del Drive: `ficha.txt` (sectores), `CODIGOS.txt` (códigos), `LEEME.txt` (cómo llenar).

---

## 2. Cómo se nombra cada archivo (clave)
```
(fecha) Cliente - Título [TIPO-SUB] [SECTOR-SUB].ext
```
- **Trabajo:** `(2018-03) iHobby - Catálogo Pag 01 [EDI-CAT] [COM-PER].jpg`
- **Logo:** `(2017-11) Dolce Riposo (Color) V [BRD-LOG] [SER-FUN].png`

Reglas:
- La **fecha** y el **cliente** salen del nombre del archivo.
- El **tipo y subtipo** salen de la carpeta (`02 Diseño gráfico / Catálogos`).
- Los códigos `[TIPO-SUB] [SECTOR-SUB]` dan la clasificación (lista completa en `CODIGOS.txt` / `ficha.txt`).
- En los logos, la **variante** (Color/Negro/Blanco…) va entre paréntesis y la orientación `H`/`V` al final.

---

### Logos y manual (regla)
- El logo de un cliente en `00 Logos` = **lo diseñó el usuario** → se muestra como sección de logo.
- Pero si ese cliente **también** tiene un **Manual de identidad corporativa** (en `01 Branding...`), se **prioriza el manual**: no se arma la sección de logo de ese cliente.
- La subcarpeta `00 Logos/(Presentación de los Logos para info)` es **referencia para Claude** (cómo presentar los logos al armar las hojas), **no se publica**. Al trabajar el logo/hoja de un cliente, revisarla primero por si hay algo que complemente.
- Archivos sin `(fecha)` ni `[código]`: el generador igual los toma; el **cliente, el año y el rubro salen del panel** `CLIENTES.txt` y el tipo de la carpeta. Un mapa `ALIAS` empareja nombres que vienen distintos en los archivos.

### Logos de la tarjeta, color y fotos
- **Cada cliente muestra un logo.** Si no hay logo propio en `00 Logos`, se busca en el contenido (tarjetas, banners, feed) y el recorte va a `00 Logos/(Logos extraídos del contenido)/` como `Cliente (Color).png` → sirve **solo para la tarjeta** (no crea sección de "diseño de logo").
- **Logo blanco automático:** si un cliente no tiene versión blanca, se genera una en PNG (`*_blancoauto`), pero la tarjeta **prefiere el logo a color** cuando existe (para no tapar logos coloridos).
- **Color fiel:** las imágenes CMYK con perfil de imprenta (FOGRA39, etc.) se convierten a **sRGB usando su perfil ICC** (`a_srgb`), así no se corren los colores (morado→azul).
- **Fotografías = collage:** todas las fotos (`tipo Fotografía`) de un cliente se juntan en un **mosaico** (una sola tarjeta), no una por una.
- **Feed de Instagram:** el usuario arma el feed como **una sola imagen vertical** (incluye arriba el encabezado con logo + seguidores) y, si es muy alta, la parte en piezas numeradas **de arriba hacia abajo**. Se nombran `(fecha) Cliente - Feed Completo 01 [RED-FEE] [SECTOR].jpg`, `... 02`, `... 03`. El generador las apila en orden y las muestra en un **marco de celular scrolleable** (`coleccion feed-ig`). Las tiras altas no se achican (solo se limita el ancho a 900 px). No usar capturas sueltas del feed: no empalman.

## 3. Para AGREGAR o cambiar contenido (flujo fácil)
1. El **usuario** elige los videos/imágenes que SÍ se muestran y los pone en la **carpeta de tipo** correcta del Drive, nombrados al menos con el **cliente** (ej. `(2025-06) Viggo Burger - Reel hamburguesa.mp4`).
2. Si es un **cliente nuevo**, el usuario le dice a Claude **a qué se dedica** (su rubro) → Claude lo agrega a `datos/clientes-rubro.txt`.
3. **Claude regenera** la página (ver abajo). El **rubro se asigna solo por cliente** (no hay que poner el código `[SECTOR-SUB]` en el nombre).

Nada se edita a mano en `datos/portafolio.js`: se regenera.

### Panel de clientes (Drive): `CLIENTES.txt`
- Archivo: `H:\Mi unidad\Página WEB\CLIENTES.txt`. Lista TODOS los clientes (del archivo `E:\Proyectos`) **agrupados por año** (~250, incluye agencias). Se regenera con `python herramientas/gen_panel_clientes.py`, que **conserva** lo ya escrito (descripción/rubro/código) y solo agrega los clientes nuevos.
- **El usuario SOLO escribe la `DESCRIPCIÓN`** de cada cliente (algo general). Deja en blanco los que no quiera mostrar aún.
- **Claude llena el resto**: deduce el `RUBRO` (en palabras) a partir de esa descripción, le pone el `CÓDIGO` `[SECTOR-SUB]` (usa uno existente o **crea uno nuevo** en `CODIGOS.txt`/`categorias.js`/`ficha.txt` si hace falta), y **maquilla la DESCRIPCIÓN** para que se lea bien (ni corta ni larga) — editando ese mismo campo.
- El generador lee de este panel: `CÓDIGO` → sector del cliente; `DESCRIPCIÓN` → texto que sale bajo el nombre del cliente en la web. (Función `leer_clientes_drive()`.)
- Incluye las **agencias** (Intermedios Publicidad, Custom Ideas…) como clientes propios.

### Rubro automático por cliente (tabla de códigos)
- Tabla: `datos/clientes-rubro.txt` → una línea por cliente: `Nombre del cliente = [SECTOR-SUB]`.
- El generador la usa para clasificar; si el archivo YA trae el código de sector en el nombre, ese manda; si no, usa la tabla; si tampoco está, queda "Sin clasificar".
- El **tipo** de trabajo igual sale de la **carpeta** del Drive; el usuario solo decide qué mostrar y de qué cliente es.

### Renombrar los archivos con el código (dejarlos listos para categorías)
Para que los archivos del Drive queden **físicamente nombrados** con la convención
`(fecha) Cliente - Título [TIPO-SUB] [SECTOR-SUB].ext`:
```
python herramientas/renombrar_drive.py              # dry-run: solo muestra qué haría
python herramientas/renombrar_drive.py --apply      # renombra de verdad
python herramientas/renombrar_drive.py "04 Social media" --apply   # solo una carpeta
```
- El **TIPO** lo saca de la carpeta; el **SECTOR** del cliente (tabla de arriba). La **fecha** se respeta si ya está, o se toma del archivo (año-mes).
- Deja igual lo que ya tiene los dos códigos; salta `00 Logos` y `Galería`.
- Si un cliente no está en la tabla, lo marca como PENDIENTE (hay que decirle a Claude a qué se dedica).
- Flujo típico: subir archivos (cliente + título) → `renombrar_drive.py --apply` → regenerar → publicar.

---

## 4. Cómo regenera Claude (lo técnico)
- Generador: `herramientas/armar_desde_proyectos.py` — **modo SOLO DRIVE**.
- Qué hace:
  1. Lee el Drive `H:\Mi unidad\Página WEB`.
  2. Arma `datos/portafolio.js` (solo clientes del Drive).
  3. **Copia y optimiza** el contenido DENTRO del proyecto en `assets/trabajos/<id>/`:
     imágenes a ≤1600 px (JPG), stickers PNG tal cual, videos a **H.264 ≤1280 px con faststart**.
     Así el sitio queda autocontenido y **publicable** (rutas relativas, sin `file://`).
  4. Los logos van a `assets/marcas/<id>/`.
- Comando:
  ```
  python herramientas/armar_desde_proyectos.py
  ```
- Categorías y filtros: `datos/categorias.js` (incluye **Stickers** y todos los sectores, p. ej. Funerarias, Gaming, Personalizados).

---

## 5. Para VER la página
En la carpeta del proyecto:
```
python -m http.server 8777
```
Abrir `http://127.0.0.1:8777/index.html`. Al editar, recargar con **Ctrl+Shift+R** (salta la caché).

---

## 6. Casos de marca (presentación de logo)
Cerberus, La Boulangerie, Dolce Riposo y **Angarita** tienen una presentación especial
(portada → construcción → color → tipografía → versiones → uso → mockups → videos).
- Se arman con `datos/piloto-<marca>.js` + assets en `assets/marcas/<id>/secuencia/`.
- Los pilotos **enriquecen** la marca que ya viene del Drive (no la duplican).
- Ojo: en el Drive, Angarita es `angarita-premiaciones` (no `angarita`).

---

## 7. Respaldo
La versión anterior (cuando la página aún leía el PC) está en `datos/_backup_predrive/`
por si hay que comparar o volver.

---

## Publicación (en línea)
- **Enlace público:** https://brownnsstudio-bot.github.io/portafolio-web/
- **Repo (GitHub Pages):** `brownnsstudio-bot/portafolio-web`, rama `master`, servido desde `/` (público).
- **No se sube:** `datos/_backup_predrive/`, `__pycache__` (ver `.gitignore`).
- **Para actualizar el sitio en línea** después de regenerar: `git add -A && git commit -m "..." && git push` → Pages se reconstruye solo en ~1 min.

## Estado actual (2026-11-11)
- **Solo Drive:** 110 clientes · 462 trabajos — cargado hasta **2023 en curso** (el panel de clientes 2023 sigue a medio llenar: los que faltan quedan «Sin clasificar» y sin año hasta describirlos en `CLIENTES.txt`).
- Subcategorías de social media renombradas a lo que usa el cliente: **Feed Instagram** (antes «Piezas para feed») y **Reels** (antes «Reels y TikTok»), igual en la carpeta del Drive, en `categorias.js` y en `CODIGOS.txt`. El filtro de años ignora los clientes sin año (no muestra «0000»).
- Los nombres de archivo del Drive son los definitivos (coinciden con los logos); el panel se ajusta a ellos, no al revés.
- Contenido copiado y optimizado en `assets/trabajos/` → **publicable**; limpieza de copias huérfanas tras renombrar el Drive.
- Categoría **Stickers** creada; subsectores Funerarias / Personalizados / Gaming agregados.
