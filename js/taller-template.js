// taller-template.js
// Plantilla reutilizable de detalle de "Taller" (ver context/taller.md).
// Recibe un objeto {titulo, espacio, parrafos} y renderiza el encabezado +
// cuerpo de texto — cada instancia (taller-1.html, taller-2.html,
// piloto.html, laboratorio.html) solo aporta esos datos, no repite lógica.

(function () {
  // espacio: slug del espacio ("piloto" | "laboratorio" | "taller-1" |
  // "taller-2"), usado para inicializar el carrusel de fotos de ese
  // espacio (ver js/photo-carousel.js y assets/espacios-fotos.json). Si se
  // omite, o el manifest no tiene fotos para ese slug, la columna de
  // imagen queda vacía y deja ver el fondo punteado detrás.
  function render({ titulo, espacio, parrafos }) {
    document.getElementById("taller-titulo").textContent = titulo;

    if (espacio) {
      window.PhotoCarousel.init({
        container: document.getElementById("taller-imagen"),
        espacio,
      });
    }

    const bodyEl = document.getElementById("taller-body");
    parrafos.forEach((texto) => {
      const p = document.createElement("p");
      p.className = "taller-body__parrafo";
      p.textContent = texto;
      bodyEl.appendChild(p);
    });
  }

  window.IDESTallerTemplate = { render };
})();
