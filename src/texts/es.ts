// TODOS los textos del juego viven acá, para poder editarlos fácil.
// Español rioplatense, con voseo. Cortos y punzantes: se leen jugando.

export const T = {
  title: 'CHATTAHOOCHEE TENIS',

  // ---------------------------------------------------------------- menú de prueba (hito 1)
  testMenu: {
    heading: 'PARTIDO DE PRUEBA',
    sub: 'Hito 1: todavía somos rectángulos. Con cariño.',
    mode: 'Modo',
    modes: ['Vos contra la CPU', '2 jugadores', 'CPU contra CPU (mirar)'],
    length: 'Duración',
    lengths: ['2 games (rápido)', '4 games', '6 games (set completo)'],
    difficulty: 'Dificultad',
    difficulties: ['Fácil', 'Normal', 'Nivel Chattahoochee'],
    surface: 'Superficie',
    surfaces: ['Cemento', 'Polvo verde', 'Cemento rápido'],
    play: '¡A JUGAR!',
    help: '↑↓ elegir · ←→ cambiar · ENTER confirmar',
  },

  // ---------------------------------------------------------------- nombres provisorios
  names: {
    you: 'VOS',
    cpu: 'CPU',
    p1: 'JUGADOR 1',
    p2: 'JUGADOR 2',
    cpuA: 'CPU ARRIBA',
    cpuB: 'CPU ABAJO',
  },

  // ---------------------------------------------------------------- HUD
  hud: {
    air: 'AIRE',
    serve: 'SAQUE',
    kmh: (n: number) => `${n} km/h`,
    secondServe: '2do saque',
    controls1P: 'Mover: flechas/WASD · Z golpe (mantené = fuerte) · X slice (mantené = globo) · Esc pausa',
    controls2P: 'J1: WASD F G · J2: flechas K L · Esc/Enter pausa',
    serveHint: 'Z: tirá la pelota · Z otra vez: pegale',
    serveHint2P: (hit: string) => `${hit}: tirá la pelota · ${hit} otra vez: pegale`,
  },

  // ---------------------------------------------------------------- cantos del umpire
  calls: {
    out: '¡AFUERA!',
    outLong: '¡LARGA!',
    outWide: '¡AFUERA!',
    net: '¡RED!',
    fault: '¡Falta!',
    doubleFault: '¡Doble falta!',
    let: '¡Let! Se repite.',
    ace: '¡ACE!',
    winner: '¡Punto!',
    deuce: '¡Iguales!',
    golden: '¡Punto de oro!',
    advantage: (name: string) => `Ventaja ${name}`,
    game: (name: string) => `Game ${name}`,
    set: (name: string) => `Set ${name}`,
    match: (name: string) => `¡Juego, set y partido: ${name}!`,
    tiebreak: '¡TIE-BREAK!',
    points: (a: string, b: string) => (a === b ? `${a} iguales` : `${a}-${b}`),
    loveAll: '0-0',
    honk: '¡HONK!',
  },

  // ---------------------------------------------------------------- carteles grandes
  banners: {
    game: 'GAME',
    set: 'SET',
    match: '¡PARTIDO!',
    tiebreak: 'TIE-BREAK',
    ace: '¡ACE!',
    doubleFault: '¡DOBLE FALTA!',
    breakPoint: 'PUNTO DE QUIEBRE',
    setPoint: 'SET POINT',
    matchPoint: 'MATCH POINT',
  },

  // ---------------------------------------------------------------- comentarios del umpire
  comments: {
    ace: ['Ni la vio.', 'Eso fue un saque o un rumor.', 'Anotá: cero reflejos.'],
    doubleFault: [
      'Dos faltas. Un clásico del domingo.',
      'El saque se fue a buscar el río.',
      'Tranquilo, la red también es parte de la cancha.',
    ],
    longRally: ['¡Qué peloteo! Alguien pida un mate.', 'Llevan tanto que ya es un partido aparte.'],
    diveMiss: ['Palomita de cinco estrellas. Pelota, ninguna.', 'Mucho vuelo, poco aterrizaje.'],
    diveWin: ['¡Voló como gallina con alas de ganso!', '¡Palomita de museo!'],
    changeEnds: [
      'Cambio de lado. Ustedes quédense ahí, que la cámara no se mueve.',
      'Cambio de lado. Técnicamente. No se muevan, que es un bardo.',
      'Cambian de lado. Simbólicamente. Como las dietas.',
    ],
    whiff: ['Le pegó al aire. El aire ganó.', 'Swing espectacular. Pelota: ausente con aviso.'],
    retoss: ['La tiró mal. Otra vez, sin presión.', 'Tiro de pelota: rechazado por la gravedad.'],
    netCord: ['¡Faja! La red también juega.', 'Pasó raspando. Con permiso.'],
  },

  // ---------------------------------------------------------------- pausa y fin
  pause: {
    title: 'PAUSA',
    resume: '¿Seguís?',
    restart: 'Reiniciar partido',
    quit: 'Volver al menú',
  },
  end: {
    winner: (name: string) => `¡GANÓ ${name}!`,
    again: 'ENTER: otro partido · ESC: menú',
    stats: 'Estadísticas (100% oficiales, 0% auditadas)',
    rows: {
      points: 'Puntos ganados',
      aces: 'Aces',
      doubleFaults: 'Dobles faltas',
      winners: 'Tiros ganadores',
      unforced: 'Errores no forzados',
      dives: 'Palomitas',
      distance: 'Metros corridos',
      maxKmh: 'Saque/golpe más rápido',
      whiffs: 'Golpes al aire',
    },
  },
};

/** Elige un elemento al azar (para comentarios). */
export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
