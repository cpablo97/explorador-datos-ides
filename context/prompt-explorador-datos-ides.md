# Prompt para Claude Code — Prototipo "Explorador de Datos" (IDES Bogotá)

## Contexto del proyecto

Estoy construyendo IDES Bogotá, una plataforma de visualización de datos institucional sobre el
derecho a la salud en las 20 localidades de Bogotá. El stack final es WordPress + D3 + Scrollama,
pero **esta pieza no es scrollytelling** — es un dashboard interactivo llamado "Explorador de Datos"
con un gráfico radial ternario.

Ya tengo:
- Sistema de diseño ya definido en `tokens.css` (pégalo tal cual, no lo regeneres) — ver sección
  "Sistema de diseño" más abajo. Paleta sage-green con tres colores por dimensión: `--naranja-300` =
  Justicia, `--azul-300` = Salud, `--verde-300` = Determinantes Sociales.
- Datos reales en `localidades.json` (centrado en localidad) y `variables.json` (centrado en variable)
- Un prototipo standalone previo (scrollytelling) que validó la arquitectura antes de integrar a WordPress
- **Un segundo prototipo standalone ya construido** de este mismo "Explorador de Datos" (`radial-chart.js`
  + `locality-card.js` + `timeline-control.js`), con el gráfico radial principal usando una lógica de
  posicionamiento por "eje dominante" (baricéntrica/ternaria). **Esta iteración NO es construir desde
  cero** — es reemplazar solo la lógica y el render del gráfico principal por una arquitectura nueva
  (ver "Qué cambia respecto al prototipo actual" más abajo). El resto del prototipo (header, donas de
  estadística, tabs, selector de año) se mantiene igual y no se debe tocar salvo que algo dependa
  directamente de la forma antigua del gráfico.

## Sistema de diseño (usar tal cual, no inventar valores nuevos)

Este es el `tokens.css` real del proyecto. Úsalo directamente en `css/tokens.css` del prototipo —
no generes colores, tipografías ni escalas nuevas. Si necesitas un valor que no está aquí (por ejemplo
un espaciado), avísame en vez de inventarlo.

```css
:root {
    /* ============================================
	   COLOR — Primitivos
	   Valores crudos, tal como salen del Figma.
	   No se usan directamente en componentes.
	   ============================================ */


    /*Naranja*/
    --naranja-100: #FDE3D1;
    --naranja-200: #F2986C;
    --naranja-300: #EA5825;
    --naranja-400: #B73508;

    /*Azul*/
    --azul-100: #C2D6E0;
    --azul-200: #8BC0C7;
    --azul-300: #5D9EB6;
    --azul-400: #2B72A1;

    /*Verde*/
    --verde-100: #D3DEC9;
    --verde-200: #ABC5B5;
    --verde-300: #32814B;
    --verde-400: #98BC66;
    --verde-500: #7DA450;

    /*Primitivos generales*/
    --verde-gris-100: #D3DEC9;
    --verde-gris-200: #CED9C4;
    --verde-gris-300: #C3CCB5;
    --verde-gris-400: #AFBB9A;

    --crema: #FFF3E4;
    --verde-fuerte: #083D00;

    --negro: #000000;
    --blanco: #ffffff;

    /*Colores con opacidad*/
    --gris-100-20: color-mix(in srgb, #6E6E6E 20%, transparent);
    --gris-200-20: color-mix(in srgb, #7DA450 20%, transparent);
    --gris-300-20: color-mix(in srgb, #E2E2E2 20%, transparent);

    /* ============================================
	   COLOR — Semánticos
	   Con propósito. Referencian a los primitivos.
	   Estos SÍ se usan en los componentes.
	   ============================================ */

       
    /*Fondo*/
    --color-bg: var(--verde-gris-100);

    /*Interactive*/
    --color-primary-hover: var(--crema);

    /*Textos*/
    --color-text-primary: var(--verde-fuerte);
    --color-text-secondary: var(--negro);
    
    --color-text-decoration-salud: var(--azul-300);
    --color-text-decoration-justicia: var(--naranja-300);
    --color-text-decoration-determinantes: var(--verde-300);
    --color-text-decoration-generico: var(--verde-200);

    /* Verde exclusivo de las vistas compuestas (Patrón F + anillo
       compuesto) — confirmado contra Figma real, distinto de
       --verde-300/determinantes que usan las vistas de una sola dimensión. */
    --color-dimension-compuesto-determinantes: var(--verde-500);

    /*Decorativos*/
    --color-decorative-grid: var(--verde-fuerte);

    /*Bordes*/
    --color-callout-border: color-mix(in srgb, var(--verde-fuerte) 30%, transparent);

    /*Fondo callout — override puntual para mejor contraste, solo determinantes*/
    --color-callout-bg-determinantes: var(--verde-400);

    /* ============================================
       TIPOGRAFÍA
       ============================================ */

    --font-primary: 'Sora', sans-serif;

    --text-data-1: 600 2.5rem/1 var(--font-primary);
    --text-body-primary: 400 1.5rem/1.625rem var(--font-primary);
    --text-caption-source: 400 0.75rem/1.625rem var(--font-primary);
    --text-heading-1: 600 4rem/1 var(--font-primary);
    --text-heading-1-tracking: -3.84px;

}
```

**Mapeo directo para este componente:**
- Eje/dimensión Justicia → `--color-text-decoration-justicia` (`--naranja-300`)
- Eje/dimensión Salud → `--color-text-decoration-salud` (`--azul-300`)
- Eje/dimensión Determinantes Sociales → `--color-text-decoration-determinantes` (`--verde-300`)
  — **ojo**: si en algún momento este gráfico necesita una vista "compuesta" (las 3 dimensiones a la
  vez, como aquí), usa `--color-dimension-compuesto-determinantes` (`--verde-500`) para el segmento de
  determinantes en vez de `--verde-300`, siguiendo la excepción ya documentada en el sistema.
- Título principal ("Índice de Derecho a la Salud – IDES") → `--text-heading-1` +
  `--text-heading-1-tracking`
- Subtítulo ("Pediatría Bogotá") → puede usar una variante entre `--text-heading-1` y
  `--text-body-primary`; confírmame el tamaño exacto si no calza con ninguno existente
- Valores numéricos grandes ("20/100", "20 Localidades analizadas") → `--text-data-1`
- Texto de cuerpo / explicaciones → `--text-body-primary`
- Texto de fuente/caption pequeño → `--text-caption-source`
- Color de texto general → `--color-text-primary` (`--verde-fuerte`)
- Fondo de página → `--color-bg`
- Bordes de tarjetas/callouts (como la tarjeta de detalle de localidad) → `--color-callout-border`

**Regla de trabajo**: antes de escribir cualquier lógica de posicionamiento, inspecciona
`localidades.json` y `variables.json` reales — no asumas el esquema. Pégamelos o léelos del proyecto
antes de codear la parte de datos.

## Objetivo de esta iteración

Construir un **prototipo HTML standalone** (fuera de WordPress, igual que hicimos con el prototipo de
scrollytelling) que replique el "Explorador de Datos" tal como está en Figma
(node `93:40`, archivo `ides-bogota`), usando los datos reales de localidades y con la animación de
evolución temporal 2022–2024 funcionando. **No integrar a WordPress todavía** — esto es solo para
validar la arquitectura visual e interactiva.

## Qué cambia respecto al prototipo actual (leer antes de tocar código)

El gráfico principal actual posiciona cada localidad con una lógica de "eje dominante" (baricéntrica):
el ángulo se calculaba a partir de cuál de las 3 dimensiones pesaba más, y esto rompía en casos reales
— por ejemplo, una localidad alta y pareja en las tres dimensiones no tiene forma de representarse sin
"elegir" arbitrariamente un solo eje, y el ángulo se vuelve inestable cuando dos dimensiones están casi
empatadas. Ese enfoque queda **descartado por completo**, no es una corrección incremental.

**La nueva arquitectura, en una frase**: un abanico de 180° donde cada localidad tiene un ángulo fijo
(no derivado de sus puntajes) y una posición radial que sí es su IDES compuesto real; en reposo cada
localidad es solo un punto, y al pasar el cursor (o hacer foco por teclado) se revela su "rosa" — un
glifo de tres pétalos, uno por dimensión, contenido dentro de una elipse de tamaño fijo.

### Por qué esta arquitectura y no otra (contexto para que no se reintroduzcan los mismos bugs)

- **El ángulo nunca debe derivarse de los puntajes de la localidad.** Debe ser fijo, determinado por el
  **orden alfabético del nombre de la localidad**. Esto es importante por dos razones: (1) evita la
  inestabilidad matemática de intentar calcular un ángulo "significativo" a partir de 3 valores que
  pueden estar empatados o los tres altos a la vez: geométricamente es imposible que un solo punto esté
  cerca de las 3 direcciones de eje simultáneamente; y (2) garantiza que cada localidad ocupe siempre el
  mismo lugar entre 2022, 2023 y 2024 — si el ángulo dependiera del ranking o de algún puntaje, la
  localidad "saltaría" de posición cada vez que cambia el año, lo cual haría ilegible la animación de
  "Reproducir evolución".
- **El radio (distancia del centro del abanico a la localidad) es 100% el `indice_compuesto` real de esa
  localidad para el año activo** — 0 en el centro, 100 en el borde. No promedies las 3 dimensiones para
  esto: usa el campo `indice_compuesto` tal como está en `localidades.json`.
- **Los 3 pétalos de la rosa (Justicia, Salud, Determinantes) NUNCA deben escalar contra la misma escala
  0–100 que usa el radio de posición.** Deben escalar contra un radio máximo *fijo y local* (el tamaño de
  la elipse contenedora, ver más abajo). Si los pétalos escalan contra la escala global, una localidad
  con una dimensión muy alta "se sale" visualmente de su propio anillo de referencia y ya no coincide con
  su posición real — esto ya lo probamos y es un bug fácil de reintroducir sin querer.
- **La rosa completa (elipse + 3 pétalos) solo se dibuja para la localidad bajo el cursor o con foco.**
  En reposo, todas las localidades son solo un punto pequeño + una línea guía fina hacia el centro del
  abanico. Esto es deliberado, no un placeholder: con 20 localidades y solo 180° de espacio, dibujar las
  20 rosas completas simultáneamente genera solapamiento entre localidades vecinas (sobre todo las que
  tienen un `indice_compuesto` similar). El hover/focus es la solución que escala sin importar cuántas
  localidades haya, no un ajuste estético.

### Especificación exacta

**Geometría del abanico:**
```
HX, HY   = centro del abanico (hub), en la parte inferior del contenedor
MAXR     = radio máximo del abanico (borde = indice_compuesto de 100)
N        = 20 (número de localidades)
i        = índice de la localidad en orden alfabético (0 a 19)
ángulo_i = -180 + i * (180 / (N - 1))   // grados, -180 = izquierda, -90 = arriba, 0 = derecha
radio_i  = (indice_compuesto_i / 100) * MAXR
cx_i     = HX + radio_i * cos(ángulo_i en radianes)
cy_i     = HY + radio_i * sin(ángulo_i en radianes)
```

**Estado en reposo, por localidad:**
- Línea guía fina desde `(HX, HY)` hasta `(cx_i, cy_i)` — siempre visible, color neutro/tenue.
- Punto pequeño en `(cx_i, cy_i)` — siempre visible.
- Nada más. Sin elipse, sin pétalos, sin texto.

**Estado hover/focus, por localidad:**
- Elipse de tamaño **fijo** (mismo `rx`/`ry` para las 20, no varía con los datos) centrada exactamente en
  `(cx_i, cy_i)`.
- 3 sectores tipo "cuña" (`path` con arco, ver ejemplo de implementación abajo), en direcciones fijas
  respecto al centro de la elipse: Justicia a -90° (arriba), Salud a 30°, Determinantes a 150° — mismas
  direcciones para las 20 localidades. Cada cuña ocupa 120° (sin espacio entre ellas, se tocan).
- El radio de cada cuña es: `radioMínimo + (puntaje/100) * (radioMáximoElipse - radioMínimo)`, donde
  `radioMáximoElipse` es el `ry` de la elipse contenedora (o el valor menor entre `rx`/`ry` si no es
  circular) — **nunca** la escala 0–100 global del abanico.
- Colores de las cuñas: Justicia `--naranja-300`, Salud `--azul-300`, Determinantes `--verde-300`.
- Etiqueta con nombre + `indice_compuesto` aparece junto a la elipse.
- Transición de entrada: la elipse y los pétalos escalan desde ~5% hasta 100% con
  `transform-origin: center` (usa `transform-box: fill-box` en CSS, o recalcula el `path`/`ellipse` si
  prefieres animarlo con D3 `transition()`), no un simple fundido — debe sentirse como que "florece" desde
  el punto de reposo. Respeta `prefers-reduced-motion` (sin animación de escala, solo fundido, si el
  usuario lo tiene activado).
- Accesible por teclado: cada localidad debe ser enfocable (`tabindex="0"` o equivalente) y el estado
  hover debe replicarse en `:focus-visible`.

**Ejemplo de referencia para el cálculo de las cuñas** (adapta a cómo esté estructurado el resto del
código, esto es solo para que la geometría quede clara):
```js
function sectorPath(cx, cy, anguloCentro, medioAngulo, radio) {
  const a1 = toRad(anguloCentro - medioAngulo), a2 = toRad(anguloCentro + medioAngulo);
  const x1 = cx + radio * Math.cos(a1), y1 = cy + radio * Math.sin(a1);
  const x2 = cx + radio * Math.cos(a2), y2 = cy + radio * Math.sin(a2);
  return `M${cx},${cy} L${x1},${y1} A${radio},${radio} 0 0,1 ${x2},${y2} Z`;
}
// medioAngulo = 60 (para que cada cuña ocupe 120° completos, sin espacio entre ellas)
```

**Interacción con el selector de año:** al cambiar de año, `ángulo_i` **no cambia nunca** (sigue siendo
alfabético y fijo) — solo `radio_i` se recalcula con el `indice_compuesto` del año nuevo, y la posición
del punto/línea guía se anima con transición hacia su nuevo radio. "Reproducir evolución" anima esta
misma transición en secuencia por los 3 años.

**Smoke test antes de dar por buena la implementación:** usa Santa Fe (`indice_compuesto` 88 en 2024,
Justicia 53, Salud 77, Determinantes 94) — confirma que (1) su punto en reposo cae casi en el borde
del abanico, no en el centro; (2) al hacer hover, el pétalo de Determinantes es visiblemente el más
largo de los tres pero **nunca sobrepasa el borde de su propia elipse**; (3) si cambias el año a 2022 o
2023, el punto de Santa Fe se mueve en línea recta hacia el centro o el borde (según el `indice_compuesto`
de ese año), pero permanece en el mismo ángulo — nunca "salta" a otra parte del abanico.

## Qué construir

### Estructura de archivos (modifica el prototipo existente, no lo reconstruyas)
```
prototipo-explorador/
├── index.html
├── css/
│   ├── tokens.css        (ya existe, no tocar)
│   └── explorador.css    (agrega los estilos del abanico y la animación hover→rosa aquí)
├── js/
│   ├── fan-chart.js          (NUEVO — reemplaza la lógica de posicionamiento de radial-chart.js;
│   │                           renombra el archivo o el módulo, como prefieras, pero la lógica de
│   │                           "eje dominante" debe desaparecer del código, no quedar comentada)
│   ├── locality-rose.js      (NUEVO — el glifo de rosa: elipse + 3 cuñas, reutilizable tanto para el
│   │                           hover del abanico como, más adelante, para la tarjeta de detalle)
│   ├── locality-card.js      (existente — sin cambios en esta iteración)
│   ├── timeline-control.js   (existente — sin cambios en esta iteración, salvo que ahora solo anima
│   │                           el radio de cada punto, nunca el ángulo)
│   └── stats-donuts.js       (existente — sin cambios)
└── data/
    └── localidades.json  (ya existe, usa el campo `indice_compuesto` real de cada año)
```

### Componentes visuales (referencia: captura de Figma adjunta)

1. **Nav superior** — 5 items (Inicio, Explorador de Datos, Indicadores, Metodología, Contacto), solo
   estático por ahora, no necesita routing real.
2. **Header** — título "Índice de Derecho a la Salud – IDES" con subrayado, subtítulo "Pediatría Bogotá",
   3 donas de estadística (20 localidades / 30 indicadores / 5 fuentes), cada una con anillo de color
   distinto (naranja, azul, verde).
3. **Abanico principal (reemplaza el gráfico radial anterior)** — semicírculo de 180° con arcos
   concéntricos de fondo (guía visual, no necesitan números). Las 20 localidades siguen la geometría
   descrita en "Qué cambia respecto al prototipo actual": en reposo, solo puntos + líneas guía; al hacer
   hover/focus sobre una, aparece su rosa (elipse de tamaño fijo + 3 cuñas). El click, además, sigue
   abriendo la tarjeta de detalle existente a la derecha (no cambia respecto al prototipo actual):
   - nombre de la localidad + año activo
   - barra + valor "XX/100" por cada dimensión (color correspondiente)
   - botón "Ver localidad" (por ahora sin destino real, solo placeholder)
4. **Fila de tabs** — "Pediatría Bogotá" (activo), "Localidades", dropdown "Filtrar por localidad".
   Para este prototipo basta con que el tab activo cambie de estilo; el filtro puede quedar como
   estructura visual sin lógica de filtrado real todavía (lo definimos en la siguiente iteración).
5. **Controles de tiempo** — selector 2024/2023/2022 + botón "▶ Reproducir evolución": al activarse,
   anima con transición D3 (`transition().duration()`) la posición de todas las localidades entre los
   3 años en secuencia.
6. **Diagrama explicativo secundario** — versión reducida del mismo gráfico (una sola localidad de
   ejemplo, "Usme") con el texto pedagógico al lado explicando cómo leer el gráfico. Es estático, no
   interactivo.

## Datos que necesitas

Antes de escribir `radial-chart.js`, léeme (o pídeme) la estructura real de `localidades.json` para
confirmar: nombre de campos por localidad, si ya trae los puntajes por año (2022/2023/2024) o solo el
año actual, y si las 3 dimensiones vienen normalizadas 0–100 o en otra escala.

## Fuera de alcance para esta iteración

- Integración a WordPress (eso viene después, cuando el prototipo esté validado)
- Filtro por localidad funcional (solo estructura visual del dropdown)
- Responsive/mobile (nos enfocamos en validar la arquitectura de escritorio primero)
- Ruta real del botón "Ver localidad"

## Validación

Esta es una migración sobre un prototipo que ya funciona, así que valida en este orden:

1. Confirma que el resto del prototipo (header, donas, tabs, selector de año) sigue funcionando igual
   que antes de tocar nada — screenshot antes de empezar como referencia de "no rompí lo que ya andaba".
2. Implementa primero el estado en reposo (puntos + líneas guía, sin rosas) y corre el smoke test de
   Santa Fe descrito arriba antes de tocar el hover.
3. Agrega el hover/focus con la rosa. Verifica con el smoke test completo (los 3 puntos: posición,
   pétalos contenidos, comportamiento al cambiar de año).
4. Confirma con Playwright que el ángulo de cada localidad es idéntico entre 2022, 2023 y 2024 (mismo
   `cx`/`cy` proporcional al mismo ángulo, solo cambia el radio) — esto es fácil de romper sin darte
   cuenta si el orden de iteración de las localidades no es estable.
5. Tómame un screenshot en cada paso antes de seguir al siguiente.
