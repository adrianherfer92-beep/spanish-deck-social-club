import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Derecho de acceso/portabilidad (RGPD art. 15 y 20): todo lo que guardamos de ti.
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const [{ data: profile }, { data: results }, { data: u }] = await Promise.all([
      supabaseAdmin.from("profiles").select("username, points, games_played, wins, created_at, privacy_accepted_at, avatar_seed").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("game_results").select("game, position, points, created_at").eq("user_id", uid),
      supabaseAdmin.auth.admin.getUserById(uid),
    ]);
    return {
      exportado: new Date().toISOString(),
      cuenta: { email: u?.user?.email ?? null, creada: u?.user?.created_at ?? null, proveedor: u?.user?.app_metadata?.provider ?? null },
      perfil: profile,
      partidas: results ?? [],
    };
  });

// Derecho de supresión (RGPD art. 17): borra la cuenta y anonimiza el historial.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    await supabaseAdmin.from("game_results").update({ user_id: null, name: "Jugador eliminado" }).eq("user_id", uid);
    await supabaseAdmin.from("room_players").update({ user_id: null, name: "Jugador eliminado" }).eq("user_id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid); // el perfil se borra en cascada
    if (error) throw new Error("No se pudo borrar la cuenta");
    return { ok: true };
  });
