import type { Config } from "@netlify/functions";
import {
  getLicensePayload,
  getStripe,
  getUserPayload,
  resolveLicenseByCustomer,
} from "./_lib/license.mts";
import {
  signDesktopCodeToken,
  signEntitlementToken,
  signSessionToken,
} from "./_lib/jwt.mts";

interface GoogleTokenPayload {
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  sub: string;
}

interface AuthRequestBody {
  idToken: string;
  flow?: "web" | "desktop";
  nonce?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const clientId = Netlify.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID not set");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    throw new Error("Invalid Google token");
  }

  const payload = (await response.json()) as Record<string, string>;

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
    const body = (await req.json()) as AuthRequestBody;
    const idToken = body.idToken;
    const flow = body.flow === "desktop" ? "desktop" : "web";

    if (!idToken) {
      return jsonResponse({ error: "Missing idToken" }, 400);
    }

    if (flow === "desktop" && !body.nonce) {
      return jsonResponse({ error: "Missing nonce for desktop flow" }, 400);
    }

    const googleUser = await verifyGoogleToken(idToken);

    if (!googleUser.email_verified) {
      return jsonResponse({ error: "Email not verified by Google" }, 400);
    }

    const stripe = getStripe();
    const existingCustomers = await stripe.customers.list({
      email: googleUser.email,
      limit: 1,
    });

    let customer = existingCustomers.data[0] || null;

    if (!customer) {
      customer = await stripe.customers.create({
        email: googleUser.email,
        name: googleUser.name,
        metadata: {
          google_id: googleUser.sub,
          recordsaas_google_picture: googleUser.picture,
          recordsaas_active: "false",
        },
      });
    } else {
      await stripe.customers.update(customer.id, {
        name: googleUser.name,
        metadata: {
          ...customer.metadata,
          google_id: googleUser.sub,
          recordsaas_google_picture: googleUser.picture,
        },
      });

      const refreshed = await stripe.customers.retrieve(customer.id);
      if (!("deleted" in refreshed) || !refreshed.deleted) {
        customer = refreshed;
      }
    }

    const license = await resolveLicenseByCustomer(stripe, customer);

    const user = getUserPayload({
      email: googleUser.email,
      name: googleUser.name || customer.name || null,
      picture: googleUser.picture || customer.metadata.recordsaas_google_picture || null,
    });

    if (flow === "desktop") {
      const desktopCode = await signDesktopCodeToken({
        sub: googleUser.sub,
        email: googleUser.email,
        name: user.name || undefined,
        picture: user.picture || undefined,
        nonce: body.nonce,
      });

      return jsonResponse({ desktopCode });
    }

    const sessionToken = await signSessionToken({
      sub: googleUser.sub,
      email: googleUser.email,
      name: user.name || undefined,
      picture: user.picture || undefined,
    });

    const entitlementToken = await signEntitlementToken({
      sub: googleUser.sub,
      email: googleUser.email,
      plan: license.plan,
      active: license.active,
      licenseValidUntil: license.licenseValidUntil,
      subscriptionStatus: license.subscriptionStatus,
      paidAmount: license.paidAmount,
      paidCurrency: license.paidCurrency,
      watermarkRequired: license.watermarkRequired,
    });

    return jsonResponse({
      user,
      license: getLicensePayload(license),
      sessionToken,
      entitlementToken,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/auth/google",
};


