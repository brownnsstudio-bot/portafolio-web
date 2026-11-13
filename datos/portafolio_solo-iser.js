// =====================================================================
//  PORTAFOLIO DE LADO · aquí se editan las marcas y los videos
//  (no hace falta tocar ningún otro archivo para agregar proyectos)
// =====================================================================
//
//  CÓMO AGREGAR UN VIDEO
//  1. Sube el video a Google Drive.
//  2. Clic derecho > Compartir > Acceso general: «Cualquier persona con el enlace».
//  3. Copia el enlace y pégalo entre las comillas de  drive: ""
//     Sirve el enlace tal cual lo da Drive, por ejemplo:
//     https://drive.google.com/file/d/1AbCdEfGh.../view?usp=sharing
//
//  CÓMO AGREGAR UNA MARCA
//  Copia un bloque { ... } completo de la lista «marcas», pégalo debajo
//  (separado por una coma) y cambia sus datos.
//  - id: nombre corto, sin espacios ni tildes (sirve para el enlace directo).
//  - categoria: debe ser una de la lista «categorias».
//  - logo: imagen dentro de assets/marcas/ (si lo dejas vacío, se muestra el nombre).
//  - portada: imagen opcional del video, dentro de assets/portadas/.
// =====================================================================

window.PORTAFOLIO = {
  // Textos generales de la página
  marca: "LADO",
  frase: "Portafolio de proyectos en video",
  contacto: {
    correo: "",      // ej.: "hola@lado.co"  · si se deja vacío, no se muestra
    instagram: "",   // ej.: "https://instagram.com/..."
    whatsapp: ""     // ej.: "https://wa.me/57..."
  },

  // Categorías de negocio (los filtros del portafolio salen de aquí)
  categorias: ["Educación"],

  // Marcas con las que hemos trabajado
  marcas: [
    {
      id: "iser",
      nombre: "ISER",
      nombreLargo: "Instituto Superior de Educación Rural",
      categoria: "Educación",
      logo: "assets/marcas/iser.png",
      videos: [
        {
          titulo: "Recap OVA ISER",
          descripcion: "Cómo creamos los objetos virtuales de aprendizaje del ISER: el personaje «i», la guía de interfaz, el Atlas de territorios y más de treinta pantallas.",
          drive: "",   // ← pega aquí el enlace de Drive del video
          portada: "assets/portadas/recap-ova-iser.jpg",
          duracion: "1:05"
        }
      ]
    }
  ]
};
