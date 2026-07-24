import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  ShoppingBag,
  RotateCcw,
  Trophy,
  Filter,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getTransactions, getWallet, type WalletTransaction } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";

// ── Helpers ─────────────────────────────────────────────────────────

const TX_TYPE_CONFIG: Record<
  WalletTransaction["type"],
  { icon: typeof ArrowDownCircle; label: string; color: string; bgColor: string }
> = {
  deposit: {
    icon: ArrowDownCircle,
    label: "Depósito",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/15",
  },
  withdrawal: {
    icon: ArrowUpCircle,
    label: "Saque",
    color: "text-red-600",
    bgColor: "bg-red-500/15",
  },
  purchase: {
    icon: ShoppingBag,
    label: "Compra",
    color: "text-blue-600",
    bgColor: "bg-blue-500/15",
  },
  refund: {
    icon: RotateCcw,
    label: "Reembolso",
    color: "text-amber-600",
    bgColor: "bg-amber-500/15",
  },
  winning: {
    icon: Trophy,
    label: "Ganho",
    color: "text-purple-600",
    bgColor: "bg-purple-500/15",
  },
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

function formatTxDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `Há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Há ${diffH}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Component ───────────────────────────────────────────────────────

export default function WalletDashboard() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("MZN");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: walletData } = await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", user.id)
        .single();

      if (walletData) {
        setBalance(walletData.balance);
        setCurrency(walletData.currency);
      }

      const txs = await getTransactions(user.id, 30);
      setTransactions(txs);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filtered =
    filterType === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === filterType);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* ── Balance Card ── */}
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary via-primary/90 to-accent">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />

        <CardHeader className="pb-2 relative">
          <CardTitle className="text-sm font-medium text-primary-foreground/70">
            💰 Saldo Disponível
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {loading ? (
            <Skeleton className="h-12 w-48 rounded-lg" />
          ) : (
            <motion.p
              key={balance}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-4xl sm:text-5xl font-extrabold text-primary-foreground tabular-nums tracking-tight"
            >
              {format(balance)}
            </motion.p>
          )}
          <p className="mt-1 text-xs text-primary-foreground/50">{currency}</p>

          <Button
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full shadow-md"
            onClick={fetchData}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* ── Quick Deposit ── */}
      <div>
        <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">
          Depósito Rápido
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="text-lg font-bold">{format(amount)}</span>
              <span className="text-[10px] text-muted-foreground font-medium">Depositar</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Transactions ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Transações Recentes</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Filter tabs */}
          <Tabs value={filterType} onValueChange={setFilterType} className="mb-4">
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="all" className="text-xs h-7 px-2.5">
                Todos
              </TabsTrigger>
              <TabsTrigger value="deposit" className="text-xs h-7 px-2.5">
                Depósitos
              </TabsTrigger>
              <TabsTrigger value="purchase" className="text-xs h-7 px-2.5">
                Compras
              </TabsTrigger>
              <TabsTrigger value="winning" className="text-xs h-7 px-2.5">
                Ganhos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Transaction list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma transação encontrada
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Faça seu primeiro depósito para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((tx, idx) => {
                  const cfg = TX_TYPE_CONFIG[tx.type as WalletTransaction["type"]] ?? TX_TYPE_CONFIG.purchase;
                  const Icon = cfg.icon;
                  const isPositive = tx.type === "deposit" || tx.type === "refund" || tx.type === "winning";

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary/40 transition-colors"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bgColor}`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {tx.description || cfg.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatTxDate(tx.created_at)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {isPositive ? "+" : "-"}{format(tx.amount)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] mt-0.5 ${cfg.color} border-current/20`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
