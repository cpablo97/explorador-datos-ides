Quiero crear una página prototipo standalone para la sección de Metodología de IDES Bogotá, 
todavía sin integrar a WordPress (es un experimento de validación, igual que hicimos con el 
prototipo de scrollytelling v3).

CONTEXTO DEL REPO
Este repo ya tiene un Explorador de Datos funcionando con:
- Un componente de navbar (Inicio / Explorador de Datos / Indicadores / Metodología / Contacto)
- Botones con estilo "outline" (borde, sin relleno, con flecha "→")
- Un sistema de design tokens en CSS custom properties (primitivos en español, semánticos en 
  inglés)
- Un patrón de fondo de círculos punteados, ya implementado como componente/asset reutilizable
- Un componente de círculos tipo "pie chart" con wedges de 120° y los colores de las 3 
  dimensiones (Justicia/naranja, Salud/azul, Determinantes/verde) — el mismo patrón usado en 
  locality-rose.js o una variante ya extraída como componente independiente
- Tipografía Sora para títulos, Inter para cuerpo de texto

ANTES DE ESCRIBIR CÓDIGO:
1. Localiza el archivo/componente de navbar que ya existe y reutilízalo tal cual — no lo 
   reconstruyas desde cero.
2. Localiza el componente/clase de botón "outline con flecha" que ya se usa y reutilízalo.
3. Localiza el archivo de design tokens (variables CSS) y usa los tokens existentes para 
   colores, no hardcodees hex. Si no existe un token para verde oscuro (#083d00 aprox.) o 
   verde claro de fondo (#d3dec9 aprox.), dime cuáles son los tokens más cercanos antes de 
   decidir.
4. Localiza el patrón de fondo de círculos punteados ya creado en el proyecto y reutilízalo 
   igual — no lo recrees. Aplícalo detrás de cada fila del grid (hero, fila de tarjetas 1-2, 
   fila de tarjetas 3-4).
5. Localiza el componente de círculos tipo "pie chart" (wedges de 120°, colores de las 3 
   dimensiones) y reutilízalo para los 3 círculos decorativos del hero. No generes un SVG 
   nuevo ni descargues assets de Figma para esto — el componente ya existe en el proyecto.

Todos los elementos visuales de esta página ya existen como componentes en el proyecto del 
Explorador de Datos. No se debe generar ni descargar ningún asset nuevo — el trabajo de esta 
página es composición y layout (grid 2x2 + responsive), no creación de componentes visuales.

ESTRUCTURA DE LA PÁGINA (basada en diseño de Figma, node 2015:13140)

1. Navbar (reutilizado, sin cambios)

2. Hero de metodología:
   - Título (Sora, ~64px, subrayado): "Metodología del Índice de Derecho a la Salud - IDES"
   - Al lado, los 3 círculos tipo "pie chart" reutilizados (naranja/azul/verde)
   - Texto descriptivo: "Aquí podrá explorar cómo se mide el derecho a la salud pediátrica 
     para IDES, qué definiciones y fuentes sustentan el índice y cómo se desarrolló el 
     proceso de construcción."

3. Grid 2x2 de tarjetas (CSS Grid real, no posiciones absolutas como en el export de Figma):

   Tarjeta 1 — "Espacios participativos"
     Texto: "Conozca los espacios de participación y los talleres realizados para validar 
     y fortalecer el Índice de Derecho a la Salud."
     Botón: "Explore los espacios →"

   Tarjeta 2 — "Fuentes"
     Texto: "Consulte las fuentes de información de las que provienen los datos que 
     sustentan el Índice."
     Botón: "Explore las fuentes →"

   Tarjeta 3 — "Glosario"
     Texto: "Explore los conceptos que le ayudarán a comprender cómo se construye e 
     interpreta el Índice de Derecho a la Salud."
     Botón: "Explore los conceptos →"

   Tarjeta 4 — "Proceso"
     Texto: "Conozca las etapas y decisiones que dieron forma al Índice de Derecho a 
     la Salud."
     Botón: "Conozca el proceso →"

   Cada tarjeta tiene su título en Sora ~40px y separadores de línea entre tarjetas.

COMPORTAMIENTO RESPONSIVE
- Desktop: grid de 2 columnas x 2 filas para las tarjetas, hero con título+círculos a la 
  izquierda y descripción a la derecha.
- Mobile (breakpoint a definir con el resto del sitio, probablemente 768px): todo se apila 
  en una sola columna, un contenedor debajo del otro, en este orden: navbar → hero (título, 
  luego círculos, luego descripción) → tarjeta 1 → tarjeta 2 → tarjeta 3 → tarjeta 4.
- Los círculos del hero pueden reducirse de tamaño en mobile pero no deben eliminarse.
- El patrón de fondo debe seguir aplicándose por fila incluso en el layout apilado de mobile.

ENTREGABLE
Un único archivo prototipo (HTML+CSS+JS, sin build step, siguiendo el mismo patrón que el 
prototipo de scrollytelling) que pueda abrir directamente en el navegador para validar antes 
de integrarlo a WordPress. Toma capturas con Playwright en desktop y mobile al terminar.