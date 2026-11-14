import { z } from "zod";

export const reportSchema = z.object({ code: z.string().trim().toUpperCase().min(1).max(10), token: z.string().min(1).max(100), playerId: z.string().uuid(), reason: z.enum(["alias", "gif", "acoso", "trampas", "otro"]), comment: z.string().trim().max(500) });
export const decisionSchema = z.object({ reportId: z.string().uuid(), action: z.enum(["dismissed", "suspended"]), reason: z.string().trim().min(5).max(500), hours: z.union([z.literal(1), z.literal(24), z.literal(168)]) });
export const reportReasons = { alias: "Alias ofensivo", gif: "GIF inapropiado", acoso: "Acoso", trampas: "Posibles trampas", otro: "Otro motivo" };
export function isSuspended(until: string | null, now = Date.now()) { return !!until && Date.parse(until) > now; }