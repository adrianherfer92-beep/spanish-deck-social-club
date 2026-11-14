import { describe, it, expect } from "vitest";
import { exitPenalty, resultRows, advanceDeparted } from "@/lib/room-points";
import { ENGINES } from "@/lib/games";

describe("penalizaciones", () => {
  it("el creador pierde 1 al eliminar en progreso", () => expect(exitPenalty(true, true, true)).toBe(1));
  it("otro jugador pierde 2 al abandonar en progreso", () => expect(exitPenalty(true, false, true)).toBe(2));
  it("los invitados no pierden puntos", () => expect(exitPenalty(true, false, false)).toBe(0));
  it("fuera de progreso no hay penalización", () => expect(exitPenalty(false, true, true)).toBe(0));
  it("abandonar no permite ganar puntos ni desplazar al ganador", () => {
    const rows = resultRows([1, 0], [{ user_id: "a", name: "A", left_at: null }, { user_id: "b", name: "B", left_at: "2026-11-14" }]);
    expect(rows.map(r => [r.user_id, r.points])).toEqual([["a", 10], ["b", 0]]);
  });
  it.each(Object.keys(ENGINES))("%s conserva asientos y completa el turno de quien abandona", game => {
    const engine = ENGINES[game];
    const state: any = engine.init(2);
    const players = [{ left_at: null as string | null }, { left_at: null as string | null }];
    players[state.turn].left_at = "2026-11-14";
    const next: any = advanceDeparted(engine, state, players);
    expect(engine.ranking(next) !== null || players[next.turn].left_at === null).toBe(true);
  });
});