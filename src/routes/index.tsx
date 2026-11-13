import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import hero from "@/assets/taberna-hero.jpg";
import { GAMES } from "@/lib/games/info";
import { createRoom, joinRoom } from "@/lib/rooms.functions";
import { getGuestName, setGuestName, setRoomToken } from "@/lib/session";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayingCard } from "@/components/game/PlayingCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Timba — Juega a la baraja española con tus amigos" },
      { name: "description", content: "Crea una mesa, comparte el código por WhatsApp o Telegram y jugad al cinquillo, el burro, el siete y medio o la escoba." },
      { property: "og:title", content: "La Timba — Juega a la baraja española con tus amigos" },
      { property: "og:description", content: "Crea una mesa, comparte el código y a jugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, username } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [game, setGame] = useState(GAMES[0].id);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  useEffect(() => setName(getGuestName()), []);
  const playerName = user ? username ?? "Jugador" : name.trim();

  const ensureName = () => {
    if (!playerName) {
      toast.error("Escribe tu nombre para jugar como invitado");
      return false;
    }
    if (!user) setGuestName(playerName);
    return true;
  };

  const onCreate = async () => {
    if (!ensureName()) return;
    setBusy("create");
    try {
      const r = await createRoom({ data: { game, name: playerName } });
      setRoomToken(r.code, r.token);
      navigate({ to: "/sala/$codigo", params: { codigo: r.code } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async () => {
    if (!ensureName()) return;
    if (code.trim().length < 4) { toast.error("Introduce el código de la sala"); return; }
    setBusy("join");
    try {
      const r = await joinRoom({ data: { code: code.trim(), name: playerName } });
      setRoomToken(r.code, r.token);
      navigate({ to: "/sala/$codigo", params: { codigo: r.code } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main>
      <section className="relative overflow-hidden border-b-2 border-accent/60">
        <img src={hero} alt="Mesa de taberna con naipes españoles" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-accent">Baraja española · en línea</p>
          <h1 className="max-w-2xl text-5xl leading-[1.05] sm:text-7xl">Saca la baraja, que esta noche hay timba.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Crea una mesa, pasa el código a tus amigos por WhatsApp o Telegram y jugad sin hablar: solo con las cartas.
          </p>
          <div className="mt-8 flex gap-2">
            {["o1", "c12", "e7", "b11"].map((c, i) => (
              <PlayingCard key={c} card={c} size="md" className="animate-deal" style={{ animationDelay: `${i * 90}ms`, rotate: `${(i - 1.5) * 6}deg` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="poster-frame rounded-lg bg-card p-6">
          <h2 className="text-3xl">Monta una mesa</h2>
          <p className="mt-1 text-muted-foreground">Elige a qué se juega hoy.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGame(g.id)}
                className={cn(
                  "rounded-md border-2 p-4 text-left transition-colors",
                  game === g.id ? "border-accent bg-secondary" : "border-border hover:border-accent/60",
                )}
              >
                <div className="font-display text-xl">{g.name}</div>
                <div className="text-sm text-muted-foreground">{g.tagline}</div>
                <div className="mt-2 text-xs uppercase tracking-wider text-accent">
                  {g.players} · {g.duration}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            {user ? (
              <p className="flex-1 text-sm text-muted-foreground">
                Juegas como <span className="font-semibold text-accent">{username}</span> y sumarás puntos.
              </p>
            ) : (
              <Input placeholder="Tu nombre (invitado)" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="flex-1" />
            )}
            <Button size="lg" onClick={onCreate} disabled={busy !== null}>
              {busy === "create" ? "Barajando…" : "Crear partida"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/juegos/$juego" params={{ juego: game }} className="underline hover:text-accent">
              ¿Cómo se juega a {GAMES.find((g) => g.id === game)?.name}?
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="poster-frame rounded-lg bg-card p-6">
            <h2 className="text-3xl">Tengo un código</h2>
            <p className="mt-1 text-muted-foreground">Te lo ha pasado un amigo.</p>
            <Input
              placeholder="ABC123"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-4 text-center font-display text-2xl tracking-[0.4em]"
            />
            {!user && (
              <Input placeholder="Tu nombre (invitado)" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="mt-3" />
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={onJoin} disabled={busy !== null}>
              {busy === "join" ? "Entrando…" : "Sentarme a la mesa"}
            </Button>
          </div>
          {!user && (
            <div className="rounded-lg border-2 border-dashed border-accent/50 p-5 text-sm">
              <p className="font-semibold text-accent">¿Quieres sumar puntos?</p>
              <p className="mt-1 text-muted-foreground">Crea tu perfil y compite en el ranking con tus amigos. Los invitados juegan, pero no puntúan.</p>
              <Button variant="link" className="px-0 text-accent" asChild>
                <Link to="/auth">Crear cuenta →</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
