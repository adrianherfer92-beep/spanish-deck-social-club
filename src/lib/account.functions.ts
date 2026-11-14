import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Derecho de acceso/portabilidad (RGPD art. 15 y 20): todo lo que guardamos de ti.
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const [{ data: profile }, { data: results }, { data: u }, { data: reports }, { data: suspensions }, { data: penalties }, { data: purchases }, { data: usage }] = await Promise.all([
      supabaseAdmin.from("profiles").select("username, points, games_played, wins, created_at, privacy_accepted_at, avatar_seed").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("game_results").select("game, position, points, created_at").eq("user_id", uid),
      supabaseAdmin.auth.admin.getUserById(uid),
      supabaseAdmin.from("player_reports").select("reason,comment,status,created_at,resolved_at").eq("reporter_user_id", uid),
      supabaseAdmin.from("moderation_suspensions").select("until_at").eq("user_id", uid),
      supabaseAdmin.from("point_penalties").select("reason,points,created_at").eq("user_id", uid),
      supabaseAdmin.from("room_purchases").select("amount_cents,status,created_at,consumed_at,environment").eq("user_id", uid),
      supabaseAdmin.from("room_creation_usage").select("day,kind,created_at,environment").eq("user_id", uid),
    ]);
    return {
      exportado: new Date().toISOString(),
      cuenta: { email: u?.user?.email ?? null, creada: u?.user?.created_at ?? null, proveedor: u?.user?.app_metadata?.provider ?? null },
      perfil: profile,
      partidas: results ?? [],
      reportes_enviados: reports ?? [],
      suspensiones: suspensions ?? [],
      penalizaciones: penalties ?? [],
      compras: purchases ?? [],
      creaciones: usage ?? [],
    };
  });

// Derecho de supresión (RGPD art. 17): borra la cuenta y anonimiza el historial.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const changes = await Promise.all([
      supabaseAdmin.from("player_reports").update({ reporter_user_id: null, reporter_player_id: crypto.randomUUID(), comment: "" }).eq("reporter_user_id", uid),
      supabaseAdmin.from("player_reports").update({ target_user_id: null, target_player_id: crypto.randomUUID(), target_name: "Jugador eliminado" }).eq("target_user_id", uid),
      supabaseAdmin.from("moderation_suspensions").delete().eq("user_id", uid),
      supabaseAdmin.from("moderation_decisions").update({ actor_id: null }).eq("actor_id", uid),
    ]);
    if (changes.some(result => result.error)) throw new Error("No se pudieron anonimizar los datos de moderación");
    await supabaseAdmin.from("game_results").update({ user_id: null, name: "Jugador eliminado" }).eq("user_id", uid);
    await supabaseAdmin.from("room_players").update({ user_id: null, name: "Jugador eliminado" }).eq("user_id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid); // el perfil se borra en cascada
    if (error) throw new Error("No se pudo borrar la cuenta");
    return { ok: true };
  });
