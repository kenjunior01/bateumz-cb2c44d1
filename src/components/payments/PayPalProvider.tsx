import { useEffect, useState, ReactNode } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  currency?: "USD" | "CAD";
  children: ReactNode;
}

/**
 * Wraps PayPal buttons with the SDK script provider.
 * Fetches the public client ID + environment from the `paypal-config` edge function
 * (kept server-side so it can be rotated without touching the frontend bundle).
 */
export default function PayPalProvider({ currency = "USD", children }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.functions.invoke("paypal-config", { body: {} });
      if (!cancel && data?.clientId) setClientId(data.clientId);
    })();
    return () => { cancel = true; };
  }, []);

  if (!clientId) return <>{children}</>;

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency,
        intent: "capture",
        components: "buttons",
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
