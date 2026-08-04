'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Users,
  Medal,
  Star,
  TrendingUp,
  ChevronRight,
  Search,
  Clock,
  Zap,
  Flame,
  ArrowLeft,
  Play,
  BarChart3,
  CircleDot,
  XCircle,
  CheckCircle,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/lib/esports-advanced';
import { GAME_EMOJIS } from '@/lib/esports';

// Tipos de filtro

type FilterTab = 'all' | 'active' | 'upcoming' | 'completed' | 'featured';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Em Curso' },
  { key: 'upcoming', label: 'A Iniciar' },
  { key: 'completed', label: 'Concluidas' },
  { key: 'featured', label: 'Destaques' },
];

// Cores de fundo para zonas de classificação

const PROMOTION_BG = 'bg-emerald-500/5';
const RELEGATION_BG = 'bg-red-500/5';
const STRIPE_BG = 'bg-white/[0.02]';
const HOVER_BG = 'hover:bg-white/5';

// Helper para formatar datas

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

// Helper para formatar moeda

function formatPrize(amount: number, currency: string): string {
  if (amount <= 0) return 'Sem premio';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase() === 'AOB' ? 'AOA' : (currency.toUpperCase() || 'AOA'),
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper para calcular KD

function calculateKD(kills: number, deaths: number): string {
  if (deaths === 0) return kills > 0 ? 'INF' : '0.00';
  return (kills / deaths).toFixed(2);
}

// Status badge color

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'upcoming': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'completed': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    case 'paused': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

// Icone de posicao para top 3

function PositionIcon({ position }: { position: number }) {
  if (position === 1) return <Trophy className="w-4 h-4 text-yellow-400" />;
  if (position === 2) return <Medal className="w-4 h-4 text-gray-300" />;
  if (position === 3) return <Medal className="w-4 h-4 text-amber-600" />;
  return <span className="text-zinc-500 text-sm font-medium">{position}</span>;
}

// Skeleton de carregamento para cards

function SeasonCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="h-1 bg-zinc-800" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-40 bg-zinc-800" />
          <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
        </div>
        <Skeleton className="h-4 w-28 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 bg-zinc-800" />
          <Skeleton className="h-4 w-48 bg-zinc-800" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 bg-zinc-800" />
          <Skeleton className="h-4 w-32 bg-zinc-800" />
        </div>
        <Skeleton className="h-2 w-full bg-zinc-800 rounded-full" />
        <Skeleton className="h-3 w-20 bg-zinc-800" />
      </div>
    </div>
  );
}

// Skeleton para a tabela de classificacao

function StandingsSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04]"
        >
          <Skeleton className="h-5 w-5 bg-zinc-800 rounded" />
          <Skeleton className="h-5 w-32 bg-zinc-800" />
          <div className="flex-1 flex gap-6 justify-end">
            <Skeleton className="h-4 w-6 bg-zinc-800" />
            <Skeleton className="h-4 w-6 bg-zinc-800" />
            <Skeleton className="h-4 w-6 bg-zinc-800" />
            <Skeleton className="h-4 w-6 bg-zinc-800" />
            <Skeleton className="h-5 w-10 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Cartao de Temporada Individual

function SeasonCard({
  season,
  onClick,
}: {
  season: Season;
  onClick: () => void;
}) {
  const progressPercent = season.max_teams > 0
    ? Math.round((season.registered_teams / season.max_teams) * 100)
    : 0;

  const gameEmoji = season.game_id ? (GAME_EMOJIS[season.game_id] || '') : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="rounded-xl border border-white/[0.06] overflow-hidden transition-all duration-200 group-hover:border-white/[0.12] group-hover:shadow-lg group-hover:shadow-black/20">
        <div
          className="h-[5px]"
          style={{
            background: `linear-gradient(90deg, ${season.primary_color || '#6d28d9'}, ${season.secondary_color || '#a855f7'})`,
          }}
        />

        <div className="p-5 relative">
          <div className="flex justify-between items-start mb-3">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 border ${getStatusColor(season.status)}`}
            >
              {SEASON_STATUS_LABELS[season.status] || season.status}
            </Badge>

            {season.is_featured && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>

          {season.status === 'active' && (
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Em Curso
              </span>
            </div>
          )}

          <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-white/90">
            {season.name}
          </h3>

          <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-3">
            {gameEmoji && <span className="text-base">{gameEmoji}</span>}
            <span>{season.game_id || 'Jogo nao definido'}</span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(season.start_date)} — {formatDate(season.end_date)}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Trophy className="w-3.5 h-3.5" />
              <span>{formatPrize(season.prize_pool, season.currency)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-zinc-500">
              <span>Equipas</span>
              <span className="text-zinc-400 font-medium">
                {season.registered_teams}/{season.max_teams}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-zinc-800" />
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-mono">
              V={season.points_win} E={season.points_draw} D={season.points_loss}
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Tabela de Classificacao estilo liga profissional

function StandingsTable({ teams }: { teams: SeasonTeam[] }) {
  if (!teams.length) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
        <p className="text-sm">Nenhuma equipa registada nesta temporada</p>
      </div>
    );
  }

  const promotionZoneCount = Math.min(4, Math.ceil(teams.length * 0.4));
  const relegationZoneStart = Math.max(teams.length - 2, promotionZoneCount + 1);

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-white/[0.06]">
              <th className="w-10 text-center py-3 px-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                #
              </th>
              <th className="text-left py-3 px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Equipa
              </th>
              <th className="w-10 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                J
              </th>
              <th className="w-10 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                V
              </th>
              <th className="w-10 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                E
              </th>
              <th className="w-10 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                D
              </th>
              <th className="w-16 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Pontos
              </th>
              <th className="w-12 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Kills
              </th>
              <th className="w-12 text-center py-3 px-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                KD
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => {
              const pos = idx + 1;
              const isPromotion = pos <= promotionZoneCount;
              const isRelegation = pos >= relegationZoneStart;
              const isStripe = pos % 2 === 0;

              let rowBg = '';
              if (isPromotion) rowBg = PROMOTION_BG;
              else if (isRelegation) rowBg = RELEGATION_BG;
              else if (isStripe) rowBg = STRIPE_BG;

              return (
                <tr
                  key={team.id}
                  className={`${rowBg} ${HOVER_BG} transition-colors border-b border-white/[0.03]`}
                >
                  <td className="text-center py-2.5 px-2">
                    <div className="flex items-center justify-center">
                      <PositionIcon position={pos} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      {team.team_logo ? (
                        <img
                          src={team.team_logo}
                          alt={team.team_name}
                          className="w-6 h-6 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Users className="w-3 h-3 text-zinc-500" />
                        </div>
                      )}
                      <span className="font-semibold text-white text-sm">
                        {team.team_name}
                      </span>
                      {team.win_streak >= 3 && (
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="text-center py-2.5 px-1 text-zinc-400">
                    {team.matches_played}
                  </td>
                  <td className="text-center py-2.5 px-1 text-emerald-400 font-medium">
                    {team.matches_won}
                  </td>
                  <td className="text-center py-2.5 px-1 text-amber-400 font-medium">
                    {team.matches_drawn}
                  </td>
                  <td className="text-center py-2.5 px-1 text-red-400 font-medium">
                    {team.matches_lost}
                  </td>
                  <td className="text-center py-2.5 px-1">
                    <span className="inline-flex items-center justify-center bg-white/[0.06] rounded px-2.5 py-0.5 font-bold text-white text-sm min-w-[32px]">
                      {team.points}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-1 text-zinc-400">
                    {team.total_kills}
                  </td>
                  <td className="text-center py-2.5 px-1 text-zinc-400 font-mono text-xs">
                    {calculateKD(team.total_kills, team.total_deaths)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.06] bg-zinc-900/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          <span className="text-[10px] text-zinc-500">Zona de classificacao</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500/50" />
          <span className="text-[10px] text-zinc-500">Zona de rebaixamento</span>
        </div>
      </div>
    </div>
  );
}

// Resultado de um jogo individual

function MatchRow({ match }: { match: SeasonMatch }) {
  const team1Win = match.winner_id === match.team1_id;
  const team2Win = match.winner_id === match.team2_id;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {match.team1_logo ? (
          <img src={match.team1_logo} alt={match.team1_name || ''} className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-zinc-800" />
        )}
        <span className={`text-sm truncate ${team1Win ? 'font-bold text-white' : match.is_draw ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {match.team1_name || 'Equipa 1'}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold tabular-nums min-w-[24px] text-center ${
          team1Win ? 'text-emerald-400' : match.is_draw ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {match.team1_score}
        </span>
        <span className="text-zinc-600 text-xs">vs</span>
        <span className={`text-lg font-bold tabular-nums min-w-[24px] text-center ${
          team2Win ? 'text-emerald-400' : match.is_draw ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {match.team2_score}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className={`text-sm truncate ${team2Win ? 'font-bold text-white' : match.is_draw ? 'text-zinc-300' : 'text-zinc-500'}`}>
          {match.team2_name || 'Equipa 2'}
        </span>
        {match.team2_logo ? (
          <img src={match.team2_logo} alt={match.team2_name || ''} className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-zinc-800" />
        )}
      </div>

      <div className="shrink-0 ml-2">
        {match.is_draw ? (
          <Minus className="w-4 h-4 text-amber-500" />
        ) : match.status === 'completed' ? (
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        ) : match.status === 'live' || match.status === 'in_progress' ? (
          <CircleDot className="w-4 h-4 text-red-500" />
        ) : match.status === 'cancelled' ? (
          <XCircle className="w-4 h-4 text-red-400" />
        ) : (
          <Clock className="w-4 h-4 text-zinc-600" />
        )}
      </div>
    </div>
  );
}

// Vista de Jogos agrupados por rodada

function MatchesView({ matches }: { matches: SeasonMatch[] }) {
  if (!matches.length) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Play className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
        <p className="text-sm">Nenhum jogo nesta temporada</p>
      </div>
    );
  }

  const grouped = matches.reduce<Record<number, SeasonMatch[]>>((acc, m) => {
    const round = m.round_number || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(m);
    return acc;
  }, {});

  const sortedRounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedRounds.map((round) => (
        <div key={round}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest shrink-0">
              Rodada {round}
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="space-y-1">
            {grouped[round].map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista de Equipas registadas

function TeamsView({ teams }: { teams: SeasonTeam[] }) {
  if (!teams.length) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Users className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
        <p className="text-sm">Nenhuma equipa registada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {teams.map((team, idx) => (
        <div
          key={team.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${HOVER_BG} transition-colors border-b border-white/[0.03]`}
        >
          <span className="text-xs text-zinc-600 font-mono w-6 text-center">{idx + 1}</span>
          {team.team_logo ? (
            <img
              src={team.team_logo}
              alt={team.team_name}
              className="w-7 h-7 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{team.team_name}</p>
            <p className="text-[11px] text-zinc-500">
              {team.matches_played} jogos
              {team.win_streak >= 3 && ' · '}
              {team.win_streak >= 3 && (
                <span className="text-orange-400">{team.win_streak}V seguidas</span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white">{team.points} pts</p>
            <p className="text-[11px] text-zinc-500">KD {calculateKD(team.total_kills, team.total_deaths)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vista de detalhe da temporada

function SeasonDetail({
  season,
  onBack,
}: {
  season: Season;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<SeasonTeam[]>([]);
  const [matches, setMatches] = useState<SeasonMatch[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoadingTeams(true);
        setLoadingMatches(true);

        const [teamsData, matchesData] = await Promise.all([
          getSeasonTeams(season.id),
          getSeasonMatches(season.id),
        ]);

        if (!cancelled) {
          setTeams(teamsData || []);
          setMatches(matchesData || []);
        }
      } catch {
        if (!cancelled) {
          setTeams([]);
          setMatches([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
          setLoadingMatches(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [season.id]);

  const gameEmoji = season.game_id ? (GAME_EMOJIS[season.game_id] || '') : '';

  const totalWins = teams.reduce((acc, t) => acc + t.matches_won, 0);
  const totalDraws = teams.reduce((acc, t) => acc + t.matches_drawn, 0);
  const totalLosses = teams.reduce((acc, t) => acc + t.matches_lost, 0);
  const totalKills = teams.reduce((acc, t) => acc + t.total_kills, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar as ligas</span>
      </button>

      <div
        className="h-[6px] rounded-full mb-6"
        style={{
          background: `linear-gradient(90deg, ${season.primary_color || '#6d28d9'}, ${season.secondary_color || '#a855f7'})`,
        }}
      />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              variant="outline"
              className={`text-xs border ${getStatusColor(season.status)}`}
            >
              {SEASON_STATUS_LABELS[season.status] || season.status}
            </Badge>
            {season.is_featured && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-[11px] text-yellow-500 font-medium">Destaque</span>
              </div>
            )}
            {season.status === 'active' && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Em Curso
                </span>
              </div>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{season.name}</h1>

          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            {gameEmoji && <span className="text-lg">{gameEmoji}</span>}
            <span>{season.game_id || 'Jogo nao definido'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(season.start_date)} — {formatDate(season.end_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-semibold">
              {formatPrize(season.prize_pool, season.currency)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Users className="w-4 h-4" />
            <span>{season.registered_teams}/{season.max_teams} equipas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-white/[0.06] p-3 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Jogos</p>
          <p className="text-xl font-bold text-white">{season.total_matches || matches.length}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] p-3 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Equipas</p>
          <p className="text-xl font-bold text-white">{season.registered_teams}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] p-3 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Rodadas</p>
          <p className="text-xl font-bold text-white">{season.total_rounds}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] p-3 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Kills Totais</p>
          <p className="text-xl font-bold text-white">{totalKills}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-zinc-600 mb-6 font-mono">
        <span>Sistema: V={season.points_win} E={season.points_draw} D={season.points_loss}</span>
        <span className="text-zinc-700">|</span>
        <span>{totalWins}V {totalDraws}E {totalLosses}D</span>
        <span className="text-zinc-700">|</span>
        <span>{season.bonus_points_per_kill > 0 ? `Bonus: +${season.bonus_points_per_kill}/kill` : 'Sem bonus'}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-white/[0.06] rounded-lg h-10 p-1">
          <TabsTrigger
            value="standings"
            className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md text-xs font-semibold uppercase tracking-wider h-8 px-4 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Classificacao
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md text-xs font-semibold uppercase tracking-wider h-8 px-4 transition-all"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Jogos
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md text-xs font-semibold uppercase tracking-wider h-8 px-4 transition-all"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Equipas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-4">
          {loadingTeams ? <StandingsSkeleton /> : <StandingsTable teams={teams} />}
        </TabsContent>

        <TabsContent value="matches" className="mt-4">
          {loadingMatches ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
                  <Skeleton className="h-4 w-28 bg-zinc-800" />
                  <Skeleton className="h-6 w-16 bg-zinc-800" />
                  <Skeleton className="h-4 w-28 bg-zinc-800" />
                  <Skeleton className="h-5 w-5 rounded-full bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <MatchesView matches={matches} />
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          {loadingTeams ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 bg-zinc-800" />
                  <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                  <Skeleton className="h-4 w-16 bg-zinc-800 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <TeamsView teams={teams} />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Pagina principal

export default function SeasonsPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [featuredSeasons, setFeaturedSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const loadSeasons = useCallback(async () => {
    try {
      setLoading(true);
      const [allSeasons, featured] = await Promise.all([
        getSeasons({ is_published: true }),
        getFeaturedSeasons(),
      ]);
      setSeasons(allSeasons || []);
      setFeaturedSeasons(featured || []);
    } catch {
      setSeasons([]);
      setFeaturedSeasons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  const filteredSeasons = useMemo(() => {
    let result: Season[] = [];

    if (activeFilter === 'featured') {
      result = featuredSeasons;
    } else if (activeFilter === 'all') {
      result = seasons;
    } else {
      result = seasons.filter((s) => s.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.game_id && s.game_id.toLowerCase().includes(query)) ||
          (s.description && s.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [seasons, featuredSeasons, activeFilter, searchQuery]);

  const handleSeasonClick = useCallback(async (season: Season) => {
    if (season.slug) {
      try {
        const detailed = await getSeasonBySlug(season.slug);
        if (detailed) {
          setSelectedSeason(detailed);
          return;
        }
      } catch {
        // fall through to use the season from the list
      }
    }
    setSelectedSeason(season);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedSeason(null);
  }, []);

  return (
    <div>
      <AnimatePresence mode="wait">
        {selectedSeason ? (
          <SeasonDetail
            key="detail"
            season={selectedSeason}
            onBack={handleBack}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  LIGAS E TEMPORADAS
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  Ligas profissionais com pontos corridos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 220, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <Input
                        placeholder="Pesquisar ligas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 bg-zinc-900 border-white/[0.08] text-sm text-white placeholder:text-zinc-600"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch((prev) => !prev)}
                  className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                >
                  {showSearch ? <XCircle className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </header>

            <nav className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                const count = tab.key === 'featured'
                  ? featuredSeasons.length
                  : tab.key === 'all'
                    ? seasons.length
                    : seasons.filter((s) => s.status === tab.key).length;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0
                      ${isActive
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-transparent text-zinc-500 border border-white/[0.08] hover:border-white/[0.15] hover:text-zinc-300'
                      }
                    `}
                  >
                    {tab.label}
                    <span
                      className={`
                        text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                        ${isActive
                          ? 'bg-black/10 text-black'
                          : 'bg-white/[0.05] text-zinc-600'
                        }
                      `}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SeasonCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredSeasons.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-zinc-700" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-400 mb-1">
                  {searchQuery ? 'Nenhuma liga encontrada' : 'Sem ligas disponiveis'}
                </h3>
                <p className="text-sm text-zinc-600">
                  {searchQuery
                    ? 'Tenta pesquisar com outros termos'
                    : 'Novas ligas serao adicionadas em breve'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredSeasons.map((season) => (
                    <SeasonCard
                      key={season.id}
                      season={season}
                      onClick={() => handleSeasonClick(season)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {!loading && filteredSeasons.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-xs text-zinc-700">
                  {filteredSeasons.length} {filteredSeasons.length === 1 ? 'liga encontrada' : 'ligas encontradas'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
