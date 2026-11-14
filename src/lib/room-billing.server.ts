import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type Stripe from "stripe";
import { creationAccess, madridDay, paidRoomSession } from "./room-billing";
import type { StripeEnv } from "./stripe.server";

export async function billingStatus(sb: SupabaseClient<Database>, userId: string, environment: StripeEnv, isAdmin: boolean) {
  const [usage, purchases] = await Promise.all([
    sb.from("room_creation_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("environment", environment).eq("day", madridDay()).eq("kind", "free"),
    sb.from("room_purchases").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("environment", environment).eq("status", "paid").is("consumed_at", null),
  ]);
  if (usage.error || purchases.error) throw new Error("No se pudo consultar tu partida gratuita");
  const freeUsed = (usage.count ?? 0) > 0;
  const credits = purchases.count ?? 0;
  return { access: creationAccess(isAdmin, freeUsed, credits), freeUsed, credits };
}

export async function fulfillRoomPurchase(session: Stripe.Checkout.Session, environment: StripeEnv) {
  if (!paidRoomSession(session)) return false;
  const orderId = session.metadata?.orderId;
  const userId = session.metadata?.userId;
  if (!orderId || !userId) throw new Error("Missing order metadata");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("confirm_room_purchase", { _order: orderId, _user: userId, _environment: environment, _session: session.id });
  if (error) throw new Error("No se pudo confirmar la compra");
  return true;
}