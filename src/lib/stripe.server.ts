import Stripe from 'stripe';
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  return env === 'sandbox'
    ? getEnv('STRIPE_SANDBOX_API_KEY')
    : getEnv('STRIPE_LIVE_API_KEY');
}

// Routes api.stripe.com requests through the connector gateway.
// Only api.stripe.com is proxied (not files.stripe.com or connect.stripe.com).
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  return new Stripe(connectionApiKey, {
    // Pin the wire API version explicitly so request/response shapes (e.g.
    // period fields on subscription items, Checkout Session ui_mode enum)
    // don't silently change if a future SDK bump lands a new default or
    // if the installed `stripe` package resolves to a different major.
    // The surrounding knowledge files assume dahlia semantics.
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

export async function verifyWebhook(req: Request, env: StripeEnv) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = getEnv(env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET");
  if (!signature || !body) throw new Error("Missing signature");
  const parts = signature.split(",").map(p => p.split("=", 2));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  if (!timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Invalid timestamp");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(signed), b => b.toString(16).padStart(2, "0")).join("");
  if (!parts.some(([k, v]) => k === "v1" && v?.length === expected.length && Array.from(expected).reduce((diff, c, i) => diff | (c.charCodeAt(0) ^ v.charCodeAt(i)), 0) === 0)) throw new Error("Invalid webhook signature");
  return JSON.parse(body) as Stripe.Event;
}