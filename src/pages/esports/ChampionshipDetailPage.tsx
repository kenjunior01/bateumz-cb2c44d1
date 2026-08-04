'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Users, Calendar, MapPin, Radio, Eye, Share2, Shield, Copy, ExternalLink, ChevronDown, ChevronUp, Gamepad2, Clock, Star, Zap, AlertTriangle, Flag, MessageSquare, TrendingUp, Lock, ArrowLeft, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getChampionshipBySlug,
  getEsportGame,
  getChampTeams,
  getChampMatches,
  getChampStandings,
  getChampActivity,
  getTeamMembers,
  getTeams,
  getMatchPlacements,
  registerTeam,
  checkIn,
  makePrediction,
  getMatchPredictions,
  voteMVP,
  submitReport,
  GAME_EMOJIS,
  STATUS_LABELS,
  FORMAT_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  VERIFICATION_LABELS,
  GENRE_LABELS,
  PLATFORM_LABELS,
  DEFAULT_BR_PLACEMENT_POINTS,
  generateBracket,
  type Championship,
  type EsportGame,
  type ChampTeam,
  type EsportMatch,
  type TeamMember,
  type EsportActivity,
  type MatchPlacement,
  type Prediction,
  type BracketTree,
  type BracketRound,
  type BracketMatch,
  type MatchFormat,
  type ChampStatus,
  type TournamentFormat,
} from '@/lib/esports';

const sb: any = supabase;

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atras`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atras`;
  const days = Math.floor(hrs / 24);
  return `${days}d atras`;
}

function getStatusColor(status: ChampStatus): string {
  switch (status) {
    case 'live': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'registration_open': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'check_in': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'registration_closed': return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'completed': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40';
    default: return 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30';
  }
}

function getTeamStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'checked_in': return { label: 'Check-in Feito', color: 'bg-emerald-500/20 text-emerald-400' };
    case 'registered': return { label: 'Registado', color: 'bg-blue-500/20 text-blue-400' };
    case 'eliminated': return { label: 'Eliminado', color: 'bg-red-500/20 text-red-400' };
    case 'withdrawn': return { label: 'Retirado', color: 'bg-zinc-500/20 text-zinc-400' };
    default: return { label: status, color: 'bg-zinc-700/30 text-zinc-400' };
  }
}

export default function ChampionshipDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [champ, setChamp] = useState<Championship | null>(null);
  const [game, setGame] = useState<EsportGame | null>(null);
  const [teams, setTeams] = useState<ChampTeam[]>([]);
  const [matches, setMatches] = useState<EsportMatch[]>([]);
  const [standings, setStandings] = useState<ChampTeam[]>([]);
  const [activity, setActivity] = useState<EsportActivity[]>([]);
  const [bracket, setBracket] = useState<BracketTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedMatch, setSelectedMatch] = useState<EsportMatch | null>(null);
  const [matchPlacements, setMatchPlacements] = useState<MatchPlacement[]>([]);
  const [matchPredictions, setMatchPredictions] = useState<Prediction[]>([]);
  const [showRegDialog, setShowRegDialog] = useState(false);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamRosters, setTeamRosters] = useState<Record<string, TeamMember[]>>({});

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const champData = await getChampionshipBySlug(slug);
      if (!champData) return;
      setChamp(champData);

      const [gameData, teamsData, matchesData, standingsData, activityData] = await Promise.all([
        getEsportGame(champData.game_id),
        getChampTeams(champData.id),
        getChampMatches(champData.id),
        getChampStandings(champData.id),
        getChampActivity(champData.id, 30),
      ]);

      setGame(gameData);
      setTeams(teamsData);
      setMatches(matchesData);
      setStandings(standingsData);
      setActivity(activityData);

      // Generate bracket
      if (champData.auto_bracket && teamsData.length > 1) {
        const bracketData = generateBracket(
          teamsData.map(t => ({
            id: t.team_id || t.id,
            name: t.team_id ? (t as any).team_name || `Equipa #${t.id.slice(0, 6)}` : t.player_name || 'Jogador',
            logo_url: (t as any).team_logo || t.player_avatar,
            seed: t.seed,
          })),
          champData.tournament_format,
          champData.total_rounds,
        );
        setBracket(bracketData);
      }

      // Load user teams for registration
      if (user) {
        const { data: myTeams } = await sb.from('esport_team_members')
          .select('team_id, esport_teams!inner(name, logo_url, tag)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        setUserTeams((myTeams as any) || []);
      }

      // Load rosters for all teams
      const rosterPromises = teamsData
        .filter(t => t.team_id)
        .map(async (t) => {
          const members = await getTeamMembers(t.team_id!);
          return [t.team_id, members] as [string, TeamMember[]];
        });
      const rosters = await Promise.all(rosterPromises);
      const rosterMap: Record<string, TeamMember[]> = {};
      for (const [tid, members] of rosters) {
        rosterMap[tid] = members;
      }
      setTeamRosters(rosterMap);
    } catch (err) {
      console.error('Erro ao carregar campeonato:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMatchDetails = useCallback(async (match: EsportMatch) => {
    setSelectedMatch(match);
    try {
      const [placements, predictions] = await Promise.all([
        getMatchPlacements(match.id),
        getMatchPredictions(match.id),
      ]);
      setMatchPlacements(placements);
      setMatchPredictions(predictions);
    } catch (err) {
      console.error('Erro ao carregar detalhes da partida:', err);
    }
  }, []);

  const handleRegister = async () => {
    if (!champ || !user || !selectedTeam) return;
    try {
      await registerTeam(champ.id, { team_id: selectedTeam });
      setShowRegDialog(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao inscrever equipa');
    }
  };

  const handleCheckIn = async (champTeamId: string) => {
    try {
      await checkIn(champTeamId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao fazer check-in');
    }
  };

  const handleCopyLobby = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="py-6 px-4 max-w-7xl mx-auto">
        <Skeleton className="h-64 w-full bg-zinc-900 rounded-2xl" />
        <div className="py-6 space-y-4">
          <Skeleton className="h-10 w-80 bg-zinc-900 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-96 bg-zinc-900 rounded-2xl" />
            <Skeleton className="h-96 bg-zinc-900 rounded-2xl" />
            <Skeleton className="h-96 bg-zinc-900 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!champ) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
          <h2 className="text-2xl font-bold text-zinc-300">Campeonato nao encontrado</h2>
          <Button variant="ghost" className="mt-4 text-zinc-400" onClick={() => navigate('/esports')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Hub
          </Button>
        </div>
      </div>
    );
  }

  const emoji = game ? (GAME_EMOJIS[game.slug] || '🎮') : '🎮';
  const isLive = champ.status === 'live';
  const isCheckIn = champ.status === 'check_in';
  const isRegOpen = champ.status === 'registration_open';
  const progressPct = champ.max_teams > 0 ? Math.min((champ.registered_teams / champ.max_teams) * 100, 100) : 0;
  const prizeDist = champ.prize_distribution || { '1': 0.5, '2': 0.3, '3': 0.2 };
  const isBR = champ.tournament_format === 'battle_royale';

  const uniqueRounds = [...new Set(matches.map(m => m.round_number))].sort((a, b) => a - b);
  if (uniqueRounds.length > 0 && selectedRound > uniqueRounds[uniqueRounds.length - 1]) {
    setSelectedRound(uniqueRounds[0]);
  }

  const roundMatches = matches.filter(m => m.round_number === selectedRound);

  return (
    <div>
      <header className="relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${champ.primary_color || '#7c3aed'}, ${champ.secondary_color || '#1e1b4b'} 50%, ${champ.accent_color || '#06b6d4'})`,
            opacity: 0.7,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06060b] via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-16">
          <button onClick={() => navigate('/esports')} className="flex items-center gap-1 text-sm text-white/60 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-4xl">{emoji}</span>
                <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-sm">
                  {game?.name || 'Jogo'}
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-sm">
                  {FORMAT_LABELS[champ.match_format]}
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white backdrop-blur-sm">
                  {TOURNAMENT_FORMAT_LABELS[champ.tournament_format]}
                </Badge>
                <Badge className={`border backdrop-blur-sm ${getStatusColor(champ.status)} ${isLive ? 'animate-pulse' : ''}`}>
                  {isLive && <Radio className="w-3 h-3 mr-1" />}
                  {STATUS_LABELS[champ.status]}
                </Badge>
              </div>

              <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">{champ.name}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{champ.starts_at ? `${formatDate(champ.starts_at)} - ${formatDate(champ.ends_at || champ.starts_at)}` : 'Data TBA'}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{champ.region_server?.toUpperCase() || 'Global'}</span>
                {champ.verification_method && (
                  <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" />{VERIFICATION_LABELS[champ.verification_method]}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="text-center">
                <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Premio Total</div>
                <div className="text-3xl md:text-4xl font-black text-yellow-300">{formatCurrency(champ.prize_pool, champ.currency)}</div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {isRegOpen && user && (
                  <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold hover:from-emerald-400 hover:to-cyan-400" onClick={() => setShowRegDialog(true)}>
                    <Users className="w-4 h-4 mr-2" /> Inscrever Equipa
                  </Button>
                )}
                {isCheckIn && user && (
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold">
                    <Shield className="w-4 h-4 mr-2" /> Check-in
                  </Button>
                )}
                {champ.stream_url && (
                  <Button variant="outline" className="border-red-400/50 text-red-400 hover:bg-red-500/10">
                    <Radio className="w-4 h-4 mr-2" /> Ver Stream
                  </Button>
                )}
                <Button variant="outline" className="border-white/20 text-white/70 hover:text-white">
                  <Share2 className="w-4 h-4 mr-2" /> Partilhar
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <h3 className="text-sm font-bold text-white/60 mb-3">Distribuicao de Premios</h3>
              <div className="space-y-2">
                {Object.entries(prizeDist).map(([place, pct], i) => {
                  const amount = Math.round(champ.prize_pool * pct);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={place} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medals[i] || `#${place}`}</span>
                        <span className="text-sm text-white/80">{i === 0 ? '1o Lugar' : i === 1 ? '2o Lugar' : '3o Lugar'}</span>
                        <span className="text-xs text-white/40">({Math.round(pct * 100)}%)</span>
                      </div>
                      <span className="text-sm font-bold text-yellow-300">{formatCurrency(amount, champ.currency)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60 font-medium">Equipas Registadas</span>
                <span className="text-white font-bold">{champ.registered_teams}/{champ.max_teams}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${champ.primary_color || '#8b5cf6'}, ${champ.accent_color || '#06b6d4'})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>Minimo: {champ.min_teams}</span>
                <span>{Math.round(progressPct)}% preenchido</span>
              </div>
              {isLive && champ.total_viewers > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                  <Eye className="w-4 h-4" />
                  <span>{champ.total_viewers} espectadores</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {champ.stream_embed_url && (
        <div className="max-w-7xl mx-auto px-4 -mt-4 relative z-20">
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <iframe
              src={champ.stream_embed_url}
              className="w-full aspect-video"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/80 border border-zinc-800 w-full justify-start overflow-x-auto flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Visao Geral
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Equipas ({teams.length})
            </TabsTrigger>
            <TabsTrigger value="bracket" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <Gamepad2 className="w-3.5 h-3.5 mr-1.5" /> {isBR ? 'Jogos' : 'Bracket'} ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="standings" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Classificacao
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Atividade
            </TabsTrigger>
            {champ.allow_predictions && (
              <TabsTrigger value="predictions" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Star className="w-3.5 h-3.5 mr-1.5" /> Previsoes
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {champ.description && (
                  <Card className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader><CardTitle className="text-base">Descricao</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{champ.description}</p></CardContent>
                  </Card>
                )}

                {champ.custom_rules && (
                  <Card className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Regras</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{champ.custom_rules}</p></CardContent>
                  </Card>
                )}

                {champ.map_pool && champ.map_pool.length > 0 && (
                  <Card className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader><CardTitle className="text-base">Mapas</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {champ.map_pool.map((map, i) => (
                          <Badge key={i} variant="outline" className="border-zinc-600 text-zinc-300">{map}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader><CardTitle className="text-base">Informacoes</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Jogo', value: `${emoji} ${game?.name || 'N/A'}` },
                      { label: 'Formato', value: FORMAT_LABELS[champ.match_format] },
                      { label: 'Tipo', value: TOURNAMENT_FORMAT_LABELS[champ.tournament_format] },
                      { label: 'Plataforma', value: champ.platform ? PLATFORM_LABELS[champ.platform] : 'N/A' },
                      { label: 'Regiao', value: champ.region_server?.toUpperCase() || 'Global' },
                      { label: 'Verificacao', value: champ.verification_method ? VERIFICATION_LABELS[champ.verification_method] : 'N/A' },
                      { label: 'Melhor de', value: `${champ.best_of} jogos` },
                      { label: 'Pontos por Kill', value: champ.points_per_kill },
                      { label: 'Total de Rodadas', value: champ.total_rounds },
                    ].map((info, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-500">{info.label}</span>
                        <span className="text-zinc-200 font-medium">{info.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {champ.prize_image_url && (
                  <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
                    <img src={champ.prize_image_url} alt="Premio" className="w-full h-auto" />
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="teams" className="mt-6">
            {teams.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-500">Nenhuma equipa registada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {teams.map((ct, i) => {
                    const teamInfo = getTeamStatusLabel(ct.status);
                    const isExp = expandedTeam === ct.id;
                    const roster = ct.team_id ? teamRosters[ct.team_id] || [] : [];
                    return (
                      <motion.div key={ct.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className={`border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 transition-colors ${isExp ? 'ring-1 ring-purple-500/30' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-bold text-zinc-600 w-8 text-center">#{i + 1}</span>
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={ct.player_avatar || undefined} />
                                <AvatarFallback className="bg-zinc-800 text-sm">
                                  {ct.team_id ? 'EQ' : (ct.player_name || '?').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate">{ct.team_id ? `Equipa #${ct.team_id.slice(0, 6)}` : ct.player_name}</div>
                                <div className="text-xs text-zinc-500">Seed: {ct.seed ?? '-'} | {ct.total_points} pts</div>
                              </div>
                              <Badge className={teamInfo.color}>{teamInfo.label}</Badge>
                              {ct.is_checked_in && <Shield className="w-4 h-4 text-emerald-400" />}
                              {roster.length > 0 && (
                                <button onClick={() => setExpandedTeam(isExp ? null : ct.id)} className="text-zinc-500 hover:text-white">
                                  {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                            <AnimatePresence>
                              {isExp && roster.length > 0 && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <Separator className="my-3 bg-zinc-800" />
                                  <div className="space-y-2">
                                    {roster.map(m => (
                                      <div key={m.id} className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 px-1.5">{m.role}</Badge>
                                        <span className="text-zinc-300">{m.game_username || `User ${m.user_id.slice(0, 6)}`}</span>
                                        {m.game_uid && <span className="text-zinc-600 text-xs">ID: {m.game_uid}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
          <TabsContent value="bracket" className="mt-6">
            {matches.length === 0 ? (
              <div className="text-center py-16">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                <p className="text-zinc-500">Nenhuma partida disponivel ainda</p>
              </div>
            ) : (
              <>
                {uniqueRounds.length > 1 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {uniqueRounds.map(r => {
                      const totalRounds = uniqueRounds.length;
                      let label = `Rodada ${r}`;
                      if (r === totalRounds) label = 'Final';
                      else if (r === totalRounds - 1) label = 'Semifinal';
                      else if (r === totalRounds - 2) label = 'Quartas de Final';
                      return (
                        <Button
                          key={r}
                          variant={selectedRound === r ? 'default' : 'outline'}
                          className={selectedRound === r ? 'bg-purple-600 hover:bg-purple-500' : 'border-zinc-700 text-zinc-400'}
                          onClick={() => setSelectedRound(r)}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {isBR ? (
                  <Card className="border-zinc-800 bg-zinc-900/60">
                    <CardHeader>
                      <CardTitle className="text-base">Partida {selectedRound} - Classificacao</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedMatch && matchPlacements.length > 0 ? (
                        <BRRoundPlacements placements={matchPlacements} onMatchClick={loadMatchDetails} />
                      ) : roundMatches.length > 0 ? (
                        <div className="space-y-2">
                          {roundMatches.map(match => (
                            <button
                              key={match.id}
                              onClick={() => loadMatchDetails(match)}
                              className={`w-full text-left p-4 rounded-lg border transition-all ${
                                match.status === 'in_progress'
                                  ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                                  : 'border-zinc-800 hover:border-zinc-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {match.status === 'in_progress' && <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"><Radio className="w-3 h-3 mr-1" /> AO VIVO</Badge>}
                                  {match.map_name && <span className="text-xs text-zinc-500">{match.map_name}</span>}
                                </div>
                                <span className="text-xs text-zinc-600">{match.mode_name || `Partida ${match.match_number}`}</span>
                              </div>
                              {match.lobby_id && (
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Sala: {match.lobby_id}</span>
                                  {match.lobby_password && <span>Senha: {match.lobby_password}</span>}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-sm text-center py-8">Nenhuma partida nesta rodada</p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roundMatches.map(match => (
                      <MatchCard key={match.id} match={match} onClick={() => loadMatchDetails(match)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="standings" className="mt-6">
            <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/80">
                        <th className="text-left p-3 text-zinc-500 font-medium">#</th>
                        <th className="text-left p-3 text-zinc-500 font-medium">Equipa</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">V</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">D</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">E</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">Pontos</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">Kills</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">Mortes</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">K/D</th>
                        <th className="text-center p-3 text-zinc-500 font-medium">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((ct, i) => {
                        const kd = ct.total_deaths > 0 ? (ct.total_kills / ct.total_deaths).toFixed(2) : ct.total_kills.toFixed(2);
                        const score = ct.total_points + ct.total_kills * 2;
                        return (
                          <motion.tr
                            key={ct.id}
                            className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i < 3 ? 'bg-yellow-500/5' : ''}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <td className="p-3">
                              {i < 3 ? (
                                <span className={`text-lg ${i === 0 ? '' : i === 1 ? '' : ''}`}>{['🥇', '🥈', '🥉'][i]}</span>
                              ) : (
                                <span className="text-zinc-500">{i + 1}</span>
                              )}
                            </td>
                            <td className="p-3 font-medium text-white">{ct.team_id ? `Equipa #${ct.team_id.slice(0, 6)}` : ct.player_name}</td>
                            <td className="p-3 text-center text-emerald-400 font-medium">{ct.matches_won}</td>
                            <td className="p-3 text-center text-red-400 font-medium">{ct.matches_lost}</td>
                            <td className="p-3 text-center text-zinc-400">{ct.matches_played - ct.matches_won - ct.matches_lost}</td>
                            <td className="p-3 text-center text-purple-400 font-bold">{ct.total_points}</td>
                            <td className="p-3 text-center text-zinc-300">{ct.total_kills}</td>
                            <td className="p-3 text-center text-zinc-500">{ct.total_deaths}</td>
                            <td className="p-3 text-center text-cyan-400 font-medium">{kd}</td>
                            <td className="p-3 text-center text-yellow-400 font-bold">{score}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activity" className="mt-6">
            <Card className="border-zinc-800 bg-zinc-900/60">
              <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-8">Sem atividade registada</p>
                ) : (
                  activity.map((act, i) => {
                    const icon = act.type === 'registration' ? <Users className="w-4 h-4 text-emerald-400" />
                      : act.type === 'match_result' ? <Trophy className="w-4 h-4 text-yellow-400" />
                      : act.type === 'check_in' ? <Shield className="w-4 h-4 text-cyan-400" />
                      : act.type === 'prize_distributed' ? <Star className="w-4 h-4 text-yellow-400" />
                      : act.type === 'trash_talk' ? <MessageSquare className="w-4 h-4 text-pink-400" />
                      : <Zap className="w-4 h-4 text-purple-400" />;
                    return (
                      <motion.div
                        key={act.id}
                        className="flex gap-3 p-3 rounded-lg bg-zinc-800/30"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200">{act.title}</p>
                          {act.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{act.description}</p>}
                          <p className="text-[10px] text-zinc-700 mt-1">{timeAgo(act.created_at)}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {champ.allow_predictions && (
            <TabsContent value="predictions" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.filter(m => m.status === 'pending' || m.status === 'in_progress').map(match => (
                  <PredictionCard key={match.id} match={match} user={user} userId={user?.id || ''} />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Dialog open={!!selectedMatch} onOpenChange={() => { setSelectedMatch(null); setMatchPlacements([]); setMatchPredictions([]); }}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMatch?.status === 'in_progress' && <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"><Radio className="w-3 h-3 mr-1" /> AO VIVO</Badge>}
              {selectedMatch?.map_name || `Partida ${selectedMatch?.match_number || ''}`}
            </DialogTitle>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-4 py-4">
                <div className="text-center">
                  <Avatar className="w-14 h-14 mx-auto mb-2">
                    <AvatarImage src={selectedMatch.team1_logo || undefined} />
                    <AvatarFallback className="bg-zinc-800 text-lg">T1</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold text-white truncate">{selectedMatch.team1_name || 'TBD'}</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-black ${selectedMatch.status === 'in_progress' ? 'text-red-400' : 'text-zinc-300'}`}>
                    <span className={selectedMatch.winner_id === selectedMatch.team1_id ? 'text-emerald-400' : ''}>{selectedMatch.team1_score ?? 0}</span>
                    <span className="text-zinc-700 mx-1">:</span>
                    <span className={selectedMatch.winner_id === selectedMatch.team2_id ? 'text-emerald-400' : ''}>{selectedMatch.team2_score ?? 0}</span>
                  </div>
                </div>
                <div className="text-center">
                  <Avatar className="w-14 h-14 mx-auto mb-2">
                    <AvatarImage src={selectedMatch.team2_logo || undefined} />
                    <AvatarFallback className="bg-zinc-800 text-lg">T2</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-bold text-white truncate">{selectedMatch.team2_name || 'TBD'}</p>
                </div>
              </div>

              <Separator className="bg-zinc-800" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-500">Mapa</span>
                  <p className="text-zinc-200 font-medium">{selectedMatch.map_name || '-'}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Modo</span>
                  <p className="text-zinc-200 font-medium">{selectedMatch.mode_name || '-'}</p>
                </div>
              </div>
              {selectedMatch.lobby_id && (
                <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-zinc-500">ID da Sala</span>
                      <p className="text-sm font-mono text-cyan-400 font-bold">{selectedMatch.lobby_id}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => handleCopyLobby(selectedMatch.lobby_id!)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedMatch.lobby_password && (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-500">Senha</span>
                        <p className="text-sm font-mono text-yellow-400 font-bold">{selectedMatch.lobby_password}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => handleCopyLobby(selectedMatch.lobby_password!)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {selectedMatch.team1_screenshot_url && (
                  <div>
                    <span className="text-xs text-zinc-500">Print - {selectedMatch.team1_name}</span>
                    <img src={selectedMatch.team1_screenshot_url} alt="Screenshot" className="mt-1 rounded-lg border border-zinc-800 w-full" />
                  </div>
                )}
                {selectedMatch.team2_screenshot_url && (
                  <div>
                    <span className="text-xs text-zinc-500">Print - {selectedMatch.team2_name}</span>
                    <img src={selectedMatch.team2_screenshot_url} alt="Screenshot" className="mt-1 rounded-lg border border-zinc-800 w-full" />
                  </div>
                )}
              </div>
              {matchPlacements.length > 0 && (
                <BRRoundPlacements placements={matchPlacements} onMatchClick={() => {}} />
              )}
              <Separator className="bg-zinc-800" />
              <div className="flex gap-2">
                {user && selectedMatch.status === 'completed' && (
                  <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-400">
                    <Crown className="w-4 h-4 mr-1" /> Votar MVP
                  </Button>
                )}
                {user && (
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-400">
                    <Flag className="w-4 h-4 mr-1" /> Denunciar
                  </Button>
                )}
                {selectedMatch.replay_url && (
                  <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300" asChild>
                    <a href={selectedMatch.replay_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" /> Replay
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showRegDialog} onOpenChange={setShowRegDialog}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Inscrever Equipa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-zinc-400">Selecione a sua equipa</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                  <SelectValue placeholder="Escolher equipa..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {userTeams.map((ut: any) => (
                    <SelectItem key={ut.team_id} value={ut.team_id}>
                      {ut.esport_teams?.name || ut.team_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
              <p>Formato: {FORMAT_LABELS[champ.match_format]}</p>
              <p>Jogadores por equipa: {champ.max_players_per_team}</p>
              <p>Maximo de equipas: {champ.max_teams}</p>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold hover:from-emerald-400 hover:to-cyan-400"
              disabled={!selectedTeam}
              onClick={handleRegister}
            >
              Confirmar Inscricao
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function MatchCard({ match, onClick }: { match: EsportMatch; onClick: () => void }) {
  const isLive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all ${
        isLive
          ? 'border-red-500/40 bg-red-500/5 shadow-lg shadow-red-500/10'
          : isCompleted
          ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {isLive && <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"><Radio className="w-3 h-3 mr-1" /> AO VIVO</Badge>}
        {isCompleted && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">Finalizado</Badge>}
        {isPending && <Badge className="bg-zinc-700/30 text-zinc-400">Pendente</Badge>}
        {match.map_name && <span className="text-xs text-zinc-600">{match.map_name}</span>}
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={match.team1_logo || undefined} />
            <AvatarFallback className="bg-zinc-800 text-[10px]">T1</AvatarFallback>
          </Avatar>
          <span className={`text-sm font-semibold truncate ${match.winner_id === match.team1_id ? 'text-emerald-400' : 'text-zinc-300'}`}>{match.team1_name || 'TBD'}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-lg font-black ${match.winner_id === match.team1_id ? 'text-emerald-400' : isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{match.team1_score ?? '-'}</span>
            <span className="text-zinc-700 font-bold">VS</span>
            <span className={`text-lg font-black ${match.winner_id === match.team2_id ? 'text-emerald-400' : isCompleted ? 'text-zinc-500' : 'text-zinc-300'}`}>{match.team2_score ?? '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className={`text-sm font-semibold truncate ${match.winner_id === match.team2_id ? 'text-emerald-400' : 'text-zinc-300'}`}>{match.team2_name || 'TBD'}</span>
          <Avatar className="w-8 h-8">
            <AvatarImage src={match.team2_logo || undefined} />
            <AvatarFallback className="bg-zinc-800 text-[10px]">T2</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {match.lobby_id && (
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 bg-zinc-800/50 rounded px-2 py-1">
          <Lock className="w-3 h-3" /> <span>Sala: {match.lobby_id}</span>
        </div>
      )}
    </motion.div>
  );
}

function BRRoundPlacements({ placements, onMatchClick }: { placements: MatchPlacement[]; onMatchClick: (m: EsportMatch) => void }) {
  return (
    <div className="space-y-1">
      {placements.map((p, i) => (
        <motion.div
          key={p.id}
          className={`flex items-center gap-3 p-2.5 rounded-lg ${
            i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-800/30'
          }`}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <span className={`w-8 text-center font-bold text-sm ${
            i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600'
          }`}>#{p.placement}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate block">{p.team_name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="text-zinc-500">Kills</div>
              <div className="text-zinc-200 font-bold">{p.kills}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500">Mortes</div>
              <div className="text-zinc-400">{p.deaths}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500">Dano</div>
              <div className="text-zinc-400">{p.damage_dealt}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500">Pts</div>
              <div className="text-purple-400 font-bold">{p.points}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PredictionCard({ match, user, userId }: { match: EsportMatch; user: any; userId: string }) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [resolved, setResolved] = useState<boolean | null>(null);

  const handlePredict = async (winnerId: string) => {
    if (!userId || prediction) return;
    try {
      await makePrediction(match.id, userId, winnerId, 10);
      setPrediction(winnerId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500">{match.map_name || `Partida ${match.match_number}`}</span>
          {prediction && (
            <Badge className={resolved === true ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}>
              {resolved === true ? 'Correto!' : 'Aguardando'}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => handlePredict(match.team1_id!)}
            disabled={!!prediction || !user}
            className={`flex-1 p-3 rounded-lg border text-center transition-all ${
              prediction === match.team1_id ? 'border-emerald-500/50 bg-emerald-500/10'
              : match.winner_id === match.team1_id ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-zinc-700 hover:border-zinc-500'
            } ${prediction ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <p className="text-sm font-semibold text-zinc-200 truncate">{match.team1_name || 'TBD'}</p>
          </button>
          <span className="text-xs text-zinc-700 font-bold">VS</span>
          <button
            onClick={() => handlePredict(match.team2_id!)}
            disabled={!!prediction || !user}
            className={`flex-1 p-3 rounded-lg border text-center transition-all ${
              prediction === match.team2_id ? 'border-emerald-500/50 bg-emerald-500/10'
              : match.winner_id === match.team2_id ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-zinc-700 hover:border-zinc-500'
            } ${prediction ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <p className="text-sm font-semibold text-zinc-200 truncate">{match.team2_name || 'TBD'}</p>
          </button>
        </div>
        {!user && <p className="text-[10px] text-zinc-600 text-center mt-2">Inicie sessao para fazer palpites</p>}
      </CardContent>
    </Card>
  );
}
