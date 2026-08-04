'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Gamepad2, Users, Clock, Search, Zap, Eye, Star, ChevronRight, Filter, TrendingUp, Shield, Radio, MapPin, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getEsportGames,
  getChampionships,
  getFeaturedChampionships,
  getTeams,
  getChampActivity,
  getChampMatches,
  GAME_EMOJIS,
  STATUS_LABELS,
  FORMAT_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  GENRE_LABELS,
  type EsportGame,
  type Championship,
  type EsportTeam,
  type EsportMatch,
  type EsportActivity,
  type ChampStatus,
} from '@/lib/esports';

const sb: any = supabase;

const FLOATING_ICONS = ['\uD83D\uDD25', '\u26A1', '\uD83C\uDFC6', '\uD83C\uDFAF', '\uD83D\uDCDC', '\u26BD', '\uD83C\uDFD7\uFE0F', '\uD83D\uDE80'];

function ShimmerText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={className}>
      {children.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.06 }}
          style={{ display: 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

function FloatingIcon({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute text-3xl md:text-5xl opacity-10 pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{
        y: [0, -20, 0],
        rotate: [0, 10, -10, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      {emoji}
    </motion.div>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

export default function EsportsHub() {
  const { user } = useAuth();
  const [games, setGames] = useState<EsportGame[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [featured, setFeatured] = useState<Championship | null>(null);
  const [topTeams, setTopTeams] = useState<EsportTeam[]>([]);
  const [recentMatches, setRecentMatches] = useState<EsportMatch[]>([]);
  const [activityFeed, setActivityFeed] = useState<EsportActivity[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalChamps: 0, totalTeams: 0, totalPrizes: 0 });
  const [loading, setLoading] = useState(true);
  const [gameCounts, setGameCounts] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [gamesData, allChamps, featuredChamps, teamsData] = await Promise.all([
        getEsportGames(),
        getChampionships({ is_published: true }),
        getFeaturedChampionships(),
        getTeams({ limit: 10, sort_by: 'rating', sort_dir: 'desc' }),
      ]);

      setGames(gamesData);
      setChampionships(allChamps);
      setTopTeams(teamsData);

      if (featuredChamps.length > 0) {
        setFeatured(featuredChamps[0]);
      }

      // Compute game counts
      const counts: Record<string, number> = {};
      for (const c of allChamps) {
        counts[c.game_id] = (counts[c.game_id] || 0) + 1;
      }
      setGameCounts(counts);

      // Stats
      const published = allChamps.filter(c => c.is_published);
      setStats({
        totalChamps: published.length,
        totalTeams: published.reduce((sum, c) => sum + (c.registered_teams || 0), 0),
        totalPrizes: published.reduce((sum, c) => sum + (c.prize_pool || 0), 0),
      });

      // Recent matches from live/completed championships
      const activeChampIds = allChamps.filter(c => c.status === 'live' || c.status === 'completed').map(c => c.id);
      if (activeChampIds.length > 0) {
        const { data: matches } = await sb.from('esport_matches')
          .select('*')
          .in('championship_id', activeChampIds.slice(0, 5))
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentMatches(matches || []);
      }

      // Activity from latest champ
      if (featuredChamps.length > 0) {
        const activities = await getChampActivity(featuredChamps[0].id, 5);
        setActivityFeed(activities);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredChamps = championships.filter(c => {
    if (!c.is_published) return false;
    if (selectedGame && c.game_id !== selectedGame) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const tabFilter = (status: string) => {
    if (status === 'live') return filteredChamps.filter(c => c.status === 'live' || c.status === 'check_in');
    if (status === 'registration_open') return filteredChamps.filter(c => c.status === 'registration_open');
    if (status === 'upcoming') return filteredChamps.filter(c => c.status === 'registration_closed' || c.status === 'draft');
    if (status === 'completed') return filteredChamps.filter(c => c.status === 'completed');
    return [];
  };

  const gameEmoji = (gameId: string, gameSlug?: string) => {
    if (gameSlug && GAME_EMOJIS[gameSlug]) return GAME_EMOJIS[gameSlug];
    const g = games.find(g => g.id === gameId);
    if (g && GAME_EMOJIS[g.slug]) return GAME_EMOJIS[g.slug];
    return '\uD83C\uDFAE';
  };

  const gameName = (gameId: string) => {
    const g = games.find(g => g.id === gameId);
    return g?.name || 'Jogo';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#0a0a0f] to-cyan-900/30" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.15) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {FLOATING_ICONS.map((icon, i) => (
          <FloatingIcon key={i} emoji={icon} delay={i * 0.8} x={10 + (i * 11) % 80} y={10 + (i * 17) % 60} />
        ))}

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-16 pb-10 md:pt-24 md:pb-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Plataforma Competitiva</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
              <ShimmerText className="bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent">
                Campeonatos Esports
              </ShimmerText>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-8">
              Compete nos maiores jogos. Free Fire, CoD, PUBG, Valorant e mais.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            className="grid grid-cols-3 gap-4 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {[
              { icon: Trophy, label: 'Total Campeonatos', value: stats.totalChamps },
              { icon: Users, label: 'Equipas Registadas', value: stats.totalTeams },
              { icon: Star, label: 'Premios Distribuidos', value: formatCurrency(stats.totalPrizes, 'BRL') },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                <div className="text-xl md:text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] md:text-xs text-zinc-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Game Filter Bar */}
      <section className="border-y border-zinc-800/60 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 py-4 overflow-x-auto scrollbar-hide">
            <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <button
              onClick={() => setSelectedGame(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                !selectedGame
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-white'
              }`}
            >
              Todos
            </button>
            {games.map((game) => {
              const isActive = selectedGame === game.id;
              const emoji = GAME_EMOJIS[game.slug] || '\uD83C\uDFAE';
              return (
                <motion.button
                  key={game.id}
                  onClick={() => setSelectedGame(isActive ? null : game.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50'
                      : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-lg">{emoji}</span>
                  <span>{game.name}</span>
                  {(gameCounts[game.id] || 0) > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0">
                      {gameCounts[game.id]}
                    </Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Championship Banner */}
      <AnimatePresence>
        {featured && (
          <motion.section
            className="max-w-7xl mx-auto px-4 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-purple-900/50 via-zinc-900 to-cyan-900/40">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, ${featured.primary_color || '#8b5cf6'} 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${featured.accent_color || '#06b6d4'} 0%, transparent 50%)`,
              }} />
              <CardContent className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={`animate-pulse border ${getStatusColor(featured.status)}`}>
                        <Radio className="w-3 h-3 mr-1" />
                        {STATUS_LABELS[featured.status]}
                      </Badge>
                      {featured.status === 'live' && featured.total_viewers > 0 && (
                        <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                          <Eye className="w-3 h-3 mr-1" />
                          {featured.total_viewers} espectadores
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{gameEmoji(featured.game_id)}</span>
                      <span className="text-sm text-zinc-400">{gameName(featured.game_id)}</span>
                      <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                        {FORMAT_LABELS[featured.match_format]}
                      </Badge>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2">{featured.name}</h2>
                    <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{featured.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{featured.starts_at ? formatDate(featured.starts_at) : 'TBA'}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{featured.region_server?.toUpperCase() || 'Global'}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" />{featured.registered_teams}/{featured.max_teams} Equipas</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Premio Total</div>
                      <div className="text-3xl md:text-4xl font-black text-yellow-400">
                        {formatCurrency(featured.prize_pool, featured.currency)}
                      </div>
                    </div>
                    {featured.status === 'registration_open' && (
                      <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:from-yellow-400 hover:to-orange-400">
                        Inscrever Equipa
                      </Button>
                    )}
                    {featured.stream_url && (
                      <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Radio className="w-4 h-4 mr-2" />
                        Assistir Ao Vivo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Search + Main Content */}
      <section className="max-w-7xl mx-auto px-4 mt-6 pb-20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar campeonatos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/80 border-zinc-800 focus:border-purple-500/50 text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-zinc-900/80 border border-zinc-800 w-full justify-start overflow-x-auto">
                <TabsTrigger value="live" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                  <Radio className="w-3.5 h-3.5 mr-1.5" /> Em Curso
                </TabsTrigger>
                <TabsTrigger value="registration_open" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  Inscricoes Abertas
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Proximos
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-zinc-600/20 data-[state=active]:text-zinc-300">
                  Finalizados
                </TabsTrigger>
              </TabsList>

              {['live', 'registration_open', 'upcoming', 'completed'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-xl bg-zinc-900" />
                      ))}
                    </div>
                  ) : tabFilter(tab).length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16"
                    >
                      <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                      <p className="text-zinc-500 text-lg font-medium">Nenhum campeonato encontrado</p>
                      <p className="text-zinc-600 text-sm mt-1">Tente outro filtro ou volte mais tarde</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {tabFilter(tab).map((champ) => (
                          <ChampionshipCard
                            key={champ.id}
                            champ={champ}
                            gameEmoji={gameEmoji(champ.game_id)}
                            gameLabel={gameName(champ.game_id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
            <TopTeamsSection teams={topTeams} loading={loading} />
            <NextMatchesSection matches={recentMatches} loading={loading} />
            <ActivityFeedSection activities={activityFeed} loading={loading} />
          </aside>
        </div>
      </section>
    </div>
  );
}

function ChampionshipCard({ champ, gameEmoji, gameLabel }: { champ: Championship; gameEmoji: string; gameLabel: string }) {
  const progressPct = champ.max_teams > 0 ? Math.min((champ.registered_teams / champ.max_teams) * 100, 100) : 0;
  const isLive = champ.status === 'live';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ perspective: '800px' }}
    >
      <Card className={`overflow-hidden border transition-all duration-300 cursor-pointer ${
        isLive
          ? 'border-red-500/40 shadow-lg shadow-red-500/10 hover:shadow-red-500/20'
          : 'border-zinc-800 hover:border-zinc-600 hover:shadow-lg hover:shadow-purple-500/5'
      }`}>
        {/* Cover Gradient */}
        <div
          className="h-24 relative"
          style={{
            background: `linear-gradient(135deg, ${champ.primary_color || '#7c3aed'}, ${champ.secondary_color || '#1e1b4b'}, ${champ.accent_color || '#06b6d4'})`,
          }}
        >
          <div className="absolute inset-0 flex items-start justify-between p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-sm text-xs">
                {gameEmoji} {gameLabel}
              </Badge>
              <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-sm text-xs">
                {FORMAT_LABELS[champ.match_format]}
              </Badge>
            </div>
            <Badge className={`text-[10px] border backdrop-blur-sm ${getStatusColor(champ.status)} ${isLive ? 'animate-pulse' : ''}`}>
              {STATUS_LABELS[champ.status]}
            </Badge>
          </div>
          {champ.stream_url && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-[10px] font-bold text-white">
              <Radio className="w-3 h-3" /> LIVE
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="text-base font-bold text-white mb-2 line-clamp-1">{champ.name}</h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mb-3">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{champ.starts_at ? formatDate(champ.starts_at) : 'TBA'}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{champ.region_server?.toUpperCase() || 'Global'}</span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Premio</span>
            <span className="text-lg font-black text-yellow-400">{formatCurrency(champ.prize_pool, champ.currency)}</span>
          </div>

          {/* Team Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">{champ.registered_teams}/{champ.max_teams} Equipas</span>
              <span className="text-zinc-500">{Math.round(progressPct)}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${champ.primary_color || '#8b5cf6'}, ${champ.accent_color || '#06b6d4'})` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TopTeamsSection({ teams, loading }: { teams: EsportTeam[]; loading: boolean }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          Top Equipas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded bg-zinc-800" />)
        ) : teams.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-4">Sem equipas registadas</p>
        ) : (
          teams.map((team, i) => (
            <motion.div
              key={team.id}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-zinc-400/20 text-zinc-300' : i === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {i + 1}
              </span>
              <Avatar className="w-8 h-8">
                <AvatarImage src={team.logo_url || undefined} />
                <AvatarFallback className="bg-zinc-800 text-xs">{team.tag || team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-200 truncate">{team.name}</div>
                <div className="text-[10px] text-zinc-500">{team.total_wins}V / {team.total_losses}D</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-yellow-400">{formatCurrency(team.total_earnings, 'BRL')}</div>
                <div className="text-[10px] text-zinc-600">Rating: {team.rating}</div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NextMatchesSection({ matches, loading }: { matches: EsportMatch[]; loading: boolean }) {
  const activityIcon = (type: string) => {
    switch (type) {
      case 'in_progress': return <Radio className="w-3.5 h-3.5 text-red-400" />;
      case 'completed': return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
          <Gamepad2 className="w-4 h-4 text-cyan-400" />
          Proximos Jogos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded bg-zinc-800" />)
        ) : matches.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-4">Sem partidas proximas</p>
        ) : (
          matches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 rounded-lg border ${
                match.status === 'in_progress'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-zinc-800 bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                {activityIcon(match.status)}
                <span className="text-[10px] text-zinc-600">{match.map_name || `Partida ${match.match_number}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={match.team1_logo || undefined} />
                    <AvatarFallback className="text-[8px] bg-zinc-700">T1</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-zinc-300 truncate">{match.team1_name || 'TBD'}</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-bold mx-2">VS</span>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-xs text-zinc-300 truncate">{match.team2_name || 'TBD'}</span>
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={match.team2_logo || undefined} />
                    <AvatarFallback className="text-[8px] bg-zinc-700">T2</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {(match.team1_score !== null || match.team2_score !== null) && (
                <div className="flex justify-center gap-3 mt-1.5">
                  <span className={`text-sm font-bold ${match.winner_id === match.team1_id ? 'text-emerald-400' : 'text-zinc-500'}`}>{match.team1_score ?? 0}</span>
                  <span className="text-zinc-700">-</span>
                  <span className={`text-sm font-bold ${match.winner_id === match.team2_id ? 'text-emerald-400' : 'text-zinc-500'}`}>{match.team2_score ?? 0}</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ActivityFeedSection({ activities, loading }: { activities: EsportActivity[]; loading: boolean }) {
  const actIcon = (type: string) => {
    switch (type) {
      case 'registration': return <Users className="w-3.5 h-3.5 text-emerald-400" />;
      case 'match_result': return <Trophy className="w-3.5 h-3.5 text-yellow-400" />;
      case 'check_in': return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'prize_distributed': return <Star className="w-3.5 h-3.5 text-yellow-400" />;
      default: return <Zap className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-200">
          <Zap className="w-4 h-4 text-purple-400" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded bg-zinc-800" />)
        ) : activities.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-4">Sem atividade recente</p>
        ) : (
          activities.map((act, i) => (
            <motion.div
              key={act.id}
              className="flex gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {actIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-300 line-clamp-1">{act.title}</p>
                {act.description && <p className="text-[10px] text-zinc-600 line-clamp-1 mt-0.5">{act.description}</p>}
                <p className="text-[10px] text-zinc-700 mt-1">
                  {new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
