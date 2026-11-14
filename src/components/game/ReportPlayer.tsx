import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { reportPlayer } from "@/lib/moderation.functions";
import { reportReasons, reportSchema } from "@/lib/moderation";

export function ReportPlayer({ code, token, players, mySeat }: { code: string; token: string; players: { id: string; name: string }[]; mySeat: number }) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [reason, setReason] = useState("alias");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const send = useServerFn(reportPlayer);
  const others = players.filter((_, i) => i !== mySeat);
  return <>
    <Button variant="ghost" size="sm" disabled={!others.length} onClick={() => { setPlayerId(others[0]?.id ?? ""); setOpen(true); }}><Flag className="mr-2 size-4" />Reportar jugador</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Reportar jugador</DialogTitle><DialogDescription>El reporte es privado y lo revisará el administrador. No incluyas datos personales.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async e => { e.preventDefault(); const parsed = reportSchema.safeParse({ code, token, playerId, reason, comment }); if (!parsed.success) { toast.error("Revisa el reporte"); return; } setBusy(true); try { await send({ data: parsed.data }); toast.success("Reporte enviado para revisión"); setOpen(false); setComment(""); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); } }}>
        <label className="block space-y-2"><span>Jugador</span><select className="w-full rounded border border-input bg-background p-2" value={playerId} onChange={e => setPlayerId(e.target.value)}>{others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="block space-y-2"><span>Motivo</span><select className="w-full rounded border border-input bg-background p-2" value={reason} onChange={e => setReason(e.target.value)}>{Object.entries(reportReasons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block space-y-2"><span>Comentario opcional</span><textarea className="w-full rounded border border-input bg-background p-2" maxLength={500} value={comment} onChange={e => setComment(e.target.value)} /></label>
        <Button disabled={busy} type="submit">{busy ? "Enviando…" : "Enviar reporte"}</Button>
      </form>
    </DialogContent></Dialog>
  </>;
}