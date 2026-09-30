// TODOS los textos del juego viven acá, para poder editarlos fácil.
// Español rioplatense, con voseo. Cortos y punzantes: se leen jugando.

/** Nombres de las teclas de acción (para los textos de ayuda). */
export interface KeyNames {
  hit: string;
  slice: string;
  special: string;
  taunt: string;
}

export const T = {
  title: 'CHATTAHOOCHEE TENIS',

  // ---------------------------------------------------------------- menú de prueba (hito 1)
  testMenu: {
    heading: 'PARTIDO DE PRUEBA',
    sub: 'Hito 5: torre, chicanas, el Boss y los finales.',
    mode: 'Modo',
    modes: ['Vos contra la CPU', '2 jugadores', 'CPU contra CPU (mirar)'],
    tower: 'TORRE DE LOS CHATTAHOOCHEES',
    towerHint: '(la torre usa la duración y la dificultad de acá)',
    length: 'Duración',
    lengths: ['2 games (rápido)', '4 games', '6 games (set completo)'],
    difficulty: 'Dificultad',
    difficulties: ['Fácil', 'Normal', 'Nivel Chattahoochee'],
    venue: 'Sede',
    bottom: 'Abajo (vos)',
    bottom2P: 'Abajo (J1)',
    bottomDemo: 'Abajo (CPU)',
    top: 'Arriba (rival)',
    top2P: 'Arriba (J2)',
    random: 'Al azar',
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
    controls1P: (k: KeyNames) => `Flechas: mover · ${k.hit} golpe (mantené=fuerte) · ${k.slice} slice (mantené=globo) · ${k.special} especial · ${k.taunt} cargada`,
    controls2P: (a: KeyNames, b: KeyNames) =>
      `J1: WASD ${a.hit} ${a.slice} ${a.special}(esp) ${a.taunt}(carg) · J2: flechas ${b.hit} ${b.slice} ${b.special}(esp) ${b.taunt}(carg) · Esc/Enter pausa`,
    specialReady: '¡ESPECIAL LISTO!',
    specialKey: (k: string) => `(${k})`,
    replay: 'REPETICIÓN',
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
    donGanso: {
      name: 'DON GANSO',
      club: 'Umpire con licencia (vencida)',
      bio: 'Ganso canadiense, moño rojo y opiniones muy firmes. Cantó miles de puntos. Hoy juega uno. Promete ser imparcial consigo mismo.',
      special: ['¡VUELO RASANTE!', 'Despega: velocidad x1,7 y volea imán durante un punto.'],
      passive: ['Autoridad', 'Después de ganar un punto, su "¡HONK!" pone nervioso al que saca.'],
      weakness: ['Patas cortas', 'Para los costados vuela; para atrás camina como pato.'],
      taunt: 'Abre las alas y grazna.',
      phrases: ['¡HONK!', 'Esa fue adentro. Lo digo yo.', 'Tengo opiniones muy firmes sobre tu revés.'],
    },
  },
  statNames: ['Velocidad', 'Potencia', 'Control', 'Saque', 'Volea', 'Aire'],

  // ---------------------------------------------------------------- mística
  steps: {
    winDrop: 'Punto con dejadita',
    tauntAfterWin: 'Cargada tras ganar',
    rally5Air: 'Peloteo largo con aire',
    winVolley: 'Punto de volea',
    longRun: 'Llegó a una lejanísima',
    behind: 'Ir abajo (mística)',
    mateLosing: 'Mate yendo abajo',
    winRally4: 'Peloteo de 4 ganado',
    aceOrServeWinner: 'Saque ganador',
    winLob: 'Punto con globo',
    baseline6: 'Peloteo de 6 desde el fondo',
    crossPass: 'Passing cruzado',
    tauntAny: 'La cargada',
    impossible3: 'Imposibles',
    center3: 'Volvió al centro',
  } as Record<string, string>,
  /** Ícono (un carácter de la fuente) de cada paso de receta. */
  stepIcons: {
    winDrop: '↓',
    tauntAfterWin: '★',
    rally5Air: '~',
    winVolley: 'V',
    longRun: '→',
    behind: '▼',
    mateLosing: 'M',
    winRally4: '4',
    aceOrServeWinner: 'A',
    winLob: '∩',
    baseline6: '6',
    crossPass: '×',
    tauntAny: '★',
    impossible3: '!',
    center3: '+',
  } as Record<string, string>,
  specials: {
    reyDeCopas: { name: '¡REY DE COPAS!', line: 'Ya no tengo edad para esto... pero sí para ganarte.' },
    dinein: { name: '¡HEEEY! MODO DINEIN', line: 'La Bombonera no tiembla: late.' },
    paralelo: { name: '¿QUÉ HARÍA MARAVILLA EN ESTE MOMENTO?', line: 'Paralelo Académico.' },
    betty: { name: '¡DALE, BETTY!', line: 'Betty, mi amor, ahora sí.' },
    frita: { name: 'MABEL, A 200 GRADOS', line: '¡DING! Pelota frita.' },
    minicargadora: { name: '¡LLEGÓ LA MINICARGADORA!', line: '¡Eso lo arreglo yo!' },
    vuelo: { name: '¡VUELO RASANTE!', line: 'Despejen la cancha: el umpire despega.' },
  } as Record<string, { name: string; line: string }>,
  /** Lo que dice Don Ganso cuando el especial gana el punto. */
  specialWins: {
    reyDeCopas: '¡GOOOL...! Perdón, ¡PUNTO!',
    dinein: '¡HEEEY! La Bombonera no tiembla: late.',
    paralelo: 'Repetición: sí, fue tan bueno como parecía.',
    betty: 'Betty eligió bien. Vos, no tanto.',
    frita: 'Pelota frita, manos fritas.',
    minicargadora: 'Obra terminada. La cancha, no tanto.',
    vuelo: 'Punto aprobado por el umpire. O sea, por él mismo.',
  } as Record<string, string>,
  /** Globitos que dicen los personajes. */
  emotes: {
    '?': '?',
    lumbar: '¡Ay, la lumbar!',
    apurado: '¡Uy, me apuré!',
    jaja: '¡JAJAJA!',
    poker: '...',
    tentado: '¡Jajaja! ¡Pará!',
    confused: '¿Y esto qué es?',
    burn: '¡Quema! ¡Quema!',
    noChase: 'No, esa no.',
    slip: '¡Uy, resbala!',
    ding: '¡DING!',
  } as Record<string, string>,
  /** Lo que grita cada uno al hacer la cargada. */
  tauntShouts: {
    elRosco: '¡GOOOOL!',
    elSeba: '¡HEEEY!',
    trueTincho: '(sorbo de mate)',
    volpi: '¡JAJAJA!',
    elVikingo: '♪ ¡Valhalla! ♪',
    angelito: '¡Eso lo arreglo yo!',
    donGanso: '¡HONK!',
  } as Record<string, string>,
  mystique: {
    exento: 'EXENTO',
    vienna: 'Convención de Viena',
    exentoUmpire: '¡HONK! ¡Esto es un escándalo diplomático!',
    exentoComment: 'Se repite el punto. Don Ganso presenta una nota de protesta.',
    badTaunt: [
      'Cargar después de perder el punto. Audaz. Innecesario.',
      'Eso fue una cargada en contra. Queda anotado.',
      'Festejar el punto del rival: estrategia nueva.',
    ],
    poker: ['Le hicieron una cargada a Tincho. Tincho: "...". Silencio incómodo.', 'La cargada rebotó en la cara de póker.'],
    tentado: ['Volpi se tentó. Su próximo saque viene con risa incluida.'],
    lumbar: ['Se le trabó la espalda. Camina como un señor de noventa.', 'La lumbar dijo basta. El resto del game, en cámara lenta.'],
    apurado: ['Se apuró. Como siempre. Como nunca.'],
    confused: ['El Vikingo en la red: territorio desconocido.'],
    carcajada: ['Rosco se ríe. Esa carcajada se contagia... al próximo saque.'],
    autoridad: ['¡HONK! La autoridad habló. El que saca, tiembla.', 'Graznido reglamentario. El próximo saque viene nervioso.'],
    primo: 'Hoy canto yo, el primo. Mi primo juega. Somos gansos, no se nos nota la diferencia.',
    burn: ['Se quemó las manos con la pelota frita. Se lo advirtieron.'],
    obra: ['ZONA EN OBRA. Cuidado con el bache.'],
    obraBounce: ['¡El bache! Pique al azar, cortesía de Angelito.'],
    noChase: ['Rosco eligió no correr. Una decisión madura.'],
    ready: 'Receta completa. Hay mística.',
  },
  obraSign: 'ZONA EN OBRA',

  // ---------------------------------------------------------------- sedes
  venues: {
    names: {
      breckenridge: 'BRECKENRIDGE',
      springRidge: 'SPRING RIDGE',
      stRegis: 'ST. REGIS',
      chattahoochee: 'ORILLAS DEL CHATTAHOOCHEE',
    } as Record<string, string>,
    blurbs: {
      breckenridge: 'Cemento verde y azul. Pileta, playground y una cancha vecina muy tranquila.',
      springRidge: 'Polvo verde entre pinos. La pelota pica alta y los jugadores se deslizan.',
      stRegis: 'Country club. Cemento azul rapidísimo, poco lugar atrás y pickleball al lado.',
      chattahoochee: 'La sede secreta: atardecer, río, gansos y musgo.',
    } as Record<string, string>,
    random: 'Sorteo',
    windscreen: 'ST. REGIS',
    fence: ['¡Contra el alambrado!', 'El alambrado de St. Regis devuelve más que algunos.'],
    slip: '¡Uy, resbala!',
    poc: 'POC',
    sneeze: '¡ACHÍS!',
    zzz: 'Zzz...',
    wake: '¡HONK! ¿Qué me perdí?',
    events: {
      pelota: {
        call: '¡PELOTA!',
        say: ['Pelota de fútbol del playground. Se repite el punto.', 'Un pibe quiere su pelota de vuelta. Se repite.'],
      },
      silbato: {
        bubble: '¡PRIIIIIT!',
        say: ['Pitó el guardavidas. Nadie sabe por qué. Todos se congelaron.', '¡PRIIIT! Era el guardavidas. Sigan, sigan.'],
      },
      bomba: {
        bubble: '¡BOMBAAAA!',
        say: ['¡Bomba en la pileta! La cancha quedó mojada: cuidado con el charco.', 'Salpicadura olímpica. Hay charco.'],
      },
      ardilla: {
        call: '¡ARDILLA!',
        say: ['Una ardilla se robó la pelota. Se repite el punto.', 'La ardilla no pidió permiso. Se repite.'],
      },
      pina: { say: ['Cayó una piña en la cancha. Pique a la suerte.', 'Piña de pino, cortesía de Georgia.'] },
      polen: { say: ['Nube de polen de Atlanta. No se ve nada. ¡Achís!', 'Temporada de polen: todo amarillo, todos estornudan.'] },
      ciervo: { say: ['Pasa un ciervo. Mira el partido con desdén. Sigue de largo.', 'El ciervo vio tu revés y se fue.'] },
      entrenador: {
        bubbles: ['¡AFUERA! ¡Del agua, digo!', '¡VAMOS ESA BRAZADA!', '¡VUELTA!', '¡PIERNAS, PIERNAS!'],
        say: ['Eso lo gritó el entrenador de natación. No cuenta.', 'El entrenador de natación también tiene opiniones.'],
      },
      pickleball: { say: ['¡Una bola de pickleball! Esquivala.', 'Invasión de pickleball. POC.'], hit: ['Tropezó con una bola de pickleball. POC.'] },
      mozo: { say: ['Un mozo cruza con limonadas. Nadie pidió. Todos quieren.', 'Pasa el mozo. Don Ganso pide una sin azúcar.'] },
      gansoDuerme: { say: ['Don Ganso se durmió. Este punto lo cantan ustedes.'] },
      gansoRoba: { say: ['Don Ganso se robó una pelota. Dice que es para su colección.', 'Don Ganso confiscó la pelota. Sin explicaciones.'] },
      pregunta: {
        ask: '¿Nos prestan la cancha cuando terminen?',
        options: [
          'Sí, cuando terminemos. Calculá tres horas y un tie-break.',
          '¿Pickleball? ¿Eso no es tenis para gente que perdió la raqueta grande?',
          'Solo si me explicás las reglas.',
          'POC.',
        ],
        answers: [
          '¡Genial! Traemos reposeras y nos quedamos mirando.',
          'Se ofendió. Te mira como el ciervo de Spring Ridge.',
          'La "cocina" es la zona sin volea, el saque va de abajo... (veinte minutos después)... ¿me seguís?',
          '...POC. (Se va, conmovido.)',
        ],
        comment: ['Diplomacia deportiva. Anotado en el acta.', 'Don Ganso aprueba esa respuesta. Más o menos.'],
      },
    },
  },

  // ---------------------------------------------------------------- trajes
  outfits: {
    elRosco: ['Rayas rojinegras', 'Rojo Independiente'],
    elSeba: ['Azul y oro', 'Chaleco de pesca', 'Modo Diplomático'],
    trueTincho: ['Racing', 'Rayas celestes'],
    volpi: ['Banda roja', 'Remera negra'],
    elVikingo: ['Remera gris', 'Casco vikingo'],
    angelito: ['Remera negra', 'Handyman'],
    donGanso: ['Plumas y moño', 'Saco de umpire'],
  } as Record<string, string[]>,

  // ---------------------------------------------------------------- selección de personaje
  select: {
    title: 'ELEGÍ TU JUGADOR',
    special: 'Especial',
    passive: 'Pasiva',
    weakness: 'Debilidad',
    outfit: 'Traje',
    outfitLocked: '(ganá la torre para desbloquear otro)',
    towerDone: '¡Torre ganada!',
    help: '←→↑↓ elegir · X cambiar traje · ENTER confirmar · ESC volver',
  },

  // ---------------------------------------------------------------- torre
  tower: {
    title: 'TORRE DE LOS CHATTAHOOCHEES',
    boss: 'EL GRAN CHATTAHOOCHEE',
    bossWho: '¿¿¿???',
    next: 'Próximo rival',
    at: 'en',
    help: 'ENTER: ¡a jugar! · ESC: abandonar la torre',
    climb: ['Un escalón más. La escalera no tiene ascensor.', 'Subiendo. Don Ganso aplaude con las alas.', 'Arriba se ve el río. Y algo raro en un kayak.'],
    start: ['Cinco rivales, un Boss y ningún quiropráctico cerca.', 'La torre te espera. Don Ganso también, pero él siempre espera.'],
    abandonQ: '¿Abandonás la torre? (ENTER sí · ESC no)',
    // Betty (la lanzapelotas) y Mabel (la freidora) se van conociendo entre partido y partido.
    romance: [
      ['BETTY: BIP. ¿VENÍS SEGUIDO A LA TORRE?', 'MABEL: ¡DING! Solo cuando hay fritura.'],
      ['BETTY: TE LANZO UNA PELOTA. ES UN CUMPLIDO.', 'MABEL: La freí. También es un cumplido.'],
      ['BETTY: MI TOLVA SE LLENA CUANDO TE VEO.', 'MABEL: (se pone colorada a 200 grados)'],
      ['MABEL: ¿Compartimos una papa frita?', 'BETTY: AFIRMATIVO. CORAZÓN AL 100%.'],
      ['BETTY: MABEL. TENGO UNA PREGUNTA IMPORTANTE.', 'MABEL: ¡DING DING DING DING!'],
      ['Betty y Mabel miran el río, juntas.', 'Hay rumores de casamiento. Don Ganso no confirma.'],
    ],
  },

  // ---------------------------------------------------------------- VS
  vs: {
    vs: 'VS',
    clasico: { avellaneda: '¡CLÁSICO DE AVELLANEDA!', superclasico: '¡SUPERCLÁSICO!' } as Record<string, string>,
    clasicoSay: {
      avellaneda: ['Rojos contra celestes. Separados por dos cuadras y un odio muy cariñoso.', 'Avellaneda se paraliza. Bueno, Atlanta no, pero Avellaneda sí.'],
      superclasico: ['Boca contra River. Don Ganso se pone el casco.', 'El Superclásico llega al Chattahoochee. Los gansos piden neutralidad.'],
    } as Record<string, string[]>,
    mediador: 'Angelito, desde la tribuna: "Muchachos, esto se arregla con una minicargadora."',
    tips: [
      'Consejo: no le prestes la raqueta a Angelito, la va a querer arreglar.',
      'Consejo: si el Vikingo sube a la red, dejalo. Se va a perder solo.',
      'Consejo: la sombra de la pelota dice dónde va a picar. La pelota miente, la sombra no.',
      'Consejo: hacé correr al Rosco. Su espalda te lo va a agradecer. Él no.',
      'Consejo: no le hagas cargadas a Tincho. Te va a mirar. Nada más. Es peor.',
      'Consejo: a Volpi hacele una cargada antes de que saque. Se tienta.',
      'Consejo: globeá a Angelito. Mide lo que mide.',
      'Consejo: si ves a Betty, no te enamores. Ya está comprometida.',
      'Sí, esta pantalla de carga es falsa. Nos gusta el suspenso.',
      'Consejo: los gansos no aceptan sobornos. Salvo pan.',
    ],
    press: 'ENTER',
  },

  // ---------------------------------------------------------------- duelo de chicanas
  duel: {
    title: 'DUELO DE CHICANAS',
    prompt: 'Elegí tu réplica:',
    learned: '(ya la sabés)',
    rivalHurt: ['¡Grrr!', '...Touché.', 'Bueno, bueno. Empezamos.', 'Eso dolió.', 'Anotada. Me la voy a vengar.'],
    rivalLaugh: ['¡JAJA! ¿Esa es tu réplica?', 'Me la dejaste servida.', 'Esa no te la festeja ni tu vieja.', 'Dale, seguí practicando.'],
    tinchoHurt: '...',
    tinchoLaugh: '...',
    gansoWin: ['¡HONK! Réplica aprobada por el comité.', 'Tocado. Anotá esa en tu libretita.', 'Eso dolió más que una lumbar.'],
    gansoLose: ['...Y así no se contesta una chicana.', 'Don Ganso anota: "respuesta flojita".', '¡HONK! Hasta yo tengo mejores réplicas. Y soy un ganso.'],
    win: (rival: string) => `Arrancás con el primer paso de tu receta. ${rival} arranca calentito.`,
    lose: (rival: string) => `${rival} arranca con un pasito de su receta de ventaja.`,
    learnedNow: '¡Réplica aprendida! La próxima vez aparece marcada.',
    help: '↑↓ elegir · ENTER responder',
  },

  // ---------------------------------------------------------------- chicanas (rival → vos)
  // Cada una: lo que dice el rival, la réplica buena y respuestas malas (y graciosas).
  chicanas: {
    elRosco: [
      { id: 'ro1', line: 'Te voy a ganar tan despacio que vas a salir de acá jubilado.', good: 'Con esa espalda, el que se jubila en el segundo game sos vos.', bad: ['¿Jubilado? ¡Qué lindo, siempre quise viajar!', 'Eh... ¿vos también?'] },
      { id: 'ro2', line: 'Mi dejadita es tan corta que la pelota pide permiso para pasar la red.', good: 'Igual que vos para agacharte a buscarla: con turno en el quiropráctico.', bad: ['Qué pelota educada.', 'Yo tampoco paso la red. Ni la mía.'] },
      { id: 'ro3', line: 'Soy el Rey de Copas: te voy a guardar en la vitrina.', good: 'Tu vitrina tiene más polvo que la cancha de Spring Ridge.', bad: ['Tengo una vitrina de IKEA, si querés te la presto.', '¿Me limpiás primero?'] },
      { id: 'ro4', line: '¡Eso fue gol! ¡Y eso! ¡Y eso también!', good: 'Festejá tranquilo, que para el tercer grito ya no te da el aire.', bad: ['¿Gol? Pensé que jugábamos al paddle.', 'Yo también grito cuando me duele algo.'] },
      { id: 'ro5', line: 'Voy a correr cada pelota como si fuera la última.', good: 'Tranquilo, con tu aire va a ser la tercera.', bad: ['Qué intenso. ¿Querés agua?', 'Yo corro cada pelota como si fuera la primera: perdido.'] },
      { id: 'ro6', line: 'Mi risa se escucha desde el Chattahoochee.', good: 'Sí, los gansos creen que es otro ganso con dolor de espalda.', bad: ['¡Jajaja! ...perdón, me contagiaste.', 'El río tiene mejor oído que yo.'] },
      { id: 'ro7', line: 'Te voy a mover de lado a lado como a un péndulo.', good: '¿Vos moviendo a alguien? Si para darte vuelta necesitás tres puntos.', bad: ['Me encantan los péndulos. Son tan... pendulares.', 'Dale, pero despacito que me mareo.'] },
      { id: 'ro8', line: 'Tengo más recursos que vos: dejadita, dejadita y dejadita.', good: 'Y yo tengo un plan: hacerte correr hasta que digas "¡Ay, la lumbar!".', bad: ['Yo tengo drive, drive y... bueno, drive.', '¿Me pasás la receta?'] },
      { id: 'ro9', line: 'Mi quiropráctico me pidió que no gane tan fuerte.', good: 'Quedate tranquilo: hoy le vas a hacer caso.', bad: ['El mío me pidió que no juegue.', '¿Me pasás su número?'] },
    ],
    elSeba: [
      { id: 'se1', line: '¡Te voy a volear hasta la visa!', good: 'Tranquilo, que con tus errores no forzados el trámite lo hacés vos solo.', bad: ['¿La de turista o la de trabajo?', '¡Uy, dejé el pasaporte en el auto!'] },
      { id: 'se2', line: 'Subo a la red antes de que termines de sacar.', good: 'Ideal: te paso el globo por arriba y te despido con honores de Estado.', bad: ['¿Y si saco yo antes de que subas?', 'Yo subo a la red solo para cambiar de lado.'] },
      { id: 'se3', line: 'Tengo inmunidad diplomática: mis errores no cuentan.', good: 'Entonces hoy vas a necesitar una embajada entera.', bad: ['¿Y los míos cuentan doble?', 'Qué suerte. Yo tengo seguro de auto nomás.'] },
      { id: 'se4', line: '¡HEEEY!', good: 'Guardá el grito para cuando la mandes a la red, que va a ser pronto.', bad: ['¡HOOOO!', '¿Sí? ¿Me llamabas?'] },
      { id: 'se5', line: 'La Bombonera no tiembla: late. Y vos vas a temblar.', good: 'Lo único que tiembla acá es tu volea cuando te apurás.', bad: ['Yo tiemblo con el aire acondicionado del club.', '¿Late? Llamá a un cardiólogo.'] },
      { id: 'se6', line: 'Soy tan rápido que llego antes que la pelota.', good: 'Por eso le pegás antes de tiempo: "¡Uy, me apuré!" es tu segundo nombre.', bad: ['Yo llego antes que la pelota al vestuario.', 'Uh, ¿y la esperás?'] },
      { id: 'se7', line: 'Este partido lo resolvemos por la vía diplomática.', good: 'Dale: yo gano y vos firmás el acta de rendición.', bad: ['¿Hay catering?', 'Prefiero la vía rápida. La del peaje.'] },
      { id: 'se8', line: 'Esta mañana pesqué un bagre más grande que tu revés.', good: 'Y seguro que al bagre también lo tiraste a la red.', bad: ['¿Y lo devolviste al río? Muy ecológico.', 'Mi revés es chiquito pero cumplidor.'] },
    ],
    trueTincho: [
      { id: 'ti1', line: '...', good: '¿Eso es estrategia o estás esperando que te lo diga Maravilla?', bad: ['......', '¿Me estás hablando a mí?'] },
      { id: 'ti2', line: 'Bien.', good: '¿"Bien"? Con esos anteojos no ves si picó adentro o afuera.', bad: ['Bien, ¿y vos?', 'Muy bien. Excelente. Perfecto. ¿Seguimos?'] },
      { id: 'ti3', line: 'El tenis es un deporte serio.', good: 'Por eso nunca te vimos sonreír: te lo tomaste demasiado a pecho.', bad: ['¿En serio?', 'El mío es un deporte de riesgo.'] },
      { id: 'ti4', line: 'Te voy a pelotear hasta que te aburras.', good: 'No hace falta: con tu cara de póker me aburrí en el calentamiento.', bad: ['Traje un libro, por las dudas.', '¡Genial, me encanta pelotear!'] },
      { id: 'ti5', line: 'Cuando voy perdiendo, soy más peligroso.', good: 'Entonces hoy vas a ser peligrosísimo.', bad: ['Yo cuando voy perdiendo, lloro.', '¿Peligroso tipo cuchillo o tipo mate frío?'] },
      { id: 'ti6', line: 'Mi mate está más caliente que tu drive.', good: 'Y tu sonrisa, más fría que el agua del Chattahoochee.', bad: ['¿Me convidás uno?', 'Mi drive es de agua tibia, para no quemar.'] },
      { id: 'ti7', line: 'El paralelo no se ve venir.', good: 'Con esos anteojos negros, vos tampoco ves venir nada.', bad: ['¿El paralelo de qué? ¿De la ruta?', 'Yo veo venir todo: la pelota, el paralelo, el lunes.'] },
      { id: 'ti8', line: 'Arranco lento, pero después no paro.', good: 'Mientras arrancás, yo ya voy 3-0 y pidiendo agua.', bad: ['Yo arranco rápido y después me siento.', 'Como mi abuela con el auto.'] },
      { id: 'ti9', line: 'Racing es un sentimiento. Vos sos un trámite.', good: 'Y vos sos un "Bien." con anteojos.', bad: ['¿Qué trámite? ¿El DNI?', 'Yo también soy un sentimiento: culpa.'] },
    ],
    volpi: [
      { id: 'vo1', line: 'Betty me devuelve más pelotas que vos.', good: 'Betty por lo menos no se tienta cuando la pifia.', bad: ['Betty es una máquina, no vale.', 'Presentámela.'] },
      { id: 'vo2', line: 'Mi saque es tan fuerte que el radar pidió licencia.', good: 'Tranquilo: con una cargada te lo convierto en saque de abuela.', bad: ['¿Licencia por maternidad?', 'Mi radar es mi suegra.'] },
      { id: 'vo3', line: 'Te voy a tirar un globo que va a salir de la pantalla.', good: 'Dale, así mientras baja te da tiempo de parar de reírte.', bad: ['¿Qué pantalla? ¿Estamos en un videojuego?', 'Yo tiro globos de cumpleaños nomás.'] },
      { id: 'vo4', line: '¡Jajaja! Perdón, me acordé de tu revés.', good: 'Reíte, que con cada carcajada tu primer saque pierde diez kilómetros.', bad: ['¡Jajaja! Yo también me acuerdo.', 'Mi revés es muy gracioso, sí.'] },
      { id: 'vo5', line: 'Mi slice no pica: patina. Como tus excusas.', good: 'Por lo menos mis excusas no necesitan una lanzapelotas para funcionar.', bad: ['Mis excusas son de primera calidad.', '¿Patina? Pedile a Angelito que nivele la cancha.'] },
      { id: 'vo6', line: 'Soy el más grande de River.', good: '¿El más grande? Si Betty te lleva de la mano a todos lados.', bad: ['¿El más grande de altura?', 'Bueno, felicitaciones.'] },
      { id: 'vo7', line: 'Esto con Betty no me pasa.', good: 'Con Betty no te pasa porque Betty no te gana.', bad: ['¿Con quién? ¿Tu novia?', 'Esto a mí me pasa siempre.'] },
      { id: 'vo8', line: 'En mis anteojos espejados te vas a ver perdiendo.', good: 'Genial, así también ves la cara que ponés cuando te hago una cargada.', bad: ['¡Uh, estoy despeinado!', 'Me veo bien, gracias.'] },
    ],
    elVikingo: [
      { id: 'vi1', line: 'Tu revés es tan blando que Mabel lo cocina en tres minutos.', good: 'Y tu volea está más cruda que lo que nunca metés en Mabel.', bad: ['¿A cuántos grados?', 'Mi revés es sin TACC.'] },
      { id: 'vi2', line: '¡Valhalla! Hoy te mando al más allá.', good: 'Al más allá no sé, pero a la red no vas ni con GPS.', bad: ['¿Hay que llevar algo?', 'Yo al más allá voy los domingos.'] },
      { id: 'vi3', line: 'Te voy a tocar un solo de guitarra en la cara.', good: 'Si lo tocás como las voleas, va a salir desafinado.', bad: ['¿Sabés alguno de los Redondos?', 'Prefiero la flauta dulce.'] },
      { id: 'vi4', line: 'Mis passings cruzados son como un drakkar: llegan y saquean.', good: 'Y tus voleas son como un drakkar en un charco: no saben dónde están.', bad: ['¿Un drakkar es un tipo de mate?', 'A mí me saquearon el auto una vez.'] },
      { id: 'vi5', line: 'Mabel no aprueba tu estilo.', good: 'Mabel tampoco aprueba que la dejes sola por la guitarra.', bad: ['¿Quién es Mabel? ¿Tu suegra?', 'Mi estilo es libre, como el pollo de Mabel.'] },
      { id: 'vi6', line: 'Del fondo no me saca nadie.', good: 'Ni la red, que para vos es territorio desconocido.', bad: ['Del fondo del mar tampoco.', 'Yo del fondo no salgo porque no encuentro la puerta.'] },
      { id: 'vi7', line: 'Esto se fríe en 8 minutos.', good: 'Lo único que se fríe acá es tu cabeza cuando llegás a la red.', bad: ['¿Con aceite o sin aceite?', 'Yo me frío en 4, soy de piel clara.'] },
      { id: 'vi8', line: 'Mi barba es tan larga que te va a barrer la cancha.', good: 'Con suerte te barre la red, que nunca la pisás.', bad: ['¿Usás acondicionador?', 'Me encantaría tener tu barba. De verdad.'] },
    ],
    angelito: [
      { id: 'an1', line: '¡Te voy a pasar la minicargadora por encima!', good: 'Primero acordate dónde queda el centro de la cancha, maestro mayor de obras.', bad: ['¿Tiene cinturón de seguridad?', '¿Me llevás hasta el estacionamiento?'] },
      { id: 'an2', line: 'Llego a todas las pelotas.', good: 'Llegás a todas, sí. Después te quedás mirándolas con un "?" en la cabeza.', bad: ['Yo llego a todas las fiestas.', 'Qué bueno, ¿me alcanzás esa?'] },
      { id: 'an3', line: 'Esta cancha necesita una nivelación. Y vos también.', good: 'Nivelate vos, que los globos te pasan por arriba sin pedir permiso.', bad: ['¿Tenés nivel de burbuja?', 'Yo estoy nivelado, es el piso.'] },
      { id: 'an4', line: 'Soy tan rápido que me dicen Motor de Hormiga.', good: 'Y como las hormigas, después de pegar no sabés volver al hormiguero.', bad: ['A mí me dicen para pedirme plata.', '¿Motor de hormiga es nafta o diésel?'] },
      { id: 'an5', line: '¡Eso lo arreglo yo!', good: 'Como la red que arreglaste la semana pasada: ahora mide un metro y medio.', bad: ['¿Me arreglás la canilla?', 'Ok.'] },
      { id: 'an6', line: 'Soy neutral: no tengo club, así que no tengo nada que perder.', good: 'Tampoco tenés nada que ganar, así que estamos bien.', bad: ['¿Neutral como Suiza?', 'Yo tampoco tengo club. Tengo gimnasio.'] },
      { id: 'an7', line: 'Te voy a dejar la cancha llena de conos.', good: 'Y vos vas a quedar al lado de un cono, preguntándote dónde era el centro.', bad: ['Me encantan los conos. Son como sombreritos.', '¿De helado?'] },
      { id: 'an8', line: 'Mido poco, pero pego mucho.', good: 'Medís poco, pegás mucho... y la mandás toda afuera.', bad: ['Yo mido mucho y pego poco. Somos complementarios.', '¿Cuánto medís? Por curiosidad.'] },
    ],
    // Las usa cualquiera: se aprenden con uno y sirven contra todos.
    shared: [
      { id: 'sh1', line: 'Hoy te voy a hacer correr más que un ganso con hambre.', good: 'Don Ganso ya me avisó que vos no llegás al segundo game.', bad: ['¿Los gansos corren? Pensé que nadaban.', 'Hoy almorcé, estoy bien.'] },
      { id: 'sh2', line: 'Tu saque es tan lento que la pelota llega con barba.', good: 'Y aun así la devolvés a la red.', bad: ['¿Barba de pocos días o tupida?', 'La afeito en el camino.'] },
      { id: 'sh3', line: 'Jugás como si la raqueta fuera prestada.', good: 'Es prestada. Y aun así te voy a ganar.', bad: ['No, es mía, la pagué en cuotas.', '¿Me la querés comprar?'] },
      { id: 'sh4', line: 'En el grupo de WhatsApp ya saben que perdés.', good: 'Sí, lo leyeron en el mensaje que mandaste vos y nadie contestó.', bad: ['¿Qué grupo? ¿Me agregás?', 'Tengo el celular sin batería.'] },
      { id: 'sh5', line: 'Después del partido hay asado. Vos traé los pañuelos.', good: 'Genial, así por lo menos esta vez el fuego lo prendés vos.', bad: ['¿Hay chorizo?', 'Yo llevo la ensalada.'] },
      { id: 'sh6', line: 'Don Ganso está de mi lado.', good: 'Don Ganso no está del lado de nadie: se durmió en el primer game.', bad: ['¿El ganso? Es un pájaro, no un árbitro.', '¿De qué lado está la red?'] },
    ],
  },

  // ---------------------------------------------------------------- resultado y game over
  result: {
    won: '¡GANASTE!',
    lost: 'PERDISTE',
    towerNext: 'ENTER: seguir subiendo',
    towerLost: 'ENTER: seguir',
    absurd: {
      elRosco: 'Veces que se agarró la camiseta',
      elSeba: '"¡HEEEY!" gritados',
      trueTincho: 'Mates tomados',
      volpi: 'Carcajadas',
      elVikingo: 'Riffs de guitarra',
      angelito: 'Ajustes a la red',
      donGanso: 'Graznidos',
    } as Record<string, string>,
  },
  gameOver: {
    title: 'GAME OVER',
    cont: '¿CONTINUAR?',
    help: 'ENTER: continuar · ESC: rendirse',
    // Don Ganso cuenta y se impacienta (clave = número en pantalla).
    count: {
      10: 'Tomate tu tiempo.',
      8: 'Bueno, tampoco tanto.',
      6: 'Los gansos tenemos agenda, eh.',
      4: '¿Hola? ¿Hay alguien?',
      2: 'Me voy a dormir. Literal.',
      1: 'Zzz...',
      0: 'Listo. Te espero en el menú. ¡HONK!',
    } as Record<number, string>,
    again: ['¡Así me gusta! Otra vez al escalón.', 'Volvemos. Don Ganso ya se sabe el camino.'],
  },

  // ---------------------------------------------------------------- Boss
  boss: {
    title: 'EL GRAN CHATTAHOOCHEE',
    arrive: 'Algo viene por el río...',
    announce: 'Para ser el verdadero Chattahoochee, tenés que ganarle a todos. En el mismo partido. Sin llorar.',
    rules: 'Un game contra cada uno. Ganás el game: rival ELIMINADO. Lo perdés: perdés una lata y ese rival vuelve a la fila.',
    intro: {
      elRosco: '¡Llegó el Rey de Copas! Esperen que me bajo... ¡ay, la lumbar!',
      elSeba: '¡HEEEY! Vengo en misión diplomática.',
      trueTincho: '...Bien.',
      volpi: '¡Jajaja! Betty, amor, esperame en la orilla.',
      elVikingo: '¡VALHALLA! Mabel, precalentá a 200.',
      angelito: 'Este muelle necesita una nivelación. ¡Eso lo arreglo yo!',
    } as Record<string, string>,
    cans: 'LATAS',
    eliminated: 'ELIMINADO',
    next: (name: string) => `Próximo: ${name}`,
    backInLine: (name: string) => `${name} vuelve a la fila.`,
    lostCan: ['Una lata menos. Las pelotas lloran.', 'Perdiste una lata. Don Ganso la recicla.', 'Menos una lata. Sin llorar, dijimos.'],
    wonGame: ['¡ELIMINADO! A la orilla.', 'Uno menos. El río lo espera.', '¡Afuera! Y no lo digo por la pelota.'],
    lastCan: '¡Última lata! Sin presión. Bueno, con toda la presión.',
    betty: ['¡BIP BIP!', 'PUNTO. REGISTRADO.', '¡ÁNIMO, HUMANO!'],
    mabel: ['¡DING!', '¡DING DING!', 'Crocante.'],
    victory: ['Los cinco te levantan en andas...', '...y ¡AL RÍO!', '¡SPLASH! Sos el verdadero Chattahoochee.'],
  },

  // ---------------------------------------------------------------- finales (3 viñetas cada uno)
  endings: {
    elRosco: [
      { caption: 'El Rosco levanta la copa, se agarra la camiseta y grita el gol más largo de la historia.', bubble: '¡GOOOOOOOL!' },
      { caption: 'A mitad del grito, algo hace "crac".', bubble: '¡AY, LA LUMBAR!' },
      { caption: 'Quiropráctico, turno de las 9. Boca abajo, abrazado a la copa. El Rey de Copas, finalmente con copa.', bubble: 'No me la saquen.' },
    ],
    elSeba: [
      { caption: 'La copa es declarada "valija diplomática". Nadie la puede revisar. Ni tocar. Ni mirar mucho.', bubble: 'Convención de Viena, muchachos.' },
      { caption: 'La Bombonera no tiembla: late.', bubble: '¡HEEEEEEY!' },
      { caption: 'Días después, en el Chattahoochee: la copa hace de balde de carnada. Los bagres, emocionados.', bubble: 'Pican más con copa.' },
    ],
    trueTincho: [
      { caption: 'True Tincho gana. Se sienta. Toma un mate. No sonríe.', bubble: '...' },
      { caption: '¿Qué haría Maravilla en este momento?', bubble: 'Exactamente esto.' },
      { caption: 'Zoom extremo. Fuentes confiables confirman: sonrió. Un píxel.', bubble: '' },
    ],
    volpi: [
      { caption: 'Betty festeja disparando 400 pelotas. El club declara emergencia amarilla.', bubble: '¡FIESTA. FIESTA. FIESTA.!' },
      { caption: 'Volpi se ríe tanto que no puede levantar la copa.', bubble: '¡Jajajaja! Esperá... ¡jajaja!' },
      { caption: 'Al final, la copa la sostiene Betty. Como siempre, hace todo ella.', bubble: 'COPA. ASEGURADA.' },
    ],
    elVikingo: [
      { caption: 'El Vikingo mira la copa, la da vuelta, la huele.', bubble: '¿Se puede freír una copa?' },
      { caption: 'Mabel no duda un segundo.', bubble: '¡DING! Todo se puede freír.' },
      { caption: 'Solo de guitarra sobre un drakkar navegando el Chattahoochee. Los gansos hacen los coros.', bubble: '¡VALHALLAAA!' },
    ],
    angelito: [
      { caption: 'Angelito usa la copa como maceta. Plantó un limonero. Crece torcido, pero crece.', bubble: 'Le falta nivelación.' },
      { caption: 'Con la minicargadora construye un estadio en el jardín. Sin permisos. Sin planos. Con mucho amor.', bubble: '¡Eso lo arreglo yo!' },
      { caption: 'La foto oficial del campeón. Angelito salió fuera de cuadro: se olvidó de volver al centro.', bubble: '¿Dónde estaba el centro?' },
    ],
    donGanso: [
      { caption: 'Don Ganso levanta la copa con el pico. Pesa más que él. No le importa.', bubble: '¡HONK!' },
      { caption: 'Usa la copa de nido. Es el nido más caro de todo el Chattahoochee.', bubble: 'Mía. Lo canto yo.' },
      { caption: 'Al día siguiente vuelve a su silla. Alguien tiene que cantar los puntos.', bubble: '15-0. ¿Qué miran?' },
    ],
  } as Record<string, { caption: string; bubble: string }[]>,
  unlock: {
    outfit: (name: string, outfit: string) => `¡TRAJE DESBLOQUEADO! ${name}: ${outfit}`,
    ganso: '¡DON GANSO JUGABLE DESBLOQUEADO! Ganaste la torre con los seis. Ahora el umpire baja a la cancha.',
    towers: (n: number) => `Torres ganadas: ${n} de 6`,
    end: 'ENTER: créditos',
  },

  // ---------------------------------------------------------------- splash y título
  splash: {
    studio: 'CHATTAHOOCHEES GAMES',
    presents: 'presenta...',
    goose: '¡HONK! (Esto es un logo. Aplaudan.)',
  },
  titleScreen: {
    press: 'APRETÁ ENTER',
    pressSub: '(o cualquier tecla, no somos exigentes)',
    version: 'v1.0 · hecho en Atlanta con nostalgia rioplatense',
  },

  // ---------------------------------------------------------------- menú principal
  mainMenu: {
    items: [
      { id: 'tower', label: 'TORRE DE LOS CHATTAHOOCHEES', desc: 'Cinco rivales, un Boss y un ganso que lo cuenta todo. Un jugador.' },
      { id: 'friendly', label: 'AMISTOSO', desc: 'Dos jugadores, un teclado y una amistad en riesgo. También vale contra la CPU.' },
      { id: 'practice', label: 'PRÁCTICA CON BETTY', desc: 'Betty te tira pelotas. No es personal. Bueno, un poco sí.' },
      { id: 'options', label: 'OPCIONES', desc: 'Para los que leen el manual. Duración, dificultad, volumen y teclas.' },
      { id: 'howto', label: 'CÓMO JUGAR', desc: 'Spoiler: se le pega a la pelota. Pero hay detalles.' },
      { id: 'credits', label: 'CRÉDITOS', desc: 'Quién tiene la culpa de todo esto. Hay casamiento.' },
    ],
    help: '↑↓ elegir · ENTER confirmar',
    gansoIdle: ['Elegí algo. No tengo todo el día. Bueno, sí tengo.', 'Don Ganso recomienda la torre. Don Ganso recomienda todo.'],
  },

  // ---------------------------------------------------------------- amistoso (antes, menú de prueba)
  friendly: {
    title: 'AMISTOSO',
    sub: 'Elegí modo, sede y jugadores. Nadie pierde amigos. Casi nadie.',
    chicanas: 'Chicanas',
    chicanasValues: ['No', 'Sí'],
  },

  // ---------------------------------------------------------------- opciones
  options: {
    title: 'OPCIONES',
    rows: {
      games: 'Duración',
      difficulty: 'Dificultad',
      music: 'Música',
      sfx: 'Efectos',
      keys: 'Teclas',
      reset: 'Borrar progreso',
      back: 'Volver',
    },
    keysValue: 'ENTER para cambiar',
    resetValue: 'ENTER (pide confirmación)',
    resetConfirm: '¿Seguro? Se borran torres, trajes, chicanas aprendidas y Don Ganso. ENTER sí · ESC no',
    resetDone: 'Listo. Borrón y cuenta nueva. Don Ganso no se acuerda de nada.',
    help: '↑↓ elegir · ←→ cambiar · ESC volver',
    gansoTips: {
      games: 'En la torre, "4 games" es lo del documento. "2" es para los apurados. Como Seba.',
      difficulty: '"Nivel Chattahoochee" es para los que juegan los jueves.',
      music: 'Chiptune artesanal. Sin conservantes.',
      sfx: 'Incluye graznidos. No se pueden sacar los graznidos.',
      keys: 'Cambiá las teclas de golpe, slice, especial y cargada.',
      reset: 'Para empezar de cero. O para ocultar pruebas.',
      back: 'Volvé cuando quieras. Acá no se cobra entrada.',
    } as Record<string, string>,
  },
  keys: {
    title: 'TECLAS',
    who: ['1 jugador', 'Jugador 1 (2P)', 'Jugador 2 (2P)'],
    actions: ['Golpe', 'Slice / globo', 'Especial', 'Cargada'],
    moves: ['Flechas o WASD', 'WASD', 'Flechas'],
    move: 'Mover',
    press: 'Apretá la tecla nueva... (ESC cancela)',
    reset: 'Restaurar teclas',
    back: 'Volver',
    help: '←→ jugador · ↑↓ acción · ENTER cambiar · ESC volver',
    pad: 'Joystick: A golpe · B slice · X especial · Y cargada · START pausa',
  },

  // ---------------------------------------------------------------- cómo jugar
  howto: {
    title: 'CÓMO JUGAR',
    pages: [
      {
        title: 'Controles',
        lines: [
          '1 JUGADOR: flechas o WASD mueven · Z golpe (mantené = más fuerte) · X slice (mantené = globo)',
          'C especial · V cargada · ESC o ENTER pausa',
          '2 JUGADORES: J1 = WASD, F golpe, G slice, H especial, R cargada, ESC pausa',
          'J2 = flechas, K golpe, L slice, Ñ (o ;) especial, I cargada, ENTER pausa',
          'JOYSTICK: A golpe · B slice · X especial · Y cargada · START pausa (uno por jugador)',
          'Las teclas se pueden cambiar en Opciones.',
        ],
      },
      {
        title: 'El golpe',
        lines: [
          'Cuando la pelota entra en tu zona, apretá golpe o slice.',
          'TIMING: temprano sale cruzada; tarde, paralela. Izquierda/derecha también apuntan.',
          'PROFUNDIDAD: mantené arriba para pegar profundo; abajo, dejadita o golpe corto.',
          'Cerca de la red el golpe es volea. Si viene alta, smash.',
          'La SOMBRA te dice dónde va a picar. La pelota miente; la sombra, no.',
          'Si no llegás, apretá golpe corriendo: te tirás de palomita.',
        ],
      },
      {
        title: 'Saque y aire',
        lines: [
          'SAQUE: golpe tira la pelota; golpe otra vez le pega. El medidor sube y baja:',
          'cuanto más arriba, más fuerte... y más riesgo de falta. Izquierda/derecha eligen el lado.',
          'El segundo saque es más seguro (con efecto). Una doble falta la canta Don Ganso con gusto.',
          'AIRE: la barrita debajo de tu nombre. Correr mucho la baja; sin aire, sos más lento.',
          'Se recupera entre puntos. Al Rosco se le acaba antes (y lo sabe).',
        ],
      },
      {
        title: 'Mística y especiales',
        lines: [
          'Cada personaje tiene una RECETA de 3 pasos (los casilleros al lado del marcador).',
          'Cumplilos en cualquier orden: con los 3, "¡ESPECIAL LISTO!" y lo usás con C (uno por game).',
          'La CARGADA (V) después de ganar un punto suma para algunas recetas.',
          'Después de perderlo... te deja en ridículo. Y a Volpi lo hace tentar.',
          'En la pausa se ven las recetas completas de los dos.',
        ],
      },
      { title: 'Recetas', lines: [] },
      {
        title: 'Torre y chicanas',
        lines: [
          'En la torre enfrentás a los otros cinco y después al Boss: EL GRAN CHATTAHOOCHEE.',
          'Antes de cada partido, DUELO DE CHICANAS: elegí la réplica buena y arrancás con ventaja.',
          'Las réplicas que aprendés quedan guardadas (aparecen en verde).',
          'En el Boss jugás un game contra cada uno, con 3 latas de pelotas como vidas.',
          'Ganá la torre con un personaje para desbloquear su traje. Con los seis... sorpresa.',
        ],
      },
    ],
    help: '←→ página · ESC volver',
  },

  // ---------------------------------------------------------------- práctica con Betty
  practice: {
    title: 'PRÁCTICA CON BETTY',
    stats: (r: number, s: number, b: number) => `DEVOLUCIONES ${r} · RACHA ${s} · MEJOR ${b}`,
    hello: 'HOLA, HUMANO. INICIANDO PROGRAMA DE ENTRENAMIENTO. PREPARE RAQUETA.',
    programs: {
      normal: 'PROGRAMA: PELOTEO NORMAL.',
      wide: 'PROGRAMA: PELOTAS ABIERTAS. CORRA, HUMANO.',
      short: 'PROGRAMA: DEJADITAS. SUBA A LA RED.',
      deep: 'PROGRAMA: PROFUNDAS. PARA ATRÁS, HUMANO.',
      lob: 'PROGRAMA: GLOBOS. MIRE PARA ARRIBA.',
      mix: 'PROGRAMA: SORPRESA. NI YO SÉ QUÉ VIENE.',
    } as Record<string, string>,
    good: ['DEVOLUCIÓN REGISTRADA.', 'BIEN, HUMANO.', 'ÁNGULO ACEPTABLE.', 'VOLPI ESTARÍA ORGULLOSO. O SE REIRÍA.'],
    miss: ['ERROR DETECTADO. RECALIBRANDO HUMANO.', 'ESA NO. INTENTE OTRA VEZ.', 'LA PELOTA ERA LA AMARILLA.', 'PELOTA PERDIDA. SE DESCUENTA DE SU SUELDO.'],
    streak: (n: number) => `RACHA DE ${n}. PROCESANDO EMOCIÓN... ¡BIP!`,
    mabel: ['¿VIO A MABEL? NO, POR NADA.', 'MABEL DICE QUE ESA FUE CROCANTE.', 'MI TOLVA ESTÁ LLENA. DE PELOTAS. Y DE SENTIMIENTOS.'],
    help: 'ESC: pausa (y salir)',
  },

  // ---------------------------------------------------------------- créditos
  credits: {
    title: 'CRÉDITOS',
    lines: [
      ['UN JUEGO DE LOS CHATTAHOOCHEES', ''],
      ['', ''],
      ['Dirección de dejaditas', 'EL ROSCO'],
      ['Relaciones internacionales y voleas', 'EL SEBA'],
      ['Departamento de seriedad', 'TRUE TINCHO'],
      ['Globos y carcajadas', 'VOLPI'],
      ['Fritura y guitarra eléctrica', 'EL VIKINGO'],
      ['Obras, nivelación y minicargadora', 'ANGELITO'],
      ['Arbitraje y narración', 'DON GANSO'],
      ['Lanzamiento de pelotas', 'BETTY'],
      ['Catering', 'MABEL'],
      ['Ardillas, ciervos y gansos', 'LA FAUNA DE GEORGIA'],
      ['Río', 'EL CHATTAHOOCHEE'],
      ['', ''],
      ['Ningún quiropráctico fue lastimado', 'durante la producción de este juego.'],
      ['Las chicanas son de ficción.', 'Los errores no forzados, no.'],
    ] as [string, string][],
    wedding: {
      title: 'Y AHORA SÍ...',
      lines: [
        ['DON GANSO', 'Estamos reunidos a orillas del Chattahoochee para unir a esta lanzapelotas y a esta freidora.'],
        ['DON GANSO', 'Betty, ¿aceptás a Mabel, en la fritura y en la humedad, en el ace y en la doble falta?'],
        ['BETTY', 'AFIRMATIVO. CORAZÓN AL 100%.'],
        ['DON GANSO', 'Mabel, ¿aceptás a Betty, a 200 grados y a temperatura ambiente?'],
        ['MABEL', '¡DING!'],
        ['DON GANSO', 'Por el poder que me confiere la silla de umpire... los declaro electrodomésticos felices.'],
        ['DON GANSO', '¡HONK! Puede tirar la pelota a la novia.'],
      ] as [string, string][],
    },
    end: 'FIN',
    thanks: 'Gracias por jugar. Ahora, a la cancha de verdad.',
    help: 'ENTER: seguir · ESC: volver al menú',
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
      taunts: 'Cargadas',
      specials: 'Especiales',
      lumbar: 'Veces que se agarró la espalda',
    },
  },
};

/** Elige un elemento al azar (para comentarios). */
export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
