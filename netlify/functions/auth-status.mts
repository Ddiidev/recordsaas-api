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
  iat: number;
  exp: number;
}

function parseSessionToken(token: string): SessionPayload | null {
  try {
    const payload = JSON.parse(atob(token)) as SessionPayload;

    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const session = parseSessionToken(token);

  if (!session) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const stripe = getStripe();

    const customers = await stripe.customers.list({
      email: session.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({
          user: { email: session.email },
          license: {
            active: false,
            plan: null,
            region: null,
            activatedAt: null,
            subscriptionStatus: null,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const customer = customers.data[0];
    const metadata = customer.metadata;

    let subscriptionStatus: string | null = null;
    let isActive = metadata.recordsaas_active === "true";
    let plan = metadata.recordsaas_plan || null;
    let region = metadata.recordsaas_region || null;
    let activatedAt = metadata.recordsaas_activated_at || null;

    // Check subscription if exists
    if (metadata.recordsaas_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          metadata.recordsaas_subscription_id
        );
        subscriptionStatus = subscription.status;

        if (!["active", "trialing"].includes(subscription.status)) {
          isActive = false;
        }
      } catch {
        subscriptionStatus = "canceled";
      }
    }

    // Fallback: if metadata says inactive, double-check by looking at checkout sessions
    if (!isActive) {
      try {
        // Check for completed checkout sessions for this customer
        const sessions = await stripe.checkout.sessions.list({
          customer: customer.id,
          status: "complete",
          limit: 5,
        });

        for (const s of sessions.data) {
          if (s.payment_status === "paid") {
            const sPlan = s.metadata?.plan || null;
            const sRegion = s.metadata?.region || null;

            if (sPlan === "lifetime") {
              // Lifetime purchase found — activate!
              isActive = true;
              plan = "lifetime";
              region = sRegion || region;
              activatedAt = activatedAt || new Date(s.created * 1000).toISOString();

              // Backfill metadata
              await stripe.customers.update(customer.id, {
                metadata: {
                  recordsaas_active: "true",
                  recordsaas_plan: "lifetime",
                  recordsaas_region: sRegion || "global",
                  recordsaas_activated_at: activatedAt,
                },
              });
              break;
            }
          }
        }

        // Also check for active subscriptions
        if (!isActive) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          });

          if (subs.data.length > 0) {
            isActive = true;
            plan = "pro";
            subscriptionStatus = subs.data[0].status;

            await stripe.customers.update(customer.id, {
              metadata: {
                recordsaas_active: "true",
                recordsaas_plan: "pro",
                recordsaas_region: region || "global",
                recordsaas_activated_at: new Date().toISOString(),
                recordsaas_subscription_id: subs.data[0].id,
              },
            });
          }
        }
      } catch (e) {
        console.error("Fallback license check failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          email: session.email,
          name: customer.name,
        },
        license: {
          active: isActive,
          plan,
          region,
          activatedAt,
          subscriptionStatus,
        },
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
    console.error("Auth status error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check status" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/api/auth/status",
};
