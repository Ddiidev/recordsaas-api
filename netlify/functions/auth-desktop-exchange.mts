import type { Config } from "@netlify/functions";
import {
  getLicensePayload,
  getStripe,
  getUserPayload,
  resolveLicenseByCustomer,
} from "./_lib/license.mts";
import {
  signEntitlementToken,
  signSessionToken,
  verifyDesktopCodeToken,
} from "./_lib/jwt.mts";

interface ExchangeBody {
  desktopCode: string;
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
    const body = (await req.json()) as ExchangeBody;

    if (!body.desktopCode) {
      return jsonResponse({ error: "Missing desktopCode" }, 400);
    }

    const desktopCode = await verifyDesktopCodeToken(body.desktopCode);

    if (desktopCode.nonce && body.nonce !== desktopCode.nonce) {
      return jsonResponse({ error: "Invalid desktop login nonce" }, 401);
    }

    const stripe = getStripe();

    const existingCustomers = await stripe.customers.list({
      email: desktopCode.email,
      limit: 1,
    });

    let customer = existingCustomers.data[0] || null;

    if (!customer) {
      customer = await stripe.customers.create({
        email: desktopCode.email,
        name: desktopCode.name,
        metadata: {
          google_id: desktopCode.sub,
          recordsaas_google_picture: desktopCode.picture || "",
          recordsaas_active: "false",
        },
      });
    }

    const license = await resolveLicenseByCustomer(stripe, customer);

    const user = getUserPayload({
      email: desktopCode.email,
      name: desktopCode.name || customer.name || null,
      picture: desktopCode.picture || customer.metadata.recordsaas_google_picture || null,
    });

    const sessionToken = await signSessionToken({
      sub: desktopCode.sub,
      email: desktopCode.email,
      name: user.name || undefined,
      picture: user.picture || undefined,
    });

    const entitlementToken = await signEntitlementToken({
      sub: desktopCode.sub,
      email: desktopCode.email,
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
    console.error("Desktop exchange error:", error);
    const message = error instanceof Error ? error.message : "Desktop exchange failed";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/auth/desktop/exchange",
};


