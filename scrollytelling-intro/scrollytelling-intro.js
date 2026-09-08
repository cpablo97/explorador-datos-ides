// scrollytelling-intro.js
// Acto 0 (portada) + Acto 1 (tres cifras) + Acto 2 (qué es un índice / qué
// es el IDES) del scrollytelling de entrada al proyecto IDES. Contenido
// narrativo en scrollytelling-steps.json — este archivo solo monta el
// patrón visual (panel sticky + scroll narrativo vía Scrollama + crossfade
// con requestAnimationFrame). No hay prototipo "scrollytelling"/v3 previo
// en el repo del que heredar el patrón; se construyó desde cero siguiendo
// la especificación funcional (sticky + rAF + crossfade, sin umbrales de
// scroll calculados a mano).
//
// Un solo Scrollama observa los pasos de TODOS los actos (.scrolly-step,
// distinguidos por data-act/data-step) — no se instancia un scroller por
// acto.
//
// Mismo patrón IIFE + registro en window.* que el resto de componentes del
// sitio (ver js/breadcrumb.js, js/timeline-control.js).

(function () {
  // Dimensión de cada cifra del Acto 1, en orden — usada solo para el
  // color de acento de la tarjeta (tokens ya existentes en tokens.css,
  // los mismos que distinguen cada dimensión en el resto del sitio).
  const DIMENSION_COLOR_VAR = {
    salud: "--color-text-decoration-salud",
    justicia: "--color-text-decoration-justicia",
    determinantes: "--color-text-decoration-determinantes",
  };
  const ACTO1_DIMENSIONES = ["salud", "justicia", "determinantes"];

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Interpola placeholders {{clave}} en un texto contra un objeto de
  // valores — usado para inyectar los puntajes reales de localidades.json
  // (ides/salud/justicia/determinantes) en el texto del Acto 2 sin
  // hardcodearlos en scrollytelling-steps.json.
  function interpolar(texto, valores) {
    if (!valores) return texto;
    return texto.replace(/\{\{(\w+)\}\}/g, (coincide, clave) =>
      clave in valores ? String(valores[clave]) : coincide,
    );
  }

  // ---------- Fondo de círculos entrelazados ----------
  // Mismo patrón (montarGridFondo) usado como fondo fijo en el resto del
  // sitio (ver index.html raíz del proyecto) — no se reinventa acá, se
  // porta tal cual porque esta página vive aislada en su propia carpeta.
  function montarGridFondo(selector) {
    const contenedor = document.querySelector(selector);
    if (!contenedor) return;
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
  }

  // ---------- Fundido genérico (crossfade de opacidad vía rAF) ----------
  // Anima la opacidad de UN elemento hacia un valor destino. Lee la
  // opacidad actual con getComputedStyle (funciona aunque interrumpa una
  // animación anterior a medio camino) en vez de asumir un valor de
  // partida fijo. Reutilizado por el Acto 2 para cruzar varios elementos
  // independientes (grupo de anillos, grupo del venn, puntaje, valores de
  // la leyenda) sin duplicar la lógica de tick/rAF por cada uno.
  function fundir(el, destino, duracion) {
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.opacity = String(destino);
      return;
    }
    if (el._fundeRaf) cancelAnimationFrame(el._fundeRaf);
    const desde = parseFloat(getComputedStyle(el).opacity) || 0;
    const inicio = performance.now();
    function tick(ahora) {
      const t = Math.min(1, (ahora - inicio) / duracion);
      el.style.opacity = String(desde + (destino - desde) * t);
      if (t < 1) {
        el._fundeRaf = requestAnimationFrame(tick);
      } else {
        el._fundeRaf = null;
      }
    }
    el._fundeRaf = requestAnimationFrame(tick);
  }

  // ---------- Crossfade de la tarjeta flotante (Acto 1) ----------
  // Dos capas absolutas superpuestas (data-layer="a"/"b"): en cada paso se
  // pinta la capa inactiva con el contenido nuevo y se cruzan las
  // opacidades con requestAnimationFrame — nunca un corte duro de texto.
  function crearCardController(cardEl) {
    let activa = cardEl.querySelector('[data-layer="a"]');
    let inactiva = cardEl.querySelector('[data-layer="b"]');
    const DURACION = 420;

    function pintar(layer, paso, dimension) {
      layer.style.setProperty("--acento", `var(${DIMENSION_COLOR_VAR[dimension]})`);
      layer.querySelector(".acto1-card__cifra").textContent = paso.cifra;
      layer.querySelector(".acto1-card__fuente").textContent = `Fuente: ${paso.fuente}`;
    }

    function ir(paso, dimension) {
      pintar(inactiva, paso, dimension);
      fundir(activa, 0, DURACION);
      fundir(inactiva, 1, DURACION);
      [activa, inactiva] = [inactiva, activa];
    }

    function pintarPrimero(paso, dimension) {
      pintar(activa, paso, dimension);
    }

    return { ir, pintarPrimero };
  }

  // ---------- Acto 2: anillo compuesto de 3 gajos (SVG) ----------
  // Referencia real en Figma (fileKey HntVnTEmXSgURDwEpAG1oc, frames
  // scrolly-07/08/09, confirmado con get_design_context): no es un Venn de
  // 3 círculos superpuestos, es un anillo (donut) dividido en 3 gajos
  // iguales de 120° — Salud arriba-izquierda, Justicia arriba-derecha,
  // Determinantes Sociales toda la mitad inferior (ver array GAJOS más
  // abajo). La forma no cambia entre pasos — se construye una sola vez.
  function anguloAPunto(cx, cy, r, gradosDesdeArriba) {
    const rad = ((gradosDesdeArriba - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  function pathGajo(cx, cy, rExterior, rInterior, desde, hasta) {
    const [x1, y1] = anguloAPunto(cx, cy, rExterior, desde);
    const [x2, y2] = anguloAPunto(cx, cy, rExterior, hasta);
    const [x3, y3] = anguloAPunto(cx, cy, rInterior, hasta);
    const [x4, y4] = anguloAPunto(cx, cy, rInterior, desde);
    const arcoGrande = hasta - desde > 180 ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${rExterior} ${rExterior} 0 ${arcoGrande} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${rInterior} ${rInterior} 0 ${arcoGrande} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
  }

  // Orden real confirmado en Figma (scrolly-07/08/09): visto de frente,
  // Salud ocupa el gajo superior-izquierdo, Justicia el superior-derecho
  // y Determinantes Sociales toda la mitad inferior — en grados desde
  // arriba (12 en punto), en sentido horario: Justicia 0-120, Determinantes
  // 120-240, Salud 240-360.
  const GAJOS = [
    { dim: "justicia", colorVar: "--naranja-300", desde: 0, hasta: 120 },
    { dim: "determinantes", colorVar: "--verde-400", desde: 120, hasta: 240 },
    { dim: "salud", colorVar: "--azul-300", desde: 240, hasta: 360 },
  ];
  const CX = 100;
  const CY = 100;
  const R_EXT = 96;
  const R_INT = 46;

  // Racimo de ~10 círculos pequeños decorativos dentro de un gajo, del
  // mismo color que su fondo pero sólidos y superpuestos con
  // mix-blend-mode:multiply (misma técnica ya usada en el sitio para
  // capas de círculos — ver .half-circle en explorador.css) — así las
  // zonas de traslape se ven más oscuras/densas, igual que en el diseño
  // real. No son las posiciones exactas de Figma (esas dependen de
  // container query units atadas a un layout React/Tailwind que no
  // aplica en este stack) sino una distribución propia por trigonometría
  // que preserva conteo, tamaño relativo y color.
  function agregarRacimoCirculos(svgEl, desde, hasta, colorVar) {
    const svgNS = "http://www.w3.org/2000/svg";
    const margen = 10; // grados de aire respecto a los bordes del gajo
    const anilloRadios = [
      R_INT + (R_EXT - R_INT) * 0.28,
      R_INT + (R_EXT - R_INT) * 0.6,
      R_INT + (R_EXT - R_INT) * 0.88,
    ];
    const porAnillo = [3, 4, 3];
    const radioCirculo = ((R_EXT - R_INT) / 2) * 0.62;

    anilloRadios.forEach((radio, i) => {
      const cantidad = porAnillo[i];
      for (let j = 0; j < cantidad; j++) {
        const fraccion = (j + 0.5) / cantidad;
        const anguloBase = desde + margen + fraccion * (hasta - desde - margen * 2);
        const jitterAngulo = (Math.random() - 0.5) * 10;
        const jitterRadio = (Math.random() - 0.5) * 6;
        const [x, y] = anguloAPunto(CX, CY, radio + jitterRadio, anguloBase + jitterAngulo);
        const circulo = document.createElementNS(svgNS, "circle");
        circulo.setAttribute("cx", x);
        circulo.setAttribute("cy", y);
        circulo.setAttribute("r", radioCirculo * (0.85 + Math.random() * 0.3));
        circulo.style.fill = `var(${colorVar})`;
        circulo.style.mixBlendMode = "multiply";
        svgEl.appendChild(circulo);
      }
    });
  }

  function montarAnilloCompuesto(svgEl) {
    if (!svgEl) return;
    const svgNS = "http://www.w3.org/2000/svg";

    GAJOS.forEach(({ dim, colorVar, desde, hasta }) => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", pathGajo(CX, CY, R_EXT, R_INT, desde, hasta));
      path.setAttribute("data-dim", dim);
      // Fondo del gajo: tinte más claro del color de la dimensión — los
      // círculos del racimo (más abajo) sí llevan el color sólido, igual
      // que en el diseño real (fondo pastel + círculos saturados encima).
      path.style.fill = `color-mix(in srgb, var(${colorVar}) 55%, white)`;
      path.style.stroke = "var(--color-callout-border)";
      path.style.strokeWidth = "1.5";
      svgEl.appendChild(path);
    });

    GAJOS.forEach(({ colorVar, desde, hasta }) => {
      agregarRacimoCirculos(svgEl, desde, hasta, colorVar);
    });
  }

  // Arma "<strong>{{num}}</strong><span class=resto>/100</span>" para el
  // puntaje central del anillo — el número subrayado y en negrita, el
  // "/100" sin subrayar y en peso liviano (tratamiento exacto confirmado
  // en Figma: scrolly-08/09, spans con y sin decoration-underline).
  function renderPuntajeCentro(el, valor) {
    el.textContent = "";
    const num = document.createElement("span");
    num.className = "acto2-compuesto__num";
    num.textContent = String(valor);
    const resto = document.createElement("span");
    resto.className = "acto2-compuesto__resto";
    resto.textContent = "/100";
    el.appendChild(num);
    el.appendChild(resto);
  }

  // ---------- Acto 2: controlador del diagrama (crossfade) ----------
  // Estado A (paso 0, "palabras", sin anillo) y estado B (pasos 1-3,
  // "compuesto") ocupan la misma celda de grid y se cruzan en opacidad.
  // Dentro del estado B: las dos capas del texto central
  // (data-centro="bogota"/"puntaje") se cruzan entre sí, y el gráfico de
  // barras (elemento aparte del anillo, que nunca cambia de forma) solo
  // aparece — fundiéndose — en el último paso.
  function crearActo2Controller(root) {
    const grupoPalabras = root.querySelector("#acto2-palabras");
    const grupoCompuesto = root.querySelector("#acto2-compuesto");
    const centroBogota = root.querySelector('.acto2-compuesto__texto[data-centro="bogota"]');
    const centroPuntaje = root.querySelector('.acto2-compuesto__texto[data-centro="puntaje"]');
    const puntajeEl = root.querySelector("#acto2-puntaje");
    const grupoBarras = root.querySelector("#acto2-barras");
    const itemsBarras = Array.from(root.querySelectorAll(".acto2-barras__item"));
    const DURACION = 450;
    let datosBogota = null;

    function setDatos(datos) {
      datosBogota = datos;
      if (puntajeEl && datosBogota) renderPuntajeCentro(puntajeEl, datosBogota.ides);
    }

    function ir(paso) {
      fundir(grupoPalabras, paso === 0 ? 1 : 0, DURACION);
      fundir(grupoCompuesto, paso >= 1 ? 1 : 0, DURACION);
      fundir(centroBogota, paso === 1 ? 1 : 0, DURACION);
      fundir(centroPuntaje, paso >= 2 ? 1 : 0, DURACION);
      fundir(grupoBarras, paso >= 3 ? 1 : 0, DURACION);

      const mostrarValores = paso >= 3;
      itemsBarras.forEach((item) => {
        const dim = item.dataset.dim;
        const valorEl = item.querySelector(".acto2-barras__valor");
        const barraEl = item.querySelector(".acto2-barras__barra");
        fundir(valorEl, mostrarValores ? 1 : 0, DURACION);
        const puntajeDim = datosBogota ? datosBogota[dim] : null;
        if (puntajeDim != null) {
          valorEl.innerHTML = `<strong>${puntajeDim}</strong>/100`;
          barraEl.style.height = `${Math.max(6, puntajeDim)}%`;
        }
      });
    }

    function pintarPrimero() {
      ir(0);
    }

    return { ir, setDatos, pintarPrimero };
  }

  // ---------- Rotación por scroll de semicírculos (brandmarks decorativos) ----------
  // Un solo "rotador" compartido por todos los brandmarks regados en el
  // fondo de la página: cada semicírculo que se le registra gira sobre su
  // propio eje central — heredado del
  // <g transform="translate(100,100)"> del propio componente, así
  // rotate() ya pivotea en el centro del círculo — a una velocidad y
  // dirección aleatorias e independientes, sorteadas una sola vez al
  // cargar la página, atadas a la posición de scroll. Un solo listener de
  // scroll (rAF-throttled) mueve todos los semicírculos registrados, en
  // vez de uno por brandmark.
  function crearRotadorScroll() {
    const registros = [];
    let listenerAdjunto = false;
    let ticking = false;

    function actualizar() {
      const y = window.scrollY;
      registros.forEach(({ path, base, velocidad, direccion }) => {
        path.setAttribute("transform", `rotate(${base + y * velocidad * direccion})`);
      });
      ticking = false;
    }

    function registrar(paths, bases) {
      if (prefersReducedMotion()) return;
      paths.forEach((path, i) => {
        registros.push({
          path,
          base: bases[i],
          velocidad: 0.03 + Math.random() * 0.11,
          direccion: Math.random() < 0.5 ? -1 : 1,
        });
      });
      if (!listenerAdjunto) {
        listenerAdjunto = true;
        window.addEventListener(
          "scroll",
          () => {
            if (!ticking) {
              requestAnimationFrame(actualizar);
              ticking = true;
            }
          },
          { passive: true },
        );
      }
    }

    return { registrar };
  }

  const ANGULO_BASE = [0, 120, 240];

  // Brandmarks regados por el fondo de toda la página — cada uno es
  // monocromático (los 3 semicírculos del mismo color, como
  // renderStatMark en js/stats-donuts.js) y representa una sola
  // dimensión. Se reparten en posiciones absolutas del documento (no del
  // viewport) para que vayan apareciendo a lo largo de todo el scroll, no
  // solo en la portada. Este mismo patrón se repite en las próximas
  // secciones del scrollytelling (Acto 3...): basta con volver a llamar
  // montarDotsFondo() una vez que el contenido de la sección nueva ya esté
  // renderizado, para que reparta sobre el alto total actualizado.
  function montarDotsFondo(rotador) {
    if (!window.IDESStatsDonuts) return;

    const coloresPorDimension = [
      "var(--color-text-decoration-salud)",
      "var(--color-text-decoration-justicia)",
      "var(--color-text-decoration-determinantes)",
    ];
    const CANTIDAD = 14;
    const alturaTotal = document.documentElement.scrollHeight;

    for (let i = 0; i < CANTIDAD; i++) {
      const color = coloresPorDimension[i % coloresPorDimension.length];
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

      rotador.registrar(Array.from(mark.querySelectorAll(".half-circle")), ANGULO_BASE);
    }
  }

  // Bogotá, año 2024 — leído en tiempo de carga de data/localidades.json
  // (el mismo archivo que usa el explorador de datos), nunca hardcodeado:
  // si el dato se actualiza en el archivo, este acto se actualiza solo.
  function obtenerDatosBogota(localidades) {
    const bogota = Array.isArray(localidades)
      ? localidades.find((l) => l.id === "bogota")
      : null;
    const registro = bogota ? bogota.anos.find((a) => a.ano === 2024) : null;
    if (!registro) return null;
    return {
      ides: registro.ides,
      salud: registro.indices.salud.puntaje,
      justicia: registro.indices.justicia.puntaje,
      determinantes: registro.indices.determinantes.puntaje,
    };
  }

  function renderTextos(datos, elems, datosBogota) {
    elems.titular.textContent = datos.acto0.titular;
    elems.cta.textContent = datos.acto0.cta;
    elems.acto1Steps.forEach((stepEl, i) => {
      stepEl.querySelector(".scrolly-step__texto").textContent = datos.acto1[i].texto;
    });
    elems.cierre.textContent = datos.transicion_cierre;
    elems.acto2Steps.forEach((stepEl, i) => {
      const texto = datos.acto2[i] ? datos.acto2[i].texto : "";
      stepEl.querySelector(".scrolly-step__texto").textContent = interpolar(texto, datosBogota);
    });
  }

  function init() {
    if (document.getElementById("grid-fondo")) {
      montarGridFondo("#grid-fondo");
    }
    const rotador = crearRotadorScroll();

    const cta = document.getElementById("acto0-cta");
    const acto1 = document.getElementById("acto1");
    if (cta && acto1) {
      cta.addEventListener("click", (evento) => {
        evento.preventDefault();
        acto1.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      });
    }

    const card = document.getElementById("acto1-card");
    const controllerActo1 = card ? crearCardController(card) : null;

    const diagramaActo2 = document.getElementById("acto2-diagram");
    const controllerActo2 = diagramaActo2 ? crearActo2Controller(diagramaActo2) : null;
    montarAnilloCompuesto(document.getElementById("acto2-compuesto-svg"));

    const acto1Steps = Array.from(document.querySelectorAll('.scrolly-step[data-act="1"]'));
    const acto2Steps = Array.from(document.querySelectorAll('.scrolly-step[data-act="2"]'));

    Promise.all([
      fetch("scrollytelling-steps.json").then((r) => r.json()),
      fetch("../data/localidades.json").then((r) => r.json()),
    ]).then(([datos, localidades]) => {
      const datosBogota = obtenerDatosBogota(localidades);
      if (controllerActo2) controllerActo2.setDatos(datosBogota);

      renderTextos(
        datos,
        {
          titular: document.getElementById("acto0-titular"),
          cta,
          acto1Steps,
          cierre: document.getElementById("acto1-cierre"),
          acto2Steps,
        },
        datosBogota,
      );

      if (controllerActo1) {
        controllerActo1.pintarPrimero(datos.acto1[0], ACTO1_DIMENSIONES[0]);
      }
      if (controllerActo2) {
        controllerActo2.pintarPrimero();
      }

      if (acto1Steps[0]) acto1Steps[0].classList.add("is-active");
      if (acto2Steps[0]) acto2Steps[0].classList.add("is-active");

      // Recién acá el alto real de la página está definido (todos los
      // pasos ya tienen su texto), así los brandmarks del fondo se
      // reparten sobre el alto final del documento y no sobre un valor a
      // medias.
      montarDotsFondo(rotador);

      const scroller = window.scrollama();
      scroller
        .setup({
          step: ".scrolly-step",
          offset: 0.55,
        })
        .onStepEnter((response) => {
          const el = response.element;
          const acto = el.dataset.act;
          const idx = Number(el.dataset.step);

          if (acto === "1") {
            if (controllerActo1) controllerActo1.ir(datos.acto1[idx], ACTO1_DIMENSIONES[idx]);
            acto1Steps.forEach((e, i) => e.classList.toggle("is-active", i === idx));
          } else if (acto === "2") {
            if (controllerActo2) controllerActo2.ir(idx);
            acto2Steps.forEach((e, i) => e.classList.toggle("is-active", i === idx));
          }
        });

      window.addEventListener("resize", scroller.resize);
    });
  }

  window.ScrollytellingIntro = { init };
})();
