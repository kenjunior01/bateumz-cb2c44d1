import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sword, Shield, Trophy, Users, Clock, Plus, ArrowRight,
  Search, Filter, Zap, Crown, X, ChevronRight, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

export default function Battles() {
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

  useEffect(() => {
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

  const filteredOpen = openBattles.filter(b =>
    !searchQuery || b.game_label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0a1a] via-[#1a1035] to-[#0d0820] text-white">
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-10 text-center">
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

      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0f0a1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 py-2">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === 'open' && (
            <motion.div key="open" {...fadeUp} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input placeholder="Pesquisar jogo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/40 focus:border-purple-500" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs text-white/60">
                  <Users className="h-3.5 w-3.5" />{filteredOpen.length} batalhas
                </div>
              </div>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div>
              ) : filteredOpen.length === 0 ? (
                <motion.div {...fadeUp} className="flex flex-col items-center justify-center py-20 text-center">
                  <Sword className="mb-3 h-14 w-14 text-white/15" />
                  <p className="text-sm font-medium text-white/40">{searchQuery ? 'Nenhuma batalha encontrada' : 'Nenhuma batalha aberta neste momento'}</p>
                  <p className="mt-1 text-xs text-white/25">{searchQuery ? 'Tenta outra pesquisa' : 'Se o primeiro a criar uma batalha!'}</p>
                  <Button variant="outline" onClick={() => setTab('create')} className="mt-4 border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                    <Plus className="mr-1.5 h-4 w-4" /> Criar Batalha
                  </Button>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
                  {filteredOpen.map(battle => {
                    const game = gameMap.get(battle.game_id);
                    return (
                      <motion.div key={battle.id} variants={fadeUp}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-purple-500/30 hover:bg-white/[0.07]">
                        <div className="flex items-center gap-4 p-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-2xl shadow-lg`}>
                            {game?.emoji ?? '🎮'}
                          </div>
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
                            <DialogTrigger><Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500" onClick={() => setAcceptTarget(battle)}><ChevronRight className="h-4 w-4" /></Button></DialogTrigger>
                            <DialogContent className="border-white/10 bg-[#1a1035] text-white sm:max-w-md">
                              <DialogHeader><DialogTitle>Aceitar Batalha?</DialogTitle></DialogHeader>
                              <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-3xl`}>{game?.emoji ?? '🎮'}</div>
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
                  <Shield className="mb-3 h-14 w-14 text-white/15" />
                  <p className="text-sm font-medium text-white/40">Faz login para ver as tuas batalhas</p>
                  <Link to="/login"><Button variant="outline" className="mt-4 border-purple-500/50 text-purple-300">Entrar</Button></Link>
                </div>
              ) : loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />)}</div>
              ) : myBattles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Trophy className="mb-3 h-14 w-14 text-white/15" />
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
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${game?.grad ?? 'from-gray-500 to-gray-600'} text-lg`}>{game?.emoji ?? '🎮'}</div>
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
                                <Button size="sm" onClick={() => navigate(`/lives?game=${battle.game_id}&battle=${battle.id}`)} className="bg-gradient-to-r from-purple-600 to-indigo-600"><ArrowRight className="h-4 w-4" /></Button>
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
                  <Plus className="mb-3 h-14 w-14 text-white/15" />
                  <p className="text-sm font-medium text-white/40">Faz login para criar batalhas</p>
                  <Link to="/login"><Button variant="outline" className="mt-4 border-purple-500/50 text-purple-300">Entrar</Button></Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div><h2 className="mb-1 text-lg font-bold">Escolhe o Jogo</h2><p className="text-xs text-white/50">Selecciona o jogo para a tua batalha</p></div>
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {BATTLE_GAMES.map(game => {
                      const isSelected = selectedGame === game.id;
                      return (
                        <motion.button key={game.id} variants={fadeUp} whileTap={{ scale: 0.97 }} onClick={() => setSelectedGame(game.id)}
                          className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all ${isSelected ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/20' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'}`}>
                          <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${game.grad} text-2xl shadow-md`}>{game.emoji}</div>
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
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                          <h3 className="mb-4 text-sm font-semibold">Configurar Batalha</h3>
                          <div className="mb-4">
                            <label className="mb-1.5 block text-xs text-white/60">Valor da Aposta (MZN)</label>
                            <Input type="number" min={BATTLE_GAMES.find(g => g.id === selectedGame)?.minBet ?? 10} placeholder="Ex: 50" value={wagerAmount} onChange={e => setWagerAmount(e.target.value)}
                              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-purple-500" />
                            <div className="mt-2 flex gap-2">
                              {[20, 50, 100, 250].map(v => (
                                <button key={v} onClick={() => setWagerAmount(String(v))}
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white">{v}</button>
                              ))}
                            </div>
                          </div>
                          <div className="mb-5 rounded-xl bg-emerald-500/10 p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/60">Seu saldo</span>
                              <span className="font-bold text-emerald-400">{formatMZN(balance)}</span>
                            </div>
                          </div>
                          <Button onClick={handleCreate}
                            disabled={creating || !wagerAmount || parseFloat(wagerAmount) < (BATTLE_GAMES.find(g => g.id === selectedGame)?.minBet ?? 10)}
                            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 py-6 text-base font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50">
                            {creating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sword className="mr-2 h-5 w-5" />}Criar Batalha
                          </Button>
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
    </div>
  );
}
