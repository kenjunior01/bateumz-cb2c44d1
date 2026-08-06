'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Star,
  Lock,
  Unlock,
  Flame,
  Target,
  Calendar,
  Shield,
  Users,
  Zap,
  Crown,
  Gift,
  Award,
  TrendingUp,
  CheckCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

import {
  getAchievements,
  getUserAchievements,
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementRarity,
  ACHIEVEMENT_RARITY_LABELS,
  ACHIEVEMENT_RARITY_COLORS,
  ACHIEVEMENT_CATEGORY_LABELS,
} from '@/lib/esports-advanced';

// =============================================================
// Mock data
// =============================================================

const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'mock-1',
    name: 'Primeira Vitoria',
    slug: 'primeira-vitoria',
    description: 'Ganha o teu primeiro jogo numa temporada',
    icon_emoji: '\u{1F3C6}',
    category: 'seasonal',
    requirement: { type: 'wins', count: 1 },
    reward_coins: 100,
    reward_xp: 50,
    rarity: 'common',
    is_hidden: false,
    is_active: true,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-2',
    name: 'Matador de Elite',
    slug: 'matador-de-elite',
    description: 'Alcancar 100 eliminacoes no total',
    icon_emoji: '\u{1F5E1}\u{FE0F}',
    category: 'lifetime',
    requirement: { type: 'kills', count: 100 },
    reward_coins: 500,
    reward_xp: 200,
    rarity: 'uncommon',
    is_hidden: false,
    is_active: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-3',
    name: 'Campeao de Torneio',
    slug: 'campeao-de-torneio',
    description: 'Vence um torneio oficial',
    icon_emoji: '\u{1F451}',
    category: 'tournament',
    requirement: { type: 'tournament_wins', count: 1 },
    reward_coins: 2000,
    reward_xp: 1000,
    rarity: 'legendary',
    is_hidden: false,
    is_active: true,
    sort_order: 3,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-4',
    name: 'Sequencia Impecavel',
    slug: 'sequencia-impecavel',
    description: 'Obtem 5 vitorias consecutivas',
    icon_emoji: '\u{1F525}',
    category: 'streak',
    requirement: { type: 'win_streak', count: 5 },
    reward_coins: 750,
    reward_xp: 350,
    rarity: 'rare',
    is_hidden: false,
    is_active: true,
    sort_order: 4,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-5',
    name: 'Social Butterfly',
    slug: 'social-butterfly',
    description: 'Convida 10 amigos para a plataforma',
    icon_emoji: '\u{1F91D}',
    category: 'social',
    requirement: { type: 'invites', count: 10 },
    reward_coins: 300,
    reward_xp: 150,
    rarity: 'uncommon',
    is_hidden: false,
    is_active: true,
    sort_order: 5,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-6',
    name: 'Misterio Desvendado',
    slug: 'misterio-desvendado',
    description: 'Uma conquista secreta especial',
    icon_emoji: '\u{1F916}',
    category: 'special',
    requirement: { type: 'secret', count: 1 },
    reward_coins: 5000,
    reward_xp: 2500,
    rarity: 'mythic',
    is_hidden: true,
    is_active: true,
    sort_order: 6,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-7',
    name: 'Veterano de Temporada',
    slug: 'veterano-de-temporada',
    description: 'Completa 3 temporadas inteiras',
    icon_emoji: '\u{1F3AF}',
    category: 'seasonal',
    requirement: { type: 'seasons_completed', count: 3 },
    reward_coins: 1200,
    reward_xp: 600,
    rarity: 'epic',
    is_hidden: false,
    is_active: true,
    sort_order: 7,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-8',
    name: 'Destruidor de Torneios',
    slug: 'destruidor-de-torneios',
    description: 'Participa em 20 torneios',
    icon_emoji: '\u{2694}\u{FE0F}',
    category: 'tournament',
    requirement: { type: 'tournaments_played', count: 20 },
    reward_coins: 1500,
    reward_xp: 750,
    rarity: 'rare',
    is_hidden: false,
    is_active: true,
    sort_order: 8,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-9',
    name: 'Inabalavel',
    slug: 'inaabalavel',
    description: 'Alcancar 10 vitorias consecutivas',
    icon_emoji: '\u{26A1}',
    category: 'streak',
    requirement: { type: 'win_streak', count: 10 },
    reward_coins: 3000,
    reward_xp: 1500,
    rarity: 'epic',
    is_hidden: false,
    is_active: true,
    sort_order: 9,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-10',
    name: 'MVP Dominante',
    slug: 'mvp-dominante',
    description: 'Sere eleito MVP 15 vezes',
    icon_emoji: '\u{1F451}',
    category: 'lifetime',
    requirement: { type: 'mvp_count', count: 15 },
    reward_coins: 2500,
    reward_xp: 1200,
    rarity: 'legendary',
    is_hidden: false,
    is_active: true,
    sort_order: 10,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-11',
    name: 'Lenda Viva',
    slug: 'lenda-viva',
    description: 'Alcancar 1000 eliminacoes no total',
    icon_emoji: '\u{1F480}',
    category: 'lifetime',
    requirement: { type: 'kills', count: 1000 },
    reward_coins: 5000,
    reward_xp: 3000,
    rarity: 'mythic',
    is_hidden: false,
    is_active: true,
    sort_order: 11,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-12',
    name: 'Amigo de Todos',
    slug: 'amigo-de-todos',
    description: 'Recebe 50 votos de desportivismo',
    icon_emoji: '\u{2764}\u{FE0F}',
    category: 'social',
    requirement: { type: 'sportsmanship_votes', count: 50 },
    reward_coins: 800,
    reward_xp: 400,
    rarity: 'rare',
    is_hidden: false,
    is_active: true,
    sort_order: 12,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-13',
    name: 'Cacador de Premios',
    slug: 'cacador-de-premios',
    description: 'Ganha premios em 5 torneios diferentes',
    icon_emoji: '\u{1F381}',
    category: 'tournament',
    requirement: { type: 'prize_wins', count: 5 },
    reward_coins: 1800,
    reward_xp: 900,
    rarity: 'epic',
    is_hidden: false,
    is_active: true,
    sort_order: 13,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-14',
    name: 'Iniciante Promissor',
    slug: 'iniciante-promissor',
    description: 'Joga 10 partidas na tua primeira temporada',
    icon_emoji: '\u{1F31F}',
    category: 'seasonal',
    requirement: { type: 'matches_played', count: 10 },
    reward_coins: 200,
    reward_xp: 100,
    rarity: 'common',
    is_hidden: false,
    is_active: true,
    sort_order: 14,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mock-15',
    name: 'Segredo do Mestre',
    slug: 'segredo-do-mestre',
    description: 'Descobre o segredo oculto da plataforma',
    icon_emoji: '\u{1F52E}',
    category: 'special',
    requirement: { type: 'easter_egg', count: 1 },
    reward_coins: 8000,
    reward_xp: 5000,
    rarity: 'mythic',
    is_hidden: true,
    is_active: true,
    sort_order: 15,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const MOCK_USER_ACHIEVEMENTS: (UserAchievement & { achievement?: Achievement })[] = [
  {
    id: 'ua-1',
    user_id: 'user-1',
    achievement_id: 'mock-1',
    progress: 1,
    target: 1,
    is_completed: true,
    completed_at: '2024-06-15T10:30:00Z',
    notified: true,
    created_at: '2024-01-01T00:00:00Z',
    achievement: MOCK_ACHIEVEMENTS[0],
  },
  {
    id: 'ua-2',
    user_id: 'user-1',
    achievement_id: 'mock-4',
    progress: 3,
    target: 5,
    is_completed: false,
    notified: false,
    created_at: '2024-02-01T00:00:00Z',
    achievement: MOCK_ACHIEVEMENTS[3],
  },
  {
    id: 'ua-3',
    user_id: 'user-1',
    achievement_id: 'mock-2',
    progress: 67,
    target: 100,
    is_completed: false,
    notified: false,
    created_at: '2024-01-15T00:00:00Z',
    achievement: MOCK_ACHIEVEMENTS[1],
  },
  {
    id: 'ua-4',
    user_id: 'user-1',
    achievement_id: 'mock-5',
    progress: 7,
    target: 10,
    is_completed: false,
    notified: false,
    created_at: '2024-03-01T00:00:00Z',
    achievement: MOCK_ACHIEVEMENTS[4],
  },
  {
    id: 'ua-5',
    user_id: 'user-1',
    achievement_id: 'mock-14',
    progress: 10,
    target: 10,
    is_completed: true,
    completed_at: '2024-07-01T14:00:00Z',
    notified: true,
    created_at: '2024-01-01T00:00:00Z',
    achievement: MOCK_ACHIEVEMENTS[13],
  },
];

// =============================================================
// Category tab definitions
// =============================================================

type TabCategory = 'all' | AchievementCategory;

const CATEGORY_TABS: { value: TabCategory; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'seasonal', label: 'Temporada' },
  { value: 'lifetime', label: 'Historico' },
  { value: 'tournament', label: 'Torneio' },
  { value: 'streak', label: 'Sequencias' },
  { value: 'social', label: 'Social' },
  { value: 'special', label: 'Especial' },
];

const RARITY_ORDER: AchievementRarity[] = [
  'mythic',
  'legendary',
  'epic',
  'rare',
  'uncommon',
  'common',
];

// =============================================================
// Helpers
// =============================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// =============================================================
// Animation variants
// =============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 18,
    },
  },
};

// =============================================================
// Skeleton loader
// =============================================================

function AchievementSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-14 w-14 rounded-xl bg-white/10" />
        <Skeleton className="h-5 w-20 rounded-full bg-white/10" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2 bg-white/10" />
      <Skeleton className="h-4 w-full mb-1 bg-white/10" />
      <Skeleton className="h-4 w-2/3 mb-4 bg-white/10" />
      <Skeleton className="h-2 w-full rounded-full bg-white/10" />
    </div>
  );
}

// =============================================================
// Stat Card
// =============================================================

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 min-w-[140px]">
      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-emerald-400" />
      </div>
      <div>
        <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// =============================================================
// Achievement Card
// =============================================================

function AchievementCard({
  achievement,
  userAchievement,
}: {
  achievement: Achievement;
  userAchievement?: UserAchievement;
}) {
  const isUnlocked = userAchievement?.is_completed ?? false;
  const isHidden = achievement.is_hidden;
  const isSecret = isHidden && !isUnlocked;

  const rarityColor = ACHIEVEMENT_RARITY_COLORS[achievement.rarity];
  const rarityLabel = ACHIEVEMENT_RARITY_LABELS[achievement.rarity];
  const categoryLabel = ACHIEVEMENT_CATEGORY_LABELS[achievement.category];

  const progress = userAchievement?.progress ?? 0;
  const target = userAchievement?.target ?? (achievement.requirement?.count ?? 1);
  const progressPercent = Math.min(Math.round((progress / target) * 100), 100);

  const displayName = isSecret ? '???' : achievement.name;
  const displayDescription = isSecret ? 'Conquista secreta' : achievement.description;
  const displayEmoji = isSecret ? null : achievement.icon_emoji;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{
        scale: 1.03,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }}
      className="relative group"
    >
      {/* Rarity glow border */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${rarityColor}40, transparent 60%)`,
        }}
      />

      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 h-full flex flex-col transition-all duration-300 group-hover:border-white/20">
        {/* Header row: icon + rarity badge */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
            style={{
              background: isUnlocked
                ? `linear-gradient(135deg, ${rarityColor}30, ${rarityColor}10)`
                : 'bg-white/5',
            }}
          >
            {displayEmoji ? (
              <span>{displayEmoji}</span>
            ) : (
              <Lock className="h-7 w-7 text-white/30" />
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge
              className="text-[10px] font-bold uppercase tracking-wider border-0"
              style={{
                backgroundColor: `${rarityColor}25`,
                color: rarityColor,
              }}
            >
              {rarityLabel}
            </Badge>
            {isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
              >
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Name & description */}
        <h3 className="text-white font-bold text-base mb-1 leading-tight">{displayName}</h3>
        <p className="text-white/50 text-sm mb-3 leading-relaxed flex-1">{displayDescription}</p>

        {/* Category badge */}
        <div className="mb-3">
          <Badge variant="outline" className="text-[10px] text-white/60 border-white/15 bg-white/5">
            {categoryLabel}
          </Badge>
        </div>

        {/* Progress bar (when not completed) */}
        {!isUnlocked && !isSecret && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-white/40">Progresso</span>
              <span className="text-white/70 font-semibold">{progress}/{target}</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 bg-white/10"
            />
          </div>
        )}

        {/* Reward row */}
        {!isSecret && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold">{achievement.reward_coins}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-sky-400 text-xs font-bold">{achievement.reward_xp} XP</span>
            </div>
          </div>
        )}

        {/* Completed overlay sparkle effect */}
        {isUnlocked && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 20% 20%, ${rarityColor}15, transparent 50%), radial-gradient(circle at 80% 80%, ${rarityColor}10, transparent 50%)`,
              }}
            />
          </motion.div>
        )}

        {/* Completed date */}
        {isUnlocked && userAchievement?.completed_at && (
          <div className="flex items-center gap-1 mt-2 text-emerald-400/70 text-[11px]">
            <Sparkles className="h-3 w-3" />
            <span>Desbloqueada em {formatDate(userAchievement.completed_at)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================
// Main Page Component
// =============================================================

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<(UserAchievement & { achievement?: Achievement })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabCategory>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [achData, uachData] = await Promise.all([
          getAchievements(),
          getUserAchievements('user-1'),
        ]);

        if (achData.length === 0) {
          setAchievements(MOCK_ACHIEVEMENTS);
          setUserAchievements(MOCK_USER_ACHIEVEMENTS);
        } else {
          setAchievements(achData);
          setUserAchievements(uachData);
        }
      } catch {
        setAchievements(MOCK_ACHIEVEMENTS);
        setUserAchievements(MOCK_USER_ACHIEVEMENTS);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build a map for quick user-achievement lookup
  const userAchievementMap = useMemo(() => {
    const map = new Map<string, UserAchievement>();
    for (const ua of userAchievements) {
      if (ua.achievement_id) {
        map.set(ua.achievement_id, ua);
      }
    }
    return map;
  }, [userAchievements]);

  // Stats
  const stats = useMemo(() => {
    const unlocked = userAchievements.filter((ua) => ua.is_completed).length;
    const total = achievements.length;
    const coinsEarned = userAchievements
      .filter((ua) => ua.is_completed)
      .reduce((sum, ua) => {
        const ach = ua.achievement;
        return sum + (ach?.reward_coins ?? 0);
      }, 0);
    const uniqueBadges = userAchievements.filter(
      (ua) => ua.is_completed && ua.achievement?.reward_badge
    ).length;
    return { unlocked, total, coinsEarned, uniqueBadges };
  }, [achievements, userAchievements]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;
    if (activeTab !== 'all') {
      filtered = filtered.filter((a) => a.category === activeTab);
    }
    if (selectedRarity) {
      filtered = filtered.filter((a) => a.rarity === selectedRarity);
    }
    return filtered;
  }, [achievements, activeTab, selectedRarity]);

  // Clear rarity filter on tab change
  function handleTabChange(value: string) {
    setActiveTab(value as TabCategory);
    setSelectedRarity(null);
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      {/* Shimmer gradient text style */}
      <style>{`
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #22d3ee 25%,
            #a78bfa 50%,
            #f59e0b 75%,
            #ffffff 100%
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .scrollbar-custom::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Sistema de Conquistas</span>
            </div>
            <h1 className="shimmer-text text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-3">
              CONQUISTAS E BADGES
            </h1>
            <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto">
              Desbloqueia conquistas e ganha recompensas
            </p>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <StatCard
              icon={Unlock}
              label="Desbloqueadas"
              value={`${stats.unlocked}/${stats.total}`}
            />
            <StatCard
              icon={Gift}
              label="Moedas ganhas"
              value={stats.coinsEarned.toLocaleString('pt-PT')}
            />
            <StatCard
              icon={Award}
              label="Badges unicos"
              value={String(stats.uniqueBadges)}
            />
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Rarity Filter Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center gap-2 mb-6"
        >
          <span className="text-white/40 text-xs uppercase tracking-wider mr-2 font-medium">Raridade:</span>
          <Button
            size="sm"
            variant={selectedRarity === null ? 'default' : 'ghost'}
            onClick={() => setSelectedRarity(null)}
            className={
              selectedRarity === null
                ? 'bg-white/15 text-white hover:bg-white/20 text-xs h-8'
                : 'text-white/50 hover:text-white hover:bg-white/5 text-xs h-8'
            }
          >
            Todas
          </Button>
          {RARITY_ORDER.map((rarity) => {
            const color = ACHIEVEMENT_RARITY_COLORS[rarity];
            const isActive = selectedRarity === rarity;
            return (
              <Button
                key={rarity}
                size="sm"
                variant={isActive ? 'default' : 'ghost'}
                onClick={() => setSelectedRarity(isActive ? null : rarity)}
                className={
                  isActive
                    ? 'text-xs h-8 border-0'
                    : 'text-xs h-8 hover:bg-white/5'
                }
                style={
                  isActive
                    ? { backgroundColor: `${color}25`, color, border: `1px solid ${color}50` }
                    : { color: `${color}90` }
                }
              >
                {ACHIEVEMENT_RARITY_LABELS[rarity]}
              </Button>
            );
          })}
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="bg-white/5 border border-white/10 rounded-xl h-auto p-1 mb-8 flex flex-wrap gap-1">
              {CATEGORY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={
                    activeTab === tab.value
                      ? 'bg-white/15 text-white data-[state=active]:bg-white/15 data-[state=active]:text-white rounded-lg text-xs sm:text-sm px-3 py-2'
                      : 'text-white/40 data-[state=active]:text-white/60 hover:text-white/60 rounded-lg text-xs sm:text-sm px-3 py-2'
                  }
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All categories share the same grid content */}
            {CATEGORY_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <AchievementSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredAchievements.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/5 mb-4">
                      <RotateCcw className="h-8 w-8 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">
                      Nenhuma conquista encontrada nesta categoria.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-white/50 hover:text-white"
                      onClick={() => {
                        setActiveTab('all');
                        setSelectedRarity(null);
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key={`${activeTab}-${selectedRarity ?? 'all'}`}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredAchievements.map((ach) => (
                        <AchievementCard
                          key={ach.id}
                          achievement={ach}
                          userAchievement={userAchievementMap.get(ach.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

        {/* Summary footer */}
        {!loading && filteredAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-white/30 text-xs">
              {filteredAchievements.length} conquista{filteredAchievements.length !== 1 ? 's' : ''} exibida{filteredAchievements.length !== 1 ? 's' : ''}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
