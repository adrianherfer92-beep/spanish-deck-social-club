import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportSchema, decisionSchema } from "./moderation";

export const getModerationAccess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("No se pudo comprobar tu acceso");
  return data === true;
});

export const reportPlayer = createServerFn({ method: "POST" }).inputValidator(reportSchema).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: id, error } = await supabaseAdmin.rpc("submit_player_report", { _room: data.code, _token: data.token, _target: data.playerId, _reason: data.reason, _comment: data.comment });
  if (error) throw new Error(error.message);
  return { id };
});

export const getModeration = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { assertAdmin } = await import("./moderation.server");
  await assertAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [reports, decisions, suspensions] = await Promise.all([
    supabaseAdmin.from("player_reports").select("id,room_code,target_name,reason,comment,status,created_at").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("moderation_decisions").select("id,report_id,action,reason,until_at,created_at").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("moderation_suspensions").select("report_id,until_at").gt("until_at", new Date().toISOString()),
  ]);
  if (reports.error || decisions.error || suspensions.error) throw new Error("No se pudo cargar la moderación");
  return { reports: reports.data ?? [], decisions: decisions.data ?? [], suspensions: suspensions.data ?? [] };
});

export const resolveReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(decisionSchema).handler(async ({ data, context }) => {
  const { assertAdmin } = await import("./moderation.server");
  await assertAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("resolve_player_report", { _actor: context.userId, _report: data.reportId, _action: data.action, _reason: data.reason, _hours: data.hours });
  if (error) throw new Error(error.message);
  return { ok: true };
});