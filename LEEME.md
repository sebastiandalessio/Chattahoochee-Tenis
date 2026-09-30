# Chattahoochee Tenis — LEEME

## Cómo jugar

- **En la web:** https://sebastiandalessio.github.io/Chattahoochee-Tenis/
- **Sin internet:** abrí `dist/Chattahoochee-Tenis.html` con doble clic (Chrome o Edge). Ese archivo se puede mandar por WhatsApp o por email.

Al abrir el juego aparece el splash (apretá cualquier tecla), después el título y el menú:

- **Torre de los Chattahoochees** (1 jugador): elegís personaje, contestás chicanas y subís la torre hasta el Boss.
- **Amistoso**: 2 jugadores en el mismo teclado (o vos contra la CPU, o CPU contra CPU para mirar). Elegís sede, jugadores y si hay chicanas.
- **Práctica con Betty**: Betty te tira pelotas para practicar.
- **Opciones**: duración, dificultad, volumen de música y efectos, teclas y borrar progreso.
- **Cómo jugar**: todo explicado, con las recetas de los especiales.
- **Créditos**: con el casamiento de Betty y Mabel.

### Teclas

| Acción | 1 jugador | 2P – Jugador 1 | 2P – Jugador 2 |
|---|---|---|---|
| Mover | Flechas o WASD | WASD | Flechas |
| Golpe (mantener = más fuerte) | Z | F | K |
| Slice (mantener = globo) | X | G | L |
| Especial | C | H | Ñ o ; |
| Cargada | V | R | I |
| Pausa | Esc o Enter | Esc | Enter |

- **Saque:** golpe tira la pelota y golpe otra vez le pega. Cuanto más alto el medidor, más fuerte y más riesgo.
- **Joystick:** A golpe, B slice, X especial, Y cargada, START pausa. En 2 jugadores, uno por jugador.
- Las teclas de golpe, slice, especial y cargada se pueden cambiar en **Opciones → Teclas**.

### Guardado

El progreso se guarda en el navegador: torres ganadas, trajes desbloqueados, chicanas aprendidas, opciones y el personaje secreto. Si abrís el juego en otra computadora o en otro navegador, arranca de cero. Para empezar de nuevo: **Opciones → Borrar progreso**.

## Cómo volver a compilar

Necesitás Node.js instalado. En una terminal, dentro de esta carpeta:

1. `npm install` (solo la primera vez).
2. `npm run dev` para jugar mientras se programa (abre http://localhost:5173).
3. `npm test` para correr los tests.
4. `npm run build` para generar la versión final en `dist/` (incluye el archivo único `Chattahoochee-Tenis.html`).
5. `npm run playtest` para que la computadora juegue sola y saque capturas en `playtest/`. También: `npm run playtest -- menus`, `-- pantallas`, `-- sedes` o `-- torre` (una torre entera en automático).

## Dónde está cada cosa

- `src/texts/es.ts`: todos los textos (chicanas, frases, comentarios de Don Ganso, créditos).
- `src/audio/songs.ts`: la música (melodías y acordes de cada tema); `src/audio/sfx.ts`: los efectos y las voces.
- `src/logic/`: reglas del tenis y física (con tests en `tests/`).
- `src/sim/`: el partido, la mística y la CPU.
- `src/art/`: los dibujos (personajes, sedes, objetos), hechos con código.
- `src/scenes/`: pantallas del juego.
- `public/sprites/override/`: poné acá un PNG con el mismo nombre que uno generado (ver `public/sprites/`) para reemplazarlo.
- `DECISIONES.md`: las decisiones que tomamos cuando algo no estaba definido.
