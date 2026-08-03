import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Zap, Shield, Heart, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { onScore?: (name: string, score: number) => void; liveCode?: string; }

type Phase = "ready" | "qte" | "success" | "fail" | "raiding" | "gameover";

interface Defender {
  id: number;
  x: number;
  y: number;
  tagged: boolean;
  tagAnim: boolean;
}

const RING_SIZE = 180;
const HIT_ZONE = 25;
const BASE_SPEED = 2.5;

const KabaddiRaid = ({ onScore, liveCode }: Props) => {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [phase, setPhase] = useState<Phase>("ready");
  const [raiderX, setRaiderX] = useState(50);
  const [ringProgress, setRingProgress] = useState(0);
  const [defenders, setDefenders] = useState<Defender[]>([]);
  const [qteIndex, setQteIndex] = useState(0);
  const [qteResults, setQteResults] = useState<boolean[]>([]);
  const [message, setMessage] = useState("Prepare-se para o raid!\nPressione ESPACO ou toque para comecar.");
  const [combo, setCombo] = useState(0);
  const [flashColor, setFlashColor] = useState("");
  const [returning, setReturning] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const dirRef = useRef(1);
  const speedRef = useRef(BASE_SPEED);
  const hitRef = useRef(false);

  const setupRound = useCallback((r: number) => {
    const count = 2 + Math.floor(r / 2);
    const defs: Defender[] = [];
    for (let i = 0; i < Math.min(count, 6); i++) {
      defs.push({
        id: i,
        x: 30 + Math.random() * 40,
        y: 25 + Math.random() * 50,
        tagged: false,
        tagAnim: false,
      });
    }
    setDefenders(defs);
    setQteIndex(0);
    setQteResults([]);
    setRaiderX(50);
    setReturning(false);
    hitRef.current = false;
    speedRef.current = BASE_SPEED + r * 0.4;
    dirRef.current = 1;
    setRingProgress(0);
    setPhase("raiding");
    setMessage("Ronda " + r + "! Toque nos defensores!");
  }, []);

  useEffect(() => {
    setupRound(1);
  }, [setupRound]);

  useEffect(() => {
    if (phase !== "raiding") return;
    const tick = () => {
      setRingProgress(prev => {
        let next = prev + speedRef.current * dirRef.current;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        if (next <= 0) { next = 0; dirRef.current = 1; }
        return next;
      });
      if (returning) {
        setRaiderX(prev => {
          const next = prev - 2;
          if (next <= 10) {
            const pts = qteResults.filter(r => r).length;
            setScore(s => s + pts * (combo + 1));
            setStamina(s => Math.max(0, s - (5 + round * 2)));
            setPhase("success");
            setMessage("Raid concluido! +" + pts + " pontos!");
            return 10;
          }
          return next;
        });
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, returning, qteResults, combo, round]);

  const handleTap = useCallback(() => {
    if (phase === "ready") {
      setupRound(round);
      return;
    }
    if (phase === "success") {
      setRound(r => r + 1);
      setupRound(round + 1);
      return;
    }
    if (phase === "fail") {
      setPhase("gameover");
      onScore?.("Kabaddi Raid", score);
      return;
    }
    if (phase === "gameover") {
      setRound(1);
      setScore(0);
      setStamina(100);
      setCombo(0);
      setMessage("Prepare-se para o raid!");
      setPhase("ready");
      return;
    }
    if (phase !== "raiding" || returning || hitRef.current) return;

    const target = defenders[qteIndex];
    if (!target || target.tagged) return;

    const hit = Math.abs(ringProgress - 50) < HIT_ZONE;
    if (hit) {
      setCombo(c => c + 1);
      setQteResults(r => [...r, true]);
      setDefenders(d => d.map((df, i) => i === qteIndex ? { ...df, tagged: true, tagAnim: true } : df));
      setFlashColor("bg-emerald-500");
      setTimeout(() => setFlashColor(""), 200);

      if (!returning && qteIndex === 0) {
        setRaiderX(70);
      }

      const nextIdx = qteIndex + 1;
      setQteIndex(nextIdx);
      const allTagged = nextIdx >= defenders.length || defenders.every(d => d.tagged);
      if (allTagged) {
        setReturning(true);
        setMessage("Todos marcados! Volte rapido!");
      } else {
        setMessage("Bom! Defensor " + (nextIdx + 1) + "!");
      }
    } else {
      setCombo(0);
      setQteResults(r => [...r, false]);
      setFlashColor("bg-red-500");
      setTimeout(() => setFlashColor(""), 200);
      setStamina(s => {
        const next = s - 15;
        if (next <= 0) {
          setPhase("fail");
          setMessage("Sem stamina! Voce foi capturado!");
          return 0;
        }
        return next;
      });
      setMessage("Errou! -15 stamina");
    }
  }, [phase, round, returning, ringProgress, qteIndex, defenders, setupRound, onScore, score]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTap]);

  const arenaBg = "radial-gradient(ellipse at 50% 80%, #DC2626 0%, #991B1B 30%, #1E1B4B 70%, #0F0A2E 100%)";

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            Ronda {round}
          </div>
          <div className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Pontos: {score}
          </div>
          {combo > 1 && (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white">
              x{combo} Combo!
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-4 w-4 text-red-500" />
        <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: stamina > 50 ? "#22C55E" : stamina > 25 ? "#F59E0B" : "#EF4444" }}
            animate={{ width: stamina + "%" }}
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground w-8 text-right">{Math.round(stamina)}</span>
      </div>

      <motion.div
        className="relative w-full rounded-2xl overflow-hidden select-none cursor-pointer"
        style={{
          height: 320,
          background: arenaBg,
          border: "4px solid #4A1D0A",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.5)",
        }}
        onClick={handleTap}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(30,27,75,0.6) 0%, transparent 40%)" }} />
        <div className="absolute top-2 left-3 text-[10px] text-white/30 font-bold">KABADDI ARENA</div>

        <div className="absolute top-3 right-3 flex gap-1">
          {qteResults.map((r, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={"w-4 h-4 rounded-full " + (r ? "bg-emerald-500" : "bg-red-500")}
            />
          ))}
        </div>

        <div className="relative z-10" style={{ height: "100%" }}>
          <div className="absolute bottom-16 left-4 right-4 flex justify-center">
            {defenders.filter(d => !d.tagged).map((d, i) => {
              const isCurrent = i === qteIndex && !returning;
              return (
                <motion.div
                  key={d.id}
                  animate={{ y: d.tagAnim ? -10 : 0, opacity: d.tagged ? 0.3 : 1 }}
                  className="absolute flex flex-col items-center"
                  style={{ left: d.x + "%", top: d.y + "%" }}
                >
                  <Shield className={"h-6 w-6 " + (isCurrent ? "text-amber-400" : "text-blue-300/60")} />
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-8 h-8 rounded-full border-2 border-amber-400 mt-1"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="absolute bottom-12"
            animate={{ left: raiderX + "%" }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <motion.div animate={{ y: phase === "raiding" ? [0, -4, 0] : 0 }} transition={{ repeat: Infinity, duration: 0.4 }}>
              <Activity className={"h-8 w-8 " + (returning ? "text-emerald-400" : "text-orange-400")} />
            </motion.div>
            <div className="text-[9px] text-white/60 text-center font-bold">RAIDER</div>
          </motion.div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="relative h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-emerald-400/60" />
              <div
                className={"absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 " + (Math.abs(ringProgress - 50) < HIT_ZONE ? "border-emerald-400 bg-emerald-500/30" : "border-white/60 bg-white/20")}
                style={{ left: ringProgress + "%", marginLeft: -12 }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-white/30 mt-1 px-1">
              <span>VOLTA</span>
              <span className={"font-bold " + (Math.abs(ringProgress - 50) < HIT_ZONE ? "text-emerald-400" : "text-white/30")}>ALVO</span>
              <span>RAID</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {flashColor && (
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={"absolute inset-0 " + flashColor}
              style={{ pointerEvents: "none" }}
            />
          )}
        </AnimatePresence>

        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Zap className="h-16 w-16 text-amber-400" />
              <p className="text-white text-sm font-bold text-center mt-2">TOQUE PARA INICIAR</p>
            </motion.div>
          </div>
        )}

        {phase === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-2" />
              <p className="text-white text-xl font-black">Fim de Jogo!</p>
              <p className="text-white/70 text-sm">Pontuacao: {score}</p>
              <p className="text-white/50 text-xs mt-1">Rondas: {round}</p>
            </motion.div>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p key={message} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-xs text-muted-foreground mt-2 h-8 whitespace-pre-line">
          {message}
        </motion.p>
      </AnimatePresence>

      {(phase === "ready" || phase === "gameover") && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex justify-center">
          <Button onClick={handleTap} className="gap-2"><RotateCcw className="h-4 w-4" /> {phase === "gameover" ? "Jogar Novamente" : "Comecar Raid"}</Button>
        </motion.div>
      )}

      <div className="mt-3 rounded-xl bg-card border p-3">
        <p className="text-[10px] text-muted-foreground font-bold mb-1">COMO JOGAR</p>
        <p className="text-[10px] text-muted-foreground">
          Quando o circulo branco estiver no centro verde, pressione ESPACO ou toque para marcar o defensor.
          Marque todos e volte para o seu lado antes que a stamina acabe!
        </p>
      </div>
    </div>
  );
};

export default KabaddiRaid;