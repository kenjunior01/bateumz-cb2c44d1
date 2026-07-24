import { useState, useEffect } from "react";
import {
  useStripe,
  useElements,
  CardElement,
  Elements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentIntent, recordStripePayment, stripePromise } from "@/lib/stripe";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Inner form (needs Stripe context from <Elements>)                 */
/* ------------------------------------------------------------------ */

interface CheckoutFormProps {
  clientSecret: string;
  raffleId: string;
  quantity: number;
  ticketNumbers: number[];
  amount: number;
  currency: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (err: unknown) => void;
  disabled?: boolean;
}

function CheckoutForm({
  clientSecret,
  raffleId,
  quantity,
  ticketNumbers,
  amount,
  currency,
  description,
  onSuccess,
  onError,
  disabled,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user || disabled) return;

    setProcessing(true);
    setCardError(null);

    try {
      // Confirm payment with Stripe Elements (handles 3D Secure)
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        },
      );

      if (confirmError) {
        const msg = confirmError.message || t("stripe.payment_failed");
        setCardError(msg);
        toast({
          title: t("stripe.payment_failed"),
          description: msg,
          variant: "destructive",
        });
        onError?.(confirmError);
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "requires_capture") {
        // Record payment in stripe_payments table
        await recordStripePayment({
          raffleId,
          userId: user.id,
          amount,
          currency,
          stripeSessionId: paymentIntent.id,
          status: paymentIntent.status,
        });

        // Complete the purchase (same flow as PayPal success)
        const { data: cap, error } = await supabase.functions.invoke("complete-ticket-purchase", {
          body: {
            raffle_id: raffleId,
            ticket_numbers: ticketNumbers,
            payment_provider: "stripe",
            payment_id: paymentIntent.id,
          },
        });

        if (error || !cap?.ok) {
          toast({
            title: t("stripe.payment_failed"),
            description: error?.message || "Não foi possível confirmar a compra",
            variant: "destructive",
          });
          onError?.(error);
          setProcessing(false);
          return;
        }

        toast({ title: t("stripe.payment_success") });
        onSuccess(paymentIntent.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("stripe.payment_failed");
      setCardError(msg);
      toast({
        title: t("stripe.payment_failed"),
        description: msg,
        variant: "destructive",
      });
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#ffffff",
        "::placeholder": { color: "#a0a0a0" },
      },
      invalid: {
        color: "#ef4444",
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-secondary/50 bg-secondary/20">
        <CardContent className="p-3">
          <CardElement options={cardElementOptions} />
        </CardContent>
      </Card>

      {cardError && (
        <p className="text-xs text-destructive">{cardError}</p>
      )}

      <Button
        type="submit"
        className="w-full h-12 gap-2"
        disabled={!stripe || processing || disabled}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("stripe.processing")}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            {t("stripe.pay_with_card")}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>{t("stripe.secure_payment")}</span>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component — wraps inner form with <Elements> provider       */
/* ------------------------------------------------------------------ */

interface Props {
  raffleId: string;
  quantity: number;
  ticketNumbers: number[];
  amount: number;
  currency: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (err: unknown) => void;
  disabled?: boolean;
}

/**
 * Stripe card checkout for raffle ticket purchases.
 * Uses Stripe Elements (CardElement) + server-side PaymentIntent creation.
 * Handles 3D Secure authentication automatically.
 */
export default function StripeCheckout({
  raffleId,
  quantity,
  ticketNumbers,
  amount,
  currency,
  description,
  onSuccess,
  onError,
  disabled,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Pre-fetch a PaymentIntent so the <Elements> provider can initialise immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await createPaymentIntent({
          raffleId,
          amount,
          currency,
          quantity,
          description,
        });
        if (!cancelled) setClientSecret(result.clientSecret);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Falha ao inicializar o Stripe";
          setInitError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [raffleId, amount, currency, quantity, description]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando Stripe…</span>
      </div>
    );
  }

  if (initError) {
    return (
      <p className="text-sm text-destructive text-center py-4">{initError}</p>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "hsl(var(--primary))",
            colorBackground: "hsl(var(--card))",
            colorText: "hsl(var(--foreground))",
          },
        },
      }}
    >
      <CheckoutForm
        clientSecret={clientSecret}
        raffleId={raffleId}
        quantity={quantity}
        ticketNumbers={ticketNumbers}
        amount={amount}
        currency={currency}
        description={description}
        onSuccess={onSuccess}
        onError={onError}
        disabled={disabled}
      />
    </Elements>
  );
}
