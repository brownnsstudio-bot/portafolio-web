# Reglas — Presentación / Rediseño de Logo (sección de logo del portafolio LADO)

Guía maestra para armar el "caso de marca" (presentación de logo) de cualquier cliente.
Pilotos: **Cerberus** (`assets/marcas/cerberus/`) y **La Boulangerie** (`assets/marcas/laboulangerie/`).
Scripts PIL de referencia: `scratchpad/laminas*.py`, `versiones_fix.py`.

---

## 1. Formato (TODO el caso)
- **Todas las imágenes y videos en 16:9 (1920×1080).** Las láminas se generan a 1920×1080; los mockups de ChatGPT salen 16:9 real (1672×941) → se reescalan a 1920×1080; los videos de Grok a 16:9.
- Frames apilados sin bordes (estilo Behance, `.caso-stack`), inyectados vía `datos/piloto-<marca>.js`.
- **Marco tech**: rectángulo inset (`m=70`) color tinta + 4 esquinas con brackets del color de acento de la marca; etiqueta de sección arriba-izq (fuente condensada, subrayado de acento) + tag de marca arriba-der; fondo claro con cuadrícula sutil.

## 2. Orden de la presentación
1. **Portada** — logo A COLOR sobre fondo blanco/el tono más claro de la marca. **Es el tamaño de logo MÁXIMO** (ningún otro frame lleva el logo más grande). Etiquetas "IDENTIDAD DE MARCA / año" + título inferior: **"PRESENTACIÓN DE LOGOTIPO"** o **"REDISEÑO DE LOGO"** si es rebrand.
2. **Video temático** — imagen temática del rubro + entorno animado, sin afectar el logo. **SIEMPRE va justo después de la portada.**
3. **(solo rebrand) Antes / Después** — logo anterior vs nuevo. Va **después del video**.
4. **Construcción (concepto)** + **Construcción animada** (retícula/guías trazándose → logo).
5. **Color** — tarjetas verticales CON BORDE (si no, el tono claro se pierde), logo en cada tarjeta + nombre + HEX + RGB + CMYK.
6. **Tipografía** — logotipo (recorte sin cortar letras altas) + tipografía secundaria.
7. **Versiones** — 3 versiones (ver regla 4).
8. **(solo si hay H y V) Orientación** — muestra horizontal y vertical.
9. **Uso autorizado** — positivo (fondo claro) / negativo (fondo oscuro).
10. **5 mockups temáticos** desde 0, en la línea gráfica de la marca.
- **NO lleva "Valor de X"** (se eliminó por decisión del usuario).

## 3. Tamaños y composición (reglas de oro)
- **Logos PEQUEÑOS. Nunca exagerar.** La portada es el máximo; las demás láminas más pequeñas según cuántos elementos tengan.
- **Buen espaciado al borde**: centrar con márgenes cómodos al marco; nada pegado al borde.
- **"Composición" = centrar/equilibrar** el elemento en su espacio.
- **Separaciones IGUALES** (medidas desde el borde marrón/tinta del marco): borde→elem1 = elem1→elem2 = … = últimoElem→borde. Gap = ((W−2·M) − Σanchos)/(n+1).

## 4. Símbolo / logotipo / versiones
- Separar símbolo (emblema/monograma) y logotipo (wordmark) por **COMPONENTES conectados** clasificados por centroide-y (`scipy.ndimage.label`), **nunca por recorte horizontal** (el recorte deja pedazos de las letras altas tipo C/S).
- Lámina **Versiones**, 3 elementos con los nombres exactos del usuario: **Logotipo con símbolo marcario** (completo) · **Símbolo marcario** · **Logotipo**. (NO "texto/completo/símbolo".)
- El símbolo y el logotipo van al **MISMO TAMAÑO EXACTO** que tienen DENTRO del completo (son recortes a escala real del completo escalado — como seccionar el primero por partes), no reescalados aparte. El completo, un poco más grande.

## 5. Versión horizontal vs vertical
- Si el logo tiene H **y** V: usar la **VERTICAL** en portada, color, versiones y uso; agregar la hoja **Orientación** con ambas. En **mockups y videos, priorizar la vertical**. Si el logo es único, la hoja Orientación no aplica.

## 6. Mockups (5, desde 0)
- Deben seguir la **LÍNEA GRÁFICA real de la marca** (usar los diseños/renders reales del cliente como referencia de línea gráfica: patrones, divisores, colores).
- Generar en **ChatGPT** subiendo **logo + 1 referencia de línea gráfica** por prompt, pidiendo **formato HORIZONTAL 16:9** y "el logo EXACTO como la imagen, sin reinterpretarlo".
- **Perspectiva correcta**: la parte de atrás de un objeto va MÁS ANGOSTA que la de adelante. Si la IA falla la perspectiva 3/4 (sale "chueca"/atrás más ancho), usar **vista cenital (top-down)** — sin perspectiva que distorsionar.

## 7. Videos (Grok)
- **Imagen temática**: crear en ChatGPT una escena del rubro con el logo centrado y estático, rodeado de elementos de ambiente animables.
- **Animar en Grok** (grok.com/imagine, modo Video, 720p, 16:9, 10s para ahorrar créditos).
- **CLAVE anti-reinterpretación**: Grok deforma el logo si lo haces "aparecer/dibujarse". La solución fiable es **bloquear el logo ESTÁTICO e idéntico** y animar **solo el entorno** (temático) o **solo la retícula/guías** (construcción). Prompt: "mantén el logo completamente estático, nítido e idéntico; no lo muevas/deformes/redibujes; anima solo …".

## 8. Color y tipografía
- **Color**: muestrear los colores del propio logo (y sus variantes). Tarjetas con HEX/RGB/CMYK.
- **Tipografía**: mostrar el wordmark real + buscar/nombrar la **fuente más similar** y una secundaria.

## 9. Producción de assets (fidelidad)
- **Imágenes/mockups/frames exactos → ChatGPT** con el logo subido como referencia (no reinterpreta). Siempre "logo EXACTO, sin reinterpretar".
- **Videos → Grok** (regla 7).
- **Paleta / recortes / láminas → PIL** localmente (el logo nunca se reinterpreta).

## 10. Revisión y disciplina (imprescindible)
- **Revisar SIEMPRE con zoom** cada frame/video antes de subir: para videos, extraer varios frames (0/3/6/9 s) y verificar que el **logo no se deforme**. Verificar el archivo descargado (nombre/edad) antes de usarlo.
- **Hard reload (ctrl+shift+r)** al iterar en el navegador: el `?v=` del index NO bustea css/js/imágenes.

## 11. UI del caso (visor)
- El visor muestra **chips de secciones** (tipos de trabajo del cliente) elegantes, centrados, **sin "Todo"** (para no mezclar la presentación con los videos) y **sticky**. Shell inmersivo (`ventana-caso`) estable. Implementado en `js/portafolio.js` (hayCaso) + `css/estilos.css` (`.ventana-caso .chips`) + wrapper `.ventana-top` en index.html.

## 12. Nomenclatura y códigos
- **NO editar `CODIGOS.txt`** (el usuario lo mantiene en vivo en otra pestaña). **Leerlo antes de cada marca nueva** (cambia). Usar los códigos que ya existen.
- Formato: `(<año-mes>) <Marca> (<Variante>) <H/V> [TIPO-SUB] [SECTOR-SUB].ext`. Ej.: Cerberus `[PSO-MPE] [BRD-LOG]`; La Boulangerie `[ALI-PAN] [BRD-REB]`.

## 13. Drive (centralización)
`H:\Mi unidad\Página WEB\Galería\<Marca>\` con subcarpetas: `01 Portada`, `02 Videos` (o `02 Construccion`), `03 Presentacion`, `03 Logotipo y versiones`, `04 Color`, `05 Mockups`, `06 Antes-Despues`. Respaldar cada asset aprobado.

## 14. Limpieza de galería (al aprobar)
- **Cada vez que el usuario aprueba una sección, mover a la PAPELERA DE RECICLAJE lo que ya no se use** de esa marca en la galería (iteraciones viejas de video/imagen, láminas/mockups descartados, versiones superadas). La galería debe quedar solo con los assets FINALES usados en el piloto.
- Antes de limpiar, verificar que el final está respaldado (p. ej. comparar tamaños con los assets de la web para no tocar el video correcto).
- **Nunca borrado permanente**: usar la Papelera (recuperable). PowerShell: `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($f,'OnlyErrorDialogs','SendToRecycleBin')`.
