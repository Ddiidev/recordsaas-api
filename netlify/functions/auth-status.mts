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
    if (metadata.recordsaas_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          metadata.recordsaas_subscription_id
        );
        subscriptionStatus = subscription.status;

        if (!["active", "trialing"].includes(subscription.status)) {
          metadata.recordsaas_active = "false";
        }
      } catch {
        subscriptionStatus = "canceled";
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          email: session.email,
          name: customer.name,
        },
        license: {
          active: metadata.recordsaas_active === "true",
          plan: metadata.recordsaas_plan || null,
          region: metadata.recordsaas_region || null,
          activatedAt: metadata.recordsaas_activated_at || null,
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
