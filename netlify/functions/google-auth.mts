import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface GoogleTokenPayload {
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  sub: string; // Google user ID
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const clientId = Netlify.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not set");

  // Verify the token using Google's tokeninfo endpoint
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new Error("Invalid Google token");
  }

  const payload = (await response.json()) as Record<string, string>;

  // Verify the token was issued for our app
  if (payload.aud !== clientId) {
    throw new Error("Token was not issued for this application");
  }

  return {
    email: payload.email,
    email_verified: payload.email_verified === "true",
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  };
}

function generateSessionToken(email: string, googleId: string): string {
  // Simple session token: base64 encoded payload with timestamp
  // For production, consider using JWT with a secret
  const payload = {
    email,
    googleId,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  return btoa(JSON.stringify(payload));
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
    const body = await req.json();
    const { idToken } = body as { idToken: string };

    if (!idToken) {
      return new Response(
        JSON.stringify({ error: "Missing idToken" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Verify Google token
    const googleUser = await verifyGoogleToken(idToken);

    if (!googleUser.email_verified) {
      return new Response(
        JSON.stringify({ error: "Email not verified by Google" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Find or create Stripe customer
    const stripe = getStripe();
    const existingCustomers = await stripe.customers.list({
      email: googleUser.email,
      limit: 1,
    });

    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: googleUser.email,
        name: googleUser.name,
        metadata: {
          google_id: googleUser.sub,
          recordsaas_active: "false",
        },
      });
    }

    // 3. Get license status from customer metadata
    const metadata = customer.metadata;
    let subscriptionStatus: string | null = null;

    if (metadata.recordsaas_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          metadata.recordsaas_subscription_id
        );
        subscriptionStatus = subscription.status;
      } catch {
        subscriptionStatus = "canceled";
      }
    }

    // 4. Generate session token
    const sessionToken = generateSessionToken(googleUser.email, googleUser.sub);

    return new Response(
      JSON.stringify({
        user: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        },
        license: {
          active: metadata.recordsaas_active === "true",
          plan: metadata.recordsaas_plan || null,
          region: metadata.recordsaas_region || null,
          activatedAt: metadata.recordsaas_activated_at || null,
          subscriptionStatus,
        },
        sessionToken,
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
    console.error("Google auth error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/api/auth/google",
};
