// indicator-context.js
// Cruza data/indicadores-datos-completo.json (interpretaciones por
// localidad/año + peor/mejor desempeño fijo, todo en un único archivo, con
// sus propias claves cortas tipo "TasaResolucion") contra
// data/fichas-tecnicas.json (id largo + dimensión) por "nombre_completo" —
// ese cruce se hace UNA sola vez acá y se reutiliza para todo lo demás
// (banda por dimensión, href de la ficha técnica, texto interpretativo,
// peor/mejor). Las claves cortas del archivo de datos NO son el id de
// fichas-tecnicas.json (son un id interno de esa fuente) — lo único que se
// usa para cruzar es "nombre_completo", igual que el "nombre" de cada
// variable en data/localidades.json.
//
// Único nombre sin match exacto tras normalizar espacios/tildes: "Camas
// pediátricas habilitadas registradas en REPS por cada 1.000 menores de 18
// años" vs "...registradas en el Registro especial de prestadores - REPS
// por cada 1.000 menores de 18 años" (fichas-tecnicas.json) — mismo
// indicador, forma abreviada de REPS. Se resuelve con el alias manual de
// abajo.
//
// Caso especial: la clave "SIN_ID__Casos de conducta suicida por cada
// 1.000 menores de 18 años" sí tiene nombre_completo e interpretaciones
// completas, pero peor_desempeno/mejor_desempeno vienen en null (dato
// pendiente en la fuente original). Se resuelve su id/dimensión igual que
// cualquier otro (el nombre calza exacto contra fichas-tecnicas.json, no es
// una asociación por adivinanza) para que el indicador SÍ aparezca en su
// dimensión con marcador y CTA — pero getPeorMejor() devuelve null para
// él, y quien renderiza la fila de peor/mejor simplemente no la muestra.

(function () {
  const ALIAS_MANUAL = {
    "camas pediatricas habilitadas registradas en reps por cada 1.000 menores de 18 anos":
      "salud-camas-pediatricas-habilitadas-registradas-en-el-registro-especial-de-prestadores-reps-por-cada-1-000-menores-de-18-anos",
  };

  function normalizar(s) {
    return s
      .replace(/\s+/g, " ")
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // Mapa nombre_completo normalizado -> fichaId, incluyendo el alias manual
  // (mismo indicador, forma abreviada de REPS) directamente como una
  // segunda clave — así el lookup en crearContexto es un Map.get simple,
  // sin lógica de fallback repetida en cada cruce.
  function construirMapaFichas(fichas) {
    const mapa = new Map();
    fichas.indicadores.forEach((ind) => {
      mapa.set(normalizar(ind.nombre_indicador), ind.id);
    });
    Object.keys(ALIAS_MANUAL).forEach((claveAlias) => {
      mapa.set(claveAlias, ALIAS_MANUAL[claveAlias]);
    });
    return mapa;
  }

  function crearContexto({ fichas, indicadoresDatos }) {
    const mapaFichas = construirMapaFichas(fichas);
    // Re-clave por nombre completo normalizado (no por la clave corta del
    // archivo de datos, que no significa nada fuera de esa fuente).
    const porNombre = new Map();
    const sinMatch = [];

    Object.values(indicadoresDatos).forEach((registro) => {
      const clave = normalizar(registro.nombre_completo);
      const fichaId = mapaFichas.get(clave);
      if (!fichaId) {
        sinMatch.push(registro.nombre_completo);
        return;
      }
      porNombre.set(clave, {
        fichaId,
        interpretaciones: registro.interpretaciones,
        peorDesempeno: registro.peor_desempeno || null,
        mejorDesempeno: registro.mejor_desempeno || null,
      });
    });

    if (sinMatch.length) {
      console.warn("[indicator-context] Sin indicador correspondiente en fichas-tecnicas.json:", sinMatch);
    }

    function registroDe(nombreCompleto) {
      return porNombre.get(normalizar(nombreCompleto)) || null;
    }

    return {
      // Id de fichas-tecnicas.json — para el href del CTA ("ficha.html?id=...",
      // ver ficha.html). La rampa de color de la fila NO se resuelve por el
      // campo "dimension" de fichas-tecnicas.json (sus valores son "Salud" /
      // "Justicia" / "Determinantes Sociales", distinto del `dimKey` interno
      // salud/justicia/determinantes que ya usa este archivo) — se resuelve
      // con el mismo `dimKey` con el que locality-detail.js ya arma el
      // wrapper de cada track (ver AXES en fan-chart.js), que es el
      // mecanismo ya probado y no necesita este cruce para nada visual.
      getFichaId(nombreCompleto) {
        const r = registroDe(nombreCompleto);
        return r && r.fichaId;
      },
      // Texto interpretativo: varía por indicador + localidad + año.
      getInterpretacion(nombreCompleto, localidadNombre, año) {
        const r = registroDe(nombreCompleto);
        const porLocalidad = r && r.interpretaciones[localidadNombre];
        return (porLocalidad && porLocalidad[String(año)]) || null;
      },
      // Peor/mejor desempeño: fijo por indicador (no varía por localidad ni
      // año). Devuelve null si el indicador no tiene el dato (caso
      // documentado arriba) — quien renderiza debe omitir la fila entera en
      // vez de mostrarla vacía.
      getPeorMejor(nombreCompleto) {
        const r = registroDe(nombreCompleto);
        if (!r || !r.peorDesempeno || !r.mejorDesempeno) return null;
        return { peor_desempeno: r.peorDesempeno, mejor_desempeno: r.mejorDesempeno };
      },
    };
  }

  window.IDESIndicatorContext = { crearContexto };
})();
