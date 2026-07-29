import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, Check, Circle, Loader2, Users, Sparkles, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createBingoGame, joinBingo, drawBingoNumber, markBingoNumber,
  subscribeBingo, checkBingo, type BingoGame, type BingoCard,
} from "@/lib/livePlatform";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

const springSnappy = { type: "spring" as const, stiffness: 300, damping: 30 };
const springBouncy = { type: "spring" as const, stiffness: 400, damping: 12 };
const springGentle = { type: "spring" as const, stiffness: 200, damping: 25 };
const springWobbly = { type: "spring" as const, stiffness: 500, damping: 18 };

const fireMultiWaveConfetti = () => {
  const waves = [
    { delay: 0, x: 0.3, count: 80, spread: 55 },
    { delay: 200, x: 0.7, count: 80, spread: 55 },
    { delay: 500, x: 0.5, count: 150, spread: 100 },
    { delay: 900, x: 0.15, count: 60, spread: 45 },
    { delay: 900, x: 0.85, count: 60, spread: 45 },
    { delay: 1400, x: 0.5, count: 250, spread: 140 },
  ];
  const colors = ["#facc15", "#f97316", "#ef4444", "22c55e", "#3b82f6", "#a855f7"];
  waves.forEach(({ delay, x, count, spread }) => {
    setTimeout(() => {
      confetti({ particleCount: count, spread, origin: { x, y: 0.6 }, colors });
    }, delay);
  });
};

const fireStarburst = (originX: number) => {
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: originX, y: 0.5 },
    colors: ["#facc15", "#fbbf24"],
  });
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: originX, y: 0.5 },
    colors: ["#facc15", "#fbbf24"],
  });
};

interface Props {
  scheduledLiveId?: string;
  liveCode?: string;
  isHost?: boolean;
  onScore?: (name: string, score: number) => void;
}

const LiveBingo = ({ scheduledLiveId, liveCode, isHost, onScore }: Props) => {
  const { user } = useAuth();
  const [game, setGame] = useState<BingoGame | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [lastDrawn, setLastDrawn] = useState<number | null>(null);
  const [hasBingo, setHasBingo] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [recentlyMarked, setRecentlyMarked] = useState<Set<number>>(new Set());
  const [bingoStage, setBingoStage] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const markTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const bingoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addBingoTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    bingoTimers.current.push(id);
  };

  useEffect(() => {
    return () => {
      markTimers.current.forEach(t => clearTimeout(t));
      bingoTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const triggerMarkAnimation = useCallback((num: number) => {
    setRecentlyMarked(prev => {
      const next = new Set(prev);
      next.add(num);
      return next;
    });
    const existing = markTimers.current.get(num);
    if (existing) clearTimeout(existing);
    markTimers.current.set(num, setTimeout(() => {
      setRecentlyMarked(prev => {
        const next = new Set(prev);
        next.delete(num);
        return next;
      });
      markTimers.current.delete(num);
    }, 800));
  }, []);

  useEffect(() => {
    if (!game?.id) return;
    const unsub = subscribeBingo(game.id, (g) => {
      setGame(g);
      if (card && g.drawn_numbers.length > (game?.drawn_numbers?.length || 0)) {
        const newNum = g.drawn_numbers[g.drawn_numbers.length - 1];
        if (card.numbers.includes(newNum) && !card.marked.includes(newNum)) {
          markBingoNumber(card.id, newNum).then(() => {
            setCard((prev) => prev ? { ...prev, marked: [...(prev?.marked || []), newNum] } : null);
            triggerMarkAnimation(newNum);
          });
        }
        setLastDrawn(newNum);
      }
    });
    return unsub;
  }, [game?.id, card, card?.id, triggerMarkAnimation]);

  const getPatternProgress = useCallback((): number => {
    if (!card || !game || hasBingo) return 1;
    const marked = new Set(card.marked);
    const isCellMarked = (idx: number) => idx === 12 || marked.has(card.numbers[idx]);

    switch (game.pattern_type) {
      case "line": {
        let best = 0;
        for (let r = 0; r < 5; r++) {
          let count = 0;
          for (let c = 0; c < 5; c++) count += isCellMarked(r * 5 + c) ? 1 : 0;
          best = Math.max(best, count);
        }
        for (let c = 0; c < 5; c++) {
          let count = 0;
          for (let r = 0; r < 5; r++) count += isCellMarked(r * 5 + c) ? 1 : 0;
          best = Math.max(best, count);
        }
        let d1 = 0, d2 = 0;
        for (let i = 0; i < 5; i++) {
          if (isCellMarked(i * 5 + i)) d1++;
          if (isCellMarked(i * 5 + (4 - i))) d2++;
        }
        return Math.max(best, d1, d2) / 5;
      }
      case "four_corners": {
        const corners = [0, 4, 20, 24];
        return corners.filter(i => isCellMarked(i)).length / 4;
      }
      case "full":
        return card.marked.length / 24;
      case "x_pattern": {
        const cells = new Set<number>();
        for (let i = 0; i < 5; i++) {
          cells.add(i * 5 + i);
          cells.add(i * 5 + (4 - i));
        }
        let count = 0;
        cells.forEach(i => { if (isCellMarked(i)) count++; });
        return count / cells.size;
      }
      case "t_pattern": {
        const cells = new Set<number>();
        for (let c = 0; c < 5; c++) cells.add(c);
        for (let r = 1; r < 5; r++) cells.add(r * 5 + 2);
        let count = 0;
        cells.forEach(i => { if (isCellMarked(i)) count++; });
        return count / cells.size;
      }
      default:
        return 0;
    }
  }, [card, game, hasBingo]);

  const handleCreate = async () => {
    const { data, error } = await createBingoGame({
      scheduled_live_id: scheduledLiveId,
      live_code: liveCode,
    });
    if (error) { toast.error("Erro ao criar bingo"); return; }
    if (data) {
      setGame(data as BingoGame);
      toast.success("Bingo criado! Espetadores podem entrar agora.");
    }
  };

  const handleDraw = async () => {
    if (!game) return;
    setDrawLoading(true);
    const { data, error } = await drawBingoNumber(game.id);
    if (error) { toast.error("Erro ao sortear"); setDrawLoading(false); return; }
    if (data) {
      setGame(data as BingoGame);
      setLastDrawn(data.drawn_numbers[data.drawn_numbers.length - 1]);
    }
    setDrawLoading(false);
  };

  const handleJoin = async () => {
    if (!game) return;
    const { data, error } = await joinBingo(game.id);
    if (error) { toast.error("Erro ao entrar"); return; }
    if (data) {
      setCard(data as BingoCard);
      toast.success("Cartão de bingo recebido!");
    }
  };

  const triggerBingoWin = useCallback(() => {
    setShowFlash(true);
    setBingoStage(1);
    addBingoTimer(() => setShowFlash(false), 500);
    addBingoTimer(() => setBingoStage(2), 300);
    addBingoTimer(() => {
      setBingoStage(3);
      fireMultiWaveConfetti();
    }, 600);
    addBingoTimer(() => setBingoStage(4), 1000);
    addBingoTimer(() => fireStarburst(0.3), 1600);
    addBingoTimer(() => fireStarburst(0.7), 1800);
    addBingoTimer(() => fireMultiWaveConfetti(), 2200);
  }, []);

  const handleMark = async (num: number) => {
    if (!card || !game) return;
    if (!game.drawn_numbers.includes(num)) {
      toast.error("Este número ainda não foi sorteado");
      return;
    }
    if (card.marked.includes(num)) return;

    await markBingoNumber(card.id, num);
    const newMarked = [...card.marked, num];
    const updatedCard = { ...card, marked: newMarked };
    setCard(updatedCard);
    triggerMarkAnimation(num);

    const won = checkBingo(updatedCard, game.drawn_numbers, game.pattern_type);
    if (won && !hasBingo) {
      setHasBingo(true);
      triggerBingoWin();
      toast.success("🎉 BINGO! Você venceu!");
      if (onScore) onScore(user?.user_metadata?.display_name || "Jogador", 1000);
    }
  };

  const patternLabels: Record<string, string> = {
    line: "Linha",
    four_corners: "4 Cantos",
    full: "Cartão Cheio",
    x_pattern: "X",
    t_pattern: "T",
  };

  const progress = getPatternProgress();
  const letterIdx = lastDrawn ? Math.floor((lastDrawn - 1) / 15) : 0;
  const bingoLetter = BINGO_LETTERS[letterIdx];

  const BINGO_CELL = ({ num, rowIdx, colIdx }: { num: number; rowIdx: number; colIdx: number }) => {
    const isFree = rowIdx === 2 && colIdx === 2;
    const isMarked = card?.marked.includes(num);
    const isDrawn = game?.drawn_numbers.includes(num);
    const isLast = num === lastDrawn;
    const isRecent = recentlyMarked.has(num);
    const waveDelay = bingoStage >= 2 ? (rowIdx + colIdx) * 0.06 : 0;

    const getAnimate = () => {
      if (isRecent && isMarked) {
        return { scale: [0.85, 1.25, 1], rotate: [0, -3, 2, 0] };
      }
      if (bingoStage >= 2 && isMarked) {
        return {
          scale: [1, 1.35, 1],
          boxShadow: [
            "0 0 0 0 rgba(250,204,21,0)",
            "0 0 24px 6px rgba(250,204,21,0.5)",
            "0 0 0 0 rgba(250,204,21,0)",
          ],
        };
      }
      if (isLast && !isMarked && isDrawn) {
        return { scale: [1, 1.1, 1] };
      }
      return {};
    };

    const getTransition = () => {
      if (isRecent && isMarked) {
        return { duration: 0.5, ease: "easeOut" as const };
      }
      if (bingoStage >= 2 && isMarked) {
        return { duration: 0.8, delay: waveDelay, ease: "easeInOut" as const };
      }
      if (isLast && !isMarked && isDrawn) {
        return { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const };
      }
      return springSnappy;
    };

    return (
      <motion.button
        key={`${rowIdx}-${colIdx}`}
        whileTap={isDrawn && !isFree && !isMarked ? { scale: 0.82 } : undefined}
        onClick={() => !isFree && isDrawn && handleMark(num)}
        disabled={!isDrawn || isFree || isMarked || hasBingo}
        animate={getAnimate()}
        transition={getTransition()}
        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-colors border relative overflow-hidden ${
          isFree
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600"
            : isMarked
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : isDrawn
                ? `border-primary/40 bg-primary/5 hover:bg-primary/15 cursor-pointer ${isLast ? "border-amber-400/60 shadow-[0_0_14px_rgba(250,204,21,0.35)]" : ""}`
                : "border-border bg-muted/20 text-muted-foreground/40"
        }`}
      >
        {isRecent && isMarked && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-white/40 pointer-events-none"
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
        <span className="relative z-10">
          {isFree ? "★" : num || ""}
        </span>
      </motion.button>
    );
  };

  return (
    <div className={`space-y-4 relative ${showFlash ? "screen-flash" : ""} ${bingoStage >= 1 && bingoStage < 3 ? "screen-shake" : ""}`}>
      {!game && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={springBouncy}
            >
              <Trophy className="h-12 w-12 mx-auto text-emerald-500/30 mb-3" />
            </motion.div>
            <motion.h3
              className="font-bold text-lg mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              Bingo ao Vivo
            </motion.h3>
            <motion.p
              className="text-xs text-muted-foreground mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              Sorteie números em tempo real, a audiência marca no cartão
            </motion.p>
            {isHost && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, ...springSnappy }}
              >
                <Button
                  onClick={handleCreate}
                  className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 gap-1.5 font-bold"
                >
                  <Play className="h-4 w-4" /> Criar Bingo
                </Button>
              </motion.div>
            )}
            {!isHost && (
              <motion.p
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Aguardando o host iniciar o bingo...
              </motion.p>
            )}
          </CardContent>
        </Card>
      )}

      {game && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={springWobbly}
              >
                <Badge className="bg-emerald-500 text-white">
                  {"🎱"} {patternLabels[game.pattern_type]}
                </Badge>
              </motion.div>
              {game.status === "drawing" && (
                <Badge variant="outline" className="animate-pulse">
                  Sorteando...
                </Badge>
              )}
              {game.status === "finished" && (
                <Badge variant="secondary">Finalizado</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{game.total_players}
              </span>
              <span>{game.drawn_numbers.length} sorteados</span>
            </div>
          </div>

          {card && !hasBingo && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground font-medium">Progresso do padrão</span>
                <motion.span
                  className="font-bold text-amber-500"
                  key={Math.round(progress * 100)}
                  initial={{ scale: 1.4, color: "#f59e0b" }}
                  animate={{ scale: 1, color: "#f59e0b" }}
                  transition={springSnappy}
                >
                  {Math.round(progress * 100)}%
                </motion.span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden border border-border/50">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progress * 100, 2)}%` }}
                  transition={springGentle}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 2s infinite linear",
                    }}
                  />
                </motion.div>
              </div>
            </div>
          )}

          {isHost && game.status === "drawing" && (
            <div className="relative">
              <motion.div
                className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/40 via-teal-400/40 to-emerald-500/40 blur-md"
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.015 }}
                transition={springSnappy}
                className="relative"
              >
                <Button
                  onClick={handleDraw}
                  disabled={drawLoading || game.drawn_numbers.length >= 75}
                  className="w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base py-5 shadow-lg glow-pulse"
                >
                  {drawLoading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="flex items-center"
                    >
                      <Loader2 className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ rotate: [0, 14, -14, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      className="flex items-center"
                    >
                      <Zap className="h-5 w-5" />
                    </motion.span>
                  )}
                  {game.drawn_numbers.length >= 75
                    ? "Fim!"
                    : `Sortear #${game.drawn_numbers.length + 1}`}
                </Button>
              </motion.div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {lastDrawn && (
              <motion.div
                key={lastDrawn}
                className="flex flex-col items-center gap-3 relative py-2"
                initial={{ y: -280, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.7 }}
                transition={springBouncy}
              >
                <motion.div
                  className="absolute w-36 h-36 rounded-full border-[3px] border-primary/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute w-44 h-44 rounded-full bg-primary/10 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />

                <motion.div
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.35)] relative z-10 border-2 border-white/20"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{
                    scale: { duration: 0.65, times: [0, 0.35, 1], ease: "easeOut" },
                  }}
                >
                  <motion.span
                    className="text-2xl font-black text-primary-foreground/80 leading-none"
                    initial={{ x: -50, opacity: 0, rotate: -20 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    transition={{ ...springSnappy, delay: 0.25 }}
                  >
                    {bingoLetter}
                  </motion.span>
                  <motion.span
                    className="text-4xl font-extrabold text-primary-foreground leading-none mt-0.5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...springSnappy, delay: 0.15 }}
                  >
                    {lastDrawn}
                  </motion.span>
                </motion.div>

                <motion.p
                  className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  Último sorteado
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {card && (
            <motion.div
              className="grid grid-cols-5 gap-1.5 max-w-xs mx-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springGentle}
            >
              {BINGO_LETTERS.map((letter, ci) => (
                <motion.div
                  key={letter}
                  className="text-center text-xs font-bold text-primary mb-1"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...springSnappy, delay: ci * 0.06 }}
                >
                  {letter}
                </motion.div>
              ))}
              {Array.from({ length: 25 }, (_, i) => {
                const rowIdx = Math.floor(i / 5);
                const colIdx = i % 5;
                const num = card.numbers[i];
                return <BINGO_CELL key={i} num={num} rowIdx={rowIdx} colIdx={colIdx} />;
              })}
            </motion.div>
          )}

          {!card && !isHost && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">Pronto para jogar?</p>
                <motion.div whileTap={{ scale: 0.93 }} transition={springSnappy}>
                  <Button
                    onClick={handleJoin}
                    className="rounded-full bg-emerald-500 text-white gap-1 font-bold"
                  >
                    <Play className="h-3.5 w-3.5" /> Receber Cartão
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          )}

          <AnimatePresence>
            {bingoStage >= 4 && hasBingo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springBouncy}
                className="relative overflow-hidden rounded-2xl p-8 text-center text-white shadow-2xl neon-border-gold celebration-rays"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #f97316 30%, #ef4444 60%, #dc2626 100%)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ ...springWobbly, delay: 0.15 }}
                  className="relative z-10"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                  >
                    <Trophy className="h-16 w-16 mx-auto mb-3 drop-shadow-[0_0_24px_rgba(255,255,255,0.5)]" />
                  </motion.div>
                </motion.div>
                <motion.h2
                  className="text-6xl font-black tracking-tight mb-2 relative z-10"
                  initial={{ scale: 0, y: 40 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ ...springBouncy, delay: 0.25, stiffness: 200 }}
                >
                  <motion.span
                    animate={{
                      textShadow: [
                        "0 0 10px rgba(255,255,255,0.4)",
                        "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,200,0,0.4)",
                        "0 0 10px rgba(255,255,255,0.4)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    BINGO!
                  </motion.span>
                </motion.h2>
                <motion.p
                  className="text-base opacity-90 font-semibold relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.9, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                >
                  Parabéns! Você completou o padrão!
                </motion.p>
                <motion.div
                  className="flex justify-center gap-1 mt-4 relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 rounded-full bg-white/80"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {game.drawn_numbers.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Números sorteados ({game.drawn_numbers.length}/75)
              </p>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                <AnimatePresence>
                  {game.drawn_numbers.map((n, idx) => {
                    const isLastItem = n === lastDrawn;
                    return (
                      <motion.span
                        key={n}
                        layout
                        initial={{ scale: 0, y: 18, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                          ...springSnappy,
                          delay: isLastItem ? 0.05 : 0,
                          scale: { duration: 0.35, ease: "easeOut" },
                        }}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold ${
                          isLastItem
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {n}
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveBingo;
