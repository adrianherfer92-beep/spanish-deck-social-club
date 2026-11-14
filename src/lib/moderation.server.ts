import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isSuspended } from "./moderation";

export async function assertNotSuspended(sb: SupabaseClient<Database>, userId: string | null, playerId: string | null = null) {
  for (const [column, id] of [["user_id", userId], ["player_id", playerId]] as const) {
    if (!id) continue;
    const { data, error } = await sb.from("moderation_suspensions").select("until_at").eq(column, id).gt("until_at", new Date().toISOString()).order("until_at", { ascending: false }).limit(1);
    if (error) throw new Error("No se pudo comprobar el acceso a la mesa");
    if (isSuspended(data?.[0]?.until_at ?? null)) throw new Error(`Participación suspendida hasta ${new Date(data?.[0]?.until_at ?? "").toLocaleString("es-ES", { timeZone: "Europe/Madrid" })} (Madrid)`);
  }
}

export async function assertAdmin(sb: SupabaseClient<Database>, userId: string) {
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Acceso reservado al administrador");
}