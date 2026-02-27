import type { Config } from "@netlify/functions";
import {
  parseBearerToken,
  signDesktopCodeToken,
  verifySessionToken,
} from "./_lib/jwt.mts";

interface DesktopSessionBody {
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
    const token = parseBearerToken(req);
    const session = await verifySessionToken(token);

    let body: DesktopSessionBody = {};
    try {
      body = (await req.json()) as DesktopSessionBody;
    } catch {
      body = {};
    }

    const nonce = typeof body.nonce === "string" && body.nonce.trim().length > 0
      ? body.nonce
      : undefined;

    const desktopCode = await signDesktopCodeToken({
      sub: session.sub,
      email: session.email,
      name: session.name,
      picture: session.picture,
      nonce,
    });

    return jsonResponse({ desktopCode });
  } catch (error) {
    console.error("Desktop session bridge error:", error);
    const message = error instanceof Error ? error.message : "Desktop session bridge failed";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/auth/desktop/session",
};

