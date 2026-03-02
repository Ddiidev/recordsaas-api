import type { Config } from "@netlify/functions";
import { consumeCreditsUnits, resolveCreditsSnapshot } from "./_lib/credits.mts";
import {
  getCreditCostForSelection,
  isFreeByLicense,
  normalizeExportSelection,
  toCredits,
} from "./_lib/export-policy.mts";
import {
  parseBearerToken,
  signExportGrantToken,
  verifySessionToken,
} from "./_lib/jwt.mts";
import { getStripe, resolveLicenseByEmail } from "./_lib/license.mts";

const BUY_CREDITS_URL = "https://recordsaas.app/account/";

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
    const rawBody = (await req.json()) as Record<string, unknown>;
    const selection = normalizeExportSelection({
      format: rawBody.format as "mp4" | "gif" | undefined,
      resolution: rawBody.resolution as "480p" | "576p" | "720p" | "1080p" | "2k" | undefined,
      fps: rawBody.fps as 30 | 60 | undefined,
    });

    const stripe = getStripe();
    const resolved = await resolveLicenseByEmail(stripe, session.email);

    if (!resolved.customer) {
      return jsonResponse({ error: "Customer not found" }, 404);
    }

    const isFree = isFreeByLicense(resolved.license);
    const cost = getCreditCostForSelection(selection, isFree);

    let balanceAfterUnits = 0;

    if (isFree) {
      if (cost.creditCostUnits > 0) {
        const creditConsume = await consumeCreditsUnits(stripe, resolved.customer, cost.creditCostUnits);
        if (!creditConsume.ok) {
          return jsonResponse(
            {
              code: "INSUFFICIENT_CREDITS",
              requiredUnits: cost.creditCostUnits,
              requiredCredits: toCredits(cost.creditCostUnits),
              availableUnits: creditConsume.balanceBeforeUnits,
              availableCredits: toCredits(creditConsume.balanceBeforeUnits),
              buyCreditsUrl: BUY_CREDITS_URL,
            },
            402,
          );
        }

        balanceAfterUnits = creditConsume.balanceAfterUnits;
      } else {
        const snapshot = await resolveCreditsSnapshot(stripe, resolved.customer, { isFree: true });
        balanceAfterUnits = snapshot?.balanceUnits || 0;
      }
    }

    const approved = {
      format: selection.format,
      resolution: selection.resolution,
      fps: selection.fps,
      creditCostUnits: cost.creditCostUnits,
      creditCostCredits: cost.creditCostCredits,
      balanceAfterUnits,
      balanceAfterCredits: toCredits(balanceAfterUnits),
    };

    const exportToken = signExportGrantToken({
      sub: session.sub,
      email: session.email,
      plan: resolved.license.plan,
      active: resolved.license.active,
      approved,
    });

    return jsonResponse({ exportToken, approved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export authorization failed";
    return jsonResponse({ error: message }, 401);
  }
};

export const config: Config = {
  path: "/api/export/authorize",
};
