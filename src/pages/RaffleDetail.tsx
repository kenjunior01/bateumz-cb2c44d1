import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, Ticket, ShoppingCart, Check, Star, ArrowLeft, Share2, Heart, Sparkles, X, ChevronRight, PartyPopper, ShieldCheck, Zap, Trophy, Flame, Eye, Gift } from "lucide-react";
import SocialRaffleEntry from "@/components/SocialRaffleEntry";
import PaymentGatewaySelector from "@/components/payments/PaymentGatewaySelector";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatMoney, formatMZN } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import BlockchainVerification from "@/components/BlockchainVerification";
import BolaoModal from "@/components/BolaoModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getOneClick, saveOneClick } from "@/lib/oneClick";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

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

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 400, damping: 15 };
const C_PRIMARY = "hsl(220 70% 18%)";
const C_ACCENT = "hsl(352 73% 50%)";
const C_GOLD = "#fbbf24";

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 120 : -120, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 120 : -120, opacity: 0, scale: 0.95 }),
};

function RaffleProgressRing({ sold, total, size = 80, strokeWidth = 5, color = C_ACCENT }: { sold: number; total: number; size?: number; strokeWidth?: number; color?: string }) {
  const [pct, setPct] = useState(0);
  const safeTotal = Math.max(total, 1);
  useEffect(() => {
    const timer = setTimeout(() => setPct(Math.min(sold / safeTotal, 1)), 500);
    return () => clearTimeout(timer);
  }, [sold, safeTotal]);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)", filter: "drop-shadow(0 0 6px " + color + "40)" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-black font-display" style={{ color }}>{Math.round(pct * 100)}%</p>
        <p className="text-[9px] text-muted-foreground font-semibold uppercase">vendidos</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, delay }: { icon: React.ElementType; value: string | number; label: string; color: string; delay: number }) {
  return (
    <motion.div className="rd-stat-card" initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...SPRING, delay }}>
      <div className="rd-stat-icon" style={{ background: color + "15" }}><Icon className="h-5 w-5" style={{ color }} /></div>
      <div>
        <p className="text-xl font-black font-display" style={{ color }}>{value}</p>
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

const RaffleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { sfx } = useSoundEffects();
  const fmt = (v: number) => formatMoney(v, currency);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState<WhiteLabelConfig | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [bolaoOpen, setBolaoOpen] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = isUUID
        ? supabase.from("raffles").select("*").eq("id", slug).single()
        : supabase.from("raffles").select("*").eq("slug", slug).single();
      const raffleRes = await query;
      if (raffleRes.error || !raffleRes.data) { setNotFound(true); setLoading(false); return; }
      if (raffleRes.data) {
        setRaffle(raffleRes.data as Raffle);
        const [participantsRes, profileRes, wlRes] = await Promise.all([
          supabase.from("participants").select("ticket_number").eq("raffle_id", raffleRes.data.id),
          supabase.from("profiles_public").select("display_name, company_name").eq("user_id", raffleRes.data.business_user_id).single(),
          supabase.from("white_label_configs").select("brand_name, logo_url, primary_color, secondary_color, mpesa_number, emola_number").eq("business_user_id", raffleRes.data.business_user_id).eq("is_active", true).maybeSingle(),
        ]);
        if (profileRes.data) setBusinessName(profileRes.data.company_name || profileRes.data.display_name);
        if (wlRes.data) setWhiteLabelConfig(wlRes.data as WhiteLabelConfig);
        if (participantsRes.data) setSoldNumbers(participantsRes.data.map((p: { ticket_number: number }) => p.ticket_number));
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  useSEO({
    title: raffle?.title ? `${raffle.title} — Sorteio` : 'Sorteio',
    description: raffle?.description?.substring(0, 160) || 'Participe neste sorteio na Bateu e concorra a prémios reais com verificação justa.',
    canonicalPath: location.pathname,
    ogImage: raffle?.image_url || undefined,
    ogType: 'product.item',
    structuredData: raffle ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: raffle.title,
      description: raffle.description?.substring(0, 300),
      image: raffle.image_url,
      url: `https://bateu.online/raffle/${raffle.slug}`,
      offers: {
        '@type': 'Offer',
        price: raffle.ticket_price,
        priceCurrency: 'MZN',
        availability: raffle.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        seller: { '@type': 'Organization', name: 'Bateu' }
      }
    } : undefined
  });

  const toggleNumber = (num: number) => {
    if (soldNumbers.includes(num)) return;
    const wasAdded = !selectedNumbers.includes(num);
    setSelectedNumbers((prev) => prev.includes(num) ? prev.filter((n) => n !== num) : prev.length < 10 ? [...prev, num] : prev);
    if (wasAdded && selectedNumbers.length < 10) sfx.click();
  };

  const totalPrice = useMemo(() => {
    if (!raffle) return 0;
    return selectedNumbers.length * raffle.ticket_price;
  }, [selectedNumbers, raffle]);

  const goToStep = (step: number) => { setSlideDirection(step > checkoutStep ? 1 : -1); setCheckoutStep(step); };

  const onPayPalSuccess = async (captureId: string) => {
    if (!user || !raffle) return;
    setPaid(true);
    const newSoldCount = raffle.sold_tickets + selectedNumbers.length;
    saveOneClick({ method: "paypal" });
    if (raffle.draw_mode === "auto_sold_out") {
      try { await supabase.functions.invoke("check-ticket-threshold", { body: { raffle_id: raffle.id } }); } catch (e) { console.error("Threshold check error:", e); }
    }
    goToStep(4);
    sfx.win();
    toast.success("Pagamento confirmado — bilhetes sao seus!");
    setTimeout(() => {
      setCheckoutStep(0); setPaid(false); setSelectedNumbers([]);
      setSoldNumbers((prev) => [...prev, ...selectedNumbers]);
      setRaffle((prev) => prev ? { ...prev, sold_tickets: newSoldCount } : prev);
    }, 3500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh-soft bg-noise flex items-center justify-center">
        <div className="relative">
          <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, " + C_ACCENT + "20, " + C_PRIMARY + "10)" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
            <Ticket className="h-7 w-7" style={{ color: C_ACCENT }} />
          </motion.div>
          <motion.div className="absolute inset-0 rounded-2xl" animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} style={{ border: "2px solid " + C_ACCENT + "25" }} />
        </div>
      </div>
    );
  }

  if (notFound || !raffle) {
    return (
      <div className="min-h-screen bg-mesh-soft bg-noise flex flex-col items-center justify-center gap-4 px-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full" style={{ background: C_ACCENT, filter: "blur(40px)", width: 100, height: 100, top: "-10px", left: "-10px", animation: "empty-orb-pulse 4s ease-in-out infinite" }} />
          <motion.div className="relative" animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, " + C_ACCENT + "10, " + C_PRIMARY + "05)", border: "1.5px dashed " + C_ACCENT + "15" }}>
              <Ticket className="h-9 w-9 text-muted-foreground/20" />
            </div>
          </motion.div>
        </div>
        <h1 className="font-display text-2xl font-bold">Sorteio nao encontrado</h1>
        <p className="text-muted-foreground text-center">Este sorteio nao existe ou foi removido.</p>
        <motion.button onClick={() => navigate("/marketplace")} className="rd-cta-btn" style={{ background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          Ver Marketplace <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    );
  }

  const soldPercent = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const isHot = soldPercent > 70;
  const availableCount = raffle.total_tickets - raffle.sold_tickets;

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise" style={whiteLabelConfig ? { "--wl-primary": whiteLabelConfig.primary_color, "--wl-secondary": whiteLabelConfig.secondary_color } as React.CSSProperties : undefined}>
      {whiteLabelConfig && (
        <div className="w-full py-3 px-4" style={{ background: "linear-gradient(135deg, " + whiteLabelConfig.primary_color + ", " + whiteLabelConfig.secondary_color + ")", color: "#fff" }}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {whiteLabelConfig.logo_url ? (
                <img src={whiteLabelConfig.logo_url} alt={whiteLabelConfig.brand_name} className="h-8 w-8 rounded-lg object-cover border border-white/20" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold bg-white/20">{whiteLabelConfig.brand_name.charAt(0)}</div>
              )}
              <div>
                <span className="font-display font-bold text-sm">{whiteLabelConfig.brand_name}</span>
                <span className="text-white/70 text-xs ml-2">presents</span>
              </div>
            </div>
            <span className="rd-excl-badge">Exclusive Drop</span>
          </div>
        </div>
      )}
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <motion.button onClick={() => navigate(-1)} className="rd-back-btn mb-6" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING }} whileHover={{ x: -4 }}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </motion.button>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.01 }} className="rd-image-wrap shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
              {raffle.image_url ? (
                <img loading="lazy" src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, " + C_ACCENT + "08, " + C_PRIMARY + "05)" }}>
                  <Gift className="h-20 w-20" style={{ color: C_ACCENT, opacity: 0.15 }} />
                </div>
              )}
              <div className="rd-image-overlay" />
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <motion.button className="rd-icon-btn" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Share2 className="h-4 w-4" /></motion.button>
                <motion.button className="rd-icon-btn" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Heart className="h-4 w-4" /></motion.button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex gap-2 items-end z-10">
                <span className="rd-price-badge" style={{ background: whiteLabelConfig ? whiteLabelConfig.primary_color : "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }}>
                  {(raffle as any).hide_prize_value ? "Surpresa" : fmt(raffle.prize_value)}
                </span>
                {businessName && <span className="rd-business-badge">{businessName}</span>}
                {isHot && <span className="mkt-hot-badge ml-auto"><Flame className="h-3 w-3" /> Hot</span>}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }}>
              <h1 className="font-display text-3xl lg:text-4xl font-black text-foreground mb-2 leading-tight">{raffle.title}</h1>
              <p className="text-lg font-semibold mb-4" style={{ color: C_ACCENT }}>{raffle.prize_title}</p>
              {raffle.description && <p className="text-muted-foreground leading-relaxed">{raffle.description}</p>}
            </motion.div>

            <motion.div className="flex gap-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.2 }}>
              <BlockchainVerification raffleId={raffle.id} raffleTitle={raffle.title} />
              <motion.button className="rd-bolao-btn shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)]" onClick={() => { sfx.modalOpen(); setBolaoOpen(true); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Users className="h-4 w-4" /> Bolao
              </motion.button>
            </motion.div>

            <motion.div className="grid grid-cols-3 gap-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <StatCard icon={Users} value={raffle.sold_tickets} label="Jogadores" color={C_PRIMARY} delay={0.3} />
              <StatCard icon={Ticket} value={availableCount} label="Disponiveis" color={isHot ? C_ACCENT : C_GOLD} delay={0.35} />
              <StatCard icon={Star} value={selectedNumbers.length * 10 || 10} label="Pts / bilhete" color={C_GOLD} delay={0.4} />
            </motion.div>

            <motion.div className="rd-progress-section" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <RaffleProgressRing sold={raffle.sold_tickets} total={raffle.total_tickets} color={isHot ? C_ACCENT : C_PRIMARY} />
                  <div>
                    <p className="text-sm font-semibold">Progresso de vendas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{raffle.sold_tickets} de {raffle.total_tickets} bilhetes vendidos</p>
                  </div>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div className="h-full rounded-full" style={{ background: isHot ? "linear-gradient(90deg, " + C_ACCENT + ", " + C_GOLD + ")" : C_PRIMARY }} initial={{ width: 0 }} animate={{ width: soldPercent + "%" }} transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </motion.div>

            {raffle.draw_mode === "auto_sold_out" && raffle.auto_draw_scheduled_at && (
              <motion.div className="rd-info-card" style={{ "--card-accent": C_ACCENT } as React.CSSProperties} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="flex items-center gap-2 mb-3"><Zap className="h-5 w-5" style={{ color: C_ACCENT }} /><p className="font-semibold">Sorteio Automatico Agendado</p></div>
                <CountdownTimer targetDate={new Date(raffle.auto_draw_scheduled_at)} />
                <p className="text-xs text-muted-foreground mt-3">O vencedor sera sorteado automaticamente</p>
              </motion.div>
            )}

            {raffle.draw_mode === "auto_sold_out" && !raffle.auto_draw_scheduled_at && (
              <motion.div className="rd-info-card" style={{ "--card-accent": C_PRIMARY } as React.CSSProperties} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5" style={{ color: C_PRIMARY }} /><p className="font-semibold">Sorteio Automatico</p></div>
                <p className="text-sm text-muted-foreground">
                  O sorteio acontece <strong className="text-foreground">{raffle.auto_draw_days} dia(s)</strong> apos vender{" "}
                  <strong className="text-foreground">{raffle.tickets_threshold || raffle.total_tickets}</strong> bilhetes.
                  Restam <strong style={{ color: C_ACCENT }}>{(raffle.tickets_threshold || raffle.total_tickets) - raffle.sold_tickets}</strong> bilhetes.
                </p>
              </motion.div>
            )}

            {raffle.end_date && raffle.draw_mode !== "auto_sold_out" && (
              <motion.div className="rd-info-card" style={{ "--card-accent": C_PRIMARY } as React.CSSProperties} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="flex items-center gap-2 mb-3"><Clock className="h-5 w-5" style={{ color: C_PRIMARY }} /><p className="font-semibold">Tempo Restante</p></div>
                <CountdownTimer targetDate={new Date(raffle.end_date)} />
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {(raffle.raffle_type === "social" || (raffle.raffle_type === "free" && raffle.social_actions && raffle.social_actions.length > 0)) ? (
              <SocialRaffleEntry raffleId={raffle.id} socialActions={raffle.social_actions || []} totalTickets={raffle.total_tickets} soldTickets={raffle.sold_tickets} />
            ) : (
              <motion.div className="rd-ticket-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.2 }}>
                <div className="relative z-10 p-6">
                  <h2 className="font-display text-xl font-bold mb-1">Escolha os seus numeros</h2>
                  <p className="text-sm text-muted-foreground mb-4">Selecione ate 10 numeros <span style={{ color: C_ACCENT }} className="font-semibold">{fmt(raffle.ticket_price)}/bilhete</span></p>

                  <motion.button
                    onClick={() => {
                      const available = Array.from({ length: raffle.total_tickets }, (_, i) => i + 1).filter((n) => !soldNumbers.includes(n) && !selectedNumbers.includes(n));
                      if (available.length === 0) return;
                      const shuffled = available.sort(() => Math.random() - 0.5);
                      setSelectedNumbers((prev) => { const remaining = 10 - prev.length; return [...prev, ...shuffled.slice(0, Math.min(1, remaining))]; });
                    }}
                    className="rd-lucky-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: C_GOLD }} /> Sorte Rapido
                  </motion.button>

                  <div className="rd-number-grid">
                    {Array.from({ length: raffle.total_tickets }, (_, i) => i + 1).map((num) => {
                      const isSold = soldNumbers.includes(num);
                      const isSelected = selectedNumbers.includes(num);
                      return (
                        <motion.button key={num} whileTap={{ scale: 0.85 }} onClick={() => toggleNumber(num)} disabled={isSold}
                          className={"rd-num " + (isSold ? "sold" : isSelected ? "selected" : "available")}
                          style={isSelected ? { background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")", color: "#fff", boxShadow: "0 0 15px " + C_PRIMARY + "40" } : undefined}
                        >{num}</motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {selectedNumbers.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="rd-selected-bar">
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {selectedNumbers.sort((a, b) => a - b).map((n) => (
                              <motion.span key={n} className="rd-selected-chip" onClick={() => toggleNumber(n)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...SPRING_BOUNCE }}>
                                {n} <X className="h-2.5 w-2.5" />
                              </motion.span>
                            ))}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{selectedNumbers.length} bilhete(s)</span>
                            <span className="font-display text-2xl font-black" style={{ color: C_PRIMARY }}>{fmt(totalPrice)}</span>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => { sfx.wagerPlace(); goToStep(1); }} className="rd-buy-btn w-full"
                          style={{ background: whiteLabelConfig ? whiteLabelConfig.primary_color : "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }}
                          whileHover={{ scale: 1.03, boxShadow: "0 8px 30px " + C_PRIMARY + "40" }} whileTap={{ scale: 0.97 }}
                        >
                          <ShoppingCart className="h-5 w-5" /> Comprar Bilhetes
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 mt-5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "rgba(255,255,255,0.06)" }} /> Disponivel</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }} /> Selecionado</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "rgba(255,255,255,0.03)" }} /> Vendido</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {checkoutStep > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget && checkoutStep < 4) goToStep(0); }}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} transition={{ ...SPRING }} className="rd-checkout-sheet">
              {checkoutStep < 4 && (
                <div className="rd-checkout-header">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4 md:hidden" />
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-lg font-bold">Checkout Seguro</h3>
                    <motion.button onClick={() => { sfx.modalClose(); goToStep(0); }} className="rd-close-btn" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="h-4 w-4" /></motion.button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" style={{ color: C_PRIMARY }} />
                    <span>Comprador protegido</span>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  {checkoutStep === 1 && (
                    <motion.div key="review" custom={slideDirection} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeOut" }}>
                      <div className="rd-order-summary">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sorteio</span><span className="text-foreground font-medium text-right max-w-[60%] truncate">{raffle.title}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bilhetes</span><span className="text-foreground font-medium">{selectedNumbers.sort((a, b) => a - b).join(", ")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preco unitario</span><span className="text-foreground">{fmt(raffle.ticket_price)}</span></div>
                        <div className="rd-order-total">
                          <span className="font-semibold">Total</span>
                          <span className="font-display text-2xl font-black" style={{ color: C_PRIMARY }}>{fmt(totalPrice)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: C_GOLD }}>
                          <Star className="h-3.5 w-3.5" />+{selectedNumbers.length * 10} Pontos de Sorte apos pagamento
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        {[{ icon: ShieldCheck, label: "100% Seguro", color: C_PRIMARY }, { icon: Zap, label: "Bilhetes Instantaneos", color: C_ACCENT }, { icon: Trophy, label: "Sorteios Verificados", color: C_GOLD }].map((item) => (
                          <div key={item.label} className="rd-trust-badge"><item.icon className="h-4 w-4 mx-auto mb-1" style={{ color: item.color }} /><p className="text-[10px] text-muted-foreground">{item.label}</p></div>
                        ))}
                      </div>
                      {!user ? (
                        <button className="rd-buy-btn w-full" onClick={() => navigate("/login")}>Entrar para pagar</button>
                      ) : (
                        <PaymentGatewaySelector raffleId={raffle.id} quantity={selectedNumbers.length} ticketNumbers={selectedNumbers} amount={totalPrice} currency={currency} description={"Raffle: " + raffle.title} onSuccess={onPayPalSuccess} disabled={paid} />
                      )}
                    </motion.div>
                  )}
                  {checkoutStep === 4 && (
                    <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING_BOUNCE }} className="text-center py-6">
                      <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }} className="inline-flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ background: C_PRIMARY + "20" }}>
                        <PartyPopper className="h-10 w-10" style={{ color: C_PRIMARY }} />
                      </motion.div>
                      <h3 className="font-display text-2xl font-bold mb-2">Estas dentro!</h3>
                      <p className="text-muted-foreground mb-1">Pagamento confirmado — bilhetes garantidos.</p>
                      <p className="text-sm font-medium" style={{ color: C_GOLD }}>+{selectedNumbers.length * 10} Pontos de Sorte ganhos</p>
                      {[...Array(12)].map((_, i) => (
                        <motion.div key={i} className="absolute w-2 h-2 rounded-full" style={{ left: 20 + Math.random() * 60 + "%", top: 10 + Math.random() * 30 + "%", backgroundColor: i % 3 === 0 ? C_PRIMARY : i % 3 === 1 ? C_ACCENT : C_GOLD }} initial={{ y: 0, opacity: 1, scale: 0 }} animate={{ y: [0, -60, 20], opacity: [0, 1, 0], scale: [0, 1, 0.5] }} transition={{ duration: 1.5, delay: i * 0.08, ease: "easeOut" }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {checkoutStep === 1 && (
                <div className="px-5 pb-5 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <motion.button className="rd-cancel-btn w-full" onClick={() => goToStep(0)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>Cancelar</motion.button>
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
