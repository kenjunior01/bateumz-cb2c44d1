import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2, ExternalLink, Gamepad2, Trophy, Users, Clock, Flame,
  Calendar, Star, Zap, Award, ChevronRight, MapPin, Globe,
  CheckCircle2, Copy, Check, ArrowRight, Heart, Play,
  Music, UtensilsCrossed, Dumbbell, GraduationCap, ShoppingBag,
  Palette, Mic2, Sparkles, TrendingUp, Eye, Crown, Radio,
  Gift, Target, BarChart3, Ticket, Building2, ArrowLeft,
  Phone, CalendarDays, GiftIcon, Megaphone, Wallet, Calculator,
  Medal, Instagram, Facebook, Youtube, Twitter, MessageSquare,
  Quote, ThumbsUp, Shield, Rocket, Sparkle, Clock4, Send, Headphones, ArrowUpRight, Gem, BadgeCheck, Handshake, HeartHandshake, StarOff, Volume2, PartyPopper, BadgePercent, LayoutGrid, UserCheck, Timer, TrendingUp as TrendIcon, MapPinned
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import Footer from "@/components/Footer";
import BusinessLivesTab from "@/components/business/BusinessLivesTab";
import BusinessTimeline from "@/components/business/BusinessTimeline";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import HolographicCard from "@/components/ui/HolographicCard";
import ShimmerText from "@/components/ui/ShimmerText";
import GlowPulse from "@/components/ui/GlowPulse";
import CardTilt from "@/components/ui/CardTilt";
import NeonBorder from "@/components/ui/NeonBorder";

/* ─── Types ──────────────────────────────────── */
interface CompanyInfo {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  city: string | null;
  province: string | null;
  created_at: string | null;
  phone: string | null;
}

interface CompanyBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  company_logo_url: string | null;
  background_image_url: string | null;
  company_name: string | null;
  company_slogan: string | null;
  niche?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  hero_cta_link?: string;
  about_text?: string;
  social_links?: Record<string, string>;
  homepage_layout?: string;
  featured_badge?: string;
  show_leaderboard?: boolean;
  show_games?: boolean;
  show_lives?: boolean;
  show_stats?: boolean;
}

interface GameItem {
  id: string;
  name: string;
  type: "wheel" | "millionaire" | "custom";
  is_published?: boolean;
  segment_count?: number;
  created_at: string;
  is_active?: boolean;
}

interface LiveSession {
  code: string;
  title?: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  players_count: number;
  games_count: number;
  winners: string[];
}

interface Raffle {
  id: string;
  title: string;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  image_url: string | null;
  slug: string | null;
  end_date: string | null;
  category: string | null;
}

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  end_date: string | null;
}

interface RaffleWinner {
  raffle_title: string;
  prize_title: string;
  display_name: string | null;
  slug: string | null;
}

interface PrestacaoProduct {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  total_price: number;
  min_down_payment: number;
  max_months: number;
  images: any;
  city: string | null;
  province: string | null;
  views_count: number | null;
  status: string;
}

interface ContestRanking {
  contest_id: string;
  contest_title: string;
  evaluation_type: string;
  status: string;
  top: {
    submission_id: string;
    name: string;
    photo_url: string | null;
    score: number;
  }[];
}

/* ─── Niche System ───────────────────────────── */
type NicheId = "entertainment" | "gaming" | "restaurant" | "retail" | "education" | "fitness" | "music" | "fashion" | "tech" | "food" | "beauty" | "sports" | "casino" | "charity" | "other";

const NICHE_META: Record<string, {
  icon: any; label: string; gradient: string; particleColor: string;
  heroGlow: string; badge: string; defaultTitle: string; defaultCta: string;
  gradientColors: string[];
}> = {
  entertainment: { icon: Sparkles, label: "Entretenimento", gradient: "from-violet-600 via-fuchsia-500 to-pink-500", particleColor: "#d946ef", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(217,70,239,0.25), transparent 70%)", badge: "Show de Entretenimento", defaultTitle: "Vem divertir-te connosco", defaultCta: "Entrar no Jogo", gradientColors: ["#7c3aed", "#d946ef", "#ec4899"] },
  gaming: { icon: Gamepad2, label: "Gaming", gradient: "from-emerald-600 via-cyan-500 to-blue-500", particleColor: "#06b6d4", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.25), transparent 70%)", badge: "Gaming Zone", defaultTitle: "Arena de Jogos", defaultCta: "Come\u00e7ar a Jogar", gradientColors: ["#059669", "#06b6d4", "#3b82f6"] },
  restaurant: { icon: UtensilsCrossed, label: "Restaura\u00e7\u00e3o", gradient: "from-orange-600 via-red-500 to-rose-500", particleColor: "#f97316", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.25), transparent 70%)", badge: "Sabor & Divers\u00e3o", defaultTitle: "Joga e Ganha Pr\u00e9mios", defaultCta: "Ver Card\u00e1pio de Jogos", gradientColors: ["#ea580c", "#ef4444", "#f43f5e"] },
  retail: { icon: ShoppingBag, label: "Retalho", gradient: "from-blue-600 via-indigo-500 to-violet-500", particleColor: "#6366f1", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25), transparent 70%)", badge: "Loja Interativa", defaultTitle: "Descontos exclusivos", defaultCta: "Aproveitar Agora", gradientColors: ["#2563eb", "#6366f1", "#7c3aed"] },
  education: { icon: GraduationCap, label: "Educa\u00e7\u00e3o", gradient: "from-teal-600 via-emerald-500 to-green-500", particleColor: "#14b8a6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.25), transparent 70%)", badge: "Aprende & Joga", defaultTitle: "Aprende brincando", defaultCta: "Come\u00e7ar a Aprender", gradientColors: ["#0d9488", "#10b981", "#22c55e"] },
  fitness: { icon: Dumbbell, label: "Fitness", gradient: "from-lime-500 via-green-500 to-emerald-600", particleColor: "#22c55e", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.25), transparent 70%)", badge: "Desafio Fitness", defaultTitle: "Desafia os teus limites", defaultCta: "Iniciar Desafio", gradientColors: ["#65a30d", "#22c55e", "#059669"] },
  music: { icon: Music, label: "M\u00fasica", gradient: "from-purple-600 via-pink-500 to-rose-500", particleColor: "#ec4899", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.25), transparent 70%)", badge: "Vibe Musical", defaultTitle: "Sente o ritmo", defaultCta: "Tocar Agora", gradientColors: ["#9333ea", "#ec4899", "#f43f5e"] },
  fashion: { icon: Palette, label: "Moda", gradient: "from-pink-500 via-fuchsia-500 to-purple-600", particleColor: "#c026d3", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(192,38,211,0.25), transparent 70%)", badge: "Estilo & Divers\u00e3o", defaultTitle: "Desfiles de estilo", defaultCta: "Explorar Cole\u00e7\u00e3o", gradientColors: ["#ec4899", "#c026d3", "#9333ea"] },
  tech: { icon: Zap, label: "Tecnologia", gradient: "from-cyan-500 via-blue-600 to-indigo-600", particleColor: "#0ea5e9", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.25), transparent 70%)", badge: "Tech Hub", defaultTitle: "Inova\u00e7\u00e3o em tempo real", defaultCta: "Explorar", gradientColors: ["#06b6d4", "#2563eb", "#4f46e5"] },
  food: { icon: UtensilsCrossed, label: "Food & Bebidas", gradient: "from-amber-500 via-orange-500 to-red-500", particleColor: "#f59e0b", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.25), transparent 70%)", badge: "Sabores & Jogos", defaultTitle: "Prova a tua sorte", defaultCta: "Degustar & Jogar", gradientColors: ["#d97706", "#f97316", "#ef4444"] },
  beauty: { icon: Star, label: "Beleza", gradient: "from-rose-400 via-pink-500 to-fuchsia-500", particleColor: "#f472b6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,114,182,0.25), transparent 70%)", badge: "Beleza & Sorte", defaultTitle: "Brilha & Ganha", defaultCta: "Descobrir", gradientColors: ["#fb7185", "#ec4899", "#d946ef"] },
  sports: { icon: Target, label: "Desporto", gradient: "from-green-500 via-emerald-600 to-teal-600", particleColor: "#10b981", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.25), transparent 70%)", badge: "Zona Desportiva", defaultTitle: "Compete em tempo real", defaultCta: "Entrar no Jogo", gradientColors: ["#22c55e", "#059669", "#0d9488"] },
  casino: { icon: Crown, label: "Casino", gradient: "from-yellow-500 via-amber-500 to-orange-600", particleColor: "#eab308", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.3), transparent 70%)", badge: "Casino Premium", defaultTitle: "A sorte sorri-te", defaultCta: "Jogar Agora", gradientColors: ["#eab308", "#f59e0b", "#ea580c"] },
  charity: { icon: Heart, label: "Solidariedade", gradient: "from-rose-500 via-pink-500 to-red-500", particleColor: "#f43f5e", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.25), transparent 70%)", badge: "Causa Solid\u00e1ria", defaultTitle: "Joga por uma causa", defaultCta: "Apoiar Agora", gradientColors: ["#f43f5e", "#ec4899", "#ef4444"] },
  other: { icon: Sparkles, label: "Personalizado", gradient: "from-slate-600 via-gray-500 to-zinc-600", particleColor: "#94a3b8", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(148,163,184,0.2), transparent 70%)", badge: "Experi\u00eancia \u00danica", defaultTitle: "Bem-vindo", defaultCta: "Explorar", gradientColors: ["#475569", "#64748b", "#71717a"] },
};

/* ─── Spring configs ──────────────────── */
const springUp = { type: "spring" as const, stiffness: 180, damping: 22 };
const springBounce = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ─── Animated Gradient Mesh (Enhanced) ──────────── */
const AnimatedGradientMesh = ({ colors }: { colors: string[] }) => {
  const orbs = useMemo(() => [
    { id: 1, x: 15, y: 15, size: 600, color: colors[0], duration: 14 },
    { id: 2, x: 85, y: 25, size: 500, color: colors[1], duration: 18 },
    { id: 3, x: 45, y: 85, size: 450, color: colors[2], duration: 22 },
    { id: 4, x: 5, y: 55, size: 380, color: colors[0], duration: 25 },
    { id: 5, x: 70, y: 70, size: 320, color: colors[1], duration: 20 },
  ], [colors]);
  return (
    <div className="absolute inset-0 overflow-hidden">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            left: `${orb.x}%`, top: `${orb.y}%`, width: orb.size, height: orb.size,
            background: `radial-gradient(circle, ${orb.color}50, ${orb.color}18, transparent 70%)`,
            filter: "blur(50px)", transform: "translate(-50%, -50%)",
          }}
          animate={{ x: [0, 80, -50, 30, 0], y: [0, -60, 40, -25, 0], scale: [1, 1.3, 0.85, 1.15, 1] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

/* ─── Floating Particles (Enhanced) ────────────────────── */
const FloatingParticles = ({ color, count = 35 }: { color: string; count?: number }) => {
  const particles = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 2 + Math.random() * 5, duration: 6 + Math.random() * 10,
      delay: Math.random() * 5, opacity: 0.1 + Math.random() * 0.4,
    })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: color, boxShadow: `0 0 ${p.size * 2}px ${color}40` }}
          animate={{ y: [0, -40, 0, 25, 0], x: [0, 15, -12, 8, 0], opacity: [p.opacity, p.opacity * 1.8, p.opacity * 0.4, p.opacity], scale: [1, 1.3, 0.8, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

/* ─── Section Divider ──────────────────────── */
const SectionDivider = ({ color }: { color: string }) => (
  <div className="relative py-4">
    <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }} />
    <motion.div
      className="relative mx-auto w-16 h-1 rounded-full"
      style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }}
      animate={{ scaleX: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/* ─── Enhanced Stat Card ──────────────────── */
const EnhancedStatCard = ({ icon: Icon, label, value, sub, color, delay, suffix }: {
  icon: any; label: string; value: number; sub?: string; color: string; delay: number; suffix?: string;
}) => (
  <motion.div
    initial={{ y: 40, opacity: 0, scale: 0.85 }}
    whileInView={{ y: 0, opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ ...springUp, delay }}
    className="relative group"
  >
    <CardTilt maxTilt={8} scaleOnHover={1.04} borderGlow={color} className="rounded-2xl">
      <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm"
        style={{ boxShadow: `0 0 0px ${color}00` }}>
        {/* Animated top glow line */}
        <motion.div className="absolute top-0 inset-x-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
          animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="p-5 flex flex-col items-center text-center gap-2.5">
          <motion.div
            className="relative p-3.5 rounded-2xl"
            style={{ backgroundColor: `${color}12`, boxShadow: `0 0 20px ${color}10` }}
            whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.4 }}
          >
            <Icon className="h-6 w-6" style={{ color, filter: `drop-shadow(0 0 6px ${color}50)` }} />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ backgroundColor: `${color}08`, boxShadow: `0 0 30px ${color}15` }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <div>
            <p className="text-3xl font-black tabular-nums leading-none">
              <AnimatedNumber value={value} duration={1.4} className="font-black" />
              {suffix && <span className="text-lg ml-0.5 opacity-70">{suffix}</span>}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-semibold uppercase tracking-wider">{label}</p>
            {sub && <p className="text-[10px] mt-0.5 opacity-50 font-medium">{sub}</p>}
          </div>
        </div>
      </div>
    </CardTilt>
  </motion.div>
);

/* /* ─── Testimonials Data (Expanded) ─── */
const TESTIMONIALS: Array<{name: string; role: string; text: string; rating: number; featured: boolean}> = [
  { name: "Ana S.", role: "Participante frequente", text: "Os jogos ão super divertidos e os prémios ão reais! Ganhei duas vezes já. A plataforma é incrível e a equipa é muito atenciosa.", rating: 5, featured: true },
  { name: "Carlos M.", role: "Seguidor", text: "A melhor plataforma para quem gosta de se divertir e ganhar prémios. Recomendo a todos os meus amigos!", rating: 5, featured: false },
  { name: "Maria L.", role: "Vencedora de sorteio", text: "Nunca pensei que ia ganhar, mas recebi o meu prémio em menos de uma semana. Experiência fantástica!", rating: 4, featured: false },
  { name: "João P.", role: "Jogador assíduo", text: "As lives são o ponto alto da semana. Interação em tempo real e prémios verdadeiros. Não perco nenhuma!", rating: 5, featured: false },
  { name: "Sofia R.", role: "Nova participante", text: "Entrei por curiosidade e agora não consigo parar. Os jogos são viciantes de forma positiva!", rating: 5, featured: false },
];

const TestimonialCard = ({ t, index, primary, accent: accentColor }: { t: typeof TESTIMONIALS[0]; index: number; primary: string; accent?: string }) => (
  <motion.div
    initial={{ y: 30, opacity: 0 }}
    whileInView={{ y: 0, opacity: 1 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ ...springUp, delay: index * 0.08 }}
  >
    <CardTilt maxTilt={6} scaleOnHover={1.02} borderGlow={primary} className="rounded-2xl">
      <div className={`relative rounded-2xl border ${t.featured ? 'border-border/50' : 'border-border/30'} bg-card/50 backdrop-blur-sm overflow-hidden`}
        style={t.featured ? { boxShadow: `0 0 40px ${primary}10, 0 8px 32px rgba(0,0,0,0.2)` } : {}}>
        {t.featured && (
          <motion.div className="absolute top-0 inset-x-0 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${accentColor || '#fbbf24'}, ${primary})` }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
          />
        )}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.08 + i * 0.05 }}>
                  <Star className={`h-4 w-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} style={i < t.rating ? { filter: "drop-shadow(0 0 4px rgba(251,191,36,0.4))" } : {}} />
                </motion.div>
              ))}
            </div>
            {t.featured && (
              <motion.span
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >Destaque</motion.span>
            )}
          </div>
          <Quote className="h-5 w-5 mb-2 opacity-20" style={{ color: primary }} />
          <p className="text-sm text-muted-foreground leading-relaxed italic">“{t.text}”</p>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/30">
            <motion.div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${primary}, ${accentColor || primary}cc)` }}
              whileHover={{ scale: 1.1 }}
            >{t.name.charAt(0)}</motion.div>
            <div>
              <p className="font-bold text-sm">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">{t.role}</p>
            </div>
            <BadgeCheck className="h-4 w-4 ml-auto" style={{ color: primary }} />
          </div>
        </div>
      </div>
    </CardTilt>
  </motion.div>
);

/* ─── Game Type Icon (no emoji) ─────────────────── */
const GameTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "wheel": return <Sparkles className="h-6 w-6" />;
    case "millionaire": return <Trophy className="h-6 w-6" />;
    default: return <Target className="h-6 w-6" />;
  }
};

const GameTypeLabel = ({ type }: { type: string }) => {
  switch (type) {
    case "wheel": return <span>Roda de Pr\u00e9mios</span>;
    case "millionaire": return <span>Quem Quer Ser Milion\u00e1rio</span>;
    default: return <span>Roleta de Desafios</span>;
  }
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const sb: any = supabase;

const SOCIAL_ICONS: Record<string, any> = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube, tiktok: Play, twitter: Twitter, x: Twitter, whatsapp: Phone, website: Globe,
};

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const CompanyPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { formatMoney } = useCurrency();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [products, setProducts] = useState<PrestacaoProduct[]>([]);
  const [rankings, setRankings] = useState<ContestRanking[]>([]);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState("games");
  const [liked, setLiked] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  /* Mouse parallax for hero */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), { stiffness: 80, damping: 30 });
  const parallaxY = useSpring(useTransform(mouseY, [0, 1], [-10, 10]), { stiffness: 80, damping: 30 });
  const handleHeroMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  /* Section refs for staggered reveals */
  const statsRef = useRef<HTMLDivElement>(null);
  const socialProofRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });
  const socialProofInView = useInView(socialProofRef, { once: true, margin: "-80px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  /* ─── Data Loading ──────────────────── */
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        let bizId = id;
        if (!isUuid(id)) {
          const { data: bySlug } = await sb.from("profiles_public").select("user_id").eq("slug", id).maybeSingle();
          if (!bySlug) { setCompany(null); setLoading(false); return; }
          bizId = bySlug.user_id;
        }
        setResolvedId(bizId);

        const [profileRes, brandRes, wheelsRes, milsRes, roulettesRes, livesRes, rafflesRes, contestsRes, productsRes] = await Promise.all([
          sb.from("profiles_public").select("*").eq("user_id", bizId).single(),
          sb.from("company_branding").select("*").eq("user_id", bizId).single(),
          sb.from("spin_wheel_games").select("*").eq("business_user_id", bizId).order("created_at", { ascending: false }),
          sb.from("millionaire_games").select("*").eq("business_user_id", bizId).order("created_at", { ascending: false }),
          sb.from("challenge_roulettes").select("id, title, is_published, created_at").eq("business_user_id", bizId).order("created_at", { ascending: false }).limit(20),
          sb.from("scheduled_lives").select("*").eq("business_user_id", bizId).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20),
          sb.from("raffles").select("*").eq("business_user_id", bizId).in("status", ["active", "completed", "drawn"]).order("created_at", { ascending: false }),
          sb.from("contests").select("*").eq("created_by", bizId).in("status", ["active", "voting", "completed"]).order("created_at", { ascending: false }),
          sb.from("prestacao_products").select("*").eq("business_user_id", bizId).eq("status", "active").order("created_at", { ascending: false }),
        ]);
        if (profileRes.data) {
          const p = profileRes.data;
          setCompany({ user_id: p.user_id, display_name: p.display_name, company_name: p.company_name, avatar_url: p.avatar_url, is_verified: p.is_verified, city: p.city, province: p.province, created_at: p.created_at, phone: p.phone });
        }
        if (brandRes.data) setBranding(brandRes.data as any);
        const allGames: GameItem[] = [];
        (wheelsRes.data || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: "wheel", is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (milsRes.data || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || "Quem Quer Ser Milion\u00e1rio", type: "millionaire", is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        (roulettesRes.data || []).forEach((r: any) => allGames.push({ id: r.id, name: r.title || "Roleta de Desafios", type: "custom", is_published: r.is_published, created_at: r.created_at }));
        setGames(allGames);
        setProducts((productsRes.data as PrestacaoProduct[]) || []);
        if (livesRes.data) {
          setSessions((livesRes.data || []).map((l: any) => ({ code: l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(), ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0, players_count: 0, games_count: 0, winners: [] })));
        }
        setRaffles((rafflesRes.data as Raffle[]) || []);
        setContests((contestsRes.data as Contest[]) || []);

        const rafflesData = (rafflesRes.data as Raffle[]) || [];
        const contestsData = (contestsRes.data as Contest[]) || [];
        const finishedIds = rafflesData.filter(r => r.status === "completed" || r.status === "drawn").map(r => r.id);
        if (finishedIds.length > 0) {
          const { data: winnerRows } = await sb.from("participants").select("raffle_id, ticket_number, user_id").in("raffle_id", finishedIds).eq("status", "winner");
          if (winnerRows && winnerRows.length > 0) {
            const raffleMap = new Map(rafflesData.map((r: any) => [r.id, r]));
            const userIds = [...new Set(winnerRows.map((w: any) => w.user_id))];
            const { data: profs } = await sb.from("profiles_public").select("user_id, display_name").in("user_id", userIds);
            const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.display_name]));
            setWinners(winnerRows.map((w: any) => {
              const r = raffleMap.get(w.raffle_id);
              return { raffle_title: r?.title || "Sorteio", prize_title: r?.prize_title || "Pr\u00e9mio", display_name: profMap.get(w.user_id) || null, slug: r?.slug || null };
            }));
          }
        }

        const liveContests = contestsData.filter(c => c.status === "active" || c.status === "voting");
        if (liveContests.length > 0) {
          const rankResults: ContestRanking[] = [];
          await Promise.all(liveContests.map(async (c) => {
            const orderCol = c.evaluation_type === "views" ? "views_count" : "votes_count";
            const { data } = await sb.from("contest_submissions").select("id, participant_name, photo_url, votes_count, views_count").eq("contest_id", c.id).eq("status", "approved").order(orderCol, { ascending: false }).limit(3);
            rankResults.push({
              contest_id: c.id, contest_title: c.title, evaluation_type: c.evaluation_type, status: c.status,
              top: (data || []).map((s: any) => ({ submission_id: s.id, name: s.participant_name, photo_url: s.photo_url, score: c.evaluation_type === "views" ? s.views_count : s.votes_count })),
            });
          }));
          setRankings(rankResults.filter(r => r.top.length > 0));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  /* ─── Player Join ──────────────────── */
  const joinGame = useCallback(() => {
    if (!playerName.trim()) return;
    setHasJoined(true);
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (!existing.includes(playerName.trim())) { existing.push(playerName.trim()); localStorage.setItem(key, JSON.stringify(existing)); }
      toast({ title: `Bem-vindo, ${playerName.trim()}!`, description: "Agora podes participar nos jogos desta empresa." });
    } catch {}
  }, [playerName, id, toast]);

  useEffect(() => {
    if (!id) return;
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (existing.length > 0) { setPlayerName(existing[0]); setHasJoined(true); }
    } catch {}
  }, [id]);

  const copyLink = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  /* ─── Derived Values ──────────────────── */
  const primary = branding?.primary_color || "#fbbf24";
  const secondary = branding?.secondary_color || "#3b82f6";
  const accent = branding?.accent_color || "#8b5cf6";
  const bgColor = branding?.background_color || undefined;
  const companyName = company?.company_name || company?.display_name || "Empresa";
  const nicheKey = branding?.niche || "entertainment";
  const niche = NICHE_META[nicheKey] || NICHE_META.entertainment;
  const NicheIcon = niche.icon;
  const totalGames = games.length;
  const publishedGames = games.filter((g) => g.is_published || g.is_active).length;
  const totalLives = sessions.length;
  const totalRaffles = raffles.length;
  const totalWinners = winners.length;
  const totalContests = contests.length;
  const activeRaffles = raffles.filter(r => r.status === "active").length;
  const totalSold = raffles.reduce((acc, r) => acc + (r.sold_tickets || 0), 0);
  const heroTitle = branding?.hero_title || niche.defaultTitle;
  const heroSubtitle = branding?.hero_subtitle || branding?.company_slogan || `Descobre os jogos e lives de ${companyName}`;
  const ctaText = branding?.hero_cta_text || niche.defaultCta;
  const ctaLink = branding?.hero_cta_link || "/lives";
  const aboutText = branding?.about_text || null;
  const socialLinks = branding?.social_links || {};
  const layout = branding?.homepage_layout || "showcase";
  const ogImage = branding?.company_logo_url || company?.avatar_url || undefined;

  useSEO({
    title: `${companyName} \u2014 Jogos, Lives e Sorteios | Bateu`,
    description: branding?.about_text
      ? branding.about_text.slice(0, 160)
      : `Descobre os jogos interativos, sorteios, lives e pr\u00e9mios de ${companyName} na Bateu. Entra e participa!`,
    canonicalPath: location.pathname,
    ogType: "profile",
    ogImage,
  });

  /* ─── Loading ──────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgColor ? { backgroundColor: bgColor } : {}}>
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <NicheIcon className="h-12 w-12" style={{ color: primary }} />
          </motion.div>
          <motion.p className="text-sm text-muted-foreground font-medium" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
            A carregar perfil...
          </motion.p>
        </div>
      </div>
    );
  }

  /* ─── Not Found ─────────────────────── */
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-black font-display">Empresa n\u00e3o encontrada</h2>
          <p className="text-sm text-muted-foreground mt-2">Este perfil n\u00e3o existe ou foi removido.</p>
          <Link to="/empresas" className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: primary, color: "#000" }}>
            <ArrowRight className="h-4 w-4" /> Ver todas as empresas
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen relative" style={bgColor ? { backgroundColor: bgColor } : {}}>

      {branding?.background_image_url && (
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: `url(${branding.background_image_url})` }} />
      )}

      {/* ═══ HERO ═══════════════════════════════ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }} className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden">

        <div className={`absolute inset-0 bg-gradient-to-br ${niche.gradient} opacity-90`} />
        <AnimatedGradientMesh colors={niche.gradientColors} />
        <div className="absolute inset-0" style={{ background: niche.heroGlow }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%, ${secondary}30, transparent 50%)` }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        {/* Animated scan line */}
        <motion.div
          className="absolute inset-x-0 h-[2px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${primary}40, transparent)` }}
          animate={{ y: ["-10px", "100vh"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        <FloatingParticles color={niche.particleColor} count={35} />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center">

            {/* Badge */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.1 }} className="mb-8">
              <motion.span
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest"
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                transition={springBounce}
              >
                <NicheIcon className="h-3.5 w-3.5" />
                {branding?.featured_badge || niche.badge}
                {company.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
              </motion.span>
            </motion.div>

            {/* Avatar + Name */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.2 }} className="mb-8">
              <div className="inline-flex flex-col items-center gap-5">
                <motion.div className="relative" whileHover={{ scale: 1.08 }} transition={springBounce}>
                  <div className="h-28 w-28 md:h-36 md:w-36 rounded-[1.75rem] border-4 border-white/30 shadow-2xl overflow-hidden backdrop-blur-sm bg-white/10">
                    {(branding?.company_logo_url || company.avatar_url) ? (
                      <img src={branding?.company_logo_url || company.avatar_url || ""} alt={companyName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white">
                        <span className="text-5xl md:text-6xl font-black">{companyName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <motion.div className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-lg" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <NicheIcon className="h-4 w-4" style={{ color: primary }} />
                  </motion.div>
                  {company.is_verified && (
                    <motion.div className="absolute -inset-2 rounded-[2rem] border-2 border-emerald-400/40" animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} />
                  )}
                </motion.div>
                <div>
                  <h1 className="text-4xl md:text-7xl font-black font-display text-white drop-shadow-lg tracking-tight">{companyName}</h1>
                  {branding?.company_slogan && (
                    <motion.p className="text-white/70 text-sm md:text-lg mt-3 font-medium" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                      {branding.company_slogan}
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Shimmer Hero Title */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.35 }} className="mb-4">
              <ShimmerText className="text-2xl md:text-4xl font-black leading-tight" colors={["#ffffff", "rgba(255,255,255,0.7)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)", "#ffffff"]} speed={6}>
                {heroTitle}
              </ShimmerText>
            </motion.div>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.45 }} className="text-sm md:text-base text-white/60 mb-10 max-w-lg mx-auto leading-relaxed">
              {heroSubtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.55 }} className="flex flex-wrap items-center justify-center gap-3">
              <GlowPulse glowColor={primary} intensity={0.6} speed={2.5} borderRadius="9999px">
                <Link to={ctaLink} className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-black text-sm shadow-2xl hover:shadow-white/30 transition-all duration-300 hover:scale-105">
                  <Play className="h-4 w-4 group-hover:scale-110 transition-transform" /> {ctaText}
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
              </GlowPulse>
              <motion.button onClick={() => setLiked(!liked)} className="inline-flex items-center gap-2 px-5 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all" whileTap={{ scale: 0.95 }}>
                <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-rose-400 text-rose-400" : ""}`} />
                </motion.div>
                {liked ? "Seguindo" : "Seguir"}
              </motion.button>
              <motion.button onClick={copyLink} className="inline-flex items-center gap-2 px-5 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all" whileTap={{ scale: 0.95 }}>
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copiado!" : "Partilhar"}
              </motion.button>
            </motion.div>

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.65 }} className="flex items-center justify-center gap-3 mt-10">
                {Object.entries(socialLinks).map(([platform, url]) => {
                  const SocIcon = SOCIAL_ICONS[platform.toLowerCase()];
                  return (
                    <motion.a key={platform} href={url as string} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-all" title={platform} whileHover={{ scale: 1.15, y: -3 }} whileTap={{ scale: 0.95 }}>
                      {SocIcon ? <SocIcon className="h-4 w-4" /> : <span className="text-xs font-bold uppercase">{platform.slice(0, 2)}</span>}
                    </motion.a>
                  );
                })}
              </motion.div>
            )}

            {/* Meta info */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap items-center justify-center gap-4 mt-5 text-white/40 text-xs">
              {(company.city || company.province) && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {[company.city, company.province].filter(Boolean).join(", ")}</span>
              )}
              {company.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {company.phone}</span>}
              {company.created_at && (
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Membro desde {new Date(company.created_at).toLocaleDateString("pt-PT", { month: "short", year: "numeric" })}</span>
              )}
            </motion.div>
          </div>
        </div>

        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-7 h-11 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60" animate={{ y: [0, 14, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ STATS ══════════════════════════════ */}
      <div className="relative z-10 -mt-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...springUp, delay: 0.1 }}
            className="rounded-3xl border border-border/30 bg-card/70 backdrop-blur-xl p-3 md:p-5 shadow-2xl shadow-black/10"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06))" }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <EnhancedStatCard icon={Gamepad2} label="Jogos" value={totalGames} sub={`${publishedGames} ativos`} color={primary} delay={0} />
              <EnhancedStatCard icon={Ticket} label="Sorteios" value={totalRaffles} sub={`${activeRaffles} abertos`} color={secondary} delay={0.05} />
              <EnhancedStatCard icon={Trophy} label="Vencedores" value={totalWinners} color={accent} delay={0.1} />
              <EnhancedStatCard icon={Radio} label="Lives" value={totalLives} color="#10b981" delay={0.15} />
              <EnhancedStatCard icon={ShoppingBag} label="Prest\u00e7\u00f5es" value={products.length} color="#f59e0b" delay={0.2} />
              <EnhancedStatCard icon={Flame} label="Bilhetes" value={totalSold} color="#ef4444" delay={0.25} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ JOIN BANNER ═════════════════════════ */}
      <div className="container mx-auto px-4 mt-10">
        <AnimatePresence mode="wait">
          {!hasJoined ? (
            <motion.div key="join" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="relative overflow-hidden rounded-3xl border-2 p-6 md:p-8"
              style={{ borderColor: `${primary}30`, background: `linear-gradient(135deg, ${primary}08, ${accent}04)` }}
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 90% 10%, ${primary}08, transparent 50%)` }} />
              <div className="relative flex flex-col md:flex-row items-center gap-6">
                <motion.div className="p-3 rounded-2xl" style={{ backgroundColor: `${primary}15` }} whileHover={{ scale: 1.1, rotate: 5 }}>
                  <NicheIcon className="h-8 w-8" style={{ color: primary }} />
                </motion.div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-black">Junta-te aos jogos!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Coloca o teu nome para participar nos jogos e ver o teu hist\u00f3rico</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Input placeholder="O teu nome..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinGame()} className="flex-1 md:w-64 rounded-full" />
                  <Button onClick={joinGame} disabled={!playerName.trim()} className="rounded-full px-6 font-bold" style={{ backgroundColor: primary, color: "#000" }}>
                    Entrar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="joined" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ borderColor: `${primary}20`, background: `${primary}05` }}>
              <motion.div className="h-12 w-12 rounded-full flex items-center justify-center font-black text-xl" style={{ backgroundColor: primary, color: "#000" }} animate={{ boxShadow: [`0 0 0px ${primary}00`, `0 0 20px ${primary}40`, `0 0 0px ${primary}00`] }} transition={{ duration: 2, repeat: Infinity }}>
                {playerName.charAt(0).toUpperCase()}
              </motion.div>
              <div className="flex-1">
                <p className="font-bold">Ol\u00e1, {playerName}!</p>
                <p className="text-xs text-muted-foreground">Pronto para jogar em nome de {companyName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setHasJoined(false); setPlayerName(""); }}>Trocar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ ABOUT ══════════════════════════════ */}
      {aboutText && (
        <div className="container mx-auto px-4 mt-10">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={springUp} className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <motion.div className="p-2 rounded-xl" style={{ backgroundColor: `${primary}15` }} whileHover={{ rotate: 10 }}>
                <Globe className="h-5 w-5" style={{ color: primary }} />
              </motion.div>
              <h3 className="font-bold text-lg">Sobre {companyName}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{aboutText}</p>
          </motion.div>
        </div>
      )}

      {/* ═══ SOCIAL PROOF ═════════════════════════ */}
      <div className="container mx-auto px-4 mt-12">
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={springUp}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-2">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, zIndex: 3 - i }}>
                  {t.name.charAt(0)}
                </div>
              ))}
            </div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4" style={{ color: primary }} />
                Aprovado pela comunidade
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">({totalWinners + TESTIMONIALS.length} opini\u00f5es)</span>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} t={t} index={i} primary={primary} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══ TRUST BADGES ═════════════════════════ */}
      <div className="container mx-auto px-4 mt-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={springUp}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Shield, label: "Plataforma segura", desc: "Dados protegidos" },
            { icon: Trophy, label: "Pr\u00e9mios reais", desc: "Entregas garantidas" },
            { icon: Zap, label: "Jogos em tempo real", desc: "Sem atrasos" },
            { icon: Users, label: "Comunidade ativa", desc: `${totalGames + totalRaffles} atividades` },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-3 p-4 rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm"
              whileHover={{ borderColor: `${primary}40`, y: -2 }}
              initial={{ y: 15, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ ...springUp, delay: i * 0.06 }}
            >
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${primary}10` }}>
                <item.icon className="h-5 w-5" style={{ color: primary }} />
              </div>
              <div>
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ═══ TABS CONTENT ════════════════════════ */}
      <div className="container mx-auto px-4 mt-12 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-12 rounded-2xl bg-muted/50 p-1 overflow-x-auto">
            <TabsTrigger value="games" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all" style={{ "--tw-shadow-color": `${primary}30` } as any}>
              <Gamepad2 className="h-4 w-4" /> Jogos
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{totalGames}</span>
            </TabsTrigger>
            <TabsTrigger value="raffles" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all" style={{ "--tw-shadow-color": `${secondary}30` } as any}>
              <Ticket className="h-4 w-4" /> Sorteios
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{totalRaffles}</span>
            </TabsTrigger>
            <TabsTrigger value="lives" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all" style={{ "--tw-shadow-color": `${accent}30` } as any}>
              <Radio className="h-4 w-4" /> Lives
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{totalLives}</span>
            </TabsTrigger>
            <TabsTrigger value="contests" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all">
              <GiftIcon className="h-4 w-4" /> Concursos
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{contests.length}</span>
            </TabsTrigger>
            <TabsTrigger value="prestacoes" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all">
              <ShoppingBag className="h-4 w-4" /> Presta\u00e7\u00f5es
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{products.length}</span>
            </TabsTrigger>
            <TabsTrigger value="winners" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all">
              <Crown className="h-4 w-4" /> Vencedores
              <span className="hidden sm:inline ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">{totalWinners}</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all">
              <Clock className="h-4 w-4" /> Actividade
            </TabsTrigger>
          </TabsList>

          {/* GAMES TAB */}
          <TabsContent value="games" className="mt-6">
            {games.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game, i) => (
                  <motion.div key={game.id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <HolographicCard glowColor={primary} intensity="low" className="rounded-2xl border-border/40 hover:border-border/80 transition-all duration-300 overflow-hidden cursor-pointer">
                      <div className="h-2" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <motion.div
                            className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}15)` }}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.4 }}
                          >
                            <GameTypeIcon type={game.type} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{game.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5"><GameTypeLabel type={game.type} /></p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold ${game.is_published || game.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {game.is_published || game.is_active ? "Ativo" : "Rascunho"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{game.type === "wheel" ? (game.segment_count ? `${game.segment_count} segmentos` : "Configurado") : game.type === "millionaire" ? "Perguntas & Pr\u00e9mios" : "Desafios personalizados"}</span>
                          <span>{new Date(game.created_at).toLocaleDateString("pt-PT")}</span>
                        </div>
                      </div>
                    </HolographicCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
                  <Gamepad2 className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum jogo configurado ainda</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Esta empresa ainda n\u00e3o adicionou jogos</p>
              </motion.div>
            )}
          </TabsContent>

          {/* LIVES TAB */}
          <TabsContent value="lives" className="mt-6">
            {resolvedId ? <BusinessLivesTab businessUserId={resolvedId} /> : (
              <div className="text-center py-16">
                <Radio className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhuma live realizada ainda</p>
              </div>
            )}
          </TabsContent>

          {/* RAFFLES TAB */}
          <TabsContent value="raffles" className="mt-6">
            {raffles.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {raffles.map((r, i) => (
                  <motion.div key={r.id} initial={{ y: 15, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <HolographicCard glowColor={primary} intensity="low" className="rounded-2xl border-border/40 overflow-hidden cursor-pointer">
                      {r.image_url && <div className="h-28 bg-muted"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm leading-tight line-clamp-2">{r.title}</h4>
                          <Badge className="shrink-0 text-[9px] font-bold" style={{ backgroundColor: r.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: r.status === "active" ? "#22c55e" : "hsl(var(--muted-foreground))" }}>
                            {r.status === "active" ? "Aberto" : r.status === "drawn" ? "Sorteado" : "Encerrado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{r.prize_title}</p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                          <span>{formatMoney(r.ticket_price)}/bilhete</span>
                          <span>{r.sold_tickets}/{r.total_tickets} vendidos</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min((r.sold_tickets / r.total_tickets) * 100, 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                        {r.slug && (
                          <Link to={`/raffle/${r.slug}`} className="mt-3 block w-full text-center py-2 rounded-xl text-xs font-bold transition-colors" style={{ backgroundColor: `${primary}12`, color: primary }}>
                            Ver Sorteio <ArrowRight className="h-3 w-3 inline ml-1" />
                          </Link>
                        )}
                      </div>
                    </HolographicCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Ticket className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum sorteio disponivel</p>
              </div>
            )}
            {winners.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-base flex items-center gap-2 mb-4"><Trophy className="h-4 w-4" style={{ color: "#fbbf24" }} /> Vencedores Recentes</h3>
                <div className="space-y-2">
                  {winners.slice(0, 10).map((w, i) => (
                    <motion.div key={i} initial={{ x: -10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/30">
                      <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 font-black text-xs">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{w.display_name || "Participante"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{w.prize_title} \u2014 {w.raffle_title}</p>
                      </div>
                      {w.slug && <Link to={`/raffle/${w.slug}`} className="text-[10px] font-bold" style={{ color: primary }}>Ver</Link>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CONTESTS TAB */}
          <TabsContent value="contests" className="mt-6">
            {contests.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contests.map((c, i) => (
                  <motion.div key={c.id} initial={{ y: 15, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <HolographicCard glowColor={accent} intensity="low" className="rounded-2xl border-border/40 overflow-hidden cursor-pointer">
                      {c.image_url && <div className="h-28 bg-muted"><img src={c.image_url} alt={c.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm leading-tight line-clamp-2">{c.title}</h4>
                          <Badge className="shrink-0 text-[9px] font-bold" style={{ backgroundColor: c.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: c.status === "active" ? "#22c55e" : "hsl(var(--muted-foreground))" }}>
                            {c.status === "active" ? "Ativo" : c.status === "ended" ? "Encerrado" : c.status}
                          </Badge>
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>}
                        {c.prize_description && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: primary }}>
                            <Gift className="h-3 w-3" /> <span className="line-clamp-1">{c.prize_description}</span>
                          </div>
                        )}
                        {c.end_date && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" /> Termina {new Date(c.end_date).toLocaleDateString("pt-PT")}
                          </div>
                        )}
                        {c.id && (
                          <Link to={`/concursos/${c.id}`} className="mt-3 block w-full text-center py-2 rounded-xl text-xs font-bold transition-colors" style={{ backgroundColor: `${primary}12`, color: primary }}>
                            Ver Concurso <ArrowRight className="h-3 w-3 inline ml-1" />
                          </Link>
                        )}
                      </div>
                    </HolographicCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Megaphone className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum concurso disponivel</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Esta empresa ainda n\u00e3o criou concursos</p>
              </div>
            )}
          </TabsContent>

          {/* PRESTACOES TAB */}
          <TabsContent value="prestacoes" className="mt-6">
            {products.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p, i) => (
                  <motion.div key={p.id} initial={{ y: 15, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <HolographicCard glowColor="#f59e0b" intensity="low" className="rounded-2xl border-border/40 overflow-hidden cursor-pointer">
                      {p.images && Array.isArray(p.images) && p.images.length > 0 && (
                        <div className="h-28 bg-muted"><img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" /></div>
                      )}
                      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }} />
                      <div className="p-4">
                        <h4 className="font-bold text-sm leading-tight line-clamp-2">{p.title}</h4>
                        {(p.brand || p.model) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{[p.brand, p.model].filter(Boolean).join(" ")}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-sm font-black" style={{ color: primary }}>{formatMoney(p.total_price)}</p>
                          <span className="text-[10px] text-muted-foreground">at\u00e9 {p.max_months}x</span>
                        </div>
                        {(p.city || p.province) && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />{[p.city, p.province].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                    </HolographicCard>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum produto disponivel</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Esta empresa ainda n\u00e3o adicionou presta\u00e7\u00f5es</p>
              </div>
            )}
          </TabsContent>

          {/* WINNERS TAB */}
          <TabsContent value="winners" className="mt-6">
            {winners.length > 0 ? (
              <div className="space-y-3">
                {winners.map((w, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...springUp, delay: i * 0.04 }}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-card/30"
                  >
                    <motion.div
                      className="h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "#fff" }}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                    >
                      {w.display_name?.charAt(0).toUpperCase() || "?"}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{w.display_name || "Participante"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{w.prize_title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className="text-[9px] font-bold" style={{ backgroundColor: `${primary}15`, color: primary }}>{w.raffle_title}</Badge>
                      {w.slug && (
                        <Link to={`/raffle/${w.slug}`} className="block mt-1 text-[10px] font-bold" style={{ color: primary }}>
                          Ver <ArrowRight className="h-3 w-3 inline" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Crown className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Ainda n\u00e3o h\u00e1 vencedores</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Participa nos sorteios para poderes ganhar</p>
              </div>
            )}
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity" className="mt-6">
            {resolvedId ? <BusinessTimeline businessUserId={resolvedId} /> : (
              <div className="text-center py-16">
                <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Sem atividade ainda</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ CONTACT / CTA SECTION ══════════════════ */}
      <div className="container mx-auto px-4 mt-4 pb-16">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={springUp}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{
            background: `linear-gradient(135deg, ${primary}12, ${secondary}08, ${accent}06)`,
            border: `1px solid ${primary}25`,
          }}
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ background: `radial-gradient(circle, ${primary}10, transparent 70%)` }} />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full" style={{ background: `radial-gradient(circle, ${accent}08, transparent 70%)` }} />
          </div>

          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <motion.div className="inline-flex p-3 rounded-2xl mb-4" style={{ backgroundColor: `${primary}15` }} whileHover={{ scale: 1.1 }}>
                <Rocket className="h-8 w-8" style={{ color: primary }} />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-black">Pronto para jogar?</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Entra na pr\u00f3xima live de {companyName}, participa nos sorteios e concursos, e ganha pr\u00e9mios incr\u00edveis.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <GlowPulse glowColor={primary} intensity={0.5} speed={2.5} borderRadius="9999px">
                <Link
                  to={ctaLink}
                  className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-black text-white font-black text-sm hover:bg-black/90 transition-all duration-300 hover:scale-105"
                >
                  <Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  {ctaText}
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
              </GlowPulse>
              {company.phone && (
                <motion.a
                  href={`tel:${company.phone}`}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full border font-bold text-sm transition-all hover:scale-105"
                  style={{ borderColor: `${primary}40`, color: primary }}
                  whileHover={{ backgroundColor: `${primary}08` }}
                >
                  <Phone className="h-4 w-4" />
                  Contactar
                </motion.a>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};


export default CompanyPublicProfile;
