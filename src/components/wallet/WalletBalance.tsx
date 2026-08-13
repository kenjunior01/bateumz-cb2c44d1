import { useState, useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Wallet, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getBalance, type Wallet as WalletType } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

interface WalletBalanceProps {
  compact?: boolean;
}

/** Animated counter that smoothly interpolates from start → end. */
function AnimatedCounter({ value, compact }: { value: number; compact?: boolean }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => v.toFixed(compact ? 0 : 2));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className="tabular-nums">
      {display}
    </motion.span>
  );
}

export default function WalletBalance({ compact = false }: WalletBalanceProps) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("MZN");
  const [loading, setLoading] = useState(true);
  const prevBalance = useRef(balance);

  const fetchWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setBalance(data.balance);
        setCurrency(data.currency);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  if (!user) return null;

  // Detect balance change direction for animation
  const direction = balance > prevBalance.current ? "up" : balance < prevBalance.current ? "down" : null;
  useEffect(() => {
    prevBalance.current = balance;
  }, [balance]);

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2.5 rounded-full bg-secondary/60 hover:bg-secondary"
        onClick={fetchWallet}
      >
        <Wallet className="h-3.5 w-3.5 text-primary coin-spin" />
        {loading ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <span className="text-xs font-bold tabular-nums">
            {format(balance)}
          </span>
        )}
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Saldo Disponível
      </p>
      <div className="relative flex items-baseline gap-1">
        <span className="text-lg text-muted-foreground font-medium">{currency}</span>
        <motion.span
          key={balance}
          initial={direction === "up" ? { y: -8, opacity: 0 } : direction === "down" ? { y: 8, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent"
        >
          <AnimatedCounter value={balance} />
        </motion.span>
      </div>

      {direction && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`text-xs font-semibold ${direction === "up" ? "text-emerald-500" : "text-red-500"}`}
        >
          {direction === "up" ? "↑" : "↓"} {Math.abs(balance - prevBalance.current).toFixed(2)} {currency}
        </motion.span>
      )}

      <Button
        variant="default"
        size="lg"
        className="mt-2 rounded-full px-8 font-bold shadow-lg shadow-primary/25"
      >
        <Plus className="h-4 w-4 mr-2" />
        Depositar
      </Button>
    </motion.div>
  );
}
