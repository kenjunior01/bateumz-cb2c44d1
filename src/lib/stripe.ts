import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

/** Lazy-loaded Stripe.js instance — reused across the app */
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY as string,
);

/**
 * Create a Stripe Checkout Session via Supabase Edge Function.
 * Redirects the user to Stripe-hosted checkout.
 */
export async function createCheckoutSession(params: {
  raffleId: string;
  raffleSlug?: string;
  amount: number;
  currency: string;
  quantity: number;
  description?: string;
}): Promise<{ sessionId: string; url: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-create-session", {
    body: {
      raffle_id: params.raffleId,
      raffle_slug: params.raffleSlug,
      amount: params.amount,
      currency: params.currency,
      quantity: params.quantity,
      description: params.description,
    },
  });

  if (error) throw new Error(error.message || "Failed to create checkout session");
  if (!data?.sessionId) throw new Error("No session returned from server");

  return { sessionId: data.sessionId, url: data.url };
}

/**
 * Create a Stripe PaymentIntent via Supabase Edge Function.
 * Returns the client_secret needed to confirm payment on the client.
 */
export async function createPaymentIntent(params: {
  raffleId: string;
  amount: number;
  currency: string;
  quantity: number;
  description?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const { data, error } = await supabase.functions.invoke("stripe-create-payment-intent", {
    body: {
      raffle_id: params.raffleId,
      amount: params.amount,
      currency: params.currency,
      quantity: params.quantity,
      description: params.description,
    },
  });

  if (error) throw new Error(error.message || "Failed to create payment intent");
  if (!data?.clientSecret) throw new Error("No client secret returned from server");

  return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
}

/**
 * Record a Stripe payment in the `stripe_payments` table after confirmation.
 */
export async function recordStripePayment(params: {
  raffleId: string;
  userId: string;
  amount: number;
  currency: string;
  stripeSessionId: string;
  status: string;
}): Promise<void> {
  const { error } = await supabase.from("stripe_payments").insert({
    raffle_id: params.raffleId,
    user_id: params.userId,
    amount: params.amount,
    currency: params.currency,
    stripe_session_id: params.stripeSessionId,
    status: params.status,
  });

  if (error) throw new Error(error.message || "Failed to record payment");
}

/** Type helper so consumers can import a typed Stripe reference if needed */
export type StripeInstance = Stripe | null;
