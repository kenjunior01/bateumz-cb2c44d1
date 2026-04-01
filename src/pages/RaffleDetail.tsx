import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Ticket, ShoppingCart, Check, Star, ArrowLeft, Share2, Heart, Smartphone, CreditCard, Wallet, Upload, Image, Sparkles, X, ChevronRight, PartyPopper } from "lucide-react";
import SocialRaffleEntry from "@/components/SocialRaffleEntry";
import { formatMZN } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import BlockchainVerification from "@/components/BlockchainVerification";
import BolaoModal from "@/components/BolaoModal";
import PaymentInstructions from "@/components/PaymentInstructions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Raffle {
  id: string;
  title: string;
  slug: string | null;
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
  business_user_id: string;
  hide_prize_value?: boolean;
  draw_mode?: string;
  auto_draw_days?: number | null;
  tickets_threshold?: number | null;
  auto_draw_scheduled_at?: string | null;
  raffle_type?: string;
  social_actions?: any[];
}

interface WhiteLabelConfig {
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  mpesa_number: string | null;
  emola_number: string | null;
}

type PaymentMethod = "mpesa" | "emola" | "card";

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Smartphone; desc: string; emoji: string }[] = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone, desc: "Pagamento via M-Pesa", emoji: "📱" },
  { id: "emola", label: "e-Mola", icon: Wallet, desc: "Pagamento via e-Mola", emoji: "💳" },
  { id: "card", label: "Cartão", icon: CreditCard, desc: "Visa / Mastercard", emoji: "💎" },
];

const stepLabels = ["Pagamento", "Comprovativo", "Confirmar"];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 120 : -120, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 120 : -120, opacity: 0, scale: 0.95 }),
};

const RaffleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<WhiteLabelConfig | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [purchasing, setPurchasing] = useState(false);
  const [bolaoOpen, setBolaoOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = isUUID
        ? supabase.from("raffles").select("*").eq("id", slug).single()
        : supabase.from("raffles").select("*").eq("slug", slug).single();

      const [raffleRes] = await Promise.all([query, Promise.resolve()]);

      if (raffleRes.data) {
        setRaffle(raffleRes.data as Raffle);
        const [participantsRes, profileRes, wlRes] = await Promise.all([
          supabase.from("participants").select("ticket_number").eq("raffle_id", raffleRes.data.id),
          supabase.from("profiles").select("display_name, company_name").eq("user_id", raffleRes.data.business_user_id).single(),
          supabase.from("white_label_configs").select("brand_name, logo_url, primary_color, secondary_color, mpesa_number, emola_number").eq("business_user_id", raffleRes.data.business_user_id).eq("is_active", true).maybeSingle(),
        ]);
        if (profileRes.data) setBusinessName(profileRes.data.company_name || profileRes.data.display_name);
        if (wlRes.data) setWhiteLabelConfig(wlRes.data as WhiteLabelConfig);
        if (participantsRes.data) setSoldNumbers(participantsRes.data.map((p) => p.ticket_number));
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

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

  const goToStep = (step: number) => {
    setSlideDirection(step > checkoutStep ? 1 : -1);
    setCheckoutStep(step);
  };

  const handlePurchase = async () => {
    if (!user) { navigate("/login"); return; }
    if (!raffle || selectedNumbers.length === 0) return;
    setPurchasing(true);

    let receiptUrl: string | null = null;
    if (receiptFile) {
      setUploadingReceipt(true);
      const filePath = `${user.id}/${raffle.id}-${Date.now()}.${receiptFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, receiptFile);
      if (uploadError) {
        toast.error("Erro ao enviar comprovativo. Tente novamente.");
        setPurchasing(false);
        setUploadingReceipt(false);
        return;
      }
      receiptUrl = filePath;
      setUploadingReceipt(false);
    }

    const inserts = selectedNumbers.map((num) => ({
      raffle_id: raffle.id,
      user_id: user.id,
      ticket_number: num,
      status: "active" as const,
      payment_status: (paymentMethod === "card" ? "completed" : "pending") as string,
      payment_method: paymentMethod,
      receipt_url: receiptUrl,
    }));
    const { error } = await supabase.from("participants").insert(inserts as any);
    if (error) {
      toast.error("Erro ao comprar bilhetes. Tente novamente.");
      setPurchasing(false);
      return;
    }
    await supabase.from("luck_points").insert({
      user_id: user.id,
      points: selectedNumbers.length * 10,
      action: "purchase",
      description: `Comprou ${selectedNumbers.length} bilhete(s) - ${raffle.title}`,
      raffle_id: raffle.id,
    });

    const newSoldCount = raffle.sold_tickets + selectedNumbers.length;
    await supabase.from("raffles").update({ sold_tickets: newSoldCount }).eq("id", raffle.id);

    if (raffle.draw_mode === "auto_sold_out") {
      try {
        await supabase.functions.invoke("check-ticket-threshold", { body: { raffle_id: raffle.id } });
      } catch (e) { console.error("Threshold check error:", e); }
    }

    if (receiptUrl && (paymentMethod === "mpesa" || paymentMethod === "emola")) {
      try {
        await supabase.functions.invoke("notify-payment-receipt", {
          body: { raffle_id: raffle.id, participant_name: user.email, ticket_numbers: selectedNumbers.join(", "), payment_method: paymentMethod },
        });
      } catch (e) { console.error("Notification error:", e); }
    }

    setPurchasing(false);
    goToStep(4); // success step
    toast.success(paymentMethod === "card"
      ? "Bilhetes comprados com sucesso!"
      : "Bilhetes reservados! Envie o pagamento e aguarde confirmação.");
    setTimeout(() => {
      setCheckoutStep(0);
      setSelectedNumbers([]);
      setReceiptFile(null);
      setSoldNumbers((prev) => [...prev, ...selectedNumbers]);
      setRaffle((prev) => prev ? { ...prev, sold_tickets: newSoldCount } : prev);
    }, 3500);
  };

  if (loading || !raffle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const soldPercent = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const needsReceipt = paymentMethod === "mpesa" || paymentMethod === "emola";

  return (
    <div className="min-h-screen bg-background" style={whiteLabelConfig ? {
      '--wl-primary': whiteLabelConfig.primary_color,
      '--wl-secondary': whiteLabelConfig.secondary_color,
    } as React.CSSProperties : undefined}>
      {whiteLabelConfig && (
        <div className="w-full py-3 px-4"
          style={{ background: `linear-gradient(135deg, ${whiteLabelConfig.primary_color}, ${whiteLabelConfig.secondary_color})`, color: '#fff' }}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {whiteLabelConfig.logo_url ? (
                <img src={whiteLabelConfig.logo_url} alt={whiteLabelConfig.brand_name} className="h-8 w-8 rounded-lg object-cover border border-white/20" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold bg-white/20">
                  {whiteLabelConfig.brand_name.charAt(0)}
                </div>
              )}
              <div>
                <span className="font-display font-bold text-sm">{whiteLabelConfig.brand_name}</span>
                <span className="text-white/70 text-xs ml-2">apresenta</span>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
              ✨ Sorteio Exclusivo
            </Badge>
          </div>
        </div>
      )}
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left column - Raffle info */}
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
              <div className="absolute bottom-4 left-4 flex gap-2 items-center">
                <Badge className="font-bold text-lg px-4 py-1" style={whiteLabelConfig ? { backgroundColor: whiteLabelConfig.primary_color, color: '#fff' } : undefined}>
                  {(raffle as any).hide_prize_value ? "🎁 Valor Surpresa" : formatMZN(raffle.prize_value)}
                </Badge>
                {businessName && (
                  <Badge variant="outline" className="glass text-foreground border-accent/30 bg-accent/10">
                    🏢 {businessName}
                  </Badge>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">{raffle.title}</h1>
              <p className="text-lg text-primary font-semibold mb-4">{raffle.prize_title}</p>
              {raffle.description && <p className="text-muted-foreground leading-relaxed">{raffle.description}</p>}
            </motion.div>

            <div className="flex gap-3">
              <BlockchainVerification raffleId={raffle.id} raffleTitle={raffle.title} />
              <Button variant="outline" size="sm" className="gap-2 border-accent/30 text-accent hover:bg-accent/10" onClick={() => setBolaoOpen(true)}>
                <Users className="h-4 w-4" /> Bolão
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="glass"><CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{raffle.sold_tickets}</p>
                <p className="text-xs text-muted-foreground">Participantes</p>
              </CardContent></Card>
              <Card className="glass"><CardContent className="p-4 text-center">
                <Ticket className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{raffle.total_tickets - raffle.sold_tickets}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </CardContent></Card>
              <Card className="glass"><CardContent className="p-4 text-center">
                <Star className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">10</p>
                <p className="text-xs text-muted-foreground">Pts/bilhete</p>
              </CardContent></Card>
            </div>

            <Card className="glass"><CardContent className="p-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold text-foreground">{soldPercent.toFixed(0)}%</span>
              </div>
              <Progress value={soldPercent} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{raffle.sold_tickets} de {raffle.total_tickets} bilhetes vendidos</p>
            </CardContent></Card>

            {raffle.draw_mode === "auto_sold_out" && raffle.auto_draw_scheduled_at && (
              <Card className="glass border-accent/30"><CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-accent" />
                  <p className="font-semibold text-foreground">⚡ Sorteio Automático Agendado</p>
                </div>
                <CountdownTimer targetDate={new Date(raffle.auto_draw_scheduled_at)} />
                <p className="text-xs text-muted-foreground mt-3">O vencedor será selecionado automaticamente</p>
              </CardContent></Card>
            )}

            {raffle.draw_mode === "auto_sold_out" && !raffle.auto_draw_scheduled_at && (
              <Card className="glass border-primary/20"><CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-foreground">Sorteio Automático</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  O sorteio será realizado <strong className="text-foreground">{raffle.auto_draw_days} dia(s)</strong> após a venda de{" "}
                  <strong className="text-foreground">{raffle.tickets_threshold || raffle.total_tickets}</strong> bilhetes.
                  Faltam <strong className="text-accent">{(raffle.tickets_threshold || raffle.total_tickets) - raffle.sold_tickets}</strong> bilhetes.
                </p>
              </CardContent></Card>
            )}

            {raffle.end_date && raffle.draw_mode !== "auto_sold_out" && (
              <Card className="glass border-primary/20"><CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-foreground">Tempo Restante</p>
                </div>
                <CountdownTimer targetDate={new Date(raffle.end_date)} />
              </CardContent></Card>
            )}
          </div>

          {/* Right column - Number selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass sticky top-28"><CardContent className="p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Escolha seus números</h2>
              <p className="text-sm text-muted-foreground mb-3">Selecione até 10 números • {formatMZN(raffle.ticket_price)}/bilhete</p>

              <button
                onClick={() => {
                  const available = Array.from({ length: raffle.total_tickets }, (_, i) => i + 1)
                    .filter((n) => !soldNumbers.includes(n) && !selectedNumbers.includes(n));
                  if (available.length === 0) return;
                  const shuffled = available.sort(() => Math.random() - 0.5);
                  setSelectedNumbers((prev) => {
                    const remaining = 10 - prev.length;
                    return [...prev, ...shuffled.slice(0, Math.min(1, remaining))];
                  });
                }}
                className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/10 hover:border-accent"
              >
                <Sparkles className="h-4 w-4" />
                🎲 Surpresinha — Número aleatório
              </button>

              <div className="grid grid-cols-10 gap-1.5 mb-6 max-h-[320px] overflow-y-auto pr-1">
                {Array.from({ length: raffle.total_tickets }, (_, i) => i + 1).map((num) => {
                  const isSold = soldNumbers.includes(num);
                  const isSelected = selectedNumbers.includes(num);
                  return (
                    <motion.button key={num} whileTap={{ scale: 0.9 }} onClick={() => toggleNumber(num)} disabled={isSold}
                      className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                        isSold ? "bg-secondary/50 text-muted-foreground/30 cursor-not-allowed"
                        : isSelected ? "bg-primary text-primary-foreground glow-primary"
                        : "bg-secondary text-foreground hover:bg-secondary/80 hover:border-primary/50 border border-transparent"
                      }`}
                    >{num}</motion.button>
                  );
                })}
              </div>

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
                        <span className="font-display text-2xl font-bold text-foreground">{formatMZN(totalPrice)}</span>
                      </div>
                    </div>
                    <Button onClick={() => goToStep(1)} className="w-full gap-2 h-12 text-base glow-primary"
                      style={whiteLabelConfig ? { backgroundColor: whiteLabelConfig.primary_color, color: '#fff' } : undefined}>
                      <ShoppingCart className="h-5 w-5" /> Comprar Bilhetes
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary inline-block" /> Disponível</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary inline-block" /> Selecionado</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary/50 inline-block" /> Vendido</span>
              </div>
            </CardContent></Card>
          </div>
        </div>
      </div>

      {/* Checkout Bottom Sheet */}
      <AnimatePresence>
        {checkoutStep > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && checkoutStep < 4) goToStep(0); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md md:rounded-2xl rounded-t-3xl bg-card border border-border shadow-2xl overflow-hidden max-h-[85vh] md:max-h-[80vh] flex flex-col"
            >
              {/* Header with step indicator */}
              {checkoutStep < 4 && (
                <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
                  {/* Drag handle on mobile */}
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4 md:hidden" />

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold text-foreground">Finalizar Compra</h3>
                    <button onClick={() => goToStep(0)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Step dots */}
                  <div className="flex items-center gap-1">
                    {(needsReceipt ? stepLabels : [stepLabels[0], stepLabels[2]]).map((label, i) => {
                      const stepNum = needsReceipt ? i + 1 : (i === 0 ? 1 : 3);
                      const isActive = checkoutStep >= stepNum;
                      const isCurrent = checkoutStep === stepNum;
                      return (
                        <div key={label} className="flex items-center gap-1 flex-1">
                          <motion.div
                            animate={{ scale: isCurrent ? 1.1 : 1 }}
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                              isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {isActive && checkoutStep > stepNum ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </motion.div>
                          <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
                          {i < (needsReceipt ? 2 : 1) && (
                            <div className={`flex-1 h-0.5 rounded-full transition-colors ${isActive && checkoutStep > stepNum ? "bg-primary" : "bg-secondary"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content area with slide transitions */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  {/* Step 1: Payment Method */}
                  {checkoutStep === 1 && (
                    <motion.div
                      key="step1"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <p className="text-sm text-muted-foreground mb-4">Como deseja pagar?</p>
                      <div className="space-y-2">
                        {paymentMethods.map((m) => (
                          <motion.button
                            key={m.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPaymentMethod(m.id)}
                            className={`w-full flex items-center gap-3 rounded-xl p-3.5 transition-all border ${
                              paymentMethod === m.id
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border bg-secondary/30 hover:border-primary/30"
                            }`}
                          >
                            <span className="text-xl">{m.emoji}</span>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">{m.label}</p>
                              <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                            </div>
                            {paymentMethod === m.id && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </motion.div>
                            )}
                          </motion.button>
                        ))}
                      </div>

                      {/* Summary mini */}
                      <div className="mt-4 rounded-xl bg-secondary/50 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-muted-foreground">{selectedNumbers.length} bilhete(s)</p>
                          <p className="text-xs text-muted-foreground">Números: {selectedNumbers.sort((a, b) => a - b).join(", ")}</p>
                        </div>
                        <p className="font-display text-lg font-bold text-foreground">{formatMZN(totalPrice)}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Payment Instructions + Receipt (only for mobile money) */}
                  {checkoutStep === 2 && (
                    <motion.div
                      key="step2"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <PaymentInstructions
                        method={paymentMethod as "mpesa" | "emola"}
                        number={paymentMethod === "mpesa" ? (whiteLabelConfig?.mpesa_number ?? null) : (whiteLabelConfig?.emola_number ?? null)}
                        totalAmount={totalPrice}
                        brandName={whiteLabelConfig?.brand_name}
                      />

                      <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                        <label className="text-xs font-semibold text-foreground mb-2 block">📎 Comprovativo de Pagamento</label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-3 hover:border-primary/50 transition">
                          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            {receiptFile ? (
                              <p className="text-sm font-medium text-foreground truncate">{receiptFile.name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Toque para enviar comprovativo</p>
                            )}
                          </div>
                          {receiptFile && <Image className="h-4 w-4 text-primary" />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Confirmation */}
                  {checkoutStep === 3 && (
                    <motion.div
                      key="step3"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="rounded-xl bg-secondary/30 p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sorteio</span>
                          <span className="text-foreground font-medium text-right max-w-[60%] truncate">{raffle.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bilhetes</span>
                          <span className="text-foreground font-medium">{selectedNumbers.sort((a, b) => a - b).join(", ")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pagamento</span>
                          <span className="text-foreground">{paymentMethods.find(m => m.id === paymentMethod)?.label}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Preço unitário</span>
                          <span className="text-foreground">{formatMZN(raffle.ticket_price)}</span>
                        </div>
                        {receiptFile && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Comprovativo</span>
                            <span className="text-primary text-xs">✓ Anexado</span>
                          </div>
                        )}
                        <div className="border-t border-border pt-3 flex justify-between items-center">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-display text-2xl font-bold text-primary">{formatMZN(totalPrice)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-accent">
                          <Star className="h-3.5 w-3.5" />
                          +{selectedNumbers.length * 10} Luck Points
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Success */}
                  {checkoutStep === 4 && (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                      className="text-center py-6"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-4"
                      >
                        <PartyPopper className="h-10 w-10 text-primary" />
                      </motion.div>
                      <h3 className="font-display text-2xl font-bold text-foreground mb-2">Bateu! 🎉</h3>
                      <p className="text-muted-foreground mb-1">
                        {paymentMethod === "card" ? "Pagamento confirmado!" : "Aguardando confirmação do pagamento"}
                      </p>
                      <p className="text-accent text-sm font-medium">+{selectedNumbers.length * 10} Luck Points ganhos</p>

                      {/* Confetti-like dots */}
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 rounded-full"
                          style={{
                            left: `${20 + Math.random() * 60}%`,
                            top: `${10 + Math.random() * 30}%`,
                            backgroundColor: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--accent))" : "hsl(var(--destructive))",
                          }}
                          initial={{ y: 0, opacity: 1, scale: 0 }}
                          animate={{ y: [0, -60, 20], opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
                          transition={{ duration: 1.5, delay: i * 0.08, ease: "easeOut" }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer buttons */}
              {checkoutStep > 0 && checkoutStep < 4 && (
                <div className="px-5 pb-5 pt-2 border-t border-border shrink-0">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (checkoutStep === 1) goToStep(0);
                        else if (checkoutStep === 2) goToStep(1);
                        else if (checkoutStep === 3) goToStep(needsReceipt ? 2 : 1);
                      }}
                    >
                      {checkoutStep === 1 ? "Cancelar" : "Voltar"}
                    </Button>
                    {checkoutStep === 3 ? (
                      <Button className="flex-1 gap-2 glow-primary" onClick={handlePurchase} disabled={purchasing}>
                        {purchasing ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        Pagar {formatMZN(totalPrice)}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          if (checkoutStep === 1) goToStep(needsReceipt ? 2 : 3);
                          else if (checkoutStep === 2) goToStep(3);
                        }}
                      >
                        Continuar <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BolaoModal raffleId={raffle.id} raffleTitle={raffle.title} open={bolaoOpen} onClose={() => setBolaoOpen(false)} />
      <Footer />
    </div>
  );
};

export default RaffleDetail;
