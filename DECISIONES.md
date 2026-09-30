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
- **Fichas parejas (pedido del grupo):** todos los personajes suman 37 puntos de stats y cada atributo va de 4 a 8. Las personalidades se mantienen (Rosco lento y con poco aire, Seba volea, Tincho control, Volpi saque, Vikingo potencia, Angelito velocidad), pero ninguna diferencia es tan grande. Hay un test que lo controla.
- **Rosco con entradas (pedido del grupo):** pelo largo a los costados, más ralo arriba y con entradas en las sienes.
- **Volpi sin gorra con la de River (pedido del grupo):** con la remera blanca y banda roja se le ve el pelo corto oscuro con canas en los costados; con la remera negra usa la gorra de la foto. Cada traje puede tener su propia cabeza.

## Hito 3 – Mística

- **Recetas en cualquier orden:** los 3 pasos se pueden cumplir en el orden que salgan. En el HUD, al lado del marcador, hay 3 casilleros por jugador; se ponen dorados con un "¡clinc!" y abajo aparece un aviso del paso cumplido. En la pausa se ven las recetas completas de los dos.
- **Un especial por game:** con la receta completa aparece "¡ESPECIAL LISTO!". Se activa con C (1P) o H / Ñ (2P). Al usarlo la receta vuelve a cero.
- **Especiales "de golpe" y "de punto":** el Rey de Copas, el Paralelo Académico, Betty y la Pelota Frita se cargan y salen en el **próximo golpe**; el Modo Dinein y la Minicargadora duran **el resto del punto**. Se pueden activar antes de sacar o durante el peloteo.
- **Cut-in:** el partido se congela ~1,3 s: franja con los colores del club, retrato "ganando" en grande, nombre del especial y su frase.
- **Rey de Copas:** dejadita pegada a la red que, al picar, vuelve hacia la red. Si el rival llega, llega sin aire. Rosco queda 2 s doblado de la espalda. Si la pelota ya picó bien y después se va contra la red, el punto es de quien la pegó (regla agregada al árbitro, con test).
- **Paralelo Académico:** passing tipo láser pegado a la línea del lado donde está Tincho, en cámara lenta con cartel de "REPETICIÓN". Solo lo devuelve quien esté a ~1 m de la pelota (no hay palomita que valga).
- **¡Dale, Betty!:** Betty aparece al lado de Volpi y en su próximo golpe salen tres pelotas iguales de su cañón, a izquierda, centro y derecha. Solo una es real; las otras desaparecen al picar. La CPU rival sigue una fantasma el 60% de las veces.
- **Mabel, a 200 grados:** Mabel aparece al lado del Vikingo, hace "¡DING!" y la pelota sale dorada y humeante. El que la devuelve se quema las manos (queda un instante soplándose) y su devolución sale como un globo corto, lista para el smash.
- **Minicargadora:** Angelito se sube a la minicargadora (1,8 veces más rápido y una pala de 4 m que devuelve todo sola) y deja un bache con conos y cartel de "ZONA EN OBRA" en la cancha rival hasta el final del game: si la pelota pica en el bache, sale para cualquier lado.
- **Modo Dinein:** velocidad x1,6 y volea imán en la red durante el punto; la pantalla "late".
- **Cargada (V / R / I):** se hace entre puntos. Después de ganar el punto cuenta para las recetas; después de perderlo, el personaje queda en ridículo (Don Ganso lo comenta y pierde un poco de aire). Una por punto. Volpi se tienta (su próximo primer saque sale flojo) y Tincho es inmune ("...").
- **Pasivas y debilidades** como en el documento. Detalles elegidos: la risa de Rosco sube 60% el error del próximo saque del rival; la inmunidad diplomática de Seba repite el punto (una vez por partido) con sello "EXENTO – Convención de Viena"; Angelito queda 0,4 s quieto con un "?" después de cada golpe; el Vikingo en la red se desorienta ("¿Y esto qué es?") y volea con el doble de error; Seba apurado (le pega muy temprano) tiene 25% de tirarla a la red o afuera.
- **Algunos pasos de receta, interpretados:** "saque ganador" = ganar el punto sacando con 1 o 2 golpes en total; "globo" = ganar un punto en el que tiró un globo; "llegar a una lejanísima" = devolver en juego una pelota después de correr 5 m o más; "pelotas imposibles" = palomitas o golpes con la pelota casi fuera de alcance; "volver al centro" = llegar al centro del fondo antes de que el rival le pegue.
- **CPU con personalidad** (`src/sim/personalities.ts`): Rosco tira dejaditas y no corre las imposibles ("No, esa no"); Seba sube siempre (globeale); Tincho es consistente y busca el paralelo cuando va abajo; Volpi saca muy bien, tira slice y globos; el Vikingo tira cruzado y profundo y nunca sube (subí vos a la red); Angelito llega a todo pero deja la cancha abierta. La CPU hace cargadas después de ganar puntos y usa los especiales con criterio. Se ajustó con partidos simulados para que ninguno sea imbatible.
