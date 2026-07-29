import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins, SkipForward, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type UnoColor = "red" | "blue" | "green" | "yellow";
type UnoValue = "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"skip"|"reverse"|"draw2"|"wild"|"wild4";

interface Card {
  id: string;
  color: UnoColor | "wild";
  value: UnoValue;
}

const COLORS: UnoColor[] = ["red", "blue", "green", "yellow"];
const COLOR_HEX: Record<string, string> = { red: "#EF4444", blue: "#3B82F6", green: "#22C55E", yellow: "#EAB308", wild: "#6366F1" };
const VALUE_DISPLAY: Record<string, string> = { skip: "⊘", reverse: "⇄", draw2: "+2", wild: "★", wild4: "+4" };

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let id = 0;
  for (const color of COLORS) {
    deck.push({ id: String(id++), color, value: "0" });
    for (const v of ["1","2","3","4","5","6","7","8","9","skip","reverse","draw2"] as UnoValue[]) {
      deck.push({ id: String(id++), color, value: v });
      deck.push({ id: String(id++), color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: String(id++), color: "wild", value: "wild" });
    deck.push({ id: String(id++), color: "wild", value: "wild4" });
  }
  return deck;
};

const shuffle = (arr: Card[]): Card[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const canPlay = (card: Card, top: Card, currentColor: UnoColor): boolean => {
  if (card.color === "wild") return true;
  if (card.color === currentColor) return true;
  if (card.value === top.value && card.value !== "wild" && card.value !== "wild4") return true;
  return false;
};

const UnoCardGame = ({ onScore, liveCode }: Props) => {
  const [deck, setDeck] = useState<Card[]>(() => shuffle(createDeck()));
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [currentColor, setCurrentColor] = useState<UnoColor>("red");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [bet, setBet] = useState(0);
  const [drawing, setDrawing] = useState(0); // cards to draw
  const [choosingColor, setChoosingColor] = useState(false);
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [message, setMessage] = useState("");
  const [started, setStarted] = useState(false);

  const NAMES = ["Jogador 1", "Jogador 2", "Jogador 3", "Jogador 4"];
  const PLAYER_COUNT = 2;

  const drawFromDeck = useCallback((count: number, d: Card[]): { drawn: Card[]; remaining: Card[] } => {
    const drawn: Card[] = [];
    let remaining = [...d];
    for (let i = 0; i < count; i++) {
      if (remaining.length === 0) {
        // Reshuffle discard into deck
        const topCard = discard[discard.length - 1];
        const reshuffled = shuffle(discard.slice(0, -1).filter(c => c.value !== "wild" && c.value !== "wild4"));
        remaining = [...reshuffled, topCard];
        if (remaining.length <= 1) break;
      }
      drawn.push(remaining.shift()!);
    }
    return { drawn, remaining };
  }, [discard]);

  const nextPlayer = (from: number, dir: number) => {
    const active = Array.from({ length: PLAYER_COUNT }, (_, i) => i);
    const idx = active.indexOf(from);
    return active[(idx + dir + PLAYER_COUNT) % PLAYER_COUNT];
  };

  const dealCards = () => {
    let d = shuffle(createDeck());
    const h: Card[][] = [[], [], [], []];
    for (let i = 0; i < 7; i++) {
      for (let p = 0; p < PLAYER_COUNT; p++) {
        if (d.length > 0) h[p].push(d.shift()!);
      }
    }
    // Find first non-wild card for discard
    let startIdx = d.findIndex(c => c.color !== "wild");
    if (startIdx === -1) startIdx = 0;
    const startCard = d.splice(startIdx, 1)[0];
    setDeck(d);
    setHands(h);
    setDiscard([startCard]);
    setCurrentColor(startCard.color === "wild" ? "red" : startCard.color as UnoColor);
    setCurrent(0);
    setDirection(1);
    setStarted(true);
    setMessage("");
  };

  const playCard = (card: Card, playerIdx: number) => {
    if (gameOver || playerIdx !== current || !started) return;
    const top = discard[discard.length - 1];
    if (!canPlay(card, top, currentColor)) { toast.error("Não pode jogar esta carta!"); return; }

    // Handle wild cards - choose color first
    if (card.color === "wild") {
      setChoosingColor(true);
      setPendingWild(card);
      return;
    }

    executePlay(card, card.color);
  };

  const executePlay = (card: Card, chosenColor: UnoColor) => {
    const newHands = hands.map(h => [...h]);
    const pIdx = current;
    const cardIdx = newHands[pIdx].findIndex(c => c.id === card.id);
    if (cardIdx === -1) return;
    newHands[pIdx].splice(cardIdx, 1);

    const newDiscard = [...discard, card];
    let newDir = direction;
    let newDeck = [...deck];
    let nextP = current;
    let msg = "";

    // Check UNO
    if (newHands[pIdx].length === 1) {
      msg = `${NAMES[pIdx]} disse UNO! 🔥`;
    }

    // Check win
    if (newHands[pIdx].length === 0) {
      setGameOver(true);
      setWinner(pIdx);
      const winScore = 100 + (bet || 0);
      onScore?.(NAMES[pIdx], winScore);
      setScores(s => { const ns = [...s]; ns[pIdx] += winScore; return ns; });
      setHands(newHands);
      setDiscard(newDiscard);
      setMessage(`${NAMES[pIdx]} Venceu! 🏆`);
      return;
    }

    // Card effects
    if (card.value === "skip") {
      nextP = nextPlayer(pIdx, newDir);
      msg = `⊘ ${NAMES[nextP]} foi saltado!`;
      nextP = nextPlayer(nextP, newDir);
    } else if (card.value === "reverse") {
      newDir = -newDir;
      setDirection(newDir);
      if (PLAYER_COUNT === 2) {
        nextP = nextPlayer(pIdx, newDir);
        msg = `⇄ Sentido invertido!`;
      } else {
        nextP = nextPlayer(pIdx, newDir);
        msg = `⇄ Sentido invertido!`;
      }
    } else if (card.value === "draw2") {
      const targetP = nextPlayer(pIdx, newDir);
      const { drawn, remaining } = drawFromDeck(2, newDeck);
      newHands[targetP].push(...drawn);
      newDeck = remaining;
      msg = `+2 ${NAMES[targetP]} compra 2 cartas!`;
      nextP = nextPlayer(targetP, newDir);
    } else if (card.value === "wild4") {
      const targetP = nextPlayer(pIdx, newDir);
      const { drawn, remaining } = drawFromDeck(4, newDeck);
      newHands[targetP].push(...drawn);
      newDeck = remaining;
      msg = `+4 ${NAMES[targetP]} compra 4 cartas! 🎨`;
      nextP = nextPlayer(targetP, newDir);
    } else {
      nextP = nextPlayer(pIdx, newDir);
    }

    setHands(newHands);
    setDiscard(newDiscard);
    setDeck(newDeck);
    setCurrentColor(chosenColor);
    setCurrent(nextP);
    setMessage(msg);
  };

  const handleColorChoice = (color: UnoColor) => {
    if (!pendingWild) return;
    setChoosingColor(false);
    executePlay(pendingWild, color);
    setPendingWild(null);
  };

  const handleDraw = () => {
    if (gameOver || !started) return;
    const { drawn, remaining } = drawFromDeck(1, deck);
    const newHands = hands.map(h => [...h]);
    newHands[current].push(...drawn);
    setHands(newHands);
    setDeck(remaining);
    // Pass turn
    setCurrent(nextPlayer(current, direction));
    toast.info(`${NAMES[current]} comprou uma carta`);
  };

  const topCard = discard[discard.length - 1];

  if (!started) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-6xl">🃏</div>
        <h3 className="text-2xl font-black text-white">UNO</h3>
        <p className="text-slate-400">Jogo de cartas clássico — 2 jogadores</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[10, 25, 50, 100].map(v => (
            <Button key={v} size="sm" variant={bet === v ? "default" : "outline"}
              className={cn("rounded-xl", bet === v && "bg-indigo-500")}
              onClick={() => setBet(v)}><Coins className="h-3 w-3 mr-1" />{v}</Button>
          ))}
        </div>
        <Button onClick={dealCards} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl px-8 text-lg font-bold">
          🎴 Iniciar Jogo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20">
        {Array.from({ length: PLAYER_COUNT }, (_, i) => (
          <div key={i} className={cn("text-center flex-1", current === i && !gameOver && "scale-105")}
            style={{ background: current === i && !gameOver ? COLOR_HEX[["red","blue","green","yellow"][i]] + "15" : "", borderRadius: "0.75rem", transition: "all 0.3s" }}>
            <span className="text-[10px] text-slate-500">{NAMES[i]}</span>
            <p className={cn("text-lg font-black", current === i && !gameOver ? "text-white" : "text-slate-500")}>{hands[i].length}</p>
            <p className="text-xs text-slate-400">{scores[i]}pts</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {message && (
          <motion.p key={message} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center text-sm font-bold text-amber-400 min-h-[20px]">{message}</motion.p>
        )}
      </AnimatePresence>

      <div className="flex justify-center gap-0.5">
        {hands[1].map((_, i) => (
          <div key={i} className="w-6 h-9 rounded bg-indigo-900 border border-indigo-700" />
        ))}
      </div>

      <div className="flex justify-center items-center gap-4">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-1">Monte ({deck.length})</p>
          <button onClick={handleDraw} disabled={gameOver}
            className="w-14 h-20 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-indigo-400/30 flex items-center justify-center text-white font-bold shadow-lg hover:scale-105 transition-transform">
            🃏
          </button>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 mb-1">Descarte</p>
          {topCard && (
            <div className={cn("w-14 h-20 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg border-2")}
              style={{ background: COLOR_HEX[currentColor], borderColor: COLOR_HEX[currentColor] + "60" }}>
              {VALUE_DISPLAY[topCard.value] || topCard.value}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-slate-500">Cor</p>
          <div className="w-6 h-6 rounded-full shadow-lg border-2 border-white/20" style={{ background: COLOR_HEX[currentColor] }} />
        </div>
      </div>

      <div className="flex justify-center gap-1 flex-wrap">
        {hands[0].map((card) => {
          const playable = canPlay(card, topCard, currentColor) && current === 0 && !gameOver;
          return (
            <motion.button
              key={card.id}
              onClick={() => playCard(card, 0)}
              whileHover={{ y: playable ? -12 : -4, scale: playable ? 1.05 : 1 }}
              whileTap={playable ? { scale: 0.95 } : {}}
              className={cn(
                "w-12 h-18 sm:w-14 sm:h-20 rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 transition-all",
                playable ? "border-white/40 cursor-pointer" : "border-white/10 opacity-60",
                card.color === "wild" ? "bg-gradient-to-br from-red-500 via-blue-500 via-green-500 to-yellow-500" : ""
              )}
              style={card.color !== "wild" ? { background: COLOR_HEX[card.color], borderColor: playable ? "rgba(255,255,255,0.4)" : COLOR_HEX[card.color] + "60" } : {}}
            >
              <span className="text-lg sm:text-xl">{VALUE_DISPLAY[card.value] || card.value}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-2 justify-center">
        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={handleDraw} disabled={gameOver || current !== 0}>
          Comprar Carta
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => { dealCards(); setScores([0,0,0,0]); }}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />Novo Jogo
        </Button>
      </div>

      <AnimatePresence>
        {choosingColor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 space-y-4">
              <p className="text-white font-bold text-center">Escolha uma cor:</p>
              <div className="grid grid-cols-2 gap-3">
                {COLORS.map(c => (
                  <button key={c} onClick={() => handleColorChoice(c)}
                    className="w-16 h-16 rounded-2xl shadow-lg hover:scale-110 transition-transform border-2 border-white/20"
                    style={{ background: COLOR_HEX[c] }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black text-white">{NAMES[winner!]} Venceu!</h3>
          <Button onClick={() => { dealCards(); setScores(s => { const ns = [...s]; ns[winner!] += 100 + (bet||0); return ns; }); }} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl">
            <RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default UnoCardGame;
