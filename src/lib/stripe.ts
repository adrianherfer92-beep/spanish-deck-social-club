import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { PAYMENTS_ENABLED } from "./room-billing";
const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
export function getStripeEnvironment(): "sandbox" | "live" {
  if (token?.startsWith("pk_test_")) return "sandbox";
  if (token?.startsWith("pk_live_")) return "live";
  if (!PAYMENTS_ENABLED) return "sandbox";
  throw new Error("Los pagos aún no están disponibles. Falta completar la activación de cobros.");
}
let promise: Promise<Stripe | null> | null = null;
export function getStripe() {
  getStripeEnvironment();
  if (!token) throw new Error("Pagos no disponibles");
  promise ??= loadStripe(token);
  return promise;
}