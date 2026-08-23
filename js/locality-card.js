// locality-card.js
// Tarjeta de detalle de localidad: hover = preview, click = pin.
// Wiring de eventos vive en index.html vía los callbacks onHover/onSelect
// pasados a crearGraficoRadial (ver radial-chart.js).

(function () {
  const { getAñoData, AXES, DIM_LABELS } = window.IDESRadialChart;

  // Colores de barra por dimensión para esta tarjeta — extraídos del
  // componente real en Figma (node 105:697): Determinantes usa verde-400
  // acá, distinto de verde-500 (anillo compuesto del gráfico radial) y de
  // verde-300 (uso semántico por defecto). Los 3 tonos de verde conviven
  // en el sistema para contextos distintos.
  const BAR_COLOR = {
    salud: "--azul-300",
    justicia: "--naranja-300",
    determinantes: "--verde-400",
  };

  function renderLocalityCard(container, localidad, año) {
    const { dims, indiceCompuesto } = getAñoData(localidad, año);
    container.innerHTML = `
      <div class="locality-card">
        <h3 class="locality-card__nombre">${localidad.nombre}</h3>
        <p class="locality-card__ides">
          <span class="locality-card__ides-label">IDES: </span>
          <span class="stat-info__valor locality-card__ides-valor">${indiceCompuesto}<span class="locality-card__dim-value-suffix">/100</span></span>
        </p>
        <p class="locality-card__year">Año activo: ${año}</p>
        ${AXES.map(
          (axis) => `
          <div class="locality-card__dim">
            <div class="locality-card__dim-head">
              <span class="locality-card__dim-label">${DIM_LABELS[axis.key]}</span>
              <span class="locality-card__dim-value">${dims[axis.key]}<span class="locality-card__dim-value-suffix">/100</span></span>
            </div>
            <div class="locality-card__bar" style="width:${dims[axis.key]}%; background:var(${BAR_COLOR[axis.key]})"></div>
          </div>`,
        ).join("")}
        <button class="locality-card__cta" type="button" disabled>Ver localidad</button>
      </div>`;
  }

  function renderLocalityCardPlaceholder(container) {
    container.innerHTML = `
      <div class="locality-card locality-card--placeholder">
        <p>Pasa el cursor sobre una localidad o haz clic para fijar su detalle.</p>
      </div>`;
  }

  window.IDESLocalityCard = { renderLocalityCard, renderLocalityCardPlaceholder };
})();
