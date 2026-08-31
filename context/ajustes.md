Quiero hacer una serie de ajustes en el Explorador de Datos. Son 5 cambios independientes, 
trátalos como una lista de tareas separadas — valida cada uno con su propia captura antes 
de pasar al siguiente, no los mezcles en un solo commit mental.

1. RENOMBRAR "VARIABLES" → "INDICADORES" (solo texto de UI)
   - Cambia toda referencia visible al usuario de la palabra "variable(s)" por 
     "indicador(es)" — esto incluye labels, tooltips, headers, textos de ayuda, nombres de 
     controles en la interfaz.
   - NO cambies nombres de funciones, variables de JavaScript/PHP, nombres de archivos, ni 
     claves de objetos/JSON en el código — esto es un cambio de copy/texto visible 
     únicamente, no un refactor de código.
   - Antes de tocar nada, corre un grep de "variable" (case-insensitive) sobre los archivos 
     de plantillas/HTML/JS de UI para ubicar todas las ocurrencias de texto visible, y 
     revisa cada una manualmente — no hagas un find-and-replace ciego sobre todo el 
     proyecto, ya que eso tocaría también nombres de código.

2. LABEL DEL EJE X EN LA VISUALIZACIÓN
   - Agrega el label "Puntaje IDES" al eje X de la visualización principal (confirma si es 
     el fan chart o el benchmark de locality-detail.js — localiza primero cuál es "la 
     visualización" antes de asumir, y si hay más de una con eje X, pregúntame cuál).
   - El eje X debe tener el 0 centrado (rango simétrico, ej. de -X a +X con el cero a la 
     mitad del eje) — revisa cómo está definida la escala actualmente y ajústala si no es 
     simétrica.

3. TAMAÑO DE LETRA DE LOCALIDADES + ANCHO DE LA VISUALIZACIÓN
   - Aumenta el tamaño de fuente de las etiquetas de nombre de cada localidad en la 
     visualización (localízalas — probablemente en fan-chart.js o locality-rose.js).
   - Después de aumentar el tamaño, evalúa si el ancho máximo actual del contenedor de la 
     visualización sigue siendo suficiente para que las etiquetas no se corten o se 
     encimen — si no, aumenta el ancho máximo también. Toma captura de antes/después para 
     confirmar que no se rompe el layout en ningún breakpoint.

4. CAMBIAR --color-bg
   - En el archivo de design tokens (_tokens.css), cambia el valor de la variable 
     `--color-bg` a `#ECEDEB`.
   - Verifica visualmente el contraste resultante contra el fondo actual en al menos 2 
     páginas/componentes que usen ese token, para confirmar que el cambio se ve como se 
     espera y no rompe legibilidad de texto que dependa de ese contraste.

5. RENOMBRAR CONTROLES + CAMBIAR DEFAULT
   - Cambia el label del control "Estelas" por "Trayectoria" (mismo control, solo el texto).
   - Cambia el label del control "Rosas siempre visibles" por "Dimensiones visibles" (mismo 
     control, solo el texto).
   - Cambia el estado por defecto de "Dimensiones visibles" (antes "Rosas siempre 
     visibles") a ACTIVADO — debe iniciar encendido al cargar la página, no requerir que el 
     usuario lo active manualmente.
   - Localiza dónde se define el estado inicial de este control (probablemente una variable 
     booleana o un atributo `checked` en el HTML/JS) y cambia el default ahí — no solo el 
     label.

VALIDACIÓN
Para cada uno de los 5 cambios, toma una captura con Playwright que confirme el resultado 
(texto correcto, eje con label y 0 centrado, letras más grandes sin corte, color de fondo 
nuevo, controles renombrados y "Dimensiones visibles" activado por defecto). Si algo es 
ambiguo (ej. cuál es "la visualización principal" del punto 2), pregúntame antes de asumir 
y seguir.