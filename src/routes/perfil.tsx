import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { randomAvatarSeed, resolvedAvatarSeed } from "@/lib/avatars";
import { Shuffle, Save, Undo2 } from "lucide-react";

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

type Prof = { username: string; points: number; games_played: number; wins: number; avatar_seed: string | null };

function Perfil() {
  const { user, loading } = useAuth();
  const [prof, setProf] = useState<Prof | null>(null);
  const [name, setName] = useState("");
  const [chosenAvatar, setChosenAvatar] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, points, games_played, wins, avatar_seed").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProf(data);
        setName(data.username);
        setChosenAvatar(data.avatar_seed);
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

  const avatarChanged = chosenAvatar !== prof?.avatar_seed;
  const saveAvatar = async () => {
    if (!prof || !chosenAvatar || savingAvatar) return;
    setSavingAvatar(true);
    try {
      const { data, error } = await supabase.from("profiles").update({ avatar_seed: chosenAvatar }).eq("id", user.id).select("avatar_seed").single();
      if (error) throw error;
      setProf((current) => current ? { ...current, avatar_seed: data.avatar_seed } : current);
      toast.success("Avatar guardado");
    } catch {
      toast.error("No se pudo guardar el avatar. Inténtalo de nuevo.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const download = async () => {
    const data = await exportMyData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "mis-datos-la-timba.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const remove = async () => {
    if (!window.confirm("¿Borrar tu cuenta para siempre? Perderás tus puntos. No se puede deshacer.")) return;
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      toast.success("Cuenta borrada");
      window.location.href = "/";
    } catch { toast.error("No se pudo borrar la cuenta"); }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-5xl">Mi perfil</h1>
      <div className="mt-6 flex items-center gap-4">
        <PlayerAvatar seed={resolvedAvatarSeed(user.id, chosenAvatar)} name={prof?.username ?? "Jugador"} className="h-24 w-24" />
        <div className="min-w-0 flex-1">
          <p className="break-all font-display text-2xl text-accent">{prof?.username ?? "Jugador"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="icon" aria-label="Probar otro avatar" title="Probar otro avatar" disabled={!prof || savingAvatar} onClick={() => setChosenAvatar(randomAvatarSeed())}><Shuffle /></Button>
            <Button size="sm" disabled={!prof || !avatarChanged || savingAvatar} onClick={saveAvatar}><Save />{savingAvatar ? "Guardando…" : "Guardar avatar"}</Button>
            {avatarChanged && prof && <Button variant="ghost" size="icon" aria-label="Descartar cambio de avatar" title="Descartar cambio de avatar" disabled={savingAvatar} onClick={() => setChosenAvatar(prof.avatar_seed)}><Undo2 /></Button>}
          </div>
        </div>
      </div>
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
      <div className="poster-frame mt-6 rounded-lg bg-card p-6">
        <h2 className="text-2xl">Tus datos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Guardamos solo tu correo, tu alias y tus partidas. <Link to="/privacidad" className="underline">Más info</Link>.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={download}>Descargar mis datos</Button>
          <Button variant="destructive" onClick={remove}>Borrar mi cuenta</Button>
        </div>
      </div>
    </main>
  );
}
