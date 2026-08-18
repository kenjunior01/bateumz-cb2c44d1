import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2, ExternalLink, Gamepad2, Trophy, Users, Clock, Flame,
  Calendar, Star, Zap, Award, ChevronRight, MapPin, Globe,
  CheckCircle2, Copy, Check, ArrowRight, Heart, Play,
  Music, UtensilsCrossed, Dumbbell, GraduationCap, ShoppingBag,
  Palette, Mic2, Sparkles, TrendingUp, Eye, Crown, Radio,
  Gift, Target, BarChart3, Ticket, Building2, ArrowLeft
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

/* ─── Types ──────────────────────────────────────────── */
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

/* ─── Niche System ──────────────────────────────────── */
type NicheId = "entertainment" | "gaming" | "restaurant" | "retail" | "education" | "fitness" | "music" | "fashion" | "tech" | "food" | "beauty" | "sports" | "casino" | "charity" | "other";

const NICHE_META: Record<string, {
  icon: any; label: string; gradient: string; particleColor: string;
  heroGlow: string; badge: string; defaultTitle: string; defaultCta: string;
}> = {
  entertainment: { icon: Sparkles, label: "Entretenimento", gradient: "from-violet-600 via-fuchsia-500 to-pink-500", particleColor: "#d946ef", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(217,70,239,0.25), transparent 70%)", badge: "Show de Entretenimento", defaultTitle: "Vem divertir-te connosco", defaultCta: "Entrar no Jogo" },
  gaming: { icon: Gamepad2, label: "Gaming", gradient: "from-emerald-600 via-cyan-500 to-blue-500", particleColor: "#06b6d4", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.25), transparent 70%)", badge: "Gaming Zone", defaultTitle: "Arena de Jogos", defaultCta: "Começar a Jogar" },
  restaurant: { icon: UtensilsCrossed, label: "Restauração", gradient: "from-orange-600 via-red-500 to-rose-500", particleColor: "#f97316", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.25), transparent 70%)", badge: "Sabor & Diversão", defaultTitle: "Joga e Ganha Prémios", defaultCta: "Ver Cardápio de Jogos" },
  retail: { icon: ShoppingBag, label: "Retalho", gradient: "from-blue-600 via-indigo-500 to-violet-500", particleColor: "#6366f1", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25), transparent 70%)", badge: "Loja Interativa", defaultTitle: "Descontos exclusivos", defaultCta: "Aproveitar Agora" },
  education: { icon: GraduationCap, label: "Educação", gradient: "from-teal-600 via-emerald-500 to-green-500", particleColor: "#14b8a6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.25), transparent 70%)", badge: "Aprende & Joga", defaultTitle: "Aprende brincando", defaultCta: "Começar a Aprender" },
  fitness: { icon: Dumbbell, label: "Fitness", gradient: "from-lime-500 via-green-500 to-emerald-600", particleColor: "#22c55e", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.25), transparent 70%)", badge: "Desafio Fitness", defaultTitle: "Desafia os teus limites", defaultCta: "Iniciar Desafio" },
  music: { icon: Music, label: "Música", gradient: "from-purple-600 via-pink-500 to-rose-500", particleColor: "#ec4899", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.25), transparent 70%)", badge: "Vibe Musical", defaultTitle: "Sente o ritmo", defaultCta: "Tocar Agora" },
  fashion: { icon: Palette, label: "Moda", gradient: "from-pink-500 via-fuchsia-500 to-purple-600", particleColor: "#c026d3", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(192,38,211,0.25), transparent 70%)", badge: "Estilo & Diversão", defaultTitle: "Desfiles de estilo", defaultCta: "Explorar Coleção" },
  tech: { icon: Zap, label: "Tecnologia", gradient: "from-cyan-500 via-blue-600 to-indigo-600", particleColor: "#0ea5e9", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.25), transparent 70%)", badge: "Tech Hub", defaultTitle: "Inovação em tempo real", defaultCta: "Explorar" },
  food: { icon: UtensilsCrossed, label: "Food & Bebidas", gradient: "from-amber-500 via-orange-500 to-red-500", particleColor: "#f59e0b", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.25), transparent 70%)", badge: "Sabores & Jogos", defaultTitle: "Prova a tua sorte", defaultCta: "Degustar & Jogar" },
  beauty: { icon: Star, label: "Beleza", gradient: "from-rose-400 via-pink-500 to-fuchsia-500", particleColor: "#f472b6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,114,182,0.25), transparent 70%)", badge: "Beleza & Sorte", defaultTitle: "Brilha & Ganha", defaultCta: "Descobrir" },
  sports: { icon: Target, label: "Desporto", gradient: "from-green-500 via-emerald-600 to-teal-600", particleColor: "#10b981", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.25), transparent 70%)", badge: "Zona Desportiva", defaultTitle: "Compete em tempo real", defaultCta: "Entrar no Jogo" },
  casino: { icon: Crown, label: "Casino", gradient: "from-yellow-500 via-amber-500 to-orange-600", particleColor: "#eab308", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.3), transparent 70%)", badge: "Casino Premium", defaultTitle: "A sorte sorri-te", defaultCta: "Jogar Agora" },
  charity: { icon: Heart, label: "Solidariedade", gradient: "from-rose-500 via-pink-500 to-red-500", particleColor: "#f43f5e", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.25), transparent 70%)", badge: "Causa Solidária", defaultTitle: "Joga por uma causa", defaultCta: "Apoiar Agora" },
  other: { icon: Sparkles, label: "Personalizado", gradient: "from-slate-600 via-gray-500 to-zinc-600", particleColor: "#94a3b8", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(148,163,184,0.2), transparent 70%)", badge: "Experiência Única", defaultTitle: "Bem-vindo", defaultCta: "Explorar" },
};

/* ─── Spring configs (outside JSX) ──────────────────── */
const springUp = { type: "spring" as const, stiffness: 180, damping: 22 };
const springBounce = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ─── Floating Particles Component ──────────────────── */
const FloatingParticles = ({ color, count = 30 }: { color: string; count?: number }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.35,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 10, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity * 0.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

/* ─── Stat Card ─────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color, delay }: { icon: any; label: string; value: string | number; sub?: string; color: string; delay: number }) => (
  <motion.div
    initial={{ y: 30, opacity: 0, scale: 0.9 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    transition={{ ...springUp, delay }}
    className="relative group"
  >
    <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${color}40, transparent)` }} />
    <Card className="relative border-border/40 bg-card/60 backdrop-blur-sm hover:border-border/80 transition-all duration-300 overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="relative p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ backgroundColor: `${color}10` }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wider">{label}</p>
          {sub && <p className="text-[9px] mt-0.5 opacity-60">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
const sb: any = supabase;

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
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  /* ─── Slug Resolution + Data Loading ─────────────── */
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        let bizId = id;
        if (!isUuid(id)) {
          const { data: bySlug } = await sb
            .from("profiles_public")
            .select("user_id")
            .eq("slug", id)
            .maybeSingle();
          if (!bySlug) {
            setCompany(null);
            setLoading(false);
            return;
          }
          bizId = bySlug.user_id;
        }
        setResolvedId(bizId);

        const [profileRes, brandRes, wheelsRes, milsRes, livesRes, rafflesRes, contestsRes] = await Promise.all([
          sb.from("profiles_public").select("*").eq("user_id", bizId).single(),
          sb.from("company_branding").select("*").eq("user_id", bizId).single(),
          sb.from("spin_wheel_games").select("*").eq("business_user_id", bizId).order("created_at", { ascending: false }),
          sb.from("millionaire_games").select("*").eq("business_user_id", bizId).order("created_at", { ascending: false }),
          sb.from("scheduled_lives").select("*").eq("business_user_id", bizId).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20),
          sb.from("raffles").select("*").eq("business_user_id", bizId).in("status", ["active", "completed", "drawn"]).order("created_at", { ascending: false }),
          sb.from("contests").select("*").eq("created_by", bizId).in("status", ["active", "voting", "completed"]).order("created_at", { ascending: false }),
        ]);
        if (profileRes.data) {
          const p = profileRes.data;
          setCompany({ user_id: p.user_id, display_name: p.display_name, company_name: p.company_name, avatar_url: p.avatar_url, is_verified: p.is_verified, city: p.city, province: p.province, created_at: p.created_at, phone: p.phone });
        }
        if (brandRes.data) setBranding(brandRes.data as any);
        const allGames: GameItem[] = [];
        (wheelsRes.data || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: "wheel", is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (milsRes.data || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || "Quem Quer Ser Milionário", type: "millionaire", is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
        if (livesRes.data) {
          setSessions((livesRes.data || []).map((l: any) => ({ code: l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(), ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0, players_count: 0, games_count: 0, winners: [] })));
        }
        setRaffles((rafflesRes.data as Raffle[]) || []);
        setContests((contestsRes.data as Contest[]) || []);

        // Load winners from finished raffles
        const finishedIds = ((rafflesRes.data as Raffle[]) || []).filter(r => r.status === "completed" || r.status === "drawn").map(r => r.id);
        if (finishedIds.length > 0) {
          const { data: winnerRows } = await sb.from("participants").select("raffle_id, user_id").in("raffle_id", finishedIds).eq("status", "winner");
          if (winnerRows && winnerRows.length > 0) {
            const raffleMap = new Map(((rafflesRes.data as Raffle[]) || []).map((r: any) => [r.id, r]));
            const userIds = [...new Set(winnerRows.map((w: any) => w.user_id))];
            const { data: profs } = await sb.from("profiles_public").select("user_id, display_name").in("user_id", userIds);
            const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.display_name]));
            setWinners(winnerRows.map((w: any) => {
              const r = raffleMap.get(w.raffle_id);
              return { raffle_title: r?.title || "Sorteio", prize_title: r?.prize_title || "Prémio", display_name: profMap.get(w.user_id) || null, slug: r?.slug || null };
            }));
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [id]);

  /* ─── Player Join ──────────────────────────────────── */
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

  /* ─── Derived Values ───────────────────────────────── */
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
  const heroTitle = branding?.hero_title || niche.defaultTitle;
  const heroSubtitle = branding?.hero_subtitle || branding?.company_slogan || `Descobre os jogos e lives de ${companyName}`;
  const ctaText = branding?.hero_cta_text || niche.defaultCta;
  const ctaLink = branding?.hero_cta_link || "/lives";
  const aboutText = branding?.about_text || null;
  const socialLinks = branding?.social_links || {};
  const layout = branding?.homepage_layout || "showcase";

  useSEO({
    title: companyName !== 'Empresa' ? `${companyName}` : 'Empresa',
    description: branding?.about_text
      ? branding.about_text.slice(0, 160)
      : `Perfil da empresa ${companyName} na Bateu. Jogos, sorteios, lives e muito mais.`,
    canonicalPath: location.pathname,
  });

  /* ─── Loading State ────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgColor ? { backgroundColor: bgColor } : {}}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <NicheIcon className="h-12 w-12" style={{ color: primary }} />
        </motion.div>
      </div>
    );
  }

  /* ─── Not Found ────────────────────────────────────── */
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-black font-display">Empresa não encontrada</h2>
          <p className="text-sm text-muted-foreground mt-2">Este perfil não existe ou foi removido.</p>
          <Link to="/empresas" className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: primary, color: "#000" }}>
            <ArrowRight className="h-4 w-4" /> Ver todas as empresas
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER — Full Immersive Profile
     ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen relative" style={bgColor ? { backgroundColor: bgColor } : {}}>
      
      {branding?.background_image_url && (
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: `url(${branding.background_image_url})` }} />
      )}

      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale }} className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden">
        
        <div className={`absolute inset-0 bg-gradient-to-br ${niche.gradient} opacity-90`} />
        <div className="absolute inset-0" style={{ background: niche.heroGlow }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%, ${secondary}30, transparent 50%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        
        <FloatingParticles color={niche.particleColor} count={35} />

        
        <motion.div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${primary}20, transparent 70%)`, top: "10%", left: "10%", filter: "blur(60px)" }} animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}15, transparent 70%)`, bottom: "20%", right: "10%", filter: "blur(50px)" }} animate={{ x: [0, -20, 0], y: [0, 15, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

        
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.1 }} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                <NicheIcon className="h-3.5 w-3.5" />
                {branding?.featured_badge || niche.badge}
                {company.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
              </span>
            </motion.div>

            
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.2 }} className="mb-6">
              <div className="inline-flex flex-col items-center gap-4">
                <motion.div className="relative" whileHover={{ scale: 1.05 }} transition={springBounce}>
                  <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl border-4 border-white/30 shadow-2xl overflow-hidden backdrop-blur-sm bg-white/10">
                    {(branding?.company_logo_url || company.avatar_url) ? (
                      <img src={branding?.company_logo_url || company.avatar_url || ""} alt={companyName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white">
                        <span className="text-5xl font-black">{companyName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <motion.div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white flex items-center justify-center shadow-lg" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <NicheIcon className="h-4 w-4" style={{ color: primary }} />
                  </motion.div>
                </motion.div>
                <div>
                  <h1 className="text-4xl md:text-6xl font-black font-display text-white drop-shadow-lg">{companyName}</h1>
                  {branding?.company_slogan && <p className="text-white/70 text-sm md:text-base mt-2 font-medium">{branding.company_slogan}</p>}
                </div>
              </div>
            </motion.div>

            
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.35 }} className="text-xl md:text-3xl font-black text-white/95 leading-tight mb-3">
              {heroTitle}
            </motion.p>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.45 }} className="text-sm md:text-base text-white/60 mb-8 max-w-lg mx-auto">
              {heroSubtitle}
            </motion.p>

            
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.55 }} className="flex flex-wrap items-center justify-center gap-3">
              <Link to={ctaLink} className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black font-black text-sm shadow-2xl hover:shadow-white/25 transition-all duration-300">
                <Play className="h-4 w-4 group-hover:scale-110 transition-transform" /> {ctaText}
              </Link>
              <button onClick={() => setLiked(!liked)} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all">
                <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-rose-400 text-rose-400" : ""}`} />
                </motion.div>
                {liked ? "Seguindo" : "Seguir"}
              </button>
              <button onClick={copyLink} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-sm hover:bg-white/20 transition-all">
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copiado!" : "Partilhar"}
              </button>
            </motion.div>

            
            {Object.keys(socialLinks).length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...springUp, delay: 0.65 }} className="flex items-center justify-center gap-3 mt-8">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a key={platform} href={url as string} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
                    <span className="text-xs font-bold uppercase">{platform.slice(0, 2)}</span>
                  </a>
                ))}
              </motion.div>
            )}

            
            {(company.city || company.province) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center justify-center gap-2 mt-4 text-white/40 text-xs">
                <MapPin className="h-3 w-3" /> {[company.city, company.province].filter(Boolean).join(", ")}
              </motion.div>
            )}
          </div>
        </div>

        
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-white/60" animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </motion.div>
      </motion.div>

      <div className="relative z-10 -mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Gamepad2} label="Jogos" value={totalGames} sub={`${publishedGames} ativos`} color={primary} delay={0} />
            <StatCard icon={Ticket} label="Sorteios" value={totalRaffles} sub={`${activeRaffles} abertos`} color={secondary} delay={0.05} />
            <StatCard icon={Trophy} label="Vencedores" value={totalWinners} color={accent} delay={0.1} />
            <StatCard icon={Radio} label="Lives" value={totalLives} color="#10b981" delay={0.15} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {!hasJoined ? (
            <motion.div key="join" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="relative overflow-hidden rounded-3xl border-2 p-6 md:p-8" style={{ borderColor: `${primary}30`, background: `linear-gradient(135deg, ${primary}08, ${accent}04)` }}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 90% 10%, ${primary}08, transparent 50%)` }} />
              <div className="relative flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex p-3 rounded-2xl mb-3" style={{ backgroundColor: `${primary}15` }}>
                    <NicheIcon className="h-8 w-8" style={{ color: primary }} />
                  </div>
                  <h3 className="text-2xl font-black">Junta-te aos jogos!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Coloca o teu nome para participar nos jogos e ver o teu histórico</p>
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
              <div className="h-12 w-12 rounded-full flex items-center justify-center font-black text-xl" style={{ backgroundColor: primary, color: "#000" }}>{playerName.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <p className="font-bold">Olá, {playerName}!</p>
                <p className="text-xs text-muted-foreground">Pronto para jogar em nome de {companyName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setHasJoined(false); setPlayerName(""); }}>Trocar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {aboutText && (
        <div className="container mx-auto px-4 mt-8">
          <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={springUp} className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4" style={{ color: primary }} />
              <h3 className="font-bold text-lg">Sobre {companyName}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{aboutText}</p>
          </motion.div>
        </div>
      )}

      <div className="container mx-auto px-4 mt-10 pb-16">
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
            <TabsTrigger value="activity" className="flex-1 gap-2 rounded-xl data-[state=active]:shadow-md transition-all">
              <Clock className="h-4 w-4" /> Actividade
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="games" className="mt-6">
            {games.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game, i) => (
                  <motion.div key={game.id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <Card className="group border-border/40 hover:border-border/80 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1">
                      <div className="h-2" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primary}25, ${accent}15)` }} whileHover={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.4 }}>
                            {game.type === "wheel" ? <span className="text-2xl">🎰</span> : <span className="text-2xl">💰</span>}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">{game.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{game.type === "wheel" ? "Roda de Prémios" : "Quem Quer Ser Milionário"}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold ${game.is_published || game.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {game.is_published || game.is_active ? "Ativo" : "Rascunho"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{game.segment_count ? `${game.segment_count} segmentos` : "Configurado"}</span>
                          <span>{new Date(game.created_at).toLocaleDateString("pt-PT")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center py-16">
                <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
                  <Gamepad2 className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum jogo configurado ainda</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Esta empresa ainda não adicionou jogos</p>
              </motion.div>
            )}
          </TabsContent>

          
          <TabsContent value="lives" className="mt-6">
            {resolvedId ? <BusinessLivesTab businessUserId={resolvedId} /> : (
              <div className="text-center py-16">
                <Radio className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhuma live realizada ainda</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="raffles" className="mt-6">
            {raffles.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {raffles.map((r, i) => (
                  <motion.div key={r.id} initial={{ y: 15, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ ...springUp, delay: i * 0.04 }}>
                    <Card className="group border-border/40 hover:border-border/80 transition-all overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1">
                      {r.image_url && <div className="h-28 bg-muted"><img src={r.image_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                      <CardContent className="p-4">
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
                        {r.slug && (
                          <Link to={`/raffle/${r.slug}`} className="mt-3 block w-full text-center py-2 rounded-xl text-xs font-bold transition-colors" style={{ backgroundColor: `${primary}12`, color: primary }}>
                            Ver Sorteio <ArrowRight className="h-3 w-3 inline ml-1" />
                          </Link>
                        )}
                      </CardContent>
                    </Card>
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
                        <p className="text-[10px] text-muted-foreground truncate">{w.prize_title} — {w.raffle_title}</p>
                      </div>
                      {w.slug && <Link to={`/raffle/${w.slug}`} className="text-[10px] font-bold" style={{ color: primary }}>Ver</Link>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

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

      <Footer />
    </div>
  );
};


export default CompanyPublicProfile;
