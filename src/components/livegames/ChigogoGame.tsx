import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChigogoProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* SVG Stone */
const StoneSVG = ({ color = "#8B6914", shine = true }: { color?: string; shine?: boolean }) => (
  <svg viewBox="0 0 60 50" className="w-full h-full">
    <ellipse cx="30" cy="28" rx="26" ry="20" fill={color} />
    {shine && <ellipse cx="22" cy="20" rx="8" ry="5" fill="rgba(255,255,255,0.15)" />}
    <ellipse cx="30" cy="28" rx="26" ry="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
  </svg>
);

/* Capulana pattern */
const CapulanaBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="chigogo-cap" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M15 0L30 15L15 30L0 15Z" fill="none" stroke="#FFD700" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#chigogo-cap)" />
  </svg>
);

const STONE_COLORS = ["#8B6914", "#A0522D", "#6B4423", "#8B7355", "#704214", "#556B2F", "#8B0000"];
const BOT_WRONG_CHANCE = { Facil: 0.35, Medio: 0.1, Dificil: 0.02 };
const ROUNDS_TO_WIN = 5;

export default function ChigogoGame({ onScore, liveCode }: ChigogoProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [phase, setPhase] = useState<"menu" | "playing" | "reveal" | "roundResult" | "gameOver">("menu");
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [isHider, setIsHider] = useState(true); // P1 hides, P2 guesses (alternates)
  const [selectedHand, setSelectedHand] = useState<0 | 1 | 2 | null>(null);
  const [guessedHand, setGuessedHand] = useState<0 | 1 | 2 | null>(null);
  const [stoneColor] = useState(() => STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)]);
  const [message, setMessage] = useState("");
  const [showStone, setShowStone] = useState(false);
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hands = [0, 1, 2] as const;
  const handLabels = ["Esquerda", "Meio", "Direita"];

  const nextRound = useCallback(() => {
    if (scores.p1 >= ROUNDS_TO_WIN || scores.p2 >= ROUNDS_TO_WIN) {
      setPhase("gameOver");
      if (onScore) onScore("Chigogo", Math.max(scores.p1, scores.p2));
      return;
    }
    setRound((r) => r + 1);
    setIsHider((h) => !h);
    setSelectedHand(null);
    setGuessedHand(null);
    setShowStone(false);
    setMessage("");
    setPhase("playing");
  }, [scores, onScore]);

  /* Bot AI as guesser */
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot" || isHider) return;
    const timer = setTimeout(() => {
      const wrongChance = BOT_WRONG_CHANCE[difficulty];
      const guess: 0 | 1 | 2 = Math.random() < wrongChance
        ? (hands.filter(h => h !== selectedHand) as (0|1|2)[])[Math.floor(Math.random() * 2)]
        : selectedHand!;
      setGuessedHand(guess);
      setPhase("reveal");
    }, 1200 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [phase, mode, isHider, selectedHand, difficulty]);

  /* Bot AI as hider */
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot" || !isHider) return;
    const timer = setTimeout(() => {
      setSelectedHand(hands[Math.floor(Math.random() * 3)]);
      setMessage("O computador escondeu a pedrinha!");
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, mode, isHider]);

  /* Auto-reveal after guess */
  useEffect(() => {
    if (phase !== "reveal") return;
    resultTimeout.current = setTimeout(() => {
      setShowStone(true);
      const correct = guessedHand === selectedHand;
      const guesser = isHider ? "p2" : "p1";
      const guesserLabel = isHider ? (mode === "bot" ? "Bot" : "J2") : (mode === "bot" ? "Voce" : "J1");
      if (correct) {
        setScores((s) => ({ ...s, [guesser]: (s as any)[guesser] + 1 }));
        setMessage(`${guesserLabel} acertou! A pedrinha estava na ${handLabels[guessedHand!]}`);
      } else {
        setMessage(`${guesserLabel} errou! A pedrinha estava na ${handLabels[selectedHand!]}`);
      }
      setPhase("roundResult");
    }, 1000);
    return () => clearTimeout(resultTimeout.current!);
  }, [phase]);

  const handleP1Hide = (hand: 0 | 1 | 2) => {
    if (phase !== "playing" || !isHider) return;
    setSelectedHand(hand);
    setMessage("Voce escondeu a pedrinha! Agora e a vez do adversario adivinhar...");
  };

  const handleP1Guess = (hand: 0 | 1 | 2) => {
    if (phase !== "playing" || isHider || mode === "bot" && !selectedHand) return;
    setGuessedHand(hand);
    setPhase("reveal");
  };

  const startGame = () => {
    setScores({ p1: 0, p2: 0 });
    setRound(1);
    setIsHider(true);
    setSelectedHand(null);
    setGuessedHand(null);
    setShowStone(false);
    setMessage("");
    setPhase("playing");
  };

  const isP1Turn = isHider; // P1 hides when true, P1 guesses when false
  const p1Label = mode === "bot" ? "Voce" : "Jogador 1";
  const p2Label = mode === "bot" ? "Computador" : "Jogador 2";
  const winner = scores.p1 >= ROUNDS_TO_WIN ? p1Label : scores.p2 >= ROUNDS_TO_WIN ? p2Label : null;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-800/40 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)" }}>
      <CapulanaBg />

      <div className="relative z-10 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #8B6914, #A0522D)" }}>🪨</div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "#FFD700" }}>Chigogo</h2>
              <p className="text-[10px]" style={{ color: "#CD853F" }}>Adivinha a Pedrinha</p>
            </div>
          </div>
          {phase !== "menu" && (
            <div className="flex items-center gap-3">
              <div className="text-center"><p className="text-[10px]" style={{ color: "#009140" }}>{p1Label}</p><p className="text-lg font-black" style={{ color: "#009140" }}>{scores.p1}</p></div>
              <span className="text-xs" style={{ color: "#FFD700" }}>Ronda {round}</span>
              <div className="text-center"><p className="text-[10px]" style={{ color: "#FF6B35" }}>{p2Label}</p><p className="text-lg font-black" style={{ color: "#FF6B35" }}>{scores.p2}</p></div>
            </div>
          )}
        </div>

        {phase !== "menu" && phase !== "gameOver" && (
          <div className="text-center mb-3"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.1)", color: "#FFD700" }}>Primeiro a {ROUNDS_TO_WIN} vence</span></div>
        )}

        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Esconda a pedrinha numa das 3 maos. O adversario adivinha onde esta! Primeiro a {ROUNDS_TO_WIN} pontos vence.
            </p>
            <div className="flex justify-center gap-2">
              {(["bot", "pvp"]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? "text-black" : ""}`}
                  style={mode === m ? { background: "linear-gradient(135deg, #FFD700, #FF6B35)" } : { background: "rgba(255,215,0,0.1)", color: "#CD853F" }}>
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </button>
              ))}
            </div>
            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {(["Facil", "Medio", "Dificil"]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === d ? "text-black" : ""}`}
                    style={difficulty === d ? { background: d === "Facil" ? "#009140" : d === "Medio" ? "#FF6B35" : "#FF0000" } : { background: "rgba(255,255,255,0.05)", color: "#CD853F" }}>{d}</button>
                ))}
              </div>
            )}
            <button onClick={startGame} className="w-full py-3 rounded-xl text-black font-black text-lg"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Comecar</button>
          </div>
        )}

        {(phase === "playing" || phase === "reveal" || phase === "roundResult") && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "#FFD700" }}>
                {phase === "playing" && isP1Turn && `Esconda a pedrinha, ${p1Label}!`}
                {phase === "playing" && !isP1Turn && mode === "bot" && !selectedHand && "O computador esta a esconder..."}
                {phase === "playing" && !isP1Turn && (mode !== "bot" || selectedHand) && `${mode === "bot" ? "Voce" : p2Label}, adivinha onde esta!`}
                {phase === "reveal" && "A revelar..."}
              </p>
            </div>

            <div className="flex justify-center gap-4 md:gap-8 py-6">
              {hands.map((h) => {
                const isP1Selection = phase === "playing" && isP1Turn && selectedHand === h;
                const isGuess = guessedHand === h;
                const isStoneHere = showStone && selectedHand === h;
                const canInteract = phase === "playing" && ((isP1Turn && !selectedHand) || (!isP1Turn && mode !== "bot"));
                const canGuess = phase === "playing" && !isP1Turn && mode === "bot" && selectedHand;

                return (
                  <motion.button key={h} whileTap={canInteract || canGuess ? { scale: 0.9 } : {}}
                    onClick={() => { if (isP1Turn) handleP1Hide(h); else if (canGuess) handleP1Guess(h); else if (!isP1Turn && mode !== "bot") handleP1Guess(h); }}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${canInteract || canGuess ? "cursor-pointer" : "cursor-default"}`}
                    style={{
                      background: isP1Selection ? "rgba(0,145,64,0.2)" : isGuess ? "rgba(255,107,53,0.2)" : "rgba(255,215,0,0.05)",
                      border: `2px solid ${isP1Selection ? "#009140" : isGuess ? "#FF6B35" : isStoneHere ? "#FFD700" : "rgba(255,215,0,0.15)"}`,
                      minWidth: 90,
                    }}>
                    <div className="w-16 h-16 relative">
                      {phase === "reveal" || phase === "roundResult" ? (
                        <AnimatePresence mode="wait">
                          <motion.div key={isStoneHere ? "open" : "closed"} initial={isStoneHere ? { rotateY: 90 } : {}}
                            animate={isStoneHere ? { rotateY: 0 } : {}} exit={{ rotateY: 90 }} transition={{ duration: 0.3 }}>
                            {isStoneHere ? (
                              <div className="relative">
                                <svg viewBox="0 0 80 80" className="w-16 h-16">
                                  <ellipse cx="40" cy="45" rx="30" ry="28" fill="#8B6914" />
                                  <ellipse cx="40" cy="45" rx="28" ry="26" fill="#A0522D" />
                                  <motion.div initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <ellipse cx="40" cy="40" rx="10" ry="8" fill={stoneColor} />
                                    <ellipse cx="37" cy="37" rx="4" ry="3" fill="rgba(255,255,255,0.2)" />
                                  </motion.div>
                                </svg>
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B6914, #A0522D)" }}>
                                <span className="text-2xl">✊</span>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <motion.div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: isP1Selection ? "linear-gradient(135deg, #009140, #006B30)" : "linear-gradient(135deg, #8B6914, #A0522D)" }}
                          animate={isP1Selection ? { scale: [1, 1.1, 1] } : {}}>
                          <span className="text-2xl">✊</span>
                        </motion.div>
                      )}
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#DEB887" }}>{handLabels[h]}</span>
                    {isGuess && !showStone && <span className="absolute -top-1 -right-1 text-sm">❓</span>}
                    {isStoneHere && <span className="absolute -top-1 -right-1 text-sm">✅</span>}
                    {isGuess && showStone && guessedHand !== selectedHand && <span className="absolute -top-1 -right-1 text-sm">❌</span>}
                  </motion.button>
                );
              })}
            </div>

            {message && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm font-medium" style={{ color: "#FFD700" }}>{message}</motion.p>
            )}

            {phase === "roundResult" && (
              <button onClick={nextRound} className="w-full py-2.5 rounded-xl text-black font-bold"
                style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Proxima Ronda</button>
            )}
          </div>
        )}

        {phase === "gameOver" && (
          <div className="text-center py-8 space-y-4">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="text-6xl">🏆</motion.div>
            <h3 className="text-2xl font-black" style={{ color: "#FFD700" }}>{winner} venceu!</h3>
            <div className="flex justify-center gap-8">
              <div><p className="text-xs" style={{ color: "#CD853F" }}>{p1Label}</p><p className="text-3xl font-black" style={{ color: "#009140" }}>{scores.p1}</p></div>
              <div className="text-xl font-bold self-center" style={{ color: "#FFD700" }}>vs</div>
              <div><p className="text-xs" style={{ color: "#CD853F" }}>{p2Label}</p><p className="text-3xl font-black" style={{ color: "#FF6B35" }}>{scores.p2}</p></div>
            </div>
            <button onClick={() => setPhase("menu")} className="px-8 py-2.5 rounded-xl text-black font-bold"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Jogar Novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}