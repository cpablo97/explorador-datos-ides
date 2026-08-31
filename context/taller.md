Quiero crear la plantilla de detalle de "Taller", que se reutiliza para cada uno de los 
talleres/pilotos/laboratorios listados en la página de Espacios participativos. Cada botón 
de esa página ("Conozca sobre el taller →", "Conozca sobre el piloto →", etc.) debe apuntar 
a una instancia de esta misma plantilla con contenido distinto.

CONTEXTO
Ya existen los prototipos de Metodología y Espacios participativos, con navbar, patrón de 
fondo de círculos punteados, botón "outline con flecha" y design tokens ya reutilizados 
desde el Explorador de Datos. Esta plantilla reutiliza el navbar y los design tokens, pero 
NO usa el grid 2x2 de tarjetas — es un layout distinto (detalle de contenido).

ANTES DE ESCRIBIR CÓDIGO:
1. Localiza el componente de navbar ya usado en las páginas anteriores y reutilízalo.
2. Localiza los design tokens de color y tipografía ya usados y reutilízalos (no hardcodees 
   hex).
3. Este es un COMPONENTE/PLANTILLA parametrizable, no una página fija — constrúyelo para 
   recibir: título, una imagen (foto real, no ilustración), y un cuerpo de texto (uno o más 
   párrafos). Piensa en la estructura de datos como si cada taller fuera un objeto 
   {titulo, imagen, parrafos: []} y la plantilla simplemente renderiza esos datos.

ESTRUCTURA DE LA PLANTILLA (basada en diseño de Figma, node 2132:1500)

1. Navbar (reutilizado, sin cambios)

2. Encabezado de la plantilla:
   - Título (Sora, ~64px, subrayado) — ej: "Taller 1: Definiendo el acceso a la Salud 
     Pediátrica"
   - A la derecha, una fotografía real del taller/evento (no ilustración ni pie chart) — 
     ocupa aprox. la misma altura que el bloque del título

3. Cuerpo de texto debajo, ancho limitado (no full-width, respeta el margen del diseño):
   - Párrafo(s) descriptivos del taller. Para el Taller 1 usa este texto de ejemplo:
     "El primer taller se centró en construir colectivamente la definición de acceso a la 
     salud pediátrica por medio de la justicia, estableciendo la base conceptual del 
     Índice. Para ello, los participantes se organizaron en tres mesas de trabajo: personas 
     cuidadoras, profesionales de pediatría y salud, y profesionales del derecho, incluyendo 
     jueces y abogados.

     En cada mesa se realizaron ejercicios de lluvia de ideas y agrupación de conceptos 
     (clustering), a partir de los cuales se identificaron y organizaron los principales 
     elementos asociados al acceso a la salud pediátrica desde cada perspectiva. 
     Posteriormente, cada grupo construyó y presentó su propia definición al resto de los 
     participantes, generando un espacio de intercambio y contraste entre las diferentes 
     perspectivas profesionales y experienciales."

NOTA IMPORTANTE SOBRE EL DISEÑO DE FIGMA
Debajo del cuerpo de texto, el diseño de Figma tiene un bloque gris grande (~660px de alto) 
sin ningún contenido definido — parece un placeholder de diseño, no una sección intencional. 
NO lo repliques como una caja gris vacía. Dos opciones:
  a) Omítelo por completo en esta primera pasada del prototipo, dejando que la página 
     termine después del cuerpo de texto.
  b) Si crees que es evidente que ahí va contenido futuro (ej. galería de fotos adicionales, 
     recursos descargables), déjalo como una sección vacía comentada en el código, marcada 
     claramente como TODO, para que se decida más adelante.
Yo prefiero la opción (a) por ahora — confírmame si tiene sentido antes de asumir la (b).

CÓMO SE INSTANCIA
Como es una plantilla, construye al menos 2 instancias de ejemplo para validar que 
funciona con contenido de distinta longitud:
  - Taller 1 (contenido de arriba)
  - Piloto: Laboratorio consenso entre expertos (usa un texto placeholder breve de 1 
    párrafo, ya que no tengo el contenido real todavía — márcalo claramente como texto de 
    prueba)

COMPORTAMIENTO RESPONSIVE
- Desktop: título a la izquierda, imagen a la derecha, en la misma fila.
- Mobile (~768px): título arriba, imagen debajo (apilados), luego el cuerpo de texto a 
  ancho completo.

MANEJO DE IMÁGENES
La foto del taller es contenido real (no un asset decorativo del sistema de diseño). Por 
ahora, como es un prototipo standalone, usa una imagen de placeholder libre de derechos con 
las mismas proporciones, y dejá un comentario indicando que esta imagen debe reemplazarse 
por la foto real del evento (o gestionarse como campo ACF de imagen cuando se migre a 
WordPress).

ENTREGABLE
Un archivo prototipo (HTML+CSS+JS, sin build step) con el componente de plantilla y las 2 
instancias de ejemplo, que pueda abrirse directamente en el navegador para validar antes de 
integrarlo a WordPress. Toma capturas con Playwright en desktop y mobile de ambas instancias 
al terminar.