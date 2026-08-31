// taller-template.js
// Plantilla reutilizable de detalle de "Taller" (ver context/taller.md).
// Recibe un objeto {titulo, imagen, parrafos} y renderiza el encabezado +
// cuerpo de texto — cada instancia (taller-1.html, taller-2.html,
// piloto.html, laboratorio.html) solo aporta esos datos, no repite lógica.

(function () {
  // imagen: URL de la foto real del taller/evento, o null/undefined si
  // todavía no hay una (caso actual de las 4 instancias — ver nota en
  // cada *.html). Cuando llegue la foto real, o al migrar a WordPress,
  // este campo pasa a ser el campo ACF de imagen del taller.
  function render({ titulo, imagen, parrafos }) {
    document.getElementById("taller-titulo").textContent = titulo;

    const imagenEl = document.getElementById("taller-imagen");
    if (imagen) {
      const img = document.createElement("img");
      img.src = imagen;
      img.alt = "";
      imagenEl.appendChild(img);
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
