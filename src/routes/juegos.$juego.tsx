import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { gameInfo } from "@/lib/games/info";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/juegos/$juego")({
  loader: ({ params }) => {
    const g = gameInfo(params.juego);
    if (!g) throw notFound();
    return g;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Cómo jugar a ${loaderData.name} — La Timba` },
          { name: "description", content: `${loaderData.tagline} Reglas de ${loaderData.name} con baraja española.` },
          { property: "og:title", content: `Cómo jugar a ${loaderData.name}` },
          { property: "og:description", content: loaderData.tagline },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Juego no encontrado — La Timba" }, { name: "robots", content: "noindex" }],
  }),
  component: Reglas,
});

function Reglas() {
  const g = Route.useLoaderData();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/juegos" className="text-sm text-muted-foreground hover:text-accent">← Todos los juegos</Link>
      <h1 className="mt-3 text-6xl">{g.name}</h1>
      <p className="mt-2 text-xl text-muted-foreground">{g.tagline}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-wider">
        <span className="rounded border border-accent px-2 py-1 text-accent">{g.players}</span>
        <span className="rounded border border-accent px-2 py-1 text-accent">{g.duration}</span>
      </div>
      <section className="poster-frame mt-8 rounded-lg bg-card p-6">
        <h2 className="text-2xl">Objetivo</h2>
        <p className="mt-2">{g.objective}</p>
        <h2 className="mt-6 text-2xl">Cómo se juega</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {g.rules.map((r) => <li key={r}>{r}</li>)}
        </ol>
        <h2 className="mt-6 text-2xl">Consejos de la casa</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          {g.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">Al terminar, los jugadores registrados suman puntos según su posición: 1º 10, 2º 6, 3º 3 y el resto 1.</p>
      </section>
      <Button asChild size="lg" className="mt-8">
        <Link to="/">Montar una mesa</Link>
      </Button>
    </main>
  );
}
