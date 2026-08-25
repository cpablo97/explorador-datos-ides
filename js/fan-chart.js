// fan-chart.js
// Abanico de 180°: cada localidad tiene un ángulo fijo (orden alfabético de
// su nombre) y un radio que es su indice_compuesto real del año activo. En
// reposo cada localidad es solo un punto + línea guía; al pasar el cursor o
// hacer foco se revela su "rosa" (ver locality-rose.js).
//
// Reemplaza radial-chart.js: la lógica de "eje dominante" (posición
// baricéntrica derivada de los 3 puntajes) queda descartada por completo —
// ver "Qué cambia respecto al prototipo actual" en
// prompt-explorador-datos-ides.md para la justificación.

(function () {
  const DIM_LABELS = {
    justicia: "Justicia",
    salud: "Salud",
    determinantes: "Determinantes Sociales",
  };

  // Orden de iteración para la tarjeta de detalle (locality-card.js) — sin
  // relación con los ángulos fijos de los pétalos de la rosa (ver PETALS en
  // locality-rose.js), que son independientes del orden alfabético del abanico.
  const AXES = [{ key: "salud" }, { key: "justicia" }, { key: "determinantes" }];

  function toRad(deg) {
    return (deg * Math.PI) / 180;
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

  function ordenAlfabetico(data) {
    return data.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  // Mezcla de color por dominancia de dimensión, usada solo para el
  // gradiente de la estela — depende únicamente de los puntajes (no de la
  // posición), así que sigue siendo válida con la nueva geometría.
  const COLOR_EJE_RGB = {
    justicia: [234, 88, 37], // --naranja-300
    salud: [93, 158, 182], // --azul-300
    determinantes: [50, 129, 75], // --verde-300
  };
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
    let r = 0,
      g = 0,
      b = 0;
    Object.keys(COLOR_EJE_RGB).forEach((k) => {
      const [cr, cg, cb] = COLOR_EJE_RGB[k];
      r += cr * pesos[k];
      g += cg * pesos[k];
      b += cb * pesos[k];
    });
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  function crearGraficoAbanico(containerSelector, options) {
    const opts = Object.assign(
      {
        data: [],
        radioMax: 420,
        dotRadius: 8,
        roseRx: 46,
        roseRy: 46,
        marginLeft: 230,
        marginRight: 230,
        marginTop: 230,
        marginBottom: 90,
        interactive: true,
        filterIds: null,
        forceRose: false,
        trailWidth: 16,
        trailFadeDuration: 5000,
        onHover: null,
        onSelect: null,
      },
      options,
    );

    const { renderRose, clearRose } = window.IDESLocalityRose;

    // El ángulo de CADA localidad se deriva de su posición en el orden
    // alfabético completo (las 20), no del subconjunto que termine
    // renderizándose (ver filterIds) — así el diagrama secundario de Usme
    // usa exactamente el mismo ángulo fijo que tendría en el abanico
    // principal.
    const localidadesOrdenadas = ordenAlfabetico(opts.data);
    const N = localidadesOrdenadas.length;
    const indiceAlfabetico = new Map(
      localidadesOrdenadas.map((loc, i) => [loc.id, i]),
    );

    const HX = opts.radioMax;
    const HY = opts.radioMax;
    const totalW = opts.radioMax * 2 + opts.marginLeft + opts.marginRight;
    const totalH = opts.radioMax + opts.marginTop + opts.marginBottom;

    const svg = d3
      .select(containerSelector)
      .style("aspect-ratio", `${totalW} / ${totalH}`)
      .append("svg")
      .attr("viewBox", `${-opts.marginLeft} ${-opts.marginTop} ${totalW} ${totalH}`)
      .attr("class", "fan-chart");

    if (opts.interactive) {
      svg
        .append("rect")
        .attr("class", "fan-chart__click-area")
        .attr("x", -opts.marginLeft)
        .attr("y", -opts.marginTop)
        .attr("width", totalW)
        .attr("height", totalH)
        .attr("fill", "transparent")
        .on("click", () => opts.onSelect && opts.onSelect(null));
    }

    const fondo = svg.append("g").attr("class", "fan-fondo");
    fondo
      .append("line")
      .attr("class", "fan-fondo__base")
      .attr("x1", HX - opts.radioMax)
      .attr("y1", HY)
      .attr("x2", HX + opts.radioMax)
      .attr("y2", HY);
    // Escala de fondo: arco sólido cada 20 (con su valor escrito sobre la
    // línea base, a ambos lados del hub) y arco punteado cada 5 entre medio
    // — guía visual más fina que antes, sigue sin necesitar números en los
    // pasos intermedios.
    for (let v = 5; v <= 100; v += 5) {
      const r = opts.radioMax * (v / 100);
      const esMayor = v % 20 === 0;
      fondo
        .append("path")
        .attr("class", esMayor ? "fan-fondo__arco fan-fondo__arco--mayor" : "fan-fondo__arco")
        .attr("d", `M${HX - r},${HY} A${r},${r} 0 0,1 ${HX + r},${HY}`);

      if (esMayor) {
        [HX - r, HX + r].forEach((x) => {
          fondo
            .append("text")
            .attr("class", "fan-fondo__valor")
            .attr("x", x)
            .attr("y", HY + 16)
            .attr("text-anchor", "middle")
            .text(v);
        });
      }
    }

    const dataset = opts.filterIds
      ? localidadesOrdenadas.filter((d) => opts.filterIds.includes(d.id))
      : localidadesOrdenadas;

    function anguloDe(id) {
      const i = indiceAlfabetico.get(id);
      return N === 1 ? -90 : -180 + i * (180 / (N - 1));
    }

    function posicionDe(loc, año) {
      const { dims, indiceCompuesto } = getAñoData(loc, año);
      const angulo = anguloDe(loc.id);
      const rad = toRad(angulo);
      const radio = (indiceCompuesto / 100) * opts.radioMax;
      return {
        x: HX + radio * Math.cos(rad),
        y: HY + radio * Math.sin(rad),
        angulo,
        dims,
        indiceCompuesto,
      };
    }

    const guiasLayer = svg.append("g").attr("class", "fan-guias");
    const etiquetasLayer = svg.append("g").attr("class", "fan-etiquetas");
    const trailsLayer = svg.append("g").attr("class", "fan-trails");
    const trailsDefs = svg.append("defs").attr("class", "fan-trails-defs");
    const puntosLayer = svg.append("g").attr("class", "fan-puntos");
    // Encima de los puntos: al ser opaca, cubre visualmente el punto de la
    // localidad activa sin necesidad de ocultarlo por separado.
    const roseLayer = svg
      .append("g")
      .attr("class", "fan-rosa")
      .style("pointer-events", "none");

    // El ángulo de cada localidad (y por lo tanto su línea guía y su
    // etiqueta) NUNCA cambia entre años — así que se dibujan una sola vez,
    // como un "rayo" fijo del hub hacia afuera que sigue de largo más allá
    // del punto hasta el nombre, dejando ese espacio libre para que la rosa
    // (tamaño fijo) del punto en su radio máximo no choque con el texto.
    // Lo único que se mueve año a año es el punto sobre ese rayo (ver
    // render()/construirPuntos()).
    const labelGap = opts.roseRy + 24;
    const labelRadius = opts.radioMax + labelGap;
    dataset.forEach((loc) => {
      const angulo = anguloDe(loc.id);
      const rad = toRad(angulo);
      const lx = HX + labelRadius * Math.cos(rad);
      const ly = HY + labelRadius * Math.sin(rad);

      guiasLayer
        .append("line")
        .attr("class", "fan-guide")
        .datum({ id: loc.id })
        .attr("x1", HX)
        .attr("y1", HY)
        .attr("x2", lx)
        .attr("y2", ly);

      // Mitad izquierda del abanico: rotar directo por `angulo` dejaría el
      // texto boca abajo — se rota 180° más y se ancla del otro lado para
      // que siga leyéndose de izquierda a derecha, extendiéndose hacia
      // afuera igual que en la mitad derecha.
      const mitadIzquierda = angulo < -90;
      const rotacion = mitadIzquierda ? angulo + 180 : angulo;

      etiquetasLayer
        .append("text")
        .attr("class", "fan-etiqueta")
        .attr("transform", `translate(${lx},${ly}) rotate(${rotacion})`)
        .attr("text-anchor", mitadIzquierda ? "end" : "start")
        .attr("dx", mitadIzquierda ? -8 : 8)
        .attr("dy", "0.32em")
        .text(loc.nombre);
    });

    let currentYear = 2024;
    let puntosAnteriores = new Map();
    let estelasActivas = true;
    let contadorEstelas = 0;
    let localidadSeleccionada = null;

    function mostrarRosa(d, duration = 0) {
      renderRose(roseLayer, {
        key: d.id,
        cx: d.x,
        cy: d.y,
        rx: opts.roseRx,
        ry: opts.roseRy,
        dims: d.dims,
        duration,
      });
    }

    // Conjunto de localidades que deben tener su rosa dibujada en este
    // instante: la activa por hover/foco/pin (idActivo) y, si el modo
    // "siempre visibles" está encendido, las 20 — ver setRosasSiempreVisibles.
    // sincronizarRosas() reconcilia el DOM contra ese conjunto en cada
    // cambio (año, hover, o al prender/apagar el modo), sin recrear las que
    // ya estaban (ver renderRose en locality-rose.js).
    let idActivo = null;
    let siempreVisibles = false;

    function idsDeseados() {
      if (siempreVisibles) return new Set(dataset.map((d) => d.id));
      return idActivo ? new Set([idActivo]) : new Set();
    }

    function sincronizarRosas(duration = 0) {
      const deseados = idsDeseados();
      roseLayer.selectAll(".locality-rose").each(function () {
        const key = this.getAttribute("data-key");
        if (!deseados.has(key)) clearRose(roseLayer, key);
      });
      deseados.forEach((id) => {
        const d = puntosAnteriores.get(id);
        if (d) mostrarRosa(d, duration);
      });
    }

    // Atenúa todo lo que no sea `idActivo` (punto, línea guía y, si están
    // encendidas, el resto de las rosas) — se reaplica tanto en highlight()
    // como después de sincronizarRosas() para que el valor no se pierda al
    // (re)crear una rosa (ver el comentario sobre `opacity` en
    // locality-rose.js: renderRose ya no la resetea en cada año, pero una
    // rosa RECIÉN creada sí nace sin ese atenuado y hay que aplicárselo).
    function aplicarAtenuado() {
      const id = idActivo;
      const esActivo = (d) => id === null || id === undefined || d.id === id;
      puntosLayer
        .selectAll("circle.fan-point")
        .transition("dim")
        .duration(250)
        .attr("opacity", (d) => (esActivo(d) ? 1 : 0.3));
      guiasLayer
        .selectAll("line.fan-guide")
        .transition("dim")
        .duration(250)
        .attr("opacity", (d) => (esActivo(d) ? 1 : 0.3));
      // Con "rosas siempre visibles" encendido, la rosa de cada punto tapa
      // por completo su propio punto/línea (ver roseLayer más arriba) — sin
      // esto, atenuar solo el punto/línea de abajo no se notaría, porque
      // queda oculto detrás de una rosa que sigue a opacidad plena.
      roseLayer.selectAll(".locality-rose").style("opacity", function () {
        const key = this.getAttribute("data-key");
        return id === null || id === undefined || key === id ? null : 0.3;
      });
    }

    function construirPuntos(año) {
      return dataset.map((loc) => {
        const pos = posicionDe(loc, año);
        return { id: loc.id, nombre: loc.nombre, ...pos };
      });
    }

    // Estela: recta entre la posición anterior y la nueva. El ángulo nunca
    // cambia entre años, así que el tramo ya es colineal con el hub — a
    // diferencia del prototipo anterior, no hace falta ninguna curva ni
    // tangente para suavizar un cambio de dirección que ya no existe.
    function dibujarEstelas(anteriores, puntos, duration) {
      if (!estelasActivas) return;
      puntos.forEach((p) => {
        if (localidadSeleccionada !== null && p.id !== localidadSeleccionada) return;
        const o = anteriores.get(p.id);
        if (!o) return;
        if (Math.abs(o.x - p.x) < 0.5 && Math.abs(o.y - p.y) < 0.5) return;

        const colorO = mezclarColorEjes(pesosColorDims(o.dims));
        const colorP = mezclarColorEjes(pesosColorDims(p.dims));
        const gradId = `fan-estela-grad-${++contadorEstelas}`;
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

        const linea = trailsLayer
          .append("line")
          .attr("class", "fan-trail")
          .attr("x1", o.x)
          .attr("y1", o.y)
          .attr("x2", o.x)
          .attr("y2", o.y)
          .attr("stroke", `url(#${gradId})`)
          .attr("stroke-width", opts.trailWidth)
          .attr("stroke-linecap", "square")
          .attr("stroke-opacity", 0.6)
          .style("pointer-events", "none");

        linea
          .transition()
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr("x2", p.x)
          .attr("y2", p.y)
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
      const anteriores = puntosAnteriores;

      if (animate) dibujarEstelas(anteriores, puntos, duration);
      puntosAnteriores = new Map(puntos.map((p) => [p.id, p]));

      const puntosSel = puntosLayer
        .selectAll("circle.fan-point")
        .data(puntos, (d) => d.id)
        .join((enter) =>
          enter
            .append("circle")
            .attr("class", "fan-point")
            .attr("r", opts.dotRadius)
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y),
        );

      if (opts.interactive) {
        puntosSel
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr(
            "aria-label",
            (d) => `${d.nombre}, índice compuesto ${d.indiceCompuesto} de 100`,
          )
          .on("mouseenter focus", (event, d) => {
            opts.onHover && opts.onHover(d.id);
          })
          .on("mouseleave blur", () => {
            opts.onHover && opts.onHover(null);
          })
          .on("click", (event, d) => {
            event.stopPropagation();
            opts.onSelect && opts.onSelect(d.id);
          })
          .on("keydown", (event, d) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              opts.onSelect && opts.onSelect(d.id);
            }
          });
      }

      let transition = null;
      if (animate) {
        transition = puntosSel
          .interrupt("year-move")
          .transition("year-move")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
      } else {
        puntosSel.interrupt("year-move").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      }

      currentYear = año;
      // Misma duración/easing que el punto y la línea guía (ver arriba) —
      // así la rosa queda "atada" al punto en vez de saltar de golpe al
      // valor del año nuevo.
      sincronizarRosas(animate ? duration : 0);
      return transition;
    }

    // El diagrama secundario (una sola localidad, "Usme") pide su rosa
    // siempre puesta, sin hover — equivale a "siempre visibles" sobre un
    // dataset de un solo elemento, así que reutiliza el mismo mecanismo.
    if (opts.forceRose) siempreVisibles = true;
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
        idActivo = id || null;
        sincronizarRosas();
        aplicarAtenuado();
      },
      getCurrentYear() {
        return currentYear;
      },
      setEstelasActivas(activo) {
        estelasActivas = activo;
        if (!activo) {
          trailsLayer.selectAll("line").interrupt().remove();
          trailsDefs.selectAll("linearGradient").remove();
        }
      },
      // Opción para que las 20 rosas queden dibujadas permanentemente, sin
      // necesidad de hover — el prompt original documenta el solapamiento
      // que esto genera entre localidades vecinas como razón para no
      // hacerlo por defecto; queda disponible como override explícito.
      setRosasSiempreVisibles(activo) {
        siempreVisibles = activo;
        sincronizarRosas();
        // Las rosas recién creadas al prender el modo nacen a opacidad
        // plena — si ya había algo fijado/en hover, hay que atenuarlas de
        // entrada para que no aparezcan todas destacadas por un instante.
        aplicarAtenuado();
      },
      setSeleccion(id) {
        localidadSeleccionada = id;
      },
    };
  }

  window.IDESFanChart = {
    AXES,
    DIM_LABELS,
    toRad,
    getAñoData,
    ordenAlfabetico,
    crearGraficoAbanico,
  };
})();
