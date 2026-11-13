import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { getRanking } from "@/lib/rooms.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — La Timba" },
      { name: "description", content: "Clasificación de jugadores: quién manda en la baraja española entre tus amigos." },
      { property: "og:title", content: "Ranking — La Timba" },
      { property: "og:description", content: "¿Quién manda en la mesa? Consulta la clasificación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ranking,
});

function Ranking() {
  const { user, loading } = useAuth();
  const [scope, setScope] = useState<"friends" | "global">("friends");
  const q = useQuery({
    queryKey: ["ranking", scope, user?.id ?? "anon"],
    queryFn: () => getRanking({ data: { scope } }),
    enabled: !loading,
  });
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-5xl">El ranking</h1>
      <p className="mt-2 text-muted-foreground">Puntos por partida: 1º 10 · 2º 6 · 3º 3 · resto 1.</p>
      <div className="mt-6 inline-flex rounded-md border-2 border-accent p-1">
        {(["friends", "global"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn("rounded px-4 py-1.5 text-sm font-semibold", scope === s ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
          >
            {s === "friends" ? "Con mis amigos" : "General"}
          </button>
        ))}
      </div>
      <div className="poster-frame mt-6 overflow-hidden rounded-lg bg-card">
        {q.isLoading || loading ? (
          <p className="p-6 text-muted-foreground">Contando garbanzos…</p>
        ) : q.data?.needsAuth ? (
          <p className="p-6">
            <Link to="/auth" className="text-accent underline">Entra con tu perfil</Link> para ver tu ranking con los amigos con los que has jugado.
          </p>
        ) : !q.data?.rows.length ? (
          <p className="p-6 text-muted-foreground">Aún no hay partidas puntuadas. ¡Monta una mesa!</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Jugador</th>
                <th className="p-3 text-right">Partidas</th>
                <th className="p-3 text-right">Victorias</th>
                <th className="p-3 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {q.data.rows.map((r, i) => (
                <tr key={r.id} className={cn("border-b border-border/50", r.id === q.data.me && "bg-secondary")}>
                  <td className="p-3 font-display text-xl text-accent">{i + 1}</td>
                  <td className="p-3 font-semibold">{r.username}</td>
                  <td className="p-3 text-right">{r.games_played}</td>
                  <td className="p-3 text-right">{r.wins}</td>
                  <td className="p-3 text-right font-display text-xl">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
