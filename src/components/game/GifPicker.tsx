import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlay, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { gifWaitSeconds, type Gif } from "@/lib/gifs";
import { searchRoomGifs, sendRoomGif } from "@/lib/rooms.functions";

export function GifPicker({ code, token, sentAt, serverNow, enabled, onSent }: { code: string; token: string; sentAt: string | null; serverNow: string; enabled: boolean; onSent: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const search = useServerFn(searchRoomGifs);
  const send = useServerFn(sendRoomGif);
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
    try { await send({ data: { code, token, gifId: gif.id } }); setOpen(false); await onSent(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" disabled={!enabled || wait > 0 || busy} aria-label="Enviar GIF" title={!enabled ? "Activa los GIFs para enviarlos" : wait ? `Espera ${wait} segundos` : "Enviar GIF"} onClick={() => { setOpen(true); void load(); }}><ImagePlay />{wait ? `${wait}s` : "GIF"}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg">
      <DialogTitle>Un GIF para la mesa</DialogTitle>
      <DialogDescription>1 GIF cada 30 segundos · Powered by GIPHY</DialogDescription>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void load(); }}><Input placeholder="Buscar en GIPHY" aria-label="Buscar en GIPHY" maxLength={60} value={query} onChange={e => setQuery(e.target.value)} /><Button type="submit" disabled={busy} aria-label="Buscar GIFs"><Search /></Button></form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {busy && <p role="status" className="text-sm text-muted-foreground">Cargando…</p>}
      {enabled && <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">{gifs.map(gif => <Button key={gif.id} variant="ghost" disabled={busy || wait > 0} className="h-auto p-0" aria-label={`Enviar ${gif.title || gif.id}`} onClick={() => pick(gif)}><img src={gif.url} alt={gif.title} referrerPolicy="no-referrer" className="aspect-square w-full rounded object-contain" loading="lazy" /></Button>)}</div>}
      {!busy && !gifs.length && <p className="text-sm text-muted-foreground">No se encontraron GIFs.</p>}
    </DialogContent></Dialog>
  </>;
}
