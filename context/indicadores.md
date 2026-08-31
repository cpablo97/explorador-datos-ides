Quiero crear la página de aterrizaje de "Fichas técnicas de indicadores", que vive bajo el 
link "Indicadores" del menú principal. Sigue el mismo patrón de reutilización de las páginas 
anteriores (Metodología, Espacios participativos).

CONTEXTO
Ya existen los prototipos de Metodología y Espacios participativos, con navbar, patrón de 
fondo de círculos punteados, botón "outline con flecha" y design tokens reutilizados desde 
el Explorador de Datos. Esta página reutiliza esos mismos componentes, PERO con una 
diferencia importante: los círculos decorativos de esta página NO usan el componente de 
pie chart / wedges de locality-rose.js — usan el componente `stats-donuts.js` que ya existe 
en el proyecto.

ANTES DE ESCRIBIR CÓDIGO:
1. Localiza el componente de navbar, el botón "outline con flecha", el patrón de fondo de 
   círculos punteados y los design tokens ya usados en las páginas anteriores — reutilízalos 
   sin duplicar código.
2. Localiza el archivo `stats-donuts.js` en el proyecto y entiende su API (qué props/params 
   recibe: colores, porcentajes, número de segmentos, etc.) antes de instanciarlo. Úsalo 
   para los 3 círculos decorativos del hero (uno por dimensión: Salud/azul, Justicia/
   naranja, Determinantes/verde).
3. En el diseño también hay una barra horizontal de progreso por cada dimensión (ej. 
   "10/100", "20/100", "60/100") a la derecha de cada fila — revisa si esto también es 
   parte de `stats-donuts.js` (quizás tiene un modo "barra" además del modo "dona") o si es 
   un componente distinto ya existente en el proyecto. No lo reconstruyas si ya existe — 
   confírmame si no encuentras un componente reutilizable para esto antes de crear uno 
   nuevo desde cero.

ESTRUCTURA DE LA PÁGINA (basada en diseño de Figma, node 1980:7221)

1. Navbar (reutilizado, sin cambios)

2. Hero:
   - Título (Sora, ~64px, subrayado): "Consulte las fichas técnicas"
   - Subtítulo (Sora, ~40px, sin subrayar): "Pediatría Bogotá"
   - A la derecha, 3 donuts de `stats-donuts.js` en fila, uno por dimensión (colores: azul 
     Salud, naranja Justicia, verde Determinantes)
   - Debajo de los donuts, texto descriptivo: "Consulte la ficha técnica con definición, 
     cálculo y fuente de los indicadores que construyen el Índice de Derecho a la Salud 
     (IDES) con énfasis en pediatría y Bogotá."

3. Tres filas, una por dimensión (layout de 2 columnas: contenido a la izquierda, barra de 
   score a la derecha):

   Fila 1 — Salud (azul #5d9eb6)
     Título: "Salud" (Sora 64px, subrayado en azul)
     Subtítulo: "Indicadores que componen el índice de Salud"
     Botón (relleno azul): "Ver indicadores →"
     Barra de score a la derecha: 10/100

   Fila 2 — Justicia (naranja #ea5825)
     Título: "Justicia" (Sora 64px, subrayado en naranja)
     Subtítulo: "Indicadores que componen el índice de Justicia"
     Botón (relleno naranja): "Ver indicadores →"
     Barra de score a la derecha: 20/100

   Fila 3 — Determinantes sociales (verde #98bc66)
     Título: "Determinantes sociales" (Sora 64px, subrayado en verde)
     Subtítulo: "Indicadores que componen el índice de Determinantes Sociales"
     Botón (relleno verde): "Ver indicadores →"
     Barra de score a la derecha: 60/100

   Nota: a diferencia del botón "outline" usado en Metodología, estos botones aquí van 
   RELLENOS con el color de la dimensión — confirma que exista una variante "filled" del 
   componente de botón ya creado, o si hay que agregar un modificador nuevo sobre el 
   componente existente (no crear un botón distinto desde cero).

COMPORTAMIENTO RESPONSIVE
- Desktop: hero con título/subtítulo/descripción a la izquierda y los 3 donuts a la derecha; 
  cada fila de dimensión con contenido a la izquierda y barra de score a la derecha.
- Mobile (~768px): todo se apila en una sola columna — navbar → hero (título, subtítulo, 
  donuts, descripción) → fila Salud (contenido, luego barra) → fila Justicia → fila 
  Determinantes.
- El patrón de fondo debe seguir aplicándose por fila también en mobile.

DATOS DE EJEMPLO
Los valores 10/100, 20/100, 60/100 son de ejemplo — trátalos como datos mockeados/hardcoded 
por ahora, ya que vendrán de `localidades.json` o de un cálculo real más adelante. Deja un 
comentario claro indicando que estos valores son placeholder.

ENTREGABLE
Un único archivo prototipo (HTML+CSS+JS, sin build step, mismo patrón que las páginas 
anteriores) que pueda abrir directamente en el navegador para validar antes de integrarlo 
a WordPress. Toma capturas con Playwright en desktop y mobile al terminar.