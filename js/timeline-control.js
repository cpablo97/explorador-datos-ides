// timeline-control.js
// Selector de año + botón "Reproducir evolución": anima con D3 la posición
// de todas las localidades entre 2022 → 2023 → 2024 en secuencia.

(function () {
  const AÑOS = [2022, 2023, 2024];
  const STEP_DURATION = 1200; // ms por transición
  const STEP_PAUSE = 300; // ms de pausa entre años

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function reproducirEvolucion(chart, { onYearChange, onYearStart, playBtn } = {}) {
    if (playBtn) {
      playBtn.disabled = true;
    }

    onYearStart && onYearStart(AÑOS[0], 0);
    chart.setYear(AÑOS[0]);
    onYearChange && onYearChange(AÑOS[0]);
    await esperar(400);

    for (let i = 1; i < AÑOS.length; i++) {
      onYearStart && onYearStart(AÑOS[i], STEP_DURATION);
      await chart.transitionToYear(AÑOS[i], STEP_DURATION);
      onYearChange && onYearChange(AÑOS[i]);
      if (i < AÑOS.length - 1) await esperar(STEP_PAUSE);
    }

    if (playBtn) {
      playBtn.disabled = false;
    }
  }

  window.IDESTimeline = { AÑOS, STEP_DURATION, reproducirEvolucion };
})();
