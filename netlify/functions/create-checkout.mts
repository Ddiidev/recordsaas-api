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

// Product names must match exactly in Stripe (both test and live mode)
const PRODUCT_NAMES: Record<string, string> = {
  pro: "RecordSaaS Pro",
  lifetime: "RecordSaaS Lifetime",
};

// Cache to avoid repeated API calls within the same Lambda invocation
let priceCache: Record<string, Record<string, string>> | null = null;

async function getPriceMap(stripe: Stripe): Promise<Record<string, Record<string, string>>> {
  if (priceCache) return priceCache;

  const priceMap: Record<string, Record<string, string>> = {
    pro: {},
    lifetime: {},
  };

  for (const [plan, productName] of Object.entries(PRODUCT_NAMES)) {
    // Search products by name
    const products = await stripe.products.search({
      query: `name:"${productName}"`,
      limit: 1,
    });

    if (products.data.length === 0) {
      throw new Error(`Product "${productName}" not found in Stripe. Create it first.`);
    }

    const product = products.data[0];

    // Get all active prices for this product
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    for (const price of prices.data) {
      const currency = price.currency.toLowerCase();
      if (currency === "brl" && !priceMap[plan].br) {
        priceMap[plan].br = price.id;
      } else if (currency === "usd" && !priceMap[plan].global) {
        priceMap[plan].global = price.id;
      }
    }

    if (!priceMap[plan].global) {
      throw new Error(`No USD price found for "${productName}". Create one in Stripe.`);
    }
  }

  priceCache = priceMap;
  return priceMap;
}

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

    if (!["pro", "lifetime"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'pro' or 'lifetime'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const region = isBrazilLocale(locale || "") ? "br" : "global";
    const mode = plan === "pro" ? "subscription" : "payment";

    const stripe = getStripe();

    // Dynamic price lookup — works with both test and live Stripe keys
    const priceMap = await getPriceMap(stripe);
    const priceId = priceMap[plan][region] || priceMap[plan].global; // fallback to global if BR price missing
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
