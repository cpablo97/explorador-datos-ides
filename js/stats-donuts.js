// stats-donuts.js
// Brandmark del header (localidades / indicadores / fuentes) — portado tal
// cual de scrolly/index.html (svgBrandMark): 3 semicírculos del mismo color
// rotados en ángulos distintos, combinados con mix-blend-mode:multiply
// (ver .half-circle en explorador.css). Reemplaza el pie chart anterior.

(function () {
  function svgBrandMark(colores, rotaciones) {
    return `<svg viewBox="0 0 200 200"><g transform="translate(100,100)">
	<path class="half-circle" d="M -100,0 A 100,100 0 0,1 100,0 Z" fill="${colores[0]}" transform="rotate(${rotaciones[0]})" />
	<path class="half-circle" d="M -100,0 A 100,100 0 0,1 100,0 Z" fill="${colores[1]}" transform="rotate(${rotaciones[1]})" />
	<path class="half-circle" d="M -100,0 A 100,100 0 0,1 100,0 Z" fill="${colores[2]}" transform="rotate(${rotaciones[2]})" />
</g></svg>`;
  }

  function renderStatMark(container, colorVar, rotaciones) {
    const mark = svgBrandMark(
      [`var(${colorVar})`, `var(${colorVar})`, `var(${colorVar})`],
      rotaciones,
    );
    container.innerHTML = `<div class="stat-mark">${mark}</div>`;
  }

  window.IDESStatsDonuts = { svgBrandMark, renderStatMark };
})();
