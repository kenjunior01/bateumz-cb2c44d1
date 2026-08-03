import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import {
  Building2, Search, CheckCircle, Ticket, Trophy, TrendingUp, Star,
  ArrowRight, Users, Sparkles, Zap, Gamepad2, Radio, ChevronRight,
  Crown, Shield, LayoutGrid, List, Eye, Flame, MapPin, Globe, Rocket
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface BusinessItem {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  raffle_count: number;
  contest_count: number;
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 400, damping: 15 };
const SPRING_GENTLE = { type: "spring" as const, stiffness: 200, damping: 30 };

const C_PRIMARY = "hsl(220 70% 18%)";
const C_ACCENT = "hsl(352 73% 50%)";
const C_GOLD = "#fbbf24";
const C_VIOLET = "hsl(270 60% 55%)";
const C_CYAN = "hsl(190 80% 50%)";

const TITLE_WORDS = ["Business", "Directory"];

function CountingStat({ target, duration = 2 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{display.toLocaleString("en-US")}</>;
}

function DirectoryParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId = 0;
    let w = 0;
    let h = 0;
    const dots: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    const resize = () => {
      w = canvas.width = canvas.offsetWidth * 2;
      h = canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 30; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        o: Math.random() * 0.3 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255," + d.o + ")";
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = "rgba(255,255,255," + (0.04 * (1 - dist / 180)) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

function FeaturedMarquee({ businesses }: { businesses: BusinessItem[] }) {
  const featured = businesses.filter(b => b.is_verified || (b.raffle_count + b.contest_count) >= 3).slice(0, 12);
  if (featured.length === 0) return null;
  const doubled = [...featured, ...featured];
  return (
    <div className="dirv2-marquee-wrap">
      <div className="dirv2-marquee-track">
        {doubled.map((b, i) => (
          <Link
            key={b.user_id + "-" + i}
            to={"/empresa/" + b.user_id + "/publico"}
            className="dirv2-marquee-item"
          >
            <div className="dirv2-marquee-avatar">
              {b.avatar_url ? (
                <img src={b.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-black" style={{ color: C_PRIMARY }}>
                  {(b.company_name || b.display_name || "E").charAt(0).toUpperCase()}
                </span>
              )}
              {b.is_verified && (
                <div className="dirv2-marquee-badge">
                  <CheckCircle className="h-2.5 w-2.5" style={{ color: C_GOLD }} />
                </div>
              )}
            </div>
            <span className="dirv2-marquee-name truncate">{b.company_name || b.display_name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TiltCard({ children, className = "", ...props }: { children: React.ReactNode; className?: string } & Record<string, unknown>) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), SPRING);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), SPRING);
  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }, [x, y]);
  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function ActivityRing({ value, max, color, size = 40 }: { value: number; max: number; color: string; size?: number }) {
  const [pct, setPct] = useState(0);
  const safeMax = Math.max(max, 1);
  useEffect(() => {
    const timer = setTimeout(() => setPct(Math.min(value / safeMax, 1)), 400);
    return () => clearTimeout(timer);
  }, [value, safeMax]);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} className="dirv2-activity-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size < 36 ? 9 : 11} fontWeight={800} fontFamily="inherit">
        {value}
      </text>
    </svg>
  );
}

function StatBadge({ icon: Icon, value, label, color }: { icon: React.ElementType; value: React.ReactNode; label: string; color: string }) {
  return (
    <motion.div
      className="dirv2-hero-stat"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING, delay: 0.6 }}
    >
      <div className="dirv2-hero-stat-icon" style={{ background: color + "15" }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="dirv2-hero-stat-value" style={{ color }}>{value}</p>
        <p className="dirv2-hero-stat-label">{label}</p>
      </div>
    </motion.div>
  );
}

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "verified" | "active">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statsReady, setStatsReady] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dirRes, rafflesRes, contestsRes] = await Promise.all([
          supabase.rpc("get_business_directory"),
          supabase.from("raffles").select("business_user_id").eq("status", "active"),
          supabase.from("contests").select("created_by").in("status", ["active", "voting", "completed"]),
        ]);
        if (dirRes.error) throw dirRes.error;
        const profiles = dirRes.data || [];
        const rafflesByUser: Record<string, number> = {};
        (rafflesRes.data || []).forEach((r: { business_user_id: string }) => {
          rafflesByUser[r.business_user_id] = (rafflesByUser[r.business_user_id] || 0) + 1;
        });
        const contestsByUser: Record<string, number> = {};
        (contestsRes.data || []).forEach((c: { created_by: string }) => {
          contestsByUser[c.created_by] = (contestsByUser[c.created_by] || 0) + 1;
        });
        const items: BusinessItem[] = profiles.map((p: Record<string, unknown>) => ({
          user_id: p.user_id as string,
          display_name: p.display_name as string | null,
          company_name: p.company_name as string | null,
          avatar_url: p.avatar_url as string | null,
          is_verified: p.is_verified as boolean | null,
          raffle_count: rafflesByUser[p.user_id as string] || 0,
          contest_count: contestsByUser[p.user_id as string] || 0,
        }));
        items.sort((a, b) => {
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
          return (b.raffle_count + b.contest_count) - (a.raffle_count + a.contest_count);
        });
        setBusinesses(items);
      } catch (e) {
        console.error("Failed to load businesses:", e);
      }
      setLoading(false);
    };
    load();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => setStatsReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute("data-bid");
          if (id && entry.isIntersecting) {
            setVisibleCards(prev => new Set(prev).add(id));
          }
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
    );
    contentRef.current.querySelectorAll("[data-bid]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, filter, search, viewMode]);

  const filtered = useMemo(() => {
    let list = businesses;
    if (filter === "verified") list = list.filter(b => b.is_verified);
    if (filter === "active") list = list.filter(b => b.raffle_count + b.contest_count > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        b =>
          (b.company_name || "").toLowerCase().includes(q) ||
          (b.display_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [businesses, search, filter]);

  const totalRaffles = useMemo(() => businesses.reduce((s, b) => s + b.raffle_count, 0), [businesses]);
  const totalContests = useMemo(() => businesses.reduce((s, b) => s + b.contest_count, 0), [businesses]);
  const verifiedCount = useMemo(() => businesses.filter(b => b.is_verified).length, [businesses]);
  const activeCount = useMemo(() => businesses.filter(b => b.raffle_count + b.contest_count > 0).length, [businesses]);

  const chipCategories = [
    { id: "all", label: "All", icon: "\ud83c\udfe2", count: businesses.length },
    { id: "verified", label: "Verified", icon: "\u2705", count: verifiedCount },
    { id: "active", label: "Active", icon: "\u26a1", count: activeCount },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const heroOpacity = Math.max(0, 1 - scrollY / 500);
  const maxActivities = useMemo(
    () => Math.max(...businesses.map(b => b.raffle_count + b.contest_count), 1),
    [businesses]
  );

  const desktopFilters = [
    { id: "all" as const, label: "All", Icon: Globe, color: C_PRIMARY },
    { id: "verified" as const, label: "Verified", Icon: Shield, color: C_GOLD },
    { id: "active" as const, label: "Active", Icon: Flame, color: C_ACCENT },
  ];

  const heroStats = [
    { icon: Building2, label: "Businesses", value: businesses.length, color: C_PRIMARY },
    { icon: CheckCircle, label: "Verified", value: verifiedCount, color: C_GOLD },
    { icon: Ticket, label: "Raffles", value: totalRaffles, color: C_ACCENT },
    { icon: Trophy, label: "Contests", value: totalContests, color: C_VIOLET },
  ];

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise pb-20 md:pb-0">
      <Navbar />

      <MobileDiscoveryHeader
        title="Business Directory"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search business..."
        categories={chipCategories}
        activeCategory={filter}
        onCategoryChange={(id) => setFilter(id as "all" | "verified" | "active")}
      />

      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative overflow-hidden hidden md:block"
        style={{ minHeight: "520px", opacity: heroOpacity }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: "hsl(220 70% 18% / 0.3)", width: "600px", height: "600px" }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: "hsl(352 73% 50% / 0.18)", width: "500px", height: "500px" }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: "hsl(270 60% 40% / 0.12)", width: "450px", height: "450px" }} />
        </div>
        <DirectoryParticles />
        <div
          className="hero-mouse-light"
          style={{
            background: "radial-gradient(700px circle at " + mousePos.x + "px " + mousePos.y + "px, hsl(220 70% 18% / 0.08), transparent 40%)",
          }}
        />
        <div className="hero-grid-overlay" style={{ "--grid-color": "rgba(255,255,255,0.3)" } as React.CSSProperties} />
        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          <div className="text-center pt-24 pb-6">
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
              initial={{ opacity: 0, y: -20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Crown className="h-4 w-4" style={{ color: C_GOLD }} />
              </motion.span>
              <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Games and contests platform</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight mb-5 leading-[1.05]">
              {TITLE_WORDS.map((word, wi) => (
                <motion.span
                  key={wi}
                  className="text-shimmer inline-block mr-[0.3em]"
                  style={{
                    "--shimmer-c1": "hsl(var(--foreground))",
                    "--shimmer-c2": "hsl(220 70% 18% / 0.5)",
                  } as React.CSSProperties}
                  initial={{ opacity: 0, y: 40, rotateX: -30 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ ...SPRING_BOUNCE, delay: 0.15 + wi * 0.08 }}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.5 }}
            >
              Descubra empresas que criam experiencias incriveis com sorteios, concursos, jogos ao vivo e muito mais
            </motion.p>

            <motion.div
              className="max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: 0.6 }}
            >
              <div
                className="dirv2-search-box"
                style={{ "--search-glow": searchFocused ? "1" : "0" } as React.CSSProperties}
              >
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" style={{ color: searchFocused ? C_PRIMARY : undefined }} />
                  <Input
                    placeholder="Search businesses by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="pl-14 h-14 rounded-2xl bg-transparent border-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground/40"
                  />
                  <motion.div
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Search
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              {heroStats.map((s, i) => (
                <StatBadge
                  key={s.label}
                  icon={s.icon}
                  value={statsReady ? <CountingStat target={s.value} duration={2.5} /> : <span>0</span>}
                  label={s.label}
                  color={s.color}
                />
              ))}
            </div>

            {!user && (
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Link to="/register">
                  <motion.button
                    className="dirv2-cta-btn"
                    style={{ background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }}
                    whileHover={{ scale: 1.06, boxShadow: "0 10px 50px hsl(220 70% 18% / 0.4), 0 0 100px hsl(352 73% 50% / 0.2)" }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Crie o seu primeiro concurso gratis</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <FeaturedMarquee businesses={businesses} />
      </div>

      <div className="container mx-auto px-4 max-w-6xl mt-8 relative z-20 hidden md:block">
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {desktopFilters.map(f => {
              const isActive = filter === f.id;
              return (
                <motion.button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="dirv2-filter-chip"
                  style={{
                    color: isActive ? f.color : "hsl(var(--muted-foreground))",
                    "--chip-active-bg": f.color + "12",
                    "--chip-active-border": f.color + "25",
                  } as React.CSSProperties}
                  data-active={isActive ? "1" : undefined}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <f.Icon className="h-3.5 w-3.5" />
                  <span>{f.label}</span>
                  <span className="dirv2-filter-count">
                    {f.id === "all" ? businesses.length : f.id === "verified" ? verifiedCount : activeCount}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex-1" />

          <span className="text-xs text-muted-foreground/50 font-medium">
            {filtered.length} {filtered.length === 1 ? "empresa" : "empresas"}
          </span>

          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <motion.button
              onClick={() => setViewMode("grid")}
              className="p-2.5 rounded-lg transition-colors"
              style={{ color: viewMode === "grid" ? C_PRIMARY : "hsl(var(--muted-foreground))", backgroundColor: viewMode === "grid" ? C_PRIMARY + "12" : "transparent" }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <LayoutGrid className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode("list")}
              className="p-2.5 rounded-lg transition-colors"
              style={{ color: viewMode === "list" ? C_PRIMARY : "hsl(var(--muted-foreground))", backgroundColor: viewMode === "list" ? C_PRIMARY + "12" : "transparent" }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <List className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      <div ref={contentRef} className="container mx-auto px-3 sm:px-4 max-w-6xl pb-10 relative z-20">
        {loading ? (
          <div className="mt-3 md:mt-0">
            <div className="md:hidden"><MeituanSkeleton count={6} /></div>
            <div className="hidden md:flex items-center justify-center py-20">
              <div className="relative">
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.15), hsl(352 73% 50% / 0.1))" }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Building2 className="h-7 w-7" style={{ color: C_PRIMARY }} />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  style={{ border: "2px solid " + C_PRIMARY + "25" }}
                />
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full" style={{ background: C_PRIMARY, filter: "blur(50px)", width: 140, height: 140, top: "-10px", left: "-10px", animation: "empty-orb-pulse 4s ease-in-out infinite" }} />
              <motion.div className="relative">
                <motion.div
                  className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: "linear-gradient(135deg, hsl(220 70% 18% / 0.08), hsl(352 73% 50% / 0.04))",
                    border: "1.5px dashed hsl(220 70% 18% / 0.15)",
                  }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                >
                  <Building2 className="h-12 w-12 text-muted-foreground/15" />
                </motion.div>
              </motion.div>
            </div>
            <motion.p
              className="text-xl font-bold text-muted-foreground mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              No businesses found
            </motion.p>
            <motion.p
              className="text-sm text-muted-foreground/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Tente uma pesquisa diferente ou altere o filtro
            </motion.p>
          </div>
        ) : (
          <>
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-3 mt-3">
                {filtered.map((b, i) => (
                  <motion.div
                    key={b.user_id}
                    data-bid={b.user_id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.04, ...SPRING_GENTLE }}
                    onClick={() => navigate("/empresa/" + b.user_id + "/publico")}
                    whileTap={{ scale: 0.96 }}
                  >
                    <div className="dirv2-mobile-card">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="dirv2-mobile-avatar">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <span className="text-sm font-black" style={{ color: C_PRIMARY }}>
                              {(b.company_name || b.display_name || "E").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-sm truncate">{b.company_name || b.display_name}</p>
                            {b.is_verified && <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: C_GOLD }} />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5" style={{ color: C_ACCENT }}>
                              <Ticket className="h-2.5 w-2.5" /> {b.raffle_count}
                            </span>
                            <span className="flex items-center gap-0.5" style={{ color: C_PRIMARY }}>
                              <Trophy className="h-2.5 w-2.5" /> {b.contest_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5 mt-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filtered.map((b, i) => {
                    const total = b.raffle_count + b.contest_count;
                    const isVisible = visibleCards.has(b.user_id);
                    return (
                      <TiltCard
                        key={b.user_id}
                        data-bid={b.user_id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30, scale: isVisible ? 1 : 0.95 }}
                        transition={{ ...SPRING, delay: Math.min(i, 15) * 0.04 }}
                        onClick={() => navigate("/empresa/" + b.user_id + "/publico")}
                        className="cursor-pointer"
                      >
                        <div className="dirv2-card">
                          <div className="dirv2-card-shine" />
                          <div className="relative z-10 p-5">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="dirv2-card-avatar">
                                {b.avatar_url ? (
                                  <img src={b.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                  <span className="text-2xl font-black" style={{ color: C_PRIMARY }}>
                                    {(b.company_name || b.display_name || "E").charAt(0).toUpperCase()}
                                  </span>
                                )}
                                {b.is_verified && (
                                  <div className="dirv2-verified-pulse">
                                    <CheckCircle className="h-4 w-4" style={{ color: "#fff" }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-[15px] truncate">{b.company_name || b.display_name}</h3>
                                </div>
                                {b.company_name && b.display_name && b.company_name !== b.display_name && (
                                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{b.display_name}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {b.is_verified ? (
                                    <span className="dirv2-badge" style={{ "--badge-bg": C_GOLD + "15", "--badge-color": C_GOLD, "--badge-border": C_GOLD + "25" } as React.CSSProperties}>
                                      <Shield className="h-3 w-3" /> Verificado
                                    </span>
                                  ) : (
                                    <span className="dirv2-badge" style={{ "--badge-bg": "rgba(255,255,255,0.04)", "--badge-color": "hsl(var(--muted-foreground))", "--badge-border": "rgba(255,255,255,0.06)" } as React.CSSProperties}>
                                      <Building2 className="h-3 w-3" /> Empresa
                                    </span>
                                  )}
                                  {total > 0 && (
                                    <span className="dirv2-badge" style={{ "--badge-bg": C_PRIMARY + "10", "--badge-color": C_PRIMARY, "--badge-border": C_PRIMARY + "20" } as React.CSSProperties}>
                                      <Flame className="h-3 w-3" /> {total} {total === 1 ? "atividade" : "atividades"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="dirv2-card-stat">
                                <div className="flex items-center gap-2.5">
                                  <ActivityRing value={b.raffle_count} max={maxActivities} color={C_ACCENT} size={38} />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Raffles</p>
                                    <p className="text-base font-black font-display" style={{ color: C_ACCENT }}>{b.raffle_count}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="dirv2-card-stat">
                                <div className="flex items-center gap-2.5">
                                  <ActivityRing value={b.contest_count} max={maxActivities} color={C_PRIMARY} size={38} />
                                  <div>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Contests</p>
                                    <p className="text-base font-black font-display" style={{ color: C_PRIMARY }}>{b.contest_count}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="dirv2-card-footer">
                              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: C_PRIMARY }}>
                                View profile <ChevronRight className="h-3 w-3" />
                              </span>
                              <span className="text-[10px] text-muted-foreground/30 font-medium">
                                <Eye className="h-3 w-3 inline mr-1" />Verificado: {b.is_verified ? "Sim" : "Nao"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TiltCard>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  className="hidden md:flex flex-col gap-3 mt-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filtered.map((b, i) => {
                    const total = b.raffle_count + b.contest_count;
                    const isVisible = visibleCards.has(b.user_id);
                    return (
                      <motion.div
                        key={b.user_id}
                        data-bid={b.user_id}
                        className="dirv2-list-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                        transition={{ ...SPRING, delay: Math.min(i, 15) * 0.035 }}
                        onClick={() => navigate("/empresa/" + b.user_id + "/publico")}
                        whileHover={{ x: 8 }}
                      >
                        <div className="dirv2-list-shine" />
                        <div className="relative z-10 p-4 flex items-center gap-5">
                          <div className="dirv2-list-avatar">
                            {b.avatar_url ? (
                              <img src={b.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              <span className="text-xl font-black" style={{ color: C_PRIMARY }}>
                                {(b.company_name || b.display_name || "E").charAt(0).toUpperCase()}
                              </span>
                            )}
                            {b.is_verified && (
                              <div className="dirv2-verified-dot">
                                <CheckCircle className="h-3 w-3" style={{ color: "#fff" }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <p className="font-bold text-[15px] truncate">{b.company_name || b.display_name}</p>
                              {b.is_verified && <CheckCircle className="h-4 w-4 shrink-0" style={{ color: C_GOLD }} />}
                              {total > 0 && (
                                <span className="dirv2-badge" style={{ "--badge-bg": C_PRIMARY + "10", "--badge-color": C_PRIMARY, "--badge-border": C_PRIMARY + "20" } as React.CSSProperties}>
                                  <Flame className="h-3 w-3" /> {total} {total === 1 ? "atividade" : "atividades"}
                                </span>
                              )}
                            </div>
                            {b.company_name && b.display_name && b.company_name !== b.display_name && (
                              <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{b.display_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-8 shrink-0">
                            <div className="flex items-center gap-2">
                              <ActivityRing value={b.raffle_count} max={maxActivities} color={C_ACCENT} size={36} />
                              <div>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Raffles</p>
                                <p className="text-sm font-black" style={{ color: C_ACCENT }}>{b.raffle_count}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ActivityRing value={b.contest_count} max={maxActivities} color={C_PRIMARY} size={36} />
                              <div>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Contests</p>
                                <p className="text-sm font-black" style={{ color: C_PRIMARY }}>{b.contest_count}</p>
                              </div>
                            </div>
                          </div>
                          <motion.div
                            className="shrink-0"
                            style={{ color: C_PRIMARY }}
                            whileHover={{ x: 4 }}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {!loading && filtered.length > 0 && (
              <motion.div
                className="mt-12 hidden md:block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="dirv2-bottom-cta">
                  <div className="relative z-10 p-8 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-xl font-black font-display flex items-center justify-center md:justify-start gap-2 mb-2">
                        <motion.span
                          animate={{ rotate: [0, 12, -12, 0] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        >
                          <Sparkles className="h-5 w-5" style={{ color: C_GOLD }} />
                        </motion.span>
                        A sua empresa ainda nao esta aqui?
                      </h2>
                      <p className="text-sm text-muted-foreground/70 max-w-md">
                        Junte-se a centenas de empresas que ja usam a plataforma para criar concursos e atrair milhares de participantes. O primeiro concurso e completamente gratis.
                      </p>
                    </div>
                    <Link to="/register">
                      <motion.button
                        className="dirv2-cta-btn"
                        style={{ background: "linear-gradient(135deg, " + C_PRIMARY + ", " + C_ACCENT + ")" }}
                        whileHover={{ scale: 1.06, boxShadow: "0 10px 50px hsl(220 70% 18% / 0.4)" }}
                        whileTap={{ scale: 0.96 }}
                      >
                        <Rocket className="h-4 w-4" />
                        <span>Comecar Agora</span>
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
