// locality-detail.js
// Panel de "detalle de localidad" tipo benchmark (ver
// context/prompt-detalle-localidad.md y context/referenteSIS.png): por
// cada serie (dimensión o variable) dibuja un track con eje + banda entre
// cuartiles + puntos en los extremos + ticks de promedio/mediana + un
// círculo flotante con el valor real de la localidad, conectado al eje.
//
// Vive debajo del semicírculo (#chart-main), es un componente adicional —
// no reemplaza la tarjeta de #locality-modal (ver locality-card.js). Tiene
// dos pestañas: "Dimensiones" (3 tracks) y "Variables" (30 tracks, 10 por
// dimensión, agrupadas en sub-pestañas).
//
// El cálculo de benchmarks (bottom/lowerQ/avg/median/upperQ/top) es nuevo
// en este repo — no existía antes, así que se agrega acá en vez de
// "corregir" algo que ya funcionaba. No toca getAñoData ni
// data/localidades.json.

(function () {
  const { AXES, DIM_LABELS, getAñoData } = window.IDESFanChart;

  // Geometría de cada variante, en unidades de viewBox (el ancho real lo
  // da el CSS vía width:100% + aspect-ratio — ver css/utilities/locality-detail.css,
  // mismo patrón que #chart-main en fan-chart.js).
  const GEOM = {
    full: { W: 760, H: 200, padX: 56, axisY: 128, circleR: 34, circleCy: 40, dotR: 5.5, qDotR: 4, tickHalf: 11, centralGap: 6 },
    compact: { W: 760, H: 116, padX: 44, axisY: 70, circleR: 19, circleCy: 22, dotR: 4, qDotR: 3, tickHalf: 8, centralGap: 5 },
  };

  // Bottom/top siempre caen justo en los bordes del dominio de `x`, así
  // que su texto no necesita acomodo. Los cuartiles solo muestran su
  // etiqueta al hover (ver .locality-detail__cuartil-group en renderTrack),
  // así que tampoco compiten por espacio. Promedio y mediana sí conviven
  // siempre visibles y pueden caer muy cerca — su texto nunca se centra
  // sobre su tick (lo atravesaría por la mitad); cada uno se ancla hacia
  // el lado contrario al del otro marcador, con un pequeño espacio (`gap`)
  // para no tocar la línea. El tick queda en la posición real (`tickX`);
  // el texto se corre `gap` unidades hacia su lado (`textX`).
  function posicionarCentrales(xAvg, xMedian, gap) {
    const avgALaIzquierda = xAvg <= xMedian;
    return {
      avg: {
        tickX: xAvg,
        textX: avgALaIzquierda ? xAvg - gap : xAvg + gap,
        anchor: avgALaIzquierda ? "end" : "start",
      },
      median: {
        tickX: xMedian,
        textX: avgALaIzquierda ? xMedian + gap : xMedian - gap,
        anchor: avgALaIzquierda ? "start" : "end",
      },
    };
  }

  function entryDeAño(localidad, año) {
    return localidad.anos.find((a) => a.ano === año);
  }

  function valoresDimension(data, año, dimKey) {
    return data.map((loc) => getAñoData(loc, año).dims[dimKey]);
  }

  function valoresVariable(data, año, dimKey, varKey) {
    return data.map((loc) => entryDeAño(loc, año).indices[dimKey].variables[varKey].valor);
  }

  // Estadísticas de benchmark sobre un array de 20 valores (dimensión o
  // variable, no importa) — agnóstico de dónde vienen los números.
  function calcularBenchmarks(valores) {
    const orden = valores.slice().sort(d3.ascending);
    return {
      bottom: d3.min(orden),
      lowerQ: d3.quantile(orden, 0.25),
      avg: d3.mean(orden),
      median: d3.median(orden),
      upperQ: d3.quantile(orden, 0.75),
      top: d3.max(orden),
    };
  }

  function prefiereMovimientoReducido() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  // Copiado del mismo patrón usado en locality-card.js (animarNumero) —
  // mismo easing/duración que el resto de la visualización, self-contained
  // en este archivo igual que allá.
  function animarNumero(el, hasta, duration) {
    if (!el) return;
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
        el.textContent = hasta;
        el._rafId = null;
        return;
      }
      el.textContent = Math.round(interp(d3.easeCubicInOut(t)));
      el._rafId = requestAnimationFrame(tick);
    }
    el._rafId = requestAnimationFrame(tick);
  }

  function porRol(svg, claseCss, rol) {
    return svg.selectAll(claseCss).filter((d) => d && d.role === rol);
  }

  // Construye un único track (dimensión o variable) dentro de `hostSel`.
  // El color viene por CSS (clase `--<dimKey>` en el wrapper, ver
  // .locality-detail__track--salud/--justicia/--determinantes en el CSS
  // aislado) — ningún elemento SVG necesita una custom property puesta por
  // JS, así se evita por completo el bug de setAttribute vs .style con
  // custom properties en SVG.
  function renderTrack(hostSel, { tipo, dimKey, varKey, label, valores, valorLocalidad, size }) {
    const g = GEOM[size];
    const stats = calcularBenchmarks(valores);
    const x = d3.scaleLinear().domain([stats.bottom, stats.top]).range([g.padX, g.W - g.padX]);

    const wrapper = hostSel
      .append("div")
      .attr(
        "class",
        `locality-detail__track locality-detail__track--${size} locality-detail__track--${dimKey}`,
      )
      .datum({ tipo, dimKey, varKey });

    const cabecera = wrapper.append("div").attr("class", "locality-detail__track-label");
    cabecera.append("span").attr("class", "locality-detail__track-nombre").text(label);
    const valorEl = cabecera.append("span").attr("class", "locality-detail__track-valor");
    valorEl.append("span").attr("class", "locality-detail__track-valor-num").text(Math.round(valorLocalidad));
    valorEl.append("span").attr("class", "locality-detail__track-valor-suffix").text("/100");

    const svg = wrapper
      .append("div")
      .attr("class", "locality-detail__svg-wrap")
      .style("aspect-ratio", `${g.W} / ${g.H}`)
      .append("svg")
      .attr("viewBox", `0 0 ${g.W} ${g.H}`)
      .attr("class", "locality-detail__svg");

    svg
      .append("line")
      .datum({ role: "axis" })
      .attr("class", "locality-detail__axis")
      .attr("x1", x(stats.bottom))
      .attr("x2", x(stats.top))
      .attr("y1", g.axisY)
      .attr("y2", g.axisY);

    svg
      .append("rect")
      .datum({ role: "band" })
      .attr("class", "locality-detail__band")
      .attr("x", x(stats.lowerQ))
      .attr("width", Math.max(0, x(stats.upperQ) - x(stats.lowerQ)))
      .attr("y", g.axisY - 10)
      .attr("height", 20);

    // Extremos: punto + valor + etiqueta. Siempre caen justo en los bordes
    // del dominio de `x` (bottom/top lo definen), así que su texto va
    // centrado sobre su propia posición real sin necesitar acomodo.
    [
      { role: "bottom", val: stats.bottom, texto: "Rango inferior" },
      { role: "top", val: stats.top, texto: "Rango superior" },
    ].forEach((d) => {
      const px = x(d.val);
      svg
        .append("circle")
        .datum({ role: d.role })
        .attr("class", "locality-detail__dot")
        .attr("cx", px)
        .attr("cy", g.axisY)
        .attr("r", g.dotR);
      svg
        .append("text")
        .datum({ role: d.role })
        .attr("class", "locality-detail__value-text")
        .attr("x", px)
        .attr("y", g.axisY + g.tickHalf + 14)
        .attr("text-anchor", "middle")
        .text(Math.round(d.val));
      svg
        .append("text")
        .datum({ role: d.role })
        .attr("class", "locality-detail__label-text")
        .attr("x", px)
        .attr("y", g.axisY + g.tickHalf + 28)
        .attr("text-anchor", "middle")
        .text(d.texto);
    });

    // Cuartiles: el punto siempre visible; su etiqueta ("Cuartil inferior/
    // superior") solo aparece al pasar el mouse (o con foco de teclado)
    // sobre el punto — así no compite con promedio/mediana, que suelen
    // caer muy cerca. El círculo transparente agranda el área de hover,
    // porque el punto real (qDotR) es muy chico para apuntarle con precisión.
    [
      { role: "lowerQ", val: stats.lowerQ, texto: "Cuartil inferior", lado: -1 },
      { role: "upperQ", val: stats.upperQ, texto: "Cuartil superior", lado: 1 },
    ].forEach((d) => {
      const px = x(d.val);
      // Igual que promedio/mediana: el texto nunca se centra sobre el tick
      // (lo atravesaría por la mitad) — se ancla hacia afuera de la banda,
      // con el mismo espacio (`centralGap`) de distancia a la línea.
      const textX = px + d.lado * g.centralGap;
      const anchor = d.lado < 0 ? "end" : "start";
      // Tick apuntando hacia arriba (mismo sentido que el connector del
      // marker): la punta queda en tickTopY y ahí mismo se ancla el texto,
      // en vez de abajo del eje como promedio/mediana.
      const tickTopY = g.axisY - 38;
      const tickBottomY = g.axisY + 2;
      const grupo = svg
        .append("g")
        .attr("class", "locality-detail__cuartil-group")
        .attr("tabindex", "0");
      grupo
        .append("circle")
        .datum({ role: d.role })
        .attr("class", "locality-detail__dot-hit")
        .attr("cx", px)
        .attr("cy", g.axisY)
        .attr("r", g.qDotR + 6);
      grupo
        .append("circle")
        .datum({ role: d.role })
        .attr("class", "locality-detail__dot locality-detail__dot--cuartil")
        .attr("cx", px)
        .attr("cy", g.axisY)
        .attr("r", g.qDotR);
      // Tick corto, solo hacia arriba del eje (mismo sentido que
      // .locality-detail__connector del marker — no cruza hacia abajo como
      // el de promedio/mediana), en un verde-gris suave y oculto hasta el
      // hover (ver .locality-detail__tick--cuartil en el CSS).
      grupo
        .append("line")
        .datum({ role: d.role })
        .attr("class", "locality-detail__tick locality-detail__tick--cuartil")
        .attr("x1", px)
        .attr("x2", px)
        .attr("y1", tickBottomY)
        .attr("y2", tickTopY);
      grupo
        .append("text")
        .datum({ role: d.role })
        .attr(
          "class",
          "locality-detail__label-text locality-detail__label-text--central locality-detail__label-text--cuartil",
        )
        .attr("x", textX)
        .attr("y", tickTopY)
        .attr("text-anchor", anchor)
        .text(d.texto);
    });

    // Promedio / mediana: tick + valor + etiqueta — ver posicionarCentrales:
    // el tick queda en la posición real, el texto se corre a un lado. El
    // tick baja hasta pasar la caja de su etiqueta, para leerse ligado a ella.
    const centrales = posicionarCentrales(x(stats.avg), x(stats.median), g.centralGap);
    [
      { role: "avg", val: stats.avg, texto: "Promedio" },
      { role: "median", val: stats.median, texto: "Mediana" },
    ].forEach((d) => {
      const pos = centrales[d.role];
      svg
        .append("line")
        .datum({ role: d.role })
        .attr("class", "locality-detail__tick")
        .attr("x1", pos.tickX)
        .attr("x2", pos.tickX)
        .attr("y1", g.axisY - g.tickHalf)
        .attr("y2", g.axisY + g.tickHalf + 34);
      svg
        .append("text")
        .datum({ role: d.role })
        .attr("class", "locality-detail__value-text locality-detail__value-text--central")
        .attr("x", pos.textX)
        .attr("y", g.axisY + g.tickHalf + 14)
        .attr("text-anchor", pos.anchor)
        .text(Math.round(d.val));
      svg
        .append("text")
        .datum({ role: d.role })
        .attr("class", "locality-detail__label-text locality-detail__label-text--central")
        .attr("x", pos.textX)
        .attr("y", g.axisY + g.tickHalf + 28)
        .attr("text-anchor", pos.anchor)
        .text(d.texto);
    });

    // Círculo de la localidad: posición horizontal real (no fija), atado
    // al eje con una línea vertical hasta su punto exacto.
    const cx = x(valorLocalidad);
    svg
      .append("line")
      .datum({ role: "marker" })
      .attr("class", "locality-detail__connector")
      .attr("x1", cx)
      .attr("x2", cx)
      .attr("y1", g.circleCy + g.circleR)
      .attr("y2", g.axisY);
    svg
      .append("circle")
      .datum({ role: "marker" })
      .attr("class", "locality-detail__marker")
      .attr("cx", cx)
      .attr("cy", g.circleCy)
      .attr("r", g.circleR);
    svg
      .append("text")
      .datum({ role: "marker" })
      .attr("class", "locality-detail__marker-value")
      .attr("x", cx)
      .attr("y", g.circleCy)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(Math.round(valorLocalidad));
  }

  function actualizarTrack(wrapperNode, data, localidad, año, duration) {
    const wrapper = d3.select(wrapperNode);
    const d = wrapper.datum();
    const valores =
      d.tipo === "dimension"
        ? valoresDimension(data, año, d.dimKey)
        : valoresVariable(data, año, d.dimKey, d.varKey);
    const valorLocalidad =
      d.tipo === "dimension"
        ? getAñoData(localidad, año).dims[d.dimKey]
        : entryDeAño(localidad, año).indices[d.dimKey].variables[d.varKey].valor;
    const stats = calcularBenchmarks(valores);
    const size = wrapper.classed("locality-detail__track--compact") ? "compact" : "full";
    const g = GEOM[size];
    const x = d3.scaleLinear().domain([stats.bottom, stats.top]).range([g.padX, g.W - g.padX]);

    animarNumero(wrapper.select(".locality-detail__track-valor-num").node(), Math.round(valorLocalidad), duration);

    const svg = wrapper.select(".locality-detail__svg").interrupt("detail-move");
    const t = duration > 0 ? svg.transition("detail-move").duration(duration).ease(d3.easeCubicInOut) : null;

    function mover(sel, attr, valor) {
      if (t) sel.transition(t).attr(attr, valor);
      else sel.attr(attr, valor);
    }

    mover(porRol(svg, ".locality-detail__axis", "axis"), "x1", x(stats.bottom));
    mover(porRol(svg, ".locality-detail__axis", "axis"), "x2", x(stats.top));

    const bandSel = porRol(svg, ".locality-detail__band", "band");
    mover(bandSel, "x", x(stats.lowerQ));
    mover(bandSel, "width", Math.max(0, x(stats.upperQ) - x(stats.lowerQ)));

    // Extremos: siempre en los bordes del dominio de `x`.
    [
      { role: "bottom", val: stats.bottom },
      { role: "top", val: stats.top },
    ].forEach((p) => {
      const px = x(p.val);
      mover(porRol(svg, ".locality-detail__dot", p.role), "cx", px);
      mover(porRol(svg, ".locality-detail__value-text", p.role), "x", px);
      mover(porRol(svg, ".locality-detail__label-text", p.role), "x", px);
      animarNumero(porRol(svg, ".locality-detail__value-text", p.role).node(), Math.round(p.val), duration);
    });

    // Cuartiles: punto + área de hover + etiqueta (oculta hasta hover).
    [
      { role: "lowerQ", val: stats.lowerQ, lado: -1 },
      { role: "upperQ", val: stats.upperQ, lado: 1 },
    ].forEach((p) => {
      const px = x(p.val);
      mover(porRol(svg, ".locality-detail__dot", p.role), "cx", px);
      mover(porRol(svg, ".locality-detail__dot-hit", p.role), "cx", px);
      mover(porRol(svg, ".locality-detail__tick", p.role), "x1", px);
      mover(porRol(svg, ".locality-detail__tick", p.role), "x2", px);
      mover(porRol(svg, ".locality-detail__label-text", p.role), "x", px + p.lado * g.centralGap);
    });

    // Promedio / mediana: recalcula lado de anclaje con la nueva escala.
    const centrales = posicionarCentrales(x(stats.avg), x(stats.median), g.centralGap);
    [
      { role: "avg", val: stats.avg },
      { role: "median", val: stats.median },
    ].forEach((c) => {
      const pos = centrales[c.role];
      mover(porRol(svg, ".locality-detail__tick", c.role), "x1", pos.tickX);
      mover(porRol(svg, ".locality-detail__tick", c.role), "x2", pos.tickX);
      mover(porRol(svg, ".locality-detail__value-text", c.role), "x", pos.textX);
      mover(porRol(svg, ".locality-detail__label-text", c.role), "x", pos.textX);
      porRol(svg, ".locality-detail__value-text", c.role).attr("text-anchor", pos.anchor);
      porRol(svg, ".locality-detail__label-text", c.role).attr("text-anchor", pos.anchor);
      animarNumero(porRol(svg, ".locality-detail__value-text", c.role).node(), Math.round(c.val), duration);
    });

    const cxMarker = x(valorLocalidad);
    mover(porRol(svg, ".locality-detail__connector", "marker"), "x1", cxMarker);
    mover(porRol(svg, ".locality-detail__connector", "marker"), "x2", cxMarker);
    mover(porRol(svg, ".locality-detail__marker", "marker"), "cx", cxMarker);
    mover(porRol(svg, ".locality-detail__marker-value", "marker"), "x", cxMarker);
    animarNumero(porRol(svg, ".locality-detail__marker-value", "marker").node(), Math.round(valorLocalidad), duration);
  }

  function wireTabs(container) {
    const tabs = Array.from(container.querySelectorAll(":scope > .locality-detail__tabs > .locality-detail__tab"));
    const panels = Array.from(container.querySelectorAll(":scope > .locality-detail__panel"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab.dataset.panel));
      });
    });

    const subtabs = Array.from(container.querySelectorAll(".locality-detail__subtab"));
    const subpanels = Array.from(container.querySelectorAll(".locality-detail__subpanel"));
    subtabs.forEach((subtab) => {
      subtab.addEventListener("click", () => {
        subtabs.forEach((t) => t.classList.toggle("is-active", t === subtab));
        subpanels.forEach((p) => p.classList.toggle("is-active", p.dataset.dim === subtab.dataset.dim));
      });
    });
  }

  function renderLocalityDetail(container, data, localidad, año) {
    container.innerHTML = `
      <div class="locality-detail__header">
        <h3 class="locality-detail__nombre">${localidad.nombre}</h3>
        <p class="locality-detail__year">Comparado con las 20 localidades — Año activo: ${año}</p>
      </div>
      <div class="locality-detail__tabs" role="tablist">
        <button type="button" class="locality-detail__tab is-active" data-panel="dimensiones">Dimensiones</button>
        <button type="button" class="locality-detail__tab" data-panel="variables">Indicadores</button>
      </div>
      <div class="locality-detail__panel is-active" data-panel="dimensiones">
        <div class="locality-detail__tracks" data-tracks-dimensiones></div>
      </div>
      <div class="locality-detail__panel" data-panel="variables">
        <div class="locality-detail__subtabs" role="tablist">
          ${AXES.map(
            (axis, i) => `
            <button type="button" class="locality-detail__subtab locality-detail__subtab--${axis.key}${i === 0 ? " is-active" : ""}" data-dim="${axis.key}">${DIM_LABELS[axis.key]}</button>`,
          ).join("")}
        </div>
        ${AXES.map(
          (axis, i) => `
          <div class="locality-detail__subpanel${i === 0 ? " is-active" : ""}" data-dim="${axis.key}">
            <div class="locality-detail__tracks locality-detail__tracks--compact" data-tracks-variables="${axis.key}"></div>
          </div>`,
        ).join("")}
      </div>`;

    wireTabs(container);

    const dimHost = d3.select(container).select("[data-tracks-dimensiones]");
    AXES.forEach((axis) => {
      const valores = valoresDimension(data, año, axis.key);
      const valorLocalidad = getAñoData(localidad, año).dims[axis.key];
      renderTrack(dimHost, {
        tipo: "dimension",
        dimKey: axis.key,
        varKey: null,
        label: DIM_LABELS[axis.key],
        valores,
        valorLocalidad,
        size: "full",
      });
    });

    const entryLoc = entryDeAño(localidad, año);
    AXES.forEach((axis) => {
      const varHost = d3.select(container).select(`[data-tracks-variables="${axis.key}"]`);
      const vars = entryLoc.indices[axis.key].variables;
      Object.keys(vars).forEach((varKey) => {
        const valores = valoresVariable(data, año, axis.key, varKey);
        const valorLocalidad = vars[varKey].valor;
        renderTrack(varHost, {
          tipo: "variable",
          dimKey: axis.key,
          varKey,
          label: vars[varKey].nombre,
          valores,
          valorLocalidad,
          size: "compact",
        });
      });
    });
  }

  function actualizarLocalityDetail(container, data, localidad, año, duration = 0) {
    const tracks = container.querySelectorAll(".locality-detail__track");
    if (!tracks.length) return;

    const yearEl = container.querySelector(".locality-detail__year");
    if (yearEl) yearEl.textContent = `Comparado con las 20 localidades — Año activo: ${año}`;

    const duracionEfectiva = prefiereMovimientoReducido() ? 0 : duration;
    tracks.forEach((track) => actualizarTrack(track, data, localidad, año, duracionEfectiva));
  }

  window.IDESLocalityDetail = { renderLocalityDetail, actualizarLocalityDetail };
})();
