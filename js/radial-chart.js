// radial-chart.js
// Gráfico radial ternario: posiciona localidades según sus 3 dimensiones
// (justicia, salud, determinantes) y el índice compuesto. Ver Paso 0 del
// prompt-explorador-datos-ides.md para la justificación de la fórmula.

(function () {
  const AXES = [
    { key: "salud", angleDeg: 60, colorVar: "--color-text-decoration-salud" },
    {
      key: "justicia",
      angleDeg: 180,
      colorVar: "--color-text-decoration-justicia",
    },
    {
      key: "determinantes",
      angleDeg: 300,
      // excepción documentada en tokens.css: vistas compuestas (las 3
      // dimensiones a la vez) usan verde-500, no verde-300.
      colorVar: "--color-dimension-compuesto-determinantes",
    },
  ];

  const DIM_LABELS = {
    salud: "Salud",
    justicia: "Justicia",
    determinantes: "Determinantes Sociales",
  };

  // Color del subrayado de las etiquetas de eje — variables semánticas
  // por dimensión pedidas explícitamente, distintas de AXES[].colorVar
  // (que para determinantes usa la excepción de "vista compuesta"
  // verde-500 en la línea del eje/sector de fondo; el subrayado del
  // texto usa el verde-300 semántico estándar).
  const DIM_UNDERLINE_COLOR = {
    salud: "--color-text-decoration-salud",
    justicia: "--color-text-decoration-justicia",
    determinantes: "--color-text-decoration-determinantes",
  };

  function anguloARad(deg) {
    return ((deg - 90) * Math.PI) / 180;
  }

  function polarAXY(cx, cy, radio, angleDeg) {
    const rad = anguloARad(angleDeg);
    return { x: cx + radio * Math.cos(rad), y: cy + radio * Math.sin(rad) };
  }

  // Los 3 años reales del dataset — usados solo para saber si un tramo
  // tiene un año vecino (anterior/siguiente) del que tomar tangente al
  // suavizar el cambio de sentido en el año intermedio. No se inventa
  // ningún dato: la curva solo usa las 3 posiciones reales.
  const CICLO_AÑOS = [2022, 2023, 2024];
  function añoVecino(año, delta) {
    const idx = CICLO_AÑOS.indexOf(año);
    if (idx === -1) return null;
    const vecino = CICLO_AÑOS[idx + delta];
    return vecino === undefined ? null : vecino;
  }

  // Colores por eje en RGB (deben calzar con tokens.css) para poder
  // mezclarlos numéricamente en el gradiente de la estela — un CSS var()
  // no se puede promediar en JS, así que se necesita el valor crudo.
  // Determinantes usa verde-500 (--color-dimension-compuesto-determinantes),
  // la misma excepción de "vista compuesta" que ya usa el gráfico.
  const COLOR_EJE_RGB = {
    salud: [93, 158, 182], // --azul-300
    justicia: [234, 88, 37], // --naranja-300
    determinantes: [125, 164, 80], // --verde-500
  };

  // Mismo criterio que el ángulo (calcularPosicion): solo la desviación
  // positiva respecto al promedio de las 3 dimensiones "jala" hacia el
  // color de su eje. Sin dominancia clara, mezcla pareja de los 3.
  function pesosColorDims(dims) {
    const promedio = (dims.salud + dims.justicia + dims.determinantes) / 3;
    const pesos = {
      salud: Math.max(0, dims.salud - promedio),
      justicia: Math.max(0, dims.justicia - promedio),
      determinantes: Math.max(0, dims.determinantes - promedio),
    };
    const total = pesos.salud + pesos.justicia + pesos.determinantes;
    if (total < 1e-6) return { salud: 1 / 3, justicia: 1 / 3, determinantes: 1 / 3 };
    return {
      salud: pesos.salud / total,
      justicia: pesos.justicia / total,
      determinantes: pesos.determinantes / total,
    };
  }

  function mezclarColorEjes(pesos) {
    let r = 0;
    let g = 0;
    let b = 0;
    Object.keys(COLOR_EJE_RGB).forEach((k) => {
      const [cr, cg, cb] = COLOR_EJE_RGB[k];
      r += cr * pesos[k];
      g += cg * pesos[k];
      b += cb * pesos[k];
    });
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  function puntoBezierCubica(p0, c1, c2, p1, t) {
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    return {
      x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
      y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
    };
  }

  function getAñoData(localidad, año) {
    const entry = localidad.anos.find((a) => a.ano === año);
    return {
      indiceCompuesto: entry.indice_compuesto,
      dims: {
        salud: entry.indices.salud.puntaje,
        justicia: entry.indices.justicia.puntaje,
        determinantes: entry.indices.determinantes.puntaje,
      },
    };
  }

  function dominante(dims) {
    return AXES.reduce((mejor, axis) =>
      dims[axis.key] > dims[mejor.key] ? axis : mejor,
    );
  }

  // Fórmula A (dirección desacoplada de la magnitud), radio desde
  // indice_compuesto — ver "Decisión validada (Paso 0)" en el plan. Dirección
  // del radio corregida a pedido explícito del usuario: 0 = centro,
  // 100 = borde exterior (radioMax).
  function calcularPosicion(dims, indiceCompuesto, geom) {
    const promedioDims = (dims.salud + dims.justicia + dims.determinantes) / 3;
    let sumSin = 0;
    let sumCos = 0;
    AXES.forEach((axis) => {
      const peso = dims[axis.key] - promedioDims;
      const rad = anguloARad(axis.angleDeg);
      sumSin += peso * Math.sin(rad);
      sumCos += peso * Math.cos(rad);
    });
    const sinDireccion = Math.abs(sumSin) < 1e-6 && Math.abs(sumCos) < 1e-6;
    const anguloRad = sinDireccion ? anguloARad(0) : Math.atan2(sumSin, sumCos);
    const radio = geom.radioMax * (indiceCompuesto / 100);
    return {
      x: geom.cx + radio * Math.cos(anguloRad),
      y: geom.cy + radio * Math.sin(anguloRad),
      radio,
    };
  }

  function posicionEnAño(loc, año, geom) {
    const { dims, indiceCompuesto } = getAñoData(loc, año);
    return calcularPosicion(dims, indiceCompuesto, geom);
  }

  let contadorFondos = 0;

  // Fondo decorativo: viñeta radial + 3 sectores de 120° (uno por eje) con
  // el color semántico del eje a baja opacidad, combinados con
  // mix-blend-mode:multiply — mismo lenguaje visual que el brandmark del
  // header (ver stats-donuts.js), extraído de la captura de Figma del
  // gráfico radial real.
  function dibujarFondoDecorativo(svg, geom, opts) {
    const id = ++contadorFondos;
    const gradId = `radial-vignette-${id}`;
    const defs = svg.append("defs");
    const grad = defs
      .append("radialGradient")
      .attr("id", gradId)
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");
    grad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--color-bg)")
      .attr("stop-opacity", 0);
    grad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--color-decorative-grid)")
      .attr("stop-opacity", 0.28);

    const capa = svg.append("g").attr("class", "chart-fondo__decorativo");

    capa
      .append("circle")
      .attr("cx", geom.cx)
      .attr("cy", geom.cy)
      .attr("r", geom.radioMax)
      .attr("fill", `url(#${gradId})`);

    AXES.forEach((axis) => {
      const a0 = anguloARad(axis.angleDeg - 60);
      const a1 = anguloARad(axis.angleDeg + 60);
      const x0 = geom.cx + geom.radioMax * Math.cos(a0);
      const y0 = geom.cy + geom.radioMax * Math.sin(a0);
      const x1 = geom.cx + geom.radioMax * Math.cos(a1);
      const y1 = geom.cy + geom.radioMax * Math.sin(a1);
      capa
        .append("path")
        .attr("class", "chart-fondo__sector")
        .attr(
          "d",
          `M${geom.cx},${geom.cy} L${x0},${y0} A${geom.radioMax},${geom.radioMax} 0 0 1 ${x1},${y1} Z`,
        )
        .attr("fill", `var(${axis.colorVar})`)
        .attr("fill-opacity", 0.1);
    });

    capa
      .append("circle")
      .attr("cx", geom.cx)
      .attr("cy", geom.cy)
      .attr("r", geom.radioMax)
      .attr("fill", "none")
      .attr("stroke", "var(--color-decorative-grid)")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);
  }

  function dibujarFondo(svg, geom, opts) {
    const fondo = svg.append("g").attr("class", "chart-fondo");

    // rect transparente para capturar clicks de "despinear" en el gráfico principal
    if (opts.interactive) {
      fondo
        .append("rect")
        .attr("class", "chart-fondo__click-area")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", opts.size)
        .attr("height", opts.size)
        .attr("fill", "transparent")
        .on("click", () => opts.onSelect && opts.onSelect(null));
    }

    dibujarFondoDecorativo(svg, geom, opts);

    const anillos = fondo.append("g").attr("class", "chart-fondo__anillos");
    const pasos = 5;
    for (let i = 1; i <= pasos; i++) {
      const r = geom.radioMax * (i / pasos);
      anillos
        .append("circle")
        .attr("cx", geom.cx)
        .attr("cy", geom.cy)
        .attr("r", r)
        .attr("fill", "none")
        .attr(
          "stroke",
          "color-mix(in srgb, var(--color-decorative-grid) 15%, transparent)",
        )
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2 4");

      if (opts.showRingLabels) {
        const valor = Math.round(100 * (i / pasos));
        anillos
          .append("text")
          .attr("x", geom.cx + 4)
          .attr("y", geom.cy - r + 12)
          .attr("fill", "var(--color-text-primary)")
          .attr("opacity", 0.45)
          .attr("style", "font: var(--text-caption-source);")
          .text(valor);
      }
    }

    const ejes = fondo.append("g").attr("class", "chart-fondo__ejes");
    AXES.forEach((axis) => {
      const punta = polarAXY(geom.cx, geom.cy, geom.radioMax, axis.angleDeg);
      ejes
        .append("line")
        .attr("x1", geom.cx)
        .attr("y1", geom.cy)
        .attr("x2", punta.x)
        .attr("y2", punta.y)
        .attr("stroke", `var(${axis.colorVar})`)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", opts.axisOpacity);

      if (opts.showAxisLabels) {
        const label = polarAXY(
          geom.cx,
          geom.cy,
          geom.radioMax + opts.axisLabelOffset,
          axis.angleDeg,
        );
        const texto = ejes
          .append("text")
          .attr("x", label.x)
          .attr("y", label.y)
          .attr("text-anchor", (() => {
            const c = Math.cos(anguloARad(axis.angleDeg));
            if (c < -0.3) return "end"; // eje a la izquierda: texto se extiende hacia afuera (izq)
            if (c > 0.3) return "start"; // eje a la derecha: texto se extiende hacia afuera (der)
            return "middle";
          })())
          .attr("dominant-baseline", "middle")
          .attr("fill", "var(--color-text-primary)")
          .attr("style", `font: ${opts.axisLabelFont};`)
          .text(DIM_LABELS[axis.key]);

        // Resaltador dibujado a mano: text-decoration-color en <text> SVG
        // no se pinta de forma confiable (varios navegadores igual usan el
        // color del texto) — un rect real detrás del texto sí garantiza el
        // color correcto por dimensión.
        const bbox = texto.node().getBBox();
        const resaltador = ejes
          .append("rect")
          .attr("x", bbox.x)
          .attr("y", bbox.y + bbox.height * 0.62)
          .attr("width", bbox.width)
          .attr("height", bbox.height * 0.22)
          .attr("fill", `var(${DIM_UNDERLINE_COLOR[axis.key]})`);
        texto.node().before(resaltador.node());
      }
    });
  }

  function crearGraficoRadial(containerSelector, options) {
    const opts = Object.assign(
      {
        data: [],
        size: 640,
        radioMax: 260,
        dotRadius: 14,
        hoverDotRadius: 20,
        centerMarkerRadius: 4,
        trailWidth: 6,
        trailFadeDuration: 5000,
        interactive: true,
        filterIds: null,
        showAxisLabels: true,
        showRingLabels: true,
        axisOpacity: 0.5,
        axisLabelOffset: 46,
        axisLabelFont: "var(--text-body-primary)",
        margin: 80,
        marginLeft: null,
        marginRight: null,
        marginTop: null,
        marginBottom: null,
        onHover: null,
        onSelect: null,
      },
      options,
    );

    const geom = { cx: opts.size / 2, cy: opts.size / 2, radioMax: opts.radioMax };
    // Márgenes asimétricos: por defecto los 4 lados usan opts.margin, pero
    // se pueden dar por separado — necesario porque la etiqueta
    // "Determinantes Sociales" (arriba-izquierda) es mucho más ancha que
    // las otras, y darle margen extra SOLO a la izquierda evita tener que
    // agrandar el margen parejo en los 4 lados (lo que encogía el círculo
    // dentro del mismo contenedor). El aspect-ratio del contenedor se
    // ajusta en JS para que calce exacto con el viewBox resultante, sin
    // dejar bandas vacías.
    const mL = opts.marginLeft ?? opts.margin;
    const mR = opts.marginRight ?? opts.margin;
    const mT = opts.marginTop ?? opts.margin;
    const mB = opts.marginBottom ?? opts.margin;
    const totalW = opts.size + mL + mR;
    const totalH = opts.size + mT + mB;
    const svg = d3
      .select(containerSelector)
      .style("aspect-ratio", `${totalW} / ${totalH}`)
      .append("svg")
      .attr("viewBox", `${-mL} ${-mT} ${totalW} ${totalH}`)
      .attr("class", "radial-chart");

    dibujarFondo(svg, geom, opts);

    // Capa de estelas: va detrás de los puntos para que el rastro del
    // movimiento entre años quede visualmente "debajo" de la localidad.
    const trailsLayer = svg.append("g").attr("class", "locality-trails");
    const trailsDefs = svg.append("defs").attr("class", "locality-trails-defs");
    const dotsLayer = svg.append("g").attr("class", "locality-dots");
    // Encima de los puntos, para que el nombre no quede tapado por otras
    // localidades cercanas.
    const hoverLabelLayer = svg
      .append("g")
      .attr("class", "locality-hover-label")
      .style("pointer-events", "none");
    const dataset = opts.filterIds
      ? opts.data.filter((d) => opts.filterIds.includes(d.id))
      : opts.data;

    // Nombre de la localidad al lado del punto en hover — se ancla hacia
    // el lado con más espacio (derecha si el punto está en la mitad
    // izquierda del gráfico, y viceversa) para minimizar recortes contra
    // el borde, con un fondo detrás para legibilidad sobre el gráfico.
    function ocultarNombreHover() {
      hoverLabelLayer.selectAll("*").remove();
    }
    function mostrarNombreHover(d) {
      hoverLabelLayer.selectAll("*").remove();
      const haciaDerecha = d.x <= geom.cx;
      const gap = opts.dotRadius + 10;
      const x = haciaDerecha ? d.x + gap : d.x - gap;
      const texto = hoverLabelLayer
        .append("text")
        .attr("x", x)
        .attr("y", d.y)
        .attr("text-anchor", haciaDerecha ? "start" : "end")
        .attr("dominant-baseline", "middle")
        .attr("fill", "var(--color-text-primary)")
        .attr("style", "font: var(--text-caption-source); font-weight: 600;")
        .text(d.nombre);
      const bbox = texto.node().getBBox();
      const pad = 4;
      const fondo = hoverLabelLayer
        .append("rect")
        .attr("x", bbox.x - pad)
        .attr("y", bbox.y - pad)
        .attr("width", bbox.width + pad * 2)
        .attr("height", bbox.height + pad * 2)
        .attr("rx", 3)
        .attr("fill", "var(--color-bg)")
        .attr("fill-opacity", 0.9);
      texto.node().before(fondo.node());
    }

    let currentYear = 2024;
    let puntosAnteriores = new Map();
    let estelasActivas = true;
    let contadorEstelas = 0;
    let localidadSeleccionada = null;

    function buscarLocalidad(id) {
      return dataset.find((d) => d.id === id);
    }

    // Tangentes tipo Catmull-Rom en el año intermedio: si hay un año
    // anterior a añoO o un año siguiente a añoP dentro del ciclo real
    // (2022/2023/2024), se usa esa posición real (no inventada) para que
    // la curva llegue/salga del waypoint compartido con la misma
    // dirección en ambos tramos — suaviza el quiebre sin fabricar
    // ninguna trayectoria intermedia. Sin año vecino, el tramo queda
    // recto (tangente = línea directa o→p).
    function calcularControlesSuavizado(loc, añoO, o, añoP, p) {
      const añoOPrev = añoVecino(añoO, -1);
      const añoPNext = añoVecino(añoP, 1);
      const oPrev = añoOPrev !== null ? posicionEnAño(loc, añoOPrev, geom) : null;
      const pNext = añoPNext !== null ? posicionEnAño(loc, añoPNext, geom) : null;

      const tangenteO = oPrev
        ? { x: (p.x - oPrev.x) / 2, y: (p.y - oPrev.y) / 2 }
        : { x: p.x - o.x, y: p.y - o.y };
      const tangenteP = pNext
        ? { x: (pNext.x - o.x) / 2, y: (pNext.y - o.y) / 2 }
        : { x: p.x - o.x, y: p.y - o.y };

      return {
        c1: { x: o.x + tangenteO.x / 3, y: o.y + tangenteO.y / 3 },
        c2: { x: p.x - tangenteP.x / 3, y: p.y - tangenteP.y / 3 },
      };
    }

    function construirPuntos(año) {
      return dataset.map((loc) => {
        const { dims, indiceCompuesto } = getAñoData(loc, año);
        const pos = calcularPosicion(dims, indiceCompuesto, geom);
        const axisDominante = dominante(dims);
        return {
          id: loc.id,
          nombre: loc.nombre,
          x: pos.x,
          y: pos.y,
          dominantColorVar: axisDominante.colorVar,
        };
      });
    }

    // Estela temporal: sigue la misma curva (casi recta, suavizada solo
    // en el waypoint compartido — ver calcularControlesSuavizado) que
    // recorre la elipse, y se va "dibujando" en sincronía con su
    // movimiento (mismo duration/easing) mediante stroke-dashoffset — no
    // aparece de golpe. El color es un gradiente entre los 3 colores de
    // dimensión, mezclados según qué dimensión pesaba más al inicio y al
    // final del tramo (ver pesosColorDims/mezclarColorEjes) — no un color
    // fijo. Una vez trazada completa, se difumina sola en
    // trailFadeDuration (5s por defecto). Si hay una localidad
    // seleccionada, solo se dibuja SU estela — las demás se omiten.
    function dibujarEstelas(anteriores, puntos, duration, añoO, añoP) {
      if (!estelasActivas) return;
      puntos.forEach((p) => {
        if (localidadSeleccionada !== null && p.id !== localidadSeleccionada) return;
        const o = anteriores.get(p.id);
        if (!o) return;
        if (Math.abs(o.x - p.x) < 0.5 && Math.abs(o.y - p.y) < 0.5) return;
        const loc = buscarLocalidad(p.id);
        const { c1, c2 } = calcularControlesSuavizado(loc, añoO, o, añoP, p);

        const colorO = mezclarColorEjes(pesosColorDims(getAñoData(loc, añoO).dims));
        const colorP = mezclarColorEjes(pesosColorDims(getAñoData(loc, añoP).dims));
        const gradId = `estela-grad-${++contadorEstelas}`;
        const grad = trailsDefs
          .append("linearGradient")
          .attr("id", gradId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", o.x)
          .attr("y1", o.y)
          .attr("x2", p.x)
          .attr("y2", p.y);
        grad.append("stop").attr("offset", "0%").attr("stop-color", colorO);
        grad.append("stop").attr("offset", "100%").attr("stop-color", colorP);

        const path = trailsLayer
          .append("path")
          .attr("d", `M${o.x},${o.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p.x},${p.y}`)
          .attr("fill", "none")
          .attr("stroke", `url(#${gradId})`)
          .attr("stroke-width", opts.trailWidth)
          .attr("stroke-linecap", "round")
          .attr("stroke-opacity", 0.6)
          .style("pointer-events", "none");

        const largo = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", `${largo} ${largo}`)
          .attr("stroke-dashoffset", largo)
          .transition()
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr("stroke-dashoffset", 0)
          .transition()
          .duration(opts.trailFadeDuration)
          .ease(d3.easeLinear)
          .attr("stroke-opacity", 0)
          .on("end", function () {
            d3.select(this).remove();
            grad.remove();
          });
      });
    }

    function render(año, renderOpts) {
      const { animate, duration } = Object.assign(
        { animate: false, duration: 0 },
        renderOpts,
      );
      const puntos = construirPuntos(año);
      const anterioresParaMovimiento = puntosAnteriores;
      const añoAnterior = currentYear;

      if (animate) {
        dibujarEstelas(anterioresParaMovimiento, puntos, duration, añoAnterior, año);
      }
      puntosAnteriores = new Map(puntos.map((p) => [p.id, { x: p.x, y: p.y }]));

      let dots = dotsLayer
        .selectAll("circle.locality-dot")
        .data(puntos, (d) => d.id)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "locality-dot")
              .attr("r", opts.dotRadius)
              .attr("cx", (d) => d.x)
              .attr("cy", (d) => d.y)
              .attr("fill", "var(--color-text-decoration-generico)")
              .attr("fill-opacity", 0.55)
              .attr("stroke", "var(--verde-fuerte)")
              .attr("stroke-width", 1.5),
          (update) => update,
          (exit) => exit.remove(),
        );

      // Marcador central: el centro exacto de la elipse ES el punto que
      // codifica el valor (sin recorte — a índice_compuesto=100 puede
      // sobresalir un poco del borde, es intencional). Este punto pequeño y
      // sutil lo hace legible visualmente.
      let centros = dotsLayer
        .selectAll("circle.locality-dot-center")
        .data(puntos, (d) => d.id)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "locality-dot-center")
              .attr("r", opts.centerMarkerRadius)
              .attr("cx", (d) => d.x)
              .attr("cy", (d) => d.y)
              .attr("fill", "var(--verde-fuerte)")
              .attr("fill-opacity", 0.5)
              .style("pointer-events", "none"),
          (update) => update,
          (exit) => exit.remove(),
        );

      if (opts.interactive) {
        dots
          .style("cursor", "pointer")
          .on("mouseenter", (event, d) => {
            opts.onHover && opts.onHover(d.id, currentYear);
            mostrarNombreHover(d);
          })
          .on("mouseleave", () => {
            opts.onHover && opts.onHover(null);
            ocultarNombreHover();
          })
          .on("click", (event, d) => {
            event.stopPropagation();
            opts.onSelect && opts.onSelect(d.id, currentYear);
          });
      }

      // La elipse (y su marcador central) recorren la misma curva que la
      // estela — casi recta, con el quiebre en el waypoint suavizado.
      function tweenBezier(d) {
        const o = anterioresParaMovimiento.get(d.id) || d;
        const loc = buscarLocalidad(d.id);
        const { c1, c2 } = calcularControlesSuavizado(loc, añoAnterior, o, año, d);
        const node = this;
        return (t) => {
          const pt = puntoBezierCubica(o, c1, c2, d, t);
          node.setAttribute("cx", pt.x);
          node.setAttribute("cy", pt.y);
        };
      }

      let transition = null;
      if (animate) {
        transition = dots
          .interrupt("year-move")
          .transition("year-move")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .tween("pos", tweenBezier);
        centros
          .interrupt("year-move")
          .transition("year-move")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .tween("pos", tweenBezier);
      } else {
        dots.interrupt("year-move").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        centros.interrupt("year-move").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      }

      currentYear = año;
      return transition;
    }

    render(currentYear);

    return {
      setYear(año) {
        render(año, { animate: false });
      },
      transitionToYear(año, duration) {
        const transition = render(año, { animate: true, duration });
        return transition ? transition.end().catch(() => {}) : Promise.resolve();
      },
      highlight(id) {
        // Al fijar una localidad, las demás bajan de opacidad — se vuelve
        // a aplicar en cada render() (ver actualizarTarjeta en index.html,
        // que llama highlight tras cada cambio de año), así que el
        // atenuado se mantiene durante toda la animación de evolución.
        dotsLayer
          .selectAll("circle.locality-dot")
          .attr("r", (d) => (d.id === id ? opts.hoverDotRadius : opts.dotRadius))
          .attr("stroke", (d) =>
            d.id === id ? `var(${d.dominantColorVar})` : "var(--verde-fuerte)",
          )
          .attr("stroke-width", (d) => (d.id === id ? 2.5 : 1.5))
          .transition("dim")
          .duration(300)
          .attr("fill-opacity", (d) => (id === null || d.id === id ? 0.55 : 0.15))
          .attr("stroke-opacity", (d) => (id === null || d.id === id ? 1 : 0.35));
        dotsLayer
          .selectAll("circle.locality-dot-center")
          .transition("dim")
          .duration(300)
          .attr("fill-opacity", (d) => (id === null || d.id === id ? 0.5 : 0.12));
      },
      getCurrentYear() {
        return currentYear;
      },
      setEstelasActivas(activo) {
        estelasActivas = activo;
        if (!activo) {
          trailsLayer.selectAll("path").interrupt().remove();
          trailsDefs.selectAll("linearGradient").remove();
        }
      },
      // Con id !== null, solo esa localidad deja estela al animar entre
      // años; las demás quedan sin rastro. Con null, todas vuelven a
      // dejar estela normalmente.
      setSeleccion(id) {
        localidadSeleccionada = id;
      },
    };
  }

  window.IDESRadialChart = {
    AXES,
    DIM_LABELS,
    anguloARad,
    polarAXY,
    getAñoData,
    calcularPosicion,
    crearGraficoRadial,
  };
})();
