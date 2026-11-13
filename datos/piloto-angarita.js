// PILOTO · Angarita Premiaciones — caso "Presentación de Logo" (trofeos, copas, medallas, placas).
// El Drive crea la marca como id "angarita-premiaciones". Este piloto ENRIQUECE esa marca
// con el caso (secuencia de láminas + 5 mockups + 2 videos). Si el Drive no la trae, la crea.
(function () {
  var D = window.PORTAFOLIO; if (!D || !D.marcas) return;
  var A = "assets/marcas/angarita/";
  var secuencia = [
    { tipo: "imagen", src: A + "secuencia/1-portada.jpg", alt: "Angarita Premiaciones — portada" },
    { tipo: "video", src: A + "secuencia/tematica.mp4", alt: "Video temático — Angarita Premiaciones" },
    { tipo: "imagen", src: A + "secuencia/s4-construccion.jpg", alt: "Construcción — el símbolo" },
    { tipo: "video", src: A + "secuencia/construccion.mp4", alt: "Construcción animada — el símbolo" },
    { tipo: "imagen", src: A + "secuencia/s4-color.jpg", alt: "Color" },
    { tipo: "imagen", src: A + "secuencia/s4-fuentes.jpg", alt: "Tipografía" },
    { tipo: "imagen", src: A + "secuencia/s4-versiones.jpg", alt: "Versiones" },
    { tipo: "imagen", src: A + "secuencia/s4-uso.jpg", alt: "Uso autorizado" },
    { tipo: "imagen", src: A + "secuencia/mock-01-trofeo.jpg", alt: "Mockup — trofeo de premiación" },
    { tipo: "imagen", src: A + "secuencia/mock-02-medallas.jpg", alt: "Mockup — juego de medallas" },
    { tipo: "imagen", src: A + "secuencia/mock-03-placa.jpg", alt: "Mockup — placa de reconocimiento en cristal" },
    { tipo: "imagen", src: A + "secuencia/mock-04-tarjetas.jpg", alt: "Mockup — tarjetas de presentación" },
    { tipo: "imagen", src: A + "secuencia/mock-05-escenario.jpg", alt: "Mockup — escenario de premiación" }
  ];

  var m = D.marcas.find(function (x) { return x.id === "angarita-premiaciones" || x.id === "angarita"; });
  if (!m) {
    m = {
      id: "angarita-premiaciones", nombre: "Angarita Premiaciones", anio: "2017", fecha: "2017-11-01",
      sector: "Comercio y distribución", subsector: "Trofeos, regalos y hobbies",
      alianza: "", descripcion: "", logos: { V_color: A + "V_color.png", H_blanco: A + "H_blanco.png" },
      origen: "piloto", trabajos: []
    };
    D.marcas.push(m);
  }
  m.trabajos = m.trabajos || [];
  var g = m.trabajos.find(function (t) { return t.clase === "galeria"; });
  if (!g) {
    g = { titulo: "Presentación de logo", clase: "galeria", tipo: "Branding e identidad visual", sub: "Diseño de logotipo", descripcion: "", imagenes: [] };
    m.trabajos.unshift(g);
  }
  g.caso = true;
  g.secuencia = secuencia;
})();
