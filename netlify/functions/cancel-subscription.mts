import type { Config } from "@netlify/functions";
import { getStripe } from "./_lib/license.mts";
import { parseBearerToken, verifySessionToken } from "./_lib/jwt.mts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default async (req: Request) => {
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
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const token = parseBearerToken(req);
    const session = await verifySessionToken(token);
    const stripe = getStripe();

    const customers = await stripe.customers.list({
      email: session.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return jsonResponse({ error: "Customer not found" }, 404);
    }

    const customer = customers.data[0];
    let subscriptionId = customer.metadata.recordsaas_subscription_id || null;

    if (!subscriptionId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
      });

      const activeSubscription = subscriptions.data.find((sub) =>
        ["active", "trialing", "past_due"].includes(sub.status),
      );

      subscriptionId = activeSubscription?.id || null;
    }

    if (!subscriptionId) {
      return jsonResponse({ error: "No active subscription found" }, 400);
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return jsonResponse({
      success: true,
      message: "Subscription will be cancelled at period end",
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
};

export const config: Config = {
  path: "/api/cancel-subscription",
};


