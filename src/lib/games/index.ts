import { cinquillo } from "./cinquillo";
import { burro } from "./burro";
import { sieteymedio } from "./sieteymedio";
import { escoba } from "./escoba";
import type { GameEngine } from "./types";

export const ENGINES: Record<string, GameEngine> = {
  [cinquillo.id]: cinquillo,
  [burro.id]: burro,
  [sieteymedio.id]: sieteymedio,
  [escoba.id]: escoba,
};
