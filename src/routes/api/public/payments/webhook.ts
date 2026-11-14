import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const env = new URL(request.url).searchParams.get("env");
    if (env !== "sandbox" && env !== "live") return new Response("Invalid environment", { status: 400 });
    let event;
    try {
      const { verifyWebhook } = await import("@/lib/stripe.server");
      event = await verifyWebhook(request, env);
    } catch { return new Response("Invalid signature", { status: 400 }); }
    try {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const { fulfillRoomPurchase } = await import("@/lib/room-billing.server");
        await fulfillRoomPurchase(event.data.object, env);
      }
      if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("room_purchases").update({ status: event.type === "checkout.session.expired" ? "expired" : "failed" }).eq("session_id", event.data.object.id).eq("environment", env).eq("status", "pending");
        if (error) throw new Error("Order update failed");
      }
      return Response.json({ received: true });
    } catch { return new Response("Payment processing unavailable", { status: 500 }); }
  } } },
});