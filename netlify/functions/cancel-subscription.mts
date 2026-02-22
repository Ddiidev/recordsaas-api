import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface SessionPayload {
  email: string;
  googleId: string;
  timestamp: number;
}

function parseSessionToken(token: string): SessionPayload {
  const payload = JSON.parse(atob(token)) as SessionPayload;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - payload.timestamp > thirtyDays) {
    throw new Error("Session expired");
  }
  return payload;
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
    // Parse auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7);
    const session = parseSessionToken(token);
    const stripe = getStripe();

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const customer = customers.data[0];
    const metadata = customer.metadata || {};

    // Get subscription ID from metadata
    const subscriptionId = metadata.recordsaas_subscription_id;

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cancel at period end (user keeps access until billing period ends)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription will be cancelled at the end of the current billing period",
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/cancel-subscription",
};
