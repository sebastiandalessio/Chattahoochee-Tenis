// La "mística" de cada personaje: receta de 3 pasos, especial, pasiva y debilidad.
// Datos puros (los textos que se muestran están en src/texts/es.ts).

export type CharId = 'elRosco' | 'elSeba' | 'trueTincho' | 'volpi' | 'elVikingo' | 'angelito';

export type StepId =
  | 'winDrop' // ganar un punto con dejadita o golpe corto
  | 'tauntAfterWin' // cargada después de ganar un punto
  | 'rally5Air' // terminar un peloteo de 5+ golpes sin quedarse sin aire
  | 'winVolley' // ganar un punto con volea
  | 'longRun' // llegar corriendo a una pelota muy lejana y devolverla
  | 'behind' // estar abajo en el marcador del game o del set
  | 'mateLosing' // tomar un mate (cargada) yendo abajo
  | 'winRally4' // ganar un peloteo de 4+ golpes
  | 'aceOrServeWinner' // ace o saque ganador
  | 'winLob' // ganar un punto con globo
  | 'baseline6' // ganar un peloteo de 6+ golpes desde el fondo
  | 'crossPass' // passing cruzado ganador
  | 'tauntAny' // hacer la cargada
  | 'impossible3' // devolver 3 pelotas "imposibles" (estirándose o de palomita)
  | 'center3'; // volver al centro a tiempo 3 veces

export type SpecialId = 'reyDeCopas' | 'dinein' | 'paralelo' | 'betty' | 'frita' | 'minicargadora';

/** Los especiales "de golpe" modifican el próximo golpe; los otros duran el resto del punto. */
export const SHOT_SPECIALS: SpecialId[] = ['reyDeCopas', 'paralelo', 'betty', 'frita'];

export interface CharRules {
  recipe: [StepId, StepId, StepId];
  special: SpecialId;
}

export const RULES: Record<CharId, CharRules> = {
  elRosco: { recipe: ['winDrop', 'tauntAfterWin', 'rally5Air'], special: 'reyDeCopas' },
  elSeba: { recipe: ['winVolley', 'tauntAfterWin', 'longRun'], special: 'dinein' },
  trueTincho: { recipe: ['behind', 'mateLosing', 'winRally4'], special: 'paralelo' },
  volpi: { recipe: ['aceOrServeWinner', 'winLob', 'tauntAfterWin'], special: 'betty' },
  elVikingo: { recipe: ['baseline6', 'crossPass', 'tauntAny'], special: 'frita' },
  angelito: { recipe: ['impossible3', 'center3', 'tauntAny'], special: 'minicargadora' },
};

/** Cuántas veces hay que hacer los pasos que se cuentan. */
export const STEP_TARGET: Partial<Record<StepId, number>> = {
  impossible3: 3,
  center3: 3,
};

export function isCharId(v: unknown): v is CharId {
  return typeof v === 'string' && v in RULES;
}
