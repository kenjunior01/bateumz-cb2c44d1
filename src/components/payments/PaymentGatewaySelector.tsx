import { useState } from "react";
import { CreditCard, DollarSign } from "lucide-react";
import PayPalProvider from "@/components/payments/PayPalProvider";
import PayPalCheckout from "@/components/payments/PayPalCheckout";
import StripeCheckout from "@/components/payments/StripeCheckout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export type PaymentGateway = "paypal" | "stripe";

interface Props {
  raffleId: string;
  quantity: number;
  ticketNumbers: number[];
  amount: number;
  currency: string;
  description?: string;
  onSuccess: (paymentId: string) => void;
  onError?: (err: unknown) => void;
  disabled?: boolean;
}

/**
 * Renders a side-by-side selector for choosing between PayPal and Stripe (card).
 * The selected gateway component is rendered inline below the selector cards.
 */
export default function PaymentGatewaySelector({
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
  const { t } = useLanguage();
  const [gateway, setGateway] = useState<PaymentGateway>("paypal");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setGateway("paypal")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer",
            gateway === "paypal"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-secondary/30 hover:bg-secondary/50",
          )}
        >
          <DollarSign className={cn("h-5 w-5", gateway === "paypal" ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-xs font-medium", gateway === "paypal" ? "text-foreground" : "text-muted-foreground")}>
            {t("pay.method.paypal")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setGateway("stripe")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer",
            gateway === "stripe"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-border bg-secondary/30 hover:bg-secondary/50",
          )}
        >
          <CreditCard className={cn("h-5 w-5", gateway === "stripe" ? "text-primary" : "text-muted-foreground")} />
          <span className={cn("text-xs font-medium", gateway === "stripe" ? "text-foreground" : "text-muted-foreground")}>
            {t("pay.method.card")} (Stripe)
          </span>
        </button>
      </div>

      {gateway === "paypal" && (
        <PayPalProvider currency={(currency as "USD" | "CAD" | "INR")}>
          <PayPalCheckout
            raffleId={raffleId}
            quantity={quantity}
            ticketNumbers={ticketNumbers}
            onSuccess={onSuccess}
            onError={onError}
            disabled={disabled}
          />
        </PayPalProvider>
      )}

      {gateway === "stripe" && (
        <StripeCheckout
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
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        {gateway === "paypal"
          ? t("pay.method.paypal.desc")
          : t("pay.method.card.desc")}
      </p>
    </div>
  );
}
