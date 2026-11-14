import { z } from "zod";

export const EXTRA_GAME_CENTS = 100;
export const EXTRA_GAME_PRICE = "extra_game_eur";
// Pasarela en pausa hasta activar Stripe: al ponerlo a true vuelven el límite
// diario, el checkout de 1 € y la validación del entorno de pago.
export const PAYMENTS_ENABLED = false;
export const environmentSchema = z.enum(["sandbox", "live"]).refine(env => {
  if (!PAYMENTS_ENABLED) return true;
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  return env === "sandbox" ? token?.startsWith("pk_test_") : token?.startsWith("pk_live_");
}, "Entorno de pago no válido para esta aplicación");
export function madridDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function creationAccess(isAdmin: boolean, freeUsed: boolean, credits: number) {
  if (!PAYMENTS_ENABLED) return isAdmin ? "admin" : "free";
  return isAdmin ? "admin" : !freeUsed ? "free" : credits > 0 ? "paid" : "checkout";
}
export function paidRoomSession(session: { payment_status: string; amount_total: number | null; currency: string | null; metadata: Record<string, string> | null }) {
  return session.payment_status === "paid" && session.amount_total === EXTRA_GAME_CENTS && session.currency === "eur" && session.metadata?.purpose === "extra_game";
}