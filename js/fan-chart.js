// fan-chart.js
// Dos "geometrías" (posicionamiento) sobre el MISMO motor de animación,
// estelas, rosas e interacción — ver montarMotor(). Nada de esa lógica
// compartida sabe ni le importa si las coordenadas x/y vienen de un
// abanico polar o de un plano cartesiano; el único contrato entre una
// geometría y el motor es `posicionDe(loc, año) -> {x, y, dims,
// indiceCompuesto}` más dos funciones de dibujo (dibujarFondo/
// dibujarEtiquetas) para lo que sí es propio de cada layout.
//
// Abanico: cada localidad tiene un ángulo fijo (orden alfabético de su
// nombre) y un radio que es su indice_compuesto real del año activo. En
// reposo cada localidad es solo un punto + línea guía; al pasar el cursor
// o hacer foco se revela su "rosa" (ver locality-rose.js). Reemplaza
// radial-chart.js: la lógica de "eje dominante" (posición baricéntrica
// derivada de los 3 puntajes) queda descartada por completo — ver "Qué
// cambia respecto al prototipo actual" en prompt-explorador-datos-ides.md.
//
// Dispersión: eje X categórico (Bogotá D.C. + las 20 localidades), eje Y
// el puntaje IDES — misma idea que "The Wealth Health of Nations" de
// Bostock, pero con el glifo de rosa en vez de un punto/círculo (ver
// context/ajustes.md, ajuste de nueva vista).

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
      indiceCompuesto: entry.ides,
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

  // Alternativa de orden para el eje X de Dispersión — de mayor a menor
  // puntaje IDES en `año`. Ver comparación de capturas (alfabético vs por
  // puntaje) en la validación del ajuste.
  function ordenPorPuntaje(data, año) {
    return data
      .slice()
      .sort((a, b) => getAñoData(b, año).indiceCompuesto - getAñoData(a, año).indiceCompuesto);
  }

  // Mezcla de color por dominancia de dimensión, usada solo para el
  // gradiente de la estela — depende únicamente de los puntajes (no de la
  // posición), así que sirve igual para cualquier geometría.
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

  // Compartido entre TODAS las instancias de montarMotor (abanico principal,
  // dispersión, el diagrama secundario de Usme) — cada `<linearGradient>`
  // de estela necesita un id único en TODO el documento, no solo dentro de
  // su propio <svg>: un id repetido entre dos charts (ej. si ambos
  // reinician su contador en 0 y animan al mismo tiempo, como pasa ahora
  // con Abanico+Dispersión sincronizados) hace que `stroke: url(#id)`
  // resuelva al gradiente equivocado y la estela no se vea.
  let contadorEstelasGlobal = 0;

  // ======================================================================
  // MOTOR COMPARTIDO — años, animación, estelas, rosas, hover/click.
  // `geometria` aporta SOLO lo que cambia entre abanico y dispersión:
  // tamaño de lienzo, dataset (con su orden/filtro ya resuelto),
  // posicionDe(), y el dibujo de fondo/etiquetas.
  // ======================================================================
  function montarMotor(containerSelector, opts, geometria) {
    const { renderRose, clearRose, radioMaxPetalo } = window.IDESLocalityRose;
    const { totalW, totalH, marginLeft, marginTop, dataset, posicionDe } = geometria;

    const svg = d3
      .select(containerSelector)
      .style("aspect-ratio", `${totalW} / ${totalH}`)
      .append("svg")
      .attr("viewBox", `${-marginLeft} ${-marginTop} ${totalW} ${totalH}`)
      .attr("class", "fan-chart");

    if (opts.interactive) {
      svg
        .append("rect")
        .attr("class", "fan-chart__click-area")
        .attr("x", -marginLeft)
        .attr("y", -marginTop)
        .attr("width", totalW)
        .attr("height", totalH)
        .attr("fill", "transparent")
        .on("click", () => opts.onSelect && opts.onSelect(null));
    }

    const fondo = svg.append("g").attr("class", "fan-fondo");
    geometria.dibujarFondo(fondo);

    const guiasLayer = svg.append("g").attr("class", "fan-guias");
    const etiquetasLayer = svg.append("g").attr("class", "fan-etiquetas");
    // Abanico dibuja de una vez y no devuelve nada (ángulo fijo); Dispersión
    // devuelve un actualizador que render() invoca en cada año (ver abajo).
    const actualizarEtiquetas = geometria.dibujarEtiquetas(guiasLayer, etiquetasLayer);

    const trailsLayer = svg.append("g").attr("class", "fan-trails");
    const trailsDefs = svg.append("defs").attr("class", "fan-trails-defs");
    const puntosLayer = svg.append("g").attr("class", "fan-puntos");
    // Encima de los puntos: al ser opaca, cubre visualmente el punto de la
    // localidad activa sin necesidad de ocultarlo por separado.
    const roseLayer = svg
      .append("g")
      .attr("class", "fan-rosa")
      .style("pointer-events", "none");

    // Línea que conecta la localidad activa (hover o pin) con su etiqueta
    // — solo la usan geometrías que definen `posicionEtiqueta` (Dispersión:
    // la etiqueta está lejos del punto, cuya Y además se mueve entre años,
    // así que no alcanza con un rayo fijo como en Abanico — ver
    // .fan-guide/aplicarAtenuado() para el equivalente de esa vista, que no
    // se toca). Por encima de todo para que nunca quede tapada.
    const hoverGuiaLayer = svg
      .append("g")
      .attr("class", "fan-hover-guia-layer")
      .style("pointer-events", "none");
    const hoverGuiaSel = geometria.posicionEtiqueta
      ? hoverGuiaLayer.append("line").attr("class", "fan-hover-guia").attr("opacity", 0)
      : null;

    function actualizarGuiaHover(id) {
      if (!hoverGuiaSel) return;
      if (!id) {
        hoverGuiaSel.attr("opacity", 0);
        return;
      }
      const d = puntosAnteriores.get(id);
      const loc = dataset.find((l) => l.id === id);
      if (!d || !loc) {
        hoverGuiaSel.attr("opacity", 0);
        return;
      }
      const etiqueta = geometria.posicionEtiqueta(loc, currentYear);
      hoverGuiaSel
        .attr("x1", d.x)
        .attr("y1", d.y)
        .attr("x2", etiqueta.x)
        .attr("y2", etiqueta.y)
        .attr("opacity", 1);
    }

    let currentYear = 2024;
    let puntosAnteriores = new Map();
    let estelasActivas = true;
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
    // "siempre visibles" está encendido, todas — ver setRosasSiempreVisibles.
    // sincronizarRosas() reconcilia el DOM contra ese conjunto en cada
    // cambio (año, hover, o al prender/apagar el modo), sin recrear las que
    // ya estaban (ver renderRose en locality-rose.js).
    let idActivo = null;
    // Default ON (ver ajuste "Dimensiones visibles" — antes "Rosas siempre
    // visibles" — encendido por defecto al cargar la página).
    let siempreVisibles = true;

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

    // Estela: recta entre la posición anterior y la nueva. En el abanico el
    // ángulo nunca cambia entre años, así que el tramo ya es colineal con
    // el hub. En dispersión, con ordenX: "puntaje" la x sí puede cambiar de
    // un año a otro (el ranking se reacomoda), así que la estela puede
    // quedar diagonal — refuerzo visual esperado del reordenamiento. En
    // ambos casos alcanza con una simple línea recta, sin curva ni tangente.
    function dibujarEstelas(anteriores, puntos, duration) {
      if (!estelasActivas) return;
      puntos.forEach((p) => {
        if (localidadSeleccionada !== null && p.id !== localidadSeleccionada) return;
        const o = anteriores.get(p.id);
        if (!o) return;
        if (Math.abs(o.x - p.x) < 0.5 && Math.abs(o.y - p.y) < 0.5) return;

        const colorO = mezclarColorEjes(pesosColorDims(o.dims));
        const colorP = mezclarColorEjes(pesosColorDims(p.dims));
        const gradId = `fan-estela-grad-${++contadorEstelasGlobal}`;
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

      // Área sensible de hover/click, más grande que el punto visual — del
      // tamaño del pétalo más grande que dibujaría la rosa de esa
      // localidad (ver radioMaxPetalo en locality-rose.js), no del tamaño
      // fijo/diminuto de opts.dotRadius. Invisible (fill transparent, no
      // stroke): el punto visual (arriba) sigue siendo lo único que se ve
      // en reposo. Pedido explícito del usuario — antes había que apuntar
      // justo al punto diminuto para hacer hover/click.
      const hitSel = puntosLayer
        .selectAll("circle.fan-point-hit")
        .data(puntos, (d) => d.id)
        .join((enter) =>
          enter
            .append("circle")
            .attr("class", "fan-point-hit")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y),
        )
        .attr("r", (d) => radioMaxPetalo(d.dims, opts.roseRx, opts.roseRy));

      if (opts.interactive) {
        hitSel
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
        hitSel
          .interrupt("year-move")
          .transition("year-move")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y);
      } else {
        puntosSel.interrupt("year-move").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        hitSel.interrupt("year-move").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      }

      if (actualizarEtiquetas) actualizarEtiquetas(año, { animate, duration });

      currentYear = año;
      // Misma duración/easing que el punto y la línea guía (ver arriba) —
      // así la rosa queda "atada" al punto en vez de saltar de golpe al
      // valor del año nuevo.
      sincronizarRosas(animate ? duration : 0);
      // La guía hover/pin no anima (salto directo) — es una ayuda de
      // lectura secundaria, no necesita el mismo cuidado que el punto/rosa.
      actualizarGuiaHover(idActivo);
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
        actualizarGuiaHover(idActivo);
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
      // Opción para que todas las rosas queden dibujadas permanentemente,
      // sin necesidad de hover — el prompt original documenta el
      // solapamiento que esto genera entre localidades vecinas como razón
      // para no hacerlo por defecto en su momento; ahora es el default.
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

  // ======================================================================
  // GEOMETRÍA — Abanico (polar)
  // ======================================================================
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
        incluirBogota: false,
        trailWidth: 16,
        trailFadeDuration: 5000,
        onHover: null,
        onSelect: null,
      },
      options,
    );

    const { getLocalidadesReales, getBogota } = window.IDESLocalityUtils;

    // El ángulo de CADA localidad se deriva de su posición en el orden
    // alfabético completo (las 20), no del subconjunto que termine
    // renderizándose (ver filterIds) — así el diagrama secundario de Usme
    // usa exactamente el mismo ángulo fijo que tendría en el abanico
    // principal. Bogotá (ciudad: true) se excluye ANTES de ordenar: si se
    // colara acá, correría el ángulo de toda localidad alfabéticamente
    // posterior a ella y aparecería como un pétalo 21 en un abanico
    // pensado para 20 — en vez de eso, si `incluirBogota` está prendido,
    // se agrega DESPUÉS como el punto 21 del MISMO arco de 180° (ver
    // anguloDe: totalPuntos/paso), sin tocar el orden alfabético relativo
    // de las 20 ni el resto de los estilos existentes.
    const localidadesOrdenadas = ordenAlfabetico(getLocalidadesReales(opts.data));
    const N = localidadesOrdenadas.length;
    const indiceAlfabetico = new Map(localidadesOrdenadas.map((loc, i) => [loc.id, i]));
    const bogota = opts.incluirBogota ? getBogota(opts.data) : null;

    const HX = opts.radioMax;
    const HY = opts.radioMax;
    const totalW = opts.radioMax * 2 + opts.marginLeft + opts.marginRight;
    const totalH = opts.radioMax + opts.marginTop + opts.marginBottom;

    const dataset = opts.filterIds
      ? localidadesOrdenadas.filter((d) => opts.filterIds.includes(d.id))
      : localidadesOrdenadas;
    if (bogota) dataset.push(bogota);

    // Bogotá D.C. es una referencia (benchmark), pero el abanico sigue
    // siendo estrictamente 180° — nada se dibuja fuera de ese arco. Ocupa
    // el extremo -180° (el lugar que antes tenía "Antonio Nariño"
    // alfabéticamente) y las 20 localidades reales ceden un paso: el arco
    // se reparte entre totalPuntos=21 en vez de 20, así el paso se
    // angosta un poco (180/20=9° en vez de 180/19≈9.47°).
    const totalPuntos = bogota ? N + 1 : N;
    const paso = totalPuntos === 1 ? 0 : 180 / (totalPuntos - 1);
    function anguloDe(id) {
      if (bogota && id === bogota.id) return -180;
      const i = indiceAlfabetico.get(id);
      const slot = bogota ? i + 1 : i;
      return totalPuntos === 1 ? -90 : -180 + slot * paso;
    }

    function posicionDe(loc, año) {
      const { dims, indiceCompuesto } = getAñoData(loc, año);
      const angulo = anguloDe(loc.id);
      const rad = toRad(angulo);
      const radio = (indiceCompuesto / 100) * opts.radioMax;
      return {
        x: HX + radio * Math.cos(rad),
        y: HY + radio * Math.sin(rad),
        dims,
        indiceCompuesto,
      };
    }

    const geometria = {
      totalW,
      totalH,
      marginLeft: opts.marginLeft,
      marginTop: opts.marginTop,
      dataset,
      posicionDe,

      dibujarFondo(fondo) {
        fondo
          .append("line")
          .attr("class", "fan-fondo__base")
          .attr("x1", HX - opts.radioMax)
          .attr("y1", HY)
          .attr("x2", HX + opts.radioMax)
          .attr("y2", HY);
        // Escala de fondo: arco sólido cada 20 (con su valor escrito sobre
        // la línea base, a ambos lados del hub) y arco punteado cada 5
        // entre medio.
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

        // Título del eje — un solo label centrado en el hub (0), debajo de
        // la fila de números 0-100 que se repite a izquierda y derecha
        // (ver .fan-fondo__eje-label en explorador.css para el porqué de
        // uno solo).
        fondo
          .append("text")
          .attr("class", "fan-fondo__eje-label")
          .attr("x", HX)
          .attr("y", HY + 34)
          .attr("text-anchor", "middle")
          .text("Puntaje IDES");
      },

      dibujarEtiquetas(guiasLayer, etiquetasLayer) {
        // El ángulo de cada localidad (y por lo tanto su línea guía y su
        // etiqueta) NUNCA cambia entre años — así que se dibujan una sola
        // vez, como un "rayo" fijo del hub hacia afuera que sigue de largo
        // más allá del punto hasta el nombre, dejando ese espacio libre
        // para que la rosa (tamaño fijo) del punto en su radio máximo no
        // choque con el texto.
        const labelGap = opts.roseRy + 68;
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

          // Mitad izquierda del abanico: rotar directo por `angulo` dejaría
          // el texto boca abajo — se rota 180° más y se ancla del otro
          // lado para que siga leyéndose de izquierda a derecha.
          const mitadIzquierda = angulo < -90;
          const rotacion = mitadIzquierda ? angulo + 180 : angulo;

          etiquetasLayer
            .append("text")
            .attr("class", `fan-etiqueta${loc.ciudad ? " fan-etiqueta--bogota" : ""}`)
            .attr("transform", `translate(${lx},${ly}) rotate(${rotacion})`)
            .attr("text-anchor", mitadIzquierda ? "end" : "start")
            .attr("dx", mitadIzquierda ? -8 : 8)
            .attr("dy", "0.32em")
            .text(loc.nombre);
        });
      },
    };

    return montarMotor(containerSelector, opts, geometria);
  }

  // ======================================================================
  // GEOMETRÍA — Dispersión (cartesiana: X categórico, Y = puntaje IDES)
  // ======================================================================
  function crearGraficoDispersion(containerSelector, options) {
    const opts = Object.assign(
      {
        data: [],
        // dotRadius/roseRx/roseRy/trailWidth: valores heredados de cuando
        // se intentó igualar el tamaño en pantalla al de Abanico (8/46/
        // 46/16) — eso ya NO es cierto en todos los anchos: #chart-scatter
        // se re-escala libremente (igual que #chart-main, ver
        // css/explorador.css), sin min-width, para que nunca fuerce scroll
        // horizontal (ver context/ajustes.md — bug de scroll en
        // Dispersión). Solo coincide 1:1 con Abanico en el ancho puntual
        // donde el factor de escala da igual; en el resto se achica/agranda
        // junto con todo lo demás del gráfico.
        dotRadius: 7.6,
        roseRx: 44,
        roseRy: 44,
        // anchoCategoria: prioridad explícita del usuario es que esta vista
        // se vea grande en desktop, lo más parecido posible a Abanico —
        // angostado más allá del piso sin solapamiento. Con el font-size de
        // 1.75rem de .disp-etiqueta (ver explorador.css) esto ya no alcanza
        // para evitar el solapamiento entre varias localidades vecinas
        // (nombres largos como "Puente Aranda"/"Rafael Uribe Uribe") — es
        // una decisión explícita del usuario (no del autor): prioriza el
        // tamaño de la fuente/visualización sobre el solapamiento en el eje
        // X, en vez de compensar subiendo este valor (lo que devolvería la
        // fuente a su tamaño real anterior, ver discusión en el historial).
        // NO se optimizó para mobile/angosto: ahí puede verse chico o con
        // más solapamiento, no es el caso de uso principal de esta vista.
        anchoCategoria: 95,
        // altoGrafico: experimento pedido por el usuario — que el alto
        // RENDERIZADO en pantalla (no el totalH interno del viewBox) quede
        // igual al de Abanico, sin tocar anchoCategoria ni ningún tamaño de
        // fuente/rosa/punto. Como ambos SVG se escalan a 100% del mismo
        // ancho de contenedor pero tienen un totalW distinto (Abanico 1300,
        // Dispersión 2175.5), igualar el totalH interno NO alcanza — el
        // alto real depende de totalH/totalW (relación de aspecto), no de
        // totalH solo. Por eso: totalH_dispersión = totalW_dispersión ×
        // (totalH_abanico / totalW_abanico) = 2175.5 × (740/1300) ≈ 1238.4;
        // altoGrafico = 1238.4 - marginTop(64) - marginBottom(230) ≈ 944.
        // OJO: esto reabre el problema que altoGrafico:1364 resolvía — la
        // tarjeta flotante de detalle (.locality-modal, ~607px fijos) puede
        // volver a medir más que el SVG en anchos desktop angostos. Es
        // intencional mientras se evalúa el experimento visualmente.
        altoGrafico: 944,
        marginLeft: 116,
        marginRight: 36,
        marginTop: 64,
        // marginBottom: subido de 132 a 230 al pasar .disp-etiqueta a
        // 1.75rem — las 21 etiquetas rotadas -45° bajo el eje X ya no
        // cabían en el margen viejo y se recortaban contra el borde
        // inferior del SVG (overflow:hidden implícito de todo <svg>).
        marginBottom: 230,
        // "puntaje": orden dinámico por índice compuesto del año activo
        // (ver indiceCategoriaParaAño más abajo) — Bogotá D.C. queda
        // siempre pinneada en el slot 0 sin importar el modo.
        ordenX: "alfabetico", // "alfabetico" | "puntaje"
        interactive: true,
        forceRose: false,
        trailWidth: 15.2,
        trailFadeDuration: 5000,
        onHover: null,
        onSelect: null,
      },
      options,
    );

    const { getLocalidadesReales, getBogota } = window.IDESLocalityUtils;

    // categorias: solo identidad/conteo (N, dataset, yMax) — el orden real
    // en el eje X se recalcula por año más abajo (indiceCategoriaParaAño),
    // así que aquí siempre va alfabético sin importar opts.ordenX.
    const localidadesReales = getLocalidadesReales(opts.data);
    const localidadesOrdenadas = ordenAlfabetico(localidadesReales);
    const bogota = getBogota(opts.data);

    // Bogotá D.C. va primero, como entidad de referencia (benchmark) — no
    // es una localidad más a comparar posicionalmente, así que no entra al
    // orden alfabético/por puntaje de las otras 20 y queda separada por un
    // hueco extra en el eje X (ver GAP_BOGOTA más abajo).
    const categorias = bogota ? [bogota, ...localidadesOrdenadas] : localidadesOrdenadas;
    const N = categorias.length;

    // Con ordenX: "puntaje" el orden en el eje X depende del año (el
    // ranking por puntaje IDES cambia de un año a otro) — se recalcula por
    // demanda y se cachea por año (solo hay 3, el costo es irrelevante).
    // Bogotá sigue pinneada en el slot 0 en cualquier año.
    const indiceCategoriaAlfabetica = new Map(categorias.map((loc, i) => [loc.id, i]));
    const cacheIndicePorAño = new Map();
    function indiceCategoriaParaAño(año) {
      if (opts.ordenX !== "puntaje") return indiceCategoriaAlfabetica;
      if (!cacheIndicePorAño.has(año)) {
        const ordenadas = ordenPorPuntaje(localidadesReales, año);
        const cats = bogota ? [bogota, ...ordenadas] : ordenadas;
        cacheIndicePorAño.set(año, new Map(cats.map((loc, i) => [loc.id, i])));
      }
      return cacheIndicePorAño.get(año);
    }

    const GAP_BOGOTA = 1.3; // "categorías" de más entre Bogotá y las localidades
    const holguraTotal = bogota ? GAP_BOGOTA - 1 : 0;

    function xDeIndice(i) {
      const offset = bogota && i > 0 ? holguraTotal : 0;
      return (i + 0.5 + offset) * opts.anchoCategoria;
    }

    const plotWidth = (N + holguraTotal) * opts.anchoCategoria;
    const totalW = plotWidth + opts.marginLeft + opts.marginRight;
    const totalH = opts.altoGrafico + opts.marginTop + opts.marginBottom;

    // yMax dinámico, con piso en 100: el IDES es un índice 0-100 por
    // construcción (el mismo tope fijo que ya usa el radio del abanico),
    // así que el eje siempre muestra el 100 aunque los datos actuales no
    // lo alcancen — no tendría sentido leer el eje como "el máximo posible
    // es 80" solo porque hoy nadie llegó más alto. El techo SÍ sigue
    // siendo dinámico hacia arriba (redondeado al siguiente múltiplo de
    // 20) por si algún día hay datos por encima de 100; con los datos
    // actuales (máximo observado 66) el resultado es 100.
    let maxObservado = 0;
    categorias.forEach((loc) => {
      loc.anos.forEach((a) => {
        if (a.ides > maxObservado) maxObservado = a.ides;
      });
    });
    const yMax = Math.max(100, Math.ceil(maxObservado / 20) * 20);

    function escalaY(valor) {
      return opts.altoGrafico * (1 - valor / yMax);
    }

    function posicionDe(loc, año) {
      const { dims, indiceCompuesto } = getAñoData(loc, año);
      return {
        x: xDeIndice(indiceCategoriaParaAño(año).get(loc.id)),
        y: escalaY(indiceCompuesto),
        dims,
        indiceCompuesto,
      };
    }

    const geometria = {
      totalW,
      totalH,
      marginLeft: opts.marginLeft,
      marginTop: opts.marginTop,
      dataset: categorias,
      posicionDe,

      // Punto de anclaje de la línea guía hover/pin (ver hoverGuiaSel en
      // montarMotor) — el mismo punto donde arranca el tick/etiqueta de
      // cada categoría en dibujarEtiquetas() más abajo. Recibe año porque
      // con ordenX: "puntaje" ese punto se mueve entre años igual que el
      // punto mismo.
      posicionEtiqueta(loc, año) {
        return { x: xDeIndice(indiceCategoriaParaAño(año).get(loc.id)), y: opts.altoGrafico };
      },

      dibujarFondo(fondo) {
        // Cuadrícula horizontal de referencia: línea gruesa sólida cada 20
        // unidades, punteada fina en cada múltiplo de 5 intermedio — ver
        // .disp-fondo__linea/--mayor en explorador.css (mismo lenguaje
        // visual de bajo contraste que .fan-fondo__arco/--mayor). Van
        // detrás de las rosas porque `fondo` se agrega antes que
        // puntosLayer/roseLayer en montarMotor().
        for (let v = 0; v <= yMax; v += 5) {
          const y = escalaY(v);
          const esMayor = v % 20 === 0;
          fondo
            .append("line")
            .attr("class", esMayor ? "disp-fondo__linea disp-fondo__linea--mayor" : "disp-fondo__linea")
            .attr("x1", 0)
            .attr("x2", plotWidth)
            .attr("y1", y)
            .attr("y2", y);
          if (esMayor) {
            fondo
              .append("text")
              .attr("class", "disp-fondo__valor")
              .attr("x", -14)
              .attr("y", y)
              .attr("text-anchor", "end")
              .attr("dy", "0.32em")
              .text(v);
          }
        }

        fondo
          .append("text")
          .attr("class", "disp-fondo__eje-label")
          .attr("x", 90)
          .attr("y", escalaY(yMax) - 22)
          .attr("text-anchor", "end")
          .text("Puntaje IDES");

        // Separador sutil entre Bogotá D.C. (referencia) y las 20
        // localidades — mismo criterio de bajo contraste que la cuadrícula.
        if (bogota) {
          const xDivisor = (1 + holguraTotal / 2) * opts.anchoCategoria;
          fondo
            .append("line")
            .attr("class", "disp-fondo__divisor")
            .attr("x1", xDivisor)
            .attr("x2", xDivisor)
            .attr("y1", escalaY(yMax) - 30)
            .attr("y2", opts.altoGrafico + 10);
        }
      },

      // A diferencia de Abanico (ángulo fijo, se dibuja una sola vez), con
      // ordenX: "puntaje" el orden en X cambia por año — así que esto ya no
      // dibuja directo: devuelve un `actualizar(año, {animate, duration})`
      // que el motor invoca en cada render() (ver montarMotor), con el
      // mismo join keyed por id + transición "year-move" que puntosSel/
      // hitSel, para que tick+etiqueta viajen pegados a su punto.
      dibujarEtiquetas(guiasLayer, etiquetasLayer) {
        const yBase = opts.altoGrafico;
        return function actualizar(año, { animate, duration } = {}) {
          const indice = indiceCategoriaParaAño(año);
          const puntos = categorias.map((loc) => ({
            id: loc.id,
            nombre: loc.nombre,
            ciudad: loc.ciudad,
            x: xDeIndice(indice.get(loc.id)),
          }));

          const ticksSel = guiasLayer
            .selectAll("line.disp-tick")
            .data(puntos, (d) => d.id)
            .join((enter) =>
              enter
                .append("line")
                .attr("class", "disp-tick")
                .attr("y1", yBase)
                .attr("y2", yBase + 8)
                .attr("x1", (d) => d.x)
                .attr("x2", (d) => d.x),
            );

          const etiquetasSel = etiquetasLayer
            .selectAll("text.disp-etiqueta")
            .data(puntos, (d) => d.id)
            .join((enter) =>
              enter
                .append("text")
                .attr("class", (d) => `disp-etiqueta${d.ciudad ? " disp-etiqueta--bogota" : ""}`)
                .attr("text-anchor", "end")
                .attr("dy", "0.32em")
                .text((d) => d.nombre)
                .attr("transform", (d) => `translate(${d.x},${yBase + 14}) rotate(-45)`),
            );

          if (animate) {
            ticksSel
              .interrupt("year-move")
              .transition("year-move")
              .duration(duration)
              .ease(d3.easeCubicInOut)
              .attr("x1", (d) => d.x)
              .attr("x2", (d) => d.x);
            etiquetasSel
              .interrupt("year-move")
              .transition("year-move")
              .duration(duration)
              .ease(d3.easeCubicInOut)
              .attr("transform", (d) => `translate(${d.x},${yBase + 14}) rotate(-45)`);
          } else {
            ticksSel.interrupt("year-move").attr("x1", (d) => d.x).attr("x2", (d) => d.x);
            etiquetasSel
              .interrupt("year-move")
              .attr("transform", (d) => `translate(${d.x},${yBase + 14}) rotate(-45)`);
          }
        };
      },
    };

    return montarMotor(containerSelector, opts, geometria);
  }

  window.IDESFanChart = {
    AXES,
    DIM_LABELS,
    toRad,
    getAñoData,
    ordenAlfabetico,
    ordenPorPuntaje,
    crearGraficoAbanico,
    crearGraficoDispersion,
  };
})();
