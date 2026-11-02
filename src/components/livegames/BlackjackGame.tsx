import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Spade, RotateCcw, Hand, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import {
  shuffleDeck, drawCards, reshuffle, handScore, isBlackjack,
  DeckApiError, DECK_ATTRIBUTION, type ApiCard, type Deck,
} from "@/lib/deckOfCards";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════
// BLACKJACK 21 — baralho REAL da Deck of Cards API (v30)
//
// · Cartas vêm do servidor embaralhado (6 decks = sapateiro de casino)
// · Imagens PNG oficiais da própria API — nada desenhado/improvisado
// · Blackjack paga 3:2 · vencedor 2:1 · empate devolve a aposta
// · Estado de erro HONESTO: se a API estiver em baixo, o jogo não
//   simula baralho local disfarçado — mostra o erro e tenta de novo.
// · Motion (skill design-motion-principles): animação só onde serve —
//   distribuição de cartas (compreensão de estado) e resultado. Sem
//   pulsos decorativos, sem hover-scale.
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "boot" | "error" | "betting" | "dealing" | "player" | "dealer" | "settled";

const CARD_MS = 240; // duração única e calma (jakub-krehel: subtil, consistente)

function CardView({ card, hidden, index }: { card: ApiCard | null; hidden?: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -14, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: CARD_MS / 1000, delay: index * 0.06 }}
      className="relative w-[68px] h-[96px] sm:w-[76px] sm:h-[108px] rounded-lg overflow-hidden shadow-md ring-1 ring-black/10 bg-white"
      data-testid={hidden ? "blackjack-hidden-card" : "blackjack-card"}
    >
      {card && (
        <img
          src={card.image}
          alt="Carta do baralho"
          className="w-full h-full object-cover select-none"
          draggable={false}
          loading="eager"
        />
      )}
      {hidden && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
          <span className="text-white/70 text-xl font-black tracking-widest">♠</span>
        </div>
      )}
    </motion.div>
  );
}

export default function BlackjackGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<Phase>("boot");
  const [errMsg, setErrMsg] = useState("");
  const [shoeCount, setShoeCount] = useState<number | null>(null); // display
  const [player, setPlayer] = useState<ApiCard[]>([]);
  const [dealer, setDealer] = useState<ApiCard[]>([]);
  const [hiddenDealer, setHiddenDealer] = useState(true);
  const [outcome, setOutcome] = useState<"" | "win" | "lose" | "push" | "bj">("");
  const [payoutMsg, setPayoutMsg] = useState("");
  const [refunded, setRefunded] = useState(false); // só TRUE quando uma aposta real foi devolvida
  const busy = useRef(false);
  const deckRef = useRef<Deck | null>(null); // baralho fora do estado — nunca recria callbacks

  // ── Sapateiro: um baralho real de 6 decks partilhado pelas rondas ──────
  const ensureDeck = useCallback(async (forceNew = false): Promise<Deck> => {
    let d = deckRef.current;
    if (!d || forceNew || d.remaining < 60) {
      if (d && !forceNew && d.remaining < 60) {
        try { await reshuffle(d.deckId); d = { ...d, remaining: 6 * 52 }; deckRef.current = d; setShoeCount(d.remaining); return d; } catch { /* cai abaixo */ }
      }
      d = await shuffleDeck(6);
      deckRef.current = d;
      setShoeCount(d.remaining);
    }
    return d;
  }, []);

  const boot = useCallback(async () => {
    setPhase("boot");
    setErrMsg("");
    setRefunded(false);
    try {
      await ensureDeck(true);
      setPhase("betting");
    } catch (err) {
      setErrMsg(err instanceof DeckApiError ? err.message : "Sem ligação à API do baralho");
      setPhase("error");
    }
  }, [ensureDeck]);

  useEffect(() => { boot(); }, [boot]);

  /** Distribui 4 cartas reais (2 jogador, 2 banca — 1 tapada). */
  const deal = useCallback(async () => {
    if (busy.current || phase !== "betting") return;
    if (!placeBet(bet)) return;
    setWallet(getWallet());
    busy.current = true;
    setOutcome(""); setPayoutMsg(""); setRefunded(false);
    try {
      const d = await ensureDeck();
      const { cards, remaining } = await drawCards(d.deckId, 4);
      deckRef.current = { deckId: d.deckId, remaining };
      setShoeCount(remaining);
      const p = [cards[0], cards[2]];
      const dl = [cards[1], cards[3]];
      setPlayer(p); setDealer(dl); setHiddenDealer(true);
      setPhase("dealing");
      const pBJ = isBlackjack(p);
      const dBJ = isBlackjack(dl);
      setTimeout(() => {
        if (pBJ || dBJ) {
          // Blackjack natural: revela e resolve de imediato
          setHiddenDealer(false);
          resolveNaturals(p, dl, pBJ, dBJ);
        } else {
          setPhase("player");
        }
        busy.current = false;
      }, 520);
    } catch (err) {
      busy.current = false;
      setErrMsg(err instanceof DeckApiError ? err.message : "Falha ao tirar cartas");
      setPhase("error");
      // aposta devolvida honestamente — a ronda não aconteceu
      addPayout("Blackjack", bet, bet);
      setRefunded(true);
      setWallet(getWallet());
    }
  }, [phase, bet, ensureDeck]);

  /** Resolução de blackjacks naturais (antes de qualquer decisão). */
  const resolveNaturals = (p: ApiCard[], dl: ApiCard[], pBJ: boolean, dBJ: boolean) => {
    if (pBJ && dBJ) return settle("push", 0, "Dois blackjacks — empate, aposta devolvida.");
    if (pBJ) return settle("bj", Math.round(bet * 2.5), `BLACKJACK! Pagamento 3:2 — ${fmtCoins(Math.round(bet * 2.5))}!`);
    return settle("lose", 0, "A banca tem blackjack. Perdeste a aposta.");
  };

  /** Fecha a ronda com pagamento honesto. */
  const settle = (kind: "win" | "lose" | "push" | "bj", payout: number, msg: string) => {
    addPayout("Blackjack", bet, payout);
    setWallet(getWallet());
    setOutcome(kind);
    setPayoutMsg(msg);
    setPhase("settled");
    onScore?.("Blackjack", Math.max(1, Math.round((payout - bet) / 10)));
    if (kind === "win" || kind === "bj") {
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });
    }
  };

  const hit = useCallback(async () => {
    if (phase !== "player" || busy.current || !deckRef.current) return;
    busy.current = true;
    try {
      const { cards, remaining } = await drawCards(deckRef.current!.deckId, 1);
      deckRef.current = { deckId: deckRef.current!.deckId, remaining };
      setShoeCount(remaining);
      const next = [...player, cards[0]];
      setPlayer(next);
      const score = handScore(next);
      if (score > 21) {
        setHiddenDealer(false);
        setTimeout(() => settle("lose", 0, `Tepestes (${score}). A banca ganha.`), 380);
      }
    } catch (err) {
      setErrMsg(err instanceof DeckApiError ? err.message : "Falha ao tirar carta");
      setPhase("error");
      addPayout("Blackjack", bet, bet);
      setRefunded(true);
      setWallet(getWallet());
    } finally {
      busy.current = false;
    }
  }, [phase, player, dealer, bet]);

  const stand = useCallback(async () => {
    if (phase !== "player" || busy.current || !deckRef.current) return;
    busy.current = true;
    setPhase("dealer");
    setHiddenDealer(false);
    try {
      let d = { deckId: deckRef.current.deckId, remaining: deckRef.current.remaining };
      let dl = [...dealer];
      // banca puxa até 17 (para em 17, padrão real de mesa)
      while (handScore(dl) < 17) {
        const { cards, remaining } = await drawCards(d.deckId, 1);
        d = { deckId: d.deckId, remaining };
        deckRef.current = d;
        setShoeCount(remaining);
        dl = [...dl, cards[0]];
        setDealer(dl);
        await new Promise((r) => setTimeout(r, 420));
      }
      const pScore = handScore(player);
      const dScore = handScore(dl);
      if (dScore > 21) settle("win", bet * 2, `Banca tepestes (${dScore}) — ganhaste ${fmtCoins(bet * 2)}!`);
      else if (dScore > pScore) settle("lose", 0, `Banca ${dScore} contra ${pScore}. Perdeste.`);
      else if (dScore < pScore) settle("win", bet * 2, `${pScore} contra ${dScore} — ganhaste ${fmtCoins(bet * 2)}!`);
      else settle("push", bet, `Empate a ${pScore} — aposta devolvida.`);
    } catch (err) {
      setErrMsg(err instanceof DeckApiError ? err.message : "Falha na jogada da banca");
      setPhase("error");
      addPayout("Blackjack", bet, bet);
      setRefunded(true);
      setWallet(getWallet());
    } finally {
      busy.current = false;
    }
  }, [phase, dealer, player, bet]);

  const newRound = useCallback(() => {
    setPlayer([]); setDealer([]); setOutcome(""); setPayoutMsg(""); setHiddenDealer(true);
    setPhase("betting");
  }, []);

  const pScore = handScore(player);
  const dScore = handScore(hiddenDealer ? dealer.slice(0, 1) : dealer);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Spade className="h-6 w-6 text-emerald-400" /> Blackjack 21
        </h2>
        <p className="text-xs text-muted-foreground">
          Baralho real de 6 decks embaralhado no servidor · Blackjack paga 3:2
        </p>
      </div>

      {/* Erro honesto — sem simulação disfarçada */}
      {phase === "error" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2" data-testid="blackjack-error">
          <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Baralho indisponível</p>
          <p className="text-xs text-muted-foreground">
            {errMsg}
            {refunded && " A aposta desta ronda foi devolvida."}
          </p>
          <Button onClick={boot} variant="outline" size="sm" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <RotateCcw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {phase === "boot" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="blackjack-boot">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-bold text-muted-foreground">A pedir baralho real à API…</p>
        </div>
      )}

      {(phase !== "boot" && phase !== "error") && (
        <>
          {/* Mesa */}
          <div className="rounded-2xl border border-emerald-900/30 bg-gradient-to-b from-emerald-950/60 to-slate-950/60 p-4 space-y-4" data-testid="blackjack-table">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-black text-emerald-300/80">Banca {phase !== "betting" && phase !== "dealing" ? `· ${dScore}` : ""}</span>
              {shoeCount !== null && (
                <span className="text-[10px] text-muted-foreground tabular-nums" data-testid="blackjack-shoe">{shoeCount} cartas no sapateiro</span>
              )}
            </div>
            <div className="flex gap-1.5 min-h-[96px] sm:min-h-[108px] items-center">
              {dealer.map((c, i) => (
                <CardView key={c.code + i} card={c} hidden={hiddenDealer && i === 1} index={i} />
              ))}
              {dealer.length === 0 && phase !== "betting" && <span className="text-xs text-muted-foreground/50">—</span>}
            </div>
            <div className="h-px bg-emerald-800/40" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-black text-sky-300/80">Tu {phase !== "betting" && phase !== "dealing" ? `· ${pScore}` : ""}</span>
              {(phase === "player") && pScore >= 17 && (
                <span className="text-[10px] font-bold text-amber-400">17+ — podes levantar</span>
              )}
            </div>
            <div className="flex gap-1.5 min-h-[96px] sm:min-h-[108px] items-center">
              {player.map((c, i) => (
                <CardView key={c.code + i} card={c} index={i} />
              ))}
              {player.length === 0 && phase !== "betting" && <span className="text-xs text-muted-foreground/50">—</span>}
            </div>
          </div>

          {/* Resultado — um bloco, sem parpadeo */}
          <AnimatePresence>
            {payoutMsg && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                data-testid="blackjack-outcome"
                className={cn(
                  "text-center font-bold text-sm rounded-lg px-3 py-2",
                  outcome === "win" || outcome === "bj" ? "text-emerald-400 bg-emerald-500/10" :
                  outcome === "lose" ? "text-rose-400 bg-rose-500/10" : "text-amber-400 bg-amber-500/10"
                )}
              >
                {outcome === "bj" ? "🎉 " : outcome === "win" ? "✅ " : outcome === "lose" ? "❌ " : "🤝 "}{payoutMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Acções — só as que existem nesta fase */}
          {phase === "player" && (
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              <Button onClick={hit} disabled={busy.current} className="h-12 font-black bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300" data-testid="blackjack-hit">
                <Hand className="h-4 w-4 mr-1" /> Pedir carta
              </Button>
              <Button onClick={stand} disabled={busy.current} className="h-12 font-black bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/40 text-amber-300" data-testid="blackjack-stand">
                Manter
              </Button>
            </div>
          )}

          {(phase === "betting" || phase === "settled") && (
            <Button onClick={phase === "betting" ? deal : newRound} disabled={wallet.balance < bet && phase === "betting"} className="w-full h-12 text-base font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 shadow-lg shadow-emerald-500/25" data-testid="blackjack-main-btn">
              <RotateCcw className="mr-2 h-5 w-5" />
              {phase === "betting" ? `Distribuir — ${fmtCoins(bet)} moedas` : "Nova ronda"}
            </Button>
          )}

          <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "player" || phase === "dealing" || phase === "dealer"} gameName="Blackjack" />
        </>
      )}

      <p className="text-center text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1" data-testid="blackjack-attribution">
        <ExternalLink className="h-3 w-3" /> {DECK_ATTRIBUTION}
      </p>
    </div>
  );
}
