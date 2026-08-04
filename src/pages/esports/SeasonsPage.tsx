'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Users, Medal, Star, TrendingUp, Plus, ChevronRight, Search, MapPin, Clock, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import {
  getSeasons,
  getSeasonBySlug,
  getSeasonTeams,
  getSeasonMatches,
  getFeaturedSeasons,
  SEASON_STATUS_LABELS,
  type Season,
  type SeasonTeam,
  type SeasonMatch,
  type SeasonStatus,
} from '@/lib/esports-advanced';

// ============================================================
// GAME EMOJIS MAP
// ============================================================

const GAME_EMOJIS: Record<string, string> = {
  'free-fire': '\uD83D\uDD25',
  codm: '\uD83C\uDFAF',
  pubgm: '\uD83C\uDFAF',
  valorant: '\u26A1',
  fortnite: '\uD83C\uDFD7\uFE0F',
  cs2: '\uD83D\uDD2B',
  league: '\u2694\uFE0F',
  dota2: '\uD83D\uDC0D',
  apex: '\uD83D\uDE80',
  wild_rift: '\uD83C\uDFC6',
  mlbb: '\uD83D\uDCDC',
  clash_royale: '\uD83C\uDCCF',
  fifa: '\u26BD',
  rocket_league: '\uD83D\uDE80',
};

// ============================================================
// HELPERS
// ============================================================

function getGameEmoji(gameId?: string): string {
  if (!gameId) return '\uD83C\uDFAE';
  return GAME_EMOJIS[gameId] || '\uD83C\uDFAE';
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getStatusColor(status: SeasonStatus): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'upcoming': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'paused': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'completed': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/40';
    default: return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30';
  }
}

function getMatchStatusColor(status: string): string {
  switch (status) {
    case 'live': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'completed': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40';
    case 'in_progress': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    default: return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30';
  }
}

function getMatchStatusLabel(status: string): string {
  switch (status) {
    case 'live': return 'AO VIVO';
    case 'in_progress': return 'AO VIVO';
    case 'completed': return 'Concluido';
    case 'pending': return 'Pendente';
    case 'scheduled': return 'Agendado';
    default: return status;
  }
}

function computeKD(kills: number, deaths: number): string {
  if (deaths === 0) return kills > 0 ? `${kills.toFixed(1)}` : '0.0';
  return (kills / deaths).toFixed(2);
}

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const cardHover = {
  rest: { scale: 1, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  hover: { scale: 1.03, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
};

// ============================================================
// STATS CARD
// ============================================================

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <motion.div
      className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3"
      variants={fadeInUp}
      whileHover={{ scale: 1.05 }}
    >
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}

// ============================================================
// FEATURED SEASON CARD (Carousel Item)
// ============================================================

function FeaturedSeasonCard({ season, onClick }: { season: Season; onClick: () => void }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${season.primary_color || '#7c3aed'}, ${season.secondary_color || '#ec4899'})`,
      }}
      variants={fadeInUp}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 p-6 md:p-10 flex flex-col justify-between min-h-[280px] md:min-h-[340px]">
        <div className="flex items-center justify-between mb-4">
          <Badge className={`${getStatusColor(season.status)} border text-xs font-semibold`}>
            {SEASON_STATUS_LABELS[season.status] || season.status}
          </Badge>
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <Trophy className="w-4 h-4" />
            <span className="font-bold">{formatCurrency(season.prize_pool, season.currency)}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getGameEmoji(season.game_id)}</span>
            <span className="text-sm text-white/70 font-medium">{season.total_rounds} Rodadas</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2">{season.name}</h2>
          <p className="text-white/70 text-sm mb-4 line-clamp-2">{season.description || 'Temporada competitiva de eSports'}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(season.start_date)} - {formatDate(season.end_date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{season.registered_teams}/{season.max_teams} Equipas</span>
            </div>
          </div>
          <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
            Ver Temporada <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SEASON CARD (Grid Item)
// ============================================================

function SeasonCard({ season, onClick }: { season: Season; onClick: () => void }) {
  const fillPercent = season.max_teams > 0
    ? Math.min(100, Math.round((season.registered_teams / season.max_teams) * 100))
    : 0;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 cursor-pointer"
      style={{
        background: `linear-gradient(180deg, ${season.primary_color || '#7c3aed'}33 0%, rgba(10,10,15,0.9) 60%)`,
      }}
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Badge className={`${getStatusColor(season.status)} border text-xs font-semibold`}>
            {SEASON_STATUS_LABELS[season.status] || season.status}
          </Badge>
          {season.is_featured && (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>Destaque</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{getGameEmoji(season.game_id)}</span>
          <h3 className="text-lg font-bold text-white truncate">{season.name}</h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(season.start_date)} - {formatDate(season.end_date)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Trophy className="w-4 h-4" />
            <span>{formatCurrency(season.prize_pool, season.currency)}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            <span>{season.registered_teams}/{season.max_teams}</span>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Vagas preenchidas</span>
            <span>{fillPercent}%</span>
          </div>
          <Progress value={fillPercent} className="h-1.5 bg-white/10" />
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
          <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">V={season.points_win}</span>
          <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">E={season.points_draw}</span>
          <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded">D={season.points_loss}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// SEASON DETAIL VIEW
// ============================================================

function SeasonDetailView({
  season,
  onBack,
}: {
  season: Season;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<SeasonTeam[]>([]);
  const [matches, setMatches] = useState<SeasonMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState('classificacao');

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        const [teamsData, matchesData] = await Promise.all([
          getSeasonTeams(season.id),
          getSeasonMatches(season.id),
        ]);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (err) {
        console.error('Erro ao carregar detalhes da temporada:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [season.id]);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.matches_won - a.matches_lost;
      const bDiff = b.matches_won - b.matches_lost;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return a.total_kills - b.total_kills > 0 ? -1 : 1;
    });
  }, [teams]);

  const matchesByRound = useMemo(() => {
    const grouped: Record<number, SeasonMatch[]> = {};
    for (const m of matches) {
      const key = m.round_number || 1;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return grouped;
  }, [matches]);

  const sortedRounds = useMemo(() => {
    return Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  }, [matchesByRound]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <Button
        variant="ghost"
        className="text-zinc-400 hover:text-white hover:bg-white/10 mb-2"
        onClick={onBack}
      >
        <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
        Voltar as Temporadas
      </Button>

      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, ${season.primary_color || '#7c3aed'}, ${season.secondary_color || '#ec4899'})`,
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Badge className={`${getStatusColor(season.status)} border font-semibold`}>
              {SEASON_STATUS_LABELS[season.status] || season.status}
            </Badge>
            {season.is_featured && (
              <div className="flex items-center gap-1 text-amber-300 text-sm">
                <Star className="w-4 h-4 fill-amber-300" />
                <span>Temporada em Destaque</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{season.name}</h1>
          {season.description && (
            <p className="text-white/80 text-sm max-w-2xl mb-4">{season.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{getGameEmoji(season.game_id)}</span>
              <span>{season.game_id || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(season.start_date)} - {formatDate(season.end_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{formatCurrency(season.prize_pool, season.currency)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{season.registered_teams}/{season.max_teams} Equipas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>{season.total_rounds} Rodadas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label="Premio Total" value={formatCurrency(season.prize_pool, season.currency)} color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={Users} label="Equipas" value={`${season.registered_teams}/${season.max_teams}`} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Calendar} label="Rodadas" value={season.total_rounds} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Zap} label="Jogos" value={season.total_matches || matches.length} color="bg-purple-500/20 text-purple-400" />
      </div>

      <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
        <TabsList className="bg-white/5 border border-white/10 text-zinc-400">
          <TabsTrigger value="classificacao" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Trophy className="w-4 h-4 mr-1.5" />
            Classificacao
          </TabsTrigger>
          <TabsTrigger value="jogos" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-1.5" />
            Jogos
          </TabsTrigger>
          <TabsTrigger value="equipas" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-1.5" />
            Equipas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classificacao">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
          >
            {loading ? (
              <div className="p-8 text-center text-zinc-400">A carregar classificacao...</div>
            ) : sortedTeams.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma equipa registada nesta temporada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-zinc-400 font-semibold w-12 text-center">#</TableHead>
                      <TableHead className="text-zinc-400 font-semibold">Equipa</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">J</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">V</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">E</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">D</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">Pontos</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center hidden md:table-cell">Kills</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center hidden md:table-cell">Deaths</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center hidden md:table-cell">KD</TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-center">Rajada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeams.map((team, index) => {
                      const pos = index + 1;
                      const kd = computeKD(team.total_kills, team.total_deaths);
                      const isTop3 = pos <= 3;
                      const medalColors = ['text-amber-400', 'text-zinc-300', 'text-amber-700'];

                      return (
                        <TableRow
                          key={team.id}
                          className="border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-center font-bold">
                            {isTop3 ? (
                              <span className={`${medalColors[pos - 1]}`}>
                                <Medal className="w-5 h-5 inline-block" />
                              </span>
                            ) : (
                              <span className="text-zinc-400">{pos}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {team.team_logo ? (
                                <img
                                  src={team.team_logo}
                                  alt={team.team_name}
                                  className="w-8 h-8 rounded-lg object-cover border border-white/10"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-zinc-300">
                                  {team.team_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-semibold text-white">{team.team_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-zinc-300">{team.matches_played}</TableCell>
                          <TableCell className="text-center text-emerald-400 font-semibold">{team.matches_won}</TableCell>
                          <TableCell className="text-center text-amber-400">{team.matches_drawn}</TableCell>
                          <TableCell className="text-center text-red-400">{team.matches_lost}</TableCell>
                          <TableCell className="text-center font-black text-white text-lg">{team.points}</TableCell>
                          <TableCell className="text-center text-zinc-300 hidden md:table-cell">{team.total_kills}</TableCell>
                          <TableCell className="text-center text-zinc-300 hidden md:table-cell">{team.total_deaths}</TableCell>
                          <TableCell className="text-center text-zinc-300 hidden md:table-cell">{kd}</TableCell>
                          <TableCell className="text-center">
                            {team.win_streak >= 3 ? (
                              <span className="flex items-center justify-center gap-1 text-orange-400 font-bold">
                                <Zap className="w-4 h-4" />
                                {team.win_streak}
                              </span>
                            ) : team.win_streak > 0 ? (
                              <span className="text-emerald-400 font-semibold">+{team.win_streak}</span>
                            ) : team.loss_streak > 0 ? (
                              <span className="text-red-400">-{team.loss_streak}</span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="jogos">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="p-8 text-center text-zinc-400 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                A carregar jogos...
              </div>
            ) : sortedRounds.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum jogo encontrado nesta temporada.</p>
              </div>
            ) : (
              sortedRounds.map((round) => (
                <div key={round}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-400 font-bold text-sm">R{round}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Rodada {round}</h3>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-700 text-xs">
                      {matchesByRound[round].length} jogos
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {matchesByRound[round].map((match) => {
                      const isLive = match.status === 'live' || match.status === 'in_progress';
                      const isCompleted = match.status === 'completed';
                      const isTeam1Winner = isCompleted && match.winner_id === match.team1_id;
                      const isTeam2Winner = isCompleted && match.winner_id === match.team2_id;
                      const isDrawMatch = isCompleted && match.is_draw;

                      return (
                        <motion.div
                          key={match.id}
                          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {match.team1_logo ? (
                                  <img src={match.team1_logo} alt={match.team1_name} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                                    {match.team1_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <span className={`font-semibold truncate ${isTeam1Winner ? 'text-emerald-400' : isDrawMatch ? 'text-amber-400' : 'text-white'}`}>
                                  {match.team1_name || 'TBD'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 px-4">
                              <span className={`text-2xl font-black ${isTeam1Winner ? 'text-emerald-400' : isDrawMatch ? 'text-amber-400' : 'text-white'}`}>
                                {match.team1_score}
                              </span>
                              <span className="text-zinc-600 font-bold text-sm">vs</span>
                              <span className={`text-2xl font-black ${isTeam2Winner ? 'text-emerald-400' : isDrawMatch ? 'text-amber-400' : 'text-white'}`}>
                                {match.team2_score}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0 text-right">
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <span className={`font-semibold truncate ${isTeam2Winner ? 'text-emerald-400' : isDrawMatch ? 'text-amber-400' : 'text-white'}`}>
                                  {match.team2_name || 'TBD'}
                                </span>
                                {match.team2_logo ? (
                                  <img src={match.team2_logo} alt={match.team2_name} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                                    {match.team2_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              {match.map_name && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {match.map_name}
                                </span>
                              )}
                              {match.scheduled_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(match.scheduled_at)}
                                </span>
                              )}
                            </div>
                            <Badge className={`${getMatchStatusColor(match.status)} border text-xs`}>{getMatchStatusLabel(match.status)}</Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="equipas">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
          >
            {loading ? (
              <div className="p-8 text-center text-zinc-400">A carregar equipas...</div>
            ) : teams.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma equipa registada nesta temporada.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 font-mono text-sm w-6 text-center">{index + 1}</span>
                      {team.team_logo ? (
                        <img
                          src={team.team_logo}
                          alt={team.team_name}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg font-bold text-zinc-300">
                          {team.team_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{team.team_name}</p>
                        <p className="text-xs text-zinc-500">Registado em {formatDate(team.registered_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center hidden sm:block">
                        <p className="text-zinc-500 text-xs">Pontos</p>
                        <p className="font-bold text-white">{team.points}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-zinc-500 text-xs">V/E/D</p>
                        <p className="text-zinc-300">
                          <span className="text-emerald-400">{team.matches_won}</span>
                          {'/' }
                          <span className="text-amber-400">{team.matches_drawn}</span>
                          {'/' }
                          <span className="text-red-400">{team.matches_lost}</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-zinc-500 text-xs">KD</p>
                        <p className="font-semibold text-zinc-300">{computeKD(team.total_kills, team.total_deaths)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function SeasonsPage() {
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [featuredSeasons, setFeaturedSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todas');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [allSeasons, featured] = await Promise.all([
          getSeasons({ is_published: true }),
          getFeaturedSeasons(),
        ]);
        setSeasons(allSeasons);
        setFeaturedSeasons(featured);
      } catch (err) {
        console.error('Erro ao carregar temporadas:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const active = seasons.filter(s => s.status === 'active').length;
    const upcoming = seasons.filter(s => s.status === 'upcoming').length;
    const totalPrize = seasons.reduce((sum, s) => sum + (s.prize_pool || 0), 0);
    const totalTeams = seasons.reduce((sum, s) => sum + (s.registered_teams || 0), 0);
    return {
      total: seasons.length,
      active,
      upcoming,
      totalPrize,
      totalTeams,
    };
  }, [seasons]);

  const filteredSeasons = useMemo(() => {
    let filtered = [...seasons];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.game_id && s.game_id.toLowerCase().includes(q))
      );
    }

    switch (activeFilter) {
      case 'em_curso':
        filtered = filtered.filter(s => s.status === 'active');
        break;
      case 'a_iniciar':
        filtered = filtered.filter(s => s.status === 'upcoming');
        break;
      case 'concluidas':
        filtered = filtered.filter(s => s.status === 'completed');
        break;
      case 'destaques':
        filtered = filtered.filter(s => s.is_featured);
        break;
    }

    return filtered;
  }, [seasons, searchQuery, activeFilter]);

  const handleSelectSeason = (season: Season) => {
    setSelectedSeason(season);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedSeason(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {selectedSeason ? (
            <SeasonDetailView
              key={`detail-${selectedSeason.id}`}
              season={selectedSeason}
              onBack={handleBackToList}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <motion.section
                className="text-center mb-10"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.h1
                  className="text-4xl md:text-6xl font-black text-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #a78bfa, #ec4899, #f59e0b, #a78bfa)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 3s ease infinite',
                  }}
                >
                  LIGAS E TEMPORADAS
                </motion.h1>
                <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mb-8">
                  Explore todas as ligas e temporadas competitivas. Acompanhe classificacoes, resultados ao vivo e as melhores equipas em acao.
                </p>

                <motion.div
                  className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <StatCard icon={Trophy} label="Total Temporadas" value={stats.total} color="bg-purple-500/20 text-purple-400" />
                  <StatCard icon={Zap} label="Em Curso" value={stats.active} color="bg-emerald-500/20 text-emerald-400" />
                  <StatCard icon={TrendingUp} label="Premio Total" value={formatCurrency(stats.totalPrize, 'BRL')} color="bg-amber-500/20 text-amber-400" />
                  <StatCard icon={Users} label="Total Equipas" value={stats.totalTeams} color="bg-blue-500/20 text-blue-400" />
                </motion.div>
              </motion.section>

              <motion.div
                className="space-y-4"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
              >
                <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
                  <TabsList className="bg-white/5 border border-white/10 text-zinc-400 w-full flex h-auto flex-wrap">
                    <TabsTrigger value="todas" className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1">
                      Todas
                    </TabsTrigger>
                    <TabsTrigger value="em_curso" className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1">
                      <Zap className="w-4 h-4 mr-1.5 hidden sm:inline-block" />
                      Em Curso
                    </TabsTrigger>
                    <TabsTrigger value="a_iniciar" className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1">
                      <Clock className="w-4 h-4 mr-1.5 hidden sm:inline-block" />
                      A Iniciar
                    </TabsTrigger>
                    <TabsTrigger value="concluidas" className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1">
                      Concluidas
                    </TabsTrigger>
                    <TabsTrigger value="destaques" className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1">
                      <Star className="w-4 h-4 mr-1.5 hidden sm:inline-block" />
                      Destaques
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Pesquisar temporadas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-purple-500/50"
                  />
                </div>
              </motion.div>

              {!loading && featuredSeasons.length > 0 && activeFilter === 'todas' && !searchQuery && (
                <motion.section
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-bold text-white">Temporadas em Destaque</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {featuredSeasons.slice(0, 2).map((season) => (
                        <FeaturedSeasonCard
                          key={season.id}
                          season={season}
                          onClick={() => handleSelectSeason(season)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              )}

              <motion.section variants={fadeInUp} initial="initial" animate="animate" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {activeFilter === 'todas' && 'Todas as Temporadas'}
                    {activeFilter === 'em_curso' && 'Temporadas Em Curso'}
                    {activeFilter === 'a_iniciar' && 'Temporadas A Iniciar'}
                    {activeFilter === 'concluidas' && 'Temporadas Concluidas'}
                    {activeFilter === 'destaques' && 'Temporadas em Destaque'}
                    <span className="text-zinc-500 text-sm font-normal ml-2">({filteredSeasons.length})</span>
                  </h2>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-64 bg-white/5 rounded-2xl border border-white/10 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredSeasons.length === 0 ? (
                  <motion.div
                    className="text-center py-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                    <h3 className="text-lg font-semibold text-zinc-400 mb-2">Nenhuma temporada encontrada</h3>
                    <p className="text-zinc-500 text-sm">
                      {searchQuery
                        ? `Nenhum resultado para "${searchQuery}"`
                        : 'Nao ha temporadas disponiveis neste momento.'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <AnimatePresence>
                      {filteredSeasons.map((season) => (
                        <SeasonCard
                          key={season.id}
                          season={season}
                          onClick={() => handleSelectSeason(season)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
