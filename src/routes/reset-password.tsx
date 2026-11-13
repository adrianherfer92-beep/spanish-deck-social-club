import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — La Timba" },
      { name: "description", content: "Elige una nueva contraseña para tu perfil de La Timba." },
      { property: "og:title", content: "Nueva contraseña — La Timba" },
      { property: "og:description", content: "Restablece tu contraseña." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña cambiada");
    navigate({ to: "/" });
  };
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <form onSubmit={submit} className="poster-frame space-y-3 rounded-lg bg-card p-7">
        <h1 className="text-4xl">Nueva contraseña</h1>
        <Label htmlFor="np">Contraseña (mínimo 8)</Label>
        <Input id="np" type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <Button type="submit" className="w-full" disabled={busy}>Guardar</Button>
      </form>
    </main>
  );
}
