import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { RotateCcw, AlertTriangle, Loader2, ExternalLink, Sparkles, Ruler, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPokemon, getAllNames, randomPokemonId, randomDistinctIds,
  typePt, heightM, weightKg, POKEMON_ATTRIBUTION,
  type PokemonData,
} from "@/lib/pokeapi";

// ═══════════════════════════════════════════════════════════════════════
// QUEM É ESSE POKÉMON? — dados REAIS da PokéAPI (v30)
//
// · Silhueta = arte oficial da API com filtro CSS (nada desenhado por nós)
// · 4 opções = nomes canónicos REAIS (1 certo + 3 distratores reais)
// · Após revelar: tipos reais, altura e peso reais da Pokédex
// · Respeito à API partilhada: 1 pedido para TODOS os nomes (cache 7d)
//   + 1 pedido por Pokémon alvo (cache 7d) — nunca um pedido por opção
// · Erro honesto: API em baixo → mensagem real + tentar de novo
// · Nota honesta: a PokéAPI não tem nomes em pt — mostramos o nome
//   canónico em inglês (real) com interface em português.
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "loading" | "ready" | "answered" | "error";

interface Round {
  target: PokemonData;
  options: string[]; // 4 nomes reais, baralhados
}

function shuffle5<T>(arr: T[]): T[] {
  const a = [...arr];
  const rnd = (n: number) => {
    const buf = new Uint32Array(1);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
    else buf[0] = Math.floor(Math.random() * 2 ** 32);
    return buf[0] % n;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PokemonGuess({ onScore }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [round, setRound] = useState<Round | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [points, setPoints] = useState(0);
  const namesRef = useRef<{ id: number; name: string }[] | null>(null);

  // ── 1 pedido carrega TODOS os nomes (cache 7 dias) ─────────────────────
  const ensureNames = useCallback(async () => {
    if (namesRef.current) return namesRef.current;
    const names = await getAllNames();
    namesRef.current = names;
    return names;
  }, []);

  /** Nova ronda: 1 Pokémon real + 3 distratores reais. */
  const newRound = useCallback(async () => {
    setPhase("loading");
    setChosen(null);
    setRound(null);
    try {
      const names = await ensureNames();
      const id = randomPokemonId();
      const target = await getPokemon(id);
      const decoyIds = randomDistinctIds(3, id);
      const byId = new Map(names.map((n) => [n.id, n.name]));
      const decoys = decoyIds
        .map((d) => byId.get(d))
        .filter((n): n is string => Boolean(n));
      // fallback honesto: se os ids sorteados não estiverem na lista, usa nomes aleatórios REAIS
      while (decoys.length < 3) {
        const cand = names[Math.floor(Math.random() * names.length)];
        if (cand && cand.name !== target.name && !decoys.includes(cand.name)) decoys.push(cand.name);
      }
      setRound({ target, options: shuffle5([target.name, ...decoys.slice(0, 3)]) });
      setPhase("ready");
    } catch (err) {
      setErrMsg(err instanceof Error && err.name === "PokeApiError" ? err.message : "Sem ligação à PokéAPI");
      setPhase("error");
    }
  }, [ensureNames]);

  useEffect(() => { newRound(); }, [newRound]);

  const guess = useCallback((name: string) => {
    if (phase !== "ready" || !round) return;
    setChosen(name);
    setPhase("answered");
    const correct = name === round.target.name;
    if (correct) {
      const gained = 10 + Math.min(streak, 5) * 2; // +2 por acerto em sequência (máx +10)
      const newStreak = streak + 1;
      const newPoints = points + gained;
      setStreak(newStreak);
      setPoints(newPoints);
      setBest((b) => Math.max(b, newStreak));
      onScore?.("Pokémon Quiz", Math.max(1, Math.round(newPoints / 10)));
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.55 } });
    } else {
      setStreak(0);
      onScore?.("Pokémon Quiz", Math.max(1, Math.round(points / 10)));
    }
  }, [phase, round, streak, points, onScore]);

  const correct = chosen !== null && round !== null && chosen === round.target.name;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-400" /> Quem é esse Pokémon?
        </h2>
        <p className="text-xs text-muted-foreground">
          Silhueta da arte oficial · nomes canónicos reais da PokéAPI
        </p>
      </div>

      {/* Marcador — calmo, sem pulso decorativo (skill motion: zero pulsos) */}
      <div className="flex items-center justify-center gap-4 text-xs font-bold" data-testid="pokemon-scorebar">
        <span className="text-muted-foreground">Pontos <span className="text-foreground tabular-nums">{points}</span></span>
        <span className="text-muted-foreground">Sequência <span className="text-emerald-500 tabular-nums">{streak}</span></span>
        <span className="text-muted-foreground">Melhor <span className="text-amber-500 tabular-nums">{best}</span></span>
      </div>

      {phase === "error" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2" data-testid="pokemon-error">
          <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Pokédex indisponível</p>
          <p className="text-xs text-muted-foreground">{errMsg}</p>
          <Button onClick={newRound} variant="outline" size="sm" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <RotateCcw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="pokemon-loading">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-muted-foreground">A pedir um Pokémon real à PokéAPI…</p>
        </div>
      )}

      {round && (phase === "ready" || phase === "answered") && (
        <>
          {/* Silhueta → revelação (o momento lúdico do jogo — aqui a animação serve) */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-amber-500/5 to-slate-500/5 p-6 flex flex-col items-center" data-testid="pokemon-stage">
            <motion.img
              key={round.target.id + (phase === "answered" ? "-r" : "-s")}
              src={round.target.artwork}
              alt={phase === "answered" ? round.target.name : "Silhueta de Pokémon"}
              draggable={false}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.32 }}
              data-testid={phase === "answered" ? "pokemon-artwork" : "pokemon-silhouette"}
              className={cn(
                "h-36 w-36 sm:h-44 sm:w-44 object-contain select-none",
                phase === "ready" && "brightness-0 contrast-200",
                phase === "answered" && !correct && "grayscale",
              )}
            />
            {phase === "answered" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center space-y-1.5"
                data-testid="pokemon-reveal"
              >
                <p className={cn("text-lg font-black capitalize", correct ? "text-emerald-500" : "text-rose-500")}>
                  {correct ? "✅ Acertou!" : `❌ Era ${round.target.name}!`}
                </p>
                <p className="text-sm font-bold capitalize text-foreground">
                  {round.target.types.map((t) => typePt(t)).join(" · ")}
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {heightM(round.target.heightDm)}</span>
                  <span className="inline-flex items-center gap-1"><Weight className="h-3 w-3" /> {weightKg(round.target.weightHg)}</span>
                  <span className="tabular-nums">Nº {String(round.target.id).padStart(4, "0")}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Opções — nomes REAIS, 2×2, focus visível */}
          <div className="grid grid-cols-2 gap-2" data-testid="pokemon-options">
            {round.options.map((name) => {
              const isChosen = chosen === name;
              const isTarget = name === round.target.name;
              return (
                <Button
                  key={name}
                  onClick={() => guess(name)}
                  disabled={phase === "answered"}
                  variant="outline"
                  className={cn(
                    "h-12 font-bold capitalize transition-colors",
                    phase === "answered" && isTarget && "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    phase === "answered" && isChosen && !isTarget && "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    phase === "answered" && !isTarget && !isChosen && "opacity-50",
                    phase === "ready" && "hover:border-amber-500/50 hover:bg-amber-500/5",
                  )}
                >
                  {name}
                </Button>
              );
            })}
          </div>

          <AnimatePresence>
            {phase === "answered" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Button onClick={newRound} className="w-full h-12 text-base font-black bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-500 shadow-lg shadow-amber-500/25" data-testid="pokemon-next">
                  <RotateCcw className="mr-2 h-5 w-5" /> Próximo Pokémon
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <p className="text-center text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1" data-testid="pokemon-attribution">
        <ExternalLink className="h-3 w-3" /> {POKEMON_ATTRIBUTION}
      </p>
    </div>
  );
}
