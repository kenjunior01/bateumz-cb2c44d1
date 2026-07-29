import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MexericaProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* Capulana-inspired SVG pattern for background */
const CapulanaPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="capulana" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="none" />
        <path d="M0 0L20 20L40 0" stroke="#FFD700" strokeWidth="1" fill="none" />
        <path d="M0 20L20 40L40 20" stroke="#009140" strokeWidth="1" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#FF0000" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
        <circle cx="40" cy="0" r="2" fill="#FFD700" />
        <circle cx="0" cy="40" r="2" fill="#009140" />
        <circle cx="40" cy="40" r="2" fill="#009140" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#capulana)" />
  </svg>
);

/* Hand SVG with henna-style patterns */
const HandSVG = ({ side, color = "#8B4513", hennaColor = "#CD853F" }: { side: "left" | "right"; color?: string; hennaColor?: string }) => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    <path
      d={side === "left"
        ? "M35,50 Q30,30 28,15 Q26,5 35,5 Q42,5 42,15 L42,45"
        : "M65,50 Q70,30 72,15 Q74,5 65,5 Q58,5 58,15 L58,45"
      }
      fill={color} stroke={hennaColor} strokeWidth="0.8"
    />
    <path
      d={side === "left"
        ? "M48,48 Q46,25 45,10 Q44,2 52,2 Q58,2 57,10 L55,45"
        : "M52,48 Q54,25 55,10 Q56,2 48,2 Q42,2 43,10 L45,45"
      }
      fill={color} stroke={hennaColor} strokeWidth="0.8"
    />
    <path
      d={side === "left"
        ? "M60,52 Q60,30 62,15 Q63,7 70,8 Q76,9 74,18 L68,50"
        : "M40,52 Q40,30 38,15 Q37,7 30,8 Q24,9 26,18 L32,50"
      }
      fill={color} stroke={hennaColor} strokeWidth="0.8"
    />
    <path
      d={side === "left"
        ? "M70,58 Q74,40 78,28 Q80,20 86,24 Q90,28 86,38 L76,58"
        : "M30,58 Q26,40 22,28 Q20,20 14,24 Q10,28 14,38 L24,58"
      }
      fill={color} stroke={hennaColor} strokeWidth="0.8"
    />
    <ellipse cx="50" cy="75" rx="28" ry="30" fill={color} stroke={hennaColor} strokeWidth="1" />
    <circle cx="50" cy="65" r="6" fill="none" stroke={hennaColor} strokeWidth="1" />
    <circle cx="50" cy="65" r="2" fill={hennaColor} />
    <circle cx="42" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="0.8" />
    <circle cx="58" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="0.8" />
    <path d="M44,85 Q50,90 56,85" fill="none" stroke={hennaColor} strokeWidth="0.8" />
    <rect x="35" y="100" width="30" height="20" rx="4" fill={color} stroke={hennaColor} strokeWidth="0.8" />
    {Array.from({ length: 6 }).map((_, i) => (
      <circle key={i} cx={37 + i * 5.2} cy="105" r="2.5" fill={i % 2 === 0 ? "#FFD700" : "#009140"} />
    ))}
  </svg>
);

const MOZ_PHRASES = ["Eish!", "Ma-loko!", "Kupela!", "Boa!", "Aye!", "Tsé-tsé!", "Forte!"];
const POSITIONS = [
  { top: "10%", left: "10%" },
  { top: "10%", right: "10%" },
  { bottom: "20%", left: "10%" },
  { bottom: "20%", right: "10%" },
  { top: "30%", left: "30%" },
  { top: "30%", right: "30%" },
  { bottom: "35%", left: "30%" },
  { bottom: "35%", right: "30%" },
];

const BOT_REACTION = { Facil: 1200, Medio: 700, Dificil: 350 };

export default function MexericaGame({ onScore, liveCode }: MexericaProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [phase, setPhase] = useState<"menu" | "countdown" | "playing" | "result">("menu");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [timeLeft, setTimeLeft] = useState(30);
  const [hands, setHands] = useState<{ id: number; pos: number; side: "left" | "right"; tappedBy: string | null }[]>([]);
  const [phrase, setPhrase] = useState("");
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const handIdRef = useRef(0);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showPhrase = useCallback((text: string) => {
    setPhrase(text);
    setTimeout(() => setPhrase(""), 600);
  }, []);

  const spawnParticle = useCallback((x: number, y: number) => {
    const colors = ["#FFD700", "#009140", "#FF0000", "#FF6B35", "#8B4513"];
    const newP = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      color: colors[i % colors.length],
    }));
    setParticles((p) => [...p, ...newP]);
    setTimeout(() => setParticles((p) => p.slice(0, -6)), 800);
  }, []);

  const spawnHand = useCallback(() => {
    const id = handIdRef.current++;
    const pos = Math.floor(Math.random() * POSITIONS.length);
    const side: "left" | "right" = Math.random() > 0.5 ? "left" : "right";
    const hand = { id, pos, side, tappedBy: null as string | null };
    setHands((h) => [...h, hand]);

    /* Auto-remove after 1.5s */
    setTimeout(() => {
      setHands((h) => h.filter((hh) => hh.id !== id));
    }, 1500);
  }, []);

  /* Bot AI: randomly taps hands */
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot") return;
    const reactTime = BOT_REACTION[difficulty];
    const interval = setInterval(() => {
      setHands((current) => {
        const available = current.filter((h) => h.tappedBy === null);
        if (available.length === 0) return current;
        const jitter = Math.random() * 0.4;
        const target = available[Math.floor(Math.random() * available.length)];
        /* Bot taps with some probability */
        if (Math.random() < (difficulty === "Facil" ? 0.45 : difficulty === "Medio" ? 0.7 : 0.9)) {
          setTimeout(() => {
            setScore((s) => ({ ...s, p2: s.p2 + 1 }));
            setHands((hh) => hh.map((h) => h.id === target.id ? { ...h, tappedBy: "bot" } : h));
          }, reactTime * (0.5 + jitter));
        }
        return current;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [phase, mode, difficulty]);

  const startGame = useCallback(() => {
    setScore({ p1: 0, p2: 0 });
    setHands([]);
    setTimeLeft(30);
    setPhase("countdown");
    setCountdown(3);
  }, []);

  /* Countdown */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* Game timer + hand spawner */
  useEffect(() => {
    if (phase !== "playing") return;
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("result");
          if (onScore) onScore("Mexerica", score.p1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    spawnTimerRef.current = setInterval(spawnHand, 900);
    return () => { clearInterval(gameTimerRef.current!); clearInterval(spawnTimerRef.current!); };
  }, [phase]);

  const handleTap = (handId: number, e: React.MouseEvent) => {
    setHands((h) => {
      const hand = h.find((hh) => hh.id === handId);
      if (!hand || hand.tappedBy) return h;
      setScore((s) => ({ ...s, p1: s.p1 + 1 }));
      showPhrase(MOZ_PHRASES[Math.floor(Math.random() * MOZ_PHRASES.length)]);
      spawnParticle(e.clientX, e.clientY);
      return h.map((hh) => (hh.id === handId ? { ...hh, tappedBy: "p1" } : hh));
    });
  };

  const winner = score.p1 > score.p2 ? (mode === "bot" ? "Voce" : "Jogador 1") : score.p2 > score.p1 ? (mode === "bot" ? "Computador" : "Jogador 2") : "Empate";
  const isWin = score.p1 > score.p2;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-700/40 overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)" }}>
      <CapulanaPattern />

      <AnimatePresence>
        {particles.map((p) => (
          <motion.div key={p.id} initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 0, y: -40 }} exit={{ opacity: 0 }}
            className="absolute w-2 h-2 rounded-full pointer-events-none z-50" style={{ left: p.x, top: p.y, background: p.color }} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {phrase && (
          <motion.div initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1.2, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-4xl font-black"
            style={{ color: "#FFD700", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{phrase}</motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: "linear-gradient(135deg, #009140 0%, #009140 33%, #FF0000 33%, #FF0000 66%, #FFD700 66%, #FFD700 100%)" }}>
            ✋
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "#FFD700" }}>Mexerica</h2>
            <p className="text-[11px]" style={{ color: "#CD853F" }}>Bate a Mao — Jogo Mocambicano</p>
          </div>
        </div>

        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Toque nas maos que aparecem o mais rapido que puder! 30 segundos de pura agilidade.
            </p>
            <div className="flex justify-center gap-2">
              {["bot", "pvp"].map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? "text-black" : "text-amber-200/60"}`}
                  style={mode === m ? { background: "linear-gradient(135deg, #FFD700, #FF6B35)" } : { background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)" }}>
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </button>
              ))}
            </div>
            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {(["Facil", "Medio", "Dificil"]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === d ? "text-black" : "text-amber-200/60"}`}
                    style={difficulty === d ? { background: d === "Facil" ? "#009140" : d === "Medio" ? "#FF6B35" : "#FF0000" } : { background: "rgba(255,255,255,0.05)" }}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            <button onClick={startGame} className="w-full py-3 rounded-xl text-black font-black text-lg transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>
              Comecar Jogo
            </button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex items-center justify-center py-16">
            <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
              className="text-8xl font-black" style={{ color: "#FFD700", textShadow: "0 0 40px rgba(255,215,0,0.5)" }}>
              {countdown || "VAI!"}
            </motion.div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#009140" }} />
                <span className="text-sm font-bold" style={{ color: "#DEB887" }}>{mode === "bot" ? "Voce" : "Jogador 1"}</span>
                <span className="text-xl font-black" style={{ color: "#FFD700" }}>{score.p1}</span>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-black ${timeLeft <= 5 ? "animate-pulse" : ""}`} style={{ color: timeLeft <= 5 ? "#FF0000" : "#FFD700" }}>{timeLeft}s</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black" style={{ color: "#FF6B35" }}>{score.p2}</span>
                <span className="text-sm font-bold" style={{ color: "#CD853F" }}>{mode === "bot" ? "Bot" : "Jogador 2"}</span>
                <div className="w-3 h-3 rounded-full" style={{ background: "#FF6B35" }} />
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden" style={{ height: 360, background: "radial-gradient(ellipse at center, rgba(139,69,19,0.15) 0%, transparent 70%)" }}>
              <CapulanaPattern />
              <AnimatePresence>
                {hands.map((h) => (
                  <motion.div key={h.id} initial={{ opacity: 0, scale: 0, rotate: h.side === "left" ? -15 : 15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 1.5 }}
                    className={`absolute cursor-pointer select-none ${h.tappedBy ? "pointer-events-none" : ""}`}
                    style={{ ...POSITIONS[h.pos], width: 70, height: 84, filter: h.tappedBy ? "grayscale(1) opacity(0.4)" : "drop-shadow(0 0 12px rgba(255,215,0,0.4))" }}
                    onClick={(e) => handleTap(h.id, e)}>
                    <HandSVG side={h.side} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="text-center py-8 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">{isWin ? "🏆" : score.p1 === score.p2 ? "🤝" : "😤"}</motion.div>
            <h3 className="text-2xl font-black" style={{ color: isWin ? "#FFD700" : "#DEB887" }}>{winner}!</h3>
            <div className="flex justify-center gap-8">
              <div><p className="text-xs" style={{ color: "#CD853F" }}>{mode === "bot" ? "Voce" : "J1"}</p><p className="text-3xl font-black" style={{ color: "#009140" }}>{score.p1}</p></div>
              <div className="text-xl font-bold self-center" style={{ color: "#FFD700" }}>vs</div>
              <div><p className="text-xs" style={{ color: "#CD853F" }}>{mode === "bot" ? "Bot" : "J2"}</p><p className="text-3xl font-black" style={{ color: "#FF6B35" }}>{score.p2}</p></div>
            </div>
            <button onClick={() => setPhase("menu")} className="px-8 py-2.5 rounded-xl text-black font-bold transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #FFD700, #FF6B35)" }}>Jogar Novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}