import Stripe from "stripe";
import { FREE_MONTHLY_CREDITS_UNITS, toCredits } from "./export-policy.mts";

const CREDITS_UNITS_KEY = "recordsaas_free_credits_units";
const CREDITS_MONTH_KEY = "recordsaas_free_credits_month";
const CREDIT_CHECKOUT_SESSIONS_KEY = "recordsaas_credit_checkout_session_ids";

export interface CreditsSnapshot {
  visible: boolean;
  balanceUnits: number;
  balanceCredits: number;
  monthlyGrantUnits: number;
  month: string;
}

function normalizeUnits(value: string | null | undefined): number {
  if (!value) return FREE_MONTHLY_CREDITS_UNITS;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return FREE_MONTHLY_CREDITS_UNITS;
  return parsed;
}

function nowMonthUtc(): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function parseSessionIds(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringifySessionIds(sessionIds: string[]): string {
  return sessionIds.slice(-50).join(",");
}

async function updateCustomerMetadata(
  stripe: Stripe,
  customer: Stripe.Customer,
  metadataUpdate: Record<string, string>,
): Promise<void> {
  await stripe.customers.update(customer.id, {
    metadata: {
      ...customer.metadata,
      ...metadataUpdate,
    },
  });
}

async function ensureMonthlyCreditsState(
  stripe: Stripe,
  customer: Stripe.Customer,
): Promise<{ month: string; units: number }> {
  const currentMonth = nowMonthUtc();
  const metadata = customer.metadata || {};
  const storedMonth = metadata[CREDITS_MONTH_KEY] || "";
  const storedUnits = normalizeUnits(metadata[CREDITS_UNITS_KEY]);
  const mustReset = storedMonth !== currentMonth;

  if (!mustReset) {
    return {
      month: currentMonth,
      units: storedUnits,
    };
  }

  await updateCustomerMetadata(stripe, customer, {
    [CREDITS_MONTH_KEY]: currentMonth,
    [CREDITS_UNITS_KEY]: String(FREE_MONTHLY_CREDITS_UNITS),
  });

  customer.metadata[CREDITS_MONTH_KEY] = currentMonth;
  customer.metadata[CREDITS_UNITS_KEY] = String(FREE_MONTHLY_CREDITS_UNITS);

  return {
    month: currentMonth,
    units: FREE_MONTHLY_CREDITS_UNITS,
  };
}

export async function resolveCreditsSnapshot(
  stripe: Stripe,
  customer: Stripe.Customer | null,
  options: { isFree: boolean },
): Promise<CreditsSnapshot | null> {
  if (!customer || !options.isFree) return null;

  const state = await ensureMonthlyCreditsState(stripe, customer);
  return {
    visible: true,
    balanceUnits: state.units,
    balanceCredits: toCredits(state.units),
    monthlyGrantUnits: FREE_MONTHLY_CREDITS_UNITS,
    month: state.month,
  };
}

export async function consumeCreditsUnits(
  stripe: Stripe,
  customer: Stripe.Customer,
  requiredUnits: number,
): Promise<{
  ok: boolean;
  balanceBeforeUnits: number;
  balanceAfterUnits: number;
  month: string;
}> {
  const state = await ensureMonthlyCreditsState(stripe, customer);
  const safeRequiredUnits = Math.max(0, Math.floor(requiredUnits));

  if (safeRequiredUnits <= 0) {
    return {
      ok: true,
      balanceBeforeUnits: state.units,
      balanceAfterUnits: state.units,
      month: state.month,
    };
  }

  if (state.units < safeRequiredUnits) {
    return {
      ok: false,
      balanceBeforeUnits: state.units,
      balanceAfterUnits: state.units,
      month: state.month,
    };
  }

  const balanceAfterUnits = state.units - safeRequiredUnits;

  await updateCustomerMetadata(stripe, customer, {
    [CREDITS_MONTH_KEY]: state.month,
    [CREDITS_UNITS_KEY]: String(balanceAfterUnits),
  });

  customer.metadata[CREDITS_MONTH_KEY] = state.month;
  customer.metadata[CREDITS_UNITS_KEY] = String(balanceAfterUnits);

  return {
    ok: true,
    balanceBeforeUnits: state.units,
    balanceAfterUnits,
    month: state.month,
  };
}

export async function grantCreditsUnits(
  stripe: Stripe,
  customer: Stripe.Customer,
  grantUnits: number,
): Promise<{ balanceAfterUnits: number; month: string }> {
  const state = await ensureMonthlyCreditsState(stripe, customer);
  const safeGrantUnits = Math.max(0, Math.floor(grantUnits));
  const balanceAfterUnits = state.units + safeGrantUnits;

  await updateCustomerMetadata(stripe, customer, {
    [CREDITS_MONTH_KEY]: state.month,
    [CREDITS_UNITS_KEY]: String(balanceAfterUnits),
  });

  customer.metadata[CREDITS_MONTH_KEY] = state.month;
  customer.metadata[CREDITS_UNITS_KEY] = String(balanceAfterUnits);

  return {
    balanceAfterUnits,
    month: state.month,
  };
}

export function hasProcessedCreditCheckoutSession(
  customer: Stripe.Customer,
  checkoutSessionId: string,
): boolean {
  if (!checkoutSessionId) return false;
  const existing = parseSessionIds(customer.metadata?.[CREDIT_CHECKOUT_SESSIONS_KEY]);
  return existing.includes(checkoutSessionId);
}

export async function markProcessedCreditCheckoutSession(
  stripe: Stripe,
  customer: Stripe.Customer,
  checkoutSessionId: string,
): Promise<void> {
  if (!checkoutSessionId) return;
  const existing = parseSessionIds(customer.metadata?.[CREDIT_CHECKOUT_SESSIONS_KEY]);
  if (existing.includes(checkoutSessionId)) return;

  existing.push(checkoutSessionId);
  const serialized = stringifySessionIds(existing);

  await updateCustomerMetadata(stripe, customer, {
    [CREDIT_CHECKOUT_SESSIONS_KEY]: serialized,
  });

  customer.metadata[CREDIT_CHECKOUT_SESSIONS_KEY] = serialized;
}
