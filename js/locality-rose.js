// locality-rose.js
// Glifo de "rosa": elipse guía (radio máximo local) + 3 cuñas, una por
// dimensión, cada una escalada contra ESE radio local — nunca contra la
// escala 0-100 global del abanico (ver prompt-explorador-datos-ides.md,
// "Qué cambia respecto al prototipo actual"). Reutilizable por
// fan-chart.js (hover/focus) y, más adelante, por la tarjeta de detalle.

(function () {
  const PETALS = [
    { key: "justicia", angleDeg: -90, colorVar: "--naranja-300" },
    { key: "salud", angleDeg: 30, colorVar: "--azul-300" },
    { key: "determinantes", angleDeg: 150, colorVar: "--verde-300" },
  ];
  const MEDIO_ANGULO = 60; // 120° por cuña, sin espacio entre ellas

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function sectorPath(cx, cy, anguloCentroDeg, medioAnguloDeg, radio) {
    const a1 = toRad(anguloCentroDeg - medioAnguloDeg);
    const a2 = toRad(anguloCentroDeg + medioAnguloDeg);
    const x1 = cx + radio * Math.cos(a1);
    const y1 = cy + radio * Math.sin(a1);
    const x2 = cx + radio * Math.cos(a2);
    const y2 = cy + radio * Math.sin(a2);
    return `M${cx},${cy} L${x1},${y1} A${radio},${radio} 0 0,1 ${x2},${y2} Z`;
  }

  function prefiereMovimientoReducido() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function radioDePetalo(petal, dims, radioMinimo, radioMaxCuña) {
    return radioMinimo + (dims[petal.key] / 100) * (radioMaxCuña - radioMinimo);
  }

  // container: selección D3 de un <g> donde montar la rosa. `key` identifica
  // la instancia (normalmente el id de la localidad) — permite tener varias
  // rosas a la vez en el mismo contenedor (ver "siempre visibles" en
  // fan-chart.js) sin que una pise a la otra.
  // dims: {justicia,salud,determinantes} 0-100. rx/ry: radio fijo de la
  // elipse contenedora (igual para las 20 localidades, no varía con datos).
  // duration: si es > 0 y la rosa ya existía, la elipse/núcleo/cuñas
  // recorren una transición hasta la nueva posición y tamaño — así la rosa
  // queda "atada" al punto cuando este se mueve por un cambio de año, en
  // vez de saltar de golpe al valor final.
  function renderRose(
    container,
    { key = "__default__", cx, cy, rx, ry, dims, radioMinimoRatio = 0.16, duration = 0 } = {},
  ) {
    const radioMaxCuña = Math.min(rx, ry);
    const radioMinimo = radioMaxCuña * radioMinimoRatio;
    // Igual que la animación de entrada: con movimiento reducido, la rosa
    // salta directo a su posición/tamaño del año nuevo en vez de recorrerlo.
    const duracionEfectiva = prefiereMovimientoReducido() ? 0 : duration;

    let g = container.select(`.locality-rose[data-key="${key}"]`);
    const esNueva = g.empty();

    if (esNueva) {
      g = container
        .append("g")
        .attr("class", "locality-rose")
        .attr("data-key", key)
        .classed("reduced-motion", prefiereMovimientoReducido());

      g.append("ellipse")
        .attr("class", "locality-rose__bounds")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("rx", rx)
        .attr("ry", ry);

      PETALS.forEach((petal) => {
        g.append("path")
          .attr("class", "locality-rose__cuña")
          .attr("data-petal", petal.key)
          .attr(
            "d",
            sectorPath(cx, cy, petal.angleDeg, MEDIO_ANGULO, radioDePetalo(petal, dims, radioMinimo, radioMaxCuña)),
          )
          .attr("fill", `var(${petal.colorVar})`);
      });

      g.append("circle")
        .attr("class", "locality-rose__nucleo")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", Math.max(2, radioMinimo * 0.3));

      // Fuerza reflow antes de agregar la clase que dispara la transición
      // CSS de entrada (scale 5%→100%, transform-box:fill-box — ver
      // explorador.css). Sin el reflow, el navegador puede fusionar el
      // estado inicial y el final en el mismo frame y la animación no se ve.
      g.node().getBoundingClientRect();
      requestAnimationFrame(() => g.classed("is-visible", true));
    } else {
      // Puede haber quedado a mitad de un fade-out de clearRose (p. ej. si
      // se apaga y prende "siempre visibles" muy rápido) — se cancela esa
      // transición puntual y se repone su visibilidad antes de redibujar.
      // Ojo: esto NO debe tocar `opacity` en el camino normal (una
      // actualización de año con la rosa ya visible) — fan-chart.js usa esa
      // misma propiedad para el atenuado de hover/pin (ver highlight()), y
      // si se resetea acá en cada render(), el atenuado "parpadea" cada vez
      // que corre "Reproducir evolución".
      const seEstabaOcultando = !g.classed("is-visible");
      g.interrupt("rose-fade");
      if (seEstabaOcultando) {
        g.classed("is-visible", true).style("opacity", null);
      }

      const anterior = g.datum() || { cx, cy, dims };
      const t =
        duracionEfectiva > 0
          ? g.transition("rose-move").duration(duracionEfectiva).ease(d3.easeCubicInOut)
          : null;

      const ellipseSel = g.select(".locality-rose__bounds").interrupt("rose-move");
      const nucleoSel = g.select(".locality-rose__nucleo").interrupt("rose-move");
      if (t) {
        ellipseSel.transition(t).attr("cx", cx).attr("cy", cy);
        nucleoSel.transition(t).attr("cx", cx).attr("cy", cy);
      } else {
        ellipseSel.attr("cx", cx).attr("cy", cy);
        nucleoSel.attr("cx", cx).attr("cy", cy);
      }

      PETALS.forEach((petal) => {
        const radioAnterior = radioDePetalo(petal, anterior.dims, radioMinimo, radioMaxCuña);
        const radioNuevo = radioDePetalo(petal, dims, radioMinimo, radioMaxCuña);
        const pathSel = g
          .select(`.locality-rose__cuña[data-petal="${petal.key}"]`)
          .interrupt("rose-move");
        if (t) {
          pathSel.transition(t).attrTween("d", () => {
            const ix = d3.interpolateNumber(anterior.cx, cx);
            const iy = d3.interpolateNumber(anterior.cy, cy);
            const ir = d3.interpolateNumber(radioAnterior, radioNuevo);
            return (tt) => sectorPath(ix(tt), iy(tt), petal.angleDeg, MEDIO_ANGULO, ir(tt));
          });
        } else {
          pathSel.attr("d", sectorPath(cx, cy, petal.angleDeg, MEDIO_ANGULO, radioNuevo));
        }
      });
    }

    // Punto de partida para la próxima actualización (año siguiente).
    g.datum({ cx, cy, dims });

    return g;
  }

  // Sin key, quita la única rosa "sin nombre". Con key, quita solo esa
  // instancia — así conviven varias rosas en el mismo contenedor (modo
  // "siempre visibles") sin afectarse entre sí.
  function clearRose(container, key = "__default__") {
    const existing = container.select(`.locality-rose[data-key="${key}"]`);
    if (existing.empty()) return;
    existing
      .classed("is-visible", false)
      .transition("rose-fade")
      .duration(120)
      .style("opacity", 0)
      .on("end", function () {
        d3.select(this).remove();
      });
  }

  window.IDESLocalityRose = { PETALS, sectorPath, renderRose, clearRose };
})();
