import type { Config } from "@netlify/functions";
import { getStripe } from "./_lib/license.mts";
import { parseBearerToken, verifySessionToken } from "./_lib/jwt.mts";

const LIFETIME_REFUND_WINDOW_DAYS = 10;

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
    const plan = customer.metadata.recordsaas_plan || null;

    // ── Lifetime: issue Stripe refund within the abuse-prevention window ──
    if (plan === "lifetime") {
      // Block if already refunded
      if (customer.metadata.recordsaas_refunded === "true") {
        return jsonResponse(
          { error: "Refund already processed for this account", code: "ALREADY_REFUNDED" },
          409,
        );
      }

      // Enforce 10-day refund window
      const activatedAt = customer.metadata.recordsaas_activated_at
        ? new Date(customer.metadata.recordsaas_activated_at)
        : null;

      if (!activatedAt || isNaN(activatedAt.getTime())) {
        return jsonResponse(
          { error: "Could not determine purchase date. Contact support.", code: "ACTIVATION_DATE_MISSING" },
          400,
        );
      }

      const daysSinceActivation =
        (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceActivation > LIFETIME_REFUND_WINDOW_DAYS) {
        return jsonResponse(
          {
            error: `Refund window has expired. Refunds are only available within ${LIFETIME_REFUND_WINDOW_DAYS} days of purchase.`,
            code: "REFUND_WINDOW_EXPIRED",
            activated_at: activatedAt.toISOString(),
            days_since_activation: Math.floor(daysSinceActivation),
            window_days: LIFETIME_REFUND_WINDOW_DAYS,
          },
          403,
        );
      }

      // Find the completed lifetime checkout session to get the payment_intent
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        status: "complete",
        limit: 20,
      });

      const lifetimeSession = sessions.data.find(
        (s) => s.payment_status === "paid" && s.metadata?.plan === "lifetime",
      );

      if (!lifetimeSession || !lifetimeSession.payment_intent) {
        return jsonResponse(
          { error: "No paid lifetime session found. Contact support.", code: "SESSION_NOT_FOUND" },
          404,
        );
      }

      const paymentIntentId =
        typeof lifetimeSession.payment_intent === "string"
          ? lifetimeSession.payment_intent
          : lifetimeSession.payment_intent.id;

      // Issue full refund
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
      });

      // Deactivate license and mark as refunded to block re-purchase
      await stripe.customers.update(customer.id, {
        metadata: {
          recordsaas_active: "false",
          recordsaas_refunded: "true",
          recordsaas_refunded_at: new Date().toISOString(),
        },
      });

      return jsonResponse({
        success: true,
        message: "Lifetime license refunded and deactivated.",
        refund_id: refund.id,
        refunded_at: new Date().toISOString(),
      });
    }

    // ── Pro (monthly): cancel at period end ──
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
