Quiero crear la página interna de "Espacios participativos", dentro de la sección de 
Metodología de IDES Bogotá. Es un prototipo standalone, en el mismo espíritu que el 
prototipo de la página de Metodología que ya construimos — de hecho, esta página reutiliza 
la MISMA estructura de layout, así que arranca copiando esa página como base y ajusta el 
contenido.

CONTEXTO
Ya existe el prototipo de la página de Metodología con: navbar, hero (título + descripción + 
círculos "pie chart"), patrón de fondo de círculos punteados, y un grid 2x2 de tarjetas con 
botón "outline con flecha". Todos esos componentes (navbar, botón, patrón de fondo, pie 
chart, design tokens) están reutilizados desde el Explorador de Datos — sigue usando esos 
mismos componentes reales, no los reconstruyas.

ANTES DE ESCRIBIR CÓDIGO:
1. Abre el prototipo de la página de Metodología ya creado y úsalo como punto de partida 
   estructural (mismo navbar, mismo patrón de fondo por fila, mismo grid 2x2, mismos 
   design tokens).
2. Confirma que el componente de navbar, botón "outline con flecha", patrón de fondo y 
   design tokens sean los mismos ya localizados para la página de Metodología — reutilízalos 
   sin duplicar código.
3. El círculo del hero de esta página NO es el mismo componente que los 3 círculos de la 
   portada de Metodología — es una variante nueva: un solo círculo con un gajo por cada 
   dimensión (Justicia/naranja, Salud/azul, Determinantes/verde), usando los colores de 
   dimensión ya definidos en los tokens. Antes de construirlo, revisa cómo está hecho el 
   componente de pie chart existente (probablemente en locality-rose.js o donde vive la 
   lógica de wedges) y extiende esa misma lógica para aceptar un modo "un gajo por 
   dimensión" en vez del modo de 3 círculos separados — no reescribas la lógica de dibujo 
   de gajos desde cero.
4. Construye este componente de forma reutilizable (parámetros claros: colores, ángulos), 
   ya que probablemente se repita igual en las páginas de Fuentes, Glosario y Proceso — 
   confírmalo conmigo si tienes dudas sobre los colores/proporciones exactas antes de 
   asumir que aplica igual en las otras tres.

ESTRUCTURA DE LA PÁGINA (basada en diseño de Figma, node 2132:1631)

1. Navbar (reutilizado, sin cambios)

2. Hero de la sección:
   - Título (Sora, ~64px, subrayado): "Espacios participativos"
   - A la derecha, el círculo "un gajo por dimensión" (componente nuevo, ver punto 3 de 
     arriba)
   - Texto descriptivo: "Conozca los espacios de participación y los talleres realizados 
     para validar y fortalecer el Índice de Derecho a la Salud."

3. Grid 2x2 de tarjetas (mismo componente de grid + patrón de fondo que en Metodología):

   Tarjeta 1 — "Taller 1: Definiendo el acceso a la salud pediátrica"
     Botón: "Conozca sobre el taller →"

   Tarjeta 2 — "Taller 2: Validación y refinamiento de las definiciones"
     Botón: "Conozca sobre el taller →"

   Tarjeta 3 — "Piloto: Laboratorio consenso entre expertos"
     Botón: "Conozca sobre el piloto →"

   Tarjeta 4 — "Laboratorio consenso entre expertos"
     Botón: "Conozca sobre el laboratorio →"

   Nota: a diferencia de la página de Metodología, estas tarjetas NO tienen párrafo de 
   descripción — solo título (Sora ~40px) y botón. Respeta esa diferencia, no inventes 
   texto de relleno.

COMPORTAMIENTO RESPONSIVE
- Mismo comportamiento que la página de Metodología: en mobile (breakpoint ~768px) todo se 
  apila en una sola columna — navbar → hero (título, luego círculo, luego descripción) → 
  tarjeta 1 → tarjeta 2 → tarjeta 3 → tarjeta 4.
- El patrón de fondo debe seguir aplicándose por fila también en mobile.

NAVEGACIÓN
Cada botón "Conozca sobre..." debería apuntar a una futura página de detalle del taller/
piloto/laboratorio correspondiente (aún no construida — por ahora puede ser un enlace ancla 
o placeholder, dime qué prefieres si no está definido).

ENTREGABLE
Un único archivo prototipo (HTML+CSS+JS, sin build step, mismo patrón que las páginas 
anteriores) que pueda abrir directamente en el navegador para validar antes de integrarlo 
a WordPress. Toma capturas con Playwright en desktop y mobile al terminar.