import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Eye, EyeOff, Coins, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { onScore?: (name: string, score: number) => void; liveCode?: string; }

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
type HandRank = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Card { suit: Suit; rank: Rank; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VAL: Record<Rank, number> = { A: 14, K: 13, Q: 12, J: 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2 };
const RANK_NAMES: Record<Rank, string> = { A: "Ás", K: "Rei", Q: "Dama", J: "Valete", "10": "10", "9": "9", "8": "8", "7": "7", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2" };
const HAND_NAMES = ["", "Carta Alta", "Par", "Sequencia", "Cor", "Par Seguido", "Trinca"];

function isRed(suit: Suit) { return suit === "♥" || suit === "♦"; }

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function evalHand(cards: Card[]): { rank: HandRank; high: number[] } {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  const isStraight = (vals[0] - vals[2] === 2 && vals[0] - vals[1] === 1 && vals[1] - vals[2] === 1)
    || (vals[0] === 14 && vals[1] === 3 && vals[2] === 2);
  const isTrail = vals[0] === vals[1] && vals[1] === vals[2];

  if (isTrail) return { rank: 6, high: [vals[0]] };
  if (isStraight && isFlush) return { rank: 5, high: vals[0] === 14 && vals[1] === 3 ? [3] : [vals[0]] };
  if (isStraight) return { rank: 3, high: vals[0] === 14 && vals[1] === 3 ? [3] : [vals[0]] };
  if (isFlush) return { rank: 4, high: vals };
  if (vals[0] === vals[1] || vals[1] === vals[2]) {
    const pv = vals[0] === vals[1] ? vals[0] : vals[1];
    const k = vals[0] === vals[1] ? vals[2] : vals[0];
    return { rank: 2, high: [pv, k] };
  }
  return { rank: 1, high: vals };
}

function compareHands(a: { rank: HandRank; high: number[] }, b: { rank: HandRank; high: number[] }): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.high.length, b.high.length); i++) {
    if (a.high[i] !== b.high[i]) return a.high[i] - b.high[i];
  }
  return 0;
}

const CARD_W = 64;
const CARD_H = 90;

function CardComponent({ card, faceUp, delay = 0 }: { card: Card; faceUp: boolean; delay?: number }) {
  const red = isRed(card.suit);
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotateY: 180 }}
      animate={{ opacity: 1, y: 0, rotateY: faceUp ? 0 : 180 }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      className="relative flex-shrink-0"
      style={{ width: CARD_W, height: CARD_H, perspective: 600 }}
    >
      <div
        className="absolute inset-0 rounded-xl border-2 flex flex-col items-center justify-between p-1.5"
        style={{
          backfaceVisibility: "hidden",
          background: faceUp ? "white" : "linear-gradient(135deg, #1E3A5F, #2C5282)",
          borderColor: faceUp ? (red ? "#FCA5A5" : "#D1D5DB") : "#1E3A5F",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {faceUp ? (
          <>
            <div className={"self-start text-xs font-black leading-none " + (red ? "text-red-600" : "text-gray-800")}>
              <div>{card.rank}</div>
              <div>{card.suit}</div>
            </div>
            <div className={"text-2xl font-black " + (red ? "text-red-600" : "text-gray-800")}>{card.suit}</div>
            <div className={"self-end text-xs font-black leading-none rotate-180 " + (red ? "text-red-600" : "text-gray-800")}>
              <div>{card.rank}</div>
              <div>{card.suit}</div>
            </div>
          </>
        ) : (
          <div className="absolute inset-2 rounded-lg border border-blue-300/30 flex items-center justify-center">
            <div className="text-blue-200/40 text-3xl font-black">♠♥</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const TeenPatti = ({ onScore, liveCode }: Props) => {
  const [playerChips, setPlayerChips] = useState(1000);
  const [botChips, setBotChips] = useState(1000);
  const [pot, setPot] = useState(0);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [botCards, setBotCards] = useState<Card[]>([]);
  const [playerSeen, setPlayerSeen] = useState(false);
  const [botSeen, setBotSeen] = useState(false);
  const [currentBet, setCurrentBet] = useState(20);
  const [gamePhase, setGamePhase] = useState<"betting" | "show" | "gameover">("betting");
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [message, setMessage] = useState("Nova ronda! Aposte ou veja as suas cartas.");
  const [showResult, setShowResult] = useState(false);
  const [winner, setWinner] = useState("");
  const [handResult, setHandResult] = useState("");
  const [roundNum, setRoundNum] = useState(0);
  const [dealAnim, setDealAnim] = useState(false);

  const startRound = useCallback(() => {
    const deck = shuffle(createDeck());
    const pc = deck.slice(0, 3);
    const bc = deck.slice(3, 6);
    setPlayerCards(pc);
    setBotCards(bc);
    setPlayerSeen(false);
    setBotSeen(false);
    setCurrentBet(20);
    setPot(0);
    setGamePhase("betting");
    setTurn("player");
    setShowResult(false);
    setWinner("");
    setHandResult("");
    setDealAnim(true);
    setRoundNum(r => r + 1);
    const ante = 20;
    setPlayerChips(p => p - ante);
    setBotChips(b => b - ante);
    setPot(ante * 2);
    setMessage("Nova ronda! Aposte ou veja as suas cartas.");
    setTimeout(() => setDealAnim(false), 600);
  }, []);

  useEffect(() => { startRound(); }, []);

  const playerHand = evalHand(playerCards);
  const botHand = evalHand(botCards);

  const doShow = useCallback(() => {
    setGamePhase("show");
    setShowResult(true);
    const cmp = compareHands(playerHand, botHand);
    if (cmp > 0) {
      const w = pot;
      setPlayerChips(p => p + w);
      setWinner("Voce venceu esta ronda!");
      setHandResult(`Voce: ${HAND_NAMES[playerHand.rank]} vs Bot: ${HAND_NAMES[botHand.rank]}`);
      onScore?.("Teen Patti", w);
    } else if (cmp < 0) {
      const w = pot;
      setBotChips(b => b + w);
      setWinner("Bot venceu esta ronda!");
      setHandResult(`Voce: ${HAND_NAMES[playerHand.rank]} vs Bot: ${HAND_NAMES[botHand.rank]}`);
    } else {
      const half = Math.floor(pot / 2);
      setPlayerChips(p => p + half);
      setBotChips(b => b + pot - half);
      setWinner("Empate! Fichas divididas.");
      setHandResult(`Ambos: ${HAND_NAMES[playerHand.rank]}`);
    }
  }, [playerHand, botHand, pot, onScore]);

  const playerBet = useCallback((amount: number) => {
    if (turn !== "player" || gamePhase !== "betting") return;
    const blind = !playerSeen;
    const bet = blind ? amount : amount * 2;
    if (playerChips < bet) { setMessage("Fichas insuficientes!"); return; }
    setPlayerChips(p => p - bet);
    setPot(pt => pt + bet);
    setTurn("bot");
    setMessage("Bot esta a pensar...");
  }, [turn, gamePhase, playerSeen, playerChips]);

  useEffect(() => {
    if (turn !== "bot" || gamePhase !== "betting") return;
    const timer = setTimeout(() => {
      if (Math.random() < 0.3 && !botSeen) {
        setBotSeen(true);
        setMessage("Bot viu as suas cartas!");
      }
      const shouldShow = roundNum > 3 && Math.random() < 0.25;
      if (shouldShow) {
        doShow();
        return;
      }
      const blind = !botSeen;
      const betAmt = blind ? currentBet : currentBet * 2;
      if (botChips < betAmt) {
        doShow();
        return;
      }
      setBotChips(b => b - betAmt);
      setPot(pt => pt + betAmt);
      setTurn("player");
      setMessage("Sua vez! Aposte ou veja as cartas.");
    }, 1000 + Math.random() * 800);
    return () => clearTimeout(timer);
  }, [turn, gamePhase, botChips, botSeen, currentBet, doShow, roundNum]);

  useEffect(() => {
    if (playerChips <= 0 || botChips <= 0) {
      setGamePhase("gameover");
      setWinner(playerChips <= 0 ? "Bot venceu o jogo!" : "Parabens! Voce venceu o jogo!");
      if (playerChips > 0) onScore?.("Teen Patti", playerChips);
    }
  }, [playerChips, botChips, onScore]);

  const raiseBet = () => {
    const next = Math.min(currentBet + 20, 100);
    setCurrentBet(next);
  };

  const feltBg = "radial-gradient(ellipse at center, #1B5E20 0%, #0D3B0F 60%, #0A2E0C 100%)";

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-900/50 text-emerald-200 border border-emerald-700/50">
          <Coins className="h-3.5 w-3.5 text-amber-400" /> Voce: {playerChips}
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-900/50 text-amber-200 border border-amber-700/50">
          Pote: {pot}
        </div>
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-red-900/50 text-red-200 border border-red-700/50">
          <Coins className="h-3.5 w-3.5 text-amber-400" /> Bot: {botChips}
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden p-5" style={{ background: feltBg, border: "4px solid #4A2C0A", boxShadow: "inset 0 0 80px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.03), transparent 60%)" }} />

        <div className="relative z-10">
          <p className="text-center text-xs text-emerald-300/60 mb-3 font-bold">BOT</p>
          <div className="flex justify-center gap-2 mb-6">
            {botCards.map((c, i) => (
              <CardComponent key={"b" + roundNum + i} card={c} faceUp={showResult} delay={i * 0.15} />
            ))}
          </div>
          {botSeen && !showResult && (
            <p className="text-center text-xs text-amber-300 mb-3">Bot viu as cartas (aposta dobrada)</p>
          )}

          <div className="flex items-center justify-center gap-2 my-4">
            <div className="h-px flex-1 bg-emerald-600/30" />
            <div className="text-lg font-black text-amber-400">{pot}</div>
            <div className="h-px flex-1 bg-emerald-600/30" />
          </div>

          <p className="text-center text-xs text-emerald-300/60 mb-3 font-bold">VOCE</p>
          <div className="flex justify-center gap-2 mb-4">
            {playerCards.map((c, i) => (
              <CardComponent key={"p" + roundNum + i} card={c} faceUp={playerSeen} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={message} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-xs text-muted-foreground mt-3 h-5">
          {message}
        </motion.p>
      </AnimatePresence>

      {gamePhase === "betting" && turn === "player" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
          {!playerSeen && (
            <Button onClick={() => setPlayerSeen(true)} className="w-full gap-2" variant="outline">
              <Eye className="h-4 w-4" /> Ver Cartas (aposta dobrada)
            </Button>
          )}
          {playerSeen && (
            <div className="text-center text-xs text-emerald-400 mb-1">
              Sua mao: {HAND_NAMES[playerHand.rank]} {playerCards.map(c => RANK_NAMES[c.rank] + c.suit).join(" ")}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => playerBet(currentBet)} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Coins className="h-4 w-4" /> Apostar {(!playerSeen ? currentBet : currentBet * 2)}
            </Button>
            <Button onClick={raiseBet} variant="outline" className="flex-1">Aumentar (+20)</Button>
            <Button onClick={doShow} variant="destructive" className="gap-2">
              <EyeOff className="h-4 w-4" /> Mostrar
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            Aposta atual: {currentBet} {playerSeen ? "(vista x2)" : "(cega)"}
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl bg-card border p-5 text-center">
            <Trophy className={"h-8 w-8 mx-auto mb-2 " + (winner.includes("Voce") ? "text-amber-500" : "text-slate-400")} />
            <p className="text-lg font-black mb-1">{winner}</p>
            <p className="text-xs text-muted-foreground mb-3">{handResult}</p>
            <Button onClick={startRound} className="gap-2"><RotateCcw className="h-4 w-4" /> Proxima Ronda</Button>
          </motion.div>
        )}
        {gamePhase === "gameover" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl bg-card border p-6 text-center">
            <Trophy className={"h-10 w-10 mx-auto mb-3 " + (winner.includes("Voce") ? "text-amber-500" : "text-red-500")} />
            <p className="text-xl font-black mb-1">{winner}</p>
            <p className="text-sm text-muted-foreground mb-4">Fichas finais: Voce {playerChips} | Bot {botChips}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={startRound} className="gap-2"><RotateCcw className="h-4 w-4" /> Jogar Novamente</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeenPatti;
