'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  Users,
  Shield,
  Flame,
  Target,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getPlayerLeaderboard,
  getGlobalLeaderboard,
  getTopReputation,
  type UserReputation,
  type GlobalLeaderboardEntry,
} from '@/lib/esports-advanced';
import { getTeams, type EsportTeam } from '@/lib/esports';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_PLAYERS: GlobalLeaderboardEntry[] = [
  { user_id: 'p1', username: 'ShadowBlade', avatar_url: '', rating: 2850, total_matches: 342, wins: 289, karma_points: 4820, reputation_title: 'Lenda Viva' },
  { user_id: 'p2', username: 'NightFury99', avatar_url: '', rating: 2710, total_matches: 310, wins: 255, karma_points: 4510, reputation_title: 'Mestre Supremo' },
  { user_id: 'p3', username: 'PhantomX', avatar_url: '', rating: 2680, total_matches: 298, wins: 241, karma_points: 4290, reputation_title: 'Mestre Supremo' },
  { user_id: 'p4', username: 'AceKiller', avatar_url: '', rating: 2550, total_matches: 276, wins: 220, karma_points: 3980, reputation_title: 'Elite' },
  { user_id: 'p5', username: 'StormBreaker', avatar_url: '', rating: 2490, total_matches: 265, wins: 210, karma_points: 3750, reputation_title: 'Elite' },
  { user_id: 'p6', username: 'VenomStrike', avatar_url: '', rating: 2400, total_matches: 251, wins: 198, karma_points: 3620, reputation_title: 'Veterano' },
  { user_id: 'p7', username: 'CyberWolf', avatar_url: '', rating: 2380, total_matches: 245, wins: 190, karma_points: 3480, reputation_title: 'Veterano' },
  { user_id: 'p8', username: 'ThunderGod', avatar_url: '', rating: 2350, total_matches: 240, wins: 185, karma_points: 3340, reputation_title: 'Veterano' },
  { user_id: 'p9', username: 'IronFist', avatar_url: '', rating: 2310, total_matches: 232, wins: 178, karma_points: 3200, reputation_title: 'Veterano' },
  { user_id: 'p10', username: 'DarkMatter', avatar_url: '', rating: 2280, total_matches: 225, wins: 172, karma_points: 3100, reputation_title: 'Veterano' },
  { user_id: 'p11', username: 'BlazeRunner', avatar_url: '', rating: 2250, total_matches: 220, wins: 165, karma_points: 2980, reputation_title: 'Experiente' },
  { user_id: 'p12', username: 'FrostByte', avatar_url: '', rating: 2220, total_matches: 215, wins: 160, karma_points: 2890, reputation_title: 'Experiente' },
  { user_id: 'p13', username: 'NovaStar', avatar_url: '', rating: 2190, total_matches: 210, wins: 155, karma_points: 2780, reputation_title: 'Experiente' },
  { user_id: 'p14', username: 'RazorEdge', avatar_url: '', rating: 2160, total_matches: 205, wins: 148, karma_points: 2650, reputation_title: 'Experiente' },
  { user_id: 'p15', username: 'QuantumLeap', avatar_url: '', rating: 2130, total_matches: 198, wins: 142, karma_points: 2540, reputation_title: 'Ascendente' },
  { user_id: 'p16', username: 'ZeroGravity', avatar_url: '', rating: 2100, total_matches: 192, wins: 136, karma_points: 2420, reputation_title: 'Ascendente' },
  { user_id: 'p17', username: 'PixelKing', avatar_url: '', rating: 2070, total_matches: 188, wins: 130, karma_points: 2310, reputation_title: 'Ascendente' },
  { user_id: 'p18', username: 'NebulaX', avatar_url: '', rating: 2040, total_matches: 180, wins: 124, karma_points: 2200, reputation_title: 'Ascendente' },
  { user_id: 'p19', username: 'CosmicDust', avatar_url: '', rating: 2010, total_matches: 175, wins: 118, karma_points: 2100, reputation_title: 'Competidor' },
  { user_id: 'p20', username: 'VortexKing', avatar_url: '', rating: 1980, total_matches: 170, wins: 112, karma_points: 1990, reputation_title: 'Competidor' },
];

const MOCK_TEAMS: EsportTeam[] = [
  { id: 't1', name: 'Shadow Legion', slug: 'shadow-legion', tag: 'SHL', logo_url: '', banner_url: '', description: '', country: 'AO', region: 'AO', discord_url: null, social_links: null, owner_id: 'o1', is_verified: true, is_public: true, total_wins: 89, total_losses: 12, total_tournaments: 45, total_earnings: 250000, rating: 1720, created_at: '', updated_at: '' },
  { id: 't2', name: 'Phoenix Rising', slug: 'phoenix-rising', tag: 'PHX', logo_url: '', banner_url: '', description: '', country: 'BR', region: 'BR', discord_url: null, social_links: null, owner_id: 'o2', is_verified: true, is_public: true, total_wins: 82, total_losses: 18, total_tournaments: 42, total_earnings: 210000, rating: 1680, created_at: '', updated_at: '' },
  { id: 't3', name: 'Thunder Wolves', slug: 'thunder-wolves', tag: 'TWL', logo_url: '', banner_url: '', description: '', country: 'PT', region: 'EU', discord_url: null, social_links: null, owner_id: 'o3', is_verified: true, is_public: true, total_wins: 76, total_losses: 22, total_tournaments: 40, total_earnings: 185000, rating: 1640, created_at: '', updated_at: '' },
  { id: 't4', name: 'Iron Vanguard', slug: 'iron-vanguard', tag: 'IRV', logo_url: '', banner_url: '', description: '', country: 'AO', region: 'AO', discord_url: null, social_links: null, owner_id: 'o4', is_verified: true, is_public: true, total_wins: 71, total_losses: 25, total_tournaments: 38, total_earnings: 160000, rating: 1590, created_at: '', updated_at: '' },
  { id: 't5', name: 'Neon Strikers', slug: 'neon-strikers', tag: 'NNS', logo_url: '', banner_url: '', description: '', country: 'MZ', region: 'AO', discord_url: null, social_links: null, owner_id: 'o5', is_verified: false, is_public: true, total_wins: 65, total_losses: 30, total_tournaments: 35, total_earnings: 135000, rating: 1520, created_at: '', updated_at: '' },
  { id: 't6', name: 'Crimson Tide', slug: 'crimson-tide', tag: 'CRT', logo_url: '', banner_url: '', description: '', country: 'AO', region: 'AO', discord_url: null, social_links: null, owner_id: 'o6', is_verified: true, is_public: true, total_wins: 60, total_losses: 28, total_tournaments: 33, total_earnings: 120000, rating: 1480, created_at: '', updated_at: '' },
  { id: 't7', name: 'Arctic Foxes', slug: 'arctic-foxes', tag: 'AFX', logo_url: '', banner_url: '', description: '', country: 'BR', region: 'BR', discord_url: null, social_links: null, owner_id: 'o7', is_verified: false, is_public: true, total_wins: 55, total_losses: 32, total_tournaments: 30, total_earnings: 95000, rating: 1420, created_at: '', updated_at: '' },
  { id: 't8', name: 'Dark Horizon', slug: 'dark-horizon', tag: 'DKH', logo_url: '', banner_url: '', description: '', country: 'PT', region: 'EU', discord_url: null, social_links: null, owner_id: 'o8', is_verified: false, is_public: true, total_wins: 50, total_losses: 35, total_tournaments: 28, total_earnings: 80000, rating: 1370, created_at: '', updated_at: '' },
  { id: 't9', name: 'Solar Flare', slug: 'solar-flare', tag: 'SFL', logo_url: '', banner_url: '', description: '', country: 'AO', region: 'AO', discord_url: null, social_links: null, owner_id: 'o9', is_verified: false, is_public: true, total_wins: 45, total_losses: 38, total_tournaments: 25, total_earnings: 65000, rating: 1310, created_at: '', updated_at: '' },
  { id: 't10', name: 'Lunar Eclipse', slug: 'lunar-eclipse', tag: 'LEC', logo_url: '', banner_url: '', description: '', country: 'MZ', region: 'AO', discord_url: null, social_links: null, owner_id: 'o10', is_verified: false, is_public: true, total_wins: 40, total_losses: 40, total_tournaments: 22, total_earnings: 50000, rating: 1250, created_at: '', updated_at: '' },
  { id: 't11', name: 'Stellar Drift', slug: 'stellar-drift', tag: 'SDR', logo_url: '', banner_url: '', description: '', country: 'AO', region: 'AO', discord_url: null, social_links: null, owner_id: 'o11', is_verified: false, is_public: true, total_wins: 36, total_losses: 42, total_tournaments: 20, total_earnings: 40000, rating: 1180, created_at: '', updated_at: '' },
  { id: 't12', name: 'Venom Squad', slug: 'venom-squad', tag: 'VMS', logo_url: '', banner_url: '', description: '', country: 'BR', region: 'BR', discord_url: null, social_links: null, owner_id: 'o12', is_verified: false, is_public: true, total_wins: 32, total_losses: 45, total_tournaments: 18, total_earnings: 30000, rating: 1120, created_at: '', updated_at: '' },
];

const MOCK_REPUTATIONS: UserReputation[] = MOCK_PLAYERS.map((p, i) => ({
  id: `rep-${i}`,
  user_id: p.user_id,
  karma_points: p.karma_points,
  reputation_score: 4.5 + Math.random() * 0.5,
  total_matches: p.total_matches,
  total_wins: p.wins,
  total_reports_filed: Math.floor(Math.random() * 10),
  total_reports_against: Math.floor(Math.random() * 5),
  reports_confirmed: Math.floor(Math.random() * 3),
  reports_dismissed: Math.floor(Math.random() * 2),
  no_show_count: Math.floor(Math.random() * 2),
  disconnection_count: Math.floor(Math.random() * 4),
  sportsmanship_votes: 20 + Math.floor(Math.random() * 80),
  sportsmanship_total: 80 + Math.floor(Math.random() * 120),
  reputation_title: p.reputation_title,
  earned_badges: ['primeira_vitoria', 'streak_10'],
  created_at: '',
  updated_at: '',
}));

// ============================================================
// HELPERS
// ============================================================

function getWinRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

function getPositionColor(pos: number): string {
  if (pos === 1) return 'bg-amber-500/20 border-amber-500/30';
  if (pos === 2) return 'bg-zinc-400/15 border-zinc-400/25';
  if (pos === 3) return 'bg-orange-700/15 border-orange-700/25';
  if (pos <= 10) return 'bg-emerald-500/10 border-emerald-500/20';
  return 'bg-white/5 border-white/10';
}

function getPositionTextColor(pos: number): string {
  if (pos === 1) return 'text-amber-400';
  if (pos === 2) return 'text-zinc-300';
  if (pos === 3) return 'text-orange-400';
  if (pos <= 10) return 'text-emerald-400';
  return 'text-zinc-400';
}

function getPositionIcon(pos: number) {
  if (pos === 1) return <Crown className="w-4 h-4 text-amber-400" />;
  if (pos === 2) return <Medal className="w-4 h-4 text-zinc-300" />;
  if (pos === 3) return <Medal className="w-4 h-4 text-orange-400" />;
  return null;
}

function getRatingColor(rating: number): string {
  if (rating >= 1600) return 'text-red-400';
  if (rating >= 1400) return 'text-orange-400';
  if (rating >= 1200) return 'text-yellow-400';
  if (rating >= 1000) return 'text-emerald-400';
  return 'text-zinc-400';
}

function getRatingBg(rating: number): string {
  if (rating >= 1600) return 'bg-red-500/10 border-red-500/20';
  if (rating >= 1400) return 'bg-orange-500/10 border-orange-500/20';
  if (rating >= 1200) return 'bg-yellow-500/10 border-yellow-500/20';
  if (rating >= 1000) return 'bg-emerald-500/10 border-emerald-500/20';
  return 'bg-zinc-500/10 border-zinc-500/20';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTrendDirection(index: number): 'up' | 'down' | 'stable' {
  const patterns = [0, 1, 2, 4, 6, 9, 11, 14, 17, 19];
  if (patterns.includes(index % 20)) return 'up';
  if (patterns.includes((index + 5) % 20)) return 'down';
  return 'stable';
}

// ============================================================
// SKELETON COMPONENTS
// ============================================================

function PodiumSkeleton() {
  return (
    <div className="flex items-end justify-center gap-4 md:gap-8 pt-8 pb-4">
      {[140, 180, 120].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-32 h-4" style={{ height: `${h}px` }} />
        </div>
      ))}
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-20 h-3" />
      </div>
      <Skeleton className="w-16 h-4" />
      <Skeleton className="w-20 h-4" />
      <Skeleton className="w-24 h-2" />
      <Skeleton className="w-8 h-8" />
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <Skeleton className="w-10 h-10 rounded-lg mb-3" />
      <Skeleton className="w-24 h-4 mb-1" />
      <Skeleton className="w-16 h-6" />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<string>('jogadores');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<string>('karma');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [players, setPlayers] = useState<GlobalLeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<EsportTeam[]>([]);
  const [reputations, setReputations] = useState<UserReputation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [playerData, teamData, repData] = await Promise.all([
          getPlayerLeaderboard(50).catch(() => []),
          getTeams({ limit: 50, sort_by: 'rating', sort_dir: 'desc' }).catch(() => []),
          getTopReputation(50).catch(() => []),
        ]);

        setPlayers(playerData.length > 0 ? playerData : MOCK_PLAYERS);
        setTeams(teamData.length > 0 ? teamData : MOCK_TEAMS);
        setReputations(repData.length > 0 ? repData : MOCK_REPUTATIONS);
      } catch {
        setPlayers(MOCK_PLAYERS);
        setTeams(MOCK_TEAMS);
        setReputations(MOCK_REPUTATIONS);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const totalJogadores = players.length;
    const totalEquipas = teams.length;
    const maiorKarma = players.length > 0 ? Math.max(...players.map((p) => p.karma_points)) : 0;
    const mediaMatches =
      players.length > 0
        ? Math.round(players.reduce((acc, p) => acc + p.total_matches, 0) / players.length)
        : 0;
    return { totalJogadores, totalEquipas, maiorKarma, mediaMatches };
  }, [players, teams]);

  // Sort toggle
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField]
  );

  // Filtered + sorted players
  const filteredPlayers = useMemo(() => {
    let result = [...players];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => (p.username || '').toLowerCase().includes(q));
    }
    if (sortField === 'karma') {
      result.sort((a, b) =>
        sortDir === 'desc' ? b.karma_points - a.karma_points : a.karma_points - b.karma_points
      );
    } else if (sortField === 'matches') {
      result.sort((a, b) =>
        sortDir === 'desc' ? b.total_matches - a.total_matches : a.total_matches - b.total_matches
      );
    } else if (sortField === 'winrate') {
      result.sort((a, b) => {
        const wrA = getWinRate(a.wins, a.total_matches);
        const wrB = getWinRate(b.wins, b.total_matches);
        return sortDir === 'desc' ? wrB - wrA : wrA - wrB;
      });
    }
    return result;
  }, [players, searchQuery, sortField, sortDir]);

  // Filtered + sorted teams
  const filteredTeams = useMemo(() => {
    let result = [...teams];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.tag || '').toLowerCase().includes(q)
      );
    }
    if (sortField === 'rating' || sortField === 'karma') {
      result.sort((a, b) =>
        sortDir === 'desc' ? b.rating - a.rating : a.rating - b.rating
      );
    } else if (sortField === 'wins') {
      result.sort((a, b) =>
        sortDir === 'desc' ? b.total_wins - a.total_wins : a.total_wins - b.total_wins
      );
    } else if (sortField === 'tournaments') {
      result.sort((a, b) =>
        sortDir === 'desc'
          ? b.total_tournaments - a.total_tournaments
          : a.total_tournaments - b.total_tournaments
      );
    }
    return result;
  }, [teams, searchQuery, sortField, sortDir]);

  // Top 3 players for podium
  const top3Players = filteredPlayers.slice(0, 3);
  const restPlayers = filteredPlayers.slice(3);

  // Top 3 teams for podium
  const top3Teams = filteredTeams.slice(0, 3);
  const restTeams = filteredTeams.slice(3);

  // Build reputation lookup
  const repMap = useMemo(() => {
    const map: Record<string, UserReputation> = {};
    reputations.forEach((r) => {
      map[r.user_id] = r;
    });
    return map;
  }, [reputations]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-12 md:py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-32 right-1/4 w-56 h-56 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-zinc-300 tracking-wider uppercase">
                Classificacao Global
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6, #f59e0b)',
                  backgroundSize: '300% 300%',
                  animation: 'shimmer 4s ease-in-out infinite',
                }}
              >
                RANKING GLOBAL
              </span>
            </h1>

            <p className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto">
              Os melhores jogadores e equipas do mundo
            </p>
          </motion.div>

          {/* Shimmer keyframes via inline style tag */}
          <style>{`
            @keyframes shimmer {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}</style>
        </div>
      </section>

      {/* STATS SUMMARY CARDS */}
      <section className="px-4 -mt-2 mb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {loading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-1">Total Jogadores</p>
                <p className="text-xl font-bold text-white">{stats.totalJogadores}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-1">Total Equipas</p>
                <p className="text-xl font-bold text-white">{stats.totalEquipas}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-3">
                  <Flame className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-1">Maior Karma</p>
                <p className="text-xl font-bold text-amber-400">
                  {stats.maiorKarma.toLocaleString('pt-PT')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-1">Media de Matches</p>
                <p className="text-xl font-bold text-white">{stats.mediaMatches}</p>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* TAB HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-white/5 border border-white/10 rounded-xl h-11 p-1">
                <TabsTrigger
                  value="jogadores"
                  className="rounded-lg data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-zinc-400 transition-all"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Jogadores
                </TabsTrigger>
                <TabsTrigger
                  value="equipas"
                  className="rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 text-zinc-400 transition-all"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Equipas
                </TabsTrigger>
              </TabsList>

              {/* SEARCH + FILTER */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder={
                      activeTab === 'jogadores'
                        ? 'Pesquisar jogador...'
                        : 'Pesquisar equipa...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 h-10 bg-white/5 border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-500 focus-visible:ring-purple-500/30 w-full sm:w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                  onClick={() => handleSort('karma')}
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ============================================ */}
            {/* JOGADORES TAB */}
            {/* ============================================ */}
            <TabsContent value="jogadores" className="mt-0">
              {loading ? (
                <div className="space-y-4">
                  <PodiumSkeleton />
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={searchQuery}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* TOP 3 PODIUM */}
                    {top3Players.length >= 3 && (
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
                        <div className="flex items-end justify-center gap-4 md:gap-8">
                          {/* 2nd place */}
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-1 rounded-full bg-zinc-400/20 blur-sm" />
                              <Avatar className="w-16 h-16 md:w-20 md:h-20 relative border-2 border-zinc-400/40">
                                <AvatarImage src={top3Players[1].avatar_url || ''} />
                                <AvatarFallback className="bg-zinc-700 text-zinc-200 font-bold text-lg">
                                  {getInitials(top3Players[1].username || '??')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-600 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Medal className="w-3.5 h-3.5 text-zinc-200" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-zinc-200 mt-1">
                              {top3Players[1].username}
                            </p>
                            <Badge className="bg-zinc-400/20 text-zinc-300 border-0 text-[10px] mt-1">
                              2º Lugar
                            </Badge>
                            <p className="text-lg font-bold text-zinc-300 mt-1">
                              {top3Players[1].karma_points.toLocaleString('pt-PT')}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                              {top3Players[1].reputation_title}
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-zinc-400/20 to-zinc-400/5 rounded-t-xl" style={{ height: '120px' }} />
                          </motion.div>

                          {/* 1st place - center & tallest */}
                          <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-2 rounded-full bg-amber-500/30 blur-md animate-pulse" />
                              <Avatar className="w-20 h-20 md:w-24 md:h-24 relative border-2 border-amber-400/60">
                                <AvatarImage src={top3Players[0].avatar_url || ''} />
                                <AvatarFallback className="bg-amber-900/50 text-amber-200 font-bold text-xl">
                                  {getInitials(top3Players[0].username || '??')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Crown className="w-4 h-4 text-amber-100" />
                              </div>
                            </div>
                            <p className="text-base font-bold text-amber-300 mt-1">
                              {top3Players[0].username}
                            </p>
                            <Badge className="bg-amber-500/20 text-amber-300 border-0 text-[10px] mt-1">
                              <Star className="w-2.5 h-2.5 mr-1" />
                              Campeao
                            </Badge>
                            <p className="text-2xl font-black text-amber-400 mt-1">
                              {top3Players[0].karma_points.toLocaleString('pt-PT')}
                            </p>
                            <p className="text-[10px] text-amber-500/70 uppercase tracking-wider">
                              {top3Players[0].reputation_title}
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-amber-500/25 to-amber-500/5 rounded-t-xl" style={{ height: '160px' }} />
                          </motion.div>

                          {/* 3rd place */}
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-1 rounded-full bg-orange-700/20 blur-sm" />
                              <Avatar className="w-16 h-16 md:w-20 md:h-20 relative border-2 border-orange-600/40">
                                <AvatarImage src={top3Players[2].avatar_url || ''} />
                                <AvatarFallback className="bg-orange-900/50 text-orange-200 font-bold text-lg">
                                  {getInitials(top3Players[2].username || '??')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-700 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Medal className="w-3.5 h-3.5 text-orange-200" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-orange-200 mt-1">
                              {top3Players[2].username}
                            </p>
                            <Badge className="bg-orange-700/20 text-orange-300 border-0 text-[10px] mt-1">
                              3º Lugar
                            </Badge>
                            <p className="text-lg font-bold text-orange-400 mt-1">
                              {top3Players[2].karma_points.toLocaleString('pt-PT')}
                            </p>
                            <p className="text-[10px] text-orange-500/70 uppercase tracking-wider">
                              {top3Players[2].reputation_title}
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-orange-700/20 to-orange-700/5 rounded-t-xl" style={{ height: '90px' }} />
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {/* TABLE HEADER */}
                    <div className="hidden md:flex items-center gap-4 px-4 py-2 mb-2 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                      <div className="w-10 text-center">Pos</div>
                      <div className="flex-1">Jogador</div>
                      <button
                        onClick={() => handleSort('karma')}
                        className="w-24 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Karma
                        {sortField === 'karma' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <div className="w-28">Titulo</div>
                      <button
                        onClick={() => handleSort('matches')}
                        className="w-20 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Matches
                        {sortField === 'matches' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('winrate')}
                        className="w-28 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Win Rate
                        {sortField === 'winrate' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <div className="w-10 text-center">Trend</div>
                    </div>

                    {/* PLAYER LIST */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                      {restPlayers.length === 0 && top3Players.length === 0 && (
                        <div className="text-center py-16">
                          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <p className="text-zinc-500">Nenhum jogador encontrado</p>
                        </div>
                      )}

                      {restPlayers.map((player, index) => {
                        const pos = index + 4;
                        const wr = getWinRate(player.wins, player.total_matches);
                        const trend = getTrendDirection(index);
                        const rep = repMap[player.user_id];
                        const title = player.reputation_title || rep?.reputation_title || 'Novato';

                        return (
                          <motion.div
                            key={player.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.8) }}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl border backdrop-blur-sm transition-colors hover:bg-white/[0.08] ${getPositionColor(pos)}`}
                          >
                            {/* Position */}
                            <div className={`w-10 text-center font-bold text-sm ${getPositionTextColor(pos)}`}>
                              <div className="flex items-center justify-center gap-1">
                                {getPositionIcon(pos) || <span>#{pos}</span>}
                              </div>
                            </div>

                            {/* Avatar + Username */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="w-10 h-10 border border-white/10 flex-shrink-0">
                                <AvatarImage src={player.avatar_url || ''} />
                                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
                                  {getInitials(player.username || '??')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {player.username || 'Anonimo'}
                                </p>
                                <p className="text-[10px] text-zinc-500 md:hidden">
                                  {player.karma_points.toLocaleString('pt-PT')} karma
                                </p>
                              </div>
                            </div>

                            {/* Karma - hidden on mobile */}
                            <div className="hidden md:block w-24 text-right">
                              <span className="text-sm font-bold text-amber-400">
                                {player.karma_points.toLocaleString('pt-PT')}
                              </span>
                            </div>

                            {/* Title - hidden on mobile */}
                            <div className="hidden md:flex w-28 items-center">
                              <Badge
                                variant="outline"
                                className="text-[10px] border-white/10 text-zinc-400 bg-white/5"
                              >
                                {title}
                              </Badge>
                            </div>

                            {/* Matches - hidden on mobile */}
                            <div className="hidden md:block w-20 text-right">
                              <span className="text-sm text-zinc-300">
                                {player.total_matches}
                              </span>
                            </div>

                            {/* Win Rate - hidden on mobile */}
                            <div className="hidden md:flex w-28 items-center justify-end gap-2">
                              <div className="flex-1 max-w-[80px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${wr}%` }}
                                  transition={{ delay: 0.5 + index * 0.04, duration: 0.6 }}
                                  className={`h-full rounded-full ${
                                    wr >= 80
                                      ? 'bg-emerald-400'
                                      : wr >= 60
                                        ? 'bg-amber-400'
                                        : wr >= 40
                                          ? 'bg-orange-400'
                                          : 'bg-red-400'
                                  }`}
                                />
                              </div>
                              <span className="text-xs text-zinc-400 w-10 text-right">{wr}%</span>
                            </div>

                            {/* Trend indicator */}
                            <div className="w-10 flex justify-center">
                              {trend === 'up' && (
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                              )}
                              {trend === 'down' && (
                                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                                  <TrendingUp className="w-3.5 h-3.5 text-red-400 rotate-180" />
                                </div>
                              )}
                              {trend === 'stable' && (
                                <div className="w-7 h-7 rounded-lg bg-zinc-500/10 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>

            {/* ============================================ */}
            {/* EQUIPAS TAB */}
            {/* ============================================ */}
            <TabsContent value="equipas" className="mt-0">
              {loading ? (
                <div className="space-y-4">
                  <PodiumSkeleton />
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={searchQuery}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* TOP 3 TEAM PODIUM */}
                    {top3Teams.length >= 3 && (
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
                        <div className="flex items-end justify-center gap-4 md:gap-8">
                          {/* 2nd team */}
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-1 rounded-2xl bg-zinc-400/20 blur-sm" />
                              <Avatar className="w-16 h-16 md:w-20 md:h-20 relative border-2 border-zinc-400/40 rounded-2xl">
                                <AvatarImage src={top3Teams[1].logo_url || ''} />
                                <AvatarFallback className="bg-zinc-700 text-zinc-200 font-bold text-lg rounded-2xl">
                                  {getInitials(top3Teams[1].name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-600 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Medal className="w-3.5 h-3.5 text-zinc-200" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-zinc-200 mt-1">
                              {top3Teams[1].name}
                            </p>
                            {top3Teams[1].tag && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                [{top3Teams[1].tag}]
                              </span>
                            )}
                            <Badge className="bg-zinc-400/20 text-zinc-300 border-0 text-[10px] mt-1">
                              2º Lugar
                            </Badge>
                            <p className={`text-lg font-bold mt-1 ${getRatingColor(top3Teams[1].rating)}`}>
                              {top3Teams[1].rating} ELO
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-zinc-400/20 to-zinc-400/5 rounded-t-xl" style={{ height: '120px' }} />
                          </motion.div>

                          {/* 1st team */}
                          <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-2 rounded-2xl bg-amber-500/30 blur-md animate-pulse" />
                              <Avatar className="w-20 h-20 md:w-24 md:h-24 relative border-2 border-amber-400/60 rounded-2xl">
                                <AvatarImage src={top3Teams[0].logo_url || ''} />
                                <AvatarFallback className="bg-amber-900/50 text-amber-200 font-bold text-xl rounded-2xl">
                                  {getInitials(top3Teams[0].name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Crown className="w-4 h-4 text-amber-100" />
                              </div>
                            </div>
                            <p className="text-base font-bold text-amber-300 mt-1">
                              {top3Teams[0].name}
                            </p>
                            {top3Teams[0].tag && (
                              <span className="text-[10px] text-amber-500/70 font-mono">
                                [{top3Teams[0].tag}]
                              </span>
                            )}
                            <Badge className="bg-amber-500/20 text-amber-300 border-0 text-[10px] mt-1">
                              <Star className="w-2.5 h-2.5 mr-1" />
                              Melhor Equipa
                            </Badge>
                            <p className={`text-2xl font-black mt-1 ${getRatingColor(top3Teams[0].rating)}`}>
                              {top3Teams[0].rating} ELO
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-amber-500/25 to-amber-500/5 rounded-t-xl" style={{ height: '160px' }} />
                          </motion.div>

                          {/* 3rd team */}
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="absolute -inset-1 rounded-2xl bg-orange-700/20 blur-sm" />
                              <Avatar className="w-16 h-16 md:w-20 md:h-20 relative border-2 border-orange-600/40 rounded-2xl">
                                <AvatarImage src={top3Teams[2].logo_url || ''} />
                                <AvatarFallback className="bg-orange-900/50 text-orange-200 font-bold text-lg rounded-2xl">
                                  {getInitials(top3Teams[2].name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-orange-700 border-2 border-[#0a0a0f] flex items-center justify-center">
                                <Medal className="w-3.5 h-3.5 text-orange-200" />
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-orange-200 mt-1">
                              {top3Teams[2].name}
                            </p>
                            {top3Teams[2].tag && (
                              <span className="text-[10px] text-orange-500/70 font-mono">
                                [{top3Teams[2].tag}]
                              </span>
                            )}
                            <Badge className="bg-orange-700/20 text-orange-300 border-0 text-[10px] mt-1">
                              3º Lugar
                            </Badge>
                            <p className={`text-lg font-bold mt-1 ${getRatingColor(top3Teams[2].rating)}`}>
                              {top3Teams[2].rating} ELO
                            </p>
                            <div className="w-28 md:w-36 mt-3 bg-gradient-to-t from-orange-700/20 to-orange-700/5 rounded-t-xl" style={{ height: '90px' }} />
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {/* TABLE HEADER - TEAMS */}
                    <div className="hidden md:flex items-center gap-4 px-4 py-2 mb-2 text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                      <div className="w-10 text-center">Pos</div>
                      <div className="flex-1">Equipa</div>
                      <button
                        onClick={() => handleSort('rating')}
                        className="w-24 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Rating (ELO)
                        {sortField === 'rating' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('wins')}
                        className="w-16 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Vitorias
                        {sortField === 'wins' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <button
                        onClick={() => handleSort('tournaments')}
                        className="w-24 text-right flex items-center justify-end gap-1 hover:text-zinc-300 transition-colors"
                      >
                        Torneios
                        {sortField === 'tournaments' && (
                          sortDir === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronUp className="w-3 h-3" />
                          )
                        )}
                      </button>
                      <div className="w-28 text-right">Win Rate</div>
                    </div>

                    {/* TEAM LIST */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                      {restTeams.length === 0 && top3Teams.length === 0 && (
                        <div className="text-center py-16">
                          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <p className="text-zinc-500">Nenhuma equipa encontrada</p>
                        </div>
                      )}

                      {restTeams.map((team, index) => {
                        const pos = index + 4;
                        const totalGames = team.total_wins + team.total_losses;
                        const wr = getWinRate(team.total_wins, totalGames);

                        return (
                          <motion.div
                            key={team.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.8) }}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl border backdrop-blur-sm transition-colors hover:bg-white/[0.08] ${getPositionColor(pos)}`}
                          >
                            {/* Position */}
                            <div className={`w-10 text-center font-bold text-sm ${getPositionTextColor(pos)}`}>
                              <div className="flex items-center justify-center gap-1">
                                {getPositionIcon(pos) || <span>#{pos}</span>}
                              </div>
                            </div>

                            {/* Logo + Name + Tag */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="w-10 h-10 border border-white/10 rounded-xl flex-shrink-0">
                                <AvatarImage src={team.logo_url || ''} />
                                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl">
                                  {getInitials(team.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {team.name}
                                  </p>
                                  {team.is_verified && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[9px] px-1.5 py-0">
                                      Verificada
                                    </Badge>
                                  )}
                                </div>
                                {team.tag && (
                                  <p className="text-[10px] text-zinc-500 font-mono">
                                    [{team.tag}]
                                  </p>
                                )}
                                {/* Mobile-only info */}
                                <p className="text-[10px] text-zinc-500 md:hidden">
                                  {team.rating} ELO · {team.total_wins}V
                                </p>
                              </div>
                            </div>

                            {/* Rating (ELO) - hidden on mobile */}
                            <div className="hidden md:flex w-24 justify-end">
                              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getRatingColor(team.rating)} ${getRatingBg(team.rating)}`}>
                                {team.rating}
                              </span>
                            </div>

                            {/* Wins - hidden on mobile */}
                            <div className="hidden md:block w-16 text-right">
                              <span className="text-sm text-zinc-300 font-medium">
                                {team.total_wins}
                              </span>
                            </div>

                            {/* Tournaments - hidden on mobile */}
                            <div className="hidden md:block w-24 text-right">
                              <span className="text-sm text-zinc-400">
                                {team.total_tournaments}
                              </span>
                            </div>

                            {/* Win Rate - hidden on mobile */}
                            <div className="hidden md:flex w-28 items-center justify-end gap-2">
                              <div className="flex-1 max-w-[80px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${wr}%` }}
                                  transition={{ delay: 0.5 + index * 0.04, duration: 0.6 }}
                                  className={`h-full rounded-full ${
                                    wr >= 80
                                      ? 'bg-emerald-400'
                                      : wr >= 60
                                        ? 'bg-amber-400'
                                        : wr >= 40
                                          ? 'bg-orange-400'
                                          : 'bg-red-400'
                                  }`}
                                />
                              </div>
                              <span className="text-xs text-zinc-400 w-10 text-right">{wr}%</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
