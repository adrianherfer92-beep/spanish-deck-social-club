import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
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
  const [showPw, setShowPw] = useState(false);

  const pwRules = [
    { ok: pw.length >= 8, label: "Al menos 8 caracteres" },
    { ok: /[a-z]/.test(pw), label: "Una letra minúscula" },
    { ok: /[A-Z]/.test(pw), label: "Una letra mayúscula" },
    { ok: /[0-9]/.test(pw), label: "Un número" },
  ];
  const pwValid = pwRules.every((r) => r.ok);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwValid) { toast.error("La contraseña no cumple los requisitos"); return; }
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
        <Label htmlFor="np">Contraseña</Label>
        <div className="relative">
          <Input id="np" type={showPw ? "text" : "password"} minLength={8} className="pr-10" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <button
            type="button"
            aria-label={showPw ? "Ocultar contraseña" : "Ver contraseña"}
            title="Mantén pulsado para ver la contraseña"
            className="absolute right-2 top-1/2 -translate-y-1/2 touch-none select-none text-muted-foreground hover:text-foreground"
            onPointerDown={(e) => { e.preventDefault(); setShowPw(true); }}
            onPointerUp={() => setShowPw(false)}
            onPointerLeave={() => setShowPw(false)}
            onPointerCancel={() => setShowPw(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <ul className="space-y-1 text-xs">
          {pwRules.map((r) => (
            <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
              {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {r.label}
            </li>
          ))}
        </ul>
        <Button type="submit" className="w-full" disabled={busy || !pwValid}>Guardar</Button>
      </form>
    </main>
  );
}
