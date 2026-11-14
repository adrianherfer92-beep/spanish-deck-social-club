import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/room-billing";
import { createGameCheckout, checkGamePayment } from "@/lib/payments.functions";
import { createRoom } from "@/lib/rooms.functions";
import { setRoomToken } from "@/lib/session";
import { GAMES } from "@/lib/games/info";

export const Route = createFileRoute("/pago")({
  validateSearch: (s: Record<string, unknown>) => ({ game: GAMES.some(g => g.id === s.game) ? String(s.game) : "cinquillo", session_id: typeof s.session_id === "string" && s.session_id.startsWith("cs_") ? s.session_id : undefined }),
  head: () => ({ meta: [{ title: "Partida adicional — La Timba" }, { name: "description", content: "Compra una partida adicional por 1 € con pago seguro." }, { property: "og:title", content: "Partida adicional — La Timba" }, { property: "og:description", content: "Una partida gratuita diaria; partidas adicionales por 1 €." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: PaymentPage,
});

function PaymentPage() {
  const { game, session_id } = Route.useSearch();
  if (!PAYMENTS_ENABLED) {
    return <main><div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">Partida adicional</h1>
      <p className="mt-3 text-lg">Los pagos están desactivados temporalmente: crear partidas es gratis.</p>
      <div className="mt-6"><Button asChild><Link to="/">Volver al inicio</Link></Button></div>
    </div></main>;
  }
  const { user, username, loading } = useAuth();
  const checkout = useServerFn(createGameCheckout);
  const check = useServerFn(checkGamePayment);
  const create = useServerFn(createRoom);
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [sessionId, setSessionId] = useState(session_id ?? "");
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify(id: string) {
    const result = await check({ data: { environment: getStripeEnvironment(), sessionId: id } });
    if ("error" in result) throw new Error(result.error);
    setPaid(result.paid);
    if (!result.paid) setError("El pago todavía no está confirmado. Puedes volver a comprobarlo.");
  }
  useEffect(() => {
    if (!user || !session_id) return;
    verify(session_id).catch(e => setError(e.message));
  }, [user?.id, session_id]);

  async function begin() {
    setBusy(true); setError("");
    try {
      const result = await checkout({ data: { game: game as "cinquillo" | "burro" | "siete-y-medio" | "escoba", environment: getStripeEnvironment(), returnOrigin: window.location.origin } });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("No se pudo abrir el pago");
      setSecret(result.clientSecret); setSessionId(result.sessionId);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function openRoom() {
    setBusy(true); setError("");
    try {
      const room = await create({ data: { game, name: username ?? "Jugador", environment: getStripeEnvironment() } });
      if ("error" in room) throw new Error(room.error);
      setRoomToken(room.code, room.token);
      await navigate({ to: "/sala/$codigo", params: { codigo: room.code } });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main><PaymentTestModeBanner /><div className="mx-auto max-w-3xl px-4 py-10">
    <h1 className="text-4xl">Partida adicional</h1>
    <p className="mt-3 text-lg">{GAMES.find(g => g.id === game)?.name} · <strong className="text-accent">1 € · impuestos incluidos</strong></p>
    <p className="mt-2 text-sm text-muted-foreground">Un único pago, sin suscripción. Entrar en las partidas de tus amigos sigue siendo gratis.</p>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    {loading ? <p className="mt-6">Comprobando tu cuenta…</p> : !user ? <Button asChild className="mt-6"><Link to="/auth">Entrar para comprar</Link></Button> : paid ? <div className="mt-6 space-y-4"><p>Pago confirmado. Tu partida adicional está disponible.</p><Button disabled={busy} onClick={openRoom}>{busy ? "Creando…" : "Crear partida"}</Button></div> : secret ? <div className="mt-6"><EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret: secret, onComplete: () => { verify(sessionId).catch(e => setError(e.message)); } }}><EmbeddedCheckout /></EmbeddedCheckoutProvider></div> : session_id ? <Button className="mt-6" onClick={() => verify(session_id).catch(e => setError(e.message))}>Comprobar pago</Button> : <Button className="mt-6" onClick={begin} disabled={busy}>{busy ? "Preparando…" : "Pagar 1 €"}</Button>}
    <div className="mt-6"><Button variant="link" asChild className="px-0"><Link to="/">Volver al inicio</Link></Button></div>
  </div></main>;
}