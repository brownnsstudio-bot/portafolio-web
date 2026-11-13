// PILOTO · enriquece la ficha de Cerberus con portada, concepto, paleta y mockups.
// Esto es temporal para iterar el diseño; cuando quede aprobado se mueve al generador
// (herramientas/armar_desde_proyectos.py) para que aplique a todos los clientes.
(function () {
  var D = window.PORTAFOLIO; if (!D || !D.marcas) return;
  var m = D.marcas.find(function (x) { return x.id === "cerberus"; }); if (!m) return;
  var g = m.trabajos.find(function (t) { return t.clase === "galeria"; }); if (!g) return;

  g.caso = true;
  // Secuencia de frames 1920x1080 (imagen o video/gif), pegados sin bordes, estilo Behance.
  // Orden: 1) portada  2) imagen temática + entorno animado  3) construcción (retícula→logo)
  //        4) secuencia de presentación (logotipo, color, …)  5) 5 mockups temáticos (desde 0).
  var A = "assets/marcas/cerberus/";
  g.secuencia = [
    { tipo: "imagen", src: A + "secuencia/1-portada-v2.jpg", alt: "Cerberus — portada" },
    { tipo: "video", src: A + "animacion-logo.mp4", portada: A + "animacion-logo-poster.jpg", alt: "Imagen temática — entorno animado" },
    { tipo: "imagen", src: A + "secuencia/s4-construccion.jpg", alt: "Construcción — el símbolo" },
    { tipo: "video", src: A + "construccion-grok.mp4", portada: A + "construccion-grok-poster.jpg", alt: "Composición — retícula y logo" },
    { tipo: "imagen", src: A + "secuencia/s4-color.jpg", alt: "Color" },
    { tipo: "imagen", src: A + "secuencia/s4-fuentes.jpg", alt: "Tipografía" },
    { tipo: "imagen", src: A + "secuencia/s4-versiones.jpg", alt: "Versiones" },
    { tipo: "imagen", src: A + "secuencia/s4-uso.jpg", alt: "Uso autorizado" },
    { tipo: "imagen", src: A + "secuencia/ia-01-collage-merch.jpg", alt: "Merchandising premium" },
    { tipo: "imagen", src: A + "secuencia/ia-02-hoodie-setup.jpg", alt: "Sudadera en setup gamer" },
    { tipo: "imagen", src: A + "secuencia/ia-03-deskmat.jpg", alt: "Deskmat gamer" },
    { tipo: "imagen", src: A + "secuencia/ia-04-merch-macro.jpg", alt: "Taza y pin — detalle" },
    { tipo: "imagen", src: A + "secuencia/ia-05-neon.jpg", alt: "Letrero de neón" }
  ];
})();
