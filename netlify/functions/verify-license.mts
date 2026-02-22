import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface LicenseResponse {
  active: boolean;
  plan: string | null;
  region: string | null;
  activatedAt: string | null;
  subscriptionStatus: string | null;
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new Response(
      JSON.stringify({ error: "Missing required parameter: email" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const stripe = getStripe();

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      const response: LicenseResponse = {
        active: false,
        plan: null,
        region: null,
        activatedAt: null,
        subscriptionStatus: null,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const customer = customers.data[0];
    const metadata = customer.metadata;

    // For subscription plans, also check the actual subscription status
    let subscriptionStatus: string | null = null;
    if (metadata.recordsaas_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          metadata.recordsaas_subscription_id
        );
        subscriptionStatus = subscription.status;

        // Update active status based on actual subscription state
        if (!["active", "trialing"].includes(subscription.status)) {
          metadata.recordsaas_active = "false";
        }
      } catch {
        // Subscription may have been deleted
        subscriptionStatus = "canceled";
      }
    }

    const response: LicenseResponse = {
      active: metadata.recordsaas_active === "true",
      plan: metadata.recordsaas_plan || null,
      region: metadata.recordsaas_region || null,
      activatedAt: metadata.recordsaas_activated_at || null,
      subscriptionStatus,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error verifying license:", error);
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
  path: "/api/verify-license",
};
