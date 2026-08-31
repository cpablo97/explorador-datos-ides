Quiero crear la plantilla de "Ficha técnica" de un indicador individual — la página de 
detalle a la que enlaza cada botón "→" de la grilla de indicadores por dimensión (Salud, 
Justicia, Determinantes) que acabamos de construir. Es la MISMA plantilla para las 3 
dimensiones; solo cambia el color de la celda superior izquierda, el donut, y los datos 
del indicador.

CONTEXTO
Ya existen los prototipos de Metodología, Espacios participativos, la landing de Fichas 
técnicas, y las páginas agrupadoras por dimensión (Salud/Justicia/Determinantes). Esta 
plantilla reutiliza navbar, patrón de fondo, design tokens y `stats-donuts.js` (donut 
individual, ya usado en las páginas agrupadoras) — con el mismo color de dimensión que 
la página que enlaza a esta ficha.

ANTES DE ESCRIBIR CÓDIGO:
1. Localiza el componente de navbar, el patrón de fondo, los design tokens, `stats-donuts.js` 
   y el componente de botón ya usados en páginas anteriores — reutilízalos.
2. Este es un COMPONENTE/PLANTILLA parametrizable, no 3 páginas separadas. Piensa en la 
   estructura de datos de un indicador como:
   {
     nombre_indicador, dimension, color_dimension,
     definicion, por_que_es_relevante,
     periodo_medicion, cobertura, unidad_medicion,
     fuente, metodo, formula_calculo,
     parametros_normalizacion, fuente_consulta_apa,
     pdf_url
   }
   La plantilla renderiza estos campos en el grid de celdas que se ve en el diseño.
3. CONECTA esta plantilla con la página agrupadora de indicadores por dimensión que 
   construimos antes: cada botón "→" de esa grilla debe apuntar a una instancia de esta 
   plantilla con los datos correspondientes al indicador (en el prototipo, usa un routing 
   simple basado en query param o hash, ej. `ficha.html?id=indicador-1`, ya que no hay 
   backend todavía).

ESTRUCTURA DE LA PLANTILLA (basada en diseño de Figma, nodes 2009:12206 / 2011:12651 / 
2014:12835 — Salud / Justicia / Determinantes respectivamente)

Grid de 3 columnas x varias filas, con bordes de línea entre celdas (mismo patrón visual 
de grid que las páginas anteriores):

Fila 1:
  - Celda 1 (fondo sólido del color de la dimensión, ocupa toda la celda): nombre del 
    indicador
  - Celda 2: "Dimensión:" + valor (ej. "Salud")
  - Celda 3 (ocupa 1 columna, alineada a la derecha del grid): donut de `stats-donuts.js` 
    del color de la dimensión

Fila 2:
  - Celda 1 (rowspan más alto, definición suele ser más larga): "Definición:" + texto
  - Celda 2: "Periodo de medición:" + valor (ej. "2022 a 2025")
  - (celda 3 vacía en esta fila, el donut de arriba puede seguir ocupando el espacio)

Fila 3:
  - Celda 1: "Método:" + valor
  - Celda 2: "Cobertura:" + valor
  - Celda 3: "Fuente:" + valor

Fila 4:
  - Celda 1: "Fórmula de cálculo:" + valor
  - Celda 2: "Unidad de medición:" + valor
  - Celda 3: "¿Por qué es importante incluirlo en IDES?" + texto

Fila 5:
  - Celda 1: "Consulte la fuente del dato aquí:" + cita APA
  - Celda 2: "Parámetros de normalización" + texto
  - (celda 3 vacía)

Fila 6 (footer):
  - Botón centrado, relleno del color de la dimensión: "↓ Descarga en PDF"

DATOS DE EJEMPLO
Usa datos de ejemplo realistas para 1 indicador de Salud (puedes usar el mismo texto 
placeholder "Nombre hiperlargo aquí que puede ser..." donde el diseño lo usa como relleno), 
y construye también 1 instancia de ejemplo para Justicia y 1 para Determinantes, cada una 
con su color correspondiente, para confirmar que el parametrizado por color funciona 
correctamente en las 3.

COMPORTAMIENTO RESPONSIVE
- Desktop: grid de 3 columnas como se describe arriba.
- Mobile (~768px): todo se apila en una sola columna, celda por celda, en el mismo orden 
  de lectura de arriba hacia abajo, izquierda a derecha, que se ve en el diseño.
- El patrón de fondo debe seguir aplicándose por fila también en mobile.

ENTREGABLE
Un único archivo prototipo (HTML+CSS+JS, sin build step, mismo patrón que las páginas 
anteriores) con: la plantilla parametrizada, las 3 instancias de ejemplo, y la conexión 
funcional desde la grilla de indicadores por dimensión (los botones "→" deben navegar a la 
ficha correspondiente). Toma capturas con Playwright en desktop y mobile de al menos 2 de 
las 3 instancias al terminar.