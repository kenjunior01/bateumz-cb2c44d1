'use client';

import { useState, useEffect, useCallback, useMemo, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, Gift, Flame, Sparkles, Star, Coins, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

const REWARDS = [5, 10, 15, 25, 40, 60, 100];
const STORAGE_KEY = 'bateu_daily_rewards';
const DAY_LABELS = ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5', 'Dia 6', 'Dia 7'];

interface RewardData {
  daysClaimed: number[];
  lastClaimDate: string | null;
  totalEarned: number;
}

function getStoredData(): RewardData {
  if (typeof window === 'undefined') {
    return { daysClaimed: [], lastClaimDate: null, totalEarned: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore parse errors
  }
  return { daysClaimed: [], lastClaimDate: null, totalEarned: 0 };
}

function saveData(data: RewardData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

export function useDailyReward() {
  const [data, setData] = useState<RewardData>(getStoredData);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const streak = useMemo(() => {
    if (data.daysClaimed.length === 0) return 0;
    const today = getTodayStr();
    if (data.lastClaimDate === today) {
      return data.daysClaimed.length;
    }
    if (data.lastClaimDate && isYesterday(data.lastClaimDate)) {
      return data.daysClaimed.length;
    }
    return 0;
  }, [data.daysClaimed, data.lastClaimDate]);

  const canClaim = useMemo(() => {
    const today = getTodayStr();
    if (data.lastClaimDate === today) return false;
    if (data.lastClaimDate && !isYesterday(data.lastClaimDate)) {
      return true;
    }
    if (!data.lastClaimDate) return true;
    return true;
  }, [data.lastClaimDate]);

  const nextReward = useMemo(() => {
    if (!canClaim) return 0;
    const currentStreak = data.lastClaimDate && isYesterday(data.lastClaimDate)
      ? data.daysClaimed.length % 7
      : 0;
    return REWARDS[currentStreak] || REWARDS[0];
  }, [canClaim, data.lastClaimDate, data.daysClaimed.length]);

  const claimReward = useCallback(() => {
    const today = getTodayStr();
    let daysClaimed = [...data.daysClaimed];
    let totalEarned = data.totalEarned;

    if (data.lastClaimDate && !isYesterday(data.lastClaimDate) && data.lastClaimDate !== today) {
      daysClaimed = [];
    }

    const dayIndex = daysClaimed.length % 7;
    const reward = REWARDS[dayIndex];
    daysClaimed.push(dayIndex + 1);
    totalEarned += reward;

    const newData = {
      daysClaimed,
      lastClaimDate: today,
      totalEarned,
    };

    setData(newData);
    saveData(newData);
  }, [data]);

  useEffect(() => {
    const stored = getStoredData();
    setData(stored);
    const today = getTodayStr();
    const canShowToday = stored.lastClaimDate !== today;
    const hasNeverClaimed = stored.lastClaimDate === null;
    if (canShowToday) {
      const timer = setTimeout(() => {
        setShowDailyModal(true);
      }, hasNeverClaimed ? 1500 : 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    canClaim,
    streak,
    lastClaimDate: data.lastClaimDate,
    claimReward,
    daysClaimed: data.daysClaimed,
    nextReward,
    totalEarned: data.totalEarned,
    showDailyModal,
    setShowDailyModal,
  };
}

function SparkleParticle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        repeatDelay: 1.2,
        ease: 'easeInOut',
      }}
    >
      <Star
        className="text-yellow-400"
        size={size}
        fill="currentColor"
      />
    </motion.div>
  );
}

function StreakFire({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <motion.div
      className="flex items-center gap-1.5"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [-5, 5, -5],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Flame className="text-orange-500" size={28} fill="currentColor" />
      </motion.div>
      <motion.span
        className="text-2xl font-black text-orange-400"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        {streak}x
      </motion.span>
    </motion.div>
  );
}

function DayCard({
  day,
  reward,
  isClaimed,
  isCurrent,
  index,
}: {
  day: number;
  reward: number;
  isClaimed: boolean;
  isCurrent: boolean;
  index: number;
}) {
  const isBonusDay = day === 7;

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 sm:w-20"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 ${
          isClaimed
            ? 'bg-emerald-500/20 border-emerald-500/60'
            : isCurrent
            ? 'border-yellow-400/80 bg-yellow-400/10'
            : 'bg-white/5 border-white/10'
        } ${isBonusDay && !isClaimed ? 'border-orange-500/60 bg-orange-500/10' : ''}`}
        whileHover={{ scale: 1.08, y: -4 }}
        animate={
          isCurrent
            ? {
                boxShadow: [
                  '0 0 8px rgba(250,204,21,0.3)',
                  '0 0 24px rgba(250,204,21,0.6)',
                  '0 0 8px rgba(250,204,21,0.3)',
                ],
              }
            : {}
        }
        transition={
          isCurrent
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        {isClaimed ? (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="text-emerald-400" size={20} strokeWidth={3} />
          </motion.div>
        ) : isCurrent ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Gift className="text-yellow-400" size={20} />
          </motion.div>
        ) : (
          <Lock className="text-white/30" size={18} />
        )}

        <span
          className={`text-xs font-bold ${
            isClaimed
              ? 'text-emerald-400'
              : isCurrent
              ? 'text-yellow-400'
              : 'text-white/40'
          }`}
        >
          {reward} MZN
        </span>

        {isBonusDay && !isClaimed && (
          <motion.div
            className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            BONUS
          </motion.div>
        )}

        {isCurrent && (
          <>
            <SparkleParticle delay={0} x={-8} y={-6} size={8} />
            <SparkleParticle delay={0.4} x={20} y={-8} size={6} />
            <SparkleParticle delay={0.8} x={6} y={22} size={7} />
          </>
        )}
      </motion.div>

      <span
        className={`text-[11px] font-semibold ${
          isClaimed
            ? 'text-emerald-400/80'
            : isCurrent
            ? 'text-yellow-400'
            : 'text-white/40'
        }`}
      >
        {DAY_LABELS[day - 1]}
      </span>
    </motion.div>
  );
}

function StreakProgressBar({ streak }: { streak: number }) {
  const progress = (streak % 7) / 7;
  const daysInCycle = streak % 7;

  return (
    <div className="w-full mt-4 mb-2">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-white/50 font-medium">Progresso do ciclo</span>
        <span className="text-xs text-yellow-400 font-bold">{daysInCycle}/7 dias</span>
      </div>
      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(var(--primary)), #fbbf24, #f59e0b)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function ClaimedOverlay({ reward, onDone }: { reward: number; onDone: () => void }) {
  useEffect(() => {
    const sideA = confetti({
      particleCount: 60,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.65 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
    });
    const sideB = confetti({
      particleCount: 60,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.65 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'],
    });
    const timer = setTimeout(onDone, 2200);
    return () => {
      timer && clearTimeout(timer);
      void sideA; void sideB;
    };
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-2xl backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          <Coins className="text-yellow-400" size={56} fill="currentColor" />
        </motion.div>
        <motion.p
          className="text-3xl font-black text-yellow-400"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          +{reward} MZN
        </motion.p>
        <motion.p
          className="text-sm text-white/70 font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Recompensa reclamada!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default function DailyRewardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}): JSX.Element {
  const { canClaim, streak, claimReward, daysClaimed, totalEarned, setShowDailyModal } = useDailyReward();
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimedReward, setClaimedReward] = useState(0);

  const currentDayInCycle = streak % 7;
  const isAllClaimed = currentDayInCycle === 0 && streak > 0;
  const nextDay = isAllClaimed ? 1 : currentDayInCycle + 1;

  const handleClaim = () => {
    const reward = REWARDS[(streak % 7)];
    claimReward();
    setClaimedReward(reward);
    setJustClaimed(true);
  };

  const handleClaimDone = () => {
    setJustClaimed(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowDailyModal(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,30,0.95), rgba(30,20,50,0.92))',
              border: '1px solid rgba(250,204,21,0.2)',
              boxShadow: '0 0 40px rgba(250,204,21,0.15), 0 0 80px rgba(250,204,21,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          >
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(250,204,21,0.3) 10%, transparent 20%, rgba(250,204,21,0.3) 30%, transparent 40%, rgba(250,204,21,0.3) 50%, transparent 60%, rgba(250,204,21,0.3) 70%, transparent 80%, rgba(250,204,21,0.3) 90%, transparent 100%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <div
              className="absolute inset-[1px] rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(30,20,50,0.95))',
              }}
            />

            <div className="relative z-10 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), #fbbf24)',
                    }}
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Gift className="text-white" size={20} />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Recompensas Diarias
                      <Sparkles className="text-yellow-400" size={16} />
                    </h2>
                    <p className="text-xs text-white/50">Entra todos os dias para ganhar!</p>
                  </div>
                </div>
                <motion.button
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                  onClick={handleClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={16} />
                </motion.button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <StreakFire streak={streak} />
                <motion.div
                  className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Coins className="text-yellow-400" size={14} />
                  <span className="text-sm font-bold text-white">{totalEarned} MZN</span>
                  <span className="text-xs text-white/40">total</span>
                </motion.div>
              </div>

              <StreakProgressBar streak={streak} />

              <div className="flex gap-2 sm:gap-3 justify-center mt-4 mb-5 overflow-x-auto px-1 py-2 scrollbar-hide">
                {REWARDS.map((reward, idx) => {
                  const dayNum = idx + 1;
                  const cycleStreak = streak % 7 || (streak > 0 ? 7 : 0);
                  const isClaimed = cycleStreak >= dayNum;
                  const isCurrent = canClaim && dayNum === nextDay;

                  return (
                    <DayCard
                      key={dayNum}
                      day={dayNum}
                      reward={reward}
                      isClaimed={isClaimed}
                      isCurrent={isCurrent}
                      index={idx}
                    />
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {canClaim ? (
                  <motion.button
                    key="claim-btn"
                    className="w-full py-3.5 rounded-xl font-bold text-base text-white relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)), #f59e0b)',
                    }}
                    onClick={handleClaim}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(250,204,21,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                    />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Zap size={18} />
                      Claim {REWARDS[streak % 7]} MZN
                    </span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="claimed-msg"
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white/50 bg-white/5 flex items-center justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Check size={16} className="text-emerald-400" />
                    Ja reclamaste hoje! Volta amanha.
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.p
                className="text-center text-[11px] text-white/30 mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Nao percas a sequencia! Recomecas do Dia 1 se falhares um dia.
              </motion.p>
            </div>

            <AnimatePresence>
              {justClaimed && (
                <ClaimedOverlay reward={claimedReward} onDone={handleClaimDone} />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
