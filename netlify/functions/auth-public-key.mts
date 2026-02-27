import type { Config } from "@netlify/functions";
import { getAuthIssuer, getPublicKeyPem } from "./_lib/jwt.mts";

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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    return jsonResponse({
      algorithm: "RS256",
      issuer: getAuthIssuer(),
      publicKey: getPublicKeyPem(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load public key";
    return jsonResponse({ error: message }, 500);
  }
};

export const config: Config = {
  path: "/api/auth/public-key",
};


