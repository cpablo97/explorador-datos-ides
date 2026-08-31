// ficha-dimension-template.js
// Plantilla reutilizable del "índice de fichas técnicas por dimensión" (ver
// context/fichas-tecnicas.md). Recibe {dimensionLabel, rotaciones,
// indicadores} y renderiza el donut de una sola dimensión + la grilla de
// tarjetas — cada instancia (ficha-salud.html, ficha-justicia.html,
// ficha-determinantes.html) solo aporta esos datos, no repite lógica.
//
// El color no se pasa acá: se resuelve por CSS vía --dim-color, fijado por
// la clase .ficha-page--{dimension} que cada instancia pone en <div
// class="page"> (ver css/ficha-dimension.css). Por eso renderStatMark
// recibe literalmente el string "--dim-color" como nombre de variable, no
// un color fijo — así el mismo botón/donut heredan el color correcto sin
// que esta plantilla necesite saberlo.

(function () {
  function render({ dimensionLabel, rotaciones, indicadores }) {
    document.getElementById("ficha-dimension-label").textContent = dimensionLabel;

    window.IDESStatsDonuts.renderStatMark(
      document.getElementById("ficha-mark"),
      "--dim-color",
      rotaciones,
    );

    const gridEl = document.getElementById("ficha-grid");
    indicadores.forEach(({ nombre, href }) => {
      const card = document.createElement("article");
      card.className = "ficha-card";

      const nombreEl = document.createElement("p");
      nombreEl.className = "ficha-card__nombre";
      nombreEl.textContent = nombre;

      const cta = document.createElement("a");
      cta.className = "btn-outline btn-outline--filled btn-outline--square ficha-card__cta";
      cta.href = href;
      cta.setAttribute("aria-label", `Ver ficha técnica de ${nombre}`);
      cta.innerHTML = '<span class="btn-outline__arrow" aria-hidden="true">→</span>';

      card.appendChild(nombreEl);
      card.appendChild(cta);
      gridEl.appendChild(card);
    });
  }

  window.IDESFichaTemplate = { render };
})();
