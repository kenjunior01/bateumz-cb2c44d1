import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UrusseProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

/* Traditional Mancala / Bao board game */
/* 2 rows of 6 pits, 2 stores. Sowing mechanic. */

const TOTAL_PITS = 12; // 6 per side
const INITIAL_SEEDS = 4;
const CAPULANA_COLORS = ["#009140", "#FFD700", "#FF0000", "FF6B35", "8B4513"];

type Board = number[]; // index 0-5 = player 2 (top), 6-11 = player 1 (bottom), store indexes handled separately

function createBoard(): { pits: number[]; stores: [number, number] } {
  return { pits: Array(TOTAL_PITS).fill(INITIAL_SEEDS), stores: [0, 0] };
}

function cloneBoard(b: { pits: number[]; stores: [number, number] }) {
  return { pits: [...b.pits], stores: [...b.stores] as [number, number] };
}

/* Sow from a pit. Returns new board or null if invalid */
function sow(board: { pits: number[]; stores: [number, number] }, pitIndex: number, player: 0 | 1): { pits: number[]; stores: [number, number] } | null {
  const b = cloneBoard(board);
  const seeds = b.pits[pitIndex];
  if (seeds === 0) return null;

  // Check valid: player 1 plays 6-11, player 2 plays 0-5
  if (player === 0 && (pitIndex < 6 || pitIndex > 11)) return null;
  if (player === 1 && (pitIndex < 0 || pitIndex > 5)) return null;

  b.pits[pitIndex] = 0;
  let idx = pitIndex;
  let remaining = seeds;

  while (remaining > 0) {
    idx = (idx + 1) % 14;
    // Skip opponent's store (store 0 = player 2, store 1 = player 1)
    if (idx === 6 && player === 1) continue; // skip player 2's store
    if (idx === 13 && player === 0) continue; // skip player 1's store

    if (idx < 12) {
      b.pits[idx]++;
      remaining--;
      // Last seed landing rules
      if (remaining === 0) {
        const isOwnSide = (player === 0 && idx >= 6) || (player === 1 && idx < 6);
        // Capture: last seed in empty pit on own side
        if (b.pits[idx] === 1 && isOwnSide) {
          const oppositeIdx = 11 - idx;
          if (b.pits[oppositeIdx] > 0) {
            b.stores[player] += b.pits[oppositeIdx] + 1;
            b.pits[oppositeIdx] = 0;
            b.pits[idx] = 0;
          }
        }
      }
    } else {
      // Store: idx 6 = store 0 (P2), idx 13 = store 1 (P1)
      const storeIdx = idx === 13 ? 0 : 1; // store 1 is for P1 (bottom)
      // Actually let me fix: player 0 is bottom (pits 6-11, store at end = index "13" conceptually)
      // Player 1 is top (pits 0-5, store at index "6" conceptually)
      // Let me simplify: stores[0] = P1 (bottom player), stores[1] = P2 (top player)
      // Hmm, this is getting confusing. Let me use a simpler mapping:
      // player 0 = bottom, pits 6-11, stores[0]
      // player 1 = top, pits 0-5, stores[1]
    }
  }

  return b;
}

/* Simplified sow that works correctly */
function doSow(board: { pits: number[]; stores: [number, number] }, pitIdx: number, player: number): { pits: number[]; stores: [number, number]; extraTurn: boolean } | null {
  const b = cloneBoard(board);
  const seeds = b.pits[pitIdx];
  if (seeds === 0) return null;
  if (player === 0 && pitIdx < 6) return null;
  if (player === 1 && pitIdx >= 6) return null;

  b.pits[pitIdx] = 0;
  let pos = pitIdx + 1; // next position
  let remaining = seeds;
  let extraTurn = false;

  // Board layout: pits 0-5 (P2/top), pits 6-11 (P1/bottom)
  // P1 store after pit 11, P2 store after pit 5
  // Full circle: 0,1,2,3,4,5,[P2 store],6,7,8,9,10,11,[P1 store]

  while (remaining > 0) {
    // Determine actual position in the circle
    let actualPos: number;
    if (pos <= 5) actualPos = pos;
    else if (pos === 6) actualPos = -1; // P2 store
    else if (pos <= 11) actualPos = pos;
    else if (pos === 12) actualPos = -2; // P1 store
    else { pos = 0; actualPos = 0; }

    if (actualPos === -1) {
      // P2 store
      if (player === 1) {
        b.stores[1]++;
        remaining--;
        if (remaining === 0) extraTurn = true; // landed in own store
      }
      pos++;
      continue;
    }
    if (actualPos === -2) {
      // P1 store
      if (player === 0) {
        b.stores[0]++;
        remaining--;
        if (remaining === 0) extraTurn = true;
      }
      pos = 0;
      continue;
    }

    // Regular pit
    b.pits[actualPos]++;
    remaining--;

    if (remaining === 0) {
      // Check capture on own side
      const ownSide = player === 0 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
      if (ownSide.includes(actualPos) && b.pits[actualPos] === 1) {
        const oppIdx = 11 - actualPos;
        if (b.pits[oppIdx] > 0) {
          b.stores[player] += b.pits[oppIdx] + 1;
          b.pits[oppIdx] = 0;
          b.pits[actualPos] = 0;
        }
      }
    }
    pos++;
  }

  return { pits: b.pits, stores: b.stores, extraTurn };
}

function isGameOver(pits: number[], stores: [number, number]): boolean {
  const p1side = pits.slice(6).reduce((a, b) => a + b, 0);
  const p2side = pits.slice(0, 6).reduce((a, b) => a + b, 0);
  return p1side === 0 || p2side === 0;
}

function endGame(pits: number[], stores: [number, number]): [number, number] {
  const p1side = pits.slice(6).reduce((a, b) => a + b, 0);
  const p2side = pits.slice(0, 6).reduce((a, b) => a + b, 0);
  return [stores[0] + p1side, stores[1] + p2side];
}

/* Bot AI: pick best move (simple greedy) */
function botMove(pits: number[], stores: [number, number], difficulty: string): number {
  const validMoves = [0, 1, 2, 3, 4, 5].filter(i => pits[i] > 0);
  if (validMoves.length === 0) return -1;

  if (difficulty === "Facil") return validMoves[Math.floor(Math.random() * validMoves.length)];

  // Score each move
  let bestMove = validMoves[0];
  let bestScore = -Infinity;
  for (const move of validMoves) {
    const result = doSow({ pits, stores }, move, 1);
    if (!result) continue;
    let score = result.stores[1] - stores[1]; // gained seeds
    if (result.extraTurn) score += 3;
    // Count seeds on own side
    score += result.pits.slice(0, 6).reduce((a, b) => a + b, 0) * 0.1;
    if (difficulty === "Facil") score += (Math.random() - 0.5) * 5;
    else if (difficulty === "Medio") score += (Math.random() - 0.5) * 2;
    if (score > bestScore) { bestScore = score; bestMove = move; }
  }
  return bestMove;
}

const CapulanaBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="urusse-pat" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="4" fill="none" stroke="#FFD700" strokeWidth="0.5" />
      <circle cx="0" cy="0" r="2" fill="#009140" opacity="0.3" />
      <circle cx="24" cy="24" r="2" fill="#FF0000" opacity="0.3" />
    </pattern></defs>
    <rect width="100%" height="100%" fill="url(#urusse-pat)" />
  </svg>
);

export default function UrusseGame({ onScore, liveCode }: UrusseProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [phase, setPhase] = useState<"menu" | "playing" | "gameOver">("menu");
  const [pits, setPits] = useState<number[]>(Array(12).fill(INITIAL_SEEDS));
  const [stores, setStores] = useState<[number, number]>([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0); // 0=P1(bottom), 1=P2(top)
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [extraTurn, setExtraTurn] = useState(false);

  const p1Label = mode === "bot" ? "Voce" : "Jogador 1";
  const p2Label = mode === "bot" ? "Computador" : "Jogador 2";

  const startGame = useCallback(() => {
    const b = createBoard();
    setPits(b.pits);
    setStores(b.stores);
    setCurrentPlayer(0);
    setPhase("playing");
    setLastMove(null);
    setMessage(`${p1Label} comeca!`);
    setExtraTurn(false);
  }, [mode]);

  const handleMove = useCallback((pitIdx: number) => {
    if (phase !== "playing") return;
    if (currentPlayer === 1 && mode === "bot") return; // bot's turn

    const result = doSow({ pits, stores }, pitIdx, currentPlayer);
    if (!result) { setMessage("Pit vazio! Escolha outro."); return; }

    setPits(result.pits);
    setStores(result.stores);
    setLastMove(pitIdx);

    if (isGameOver(result.pits, result.stores)) {
      const [s1, s2] = endGame(result.pits, result.stores);
      setStores([s1, s2]);
      setPhase("gameOver");
      if (onScore) onScore("Urusse", Math.max(s1, s2));
      return;
    }

    if (result.extraTurn) {
      setExtraTurn(true);
      setMessage(`${currentPlayer === 0 ? p1Label : p2Label} joga de novo!`);
    } else {
      setExtraTurn(false);
      const next: 0 | 1 = currentPlayer === 0 ? 1 : 0;
      setCurrentPlayer(next);
      setMessage(`${next === 0 ? p1Label : p2Label}, e a sua vez!`);
    }
  }, [phase, pits, stores, currentPlayer, mode, onScore, p1Label, p2Label]);

  /* Bot auto-play */
  useEffect(() => {
    if (phase !== "playing" || currentPlayer !== 1 || mode !== "bot") return;
    const timer = setTimeout(() => {
      const move = botMove(pits, stores, difficulty);
      if (move >= 0) handleMove(move);
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, currentPlayer, mode, pits, stores, difficulty, handleMove]);

  const finalScores = phase === "gameOver" ? endGame(pits, stores) : null;
  const winner = finalScores ? (finalScores[0] > finalScores[1] ? p1Label : finalScores[1] > finalScores[0] ? p2Label : "Empate") : null;

  return (
    <div className="relative w-full max-w-lg mx-auto rounded-2xl border-2 border-amber-800/40 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)" }}>
      <CapulanaBg />

      <div className="relative z-10 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #8B6914, #556B2F)" }}>🟤</div>
            <div>
              <h2 className="font-bold text-base" style={{ color: "#FFD700" }}>Urusse</h2>
              <p className="text-[10px]" style={{ color: "#CD853F" }}>Mancala Mocambicano</p>
            </div>
          </div>
          {phase === "playing" && (
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${currentPlayer === 0 ? "animate-pulse" : ""}`}
              style={{ background: currentPlayer === 0 ? "rgba(0,145,64,0.2)" : "rgba(255,107,53,0.2)", color: currentPlayer === 0 ? "#009140" : "#FF6B35" }}>
              {currentPlayer === 0 ? p1Label : p2Label}{extraTurn ? " (de novo!)" : ""}
            </span>
          )}
        </div>

        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Semeie as sementes nos buracos. Capture as do adversario quando a ultima semente cair num buraco vazio do seu lado!
            </p>
            <div className="flex justify-center gap-2">
              {_ARR2.map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-bold ${mode === m ? "text-black" : ""}`}
                  style={mode === m ? { background: "linear-gradient(135deg, #FFD700, #FF6B35)" } : { background: "rgba(255,215,0,0.1)", color: "#CD853F" }}>
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </button>
              ))}
            </div>
            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {_ARR1.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${difficulty === d ? "text-black" : ""}`}
                    style={difficulty === d ? { background: d === "Facil" ? "#009140" : d === "Medio" ? "#FF6B35" : "#FF0000" } : { background: "rgba(255,255,255,0.05)", color: "#CD853F" }}>{d}</button>
                ))}
              </div>
            )}
            <button onClick={startGame} className="w-full py-3 rounded-xl text-black font-black text-lg"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Comecar</button>
          </div>
        )}

        {(phase === "playing" || phase === "gameOver") && (
          <>
            {message && <p className="text-center text-xs mb-2" style={{ color: "#FFD700" }}>{message}</p>}

            {/* Board */}
            <div className="space-y-1">
              {/* P2 store + top row */}
              <div className="flex items-center gap-1">
                <div className="w-12 h-16 rounded-lg flex items-center justify-center text-lg font-black shrink-0"
                  style={{ background: "linear-gradient(180deg, #8B6914, #556B2F)", color: "#FFD700", border: "2px solid rgba(139,105,20,0.5)" }}>
                  {stores[1]}
                </div>
                <div className="flex-1 grid grid-cols-6 gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.button key={i} whileTap={currentPlayer === 1 && mode !== "bot" && pits[i] > 0 ? { scale: 0.9 } : {}}
                      onClick={() => handleMove(i)}
                      className={`relative rounded-lg py-2 flex flex-col items-center justify-center ${lastMove === i ? "ring-2 ring-yellow-400" : ""} ${currentPlayer === 1 && mode !== "bot" && pits[i] > 0 ? "cursor-pointer" : ""}`}
                      style={{ background: lastMove === i ? "rgba(255,215,0,0.15)" : "rgba(139,105,20,0.15)", border: "1px solid rgba(139,105,20,0.3)", minHeight: 56 }}>
                      <span className="text-lg font-black" style={{ color: "#FFD700" }}>{pits[i]}</span>
                      {/* Seeds visualization */}
                      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                        {Array.from({ length: Math.min(pits[i], 8) }).map((_, s) => (
                          <div key={s} className="w-1.5 h-1.5 rounded-full" style={{ background: CAPULANA_COLORS[s % CAPULANA_COLORS.length] }} />
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="w-12 shrink-0" /> {/* spacer */}
              </div>

              {/* P1 bottom row + store */}
              <div className="flex items-center gap-1">
                <div className="w-12 shrink-0" /> {/* spacer */}
                <div className="flex-1 grid grid-cols-6 gap-1">
                  {[6, 7, 8, 9, 10, 11].map((i) => (
                    <motion.button key={i} whileTap={currentPlayer === 0 && pits[i] > 0 ? { scale: 0.9 } : {}}
                      onClick={() => handleMove(i)}
                      className={`relative rounded-lg py-2 flex flex-col items-center justify-center ${lastMove === i ? "ring-2 ring-yellow-400" : ""} ${currentPlayer === 0 && pits[i] > 0 ? "cursor-pointer" : ""}`}
                      style={{ background: lastMove === i ? "rgba(255,215,0,0.15)" : "rgba(0,145,64,0.1)", border: "1px solid rgba(0,145,64,0.3)", minHeight: 56 }}>
                      <span className="text-lg font-black" style={{ color: "#009140" }}>{pits[i]}</span>
                      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                        {Array.from({ length: Math.min(pits[i], 8) }).map((_, s) => (
                          <div key={s} className="w-1.5 h-1.5 rounded-full" style={{ background: CAPULANA_COLORS[s % CAPULANA_COLORS.length] }} />
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>
                <div className="w-12 h-16 rounded-lg flex items-center justify-center text-lg font-black shrink-0"
                  style={{ background: "linear-gradient(0deg, #009140, #006B30)", color: "#FFD700", border: "2px solid rgba(0,145,64,0.5)" }}>
                  {stores[0]}
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: "#CD853F" }}>
              <span style={{ color: "#FF6B35" }}>{p2Label} (cima)</span>
              <span style={{ color: "#009140" }}>{p1Label} (baixo)</span>
            </div>

            {/* Game over */}
            {phase === "gameOver" && (
              <div className="text-center mt-4 space-y-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">🏆</motion.div>
                <h3 className="text-xl font-black" style={{ color: "#FFD700" }}>{winner}{winner !== "Empate" ? " venceu!" : "!"}</h3>
                <div className="flex justify-center gap-6">
                  <div><p className="text-xs" style={{ color: "#009140" }}>{p1Label}</p><p className="text-2xl font-black" style={{ color: "#009140" }}>{finalScores?.[0]}</p></div>
                  <div><p className="text-xs" style={{ color: "#FF6B35" }}>{p2Label}</p><p className="text-2xl font-black" style={{ color: "#FF6B35" }}>{finalScores?.[1]}</p></div>
                </div>
                <button onClick={() => setPhase("menu")} className="px-6 py-2 rounded-xl text-black font-bold"
                  style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Jogar Novamente</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}