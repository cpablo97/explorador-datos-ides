// breadcrumb.js
// Miga de pan reutilizable, ligada a la estructura de navegación del sitio
// — mismo patrón que taller-template.js/ficha-dimension-template.js: la
// plantilla no cambia, cada página solo aporta su propia cadena de items.
//
// items: [{label, href}, ...] en orden raíz → hoja. El último item se
// renderiza SIEMPRE como texto plano (la página actual), tenga o no href.

(function () {
  function render(container, items) {
    if (!container) return;

    const nav = document.createElement("nav");
    nav.className = "breadcrumb";
    nav.setAttribute("aria-label", "Miga de pan");

    const ol = document.createElement("ol");
    ol.className = "breadcrumb__list";

    items.forEach((item, i) => {
      const esUltimo = i === items.length - 1;

      const li = document.createElement("li");
      li.className = "breadcrumb__item";

      if (esUltimo) {
        li.classList.add("is-current");
        li.setAttribute("aria-current", "page");
        const span = document.createElement("span");
        span.textContent = item.label;
        li.appendChild(span);
      } else {
        const a = document.createElement("a");
        a.href = item.href;
        a.textContent = item.label;
        li.appendChild(a);
      }
      ol.appendChild(li);

      if (!esUltimo) {
        const sep = document.createElement("li");
        sep.className = "breadcrumb__separator";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "/";
        ol.appendChild(sep);
      }
    });

    nav.appendChild(ol);
    container.replaceWith(nav);
  }

  window.IDESBreadcrumb = { render };
})();
