# Decisiones tomadas

Cuando el documento original dejaba algo abierto, elegimos la opción más divertida (o la más jugable) y la anotamos acá.

## Hito 1 – Partido jugable en gris

- **Cámara lenta:** la gravedad del juego es 6,2 m/s² en vez de 9,8 y las pelotas van más despacio que en la vida real, para que se pueda jugar con teclado. La TV igual muestra velocidades "reales" (×1,7): un saque fuerte marca ~170 km/h aunque en cancha vaya a 100.
- **Golpe = zona + timing:** cuando la pelota entra en la zona de golpe, apretar Z le pega en el acto. Temprano = cruzado, tarde = paralelo, y la dirección apretada suma puntería.
- **Mantener = más fuerte:** si apretás Z *antes* de que llegue la pelota, el jugador se prepara y le pega solo en el punto ideal. Mientras mantenés el botón carga potencia (y camina más lento); si lo soltás, solo espera la pelota a velocidad normal. Así los que "aprietan antes" también pueden jugar.
- **Slice / globo:** X tocado = slice. X mantenido = globo. Con la pelota ya en la zona, el juego espera una décima de segundo para saber si es toque o si lo mantenés.
- **Dejadita y golpe corto:** abajo + X = dejadita (muere cerca de la red). Abajo + Z = golpe corto y cruzado.
- **Jugador de arriba en 2P:** para él, "profundo" es empujar hacia el rival (abajo en la pantalla). Para los dos jugadores la regla es la misma: *hacia el rival = profundo*.
- **Palomita automática:** si apretás golpe y la pelota está un poquito fuera de alcance, el jugador se tira de palomita. Después queda medio segundo en el piso.
- **Aire:** baja corriendo a fondo y se recupera caminando y entre puntos (+60%). Con menos de 25% el jugador se mueve más lento.
- **Saque:** Z tira la pelota; el medidor sube y baja; Z de nuevo le pega. Si la pelota vuelve a la mano sin pegarle, se repite el tiro sin falta (y Don Ganso opina).
- **Marcador:** la fila de arriba del marcador es el jugador de arriba de la cancha y la de abajo, el de abajo. Los cantos son desde el punto de vista del que saca ("15-30", "30 iguales", "¡Iguales!", "Ventaja …").
- **Punto de oro:** la regla del Boss (más de 3 iguales) ya está implementada y testeada en la lógica de puntuación.
- **Fuente propia:** una fuente pixel proporcional hecha en código (con tildes, eñe, ¡ y ¿), con variante con borde para leer sobre cualquier fondo.
- **Sprites en el navegador:** las texturas se generan en tiempo de ejecución a partir del código (así el archivo único no depende de PNG externos). `npm run sprites` (hito 2) exporta los PNG a `public/sprites/` y los que pongas en `public/sprites/override/` reemplazan a los generados.
- **Sonido mínimo ya en el hito 1:** golpe, pique, red y bocinazo del umpire, para poder evaluar la sensación de juego. El chiptune completo llega en el hito 6.
- **Menú de prueba provisorio:** permite elegir modo (vs CPU, 2 jugadores, CPU contra CPU), duración, dificultad y superficie. Se reemplaza por el menú de verdad en el hito 6.
- **Atajos de prueba:** `?demo=1&speed=3` arranca CPU contra CPU acelerado; `?play=1` arranca directo contra la CPU; `?timer=1` usa un reloj alternativo para navegadores sin foco.

## Hito 2 – Personajes

- **Cuerpo con esqueleto + cabezas en grilla:** las cabezas (lo que más se reconoce) están dibujadas píxel a píxel como grillas de caracteres por personaje. El cuerpo es una plantilla compartida: un esqueleto que se posa con ángulos y se dibuja con contorno, con la contextura de cada uno (Rosco ancho y con panza, Seba alto y flaco, Angelito ~8 px más bajo). Así las 10 animaciones sirven para los seis y cada traje nuevo sale gratis.
- **Cuadros de 48×64:** un poco más grandes que 32×48 para que entren la raqueta arriba de la cabeza en el saque y la palomita acostada. El cuerpo en sí mide unos 32×44 (Angelito unos 28×38).
- **Cabezas grandes a propósito:** proporción tipo "chibi" de 16 bits, para que las caras se reconozcan en la cancha.
- **Vista de frente = espejo de la de espaldas**, con la cara en vez de la nuca y las capas invertidas (lo que de espaldas queda tapado por el torso, de frente se ve adelante).
- **Retratos procedurales:** los retratos de 96×96 se pintan con figuras (óvalos, polígonos, sombreado con luz de arriba a la izquierda) en vez de píxel a píxel, así se pueden ajustar rápido (ancho de cara, barba, pelo).
- **Expresiones con gag:** Rosco perdiendo = "¡Ay!" de dolor de espalda; Tincho ganando = sonríe exactamente un píxel; Angelito perdiendo = signo de pregunta.
- **Tincho sin traje alternativo en el documento:** le inventamos uno: rayas celestes y blancas clásicas.
- **Paleta:** ~54 colores en `src/art/palette.ts` (un poco más que 48 para tener tonos de piel y barba distintos para los seis).
- **Sin escudos ni marcas:** Racing lleva un rombo celeste genérico; River y el Vikingo alternativo, solo la banda; la gorra de Volpi es lisa.
- **`npm run sprites`** exporta las hojas a `public/sprites/` (`<personaje>_<traje>_back.png`, `_front.png` y `_retrato.png`). Con `--preview` o `--board` arma láminas ampliadas para revisar en `playtest/`.
- **Página de comparación local:** `sprites.html` + `src/dev/` están en `.gitignore`; solo funcionan con `npm run dev` y leen las fotos de `../referencias/`.
