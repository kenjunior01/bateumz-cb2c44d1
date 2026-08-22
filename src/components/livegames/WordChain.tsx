import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Send,
  Heart,
  Type,
  Trophy,
  Zap,
  Link2,
  Clock,
  ChevronRight,
  Flame,
  Skull,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const WORDS: string[] = [
  "GATO","CACHORRO","ELEFANTE","TIGRE","LEAO","ABELHA","RATO","BOI","URSO","CAMELO",
  "PAPAGAIO","TARTARUGA","GOLFINHO","BORBOLETA","PENGUIM","CROCODILO","GIRASSOL","MONTANHA",
  "RIO","MAR","TERRA","LUZ","SOL","LUA","ESTRELA","NUVEM","CHUVA","VENTO","FOGO",
  "AGUA","PEDRA","AREIA","FLORESTA","JARDIM","CASA","PORTA","JANELA","TELA","MESA",
  "CADEIRA","LIVRO","CANETA","PAPEL","TELEFONE","COMPUTADOR","CARRO","BICICLETA","AVIAO",
  "BARCO","TREM","PONTE","ESTRADA","CIDADE","PRACA","MERCADO","ESCOLA","HOSPITAL",
  "RESTAURANTE","HOTEL","BANCO","BIBLIOTECA","MUSEU","CINEMA","TEATRO","IGREJA",
  "FUTEBOL","BASQUETE","TENIS","NATACAO","VOLEI","BOXE","SURFE","CORRIDA","DANCA",
  "MUSICA","GUITARRA","PIANO","TAMBOR","FLAUTA","VIOLAO","CANTAR","TOCAR",
  "ARROZ","FEIJAO","MACARRAO","CARNE","FRANGO","PEIXE","SALADA","SOPA","BOLO",
  "CHOCOLATE","MORANGO","BANANA","ABACAXI","LARANJA","MANGA","CEREJA","UVA",
  "MEL","ACUCAR","SAL","LEITE","CAFE","SUCO","GOIABA","VERMELHO","AZUL",
  "VERDE","AMARELO","ROXO","BRANCO","PRETO","CINZA","FELIZ","TRISTE",
  "RAIVA","MEDO","AMOR","PAZ","GUERRA","VIDA","NOITE","MANHA","TARDE",
  "HORA","MINUTO","SEMANA","MES","ANO","PORTUGAL","BRASIL","FRANCA","ITALIA",
  "JAPAO","MEXICO","ALEMANHA","CHILE","EUROPA","AMERICA","AFRICA","ASIA",
  "OCEANO","CONTINENTE","ILHA","VULCAO","DINHEIRO","MOEDA","OURO","PRATA",
  "DIAMANTE","TESOURO","RIQUEZA","CABECA","CORACAO","FORCA","GRANDE","PEQUENO",
  "FORTE","RAPIDO","LENTO","ALTO","BAIXO","QUENTE","FRIO","BOM",
  "ABERTO","FECHADO","LIMPO","SUJO","NOVO","VELHO","BONITO","FEIO",
  "FACIL","DIFICIL","VERDADE","MENTIRA","HISTORIA","POEMA","ROMANCE",
  "TRABALHO","FESTA","NATAL","VERAO","INVERNO","PRIMAVERA","OUTONO",
  "DINOSSAURO","PIRATA","NINJA","SAMURAI","CAVALEIRO","PRINCESA","DRAGAO","FADA",
  "GUERREIRO","MAGICO","SECRETO","ORIGAMI","SAFARI","AVENTURA","MISTERIO","DESCOBERTA",
  "VIAGEM","CAMINHO","DESTINO","HORIZONTE","AURORA","TEMPESTADE","TROVAO","RELAMPAGO",
  "ARCOIRIS","CACHOEIRA","LAGO","DESERTO","GELO","NEVE","FOGUEIRA","ACAMPAMENTO",
];

const normalize = (w: string) => w.trim().toUpperCase().replace(/[^A-Z\u00C0-\u00FF]/g, "");

const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];

/* ── Timer Ring ──────────────────────────────────────────── */
const TimerRing = ({ time, max, player }: { time: number; max: number; player: 1 | 2 }) => {
  const pct = time / max;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = player === 1 ? "cyan" : "pink";
  const isDanger = time <= 5;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="4" />
        <motion.circle
          cx="28" cy="28" r={r} fill="none"
          stroke="currentColor"
          className={cn(
            isDanger ? "text-red-500" : color === "cyan" ? "text-cyan-400" : "text-pink-400"
          )}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <motion.span
        key={time}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "text-lg font-black tabular-nums",
          isDanger ? "text-red-400" : color === "cyan" ? "text-cyan-300" : "text-pink-300"
        )}
      >
        {time}
      </motion.span>
      {isDanger && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500/40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  );
};

/* ── Confetti Particle ──────────────────────────────────── */
const ConfettiParticle = ({ delay, color, x }: { delay: number; color: string; x: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-sm"
    style={{ backgroundColor: color, left: `${x}%`, top: "-5%" }}
    initial={{ y: 0, rotate: 0, opacity: 1 }}
    animate={{ y: 350, rotate: 720, opacity: 0 }}
    transition={{ duration: 2.5, delay, ease: "easeIn" }}
  />
);

/* ── Letter Tile ────────────────────────────────────────── */
const LetterTile = ({
  char,
  index,
  isLink,
  isFirst,
  player,
}: {
  char: string;
  index: number;
  isLink: boolean;
  isFirst: boolean;
  player: 1 | 2;
}) => {
  const baseBg = player === 1 ? "bg-cyan-500/10 border-cyan-500/30" : "bg-pink-500/10 border-pink-500/30";
  const baseText = player === 1 ? "text-cyan-300" : "text-pink-300";
  const linkGlow = isLink
    ? player === 1
      ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
      : "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
    : "";

  return (
    <motion.span
      initial={{ scale: 0, rotateY: -90 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{
        delay: index * 0.04,
        type: "spring",
        stiffness: 500,
        damping: 25,
      }}
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs font-bold",
        baseBg,
        baseText,
        linkGlow,
        isFirst && "border-l-2"
      )}
    >
      {char}
    </motion.span>
  );
};

/* ── Chain Word Card ────────────────────────────────────── */
const ChainWordCard = ({
  word,
  player,
  index,
  isLast,
}: {
  word: string;
  player: 1 | 2;
  index: number;
  isLast: boolean;
}) => {
  const borderColor = player === 1 ? "border-cyan-500/30" : "border-pink-500/30";
  const bgGlow = player === 1 ? "shadow-[0_0_12px_rgba(6,182,212,0.1)]" : "shadow-[0_0_12px_rgba(236,72,153,0.1)]";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.05,
        type: "spring",
        stiffness: 350,
        damping: 25,
      }}
      className={cn(
        "shrink-0 flex items-center gap-0.5 px-2 py-1.5 rounded-xl border",
        borderColor,
        bgGlow,
        isLast && (player === 1 ? "bg-cyan-500/5" : "bg-pink-500/5")
      )}
    >
      {word.split("").map((c, ci) => (
        <LetterTile
          key={ci}
          char={c}
          index={ci}
          isLink={ci === word.length - 1 && !isLast}
          isFirst={ci === 0}
          player={player}
        />
      ))}
    </motion.div>
  );
};

/* ── Chain Connector ────────────────────────────────────── */
const ChainConnector = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    className="shrink-0 flex items-center"
  >
    <div className="flex items-center">
      <div className="w-3 h-px bg-gradient-to-r from-amber-500/60 to-amber-500/20" />
      <Link2 className="w-3 h-3 text-amber-500/50 mx-0.5" />
      <div className="w-3 h-px bg-gradient-to-l from-amber-500/60 to-amber-500/20" />
    </div>
  </motion.div>
);

/* ── Main Component ─────────────────────────────────────── */
const WordChain = ({ onScore, liveCode }: Props) => {
  const [chain, setChain] = useState<string[]>([]);
  const [chainPlayers, setChainPlayers] = useState<(1 | 2)[]>([]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [current, setCurrent] = useState<1 | 2>(1);
  const [lives, setLives] = useState({ p1: 3, p2: 3 });
  const [timer, setTimer] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [message, setMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const chainEndRef = useRef<HTMLDivElement>(null);

  const requiredLetter = chain.length > 0
    ? normalize(chain[chain.length - 1]).slice(-1)
    : null;

  const startGame = useCallback(() => {
    const first = getRandomWord();
    setChain([first]);
    setChainPlayers([1]);
    setUsed(new Set([normalize(first)]));
    setCurrent(2);
    setLives({ p1: 3, p2: 3 });
    setTimer(15);
    setGameOver(false);
    setWinner(null);
    setMessage("");
    setStarted(true);
    setInput("");
    setShakeInput(false);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          loseLife();
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, gameOver, current]);

  const loseLife = useCallback(() => {
    setLives(prev => {
      const next = current === 1
        ? { ...prev, p1: prev.p1 - 1 }
        : { ...prev, p2: prev.p2 - 1 };
      const dead = current === 1 ? next.p1 <= 0 : next.p2 <= 0;
      if (dead) {
        setGameOver(true);
        setWinner(current === 1 ? 2 : 1);
        setMessage(`Jogador ${current === 1 ? 2 : 1} Venceu!`);
        onScore?.(current === 1 ? "Jogador 2" : "Jogador 1", (chain.length) * 10 + (current === 1 ? next.p2 : next.p1) * 5);
      } else {
        setMessage("Tempo esgotado! Vida perdida.");
        setCurrent(current === 1 ? 2 : 1);
        setTimer(15);
      }
      return next;
    });
  }, [current, chain.length, onScore]);

  const triggerShake = useCallback(() => {
    setShakeInput(true);
    setTimeout(() => setShakeInput(false), 500);
  }, []);

  const submitWord = useCallback(() => {
    const word = normalize(input);
    if (!word || word.length < 3) {
      setMessage("M\u00ednimo 3 letras!");
      triggerShake();
      return;
    }
    if (requiredLetter && word[0] !== requiredLetter) {
      setMessage(`Deve come\u00e7ar com "${requiredLetter}"!`);
      triggerShake();
      return;
    }
    if (used.has(word)) {
      setMessage("Palavra j\u00e1 usada!");
      triggerShake();
      return;
    }
    setMessage("");
    const newChain = [...chain, word];
    setChain(newChain);
    setChainPlayers([...chainPlayers, current]);
    setUsed(prev => new Set([...prev, word]));
    setInput("");
    setCurrent(current === 1 ? 2 : 1);
    setTimer(15);
  }, [input, requiredLetter, used, chain, chainPlayers, current, triggerShake]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitWord();
  }, [submitWord]);

  useEffect(() => { inputRef.current?.focus(); }, [current, started]);

  /* Auto-scroll chain to end */
  useEffect(() => {
    setTimeout(() => {
      chainEndRef.current?.scrollIntoView({ behavior: "smooth", inline: "end" });
    }, 100);
  }, [chain.length]);

  /* Confetti colors for game over */
  const confettiColors = ["#06b6d4", "#ec4899", "#a855f7", "#f59e0b", "#22c55e", "#ef4444"];

  const playerColor = current === 1 ? "cyan" : "pink";

  return (
    <div className="space-y-4">
      {/* ── Header / Player Status Bar ── */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 backdrop-blur-sm">
        <div className="text-center flex-1">
          <motion.p
            key={current === 1 ? "p1-active" : "p1-idle"}
            animate={{ scale: current === 1 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1.5, repeat: current === 1 ? Infinity : 0 }}
            className={cn("text-sm font-bold", current === 1 ? "text-cyan-400" : "text-slate-500")}
          >
            Jogador 1
          </motion.p>
          <div className="flex gap-1 justify-center mt-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                animate={i >= lives.p1 ? { scale: [1, 1.3, 0.8], opacity: [1, 0.5, 0.3] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Heart className={cn("w-4 h-4 transition-colors", i < lives.p1 ? "text-red-500 fill-red-500" : "text-slate-700")} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center info */}
        <div className="text-center px-3 flex flex-col items-center gap-1.5">
          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] font-semibold tracking-wider">
            CORRENTE DE PALAVRAS
          </Badge>
          <p className="text-[10px] text-slate-500 font-medium">
            {chain.length} {chain.length === 1 ? "palavra" : "palavras"}
          </p>
          {started && !gameOver && (
            <TimerRing time={timer} max={15} player={current} />
          )}
        </div>

        <div className="text-center flex-1">
          <motion.p
            key={current === 2 ? "p2-active" : "p2-idle"}
            animate={{ scale: current === 2 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1.5, repeat: current === 2 ? Infinity : 0 }}
            className={cn("text-sm font-bold", current === 2 ? "text-pink-400" : "text-slate-500")}
          >
            Jogador 2
          </motion.p>
          <div className="flex gap-1 justify-center mt-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                animate={i >= lives.p2 ? { scale: [1, 1.3, 0.8], opacity: [1, 0.5, 0.3] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Heart className={cn("w-4 h-4 transition-colors", i < lives.p2 ? "text-red-500 fill-red-500" : "text-slate-700")} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Turn Indicator Bar ── */}
      <AnimatePresence mode="wait">
        {started && !gameOver && (
          <motion.div
            key={`turn-${current}`}
            initial={{ opacity: 0, x: current === 1 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: current === 1 ? 30 : -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "relative overflow-hidden rounded-xl border px-4 py-2.5",
              current === 1
                ? "bg-cyan-500/5 border-cyan-500/30"
                : "bg-pink-500/5 border-pink-500/30"
            )}
          >
            {/* Animated glow bar at top */}
            <motion.div
              className={cn(
                "absolute top-0 left-0 h-0.5",
                current === 1 ? "bg-cyan-400" : "bg-pink-400"
              )}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 15, ease: "linear" }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    current === 1 ? "bg-cyan-400" : "bg-pink-400"
                  )}
                />
                <p className={cn(
                  "text-xs font-bold tracking-wide",
                  current === 1 ? "text-cyan-400" : "text-pink-400"
                )}>
                  VEZ DE JOGADOR {current}
                </p>
              </div>
              {requiredLetter && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Proxima letra:</span>
                  <motion.div
                    key={requiredLetter}
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40"
                  >
                    <span className="text-lg font-black text-amber-400">{requiredLetter}</span>
                  </motion.div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2.5">
              <motion.input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Palavra com "${requiredLetter || "?"}"...`}
                animate={shakeInput ? { x: [-4, 4, -3, 3, -1, 1, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
              />
              <Button
                onClick={submitWord}
                className={cn(
                  "rounded-xl text-white font-semibold",
                  current === 1
                    ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500"
                    : "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500"
                )}
              >
                <Send className="w-4 h-4 mr-1" /> Enviar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error / Info Message ── */}
      <AnimatePresence>
        {message && !gameOver && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "text-center text-sm font-medium",
              message.includes("usada") || message.includes("come") || message.includes("M\u00ednimo")
                ? "text-red-400"
                : "text-amber-400"
            )}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Start Screen ── */}
      {!started && (
        <div className="text-center py-12 relative overflow-hidden">
          {/* Background decorative letters */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
            {"CORRENTE".split("").map((c, i) => (
              <span key={i} className="text-7xl font-black mx-1">{c}</span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 mb-4">
              <Type className="w-10 h-10 text-violet-400" />
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-3 h-3 text-amber-400" />
              </motion.div>
            </div>
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-white mb-2"
          >
            Corrente de Palavras
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-400 mb-6 max-w-xs mx-auto"
          >
            A ultima letra vira a primeira. Nao repita palavras!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl px-8 py-5 text-base font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
            >
              Iniciar Jogo
            </Button>
          </motion.div>
        </div>
      )}

      {/* ── Word Chain Visualization ── */}
      {started && chain.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 px-1 scrollbar-thin">
          {chain.map((w, i) => (
            <div key={`${i}-${w}`} className="flex items-center shrink-0">
              <ChainWordCard
                word={w}
                player={(chainPlayers[i] ?? ((i % 2 === 0) ? 1 : 2)) as 1 | 2}
                index={i}
                isLast={i === chain.length - 1}
              />
              {i < chain.length - 1 && <ChainConnector />}
            </div>
          ))}
          {/* Cursor indicator at end of chain */}
          {!gameOver && (
            <div className="shrink-0 flex items-center">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-slate-600"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </motion.div>
            </div>
          )}
          <div ref={chainEndRef} />
        </div>
      )}

      {/* ── Game Over Screen ── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center"
          >
            {/* Confetti particles */}
            {confettiColors.map((color, i) => (
              <ConfettiParticle
                key={i}
                delay={i * 0.15}
                color={color}
                x={10 + (i * 16)}
              />
            ))}

            {/* Trophy icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mb-4"
            >
              <Trophy className="w-10 h-10 text-amber-400" />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "text-2xl font-black",
                winner === 1 ? "text-cyan-400" : "text-pink-400"
              )}
            >
              {message}
            </motion.h3>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-3 mt-5 mb-5"
            >
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-black text-white">{chain.length}</p>
                <p className="text-[10px] text-slate-500 font-medium">PALAVRAS</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <Heart className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-lg font-black text-white">{winner === 1 ? lives.p1 : lives.p2}</p>
                <p className="text-[10px] text-slate-500 font-medium">VIDAS REST.</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <Clock className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                <p className="text-lg font-black text-white">{chain.length * 10 + (winner === 1 ? lives.p1 : lives.p2) * 5}</p>
                <p className="text-[10px] text-slate-500 font-medium">PONTOS</p>
              </div>
            </motion.div>

            {/* Loser indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-1.5 mb-4"
            >
              <Skull className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs text-slate-500">
                Jogador {winner === 1 ? 2 : 1} ficou sem vidas
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl px-8 py-5 font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
              >
                Jogar Novamente
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Restart Button ── */}
      <div className="flex justify-center">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-slate-700 text-slate-400 hover:text-slate-300 hover:border-slate-600"
          onClick={startGame}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />Reiniciar
        </Button>
      </div>
    </div>
  );
};

export default WordChain;
