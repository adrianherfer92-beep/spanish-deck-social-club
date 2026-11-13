import { fullDeck, shuffled, suitOf, rankOf, rankIndex, sortHand, SUITS, type Card, type Suit } from "./cards";
import { fail, type GameEngine } from "./types";

export interface CinquilloState {
  hands: Card[][];
  table: Record<Suit, [number, number] | null>; // índices min/max en RANKS
  turn: number;
  opened: boolean;
  winner: number | null;
  log: string[];
}

function legal(s: CinquilloState, c: Card): boolean {
  const suit = suitOf(c), idx = rankIndex(rankOf(c));
  if (!s.opened) return c === "o5";
  const row = s.table[suit];
  if (!row) return rankOf(c) === 5;
  return idx === row[0] - 1 || idx === row[1] + 1;
}

export const cinquillo: GameEngine<CinquilloState> = {
  id: "cinquillo",
  name: "Cinquillo",
  minPlayers: 2,
  maxPlayers: 8,
  init(n) {
    const deck = shuffled(fullDeck());
    const hands: Card[][] = Array.from({ length: n }, () => []);
    deck.forEach((c, i) => hands[i % n].push(c));
    const starter = hands.findIndex((h) => h.includes("o5"));
    return {
      hands: hands.map(sortHand),
      table: { o: null, c: null, e: null, b: null },
      turn: starter,
      opened: false,
      winner: null,
      log: ["Empieza quien tiene el 5 de oros."],
    };
  },
  move(s, seat, a) {
    if (s.winner !== null) fail("La partida ha terminado.");
    if (seat !== s.turn) fail("No es tu turno.");
    const hand = s.hands[seat];
    const next: CinquilloState = structuredClone(s);
    if (a.type === "play") {
      const c = String(a.card);
      if (!hand.includes(c)) fail("No tienes esa carta.");
      if (!legal(s, c)) fail("Esa carta no se puede colocar.");
      const suit = suitOf(c), idx = rankIndex(rankOf(c));
      const row = next.table[suit];
      next.table[suit] = row ? [Math.min(row[0], idx), Math.max(row[1], idx)] : [idx, idx];
      next.opened = true;
      next.hands[seat] = hand.filter((x) => x !== c);
      next.log = [`play:${seat}:${c}`, ...s.log].slice(0, 12);
      if (next.hands[seat].length === 0) {
        next.winner = seat;
        return next;
      }
    } else if (a.type === "pass") {
      if (hand.some((c) => legal(s, c))) fail("Tienes cartas que puedes jugar.");
      next.log = [`pass:${seat}`, ...s.log].slice(0, 12);
    } else fail("Jugada desconocida.");
    next.turn = (seat + 1) % s.hands.length;
    return next;
  },
  view(s, seat) {
    return {
      table: s.table,
      turn: s.turn,
      winner: s.winner,
      log: s.log,
      counts: s.hands.map((h) => h.length),
      hand: seat >= 0 ? s.hands[seat] : [],
      playable: seat >= 0 && seat === s.turn ? s.hands[seat].filter((c) => legal(s, c)) : [],
      suits: SUITS,
    };
  },
  ranking(s) {
    if (s.winner === null) return null;
    return s.hands
      .map((h, i) => ({ i, n: h.length }))
      .sort((a, b) => a.n - b.n || (a.i === s.winner ? -1 : 0))
      .map((x) => x.i);
  },
};
