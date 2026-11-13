import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — La Timba" },
      { name: "description", content: "Tu nombre de jugador, tus puntos y tus victorias." },
      { property: "og:title", content: "Mi perfil — La Timba" },
      { property: "og:description", content: "Tu nombre de jugador y tus puntos." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

type Prof = { username: string; points: number; games_played: number; wins: number };

function Perfil() {
  const { user, loading } = useAuth();
  const [prof, setProf] = useState<Prof | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, points, games_played, wins").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProf(data);
        setName(data.username);
      }
    });
  }, [user]);

  if (loading) return <main className="p-12 text-center text-muted-foreground">Cargando…</main>;
  if (!user)
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p>Necesitas un perfil para ver esto.</p>
        <Button asChild className="mt-4"><Link to="/auth">Entrar</Link></Button>
      </main>
    );

  const save = async () => {
    const n = name.trim();
    if (n.length < 2) { toast.error("Mínimo 2 letras"); return; }
    const { error } = await supabase.from("profiles").update({ username: n }).eq("id", user.id);
    if (error) toast.error(error.code === "23505" ? "Ese nombre ya está cogido" : error.message);
    else toast.success("Nombre actualizado");
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-5xl">Mi perfil</h1>
      <div className="poster-frame mt-6 rounded-lg bg-card p-6">
        <label className="text-sm text-muted-foreground">Nombre de jugador</label>
        <div className="mt-1 flex gap-2">
          <Input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          <Button onClick={save}>Guardar</Button>
        </div>
        {prof && (
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[["Puntos", prof.points], ["Partidas", prof.games_played], ["Victorias", prof.wins]].map(([l, v]) => (
              <div key={l} className="rounded border border-border p-3">
                <div className="font-display text-3xl text-accent">{v}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
