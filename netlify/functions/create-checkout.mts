import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface CheckoutRequest {
  email: string;
  plan: "pro" | "lifetime";
  locale: string;
}

const PRICE_MAP: Record<string, Record<string, string>> = {
  pro: {
    global: "price_1T3gxULZ5gTFc3B2JwluosIr", // $10/month
    br: "price_1T3gxVLZ5gTFc3B2W4p6tlyg",     // $5/month (Brazil)
  },
  lifetime: {
    global: "price_1T3gxWLZ5gTFc3B2XJRErpzK", // $87 one-time
    br: "price_1T3gxWLZ5gTFc3B21lCKdpV9",     // $35 one-time (Brazil)
  },
};

function isBrazilLocale(locale: string): boolean {
  const normalized = locale.toLowerCase().trim();
  return normalized === "pt-br" || normalized === "pt_br" || normalized === "br";
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as CheckoutRequest;
    const { email, plan, locale } = body;

    if (!email || !plan) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, plan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!PRICE_MAP[plan]) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'pro' or 'lifetime'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const region = isBrazilLocale(locale || "") ? "br" : "global";
    const priceId = PRICE_MAP[plan][region];
    const mode = plan === "pro" ? "subscription" : "payment";

    const stripe = getStripe();

    // Find or create customer by email
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({ email });
      customerId = newCustomer.id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      success_url: `${Netlify.env.get("APP_URL") || "https://recordsaas.netlify.app"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Netlify.env.get("APP_URL") || "https://recordsaas.netlify.app"}/cancel`,
      metadata: {
        plan,
        region,
        app: "recordsaas",
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/api/create-checkout",
};
