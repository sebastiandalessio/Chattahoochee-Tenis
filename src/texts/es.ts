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

  // ---------------------------------------------------------------- personajes
  characters: {
    elRosco: {
      name: 'EL ROSCO',
      club: 'Independiente, el Rey de Copas',
      bio: 'Un hombre grande con una risa más grande todavía. Dice que juega despacio a propósito. Su espalda opina distinto.',
      special: ['¡REY DE COPAS!', 'Dejadita mágica con efecto retro. Si el rival llega, llega sin aire.'],
      passive: ['Carcajada contagiosa', 'Cuando errás, se ríe tanto que tu próximo saque tiembla.'],
      weakness: ['La espalda', 'Poco aire. Sin aire: "¡Ay, la lumbar!" y a caminar al 60%.'],
      taunt: 'Se agarra la camiseta y grita gol.',
      phrases: ['¡Eso fue gol!', 'Ya no tengo edad para esto... pero sí para ganarte.', 'Mi quiropráctico me pidió que no gane tan fuerte.'],
    },
    elSeba: {
      name: 'EL SEBA',
      club: 'Boca Juniors',
      bio: 'Alto, apurado y con credencial. Sube a la red antes de que termines de sacar. A veces, antes de que empieces.',
      special: ['¡HEEEY! MODO DINEIN', 'Velocidad x1,6 y volea imán durante un punto. La Bombonera no tiembla: late.'],
      passive: ['Inmunidad Diplomática', 'Su primer error no forzado del partido queda EXENTO. Convención de Viena.'],
      weakness: ['Apurado', 'Si le pega antes de tiempo, 25% de "¡Uy, me apuré!".'],
      taunt: 'Abre los brazos y grita "¡HEEEY!".',
      phrases: ['¡HEEEY!', 'Esto lo resolvemos por la vía diplomática.', 'No fue error no forzado: fue una decisión soberana.'],
    },
    trueTincho: {
      name: 'TRUE TINCHO',
      club: 'Racing Club',
      bio: 'Anteojos negros, mate y cero emociones visibles. Nadie lo vio sonreír. Hay un rumor, sin confirmar.',
      special: ['¿QUÉ HARÍA MARAVILLA?', 'Paralelo Académico: un passing láser. Solo se carga yendo abajo.'],
      passive: ['Cara de póker', 'Inmune a las cargadas. Responde "...". Incómodo para todos.'],
      weakness: ['Cansino', 'Arranca lento. Después no para más.'],
      taunt: 'Se toma un mate. Solo cuenta si va perdiendo.',
      phrases: ['¿Qué haría Maravilla en este momento?', '...', 'Bien.', 'El tenis es un deporte serio.'],
    },
    volpi: {
      name: 'VOLPI',
      club: 'River Plate',
      bio: 'Gorra, anteojos espejados y la risa lista. Entrena con Betty, su lanzapelotas. Dicen que ella devuelve más que vos.',
      special: ['¡DALE, BETTY!', 'Betty dispara tres pelotas. Una sola es de verdad.'],
      passive: ['Slice que no pica', 'Su slice patina bajito: tenés menos tiempo para pegarle.'],
      weakness: ['Se tienta', 'Si le hacés una cargada, se tienta y su primer saque sale flojo.'],
      taunt: 'Se ríe hasta doblarse.',
      phrases: ['¡Jajaja!', 'Betty, mi amor, vos no.', 'Esto con Betty no me pasa.'],
    },
    elVikingo: {
      name: 'EL VIKINGO',
      club: 'River Plate',
      bio: 'Rodete, barba colorada y revés a dos manos. Toca la guitarra y vive con Mabel, una freidora de aire muy celosa.',
      special: ['MABEL, A 200 GRADOS', 'Pelota Frita: el rival se quema las manos y devuelve flojo y alto.'],
      passive: ['El Dardo', 'Pega corto y seco: su golpe no delata para dónde va.'],
      weakness: ['La red es territorio desconocido', 'En la red mira para todos lados. Volea torpe.'],
      taunt: 'Riff de guitarra eléctrica.',
      phrases: ['¡Valhalla!', 'Esto se fríe en 8 minutos.', 'Mabel no aprueba ese revés.'],
    },
    angelito: {
      name: 'ANGELITO',
      club: 'Neutral (y handyman)',
      bio: 'El más bajito y el más rápido. Corre todo, arregla todo y rompe algunas cosas en el proceso. Tiene una minicargadora y no tiene miedo de usarla.',
      special: ['¡LLEGÓ LA MINICARGADORA!', 'Devuelve todo y deja la cancha rival "EN OBRA".'],
      passive: ['Motor de hormiga', 'El más rápido y el que mejor se tira de palomita.'],
      weakness: ['¿Y ahora dónde voy?', 'Después de pegar se queda admirando el golpe. Los globos le pasan por arriba.'],
      taunt: 'Saca una llave inglesa y "ajusta" la red.',
      phrases: ['¡Eso lo arreglo yo!', '¿Dónde estaba el centro?', 'Esta cancha necesita una nivelación.'],
    },
  },
  statNames: ['Velocidad', 'Potencia', 'Control', 'Saque', 'Volea', 'Aire'],

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
