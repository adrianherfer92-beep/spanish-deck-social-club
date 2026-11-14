import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlay, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { gifWaitSeconds, GIF_VISIBLE_MS, type Gif } from "@/lib/gifs";
import { searchRoomGifs, sendRoomGif } from "@/lib/rooms.functions";

type Reaction = { playerId: string; name: string; sentAt: string; gif: Gif };
export function GifReactions({ code, token, sentAt, serverNow, reactions, onSent }: { code: string; token: string; sentAt: string | null; serverNow: string; reactions: Reaction[]; onSent: () => Promise<unknown> }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const search = useServerFn(searchRoomGifs);
  const send = useServerFn(sendRoomGif);
  useEffect(() => { setEnabled(localStorage.getItem("timba-gifs") === "yes"); }, []);
  useEffect(() => { setOffset(Date.parse(serverNow) - Date.now()); }, [serverNow]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const wait = gifWaitSeconds(sentAt, now + offset);
  const load = async () => {
    setBusy(true); setError("");
    try { setGifs(await search({ data: { code, token, query } })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const pick = async (gif: Gif) => {
    setBusy(true); setError("");
    try { await send({ data: { code, token, gifId: gif.id } }); setOpen(false); await onSent(); toast.success("GIF enviado"); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="my-5 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); localStorage.setItem("timba-gifs", e.target.checked ? "yes" : "no"); }} />Mostrar GIFs de GIPHY</label>
      {enabled && <Button variant="secondary" disabled={wait > 0} onClick={() => { setOpen(true); }}><ImagePlay className="size-4" />{wait ? `${wait}s` : "Enviar GIF"}</Button>}
    </div>
    {enabled && <div className="mt-3 flex flex-wrap gap-4" aria-live="polite">
      {reactions.filter(r => now + offset - Date.parse(r.sentAt) < GIF_VISIBLE_MS).map(r => <figure key={`${r.playerId}-${r.sentAt}`} className="w-36"><img src={r.gif.url} alt={r.gif.title} referrerPolicy="no-referrer" className="aspect-square w-full rounded object-contain bg-muted" /><figcaption className="mt-1 break-words text-center text-xs text-muted-foreground">{r.name}</figcaption></figure>)}
    </div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg">
      <DialogTitle>Reacciones</DialogTitle>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void load(); }}><Input placeholder="Buscar en GIPHY" aria-label="Buscar en GIPHY" maxLength={60} value={query} onChange={e => setQuery(e.target.value)} /><Button type="submit" disabled={busy} aria-label="Buscar GIFs"><Search className="size-4" /></Button></form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {busy && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">{gifs.map(gif => <Button key={gif.id} variant="ghost" disabled={busy || wait > 0} className="h-auto p-0" aria-label={`Enviar ${gif.title || gif.id}`} onClick={() => pick(gif)}><img src={gif.url} alt={gif.title} referrerPolicy="no-referrer" className="aspect-square w-full rounded object-contain" loading="lazy" /></Button>)}</div>
      {!busy && !gifs.length && <p className="text-sm text-muted-foreground">Sin GIFs seleccionados.</p>}
      <p className="text-xs text-muted-foreground">1 GIF cada 30 segundos · Powered by GIPHY</p>
    </DialogContent></Dialog>
  </section>;
}