import { useState } from "react";
import { CreditCard, DollarSign } from "lucide-react";
import PayPalProvider from "@/components/payments/PayPalProvider";
import PayPalCheckout from "@/components/payments/PayPalCheckout";
import StripeCheckout from "@/components/payments/StripeCheckout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [gateway, setGateway] = useState<PaymentGateway>("paypal");

  return (
    <div className="space-y-4">
      {/* Gateway selector cards */}
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
            Pagar com PayPal
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
            Pagar com Cartão (Stripe)
          </span>
        </button>
      </div>

      {/* Render selected gateway */}
      {gateway === "paypal" && (
        <PayPalProvider currency={(currency as "USD" | "CAD")}>
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
          ? "Pague com saldo PayPal, cartão de crédito/débito ou transferência bancária — sem conta PayPal necessária."
          : "Pague com Visa, Mastercard, ou outro cartão aceito. Autenticação 3D Secure quando necessário."}
      </p>
    </div>
  );
}
