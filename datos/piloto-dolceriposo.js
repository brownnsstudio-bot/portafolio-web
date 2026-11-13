// PILOTO · Dolce Riposo — caso "Presentación de Logo" (objetos fúnebres: cofres de cenizas, cruces, accesorios).
(function () {
  var D = window.PORTAFOLIO; if (!D || !D.marcas) return;
  var m = D.marcas.find(function (x) { return x.id === "dolce-riposo"; }); if (!m) return;
  var A = "assets/marcas/dolceriposo/";
  m.logos = m.logos || {}; m.logos.H_blanco = A + "H_blanco.png";

  var g = m.trabajos.find(function (t) { return t.clase === "galeria"; });
  if (!g) {
    g = { titulo: "Presentación de logo", clase: "galeria", tipo: "Branding e identidad visual", sub: "Diseño de logotipo", descripcion: "", imagenes: [] };
    m.trabajos.unshift(g);
  }
  g.caso = true;
  // Orden: portada -> [video temático] -> construcción -> [video construcción] -> color -> tipografía
  //        -> versiones -> orientación -> uso -> [5 mockups]. (videos y mockups: pendientes de ChatGPT/Grok.)
  g.secuencia = [
    { tipo: "imagen", src: A + "secuencia/1-portada.jpg", alt: "Dolce Riposo — portada" },
    { tipo: "video", src: A + "secuencia/tematica.mp4", alt: "Video temático — Dolce Riposo" },
    { tipo: "imagen", src: A + "secuencia/s4-construccion.jpg", alt: "Construcción — el símbolo" },
    { tipo: "video", src: A + "secuencia/construccion.mp4", alt: "Construcción animada — el símbolo" },
    { tipo: "imagen", src: A + "secuencia/s4-color.jpg", alt: "Color" },
    { tipo: "imagen", src: A + "secuencia/s4-fuentes.jpg", alt: "Tipografía" },
    { tipo: "imagen", src: A + "secuencia/s4-versiones.jpg", alt: "Versiones" },
    { tipo: "imagen", src: A + "secuencia/s4-orientacion.jpg", alt: "Orientación — horizontal y vertical" },
    { tipo: "imagen", src: A + "secuencia/s4-uso.jpg", alt: "Uso autorizado" },
    { tipo: "imagen", src: A + "secuencia/mock-01-urna.jpg", alt: "Mockup — urna de cenizas" },
    { tipo: "imagen", src: A + "secuencia/mock-02-ataud.jpg", alt: "Mockup — ataúd de caoba" },
    { tipo: "imagen", src: A + "secuencia/mock-03-placa.jpg", alt: "Mockup — placa conmemorativa en bronce" },
    { tipo: "imagen", src: A + "secuencia/mock-04-papeleria.jpg", alt: "Mockup — papelería de condolencias" },
    { tipo: "imagen", src: A + "secuencia/mock-05-fachada.jpg", alt: "Mockup — fachada de la funeraria" }
  ];
})();
