import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Ticket, ShoppingCart, Check, Star, ArrowLeft, Share2, Heart, Smartphone, CreditCard, Wallet, Upload, Image } from "lucide-react";
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

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof Smartphone; desc: string }[] = [
  { id: "mpesa", label: "M-Pesa", icon: Smartphone, desc: "Pagamento via M-Pesa" },
  { id: "emola", label: "e-Mola", icon: Wallet, desc: "Pagamento via e-Mola" },
  { id: "card", label: "Cartão", icon: CreditCard, desc: "Visa / Mastercard" },
];

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [purchasing, setPurchasing] = useState(false);
  const [bolaoOpen, setBolaoOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      // Try slug first, then fall back to id (UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = isUUID
        ? supabase.from("raffles").select("*").eq("id", slug).single()
        : supabase.from("raffles").select("*").eq("slug", slug).single();

      const [raffleRes, _] = await Promise.all([
        query,
        Promise.resolve(),
      ]);

      if (raffleRes.data) {
        setRaffle(raffleRes.data as Raffle);
        // Fetch participants, business name, and white label config
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

  const handlePurchase = async () => {
    if (!user) { navigate("/login"); return; }
    if (!raffle || selectedNumbers.length === 0) return;
    setPurchasing(true);

    // Upload receipt if provided
    let receiptUrl: string | null = null;
    if (receiptFile) {
      setUploadingReceipt(true);
      const filePath = `${user.id}/${raffle.id}-${Date.now()}.${receiptFile.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
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
        await supabase.functions.invoke("check-ticket-threshold", {
          body: { raffle_id: raffle.id },
        });
      } catch (e) {
        console.error("Threshold check error:", e);
      }
    }

    // Notify business about payment receipt
    if (receiptUrl && (paymentMethod === "mpesa" || paymentMethod === "emola")) {
      try {
        await supabase.functions.invoke("notify-payment-receipt", {
          body: {
            raffle_id: raffle.id,
            participant_name: user.email,
            ticket_numbers: selectedNumbers.join(", "),
            payment_method: paymentMethod,
          },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }
    }

    setPurchasing(false);
    setCheckoutStep(3);
    toast.success(paymentMethod === "card" 
      ? "Bilhetes comprados com sucesso!" 
      : "Bilhetes reservados! Envie o pagamento e aguarde confirmação.");
    setTimeout(() => {
      setCheckoutStep(0);
      setSelectedNumbers([]);
      setReceiptFile(null);
      setSoldNumbers((prev) => [...prev, ...selectedNumbers]);
      setRaffle((prev) => prev ? { ...prev, sold_tickets: newSoldCount } : prev);
    }, 3000);
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
      {/* White-label branding banner */}
      {whiteLabelConfig && (
        <div className="w-full py-2 px-4 text-center text-sm font-medium" 
          style={{ backgroundColor: whiteLabelConfig.primary_color, color: '#fff' }}>
          <div className="container mx-auto flex items-center justify-center gap-2">
            {whiteLabelConfig.logo_url && (
              <img src={whiteLabelConfig.logo_url} alt={whiteLabelConfig.brand_name} className="h-5 w-5 rounded-full object-cover" />
            )}
            <span>Sorteio por <strong>{whiteLabelConfig.brand_name}</strong></span>
          </div>
        </div>
      )}
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="grid gap-8 lg:grid-cols-5">
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
               <Badge className="bg-primary text-primary-foreground font-bold text-lg px-4 py-1">
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

            {/* Auto-draw countdown */}
            {raffle.draw_mode === "auto_sold_out" && raffle.auto_draw_scheduled_at && (
              <Card className="glass border-accent/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-accent" />
                    <p className="font-semibold text-foreground">⚡ Sorteio Automático Agendado</p>
                  </div>
                  <CountdownTimer targetDate={new Date(raffle.auto_draw_scheduled_at)} />
                  <p className="text-xs text-muted-foreground mt-3">O vencedor será selecionado automaticamente quando a contagem terminar</p>
                </CardContent>
              </Card>
            )}

            {raffle.draw_mode === "auto_sold_out" && !raffle.auto_draw_scheduled_at && (
              <Card className="glass border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">Sorteio Automático</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O sorteio será realizado <strong className="text-foreground">{raffle.auto_draw_days} dia(s)</strong> após a venda de{" "}
                    <strong className="text-foreground">{raffle.tickets_threshold || raffle.total_tickets}</strong> bilhetes.
                    Faltam <strong className="text-accent">{(raffle.tickets_threshold || raffle.total_tickets) - raffle.sold_tickets}</strong> bilhetes.
                  </p>
                </CardContent>
              </Card>
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

          <div className="lg:col-span-2 space-y-6">
            <Card className="glass sticky top-28"><CardContent className="p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Escolha seus números</h2>
              <p className="text-sm text-muted-foreground mb-4">Selecione até 10 números • {formatMZN(raffle.ticket_price)}/bilhete</p>

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
                    <Button onClick={() => setCheckoutStep(1)} className="w-full gap-2 h-12 text-base glow-primary">
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

      {/* 3-Step Checkout */}
      <AnimatePresence>
        {checkoutStep > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-strong rounded-2xl p-8 max-w-md w-full">
              {checkoutStep < 3 && (
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        checkoutStep >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{s}</div>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {s === 1 ? "Pagamento" : "Confirmar"}
                      </span>
                      {s < 2 && <div className={`flex-1 h-0.5 ${checkoutStep > s ? "bg-primary" : "bg-secondary"}`} />}
                    </div>
                  ))}
                </div>
              )}

              {checkoutStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h3 className="font-display text-xl font-bold text-foreground mb-1">Método de Pagamento</h3>
                  <p className="text-sm text-muted-foreground mb-5">Escolha como deseja pagar</p>
                  <div className="space-y-2 mb-4">
                    {paymentMethods.map((m) => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                        className={`w-full flex items-center gap-4 rounded-xl p-4 transition-all border ${
                          paymentMethod === m.id ? "border-primary bg-primary/10" : "border-border bg-secondary/50 hover:border-primary/30"
                        }`}>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${paymentMethod === m.id ? "bg-primary/20" : "bg-secondary"}`}>
                          <m.icon className={`h-5 w-5 ${paymentMethod === m.id ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                        {/* Show business payment number */}
                        {m.id === "mpesa" && whiteLabelConfig?.mpesa_number && (
                          <span className="text-xs font-mono text-primary">{whiteLabelConfig.mpesa_number}</span>
                        )}
                        {m.id === "emola" && whiteLabelConfig?.emola_number && (
                          <span className="text-xs font-mono text-accent">{whiteLabelConfig.emola_number}</span>
                        )}
                        {paymentMethod === m.id && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    ))}
                  </div>

                  {/* Payment number display for mobile money */}
                  {(paymentMethod === "mpesa" || paymentMethod === "emola") && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 mb-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">
                        📱 Envie o pagamento de <strong className="text-primary">{formatMZN(totalPrice)}</strong> para:
                      </p>
                      {paymentMethod === "mpesa" && whiteLabelConfig?.mpesa_number && (
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-destructive" />
                          <span className="font-mono text-lg font-bold text-foreground">{whiteLabelConfig.mpesa_number}</span>
                          <span className="text-xs text-muted-foreground">(M-Pesa)</span>
                        </div>
                      )}
                      {paymentMethod === "emola" && whiteLabelConfig?.emola_number && (
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-accent" />
                          <span className="font-mono text-lg font-bold text-foreground">{whiteLabelConfig.emola_number}</span>
                          <span className="text-xs text-muted-foreground">(e-Mola)</span>
                        </div>
                      )}
                      {!whiteLabelConfig?.mpesa_number && paymentMethod === "mpesa" && (
                        <p className="text-xs text-muted-foreground">Número de pagamento não configurado pela empresa.</p>
                      )}
                      {!whiteLabelConfig?.emola_number && paymentMethod === "emola" && (
                        <p className="text-xs text-muted-foreground">Número de pagamento não configurado pela empresa.</p>
                      )}

                      {/* Receipt upload */}
                      <div className="pt-2 border-t border-border">
                        <label className="text-xs font-medium text-foreground mb-2 block">Comprovativo de Pagamento (opcional)</label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/30 p-3 hover:border-primary/50 transition">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            {receiptFile ? (
                              <p className="text-sm text-foreground truncate">{receiptFile.name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Toque para enviar foto do comprovativo</p>
                            )}
                          </div>
                          {receiptFile && <Image className="h-4 w-4 text-primary" />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep(0)}>Cancelar</Button>
                    <Button className="flex-1 glow-primary" onClick={() => setCheckoutStep(2)}>Continuar</Button>
                  </div>
                </motion.div>
              )}

              {checkoutStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h3 className="font-display text-xl font-bold text-foreground mb-1">Confirmar Compra</h3>
                  <p className="text-sm text-muted-foreground mb-5">{raffle.title}</p>
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
                      <span className="text-muted-foreground">Pagamento</span>
                      <span className="text-foreground">{paymentMethods.find(m => m.id === paymentMethod)?.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço unitário</span>
                      <span className="text-foreground">{formatMZN(raffle.ticket_price)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">{formatMZN(totalPrice)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-accent">
                      <Star className="h-3.5 w-3.5" />
                      +{selectedNumbers.length * 10} Luck Points
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep(1)}>Voltar</Button>
                    <Button className="flex-1 gap-2 glow-primary" onClick={handlePurchase} disabled={purchasing}>
                      {purchasing ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <ShoppingCart className="h-4 w-4" />}
                      Pagar {formatMZN(totalPrice)}
                    </Button>
                  </div>
                </motion.div>
              )}

              {checkoutStep === 3 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-8">
                  <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }}
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-4">
                    <Check className="h-10 w-10 text-primary" />
                  </motion.div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-2">Compra Confirmada!</h3>
                  <p className="text-muted-foreground mb-1">Pagamento via {paymentMethods.find(m => m.id === paymentMethod)?.label}</p>
                  <p className="text-accent text-sm">+{selectedNumbers.length * 10} Luck Points ganhos 🎉</p>
                </motion.div>
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
