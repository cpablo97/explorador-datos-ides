// locality-card.js
// Tarjeta de detalle de localidad: hover = preview, click = pin.
// Wiring de eventos vive en index.html vía los callbacks onHover/onSelect
// pasados a crearGraficoAbanico (ver fan-chart.js).

(function () {
  const { getAñoData, AXES, DIM_LABELS } = window.IDESFanChart;

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
          <span class="stat-info__valor locality-card__ides-valor"><span class="locality-card__ides-valor-num">${indiceCompuesto}</span><span class="locality-card__dim-value-suffix">/100</span></span>
        </p>
        <p class="locality-card__year">Año activo: ${año}</p>
        ${AXES.map(
          (axis) => `
          <div class="locality-card__dim" data-dim="${axis.key}">
            <div class="locality-card__dim-head">
              <span class="locality-card__dim-label">${DIM_LABELS[axis.key]}</span>
              <span class="locality-card__dim-value"><span class="locality-card__dim-value-num">${dims[axis.key]}</span><span class="locality-card__dim-value-suffix">/100</span></span>
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

  function prefiereMovimientoReducido() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  // Cuenta el número de `el` desde su valor actual hasta `hasta`, con el
  // mismo easing que usa el punto/rosa del gráfico (fan-chart.js /
  // locality-rose.js) para que se sienta parte del mismo movimiento.
  // Cancela cualquier conteo anterior sobre el mismo nodo — necesario si el
  // año cambia de nuevo antes de que termine.
  function animarNumero(el, hasta, duration) {
    if (el._rafId) {
      cancelAnimationFrame(el._rafId);
      el._rafId = null;
    }
    const desde = parseInt(el.textContent, 10) || 0;
    if (duration <= 0 || desde === hasta) {
      el.textContent = hasta;
      return;
    }
    const inicio = performance.now();
    const interp = d3.interpolateNumber(desde, hasta);
    function tick(ahora) {
      if (!el.isConnected) {
        el._rafId = null;
        return;
      }
      const t = Math.min(1, (ahora - inicio) / duration);
      if (t >= 1) {
        el.textContent = hasta; // valor final exacto, no el interpolado+redondeado
        el._rafId = null;
        return;
      }
      el.textContent = Math.round(interp(d3.easeCubicInOut(t)));
      el._rafId = requestAnimationFrame(tick);
    }
    el._rafId = requestAnimationFrame(tick);
  }

  // Actualiza SOLO el contenido de una tarjeta ya montada (mismo pin, año
  // nuevo) sin volver a llamar a chart.highlight() — a diferencia de
  // mostrarModal(), no toca el gráfico para nada, así que se puede invocar
  // en el mismo instante en que arranca chart.transitionToYear(), en
  // paralelo, en vez de esperar a que termine (ver index.html).
  function actualizarLocalityCard(container, localidad, año, duration = 0) {
    // .locality-card--placeholder TAMBIÉN lleva la clase .locality-card
    // (ver renderLocalityCardPlaceholder) — por eso el guard chequea un
    // nodo específico de la tarjeta real, no ".locality-card" a secas.
    const yearEl = container.querySelector(".locality-card__year");
    if (!yearEl) return;

    const { dims, indiceCompuesto } = getAñoData(localidad, año);
    const duracionEfectiva = prefiereMovimientoReducido() ? 0 : duration;

    yearEl.textContent = `Año activo: ${año}`;

    animarNumero(
      container.querySelector(".locality-card__ides-valor-num"),
      indiceCompuesto,
      duracionEfectiva,
    );

    AXES.forEach((axis) => {
      const dimEl = container.querySelector(`.locality-card__dim[data-dim="${axis.key}"]`);
      if (!dimEl) return;
      animarNumero(
        dimEl.querySelector(".locality-card__dim-value-num"),
        dims[axis.key],
        duracionEfectiva,
      );
      const bar = dimEl.querySelector(".locality-card__bar");
      bar.style.transitionDuration = `${duracionEfectiva}ms`;
      bar.style.width = `${dims[axis.key]}%`;
    });
  }

  window.IDESLocalityCard = { renderLocalityCard, renderLocalityCardPlaceholder, actualizarLocalityCard };
})();
