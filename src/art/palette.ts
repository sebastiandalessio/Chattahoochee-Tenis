// Paleta maestra (~48 colores). Todo el arte de personajes sale de acá.
// Tonos de piel, pelo y barba tomados de las fotos de referencia.

export const PAL = {
  // Neutros
  ink: '#1a1622',
  dark: '#2b2735',
  grey1: '#4a4656',
  grey2: '#6e6a7c',
  grey3: '#9a97a8',
  grey4: '#c8c6d2',
  white: '#f6f3ea',

  // Pieles
  skinFair: '#f3c7a6',
  skinFairShadow: '#d99c7e',
  skinRosy: '#f0b394',
  skinRosyShadow: '#d0876c',
  skinWarm: '#e6b089',
  skinWarmShadow: '#c48863',
  skinOlive: '#d9a57f',
  skinOliveShadow: '#b3805e',
  blush: '#e88c78',

  // Pelo y barba
  hairBlack: '#1e1a1c',
  hairBlackHi: '#403838',
  hairDarkBrown: '#3a2a22',
  hairDarkBrownHi: '#5b4334',
  hairBrown: '#5e4231',
  hairBrownHi: '#86644a',
  hairDarkBlond: '#a8845a',
  hairDarkBlondHi: '#c9a878',
  beardBrown: '#7a5638',
  beardBrownDark: '#58391f',
  beardAuburn: '#a0592e',
  beardAuburnDark: '#6e3a1c',
  beardGrey: '#cfc6b8',
  stubble: '#b88d72',

  // Ropa y clubes
  red: '#d7262d',
  redDark: '#8f1820',
  blue: '#1f45a6',
  blueDark: '#15306e',
  yellow: '#f5c42c',
  yellowDark: '#b98c16',
  celeste: '#78c8f0',
  celesteDark: '#3f8ec2',
  navy: '#25294d',
  navyDark: '#171a33',
  olive: '#6d6b3f',
  oliveDark: '#4b4a2b',
  denim: '#5d7593',
  denimDark: '#435771',
  green: '#3e9150',
  orange: '#f28a22',
  hiVis: '#d9f23e',

  // Objetos
  wood: '#8c5a2e',
  woodDark: '#5a3819',
  gold: '#eac245',
  silver: '#b9c1cd',
  pink: '#f2a2bb',
  mirror: '#8cbcea',
  mouth: '#7a2630',
} as const;

export type PalKey = keyof typeof PAL;
