# PROMPT MAESTRO — Video de construcción de logo (reutilizable para cualquier marca)

Objetivo: mostrar cómo se **compone** el logo sobre una hoja de dibujo, como un **montaje de tomas** (NO una sola toma continua), con **cortes abruptos**: primero **planos detalle** por secciones (se dibujan las guías de la retícula, luego el logo por partes) y al final el **plano general**.

## 0) Color base (del propio logo)
- Tomar el **tono más claro** del logo como base del papel. Para Cerberus: beige del logo `#CCA884` → papel `#E2CFBB`.
- (Script: muestrear en `H_color.png` los tonos con luminancia alta más frecuentes; aclarar mezclando ~45% blanco.)

## 1) FRAME INICIAL (ChatGPT) — hoja beige con textura
Prompt (ajustar color por marca):
> Genera UNA imagen horizontal 16:9 de una hoja de papel de dibujo tono BEIGE (#E2CFBB), con una **textura sutil de papel cuadriculado / graph paper** (cuadrícula fina apenas visible, en un beige un poco más oscuro, como papel milimetrado) y un leve grano de papel. **SOLO la textura del papel**, superficie limpia y uniforme. **SIN compás, escuadra, reglas, lápices ni ningún objeto. SIN logo. SIN números ni letras.** Iluminación plana y pareja.

## 2) FRAME FINAL (ChatGPT) — logo + retícula de composición
Prompt:
> Sobre ESA MISMA hoja beige con textura, dibuja el **logo terminado en líneas oscuras (idéntico a la referencia)** junto con su **retícula de composición en magenta fino** (ejes de simetría, líneas guía y círculos de proporción que definen el logo). Si la marca tiene su retícula real, usarla; si no, inventar una coherente con la geometría del logo. Emblema centrado al ~50% del encuadre, con margen. **SIN números, letras, cotas ni herramientas.**

Ambos frames: verificar con zoom (fidelidad del logo, sin herramientas, sin texto) y **verificar el archivo descargado** (nombre/antigüedad) antes de usar.

## 3) VIDEO (Grok, cadena inicio→fin)
- Subir el FRAME INICIAL (abre editor) → Crear video → Add Prompt → subir el FRAME FINAL al input de archivo del compositor (cadena inicio→fin) → resolución baja para ahorrar créditos → directriz (abajo). Grok interpola inicio→fin = retícula se dibuja → emerge el logo.
- **DEJAR EL CLIP TAL CUAL SALE DE GROK, A CUADRO LLENO.** NO hacer montaje con recortes/acercamientos en ffmpeg: recortar y escalar el 720p **pixela y se ve de muy mala calidad** (el usuario lo rechazó). Si se quieren cortes/planos detalle, generar **clips independientes a cuadro lleno** (cada uno con su propia composición) y unirlos sin escalar recortes.
- Directriz por clip:
> Technical construction on beige graph paper: the magenta guide lines draw on in this area, then the dark logo lines are drawn following them. Keep everything EXACTLY as in the frames, no reinterpretation, no text. [plano: extreme close-up detail | medium | wide general]. Abrupt, no fancy camera.
- Orden del montaje: detalle guías → detalle logo por partes (2-3 tomas) → plano general final.

## Notas
- Grok no hace cortes dentro de un clip: los cortes se logran uniendo clips.
- Nunca nombrar el animal en el prompt (Grok reinterpreta). Hablar de "el emblema / las formas / los contornos".
- La forma SIEMPRE sale de la referencia exacta (frames hechos en ChatGPT), Grok solo anima.
