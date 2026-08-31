Quiero crear la página "índice de fichas técnicas por dimensión" — la página agrupadora que 
lista todos los indicadores de una dimensión y enlaza a cada ficha técnica individual. Es la 
MISMA plantilla para las 3 dimensiones (Salud, Justicia, Determinantes sociales); solo 
cambian el color, el título y la lista de indicadores.

CONTEXTO
Ya existen los prototipos de Metodología, Espacios participativos, y la landing de Fichas 
técnicas (bajo "Indicadores"). Esta página reutiliza navbar, patrón de fondo, design tokens 
y `stats-donuts.js` (igual que en la landing de Fichas técnicas) — pero aquí el donut es UNO 
solo, del color de la dimensión (no los 3 donuts combinados de la landing anterior).

ANTES DE ESCRIBIR CÓDIGO:
1. Localiza el componente de navbar, el patrón de fondo, los design tokens y `stats-donuts.js` 
   ya usados en páginas anteriores — reutilízalos.
2. Este es un COMPONENTE/PLANTILLA parametrizable, no 3 páginas separadas. Piensa en la 
   estructura de datos como: {dimension: "Salud", color: "#5d9eb6", indicadores: [{nombre, 
   href}, ...]}. La plantilla renderiza el título, el donut coloreado, y la grilla a partir 
   de esos datos.
3. Confirma si el botón cuadrado con flecha (usado en cada tarjeta de indicador) es una 
   variante compacta del mismo botón "outline con flecha"/relleno ya usado en páginas 
   anteriores, o si es un componente distinto — reutilízalo, no lo reconstruyas.

ESTRUCTURA DE LA PÁGINA (basada en diseño de Figma, nodes 2007:11783 / 2009:12002 / 
2009:12104 — Salud / Justicia / Determinantes respectivamente)

1. Navbar (reutilizado, sin cambios)

2. Hero:
   - Título (Sora, ~64px, subrayado, dos líneas de color distinto): 
     "Consulte las fichas técnicas de los indicadores en" (subrayado en verde neutro) + 
     "{Dimensión}" en línea aparte, subrayado en el color de la dimensión
   - A la derecha, UN donut de `stats-donuts.js` del color de la dimensión (círculo grande, 
     ocupa el ancho de la columna derecha)

3. Grid de indicadores — 3 columnas, filas dinámicas según la cantidad de indicadores 
   (NO fijar en 4 filas / 12 celdas — el número de indicadores varía por dimensión y debe 
   ajustar el número de filas automáticamente, dejando celdas vacías al final de la última 
   fila si no se completa):
   
   Cada celda de indicador tiene:
     - Nombre del indicador (Inter 24px, puede ocupar hasta 3 líneas — usar texto de ejemplo 
       "Nombre hiperlargo aquí que puede ser hasta de 3 líneas porque es muy largo." como 
       placeholder para validar el wrap)
     - Botón cuadrado pequeño con flecha "→", relleno del color de la dimensión, alineado 
       abajo a la derecha de la celda — enlaza a la ficha técnica individual de ese 
       indicador (aún no construida — usar placeholder/ancla por ahora)

DATOS DE EJEMPLO PARA LAS 3 INSTANCIAS
Construye 3 instancias de prueba usando la plantilla:
   - Salud — azul #5d9eb6 — 10 indicadores de ejemplo (todos con el texto placeholder de 
     arriba, para validar que la grilla deja las últimas 2 celdas vacías correctamente)
   - Justicia — naranja #ea5825 — usa un número distinto de indicadores de ejemplo (ej. 7), 
     para confirmar que la grilla se ajusta bien con cualquier cantidad
   - Determinantes sociales — verde #98bc66 — usa otro número distinto (ej. 12, para 
     validar el caso en que la grilla se completa exactamente sin celdas vacías)

COMPORTAMIENTO RESPONSIVE
- Desktop: hero con título a la izquierda y donut a la derecha; grid de 3 columnas para los 
  indicadores.
- Mobile (~768px): hero apilado (título, luego donut); grid de indicadores a 1 columna.
- El patrón de fondo debe seguir aplicándose por fila también en mobile.

ENTREGABLE
Un único archivo prototipo (HTML+CSS+JS, sin build step, mismo patrón que las páginas 
anteriores) con la plantilla y las 3 instancias de ejemplo (Salud, Justicia, Determinantes), 
que pueda abrirse directamente en el navegador para validar antes de integrar a WordPress. 
Toma capturas con Playwright en desktop y mobile de las 3 instancias al terminar, prestando 
especial atención a cómo se comporta la grilla con distintas cantidades de indicadores.