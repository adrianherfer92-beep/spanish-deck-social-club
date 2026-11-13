export type Action = Record<string, unknown> & { type: string };

export interface GameEngine<S = any> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  init(players: number): S;
  /** Aplica una jugada; lanza Error con mensaje legible si no es válida. */
  move(state: S, seat: number, action: Action): S;
  /** Vista para un jugador concreto (oculta cartas ajenas). seat = -1 → espectador. */
  view(state: S, seat: number): unknown;
  /** Asientos ordenados por posición final, o null si la partida sigue. */
  ranking(state: S): number[] | null;
}

export class MoveError extends Error {}
export const fail = (msg: string): never => {
  throw new MoveError(msg);
};
