'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Users, Trophy, Flame, Crown, Clock, Coins,
  Plus, X, Send, Copy, Eye, MessageSquare, Shield,
  ChevronDown, Zap, TrendingUp, Target, Skull, Star,
  AlertTriangle, CheckCircle, XCircle, Minus, ArrowRight,
  Search, Filter, Sparkles, Volume2, UserCheck, UserX,
  CircleDot, Hash, Timer, Gift, BarChart3, Heart,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useCountUp } from '@/hooks/useCountUp';
import {
  ConfettiBurst, CoinRain, ScreenShake, ArenaParticles,
  StreakFire, GlowPulseRing, NumberTicker, P2PToast,
  EnergyWave, haptics,
} from '@/components/esports/P2PArenaEffects';
import type {
  P2PChallenge, P2PChallengeType, P2PChallengeStatus,
  P2PDuelStats, P2PParticipant, P2PChallengeFormat,
} from '@/lib/esports-advanced';
import {
  P2P_CHALLENGE_TYPE_LABELS, P2P_CHALLENGE_STATUS_LABELS,
  P2P_FORMAT_LABELS, P2P_WAGER_PRESETS,
} from '@/lib/esports-advanced';
import FairPlayShield from '@/components/FairPlayShield';
import CardTilt from '@/components/ui/CardTilt';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import GlowPulse from '@/components/ui/GlowPulse';
import EnergyWaveFX from '@/components/ui/EnergyWave';
import ConfettiFX from '@/components/ui/ConfettiBurst';

// ============================================================
// INITIALIZE AUDIO ON FIRST INTERACTION
// ============================================================

function initAudioOnInteraction() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx && AudioCtx.state === 'suspended') AudioCtx.resume();
  } catch (e) { /* ok */ }
}
if (typeof window !== 'undefined') {
  document.addEventListener('click', initAudioOnInteraction, { once: true });
  document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
}

// ============================================================
// MOCK DATA (substituir por Supabase quando a tabela existir)
// ============================================================

const MOCK_OPEN_DUELS: P2PChallenge[] = [
  {
    id: 'd1', challenge_type: 'duel', status: 'waiting_opponent',
    creator_id: 'u1', creator_display_name: 'xNightFury', creator_avatar_url: '',
    creator_prediction: 'Team Alpha vence', creator_score: 0,
    opponent_id: undefined, opponent_display_name: undefined, opponent_score: 0,
    match_id: 'm1', championship_name: 'Liga MZ Pro',
    match_label: 'Alpha vs Omega', market_type: 'match_winner',
    wager_amount: 100, prize_pool: 100, platform_fee: 5,
    format: 'single_match', total_rounds: 1, current_round: 0,
    expires_at: new Date(Date.now() + 18 * 3600000).toISOString(),
    is_public: true, spectator_count: 12, chat_enabled: true,
    trash_talk: 'Tens coragem para me enfrentar?',
    invite_code: 'NR7K2M', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'd2', challenge_type: 'duel', status: 'waiting_opponent',
    creator_id: 'u2', creator_display_name: 'QueenSlayer', creator_avatar_url: '',
    creator_prediction: 'Map Nuke vai para OT', creator_score: 0,
    opponent_id: undefined, opponent_display_name: undefined, opponent_score: 0,
    match_id: 'm2', championship_name: 'CS2 Masters',
    match_label: 'Nexus vs Flames', market_type: 'map_winner',
    wager_amount: 250, prize_pool: 250, platform_fee: 12,
    format: 'best_of_3', total_rounds: 3, current_round: 0,
    expires_at: new Date(Date.now() + 6 * 3600000).toISOString(),
    is_public: true, spectator_count: 34, chat_enabled: true,
    trash_talk: 'Sou imbativel em BO3. Provem o contrario.',
    invite_code: 'K3P9XZ', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'd3', challenge_type: 'duel', status: 'waiting_opponent',
    creator_id: 'u3', creator_display_name: 'BlazeMaster', creator_avatar_url: '',
    creator_prediction: 'MVP vai ser xNightFury', creator_score: 0,
    opponent_id: undefined, opponent_display_name: undefined, opponent_score: 0,
    match_id: 'm3', championship_name: 'Valorant Challengers',
    match_label: 'Storm vs Phoenix', market_type: 'mvp',
    wager_amount: 50, prize_pool: 50, platform_fee: 2,
    format: 'single_match', total_rounds: 1, current_round: 0,
    expires_at: new Date(Date.now() + 36 * 3600000).toISOString(),
    is_public: true, spectator_count: 5, chat_enabled: true,
    invite_code: 'ABC123', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'd4', challenge_type: 'duel', status: 'waiting_opponent',
    creator_id: 'u4', creator_display_name: 'ShadowKing', creator_avatar_url: '',
    creator_prediction: 'Primeira eliminacao em < 2min', creator_score: 0,
    opponent_id: undefined, opponent_display_name: undefined, opponent_score: 0,
    match_id: 'm4', championship_name: 'PUBG Mobile Cup',
    match_label: 'Final Grande', market_type: 'first_blood',
    wager_amount: 500, prize_pool: 500, platform_fee: 25,
    format: 'single_match', total_rounds: 1, current_round: 0,
    expires_at: new Date(Date.now() + 2 * 3600000).toISOString(),
    is_public: true, spectator_count: 67, chat_enabled: true,
    trash_talk: '500 moedas. Sem fraquezas.',
    invite_code: 'QW4RTY', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const MOCK_GROUP_CHALLENGES: P2PChallenge[] = [
  {
    id: 'g1', challenge_type: 'group', status: 'active',
    creator_id: 'u5', creator_display_name: 'TournamentKing', creator_avatar_url: '',
    creator_prediction: 'Team Alpha', creator_score: 0, opponent_score: 0,
    participants: [
      { user_id: 'u5', display_name: 'TournamentKing', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u6', display_name: 'SniperElite', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u7', display_name: 'QuickScope', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
    ],
    max_participants: 8, match_id: 'm5', championship_name: 'Liga MZ Pro',
    match_label: 'Semi-Final: Alpha vs Beta', market_type: 'match_winner',
    wager_amount: 100, prize_pool: 300, platform_fee: 15,
    format: 'single_match', total_rounds: 1, current_round: 1,
    expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
    is_public: true, spectator_count: 45, chat_enabled: true,
    invite_code: 'GRP001', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'g2', challenge_type: 'group', status: 'active',
    creator_id: 'u8', creator_display_name: 'PredictPro', creator_avatar_url: '',
    creator_prediction: 'OT Nuke', creator_score: 0, opponent_score: 0,
    participants: [
      { user_id: 'u8', display_name: 'PredictPro', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u9', display_name: 'AceHigh', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u10', display_name: 'BlazeRun', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u11', display_name: 'ViperStrike', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
      { user_id: 'u12', display_name: 'FrostByte', score: 0, wager_paid: true, joined_at: new Date().toISOString() },
    ],
    max_participants: 6, match_id: 'm6', championship_name: 'CS2 Masters',
    match_label: 'Nexus vs Flames', market_type: 'map_winner',
    wager_amount: 50, prize_pool: 250, platform_fee: 12,
    format: 'single_match', total_rounds: 1, current_round: 1,
    expires_at: new Date(Date.now() + 12 * 3600000).toISOString(),
    is_public: true, spectator_count: 28, chat_enabled: true,
    invite_code: 'GRP002', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const MOCK_MY_CHALLENGES: P2PChallenge[] = [
  {
    id: 'mc1', challenge_type: 'duel', status: 'active',
    creator_id: 'me', creator_display_name: 'Tu', creator_avatar_url: '',
    creator_prediction: 'Alpha vence 2-0', creator_score: 2,
    opponent_id: 'u2', opponent_display_name: 'QueenSlayer', opponent_avatar_url: '',
    opponent_prediction: 'Flames vence', opponent_score: 1,
    match_id: 'm10', championship_name: 'CS2 Masters',
    match_label: 'Alpha vs Omega', market_type: 'match_winner',
    wager_amount: 200, prize_pool: 400, platform_fee: 20,
    winner_id: undefined,
    format: 'best_of_3', total_rounds: 3, current_round: 3,
    expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
    is_public: true, spectator_count: 89, chat_enabled: true,
    trash_talk: 'Vais ver o que e bom!',
    invite_code: 'MYD001', started_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'mc2', challenge_type: 'duel', status: 'completed',
    creator_id: 'u3', creator_display_name: 'BlazeMaster', creator_avatar_url: '',
    creator_prediction: 'Phoenix vence', creator_score: 0,
    opponent_id: 'me', opponent_display_name: 'Tu', opponent_avatar_url: '',
    opponent_prediction: 'Storm vence', opponent_score: 1,
    match_id: 'm11', championship_name: 'Valorant Challengers',
    match_label: 'Storm vs Phoenix', market_type: 'match_winner',
    wager_amount: 150, prize_pool: 300, platform_fee: 15,
    winner_id: 'me', winner_display_name: 'Tu',
    format: 'single_match', total_rounds: 1, current_round: 1,
    expires_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    is_public: true, spectator_count: 56, chat_enabled: true,
    invite_code: 'MYD002', started_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: 'mc3', challenge_type: 'group', status: 'completed',
    creator_id: 'u8', creator_display_name: 'PredictPro', creator_avatar_url: '',
    creator_prediction: 'Flames', creator_score: 0, opponent_score: 0,
    participants: [
      { user_id: 'u8', display_name: 'PredictPro', score: 0, wager_paid: true, joined_at: new Date(Date.now() - 72 * 3600000).toISOString() },
      { user_id: 'me', display_name: 'Tu', score: 1, wager_paid: true, joined_at: new Date(Date.now() - 71 * 3600000).toISOString() },
      { user_id: 'u9', display_name: 'AceHigh', score: 0, wager_paid: true, joined_at: new Date(Date.now() - 70 * 3600000).toISOString() },
      { user_id: 'u10', display_name: 'BlazeRun', score: 0, wager_paid: true, joined_at: new Date(Date.now() - 69 * 3600000).toISOString() },
    ],
    max_participants: 6, match_id: 'm12', championship_name: 'Liga MZ Pro',
    match_label: 'Final: Nexus vs Storm', market_type: 'match_winner',
    wager_amount: 100, prize_pool: 400, platform_fee: 20,
    winner_id: 'me', winner_display_name: 'Tu',
    format: 'single_match', total_rounds: 1, current_round: 1,
    expires_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    is_public: true, spectator_count: 102, chat_enabled: true,
    invite_code: 'GRP003', started_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(), updated_at: new Date().toISOString(),
  },
];

const MOCK_TOP_DUELERS: P2PDuelStats[] = [
  { user_id: 'u1', total_duels: 47, duels_won: 35, duels_lost: 10, duels_draw: 2, win_rate: 74, current_streak: 5, best_streak: 12, total_wagered: 12500, total_won: 18200, total_profit: 5700, biggest_win: 1200 },
  { user_id: 'u2', total_duels: 63, duels_won: 44, duels_lost: 16, duels_draw: 3, win_rate: 70, current_streak: 3, best_streak: 9, total_wagered: 18900, total_won: 24600, total_profit: 5700, biggest_win: 950 },
  { user_id: 'u5', total_duels: 31, duels_won: 22, duels_lost: 7, duels_draw: 2, win_rate: 71, current_streak: 0, best_streak: 8, total_wagered: 7750, total_won: 10500, total_profit: 2750, biggest_win: 800 },
  { user_id: 'u3', total_duels: 28, duels_won: 18, duels_lost: 9, duels_draw: 1, win_rate: 64, current_streak: 1, best_streak: 6, total_wagered: 5600, total_won: 7200, total_profit: 1600, biggest_win: 600 },
  { user_id: 'u4', total_duels: 55, duels_won: 33, duels_lost: 20, duels_draw: 2, win_rate: 60, current_streak: 2, best_streak: 7, total_wagered: 22000, total_won: 28500, total_profit: 6500, biggest_win: 1500 },
];

const MOCK_USER_STATS: P2PDuelStats = {
  user_id: 'me', total_duels: 12, duels_won: 8, duels_lost: 3, duels_draw: 1,
  win_rate: 67, current_streak: 2, best_streak: 5,
  total_wagered: 2400, total_won: 3200, total_profit: 800, biggest_win: 570,
};

// ============================================================
// HELPERS
// ============================================================

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ['#00d4ff', '#7b2ff7', '#ff4655', '#fbbf24', '#2ea043', '#ff6b6b', '#58a6ff', '#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

type Tab = 'arena' | 'meus' | 'ranking';

export default function DuelosPage() {
  const { toast } = useToast();
  const { sfx } = useSoundEffects();
  const [activeTab, setActiveTab] = useState<Tab>('arena');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [challengeDetail, setChallengeDetail] = useState<P2PChallenge | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Effects state
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [coinRainTrigger, setCoinRainTrigger] = useState(0);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [energyTrigger, setEnergyTrigger] = useState(0);
  const [toastState, setToastState] = useState({ show: false, message: '', icon: '', color: '' });

  // CountUp for hero stats
  const totalPool = useCountUp({ end: 12450, duration: 2000, separator: '.' });
  const activeDuels = useCountUp({ end: 23, duration: 1500 });
  const groupChallenges = useCountUp({ end: 8, duration: 1200 });
  const streakRecord = useCountUp({ end: 12, duration: 1800 });

  // Show a P2P toast notification
  const showP2PToast = useCallback((message: string, icon: string, color: string) => {
    setToastState({ show: true, message, icon, color });
    setTimeout(() => setToastState(prev => ({ ...prev, show: false })), 3500);
  }, []);

  // Create form state
  const [challengeType, setChallengeType] = useState<P2PChallengeType>('duel');
  const [opponentUsername, setOpponentUsername] = useState('');
  const [matchLabel, setMatchLabel] = useState('');
  const [championshipName, setChampionshipName] = useState('');
  const [wagerAmount, setWagerAmount] = useState(100);
  const [customWager, setCustomWager] = useState('');
  const [prediction, setPrediction] = useState('');
  const [format, setFormat] = useState<P2PChallengeFormat>('single_match');
  const [expiresIn, setExpiresIn] = useState(24);
  const [isPublic, setIsPublic] = useState(true);
  const [trashTalk, setTrashTalk] = useState('');
  const [creating, setCreating] = useState(false);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'arena', label: 'Arena de Duelos', icon: Swords },
    { id: 'meus', label: 'Meus Desafios', icon: Target },
    { id: 'ranking', label: 'Ranking P2P', icon: Trophy },
  ];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    sfx.inviteCopied();
    haptics.success();
    toast({ title: 'Codigo copiado!', description: `${code} — envia ao teu amigo` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateChallenge = async () => {
    setCreating(true);
    sfx.escrowLock();
    haptics.heavy();
    setEnergyTrigger(prev => prev + 1);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    sfx.duelCreated();
    setConfettiTrigger(prev => prev + 1);
    setCreating(false);
    setCreateDialogOpen(false);
    sfx.modalClose();
    showP2PToast(
      challengeType === 'duel'
        ? `Duelo lancado! A espera de ${opponentUsername || 'oponente'}...`
        : 'Desafio de grupo criado!',
      challengeType === 'duel' ? '\u2694\uFE0F' : '\uD83C\uDFB2',
      challengeType === 'duel' ? '#00d4ff' : '#7b2ff7',
    );
    toast({
      title: 'Desafio criado!',
      description: challengeType === 'duel'
        ? `Duelo criado! A espera de ${opponentUsername || 'oponente'}...`
        : 'Desafio de grupo criado! Partilha o codigo de convite.',
    });
  };

  return (
    <div className={"min-h-screen pb-8 " + (shakeTrigger > 0 ? 'p2p-shake-active' : '')}>
      {/* Global Visual Effects */}
      <ArenaParticles />
      <ConfettiBurst trigger={confettiTrigger} x={50} y={40} count={60} />
      <CoinRain trigger={coinRainTrigger} count={25} />
      <ScreenShake trigger={shakeTrigger} intensity="medium" />
      <P2PToast
        message={toastState.message}
        icon={toastState.icon}
        color={toastState.color}
        show={toastState.show}
      />
      {/* Hero Banner */}
      <div className="relative overflow-hidden px-4 pt-6 pb-8">
        <div className="absolute inset-0 p2p-arena-bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--area-bg,#0a0a0f)]" />
        <EnergyWaveFX active={energyTrigger > 0} color="#00d4ff" waveCount={5} maxRadius={400} duration={1800} onComplete={() => {}} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="relative flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,247,0.2))',
                  border: '1px solid rgba(0,212,255,0.3)',
                  boxShadow: '0 0 20px rgba(0,212,255,0.15)',
                }}
              >
                <Swords className="w-5 h-5 text-[#00d4ff]" />
              </div>
              <div>
                <h1
                  className="text-2xl md:text-3xl font-black text-white tracking-tight"
                  style={{ fontFamily: 'var(--font-display, system-ui)' }}
                >
                  ARENA DE DUELOS P2P
                </h1>
                <p className="text-xs text-[#00d4ff]/60 tracking-[0.15em] uppercase font-semibold">
                  Desafia. Prova. Conquista. — Moeda Virtual, Emocao Real
                </p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mt-3 max-w-2xl leading-relaxed">
              Enfrenta outros utilizadores em duelos de previsoes com moedas virtuais.
              Cada jogador aposta, o vencedor leva o pool. Sem dinheiro real, pura habilidade.
            </p>
          </motion.div>

          {/* Quick Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-5 flex flex-wrap gap-3"
          >
            <AnimatedQuickStat icon={Swords} label="Duelos Ativos" endValue={23} color="#00d4ff" />
            <AnimatedQuickStat icon={Users} label="Desafios de Grupo" endValue={8} color="#7b2ff7" />
            <AnimatedQuickStat icon={Coins} label="Pool Total" endValue={12450} color="#fbbf24" prefix="" suffix="" formatNumber />
            <AnimatedQuickStat icon={Flame} label="Streak Record" endValue={12} color="#ff4655" />
          </motion.div>

          {/* Create Challenge Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-5"
          >
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="p2p-create-btn flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #7b2ff7)',
                boxShadow: '0 4px 25px rgba(0,212,255,0.3), 0 0 60px rgba(123,47,247,0.1)',
              }}
            >
              <Plus className="w-5 h-5" />
              Criar Desafio P2P
              <Sparkles className="w-4 h-4 text-white/70" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-40 px-4" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto flex gap-1 py-2 border-b border-white/5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); sfx.tabClick(); haptics.light(); }}
                onMouseEnter={() => sfx.tabHover()}
                className={"relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 " + (isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
              >
                {isActive && (
                  <motion.div
                    layoutId="p2p-tab-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(123,47,247,0.08))',
                      border: '1px solid rgba(0,212,255,0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={"relative z-10 w-4 h-4 " + (isActive ? 'text-[#00d4ff]' : '')} />
                <span className="relative z-10">{tab.label}</span>
                {tab.id === 'arena' && (
                  <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff4655] text-[10px] font-black text-white">
                    {MOCK_OPEN_DUELS.length + MOCK_GROUP_CHALLENGES.length}
                  </span>
                )}
                {tab.id === 'meus' && MOCK_MY_CHALLENGES.filter(c => c.status === 'active').length > 0 && (
                  <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fbbf24] text-[10px] font-black text-black">
                    {MOCK_MY_CHALLENGES.filter(c => c.status === 'active').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'arena' && (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Invite Code Search */}
              <div className="mb-6">
                <div
                  className="flex items-center gap-2 p-1.5 rounded-xl max-w-md"
                  style={{
                    background: 'rgba(0,212,255,0.05)',
                    border: '1px solid rgba(0,212,255,0.15)',
                  }}
                >
                  <Hash className="w-4 h-4 text-[#00d4ff] ml-2" />
                  <input
                    type="text"
                    placeholder="Codigo de convite (ex: NR7K2M)"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-zinc-600"
                    maxLength={6}
                  />
                  <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-[#00d4ff] hover:bg-[#00d4ff]/90 transition-all">
                    Entrar
                  </button>
                </div>
              </div>

              {/* Duel Type Sections */}
              <div className="space-y-8">
                {/* 1v1 Duels */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
                      <Swords className="w-4 h-4 text-[#00d4ff]" />
                      <span className="text-sm font-bold text-[#00d4ff]">DUELOS 1v1</span>
                    </div>
                    <span className="text-xs text-zinc-600">{MOCK_OPEN_DUELS.length} duelos abertos</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#00d4ff]/20 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_OPEN_DUELS.map((duel) => (
                      <DuelCard
                        key={duel.id}
                        challenge={duel}
                        onAccept={() => {
                          sfx.duelAccepted();
                          sfx.battleStart();
                          setShakeTrigger(prev => prev + 1);
                          setEnergyTrigger(prev => prev + 1);
                          haptics.heavy();
                          toast({ title: 'Duelo aceite!', description: `Preparado para enfrentar ${duel.creator_display_name}!` });
                        }}
                        onCopyCode={handleCopyCode}
                        onView={() => setChallengeDetail(duel)}
                        copiedCode={copiedCode}
                      />
                    ))}
                  </div>
                </section>

                {/* Group Challenges */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(123,47,247,0.08)', border: '1px solid rgba(123,47,247,0.15)' }}>
                      <Users className="w-4 h-4 text-[#7b2ff7]" />
                      <span className="text-sm font-bold text-[#7b2ff7]">DESAFIOS DE GRUPO</span>
                    </div>
                    <span className="text-xs text-zinc-600">{MOCK_GROUP_CHALLENGES.length} grupos abertos</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7b2ff7]/20 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_GROUP_CHALLENGES.map((gc) => (
                      <GroupChallengeCard
                        key={gc.id}
                        challenge={gc}
                        onJoin={() => {
                          sfx.escrowLock();
                          haptics.medium();
                          setTimeout(() => {
                            sfx.success();
                            setConfettiTrigger(prev => prev + 1);
                            toast({ title: 'Entraste!', description: `Entraste no desafio de ${gc.creator_display_name}` });
                          }, 600);
                        }}
                        onCopyCode={handleCopyCode}
                        onView={() => setChallengeDetail(gc)}
                        copiedCode={copiedCode}
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* How It Works */}
              <div className="mt-10">
                <HowItWorks />
              </div>
            </motion.div>
          )}

          {activeTab === 'meus' && (
            <motion.div
              key="meus"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* User Stats Card */}
              <MyDuelStatsCard stats={MOCK_USER_STATS} />

              {/* My Challenges List */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Historico de Desafios</h3>
                {MOCK_MY_CHALLENGES.map((c) => (
                  <MyChallengeRow key={c.id} challenge={c} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <P2PRankingTable duelers={MOCK_TOP_DUELERS} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fair Play Shield at bottom */}
        <div className="mt-10">
          <FairPlayShield variant="banner" />
        </div>
      </div>

      {/* Create Challenge Dialog */}
      <AnimatePresence>
        {createDialogOpen && (
          <CreateP2PDialog
            challengeType={challengeType}
            setChallengeType={setChallengeType}
            opponentUsername={opponentUsername}
            setOpponentUsername={setOpponentUsername}
            matchLabel={matchLabel}
            setMatchLabel={setMatchLabel}
            championshipName={championshipName}
            setChampionshipName={setChampionshipName}
            wagerAmount={wagerAmount}
            setWagerAmount={setWagerAmount}
            customWager={customWager}
            setCustomWager={setCustomWager}
            prediction={prediction}
            setPrediction={setPrediction}
            format={format}
            setFormat={setFormat}
            expiresIn={expiresIn}
            setExpiresIn={setExpiresIn}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            trashTalk={trashTalk}
            setTrashTalk={setTrashTalk}
            creating={creating}
            onClose={() => setCreateDialogOpen(false)}
            onSubmit={handleCreateChallenge}
          />
        )}
      </AnimatePresence>

      {/* Challenge Detail Modal */}
      <AnimatePresence>
        {challengeDetail && (
          <ChallengeDetailModal
            challenge={challengeDetail}
            onClose={() => setChallengeDetail(null)}
            onCopyCode={handleCopyCode}
            copiedCode={copiedCode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function QuickStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl cursor-default"
      style={{
        background: `linear-gradient(135deg, ${color}08, ${color}04)`,
        border: `1px solid ${color}20`,
      }}
      whileHover={{ scale: 1.03, borderColor: `${color}40` }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => sfx.buttonHover()}
      onClick={() => sfx.coinClink()}
    >
      <Icon className="w-4 h-4" style={{ color }} />
      <div>
        <div className="text-xs text-zinc-500 font-medium">{label}</div>
        <div className="text-sm font-bold text-white">{value}</div>
      </div>
    </motion.div>
  );
}

function AnimatedQuickStat({ icon: Icon, label, endValue, color, prefix = '', suffix = '', formatNumber = false }: {
  icon: any; label: string; endValue: number; color: string; prefix?: string; suffix?: string; formatNumber?: boolean;
}) {
  const { formatted } = useCountUp({ end: endValue, duration: 2000, separator: formatNumber ? '.' : undefined });
  return <QuickStat icon={Icon} label={label} value={prefix + formatted + suffix} color={color} />;
}

// ============================================================
// DUEL CARD (1v1)
// ============================================================

function DuelCard({ challenge, onAccept, onCopyCode, onView, copiedCode }: {
  challenge: P2PChallenge;
  onAccept: () => void;
  onCopyCode: (code: string) => void;
  onView: () => void;
  copiedCode: string | null;
}) {
  const timeLeft = getTimeRemaining(challenge.expires_at);
  const potentialPayout = challenge.wager_amount * 2 - challenge.platform_fee;

  return (
    <CardTilt borderGlow="cyan" borderRadius="1rem">
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="p2p-duel-card relative rounded-2xl p-5 cursor-pointer transition-all duration-300"
      style={{
        background: 'linear-gradient(160deg, rgba(15,15,25,0.95), rgba(10,10,18,0.98))',
        border: '1px solid rgba(0,212,255,0.12)',
      }}
      onClick={onView}
    >
      {/* Top Row: Championship + Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span className="text-xs font-semibold text-[#fbbf24]/80">{challenge.championship_name}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,70,85,0.08)', border: '1px solid rgba(255,70,85,0.15)' }}>
          <Timer className="w-3 h-3 text-[#ff4655]" />
          <span className="text-xs font-bold text-[#ff4655]">{timeLeft}</span>
        </div>
      </div>

      {/* Match Label */}
      <div className="text-center mb-4">
        <div className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-1">Jogo</div>
        <div className="text-sm font-bold text-white">{challenge.match_label}</div>
        <div className="text-xs text-zinc-500 mt-1">{P2P_FORMAT_LABELS[challenge.format]} • {P2P_CHALLENGE_TYPE_LABELS[challenge.market_type] || challenge.market_type}</div>
      </div>

      {/* VS Battle Layout */}
      <div className="flex items-center gap-2 mb-4">
        {/* Creator Side */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white mb-1.5"
            style={{ background: `linear-gradient(135deg, ${getAvatarColor(challenge.creator_display_name)}, ${getAvatarColor(challenge.creator_display_name)}88)`, boxShadow: `0 0 15px ${getAvatarColor(challenge.creator_display_name)}30` }}
          >
            {getInitials(challenge.creator_display_name)}
          </div>
          <div className="text-xs font-bold text-white truncate max-w-full">{challenge.creator_display_name}</div>
          <div className="text-[10px] text-[#00d4ff]/70 truncate max-w-full">"{challenge.creator_prediction}"</div>
        </div>

        {/* VS Badge */}
        <div className="p2p-vs-badge border-gradient-rotate relative flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0">
          <span className="text-xs font-black text-white relative z-10">VS</span>
        </div>

        {/* Opponent Side (Empty) */}
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1.5" style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
            <Plus className="w-5 h-5 text-zinc-600" />
          </div>
          <div className="text-xs font-semibold text-zinc-600">A espera...</div>
          <div className="text-[10px] text-zinc-700">Aceita o desafio</div>
        </div>
      </div>

      {/* Wager + Prize Pool */}
      <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Aposta</div>
          <div className="flex items-center gap-1 justify-center">
            <Coins className="w-3.5 h-3.5 text-[#fbbf24]" />
            <AnimatedNumber value={challenge.wager_amount} className="text-sm font-black text-[#fbbf24]" />
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-600" />
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Vencedor Leva</div>
          <div className="flex items-center gap-1 justify-center">
            <Gift className="w-3.5 h-3.5 text-[#2ea043]" />
            <NumberTicker value={potentialPayout} className="text-sm font-black text-[#2ea043]" />
          </div>
        </div>
      </div>

      {/* Trash Talk */}
      {challenge.trash_talk && (
        <div className="mb-4 p-2.5 rounded-lg" style={{ background: 'rgba(255,70,85,0.05)', border: '1px solid rgba(255,70,85,0.1)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Volume2 className="w-3 h-3 text-[#ff4655]" />
            <span className="text-[10px] font-bold text-[#ff4655] uppercase tracking-wider">Trash Talk</span>
          </div>
          <p className="text-xs text-zinc-400 italic">"{challenge.trash_talk}"</p>
        </div>
      )}

      {/* Bottom Row: Invite Code + Spectators + Accept */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onCopyCode(challenge.invite_code || ''); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {copiedCode === challenge.invite_code ? <CheckCircle className="w-3.5 h-3.5 text-[#2ea043]" /> : <Copy className="w-3.5 h-3.5" />}
          {challenge.invite_code}
        </button>
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <Eye className="w-3.5 h-3.5" />{challenge.spectator_count}
        </div>
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onAccept(); sfx.buttonClick(); haptics.medium(); }}
          className="p2p-accept-btn flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-black bg-[#00d4ff] hover:bg-[#00d4ff]/90 transition-all hover:scale-105 active:scale-95"
          onMouseEnter={() => sfx.buttonHover()}
        >
          <Swords className="w-3.5 h-3.5" />
          ACEITAR
          <EnergyWave trigger={0} color="#00d4ff" />
        </button>
      </div>
    </motion.div>
    </CardTilt>
  );
}

// ============================================================
// GROUP CHALLENGE CARD
// ============================================================

function GroupChallengeCard({ challenge, onJoin, onCopyCode, onView, copiedCode }: {
  challenge: P2PChallenge;
  onJoin: () => void;
  onCopyCode: (code: string) => void;
  onView: () => void;
  copiedCode: string | null;
}) {
  const participants = (challenge.participants || []) as unknown as P2PParticipant[];
  const spotsLeft = (challenge.max_participants || 8) - participants.length;
  const potentialPayout = challenge.prize_pool - challenge.platform_fee;

  return (
    <CardTilt borderGlow="violet" borderRadius="1rem">
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="p2p-group-card relative rounded-2xl p-5 cursor-pointer transition-all duration-300"
      style={{
        background: 'linear-gradient(160deg, rgba(15,15,25,0.95), rgba(10,10,18,0.98))',
        border: '1px solid rgba(123,47,247,0.12)',
      }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#7b2ff7]" />
          <span className="text-xs font-bold text-[#7b2ff7]">DESAFIO DE GRUPO</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(123,47,247,0.08)', border: '1px solid rgba(123,47,247,0.15)' }}>
          <span className="text-xs font-bold text-[#7b2ff7]">{spotsLeft} vagas</span>
        </div>
      </div>

      {/* Match */}
      <div className="mb-3">
        <div className="text-xs text-zinc-600 mb-0.5">{challenge.championship_name}</div>
        <div className="text-sm font-bold text-white">{challenge.match_label}</div>
      </div>

      {/* Participants Row */}
      <div className="flex items-center gap-1.5 mb-4">
        {participants.slice(0, 5).map((p, i) => (
          <div
            key={p.user_id}
            className="relative -ml-1 first:ml-0"
            title={p.display_name}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#0a0a12]"
              style={{ background: getAvatarColor(p.display_name) }}
            >
              {getInitials(p.display_name)}
            </div>
          </div>
        ))}
        {participants.length > 5 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400 ring-2 ring-[#0a0a12] bg-zinc-800">
            +{participants.length - 5}
          </div>
        )}
        {/* Empty slots */}
        {Array.from({ length: Math.min(spotsLeft, 3) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-8 h-8 rounded-full ring-2 ring-[#0a0a12]"
            style={{ border: '2px dashed rgba(123,47,247,0.3)' }}
          />
        ))}
        <div className="ml-2 text-xs text-zinc-500">
          {participants.length}/{challenge.max_participants || 8} jogadores
        </div>
      </div>

      {/* Prize Pool */}
      <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Aposta por jogador</div>
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-[#fbbf24]" />
            <AnimatedNumber value={challenge.wager_amount} className="text-sm font-black text-[#fbbf24]" />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Pool Atual</div>
          <div className="flex items-center gap-1 justify-end">
            <Gift className="w-3.5 h-3.5 text-[#2ea043]" />
            <AnimatedNumber value={challenge.prize_pool} className="text-sm font-black text-[#2ea043]" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onCopyCode(challenge.invite_code || ''); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {copiedCode === challenge.invite_code ? <CheckCircle className="w-3.5 h-3.5 text-[#2ea043]" /> : <Copy className="w-3.5 h-3.5" />}
          {challenge.invite_code}
        </button>
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #7b2ff7, #00d4ff)',
            boxShadow: '0 2px 15px rgba(123,47,247,0.3)',
          }}
        >
          <UserCheck className="w-3.5 h-3.5" />
          ENTRAR
        </button>
      </div>
    </motion.div>
    </CardTilt>
  );
}

// ============================================================
// MY CHALLENGE ROW
// ============================================================

function MyChallengeRow({ challenge }: { challenge: P2PChallenge }) {
  const isWinner = challenge.winner_id === 'me';
  const isDraw = !challenge.winner_id && challenge.status === 'completed';
  const isActive = challenge.status === 'active';
  const isDuel = challenge.challenge_type === 'duel';

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    active: { icon: Flame, color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', label: 'Em Curso' },
    completed: isWinner
      ? { icon: Trophy, color: '#2ea043', bg: 'rgba(46,160,67,0.08)', label: 'Vitoria' }
      : isDraw
        ? { icon: Minus, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', label: 'Empate' }
        : { icon: XCircle, color: '#ff4655', bg: 'rgba(255,70,85,0.08)', label: 'Derrota' },
    waiting_opponent: { icon: Clock, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', label: 'A Esperar' },
  };

  const cfg = statusConfig[challenge.status] || statusConfig.active;
  const StatusIcon = cfg.icon;

  const [showWinConfetti, setShowWinConfetti] = useState(false);
  useEffect(() => {
    if (isWinner) { setShowWinConfetti(true); const t = setTimeout(() => setShowWinConfetti(false), 100); return () => clearTimeout(t); }
  }, [isWinner]);

  return (
    <div className="relative rounded-xl">
      {isWinner && <ConfettiFX active={showWinConfetti} colors={["#00d4ff", "#7b2ff7", "#fbbf24", "#2ea043"]} particleCount={40} spread={300} originX={0.5} originY={0.5} />}
      <GlowPulse glowColor="#00d4ff" intensity={isActive ? 0.6 : 0} speed={2.5} borderRadius="0.75rem" className={isActive ? '' : ''}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={"p2p-my-challenge-row flex items-center gap-4 p-4 rounded-xl transition-all duration-300 " + (isWinner ? 'challenge-card-win' : isActive ? '' : '')}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.color}20`,
        }}
      >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cfg.color}15` }}>
          <StatusIcon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${cfg.color}15`, color: cfg.color }}>
            {isDuel ? '1v1' : `Grupo (${(challenge.participants || []).length}p)`}
          </span>
          <span className="text-xs text-zinc-600">{challenge.championship_name}</span>
        </div>
        <div className="text-sm font-bold text-white truncate">{challenge.match_label}</div>
        {isDuel && challenge.opponent_display_name && (
          <div className="text-xs text-zinc-500 mt-0.5">vs {challenge.opponent_display_name}</div>
        )}
      </div>

      {/* Score (for duels) */}
      {isDuel && challenge.status === 'active' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)' }}>
          <span className="text-sm font-black text-[#00d4ff]">{challenge.creator_score}</span>
          <span className="text-xs text-zinc-600">-</span>
          <span className="text-sm font-black text-[#7b2ff7]">{challenge.opponent_score}</span>
        </div>
      )}

      {/* Wager Result */}
      <div className="text-right flex-shrink-0">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
          {isWinner ? 'Ganhaste' : isDraw ? 'Devolvido' : 'Perdeste'}
        </div>
        <div className={"text-sm font-black " + (isWinner ? 'text-[#2ea043]' : isDraw ? 'text-[#fbbf24]' : 'text-[#ff4655]')}>
          {isWinner ? `+${challenge.prize_pool - challenge.platform_fee}` : isDraw ? challenge.wager_amount : `-${challenge.wager_amount}`}
        </div>
      </div>
      </motion.div>
      </GlowPulse>
    </div>
  );
}

// ============================================================
// MY DUEL STATS CARD
// ============================================================

function MyDuelStatsCard({ stats }: { stats: P2PDuelStats }) {
  const statItems = [
    { icon: Swords, label: 'Total', value: stats.total_duels, color: '#00d4ff' },
    { icon: Trophy, label: 'Vitorias', value: stats.duels_won, color: '#2ea043' },
    { icon: XCircle, label: 'Derrotas', value: stats.duels_lost, color: '#ff4655' },
    { icon: Flame, label: 'Streak', value: stats.current_streak, color: '#f97316' },
    { icon: TrendingUp, label: 'Win Rate', value: `${stats.win_rate}%`, color: '#7b2ff7' },
    { icon: Coins, label: 'Lucro Total', value: (stats.total_profit >= 0 ? '+' : '') + stats.total_profit, color: stats.total_profit >= 0 ? '#2ea043' : '#ff4655' },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(160deg, rgba(15,15,25,0.95), rgba(10,10,18,0.98))',
        border: '1px solid rgba(0,212,255,0.1)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-4 h-4 text-[#fbbf24]" />
        <span className="text-sm font-bold text-white">As Tuas Estatisticas P2P</span>
        <div className="ml-auto">
          <StreakFire streak={stats.current_streak} />
          <span className="text-xs font-bold text-[#f97316] ml-1">{stats.current_streak}x streak</span>
        </div>
      </div>

      {/* Win Rate Highlight */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={stats.win_rate >= 60 ? '#2ea043' : stats.win_rate >= 40 ? '#fbbf24' : '#ff4655'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(stats.win_rate / 100) * 213.6} 213.6`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-white">{stats.win_rate}%</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Taxa de vitoria</div>
          <div className="text-2xl font-black text-white">{stats.duels_won}<span className="text-zinc-600 text-base font-normal">/{stats.total_duels}</span></div>
          <div className="text-xs text-zinc-600 mt-0.5">Melhor streak: {stats.best_streak} vitorias</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="text-center p-2.5 rounded-xl" style={{ background: `${item.color}06`, border: `1px solid ${item.color}12` }}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: item.color }} />
              <div className="text-sm font-black text-white">{item.value}</div>
              <div className="text-[10px] text-zinc-600">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// P2P RANKING TABLE
// ============================================================

function P2PRankingTable({ duelers }: { duelers: P2PDuelStats[] }) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#71717a';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4" />;
    if (rank === 2) return <Star className="w-4 h-4" />;
    if (rank === 3) return <Star className="w-4 h-4" />;
    return <span className="text-xs font-bold">#{rank}</span>;
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(15,15,25,0.95), rgba(10,10,18,0.98))',
        border: '1px solid rgba(251,191,36,0.1)',
      }}
    >
      <div className="flex items-center gap-2 p-5 pb-3">
        <Trophy className="w-4 h-4 text-[#fbbf24]" />
        <span className="text-sm font-bold text-white">Melhores Duelistas</span>
        <span className="text-[10px] text-zinc-600 ml-auto">Baseado em win rate + volume</span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider border-b border-white/5">
        <div className="col-span-1">#</div>
        <div className="col-span-3">Jogador</div>
        <div className="col-span-2 text-center">Duelos</div>
        <div className="col-span-2 text-center">Win Rate</div>
        <div className="col-span-2 text-center">Streak</div>
        <div className="col-span-2 text-right">Lucro</div>
      </div>

      {/* Rows */}
      {duelers.map((d, i) => {
        const rank = i + 1;
        const color = getRankColor(rank);
        return (
          <motion.div
            key={d.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
          >
            <div className="col-span-1" style={{ color }}>{getRankIcon(rank)}</div>
            <div className="col-span-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: getAvatarColor(`user${rank}`) }}>
                {getInitials(`Duelist${rank}`)}
              </div>
              <span className="text-xs font-bold text-white truncate">Duelist #{rank}</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs font-bold text-white">{d.duels_won}</span>
              <span className="text-[10px] text-zinc-600">/{d.total_duels}</span>
            </div>
            <div className="col-span-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: `${d.win_rate >= 60 ? '#2ea043' : d.win_rate >= 40 ? '#fbbf24' : '#ff4655'}15` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.win_rate >= 60 ? '#2ea043' : d.win_rate >= 40 ? '#fbbf24' : '#ff4655' }} />
                <span className="text-xs font-bold" style={{ color: d.win_rate >= 60 ? '#2ea043' : d.win_rate >= 40 ? '#fbbf24' : '#ff4655' }}>{d.win_rate}%</span>
              </div>
            </div>
            <div className="col-span-2 text-center">
              {d.current_streak > 0 ? (
                <div className="flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-[#f97316]" />
                  <span className="text-xs font-bold text-[#f97316]">{d.current_streak}</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>
            <div className={"col-span-2 text-right text-xs font-bold " + (d.total_profit >= 0 ? 'text-[#2ea043]' : 'text-[#ff4655]')}>
              {d.total_profit >= 0 ? '+' : ''}{d.total_profit.toLocaleString()}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================

function HowItWorks() {
  const steps = [
    {
      icon: Plus,
      title: 'Crias o Desafio',
      description: 'Escolhes o jogo, a tua previsao e o valor da aposta. As tuas moedas ficam em escrow seguro.',
      color: '#00d4ff',
    },
    {
      icon: UserCheck,
      title: 'Oponente Aceita',
      description: 'O teu oponente aceita o desafio e deposita a mesma quantia. O prize pool e formado.',
      color: '#7b2ff7',
    },
    {
      icon: Target,
      title: 'Esperam o Resultado',
      description: 'Quando o jogo acabar, o resultado e verificado automaticamente contra os dados oficiais.',
      color: '#fbbf24',
    },
    {
      icon: Trophy,
      title: 'Vencedor Leva Tudo',
      description: 'Quem acertou a previsao ganha o prize pool (menos 5% taxa da plataforma). Moeda virtual!',
      color: '#2ea043',
    },
  ];

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(160deg, rgba(15,15,25,0.9), rgba(10,10,18,0.95))',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#fbbf24]" />
        Como Funcionam os Duelos P2P
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 z-10" />
              )}
              <div className="p-4 rounded-xl" style={{ background: `${step.color}05`, border: `1px solid ${step.color}10` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${step.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: step.color }} />
                  </div>
                  <span className="text-xs font-bold text-zinc-500">PASSO {i + 1}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1">{step.title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CREATE P2P DIALOG
// ============================================================

function CreateP2PDialog({
  challengeType, setChallengeType,
  opponentUsername, setOpponentUsername,
  matchLabel, setMatchLabel,
  championshipName, setChampionshipName,
  wagerAmount, setWagerAmount,
  customWager, setCustomWager,
  prediction, setPrediction,
  format, setFormat,
  expiresIn, setExpiresIn,
  isPublic, setIsPublic,
  trashTalk, setTrashTalk,
  creating, onClose, onSubmit,
}: {
  challengeType: P2PChallengeType; setChallengeType: (t: P2PChallengeType) => void;
  opponentUsername: string; setOpponentUsername: (s: string) => void;
  matchLabel: string; setMatchLabel: (s: string) => void;
  championshipName: string; setChampionshipName: (s: string) => void;
  wagerAmount: number; setWagerAmount: (n: number) => void;
  customWager: string; setCustomWager: (s: string) => void;
  prediction: string; setPrediction: (s: string) => void;
  format: P2PChallengeFormat; setFormat: (f: P2PChallengeFormat) => void;
  expiresIn: number; setExpiresIn: (n: number) => void;
  isPublic: boolean; setIsPublic: (b: boolean) => void;
  trashTalk: string; setTrashTalk: (s: string) => void;
  creating: boolean; onClose: () => void; onSubmit: () => void;
}) {
  const effectiveWager = customWager ? parseInt(customWager) || 0 : wagerAmount;
  const potentialPrize = challengeType === 'duel'
    ? effectiveWager * 2 - Math.floor(effectiveWager * 2 * 0.05)
    : effectiveWager * 4 - Math.floor(effectiveWager * 4 * 0.05);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: 'linear-gradient(160deg, #12121a, #0a0a12)',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 0 60px rgba(0,212,255,0.08), 0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#00d4ff]" />
            <span className="text-lg font-black text-white">Criar Desafio</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Challenge Type Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Tipo de Desafio</label>
            <div className="grid grid-cols-2 gap-2">
              {([['duel', 'Duelo 1v1', Swords, '#00d4ff'], ['group', 'Grupo (2-8)', Users, '#7b2ff7']] as const).map(([type, label, Icon, color]) => (
                <button
                  key={type}
                  onClick={() => { setChallengeType(type); sfx.toggleOn(); haptics.light(); }}
                  onMouseEnter={() => sfx.buttonHover()}
                  className={"flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all " + (challengeType === type ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
                  style={challengeType === type ? {
                    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 20px ${color}15`,
                  } : {
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: challengeType === type ? color : undefined }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Opponent (for duels) */}
          {challengeType === 'duel' && (
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Oponente (username)</label>
              <input
                type="text"
                value={opponentUsername}
                onChange={(e) => setOpponentUsername(e.target.value)}
                placeholder="Ex: QueenSlayer"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#00d4ff]/30"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          )}

          {/* Match Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Jogo / Evento</label>
              <input
                type="text"
                value={matchLabel}
                onChange={(e) => setMatchLabel(e.target.value)}
                placeholder="Ex: Alpha vs Omega"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#00d4ff]/30"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Campeonato</label>
              <input
                type="text"
                value={championshipName}
                onChange={(e) => setChampionshipName(e.target.value)}
                placeholder="Ex: Liga MZ Pro"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#00d4ff]/30"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>

          {/* Prediction */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">A Tua Previsao</label>
            <input
              type="text"
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              placeholder="Ex: Alpha vence 2-0"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#00d4ff]/30"
              style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)' }}
            />
          </div>

          {/* Wager Amount */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Valor da Aposta (moedas virtuais)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {P2P_WAGER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setWagerAmount(preset); setCustomWager(''); sfx.wagerPreset(); haptics.light(); }}
                  onMouseEnter={() => sfx.buttonHover()}
                  className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (wagerAmount === preset && !customWager ? 'text-black bg-[#fbbf24]' : 'text-zinc-400 hover:text-white')}
                  style={wagerAmount === preset && !customWager ? {} : { border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={customWager}
              onChange={(e) => setCustomWager(e.target.value)}
              placeholder="Valor personalizado..."
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#fbbf24]/30"
              style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.12)' }}
            />
          </div>

          {/* Format (duels only) */}
          {challengeType === 'duel' && (
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Formato</label>
              <div className="grid grid-cols-2 gap-2">
                {([['single_match', 'Jogo Unico'], ['best_of_3', 'Melhor de 3'], ['best_of_5', 'Melhor de 5'], ['best_of_7', 'Melhor de 7']] as const).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => { setFormat(f); sfx.toggleOn(); haptics.light(); }}
                    onMouseEnter={() => sfx.buttonHover()}
                    className={"px-3 py-2 rounded-lg text-xs font-semibold transition-all " + (format === f ? 'text-white' : 'text-zinc-500')}
                    style={format === f ? {
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.3)',
                    } : {
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expires In */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Expira em</label>
            <div className="flex gap-2">
              {[6, 12, 24, 48, 72].map((h) => (
                <button
                  key={h}
                  onClick={() => { setExpiresIn(h); sfx.toggleOn(); haptics.light(); }}
                  onMouseEnter={() => sfx.buttonHover()}
                  className={"flex-1 py-2 rounded-lg text-xs font-semibold transition-all " + (expiresIn === h ? 'text-white' : 'text-zinc-500')}
                  style={expiresIn === h ? {
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                  } : {
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {h < 24 ? `${h}h` : `${h / 24}d`}
                </button>
              ))}
            </div>
          </div>

          {/* Trash Talk */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-[#ff4655]" />
              Trash Talk (opcional)
            </label>
            <textarea
              value={trashTalk}
              onChange={(e) => setTrashTalk(e.target.value)}
              placeholder="Deixa a tua marca..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-[#ff4655]/30 resize-none"
              style={{ background: 'rgba(255,70,85,0.03)', border: '1px solid rgba(255,70,85,0.12)' }}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div className="text-sm font-semibold text-white">Desafio Publico</div>
              <div className="text-xs text-zinc-600">Qualquer pessoa pode aceitar via codigo</div>
            </div>
            <button
              onClick={() => { setIsPublic(!isPublic); sfx.toggleOn(); haptics.light(); }}
              className={"w-11 h-6 rounded-full relative transition-all duration-300 " + (isPublic ? 'bg-[#00d4ff]' : 'bg-zinc-700')}
            >
              <div className={"absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 " + (isPublic ? 'left-6' : 'left-1')} />
            </button>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Aposta</span>
              <span className="text-sm font-bold text-[#fbbf24]">{effectiveWager} moedas</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Taxa plataforma (5%)</span>
              <span className="text-sm font-bold text-zinc-500">-{Math.floor(effectiveWager * 2 * 0.05)} moedas</span>
            </div>
            <div className="h-px bg-white/5 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400">Prize Pool Estimado</span>
              <span className="text-lg font-black text-[#2ea043]">~{potentialPrize}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={creating || effectiveWager <= 0 || !prediction || !matchLabel}
            onMouseEnter={() => { if (!creating) sfx.buttonHover(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-black bg-[#00d4ff] hover:bg-[#00d4ff]/90 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ boxShadow: '0 4px 25px rgba(0,212,255,0.25)' }}
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                A criar desafio...
              </>
            ) : (
              <>
                <Swords className="w-4 h-4" />
                {challengeType === 'duel' ? 'LANCAR DUELO' : 'CRIAR DESAFIO DE GRUPO'}
              </>
            )}
          </button>

          {/* Fair Play Notice */}
          <div className="flex items-center gap-2 text-center justify-center">
            <Shield className="w-3.5 h-3.5 text-[#00d4ff]/50" />
            <span className="text-[10px] text-zinc-600">Moeda virtual • Sem dinheiro real • Jogo responsavel</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// CHALLENGE DETAIL MODAL
// ============================================================

function ChallengeDetailModal({ challenge, onClose, onCopyCode, copiedCode }: {
  challenge: P2PChallenge;
  onClose: () => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
}) {
  const isGroup = challenge.challenge_type === 'group';
  const participants = (challenge.participants || []) as unknown as P2PParticipant[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-2xl"
        style={{
          background: 'linear-gradient(160deg, #12121a, #0a0a12)',
          border: '1px solid rgba(0,212,255,0.15)',
          boxShadow: '0 0 60px rgba(0,212,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <span className="text-sm font-bold text-white">Detalhes do Desafio</span>
          <button onClick={() => { onClose(); sfx.modalClose(); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type Badge + Status */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: isGroup ? 'rgba(123,47,247,0.1)' : 'rgba(0,212,255,0.1)', color: isGroup ? '#7b2ff7' : '#00d4ff' }}>
              {P2P_CHALLENGE_TYPE_LABELS[challenge.challenge_type]}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#a1a1aa' }}>
              {P2P_CHALLENGE_STATUS_LABELS[challenge.status]}
            </span>
            {challenge.invite_code && (
              <button
                onClick={() => onCopyCode(challenge.invite_code!)}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-zinc-500 hover:text-white transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {copiedCode === challenge.invite_code ? <CheckCircle className="w-3 h-3 text-[#2ea043]" /> : <Copy className="w-3 h-3" />}
                {challenge.invite_code}
              </button>
            )}
          </div>

          {/* Match Info */}
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-xs text-zinc-600">{challenge.championship_name}</div>
            <div className="text-base font-bold text-white mt-0.5">{challenge.match_label}</div>
            <div className="text-xs text-zinc-500 mt-1">{P2P_FORMAT_LABELS[challenge.format]} • {challenge.market_type}</div>
          </div>

          {/* For Duels: VS Display */}
          {!isGroup && (
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-lg font-black text-white mb-2" style={{ background: getAvatarColor(challenge.creator_display_name) }}>
                  {getInitials(challenge.creator_display_name)}
                </div>
                <div className="text-sm font-bold text-white">{challenge.creator_display_name}</div>
                {challenge.creator_prediction && (
                  <div className="text-xs text-[#00d4ff]/70 mt-0.5">"{challenge.creator_prediction}"</div>
                )}
                {challenge.status === 'active' && (
                  <div className="mt-2 text-2xl font-black text-white">{challenge.creator_score}</div>
                )}
              </div>
              <div className="p2p-vs-badge w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-white relative z-10">VS</span>
              </div>
              <div className="flex-1 text-center">
                {challenge.opponent_id ? (
                  <>
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-lg font-black text-white mb-2" style={{ background: getAvatarColor(challenge.opponent_display_name || 'Opponent') }}>
                      {getInitials(challenge.opponent_display_name || 'Opponent')}
                    </div>
                    <div className="text-sm font-bold text-white">{challenge.opponent_display_name}</div>
                    {challenge.opponent_prediction && (
                      <div className="text-xs text-[#7b2ff7]/70 mt-0.5">"{challenge.opponent_prediction}"</div>
                    )}
                    {challenge.status === 'active' && (
                      <div className="mt-2 text-2xl font-black text-white">{challenge.opponent_score}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-2" style={{ border: '2px dashed rgba(255,255,255,0.15)' }}>
                      <Plus className="w-6 h-6 text-zinc-600" />
                    </div>
                    <div className="text-sm font-semibold text-zinc-600">A espera...</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* For Groups: Participants List */}
          {isGroup && (
            <div>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Participantes ({participants.length}/{challenge.max_participants || 8})
              </div>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: getAvatarColor(p.display_name) }}>
                      {getInitials(p.display_name)}
                    </div>
                    <span className="text-xs font-semibold text-white flex-1">{p.display_name}</span>
                    {p.prediction && (
                      <span className="text-[10px] text-zinc-500">"{p.prediction}"</span>
                    )}
                    <Coins className="w-3 h-3 text-[#fbbf24]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prize Pool */}
          <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
            <div className="text-xs text-zinc-500">Prize Pool</div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Coins className="w-5 h-5 text-[#fbbf24]" />
              <span className="text-2xl font-black text-[#fbbf24]">{challenge.prize_pool}</span>
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">Taxa: {challenge.platform_fee} • Vencedor leva: {challenge.prize_pool - challenge.platform_fee}</div>
          </div>

          {/* Trash Talk */}
          {challenge.trash_talk && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,70,85,0.05)', border: '1px solid rgba(255,70,85,0.1)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Volume2 className="w-3 h-3 text-[#ff4655]" />
                <span className="text-[10px] font-bold text-[#ff4655] uppercase">Trash Talk</span>
              </div>
              <p className="text-sm text-zinc-400 italic">"{challenge.trash_talk}"</p>
            </div>
          )}

          {/* Action Buttons */}
          {challenge.status === 'waiting_opponent' && (
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-black bg-[#00d4ff] hover:bg-[#00d4ff]/90 transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Swords className="w-4 h-4" />
                ACEITAR DUELO
              </button>
              <button className="px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                Recusar
              </button>
            </div>
          )}

          {challenge.status === 'active' && isGroup && (
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #7b2ff7, #00d4ff)', boxShadow: '0 2px 15px rgba(123,47,247,0.3)' }}
            >
              <UserCheck className="w-4 h-4" />
              ENTRAR NESTE DESAFIO
            </button>
          )}

          {/* Spectators + Chat */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{challenge.spectator_count}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />Chat {challenge.chat_enabled ? 'On' : 'Off'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{getTimeRemaining(challenge.expires_at)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}