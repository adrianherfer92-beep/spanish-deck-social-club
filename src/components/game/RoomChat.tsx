import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, ImagePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { GifPicker } from "./GifPicker";
import type { Player } from "./boards";
import { getRoomChat, sendRoomMessage } from "@/lib/rooms.functions";
import { CHAT_MAX_LENGTH, CHAT_COOLDOWN_MS, chatTextSchema } from "@/lib/room-chat";
import { cn } from "@/lib/utils";

export function RoomChat({ code, token, players }: { code: string; token: string; players: Player[] }) {
  const fetchChat = useServerFn(getRoomChat);
  const send = useServerFn(sendRoomMessage);
  const q = useQuery({ queryKey: ["room-chat", code, token], queryFn: () => fetchChat({ data: { code, token } }), refetchInterval: 10000, retry: false });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gifsEnabled, setGifsEnabled] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const log = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const data = q.data;
  useEffect(() => { setGifsEnabled(localStorage.getItem("timba-gifs") === "yes"); }, []);
  useEffect(() => { if (data?.serverNow) setOffset(Date.parse(data.serverNow) - Date.now()); }, [data?.serverNow]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const lastId = data?.messages.at(-1)?.id;
  useEffect(() => { if (atBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [lastId, gifsEnabled]);
  const wait = data?.chatSentAt ? Math.max(0, Math.ceil((Date.parse(data.chatSentAt) + CHAT_COOLDOWN_MS - now - offset) / 1000)) : 0;
  const submit = async () => {
    const parsed = chatTextSchema.safeParse(text);
    if (!parsed.success || busy || wait || !data) return;
    setBusy(true); setError("");
    try { await send({ data: { code, token, text: parsed.data } }); setText(""); atBottom.current = true; await q.refetch(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="room-chat-title" className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h2 id="room-chat-title" className="flex items-center gap-2 text-2xl"><MessageSquare className="size-5" />Chat de la mesa</h2>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={gifsEnabled} onCheckedChange={checked => { const enabled = checked === true; setGifsEnabled(enabled); localStorage.setItem("timba-gifs", enabled ? "yes" : "no"); }} />Mostrar GIFs de GIPHY</label>
    </div>
    <div ref={log} role="log" aria-label="Mensajes de la mesa" aria-live="polite" aria-relevant="additions" className="h-72 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:h-80" onScroll={() => { const el = log.current; if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
      {q.isPending ? <p role="status" className="text-sm text-muted-foreground">Cargando mensajes…</p> : q.error ? <div role="alert"><p className="text-sm text-destructive">No se pudo cargar el chat.</p><Button variant="outline" size="sm" className="mt-2" onClick={() => void q.refetch()}>Reintentar</Button></div> : !data?.messages.length ? <p className="text-sm text-muted-foreground">Todavía no hay mensajes.</p> : data.messages.map(message => {
        const author = players.find(p => p.id === message.playerId);
        const mine = message.playerId === data.myPlayerId;
        return <article key={message.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
          {author?.avatarSeed && <PlayerAvatar seed={author.avatarSeed} name={message.name} className="h-7 w-7 shrink-0" />}
          <div className={cn("min-w-0 max-w-[85%] rounded-md px-3 py-2", mine ? "bg-secondary" : "bg-muted")}>
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"><b className="break-all">{message.name}{mine && " (tú)"}</b><time dateTime={message.sentAt} className="text-muted-foreground">{new Date(message.sentAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</time></div>
            {message.text && <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.text}</p>}
            {message.gif && (gifsEnabled ? <img src={message.gif.url} alt={message.gif.title || "GIF"} referrerPolicy="no-referrer" loading="lazy" className="mt-2 aspect-square w-40 max-w-full rounded object-contain" onLoad={() => { if (atBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight; }} /> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImagePlay className="size-4" />GIF oculto</p>)}
          </div>
        </article>;
      })}
    </div>
    <form className="border-t border-border p-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label htmlFor="chat-message" className="mb-2 block text-sm font-semibold">Tu mensaje</label>
      <Textarea id="chat-message" placeholder="Escribe a tus compañeros de mesa…" rows={2} maxLength={CHAT_MAX_LENGTH} value={text} onChange={e => setText(e.target.value)} disabled={!data || !!q.error || busy} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} className="min-h-16 resize-none" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{text.length}/{CHAT_MAX_LENGTH}</span>
        <div className="flex gap-2">
          {data && <GifPicker code={code} token={token} sentAt={data.gifSentAt} serverNow={data.serverNow} enabled={gifsEnabled && !q.error && !busy && wait === 0} onSent={async () => { atBottom.current = true; return q.refetch(); }} />}
          <Button type="submit" disabled={busy || !data || !!q.error || !text.trim() || wait > 0}><Send />{busy ? "Enviando…" : wait ? `${wait}s` : "Enviar"}</Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  </section>;
}
