
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Bot, Trophy, RotateCcw, Zap, Keyboard, Timer, Target, Flame, Gauge, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

// ===================== TYPES =====================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = 'menu' | 'race' | 'results';
type Difficulty = 'facil' | 'medio' | 'dificil';

interface WpmSnapshot {
  word: number;
  wpm: number;
  accuracy: number;
}

interface RaceState {
  currentWord: string;
  typed: string;
  wordStartTime: number;
  wordsCompleted: number;
  totalCorrectChars: number;
  totalWrongChars: number;
  totalCharsTyped: number;
  combo: number;
  bestCombo: number;
  playerProgress: number;
  botProgress: number;
  round: number;
  totalRounds: number;
  raceStartTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ===================== WORD BANKS =====================

const WORD_BANKS: Record<string, string[]> = {
  geral: [
    'gato', 'casa', 'sol', 'agua', 'comida', 'tempo', 'pessoas', 'trabalho', 'cidade', 'familia',
    'amigo', 'escola', 'dinheiro', 'mundo', 'vida', 'noite', 'manha', 'tarde', 'semana', 'mes',
    'ano', 'dia', 'hora', 'minuto', 'segundo', 'nome', 'cor', 'numero', 'porta', 'janela',
    'mesa', 'cadeira', 'livro', 'papel', 'caneta', 'relogio', 'telefone', 'computador', 'carro', 'rua',
  ],
  tecnologia: [
    'algoritmo', 'banco de dados', 'interface', 'servidor', 'programacao', 'software', 'hardware',
    'internet', 'protocolo', 'framework', 'aplicativo', 'nuvem', 'seguranca', 'rede', 'sistema',
    'desenvolvimento', 'codigo', 'variavel', 'funcao', 'objeto', 'componente', 'responsivo',
    'dispositivo', 'tecnologia', 'digital', 'automacao', 'processamento', 'armazenamento',
  ],
  gaming: [
    'jogador', 'campeao', 'desafio', 'competicao', 'estrategia', 'aventura', 'puzzle', 'plataforma',
    'multiplayer', 'ranking', 'pontuacao', 'nivel', 'inimigo', 'poder', 'habilidade', 'equipamento',
    'missoes', 'recompensa', 'torneio', 'finalboss', 'savepoint', 'cooldown', 'respawn',
  ],
  mocambique: [
    'maputo', 'beira', 'nampula', 'xai-xai', 'chimoio', 'quelimane', 'tete', 'gaza', 'inhambane',
    'zambezia', 'cabo delgado', 'niassa', 'manica', 'sofala', 'macaneta', 'matapa', 'chanfuta',
    'capulana', 'xigubo', 'timbila', 'marrabenta', 'mapiko', 'tufo', 'nyau', 'chamanculo',
  ],
};

const DIFFICULTY_WORDS: Record<Difficulty, { categories: string[]; wordTime: number; rounds: number; botSpeed: number }> = {
  facil: { categories: ['geral'], wordTime: 5000, rounds: 8, botSpeed: 0.7 },
  medio: { categories: ['geral', 'gaming', 'mocambique'], wordTime: 4000, rounds: 10, botSpeed: 0.85 },
  dificil: { categories: ['tecnologia', 'gaming', 'mocambique'], wordTime: 3000, rounds: 12, botSpeed: 0.95 },
};

const TOTAL_RACE_DISTANCE = 100;

const DIFFICULTY_OPTIONS: Difficulty[] = ['facil', 'medio', 'dificil'];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: 'Facil',
  medio: 'Medio',
  dificil: 'Dificil',
};

// ===================== SVG CAR COMPONENTS =====================

function PlayerCarSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} fill="none">
      <rect x="4" y="10" width="32" height="10" rx="4" fill="#22c55e" />
      <rect x="8" y="4" width="18" height="8" rx="3" fill="#16a34a" />
      <rect x="11" y="5.5" width="5" height="5" rx="1" fill="#bbf7d0" opacity="0.7" />
      <rect x="18" y="5.5" width="5" height="5" rx="1" fill="#bbf7d0" opacity="0.7" />
      <circle cx="12" cy="21" r="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <circle cx="28" cy="21" r="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <circle cx="12" cy="21" r="1" fill="#64748b" />
      <circle cx="28" cy="21" r="1" fill="#64748b" />
    </svg>
  );
}

function BotCarSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} fill="none">
      <rect x="4" y="10" width="32" height="10" rx="4" fill="#8b5cf6" />
      <rect x="8" y="4" width="18" height="8" rx="3" fill="#7c3aed" />
      <rect x="11" y="5.5" width="5" height="5" rx="1" fill="#ddd6fe" opacity="0.7" />
      <rect x="18" y="5.5" width="5" height="5" rx="1" fill="#ddd6fe" opacity="0.7" />
      <circle cx="12" cy="21" r="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <circle cx="28" cy="21" r="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <circle cx="12" cy="21" r="1" fill="#64748b" />
      <circle cx="28" cy="21" r="1" fill="#64748b" />
    </svg>
  );
}

function TrophySVG({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <path d="M8 4h16v12c0 4.4-3.6 8-8 8s-8-3.6-8-8V4z" fill={color || '#fbbf24'} />
      <rect x="14" y="24" width="4" height="4" fill={color || '#f59e0b'} />
      <rect x="11" y="28" width="10" height="2" rx="1" fill={color || '#d97706'} />
      <path d="M8 4H4v6c0 2.2 1.8 4 4 4" stroke={color || '#fbbf24'} strokeWidth="2" fill="none" />
      <path d="M24 4h4v6c0 2.2-1.8 4-4 4" stroke={color || '#fbbf24'} strokeWidth="2" fill="none" />
    </svg>
  );
}

// ===================== WPM BAR CHART =====================

function WpmChart({ snapshots }: { snapshots: WpmSnapshot[] }) {
  if (snapshots.length === 0) return null;
  const maxWpm = Math.max(...snapshots.map(s => s.wpm), 20);
  const chartW = 320;
  const chartH = 80;
  const barW = Math.max(6, Math.min(20, (chartW - 20) / snapshots.length - 4));
  const gap = 4;
  const totalBarsW = snapshots.length * (barW + gap) - gap;
  const offsetX = (chartW - totalBarsW) / 2;

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 w-full">
      <div className="flex items-center gap-1 mb-2">
        <TrendingUp className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">WPM por Palavra</span>
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 100 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const y = chartH - f * (chartH - 8) - 4;
          return (
            <line
              key={f}
              x1={offsetX - 2} y1={y} x2={chartW - offsetX + 2} y2={y}
              stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3"
            />
          );
        })}
        {/* Max label */}
        <text x={offsetX - 6} y={10} textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">{maxWpm}</text>
        <text x={offsetX - 6} y={chartH - 2} textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">0</text>
        {/* Bars */}
        {snapshots.map((snap, i) => {
          const h = Math.max(4, (snap.wpm / maxWpm) * (chartH - 12));
          const x = offsetX + i * (barW + gap);
          const y = chartH - h - 4;
          const accColor = snap.accuracy >= 90 ? '#22c55e' : snap.accuracy >= 70 ? '#eab308' : '#ef4444';
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barW} height={h} rx={2}
                fill={accColor} opacity="0.85"
              >
                <animate
                  attributeName="height" from="0" to={h} dur="0.5s" begin={`${i * 0.08}s`} fill="freeze"
                />
                <animate
                  attributeName="y" from={chartH - 4} to={y} dur="0.5s" begin={`${i * 0.08}s`} fill="freeze"
                />
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export default function TypingRacer({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medio');
  const [botMode, setBotMode] = useState(false);
  const [race, setRace] = useState<RaceState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('typingracer-highscore');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [playerFinished, setPlayerFinished] = useState(false);
  const [botFinished, setBotFinished] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [wpmHistory, setWpmHistory] = useState<WpmSnapshot[]>([]);
  const [prevWpm, setPrevWpm] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number>(0);
  const raceRef = useRef<RaceState | null>(null);
  const phaseRef = useRef<GamePhase>('menu');
  const timeLeftRef = useRef(0);
  const wpmHistoryRef = useRef<WpmSnapshot[]>([]);
  const errorFlashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spring-animated values for car positions
  const playerProgressSpring = useSpring(0, { stiffness: 120, damping: 20 });
  const botProgressSpring = useSpring(0, { stiffness: 120, damping: 20 });
  const playerX = useTransform(playerProgressSpring, (v: number) => `${Math.max(2, (v / TOTAL_RACE_DISTANCE) * 82)}%`);
  const botX = useTransform(botProgressSpring, (v: number) => `${Math.max(2, (v / TOTAL_RACE_DISTANCE) * 82)}%`);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (race) {
      playerProgressSpring.set(race.playerProgress);
      botProgressSpring.set(race.botProgress);
    }
  }, [race, playerProgressSpring, botProgressSpring]);

  // Spawn particles
  const addParticles = useCallback((count: number, color: string) => {
    setParticles(prev => {
      const next = [...prev];
      for (let i = 0; i < count; i++) {
        next.push({
          x: 50 + Math.random() * 60,
          y: 0,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 3,
          life: 1,
          maxLife: 20 + Math.random() * 15,
          color,
          size: 2 + Math.random() * 3,
        });
      }
      return next;
    });
  }, []);

  // Particle animation loop
  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) return;
    const frame = () => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 1 / p.maxLife,
        }))
        .filter(p => p.life > 0)
      );
      animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [hasParticles]);

  const getRandomWord = useCallback((categories: string[]) => {
    const pool: string[] = [];
    for (const cat of categories) {
      pool.push(...(WORD_BANKS[cat] || []));
    }
    return pool[Math.floor(Math.random() * pool.length)] || 'palavra';
  }, []);

  const triggerErrorFlash = useCallback(() => {
    setErrorFlash(true);
    if (errorFlashTimeout.current) clearTimeout(errorFlashTimeout.current);
    errorFlashTimeout.current = setTimeout(() => setErrorFlash(false), 300);
  }, []);

  const startRace = useCallback(() => {
    const config = DIFFICULTY_WORDS[difficulty];
    const firstWord = getRandomWord(config.categories);

    const initial: RaceState = {
      currentWord: firstWord,
      typed: '',
      wordStartTime: Date.now(),
      wordsCompleted: 0,
      totalCorrectChars: 0,
      totalWrongChars: 0,
      totalCharsTyped: 0,
      combo: 0,
      bestCombo: 0,
      playerProgress: 0,
      botProgress: 0,
      round: 1,
      totalRounds: config.rounds,
      raceStartTime: Date.now(),
    };

    raceRef.current = initial;
    setRace(initial);
    setTimeLeft(config.wordTime);
    timeLeftRef.current = config.wordTime;
    setWpm(0);
    setPrevWpm(0);
    setAccuracy(100);
    setPlayerFinished(false);
    setBotFinished(false);
    setParticles([]);
    setWpmHistory([]);
    wpmHistoryRef.current = [];
    setErrorFlash(false);
    playerProgressSpring.set(0);
    botProgressSpring.set(0);
    setPhase('race');

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty, getRandomWord, playerProgressSpring, botProgressSpring]);

  // Word timer
  useEffect(() => {
    if (phase !== 'race' || !race) return;
    const config = DIFFICULTY_WORDS[difficulty];

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - (raceRef.current?.wordStartTime || now);
      const remaining = Math.max(0, config.wordTime - elapsed);
      timeLeftRef.current = remaining;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (raceRef.current) {
          raceRef.current.totalWrongChars += raceRef.current.currentWord.length;
          raceRef.current.totalCharsTyped += raceRef.current.currentWord.length;
          raceRef.current.combo = 0;
          triggerErrorFlash();
          advanceWord(raceRef.current, false);
        }
      }
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, race, difficulty, triggerErrorFlash]); // eslint-disable-line

  // Bot typing
  useEffect(() => {
    if (phase !== 'race' || !botMode) {
      if (botIntervalRef.current) { clearInterval(botIntervalRef.current); botIntervalRef.current = null; }
      return;
    }
    const config = DIFFICULTY_WORDS[difficulty];

    if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    botIntervalRef.current = setInterval(() => {
      if (!raceRef.current || playerFinished) return;
      const botStep = config.botSpeed * 1.8;
      raceRef.current.botProgress = Math.min(TOTAL_RACE_DISTANCE, raceRef.current.botProgress + botStep);
      setRace({ ...raceRef.current });

      if (raceRef.current.botProgress >= TOTAL_RACE_DISTANCE && !botFinished) {
        setBotFinished(true);
      }
    }, 200);

    return () => { if (botIntervalRef.current) { clearInterval(botIntervalRef.current); botIntervalRef.current = null; } };
  }, [phase, botMode, difficulty, playerFinished, botFinished]);

  const recordWpmSnapshot = useCallback((current: RaceState) => {
    const elapsed = (Date.now() - current.raceStartTime) / 60000;
    if (elapsed < 0.05) return;
    const snapWpm = Math.round((current.totalCorrectChars / 5) / elapsed);
    const totalTyped = current.totalCorrectChars + current.totalWrongChars;
    const snapAcc = totalTyped > 0 ? Math.round((current.totalCorrectChars / totalTyped) * 100) : 100;
    const snapshot: WpmSnapshot = { word: current.wordsCompleted, wpm: snapWpm, accuracy: snapAcc };
    wpmHistoryRef.current = [...wpmHistoryRef.current, snapshot];
    setWpmHistory(wpmHistoryRef.current);
  }, []);

  const advanceWord = useCallback((current: RaceState, wasPerfect: boolean) => {
    const config = DIFFICULTY_WORDS[difficulty];

    if (wasPerfect) {
      current.combo++;
      if (current.combo > current.bestCombo) current.bestCombo = current.combo;
    } else {
      current.combo = 0;
    }

    recordWpmSnapshot(current);

    const progressPerWord = TOTAL_RACE_DISTANCE / current.totalRounds;
    current.playerProgress = Math.min(TOTAL_RACE_DISTANCE, current.playerProgress + progressPerWord);
    current.wordsCompleted++;
    current.round++;

    if (current.round > current.totalRounds) {
      setPlayerFinished(true);
      const totalTime = (Date.now() - current.raceStartTime) / 60000;
      const totalChars = current.totalCorrectChars + current.totalWrongChars;
      const finalWpm = totalTime > 0 ? Math.round((current.totalCorrectChars / 5) / totalTime) : 0;
      const finalAccuracy = totalChars > 0 ? Math.round((current.totalCorrectChars / totalChars) * 100) : 100;
      setWpm(finalWpm);
      setAccuracy(finalAccuracy);
      addParticles(15, '#22c55e');

      if (finalWpm > highScore) {
        setHighScore(finalWpm);
        localStorage.setItem('typingracer-highscore', finalWpm.toString());
      }
      if (onScore) onScore('Corrida de Digitacao', finalWpm);

      setTimeout(() => setPhase('results'), 800);
      return;
    }

    current.currentWord = getRandomWord(config.categories);
    current.typed = '';
    current.wordStartTime = Date.now();
    timeLeftRef.current = config.wordTime;
    setTimeLeft(config.wordTime);

    if (wasPerfect) addParticles(6, '#fbbf24');

    setRace({ ...current });
  }, [difficulty, getRandomWord, highScore, onScore, addParticles, recordWpmSnapshot]);

  // Handle typing input
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!raceRef.current || phaseRef.current !== 'race') return;
    const current = raceRef.current;
    const value = e.target.value;
    const word = current.currentWord;

    const prevTypedLen = current.typed.length;
    current.typed = value;
    current.totalCharsTyped++;

    if (value.length <= word.length) {
      const lastChar = value[value.length - 1];
      if (lastChar === word[value.length - 1]) {
        current.totalCorrectChars++;
      } else {
        current.totalWrongChars++;
        triggerErrorFlash();
        addParticles(3, '#ef4444');
      }
    }

    if (value.toLowerCase() === word.toLowerCase()) {
      const wasPerfect = value === word;
      e.target.value = '';
      advanceWord(current, wasPerfect);
    } else {
      setRace({ ...current });
    }

    const elapsed = (Date.now() - current.raceStartTime) / 60000;
    if (elapsed > 0.05) {
      const currentWpm = Math.round((current.totalCorrectChars / 5) / elapsed);
      setPrevWpm(wpm => wpm);
      setWpm(currentWpm);
    }
    const totalTyped = current.totalCorrectChars + current.totalWrongChars;
    setAccuracy(totalTyped > 0 ? Math.round((current.totalCorrectChars / totalTyped) * 100) : 100);
  }, [advanceWord, triggerErrorFlash, addParticles]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      if (errorFlashTimeout.current) clearTimeout(errorFlashTimeout.current);
    };
  }, []);

  const diffConfig = DIFFICULTY_WORDS[difficulty];
  const timerPercent = race ? (timeLeft / diffConfig.wordTime) * 100 : 100;
  const timerBarColor = timeLeft > 3000 ? 'from-emerald-500 to-emerald-400' : timeLeft > 1500 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';
  const timerGlow = timeLeft > 3000 ? 'shadow-emerald-500/40' : timeLeft > 1500 ? 'shadow-yellow-500/40' : 'shadow-red-500/40';
  const accuracyColor = accuracy >= 90 ? 'text-emerald-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400';
  const accuracyBg = accuracy >= 90 ? 'bg-emerald-700' : accuracy >= 70 ? 'bg-yellow-700' : 'bg-red-700';
  const progressPercent = race ? (race.playerProgress / TOTAL_RACE_DISTANCE) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 w-full relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-4 w-full">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <TrophySVG className="w-16 h-16" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Corrida de Digitacao</h2>
              <p className="text-sm text-slate-400 text-center">Digite o mais rapido para vencer a corrida!</p>

              {highScore > 0 && (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/60 bg-yellow-500/10">
                    <Trophy className="w-3 h-3 mr-1" />
                    Recorde: {highScore} WPM
                  </Badge>
                </motion.div>
              )}

              <div className="flex gap-2 w-full">
                {DIFFICULTY_OPTIONS.map(d => (
                  <Button
                    key={d}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'flex-1 text-xs transition-all duration-200',
                      difficulty === d
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-700 hover:bg-slate-600'
                    )}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => { setBotMode(false); startRace(); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:shadow-emerald-600/40"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Correr
                </Button>
                <Button
                  onClick={() => { setBotMode(true); startRace(); }}
                  variant="outline"
                  className="flex-1 border-violet-500/60 text-violet-400 hover:bg-violet-900/50 transition-all duration-200"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  vs Bot
                </Button>
              </div>

              <div className="text-xs text-slate-500 text-center space-y-1">
                <p>{diffConfig.rounds} palavras | {diffConfig.wordTime / 1000}s por palavra</p>
                <p>Categorias: {diffConfig.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}</p>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'race' && race && (
          <motion.div
            key="race"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col gap-3 w-full"
          >
            {/* ===== RACE TRACK ===== */}
            <div className="relative rounded-xl overflow-hidden border border-slate-700">
              <div
                className="h-44 relative"
                style={{
                  background: 'linear-gradient(180deg, #334155 0%, #1e293b 40%, #475569 40%, #475569 60%, #1e293b 60%, #334155 100%)',
                }}
              >
                {/* Center lane dashes */}
                <motion.div
                  className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 overflow-hidden"
                >
                  <motion.div
                    className="flex gap-4"
                    animate={{ x: [0, -64] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  >
                    {Array.from({ length: 30 }, (_, i) => (
                      <div key={i} className="w-5 h-0.5 bg-yellow-400/40 rounded-full shrink-0" />
                    ))}
                  </motion.div>
                </motion.div>

                {/* Finish line checkered */}
                <div className="absolute right-3 top-2 bottom-2 w-3 flex flex-col overflow-hidden">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
                    />
                  ))}
                </div>

                {/* Player car with spring animation */}
                <motion.div
                  className="absolute"
                  style={{ left: playerX, top: '18%' }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                >
                  {/* Exhaust trail */}
                  {race.playerProgress > 5 && (
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-50">
                      <motion.div
                        className="w-2 h-1 bg-gray-400 rounded-full"
                        animate={{ opacity: [0.5, 0], x: [-4, -12] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="w-1.5 h-0.5 bg-gray-500 rounded-full"
                        animate={{ opacity: [0.4, 0], x: [-3, -10] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: 0.15 }}
                      />
                    </div>
                  )}
                  <PlayerCarSVG className="w-10 h-6" />
                  <div className="text-[9px] text-emerald-400 font-bold text-center mt-0.5 tracking-wider">VOCE</div>
                </motion.div>

                {/* Bot car with spring animation */}
                {botMode && (
                  <motion.div
                    className="absolute"
                    style={{ left: botX, top: '58%' }}
                  >
                    <BotCarSVG className="w-10 h-6" />
                    <div className="text-[9px] text-violet-400 font-bold text-center mt-0.5 tracking-wider">BOT</div>
                  </motion.div>
                )}

                {/* Particles */}
                {particles.map((p, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: `${p.x}%`,
                      top: `${25 + p.y * 5}%`,
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      opacity: p.life,
                    }}
                  />
                ))}

                {/* Road edge lines */}
                <div className="absolute top-[40%] left-0 right-0 h-px bg-white/10" />
                <div className="absolute top-[60%] left-0 right-0 h-px bg-white/10" />
              </div>
            </div>

            {/* ===== STATS BAR ===== */}
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              {/* Animated WPM display */}
              <motion.div
                className="flex items-center gap-1 bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-700"
                key={wpm}
                initial={{ scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-white tabular-nums">{wpm}</span>
                <span className="text-[10px] text-slate-400 font-medium">WPM</span>
              </motion.div>

              {/* Accuracy with color indicator */}
              <motion.div
                className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1 border', accuracyBg, 'border-white/10')}
                key={accuracy}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Target className="w-3.5 h-3.5 text-white/70" />
                <span className="text-sm font-bold text-white tabular-nums">{accuracy}%</span>
              </motion.div>

              {/* Timer with urgency pulse */}
              <motion.div
                className="flex items-center gap-1 bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-700"
                animate={timeLeft <= 1500 ? { scale: [1, 1.05, 1] } : {}}
                transition={timeLeft <= 1500 ? { duration: 0.5, repeat: Infinity } : {}}
              >
                <Timer className={cn('w-3.5 h-3.5', timeLeft <= 1500 ? 'text-red-400' : 'text-slate-400')} />
                <span className={cn('text-sm font-bold tabular-nums', timeLeft <= 1500 ? 'text-red-400' : 'text-white')}>
                  {Math.ceil(timeLeft / 1000)}s
                </span>
              </motion.div>

              {/* Combo badge */}
              <AnimatePresence>
                {race.combo >= 2 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="flex items-center gap-1 bg-yellow-600/90 rounded-lg px-2.5 py-1 border border-yellow-500/50"
                  >
                    <Flame className="w-3.5 h-3.5 text-yellow-200" />
                    <span className="text-sm font-bold text-white">x{race.combo}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ===== ENHANCED PROGRESS BAR ===== */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium tabular-nums">{race.round}/{race.totalRounds}</span>
              <div className="flex-1 relative h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                {/* Glow background */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #22c55e 0%, #10b981 50%, #34d399 100%)',
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 12px rgba(34, 197, 94, 0.4), 0 0 4px rgba(34, 197, 94, 0.6)',
                  }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
                {/* Shine sweep effect */}
                <motion.div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{ width: `${progressPercent}%` }}
                >
                  <motion.div
                    className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-32px', '200px'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                  />
                </motion.div>
                {/* Segmented markers */}
                {Array.from({ length: race.totalRounds - 1 }, (_, i) => {
                  const markerPos = ((i + 1) / race.totalRounds) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px"
                      style={{
                        left: `${markerPos}%`,
                        backgroundColor: progressPercent >= markerPos ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  );
                })}
              </div>
              <Zap className={cn('w-3.5 h-3.5', progressPercent > 0 ? 'text-emerald-400' : 'text-slate-600')} />
            </div>

            {/* ===== CHARACTER-BY-CHARACTER WORD DISPLAY ===== */}
            <motion.div
              className={cn(
                'relative bg-slate-800 rounded-xl p-5 text-center min-h-[72px] flex items-center justify-center border transition-colors duration-200',
                errorFlash
                  ? 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-950/30'
                  : 'border-slate-700'
              )}
              animate={errorFlash ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
              transition={errorFlash ? { duration: 0.3 } : {}}
            >
              {/* Error flash overlay */}
              <AnimatePresence>
                {errorFlash && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-red-500/10 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>

              <div className="text-2xl font-mono font-bold tracking-[0.15em] relative z-10">
                {race.currentWord.split('').map((char, i) => {
                  const isTyped = i < race.typed.length;
                  const isCorrect = isTyped && race.typed[i] === char;
                  const isWrong = isTyped && race.typed[i] !== char;
                  const isCursor = i === race.typed.length;

                  return (
                    <span key={i} className="relative inline-block">
                      {/* Cursor indicator */}
                      {isCursor && (
                        <motion.span
                          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"
                          layoutId="cursor"
                          style={{ boxShadow: '0 0 6px rgba(52, 211, 153, 0.6)' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <motion.span
                        className={cn(
                          'inline-block transition-colors duration-100',
                          !isTyped && 'text-slate-500',
                          isCorrect && 'text-emerald-400',
                          isWrong && 'text-red-400',
                        )}
                        animate={
                          isWrong
                            ? { scale: [1, 1.2, 1], color: '#f87171' }
                            : isCorrect
                              ? { scale: [1.15, 1] }
                              : {}
                        }
                        transition={{ duration: 0.15 }}
                        style={
                          isWrong
                            ? { background: 'rgba(239, 68, 68, 0.15)', borderRadius: 4, padding: '0 1px' }
                            : undefined
                        }
                      >
                        {char}
                      </motion.span>
                    </span>
                  );
                })}
              </div>
            </motion.div>

            {/* ===== ENHANCED TIMER BAR ===== */}
            <div className="relative h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div
                className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-lg', timerBarColor, timerGlow)}
                style={{ width: `${timerPercent}%` }}
                transition={{ duration: 0.08, ease: 'linear' }}
              />
              {/* Urgency pulse overlay when low */}
              {timeLeft <= 1500 && timeLeft > 0 && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* ===== INPUT ===== */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                onChange={handleInput}
                className={cn(
                  'w-full bg-slate-800 border rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none transition-all duration-200',
                  errorFlash
                    ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/30'
                    : 'border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                )}
                placeholder="Digite aqui..."
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                <Keyboard className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'results' && race && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-emerald-950 border border-emerald-800/60 w-full relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-60 h-60 bg-emerald-500 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-4 w-full">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              >
                <TrophySVG className="w-14 h-14" color="#fbbf24" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Corrida Finalizada!</h2>

              {/* Stat cards with staggered animation */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <motion.div
                  className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 backdrop-blur"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Velocidade</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {wpm}
                    </motion.span>{' '}
                    <span className="text-xs text-slate-400 font-medium">WPM</span>
                  </p>
                </motion.div>

                <motion.div
                  className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 backdrop-blur"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Target className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Precisao</p>
                  </div>
                  <p className={cn('text-2xl font-bold tabular-nums', accuracyColor)}>{accuracy}%</p>
                </motion.div>

                <motion.div
                  className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 backdrop-blur"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Palavras</p>
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums">{race.wordsCompleted}/{race.totalRounds}</p>
                </motion.div>

                <motion.div
                  className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 backdrop-blur"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Flame className="w-3 h-3 text-yellow-500" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Melhor Combo</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400 tabular-nums">{race.bestCombo}</p>
                </motion.div>
              </div>

              {/* WPM Chart */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="w-full"
              >
                <WpmChart snapshots={wpmHistory} />
              </motion.div>

              {/* High score badge */}
              {wpm >= highScore && wpm > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                >
                  <Badge className="bg-yellow-600/90 text-white border border-yellow-500/50 shadow-lg shadow-yellow-600/20">
                    <Trophy className="w-3 h-3 mr-1" />
                    Novo Recorde!
                  </Badge>
                </motion.div>
              )}

              <div className="flex gap-2 w-full">
                <Button
                  onClick={startRace}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Correr Novamente
                </Button>
                <Button
                  onClick={() => setPhase('menu')}
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800 transition-all duration-200"
                >
                  Menu
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
