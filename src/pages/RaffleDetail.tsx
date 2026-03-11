import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Ticket, ShoppingCart, Check, Star, ArrowLeft, Share2, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Raffle {
  id: string;
  title: string;
  description: string | null;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  status: string;
}

const RaffleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [raffleRes, participantsRes] = await Promise.all([
        supabase.from("raffles").select("*").eq("id", id).single(),
        supabase.from("participants").select("ticket_number").eq("raffle_id", id),
      ]);
      if (raffleRes.data) setRaffle(raffleRes.data);
      if (participantsRes.data) setSoldNumbers(participantsRes.data.map((p) => p.ticket_number));
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleNumber = (num: number) => {
    if (soldNumbers.includes(num)) return;
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : prev.length < 10 ? [...prev, num] : prev
    );
  };

  const totalPrice = useMemo(() => {
    if (!raffle) return 0;
    return selectedNumbers.length * raffle.ticket_price;
  }, [selectedNumbers, raffle]);

  const handlePurchase = async () => {
    if (!user) { navigate("/login"); return; }
    if (!raffle || selectedNumbers.length === 0) return;
    setPurchasing(true);
    const inserts = selectedNumbers.map((num) => ({
      raffle_id: raffle.id,
      user_id: user.id,
      ticket_number: num,
      status: "active",
      payment_status: "completed",
    }));
    const { error } = await supabase.from("participants").insert(inserts);
    if (error) {
      toast.error("Erro ao comprar bilhetes. Tente novamente.");
      setPurchasing(false);
      return;
    }
    // Award luck points
    await supabase.from("luck_points").insert({
      user_id: user.id,
      points: selectedNumbers.length * 10,
      action: "purchase",
      description: `Comprou ${selectedNumbers.length} bilhete(s) - ${raffle.title}`,
      raffle_id: raffle.id,
    });
    setPurchasing(false);
    setPurchased(true);
    toast.success("Bilhetes comprados com sucesso!");
    setTimeout(() => {
      setCheckoutOpen(false);
      setPurchased(false);
      setSelectedNumbers([]);
      setSoldNumbers((prev) => [...prev, ...selectedNumbers]);
    }, 2500);
  };

  if (loading || !raffle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const soldPercent = (raffle.sold_tickets / raffle.total_tickets) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left - Image & Info */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-2xl aspect-video bg-secondary">
              {raffle.image_url ? (
                <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Ticket className="h-20 w-20 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="glass rounded-full p-2 hover:bg-card/80 transition"><Share2 className="h-4 w-4 text-foreground" /></button>
                <button className="glass rounded-full p-2 hover:bg-card/80 transition"><Heart className="h-4 w-4 text-foreground" /></button>
              </div>
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-primary text-primary-foreground font-bold text-lg px-4 py-1">
                  {raffle.prize_value.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                </Badge>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">{raffle.title}</h1>
              <p className="text-lg text-primary font-semibold mb-4">{raffle.prize_title}</p>
              {raffle.description && <p className="text-muted-foreground leading-relaxed">{raffle.description}</p>}
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="font-display text-xl font-bold text-foreground">{raffle.sold_tickets}</p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <Ticket className="h-5 w-5 text-accent mx-auto mb-1" />
                  <p className="font-display text-xl font-bold text-foreground">{raffle.total_tickets - raffle.sold_tickets}</p>
                  <p className="text-xs text-muted-foreground">Disponíveis</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <Star className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="font-display text-xl font-bold text-foreground">10</p>
                  <p className="text-xs text-muted-foreground">Pts/bilhete</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold text-foreground">{soldPercent.toFixed(0)}%</span>
                </div>
                <Progress value={soldPercent} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">{raffle.sold_tickets} de {raffle.total_tickets} bilhetes vendidos</p>
              </CardContent>
            </Card>

            {/* Countdown */}
            {raffle.end_date && (
              <Card className="glass border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">Tempo Restante</p>
                  </div>
                  <CountdownTimer targetDate={raffle.end_date} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right - Number Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass sticky top-28">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Escolha seus números</h2>
                <p className="text-sm text-muted-foreground mb-4">Selecione até 10 números • {raffle.ticket_price.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}/bilhete</p>

                <div className="grid grid-cols-10 gap-1.5 mb-6 max-h-[320px] overflow-y-auto pr-1">
                  {Array.from({ length: raffle.total_tickets }, (_, i) => i + 1).map((num) => {
                    const isSold = soldNumbers.includes(num);
                    const isSelected = selectedNumbers.includes(num);
                    return (
                      <motion.button
                        key={num}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleNumber(num)}
                        disabled={isSold}
                        className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                          isSold
                            ? "bg-secondary/50 text-muted-foreground/30 cursor-not-allowed"
                            : isSelected
                            ? "bg-primary text-primary-foreground glow-primary"
                            : "bg-secondary text-foreground hover:bg-secondary/80 hover:border-primary/50 border border-transparent"
                        }`}
                      >
                        {num}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected summary */}
                <AnimatePresence>
                  {selectedNumbers.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="border-t border-border pt-4 mb-4">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {selectedNumbers.sort((a, b) => a - b).map((n) => (
                            <Badge key={n} className="bg-primary/20 text-primary border-primary/30 cursor-pointer" onClick={() => toggleNumber(n)}>
                              {n} ✕
                            </Badge>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{selectedNumbers.length} bilhete(s)</span>
                          <span className="font-display text-2xl font-bold text-foreground">
                            {totalPrice.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                          </span>
                        </div>
                      </div>
                      <Button onClick={() => setCheckoutOpen(true)} className="w-full gap-2 h-12 text-base glow-primary">
                        <ShoppingCart className="h-5 w-5" />
                        Comprar Bilhetes
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Legend */}
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary inline-block" /> Disponível</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary inline-block" /> Selecionado</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary/50 inline-block" /> Vendido</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Checkout Overlay */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-8 max-w-md w-full"
            >
              {purchased ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-8">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-4"
                  >
                    <Check className="h-10 w-10 text-primary" />
                  </motion.div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-2">Compra Confirmada!</h3>
                  <p className="text-muted-foreground">+{selectedNumbers.length * 10} Luck Points ganhos 🎉</p>
                </motion.div>
              ) : (
                <>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-1">Confirmar Compra</h3>
                  <p className="text-sm text-muted-foreground mb-6">{raffle.title}</p>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bilhetes</span>
                      <span className="text-foreground font-medium">{selectedNumbers.sort((a, b) => a - b).join(", ")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade</span>
                      <span className="text-foreground">{selectedNumbers.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço unitário</span>
                      <span className="text-foreground">{raffle.ticket_price.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        {totalPrice.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-accent">
                      <Star className="h-3.5 w-3.5" />
                      +{selectedNumbers.length * 10} Luck Points
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
                    <Button className="flex-1 gap-2 glow-primary" onClick={handlePurchase} disabled={purchasing}>
                      {purchasing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <ShoppingCart className="h-4 w-4" />}
                      Confirmar
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default RaffleDetail;
