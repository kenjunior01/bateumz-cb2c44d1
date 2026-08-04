'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins, Gift, Trophy, Flame, Target, Clock, CheckCircle, XCircle, Wallet, History, ArrowUpRight, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  getOrCreateWallet,
  getUserBets,
  getWalletTransactions,
  placeBet,
  canClaimDailyBonus,
  claimDailyBonus,
  type Bet,
  type UserWallet,
  type WalletTransaction,
  type BetStatus,
  BET_STATUS_LABELS,
} from '@/lib/esports-advanced';
import { supabase } from '@/integrations/supabase/client';

// PredictionMarket interface for open markets
interface PredictionMarket {
  id: string;
  championship_id?: string;
  match_id?: string;
  season_match_id?: string;
  market_type: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    odds: number;
    total_wagered: number;
  }>;
  status: string;
  total_pool: number;
  total_bettors: number;
  closes_at?: string;
  created_at: string;
}

// Helper to get a mock user id (in production, this comes from auth)
function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch {
        // silent fail
      }
    }
    fetchUser();
  }, []);

  return userId;
}

// Format time ago in Portuguese
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'agora mesmo';
  if (diffMin < 60) return `ha ${diffMin} min`;
  if (diffHour < 24) return `ha ${diffHour}h`;
  if (diffDay < 7) return `ha ${diffDay}d`;
  return `ha ${Math.floor(diffDay / 7)} semanas`;
}

// Get status badge color
function getStatusColor(status: BetStatus): string {
  switch (status) {
    case 'open':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'settled':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'refunded':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-white/10 text-white border-white/20';
  }
}

// Transaction type icon and color helper
function getTransactionStyle(type: string) {
  switch (type) {
    case 'win':
    case 'won':
      return { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/15' };
    case 'bet':
    case 'wager':
      return { icon: Target, color: 'text-red-400', bgColor: 'bg-red-500/15' };
    case 'daily_bonus':
    case 'bonus':
      return { icon: Gift, color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' };
    case 'refund':
      return { icon: RefreshCw, color: 'text-blue-400', bgColor: 'bg-blue-500/15' };
    default:
      return { icon: Coins, color: 'text-gray-400', bgColor: 'bg-gray-500/15' };
  }
}

// Skeleton loader component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/10 ${className || ''}`} />
  );
}

// Glass card wrapper
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className || ''}`}>
      {children}
    </div>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="h-8 w-8 text-white/50 animate-spin" />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BettingPage() {
  const userId = useUserId();

  // Wallet state
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  // Bonus state
  const [canClaim, setCanClaim] = useState(false);
  const [canClaimLoading, setCanClaimLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Bets state
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Open markets state
  const [openMarkets, setOpenMarkets] = useState<PredictionMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  // Bet dialog state
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [selectedOption, setSelectedOption] = useState<{ id: string; label: string; odds: number } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [betError, setBetError] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const fetchWallet = useCallback(async () => {
    if (!userId) return;
    setWalletLoading(true);
    try {
      const w = await getOrCreateWallet(userId);
      setWallet(w);
    } catch (err) {
      console.error('Erro ao carregar carteira:', err);
    } finally {
      setWalletLoading(false);
    }
  }, [userId]);

  const fetchCanClaim = useCallback(async () => {
    if (!userId) return;
    setCanClaimLoading(true);
    try {
      const result = await canClaimDailyBonus(userId);
      setCanClaim(result);
    } catch (err) {
      console.error('Erro ao verificar bonus:', err);
    } finally {
      setCanClaimLoading(false);
    }
  }, [userId]);

  const fetchBets = useCallback(async () => {
    if (!userId) return;
    setBetsLoading(true);
    try {
      const bets = await getUserBets(userId, { limit: 50 });
      setUserBets(bets);
    } catch (err) {
      console.error('Erro ao carregar apostas:', err);
    } finally {
      setBetsLoading(false);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    setTransactionsLoading(true);
    try {
      const txs = await getWalletTransactions(userId, 30);
      setTransactions(txs);
    } catch (err) {
      console.error('Erro ao carregar historico:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  const fetchOpenMarkets = useCallback(async () => {
    setMarketsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('esport_prediction_markets')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        setOpenMarkets([]);
      } else {
        setOpenMarkets(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar mercados:', err);
      setOpenMarkets([]);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  // Load all data
  useEffect(() => {
    fetchWallet();
    fetchCanClaim();
    fetchBets();
    fetchTransactions();
    fetchOpenMarkets();
  }, [fetchWallet, fetchCanClaim, fetchBets, fetchTransactions, fetchOpenMarkets]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleClaimBonus = async () => {
    if (!userId || claiming || !canClaim) return;
    setClaiming(true);
    try {
      const updatedWallet = await claimDailyBonus(userId);
      setWallet(updatedWallet);
      setCanClaim(false);
      showToast('Bonus diario de 50 moedas colectado!', 'success');
      fetchTransactions();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao colectar bonus', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenBetDialog = (market: PredictionMarket, option: { id: string; label: string; odds: number }) => {
    setSelectedMarket(market);
    setSelectedOption(option);
    setBetAmount('');
    setBetError('');
  };

  const handleCloseBetDialog = () => {
    setSelectedMarket(null);
    setSelectedOption(null);
    setBetAmount('');
    setBetError('');
  };

  const handlePlaceBet = async () => {
    if (!userId || !selectedMarket || !selectedOption) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setBetError('Insira um valor valido');
      return;
    }
    if (!wallet || amount > wallet.balance) {
      setBetError('Saldo insuficiente');
      return;
    }
    if (amount < 10) {
      setBetError('Aposta minima: 10 moedas');
      return;
    }

    setBetting(true);
    setBetError('');
    try {
      await placeBet({
        user_id: userId,
        match_id: selectedMarket.match_id,
        season_match_id: selectedMarket.season_match_id,
        championship_id: selectedMarket.championship_id,
        bet_type: selectedMarket.market_type as any,
        predicted_outcome: { option_id: selectedOption.id },
        predicted_label: selectedOption.label,
        odds: selectedOption.odds,
        amount_wagered: amount,
      });
      showToast('Aposta colocada com sucesso!', 'success');
      handleCloseBetDialog();
      fetchWallet();
      fetchBets();
      fetchTransactions();
    } catch (err: any) {
      setBetError(err?.message || 'Erro ao colocar aposta');
    } finally {
      setBetting(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRefresh = () => {
    fetchWallet();
    fetchCanClaim();
    fetchBets();
    fetchTransactions();
    fetchOpenMarkets();
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const totalWagered = wallet?.total_wagered || 0;
  const totalWon = wallet?.total_won || 0;
  const profit = totalWon - totalWagered;

  const settledBets = userBets.filter(b => b.status === 'settled');
  const wonBets = settledBets.filter(b => b.is_correct);
  const winRate = settledBets.length > 0 ? Math.round((wonBets.length / settledBets.length) * 100) : 0;

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderWalletHeader = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Balance display */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              {walletLoading ? (
                <Skeleton className="h-7 w-32 mb-1" />
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">
                    {wallet?.balance.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-sm text-white/50">moedas</span>
                </div>
              )}
              <p className="text-xs text-white/40">Saldo disponivel</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleClaimBonus}
              disabled={canClaimLoading || claiming || !canClaim || !userId}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-semibold gap-2 rounded-xl shadow-lg shadow-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Bonus Diario</span>
              <span className="sm:hidden">Bonus</span>
            </Button>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="icon"
              className="rounded-xl text-white/60 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs text-white/40">Total Apostado:</span>
            <span className="text-xs font-semibold text-white">
              {walletLoading ? <Skeleton className="h-4 w-16 inline-block" /> : totalWagered.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs text-white/40">Total Ganho:</span>
            <span className="text-xs font-semibold text-white">
              {walletLoading ? <Skeleton className="h-4 w-16 inline-block" /> : totalWon.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className={`h-3.5 w-3.5 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-xs text-white/40">Lucro:</span>
            <span className={`text-xs font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {walletLoading ? (
                <Skeleton className="h-4 w-16 inline-block" />
              ) : (
                `${profit >= 0 ? '+' : ''}${profit.toLocaleString('pt-BR')}`
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs text-white/40">Win Rate:</span>
            <span className="text-xs font-semibold text-white">{winRate}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderOpenMarkets = () => {
    if (marketsLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i} className="p-5">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
            </GlassCard>
          ))}
        </div>
      );
    }

    if (openMarkets.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Flame className="h-10 w-10 text-white/20" />
          </div>
          <p className="text-white/50 text-lg font-medium mb-1">Nenhum mercado aberto no momento</p>
          <p className="text-white/30 text-sm text-center max-w-sm">
            Novos mercados de apostas serao disponibilizados em breve. Fica atento!
          </p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-4">
        {openMarkets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <GlassCard className="p-5 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{market.question}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {market.total_bettors} apostadores
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {market.total_pool.toLocaleString('pt-BR')} pool
                    </span>
                    {market.closes_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Fecha {timeAgo(market.closes_at)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Aberto
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {market.options.map((option) => {
                  const potentialPayout = parseFloat(betAmount || '0') * option.odds;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOpenBetDialog(market, option)}
                      disabled={!userId}
                      className="relative group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-3 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-medium truncate pr-2">
                          {option.label}
                        </span>
                        <span className="text-yellow-400 text-sm font-bold whitespace-nowrap">
                          {option.odds.toFixed(2)}x
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Progress
                          value={market.total_pool > 0 ? (option.total_wagered / market.total_pool) * 100 : 0}
                          className="h-1.5 bg-white/5 flex-1"
                        />
                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                          {option.total_wagered.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Zap className="h-3 w-3 text-yellow-400" />
                        <span className="text-[10px] text-yellow-400 font-medium">Apostar agora</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderMyBets = () => {
    if (betsLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </GlassCard>
          ))}
        </div>
      );
    }

    if (userBets.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Target className="h-10 w-10 text-white/20" />
          </div>
          <p className="text-white/50 text-lg font-medium mb-1">Nenhuma aposta ainda</p>
          <p className="text-white/30 text-sm text-center max-w-sm">
            Explore os mercados abertos e faca a sua primeira aposta!
          </p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {userBets.map((bet, index) => {
          const isWon = bet.status === 'settled' && bet.is_correct;
          const isLost = bet.status === 'settled' && !bet.is_correct;
          const isOpen = bet.status === 'open';

          return (
            <motion.div
              key={bet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <GlassCard className="p-4 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {isWon && <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />}
                      {isLost && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      {isOpen && <Clock className="h-4 w-4 text-yellow-400 shrink-0" />}
                      <span className="text-white text-sm font-medium truncate">
                        {bet.predicted_label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-white/40">
                        Aposta: <span className="text-white font-medium">{bet.amount_wagered.toLocaleString('pt-BR')}</span>
                      </span>
                      <span className="text-white/40">
                        Odds: <span className="text-yellow-400 font-medium">{bet.odds.toFixed(2)}x</span>
                      </span>
                      <span className="text-white/40">
                        Retorno: <span className="text-white font-medium">{bet.potential_payout.toLocaleString('pt-BR')}</span>
                      </span>
                    </div>
                    {bet.amount_won > 0 && (
                      <div className="mt-1.5 text-xs text-green-400 font-semibold">
                        +{bet.amount_won.toLocaleString('pt-BR')} moedas ganhas
                      </div>
                    )}
                    <p className="text-[10px] text-white/25 mt-1.5">
                      {timeAgo(bet.created_at)}
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] px-2 py-0.5 border ${getStatusColor(bet.status)} shrink-0`}
                  >
                    {BET_STATUS_LABELS[bet.status]}
                  </Badge>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (transactionsLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </GlassCard>
          ))}
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <History className="h-10 w-10 text-white/20" />
          </div>
          <p className="text-white/50 text-lg font-medium mb-1">Sem historico</p>
          <p className="text-white/30 text-sm text-center max-w-sm">
            As suas transaccoes aparecerao aqui assim que comecar a apostar.
          </p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {transactions.map((tx, index) => {
          const { icon: TxIcon, color, bgColor } = getTransactionStyle(tx.type);
          const isPositive = tx.amount > 0;

          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
            >
              <GlassCard className="p-3 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
                    <TxIcon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {timeAgo(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('pt-BR')}
                    </span>
                    <p className="text-[10px] text-white/25">
                      Saldo: {tx.balance_after.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderBetDialog = () => {
    if (!selectedMarket || !selectedOption) return null;

    const amount = parseFloat(betAmount) || 0;
    const potentialPayout = amount * selectedOption.odds;
    const profitAmount = potentialPayout - amount;

    return (
      <Dialog open={!!selectedMarket} onOpenChange={() => handleCloseBetDialog()}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-yellow-400" />
              Colocar Aposta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Market info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white/40 mb-1">Mercado</p>
              <p className="text-sm font-medium text-white mb-3">{selectedMarket.question}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Sua escolha:</span>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {selectedOption.label} - {selectedOption.odds.toFixed(2)}x
                </Badge>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-white/40 mb-2 block">Valor da aposta (min: 10)</label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0"
                  min={10}
                  max={wallet?.balance || 0}
                  className="bg-white/5 border-white/10 text-white text-lg font-semibold pl-10 pr-20 h-12 rounded-xl focus:border-yellow-500/50 focus:ring-yellow-500/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  {[50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBetAmount(String(preset))}
                      className="text-[10px] text-white/40 hover:text-yellow-400 bg-white/5 hover:bg-white/10 rounded-md px-1.5 py-0.5 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              {wallet && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(50, wallet.balance)))}
                    className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs"
                  >
                    Min (50)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.floor(wallet.balance / 2)))}
                    className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(wallet.balance))}
                    className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs"
                  >
                    Max
                  </Button>
                </>
              )}
            </div>

            {/* Potential payout preview */}
            {amount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50">Retorno Potencial</span>
                  <span className="text-lg font-bold text-green-400">
                    {potentialPayout.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Lucro Potencial</span>
                  <span className="text-sm font-semibold text-green-300">
                    +{profitAmount.toLocaleString('pt-BR')}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Balance info */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Saldo actual:</span>
              <span className="text-white font-medium">
                {wallet?.balance.toLocaleString('pt-BR')} moedas
              </span>
            </div>

            {/* Error message */}
            {betError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400"
              >
                {betError}
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCloseBetDialog}
                variant="ghost"
                className="flex-1 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePlaceBet}
                disabled={betting || !betAmount || parseFloat(betAmount) < 10}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
              >
                {betting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {betting ? 'Apostando...' : 'Confirmar Aposta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {renderWalletHeader()}

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="markets" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl w-full h-auto p-1 mb-6">
            <TabsTrigger
              value="markets"
              className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 py-2.5 transition-all"
            >
              <Flame className="h-4 w-4 mr-1.5" />
              Mercados Abertos
            </TabsTrigger>
            <TabsTrigger
              value="bets"
              className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 py-2.5 transition-all"
            >
              <Target className="h-4 w-4 mr-1.5" />
              Minhas Apostas
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 py-2.5 transition-all"
            >
              <History className="h-4 w-4 mr-1.5" />
              Historico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markets">
            {renderOpenMarkets()}
          </TabsContent>

          <TabsContent value="bets">
            {renderMyBets()}
          </TabsContent>

          <TabsContent value="history">
            {renderHistory()}
          </TabsContent>
        </Tabs>
      </main>

      {renderBetDialog()}

      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className={`fixed bottom-6 left-1/2 z-[100] px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-400'
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 inline mr-2" />
          ) : (
            <XCircle className="h-4 w-4 inline mr-2" />
          )}
          {toast.message}
        </motion.div>
      )}
    </div>
  );
}
