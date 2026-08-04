"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Users, Trophy, Gift, Calendar, Clock, Copy, Check,
  Swords, Gamepad2, ScrollText, Shield, MessageSquare, Crown,
  TrendingUp, AlertCircle, LogOut, UserPlus, Share2, Zap,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getLeagueBySlug,
  getLeagueParticipants,
  getLeagueMatches,
  getLeagueActivity,
  joinLeague,
  leaveLeague,
  createInvitation,
  FORMAT_LABELS,
  FORMAT_DESCRIPTIONS,
  GAME_CATEGORY_LABELS,
  type League,
  type LeagueParticipant,
  type LeagueMatch,
  type LeagueActivity,
} from "@/lib/leagues";

const sb: any = supabase;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-300" },
  registration: { label: "Inscricoes Abertas", color: "bg-emerald-500/20 text-emerald-300" },
  active: { label: "Em Curso", color: "bg-amber-500/20 text-amber-300" },
  paused: { label: "Pausado", color: "bg-orange-500/20 text-orange-300" },
  completed: { label: "Finalizado", color: "bg-slate-500/20 text-slate-400" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  join: <UserPlus className="h-4 w-4" />,
  leave: <LogOut className="h-4 w-4" />,
  match_completed: <Swords className="h-4 w-4" />,
  league_started: <Zap className="h-4 w-4" />,
  league_completed: <Crown className="h-4 w-4" />,
  round_started: <Clock className="h-4 w-4" />,
};

function formatDate(iso?: string) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atras`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atras`;
  const days = Math.floor(hrs / 24);
  return `${days}d atras`;
}

export default function LeagueDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState<League | null>(null);
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [activity, setActivity] = useState<LeagueActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [l, p, m, a] = await Promise.all([
        getLeagueBySlug(slug),
        getLeagueParticipants(slug).catch(() => []),
        getLeagueMatches(slug).catch(() => []),
        getLeagueActivity(slug, 50).catch(() => []),
      ]);
      if (l) {
        setLeague(l);
        setParticipants(p);
        setMatches(m);
        setActivity(a);
        if (user) {
          setIsParticipant(p.some((pt) => pt.user_id === user.id));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  const handleJoin = async () => {
    if (!user || !league) return;
    try {
      await joinLeague(league.id, user.id);
      setIsParticipant(true);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    if (!user || !league) return;
    try {
      await leaveLeague(league.id, user.id);
      setIsParticipant(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateInvite = async () => {
    if (!user || !league) return;
    try {
      const invite = await createInvitation(league.id, user.id, { max_uses: 10 });
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const matchesByRound = useMemo(() => {
    const map: Record<number, LeagueMatch[]> = {};
    for (const m of matches) {
      if (!map[m.round_number]) map[m.round_number] = [];
      map[m.round_number].push(m);
    }
    return map;
  }, [matches]);

  const standings = useMemo(
    () => [...participants].sort((a, b) => b.points - a.points || b.wins - a.wins),
    [participants]
  );

  const prizeBreakdown = useMemo(() => {
    if (!league || !league.prize_pool) return [];
    const dist = league.prize_distribution.length > 0 ? league.prize_distribution : [50, 30, 20];
    return dist.map((pct, i) => ({
      place: i + 1,
      pct,
      amount: Math.round((league.prize_pool * pct) / 100),
    }));
  }, [league]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] p-4 md:p-8 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Liga nao encontrada</p>
          <Button variant="ghost" className="mt-3 text-white/50" onClick={() => navigate("/leagues")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[league.status] || STATUS_MAP.draft;
  const isElimination = league.format === "single_elimination" || league.format === "double_elimination";
  const isRoundRobin = league.format === "round_robin" || league.format === "swiss";

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <div
        className="relative h-44 md:h-56"
        style={{
          background: `linear-gradient(135deg, ${league.primary_color || "#6d28d9"}, ${league.secondary_color || "#2563eb"})`,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 h-full flex flex-col justify-end p-4 md:p-8 max-w-5xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => navigate("/leagues")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Ligas
          </Button>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] border-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                <Badge variant="outline" className="text-[10px] border-white/30 text-white/80">
                  {FORMAT_LABELS[league.format]}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-white/30 text-white/80">
                  {league.game_type}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{league.name}</h1>
              <div className="flex items-center gap-4 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {league.current_participants}/{league.max_participants}
                </span>
                {league.prize_pool > 0 && (
                  <span className="flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" /> {league.prize_pool.toLocaleString()} {league.currency}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white/70 border-white/20 hover:bg-white/10 text-xs"
                  onClick={handleGenerateInvite}
                >
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copiado!" : "Convite"}
                </Button>
              )}
              {user && league.status === "registration" && (
                isParticipant ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-300 border-red-400/30 hover:bg-red-500/10 text-xs"
                    onClick={handleLeave}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleJoin}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Participar
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 w-full overflow-x-auto flex-nowrap mb-6">
            <TabsTrigger value="overview" className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap">
              Visao Geral
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap">
              <Users className="h-3.5 w-3.5 mr-1" /> Participantes
            </TabsTrigger>
            <TabsTrigger value="bracket" className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap">
              <Swords className="h-3.5 w-3.5 mr-1" /> Jogos
            </TabsTrigger>
            <TabsTrigger value="standings" className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Classificacao
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-white/60 data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-xs whitespace-nowrap">
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> Actividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:col-span-2 space-y-6"
              >
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Descricao</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {league.description || "Sem descricao disponivel."}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Regras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {league.game_type} - {FORMAT_DESCRIPTIONS[league.format]}
                    </p>
                    <Separator className="my-3 bg-white/10" />
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="text-white/40">Vitoria: <span className="text-white/70">+{league.points_per_win} pts</span></div>
                      <div className="text-white/40">Empate: <span className="text-white/70">+{league.points_per_draw} pts</span></div>
                      <div className="text-white/40">Derrota: <span className="text-white/70">+{league.points_per_loss} pts</span></div>
                      <div className="text-white/40">Melhor de: <span className="text-white/70">{league.wins_needed}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {prizeBreakdown.length > 0 && (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-400" /> Premios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {prizeBreakdown.map((p) => (
                        <div key={p.place} className="flex justify-between text-xs">
                          <span className="text-white/50">{p.place}o lugar</span>
                          <span className="text-white/80 font-medium">
                            {p.amount.toLocaleString()} {league.currency}
                            <span className="text-white/30 ml-1">({p.pct}%)</span>
                          </span>
                        </div>
                      ))}
                      {league.prize_description && (
                        <p className="text-[11px] text-white/30 mt-2">{league.prize_description}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-400" /> Datas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/40">Inscricoes abrem</span>
                      <span className="text-white/70">{formatDate(league.registration_opens_at)}</span>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="flex justify-between">
                      <span className="text-white/40">Inscricoes fecham</span>
                      <span className="text-white/70">{formatDate(league.registration_closes_at)}</span>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="flex justify-between">
                      <span className="text-white/40">Inicio</span>
                      <span className="text-white/70">{formatDate(league.starts_at)}</span>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="flex justify-between">
                      <span className="text-white/40">Fim</span>
                      <span className="text-white/70">{formatDate(league.ends_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            {participants.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">
                Nenhum participante ainda.
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {participants.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${league.primary_color}, ${league.secondary_color})`,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">
                            {p.display_name || p.profile?.display_name || `Jogador ${i + 1}`}
                          </p>
                          {p.rpg_class && (
                            <p className="text-[10px] text-purple-300/70 flex items-center gap-1">
                              <Shield className="h-3 w-3" /> {p.rpg_class} Nv.{p.rpg_level}
                            </p>
                          )}
                          <div className="flex gap-3 mt-1 text-[10px] text-white/40">
                            <span className="text-emerald-400/70">{p.wins}V</span>
                            <span className="text-amber-400/70">{p.draws}E</span>
                            <span className="text-red-400/70">{p.losses}D</span>
                            <span className="text-white/60">{p.points} pts</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="bracket">
            {matches.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">
                Nenhum jogo cadastrado ainda.
              </div>
            ) : isElimination ? (
              <div className="space-y-8 overflow-x-auto">
                {Object.entries(matchesByRound).map(([round, roundMatches]) => {
                  const roundNum = Number(round);
                  const isFinal = roundNum === Math.max(...Object.keys(matchesByRound).map(Number));
                  return (
                    <motion.div
                      key={round}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: roundNum * 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          className={`text-[10px] border-0 ${isFinal ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/50"}`}
                        >
                          {isFinal ? "Final" : `Ronda ${round}`}
                        </Badge>
                        <span className="text-[10px] text-white/30">{roundMatches.length} jogos</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {roundMatches.map((m) => {
                          const p1Win = m.winner_id && m.winner_id === m.player1_id;
                          const p2Win = m.winner_id && m.winner_id === m.player2_id;
                          return (
                            <Card
                              key={m.id}
                              className={`bg-white/5 border backdrop-blur-md transition-colors ${
                                m.status === "completed"
                                  ? "border-white/10"
                                  : m.status === "in_progress"
                                  ? "border-amber-500/40"
                                  : "border-white/5"
                              }`}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className={`font-medium truncate flex-1 ${p1Win ? "text-emerald-300" : "text-white/60"}`}
                                  >
                                    {m.player1_display || m.player1?.display_name || "TBD"}
                                  </span>
                                  <span className={`font-mono font-bold ml-2 ${p1Win ? "text-emerald-300" : "text-white/40"}`}>
                                    {m.player1_score}
                                  </span>
                                </div>
                                <div className="text-center text-[10px] text-white/20">VS</div>
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className={`font-medium truncate flex-1 ${p2Win ? "text-emerald-300" : "text-white/60"}`}
                                  >
                                    {m.player2_display || m.player2?.display_name || "TBD"}
                                  </span>
                                  <span className={`font-mono font-bold ml-2 ${p2Win ? "text-emerald-300" : "text-white/40"}`}>
                                    {m.player2_score}
                                  </span>
                                </div>
                                {m.status === "scheduled" && m.scheduled_at && (
                                  <p className="text-[10px] text-white/20 text-center mt-1">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {formatDate(m.scheduled_at)}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Round Robin / Swiss — group by round
              <div className="space-y-6">
                {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                  <motion.div
                    key={round}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Badge className="mb-3 text-[10px] bg-white/10 text-white/50 border-0">
                      Ronda {round} <span className="text-white/30 ml-1">({roundMatches.length} jogos)</span>
                    </Badge>
                    <div className="grid gap-2">
                      {roundMatches.map((m) => {
                        const p1Win = m.winner_id === m.player1_id;
                        const p2Win = m.winner_id === m.player2_id;
                        return (
                          <Card key={m.id} className="bg-white/5 border-white/5 backdrop-blur-md">
                            <CardContent className="p-3 flex items-center justify-between text-xs">
                              <span className={`font-medium ${p1Win ? "text-emerald-300" : "text-white/60"}`}>
                                {m.player1_display || m.player1?.display_name || "TBD"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${p1Win ? "text-emerald-300" : "text-white/40"}`}>
                                  {m.player1_score}
                                </span>
                                <span className="text-white/20">x</span>
                                <span className={`font-mono font-bold ${p2Win ? "text-emerald-300" : "text-white/40"}`}>
                                  {m.player2_score}
                                </span>
                              </div>
                              <span className={`font-medium text-right ${p2Win ? "text-emerald-300" : "text-white/60"}`}>
                                {m.player2_display || m.player2?.display_name || "TBD"}
                              </span>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="standings">
            {standings.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">
                Nenhuma classificacao disponivel.
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-3 text-white/40 font-medium">#</th>
                          <th className="text-left p-3 text-white/40 font-medium">Jogador</th>
                          {league.format === "rpg_championship" && (
                            <th className="text-left p-3 text-white/40 font-medium">Classe</th>
                          )}
                          <th className="text-center p-3 text-white/40 font-medium">V</th>
                          <th className="text-center p-3 text-white/40 font-medium">E</th>
                          <th className="text-center p-3 text-white/40 font-medium">D</th>
                          <th className="text-center p-3 text-white/40 font-medium">Pts</th>
                          <th className="text-right p-3 text-white/40 font-medium">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((p, i) => (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="p-3">
                              <span
                                className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold"
                                style={{
                                  background: i < 3
                                    ? `linear-gradient(135deg, ${league.primary_color}, ${league.secondary_color})`
                                    : "rgba(255,255,255,0.05)",
                                  color: i < 3 ? "white" : "rgba(255,255,255,0.4)",
                                }}
                              >
                                {i + 1}
                              </span>
                            </td>
                            <td className="p-3 text-white/80 font-medium">
                              {p.display_name || p.profile?.display_name || `Jogador ${i + 1}`}
                            </td>
                            {league.format === "rpg_championship" && (
                              <td className="p-3 text-purple-300/60">{p.rpg_class || "--"}</td>
                            )}
                            <td className="p-3 text-center text-emerald-400/70">{p.wins}</td>
                            <td className="p-3 text-center text-amber-400/70">{p.draws}</td>
                            <td className="p-3 text-center text-red-400/70">{p.losses}</td>
                            <td className="p-3 text-center text-white font-bold">{p.points}</td>
                            <td className="p-3 text-right text-white/50">{p.score_for}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {activity.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">
                Nenhuma actividade registada.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activity.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="mt-0.5 text-white/30">
                      {ACTIVITY_ICONS[a.type] || <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs">
                        {a.title || a.type}
                      </p>
                      {a.body && (
                        <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1">{a.body}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0 whitespace-nowrap">
                      {timeAgo(a.created_at)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
