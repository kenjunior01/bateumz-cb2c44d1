import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trophy, Calendar, Eye, ThumbsUp, ArrowRight, Flame, Search, Zap, Crown, Clock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import ContestCountdown from "@/components/ContestCountdown";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const THEME_P = "hsl(220 70% 18%)";
const THEME_A = "hsl(352 73% 50%)";
const THEME_GOLD = "#fbbf24";

const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: "Aberto", color: THEME_P, bgColor: "hsl(220 70% 18% / 0.12)" },
  voting: { label: "Em Votacao", color: THEME_A, bgColor: "hsl(352 73% 50% / 0.12)" },
  completed: { label: "Encerrado", color: "hsl(var(--muted-foreground))", bgColor: "hsl(var(--muted))" },
};

export default function Contests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "past">("active");
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("contests")
          .select("*")
          .in("status", ["active", "voting", "completed"])
          .order("created_at", { ascending: false });
        setContests(data || []);
      } catch (e) { console.error("Failed to load contests:", e); }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return contests;
    return contests.filter((c) =>
      c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    );
  }, [contests, search]);

  const active = filtered.filter((c) => c.status === "active" || c.status === "voting");
  const past = filtered.filter((c) => c.status === "completed");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const chips = [
    { id: "active", label: "Ativos", icon: "\ud83d\udd25", count: active.length },
    { id: "past", label: "Encerrados", icon: "\ud83c\udfc6", count: past.length },
  ];

  const ContestCard = ({ contest, index }: { contest: Contest; index: number }) => {
    const status = statusMap[contest.status] || statusMap.active;
    const isFeatured = (contest as any).featured;
    const isMultiPhase = (contest as any).contest_mode === "multi";
    const sponsor = (contest as any).sponsor_name;
    const isLive = contest.status !== "completed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING, delay: Math.min(index, 12) * 0.06 }}
        whileHover={{ y: -6, scale: 1.02 }}
      >
        <Link to={`/concursos/${contest.id}`}>
          <div
            className={"game-card-v2 cursor-pointer h-full relative " + (isFeatured ? "" : "")}
            style={{
              border: isFeatured ? "1px solid " + THEME_P + "30" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {isFeatured && (
              <div className="absolute top-0 inset-x-0 h-1 z-10" style={{ background: "linear-gradient(90deg, " + THEME_P + ", " + THEME_A + ", " + THEME_P + ")" }} />
            )}
            <div className="relative aspect-[3/2] sm:aspect-[4/3] overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              {contest.image_url ? (
                <img
                  src={contest.image_url}
                  alt={contest.title}
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{ transform: "scale(1)", transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)" }}
                  onMouseEnter={(e: any) => { e.target.style.transform = "scale(1.08)"; }}
                  onMouseLeave={(e: any) => { e.target.style.transform = "scale(1)"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.08), hsl(352 73% 50% / 0.04))" }}>
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    <Trophy className="h-12 w-12" style={{ color: THEME_P, opacity: 0.3 }} />
                  </motion.div>
                </div>
              )}

              <div
                className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg"
                style={{ backgroundColor: status.bgColor, color: status.color, backdropFilter: "blur(8px)" }}
              >
                <span className="flex items-center gap-1">
                  {isLive && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />}
                  <span>{status.label}</span>
                </span>
              </div>

              {isMultiPhase && (
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg"
                  style={{ backgroundColor: THEME_GOLD + "20", color: THEME_GOLD }}
                >
                  <span className="flex items-center gap-1"><Crown className="h-3 w-3" /> <span>Multi-fases</span></span>
                </div>
              )}

              {contest.end_date && contest.status !== "completed" && (
                <div className="absolute top-3 right-3">
                  <ContestCountdown endDate={contest.end_date} compact />
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 h-24" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
              {sponsor && (
                <div
                  className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}
                >
                  <span>{"\ud83d\udcbc"}</span> <span>{sponsor}</span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 space-y-2">
              <h3 className="font-display text-xs sm:text-sm md:text-base font-bold text-foreground line-clamp-2 leading-tight transition-colors" style={{ transition: "color 0.2s" }}
                onMouseEnter={(e: any) => { e.target.style.color = THEME_P; }}
                onMouseLeave={(e: any) => { e.target.style.color = ""; }}
              >
                {contest.title}
              </h3>
              {contest.description && (
                <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">{contest.description}</p>
              )}
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                {contest.evaluation_type === "views" ? (
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> <span>Views</span></span>
                ) : (
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> <span>Votos</span></span>
                )}
                {contest.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" style={{ color: THEME_A }} />
                    <span>{new Date(contest.end_date).toLocaleDateString("pt-MZ")}</span>
                  </span>
                )}
              </div>
              {contest.prize_description && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold" style={{ color: THEME_GOLD }}>
                  <Trophy className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-1">{contest.prize_description}</span>
                </div>
              )}
              <div
                className="pt-1 flex items-center gap-1 text-xs font-semibold opacity-0 transition-opacity"
                style={{ color: THEME_P }}
                onMouseEnter={(e: any) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.opacity = "0"; }}
              >
                <span>Participar</span> <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise pb-20 lg:pb-0">
      <div className="hidden md:block"><Navbar /></div>
      <div className="floating-stars"><span /><span /><span /><span /><span /><span /><span /><span /></div>
      <div className="ambient-glow" />

      <MobileDiscoveryHeader
        title="Concursos"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar concursos..."
        categories={chips}
        activeCategory={tab}
        onCategoryChange={(id) => setTab(id as "active" | "past")}
      />

      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="dir-hero-bg relative overflow-hidden hidden md:block"
        style={{ minHeight: "320px" }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: "hsl(220 70% 18% / 0.25)" }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: "hsl(352 73% 50% / 0.2)" }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: "hsl(42 95% 52% / 0.12)" }} />
        </div>
        <div className="hero-grid-overlay" style={{ "--grid-color": "rgba(255,255,255,0.5)" } as any} />
        <div
          className="hero-mouse-light"
          style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(352 73% 50% / 0.05), transparent 40%)` }}
        />
        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 py-14">
          <motion.div className="text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }}>
            <motion.div
              className="inline-flex p-4 rounded-2xl mb-5"
              style={{ background: "linear-gradient(135deg, " + THEME_A + "15, " + THEME_GOLD + "08)" }}
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Trophy className="h-8 w-8" style={{ color: THEME_A }} />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-3">
              <span className="text-shimmer" style={{
                "--shimmer-c1": "hsl(var(--foreground))" as any,
                "--shimmer-c2": "hsl(352 73% 50% / 0.6)" as any,
              }}>Concursos</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Participe, mostre o seu talento e ganhe premios incriveis!
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 pb-10 relative z-20">
        <motion.div
          className="mb-6 max-w-3xl mx-auto hidden md:block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="dir-search-wrap">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar concursos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 rounded-full bg-white/[0.03] border-white/[0.06] text-sm"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex gap-2 mb-6 hidden md:flex"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {[
            { id: "active" as const, label: "Ativos", Icon: Flame, count: active.length, color: THEME_A },
            { id: "past" as const, label: "Encerrados", Icon: Trophy, count: past.length, color: THEME_P },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={"section-tab-v2 relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold " + (isActive ? "active" : "")}
                style={{
                  backgroundColor: isActive ? (t.color + "15") : "rgba(255,255,255,0.03)",
                  color: isActive ? t.color : "hsl(var(--muted-foreground))",
                  border: isActive ? "1px solid " + (t.color + "30") : "1px solid rgba(255,255,255,0.05)",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="tab-glow rounded-full" style={{ background: "radial-gradient(ellipse at center, " + (t.color + "08") + ", transparent 70%)" }} />
                <t.Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{t.label}</span>
                <span className={"relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold " + (isActive ? "" : "")} style={{ backgroundColor: isActive ? (t.color + "25") : "hsl(var(--muted))" }}>
                  {t.count}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {loading ? (
          <div className="md:hidden"><MeituanSkeleton count={6} /></div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "active" ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ ...SPRING }}
              >
                {active.length === 0 ? (
                  <div className="empty-state-v2 text-center py-20">
                    <div className="empty-orb" style={{ backgroundColor: THEME_A, width: 100, height: 100, top: "20%", left: "45%" }} />
                    <motion.div className="empty-float inline-block relative">
                      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, " + THEME_A + "10, transparent)", border: "1px dashed " + THEME_A + "20" }}>
                        <Trophy className="h-11 w-11 text-muted-foreground/20" />
                      </div>
                    </motion.div>
                    <p className="text-lg font-bold text-muted-foreground">Nenhum concurso ativo de momento.</p>
                    <p className="text-sm text-muted-foreground/50 mt-1">Fica atento — novos concursos em breve!</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
                    {active.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="past"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ ...SPRING }}
              >
                {past.length === 0 ? (
                  <div className="empty-state-v2 text-center py-20">
                    <div className="empty-orb" style={{ backgroundColor: THEME_P, width: 100, height: 100, top: "20%", left: "45%" }} />
                    <motion.div className="empty-float inline-block relative">
                      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, " + THEME_P + "10, transparent)", border: "1px dashed " + THEME_P + "20" }}>
                        <Trophy className="h-11 w-11 text-muted-foreground/20" />
                      </div>
                    </motion.div>
                    <p className="text-lg font-bold text-muted-foreground">Nenhum concurso encerrado.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
                    {past.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
