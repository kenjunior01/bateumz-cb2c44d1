'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  Gift,
  Trophy,
  Flame,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  History,
  ArrowUpRight,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  BarChart3,
} from 'lucide-react';
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

// ============================================================
// TIPOS LOCAIS
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

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
        // falha silenciosa
      }
    }
    fetchUser();
  }, []);

  return userId;
}

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

function getStatusColor(status: BetStatus): string {
  switch (status) {
    case 'open':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'settled':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'refunded':
      return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-white/10 text-white border-white/20';
  }
}

function getBetStatusLabel(bet: Bet): string {
  if (bet.status === 'settled' && bet.is_correct) return 'GANHOU';
  if (bet.status === 'settled' && !bet.is_correct) return 'PERDEU';
  return BET_STATUS_LABELS[bet.status];
}

function getBetStatusBadgeStyle(bet: Bet): string {
  if (bet.status === 'settled' && bet.is_correct) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
  if (bet.status === 'settled' && !bet.is_correct) {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
  return getStatusColor(bet.status);
}

function getTransactionStyle(type: string) {
  switch (type) {
    case 'win':
    case 'won':
      return { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' };
    case 'bet':
    case 'wager':
      return { icon: Target, color: 'text-red-400', bgColor: 'bg-red-500/15' };
    case 'daily_bonus':
    case 'bonus':
      return { icon: Gift, color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' };
    case 'refund':
      return { icon: RefreshCw, color: 'text-sky-400', bgColor: 'bg-sky-500/15' };
    default:
      return { icon: Coins, color: 'text-gray-400', bgColor: 'bg-gray-500/15' };
  }
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function SkeletonLoader({ className }: { className?: string }) {
  return <div className={"animate-pulse rounded-lg bg-emerald-950/30 " + (className || '')} />;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="h-8 w-8 text-emerald-500/50 animate-spin" />
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function BettingPage() {
  const userId = useUserId();

  // Estado da carteira
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  // Estado do bonus
  const [canClaim, setCanClaim] = useState(false);
  const [canClaimLoading, setCanClaimLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Estado das apostas
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  // Estado das transacoes
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Estado dos mercados
  const [openMarkets, setOpenMarkets] = useState<PredictionMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  // Estado do dialogo de aposta
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [selectedOption, setSelectedOption] = useState<{ id: string; label: string; odds: number } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [betError, setBetError] = useState('');

  // Estado do toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ============================================================
  // CARREGAMENTO DE DADOS
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
// VALORES COMPUTADOS
  // ============================================================

  const totalWagered = wallet?.total_wagered || 0;
  const totalWon = wallet?.total_won || 0;
  const profit = totalWon - totalWagered;

  const settledBets = userBets.filter(b => b.status === 'settled');
  const wonBets = settledBets.filter(b => b.is_correct);
  const winRate = settledBets.length > 0 ? Math.round((wonBets.length / settledBets.length) * 100) : 0;

  // ============================================================
  // CABECALHO DA CARTEIRA (STICKY)
  // ============================================================

  const renderWalletHeader = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-gradient-to-r from-black via-emerald-950 to-black backdrop-blur-xl border-b border-emerald-500/20"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Coins className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <div>
              {walletLoading ? (
                <>
                  <SkeletonLoader className="h-8 w-32 mb-1" />
                  <SkeletonLoader className="h-3 w-16" />
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {wallet?.balance.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-emerald-400/70 font-medium uppercase tracking-widest">
                    Moedas
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={handleClaimBonus}
              disabled={canClaimLoading || claiming || !canClaim || !userId}
              className="border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-semibold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm"
              variant="outline"
            >
              <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Bonus Diario</span>
              <span className="sm:hidden">Bonus</span>
            </Button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/10">
              {profit >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className={"text-xs font-bold " + (profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {profit >= 0 ? '+' : ''}{walletLoading ? '...' : profit.toLocaleString('pt-BR')}
              </span>
            </div>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="icon"
              className="rounded-lg text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ============================================================
  // MERCADOS ABERTOS
  // ============================================================

  const renderOpenMarkets = () => {
    if (marketsLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-emerald-950/20 border border-emerald-500/10">
              <CardContent className="p-4 sm:p-5">
                <SkeletonLoader className="h-5 w-3/4 mb-3" />
                <SkeletonLoader className="h-4 w-1/2 mb-4" />
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonLoader className="h-20 rounded-xl" />
                  <SkeletonLoader className="h-20 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (openMarkets.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-emerald-950/30 border border-emerald-500/10 flex items-center justify-center mb-5">
            <Flame className="h-10 w-10 text-emerald-500/30" />
          </div>
          <p className="text-white/60 text-lg font-semibold mb-2">Nenhum mercado aberto no momento</p>
          <p className="text-white/30 text-sm text-center max-w-sm leading-relaxed">
            Volta quando houver jogos ao vivo! Novos mercados de apostas serao disponibilizados em breve.
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
            <Card className="bg-emerald-950/20 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                        {market.question}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/35">
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
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0 ml-2">
                    ABERTO
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {market.options.map((option) => {
                    const prob = market.total_pool > 0
                      ? (option.total_wagered / market.total_pool) * 100
                      : 50;
                    const barColor = prob > 60
                      ? 'bg-emerald-500'
                      : prob > 35
                        ? 'bg-emerald-600'
                        : 'bg-emerald-700';

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOpenBetDialog(market, option)}
                        disabled={!userId}
                        className="relative group bg-black/30 hover:bg-emerald-950/40 border border-emerald-500/15 hover:border-emerald-500/40 rounded-xl p-3 sm:p-4 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                          <div
                            className={"absolute bottom-0 left-0 right-0 transition-all duration-300 " + barColor + "/10"}
                            style={{ height: prob + '%' }}
                          />
                        </div>

                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-xs sm:text-sm font-medium truncate pr-2">
                              {option.label}
                            </span>
                            <span className="text-emerald-400 text-sm sm:text-base font-bold whitespace-nowrap">
                              {option.odds.toFixed(2)}x
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={"h-full rounded-full transition-all duration-500 " + barColor}
                                style={{ width: Math.max(5, prob) + '%' }}
                              />
                            </div>
                            <span className="text-[10px] text-white/25 whitespace-nowrap font-medium">
                              {Math.round(prob)}%
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Zap className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-semibold tracking-wide">APOSTAR AGORA</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  // ============================================================
  // MINHAS APOSTAS
  // ============================================================

  const renderMyBets = () => {
    if (betsLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-emerald-950/20 border border-emerald-500/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <SkeletonLoader className="h-4 w-40" />
                    <SkeletonLoader className="h-3 w-28" />
                  </div>
                  <SkeletonLoader className="h-6 w-20 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (userBets.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-emerald-950/30 border border-emerald-500/10 flex items-center justify-center mb-5">
            <Target className="h-10 w-10 text-emerald-500/30" />
          </div>
          <p className="text-white/60 text-lg font-semibold mb-2">Nenhuma aposta ainda</p>
          <p className="text-white/30 text-sm text-center max-w-sm leading-relaxed">
            Explore os mercados abertos e faca a tua primeira aposta!
          </p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {userBets.map((bet, index) => {
          const isWon = bet.status === 'settled' && bet.is_correct;
          const isLost = bet.status === 'settled' && !bet.is_correct;
          const potentialWin = bet.amount_wagered * bet.odds;

          const borderClass = isWon
            ? 'border-emerald-500/50 shadow-emerald-500/10 shadow-lg'
            : isLost
              ? 'border-red-500/40'
              : 'border-emerald-500/10';

          return (
            <motion.div
              key={bet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <Card className={"bg-emerald-950/20 border hover:border-emerald-500/30 transition-all " + borderClass}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {isWon && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
                        {isLost && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                        {!isWon && !isLost && <Clock className="h-4 w-4 text-yellow-400 shrink-0" />}
                        <span className="text-white text-sm font-medium truncate">
                          {bet.predicted_label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-emerald-400 text-sm font-bold">
                          {bet.odds.toFixed(2)}x
                        </span>
                      </div>

                      {isWon && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">
                            +{bet.amount_won.toLocaleString('pt-BR')} moedas
                          </span>
                        </motion.div>
                      )}

                      {!isWon && !isLost && (
                        <div className="flex items-center gap-1 opacity-60">
                          <TrendingUp className="h-3.5 w-3.5 text-white/40" />
                          <span className="text-xs text-white/40">
                            Potencial: {potentialWin.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] text-white/20 mt-2">
                        {timeAgo(bet.created_at)}
                      </p>
                    </div>

                    <div className="text-right shrink-0 space-y-2">
                      <Badge className={"text-[10px] px-2 py-0.5 border " + getBetStatusBadgeStyle(bet)}>
                        {getBetStatusLabel(bet)}
                      </Badge>
                      <div className="text-xs text-white/40">
                        <span className="text-white/60 font-medium">
                          {bet.amount_wagered.toLocaleString('pt-BR')}
                        </span>
                        {' '}apostado
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // HISTORICO DE TRANSACOES
  // ============================================================

  const renderHistory = () => {
    if (transactionsLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-emerald-950/20 border border-emerald-500/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <SkeletonLoader className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLoader className="h-3.5 w-36" />
                    <SkeletonLoader className="h-3 w-20" />
                  </div>
                  <SkeletonLoader className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (transactions.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-4"
        >
          <div className="h-20 w-20 rounded-2xl bg-emerald-950/30 border border-emerald-500/10 flex items-center justify-center mb-5">
            <History className="h-10 w-10 text-emerald-500/30" />
          </div>
          <p className="text-white/60 text-lg font-semibold mb-2">Sem historico</p>
          <p className="text-white/30 text-sm text-center max-w-sm leading-relaxed">
            As tuas transaccoes aparecerao aqui assim que comecares a apostar.
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
              <Card className="bg-emerald-950/20 border border-emerald-500/10 hover:border-emerald-500/25 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={"h-9 w-9 rounded-lg " + bgColor + " flex items-center justify-center shrink-0"}>
                      <TxIcon className={"h-4 w-4 " + color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-[11px] text-white/25">
                        {timeAgo(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={"text-sm font-bold " + (isPositive ? 'text-emerald-400' : 'text-red-400')}>
                        {isPositive ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('pt-BR')}
                      </span>
                      <p className="text-[10px] text-white/20">
                        Saldo: {tx.balance_after.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // DIALOGO DE APOSTA
  // ============================================================

  const renderBetDialog = () => {
    if (!selectedMarket || !selectedOption) return null;

    const amount = parseFloat(betAmount) || 0;
    const potentialPayout = amount * selectedOption.odds;
    const profitAmount = potentialPayout - amount;

    return (
      <Dialog open={!!selectedMarket} onOpenChange={() => handleCloseBetDialog()}>
        <DialogContent className="bg-emerald-950/95 backdrop-blur-xl border-emerald-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-emerald-400" />
              Colocar Aposta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="bg-emerald-950/50 rounded-xl p-4 border border-emerald-500/15">
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-medium mb-1.5">Mercado</p>
              <p className="text-sm font-semibold text-white mb-3">{selectedMarket.question}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Tua escolha:</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {selectedOption.label} - {selectedOption.odds.toFixed(2)}x
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-medium mb-2 block">
                Valor da aposta (min: 10)
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500/40" />
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0"
                  min={10}
                  max={wallet?.balance || 0}
                  className="bg-black/30 border-emerald-500/20 text-white text-lg font-bold pl-10 pr-20 h-12 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  {[50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBetAmount(String(preset))}
                      className="text-[10px] text-emerald-400/50 hover:text-emerald-400 bg-emerald-950/50 hover:bg-emerald-500/15 rounded-md px-1.5 py-0.5 transition-colors border border-emerald-500/10"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {wallet && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.min(50, wallet.balance)))}
                    className="flex-1 border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs"
                  >
                    Min (50)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(Math.floor(wallet.balance / 2)))}
                    className="flex-1 border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs"
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(String(wallet.balance))}
                    className="flex-1 border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-xs"
                  >
                    Max
                  </Button>
                </>
              )}
            </div>

            {amount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50">Retorno Potencial</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {potentialPayout.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Lucro Potencial</span>
                  <span className="text-sm font-semibold text-emerald-300">
                    +{profitAmount.toLocaleString('pt-BR')}
                  </span>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Saldo actual:</span>
              <span className="text-white font-medium">
                {wallet?.balance.toLocaleString('pt-BR')} moedas
              </span>
            </div>

            {betError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400"
              >
                {betError}
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleCloseBetDialog}
                variant="ghost"
                className="flex-1 border border-emerald-500/20 text-white/60 hover:text-white hover:bg-emerald-500/10 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePlaceBet}
                disabled={betting || !betAmount || parseFloat(betAmount) < 10}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/25"
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
  // COLUNA DIREITA - ESTATISTICAS
  // ============================================================

  const renderRightColumn = () => (
    <div className="space-y-4">
      <Card className="bg-emerald-950/20 border border-emerald-500/10 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" />
            Estatisticas da Carteira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center pb-4 border-b border-emerald-500/10">
            {walletLoading ? (
              <SkeletonLoader className="h-10 w-32 mx-auto mb-1" />
            ) : (
              <p className="text-3xl font-bold text-white tracking-tight">
                {wallet?.balance.toLocaleString('pt-BR')}
              </p>
            )}
            <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-medium mt-1">
              Saldo Atual
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-xs text-white/50">Total Apostado</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {walletLoading ? '...' : totalWagered.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-xs text-white/50">Total Ganho</span>
              </div>
              <span className="text-sm font-semibold text-emerald-400">
                {walletLoading ? '...' : totalWon.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={"h-8 w-8 rounded-lg flex items-center justify-center " + (profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                  {profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <span className="text-xs text-white/50">Lucro/Prejuizo</span>
              </div>
              <span className={"text-sm font-bold " + (profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {walletLoading ? '...' : (profit >= 0 ? '+' : '') + profit.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="pt-3 border-t border-emerald-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">Taxa de Acerto</span>
                <span className={"text-sm font-bold " + (winRate >= 50 ? 'text-emerald-400' : 'text-white/70')}>
                  {winRate}%
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: winRate + '%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={"h-full rounded-full " + (winRate >= 50 ? 'bg-emerald-500' : 'bg-emerald-700')}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-white/25">
                <span>{wonBets.length} ganhas</span>
                <span>{settledBets.length} resolvidas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/25">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Dica Rapida</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Sabe que podes ganhar moedas com Bonus Diarios e Conquistas? Explora todas as formas de
                ganhar moedas e maximiza o teu saldo!
              </p>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/esports/achievements'}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Ver Conquistas
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-emerald-950/20 border border-emerald-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CircleDollarSign className="h-4 w-4" />
            Resumo Rapido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-lg p-3 text-center border border-emerald-500/5">
              <p className="text-lg font-bold text-white">{userBets.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Apostas</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center border border-emerald-500/5">
              <p className="text-lg font-bold text-emerald-400">{openMarkets.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Mercados</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center border border-emerald-500/5">
              <p className="text-lg font-bold text-white">{transactions.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Transaccoes</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center border border-emerald-500/5">
              <p className="text-lg font-bold text-emerald-400">{winRate}%</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Acerto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div className="text-white">
      {renderWalletHeader()}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="markets" className="w-full">
              <TabsList className="bg-emerald-950/30 border border-emerald-500/15 rounded-xl w-full h-auto p-1 mb-6">
                <TabsTrigger
                  value="markets"
                  className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 text-white/40 py-2.5 transition-all"
                >
                  <Flame className="h-4 w-4 mr-1.5" />
                  Mercados Abertos
                </TabsTrigger>
                <TabsTrigger
                  value="bets"
                  className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 text-white/40 py-2.5 transition-all"
                >
                  <Target className="h-4 w-4 mr-1.5" />
                  Minhas Apostas
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex-1 rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-600/20 text-white/40 py-2.5 transition-all"
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
          </div>

          <div className="hidden lg:block">
            {renderRightColumn()}
          </div>
        </div>
      </main>

      {renderBetDialog()}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={"fixed bottom-6 left-1/2 z-[100] px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-medium " +
              (toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/20 border-red-500/30 text-red-400')
            }
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4 inline mr-2" />
            ) : (
              <XCircle className="h-4 w-4 inline mr-2" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
