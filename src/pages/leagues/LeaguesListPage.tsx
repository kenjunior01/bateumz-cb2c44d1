"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, Users, Gift, Search, Zap, ChevronRight,
  Crown, Swords, Gamepad2, ScrollText,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import {
  getLeagues,
  getFeaturedLeagues,
  FORMAT_LABELS,
  GAME_CATEGORY_LABELS,
  type League,
  type LeagueFormat,
} from "@/lib/leagues";

const sb: any = supabase;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-300" },
  registration: { label: "Inscricoes Abertas", color: "bg-emerald-500/20 text-emerald-300" },
  active: { label: "Em Curso", color: "bg-amber-500/20 text-amber-300" },
  paused: { label: "Pausado", color: "bg-orange-500/20 text-orange-300" },
  completed: { label: "Finalizado", color: "bg-slate-500/20 text-slate-400" },
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  single_elimination: <Swords className="h-3.5 w-3.5" />,
  double_elimination: <Swords className="h-3.5 w-3.5" />,
  battle_royale: <Gamepad2 className="h-3.5 w-3.5" />,
  rpg_championship: <ScrollText className="h-3.5 w-3.5" />,
  round_robin: <Users className="h-3.5 w-3.5" />,
  swiss: <Zap className="h-3.5 w-3.5" />,
};

const PARTICLE_COUNT = 18;

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 6,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10"
          style={{ left: `${p.left}%`, bottom: "-10px", width: p.size, height: p.size }}
          animate={{
            y: [0, -300, -600],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function LeagueCard({ league, index }: { league: League; index: number }) {
  const navigate = useNavigate();
  const statusInfo = STATUS_MAP[league.status] || STATUS_MAP.draft;
  const progress = league.max_participants > 0
    ? Math.min((league.current_participants / league.max_participants) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group cursor-pointer"
      onClick={() => navigate(`/leagues/${league.slug}`)}
    >
      <Card className="overflow-hidden border-white/10 bg-white/5 backdrop-blur-md hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-black/20">
        <div
          className="h-28 relative"
          style={{
            background: `linear-gradient(135deg, ${league.primary_color || "#6d28d9"}, ${league.secondary_color || "#2563eb"})`,
          }}
        >
          {league.is_featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-amber-500/90 text-white border-0 text-[10px] gap-1">
                <Crown className="h-3 w-3" /> Destaque
              </Badge>
            </div>
          )}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-1">
              {league.name}
            </h3>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1 border-white/20 text-white/70">
              {FORMAT_ICONS[league.format] || <Swords className="h-3 w-3" />}
              {FORMAT_LABELS[league.format]}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-white/20 text-white/70">
              {league.game_type}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-white/60">
              <span>Participantes</span>
              <span>{league.current_participants}/{league.max_participants}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${league.primary_color || "#6d28d9"}, ${league.secondary_color || "#2563eb"})` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: index * 0.06 + 0.2 }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/50">
              <Gift className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {league.prize_pool > 0
                  ? `${league.prize_pool.toLocaleString()} ${league.currency}`
                  : "Sem premio"}
              </span>
            </div>
            <Badge className={`text-[10px] border-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
          {league.status === "registration" && (
            <Button
              size="sm"
              className="w-full text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/leagues/${league.slug}`);
              }}
            >
              Inscrever-se <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FeaturedCarousel({ leagues }: { leagues: League[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (leagues.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % leagues.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [leagues.length]);

  if (leagues.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl mb-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.5 }}
          className="relative h-48 md:h-64"
          style={{
            background: `linear-gradient(135deg, ${leagues[active].primary_color || "#6d28d9"}, ${leagues[active].secondary_color || "#2563eb"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8">
            <Badge className="w-fit mb-2 bg-white/20 text-white border-white/30 text-[10px]">
              <Crown className="h-3 w-3 mr-1" /> Liga em Destaque
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {leagues[active].name}
            </h2>
            <p className="text-white/70 text-sm line-clamp-1 mb-3">
              {leagues[active].description || "Venha participar desta liga incrivel!"}
            </p>
            <div className="flex items-center gap-4 text-white/60 text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {leagues[active].current_participants} jogadores
              </span>
              {leagues[active].prize_pool > 0 && (
                <span className="flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" /> {leagues[active].prize_pool.toLocaleString()} {leagues[active].currency}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {leagues.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === active ? "bg-white w-5" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LeaguesListPage() {
  useSEO({ title: 'Ligas Competitivas', description: 'Compita em ligas organizadas na Bateu. Suba na classificação, ganhe recompensas e prove o seu valor.', canonicalPath: '/ligas' });
  const { t } = useLanguage();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [featured, setFeatured] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    Promise.all([
      getLeagues().catch(() => []),
      getFeaturedLeagues().catch(() => []),
    ])
      .then(([all, feat]) => {
        setLeagues(all);
        setFeatured(feat);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredLeagues = useMemo(() => {
    let result = leagues;
    if (activeTab !== "all") {
      result = result.filter((l) => l.format === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.game_type.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leagues, activeTab, search]);

  const stats = useMemo(() => {
    const totalPlayers = leagues.reduce((s, l) => s + l.current_participants, 0);
    const totalPrize = leagues.reduce((s, l) => s + l.prize_pool, 0);
    return {
      totalLeagues: leagues.length,
      totalPlayers,
      totalPrize,
    };
  }, [leagues]);

  const formatTabs = [
    { key: "all", label: "Todos" },
    { key: "single_elimination", label: "Eliminacao" },
    { key: "rpg_championship", label: "RPG" },
    { key: "battle_royale", label: "Battle Royale" },
    { key: "round_robin", label: "Round Robin" },
    { key: "swiss", label: "Suico" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0f0f1a] to-[#0a0a12]">
      <section className="relative overflow-hidden py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-emerald-900/20" />
        <FloatingParticles />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              <Trophy className="h-3.5 w-3.5 mr-1" /> Competicoes
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight"
          >
            Ligas e Campeonatos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-base md:text-lg max-w-2xl mx-auto mb-8"
          >
            Participe de ligas competitivas, suba no ranking e concorra a premios incriveis em diversos jogos.
          </motion.p>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { icon: <Trophy className="h-4 w-4" />, value: stats.totalLeagues, label: "Ligas" },
            { icon: <Users className="h-4 w-4" />, value: stats.totalPlayers, label: "Jogadores" },
            { icon: <Gift className="h-4 w-4" />, value: `${stats.totalPrize.toLocaleString()}`, label: "Premios" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <Card className="bg-white/5 backdrop-blur-md border-white/10 text-center py-4">
                <div className="flex justify-center text-purple-400 mb-1">{s.icon}</div>
                <p className="text-xl md:text-2xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-white/40">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {!loading && featured.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <FeaturedCarousel leagues={featured} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Buscar ligas por nome, jogo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10 w-full overflow-x-auto flex-nowrap">
              {formatTabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl bg-white/5" />
              ))}
            </div>
          ) : filteredLeagues.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Trophy className="h-9 w-9 text-white/20" />
              </div>
              <h3 className="text-white/40 font-semibold text-lg mb-1">
                Nenhuma liga encontrada
              </h3>
              <p className="text-white/25 text-sm max-w-sm">
                {search
                  ? "Tente buscar com outros termos."
                  : "Ainda nao ha ligas disponiveis. Volte em breve!"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredLeagues.map((league, i) => (
                <LeagueCard key={league.id} league={league} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
