import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getRoom, joinRoom, startGame, makeMove, backToLobby, kickPlayer, setTurnTimer, skipTurn, getOrigin, deleteRoom, leaveRoom } from "@/lib/rooms.functions";
import { exitPenalty } from "@/lib/room-points";
import { QRCodeSVG } from "qrcode.react";
import { useTurnAlert } from "@/hooks/use-turn-alert";
import { ogImageMeta } from "@/lib/og";
import { getGuestName, getRoomToken, setGuestName, setRoomToken, clearLastRoom } from "@/lib/session";
import { gameInfo } from "@/lib/games/info";
import { pointsForPosition } from "@/lib/games/cards";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BOARDS, Seats } from "@/components/game/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GifReactions } from "@/components/game/GifReactions";
import { ReportPlayer } from "@/components/game/ReportPlayer";

export const Route = createFileRoute("/sala/$codigo")({
  // Datos en el servidor (para la vista previa al compartir), pantalla solo en el navegador.
  ssr: "data-only",
  loader: () => getOrigin(),
  head: ({ params, loaderData }) => ({
    meta: [
      { title: `Mesa ${params.codigo} — La Timba` },
      { name: "description", content: "Te han invitado a una partida de baraja española. ¡Siéntate a la mesa!" },
      { property: "og:title", content: "¡Te esperan en la mesa! — La Timba" },
      { property: "og:description", content: `Únete con el código ${params.codigo} y juega a la baraja española con tus amigos.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      ...ogImageMeta(loaderData),
    ],
  }),
  component: Sala,
});

function Sala() {
  const { codigo } = Route.useParams();
  const code = codigo.toUpperCase();
  const { user, username, loading } = useAuth();
  const [token, setToken] = useState(() => getRoomToken(code));
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const exit = async (deleting: boolean) => {
    if (!room) return;
    const registered = room.players[room.mySeat]?.registered ?? false;
    const penalty = exitPenalty(room.status === "playing", deleting, registered);
    const warning = deleting
      ? `¿Eliminar la partida para todos?${room.status === "playing" ? " Si eliminas una partida en progreso, pierdes 1 punto; los demás no pierden puntos." : " No hay penalización porque no está en progreso."}`
      : `¿Salir de la partida?${room.status === "playing" ? " Si sales antes de terminar, pierdes 2 puntos y no recibirás puntos al finalizar. Tus turnos se completarán automáticamente." : " No hay penalización."}`;
    if (!window.confirm(`${warning}${!registered ? " Como invitado, no ganas ni pierdes puntos." : ""}`)) return;
    setBusy(true);
    try {
      await (deleting ? deleteRoom : leaveRoom)({ data: { code, token } });
      localStorage.removeItem(`sala:${code}`);
      clearLastRoom();
      toast.success(`${deleting ? "Partida eliminada" : "Has salido de la partida"}${penalty ? `: −${penalty} punto${penalty === 1 ? "" : "s"}` : ""}`);
      await navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
      await q.refetch();
    } finally { setBusy(false); }
  };

  const q = useQuery({
    queryKey: ["sala", code, token],
    queryFn: () => getRoom({ data: { code, token } }),
    // Respaldo lento por si se pierde algún aviso; lo normal es el aviso instantáneo.
    refetchInterval: 10000,
    retry: false,
  });
  const room = q.data;

  // Aviso instantáneo: el servidor nos dice "ha cambiado algo" y pedimos solo nuestra vista.
  const { refetch } = q;
  useEffect(() => {
    const channel = supabase
      .channel(`sala:${code}`)
      .on("broadcast", { event: "cambio" }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, refetch]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: { type: string; card?: string; take?: string[] }) => {
    setBusy(true);
    try {
      const r = await makeMove({ data: { code, token, action } });
      if (!r.ok) toast.error(r.error);
      await q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const myTurn = !!room && room.status === "playing" && room.view?.turn === room.mySeat && room.mySeat >= 0;
  useTurnAlert(myTurn);
  const remaining = useCountdown(room);
  useEffect(() => {
    if (remaining === 0 && room?.status === "playing" && token) {
      skipTurn({ data: { code, token } }).then(() => refetch()).catch(() => {});
    }
  }, [remaining, room?.status, code, token, refetch]);

  if (q.isLoading || loading) return <Centered>Barajando…</Centered>;
  if (q.error || !room)
    return (
      <Centered>
        <p className="font-display text-3xl">{q.error?.message?.startsWith("Participación suspendida") ? q.error.message : "No se puede acceder a esta mesa"}</p>
        <Button asChild className="mt-4"><Link to="/">Volver</Link></Button>
      </Centered>
    );

  const info = gameInfo(room.game)!;

  if (room.status === "cancelled") return <Centered><h1 className="text-3xl">El creador ha eliminado la partida</h1><p className="mt-3">Esta mesa ya no está disponible.</p><Button asChild className="mt-5"><Link to="/">Volver al inicio</Link></Button></Centered>;

  if (!room.joined) {
    return <JoinForm code={code} room={room} user={!!user} username={username} onJoined={(t) => { setRoomToken(code, t); setToken(t); }} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mesa {room.code}</p>
          <h1 className="text-4xl">{info.name}</h1>
        </div>
        <Link to="/juegos/$juego" params={{ juego: room.game }} target="_blank" className="text-sm text-accent underline">
          Ver reglas
        </Link>
        <ReportPlayer code={code} token={token} players={room.players} mySeat={room.mySeat} />
        <div className="flex flex-wrap gap-2">
          {room.isCreator && <Button variant="destructive" size="sm" disabled={busy} onClick={() => exit(true)}><Trash2 className="mr-2 h-4 w-4" />Eliminar partida</Button>}
          {(!room.isCreator || room.status !== "playing") && <Button variant="outline" size="sm" disabled={busy} onClick={() => exit(false)}><LogOut className="mr-2 h-4 w-4" />Salir de la partida</Button>}
        </div>
      </div>
      {room.status === "playing" && <p className="mb-5 text-sm text-muted-foreground">{room.isCreator ? "Eliminar esta partida en progreso cuesta 1 punto." : "Abandonar antes de terminar cuesta 2 puntos."} Los invitados no pierden puntos. <Link to="/ranking" hash="points-title" className="text-accent underline">Sistema de puntos</Link></p>}

      {room.status === "lobby" && (
        <Lobby
          room={room}
          busy={busy}
          onStart={() => run(() => startGame({ data: { code, token } }))}
          onKick={(playerId) => run(() => kickPlayer({ data: { code, token, playerId } }))}
          onTimer={(seconds) => run(() => setTurnTimer({ data: { code, token, seconds } }))}
        />
      )}

      {room.status === "playing" && remaining !== null && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Tiempo de turno: <b className={remaining <= 10 ? "text-destructive" : "text-accent"}>{remaining}s</b>
        </p>
      )}
      {room.status === "playing" && room.view && (
        BOARDS[room.game]({ view: room.view, mySeat: room.mySeat, players: room.players, act, busy })
      )}
      {room.status === "playing" && <GifReactions code={code} token={token} sentAt={room.gifSentAt} serverNow={room.serverNow} reactions={room.reactions} onSent={q.refetch} />}

      {room.status === "finished" && (
        <div className="space-y-8">
          <div className="poster-frame rounded-lg bg-card p-6">
            <h2 className="text-center text-4xl">
              ¡Gana {room.results?.[0]?.name}!
            </h2>
            <ol className="mx-auto mt-6 max-w-md space-y-2">
              {room.results?.map((r) => (
                <li key={r.position} className="flex items-center justify-between rounded border border-border px-4 py-2">
                  <span><span className="mr-3 font-display text-2xl text-accent">{r.position}º</span>{r.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.registered ? `+${r.points} pts` : `invitado (sin puntos)`}
                  </span>
                </li>
              ))}
            </ol>
            {room.isHost ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild><Link to="/">Crear otra partida</Link></Button>
              </div>
            ) : (
              <p className="mt-6 text-center text-sm text-muted-foreground">Esperando a que el anfitrión decida si se juega otra…</p>
            )}
          </div>
          {room.finalView && (
            <div className="opacity-90">
              <p className="mb-3 text-center text-sm uppercase tracking-widest text-muted-foreground">Así quedó la mesa</p>
              {BOARDS[room.game]({ view: room.finalView, mySeat: room.mySeat, players: room.players, act: async () => {}, busy: true })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="flex min-h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">{children}</main>;
}

type RoomData = Awaited<ReturnType<typeof getRoom>>;

function JoinForm({ code, room, user, username, onJoined }: { code: string; room: RoomData; user: boolean; username: string | null; onJoined: (t: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(getGuestName()), []);
  const info = gameInfo(room.game)!;
  const join = async () => {
    const n = user ? username ?? "Jugador" : name.trim();
    if (!n) { toast.error("Escribe tu nombre"); return; }
    if (!user) setGuestName(n);
    setBusy(true);
    try {
      const r = await joinRoom({ data: { code, name: n } });
      onJoined(r.token);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <div className="poster-frame rounded-lg bg-card p-7 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Te invitan a jugar</p>
        <h1 className="mt-2 text-5xl">{info.name}</h1>
        <p className="mt-2 text-muted-foreground">Mesa {code} · {room.players.length}/{room.maxPlayers} jugadores</p>
        {room.status !== "lobby" ? (
          <p className="mt-6">La partida ya ha empezado. Espera a la siguiente.</p>
        ) : (
          <>
            {user ? (
              <p className="mt-6 text-sm">Entrarás como <b className="text-accent">{username}</b>.</p>
            ) : (
              <Input className="mt-6" placeholder="Tu nombre" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <Button className="mt-4 w-full" size="lg" onClick={join} disabled={busy}>Sentarme</Button>
            {!user && (
              <p className="mt-4 text-xs text-muted-foreground">
                Entras como invitado. <Link to="/auth" className="underline">Crea un perfil</Link> para sumar puntos.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function useCountdown(room: RoomData | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (room?.serverNow) setOffset(new Date(room.serverNow).getTime() - Date.now());
  }, [room?.serverNow]);
  if (!room || room.status !== "playing" || !room.turnSeconds) return null;
  const elapsed = (now + offset - new Date(room.turnStartedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(room.turnSeconds - elapsed));
}

function Lobby({ room, busy, onStart, onKick, onTimer }: { room: RoomData; busy: boolean; onStart: () => void; onKick: (id: string) => void; onTimer: (s: number | null) => void }) {
  const info = gameInfo(room.game)!;
  const link = typeof window !== "undefined" ? `${window.location.origin}/sala/${room.code}` : "";
  const text = `¡Vente a jugar al ${info.name} en La Timba! Código de mesa: ${room.code}`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "La Timba", text, url: link });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      toast.success("Invitación copiada");
    }
  };
  const enough = room.players.length >= room.minPlayers;
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <div className="poster-frame rounded-lg bg-card p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Código de la mesa</p>
        <p className="mt-2 font-display text-6xl tracking-[0.2em] text-accent">{room.code}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const msg = encodeURIComponent(`${text}\n${link}`);
              const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              if (mobile) window.location.href = `whatsapp://send?text=${msg}`;
              else window.open(`https://web.whatsapp.com/send?text=${msg}`, "_blank", "noopener");
            }}
          >
            WhatsApp
          </Button>
          <Button asChild variant="secondary">
            <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Telegram</a>
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              toast.success("Enlace copiado");
            }}
          >
            Copiar enlace
          </Button>
          <Button variant="secondary" onClick={share}>Más opciones</Button>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="rounded-md bg-paper p-3">
            <QRCodeSVG value={link} size={150} bgColor="transparent" fgColor="currentColor" className="text-paper-ink" />
          </div>
          <p className="text-xs text-muted-foreground">Escanéalo con el móvil para entrar</p>
        </div>
      </div>
      <div className="poster-frame rounded-lg bg-card p-6">
        <h2 className="text-2xl">En la mesa ({room.players.length}/{room.maxPlayers})</h2>
        <div className="mt-4">
          <Seats players={room.players} mySeat={room.mySeat} extra={(i) => (
            <>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {room.players[i].host ? "anfitrión" : room.players[i].registered ? "con perfil" : "invitado"}
              </div>
              {room.isHost && i !== room.mySeat && (
                <button type="button" disabled={busy} onClick={() => onKick(room.players[i].id)} className="mt-1 text-xs text-destructive underline">
                  Expulsar
                </button>
              )}
            </>
          )} />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Mínimo {room.minPlayers} jugadores. Puntos: 1º {pointsForPosition(1)}, 2º {pointsForPosition(2)}, 3º {pointsForPosition(3)}, resto {pointsForPosition(4)}.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded border border-border p-3 text-sm">
          <span>Tiempo por turno</span>
          {room.isHost ? (
            <select
              className="rounded border border-input bg-background px-2 py-1"
              value={room.turnSeconds ?? ""}
              disabled={busy}
              onChange={(e) => onTimer(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin límite</option>
              <option value="30">30 segundos</option>
              <option value="60">1 minuto</option>
              <option value="120">2 minutos</option>
            </select>
          ) : (
            <b className="text-accent">{room.turnSeconds ? `${room.turnSeconds} s` : "Sin límite"}</b>
          )}
        </div>
        {room.isHost ? (
          <Button size="lg" className="mt-4 w-full" onClick={onStart} disabled={busy || !enough}>
            {enough ? "Repartir cartas" : "Esperando jugadores…"}
          </Button>
        ) : (
          <p className="mt-4 text-center font-display text-xl text-accent">Esperando al anfitrión…</p>
        )}
      </div>
    </div>
  );
}
