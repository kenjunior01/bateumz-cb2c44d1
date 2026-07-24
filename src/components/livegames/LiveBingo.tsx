import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, Check, Circle, Loader2, Users, Sparkles, RefreshCw } from "lucide-react";
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

  // Subscribe to game state
  useEffect(() => {
    if (!game?.id) return;
    const unsub = subscribeBingo(game.id, (g) => {
      setGame(g);
      // Auto-mark if player has card
      if (card && g.drawn_numbers.length > (game?.drawn_numbers?.length || 0)) {
        const newNum = g.drawn_numbers[g.drawn_numbers.length - 1];
        if (card.numbers.includes(newNum) && !card.marked.includes(newNum)) {
          markBingoNumber(card.id, newNum).then(() => {
            setCard((prev) => prev ? { ...prev, marked: [...(prev?.marked || []), newNum] } : null);
          });
        }
        setLastDrawn(newNum);
      }
    });
    return unsub;
  }, [game?.id, card?.id]);

  // HOST: Create game
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

  // HOST: Draw number
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

  // PLAYER: Join game
  const handleJoin = async () => {
    if (!game) return;
    const { data, error } = await joinBingo(game.id);
    if (error) { toast.error("Erro ao entrar"); return; }
    if (data) {
      setCard(data as BingoCard);
      toast.success("Cartão de bingo recebido!");
    }
  };

  // PLAYER: Manual mark
  const handleMark = async (num: number) => {
    if (!card || !game) return;
    if (!game.drawn_numbers.includes(num)) {
      toast.error("Este número ainda não foi sorteado");
      return;
    }
    const isMarked = card.marked.includes(num);
    if (isMarked) return;

    await markBingoNumber(card.id, num);
    const newMarked = [...card.marked, num];
    const updatedCard = { ...card, marked: newMarked };
    setCard(updatedCard);

    // Check bingo
    const won = checkBingo(updatedCard, game.drawn_numbers, game.pattern_type);
    if (won && !hasBingo) {
      setHasBingo(true);
      confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
      toast.success("🎉 BINGO! Você venceu!");
      if (onScore) onScore(user?.user_metadata?.display_name || "Jogador", 1000);
    }
  };

  const BINGO_CELL = ({ num, rowIdx, colIdx }: { num: number; rowIdx: number; colIdx: number }) => {
    const isFree = rowIdx === 2 && colIdx === 2;
    const isMarked = card?.marked.includes(num);
    const isDrawn = game?.drawn_numbers.includes(num);
    const isLast = num === lastDrawn;

    return (
      <motion.button
        key={`${rowIdx}-${colIdx}`}
        whileTap={isDrawn && !isFree && !isMarked ? { scale: 0.9 } : {}}
        onClick={() => !isFree && isDrawn && handleMark(num)}
        disabled={!isDrawn || isFree || isMarked || hasBingo}
        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${
          isFree
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600"
            : isMarked
              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-95"
              : isDrawn
                ? `border-primary/40 bg-primary/5 hover:bg-primary/15 cursor-pointer ${isLast ? "ring-2 ring-primary animate-pulse" : ""}`
                : "border-border bg-muted/20 text-muted-foreground/40"
        }`}
      >
        {isFree ? "★" : num || ""}
      </motion.button>
    );
  };

  const patternLabels: Record<string, string> = {
    line: "Linha",
    four_corners: "4 Cantos",
    full: "Cartão Cheio",
    x_pattern: "X",
    t_pattern: "T",
  };

  return (
    <div className="space-y-4">
      {/* No game */}
      {!game && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-emerald-500/30 mb-3" />
            <h3 className="font-bold text-lg mb-1">Bingo ao Vivo</h3>
            <p className="text-xs text-muted-foreground mb-4">Sorteie números em tempo real, a audiência marca no cartão</p>
            {isHost && (
              <Button onClick={handleCreate} className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 gap-1.5">
                <Play className="h-4 w-4" /> Criar Bingo
              </Button>
            )}
            {!isHost && (
              <p className="text-xs text-muted-foreground">Aguardando o host iniciar o bingo...</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game active */}
      {game && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 text-white">🎱 {patternLabels[game.pattern_type]}</Badge>
              {game.status === "drawing" && <Badge variant="outline" className="animate-pulse">Sorteando...</Badge>}
              {game.status === "finished" && <Badge variant="secondary">Finalizado</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{game.total_players}</span>
              <span>{game.drawn_numbers.length} sorteados</span>
            </div>
          </div>

          {/* Host controls */}
          {isHost && game.status === "drawing" && (
            <div className="flex gap-2">
              <Button onClick={handleDraw} disabled={drawLoading || game.drawn_numbers.length >= 75} className="flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600">
                {drawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {game.drawn_numbers.length >= 75 ? "Fim!" : `Sortear #${game.drawn_numbers.length + 1}`}
              </Button>
            </div>
          )}

          {/* Last drawn */}
          {lastDrawn && (
            <motion.div
n              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Último sorteado</p>
              <p className="text-4xl font-extrabold text-primary">{BINGO_LETTERS[Math.floor((lastDrawn - 1) / 15)]}-{lastDrawn}</p>
            </motion.div>
          )}

          {/* Player: No card yet */}
          {card && (
            <div className="grid grid-cols-5 gap-1.5 max-w-xs mx-auto">
              {BINGO_LETTERS.map((letter, ci) => (
                <div key={letter} className="text-center text-xs font-bold text-primary mb-1">{letter}</div>
              ))}
              {Array.from({ length: 25 }, (_, i) => {
                const rowIdx = Math.floor(i / 5);
                const colIdx = i % 5;
                const num = card.numbers[i];
                return <BINGO_CELL key={i} num={num} rowIdx={rowIdx} colIdx={colIdx} />;
              })}
            </div>
          )}

          {!card && !isHost && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">Pronto para jogar?</p>
                <Button onClick={handleJoin} className="rounded-full bg-emerald-500 text-white gap-1">
                  <Play className="h-3.5 w-3.5" /> Receber Cartão
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Bingo! */}
          <AnimatePresence>
            {hasBingo && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-center p-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xl"
              >
                <Sparkles className="h-8 w-8 mx-auto mb-2" />
                <p className="text-3xl font-extrabold">BINGO!</p>
                <p className="text-sm opacity-80 mt-1">Parabéns! Você completou o padrão!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drawn numbers grid */}
          {game.drawn_numbers.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Números sorteados ({game.drawn_numbers.length}/75)</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {game.drawn_numbers.map((n) => (
                  <span
                    key={n}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold ${
                      n === lastDrawn
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-muted text-foreground"
                    }`}
                  >{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveBingo;
