import type { Context, Config } from "@netlify/functions";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = getStripe();
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const plan = session.metadata?.plan || "unknown";
        const region = session.metadata?.region || "global";

        console.log(`✅ Payment completed: customer=${customerId}, plan=${plan}, region=${region}`);

        // Store license info as customer metadata
        await stripe.customers.update(customerId, {
          metadata: {
            recordsaas_plan: plan,
            recordsaas_region: region,
            recordsaas_activated_at: new Date().toISOString(),
            recordsaas_active: "true",
          },
        });

        // For subscriptions, also store the subscription ID
        if (session.subscription) {
          await stripe.customers.update(customerId, {
            metadata: {
              recordsaas_plan: plan,
              recordsaas_region: region,
              recordsaas_activated_at: new Date().toISOString(),
              recordsaas_active: "true",
              recordsaas_subscription_id: session.subscription as string,
            },
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`❌ Subscription canceled: customer=${customerId}`);

        await stripe.customers.update(customerId, {
          metadata: {
            recordsaas_active: "false",
            recordsaas_canceled_at: new Date().toISOString(),
          },
        });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = ["active", "trialing"].includes(subscription.status);

        console.log(`🔄 Subscription updated: customer=${customerId}, status=${subscription.status}`);

        await stripe.customers.update(customerId, {
          metadata: {
            recordsaas_active: isActive ? "true" : "false",
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        console.log(`⚠️ Payment failed: customer=${customerId}`);

        await stripe.customers.update(customerId as string, {
          metadata: {
            recordsaas_active: "false",
            recordsaas_payment_failed_at: new Date().toISOString(),
          },
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/webhook",
};
