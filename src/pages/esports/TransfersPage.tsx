'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ArrowLeftRight,
  UserPlus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Coins,
  Users,
  Shield,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTransfers,
  getOpenTransfers,
  requestTransfer,
  respondToTransfer,
  type Transfer,
  type TransferStatus,
  TRANSFER_STATUS_LABELS,
} from '@/lib/esports-advanced';
import { getTeams, type EsportTeam } from '@/lib/esports';

// ============================================================
// TYPES & HELPERS
// ============================================================

type FilterTab = 'all' | TransferStatus;

const STATUS_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'requested', label: 'Pendentes' },
  { value: 'accepted', label: 'Aceites' },
  { value: 'rejected', label: 'Rejeitadas' },
];

const STATUS_COLORS: Record<TransferStatus, string> = {
  requested: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const STATUS_DOT_COLORS: Record<TransferStatus, string> = {
  requested: 'bg-yellow-400',
  accepted: 'bg-green-400',
  rejected: 'bg-red-400',
  cancelled: 'bg-zinc-400',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCoins(amount: number): string {
  return new Intl.NumberFormat('pt-PT').format(amount);
}

function truncateText(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen) + '...';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Mock team names mapped by id for display
const MOCK_TEAMS: Record<string, { name: string; logo?: string }> = {
  team_alpha: { name: 'Alpha Esports', logo: undefined },
  team_bravo: { name: 'Bravo Gaming', logo: undefined },
  team_charlie: { name: 'Charlie Squad', logo: undefined },
};

const MOCK_PLAYERS: Record<string, { username: string; avatar?: string }> = {
  player_1: { username: 'ShadowHunter', avatar: undefined },
  player_2: { username: 'NightFury', avatar: undefined },
  player_3: { username: 'StormBreaker', avatar: undefined },
};

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// ============================================================
// LOADING SKELETONS
// ============================================================

function TransferCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 bg-white/10" />
            <Skeleton className="h-3 w-24 bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-4 w-28 bg-white/10" />
        <Skeleton className="h-4 w-8 bg-white/10" />
        <Skeleton className="h-4 w-28 bg-white/10" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="h-4 w-20 bg-white/10" />
      </div>
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
      <Skeleton className="h-4 w-28 bg-white/10 mb-3" />
      <Skeleton className="h-8 w-16 bg-white/10" />
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [teams, setTeams] = useState<EsportTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dialog form state
  const [formPlayerSearch, setFormPlayerSearch] = useState('');
  const [formSelectedTeam, setFormSelectedTeam] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formMessage, setFormMessage] = useState('');

  // Current user mock (in production, comes from auth)
  const currentUserId = 'mock_user_001';
  const isTeamOwner = true; // Mock: user is a team owner

  // Fetch transfers and teams on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [transferData, teamData] = await Promise.all([
          getTransfers({ limit: 50 }),
          getTeams({ limit: 50 }),
        ]);
        setTransfers(transferData);
        setTeams(teamData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    let result = transfers;

    if (activeTab !== 'all') {
      result = result.filter(t => t.status === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        const playerName = MOCK_PLAYERS[t.player_user_id]?.username?.toLowerCase() || t.player_user_id.toLowerCase();
        const fromTeam = MOCK_TEAMS[t.from_team_id || '']?.name?.toLowerCase() || '';
        const toTeam = MOCK_TEAMS[t.to_team_id || '']?.name?.toLowerCase() || '';
        const msg = (t.message || '').toLowerCase();
        return playerName.includes(q) || fromTeam.includes(q) || toTeam.includes(q) || msg.includes(q);
      });
    }

    return result;
  }, [transfers, activeTab, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const pending = transfers.filter(t => t.status === 'requested').length;
    const completed = transfers.filter(t => t.status === 'accepted').length;
    const totalResolved = transfers.filter(t => t.status === 'accepted' || t.status === 'rejected').length;
    const acceptRate = totalResolved > 0 ? Math.round((completed / totalResolved) * 100) : 0;
    return { pending, completed, acceptRate };
  }, [transfers]);

  // Handle respond to transfer
  const handleRespond = useCallback(async (transferId: string, accept: boolean) => {
    try {
      await respondToTransfer(transferId, {
        status: accept ? 'accepted' : 'rejected',
        responded_by: currentUserId,
        response_message: accept ? 'Transferencia aceite.' : 'Transferencia rejeitada.',
      });
      setTransfers(prev =>
        prev.map(t =>
          t.id === transferId
            ? { ...t, status: accept ? 'accepted' as TransferStatus : 'rejected' as TransferStatus }
            : t
        )
      );
    } catch (err) {
      console.error('Erro ao responder transferencia:', err);
    }
  }, [currentUserId]);

  // Handle submit new transfer request
  const handleSubmitTransfer = useCallback(async () => {
    if (!formSelectedTeam) return;
    setSubmitting(true);
    try {
      const newTransfer = await requestTransfer({
        player_user_id: formPlayerSearch || 'unknown_player',
        to_team_id: formSelectedTeam,
        transfer_fee: parseInt(formFee) || 0,
        message: formMessage || undefined,
        requested_by: currentUserId,
      });
      setTransfers(prev => [newTransfer, ...prev]);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao solicitar transferencia:', err);
    } finally {
      setSubmitting(false);
    }
  }, [formPlayerSearch, formSelectedTeam, formFee, formMessage, currentUserId]);

  const resetForm = () => {
    setFormPlayerSearch('');
    setFormSelectedTeam('');
    setFormFee('');
    setFormMessage('');
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-12 md:py-16 px-4">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-purple-400" />
              <span className="text-sm text-zinc-400 uppercase tracking-widest font-medium">eSports</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-[shimmer_3s_ease-in-out_infinite]">
              MERCADO DE TRANSFERENCIAS
            </span>
          </motion.h1>

          <motion.p
            className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Negocia jogadores entre equipas
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/25"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Solicitar Transferencia
            </Button>
          </motion.div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
        {/* FILTER BAR */}
        <motion.section
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6"
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.value
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.value && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Pesquisar transferencias..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:ring-purple-500/30 focus:border-purple-500/40"
              />
            </div>
          </div>
        </motion.section>

        {/* STATS CARDS */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-zinc-400 font-medium">Transferencias Pendentes</span>
                </div>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="text-sm text-zinc-400 font-medium">Total Completadas</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-zinc-400 font-medium">Taxa de Aceite</span>
                </div>
                <p className="text-3xl font-bold text-purple-400">{stats.acceptRate}%</p>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* TRANSFER LISTINGS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-400" />
              Transferencias
              {!loading && (
                <span className="text-sm text-zinc-500 font-normal">({filteredTransfers.length})</span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <TransferCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredTransfers.length === 0 ? (
            <motion.div
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
              variants={scaleInVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <ArrowLeftRight className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-400 mb-1">
                Nenhuma transferencia encontrada
              </h3>
              <p className="text-sm text-zinc-600 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tenta ajustar os filtros ou o termo de pesquisa.'
                  : 'Solicita a tua primeira transferencia utilizando o botao acima.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {filteredTransfers.map(transfer => {
                  const playerInfo = MOCK_PLAYERS[transfer.player_user_id] || {
                    username: transfer.player_user_id,
                  };
                  const fromTeam = MOCK_TEAMS[transfer.from_team_id || ''] || {
                    name: transfer.from_team_id || 'Sem equipa',
                  };
                  const toTeam = MOCK_TEAMS[transfer.to_team_id || ''] || {
                    name: transfer.to_team_id || 'Equipa destino',
                  };

                  return (
                    <motion.div
                      key={transfer.id}
                      layout
                      variants={itemVariants}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    >
                      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
                        <CardContent className="p-4 md:p-6">
                          {/* Top row: player info + status badge */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 ring-2 ring-white/10">
                                <AvatarImage src={playerInfo.avatar} alt={playerInfo.username} />
                                <AvatarFallback className="bg-purple-600/30 text-purple-300 text-sm font-semibold">
                                  {getInitials(playerInfo.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate">
                                  {playerInfo.username}
                                </p>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(transfer.created_at)}
                                </p>
                              </div>
                            </div>

                            <Badge
                              variant="outline"
                              className={`${STATUS_COLORS[transfer.status]} text-xs font-medium shrink-0 border`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${STATUS_DOT_COLORS[transfer.status]}`} />
                              {TRANSFER_STATUS_LABELS[transfer.status]}
                            </Badge>
                          </div>

                          {/* Team flow: from -> to */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">De</p>
                              <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                                  {getInitials(fromTeam.name)}
                                </div>
                                <span className="text-sm text-zinc-300 truncate font-medium">
                                  {fromTeam.name}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                                <ArrowLeftRight className="h-3.5 w-3.5 text-zinc-500" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Para</p>
                              <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-bold text-green-400">
                                  {getInitials(toTeam.name)}
                                </div>
                                <span className="text-sm text-zinc-300 truncate font-medium">
                                  {toTeam.name}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom row: fee + message + actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-4 flex-wrap">
                              {/* Transfer fee */}
                              <div className="flex items-center gap-1.5">
                                <Coins className="h-4 w-4 text-yellow-400" />
                                <span className="text-sm font-semibold text-yellow-400">
                                  {formatCoins(transfer.transfer_fee)} moedas
                                </span>
                              </div>

                              {/* Message preview */}
                              {transfer.message && (
                                <div className="flex items-center gap-1.5 text-zinc-500">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span className="text-xs truncate max-w-[200px]">
                                    {truncateText(transfer.message, 40)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Accept / Reject buttons for team owners on pending */}
                            {isTeamOwner && transfer.status === 'requested' && (
                              <motion.div
                                className="flex items-center gap-2"
                                variants={fadeInVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                <Button
                                  size="sm"
                                  onClick={() => handleRespond(transfer.id, true)}
                                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Aceitar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRespond(transfer.id, false)}
                                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Rejeitar
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>

      {/* REQUEST TRANSFER DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              Solicitar Transferencia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Player search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Jogador
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Pesquisar por nome de utilizador..."
                  value={formPlayerSearch}
                  onChange={e => setFormPlayerSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:ring-purple-500/30 focus:border-purple-500/40"
                />
              </div>
            </div>

            {/* Destination team */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Equipa Destino
              </label>
              <Select value={formSelectedTeam} onValueChange={setFormSelectedTeam}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl text-white">
                  <SelectValue placeholder="Selecionar equipa..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {teams.length > 0 ? (
                    teams.map(team => (
                      <SelectItem key={team.id} value={team.id} className="text-zinc-300 focus:text-white focus:bg-white/5">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-300">
                            {getInitials(team.name)}
                          </div>
                          {team.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_placeholder" disabled className="text-zinc-500">
                      Nenhuma equipa disponivel
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Transfer fee */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Taxa de Transferencia
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-400" />
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formFee}
                  onChange={e => setFormFee(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:ring-purple-500/30 focus:border-purple-500/40"
                />
              </div>
              <p className="text-xs text-zinc-600">
                Quantidade de moedas a pagar pela transferencia
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Mensagem (opcional)
              </label>
              <Textarea
                placeholder="Escreve uma mensagem para a equipa de destino..."
                value={formMessage}
                onChange={e => setFormMessage(e.target.value)}
                rows={3}
                className="bg-white/5 border-white/10 rounded-xl text-white placeholder:text-zinc-500 resize-none focus:ring-purple-500/30 focus:border-purple-500/40"
              />
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmitTransfer}
              disabled={submitting || !formSelectedTeam}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </motion.div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitacao
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
