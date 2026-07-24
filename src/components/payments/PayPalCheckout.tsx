import { PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  raffleId: string;
  quantity: number;
  ticketNumbers: number[];
  onSuccess: (captureId: string) => void;
  onError?: (err: unknown) => void;
  disabled?: boolean;
}

/**
 * PayPal Smart Buttons for raffle ticket checkout.
 * Order creation and capture happen server-side so pricing can't be tampered with.
 */
export default function PayPalCheckout({ raffleId, quantity, ticketNumbers, onSuccess, onError, disabled }: Props) {
  return (
    <PayPalButtons
      disabled={disabled}
      style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
      createOrder={async () => {
        const { data, error } = await supabase.functions.invoke("paypal-create-order", {
          body: { raffle_id: raffleId, quantity },
        });
        if (error || !data?.id) {
          toast({ title: "Could not start PayPal checkout", description: error?.message || "Please try again.", variant: "destructive" });
          throw new Error(error?.message || "PayPal order failed");
        }
        return data.id as string;
      }}
      onApprove={async (data) => {
        const { data: cap, error } = await supabase.functions.invoke("paypal-capture-order", {
          body: { order_id: data.orderID, raffle_id: raffleId, ticket_numbers: ticketNumbers },
        });
        if (error || !cap?.ok) {
          toast({ title: "Payment could not be captured", description: error?.message || "Please contact support.", variant: "destructive" });
          onError?.(error);
          return;
        }
        onSuccess(cap.capture_id);
      }}
      onError={(err) => {
        toast({ title: "PayPal error", description: String(err), variant: "destructive" });
        onError?.(err);
      }}
    />
  );
}
