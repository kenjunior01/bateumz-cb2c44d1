import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sword, Shield, Trophy, Users, Clock, Plus, ArrowRight,
  Search, Filter, Zap, Crown, X, ChevronRight, Loader2,
  ShieldCheck, Medal, TrendingUp, Eye, Tag, Flame, Star,
  Gamepad2, Brain, Target, Layers, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO } from '@/hooks/useSEO';
import {
  BATTLE_GAMES, createBattle, getOpenBattles, getMyBattles, acceptBattle,
  type UserBattle,
} from '@/lib/battles';
import { getBalance, formatMZN } from '@/lib/wallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface OpenBattle extends UserBattle {
  creator: { display_name: string | null; avatar_url: string | null };
}

type TabId = 'open' | 'mine' | 'create';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const statusLabels: Record<string, string> = {
  open: 'Em aberto', accepted: 'Aceita', playing: 'Em jogo',
  completed: 'Concluida', cancelled: 'Cancelada', disputed: 'Disputada',
};

const statusColors: Record<string, string> = {
  open: 'bg-emerald-500/20 text-emerald-300', accepted: 'bg-blue-500/20 text-blue-300',
  playing: 'bg-amber-500/20 text-amber-300', completed: 'bg-gray-500/20 text-gray-300',
  cancelled: 'bg-red-500/20 text-red-300', disputed: 'bg-orange-500/20 text-orange-300',
};

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

// Fake ticker data for social proof
const tickerMessages = [
  { text: 'Carlos venceu 100 MZN no Galo VS', won: true },
  { text: 'Ana perdeu 50 MZN no Pong VS', won: false },
  { text: 'Miguel venceu 250 MZN no Xadrez', won: true },
  { text: 'Sofia venceu 75 MZN na Corrida de Reacao', won: true },
  { text: 'Joao perdeu 30 MZN no Duelo de Matematica', won: false },
  { text: 'Beatriz venceu 500 MZN na Arena de Duelo VS', won: true },
  { text: 'Pedro venceu 150 MZN no Ligar 4', won: true },
  { text: 'Luisa perdeu 100 MZN nas Damas', won: false },
  { text: 'Ricardo venceu 200 MZN na Batalha de Cobras', won: true },
  { text: 'Fernanda venceu 80 MZN no Pesca Cores', won: true },
  { text: 'Andre perdeu 60 MZN na Torre VS', won: false },
  { text: 'Diana venceu 300 MZN no Memoria VS Cartas', won: true },
];

// Fake ranking data
const fakeRanking = [
  { rank: 1, name: 'Carlos23', wins: 142, totalWon: 12450, color: 'from-amber-400 to-yellow-600' },
  { rank: 2, name: 'MiguelPro', wins: 118, totalWon: 9800, color: 'from-gray-300 to-gray-400' },
  { rank: 3, name: 'SofiaX', wins: 97, totalWon: 7200, color: 'from-amber-600 to-amber-800' },
  { rank: 4, name: 'BeatrizG', wins: 85, totalWon: 5600, color: 'from-purple-500 to-purple-700' },
  { rank: 5, name: 'RicardoK', wins: 72, totalWon: 4300, color: 'from-blue-500 to-blue-700' },
];

// Fake recent results for the open tab
const fakeRecentResults = [
  { winner: 'Carlos23', loser: 'Joao99', game: 'Galo VS', amount: 100, time: '2min' },
  { winner: 'SofiaX', loser: 'Ana12', game: 'Xadrez', amount: 250, time: '5min' },
  { winner: 'MiguelPro', loser: 'Pedro45', game: 'Pong VS', amount: 75, time: '8min' },
];

// Game category mapping
const gameCategories: Record<string, string> = {
  tictactoe: 'estrategia', connect4: 'estrategia', checkers: 'estrategia', chess: 'estrategia',
  quickmath: 'quiz', wordscramble: 'quiz', colorcatch: 'quiz',
  reactionrace: 'reflexos', pongvs: 'reflexos', snakebattle: 'reflexos', towerstack: 'reflexos', vsduel: 'reflexos',
  memorycards: 'cartas', rps: 'cartas',
};

const categoryFilters = [
  { id: 'todos', label: 'Todos', icon: Gamepad2 },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'estrategia', label: 'Estrategia', icon: Layers },
  { id: 'reflexos', label: 'Reflexos', icon: Target },
  { id: 'cartas', label: 'Cartas', icon: Star },
];

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 2000, startOnMount: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startOnMount) return;
    let startTime: number;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, startOnMount]);

  return count;
}

// Empty state emoji art component
function EmptyStateEmojiArt() {
  return (
    <div className="relative mb-4">
      <pre className="text-3xl leading-tight opacity-20 select-none" aria-hidden="true">
{`   /\\_/\\  
  ( o.o ) 
   > ^ <  
  /|   |\\
 (_|   |_)`}
      </pre>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <Sword className="h-8 w-8 text-white/10 rotate-12" />
      </div>
    </div>
  );
}

export default function Battles() {
  useSEO({ title: 'Batalhas P2P', description: 'Desafie outros jogadores em batalhas cara a cara na Bateu. Aposte, jogue e ganhe com o sistema P2P mais transparente.', canonicalPath: '/batalhas' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('open');
  const [openBattles, setOpenBattles] = useState<OpenBattle[]>([]);
  const [myBattles, setMyBattles] = useState<UserBattle[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState('');
  const [acceptTarget, setAcceptTarget] = useState<OpenBattle | null>(null);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [safeBet, setSafeBet] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  // Animated counters for stats
  const animatedBattles = useAnimatedCounter(12450, 2200, statsVisible);
  const animatedBets = useAnimatedCounter(2400000, 2500, statsVisible);
  const animatedPlayers = useAnimatedCounter(3200, 2000, statsVisible);

  // Ticker cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % tickerMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Stats visibility trigger
  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Rankings visibility trigger
  useEffect(() => {
    const timer = setTimeout(() => setRankingsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const fetchBattles = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getOpenBattles(), getMyBattles(user.id), getBalance(user.id)])
      .then(([ob, mb, bal]) => {
        setOpenBattles(ob as OpenBattle[]);
        setMyBattles(mb);
        setBalance(bal);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchBattles();
  }, [fetchBattles]);

  const handleCreate = async () => {
    if (!user || !selectedGame || !wagerAmount) return;
    const game = BATTLE_GAMES.find(g => g.id === selectedGame);
    if (!game) return;
    const amount = parseFloat(wagerAmount);
    if (isNaN(amount) || amount < game.minBet) return;
    setCreating(true);
    const battle = await createBattle(user.id, game.id, game.label, amount);
    setCreating(false);
    if (battle) navigate(`/lives?game=${game.id}&battle=${battle.id}`);
  };

  const handleAccept = async () => {
    if (!user || !acceptTarget) return;
    setAcceptingId(acceptTarget.id);
    const result = await acceptBattle(acceptTarget.id, user.id);
    setAcceptingId(null);
    setAcceptTarget(null);
    if (result) navigate(`/lives?game=${acceptTarget.game_id}&battle=${acceptTarget.id}`);
  };

  const filteredOpen = openBattles.filter(b => {
    const matchesSearch = !searchQuery || b.game_label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'todos' || gameCategories[b.game_id] === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const gameMap = new Map<string, (typeof BATTLE_GAMES)[number]>();
  BATTLE_GAMES.forEach(g => gameMap.set(g.id, g));

  const myOpen = myBattles.filter(b => b.status === 'open');
  const myPlaying = myBattles.filter(b => b.status === 'accepted' || b.status === 'playing');
  const myCompleted = myBattles.filter(b => b.status === 'completed');

  const getResultLabel = (b: UserBattle) => {
    if (!user || b.status !== 'completed') return '';
    if (b.winner_id === user.id) return 'Vitoria';
    if (b.winner_id) return 'Derrota';
    return 'Empate';
  };
  const getResultColor = (b: UserBattle) => {
    if (!user || b.status !== 'completed') return '';
    if (b.winner_id === user.id) return 'text-emerald-400';
    if (b.winner_id) return 'text-red-400';
    return 'text-yellow-400';
  };

  const tabs: { id: TabId; label: string; icon: typeof Sword }[] = [
    { id: 'open', label: 'Batalhas Abertas', icon: Sword },
    { id: 'mine', label: 'Minhas Batalhas', icon: Crown },
    { id: 'create', label: 'Criar Batalha', icon: Plus },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
    return String(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0d0820] text-white">
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Zap className="h-4 w-4 text-yellow-300" />
              Arena de Apostas ao Vivo
            </div>
          </motion.div>
          <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Batalhas de Apostas
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mx-auto max-w-md text-base text-white/80">
            Desafia outros jogadores e ganha dinheiro real
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-md">
            <Shield className="h-5 w-5 text-emerald-300" />
            <span className="text-sm text-white/70">Saldo</span>
            <span className="text-xl font-bold text-white">{formatMZN(balance)}</span>
            <Link to="/wallet" className="ml-1 text-xs text-emerald-300 underline underline-offset-2 hover:text-emerald-200">Carregar</Link>
          </motion.div>
        </div>
      </div>

      <div className="relative border-b border-white/10 bg-[#0f0a1a]/90 backdrop-blur-lg">
        <div className="mx-auto max-w-5xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Ao Vivo</span>
            </div>
            <div className="relative h-5 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tickerIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center"
                >
                  <div className="flex items-center gap-2">
                    {tickerMessages[tickerIndex].won ? (
                      <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${tickerMessages[tickerIndex].won ? 'text-emerald-300' : 'text-red-300/70'}`}>
                      {tickerMessages[tickerIndex].text}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-2">
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={statsVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-transparent p-4 text-center"
          >
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-purple-500/10 blur-xl" />
            <Sword className="mx-auto mb-2 h-5 w-5 text-purple-400" />
            <p className="text-xl font-extrabold text-white sm:text-2xl">{formatNumber(animatedBattles)}</p>
            <p className="mt-0.5 text-[10px] text-white/50">Batalhas Jogadas</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={statsVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-transparent p-4 text-center"
          >
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
            <TrendingUp className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
            <p className="text-xl font-extrabold text-white sm:text-2xl">MT {formatNumber(animatedBets)}</p>
            <p className="mt-0.5 text-[10px] text-white/50">Total em Apostas</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={statsVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-600/20 via-amber-500/10 to-transparent p-4 text-center"
          >
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-xl" />
            <Users className="mx-auto mb-2 h-5 w-5 text-amber-400" />
            <p className="text-xl font-extrabold text-white sm:text-2xl">{formatNumber(animatedPlayers)}</p>
            <p className="mt-0.5 text-[10px] text-white/50">Jogadores Activos</p>
          </motion.div>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0f0a1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-2 py-2">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}
              >
                <t.icon className="h-4 w-4" />{t.label}
              </motion.button>
            );
          })}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRankings(!showRankings)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${showRankings ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/30' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}
            >
              <Medal className="h-3.5 w-3.5" />
              Ranking
              <ChevronRight className={`h-3 w-3 transition-transform ${showRankings ? 'rotate-90' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          <div className={`min-w-0 flex-1 ${showRankings ? 'md:pr-0' : ''}`}>
            <AnimatePresence mode="wait">
              {tab === 'open' && (
                <motion.div key="open" {...fadeUp} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                  <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <Filter className="h-4 w-4 shrink-0 text-white/30" />
                    {categoryFilters.map(cat => {
                      const active = activeCategory === cat.id;
                      return (
                        <motion.button
                          key={cat.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveCategory(cat.id)}
                          className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${active ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20' : 'border border-white/10 text-white/50 bg-white/5 hover:bg-white/10 hover:text-white/80'}`}
                        >
                          <cat.icon className="h-3 w-3" />
                          {cat.label}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <Input placeholder="Pesquisar jogo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40 focus:border-purple-500" />
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs text-white/60">
                      <Eye className="h-3.5 w-3.5" />{filteredOpen.length} batalhas
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-5"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Ultimos Resultados</h3>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {fakeRecentResults.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.08 }}
                          whileHover={{ scale: 1.02, y: -1 }}
                          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Trophy className="h-3 w-3 text-emerald-400" />
                            <span className="font-bold text-emerald-300">{r.winner}</span>
                            <span className="text-white/30">vs</span>
                            <span className="text-white/40">{r.loser}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
                            <span>{r.game}</span>
                            <span className="text-emerald-400 font-semibold">{r.amount} MZN</span>
                            <span>{r.time}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {loading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div>
                  ) : filteredOpen.length === 0 ? (
                    <motion.div {...fadeUp} className="flex flex-col items-center justify-center py-16 text-center">
                      <EmptyStateEmojiArt />
                      <p className="text-sm font-medium text-white/40">{searchQuery || activeCategory !== 'todos' ? 'Nenhuma batalha encontrada' : 'Nenhuma batalha aberta neste momento'}</p>
                      <p className="mt-1 text-xs text-white/25">{searchQuery || activeCategory !== 'todos' ? 'Tenta outra pesquisa ou categoria' : 'Se o primeiro a criar uma batalha!'}</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" onClick={() => setTab('create')} className="mt-4 border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                          <Plus className="mr-1.5 h-4 w-4" /> Criar Batalha
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                      {filteredOpen.map(battle => {
                        const game = gameMap.get(battle.game_id);
                        return (
                          <motion.div key={battle.id} variants={fadeUp}
                            whileHover={{ scale: 1.01, borderColor: 'rgba(168, 85, 247, 0.3)' }}
                            whileTap={{ scale: 0.99 }}
                            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-purple-500/30 hover:bg-white/[0.07]"
                          >
                            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), transparent, rgba(236,72,153,0.1))' }} />

                            <div className="relative flex items-center gap-4 p-4">
                              <motion.div whileHover={{ scale: 1.1, rotate: 3 }}
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-2xl shadow-lg`}>
                                {game?.emoji ?? '\u{1F3AE}'}
                              </motion.div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">{battle.game_label}</p>
                                <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
                                  <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-400" />{battle.creator?.display_name || 'Jogador'}</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(battle.created_at)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-emerald-400">{formatMZN(battle.wager_amount)}</p>
                                <p className="text-[10px] text-white/40">aposta</p>
                              </div>
                              <Dialog>
                                <DialogTrigger>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500" onClick={() => setAcceptTarget(battle)}>
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                </DialogTrigger>
                                <DialogContent className="border-white/10 bg-[#1a1035] text-white sm:max-w-md">
                                  <DialogHeader><DialogTitle>Aceitar Batalha?</DialogTitle></DialogHeader>
                                  <div className="space-y-4 pt-2">
                                    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                                      <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-3xl`}>{game?.emoji ?? '\u{1F3AE}'}</div>
                                      <div><p className="font-bold">{battle.game_label}</p><p className="text-sm text-white/50">vs {battle.creator?.display_name || 'Jogador'}</p></div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                                      <span className="text-sm text-white/60">Aposta</span>
                                      <span className="text-lg font-bold text-emerald-400">{formatMZN(battle.wager_amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                                      <span className="text-sm text-white/60">Seu saldo</span>
                                      <span className={`font-bold ${balance >= battle.wager_amount ? 'text-emerald-400' : 'text-red-400'}`}>{formatMZN(balance)}</span>
                                    </div>
                                    <Button onClick={handleAccept} disabled={!user || !!acceptingId || balance < battle.wager_amount}
                                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-6 text-base font-bold hover:from-emerald-500 hover:to-teal-500">
                                      {acceptingId ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sword className="mr-2 h-5 w-5" />}Aceitar Batalha
                                    </Button>
                                    {!user && <p className="text-center text-xs text-white/40"><Link to="/login" className="text-purple-400 underline">Faz login</Link> para aceitar</p>}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {tab === 'mine' && (
                <motion.div key="mine" {...fadeUp} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                  {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <EmptyStateEmojiArt />
                      <p className="text-sm font-medium text-white/40">Faz login para ver as tuas batalhas</p>
                      <Link to="/login"><Button variant="outline" className="mt-4 border-purple-500/50 text-purple-300">Entrar</Button></Link>
                    </div>
                  ) : loading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />)}</div>
                  ) : myBattles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <EmptyStateEmojiArt />
                      <p className="text-sm font-medium text-white/40">Ainda nao participaste em nenhuma batalha</p>
                      <Button variant="outline" onClick={() => setTab('open')} className="mt-4 border-purple-500/50 text-purple-300"><Search className="mr-1.5 h-4 w-4" /> Ver Batalhas Abertas</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {[
                        { label: 'Em Aberto', battles: myOpen, icon: Clock, color: 'text-emerald-400' },
                        { label: 'Em Jogo', battles: myPlaying, icon: Zap, color: 'text-amber-400' },
                        { label: 'Concluidas', battles: myCompleted, icon: Trophy, color: 'text-gray-400' },
                      ].map(group => group.battles.length > 0 && (
                        <div key={group.label}>
                          <div className="mb-2 flex items-center gap-2">
                            <group.icon className={`h-4 w-4 ${group.color}`} />
                            <h3 className="text-sm font-semibold text-white/70">{group.label}</h3>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">{group.battles.length}</span>
                          </div>
                          <div className="space-y-2">
                            {group.battles.map(battle => {
                              const game = gameMap.get(battle.game_id);
                              const result = getResultLabel(battle);
                              return (
                                <motion.div key={battle.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                  whileHover={{ scale: 1.01, borderColor: 'rgba(168, 85, 247, 0.3)' }}
                                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                                >
                                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-lg`}>{game?.emoji ?? '\u{1F3AE}'}</motion.div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{battle.game_label}</p>
                                    <p className="text-xs text-white/40">{battle.status === 'open' ? 'A espera de adversario...' : `Criada ${timeAgo(battle.created_at)}`}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-400">{formatMZN(battle.wager_amount)}</p>
                                    {result && <p className={`text-xs font-bold ${getResultColor(battle)}`}>{result}</p>}
                                    <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[battle.status] ?? ''}`}>{statusLabels[battle.status] ?? battle.status}</span>
                                  </div>
                                  {(battle.status === 'accepted' || battle.status === 'playing') && (
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                      <Button size="sm" onClick={() => navigate(`/lives?game=${battle.game_id}&battle=${battle.id}`)} className="bg-gradient-to-r from-purple-600 to-indigo-600"><ArrowRight className="h-4 w-4" /></Button>
                                    </motion.div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'create' && (
                <motion.div key="create" {...fadeUp} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
                  {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <EmptyStateEmojiArt />
                      <p className="text-sm font-medium text-white/40">Faz login para criar batalhas</p>
                      <Link to="/login"><Button variant="outline" className="mt-4 border-purple-500/50 text-purple-300">Entrar</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h2 className="mb-1 text-lg font-bold">Escolhe o Jogo</h2>
                        <p className="text-xs text-white/50">Selecciona o jogo para a tua batalha</p>
                      </div>
                      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {BATTLE_GAMES.map(game => {
                          const isSelected = selectedGame === game.id;
                          return (
                            <motion.button key={game.id} variants={fadeUp} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => setSelectedGame(game.id)}
                              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${isSelected ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/20' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'}`}>
                              <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                                className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${game.grad} text-2xl shadow-md`}>{game.emoji}</motion.div>
                              <p className="text-xs font-semibold leading-tight">{game.label}</p>
                              <p className="text-[10px] text-white/40">Min. {formatMZN(game.minBet)}</p>
                              {isSelected && (
                                <motion.div layoutId="game-check" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white"><Shield className="h-3 w-3" /></motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                      <AnimatePresence>
                        {selectedGame && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                              <div className="relative">
                                <h3 className="mb-4 text-sm font-semibold">Configurar Batalha</h3>
                                <div className="mb-4">
                                  <label className="mb-1.5 block text-xs text-white/60">Valor da Aposta (MZN)</label>
                                  <Input type="number" min={BATTLE_GAMES.find(g => g.id === selectedGame)?.minBet ?? 10} placeholder="Ex: 50" value={wagerAmount} onChange={e => setWagerAmount(e.target.value)}
                                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-purple-500" />
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {[20, 50, 100, 250, 500, 1000].map(v => (
                                      <motion.button
                                        key={v}
                                        whileHover={{ scale: 1.08, y: -1 }}
                                        whileTap={{ scale: 0.94 }}
                                        onClick={() => setWagerAmount(String(v))}
                                        className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all ${wagerAmount === String(v) ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-md shadow-purple-500/20' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                      >
                                        {v}
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>

                                <motion.div
                                  whileHover={{ scale: 1.01 }}
                                  className={`mb-5 flex items-center justify-between rounded-xl border p-3 transition-all ${safeBet ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <ShieldCheck className={`h-5 w-5 ${safeBet ? 'text-emerald-400' : 'text-white/30'}`} />
                                    <div>
                                      <p className="text-xs font-semibold text-white/80">Aposta Segura</p>
                                      <p className="text-[10px] text-white/40">Protecao parcial contra perdas</p>
                                    </div>
                                  </div>
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSafeBet(!safeBet)}
                                    className={`relative h-6 w-11 rounded-full transition-colors ${safeBet ? 'bg-emerald-500' : 'bg-white/20'}`}
                                  >
                                    <motion.div
                                      animate={{ x: safeBet ? 20 : 2 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                                    />
                                  </motion.button>
                                </motion.div>

                                <div className="mb-5 rounded-xl bg-emerald-500/10 p-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/60">Seu saldo</span>
                                    <span className="font-bold text-emerald-400">{formatMZN(balance)}</span>
                                  </div>
                                </div>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button onClick={handleCreate}
                                    disabled={creating || !wagerAmount || parseFloat(wagerAmount) < (BATTLE_GAMES.find(g => g.id === selectedGame)?.minBet ?? 10)}
                                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 py-6 text-base font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50">
                                    {creating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sword className="mr-2 h-5 w-5" />}Criar Batalha
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showRankings && (
              <motion.aside
                initial={{ opacity: 0, x: 30, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 280 }}
                exit={{ opacity: 0, x: 30, width: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="hidden md:block shrink-0 overflow-hidden"
              >
                <div className="w-[280px] space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white/80">Top Battlers</h3>
                  </div>
                  {fakeRanking.map((player, i) => (
                    <motion.div
                      key={player.rank}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      whileHover={{ scale: 1.03, x: -2 }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${player.color} text-sm font-extrabold text-white shadow-md`}>
                        {player.rank}
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-lg border border-white/10">
                        {String(player.name.charAt(0))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{player.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-emerald-400 font-semibold">{player.wins} V</span>
                          <span className="text-[10px] text-white/30">|</span>
                          <span className="text-[10px] text-amber-400 font-semibold">{formatMZN(player.totalWon)}</span>
                        </div>
                      </div>
                      {player.rank <= 3 && (
                        <Crown className={`h-4 w-4 shrink-0 ${player.rank === 1 ? 'text-amber-400' : player.rank === 2 ? 'text-gray-300' : 'text-amber-600'}`} />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {tab !== 'create' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 md:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white/80">Top Battlers</h3>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {fakeRanking.map((player, i) => (
                  <motion.div
                    key={player.rank}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: rankingsVisible ? 1 : 0, y: rankingsVisible ? 0 : 15 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                    style={{ minWidth: 150 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${player.color} text-xs font-extrabold text-white shadow-md`}>
                        {player.rank}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 text-sm border border-white/10 font-bold">
                        {String(player.name.charAt(0))}
                      </div>
                    </div>
                    <p className="truncate text-xs font-bold text-white">{player.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-semibold">{player.wins} Vitorias</span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-amber-400">{formatMZN(player.totalWon)}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
