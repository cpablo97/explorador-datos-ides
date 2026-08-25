Contexto: Estoy construyendo el componente de "detalle de localidad" para el
Explorador de Datos del proyecto IDES Bogotá. Ya tengo el cálculo de los
datos (rango inferior, cuartil inferior, promedio, mediana, cuartil superior,
rango superior por dimensión, sacados de localidades.json) funcionando en
[ruta del componente actual]. Lo que necesito ahora es corregir el layout:
actualmente el track usa una regla de ancho fija/ad-hoc que no escala bien.

Adjunto un screenshot de referencia (dashboard SIS, "Benchmarks") — quiero
replicar SU PATRÓN ESTRUCTURAL, no su estilo visual literal:
- Una línea horizontal de eje, con una banda sombreada entre el cuartil
  inferior y el cuartil superior.
- Puntos pequeños sólidos en los extremos (rango inferior y rango superior).
- Ticks (marcas verticales delgadas) para promedio y mediana dentro de la
  banda, cada uno con su valor numérico debajo.
- Un círculo grande, flotando por encima del eje, con el valor de la
  localidad en su interior, posicionado horizontalmente según su score real
  (no fijo), conectado al eje con una línea vertical delgada hasta su punto
  exacto sobre la línea.
- El círculo y el color de la banda deben tomar el color de la dimensión
  (naranja=justicia, azul=salud, verde=determinantes), no el azul/amarillo
  de la referencia.

Restricciones de estilo — usa lo que ya existe en el proyecto, no inventes
tokens nuevos:
- Toda la tipografía en Sora (título del componente en css/_tokens.css ya
  está corregido el error de Figma que marcaba algunos estilos como Inter,
  no reintroduzcas Inter).
- Colores desde css/_tokens.css: primitivos en español (--naranja-300,
  --azul-400, --verde-400/500) y semánticos en inglés
  (--color-text-primary). Si necesitas una variante de opacidad para la
  banda sombreada, usa color-mix(in srgb, <color> <pct>%, transparent), no
  hex de 8 dígitos ni RGB duplicado.
- El ancho del track debe ser responsive (grid/flex fluido, no un ancho en
  px fijo) — ese es justamente el bug que estamos corrigiendo.
- Aísla el CSS de este componente en su propio archivo dentro de
  css/utilities o el equivalente del proyecto, para no repetir el problema
  que ya tuvimos con scrollytelling-stage.css peleando con estilos nuevos.
- Si implementas los marcadores como SVG y necesitas setear variables CSS
  sobre elementos SVG, hazlo con .style, no con setAttribute — ya nos
  mordió ese bug antes y setAttribute no resuelve custom properties
  correctamente en SVG.

No toques la lógica de cálculo de bottom/lowerQ/avg/median/upperQ/top ni la
fuente de datos — el problema es solo de presentación.

Cuando termines, toma un screenshot con Playwright del componente en al
menos dos localidades distintas (una con score alto, una con score bajo)
para verificar que el círculo se posiciona correctamente en ambos extremos
del rango antes de que yo lo revise.