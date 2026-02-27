import Stripe from "stripe";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);
const LIFETIME_LICENSE_YEARS = 30;

export interface LicenseSnapshot {
  active: boolean;
  plan: string | null;
  region: string | null;
  activatedAt: string | null;
  subscriptionStatus: string | null;
  licenseValidUntil: string | null;
  paidAmount: number | null;
  paidCurrency: string | null;
  watermarkRequired: boolean;
}

export interface UserSnapshot {
  email: string;
  name: string | null;
  picture: string | null;
}

export interface ResolvedLicenseResult {
  customer: Stripe.Customer | null;
  user: UserSnapshot;
  license: LicenseSnapshot;
}

export function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not set");
  }

  return new Stripe(key);
}

function createInactiveLicense(): LicenseSnapshot {
  return {
    active: false,
    plan: null,
    region: null,
    activatedAt: null,
    subscriptionStatus: null,
    licenseValidUntil: null,
    paidAmount: null,
    paidCurrency: null,
    watermarkRequired: true,
  };
}

function addYears(base: Date, years: number): Date {
  const next = new Date(base);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function isFutureIsoDate(value: string | null): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  return timestamp > Date.now();
}

async function getLatestPaidAmount(
  stripe: Stripe,
  customerId: string,
): Promise<{ amount: number | null; currency: string | null }> {
  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
    for (const invoice of invoices.data) {
      if (invoice.status === "paid" && typeof invoice.amount_paid === "number") {
        return { amount: invoice.amount_paid, currency: invoice.currency || null };
      }
    }
  } catch {
    // no-op
  }

  try {
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "complete",
      limit: 10,
    });

    for (const session of sessions.data) {
      if (session.payment_status === "paid" && typeof session.amount_total === "number") {
        return { amount: session.amount_total, currency: session.currency || null };
      }
    }
  } catch {
    // no-op
  }

  return { amount: null, currency: null };
}

async function getActiveSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 25,
  });

  const activeSubscription = subscriptions.data
    .filter((sub) => ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status))
    .sort((a, b) => (b.current_period_end || 0) - (a.current_period_end || 0))[0];

  return activeSubscription || null;
}

async function getLifetimeSession(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Checkout.Session | null> {
  const sessions = await stripe.checkout.sessions.list({
    customer: customerId,
    status: "complete",
    limit: 25,
  });

  const paidLifetime = sessions.data.find(
    (session) => session.payment_status === "paid" && session.metadata?.plan === "lifetime",
  );

  return paidLifetime || null;
}

function normalizeLifetimeValidity(activatedAt: string | null): string {
  if (!activatedAt || Number.isNaN(Date.parse(activatedAt))) {
    return addYears(new Date(), LIFETIME_LICENSE_YEARS).toISOString();
  }

  return addYears(new Date(activatedAt), LIFETIME_LICENSE_YEARS).toISOString();
}

function buildUserSnapshot(email: string, customer?: Stripe.Customer): UserSnapshot {
  return {
    email,
    name: customer?.name || null,
    picture: customer?.metadata?.recordsaas_google_picture || null,
  };
}

export async function resolveLicenseByEmail(
  stripe: Stripe,
  email: string,
): Promise<ResolvedLicenseResult> {
  const customers = await stripe.customers.list({ email, limit: 1 });

  if (customers.data.length === 0) {
    return {
      customer: null,
      user: { email, name: null, picture: null },
      license: createInactiveLicense(),
    };
  }

  const customer = customers.data[0];
  const license = await resolveLicenseByCustomer(stripe, customer);

  return {
    customer,
    user: buildUserSnapshot(email, customer),
    license,
  };
}

export async function resolveLicenseByCustomer(
  stripe: Stripe,
  customer: Stripe.Customer,
): Promise<LicenseSnapshot> {
  const metadata = customer.metadata || {};

  let isActive = metadata.recordsaas_active === "true";
  let plan = metadata.recordsaas_plan || null;
  let region = metadata.recordsaas_region || null;
  let activatedAt = metadata.recordsaas_activated_at || null;
  let subscriptionStatus: string | null = null;
  let licenseValidUntil: string | null = null;

  let activeSubscription: Stripe.Subscription | null = null;

  if (metadata.recordsaas_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(metadata.recordsaas_subscription_id);
      subscriptionStatus = subscription.status;

      if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        activeSubscription = subscription;
      }
    } catch {
      subscriptionStatus = "canceled";
    }
  }

  if (!activeSubscription) {
    try {
      activeSubscription = await getActiveSubscription(stripe, customer.id);
      if (activeSubscription) {
        subscriptionStatus = activeSubscription.status;
      }
    } catch {
      // no-op
    }
  }

  if (activeSubscription) {
    isActive = true;
    plan = "pro";
    subscriptionStatus = activeSubscription.status;
    licenseValidUntil = toIsoFromUnixSeconds(activeSubscription.current_period_end);
    if (!region) region = "global";
    if (!activatedAt) activatedAt = new Date().toISOString();

    try {
      await stripe.customers.update(customer.id, {
        metadata: {
          ...metadata,
          recordsaas_active: "true",
          recordsaas_plan: "pro",
          recordsaas_region: region || "global",
          recordsaas_activated_at: activatedAt,
          recordsaas_subscription_id: activeSubscription.id,
        },
      });
    } catch {
      // no-op
    }
  }

  if (plan === "lifetime") {
    isActive = true;
    licenseValidUntil = normalizeLifetimeValidity(activatedAt);
  }

  if ((!isActive || plan !== "lifetime") && !activeSubscription) {
    try {
      const lifetimeSession = await getLifetimeSession(stripe, customer.id);
      if (lifetimeSession) {
        isActive = true;
        plan = "lifetime";
        region = lifetimeSession.metadata?.region || region || "global";
        activatedAt = activatedAt || new Date(lifetimeSession.created * 1000).toISOString();
        subscriptionStatus = null;
        licenseValidUntil = normalizeLifetimeValidity(activatedAt);

        await stripe.customers.update(customer.id, {
          metadata: {
            ...metadata,
            recordsaas_active: "true",
            recordsaas_plan: "lifetime",
            recordsaas_region: region,
            recordsaas_activated_at: activatedAt,
          },
        });
      }
    } catch {
      // no-op
    }
  }

  if (plan === "pro" && !activeSubscription) {
    isActive = false;
    if (!subscriptionStatus) {
      subscriptionStatus = "canceled";
    }
  }

  if (!licenseValidUntil && plan === "lifetime") {
    licenseValidUntil = normalizeLifetimeValidity(activatedAt);
  }

  if (!isFutureIsoDate(licenseValidUntil)) {
    isActive = false;
  }

  const payment = await getLatestPaidAmount(stripe, customer.id);

  return {
    active: isActive,
    plan,
    region,
    activatedAt,
    subscriptionStatus,
    licenseValidUntil,
    paidAmount: payment.amount,
    paidCurrency: payment.currency,
    watermarkRequired: !isActive,
  };
}

export function getLicensePayload(license: LicenseSnapshot): LicenseSnapshot {
  return {
    active: license.active,
    plan: license.plan,
    region: license.region,
    activatedAt: license.activatedAt,
    subscriptionStatus: license.subscriptionStatus,
    licenseValidUntil: license.licenseValidUntil,
    paidAmount: license.paidAmount,
    paidCurrency: license.paidCurrency,
    watermarkRequired: license.watermarkRequired,
  };
}

export function getUserPayload(user: UserSnapshot): UserSnapshot {
  return {
    email: user.email,
    name: user.name,
    picture: user.picture,
  };
}


