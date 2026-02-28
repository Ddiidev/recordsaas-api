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

// Shown on card statement as suffix (subject to Stripe/account constraints)
const RECORDSAAS_STATEMENT_DESCRIPTOR_SUFFIX = "RECORDSAAS";
const RECORDSAAS_CHECKOUT_DISPLAY_NAME = "RecordSaaS";
const RECORDSAAS_CANONICAL_APP_URL = "https://recordsaas.app";

// Cache to avoid repeated API calls within the same Lambda invocation
let priceCache: Record<string, Record<string, string>> | null = null;

function resolveAppUrl(): string {
  const raw = (Netlify.env.get("APP_URL") || RECORDSAAS_CANONICAL_APP_URL).trim();

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === "recordsaas-api.netlify.app" || hostname === "recordsaas.netlify.app") {
      return RECORDSAAS_CANONICAL_APP_URL;
    }

    return parsed.origin.replace(/\/$/, "");
  } catch {
    return RECORDSAAS_CANONICAL_APP_URL;
  }
}

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

async function hasActiveSubscription(stripe: Stripe, customerId: string): Promise<boolean> {
  const activeSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (activeSubscriptions.data.some((sub) => sub.status === "active")) {
    return true;
  }

  // Fallback: query all statuses and filter for active subscriptions.
  const allSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return allSubscriptions.data.some((sub) => sub.status === "active");
}

async function hasLifetimeLicense(
  stripe: Stripe,
  customer: Stripe.Customer
): Promise<boolean> {
  const metadata = customer.metadata || {};
  if (metadata.recordsaas_active === "true" && metadata.recordsaas_plan === "lifetime") {
    return true;
  }

  // Fallback: detect completed paid lifetime checkout sessions for this customer.
  const sessions = await stripe.checkout.sessions.list({
    customer: customer.id,
    status: "complete",
    limit: 20,
  });

  return sessions.data.some(
    (session) => session.payment_status === "paid" && session.metadata?.plan === "lifetime"
  );
}

function isBrandingSettingsUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return (
    message.includes("branding_settings") &&
    (message.includes("unknown parameter") || message.includes("received unknown parameter"))
  );
}

async function createCheckoutSessionWithBrandingFallback(
  stripe: Stripe,
  sessionParams: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
  const sessionParamsWithBranding = {
    ...sessionParams,
    // Available in newer Stripe API versions; fallback keeps compatibility on older versions.
    branding_settings: {
      display_name: RECORDSAAS_CHECKOUT_DISPLAY_NAME,
    },
  } as Stripe.Checkout.SessionCreateParams;

  try {
    return await stripe.checkout.sessions.create(sessionParamsWithBranding);
  } catch (error) {
    if (!isBrandingSettingsUnsupportedError(error)) {
      throw error;
    }

    console.warn(
      "Stripe API version does not support branding_settings; falling back to account business name."
    );
    return stripe.checkout.sessions.create(sessionParams);
  }
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      const customer = existingCustomers.data[0];
      customerId = customer.id;

      if (plan === "pro") {
        const activeSubscriptionExists = await hasActiveSubscription(stripe, customerId);
        if (activeSubscriptionExists) {
          return new Response(
            JSON.stringify({
              error: "Active subscription already exists",
              code: "ACTIVE_SUBSCRIPTION_EXISTS",
            }),
            {
              status: 409,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      }

      if (plan === "lifetime") {
        const activeLifetimeExists = await hasLifetimeLicense(stripe, customer);
        if (activeLifetimeExists) {
          return new Response(
            JSON.stringify({
              error: "Lifetime plan already active",
              code: "ACTIVE_LIFETIME_EXISTS",
            }),
            {
              status: 409,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
      }
    } else {
      const newCustomer = await stripe.customers.create({ email });
      customerId = newCustomer.id;
    }

    const appUrl = resolveAppUrl();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        plan,
        region,
        app: "recordsaas",
      },
    };

    // Product-specific statement descriptor for RecordSaaS one-time purchase.
    if (plan === "lifetime") {
      sessionParams.payment_intent_data = {
        statement_descriptor_suffix: RECORDSAAS_STATEMENT_DESCRIPTOR_SUFFIX,
      };
    }

    const session = await createCheckoutSessionWithBrandingFallback(stripe, sessionParams);

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
