# Chattahoochee Tenis — LEEME

## Cómo jugar

- **En la web:** https://sebastiandalessio.github.io/Chattahoochee-Tenis/
- **Sin internet:** abrí `dist/Chattahoochee-Tenis.html` con doble clic (Chrome o Edge). Ese archivo se puede mandar por WhatsApp o email.

Controles (1 jugador): flechas o WASD para moverte, **Z** golpe (mantené para pegar más fuerte), **X** slice (mantené para globo), **C** especial, **V** cargada, **Esc** pausa. Para sacar: Z tira la pelota y Z otra vez le pega.

**Torre de los Chattahoochees:** en el menú, bajá hasta "TORRE DE LOS CHATTAHOOCHEES" (usa la duración y la dificultad que elegiste arriba). Elegí tu personaje, contestá las chicanas y subí la torre hasta el Boss. El progreso (torres ganadas, trajes y chicanas aprendidas) se guarda en el navegador: si abrís el juego en otra computadora o en otro navegador, arranca de cero.

## Cómo volver a compilar

Necesitás Node.js instalado. En una terminal, dentro de esta carpeta:

1. `npm install` (solo la primera vez).
2. `npm run dev` para jugar mientras se programa (abre http://localhost:5173).
3. `npm test` para correr los tests.
4. `npm run build` para generar la versión final en `dist/` (incluye el archivo único `Chattahoochee-Tenis.html`).
5. `npm run playtest` para que la computadora juegue sola y saque capturas en `playtest/`.

## Dónde está cada cosa

- `src/texts/es.ts`: todos los textos (chicanas, frases, comentarios de Don Ganso).
- `src/logic/`: reglas del tenis y física (con tests en `tests/`).
- `src/sim/`: el partido y la CPU.
- `src/scenes/`: pantallas del juego.
- `public/sprites/override/`: poné acá un PNG con el mismo nombre que uno generado para reemplazarlo.
- `DECISIONES.md`: las decisiones que tomamos cuando algo no estaba definido.
