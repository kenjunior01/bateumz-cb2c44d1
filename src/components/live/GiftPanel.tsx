import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Heart, Star, Crown, Sparkles, Flame, Diamond, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Gift {
  id: string;
  emoji: string;
  name: string;
  price: number;
  animation: string;
}

const GIFTS: Gift[] = [
  { id: "rose", emoji: "🌹", name: "Rosa", price: 1, animation: "float-up" },
  { id: "heart", emoji: "❤️", name: "Coração", price: 2, animation: "pulse-big" },
  { id: "star", emoji: "⭐", name: "Estrela", price: 5, animation: "spin-in" },
  { id: "flame", emoji: "🔥", name: "Fogo", price: 10, animation: "fire-burst" },
  { id: "crown", emoji: "👑", name: "Coroa", price: 25, animation: "royal-descend" },
  { id: "diamond", emoji: "💎", name: "Diamante", price: 50, animation: "sparkle-rain" },
  { id: "rocket", emoji: "🚀", name: "Foguete", price: 100, animation: "rocket-launch" },
  { id: "trophy", emoji: "🏆", name: "Troféu", price: 250, animation: "golden-glow" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendGift?: (gift: Gift, quantity: number) => void;
}

const GiftPanel = ({ open, onOpenChange, onSendGift }: Props) => {
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);

  const totalCost = (selectedGift?.price || 0) * quantity;

  const handleSend = async () => {
    if (!selectedGift) return;
    setSending(true);
    try {
      onSendGift?.(selectedGift, quantity);
      toast.success(`Enviou ${quantity}x ${selectedGift.emoji} ${selectedGift.name}!`);
      setSelectedGift(null);
      setQuantity(1);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao enviar presente");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-amber-500" /> Enviar Presente
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-8">
          {/* Gift grid */}
          <div className="grid grid-cols-4 gap-2">
            {GIFTS.map((gift) => (
              <button
                key={gift.id}
                onClick={() => { setSelectedGift(gift); setQuantity(1); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95",
                  selectedGift?.id === gift.id
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-transparent hover:bg-muted/50"
                )}
              >
                <span className="text-3xl">{gift.emoji}</span>
                <span className="text-[10px] font-medium">{gift.name}</span>
                <span className="text-[9px] text-amber-500 font-bold">${gift.price}</span>
              </button>
            ))}
          </div>

          {/* Quantity selector */}
          {selectedGift && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedGift.emoji}</span>
                    <span className="font-bold">{selectedGift.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg font-bold"
                    >
                      -
                    </button>
                    <span className="text-xl font-black w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity((p) => Math.min(99, p + 1))}
                      className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick quantities */}
                <div className="flex gap-2">
                  {[1, 5, 10, 50].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                        quantity === q ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      x{q}
                    </button>
                  ))}
                </div>

                {/* Total + Send */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-2xl font-black text-amber-500">${totalCost.toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-8 gap-2 h-12"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {!selectedGift && (
            <p className="text-center text-xs text-muted-foreground py-4">
              Selecione um presente para enviar
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GiftPanel;
export { GIFTS, type Gift };