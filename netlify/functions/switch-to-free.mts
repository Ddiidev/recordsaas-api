import type { Config } from "@netlify/functions";
import { parseBearerToken, verifySessionToken } from "./_lib/jwt.mts";
import { getStripe, resolveLicenseByEmail } from "./_lib/license.mts";

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
    const session = verifySessionToken(token);
    const stripe = getStripe();

    const resolved = await resolveLicenseByEmail(stripe, session.email);
    if (!resolved.customer) {
      return jsonResponse({ error: "Customer not found" }, 404);
    }

    const customer = resolved.customer;
    const activeLicense = resolved.license.active;
    const plan = resolved.license.plan;

    if (plan === "lifetime") {
      await stripe.customers.update(customer.id, {
        metadata: {
          ...customer.metadata,
          recordsaas_force_free: "true",
          recordsaas_plan: "free",
          recordsaas_active: "false",
          recordsaas_downgrade_to_free_pending: "false",
        },
      });

      return jsonResponse({
        success: true,
        mode: "immediate",
        effectiveAt: new Date().toISOString(),
      });
    }

    if (activeLicense && (plan === "pro" || plan === "subscription")) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 25,
      });

      const activeSubscription = subscriptions.data.find((sub) =>
        ["active", "trialing", "past_due"].includes(sub.status),
      );

      if (!activeSubscription) {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            recordsaas_plan: "free",
            recordsaas_active: "false",
            recordsaas_downgrade_to_free_pending: "false",
          },
        });

        return jsonResponse({
          success: true,
          mode: "immediate",
          effectiveAt: new Date().toISOString(),
        });
      }

      const updated = await stripe.subscriptions.update(activeSubscription.id, {
        cancel_at_period_end: true,
      });

      await stripe.customers.update(customer.id, {
        metadata: {
          ...customer.metadata,
          recordsaas_downgrade_to_free_pending: "true",
          recordsaas_force_free: "false",
          recordsaas_subscription_id: updated.id,
        },
      });

      return jsonResponse({
        success: true,
        mode: "scheduled",
        effectiveAt: updated.current_period_end
          ? new Date(updated.current_period_end * 1000).toISOString()
          : null,
      });
    }

    await stripe.customers.update(customer.id, {
      metadata: {
        ...customer.metadata,
        recordsaas_plan: "free",
        recordsaas_active: "false",
        recordsaas_downgrade_to_free_pending: "false",
      },
    });

    return jsonResponse({
      success: true,
      mode: "immediate",
      effectiveAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Switch to free error:", error);
    const message = error instanceof Error ? error.message : "Failed to switch to free";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/switch-to-free",
};
