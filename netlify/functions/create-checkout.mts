import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";
import { ON_DEMAND_CREDITS_UNITS } from "./_lib/export-policy.mts";
import { parseBearerToken, verifySessionToken } from "./_lib/jwt.mts";
import { resolveLicenseByEmail } from "./_lib/license.mts";

type CreditCheckoutPlan = "ondemand";
type CheckoutPlan = "pro" | "lifetime" | CreditCheckoutPlan;

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface CheckoutRequest {
  email: string;
  plan: CheckoutPlan;
  locale: string;
}

// Product names must match exactly in Stripe (both test and live mode)
const PRODUCT_NAMES: Record<CheckoutPlan, string> = {
  pro: "RecordSaaS Pro",
  lifetime: "RecordSaaS Lifetime",
  ondemand: "RecordSaaS on demand",
};

const CREDITS_UNITS_BY_PLAN: Record<CreditCheckoutPlan, number> = {
  ondemand: ON_DEMAND_CREDITS_UNITS,
};

const CREDIT_PLAN_PRICE_CONFIG: Record<
  CreditCheckoutPlan,
  {
    brlAmount: number;
    globalAmount?: number;
    requireGlobalPrice: boolean;
    validationMessage: string;
  }
> = {
  ondemand: {
    brlAmount: 1000,
    globalAmount: 400,
    requireGlobalPrice: true,
    validationMessage: 'RecordSaaS on demand must have active prices BRL 10.00 and USD 4.00 in Stripe.',
  },
};

function isCreditsPlan(plan: CheckoutPlan): plan is CreditCheckoutPlan {
  return plan === "ondemand";
}

// Shown on card statement as suffix (subject to Stripe/account constraints)
const RECORDSAAS_STATEMENT_DESCRIPTOR_SUFFIX = "RECORDSAAS";
const RECORDSAAS_CHECKOUT_DISPLAY_NAME = "RecordSaaS";
const RECORDSAAS_CANONICAL_APP_URL = "https://recordsaas.app";

// Cache to avoid repeated API calls within the same Lambda invocation
let priceCache: Record<CheckoutPlan, Record<string, string>> | null = null;

async function findProductByExactName(
  stripe: Stripe,
  productName: string,
): Promise<Stripe.Product | null> {
  try {
    const searchResult = await stripe.products.search({
      query: `name:"${productName}"`,
      limit: 10,
    });

    const exactFromSearch = searchResult.data.find((product) => product.name === productName);
    if (exactFromSearch) {
      return exactFromSearch;
    }
  } catch (error) {
    console.warn(`Stripe product search unavailable for "${productName}", falling back to list.`, error);
  }

  let firstExact: Stripe.Product | null = null;
  let startingAfter: string | undefined;

  for (let pageIndex = 0; pageIndex < 20; pageIndex++) {
    const page = await stripe.products.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const product of page.data) {
      if (product.name !== productName) continue;
      if (product.active) return product;
      if (!firstExact) firstExact = product;
    }

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }

  return firstExact;
}

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

async function getPriceMap(stripe: Stripe): Promise<Record<CheckoutPlan, Record<string, string>>> {
  if (priceCache) return priceCache;

  const priceMap: Record<CheckoutPlan, Record<string, string>> = {
    pro: {},
    lifetime: {},
    ondemand: {},
  };

  for (const [plan, productName] of Object.entries(PRODUCT_NAMES) as Array<[CheckoutPlan, string]>) {
    const product = await findProductByExactName(stripe, productName);
    if (!product) {
      throw new Error(`Product "${productName}" not found in Stripe. Create it first.`);
    }

    // Get all active prices for this product
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    for (const price of prices.data) {
      const currency = price.currency.toLowerCase();
      const unitAmount = typeof price.unit_amount === "number" ? price.unit_amount : null;
      const creditsPriceConfig = isCreditsPlan(plan) ? CREDIT_PLAN_PRICE_CONFIG[plan] : null;

      if (creditsPriceConfig) {
        if (currency === "brl" && unitAmount === creditsPriceConfig.brlAmount && !priceMap[plan].br) {
          priceMap[plan].br = price.id;
        } else if (
          currency === "usd" &&
          typeof creditsPriceConfig.globalAmount === "number" &&
          unitAmount === creditsPriceConfig.globalAmount &&
          !priceMap[plan].global
        ) {
          priceMap[plan].global = price.id;
        }
        continue;
      }

      if (currency === "brl" && !priceMap[plan].br) {
        priceMap[plan].br = price.id;
      } else if (currency === "usd" && !priceMap[plan].global) {
        priceMap[plan].global = price.id;
      }
    }

    if (isCreditsPlan(plan)) {
      const creditPlanConfig = CREDIT_PLAN_PRICE_CONFIG[plan];
      const hasRequiredBrl = Boolean(priceMap[plan].br);
      const hasRequiredGlobal = !creditPlanConfig.requireGlobalPrice || Boolean(priceMap[plan].global);

      if (!hasRequiredBrl || !hasRequiredGlobal) {
        throw new Error(creditPlanConfig.validationMessage);
      }

      // Ensure we always have a fallback value for non-BR locales.
      if (!priceMap[plan].global && priceMap[plan].br) {
        priceMap[plan].global = priceMap[plan].br;
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

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: plan" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["pro", "lifetime", "ondemand"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'pro', 'lifetime', or 'ondemand'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let safeEmail = email;

    if (isCreditsPlan(plan)) {
      let sessionEmail: string;
      try {
        const token = parseBearerToken(req);
        const session = verifySessionToken(token);
        sessionEmail = session.email;
      } catch {
        return new Response(
          JSON.stringify({ error: "Authentication required for on-demand credits" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (safeEmail && safeEmail.toLowerCase().trim() !== sessionEmail.toLowerCase().trim()) {
        return new Response(
          JSON.stringify({ error: "Email does not match authenticated user" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      safeEmail = sessionEmail;
    }

    if (!safeEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
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
    const existingCustomers = await stripe.customers.list({ email: safeEmail, limit: 1 });
    let customerId: string;
    let customer: Stripe.Customer | null = null;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
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
        // Block if customer was previously refunded
        if (customer.metadata.recordsaas_refunded === "true") {
          return new Response(
            JSON.stringify({
              error: "Previous lifetime purchase was refunded. Cannot purchase again.",
              code: "PREVIOUSLY_REFUNDED",
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
      const newCustomer = await stripe.customers.create({ email: safeEmail });
      customerId = newCustomer.id;
      customer = newCustomer;
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isCreditsPlan(plan)) {
      const resolved = await resolveLicenseByEmail(stripe, safeEmail);
      if (resolved.license.active) {
        return new Response(
          JSON.stringify({
            error: "On-demand credits are only available to free users",
            code: "ON_DEMAND_FREE_ONLY",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
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
      success_url:
        isCreditsPlan(plan)
          ? `${appUrl}/account/?credits=success&session_id={CHECKOUT_SESSION_ID}`
          : `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isCreditsPlan(plan) ? `${appUrl}/account/?credits=cancel` : `${appUrl}/cancel`,
      metadata: {
        plan,
        region,
        app: "recordsaas",
        ...(isCreditsPlan(plan) ? { credits_units: String(CREDITS_UNITS_BY_PLAN[plan]) } : {}),
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
