// scrollytelling-intro.js
// Fundación técnica v2 — reconstrucción completa del scrollytelling de
// entrada al proyecto IDES, sobre Scrollama + D3 v7 + GSAP/ScrollTrigger
// (cargados por CDN en index.html, sin build step). Reemplaza la versión
// anterior (requestAnimationFrame + posiciones de círculos fijas): esto es
// una reconstrucción, no un parche.
//
// División de responsabilidades entre librerías (se mantiene igual en toda
// la pieza, incluidos los actos futuros):
// - Scrollama: sigue siendo quien dispara el cambio de paso (onStepEnter) y
//   la progresión continua dentro de un paso (onStepProgress, ver Acto 2+3+4
//   más abajo — es el único tramo de la pieza que usa progress).
// - GSAP + ScrollTrigger: coreografían lo que NO está atado a datos —
//   entradas de texto, easing con pop/elástico suave, entradas de panel al
//   entrar en viewport. Cada tween se mata (gsap.killTweensOf) antes de
//   lanzar el siguiente, así el scroll rápido nunca acumula animaciones en
//   cola ni bloquea el scroll.
// - D3 v7 (+ d3-force): los círculos de localidades del beeswarm (Acto
//   2+3+4) son siempre nodos de una simulación de fuerzas — nunca
//   posiciones fijas o copiadas.
//
// Acto 0 y Acto 1 (líneas ~26-352) son la fundación técnica original, sin
// cambios. Acto 2+3+4 (el resto del archivo) fusiona "qué es el IDES", sus
// 3 dimensiones y sus 23 indicadores reales en una sola sección con un solo
// panel de beeswarm reutilizable — ver renderBeeswarmPanel.

(function () {
  gsap.registerPlugin(ScrollTrigger);

  // Dimensión de cada cifra del Acto 1, en orden — usada solo para el
  // color de acento de la tarjeta (tokens ya existentes en tokens.css, los
  // mismos que distinguen cada dimensión en el resto del sitio).
  const DIMENSION_COLOR_VAR = {
    salud: "--color-text-decoration-salud",
    justicia: "--color-text-decoration-justicia",
    determinantes: "--color-text-decoration-determinantes",
  };
  const ACTO1_DIMENSIONES = ["salud", "justicia", "determinantes"];

  // ---------- Movimiento reducido (gsap.matchMedia) ----------
  // Un solo punto de verdad para todo el archivo: en vez de repetir
  // window.matchMedia(...).matches en cada función, se registra el query
  // vía gsap.matchMedia() (el mecanismo recomendado por GSAP) y se guarda
  // el resultado en un objeto reactivo que el resto del código consulta.
  // Cuando el usuario tiene prefers-reduced-motion activo: se desactiva el
  // drift continuo del fondo y las transiciones de pop/fade pasan a ser
  // estados instantáneos (gsap.set) en vez de tweens.
  function crearContextoMovimiento() {
    const contexto = { reducido: false };
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      contexto.reducido = true;
      return () => {
        contexto.reducido = false;
      };
    });
    return contexto;
  }

  // ---------- Fondo de círculos entrelazados ----------
  // Mismo patrón tiled (SVG <pattern> con círculos + diagonales) usado como
  // fondo fijo en el resto del sitio (ver index.html raíz del proyecto),
  // pero ya no completamente estático: animarGridFondo() más abajo anima
  // patternTransform del propio <pattern> (drift + respiración de escala
  // muy sutiles) en vez de animar círculos individuales — la textura es un
  // único tile repetido, así que animar el tile completo mueve "todos los
  // círculos" a la vez sin necesidad de miles de nodos SVG independientes.
  function montarGridFondo(selector) {
    const contenedor = document.querySelector(selector);
    if (!contenedor) return null;
    const TILE = 426.5;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    const defs = document.createElementNS(svgNS, "defs");
    const pattern = document.createElementNS(svgNS, "pattern");
    pattern.setAttribute("id", "grid-fondo-pattern");
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", TILE);
    pattern.setAttribute("height", TILE);
    function trazo(tag, attrs) {
      const el = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      // Propiedades custom sobre SVG: siempre vía .style, nunca setAttribute
      // (no resuelve correctamente en este proyecto).
      el.style.stroke = "var(--color-decorative-grid)";
      el.style.strokeOpacity = "0.1";
      el.style.strokeWidth = "1";
      return el;
    }
    pattern.appendChild(trazo("rect", { width: TILE, height: TILE, fill: "none" }));
    pattern.appendChild(
      trazo("circle", { cx: TILE / 2, cy: TILE / 2, r: TILE / 2, fill: "none" }),
    );
    pattern.appendChild(trazo("line", { x1: 0, y1: 0, x2: TILE, y2: TILE }));
    pattern.appendChild(trazo("line", { x1: TILE, y1: 0, x2: 0, y2: TILE }));
    defs.appendChild(pattern);
    svg.appendChild(defs);
    const fondo = document.createElementNS(svgNS, "rect");
    fondo.setAttribute("width", "100%");
    fondo.setAttribute("height", "100%");
    fondo.setAttribute("fill", "url(#grid-fondo-pattern)");
    svg.appendChild(fondo);
    contenedor.appendChild(svg);
    return pattern;
  }

  // Drift + respiración de escala continuos, muy sutiles (16s de ida y
  // vuelta, ease sine.inOut) — desde el primer frame la pieza se siente
  // viva sin llamar la atención sobre sí misma. patternTransform no es una
  // propiedad que GSAP sepa tweenear directamente (no es CSS), así que se
  // anima un objeto plano {x,y,escala} y se aplica a mano en onUpdate.
  function animarGridFondo(pattern, contexto) {
    if (!pattern || contexto.reducido) return;
    const estado = { x: 0, y: 0, escala: 1 };
    gsap.to(estado, {
      x: 26,
      y: 18,
      escala: 1.035,
      duration: 16,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      onUpdate: () => {
        pattern.setAttribute(
          "patternTransform",
          `translate(${estado.x} ${estado.y}) scale(${estado.escala})`,
        );
      },
    });
  }

  // ---------- Brandmarks decorativos (js/stats-donuts.js) ----------
  // Monocromáticos (uno por dimensión, ver renderStatMark en
  // js/stats-donuts.js: 3 semicírculos del mismo color), regados por todo
  // el largo del documento — no del viewport — para que vayan apareciendo
  // a lo largo de todo el scroll, no solo en la portada.
  //
  // En la versión anterior (rAF) cada semicírculo se registraba en un
  // "rotador" compartido que un único listener de scroll actualizaba a
  // mano en cada frame — funcionaba, pero las marcas solo se movían
  // mientras el usuario estaba activamente haciendo scroll. Acá cada
  // semicírculo es un tween GSAP infinito e independiente (velocidad y
  // dirección propias, sorteadas una sola vez al montar), así que la
  // pieza respira incluso quieta. La profundidad (que unas marcas se
  // sientan "más cerca" que otras) viene de una segunda animación, atada
  // esta sí al scroll real vía ScrollTrigger(scrub): cada marca se
  // desplaza verticalmente a su propia fracción de la velocidad de
  // scroll, así no todas se mueven pegadas al resto del contenido.
  const ANGULO_BASE = [0, 120, 240];
  const DIMENSIONES_MARCA = ["salud", "justicia", "determinantes"];

  function animarMarcaDecorativa(markEl) {
    // Rotación ambiente: cada uno de los 3 semicírculos gira sobre su
    // propio eje (rotate() sin cx/cy, que en SVG pivotea sobre el origen
    // local — el mismo truco que ya traía svgBrandMark) a su propio
    // ritmo. Se anima un objeto plano {angulo} en vez de dejar que GSAP
    // gestione el atributo transform de la ruta directamente: así se
    // preserva el pivote original en (0,0) sin pelear con el sistema de
    // transform-origin de GSAP (pensado para bounding boxes, no para el
    // origen local de un <path> dentro de un <g> ya trasladado).
    const rutas = markEl.querySelectorAll(".half-circle");
    rutas.forEach((ruta, i) => {
      const base = ANGULO_BASE[i] || 0;
      const direccion = Math.random() < 0.5 ? -1 : 1;
      const duracion = 30 + Math.random() * 40;
      const estado = { angulo: 0 };
      gsap.to(estado, {
        angulo: 360 * direccion,
        duration: duracion,
        repeat: -1,
        ease: "none",
        onUpdate: () => ruta.setAttribute("transform", `rotate(${base + estado.angulo})`),
      });
    });

    // Profundidad: factor entre 0.5 y 1.5 — algunas marcas se desplazan
    // más lento que el scroll real, otras más rápido, dentro de un rango
    // acotado (±220px) mientras la marca atraviesa el viewport. scrub con
    // un poco de suavizado (no scrub:true a secas) para que seencuentre
    // fluido, no pegado en seco a la posición del scroll.
    const factor = 0.5 + Math.random();
    const desfase = (factor - 1) * 220;
    gsap.fromTo(
      markEl,
      { y: -desfase },
      {
        y: desfase,
        ease: "none",
        scrollTrigger: {
          trigger: markEl,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      },
    );
  }

  function montarDotsFondo(contexto) {
    if (!window.IDESStatsDonuts) return;
    const CANTIDAD = 12;
    const alturaTotal = document.documentElement.scrollHeight;

    for (let i = 0; i < CANTIDAD; i++) {
      const dimKey = DIMENSIONES_MARCA[i % DIMENSIONES_MARCA.length];
      const colorVar = DIMENSION_COLOR_VAR[dimKey];
      const color = `var(${colorVar})`;
      const fraccion = (i + 0.5) / CANTIDAD;
      const jitter = (Math.random() - 0.5) * 0.6 * (alturaTotal / CANTIDAD);
      const top = Math.round(fraccion * alturaTotal + jitter);
      const lado = i % 2 === 0 ? "left" : "right";
      const offset = (2 + Math.random() * 7).toFixed(1);
      const tamaño = Math.round(110 + Math.random() * 120);

      const mark = document.createElement("div");
      mark.className = "dot-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.style.top = `${top}px`;
      mark.style[lado] = `${offset}%`;
      mark.style.width = `${tamaño}px`;
      mark.innerHTML = window.IDESStatsDonuts.svgBrandMark([color, color, color], ANGULO_BASE);
      document.body.appendChild(mark);

      if (!contexto.reducido) animarMarcaDecorativa(mark);
    }
  }

  // ---------- Acto 0: entrada del titular + CTA ----------
  function animarActo0(titularEl, ctaEl, contexto) {
    if (!titularEl || !ctaEl) return;
    if (contexto.reducido) {
      gsap.set([titularEl, ctaEl], { opacity: 1, y: 0 });
      return;
    }
    gsap.killTweensOf([titularEl, ctaEl]);
    gsap
      .timeline({ defaults: { ease: "power2.out" } })
      .from(titularEl, { opacity: 0, y: 28, duration: 0.8 })
      .from(ctaEl, { opacity: 0, y: 16, duration: 0.6 }, "-=0.35");
  }

  // ---------- Acto 1: tarjeta de cifra (GSAP, pop + fade) ----------
  // Ya no es un crossfade de 2 capas superpuestas (técnica rAF de la
  // versión anterior) — un solo elemento cuyo contenido cambia a mitad de
  // una secuencia GSAP: la cifra saliente se encoge/desvanece rápido, se
  // reemplaza el contenido, y la entrante aparece con un pequeño "pop"
  // (leve sobre-escala vía back.out, sin llegar a un rebote elástico
  // llamativo). gsap.killTweensOf() al inicio de cada ir() evita que un
  // scroll rápido acumule tweens en cola — la transición en curso se
  // interrumpe limpia y arranca la nueva de inmediato.
  function crearCardController(cardEl, contexto) {
    const cifraEl = cardEl.querySelector(".acto1-card__cifra");
    const fuenteEl = cardEl.querySelector(".acto1-card__fuente");

    function pintar(paso, dimension) {
      cardEl.style.setProperty("--acento", `var(${DIMENSION_COLOR_VAR[dimension]})`);
      cifraEl.textContent = paso.cifra;
      fuenteEl.textContent = `Fuente: ${paso.fuente}`;
    }

    function ir(paso, dimension) {
      gsap.killTweensOf(cardEl);
      if (contexto.reducido) {
        pintar(paso, dimension);
        gsap.set(cardEl, { opacity: 1, scale: 1, y: 0 });
        return;
      }
      gsap
        .timeline()
        .to(cardEl, { opacity: 0, scale: 0.95, y: -6, duration: 0.22, ease: "power1.in" })
        .call(() => pintar(paso, dimension))
        .fromTo(
          cardEl,
          { opacity: 0, scale: 0.92, y: 10 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" },
        );
    }

    function pintarPrimero(paso, dimension) {
      pintar(paso, dimension);
      gsap.set(cardEl, { opacity: 1, scale: 1, y: 0 });
    }

    return { ir, pintarPrimero };
  }

  // ---------- Acto 1: texto de acompañamiento (GSAP, fade + slide) ----------
  // Capa de información independiente de la tarjeta de cifra: su propio
  // fade+slide, con un pequeño delay respecto al pop de la cifra, para que
  // ambas piezas se lean como dos capas con ritmo propio en vez de un solo
  // bloque que se mueve al unísono. El paso que deja de estar activo se
  // atenúa de vuelta (mismo mecanismo, sin depender de la transición CSS de
  // reserva) para que no quede un opacity inline desincronizado de la
  // clase .is-active. Reutilizada tal cual por Acto 2+3+4 (ver más abajo),
  // que opera sobre .scrolly-step__contenido en vez de .scrolly-step__texto
  // — animarTexto no le importa el tag, solo anima el elemento que recibe.
  function animarTexto(el, activo, contexto) {
    if (!el) return;
    gsap.killTweensOf(el);
    if (contexto.reducido) {
      gsap.set(el, { opacity: activo ? 1 : 0.45, y: 0 });
      return;
    }
    if (activo) {
      gsap.fromTo(
        el,
        { opacity: 0.45, y: 14 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.08 },
      );
    } else {
      gsap.to(el, { opacity: 0.45, y: 0, duration: 0.4, ease: "power1.out" });
    }
  }

  // Entrada única del panel sticky de una sección (solo fade — nunca
  // scale/transform) al llegar por primera vez a la sección — separada de
  // las transiciones de paso, así ambas no se pisan. El trigger es la
  // sección completa (bloque normal, no sticky): ScrollTrigger calcula mal
  // las posiciones de un trigger con position:sticky, así que el panel
  // sticky solo se anima, nunca se usa como referencia de disparo.
  //
  // A propósito SIN scale: este panel es ancestro de .scrolly-backdrop
  // (backdrop-filter, ver css) y Chrome deja de renderizar el
  // backdrop-filter de un descendiente apenas su ancestro tiene CUALQUIER
  // transform puesto — incluso uno transitorio a mitad de animación, o
  // incluso el valor final "sin efecto" (scale:1) que GSAP deja como
  // matrix(1,0,0,1,0,0) en vez de quitarlo (bug reportado: el blur no se
  // veía en Chrome, solo en Firefox/Safari, y volvió a fallar incluso con
  // clearProps porque el transform existe DURANTE toda la animación, no
  // solo al final). La única forma robusta de evitarlo es no ponerle
  // transform a este panel nunca, ni transitoriamente.
  function animarEntradaPanel(seccionSelector, panelEl, contexto) {
    if (!panelEl) return;
    if (contexto.reducido) {
      gsap.set(panelEl, { opacity: 1 });
      return;
    }
    gsap.set(panelEl, { opacity: 0 });
    ScrollTrigger.create({
      trigger: seccionSelector,
      start: "top 75%",
      once: true,
      onEnter: () => gsap.to(panelEl, { opacity: 1, duration: 0.7, ease: "power2.out" }),
    });
  }

  // Frase puente hacia la Explicación — fade+slide sutil de una sola vez al
  // entrar en viewport, consistente con el resto pero sin competir con la
  // coreografía de la tarjeta/texto (que es la protagonista de este acto).
  function animarCierre(el, contexto) {
    if (!el) return;
    if (contexto.reducido) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }
    gsap.set(el, { y: 16 });
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }),
    });
  }

  // Interpola placeholders {{clave}} en un texto contra un objeto de
  // valores — usado para inyectar los puntajes reales de localidades.json
  // en el texto de la pieza sin hardcodearlos en scrollytelling-steps.json.
  function interpolar(texto, valores) {
    if (!valores) return texto;
    return texto.replace(/\{\{(\w+)\}\}/g, (coincide, clave) =>
      clave in valores ? String(valores[clave]) : coincide,
    );
  }

  // Interpolación numérica lineal — distinta de interpolar() (esa es de
  // texto/placeholders). Usada por el zoom de filas y el scrubbing de años.
  function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  // ===========================================================================
  // Acto 2+3+4 — "Explicación": qué es el IDES, sus 3 dimensiones, sus 23
  // indicadores reales. Todo vive en la sección #explicacion, con un solo
  // panel de beeswarm (renderBeeswarmPanel) que nunca se reconstruye entre
  // pasos — solo cambia qué datos muestra y cómo está posicionado.
  // ===========================================================================

  const ORDEN_DIMENSIONES = ["salud", "justicia", "determinantes"];
  const NOMBRE_DIMENSION = { salud: "Salud", justicia: "Justicia", determinantes: "Determinantes Sociales" };

  // Colores por fila: base = tono translúcido para las 20 localidades,
  // oscuro = tono sólido reservado para Bogotá. Primitivos de tokens.css,
  // no los semánticos --color-text-decoration-* (ver
  // [[project-scrollytelling-acto2-continuidad]]: azul-300/naranja-300/
  // verde-400 confirmados contra fichas-tecnicas.json `color_dimension`).
  const COLOR_FILA = {
    ides: { base: "--color-text-decoration-generico", oscuro: "--verde-fuerte" },
    salud: { base: "--azul-300", oscuro: "--azul-400" },
    justicia: { base: "--naranja-300", oscuro: "--naranja-400" },
    determinantes: { base: "--verde-400", oscuro: "--verde-300" },
  };

  // Los 6 indicadores "bandera" (scrubbing de años vía onStepProgress) —
  // por id real de data/fichas-tecnicas.json, verificados contra el
  // dataset real (ver plan). El resto (14 de 23) entra directo asentado en
  // 2024, sin secuencia de años.
  const INDICADORES_BANDERA = new Set([
    "salud-tasa-de-mortalidad-por-cada-10-000-menores-de-20-anos",
    "salud-cobertura-agregada-de-vacunacion-para-pentavalente-y-triple-viral",
    "justicia-veedores-ciudadanos-en-salud-por-cada-100-000-habitantes",
    "justicia-tiempo-estimado-de-resolucion-de-tutelas-en-salud-en-bogota",
    "determinantes-sociales-porcentaje-de-la-poblacion-en-condiciones-de-pobreza-monetaria-y-pobreza-monetaria-extrema",
    "determinantes-sociales-casos-de-violencia-contra-ninos-ninas-y-adolescentes-por-cada-1-000-menores-de-18-anos",
  ]);

  // Único alias manual de cruce de nombres: fichas-tecnicas.json dice
  // "...registradas en el Registro especial de prestadores - REPS..." y
  // localidades.json dice "...registradas en REPS..." — el resto de
  // indicadores cruza por nombre normalizado (ver construirIndicadores).
  const ALIAS_INDICADOR_ID = {
    "salud-camas-pediatricas-habilitadas-registradas-en-el-registro-especial-de-prestadores-reps-por-cada-1-000-menores-de-18-anos":
      "camas",
  };

  // Mismo caso (y mismo indicador) que ALIAS_INDICADOR_ID, pero para cruzar
  // contra data/interpretaciones-indicadores.json en vez de localidades.json:
  // ese archivo también usa la forma corta "...registradas en REPS...". El
  // resto de indicadores cruza por nombre normalizado (ver
  // construirIndiceInterpretaciones) — las 5 fichas de Justicia, por
  // ejemplo, solo difieren en mayúsculas ("en Salud" vs "en salud").
  const ALIAS_INTERPRETACION_NOMBRE = {
    "salud-camas-pediatricas-habilitadas-registradas-en-el-registro-especial-de-prestadores-reps-por-cada-1-000-menores-de-18-anos":
      "Camas pediátricas habilitadas registradas en REPS por cada 1.000 menores de 18 años",
  };

  function normalizarNombre(s) {
    return String(s).trim().toLowerCase();
  }

  // ---------- Capa de datos ----------

  // Bogotá, año 2024 — usado solo para interpolar {{ides}}/{{salud}}/... en
  // los 4 textos de intro (interpolar()) y {{puntaje}} de "3.a entrada".
  function obtenerDatosBogota(localidades) {
    const bogota = Array.isArray(localidades) ? localidades.find((l) => l.id === "bogota") : null;
    const registro = bogota ? bogota.anos.find((a) => a.ano === 2024) : null;
    if (!registro) return null;
    return {
      ides: registro.ides,
      salud: registro.indices.salud.puntaje,
      justicia: registro.indices.justicia.puntaje,
      determinantes: registro.indices.determinantes.puntaje,
    };
  }

  // Mapa "nombre de variable normalizado" -> clave real (ej. "tasa_mortalidad")
  // construido una sola vez desde el registro 2024 de Bogotá — las claves
  // son las mismas en todas las localidades/años (verificado contra el
  // dataset real).
  function construirIndiceVariables(localidades) {
    const bogota = localidades.find((l) => l.id === "bogota");
    const registro = bogota.anos.find((a) => a.ano === 2024);
    const indice = new Map();
    Object.values(registro.indices).forEach((dv) => {
      Object.entries(dv.variables).forEach(([clave, vv]) => {
        indice.set(normalizarNombre(vv.nombre), clave);
      });
    });
    return indice;
  }

  // Mapa "nombre de indicador normalizado" -> nombre real (tal cual aparece
  // en data/interpretaciones-indicadores.json) — mismo mecanismo que
  // construirIndiceVariables, para no depender de que ambos archivos usen
  // exactamente las mismas mayúsculas.
  function construirIndiceInterpretaciones(interpretaciones) {
    const indice = new Map();
    Object.keys(interpretaciones).forEach((nombre) => indice.set(normalizarNombre(nombre), nombre));
    return indice;
  }

  // Cruza fichas-tecnicas.json (definición/relevancia/fórmula) con las
  // claves reales de localidades.json — cada indicador queda con su
  // `clave` (para leer valores), `nombreInterpretacion` (para leer su
  // frase en data/interpretaciones-indicadores.json — ver
  // fraseInterpretacion) y `bandera` (para saber si hace scrubbing de
  // años). Orden preservado (el mismo de fichas-tecnicas.json).
  function construirIndicadores(fichas, localidades, interpretaciones) {
    const indiceVar = construirIndiceVariables(localidades);
    const indiceInterp = construirIndiceInterpretaciones(interpretaciones);
    const porDimension = {};
    ORDEN_DIMENSIONES.forEach((dimKey) => {
      const nombreDim = NOMBRE_DIMENSION[dimKey];
      porDimension[dimKey] = fichas.dimensiones[nombreDim].map((ficha) => {
        const clave = ALIAS_INDICADOR_ID[ficha.id] || indiceVar.get(normalizarNombre(ficha.nombre_indicador));
        const nombreInterpretacion =
          ALIAS_INTERPRETACION_NOMBRE[ficha.id] ||
          indiceInterp.get(normalizarNombre(ficha.nombre_indicador)) ||
          ficha.nombre_indicador;
        return { ...ficha, dimKey, clave, nombreInterpretacion, bandera: INDICADORES_BANDERA.has(ficha.id) };
      });
    });
    return porDimension;
  }

  // Extrae, para las 21 localidades, el valor 2022/2023/2024 de un
  // selector dado — la función central de acceso a datos de todo el Acto
  // 2+3+4 (nunca se lee localidades.json ad-hoc en otro lado).
  // selector: {tipo:'ides'} | {tipo:'dimension', dim} | {tipo:'indicador', dim, clave}
  function filaValores(localidades, selector) {
    return localidades.map((loc) => {
      const valores = {};
      loc.anos.forEach((a) => {
        let v;
        if (selector.tipo === "ides") v = a.ides;
        else if (selector.tipo === "dimension") v = a.indices[selector.dim].puntaje;
        else v = a.indices[selector.dim].variables[selector.clave].valor;
        valores[a.ano] = v;
      });
      return { id: loc.id, nombre: loc.nombre, esBogota: loc.id === "bogota", valores };
    });
  }

  function mapaValorAno(filaLocalidades, ano) {
    const m = new Map();
    filaLocalidades.forEach((l) => m.set(l.id, l.valores[ano]));
    return m;
  }

  function mapaValorInterpolado(filaLocalidades, progress) {
    const m = new Map();
    filaLocalidades.forEach((l) => {
      const v =
        progress <= 0.5
          ? lerp(l.valores[2022], l.valores[2023], progress * 2)
          : lerp(l.valores[2023], l.valores[2024], (progress - 0.5) * 2);
      m.set(l.id, v);
    });
    return m;
  }

  // Frase en lenguaje llano con el valor real de Bogotá (ver
  // data/interpretaciones-indicadores.json) — solo existe a nivel de
  // indicador, no de dimensión ni del IDES compuesto (ver plan, decisión 1).
  function fraseInterpretacion(interpretaciones, nombreIndicador, nombreLocalidad, ano) {
    const porIndicador = interpretaciones[nombreIndicador];
    const porLocalidad = porIndicador ? porIndicador[nombreLocalidad] : null;
    return porLocalidad ? porLocalidad[String(ano)] || "" : "";
  }

  function añoParaProgreso(progress) {
    return Math.round(2022 + Math.max(0, Math.min(1, progress)) * 2);
  }

  // ---------- KaTeX (mismo patrón que js/ficha-tecnica-template.js) ----------

  function tieneDelimitadoresLatex(latex) {
    return /\\\(|\\\[|\$/.test(latex);
  }

  function renderLatex(el, latex) {
    if (!el || !latex || !window.katex) return;
    if (tieneDelimitadoresLatex(latex)) {
      el.textContent = latex;
      window.renderMathInElement(el, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    } else {
      window.katex.render(latex, el, { displayMode: true, throwOnError: false });
    }
  }

  // ---------- Componente central: renderBeeswarmPanel ----------
  // Recibe el <svg> + el contenedor de overlays HTML del panel y monta,
  // por fila (1 para el IDES compuesto, 3 para las dimensiones), un grupo
  // <g class="beeswarm-fila"> con eje + 21 nodos D3 simulados. Dos
  // mecanismos de movimiento, nunca mezclados: entrarFila() (asentado
  // inicial, temporizado con GSAP) y actualizarValores() (cambio de datos
  // en vivo, corre el timer interno de D3 — usado tanto para cambiar de
  // indicador como para el scrubbing de años). El zoom entre filas
  // (aplicarLayout) es pura geometría de transform, independiente de la
  // simulación.
  const ANCHO_VIEWBOX = 640;
  const ALTO_VIEWBOX = 460;
  const MARGEN_IZQ = 28;
  const MARGEN_DER = 28;
  const ANCHO_UTIL = ANCHO_VIEWBOX - MARGEN_IZQ - MARGEN_DER;
  const MEDIO_ANCHO_UTIL = ANCHO_UTIL / 2;
  const EJE_Y_LOCAL = 42;
  const LABEL_Y_LOCAL = -56;
  const RADIO_NODO = 7;
  const RADIO_NODO_BOGOTA = 12;
  const ESCALA_ZOOM_ACTIVA = 1.12;
  const ESCALA_ZOOM_INACTIVA = 0.82;

  function crearEscalaX() {
    return d3.scaleLinear().domain([0, 100]).range([0, ANCHO_UTIL]);
  }

  // Valor legible en el tooltip de cada nodo — sin decimales falsos para
  // los indicadores que ya vienen enteros, un solo decimal para el resto.
  function formatoValorNodo(v) {
    if (v == null || Number.isNaN(v)) return "";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  function centroDefecto(key) {
    const i = ORDEN_DIMENSIONES.indexOf(key);
    const banda = ALTO_VIEWBOX / 3;
    return banda * (i + 0.5);
  }

  // Estado totalmente resuelto (sin progreso) de una fila para un
  // "objetivo" de zoom dado: null = las 3 filas iguales, key = esa fila
  // ocupa el panel y las otras 2 se comprimen y se deslizan fuera de vista.
  function estadoResueltoFila(key, objetivo) {
    if (!objetivo) return { y: centroDefecto(key), scale: 1, opacity: 1 };
    if (key === objetivo) return { y: ALTO_VIEWBOX / 2, scale: ESCALA_ZOOM_ACTIVA, opacity: 1 };
    const i = ORDEN_DIMENSIONES.indexOf(key);
    const iObjetivo = ORDEN_DIMENSIONES.indexOf(objetivo);
    const y = i < iObjetivo ? -ALTO_VIEWBOX * 0.25 : ALTO_VIEWBOX * 1.25;
    return { y, scale: ESCALA_ZOOM_INACTIVA, opacity: 0 };
  }

  function layoutFila(key, progress, desde, hacia) {
    const a = estadoResueltoFila(key, desde);
    const b = estadoResueltoFila(key, hacia);
    return {
      y: lerp(a.y, b.y, progress),
      scale: lerp(a.scale, b.scale, progress),
      opacity: lerp(a.opacity, b.opacity, progress),
    };
  }

  function posicionarOverlay(el, xPix, yPix, opacidad) {
    if (!el) return;
    el.style.left = `${(xPix / ANCHO_VIEWBOX) * 100}%`;
    el.style.top = `${(yPix / ALTO_VIEWBOX) * 100}%`;
    el.style.opacity = String(opacidad);
  }

  function renderBeeswarmPanel(svgEl, overlaysEl, contexto) {
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    overlaysEl.innerHTML = "";
    const escalaX = crearEscalaX();
    const filas = new Map();

    // Tooltip único, reutilizado por los nodos de todas las filas — "pon
    // hover en todas las elipses para saber qué representan": cada nodo es
    // una localidad, el tooltip muestra su nombre y su valor. Con mouse
    // sigue el cursor (más natural); con teclado (focus) se ancla sobre el
    // propio nodo, ya que un FocusEvent no trae clientX/clientY.
    const tooltipEl = document.createElement("div");
    tooltipEl.className = "beeswarm-tooltip";
    tooltipEl.setAttribute("aria-hidden", "true");
    overlaysEl.appendChild(tooltipEl);

    function textoTooltip(d) {
      return `<strong>${d.nombre}</strong><span>${formatoValorNodo(d.value)}</span>`;
    }

    function mostrarTooltipMouse(d, event) {
      tooltipEl.innerHTML = textoTooltip(d);
      moverTooltipMouse(event);
      tooltipEl.classList.add("is-visible");
    }

    function moverTooltipMouse(event) {
      const rect = overlaysEl.getBoundingClientRect();
      tooltipEl.style.left = `${event.clientX - rect.left}px`;
      tooltipEl.style.top = `${event.clientY - rect.top}px`;
    }

    function mostrarTooltipNodo(fe, d) {
      if (!fe) return;
      tooltipEl.innerHTML = textoTooltip(d);
      const rect = overlaysEl.getBoundingClientRect();
      const p = filaLocalAPixel(fe, d.x, d.y);
      tooltipEl.style.left = `${(p.x / ANCHO_VIEWBOX) * rect.width}px`;
      tooltipEl.style.top = `${(p.y / ALTO_VIEWBOX) * rect.height}px`;
      tooltipEl.classList.add("is-visible");
    }

    function ocultarTooltip() {
      tooltipEl.classList.remove("is-visible");
    }

    function trasladoOrigenX(scale) {
      return MARGEN_IZQ + MEDIO_ANCHO_UTIL - MEDIO_ANCHO_UTIL * scale;
    }

    function filaLocalAPixel(fe, xLocal, yLocal) {
      const scale = fe.layout ? fe.layout.scale : 1;
      const y = fe.layout ? fe.layout.y : centroDefecto(fe.key);
      return {
        x: trasladoOrigenX(scale) + xLocal * scale,
        y: y + yLocal * scale,
      };
    }

    function pintar(fe) {
      fe.sel.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      const bog = fe.nodos.find((d) => d.esBogota);
      if (bog) {
        const p = filaLocalAPixel(fe, bog.x, bog.y + 20);
        posicionarOverlay(fe.anotacionEl, p.x, p.y, fe.layout ? fe.layout.opacity : 1);
      }
    }

    function crearEje(g) {
      g.append("line")
        .attr("class", "beeswarm-eje-linea")
        .attr("x1", 0)
        .attr("x2", ANCHO_UTIL)
        .attr("y1", EJE_Y_LOCAL)
        .attr("y2", EJE_Y_LOCAL);
      [0, 25, 50, 75, 100].forEach((v) => {
        g.append("line")
          .attr("class", "beeswarm-eje-marca")
          .attr("x1", escalaX(v))
          .attr("x2", escalaX(v))
          .attr("y1", EJE_Y_LOCAL - 4)
          .attr("y2", EJE_Y_LOCAL + 4);
      });
      g.append("text")
        .attr("class", "beeswarm-eje-texto")
        .attr("x", 0)
        .attr("y", EJE_Y_LOCAL + 18)
        .attr("text-anchor", "start")
        .text("Peor desempeño");
      g.append("text")
        .attr("class", "beeswarm-eje-texto")
        .attr("x", ANCHO_UTIL)
        .attr("y", EJE_Y_LOCAL + 18)
        .attr("text-anchor", "end")
        .text("Mejor desempeño");
    }

    function montarFila(key, spec) {
      const g = svg.append("g").attr("class", "beeswarm-fila").attr("data-fila", key);
      crearEje(g);

      const nodos = spec.localidades.map((loc) => ({
        id: loc.id,
        nombre: loc.nombre,
        esBogota: loc.esBogota,
        value: loc.valor,
        r: loc.esBogota ? RADIO_NODO_BOGOTA : RADIO_NODO,
        x: Math.random() * ANCHO_UTIL,
        y: (Math.random() - 0.5) * 260,
      }));

      const sel = g
        .append("g")
        .attr("class", "beeswarm-nodos")
        .selectAll("circle")
        .data(nodos)
        .join("circle")
        .attr("class", (d) => `beeswarm-nodo${d.esBogota ? " beeswarm-nodo--bogota" : ""}`)
        .attr("r", (d) => d.r)
        .style("fill", (d) => `var(${d.esBogota ? spec.colorOscuro : spec.colorBase})`)
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", (d) => `${d.nombre}: ${formatoValorNodo(d.value)}`)
        .on("mouseenter", function (event, d) {
          mostrarTooltipMouse(d, event);
        })
        .on("mousemove", function (event) {
          moverTooltipMouse(event);
        })
        .on("mouseleave", ocultarTooltip)
        .on("focus", function (event, d) {
          mostrarTooltipNodo(filas.get(key), d);
        })
        .on("blur", ocultarTooltip);

      const simulation = d3
        .forceSimulation(nodos)
        .velocityDecay(0.55)
        .alphaDecay(0.02)
        .force("x", d3.forceX((d) => escalaX(d.value)).strength(0.13))
        .force("y", d3.forceY(0).strength(0.13))
        .force("collide", d3.forceCollide((d) => d.r + 1.5).strength(0.7))
        .stop();

      const labelEl = document.createElement("p");
      labelEl.className = "beeswarm-fila__label";
      labelEl.style.textDecorationColor = `var(${spec.colorBase})`;
      labelEl.textContent = spec.nombre;
      overlaysEl.appendChild(labelEl);

      const anotacionEl = document.createElement("p");
      anotacionEl.className = "beeswarm-anotacion";
      overlaysEl.appendChild(anotacionEl);

      const fe = {
        key,
        spec,
        g,
        sel,
        nodos,
        simulation,
        labelEl,
        anotacionEl,
        layout: { y: centroDefecto(key), scale: 1, opacity: 1 },
      };
      simulation.on("tick", () => pintar(fe));
      filas.set(key, fe);
      pintar(fe);
      return fe;
    }

    function entrarFila(fe, duracionMs) {
      if (contexto.reducido || !duracionMs) {
        fe.simulation.alphaDecay(0.05).alpha(1);
        while (fe.simulation.alpha() > fe.simulation.alphaMin()) fe.simulation.tick();
        pintar(fe);
        return;
      }
      const estado = { t: 0 };
      gsap.to(estado, {
        t: 1,
        duration: duracionMs / 1000,
        ease: "power2.out",
        onUpdate: () => {
          fe.simulation.alpha(1 - estado.t);
          fe.simulation.tick();
          pintar(fe);
        },
      });
    }

    function actualizarValores(key, mapaValores) {
      const fe = filas.get(key);
      if (!fe) return;
      fe.nodos.forEach((d) => {
        if (mapaValores.has(d.id)) d.value = mapaValores.get(d.id);
      });
      fe.simulation.force("x", d3.forceX((d) => escalaX(d.value)).strength(0.13));
      if (contexto.reducido) {
        fe.simulation.alphaDecay(0.08).alpha(1);
        while (fe.simulation.alpha() > fe.simulation.alphaMin()) fe.simulation.tick();
        pintar(fe);
        return;
      }
      fe.simulation.alpha(Math.max(fe.simulation.alpha(), 0.35)).restart();
    }

    function actualizarAnotacion(key, html) {
      const fe = filas.get(key);
      if (fe) fe.anotacionEl.innerHTML = html;
    }

    function actualizarNombreFila(key, nombre) {
      const fe = filas.get(key);
      if (fe) fe.labelEl.textContent = nombre;
    }

    // Aplica un layout ya resuelto (y/scale/opacity) al grupo <g> de la
    // fila y a sus overlays HTML — geometría pura, nunca toca la
    // simulación (ver bug conocido: solo forceX/valores necesitan
    // re-registrarse, nunca la posición de la fila).
    function aplicarLayout(fe, layout) {
      fe.layout = layout;
      const originX = trasladoOrigenX(layout.scale);
      fe.g.attr("transform", `translate(${originX}, ${layout.y}) scale(${layout.scale})`);
      fe.g.style("opacity", layout.opacity);
      const pLabel = filaLocalAPixel(fe, MEDIO_ANCHO_UTIL, LABEL_Y_LOCAL);
      posicionarOverlay(fe.labelEl, pLabel.x, pLabel.y, layout.opacity);
      pintar(fe);
    }

    function zoom(progress, desde, hacia) {
      filas.forEach((fe, key) => aplicarLayout(fe, layoutFila(key, progress, desde, hacia)));
    }

    function salirFila(key, duracionMs) {
      const fe = filas.get(key);
      if (!fe) return;
      filas.delete(key);
      if (contexto.reducido) {
        fe.g.remove();
        fe.labelEl.remove();
        fe.anotacionEl.remove();
        return;
      }
      gsap.to([fe.g.node(), fe.labelEl, fe.anotacionEl], {
        opacity: 0,
        duration: (duracionMs || 400) / 1000,
        ease: "power1.out",
        onComplete: () => {
          fe.g.remove();
          fe.labelEl.remove();
          fe.anotacionEl.remove();
        },
      });
    }

    return { montarFila, entrarFila, actualizarValores, actualizarAnotacion, actualizarNombreFila, zoom, salirFila, filas };
  }

  // ---------- Construcción de los ~34 pasos narrativos ----------
  // Fases: intro (4, ya existentes) -> por dimensión: entrada, conteo,
  // indicador×N -> cierre (1). Todo lo que puede derivarse de los datos
  // (nombre/interpretación/relevancia/fórmula de cada indicador) se genera
  // en runtime, nunca se escribe a mano en scrollytelling-steps.json.
  function construirPasos(indicadoresPorDim) {
    const pasos = [];
    let step = 0;
    for (let i = 0; i < 4; i++) pasos.push({ fase: "intro", introIdx: i, step: step++ });
    ORDEN_DIMENSIONES.forEach((dim) => {
      pasos.push({ fase: "entrada", dim, step: step++ });
      pasos.push({ fase: "conteo", dim, step: step++ });
      const lista = indicadoresPorDim[dim];
      lista.forEach((indicador, idx) => {
        pasos.push({ fase: "indicador", dim, indicador, idx, n: lista.length, step: step++ });
      });
    });
    pasos.push({ fase: "cierre", step: step++ });
    return pasos;
  }

  function crearPasoEl(paso) {
    const el = document.createElement("div");
    el.className = "scrolly-step";
    el.dataset.fase = paso.fase;
    el.dataset.step = String(paso.step);
    if (paso.dim) el.dataset.dim = paso.dim;

    if (paso.fase === "indicador") {
      el.innerHTML = `
        <div class="indicador-step scrolly-step__contenido">
          <p class="indicador-step__nombre"></p>
          <p class="indicador-step__interpretacion"></p>
          <p class="indicador-step__relevancia"></p>
          <div class="indicador-step__formula"></div>
        </div>`;
    } else {
      el.innerHTML = `<p class="scrolly-step__texto scrolly-step__contenido"></p>`;
    }
    return el;
  }

  // Rellena el contenido ESTÁTICO de cada paso (lo que no cambia con el
  // scroll dentro del propio paso) — la interpretación de los indicadores
  // bandera se reescribe en vivo en onStepProgress (ver init()).
  function poblarPasoEstatico(paso, datos, datosBogota, interpretaciones) {
    if (paso.fase === "intro") {
      const texto = datos.explicacion.intro[paso.introIdx].texto;
      paso.el.querySelector(".scrolly-step__texto").textContent = interpolar(texto, datosBogota);
    } else if (paso.fase === "entrada" || paso.fase === "conteo") {
      const cfg = datos.explicacion.dimensiones[paso.dim];
      const valores = {
        dimension: cfg.nombre,
        definicion: cfg.definicion_corta,
        puntaje: datosBogota[paso.dim],
        n: paso.n_indicadores,
      };
      const plantilla = paso.fase === "entrada" ? cfg.entrada : cfg.conteo;
      paso.el.querySelector(".scrolly-step__texto").textContent = interpolar(plantilla, valores);
    } else if (paso.fase === "indicador") {
      const ind = paso.indicador;
      paso.nombreEl.textContent = ind.nombre_indicador;
      paso.relevanciaEl.textContent = ind.por_que_es_relevante;
      renderLatex(paso.formulaEl, ind.formula_calculo_latex);
      if (!ind.bandera) {
        paso.interpretacionEl.textContent = fraseInterpretacion(
          interpretaciones,
          ind.nombreInterpretacion,
          "Bogotá",
          2024,
        );
      }
    } else if (paso.fase === "cierre") {
      paso.el.querySelector(".scrolly-step__texto").textContent = datos.explicacion.cierre;
    }
  }

  function setProgreso(el, texto, activo, contexto) {
    if (!el) return;
    el.textContent = texto || "";
    gsap.killTweensOf(el);
    if (contexto.reducido) {
      gsap.set(el, { opacity: activo ? 1 : 0 });
      return;
    }
    gsap.to(el, { opacity: activo ? 1 : 0, duration: 0.35, ease: "power1.out" });
  }

  function init() {
    const contexto = crearContextoMovimiento();

    const patternFondo = document.getElementById("grid-fondo") ? montarGridFondo("#grid-fondo") : null;
    animarGridFondo(patternFondo, contexto);

    const titular = document.getElementById("acto0-titular");
    const cta = document.getElementById("acto0-cta");
    const acto1 = document.getElementById("acto1");
    if (cta && acto1) {
      cta.addEventListener("click", (evento) => {
        evento.preventDefault();
        acto1.scrollIntoView({
          behavior: contexto.reducido ? "auto" : "smooth",
          block: "start",
        });
      });
    }

    const card = document.getElementById("acto1-card");
    const controllerActo1 = card ? crearCardController(card, contexto) : null;

    const scrollyVisualActo1 = document.querySelector("#acto1 .scrolly-visual");
    animarEntradaPanel("#acto1", scrollyVisualActo1, contexto);

    const acto1Steps = Array.from(document.querySelectorAll('.scrolly-step[data-act="1"]'));
    const acto1Textos = acto1Steps.map((stepEl) => stepEl.querySelector(".scrolly-step__texto"));

    const scrollyVisualExplicacion = document.querySelector("#explicacion .scrolly-visual");
    animarEntradaPanel("#explicacion", scrollyVisualExplicacion, contexto);

    const svgBeeswarm = document.getElementById("beeswarm-svg");
    const overlaysBeeswarm = document.getElementById("beeswarm-overlays");
    const panelBeeswarm = document.getElementById("beeswarm-panel");
    const grupoPalabras = document.getElementById("acto2-palabras");
    const progresoEl = document.getElementById("explicacion-progreso");
    const narrativaEl = document.getElementById("explicacion-narrativa");
    const ctaEl = document.getElementById("explicacion-cta");
    const ctaTextoEl = document.getElementById("explicacion-cta-texto");

    const beeswarm =
      svgBeeswarm && overlaysBeeswarm ? renderBeeswarmPanel(svgBeeswarm, overlaysBeeswarm, contexto) : null;

    Promise.all([
      fetch("data/scrollytelling-steps.json").then((r) => r.json()),
      fetch("data/localidades.json").then((r) => r.json()),
      fetch("data/fichas-tecnicas.json").then((r) => r.json()),
      fetch("data/interpretaciones-indicadores.json").then((r) => r.json()),
    ]).then(([datos, localidades, fichas, interpretaciones]) => {
      const datosBogota = obtenerDatosBogota(localidades);
      const indicadoresPorDim = construirIndicadores(fichas, localidades, interpretaciones);
      const filasIdes = filaValores(localidades, { tipo: "ides" });
      const filasPorDim = {};
      ORDEN_DIMENSIONES.forEach((dim) => {
        filasPorDim[dim] = filaValores(localidades, { tipo: "dimension", dim });
      });
      ORDEN_DIMENSIONES.forEach((dim) => {
        indicadoresPorDim[dim].forEach((ind) => {
          ind.filaLocalidades = filaValores(localidades, { tipo: "indicador", dim, clave: ind.clave });
        });
      });

      // ---------- Acto 0/1: sin cambios ----------
      const cierre = document.getElementById("acto1-cierre");
      titular.textContent = datos.acto0.titular;
      cta.textContent = datos.acto0.cta;
      acto1Steps.forEach((stepEl, i) => {
        stepEl.querySelector(".scrolly-step__texto").textContent = datos.acto1[i].texto;
      });
      cierre.textContent = datos.transicion_cierre;

      animarActo0(titular, cta, contexto);
      animarCierre(cierre, contexto);

      if (controllerActo1) {
        controllerActo1.pintarPrimero(datos.acto1[0], ACTO1_DIMENSIONES[0]);
      }
      animarTexto(acto1Textos[0], true, contexto);
      acto1Steps[0].classList.add("is-active");

      // ---------- Explicación: construir los ~34 pasos ----------
      const PASOS = construirPasos(indicadoresPorDim);
      PASOS.forEach((paso) => {
        if (paso.fase === "entrada" || paso.fase === "conteo") {
          paso.n_indicadores = indicadoresPorDim[paso.dim].length;
        }
        const el = crearPasoEl(paso);
        narrativaEl.appendChild(el);
        paso.el = el;
        paso.contenidoEl = el.querySelector(".scrolly-step__contenido");
        if (paso.fase === "indicador") {
          paso.nombreEl = el.querySelector(".indicador-step__nombre");
          paso.interpretacionEl = el.querySelector(".indicador-step__interpretacion");
          paso.relevanciaEl = el.querySelector(".indicador-step__relevancia");
          paso.formulaEl = el.querySelector(".indicador-step__formula");
        }
        poblarPasoEstatico(paso, datos, datosBogota, interpretaciones);
      });

      ctaTextoEl.textContent = datos.explicacion.cta;

      // ---------- Estado inicial ----------
      if (beeswarm) {
        beeswarm.montarFila("ides", {
          nombre: "IDES",
          colorBase: COLOR_FILA.ides.base,
          colorOscuro: COLOR_FILA.ides.oscuro,
          localidades: filasIdes.map((l) => ({ id: l.id, nombre: l.nombre, esBogota: l.esBogota, valor: l.valores[2024] })),
        });
        beeswarm.actualizarAnotacion("ides", `<strong>${datosBogota.ides}</strong>/100 — Bogotá`);
      }
      gsap.set(grupoPalabras, { opacity: 1 });
      gsap.set(panelBeeswarm, { opacity: 0 });
      gsap.set(ctaEl, { opacity: 0 });
      setProgreso(progresoEl, "", false, contexto);
      PASOS.forEach((paso, i) => animarTexto(paso.contenidoEl, i === 0, contexto));
      PASOS[0].el.classList.add("is-active");

      // Recién acá el alto real de la página está definido (todos los
      // pasos ya tienen su texto), así las marcas decorativas se
      // reparten sobre el alto final del documento y no sobre un valor
      // a medias.
      montarDotsFondo(contexto);

      // ---------- Estado mutable de la Explicación ----------
      let filasDimMontadas = false;
      let filaActivaGlobal = null; // dimensión ya completamente "zoomeada"
      let cierreTween = null; // ver fase "cierre" en onStepEnter — animación de desenfoque propia, no atada a onStepProgress
      const indicadorActivoPorDim = {}; // dim -> mapa id->valor 2024, para restaurar al salir

      function fundirPanel(destino) {
        gsap.killTweensOf([grupoPalabras, panelBeeswarm]);
        if (contexto.reducido) {
          gsap.set(grupoPalabras, { opacity: destino === "palabras" ? 1 : 0 });
          gsap.set(panelBeeswarm, { opacity: destino === "palabras" ? 0 : 1 });
          return;
        }
        gsap.to(grupoPalabras, { opacity: destino === "palabras" ? 1 : 0, duration: 0.45, ease: "power2.out" });
        gsap.to(panelBeeswarm, { opacity: destino === "palabras" ? 0 : 1, duration: 0.45, ease: "power2.out" });
      }

      function asegurarFilasDimension() {
        if (filasDimMontadas || !beeswarm) return;
        filasDimMontadas = true;
        beeswarm.salirFila("ides", 500);
        ORDEN_DIMENSIONES.forEach((dim) => {
          beeswarm.montarFila(dim, {
            nombre: NOMBRE_DIMENSION[dim],
            colorBase: COLOR_FILA[dim].base,
            colorOscuro: COLOR_FILA[dim].oscuro,
            localidades: filasPorDim[dim].map((l) => ({
              id: l.id,
              nombre: l.nombre,
              esBogota: l.esBogota,
              valor: l.valores[2024],
            })),
          });
          beeswarm.actualizarAnotacion(dim, `<strong>${datosBogota[dim]}</strong>/100 — Bogotá`);
          beeswarm.entrarFila(beeswarm.filas.get(dim), 1000);
        });
      }

      // Restaura la fila de una dimensión a su puntaje agregado (en vez de
      // quedarse mostrando el último indicador visto) al salir de ella.
      function restaurarFilaDimension(dim) {
        if (!beeswarm || !filasDimMontadas) return;
        beeswarm.actualizarValores(dim, mapaValorAno(filasPorDim[dim], 2024));
        beeswarm.actualizarNombreFila(dim, NOMBRE_DIMENSION[dim]);
        beeswarm.actualizarAnotacion(dim, `<strong>${datosBogota[dim]}</strong>/100 — Bogotá`);
      }

      // Los dos únicos momentos en que las 3 filas se ven juntas (paso 3 de
      // intro y el cierre) restauran SIEMPRE las 3 dimensiones a su nombre
      // y puntaje agregado, sin depender de que cada "entrada" intermedia
      // se haya disparado en orden — con scroll rápido (arrastrando la
      // barra, rueda del mouse a alta velocidad) Scrollama puede saltarse
      // el onStepEnter de una dimensión intermedia, y esa fila se quedaba
      // pegada mostrando el nombre/valor de su último indicador visto (ver
      // bug reportado: la fila de Justicia aparecía sin título mientras la
      // de Salud mostraba el nombre de Justicia).
      function restaurarTodasLasFilas() {
        ORDEN_DIMENSIONES.forEach((dim) => restaurarFilaDimension(dim));
      }

      function activarIndicador(paso) {
        if (!beeswarm || !filasDimMontadas) return;
        const ind = paso.indicador;
        beeswarm.actualizarNombreFila(paso.dim, ind.nombre_indicador);
        if (ind.bandera) {
          // El scrubbing real lo hace onStepProgress; acá solo se fija el
          // punto de partida (año 2022) al entrar al paso.
          beeswarm.actualizarValores(paso.dim, mapaValorAno(ind.filaLocalidades, 2022));
          const frase = fraseInterpretacion(interpretaciones, ind.nombreInterpretacion, "Bogotá", 2022);
          beeswarm.actualizarAnotacion(paso.dim, `2022 — <strong>${frase}</strong>`);
        } else {
          beeswarm.actualizarValores(paso.dim, mapaValorAno(ind.filaLocalidades, 2024));
          const frase = fraseInterpretacion(interpretaciones, ind.nombreInterpretacion, "Bogotá", 2024);
          beeswarm.actualizarAnotacion(paso.dim, frase);
        }
        indicadorActivoPorDim[paso.dim] = ind;
      }

      // ---------- Scrollama: un solo observador para toda la página ----------
      const scroller = window.scrollama();
      scroller
        .setup({
          step: ".scrolly-step",
          offset: 0.55,
          progress: true,
        })
        .onStepEnter((response) => {
          const el = response.element;

          if (el.dataset.act === "1") {
            const idx = Number(el.dataset.step);
            if (controllerActo1) controllerActo1.ir(datos.acto1[idx], ACTO1_DIMENSIONES[idx]);
            acto1Steps.forEach((e, i) => {
              const eraActivo = e.classList.contains("is-active");
              const esActivo = i === idx;
              e.classList.toggle("is-active", esActivo);
              if (esActivo || eraActivo) animarTexto(acto1Textos[i], esActivo, contexto);
            });
            return;
          }

          if (!el.dataset.fase) return;
          const paso = PASOS.find((p) => p.el === el);
          if (!paso) return;

          PASOS.forEach((p) => {
            const eraActivo = p.el.classList.contains("is-active");
            const esActivo = p === paso;
            p.el.classList.toggle("is-active", esActivo);
            if (esActivo || eraActivo) animarTexto(p.contenidoEl, esActivo, contexto);
          });

          if (paso.fase === "intro") {
            fundirPanel(paso.introIdx === 0 ? "palabras" : "beeswarm");
            if (paso.introIdx >= 1 && beeswarm) beeswarm.entrarFila(beeswarm.filas.get("ides"), 1000);
            if (paso.introIdx === 3) {
              asegurarFilasDimension();
              // Reentrar a este paso desde cualquier dirección siempre
              // debe mostrar las 3 filas iguales (sin zoom) — se resetea
              // el estado de zoom explícitamente en vez de arrastrar lo
              // que haya quedado de un recorrido anterior por las
              // dimensiones. restaurarTodasLasFilas() cubre además el
              // caso de volver a este paso subiendo el scroll después de
              // haber visitado alguna dimensión.
              filaActivaGlobal = null;
              restaurarTodasLasFilas();
              if (beeswarm) beeswarm.zoom(0, null, null);
            }
            setProgreso(progresoEl, "", false, contexto);
          } else if (paso.fase === "entrada") {
            asegurarFilasDimension();
            const desde = filaActivaGlobal;
            paso.desdeZoom = desde;
            if (desde && desde !== paso.dim) restaurarFilaDimension(desde);
            if (beeswarm) beeswarm.zoom(0, desde, paso.dim);
            setProgreso(progresoEl, NOMBRE_DIMENSION[paso.dim], true, contexto);
          } else if (paso.fase === "conteo") {
            filaActivaGlobal = paso.dim;
            if (beeswarm) beeswarm.zoom(1, paso.dim, paso.dim);
            setProgreso(progresoEl, NOMBRE_DIMENSION[paso.dim], true, contexto);
          } else if (paso.fase === "indicador") {
            filaActivaGlobal = paso.dim;
            if (beeswarm) beeswarm.zoom(1, paso.dim, paso.dim);
            activarIndicador(paso);
            setProgreso(
              progresoEl,
              `${NOMBRE_DIMENSION[paso.dim]} · indicador ${paso.idx + 1} de ${paso.n}`,
              true,
              contexto,
            );
          } else if (paso.fase === "cierre") {
            // El desenfoque de vuelta a las 3 filas iguales NO se ata al
            // scroll dentro de este paso (a diferencia de "entrada"): al
            // ser el último paso del documento, después de él solo quedan
            // ~250px (el CTA + el padding final de la sección) — muy poco
            // para que Scrollama reporte progreso hasta 1, así que con
            // onStepProgress la animación se quedaba a medio camino para
            // siempre (bug reportado: Salud/Justicia nunca volvían a
            // aparecer). En vez de eso, es un tween GSAP de duración fija
            // que corre solo, sin depender de que el usuario siga
            // haciendo scroll.
            const desde = filaActivaGlobal;
            paso.desdeZoom = desde;
            restaurarTodasLasFilas();
            if (beeswarm) {
              if (cierreTween) cierreTween.kill();
              if (contexto.reducido) {
                beeswarm.zoom(1, desde, null);
              } else {
                const estado = { t: 0 };
                cierreTween = gsap.to(estado, {
                  t: 1,
                  duration: 0.9,
                  ease: "power2.out",
                  onUpdate: () => beeswarm.zoom(estado.t, desde, null),
                  // Blindaje: sea cual sea el último valor de estado.t que
                  // haya alcanzado a pintar onUpdate, la llamada final
                  // siempre deja las 3 filas en progress=1 exacto (opacity
                  // 1, sin redondeos de la curva de easing).
                  onComplete: () => beeswarm.zoom(1, desde, null),
                });
              }
            }
            setProgreso(progresoEl, "", false, contexto);
            gsap.killTweensOf(ctaEl);
            if (contexto.reducido) {
              gsap.set(ctaEl, { opacity: 1 });
            } else {
              gsap.to(ctaEl, { opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.5 });
            }
          }
        })
        .onStepProgress((response) => {
          const el = response.element;
          if (!el.dataset.fase) return;
          const paso = PASOS.find((p) => p.el === el);
          if (!paso || !beeswarm) return;

          if (paso.fase === "entrada") {
            beeswarm.zoom(response.progress, paso.desdeZoom, paso.dim);
          } else if (paso.fase === "indicador" && paso.indicador.bandera && filasDimMontadas) {
            const ind = paso.indicador;
            const mapa = mapaValorInterpolado(ind.filaLocalidades, response.progress);
            beeswarm.actualizarValores(paso.dim, mapa);
            const año = añoParaProgreso(response.progress);
            const frase = fraseInterpretacion(interpretaciones, ind.nombreInterpretacion, "Bogotá", año);
            paso.interpretacionEl.textContent = `${año} — ${frase}`;
            beeswarm.actualizarAnotacion(paso.dim, `${año} — <strong>${frase}</strong>`);
          }
        });

      window.addEventListener("resize", () => {
        scroller.resize();
        ScrollTrigger.refresh();
      });
    });
  }

  window.ScrollytellingIntro = { init };
})();
