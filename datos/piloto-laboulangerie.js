// PILOTO · La Boulangerie — caso "Rediseño de Logo" (panadería francesa, Cúcuta).
// Temporal para iterar; al aprobarse se mueve al generador.
(function () {
  var D = window.PORTAFOLIO; if (!D || !D.marcas) return;
  var m = D.marcas.find(function (x) { return x.id === "la-boulangerie"; }); if (!m) return;
  var A = "assets/marcas/laboulangerie/";
  // logo del header (blanco sobre barra oscura)
  m.logos = m.logos || {}; m.logos.H_blanco = A + "H_blanco.png";

  // crear el trabajo de galería del caso si no existe
  var g = m.trabajos.find(function (t) { return t.clase === "galeria"; });
  if (!g) {
    g = { titulo: "Rediseño de logo", clase: "galeria", tipo: "Branding e identidad visual", sub: "Rediseño de marca", descripcion: "", imagenes: [] };
    m.trabajos.unshift(g);
  }
  g.caso = true;
  // Orden: portada -> (temática) -> construcción -> (composición anim) -> color -> fuentes ->
  //        valor de X -> versiones -> uso -> antes/después -> 5 mockups.
  // (videos, antes/después y mockups se agregan al producirlos)
  g.secuencia = [
    { tipo: "imagen", src: A + "secuencia/1-portada.jpg", alt: "La Boulangerie — portada" },
    { tipo: "video", src: A + "tematica.mp4", portada: A + "tematica-poster.jpg", alt: "Imagen temática — entorno animado" },
    { tipo: "imagen", src: A + "secuencia/s4-antes-despues.jpg", alt: "Rediseño — antes y después" },
    { tipo: "imagen", src: A + "secuencia/s4-construccion.jpg", alt: "Construcción — el monograma" },
    { tipo: "video", src: A + "construccion.mp4", portada: A + "construccion-poster.jpg", alt: "Construcción — retícula trazándose" },
    { tipo: "imagen", src: A + "secuencia/s4-color.jpg", alt: "Color" },
    { tipo: "imagen", src: A + "secuencia/s4-fuentes.jpg", alt: "Tipografía" },
    { tipo: "imagen", src: A + "secuencia/s4-versiones.jpg", alt: "Versiones" },
    { tipo: "imagen", src: A + "secuencia/s4-orientacion.jpg", alt: "Orientación — horizontal y vertical" },
    { tipo: "imagen", src: A + "secuencia/s4-uso.jpg", alt: "Uso autorizado" },
    { tipo: "imagen", src: A + "secuencia/mock-01-bolsa.jpg", alt: "Bolsa de papel" },
    { tipo: "imagen", src: A + "secuencia/mock-02-caja.jpg", alt: "Caja de pastelería" },
    { tipo: "imagen", src: A + "secuencia/mock-03-kraft.jpg", alt: "Papel kraft con pan" },
    { tipo: "imagen", src: A + "secuencia/mock-04-tarjeta.jpg", alt: "Tarjetas de presentación" },
    { tipo: "imagen", src: A + "secuencia/mock-05-lata.jpg", alt: "Latas de repostería" }
  ];
})();
