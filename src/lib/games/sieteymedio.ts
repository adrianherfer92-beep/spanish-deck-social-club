import { fullDeck, shuffled, rankOf, type Card } from "./cards";
import { fail, type GameEngine } from "./types";

export const cardValue = (c: Card) => (rankOf(c) >= 10 ? 0.5 : rankOf(c));
export const handValue = (h: Card[]) => h.reduce((t, c) => t + cardValue(c), 0);

export interface SieteState {
  hands: Card[][];
  deck: Card[];
  turn: number;
  standing: boolean[];
  over: boolean;
}

function nextTurn(s: SieteState) {
  const n = s.hands.length;
  for (let k = 1; k <= n; k++) {
    const i = (s.turn + k) % n;
    if (!s.standing[i]) {
      s.turn = i;
      return;
    }
  }
  s.over = true;
}

export const sieteymedio: GameEngine<SieteState> = {
  id: "siete-y-medio",
  name: "Siete y medio",
  minPlayers: 2,
  maxPlayers: 8,
  init(n) {
    const deck = shuffled(fullDeck());
    const hands = Array.from({ length: n }, () => [deck.shift()!]);
    return { hands, deck, turn: 0, standing: Array(n).fill(false), over: false };
  },
  move(s, seat, a) {
    if (s.over) fail("La partida ha terminado.");
    if (seat !== s.turn) fail("No es tu turno.");
    const next: SieteState = structuredClone(s);
    if (a.type === "draw") {
      if (next.deck.length === 0) fail("No quedan cartas.");
      next.hands[seat].push(next.deck.shift()!);
      const v = handValue(next.hands[seat]);
      if (v >= 7.5) {
        next.standing[seat] = true;
        nextTurn(next);
      }
    } else if (a.type === "stand") {
      next.standing[seat] = true;
      nextTurn(next);
    } else fail("Jugada desconocida.");
    return next;
  },
  view(s, seat) {
    return {
      turn: s.turn,
      over: s.over,
      standing: s.standing,
      deckCount: s.deck.length,
      // La primera carta de cada jugador va boca abajo hasta el final.
      hands: s.hands.map((h, i) => (s.over || i === seat ? h : [null, ...h.slice(1)])),
      values: s.hands.map((h, i) => (s.over || i === seat ? handValue(h) : null)),
    };
  },
  ranking(s) {
    if (!s.over) return null;
    return s.hands
      .map((h, i) => ({ i, v: handValue(h), n: h.length }))
      .sort((a, b) => {
        const ab = a.v > 7.5, bb = b.v > 7.5;
        if (ab !== bb) return ab ? 1 : -1;
        if (ab) return a.v - b.v;
        return b.v - a.v || a.n - b.n;
      })
      .map((x) => x.i);
  },
};
