import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, username } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="border-b-2 border-accent/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-accent">La Timba</span>
          <span className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground sm:inline">naipes entre amigos</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link to="/juegos" className="rounded px-2 py-1 hover:text-accent" activeProps={{ className: "text-accent" }}>
            Juegos
          </Link>
          <Link to="/ranking" className="rounded px-2 py-1 hover:text-accent" activeProps={{ className: "text-accent" }}>
            Ranking
          </Link>
          {user ? (
            <>
              <Link to="/perfil" className="rounded px-2 py-1 font-semibold text-accent">
                {username ?? "Perfil"}
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                Salir
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
