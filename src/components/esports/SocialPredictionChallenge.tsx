'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Plus,
  Trophy,
  Medal,
  Flame,
  Clock,
  Coins,
  UserPlus,
  ChevronRight,
  Crown,
  Target,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// ── Types ──────────────────────────────────────────────────────
type ChallengeStatus = 'Em Curso' | 'Vitória' | 'Derrota' | 'Empate';

interface ActiveChallenge {
  id: string;
  challengerName: string;
  challengerAvatar: string;
  challengerInitials: string;
  opponentName: string;
  opponentAvatar: string;
  opponentInitials: string;
  match: string;
  championship: string;
  challengerScore: number;
  opponentScore: number;
  totalPredictions: number;
  status: ChallengeStatus;
  wager: number;
  timeLeft?: string;
}

interface TopChallenger {
  rank: number;
  name: string;
  avatar: string;
  initials: string;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
}

// ── Mock data ──────────────────────────────────────────────────
const mockActiveChallenges: ActiveChallenge[] = [
  {
    id: 'c1',
    challengerName: 'Lucas Oliveira',
    challengerAvatar: '',
    challengerInitials: 'LO',
    opponentName: 'Marina Costa',
    opponentAvatar: '',
    opponentInitials: 'MC',
    match: 'Palmeiras vs Flamengo',
    championship: 'Brasileirão Série A',
    challengerScore: 3,
    opponentScore: 2,
    totalPredictions: 5,
    status: 'Em Curso',
    wager: 100,
    timeLeft: '18h 32m',
  },
  {
    id: 'c2',
    challengerName: 'Pedro Santos',
    challengerAvatar: '',
    challengerInitials: 'PS',
    opponentName: 'Ana Beatriz',
    opponentAvatar: '',
    opponentInitials: 'AB',
    match: 'CBLoL Finals',
    championship: 'Campeonato Brasileiro de LoL',
    challengerScore: 4,
    opponentScore: 3,
    totalPredictions: 7,
    status: 'Vitória',
    wager: 250,
  },
  {
    id: 'c3',
    challengerName: 'Rafael Mendes',
    challengerAvatar: '',
    challengerInitials: 'RM',
    opponentName: 'Julia Ferreira',
    opponentAvatar: '',
    opponentInitials: 'JF',
    match: 'CS2 Major',
    championship: 'IEM Katowice',
    challengerScore: 1,
    opponentScore: 4,
    totalPredictions: 5,
    status: 'Derrota',
    wager: 100,
  },
  {
    id: 'c4',
    challengerName: 'Carla Dias',
    challengerAvatar: '',
    challengerInitials: 'CD',
    opponentName: 'Bruno Alves',
    opponentAvatar: '',
    opponentInitials: 'BA',
    match: 'Volley Brasil',
    championship: 'Superliga Masculina',
    challengerScore: 3,
    opponentScore: 3,
    totalPredictions: 7,
    status: 'Empate',
    wager: 500,
  },
];

const mockTopChallengers: TopChallenger[] = [
  { rank: 1, name: 'Thiago Ninja', avatar: '', initials: 'TN', wins: 47, losses: 8, winRate: 85, streak: 12 },
  { rank: 2, name: 'Fernanda GG', avatar: '', initials: 'FG', wins: 43, losses: 11, winRate: 80, streak: 7 },
  { rank: 3, name: 'Gabriel Pro', avatar: '', initials: 'GP', wins: 39, losses: 14, winRate: 74, streak: 5 },
  { rank: 4, name: 'Isabella MVP', avatar: '', initials: 'IM', wins: 35, losses: 16, winRate: 69, streak: 4 },
  { rank: 5, name: 'Diego Fury', avatar: '', initials: 'DF', wins: 31, losses: 19, winRate: 62, streak: 3 },
];

const championships = [
  'Brasileirão Série A',
  'Champions League',
  'Campeonato Brasileiro de LoL',
  'IEM Katowice — CS2',
  'Superliga Masculina — Vôlei',
  'Libertadores',
  'CBLoL Academy',
  'Valorant Champions Tour',
];

const predictionCounts = [3, 5, 7];
const wagerAmounts = [50, 100, 250, 500];
const timeLimits = ['24h', '48h', '72h'];

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: ChallengeStatus }) {
  const config: Record<ChallengeStatus, { color: string; bg: string; border: string }> = {
    'Em Curso': {
      color: '#facc15',
      bg: 'rgba(250,204,21,0.1)',
      border: 'rgba(250,204,21,0.3)',
    },
    'Vitória': {
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.1)',
      border: 'rgba(74,222,128,0.3)',
    },
    'Derrota': {
      color: '#f87171',
      bg: 'rgba(248,113,113,0.1)',
      border: 'rgba(248,113,113,0.3)',
    },
    'Empate': {
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
      border: 'rgba(148,163,184,0.3)',
    },
  };
  const c = config[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {status === 'Vitória' && <Trophy className="w-3 h-3" />}
      {status === 'Derrota' && <Target className="w-3 h-3" />}
      {status === 'Em Curso' && <Clock className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ── Rank medal ──────────────────────────────────────────────────
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return (
    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-white/40">
      {rank}
    </span>
  );
}

// ── Challenge row ──────────────────────────────────────────────
function ChallengeRow({ challenge, index }: { challenge: ActiveChallenge; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -1 }}
    >
      <Card
        className="overflow-hidden transition-shadow"
        style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(0,212,255,0.01))',
          borderColor: 'rgba(0,212,255,0.1)',
        }}
      >
        <CardContent className="p-3 sm:p-4">
          {/* Top: Match & Championship */}
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/90 truncate">{challenge.match}</p>
              <p className="text-[11px] text-white/40 truncate">{challenge.championship}</p>
            </div>
            <StatusBadge status={challenge.status} />
          </div>

          {/* VS area */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Challenger */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                <AvatarImage src={challenge.challengerAvatar} alt={challenge.challengerName} />
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.06))',
                    color: '#00d4ff',
                  }}
                >
                  {challenge.challengerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
                  {challenge.challengerName}
                </p>
                <p className="text-xs font-bold" style={{ color: '#00d4ff' }}>
                  {challenge.challengerScore}
                </p>
              </div>
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">de {challenge.totalPredictions}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black text-white/80">{challenge.challengerScore}</span>
                <span className="text-xs text-white/25">×</span>
                <span className="text-base sm:text-lg font-black text-white/80">{challenge.opponentScore}</span>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <div className="min-w-0 text-right">
                <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
                  {challenge.opponentName}
                </p>
                <p className="text-xs font-bold text-white/60">{challenge.opponentScore}</p>
              </div>
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                <AvatarImage src={challenge.opponentAvatar} alt={challenge.opponentName} />
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: 'rgba(148,163,184,0.12)',
                    color: '#94a3b8',
                  }}
                >
                  {challenge.opponentInitials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Bottom: Wager & time */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="text-[11px] text-white/40">{challenge.wager} Luck Coins</span>
            </div>
            {challenge.timeLeft && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/30" />
                <span className="text-[11px] text-white/40">{challenge.timeLeft}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Top challenger row ─────────────────────────────────────────
function TopChallengerRow({ challenger, index }: { challenger: TopChallenger; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -1 }}
    >
      <Card
        className="overflow-hidden"
        style={{
          background:
            challenger.rank <= 3
              ? 'linear-gradient(135deg, rgba(250,204,21,0.06), rgba(250,204,21,0.01))'
              : 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(0,212,255,0.01))',
          borderColor:
            challenger.rank <= 3 ? 'rgba(250,204,21,0.15)' : 'rgba(0,212,255,0.1)',
        }}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <RankMedal rank={challenger.rank} />

            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
              <AvatarImage src={challenger.avatar} alt={challenger.name} />
              <AvatarFallback
                className="text-xs font-bold"
                style={{
                  background:
                    challenger.rank <= 3
                      ? 'linear-gradient(135deg, rgba(250,204,21,0.2), rgba(250,204,21,0.06))'
                      : 'rgba(0,212,255,0.1)',
                  color: challenger.rank <= 3 ? '#facc15' : '#00d4ff',
                }}
              >
                {challenger.initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/90 truncate">{challenger.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-emerald-400">
                  {challenger.wins}V
                </span>
                <span className="text-[11px] text-white/20">/</span>
                <span className="text-[11px] text-red-400">
                  {challenger.losses}D
                </span>
                {challenger.streak > 3 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                    <Flame className="w-3 h-3" />
                    {challenger.streak}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-bold" style={{ color: '#00d4ff' }}>
                {challenger.winRate}%
              </p>
              <p className="text-[10px] text-white/30">win rate</p>
            </div>
          </div>

          {/* Win rate bar */}
          <div className="mt-3">
            <Progress
              value={challenger.winRate}
              className="h-1.5"
              style={{
                // Override indicator color via inline style hack
              } as React.CSSProperties}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Create Challenge Dialog ────────────────────────────────────
function CreateChallengeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [selectedPredictions, setSelectedPredictions] = useState('');
  const [selectedWager, setSelectedWager] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const canSubmit = selectedChampionship && selectedPredictions && selectedWager && selectedTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: '#111827',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Swords className="w-5 h-5" style={{ color: '#00d4ff' }} />
            Desafia um Amigo
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Cria um desafio de previsões e compete com os teus amigos por Luck Coins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Championship */}
          <div className="space-y-2">
            <Label className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Campeonato / Jogo
            </Label>
            <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
              <SelectTrigger
                className="w-full"
                style={{
                  background: 'rgba(0,212,255,0.04)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  color: '#fff',
                }}
              >
                <SelectValue placeholder="Seleciona um campeonato" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: '#1f2937',
                  border: '1px solid rgba(0,212,255,0.2)',
                }}
              >
                {championships.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of predictions */}
          <div className="space-y-2">
            <Label className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Número de Previsões
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {predictionCounts.map((count) => (
                <motion.button
                  key={count}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPredictions(String(count))}
                  className="py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background:
                      selectedPredictions === String(count)
                        ? 'linear-gradient(135deg, #0891b2, #06b6d4)'
                        : 'rgba(0,212,255,0.05)',
                    border: `1px solid ${
                      selectedPredictions === String(count) ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.12)'
                    }`,
                    color: selectedPredictions === String(count) ? '#fff' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {count}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wager */}
          <div className="space-y-2">
            <Label className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Aposta (Luck Coins)
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {wagerAmounts.map((amount) => (
                <motion.button
                  key={amount}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedWager(String(amount))}
                  className="py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                  style={{
                    background:
                      selectedWager === String(amount)
                        ? 'linear-gradient(135deg, rgba(250,204,21,0.25), rgba(250,204,21,0.1))'
                        : 'rgba(250,204,21,0.04)',
                    border: `1px solid ${
                      selectedWager === String(amount) ? 'rgba(250,204,21,0.5)' : 'rgba(250,204,21,0.12)'
                    }`,
                    color: selectedWager === String(amount) ? '#facc15' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <Coins className="w-3 h-3" />
                  {amount}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time limit */}
          <div className="space-y-2">
            <Label className="text-xs text-white/50 uppercase tracking-wider font-medium">
              Limite de Tempo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {timeLimits.map((t) => (
                <motion.button
                  key={t}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedTime(t)}
                  className="py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                  style={{
                    background:
                      selectedTime === t
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.08))'
                        : 'rgba(0,212,255,0.04)',
                    border: `1px solid ${
                      selectedTime === t ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.12)'
                    }`,
                    color: selectedTime === t ? '#00d4ff' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <Clock className="w-3 h-3" />
                  {t}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Cancelar
          </Button>
          <motion.div whileHover={{ scale: canSubmit ? 1.02 : 1 }} whileTap={{ scale: canSubmit ? 0.98 : 1 }}>
            <Button
              disabled={!canSubmit}
              className="flex-1 sm:flex-none"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #0891b2, #06b6d4)'
                  : 'rgba(0,212,255,0.1)',
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.3)',
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Desafio
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function SocialPredictionChallenge() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="relative w-full" aria-label="Desafios Sociais de Previsão">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #0a0e1a 0%, #0d1321 50%, #111827 100%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Swords className="w-5 h-5" style={{ color: '#00d4ff' }} />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Desafios Sociais
              </h2>
            </div>
            <p className="text-sm text-white/40">
              Desafia os teus amigos e vê quem é o melhor previsor.
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                color: '#fff',
                boxShadow: '0 0 16px rgba(0,212,255,0.2)',
              }}
            >
              <Plus className="w-4 h-4" />
              Desafia um Amigo
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList
            className="mb-5 w-full sm:w-auto"
            style={{
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.1)',
            }}
          >
            <TabsTrigger
              value="active"
              className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-none"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Desafios Activos
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] text-[10px] px-1.5"
                style={{
                  background: 'rgba(0,212,255,0.15)',
                  color: '#00d4ff',
                }}
              >
                {mockActiveChallenges.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:text-white data-[state=active]:shadow-none"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Crown className="w-3.5 h-3.5" />
              Melhores Desafiadores
            </TabsTrigger>
          </TabsList>

          {/* Active Challenges Tab */}
          <TabsContent value="active">
            <div className="space-y-3 sm:space-y-4">
              <AnimatePresence>
                {mockActiveChallenges.map((challenge, idx) => (
                  <ChallengeRow key={challenge.id} challenge={challenge} index={idx} />
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card
                className="mb-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,212,255,0.02))',
                  borderColor: 'rgba(0,212,255,0.12)',
                }}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Melhores Desafiadores
                    </h3>
                  </div>
                  <p className="text-xs text-white/40 ml-8">
                    Baseado em desafios concluídos este mês
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3 sm:space-y-4">
                {mockTopChallengers.map((challenger, idx) => (
                  <TopChallengerRow key={challenger.rank} challenger={challenger} index={idx} />
                ))}
              </div>

              {/* View full leaderboard */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="flex justify-center mt-6"
              >
                <Button
                  variant="outline"
                  className="rounded-full text-xs sm:text-sm flex items-center gap-1.5"
                  style={{
                    borderColor: 'rgba(0,212,255,0.2)',
                    color: '#00d4ff',
                  }}
                >
                  Ver Ranking Completo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* ── Dialog ── */}
        <CreateChallengeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </section>
  );
}
