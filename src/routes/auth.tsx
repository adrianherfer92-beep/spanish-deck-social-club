import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar o crear perfil — La Timba" },
      { name: "description", content: "Crea tu perfil para sumar puntos y competir en el ranking con tus amigos." },
      { property: "og:title", content: "Entrar — La Timba" },
      { property: "og:description", content: "Crea tu perfil y suma puntos en cada partida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const pwRules = [
    { ok: password.length >= 8, label: "Al menos 8 caracteres" },
    { ok: /[a-z]/.test(password), label: "Una letra minúscula" },
    { ok: /[A-Z]/.test(password), label: "Una letra mayúscula" },
    { ok: /[0-9]/.test(password), label: "Un número" },
  ];
  const pwValid = pwRules.every((r) => r.ok);

  const sendReset = async () => {
    if (!email) { toast.error("Escribe tu correo"); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
    toast.success("Si ese correo tiene perfil, te llegará un enlace.");
    setForgot(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        if (username.trim().length < 2) throw new Error("Elige un nombre de al menos 2 letras");
        if (!pwValid) throw new Error("La contraseña no cumple los requisitos");
        if (!consent) throw new Error("Debes aceptar la política de privacidad");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username: username.trim(), privacy_accepted_at: new Date().toISOString() } },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Correo o contraseña incorrectos");
        toast.success("¡Bienvenido a la mesa!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (!consent) { toast.error("Acepta la política de privacidad para continuar"); return; }
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("No se pudo entrar con Google"); return; }
    if (r.redirected) return;
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ privacy_accepted_at: new Date().toISOString() }).eq("id", u.user.id).is("privacy_accepted_at", null);
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <div className="poster-frame rounded-lg bg-card p-7">
        <h1 className="text-4xl">{mode === "in" ? "Entrar" : "Crear perfil"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Con perfil sumas puntos y apareces en el ranking.</p>
        {sent ? (
          <p className="mt-6 rounded border border-accent p-4 text-sm">
            Te hemos enviado un correo a <b>{email}</b>. Ábrelo para confirmar tu cuenta y vuelve para jugar.
          </p>
        ) : (
          <>
            <label className="mt-6 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>He leído y acepto la <Link to="/privacidad" className="text-accent underline">política de privacidad</Link>. Solo guardamos tu correo, tu alias y tus puntos.</span>
            </label>
            <Button type="button" variant="outline" className="mt-4 w-full gap-2 border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2]" onClick={google}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.480-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.760 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Continuar con Google
            </Button>
            <div className="my-5 text-center text-xs uppercase tracking-widest text-muted-foreground">o con correo</div>
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && (
                <div>
                  <Label htmlFor="u">Nombre de jugador</Label>
                  <Input id="u" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} required />
                </div>
              )}
              <div>
                <Label htmlFor="e">Correo</Label>
                <Input id="e" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="p">Contraseña</Label>
                <div className="relative">
                  <Input id="p" type={showPw ? "text" : "password"} minLength={8} className="pr-10" autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
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
                {mode === "up" && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {pwRules.map((r) => (
                      <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                        {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {mode === "up" && <p className="text-xs text-muted-foreground">Tu nombre de jugador es público en mesas y ranking; no hace falta que sea tu nombre real.</p>}
              <Button type="submit" className="w-full" disabled={busy || (mode === "up" && !consent)}>
                {busy ? "Un momento…" : mode === "in" ? "Entrar" : "Crear perfil"}
              </Button>
            </form>
            {mode === "in" && (
              <button type="button" className="mt-3 block text-sm text-muted-foreground underline" onClick={() => (forgot ? sendReset() : setForgot(true))}>
                {forgot ? "Enviar enlace para cambiar contraseña" : "He olvidado mi contraseña"}
              </button>
            )}
            <button type="button" className="mt-4 text-sm text-accent underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "¿No tienes perfil? Créalo" : "Ya tengo perfil, entrar"}
            </button>
          </>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          ¿Solo quieres echar una partida? <Link to="/" className="underline">Juega como invitado</Link>.
        </p>
      </div>
    </main>
  );
}
