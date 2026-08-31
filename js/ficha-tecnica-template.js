// ficha-tecnica-template.js
// Plantilla reutilizable de "Ficha técnica" de un indicador individual (ver
// context/plantilla-ficha-tecnica.md). Recibe un objeto indicador con la
// forma real de data/fichas-tecnicas.json (23 indicadores: 8 Salud, 5
// Justicia, 10 Determinantes Sociales) y rellena las celdas del grid fijo
// en ficha.html — misma idea que taller-template.js / ficha-dimension-
// -template.js: la plantilla no cambia, solo los datos.
//
// El color YA NO se resuelve por clase CSS (.ficha-page--{dimension}, como
// en las 3 instancias dummy anteriores) sino directamente desde
// `color_dimension` del JSON, fijado como --dim-color en runtime — cada
// indicador trae su propio color, aunque en la práctica los 3 valores
// coinciden con los de su dimensión.

(function () {
  // Mismas rotaciones que ya usan las páginas agrupadoras por dimensión
  // (ficha-salud.html/ficha-justicia.html/ficha-determinantes.html) — así
  // el donut de esta ficha se ve idéntico al de la página que enlaza a
  // ella. Llave = valor real de `dimension` en el JSON.
  const ROTACIONES = {
    Salud: [360, 192, 132],
    Justicia: [20, 180, 95],
    "Determinantes Sociales": [360, 192, 132],
  };

  // Slug usado en el nombre de archivo de cada página agrupadora
  // (ficha-{slug}.html) — no es una transformación mecánica de `dimension`
  // ("Determinantes Sociales" -> "determinantes", no "determinantes-
  // sociales"), así que se mapea a mano. Se expone para que ficha.html lo
  // reutilice al construir la miga de pan.
  const DIMENSION_SLUGS = {
    Salud: "salud",
    Justicia: "justicia",
    "Determinantes Sociales": "determinantes",
  };

  // "Método:" es fijo para las 23 fichas — es el método de agregación
  // global del IDES (agregación geométrica entre dimensiones), no un dato
  // propio del indicador, por eso no viene de fichas-tecnicas.json.
  const METODO_FIJO = "Agregación geométrica";

  function tieneDelimitadoresLatex(latex) {
    return /\\\(|\\\[|\$/.test(latex);
  }

  // formula_calculo_latex y parametros_normalizacion_latex vienen en LaTeX
  // real. La mayoría son UNA sola expresión sin delimitadores (todo el
  // campo es la fórmula) — esas se renderizan enteras con katex.render().
  // Una excepción en el set (parámetros de normalización de "Camas
  // pediátricas...") mezcla prosa con una fórmula inline delimitada con
  // \( \) (una nota al pie) — para esos casos hace falta renderMathInElement
  // (auto-render), que solo procesa las porciones delimitadas y deja el
  // resto como texto. Se detecta automáticamente cuál caso es cada campo
  // en vez de hardcodear el id del indicador con la excepción.
  function renderLatex(el, latex) {
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

  function render(indicador) {
    document
      .querySelector(".page")
      .style.setProperty("--dim-color", indicador.color_dimension);

    document.getElementById("ficha-nombre").textContent = indicador.nombre_indicador;
    document.getElementById("ficha-dimension-valor").textContent = indicador.dimension;
    document.getElementById("ficha-definicion-valor").textContent = indicador.definicion;
    document.getElementById("ficha-periodo-valor").textContent = String(indicador.periodo_medicion);
    document.getElementById("ficha-metodo-valor").textContent = METODO_FIJO;
    document.getElementById("ficha-cobertura-valor").textContent = indicador.cobertura;
    document.getElementById("ficha-unidad-valor").textContent = indicador.unidad_medicion;
    document.getElementById("ficha-relevancia-valor").textContent = indicador.por_que_es_relevante;
    document.getElementById("ficha-fuente-apa-valor").textContent = indicador.fuente_apa;

    // "Fuente:" no es un campo propio del JSON — se extrae el nombre de la
    // entidad tomando el texto de fuente_apa antes del primer punto (ej.
    // "Secretaría Distrital de Salud" de "Secretaría Distrital de Salud.
    // (s. f.)..."). Heurística simple, validada contra las 23 entradas.
    document.getElementById("ficha-fuente-valor").textContent =
      indicador.fuente_apa.split(".")[0].trim();

    renderLatex(document.getElementById("ficha-formula-valor"), indicador.formula_calculo_latex);
    renderLatex(
      document.getElementById("ficha-normalizacion-valor"),
      indicador.parametros_normalizacion_latex,
    );

    window.IDESStatsDonuts.renderStatMark(
      document.getElementById("ficha-mark"),
      "--dim-color",
      ROTACIONES[indicador.dimension],
    );
  }

  window.IDESFichaTecnicaTemplate = { render, METODO_FIJO, DIMENSION_SLUGS };
})();
