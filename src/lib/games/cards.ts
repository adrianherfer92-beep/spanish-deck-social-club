// Baraja española de 40 cartas (sin 8 ni 9).
export type Suit = "o" | "c" | "e" | "b";
export type Card = string; // p.ej. "o1", "e12"

export const SUITS: Suit[] = ["o", "c", "e", "b"];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export const SUIT_NAMES: Record<Suit, string> = { o: "Oros", c: "Copas", e: "Espadas", b: "Bastos" };
export const RANK_NAMES: Record<number, string> = {
  1: "As", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco", 6: "Seis", 7: "Siete",
  10: "Sota", 11: "Caballo", 12: "Rey",
};

export const suitOf = (c: Card) => c[0] as Suit;
export const rankOf = (c: Card) => parseInt(c.slice(1), 10);
export const rankIndex = (r: number) => RANKS.indexOf(r as (typeof RANKS)[number]);
export const cardName = (c: Card) => `${RANK_NAMES[rankOf(c)]} de ${SUIT_NAMES[suitOf(c)]}`;

export function fullDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push(`${s}${r}`);
  return d;
}

export function shuffled<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => SUITS.indexOf(suitOf(a)) - SUITS.indexOf(suitOf(b)) || rankIndex(rankOf(a)) - rankIndex(rankOf(b)));
}

/** Puntos de ranking según posición final (1º, 2º, 3º, resto). */
export const POSITION_POINTS = [10, 6, 3];
export function pointsForPosition(position: number): number {
  return POSITION_POINTS[position - 1] ?? 1;
}
