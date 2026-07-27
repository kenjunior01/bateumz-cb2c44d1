import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BichoProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const ANIMAIS = [
  { nome: "Avestruz", emoji: "🦥", numero: 1 },
  { nome: "Águia", emoji: "🦅", numero: 2 },
  { nome: "Burro", emoji: "🐎", numero: 3 },
  { nome: "Borboleta", emoji: "💸", numero: 4 },
  { nome: "Cachorro", emoji: "🐶", numero: 5 },
  { nome: "Cabra", emoji: "🐐", numero: 6 },
  { nome: "Carneiro", emoji: "🐑", numero: 7 },
  { nome: "Camelo", emoji: "🐯", numero: 8 },
  { nome: "Cobra", emoji: "🐍", numero: 9 },
  { nome: "Coelho", emoji: "🐰", numero: 10 },
  { nome: "Cavalo", emoji: "🐴", numero: 11 },
  { nome: "Elefante", emoji: "🐘", numero: 12 },
  { nome: "Galo", emoji: "🐓", numero: 13 },
  { nome: "Gato", emoji: "🐱", numero: 14 },
  { nome: "Jacaré", emoji: "🦩", numero: 15 },
  { nome: "Leão", emoji: "🦁", numero: 16 },
  { nome: "Macaco", emoji: "🐵", numero: 17 },
  { nome: "Porco", emoji: "🐷", numero: 18 },
  { nome: "Pavão", emoji: "🦩", numero: 19 },
  { nome: "Peru", emoji: "🐔", numero: 20 },
  { nome: "Touro", emoji: "🐂", numero: 21 },
  { nome: "Tigre", emoji: "🐯", numero: 22 },
  { nome: "Urso", emoji: "🐻", numero: 23 },
  { nome: "Veado", emoji: "🦌", numero: 24 },
  { nome: "Vaca", emoji: "🐮", numero: 25 },
];

const CapulanaPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="bicho-cap" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="none" />
        <path d="M0 0L20 20L40 0" stroke="#FFD700" strokeWidth="1" fill="none" />
        <path d="M0 20L20 40L40 20" stroke="#009140" strokeWidth="1" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#FF0000" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
        <circle cx="40" cy="40" r="2" fill="#009140" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#bicho-cap)" />
  </svg>
);

const FRASES = ["Boa!", "Eish!", "Kupa!", "Tse!", "Forte!", "Pega!", "Aye!", "Azar!", "Sorte!", "Tenta!"];

const randFrase = () => FRASES[Math.floor(Math.random() * FRASES.length)];

export default function BichoGame({ onScore, liveCode }: BichoProps) {
  const [phase, setPhase] = useState<"menu" | "countdown" | "playing" | "result">("menu");
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [round, setRound] = useState(0);
  const maxRounds = 5;
  const [coins, setCoins] = useState(100);
  const [bet, setBet] = useState(10);
  const [selectedAnimal, setSelectedAnimal] = useState<number | null>(null);
  const [betType, setBetType] = useState<"animal" | "grupo" | "dezena" | "centena" | "milhar">("animal");
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [customNumber, setCustomNumber] = useState("");
  const [drawnNumber, setDrawnNumber] = useState<number | null>(null);
  const [drawnAnimal, setDrawnAnimal] = useState<typeof ANIMAIS[0] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const pRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const addParticle = useCallback((x: number, y: number, color: string) => {
    const id = pRef.current++;
    setParticles(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 800);
  }, []);

  const drawNumber = useCallback(() => {
    const num = Math.floor(Math.random() * 10000);
    return num;
  }, []);

  const getAnimalByNumber = useCallback((num: number) => {
    const last2 = num % 100;
    const group = Math.floor(last2 / 4);
    return ANIMAIS[group] || ANIMAIS[0];
  }, []);

  const checkWin = useCallback((drawn: number, selAnimal: number, selGrupo: number | null, selType: string, custom: string) => {
    const last4 = drawn;
    const last3 = drawn % 1000;
    const last2 = drawn % 100;
    const drawnGroup = Math.floor(last2 / 4);
    const drawnAnimalIdx = drawnGroup;

    if (selType === "animal") {
      return drawnAnimalIdx === selAnimal;
    } else if (selType === "grupo") {
      return drawnGroup === selGrupo;
    } else if (selType === "dezena") {
      const cNum = parseInt(custom);
      if (isNaN(cNum)) return false;
      return Math.floor(last2 / 10) === Math.floor(cNum / 10);
    } else if (selType === "centena") {
      const cNum = parseInt(custom);
      if (isNaN(cNum)) return false;
      return Math.floor(last3 / 100) === Math.floor(cNum / 100);
    } else if (selType === "milhar") {
      const cNum = parseInt(custom);
      if (isNaN(cNum)) return false;
      return last4 === cNum;
    }
    return false;
  }, []);

  const getMultiplier = useCallback((type: string) => {
    switch (type) {
      case "animal": return 3;
      case "grupo": return 6;
      case "dezena": return 12;
      case "centena": return 50;
      case "milhar": return 200;
      default: return 3;
    }
  }, []);

  const botBet = useCallback(() => {
    const difficulties = { Facil: 0.25, Medio: 0.35, Dificil: 0.45 };
    const prob = difficulties[difficulty];
    const bType = Math.random() < prob ? "animal" : Math.random() < 0.5 ? "grupo" : "dezena";
    const bAnimal = Math.floor(Math.random() * 25);
    const bGrupo = Math.floor(Math.random() * 25);
    const bNum = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    return { type: bType, animal: bAnimal, grupo: bGrupo, num: bNum };
  }, [difficulty]);

  const startGame = useCallback(() => {
    setScore({ p1: 0, p2: 0 });
    setRound(0);
    setCoins(100);
    setBet(10);
    setSelectedAnimal(null);
    setBetType("animal");
    setSelectedGrupo(null);
    setCustomNumber("");
    setDrawnNumber(null);
    setDrawnAnimal(null);
    setShowResult(false);
    setPhase("countdown");
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (phase === "countdown") {
      const t = setTimeout(() => setCountdown(c => {
        if (c <= 1) { setPhase("playing"); return 0; }
        return c - 1;
      }), 800);
      return () => clearTimeout(t);
    }
  }, [phase, countdown]);

  const placeBet = useCallback(() => {
    if (coins <= 0) return;
    if (betType === "animal" && selectedAnimal === null) return;
    if (betType === "grupo" && selectedGrupo === null) return;
    if ((betType === "dezena" || betType === "centena" || betType === "milhar") && !customNumber) return;

    setIsDrawing(true);
    setShowResult(false);

    setTimeout(() => {
      const drawn = drawNumber();
      const animal = getAnimalByNumber(drawn);
      setDrawnNumber(drawn);
      setDrawnAnimal(animal);

      const p1Win = checkWin(drawn, selectedAnimal!, selectedGrupo, betType, customNumber);

      const bb = botBet();
      const p2Win = checkWin(drawn, bb.animal, bb.grupo, bb.type, bb.num);

      const mult = getMultiplier(betType);
      const p1Change = p1Win ? bet * mult : -bet;
      const p2Bet = 10;
      const p2Mult = getMultiplier(bb.type);
      const p2Change = p2Win ? p2Bet * p2Mult : -p2Bet;

      const newP1 = Math.max(0, coins + p1Change);
      setCoins(newP1);
      setScore(s => ({ p1: s.p1 + (p1Win ? bet * mult : 0), p2: s.p2 + (p2Win ? p2Bet * p2Mult : 0) }));
      setRound(r => r + 1);

      if (p1Win) {
        setPhrase(randFrase());
        addParticle(50, 30, "#FFD700");
        addParticle(30, 60, "#FF6B35");
        addParticle(70, 50, "#009140");
      } else {
        setPhrase("Azar! Tenta de novo!");
      }

      setIsDrawing(false);
      setShowResult(true);
    }, 1500);
  }, [coins, bet, betType, selectedAnimal, selectedGrupo, customNumber, drawNumber, getAnimalByNumber, checkWin, botBet, getMultiplier, addParticle]);

  useEffect(() => {
    if (showResult && round >= maxRounds) {
      const t = setTimeout(() => {
        setPhase("result");
        if (onScore) onScore("Bicho", scoreRef.current.p1);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [showResult, round, maxRounds, onScore]);

  const bgStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #1a0a00 0%, #2d1500 30%, #1a0a00 60%, #0d1a00 100%)",
    minHeight: 480,
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-700/40 overflow-hidden" style={bgStyle}>
      <CapulanaPattern />
      {particles.map(p => (
        <motion.div
          key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color }}
          initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0], y: [0, -40] }}
          transition={{ duration: 0.8 }}
        />
      ))}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-amber-700/30">
        <div className="absolute inset-x-0 top-0 h-1 flex">
          <div className="flex-1 bg-[#009140]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#FFD700]" />
        </div>
        <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
          <span className="text-2xl">🦩</span> Jogo do Bicho
        </h2>
        {phase === "playing" && (
          <span className="text-xs text-amber-300 bg-amber-900/40 px-2 py-1 rounded-full">
            Ronda {Math.min(round + 1, maxRounds)}/{maxRounds}
          </span>
        )}
      </div>

      <div className="relative p-4 z-10">
        <AnimatePresence mode="wait">
          {phase === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-3xl">🦩💰👑</p>
                <h3 className="text-xl font-bold text-amber-400">Jogo do Bicho Moçambicano</h3>
                <p className="text-sm text-amber-200/70">Aposte no animal sorteado! Quanto mais arriscado, maior o prémio.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs">
                <div className="bg-black/30 rounded-xl p-3 border border-amber-700/20">
                  <p className="text-amber-400 font-bold">🦩 Animal (x3)</p>
                  <p className="text-amber-200/60">Aposte num dos 25 animais</p>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-amber-700/20">
                  <p className="text-green-400 font-bold">📈 Grupo (x6)</p>
                  <p className="text-amber-200/60">Aposte num grupo de 4 números</p>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-amber-700/20">
                  <p className="text-blue-400 font-bold">🔢 Dezena (x12)</p>
                  <p className="text-amber-200/60">Acerte a dezena sorteada</p>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-amber-700/20">
                  <p className="text-purple-400 font-bold">🏆 Milhar (x200)</p>
                  <p className="text-amber-200/60">Acerte os 4 dígitos exactos!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2 justify-center">
                  {ARR_1.map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${mode === m ? "bg-amber-600 text-white" : "bg-white/10 text-amber-300"}`}>
                      {m === "bot" ? "vs Computador" : "vs Jogador"}
                    </button>
                  ))}
                </div>
                {mode === "bot" && (
                  <div className="flex gap-2 justify-center">
                    {_ARR2.map(d => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${difficulty === d ? "bg-amber-600 text-white" : "bg-white/10 text-amber-300"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={startGame}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold text-lg hover:scale-105 transition-transform">
                  Começar Jogo
                </button>
              </div>
            </motion.div>
          )}
          {phase === "countdown" && (
            <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center" style={{ minHeight: 300 }}>
              <motion.p key={countdown} className="text-8xl font-black text-amber-400"
                initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                {countdown > 0 ? countdown : "VAI!"}
              </motion.p>
            </motion.div>
          )}
          {phase === "playing" && (
            <motion.div key="play" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex justify-between items-center bg-black/40 rounded-xl px-4 py-2 border border-amber-700/20">
                <div className="text-center">
                  <p className="text-[10px] text-amber-400 uppercase">Você</p>
                  <p className="text-lg font-bold text-amber-300">{score.p1}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-amber-400 uppercase">Moedas</p>
                  <p className={`text-lg font-bold ${coins > 0 ? "text-green-400" : "text-red-400"}`}>{coins}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-amber-400 uppercase">Bot</p>
                  <p className="text-lg font-bold text-orange-300">{score.p2}</p>
                </div>
              </div>

              {coins <= 0 && round < maxRounds ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xl text-red-400 font-bold">Sem moedas!</p>
                  <p className="text-sm text-amber-200/60">Ficaste sem moedas para apostar.</p>
                  <button onClick={() => { setCoins(50); setBet(Math.min(10, 50)); }}
                    className="px-6 py-2 rounded-full bg-amber-700 text-white text-sm font-bold hover:bg-amber-600">
                    Receber Empréstimo (50 moedas)
                  </button>
                </div>
              ) : !showResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {_ARR1.map(t => (
                      <button key={t} onClick={() => setBetType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${betType === t ? "bg-amber-600 text-white" : "bg-white/10 text-amber-300"}`}>
                        {t === "animal" ? "🦩 Animal" : t === "grupo" ? "📈 Grupo" : t === "dezena" ? "🔢 Dezena" : t === "centena" ? "🔵 Centena" : "🏆 Milhar"}
                        <span className="ml-1 text-[10px] opacity-70">x{getMultiplier(t)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-amber-400">Aposta:</span>
                    {[5, 10, 20, 50].map(b => (
                      <button key={b} onClick={() => setBet(Math.min(b, coins))} disabled={b > coins}
                        className={`w-10 h-8 rounded-lg text-xs font-bold transition-all ${bet === b && b <= coins ? "bg-amber-600 text-white" : b <= coins ? "bg-white/10 text-amber-300" : "bg-white/5 text-amber-300/30"}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                  {betType === "animal" && (
                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1">
                      {ANIMAIS.map((a, i) => (
                        <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAnimal(i)}
                          className={`flex flex-col items-center p-1.5 rounded-lg text-center transition-all ${selectedAnimal === i ? "bg-amber-600/60 border border-amber-400 ring-1 ring-amber-400" : "bg-black/30 border border-amber-700/20 hover:bg-black/50"}`}>
                          <span className="text-lg">{a.emoji}</span>
                          <span className="text-[9px] text-amber-200 leading-tight">{a.nome}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {betType === "grupo" && (
                    <div className="grid grid-cols-5 gap-2">
                      {ANIMAIS.filter((_, i) => i % 4 === 0).map((a, gi) => (
                        <motion.button key={gi} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedGrupo(gi)}
                          className={`flex flex-col items-center p-2 rounded-xl transition-all ${selectedGrupo === gi ? "bg-green-600/60 border border-green-400" : "bg-black/30 border border-amber-700/20"}`}>
                          <span className="text-xl">{a.emoji}</span>
                          <span className="text-[10px] text-amber-200">Grupo {gi + 1}</span>
                          <span className="text-[9px] text-amber-200/50">{[0,1,2,3].map(n => gi*4+n).join(", ")}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {(betType === "dezena" || betType === "centena" || betType === "milhar") && (
                    <div className="text-center space-y-2">
                      <p className="text-xs text-amber-300">
                        Escolha um número de {betType === "dezena" ? "2" : betType === "centena" ? "3" : "4"} dígitos
                      </p>
                      <input
                        type="number"
                        value={customNumber}
                        onChange={e => setCustomNumber(e.target.value.slice(0, betType === "dezena" ? 2 : betType === "centena" ? 3 : 4))}
                        placeholder={betType === "dezena" ? "00-99" : betType === "centena" ? "000-999" : "0000-9999"}
                        className="w-32 px-3 py-2 rounded-lg bg-black/50 border border-amber-700/30 text-amber-200 text-center text-lg font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                  <div className="text-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={placeBet}
                      disabled={isDrawing || coins <= 0 || (betType === "animal" && selectedAnimal === null) || (betType === "grupo" && selectedGrupo === null)}
                      className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                    >
                      {isDrawing ? "A sortear..." : `Apostar ${bet} moedas`}
                    </motion.button>
                  </div>
                </div>
              ) : (
                
                <div className="text-center space-y-4 py-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="space-y-2">
                    <p className="text-xs text-amber-400 uppercase tracking-wider">Sorteado</p>
                    <p className="text-4xl font-black text-white font-mono">
                      {String(drawnNumber ?? 0).padStart(4, "0")}
                    </p>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-2 bg-black/40 rounded-xl px-4 py-2 border border-amber-700/30">
                      <span className="text-2xl">{drawnAnimal?.emoji}</span>
                      <span className="text-amber-300 font-bold">{drawnAnimal?.nome}</span>
                    </motion.div>
                  </motion.div>

                  {phrase && (
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`text-2xl font-black ${phrase === "Azar! Tenta de novo!" ? "text-red-400" : "text-amber-400"}`}>
                      {phrase}
                    </motion.p>
                  )}

                  <div className="flex justify-center gap-4 text-sm">
                    <div className="bg-black/30 rounded-xl px-3 py-2 border border-amber-700/20">
                      <p className="text-[10px] text-amber-400">Você</p>
                      <p className={`font-bold ${score.p1 > (scoreRef.current.p1 - (bet * getMultiplier(betType))) ? "text-green-400" : "text-red-400"}`}>
                        {score.p1} pts
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-xl px-3 py-2 border border-amber-700/20">
                      <p className="text-[10px] text-amber-400">Bot</p>
                      <p className="font-bold text-orange-300">{score.p2} pts</p>
                    </div>
                  </div>

                  {round < maxRounds && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { setShowResult(false); setSelectedAnimal(null); setSelectedGrupo(null); setCustomNumber(""); setBetType("animal"); setBet(Math.min(10, coins)); }}
                      className="px-6 py-2 rounded-full bg-amber-700 text-white text-sm font-bold hover:bg-amber-600">
                      Próxima Ronda
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6 py-8">
              <p className="text-4xl">🏆</p>
              <h3 className="text-2xl font-black text-amber-400">
                {score.p1 > score.p2 ? "Você Venceu!" : score.p1 < score.p2 ? "Bot Venceu!" : "Empate!"}
              </h3>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-xs text-amber-400">Você</p>
                  <p className="text-3xl font-black text-amber-300">{score.p1}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-400">Bot</p>
                  <p className="text-3xl font-black text-orange-300">{score.p2}</p>
                </div>
              </div>
              <p className="text-sm text-amber-200/60">Moedas finais: {coins}</p>
              <button onClick={() => setPhase("menu")}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold text-lg hover:scale-105 transition-transform">
                Jogar Novamente
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}