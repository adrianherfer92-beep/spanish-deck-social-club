import { createFileRoute, Link } from "@tanstack/react-router";
import { GAMES } from "@/lib/games/info";
import { PlayingCard } from "@/components/game/PlayingCard";

const COVER: Record<string, string> = { cinquillo: "o5", burro: "b1", "siete-y-medio": "c7", escoba: "e10" };

export const Route = createFileRoute("/juegos/")({
  head: () => ({
    meta: [
      { title: "Juegos de baraja española — La Timba" },
      { name: "description", content: "Reglas del cinquillo, el burro, el siete y medio y la escoba explicadas de forma sencilla." },
      { property: "og:title", content: "Juegos de baraja española — La Timba" },
      { property: "og:description", content: "Aprende a jugar al cinquillo, el burro, el siete y medio y la escoba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Juegos,
});

function Juegos() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-5xl">Los juegos de la casa</h1>
      <p className="mt-2 text-muted-foreground">Baraja española, amigos y un chat en cada mesa.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {GAMES.map((g) => (
          <Link key={g.id} to="/juegos/$juego" params={{ juego: g.id }} className="flex gap-5 border border-border rounded-lg bg-card p-5 transition-transform hover:-translate-y-1">
            <PlayingCard card={COVER[g.id]} size="lg" />
            <div>
              <h2 className="text-3xl">{g.name}</h2>
              <p className="text-muted-foreground">{g.tagline}</p>
              <p className="mt-3 text-xs text-muted-foreground">{g.players} · {g.duration} · {g.complexity}</p>
              <p className="mt-3 text-sm">{g.objective}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
