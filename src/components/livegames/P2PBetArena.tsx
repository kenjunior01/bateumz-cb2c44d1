'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { COUNTRIES } from '@/lib/regions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Swords, Trophy, Flame, Crown, Filter,
  Plus, Coins, Timer, Shield, TrendingUp,
  Medal, Star, Zap, Target, Brain,
  Hash, CircleDot, Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface P2PBet {
  id: string;
  challenger_id: string;
  challenger_name: string;
  challenger_region: string;
  game_type: string;
  bet_amount: number;
  currency: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  time_limit: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  opponent_id?: string;
  opponent_name?: string;
  winner_id?: string;
  result?: 'challenger_wins' | 'opponent_wins' | 'draw';
  created_at: string;
  completed_at?: string;
  description?: string;
}

interface PlayerStats {
  total_wins: number; total_losses: number; total_draws: number;
  total_wagered: number; total_won: number;
  current_streak: number; best_streak: number;
}

const GAME_TYPES = [
  'Pedra Papel Tesoura', 'Cara ou Coroa', 'Adivinha Numero',
  'Quiz Rapido', 'Ligar 4', 'Xadrez', 'Damas', 'Domino',
  'Pedrada', 'Corrida de Digitacao', 'Jogo da Velha Pro', 'Quiz Batalha',
];

const DIFFICULTY_MAP: Record<string, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const DIFFICULTY_COLORS: Record<string, string> = { facil: 'bg-green-500/20 text-green-400', medio: 'bg-amber-500/20 text-amber-400', dificil: 'bg-red-500/20 text-red-400' };

const TIME_OPTIONS = [
  { label: '1 min', value: 60 }, { label: '3 min', value: 180 },
  { label: '5 min', value: 300 }, { label: '10 min', value: 600 },
];

const BOT_NAMES = ['TigreMoz', 'RainhaBR', 'FalcãoAO', 'LeãoPT', 'CobraIN', 'ÁguiaUS', 'LoboCA'];

const QUIZ_QUESTIONS = [
  { q: 'Qual é a capital de Moçambique?', opts: ['Maputo', 'Harare', 'Nampula', 'Beira'], ans: 0 },
  { q: 'Quantos lados tem um hexágono?', opts: ['5', '6', '7', '8'], ans: 1 },
  { q: 'Quem pintou a Mona Lisa?', opts: ['Michelangelo', 'Da Vinci', 'Rafael', 'Boticelli'], ans: 1 },
  { q: 'Qual o maior oceano do mundo?', opts: ['Atlântico', 'Índico', 'Pacífico', 'Ártico'], ans: 2 },
  { q: 'Em que ano o Brasil ficou independente?', opts: ['1808', '1822', '1889', '1900'], ans: 1 },
];

const RPS_CHOICES = ['Pedra', 'Papel', 'Tesoura'] as const;
const RPS_ICONS = ['🪨', '📄', '✂️'];

const LS_KEY = 'bateu_p2p_bets';
const STATS_KEY = 'bateu_p2p_stats';
const USER_KEY = 'bateu_p2p_user';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);
const getLocalBets = (): P2PBet[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const setLocalBets = (b: P2PBet[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch {} };
const getStats = (): PlayerStats => { try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch { return { total_wins: 0, total_losses: 0, total_draws: 0, total_wagered: 0, total_won: 0, current_streak: 0, best_streak: 0 }; } };
const setStats = (s: PlayerStats) => { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {} };
const getUserName = () => localStorage.getItem(USER_KEY) || 'Jogador_' + uid().slice(0, 4);
const setUser = (n: string) => localStorage.setItem(USER_KEY, n);

/* ------------------------------------------------------------------ */
/*  Confetti Particles                                                 */
/* ------------------------------------------------------------------ */

function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 0.5,
    color: ['#f59e0b', '#f97316', '#ef4444', '#22c55e', '#3b82f6'][i % 5],
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.left}%`, top: '-10px', width: p.size, height: p.size, backgroundColor: p.color,
            animation: `confettiFall ${1.5 + Math.random()}s ease-out ${p.delay}s forwards`,
          }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fire Streak                                                        */
/* ------------------------------------------------------------------ */

function StreakFire({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  const size = streak >= 5 ? 'text-4xl' : streak >= 3 ? 'text-3xl' : 'text-2xl';
  const glow = streak >= 5 ? 'drop-shadow-[0_0_12px_#f97316] animate-pulse' : '';
  const fires = streak >= 5 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥';
  return <span className={cn(size, glow, 'inline-block')}>{fires}</span>;
}

/* ------------------------------------------------------------------ */
/*  Coin Flip Animation                                                */
/* ------------------------------------------------------------------ */

function CoinFlipAnim({ result }: { result: 'heads' | 'tails' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_40px_rgba(245,158,11,0.5)]"
        animate={{ rotateY: [0, 720, 1440, 1800] }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      >{result === 'heads' ? '👑' : '🦅'}</motion.div>
      <motion.p className="text-amber-400 font-bold text-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
        {result === 'heads' ? 'Cara!' : 'Coroa!'}
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tension Bar                                                        */
/* ------------------------------------------------------------------ */

function TensionBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
        animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Game Engine                                                   */
/* ------------------------------------------------------------------ */

type MiniGamePhase = 'waiting' | 'playing' | 'revealing' | 'done';

function MiniGameEngine({ bet, onResult }: { bet: P2PBet; onResult: (won: boolean) => void }) {
  const [phase, setPhase] = useState<MiniGamePhase>('waiting');
  const [rpsPick, setRpsPick] = useState<number | null>(null);
  const [botRps, setBotRps] = useState<number | null>(null);
  const [rpsScore, setRpsScore] = useState<[number, number]>([0, 0]);
  const [coinGuess, setCoinGuess] = useState<'heads' | 'tails' | null>(null);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [numGuess, setNumGuess] = useState('');
  const [botNum, setBotNum] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState<[number, number]>([0, 0]);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [tension, setTension] = useState(0);
  const [dingFlash, setDingFlash] = useState(false);

  const triggerDing = () => { setDingFlash(true); setTimeout(() => setDingFlash(false), 400); };

  const finish = useCallback((won: boolean) => {
    setPhase('revealing');
    setTension(100);
    setTimeout(() => { setPhase('done'); onResult(won); }, 1500);
  }, [onResult]);

  useEffect(() => { setPhase('playing'); }, []);

  /* ---------- RPS ---------- */
  const playRps = (pick: number) => {
    if (rpsPick !== null) return;
    setRpsPick(pick);
    const bot = Math.floor(Math.random() * 3);
    setTimeout(() => { setBotRps(bot); triggerDing();
      if (pick === bot) { /* draw - replay */ setTimeout(() => { setRpsPick(null); setBotRps(null); }, 800); return; }
      const won = (pick === 0 && bot === 2) || (pick === 1 && bot === 0) || (pick === 2 && bot === 1);
      const newScore: [number, number] = won ? [rpsScore[0] + 1, rpsScore[1]] : [rpsScore[0], rpsScore[1] + 1];
      setRpsScore(newScore);
      setTimeout(() => {
        if (newScore[0] >= 2) finish(true);
        else if (newScore[1] >= 2) finish(false);
        else { setRpsPick(null); setBotRps(null); setTension(p => Math.min(100, p + 33)); }
      }, 1000);
    }, 600);
  };

  /* ---------- Coin Flip ---------- */
  const playCoin = (guess: 'heads' | 'tails') => {
    if (coinGuess) return;
    setCoinGuess(guess);
    const res: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    setTimeout(() => { setCoinResult(res); triggerDing(); finish(guess === res); }, 2000);
  };

  /* ---------- Number Guess ---------- */
  const playNumGuess = () => {
    const n = parseInt(numGuess);
    if (isNaN(n) || n < 1 || n > 10) { toast.error('Escolhe um número de 1 a 10!'); return; }
    const botN = Math.floor(Math.random() * 10) + 1;
    setBotNum(botN);
    const target = Math.floor(Math.random() * 10) + 1;
    const myDist = Math.abs(n - target);
    const botDist = Math.abs(botN - target);
    triggerDing();
    finish(myDist < botDist);
  };

  /* ---------- Quick Quiz ---------- */
  const playQuizPick = (optIdx: number) => {
    if (quizPick !== null) return;
    setQuizPick(optIdx);
    const botPick = Math.floor(Math.random() * 4);
    const q = QUIZ_QUESTIONS[quizIdx];
    const myCorrect = optIdx === q.ans ? 1 : 0;
    const botCorrect = botPick === q.ans ? 1 : 0;
    const newScore: [number, number] = [quizScore[0] + myCorrect, quizScore[1] + botCorrect];
    setQuizScore(newScore);
    triggerDing();
    setTimeout(() => {
      if (quizIdx >= 2) { finish(newScore[0] > newScore[1]); }
      else { setQuizIdx(quizIdx + 1); setQuizPick(null); setTension(p => Math.min(100, p + 33)); }
    }, 1200);
  };

  /* ---------- Render ---------- */
  const gt = bet.game_type;
  const isRPS = gt.includes('Pedra Papel');
  const isCoin = gt.includes('Cara');
  const isNum = gt.includes('Adivinha');
  const isQuiz = gt.includes('Quiz') || gt.includes('Batalha');

  return (
    <div className="relative min-h-[400px] flex flex-col items-center justify-center gap-4 p-4">
      {dingFlash && <div className="absolute top-8 text-2xl font-black text-amber-400 animate-bounce z-40">DING!</div>}

      {phase === 'playing' && <TensionBar progress={tension} />}

      {phase === 'revealing' && (
        <motion.div className="flex flex-col items-center gap-2" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-3xl animate-pulse">🎭</div>
          <p className="text-amber-400 text-xl font-black">A revelar...</p>
        </motion.div>
      )}

      {phase !== 'revealing' && phase !== 'done' && (
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">{gt}</Badge>
          {isRPS && <span className="text-sm text-white/60">Melhor de 3</span>}
        </div>
      )}

      {/* RPS */}
      {isRPS && phase === 'playing' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <div className="flex gap-4 text-2xl font-bold">
            <span className="text-green-400">{rpsScore[0]}</span>
            <span className="text-white/40">vs</span>
            <span className="text-red-400">{rpsScore[1]}</span>
          </div>
          <div className="flex gap-3">
            {RPS_CHOICES.map((c, i) => (
              <motion.button key={c} whileTap={{ scale: 0.9 }} disabled={rpsPick !== null}
                onClick={() => playRps(i)}
                className={cn('w-20 h-20 rounded-xl bg-white/10 border border-border/40 flex flex-col items-center justify-center gap-1 text-2xl transition-all hover:bg-white/20', rpsPick === i && 'ring-2 ring-amber-500 bg-amber-500/20')}>
                {RPS_ICONS[i]}<span className="text-xs text-white/70">{c}</span>
              </motion.button>
            ))}
          </div>
          {botRps !== null && (
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-2 text-white/70">
              <span className="text-lg">🤖</span> escolheu <span className="text-xl">{RPS_ICONS[botRps]}</span>
            </motion.div>
          )}
        </div>
      )}

      {/* Coin Flip */}
      {isCoin && phase === 'playing' && !coinResult && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/70">Cara ou Coroa?</p>
          <div className="flex gap-4">
            {(['heads', 'tails'] as const).map(g => (
              <motion.button key={g} whileTap={{ scale: 0.9 }}
                onClick={() => playCoin(g)}
                className={cn('w-28 h-28 rounded-xl bg-white/10 border border-border/40 flex flex-col items-center justify-center gap-1 text-3xl hover:bg-white/20 transition-all', coinGuess === g && 'ring-2 ring-amber-500 bg-amber-500/20')}>
                {g === 'heads' ? '👑' : '🦅'}
                <span className="text-xs text-white/70">{g === 'heads' ? 'Cara' : 'Coroa'}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      {isCoin && coinResult && <CoinFlipAnim result={coinResult} />}

      {/* Number Guess */}
      {isNum && phase === 'playing' && botNum === 0 && (
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <p className="text-white/70">Adivinha o número (1-10). O mais próximo ganha!</p>
          <Input type="number" min={1} max={10} value={numGuess} onChange={e => setNumGuess(e.target.value)}
            placeholder="1-10" className="text-center text-2xl bg-white/10 border-border/40" />
          <Button onClick={playNumGuess} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
            <Target className="w-4 h-4 mr-2" />Confirmar
          </Button>
        </div>
      )}
      {isNum && botNum > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-white/70">Teu palpite: <span className="text-amber-400 font-bold text-xl">{numGuess}</span></p>
          <p className="text-white/70">Bot palpitou: <span className="text-red-400 font-bold text-xl">{botNum}</span></p>
        </motion.div>
      )}

      {/* Quiz */}
      {isQuiz && phase === 'playing' && quizIdx < 3 && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <div className="flex gap-4 text-sm font-bold">
            <span className="text-green-400">Tu: {quizScore[0]}</span>
            <span className="text-white/40">vs</span>
            <span className="text-red-400">Bot: {quizScore[1]}</span>
          </div>
          <p className="text-sm text-white/50">Pergunta {quizIdx + 1}/3</p>
          <p className="text-white font-semibold text-center">{QUIZ_QUESTIONS[quizIdx].q}</p>
          <div className="grid grid-cols-1 gap-2">
            {QUIZ_QUESTIONS[quizIdx].opts.map((opt, i) => (
              <motion.button key={i} whileTap={{ scale: 0.97 }} disabled={quizPick !== null}
                onClick={() => playQuizPick(i)}
                className={cn('p-3 rounded-xl bg-white/10 border border-border/40 text-left text-white/90 hover:bg-white/20 transition-all',
                  quizPick === i && 'ring-2 ring-amber-500 bg-amber-500/20',
                  quizPick !== null && i === QUIZ_QUESTIONS[quizIdx].ans && 'ring-2 ring-green-500 bg-green-500/20',
                  quizPick !== null && quizPick === i && i !== QUIZ_QUESTIONS[quizIdx].ans && 'ring-2 ring-red-500 bg-red-500/20')}>
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Generic game (non-inline) */}
      {!isRPS && !isCoin && !isNum && !isQuiz && phase === 'playing' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/70">A preparar jogo...</p>
          <Button onClick={() => finish(Math.random() > 0.5)} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            Simular Resultado
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const sb = supabase as any;

export default function P2PBetArena({ onScore, liveCode }: Props) {
  const { currency, format } = useCurrency();
  const [tab, setTab] = useState<'arena' | 'criar' | 'meus' | 'ranking'>('arena');
  const [bets, setBets] = useState<P2PBet[]>([]);
  const [stats, setLocalPlayerStats] = useState<PlayerStats>(getStats());
  const [userName, setUserName] = useState(getUserName());
  const [activeBet, setActiveBet] = useState<P2PBet | null>(null);
  const [gameResult, setGameResult] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [filterGame, setFilterGame] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Form state
  const [formGame, setFormGame] = useState(GAME_TYPES[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [formTime, setFormTime] = useState(60);
  const [formDesc, setFormDesc] = useState('');
  const [coinFlipping, setCoinFlipping] = useState(false);

  // Load bets
  const loadBets = useCallback(async () => {
    try {
      const { data, error } = await sb.from('p2p_bets').select('*').order('created_at', { ascending: false });
      if (!error && data?.length) { setBets(data); return; }
    } catch {}
    setBets(getLocalBets());
  }, []);

  useEffect(() => { loadBets(); }, [loadBets]);

  const saveBets = useCallback((newBets: P2PBet[]) => {
    setBets(newBets);
    try {
      sb.from('p2p_bets').upsert(newBets, { onConflict: 'id' });
    } catch {}
    setLocalBets(newBets);
  }, []);

  const saveStats = useCallback((s: PlayerStats) => {
    setLocalPlayerStats(s); setStats(s);
    try { sb.from('p2p_player_stats').upsert({ user_id: userName, ...s }); } catch {}
  }, [userName]);

  /* ---- Create Challenge ---- */
  const handleCreate = () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) { toast.error('Insere um valor válido!'); return; }
    setCoinFlipping(true);
    setTimeout(() => {
      setCoinFlipping(false);
      const newBet: P2PBet = {
        id: uid(), challenger_id: 'local_' + uid(), challenger_name: userName,
        challenger_region: COUNTRIES.find(c => c.currency === currency)?.code || 'MZ',
        game_type: formGame, bet_amount: amount, currency,
        difficulty: formDifficulty, time_limit: formTime,
        status: 'open', created_at: new Date().toISOString(), description: formDesc || undefined,
      };
      const updated = [newBet, ...bets];
      saveBets(updated);
      toast.success('Desafio criado com sucesso! 🎯');
      setTab('arena');
      onScore?.('P2P_Arena', amount);
    }, 1800);
  };

  /* ---- Accept Challenge ---- */
  const handleAccept = (bet: P2PBet) => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
    setActiveBet(bet);
    setGameResult(null);
  };

  /* ---- Game Result ---- */
  const handleGameResult = (won: boolean) => {
    setGameResult(won);
    if (won) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }

    const updated = bets.map(b => {
      if (b.id !== activeBet?.id) return b;
      return { ...b, status: 'completed' as const, opponent_id: 'local_' + uid(), opponent_name: userName,
        winner_id: won ? 'local_' + uid() : b.challenger_id,
        result: won ? 'opponent_wins' as const : 'challenger_wins' as const,
        completed_at: new Date().toISOString(), };
    });
    saveBets(updated);

    const s = getStats();
    if (won) {
      s.total_wins++; s.total_won += activeBet!.bet_amount * 2;
      s.current_streak = s.current_streak >= 0 ? s.current_streak + 1 : 1;
    } else {
      s.total_losses++; s.current_streak = s.current_streak <= 0 ? s.current_streak - 1 : -1;
    }
    s.total_wagered += activeBet!.bet_amount;
    s.best_streak = Math.max(s.best_streak, s.current_streak);
    saveStats(s);

    if (won) { toast.success(`Ganhaste ${format(activeBet!.bet_amount * 2)}! 🏆`); onScore?.('P2P_Win', activeBet!.bet_amount); }
    else { toast.error('Perdeste esta vez... Tenta novamente! 💪'); }
  };

  /* ---- Filtered bets for Arena ---- */
  const openBets = bets.filter(b => b.status === 'open' &&
    (!filterGame || b.game_type === filterGame) &&
    (!filterRegion || b.challenger_region === filterRegion));

  const myBets = bets.filter(b => b.challenger_id?.startsWith('local_') || b.opponent_id?.startsWith('local_'));
  const activeChallenges = myBets.filter(b => b.status === 'open');
  const inProgressBets = myBets.filter(b => b.status === 'in_progress');
  const completedBets = myBets.filter(b => b.status === 'completed').slice(0, 20);

  /* ---- Leaderboard (mock from completed bets) ---- */
  const leaderboardMap = new Map<string, { name: string; region: string; wins: number; losses: number; wagered: number }>();
  bets.filter(b => b.status === 'completed').forEach(b => {
    const addPlayer = (id: string, name: string, region: string, isWinner: boolean) => {
      const key = name;
      if (!leaderboardMap.has(key)) leaderboardMap.set(key, { name, region, wins: 0, losses: 0, wagered: b.bet_amount });
      const p = leaderboardMap.get(key)!;
      if (isWinner) p.wins++; else p.losses++;
    };
    if (b.result === 'challenger_wins') { addPlayer(b.challenger_id, b.challenger_name, b.challenger_region, true); if (b.opponent_name) addPlayer(b.opponent_id!, b.opponent_name, '', false); }
    else if (b.result === 'opponent_wins') { addPlayer(b.challenger_id, b.challenger_name, b.challenger_region, false); if (b.opponent_name) addPlayer(b.opponent_id!, b.opponent_name, '', true); }
  });
  const leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const filteredLeaderboard = filterRegion ? leaderboard.filter(p => p.region === filterRegion) : leaderboard;

  /* ---- Seed some demo bets if empty ---- */
  useEffect(() => {
    if (bets.length > 0) return;
    const demoBets: P2PBet[] = Array.from({ length: 6 }, (_, i) => ({
      id: 'demo_' + i, challenger_id: 'bot_' + i, challenger_name: BOT_NAMES[i % BOT_NAMES.length],
      challenger_region: COUNTRIES[i % COUNTRIES.length].code,
      game_type: GAME_TYPES[i % GAME_TYPES.length], bet_amount: [50, 100, 200, 500, 1000, 250][i],
      currency, difficulty: (['facil', 'medio', 'dificil'] as const)[i % 3],
      time_limit: TIME_OPTIONS[i % 4].value, status: 'open',
      created_at: new Date(Date.now() - i * 600000).toISOString(),
    }));
    saveBets(demoBets);
  }, []);

  const tabs = [
    { key: 'arena' as const, label: 'Arena', icon: <Swords className="w-4 h-4" /> },
    { key: 'criar' as const, label: 'Criar', icon: <Plus className="w-4 h-4" /> },
    { key: 'meus' as const, label: 'Meus', icon: <Trophy className="w-4 h-4" /> },
    { key: 'ranking' as const, label: 'Ranking', icon: <Crown className="w-4 h-4" /> },
  ];

  const winRate = stats.total_wins + stats.total_losses > 0
    ? Math.round((stats.total_wins / (stats.total_wins + stats.total_losses)) * 100) : 0;

  return (
    <div className={cn('relative w-full max-w-lg mx-auto', screenShake && 'animate-[shake_0.5s_ease-in-out]')}>
      <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }`}</style>
      {showConfetti && <ConfettiParticles />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Arena P2P</h2>
            <p className="text-xs text-white/50">Desafia e ganha</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StreakFire streak={Math.max(0, stats.current_streak)} />
          <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
            <Coins className="w-3 h-3 mr-1" />{format(stats.total_won)}
          </Badge>
        </div>
      </div>

      {/* Name Input */}
      <div className="mb-3 px-1">
        <Input value={userName} onChange={e => { setUserName(e.target.value); setUser(e.target.value); }}
          className="h-9 bg-white/5 border-border/40 text-white text-sm" placeholder="Teu nome de jogador..." />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
              tab === t.key ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: ARENA ===== */}
      {tab === 'arena' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
              className="flex-1 min-w-0 h-9 rounded-lg bg-white/5 border border-border/40 text-white text-xs px-2 appearance-none">
              <option value="">Todos os jogos</option>
              {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
              className="w-24 h-9 rounded-lg bg-white/5 border border-border/40 text-white text-xs px-2 appearance-none">
              <option value="">Região</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
          </div>

          {openBets.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sem desafios abertos</p>
              <p className="text-sm">Cria um novo desafio!</p>
            </div>
          )}

          <AnimatePresence>
            {openBets.map((bet, i) => (
              <motion.div key={bet.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/40 backdrop-blur bg-white/5 p-4 hover:bg-white/10 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                      {bet.challenger_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{bet.challenger_name}</p>
                      <p className="text-white/40 text-xs">{COUNTRIES.find(c => c.code === bet.challenger_region)?.flag} {bet.challenger_region}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-xs border-0', DIFFICULTY_COLORS[bet.difficulty])}>{DIFFICULTY_MAP[bet.difficulty]}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="border-white/20 text-white/70 text-xs"><Zap className="w-3 h-3 mr-1" />{bet.game_type}</Badge>
                  <Badge variant="outline" className="border-white/20 text-white/70 text-xs"><Timer className="w-3 h-3 mr-1" />{TIME_OPTIONS.find(t => t.value === bet.time_limit)?.label || `${bet.time_limit}s`}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-white/40">Aposta</p>
                    <p className="text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                      {format(bet.bet_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40">Prémio</p>
                    <p className="text-sm font-bold text-green-400">{format(bet.bet_amount * 2)}</p>
                  </div>
                </div>
                <Button onClick={() => handleAccept(bet)}
                  className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:opacity-90 transition-opacity group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Swords className="w-4 h-4 mr-2" />Aceitar Desafio
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* FAB */}
          <motion.button onClick={() => setTab('criar')} whileTap={{ scale: 0.9 }}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] z-30">
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      )}

      {/* ===== TAB: CRIAR DESAFIO ===== */}
      {tab === 'criar' && (
        <div className="space-y-4">
          {coinFlipping && <div className="flex justify-center py-8"><CoinFlipAnim result={Math.random() > 0.5 ? 'heads' : 'tails'} /></div>}
          {!coinFlipping && (
            <>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Tipo de Jogo</label>
                <select value={formGame} onChange={e => setFormGame(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/5 border border-border/40 text-white text-sm px-3 appearance-none">
                  {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Valor da Aposta ({currency})</label>
                <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                  placeholder="0.00" className="h-10 bg-white/5 border-border/40 text-white text-lg font-bold" />
              </div>
              {formAmount && parseFloat(formAmount) > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 text-center">
                  <p className="text-xs text-white/50">Prémio estimado</p>
                  <p className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {format(parseFloat(formAmount) * 2)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Dificuldade</label>
                <div className="flex gap-2">
                  {(['facil', 'medio', 'dificil'] as const).map(d => (
                    <button key={d} onClick={() => setFormDifficulty(d)}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-all',
                        formDifficulty === d ? cn('border-transparent', d === 'facil' ? 'bg-green-500/30 text-green-400' : d === 'dificil' ? 'bg-red-500/30 text-red-400' : 'bg-amber-500/30 text-amber-400')
                          : 'bg-white/5 border-border/40 text-white/50')}>
                      {d === 'facil' ? '🟢' : d === 'dificil' ? '🔴' : '🟡'} {DIFFICULTY_MAP[d]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Tempo Limite</label>
                <div className="flex gap-2">
                  {TIME_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setFormTime(t.value)}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-all',
                        formTime === t.value ? 'bg-amber-500/30 border-amber-500/50 text-amber-400' : 'bg-white/5 border-border/40 text-white/50')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Descrição (opcional)</label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Desafio rápido..."
                  className="h-10 bg-white/5 border-border/40 text-white text-sm" />
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button onClick={handleCreate} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base hover:opacity-90 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  <Sparkles className="w-5 h-5 mr-2" />Lançar Desafio
                </Button>
              </motion.div>
            </>
          )}
        </div>
      )}

      {/* ===== TAB: MEUS DESAFIOS ===== */}
      {tab === 'meus' && (
        <div className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Vitórias', value: stats.total_wins, icon: <Trophy className="w-4 h-4 text-green-400" />, color: 'text-green-400' },
              { label: 'Derrotas', value: stats.total_losses, icon: <Shield className="w-4 h-4 text-red-400" />, color: 'text-red-400' },
              { label: 'Taxa Vitória', value: `${winRate}%`, icon: <TrendingUp className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
              { label: 'Total Apostado', value: format(stats.total_wagered), icon: <Coins className="w-4 h-4 text-orange-400" />, color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/5 border border-border/40 p-3">
                <div className="flex items-center gap-1 mb-1"><span className="text-white/40 text-xs">{s.label}</span>{s.icon}</div>
                <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Streak & Best */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-white/5 border border-border/40 p-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <div><p className="text-xs text-white/40">Streak</p><p className="font-bold text-white">{stats.current_streak > 0 ? `+${stats.current_streak}` : stats.current_streak}</p></div>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 border border-border/40 p-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <div><p className="text-xs text-white/40">Melhor Streak</p><p className="font-bold text-white">{stats.best_streak}</p></div>
            </div>
          </div>

          {/* Active Bets */}
          {activeChallenges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1"><Zap className="w-4 h-4" />Ativos ({activeChallenges.length})</h3>
              {activeChallenges.map(b => (
                <div key={b.id} className="rounded-xl bg-white/5 border border-amber-500/20 p-3 mb-2">
                  <div className="flex justify-between"><span className="text-white font-semibold text-sm">{b.game_type}</span><Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">A aguardar</Badge></div>
                  <p className="text-amber-400 font-bold mt-1">{format(b.bet_amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* In Progress */}
          {inProgressBets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1"><Swords className="w-4 h-4" />Em Curso ({inProgressBets.length})</h3>
              {inProgressBets.map(b => (
                <div key={b.id} className="rounded-xl bg-white/5 border border-blue-500/20 p-3 mb-2">
                  <p className="text-white font-semibold text-sm">{b.game_type} - vs {b.opponent_name || '...'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Completed History */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-2 flex items-center gap-1"><Medal className="w-4 h-4" />Histórico</h3>
            {completedBets.length === 0 && <p className="text-white/30 text-sm text-center py-6">Nenhum desafio completado ainda</p>}
            {completedBets.map(b => {
              const isWin = b.winner_id?.startsWith('local_');
              return (
                <div key={b.id} className="rounded-xl bg-white/5 border border-border/40 p-3 mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{b.game_type}</p>
                    <p className="text-white/40 text-xs">vs {b.challenger_name} {b.opponent_name ? `vs ${b.opponent_name}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-bold text-sm', isWin ? 'text-green-400' : 'text-red-400')}>{isWin ? '+Vitória' : 'Derrota'}</p>
                    <p className="text-white/40 text-xs">{format(b.bet_amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TAB: RANKING ===== */}
      {tab === 'ranking' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
              className="flex-1 h-9 rounded-lg bg-white/5 border border-border/40 text-white text-xs px-2 appearance-none">
              <option value="">Todas as regiões</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
            </select>
          </div>

          {filteredLeaderboard.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sem dados de ranking</p>
              <p className="text-sm">Joga desafios para subir no ranking!</p>
            </div>
          )}

          {/* Top 3 Podium */}
          {filteredLeaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-2 py-4">
              {[1, 0, 2].map(rank => {
                const p = filteredLeaderboard[rank];
                if (!p) return null;
                const heights = ['h-20', 'h-28', 'h-16'];
                const colors = ['from-amber-400 to-yellow-600', 'from-gray-300 to-gray-500', 'from-amber-700 to-orange-800'];
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={rank} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{medals[rank]}</span>
                    <div className={cn('w-16 rounded-t-lg bg-gradient-to-b', colors[rank], heights[rank], 'flex items-end justify-center pb-2')}>
                      <span className="text-white font-black text-xs">{p.name.slice(0, 6)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="space-y-1">
            {filteredLeaderboard.map((p, i) => {
              const wr = p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0;
              const rankBadge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              return (
                <div key={p.name} className={cn('flex items-center gap-3 rounded-xl p-3 transition-all',
                  i < 3 ? 'bg-white/5 border border-border/40' : 'bg-white/[0.02]')}>
                  <span className="w-8 text-center font-bold text-sm">{rankBadge}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-white/40 text-xs">{COUNTRIES.find(c => c.code === p.region)?.flag} {p.region}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-green-400 font-bold">{p.wins}W</p>
                    <p className="text-red-400">{p.losses}L</p>
                  </div>
                  <Badge className={cn('text-xs border-0', wr >= 60 ? 'bg-green-500/20 text-green-400' : wr >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400')}>{wr}%</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MINI GAME MODAL ===== */}
      <AnimatePresence>
        {activeBet && gameResult === null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            {/* DESAFIO ACEITO splash */}
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent whitespace-nowrap">
                DESAFIO ACEITO!
              </h1>
            </motion.div>

            <div className="w-full max-w-md bg-background border border-border/40 rounded-2xl p-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/50 text-xs">Desafio de</p>
                  <p className="text-white font-bold">{activeBet.challenger_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50">Aposta</p>
                  <p className="text-amber-400 font-black text-lg">{format(activeBet.bet_amount)}</p>
                </div>
              </div>

              <MiniGameEngine bet={activeBet} onResult={handleGameResult} />

              <Button variant="ghost" onClick={() => { setActiveBet(null); setGameResult(null); }}
                className="w-full mt-4 text-white/40 hover:text-white/60 text-sm">Fechar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== RESULT MODAL ===== */}
      <AnimatePresence>
        {gameResult !== null && activeBet && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            {showConfetti && <ConfettiParticles />}
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 10 }}
              className="bg-background border border-border/40 rounded-2xl p-8 text-center max-w-sm w-full">
              <div className="text-6xl mb-4">{gameResult ? '🏆' : '💔'}</div>
              <h2 className={cn('text-2xl font-black mb-2', gameResult ? 'bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent' : 'text-red-400')}>
                {gameResult ? 'VITÓRIA!' : 'DERROTA'}
              </h2>
              {gameResult && (
                <p className="text-green-400 font-bold text-xl mb-1">+{format(activeBet.bet_amount * 2)}</p>
              )}
              <p className="text-white/50 text-sm mb-6">{gameResult ? 'Incrível! Ganhaste o dobro!' : 'Mais sorte na próxima!'}</p>
              <Button onClick={() => { setActiveBet(null); setGameResult(null); setShowConfetti(false); }}
                className={cn('w-full font-bold', gameResult ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-white/10 text-white hover:bg-white/20')}>
                {gameResult ? 'Coleccionar Prémio' : 'Tentar Novamente'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}