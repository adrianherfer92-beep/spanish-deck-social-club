import { fullDeck, shuffled, suitOf, rankOf, sortHand, type Card } from "./cards";
import { fail, type GameEngine } from "./types";

// Fuerza dentro del palo: As > Rey > Caballo > Sota > 7 ... > 2
const STRENGTH = [1, 12, 11, 10, 7, 6, 5, 4, 3, 2];
const strength = (c: Card) => 10 - STRENGTH.indexOf(rankOf(c));

export interface BurroState {
  hands: Card[][];
  deck: Card[];
  trick: { seat: number; card: Card }[];
  leader: number;
  turn: number;
  passed: number[]; // asientos que han pasado en esta baza
  finished: number[]; // orden en que se quedan sin cartas
  over: boolean;
  lastTrick: { seat: number; card: Card }[] | null;
  lastWinner: number | null;
}

const active = (s: BurroState, i: number) => !s.finished.includes(i);
function nextActive(s: BurroState, from: number): number {
  const n = s.hands.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (active(s, i)) return i;
  }
  return from;
}
const ledSuit = (s: BurroState) => (s.trick[0] ? suitOf(s.trick[0].card) : null);

function closeTrickIfDone(s: BurroState) {
  const participants = s.hands.map((_, i) => i).filter((i) => active(s, i) || s.trick.some((t) => t.seat === i));
  const acted = new Set([...s.trick.map((t) => t.seat), ...s.passed]);
  const pending = participants.filter((i) => !acted.has(i) && active(s, i));
  if (pending.length > 0) return;
  const suit = ledSuit(s)!;
  const winner = s.trick.filter((t) => suitOf(t.card) === suit).sort((a, b) => strength(b.card) - strength(a.card))[0].seat;
  s.lastTrick = s.trick;
  s.lastWinner = winner;
  s.trick = [];
  s.passed = [];
  const remaining = s.hands.map((_, i) => i).filter((i) => active(s, i));
  if (remaining.length <= 1) {
    s.over = true;
    return;
  }
  s.leader = active(s, winner) ? winner : nextActive(s, winner);
  s.turn = s.leader;
}

function advance(s: BurroState, seat: number) {
  if (s.hands[seat].length === 0 && !s.finished.includes(seat)) s.finished.push(seat);
  const remaining = s.hands.map((_, i) => i).filter((i) => active(s, i));
  if (remaining.length <= 1 && s.trick.length === 0) {
    s.over = true;
    return;
  }
  // ¿Quién falta por actuar en esta baza?
  const acted = new Set([...s.trick.map((t) => t.seat), ...s.passed]);
  const n = s.hands.length;
  for (let k = 1; k <= n; k++) {
    const i = (seat + k) % n;
    if (active(s, i) && !acted.has(i)) {
      s.turn = i;
      return;
    }
  }
  closeTrickIfDone(s);
}

export const burro: GameEngine<BurroState> = {
  id: "burro",
  name: "El Burro",
  minPlayers: 2,
  maxPlayers: 8,
  init(n) {
    const deck = shuffled(fullDeck());
    const per = n <= 4 ? 6 : n <= 6 ? 5 : 4;
    const hands = Array.from({ length: n }, () => sortHand(deck.splice(0, per)));
    const first = Math.floor(Math.random() * n);
    return { hands, deck, trick: [], leader: first, turn: first, passed: [], finished: [], over: false, lastTrick: null, lastWinner: null };
  },
  move(s, seat, a) {
    if (s.over) fail("La partida ha terminado.");
    if (seat !== s.turn) fail("No es tu turno.");
    const next: BurroState = structuredClone(s);
    const hand = next.hands[seat];
    const suit = ledSuit(s);
    const canFollow = suit ? hand.some((c) => suitOf(c) === suit) : true;
    if (a.type === "play") {
      const c = String(a.card);
      if (!hand.includes(c)) fail("No tienes esa carta.");
      if (suit && suitOf(c) !== suit) fail("Tienes que echar una carta del palo que se juega.");
      next.hands[seat] = hand.filter((x) => x !== c);
      next.trick.push({ seat, card: c });
      advance(next, seat);
    } else if (a.type === "draw") {
      if (canFollow) fail("Puedes seguir el palo, no necesitas robar.");
      if (next.deck.length === 0) fail("No quedan cartas en el mazo.");
      next.hands[seat] = sortHand([...hand, next.deck.shift()!]);
    } else if (a.type === "pass") {
      if (canFollow || next.deck.length > 0) fail("Aún no puedes pasar.");
      next.passed.push(seat);
      advance(next, seat);
    } else fail("Jugada desconocida.");
    return next;
  },
  view(s, seat) {
    const suit = ledSuit(s);
    const hand = seat >= 0 ? s.hands[seat] : [];
    return {
      trick: s.trick,
      leader: s.leader,
      turn: s.turn,
      deckCount: s.deck.length,
      counts: s.hands.map((h) => h.length),
      finished: s.finished,
      over: s.over,
      ledSuit: suit,
      hand,
      passed: s.passed,
      lastTrick: s.lastTrick,
      lastWinner: s.lastWinner,
      canFollow: suit ? hand.some((c) => suitOf(c) === suit) : true,
    };
  },
  ranking(s) {
    if (!s.over) return null;
    const rest = s.hands.map((_, i) => i).filter((i) => !s.finished.includes(i)).sort((a, b) => s.hands[a].length - s.hands[b].length);
    return [...s.finished, ...rest];
  },
};
