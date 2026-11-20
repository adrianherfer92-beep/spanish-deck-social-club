import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import hero from "@/assets/taberna-hero.jpg";
import { GAMES } from "@/lib/games/info";
import { createRoom, joinRoom, getRoom, getOrigin } from "@/lib/rooms.functions";
import { ogImageMeta } from "@/lib/og";
import { getGuestName, setGuestName, setRoomToken, getLastRoom, getRoomToken, clearLastRoom } from "@/lib/session";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayingCard } from "@/components/game/PlayingCard";
import { cn } from "@/lib/utils";
import { GameRulesDialog } from "@/components/game/GameRulesDialog";
import { Check, Plus, LogIn, ArrowRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/")({
  loader: () => getOrigin(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "La Timba — Juega a la baraja española con tus amigos" },
      { name: "description", content: "Crea una mesa, comparte el código por WhatsApp o Telegram y jugad al cinquillo, el burro, el siete y medio o la escoba." },
      { property: "og:title", content: "La Timba — Juega a la baraja española con tus amigos" },
      { property: "og:description", content: "Crea una mesa, comparte el código y a jugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(loaderData),
    ],
  }),
  component: Index,
});

function Index() {
  const { user, username, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [game, setGame] = useState(GAMES[0].id);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const create = useServerFn(createRoom);

  useEffect(() => setName(getGuestName()), []);
  const [resume, setResume] = useState<{ code: string; game: string } | null>(null);
  useEffect(() => {
    const last = getLastRoom();
    const t = last ? getRoomToken(last) : "";
    if (!last || !t) return;
    getRoom({ data: { code: last, token: t } })
      .then((r) => {
        if (r.joined && r.status !== "finished") setResume({ code: r.code, game: GAMES.find((g) => g.id === r.game)?.name ?? r.game });
        else clearLastRoom();
      })
      .catch(() => clearLastRoom());
  }, []);
  const playerName = user ? username ?? "Jugador" : name.trim();
  const selectedGame = GAMES.find(g => g.id === game) ?? GAMES[0];
  const validCode = /^[A-Z0-9]{4,6}$/.test(code.trim());
  const focusSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    document.getElementById(id === "join-table" ? "table-code" : "create-game")?.focus({ preventScroll: true });
  };

  const ensureName = () => {
    if (!playerName) {
      toast.error("Escribe tu nombre para jugar como invitado");
      return false;
    }
    if (!user) setGuestName(playerName);
    return true;
  };

  const onCreate = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!ensureName()) return;
    setBusy("create");
    try {
      const r = await create({ data: { game, name: playerName, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
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
    if (!validCode) { toast.error("Introduce el código de la sala"); return; }
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
      <section className="relative overflow-hidden border-b border-border">
        <img src={hero} alt="Mesa de taberna con naipes españoles" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="mb-3 text-sm text-accent">Baraja española · con tus amigos</p>
          <h1 className="text-5xl leading-tight sm:text-6xl">La Timba</h1>
          <p className="mt-3 max-w-[55ch] text-xl">Saca la baraja, que esta noche hay timba.</p>
          <p className="mt-3 max-w-[65ch] text-muted-foreground">Necesitas una cuenta gratuita para crear mesas; para unirte, no.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" disabled={loading} onClick={() => user ? focusSection("create-table") : navigate({ to: "/auth" })}><Plus />Crear mesa</Button>
            <Button variant="outline" size="lg" onClick={() => focusSection("join-table")}><LogIn />Tengo un código</Button>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-5 right-8 hidden gap-1 opacity-60 lg:flex">
            {["o1", "c12", "e7", "b11"].map(c => <PlayingCard key={c} card={c} size="sm" />)}
          </div>
        </div>
      </section>

      {resume && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary p-4">
            <p className="max-w-[70ch]">Tienes una mesa de <b>{resume.game}</b> en curso (código {resume.code}).</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { clearLastRoom(); setResume(null); }}>Olvidar</Button>
              <Button asChild size="sm"><Link to="/sala/$codigo" params={{ codigo: resume.code }}>Volver a la mesa</Link></Button>
            </div>
          </div>
        </div>
      )}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.5fr_1fr]">
        <div id="create-table" className="scroll-mt-6 border-b border-border pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <h2 className="text-3xl">Monta una mesa</h2>
          {loading ? <p className="mt-4 text-muted-foreground">Comprobando tu cuenta…</p> : user ? (
            <>
              <p className="mt-2 max-w-[70ch] text-muted-foreground">Elige el juego. Crear partidas es gratis por ahora.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Elige el juego">
                {GAMES.map(g => (
                  <div key={g.id} className={cn("flex flex-col rounded-lg border-2 transition-colors", game === g.id ? "border-accent bg-secondary" : "border-border bg-card")}>
                    <Button variant="ghost" aria-pressed={game === g.id} aria-label={`Elegir ${g.name}`} onClick={() => setGame(g.id)} className="h-auto min-h-32 w-full justify-start whitespace-normal rounded-b-none p-4 text-left hover:bg-secondary hover:text-foreground">
                      <span className="w-full">
                        <span className="flex items-center justify-between gap-2"><span className="font-display text-xl">{g.name}</span>{game === g.id && <Check className="text-accent" aria-label="Seleccionado" />}</span>
                        <span className="mt-1 block text-sm font-normal text-muted-foreground">{g.tagline}</span>
                        <span className="mt-3 block text-xs font-normal text-muted-foreground">{g.players} · {g.duration}</span>
                      </span>
                    </Button>
                    <div className="mt-auto flex items-center justify-between gap-2 px-3 pb-2"><span className="text-xs font-semibold">{g.complexity}</span><GameRulesDialog game={g} compact /></div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{selectedGame.complexityDetail}</p>
              <div className="mt-5"><p className="text-sm text-muted-foreground">Tu nombre en la mesa</p><p className="mt-1 font-semibold">{playerName}</p></div>
              <Button id="create-game" size="lg" className="mt-5 h-auto min-h-11 w-full whitespace-normal py-3" onClick={onCreate} disabled={busy !== null}><Plus />{busy === "create" ? "Barajando…" : `Crear partida de ${selectedGame.name}`}</Button>
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="max-w-[70ch] text-muted-foreground">Necesitas una cuenta gratuita para crear mesas; para unirte, no.</p>
              <Button asChild size="lg"><Link to="/auth">Entrar o crear cuenta<ArrowRight /></Link></Button>
              <p><Link to="/juegos" className="text-sm underline underline-offset-4">Ver juegos y reglas</Link></p>
            </div>
          )}
        </div>
        <div id="join-table" className="scroll-mt-6">
          <h2 className="text-3xl">Tengo un código</h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">Si te han invitado, tu sitio está aquí.</p>
          <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); if (validCode && playerName) void onJoin(); }}>
            <div><label htmlFor="table-code" className="mb-2 block text-sm font-semibold">Código de la mesa</label><Input id="table-code" placeholder="p. ej. ABC123" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase())} className="h-12 font-sans text-lg" /></div>
            {!user && !loading && <div><label htmlFor="guest-name" className="mb-2 block text-sm font-semibold">Tu nombre en la mesa</label><Input id="guest-name" placeholder="p. ej. Alex" autoComplete="nickname" value={name} maxLength={20} onChange={e => setName(e.target.value)} /><p className="mt-2 text-xs text-muted-foreground">Lo recordaremos para tu próxima mesa. Juegas como invitado, sin puntos.</p></div>}
            {user && <div><p className="text-sm text-muted-foreground">Tu nombre en la mesa</p><p className="mt-1 font-semibold">{playerName}</p></div>}
            <Button type="submit" variant={validCode ? "default" : "secondary"} className="h-11 w-full" disabled={busy !== null || loading || !validCode || !playerName}><LogIn />{busy === "join" ? "Entrando…" : "Sentarme a la mesa"}</Button>
          </form>
          {!user && <p className="mt-6 max-w-[70ch] border-t border-border pt-4 text-sm text-muted-foreground">¿Quieres sumar puntos? <Link to="/auth" className="text-foreground underline underline-offset-4">Crea tu cuenta gratuita.</Link></p>}
        </div>
      </section>
    </main>
  );
}
