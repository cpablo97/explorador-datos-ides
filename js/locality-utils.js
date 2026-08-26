// locality-utils.js
// Bogotá vive dentro de data/localidades.json como un objeto más (mismo
// shape que una localidad real), marcado con `ciudad: true`. No debe
// entrar a ningún cálculo que asuma "las 20 localidades" (ángulos del
// abanico de 180°, orden alfabético, benchmarks) — estas dos funciones son
// el único punto de filtrado, para no repetir `.filter`/`.find` con el
// mismo criterio en cada archivo que consume `data`.

(function () {
  function getLocalidadesReales(data) {
    return data.filter((d) => !d.ciudad);
  }

  function getBogota(data) {
    return data.find((d) => d.ciudad);
  }

  window.IDESLocalityUtils = { getLocalidadesReales, getBogota };
})();
