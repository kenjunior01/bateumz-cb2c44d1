import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, DollarSign, Heart, Star, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { subscribeTips, fetchLiveTips, type LiveTip } from "@/lib/livePlatform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  scheduledLiveId?: string;
  receiverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIER_OPTIONS = [
  { amount: 1, label: "$1", icon: Heart, color: "from-rose-500 to-pink-500", bg: "bg-rose-500" },
  { amount: 5, label: "$5", icon: Star, color: "from-amber-500 to-yellow-500", bg: "bg-amber-500" },
  { amount: 10, label: "$10", icon: Sparkles, color: "from-violet-500 to-purple-500", bg: "bg-violet-500" },
  { amount: 25, label: "$25", icon: Crown, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-500" },
  { amount: 50, label: "$50", icon: Crown, color: "from-orange-500 to-red-500", bg: "bg-orange-500" },
  { amount: 100, label: "$100", icon: Crown, color: "from-red-600 to-rose-600", bg: "bg-red-600" },
];

const LiveTips = ({ scheduledLiveId, receiverId, open, onOpenChange }: Props) => {
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recentTips, setRecentTips] = useState<LiveTip[]>([]);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (!scheduledLiveId) return;
    fetchLiveTips(scheduledLiveId).then(({ data }) => {
      if (data) setRecentTips(data.slice(0, 5) as LiveTip[]);
    });

    const unsub = subscribeTips(scheduledLiveId, (tip) => {
      setRecentTips((prev) => [tip, ...prev].slice(0, 5));
    });
    return unsub;
  }, [scheduledLiveId]);

  const handleSend = async () => {
    const amount = showAmountInput ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount < 1) { toast.error("Valor mínimo: $1"); return; }

    setSending(true);
    try {
      // Create PayPal order for tip
      const { data, error } = await supabase.functions.invoke("paypal-create-order", {
        body: {
          type: "tip",
          receiver_id: receiverId,
          amount,
          currency: "USD",
          scheduled_live_id: scheduledLiveId,
          message: message || null,
        },
      });

      if (error || !data?.id) {
        toast.error("Erro ao iniciar pagamento");
        return;
      }

      // Open PayPal checkout in a popup
      const paypalWindow = window.open(
        `https://www.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=${data.id}`,
        "paypal-tip",
        "width=500,height=600"
      );

      if (paypalWindow) {
        const checkClosed = setInterval(() => {
          if (paypalWindow.closed) {
            clearInterval(checkClosed);
            setSending(false);
          }
        }, 500);
      }

      toast.success("PayPal aberto! Complete o pagamento.");
      onOpenChange(false);
      setMessage("");
    } catch {
      toast.error("Erro ao processar gorjeta");
    } finally {
      setSending(false);
    }
  };

  const selectedTier = TIER_OPTIONS.find((t) => t.amount === selectedAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            Enviar Super Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Escolha o valor</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIER_OPTIONS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedAmount === tier.amount && !showAmountInput;
                return (
                  <button
                    key={tier.amount}
                    onClick={() => { setSelectedAmount(tier.amount); setShowAmountInput(false); }}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-primary bg-gradient-to-br ${tier.color} text-white shadow-lg scale-105`
                        : "border-border hover:border-primary/40"
                    }`
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-extrabold ${isSelected ? "text-white" : ""}`}>{tier.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAmountInput(true)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  showAmountInput ? "border-primary bg-primary/10 scale-105" : "border-border hover:border-primary/40"
                }`
              >
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-extrabold">Outro</span>
              </button>
            </div>
            {showAmountInput && (
              <div className="mt-2">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  placeholder="Valor personalizado ($1 - $1000)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="text-center text-lg font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Mensagem (opcional)</Label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Boa live! Parabéns!"
              maxLength={200}
            />
          </div>

          {selectedTier && (
            <div className={`rounded-xl p-3 bg-gradient-to-r ${selectedTier.color} text-white`}>
              <p className="text-[10px] uppercase tracking-widest opacity-80 mb-1">Pré-visualização</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold">${showAmountInput ? customAmount || "?" : selectedAmount}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold truncate">Super Chat</p>
                  <p className="text-xs opacity-80 truncate">{message || "Sem mensagem"}</p>
                </div>
              </div>
            </div>
          )}

          {recentTips.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Gorjetas recentes</p>
              <div className="space-y-1">
                {recentTips.slice(0, 3).map((tip) => (
                  <div key={tip.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-muted/50">
                    <span className="font-bold text-amber-500">${tip.amount.toFixed(2)}</span>
                    <span className="truncate flex-1">{tip.message || "Sem mensagem"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || (!showAmountInput ? selectedAmount < 1 : !parseFloat(customAmount))}
            className={`w-full py-3 text-sm font-bold text-white bg-gradient-to-r ${
              selectedTier?.color || "from-amber-500 to-orange-500"
            } hover:opacity-90 rounded-xl border-0`}
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Gift className="h-4 w-4 mr-1.5" />
                Enviar ${showAmountInput ? `$${customAmount || "?"}` : `$${selectedAmount}`} via PayPal
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Pagamento seguro via PayPal. 100% Buyer Protection.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveTips;
