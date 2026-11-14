import { describe, it, expect } from "vitest";
import { creationAccess, madridDay, EXTRA_GAME_CENTS, paidRoomSession } from "../lib/room-billing";

describe("creación de partidas", () => {
  it("permite una gratuita al día, no la segunda", () => {
    expect(creationAccess(false, false, 0)).toBe("free");
    expect(creationAccess(false, true, 0)).toBe("checkout");
  });
  it("cada partida adicional cuesta exactamente 1 €", () => expect(EXTRA_GAME_CENTS).toBe(100));
  it("solo el administrador tiene acceso ilimitado sin compra", () => {
    expect(creationAccess(true, true, 0)).toBe("admin");
    expect(creationAccess(false, true, 0)).toBe("checkout");
  });
  it("una compra permite crear una partida adicional", () => expect(creationAccess(false, true, 1)).toBe("paid"));
  it("renueva a medianoche de Madrid, incluido horario de verano", () => {
    expect(madridDay(new Date("2026-11-14T23:00:00Z"))).toBe("2026-11-15");
    expect(madridDay(new Date("2026-07-14T22:00:00Z"))).toBe("2026-07-15");
  });
  it("rechaza pagos pendientes, importes incorrectos y otras monedas", () => {
    const s = { payment_status: "paid", amount_total: 100, currency: "eur", metadata: { purpose: "extra_game" } };
    expect(paidRoomSession(s)).toBe(true);
    expect(paidRoomSession({ ...s, payment_status: "unpaid" })).toBe(false);
    expect(paidRoomSession({ ...s, amount_total: 99 })).toBe(false);
    expect(paidRoomSession({ ...s, currency: "usd" })).toBe(false);
  });
});