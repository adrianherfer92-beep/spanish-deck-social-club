import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getModerationAccess, getModeration, resolveReport } from "@/lib/moderation.functions";
import { reportReasons, decisionSchema } from "@/lib/moderation";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({ head: () => ({ meta: [
  { title: "Moderación — La Timba" }, { name: "description", content: "Revisión privada de reportes y decisiones de La Timba." },
  { property: "og:title", content: "Moderación — La Timba" }, { property: "og:description", content: "Administración de reportes de La Timba." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: Admin });

function Admin() {
  const { user, loading } = useAuth();
  const accessFn = useServerFn(getModerationAccess);
  const access = useQuery({ queryKey: ["moderation-access", user?.id], queryFn: () => accessFn(), enabled: !!user, retry: false });
  return <main className="mx-auto max-w-4xl px-4 py-10"><h1 className="mb-8 text-4xl">Moderación</h1>
    {loading || (user && access.isPending) ? <p>Comprobando acceso…</p> : !user ? <Button asChild><Link to="/auth">Entrar para continuar</Link></Button> : access.data ? <ModerationPanel /> : <p>Acceso reservado al administrador.</p>}
  </main>;
}

function ModerationPanel() {
  const fetch = useServerFn(getModeration);
  const resolve = useServerFn(resolveReport);
  const q = useQuery({ queryKey: ["moderation"], queryFn: () => fetch(), retry: false });
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const decide = async (action: "dismissed" | "suspended") => {
    const parsed = decisionSchema.safeParse({ reportId: selected, action, reason, hours });
    if (!parsed.success) { toast.error("Escribe un motivo de entre 5 y 500 caracteres"); return; }
    setBusy(true); try { await resolve({ data: parsed.data }); setSelected(""); setReason(""); await q.refetch(); toast.success("Decisión registrada"); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  };
  if (q.isPending) return <p>Cargando reportes…</p>;
  if (q.error) return <p role="alert">No se pudo cargar la moderación.</p>;
  const data = q.data;
  return <div className="space-y-10">
    <section><h2 className="mb-4 text-2xl">Reportes pendientes</h2>{!data.reports.some(r => r.status === "pending") && <p className="text-muted-foreground">No hay reportes pendientes.</p>}
      <div className="space-y-4">{data.reports.filter(r => r.status === "pending").map(r => <article key={r.id} className="rounded border border-border bg-card p-4">
        <h3 className="break-words text-xl">{r.target_name}</h3><p className="text-sm text-muted-foreground">Mesa {r.room_code} · {reportReasons[r.reason as keyof typeof reportReasons]} · {new Date(r.created_at).toLocaleString("es-ES")}</p>
        {r.comment && <p className="my-3 whitespace-pre-wrap break-words">{r.comment}</p>}
        {selected !== r.id ? <Button variant="outline" className="mt-3" onClick={() => { setSelected(r.id); setReason(""); }}>Revisar</Button> : <div className="mt-4 space-y-3">
          <label className="block">Motivo de la decisión<textarea className="mt-2 block w-full rounded border border-input bg-background p-2" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <label className="flex flex-wrap items-center gap-3">Suspensión<select className="rounded border border-input bg-background p-2" value={hours} onChange={e => setHours(Number(e.target.value))}><option value={1}>1 hora</option><option value={24}>24 horas</option><option value={168}>7 días</option></select></label>
          <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="destructive" onClick={() => decide("suspended")}>Suspender temporalmente</Button><Button disabled={busy} variant="secondary" onClick={() => decide("dismissed")}>Archivar sin sanción</Button></div>
        </div>}
      </article>)}</div>
    </section>
    <section><h2 className="mb-4 text-2xl">Suspensiones activas</h2>{!data.suspensions.length && <p className="text-muted-foreground">Ninguna suspensión activa.</p>}{data.suspensions.map((s, i) => <p key={i} className="border-b border-border py-3">{data.reports.find(r => r.id === s.report_id)?.target_name ?? "Jugador"} · hasta {new Date(s.until_at).toLocaleString("es-ES")}</p>)}</section>
    <section><h2 className="mb-4 text-2xl">Registro de decisiones</h2>{!data.decisions.length && <p className="text-muted-foreground">Todavía no hay decisiones.</p>}{data.decisions.map(d => <article key={d.id} className="border-b border-border py-4"><p className="font-semibold">{data.reports.find(r => r.id === d.report_id)?.target_name ?? "Jugador"} · {d.action === "suspended" ? "Suspensión temporal" : "Archivado sin sanción"}</p><p className="whitespace-pre-wrap break-words">{d.reason}</p><p className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleString("es-ES")}{d.until_at ? ` · hasta ${new Date(d.until_at).toLocaleString("es-ES")}` : ""}</p></article>)}</section>
  </div>;
}