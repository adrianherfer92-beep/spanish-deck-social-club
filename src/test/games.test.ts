import { describe, it, expect } from "vitest";
import { pointsForPosition } from "@/lib/games/cards";
import { cinquillo } from "@/lib/games/cinquillo";
import { handValue } from "@/lib/games/sieteymedio";
import { escoba, escobaValue } from "@/lib/games/escoba";

describe("puntos por posición", () => {
  it("1º gana 10", () => expect(pointsForPosition(1)).toBe(10));
  it("2º gana 6", () => expect(pointsForPosition(2)).toBe(6));
  it("3º gana 3", () => expect(pointsForPosition(3)).toBe(3));
  it("resto gana 1", () => expect(pointsForPosition(5)).toBe(1));
});

describe("reglas", () => {
  it("cinquillo: el primero debe jugar el 5 de oros", () => {
    const s = cinquillo.init(4);
    const other = s.hands[s.turn].find((c) => c !== "o5")!;
    expect(() => cinquillo.move(s, s.turn, { type: "play", card: other })).toThrow();
    expect(cinquillo.move(s, s.turn, { type: "play", card: "o5" }).table.o).not.toBeNull();
  });
  it("siete y medio: figuras valen medio", () => expect(handValue(["o7", "c12"])).toBe(7.5));
  it("escoba: el rey vale 10", () => expect(escobaValue("b12")).toBe(10));
  it("escoba: hay que sumar 15 para llevarse cartas", () => {
    const s = escoba.init(2);
    s.hands[0] = ["o5", "c1", "e2"];
    s.table = ["b12", "c3", "o4", "e6"];
    expect(() => escoba.move(s, 0, { type: "play", card: "c1", take: ["b12"] })).toThrow();
    const n = escoba.move(s, 0, { type: "play", card: "o5", take: ["b12"] });
    expect(n.captured[0]).toHaveLength(2);
  });
});
