import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { environmentSchema, EXTRA_GAME_CENTS, EXTRA_GAME_PRICE } from "./room-billing";

export const getCreationAllowance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: environmentSchema }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error) throw new Error("No se pudo comprobar tu acceso");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { billingStatus } = await import("./room-billing.server");
    return billingStatus(supabaseAdmin, context.userId, data.environment, !!isAdmin);
  });

export const createGameCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: environmentSchema, game: z.enum(["cinquillo", "burro", "siete-y-medio", "escoba"]), returnOrigin: z.string().url() }))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const request = getRequest();
      const origins = new Set([new URL(request.url).origin, request.headers.get("origin"), "https://spanish-deck-social-club.lovable.app", "https://id-preview--a35b59e2-cff9-40a0-b1d9-c33852f565fa.lovable.app"]);
      const origin = new URL(data.returnOrigin).origin;
      if (!origins.has(origin)) throw new Error("Dirección de regreso no válida");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { assertNotSuspended } = await import("./moderation.server");
      await assertNotSuspended(supabaseAdmin, context.userId);
      const stripe = createStripeClient(data.environment);
      // Resolve user-linked Customer using the integration's canonical helper.
      async function resolveOrCreateCustomer(
        stripe: ReturnType<typeof createStripeClient>,
        options: { email?: string; userId?: string },
      ): Promise<string> {
        if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
        if (options.userId) {
          const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
          if (found.data.length) return found.data[0].id;
        }
        if (options.email) {
          const existing = await stripe.customers.list({ email: options.email, limit: 1 });
          if (existing.data.length) {
            const customer = existing.data[0];
            if (options.userId && customer.metadata?.userId !== options.userId) {
              await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
            }
            return customer.id;
          }
        }
        const created = await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) });
        return created.id;
      }
      const { data: { user } } = await context.supabase.auth.getUser();
      const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, email: user?.email });
      const prices = await stripe.prices.list({ lookup_keys: [EXTRA_GAME_PRICE], active: true });
      const price = prices.data[0];
      if (!price || price.unit_amount !== EXTRA_GAME_CENTS || price.currency !== "eur") throw new Error("Precio no disponible");
      const product = await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
      // Inclusive price guarantees the requested €1 final total with tax automation.
      const taxPrice = price.tax_behavior === "inclusive" ? price : await stripe.prices.create({ product: product.id, unit_amount: 100, currency: "eur", tax_behavior: "inclusive", nickname: product.name }, { idempotencyKey: `inclusive-${price.id}` });
      const { data: order, error } = await supabaseAdmin.from("room_purchases").insert({ user_id: context.userId, environment: data.environment }).select("id").single();
      if (error || !order) throw new Error("No se pudo preparar tu compra");
      const session = await stripe.checkout.sessions.create({
        customer, line_items: [{ price: taxPrice.id, quantity: 1 }], mode: "payment", ui_mode: "embedded_page", locale: "es",
        return_url: `${origin}/pago?session_id={CHECKOUT_SESSION_ID}&game=${data.game}`,
        payment_intent_data: { description: product.name },
        managed_payments: { enabled: true },
        metadata: { userId: context.userId, orderId: order.id, purpose: "extra_game", managed_payments: "true" },
      } as Stripe.Checkout.SessionCreateParams, { idempotencyKey: order.id });
      const saved = await supabaseAdmin.from("room_purchases").update({ session_id: session.id }).eq("id", order.id);
      if (saved.error) throw new Error("No se pudo guardar tu compra");
      return { clientSecret: session.client_secret ?? "", sessionId: session.id };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const checkGamePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ environment: environmentSchema, sessionId: z.string().startsWith("cs_").max(300) }))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const session = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
      if (session.metadata?.userId !== context.userId) throw new Error("Compra no disponible");
      const { fulfillRoomPurchase } = await import("./room-billing.server");
      const paid = await fulfillRoomPurchase(session, data.environment);
      return { paid, status: session.status };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });