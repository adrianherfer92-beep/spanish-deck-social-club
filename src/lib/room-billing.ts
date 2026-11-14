import { z } from "zod";

export const EXTRA_GAME_CENTS = 100;
export const EXTRA_GAME_PRICE = "extra_game_eur";
export const environmentSchema = z.enum(["sandbox", "live"]).refine(env => {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  return env === "sandbox" ? token?.startsWith("pk_test_") : token?.startsWith("pk_live_");
}, "Entorno de pago no válido para esta aplicación");
export function madridDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function creationAccess(isAdmin: boolean, freeUsed: boolean, credits: number) {
  return isAdmin ? "admin" : !freeUsed ? "free" : credits > 0 ? "paid" : "checkout";
}
export function paidRoomSession(session: { payment_status: string; amount_total: number | null; currency: string | null; metadata: Record<string, string> | null }) {
  return session.payment_status === "paid" && session.amount_total === EXTRA_GAME_CENTS && session.currency === "eur" && session.metadata?.purpose === "extra_game";
}