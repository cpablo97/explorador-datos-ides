// photo-carousel.js
// Carrusel de fotos reutilizable para las páginas de "espacio" (Piloto,
// Laboratorio, Taller 1, Taller 2) — un componente, N instancias
// independientes, mismo patrón IIFE + window.* que fan-chart.js/
// locality-rose.js. No depende de una convención de nombres de archivo:
// lee assets/espacios-fotos.json en runtime (ver Paso 1 del prompt) y
// arma un <img> por cada foto real que haya en la carpeta de ese espacio.
//
// Uso: window.PhotoCarousel.init({ container: '#taller-imagen', espacio: 'piloto' })

(function () {
  const MANIFEST_URL = "assets/espacios-fotos.json";
  let manifestPromise = null;
  function cargarManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL).then((r) => r.json());
    }
    return manifestPromise;
  }

  const ESPACIO_LABEL = {
    piloto: "Piloto",
    laboratorio: "Laboratorio",
    "taller-1": "Taller 1",
    "taller-2": "Taller 2",
  };

  function icono(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}" fill="currentColor"/></svg>`;
  }
  const ICONOS = {
    prev: icono("M15.5 4.5 8 12l7.5 7.5 1.4-1.4L10.8 12l6.1-6.1 -1.4-1.4z"),
    next: icono("M8.5 4.5 16 12l-7.5 7.5-1.4-1.4L13.2 12 7.1 5.9l1.4-1.4z"),
    expand: icono(
      "M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z",
    ),
    close: icono(
      "M6.4 4.9 4.9 6.4 10.6 12l-5.7 5.6 1.5 1.5L12 13.4l5.6 5.7 1.5-1.5L13.4 12l5.7-5.6-1.5-1.5L12 10.6z",
    ),
  };

  // ---------- Lightbox: una sola instancia compartida por las 4 páginas ----------
  // Se crea perezosamente en el primer "abrir" y queda anexada a <body>. El
  // foco entra al abrir y se atrapa dentro del diálogo (Tab/Shift+Tab), y
  // vuelve al control que lo abrió al cerrar.

  let lightboxEl = null;
  let lightboxState = null; // { fotos, index, label, onChange }
  let fotoAbierta = null;

  function construirLightbox() {
    const el = document.createElement("div");
    el.className = "photo-lightbox";
    el.hidden = true;
    el.innerHTML = `
      <div class="photo-lightbox__dialog" role="dialog" aria-modal="true">
        <button type="button" class="photo-lightbox__close" aria-label="Cerrar">${ICONOS.close}</button>
        <button type="button" class="photo-lightbox__btn photo-lightbox__btn--prev" aria-label="Foto anterior">${ICONOS.prev}</button>
        <img class="photo-lightbox__img" alt="" />
        <button type="button" class="photo-lightbox__btn photo-lightbox__btn--next" aria-label="Foto siguiente">${ICONOS.next}</button>
        <p class="photo-lightbox__counter" aria-live="polite"></p>
      </div>
    `;
    document.body.appendChild(el);

    // Clic fuera de la imagen (sobre el fondo) cierra; clic en la imagen o
    // en los controles no, porque ahí el target nunca es el propio `el`.
    el.addEventListener("click", (event) => {
      if (event.target === el) cerrarLightbox();
    });
    el.querySelector(".photo-lightbox__close").addEventListener("click", cerrarLightbox);
    el.querySelector(".photo-lightbox__btn--prev").addEventListener("click", () => moverLightbox(-1));
    el.querySelector(".photo-lightbox__btn--next").addEventListener("click", () => moverLightbox(1));

    let touchX = null;
    el.addEventListener(
      "touchstart",
      (event) => {
        touchX = event.touches[0].clientX;
      },
      { passive: true },
    );
    el.addEventListener("touchend", (event) => {
      if (touchX === null) return;
      const delta = event.changedTouches[0].clientX - touchX;
      if (Math.abs(delta) > 40) moverLightbox(delta > 0 ? -1 : 1);
      touchX = null;
    });

    document.addEventListener("keydown", (event) => {
      if (!lightboxState) return;
      if (event.key === "Escape") {
        cerrarLightbox();
      } else if (event.key === "ArrowLeft") {
        moverLightbox(-1);
      } else if (event.key === "ArrowRight") {
        moverLightbox(1);
      } else if (event.key === "Tab") {
        atraparFoco(event);
      }
    });

    return el;
  }

  function atraparFoco(event) {
    const focables = Array.from(lightboxEl.querySelectorAll("button"));
    if (!focables.length) return;
    const primero = focables[0];
    const ultimo = focables[focables.length - 1];
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  function actualizarLightbox() {
    const { fotos, index, label } = lightboxState;
    const foto = fotos[index];
    const img = lightboxEl.querySelector(".photo-lightbox__img");
    img.src = foto.src;
    img.alt = foto.alt;
    lightboxEl.querySelector(".photo-lightbox__counter").textContent = `${index + 1} / ${fotos.length}`;
    lightboxEl
      .querySelector(".photo-lightbox__dialog")
      .setAttribute("aria-label", `Foto ampliada, ${label}, ${index + 1} de ${fotos.length}`);
  }

  function moverLightbox(delta) {
    if (!lightboxState) return;
    const { fotos } = lightboxState;
    lightboxState.index = (lightboxState.index + delta + fotos.length) % fotos.length;
    actualizarLightbox();
    lightboxState.onChange(lightboxState.index);
  }

  function abrirLightbox({ fotos, index, label, onChange }) {
    if (!lightboxEl) lightboxEl = construirLightbox();
    fotoAbierta = document.activeElement;
    lightboxState = { fotos, index, label, onChange };
    actualizarLightbox();
    lightboxEl.hidden = false;
    document.body.classList.add("photo-lightbox-open");
    lightboxEl.querySelector(".photo-lightbox__close").focus();
  }

  function cerrarLightbox() {
    if (!lightboxEl || lightboxEl.hidden) return;
    lightboxEl.hidden = true;
    lightboxState = null;
    document.body.classList.remove("photo-lightbox-open");
    if (fotoAbierta && typeof fotoAbierta.focus === "function") fotoAbierta.focus();
    fotoAbierta = null;
  }

  // ---------- Carrusel inline ----------

  function init({ container, espacio }) {
    const root = typeof container === "string" ? document.querySelector(container) : container;
    if (!root) return;

    cargarManifest().then((manifest) => {
      const info = manifest[espacio];
      // Sin entrada o carpeta vacía en el manifest: deja el contenedor
      // vacío, mismo comportamiento de "sin foto" que tenía antes esta
      // plantilla (ver taller-template.js).
      if (!info || !info.archivos || !info.archivos.length) return;

      const label = ESPACIO_LABEL[espacio] || espacio;
      const fotos = info.archivos.map((archivo, i) => ({
        src: `assets/${encodeURIComponent(info.carpeta)}/${encodeURIComponent(archivo)}`,
        alt: `Foto ${i + 1} de ${label}`,
      }));

      let index = 0;

      root.classList.add("photo-carousel");
      root.setAttribute("tabindex", "0");
      root.setAttribute("role", "group");
      root.setAttribute("aria-roledescription", "carrusel");
      root.setAttribute("aria-label", `Fotos de ${label}`);

      root.innerHTML = `
        <div class="photo-carousel__viewport">
          ${fotos
            .map(
              (foto, i) => `
            <div class="photo-carousel__slide"${i === 0 ? "" : " hidden"}>
              <img src="${foto.src}" alt="${foto.alt}" loading="${i === 0 ? "eager" : "lazy"}" />
            </div>`,
            )
            .join("")}
          <button type="button" class="photo-carousel__btn photo-carousel__btn--prev" aria-label="Foto anterior">${ICONOS.prev}</button>
          <button type="button" class="photo-carousel__btn photo-carousel__btn--next" aria-label="Foto siguiente">${ICONOS.next}</button>
          <button type="button" class="photo-carousel__expand" aria-label="Ampliar foto">${ICONOS.expand}</button>
          <p class="photo-carousel__counter" aria-live="polite">1 / ${fotos.length}</p>
        </div>
      `;

      const slides = Array.from(root.querySelectorAll(".photo-carousel__slide"));
      const counterEl = root.querySelector(".photo-carousel__counter");
      const viewportEl = root.querySelector(".photo-carousel__viewport");

      function mostrarFoto(nuevoIndex) {
        index = (nuevoIndex + fotos.length) % fotos.length;
        slides.forEach((slide, i) => {
          slide.hidden = i !== index;
        });
        counterEl.textContent = `${index + 1} / ${fotos.length}`;
      }

      root.querySelector(".photo-carousel__btn--prev").addEventListener("click", () => mostrarFoto(index - 1));
      root.querySelector(".photo-carousel__btn--next").addEventListener("click", () => mostrarFoto(index + 1));

      root.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          mostrarFoto(index - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          mostrarFoto(index + 1);
        }
      });

      function abrir() {
        abrirLightbox({
          fotos,
          index,
          label,
          onChange: mostrarFoto,
        });
      }
      root.querySelector(".photo-carousel__expand").addEventListener("click", abrir);
      viewportEl.addEventListener("click", (event) => {
        if (event.target.closest("img")) abrir();
      });

      let touchX = null;
      viewportEl.addEventListener(
        "touchstart",
        (event) => {
          touchX = event.touches[0].clientX;
        },
        { passive: true },
      );
      viewportEl.addEventListener("touchend", (event) => {
        if (touchX === null) return;
        const delta = event.changedTouches[0].clientX - touchX;
        if (Math.abs(delta) > 40) mostrarFoto(delta > 0 ? index - 1 : index + 1);
        touchX = null;
      });
    });
  }

  window.PhotoCarousel = { init };
})();
