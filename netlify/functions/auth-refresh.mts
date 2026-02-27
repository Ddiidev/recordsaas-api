import type { Config } from "@netlify/functions";
import {
  getLicensePayload,
  getStripe,
  getUserPayload,
  resolveLicenseByEmail,
} from "./_lib/license.mts";
import {
  parseBearerToken,
  signEntitlementToken,
  signSessionToken,
  verifySessionTokenForRefresh,
} from "./_lib/jwt.mts";

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
    const session = await verifySessionTokenForRefresh(token);

    const stripe = getStripe();
    const resolved = await resolveLicenseByEmail(stripe, session.email);

    const user = getUserPayload({
      email: session.email,
      name: session.name || resolved.user.name,
      picture: session.picture || resolved.user.picture,
    });

    const license = getLicensePayload(resolved.license);

    const sessionToken = await signSessionToken({
      sub: session.sub,
      email: session.email,
      name: user.name || undefined,
      picture: user.picture || undefined,
    });

    const entitlementToken = await signEntitlementToken({
      sub: session.sub,
      email: session.email,
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
      license,
      sessionToken,
      entitlementToken,
    });
  } catch (error) {
    console.error("Auth refresh error:", error);
    const message = error instanceof Error ? error.message : "Refresh failed";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/auth/refresh",
};


