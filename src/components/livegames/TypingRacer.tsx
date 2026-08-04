'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Bot, Trophy, RotateCcw, Zap, Keyboard, Timer, Target, Flame, Car } from 'lucide-react';

// ===================== TYPES =====================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = 'menu' | 'race' | 'results';
type Difficulty = 'facil' | 'medio' | 'dificil';

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

// ===================== COMPONENT =====================

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

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number>(0);
  const raceRef = useRef<RaceState | null>(null);
  const phaseRef = useRef<GamePhase>('menu');
  const timeLeftRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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
    setAccuracy(100);
    setPlayerFinished(false);
    setBotFinished(false);
    setParticles([]);
    setPhase('race');

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [difficulty, getRandomWord]);

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
          advanceWord(raceRef.current, false);
        }
      }
    }, 50);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, race, difficulty]); // eslint-disable-line

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

  const advanceWord = useCallback((current: RaceState, wasPerfect: boolean) => {
    const config = DIFFICULTY_WORDS[difficulty];

    if (wasPerfect) {
      current.combo++;
      if (current.combo > current.bestCombo) current.bestCombo = current.combo;
    } else {
      current.combo = 0;
    }

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
  }, [difficulty, getRandomWord, highScore, onScore, addParticles]);

  // Handle typing input
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!raceRef.current || phaseRef.current !== 'race') return;
    const current = raceRef.current;
    const value = e.target.value;
    const word = current.currentWord;

    current.typed = value;
    current.totalCharsTyped++;

    if (value.length <= word.length) {
      const lastChar = value[value.length - 1];
      if (lastChar === word[value.length - 1]) {
        current.totalCorrectChars++;
      } else {
        current.totalWrongChars++;
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
      setWpm(currentWpm);
    }
    const totalTyped = current.totalCorrectChars + current.totalWrongChars;
    setAccuracy(totalTyped > 0 ? Math.round((current.totalCorrectChars / totalTyped) * 100) : 100);
  }, [advanceWord]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, []);

  const getCharClass = useCallback((i: number, word: string, typed: string) => {
    if (i >= typed.length) return 'text-gray-500';
    return typed[i] === word[i] ? 'text-emerald-400' : 'text-red-400 bg-red-500/20 rounded';
  }, []);

  const diffConfig = DIFFICULTY_WORDS[difficulty];
  const timerBarColor = timeLeft > 3000 ? 'bg-emerald-500' : timeLeft > 1500 ? 'bg-yellow-500' : 'bg-red-500';
  const accuracyColor = accuracy >= 90 ? 'text-emerald-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-red-400';
  const accuracyBg = accuracy >= 90 ? 'bg-emerald-700' : accuracy >= 70 ? 'bg-yellow-700' : 'bg-red-700';
  const playerLeft = race ? `${Math.max(2, (race.playerProgress / TOTAL_RACE_DISTANCE) * 82)}%` : '2%';
  const botLeft = race ? `${Math.max(2, (race.botProgress / TOTAL_RACE_DISTANCE) * 82)}%` : '2%';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 w-full"
          >
            <div className="text-5xl">🏎️</div>
            <h2 className="text-2xl font-bold text-white">Corrida de Digitacao</h2>
            <p className="text-sm text-slate-400 text-center">Digite o mais rapido para vencer a corrida!</p>

            {highScore > 0 && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                <Trophy className="w-3 h-3 mr-1" />
                Recorde: {highScore} WPM
              </Badge>
            )}

            <div className="flex gap-2 w-full">
              {DIFFICULTY_OPTIONS.map(d => (
                <Button
                  key={d}
                  size="sm"
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    'flex-1 text-xs',
                    difficulty === d ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'
                  )}
                >
                  {DIFFICULTY_LABELS[d]}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 w-full">
              <Button
                onClick={() => { setBotMode(false); startRace(); }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Correr
              </Button>
              <Button
                onClick={() => { setBotMode(true); startRace(); }}
                variant="outline"
                className="flex-1 border-violet-500 text-violet-400 hover:bg-violet-900"
              >
                <Bot className="w-4 h-4 mr-2" />
                vs Bot
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center space-y-1">
              <p>{diffConfig.rounds} palavras | {diffConfig.wordTime / 1000}s por palavra</p>
              <p>Categorias: {diffConfig.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}</p>
            </div>
          </motion.div>
        )}

        {phase === 'race' && race && (
          <motion.div
            key="race"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-3 w-full"
          >
            <div className="relative rounded-xl overflow-hidden border border-slate-700">
              <div
                className="h-48 relative"
                style={{
                  background: 'linear-gradient(180deg, #334155 0%, #1e293b 40%, #475569 40%, #475569 60%, #1e293b 60%, #334155 100%)',
                }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full flex flex-col gap-3 items-center pt-2">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="w-6 h-1 bg-yellow-400/60 rounded" />
                  ))}
                </div>

                <div className="absolute right-4 top-0 bottom-0 w-1 bg-white/40" />
                <div className="absolute right-4 top-0 bottom-0 w-1 bg-black/40" style={{ marginLeft: 3 }} />
                <div className="absolute right-8 text-xs text-white/50 font-bold -rotate-90" style={{ top: '50%' }}>
                  CHEGADA
                </div>

                <div
                  className="absolute transition-all duration-300 ease-out"
                  style={{ left: playerLeft, top: '25%' }}
                >
                  <div className="text-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                    🏎️
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold text-center mt-0.5">VOCE</div>
                </div>

                {botMode && (
                  <div
                    className="absolute transition-all duration-300 ease-out"
                    style={{ left: botLeft, top: '55%' }}
                  >
                    <div className="text-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                      🤖
                    </div>
                    <div className="text-[10px] text-violet-400 font-bold text-center mt-0.5">BOT</div>
                  </div>
                )}

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
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-1">
              <Badge variant="secondary" className="bg-slate-700 text-white text-xs">
                <Keyboard className="w-3 h-3 mr-1" />
                {wpm} WPM
              </Badge>
              <Badge variant="secondary" className={cn('text-white text-xs', accuracyBg)}>
                <Target className="w-3 h-3 mr-1" />
                {accuracy}%
              </Badge>
              <Badge variant="secondary" className="bg-slate-700 text-white text-xs">
                <Timer className="w-3 h-3 mr-1" />
                {Math.ceil(timeLeft / 1000)}s
              </Badge>
              {race.combo >= 2 && (
                <Badge variant="secondary" className="bg-yellow-600 text-white text-xs animate-pulse">
                  <Flame className="w-3 h-3 mr-1" />
                  x{race.combo}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Palavra {race.round}/{race.totalRounds}</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(race.playerProgress / TOTAL_RACE_DISTANCE) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 text-center min-h-[64px] flex items-center justify-center">
              <div className="text-2xl font-mono font-bold tracking-wider">
                {race.currentWord.split('').map((char, i) => (
                  <span key={i} className={getCharClass(i, race.currentWord, race.typed)}>
                    {char}
                  </span>
                ))}
              </div>
            </div>

            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-75', timerBarColor)}
                style={{ width: `${(timeLeft / diffConfig.wordTime) * 100}%` }}
              />
            </div>

            <input
              ref={inputRef}
              type="text"
              onChange={handleInput}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Digite aqui..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </motion.div>
        )}

        {phase === 'results' && race && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-emerald-950 border border-emerald-800 w-full"
          >
            <div className="text-4xl">🏆</div>
            <h2 className="text-2xl font-bold text-white">Corrida Finalizada!</h2>

            <div className="grid grid-cols-2 gap-3 w-full text-center">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Velocidade</p>
                <p className="text-2xl font-bold text-emerald-400">{wpm} <span className="text-sm">WPM</span></p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Precisao</p>
                <p className={cn('text-2xl font-bold', accuracyColor)}>{accuracy}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Palavras</p>
                <p className="text-2xl font-bold text-white">{race.wordsCompleted}/{race.totalRounds}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Melhor Combo</p>
                <p className="text-2xl font-bold text-yellow-400">{race.bestCombo}</p>
              </div>
            </div>

            {wpm >= highScore && wpm > 0 && (
              <Badge className="bg-yellow-600 text-white animate-pulse">
                <Trophy className="w-3 h-3 mr-1" />
                Novo Recorde!
              </Badge>
            )}

            <div className="flex gap-2 w-full">
              <Button onClick={startRace} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Correr Novamente
              </Button>
              <Button onClick={() => setPhase('menu')} variant="outline" className="border-slate-600 text-white">
                Menu
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
