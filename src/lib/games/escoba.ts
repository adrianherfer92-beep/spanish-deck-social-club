import { fullDeck, shuffled, rankOf, suitOf, sortHand, type Card } from "./cards";
import { fail, type GameEngine } from "./types";

export const escobaValue = (c: Card) => {
  const r = rankOf(c);
  return r <= 7 ? r : r - 2; // sota 8, caballo 9, rey 10
};

export interface EscobaState {
  hands: Card[][];
  deck: Card[];
  table: Card[];
  captured: Card[][];
  escobas: number[];
  turn: number;
  lastCapturer: number | null;
  over: boolean;
  scores: number[] | null;
  lastMove: { seat: number; card: Card; took: Card[]; escoba: boolean } | null;
}

export function scoreEscoba(captured: Card[][], escobas: number[]): number[] {
  const n = captured.length;
  const scores = escobas.slice();
  const award = (metric: (cs: Card[]) => number) => {
    const vals = captured.map(metric);
    const max = Math.max(...vals);
    const leaders = vals.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
    if (max > 0 && leaders.length === 1) scores[leaders[0]] += 1;
  };
  award((cs) => cs.length); // más cartas
  award((cs) => cs.filter((c) => suitOf(c) === "o").length); // más oros
  award((cs) => cs.filter((c) => rankOf(c) === 7).length); // más sietes
  for (let i = 0; i < n; i++) if (captured[i].includes("o7")) scores[i] += 1; // siete de oros (el "velo")
  return scores;
}

export const escoba: GameEngine<EscobaState> = {
  id: "escoba",
  name: "La Escoba",
  minPlayers: 2,
  maxPlayers: 4,
  init(n) {
    const deck = shuffled(fullDeck());
    const hands = Array.from({ length: n }, () => sortHand(deck.splice(0, 3)));
    const table = deck.splice(0, 4);
    return {
      hands, deck, table,
      captured: Array.from({ length: n }, () => []),
      escobas: Array(n).fill(0),
      turn: 0, lastCapturer: null, over: false, scores: null, lastMove: null,
    };
  },
  move(s, seat, a) {
    if (s.over) fail("La partida ha terminado.");
    if (seat !== s.turn) fail("No es tu turno.");
    if (a.type !== "play") fail("Jugada desconocida.");
    const card = String(a.card);
    const take = Array.isArray(a.take) ? (a.take as unknown[]).map(String) : [];
    const next: EscobaState = structuredClone(s);
    if (!next.hands[seat].includes(card)) fail("No tienes esa carta.");
    if (new Set(take).size !== take.length || take.some((c) => !next.table.includes(c))) fail("Cartas de mesa no válidas.");
    next.hands[seat] = next.hands[seat].filter((c) => c !== card);
    let escobaHecha = false;
    if (take.length > 0) {
      const sum = escobaValue(card) + take.reduce((t, c) => t + escobaValue(c), 0);
      if (sum !== 15) fail(`Las cartas deben sumar 15 (suman ${sum}).`);
      next.table = next.table.filter((c) => !take.includes(c));
      next.captured[seat].push(card, ...take);
      next.lastCapturer = seat;
      if (next.table.length === 0) {
        next.escobas[seat] += 1;
        escobaHecha = true;
      }
    } else {
      next.table.push(card);
    }
    next.lastMove = { seat, card, took: take, escoba: escobaHecha };
    const n = s.hands.length;
    next.turn = (seat + 1) % n;
    if (next.hands.every((h) => h.length === 0)) {
      if (next.deck.length > 0) {
        for (let i = 0; i < n; i++) next.hands[i] = sortHand(next.deck.splice(0, 3));
      } else {
        if (next.lastCapturer !== null) next.captured[next.lastCapturer].push(...next.table);
        next.table = [];
        next.over = true;
        next.scores = scoreEscoba(next.captured, next.escobas);
      }
    }
    return next;
  },
  view(s, seat) {
    return {
      table: s.table,
      turn: s.turn,
      over: s.over,
      scores: s.scores,
      escobas: s.escobas,
      capturedCounts: s.captured.map((c) => c.length),
      counts: s.hands.map((h) => h.length),
      deckCount: s.deck.length,
      hand: seat >= 0 ? s.hands[seat] : [],
      lastMove: s.lastMove,
    };
  },
  ranking(s) {
    if (!s.over || !s.scores) return null;
    const sc = s.scores;
    return sc.map((v, i) => ({ v, i, c: s.captured[i].length })).sort((a, b) => b.v - a.v || b.c - a.c).map((x) => x.i);
  },
};
