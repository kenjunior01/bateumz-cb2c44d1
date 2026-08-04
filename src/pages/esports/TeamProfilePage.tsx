'use client';

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Star, Shield, Calendar, MapPin, ExternalLink,
  Gamepad2, TrendingUp, Crown, Medal, Swords, Target, CheckCircle,
  MessageSquare, DollarSign, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  getTeam,
  getTeamMembers,
  type EsportTeam,
  type TeamMember,
} from '@/lib/esports';
import {
  getUserAchievements,
  getReputation as getUserReputation,
  type UserAchievement,
  type UserReputation,
} from '@/lib/esports-advanced';

const sb: any = supabase;

// ============================================================
// Types auxiliares
// ============================================================

interface MemberProfile {
  member: TeamMember;
  username: string;
  avatar_url: string | null;
  reputation: UserReputation | null;
  achievements: (UserAchievement & { achievement?: any })[];
}

interface ChampHistoryEntry {
  id: string;
  championship_id: string;
  championship_name: string;
  championship_slug: string;
  championship_cover: string | null;
  placement: number | null;
  prize_won: number | null;
  registered_at: string;
  completed_at: string | null;
  matches_won: number;
  matches_lost: number;
  total_points: number;
  status: string;
}

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getCountryFlag(country: string | null): string {
  if (!country) return '';
  const codeMap: Record<string, string> = {
    br: '🇧🇷',
    pt: '🇵🇹',
    us: '🇺🇸',
    ar: '🇦🇷',
    cl: '🇨🇱',
    mx: '🇲🇽',
    co: '🇨🇴',
    pe: '🇵🇪',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    gb: '🇬🇧',
    kr: '🇰🇷',
    jp: '🇯🇵',
    cn: '🇨🇳',
  };
  return codeMap[country.toLowerCase()] || '';
}

function getRegionLabel(region: string | null): string {
  if (!region) return 'N/A';
  const labels: Record<string, string> = {
    br: 'Brasil',
    na: 'América do Norte',
    eu: 'Europa',
    asia: 'Ásia',
    latam: 'América Latina',
  };
  return labels[region.toLowerCase()] || region;
}

function getRoleBadgeVariant(role: string): {
  label: string;
  className: string;
} {
  const r = role.toLowerCase();
  if (r === 'capitao' || r === 'captain') {
    return { label: 'Capitao', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' };
  }
  if (r === 'jogador' || r === 'player') {
    return { label: 'Jogador', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' };
  }
  if (r === 'suplente' || r === 'substitute') {
    return { label: 'Suplente', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30' };
  }
  if (r === 'treinador' || r === 'coach') {
    return { label: 'Treinador', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30' };
  }
  if (r === 'gerente' || r === 'manager') {
    return { label: 'Gerente', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' };
  }
  return { label: role, className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30' };
}

function getPlacementBadge(placement: number | null) {
  if (!placement || placement <= 0) return null;
  if (placement === 1) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
        <Crown className="w-3 h-3" />
        1o Lugar
      </Badge>
    );
  }
  if (placement === 2) {
    return (
      <Badge className="bg-zinc-400/20 text-zinc-300 border-zinc-400/30 gap-1">
        <Medal className="w-3 h-3" />
        2o Lugar
      </Badge>
    );
  }
  if (placement === 3) {
    return (
      <Badge className="bg-amber-700/20 text-amber-600 border-amber-700/30 gap-1">
        <Medal className="w-3 h-3" />
        3o Lugar
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-zinc-400 border-zinc-700">
      {placement}o Lugar
    </Badge>
  );
}

function getRatingColor(rating: number): string {
  if (rating >= 2000) return 'text-red-400';
  if (rating >= 1600) return 'text-purple-400';
  if (rating >= 1200) return 'text-yellow-400';
  if (rating >= 800) return 'text-emerald-400';
  return 'text-zinc-400';
}

function getRatingLabel(rating: number): string {
  if (rating >= 2000) return 'Lendario';
  if (rating >= 1600) return 'Diamante';
  if (rating >= 1200) return 'Ouro';
  if (rating >= 800) return 'Prata';
  return 'Bronze';
}

function getWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

// ============================================================
// Componente Principal
// ============================================================

export default function TeamProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<EsportTeam | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [champHistory, setChampHistory] = useState<ChampHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao-geral');

  useEffect(() => {
    if (!id) return;
    loadTeamData();
  }, [id]);

  async function loadTeamData() {
    setLoading(true);
    try {
      const teamData = await getTeam(id);
      setTeam(teamData);

      if (teamData) {
        const membersData = await getTeamMembers(teamData.id);
        const enrichedMembers = await enrichMembers(membersData);
        setMembers(enrichedMembers);
        const history = await fetchChampHistory(teamData.id);
        setChampHistory(history);
      }
    } catch (err) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function enrichMembers(membersData: TeamMember[]): Promise<MemberProfile[]> {
    const enriched: MemberProfile[] = [];

    for (const member of membersData) {
      try {
        const { data: profile } = await sb
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', member.user_id)
          .single();

        let reputation: UserReputation | null = null;
        try {
          reputation = await getUserReputation(member.user_id);
        } catch {
          // noop
        }

        let achievements: (UserAchievement & { achievement?: any })[] = [];
        try {
          achievements = await getUserAchievements(member.user_id);
        } catch {
          // noop
        }

        enriched.push({
          member,
          username: profile?.username ?? 'Desconhecido',
          avatar_url: profile?.avatar_url ?? null,
          reputation,
          achievements: achievements.filter((a) => a.is_completed),
        });
      } catch {
        enriched.push({
          member,
          username: 'Desconhecido',
          avatar_url: null,
          reputation: null,
          achievements: [],
        });
      }
    }

    return enriched;
  }

  async function fetchChampHistory(teamId: string): Promise<ChampHistoryEntry[]> {
    try {
      const { data: champTeams } = await sb
        .from('esport_champ_teams')
        .select('id, championship_id, placement, prize_won, registered_at, matches_won, matches_lost, total_points, status')
        .eq('team_id', teamId)
        .not('placement', 'is', null)
        .order('registered_at', { ascending: false });

      if (!champTeams || champTeams.length === 0) return [];

      const champIds = champTeams.map((ct: any) => ct.championship_id);
      const { data: championships } = await sb
        .from('esport_championships')
        .select('id, name, slug, cover_image_url')
        .in('id', champIds);

      const champMap: Record<string, any> = {};
      for (const c of championships ?? []) {
        champMap[c.id] = c;
      }

      return champTeams
        .map((ct: any) => {
          const champ = champMap[ct.championship_id];
          if (!champ) return null;
          return {
            id: ct.id,
            championship_id: ct.championship_id,
            championship_name: champ.name,
            championship_slug: champ.slug,
            championship_cover: champ.cover_image_url,
            placement: ct.placement,
            prize_won: ct.prize_won,
            registered_at: ct.registered_at,
            completed_at: champ.completed_at ?? null,
            matches_won: ct.matches_won ?? 0,
            matches_lost: ct.matches_lost ?? 0,
            total_points: ct.total_points ?? 0,
            status: ct.status,
          };
        })
        .filter(Boolean) as ChampHistoryEntry[];
    } catch {
      return [];
    }
  }

  // ============================================================
  // Loading skeleton
  // ============================================================

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Swords className="w-16 h-16 text-zinc-600" />
        <p className="text-zinc-400 text-lg">Equipe nao encontrada</p>
        <Button variant="outline" onClick={() => navigate('/esports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Hub
        </Button>
      </div>
    );
  }

  const winRate = getWinRate(team.total_wins, team.total_losses);
  const totalGames = team.total_wins + team.total_losses;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex flex-col">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>

      {/* Team Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        {/* Banner */}
        <div
          className="h-48 rounded-xl overflow-hidden relative"
          style={{
            background: team.banner_url
              ? `url(${team.banner_url}) center/cover no-repeat`
              : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Logo overlapping banner */}
        <div className="flex items-end gap-5 -mt-12 px-4 relative z-10">
          <Avatar className="w-24 h-24 border-4 border-[#06060b] rounded-xl shadow-xl">
            <AvatarImage src={team.logo_url ?? undefined} alt={team.name} />
            <AvatarFallback className="bg-zinc-800 text-zinc-200 text-2xl font-bold rounded-xl">
              {team.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="pb-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-white truncate">{team.name}</h1>
              {team.tag && (
                <span className="text-zinc-400 text-sm font-mono">[{team.tag}]</span>
              )}
              {team.country && (
                <span className="text-xl">{getCountryFlag(team.country)}</span>
              )}
              {team.is_verified && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verificada
                </Badge>
              )}
              <Badge className={`${getRatingColor(team.rating)} border-zinc-700 gap-1`}>
                <Star className="w-3 h-3" />
                {getRatingLabel(team.rating)} ({team.rating})
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        <StatCard icon={<Trophy className="w-4 h-4 text-yellow-400" />} label="Torneios" value={team.total_tournaments} />
        <StatCard icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} label="Vitorias" value={team.total_wins} />
        <StatCard icon={<XCircleIcon />} label="Derrotas" value={team.total_losses} />
        <WinRateCard value={winRate} />
        <StatCard icon={<Star className="w-4 h-4 text-purple-400" />} label="Rating" value={team.rating} />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-8"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start rounded-lg h-11">
            <TabsTrigger
              value="visao-geral"
              className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 rounded-md px-4"
            >
              Visao Geral
            </TabsTrigger>
            <TabsTrigger
              value="roster"
              className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 rounded-md px-4"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 rounded-md px-4"
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Historico
            </TabsTrigger>
            <TabsTrigger
              value="estatisticas"
              className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 rounded-md px-4"
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Estatisticas
            </TabsTrigger>
          </TabsList>

          {/* Visao Geral */}
          <TabsContent value="visao-geral" className="mt-6">
            <OverviewTab team={team} members={members} />
          </TabsContent>

          {/* Roster */}
          <TabsContent value="roster" className="mt-6">
            <RosterTab members={members} />
          </TabsContent>

          {/* Historico */}
          <TabsContent value="historico" className="mt-6">
            <HistoryTab history={champHistory} />
          </TabsContent>

          {/* Estatisticas */}
          <TabsContent value="estatisticas" className="mt-6">
            <StatsTab team={team} members={members} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function XCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-red-400"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-800/80">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 truncate">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WinRateCard({ value }: { value: number }) {
  let barColor = 'bg-red-500';
  if (value >= 70) barColor = 'bg-emerald-500';
  else if (value >= 50) barColor = 'bg-yellow-500';
  else if (value >= 30) barColor = 'bg-orange-500';

  return (
    <Card className="bg-zinc-900/80 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-zinc-800/80">
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 truncate">Taxa de Vitoria</p>
            <p className="text-lg font-bold text-white">{value}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Visao Geral Tab
// ============================================================

function OverviewTab({ team, members }: { team: EsportTeam; members: MemberProfile[] }) {
  const allAchievements = members.flatMap((m) => m.achievements);
  const uniqueAchievementIds = [...new Set(allAchievements.map((a) => a.achievement_id))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Description and info */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
              Sobre a Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-300 leading-relaxed">
              {team.description || 'Nenhuma descricao fornecida por esta equipe.'}
            </p>
          </CardContent>
        </Card>

        {/* Info grid */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-zinc-400" />
              Informacoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                icon={<MapPin className="w-4 h-4 text-zinc-500" />}
                label="Regiao"
                value={getRegionLabel(team.region)}
              />
              <InfoItem
                icon={<Users className="w-4 h-4 text-zinc-500" />}
                label="Membros"
                value={`${members.length} membro${members.length !== 1 ? 's' : ''}`}
              />
              <InfoItem
                icon={<Calendar className="w-4 h-4 text-zinc-500" />}
                label="Criado em"
                value={formatDate(team.created_at)}
              />
              {team.discord_url && (
                <InfoItem
                  icon={<Gamepad2 className="w-4 h-4 text-indigo-400" />}
                  label="Discord"
                  value={(
                    <a
                      href={team.discord_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      Servidor do Discord
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                />
              )}
              {team.social_links &&
                Object.entries(team.social_links).map(([platform, url]) => (
                  <InfoItem
                    key={platform}
                    icon={<ExternalLink className="w-4 h-4 text-zinc-500" />}
                    label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    value={(
                      <a
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                      >
                        Visitar
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Achievements showcase */}
      <div className="space-y-6">
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Conquistas do Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uniqueAchievementIds.length === 0 ? (
              <div className="text-center py-6">
                <Medal className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Nenhuma conquista ainda</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allAchievements.slice(0, 20).map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {ach.achievement?.name ?? 'Conquista Desconhecida'}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {ach.achievement?.description ?? ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats card */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(team.total_earnings)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Total acumulado em premios</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40">
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="text-sm text-white">{value}</div>
      </div>
    </div>
  );
}

// ============================================================
// Roster Tab
// ============================================================

function RosterTab({ members }: { members: MemberProfile[] }) {
  // Sort: captain first, then coach, then players, then substitutes, then manager
  const roleOrder: Record<string, number> = {
    capitao: 0,
    captain: 0,
    treinador: 1,
    coach: 1,
    jogador: 2,
    player: 2,
    suplente: 3,
    substitute: 3,
    gerente: 4,
    manager: 4,
  };

  const sorted = [...members].sort((a, b) => {
    const aOrder = roleOrder[a.member.role.toLowerCase()] ?? 99;
    const bOrder = roleOrder[b.member.role.toLowerCase()] ?? 99;
    return aOrder - bOrder;
  });

  if (sorted.length === 0) {
    return (
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-400">Nenhum membro nesta equipe</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((mp, idx) => {
        const roleBadge = getRoleBadgeVariant(mp.member.role);
        return (
          <motion.div
            key={mp.member.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 border-2 border-zinc-700 flex-shrink-0">
                    <AvatarImage src={mp.avatar_url ?? undefined} alt={mp.username} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-300 font-semibold">
                      {mp.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{mp.username}</p>
                      <Badge
                        variant="outline"
                        className={roleBadge.className}
                      >
                        {roleBadge.label}
                      </Badge>
                    </div>

                    {(mp.member.game_username || mp.member.game_uid) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Gamepad2 className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400 truncate">
                          {mp.member.game_username}
                          {mp.member.game_uid ? ` (${mp.member.game_uid})` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs text-zinc-500">
                        Entrou em {formatDate(mp.member.joined_at)}
                      </span>
                    </div>

                    {mp.reputation && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-yellow-400 font-medium">
                          {mp.reputation.reputation_title || 'Sem titulo'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ({mp.reputation.karma_points} karma)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// Historico Tab
// ============================================================

function HistoryTab({ history }: { history: ChampHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Trophy className="w-12 h-12 text-zinc-700 mb-3" />
          <p className="text-zinc-400">Nenhuma participacao ainda</p>
          <p className="text-zinc-600 text-sm mt-1">
            Esta equipe ainda nao participou de nenhum campeonato.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
        >
          <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Championship cover or placeholder */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {entry.championship_cover ? (
                      <img
                        src={entry.championship_cover}
                        alt={entry.championship_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Trophy className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">
                      {entry.championship_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {getPlacementBadge(entry.placement)}
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.registered_at)}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        {entry.matches_won}V / {entry.matches_lost}D
                      </span>
                      {entry.total_points > 0 && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {entry.total_points} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prize */}
                {entry.prize_won != null && entry.prize_won > 0 && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-emerald-400 font-bold text-sm">
                      {formatCurrency(entry.prize_won)}
                    </p>
                    <p className="text-xs text-zinc-600">Premio</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// Estatisticas Tab
// ============================================================

function StatsTab({ team, members }: { team: EsportTeam; members: MemberProfile[] }) {
  const winRate = getWinRate(team.total_wins, team.total_losses);
  const totalGames = team.total_wins + team.total_losses;

  const statsCards = [
    {
      icon: <Swords className="w-5 h-5 text-cyan-400" />,
      label: 'Total de Jogos',
      value: totalGames,
      bg: 'bg-cyan-500/10',
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      label: 'Vitorias',
      value: team.total_wins,
      bg: 'bg-emerald-500/10',
    },
    {
      icon: <XCircleIcon />,
      label: 'Derrotas',
      value: team.total_losses,
      bg: 'bg-red-500/10',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
      label: 'Taxa de Vitoria',
      value: `${winRate}%`,
      bg: 'bg-yellow-500/10',
    },
    {
      icon: <Star className="w-5 h-5 text-purple-400" />,
      label: 'Rating Atual',
      value: team.rating,
      bg: 'bg-purple-500/10',
    },
    {
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      label: 'Ganhos Totais',
      value: formatCurrency(team.total_earnings),
      bg: 'bg-emerald-500/10',
    },
  ];

  // Members leaderboard sorted by karma
  const membersLeaderboard = [...members]
    .filter((m) => m.reputation)
    .sort((a, b) => (b.reputation?.karma_points ?? 0) - (a.reputation?.karma_points ?? 0));

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {statsCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Separator className="bg-zinc-800" />

      {/* Members leaderboard */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Ranking Interno
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLeaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Nenhum membro com reputacao registrada</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {membersLeaderboard.map((mp, idx) => (
                <div
                  key={mp.member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/70 transition-colors"
                >
                  {/* Rank position */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm
                    {idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : ''}
                    {idx === 1 ? 'bg-zinc-400/20 text-zinc-300' : ''}
                    {idx === 2 ? 'bg-amber-700/20 text-amber-600' : ''}
                    {idx > 2 ? 'bg-zinc-800 text-zinc-500' : ''}
                  ">
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-9 h-9 border border-zinc-700 flex-shrink-0">
                    <AvatarImage src={mp.avatar_url ?? undefined} alt={mp.username} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                      {mp.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{mp.username}</p>
                    <p className="text-xs text-zinc-500">
                      {mp.reputation?.reputation_title || 'Sem titulo'}
                    </p>
                  </div>

                  {/* Karma */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-yellow-400">
                      {mp.reputation?.karma_points ?? 0}
                    </p>
                    <p className="text-xs text-zinc-600">karma</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <Skeleton className="h-48 w-full rounded-xl" />

      <div className="flex items-end gap-5 -mt-12 px-4 relative z-10">
        <Skeleton className="w-24 h-24 rounded-xl border-4 border-[#06060b]" />
        <div className="space-y-2 pb-2 flex-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Skeleton className="h-11 w-full rounded-lg" />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-800/40">
                      <Skeleton className="h-3 w-14 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
