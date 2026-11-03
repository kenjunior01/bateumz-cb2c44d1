import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { RotateCcw, AlertTriangle, Loader2, ExternalLink, UtensilsCrossed, Globe2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  pratoAleatorio, listarAreas, indiceAleatorio, distratores, MEALDB_ATTRIBUTION,
  type MealBasico,
} from "@/lib/mealDB";

// ═══════════════════════════════════════════════════════════════════════
// SABORES DO MUNDO — dados REAIS da TheMealDB (v32)
//
// · Foto = strMealThumb oficial da API (nada desenhado por nós)
// · Pergunta: "De onde é este prato?" — 4 regiões REAIS
//   (1 certa + 3 distratores da lista real list.php?a=list)
// · Após revelar: nome original, categoria real e link para a receita
//   oficial na TheMealDB
// · Respeito à API partilhada: 1 pedido por ronda (random.php) + 1
//   pedido total para a lista de regiões, caches 24h/7d
// · Nota honesta: os nomes dos pratos ficam no idioma original da fonte
//   (maioritariamente inglês) — inventar tradução seria fabricar dados
// · Erro honesto: API em baixo → mensagem real + tentar de novo
// ═══════════════════════════════════════════════════════════════════════

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "loading" | "ready" | "answered" | "error";

interface Round {
  meal: MealBasico;
  options: string[]; // 4 regiões reais, baralhadas
}

function baralhar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = indiceAleatorio(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SaboresDoMundo({ onScore }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [round, setRound] = useState<Round | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [points, setPoints] = useState(0);
  const areasRef = useRef<string[] | null>(null);

  // ── 1 pedido carrega TODAS as regiões reais (cache 7 dias) ────────────
  const ensureAreas = useCallback(async () => {
    if (areasRef.current) return areasRef.current;
    const areas = await listarAreas();
    areasRef.current = areas;
    return areas;
  }, []);

  /** Nova ronda: 1 prato real + 3 regiões distratoras reais. */
  const newRound = useCallback(async () => {
    setPhase("loading");
    setChosen(null);
    setRound(null);
    try {
      const areas = await ensureAreas();
      const meal = await pratoAleatorio();
      const decoys = distratores(areas, meal.area);
      // fallback honesto: se a lista não tiver 3 regiões além da certa, usa
      // regiões reais repetidas dos pratos seguintes — nunca inventadas
      while (decoys.length < 3) {
        const cand = areas[indiceAleatorio(areas.length)];
        if (cand !== meal.area && !decoys.includes(cand)) decoys.push(cand);
      }
      setRound({ meal, options: baralhar([meal.area, ...decoys.slice(0, 3)]) });
      setPhase("ready");
    } catch (err) {
      setErrMsg(err instanceof Error && err.name === "MealDbError" ? err.message : "Sem ligação à TheMealDB");
      setPhase("error");
    }
  }, [ensureAreas]);

  useEffect(() => { newRound(); }, [newRound]);

  const guess = useCallback((area: string) => {
    if (phase !== "ready" || !round) return;
    setChosen(area);
    setPhase("answered");
    const correct = area === round.meal.area;
    if (correct) {
      const gained = 10 + Math.min(streak, 5) * 2;
      const newStreak = streak + 1;
      const newPoints = points + gained;
      setStreak(newStreak);
      setPoints(newPoints);
      setBest((b) => Math.max(b, newStreak));
      onScore?.("Sabores do Mundo", Math.max(1, Math.round(newPoints / 10)));
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.55 } });
    } else {
      setStreak(0);
      onScore?.("Sabores do Mundo", Math.max(1, Math.round(points / 10)));
    }
  }, [phase, round, streak, points, onScore]);

  const correct = chosen !== null && round !== null && chosen === round.meal.area;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-400" /> Sabores do Mundo
        </h2>
        <p className="text-xs text-muted-foreground">
          Pratos e fotos reais da TheMealDB — nomes no idioma original da fonte
        </p>
      </div>

      {/* Marcador — calmo, sem pulso decorativo (skill motion: zero pulsos) */}
      <div className="flex items-center justify-center gap-4 text-xs font-bold" data-testid="sabores-scorebar">
        <span className="text-muted-foreground">Pontos <span className="text-foreground tabular-nums">{points}</span></span>
        <span className="text-muted-foreground">Sequência <span className="text-emerald-500 tabular-nums">{streak}</span></span>
        <span className="text-muted-foreground">Melhor <span className="text-amber-500 tabular-nums">{best}</span></span>
      </div>

      {phase === "error" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-2" data-testid="sabores-error">
          <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Cozinha indisponível</p>
          <p className="text-xs text-muted-foreground">{errMsg}</p>
          <Button onClick={newRound} variant="outline" size="sm" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <RotateCcw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3" data-testid="sabores-loading">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-xs font-bold text-muted-foreground">A pedir um prato real à TheMealDB…</p>
        </div>
      )}

      {round && (phase === "ready" || phase === "answered") && (
        <>
          {/* Foto real → revelação (o momento lúdico — aqui a animação serve) */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-orange-500/5 to-amber-500/5 p-6 flex flex-col items-center" data-testid="sabores-stage">
            <motion.img
              key={round.meal.id + (phase === "answered" ? "-r" : "-s")}
              src={round.meal.thumb}
              alt={phase === "answered" ? round.meal.nome : "Prato real da TheMealDB"}
              draggable={false}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.32 }}
              data-testid={phase === "answered" ? "sabores-photo" : "sabores-photo"}
              className="h-36 w-36 sm:h-44 sm:w-44 object-cover rounded-xl select-none"
            />
            {phase === "answered" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center space-y-1.5"
                data-testid="sabores-reveal"
              >
                <p className={cn("text-lg font-black", correct ? "text-emerald-500" : "text-rose-500")}>
                  {correct ? "✅ Acertou!" : `❌ Era ${round.meal.area}!`}
                </p>
                <p className="text-sm font-bold text-foreground">{round.meal.nome}</p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {round.meal.area}</span>
                  <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {round.meal.categoria}</span>
                </div>
                <a
                  href={`https://www.themealdb.com/meal.php?i=${round.meal.id}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-500 hover:underline"
                  data-testid="sabores-receita"
                >
                  <ExternalLink className="h-3 w-3" /> Receita original
                </a>
              </motion.div>
            )}
          </div>

          {/* Opções — regiões REAIS, 2×2, focus visível */}
          <div className="grid grid-cols-2 gap-2" data-testid="sabores-options">
            {round.options.map((area) => {
              const isChosen = chosen === area;
              const isTarget = area === round.meal.area;
              return (
                <Button
                  key={area}
                  onClick={() => guess(area)}
                  disabled={phase === "answered"}
                  variant="outline"
                  className={cn(
                    "h-12 font-bold transition-colors",
                    phase === "answered" && isTarget && "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    phase === "answered" && isChosen && !isTarget && "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    phase === "answered" && !isTarget && !isChosen && "opacity-50",
                    phase === "ready" && "hover:border-orange-500/50 hover:bg-orange-500/5",
                  )}
                >
                  {area}
                </Button>
              );
            })}
          </div>

          <AnimatePresence>
            {phase === "answered" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Button onClick={newRound} className="w-full h-12 text-base font-black bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 shadow-lg shadow-orange-500/25" data-testid="sabores-next">
                  <RotateCcw className="mr-2 h-5 w-5" /> Próximo prato
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <p className="text-center text-[10px] text-muted-foreground/70 flex items-center justify-center gap-1" data-testid="sabores-attribution">
        <ExternalLink className="h-3 w-3" /> {MEALDB_ATTRIBUTION}
      </p>
    </div>
  );
}
