// ═══════════════════════════════════════════════════════════════
// StageQuiz — Quiz Milionário de Palco (modo apresentador).
// REA de "Quem Quer Ser Milionário" + Kahoot ao vivo:
//  - escada de prémios com níveis seguros (a cada 5 níveis)
//  - ajudas: 50:50, Plateia (sondagem visual) e Saltar
//  - CONTROLO TOTAL DO APRESENTADOR: revelar resposta, julgar
//    certo/errado, avançar, pausar o tempo, reiniciar
//  - prémio integrado ao orçamento da empresa (controlo de gastos)
//  - disclaimers das redes sociais no rodapé
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Play, Pause, RotateCcw, Eye, CheckCircle2, XCircle, SkipForward,
  Scissors, Users, Maximize2, X, Volume2, VolumeX, ShieldCheck, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "sonner";
import {
  type StageConfig, registerDraw, budgetCanSpin, budgetRemaining, fmtMzn,
  ladderFor, isSafeHaven, GAME_LABELS, PLATFORM_DISCLAIMERS,
} from "@/lib/liveGameStudio";

type Phase = "idle" | "playing" | "revealed" | "win" | "over";

interface Props {
  cfg: StageConfig;
  onChange: (cfg: StageConfig) => void;
  clean?: boolean;
  onExit?: () => void;
}

const LETTERS = ["A", "B", "C", "D"];

const StageQuiz = ({ cfg, onChange, clean = false, onExit }: Props) => {
  const { sfx } = useSoundEffects();
  const wrapRef = useRef<HTMLDivElement>(null);
  const questions = cfg.questions;

  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0); // índice 0-based
  const [selected, setSelected] = useState<number | null>(null);
  const [disabled, setDisabled] = useState<number[]>([]);
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [audience, setAudience] = useState<number[] | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(cfg.options.sound);
  const [earned, setEarned] = useState(0);

  const ladder = useMemo(() => ladderFor(cfg.ladder, questions.length), [cfg.ladder, questions.length]);
  const current = questions[level];
  const prizeFor = (lv: number) => (lv > 0 ? ladder[Math.min(lv - 1, ladder.length - 1)] : 0);
  const lastSafe = useMemo(() => {
    for (let i = level - 1; i >= 0; i--) if (isSafeHaven(i)) return ladder[i];
    return 0;
  }, [level, ladder]);
  const remaining = budgetRemaining(cfg);

  // reinicia ao trocar de pergunta
  useEffect(() => {
    setSelected(null);
    setDisabled([]);
    setAudience(null);
    setPaused(false);
    setTimeLeft(current?.timeSeconds ?? 30);
  }, [level, current]);

  const start = () => {
    setPhase("playing");
    setLevel(0);
    setEarned(0);
    setUsed({});
    if (sound) sfx.battleStart();
  };

  // cronómetro
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(iv);
          reveal(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, level]);

  const reveal = (timeout = false) => {
    if (phase === "idle" || phase === "win" || phase === "over") return;
    setPhase("revealed");
    setPaused(false);
    if (sound) sfx.pop();
    if (timeout) toast.info("Tempo esgotado — apresentador, julga a resposta.");
  };

  const judge = (ok: boolean) => {
    if (phase !== "revealed") return;
    const correct = selected !== null && selected === current.correct;
    if (ok && correct) {
      // acertou
      const amount = ladder[level];
      if (level >= questions.length - 1) {
        // CAMPEÃO
        setEarned(amount);
        setPhase("win");
        if (sound) sfx.win();
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.3 } });
        onChange(registerDraw(cfg, { game: "quiz", label: `Campeão do Quiz — ${fmtMzn(amount)}`, cost: amount, poolSize: 1, oddsPct: 0 }));
      } else {
        setEarned(amount);
        setLevel((l) => l + 1);
        setPhase("playing");
        if (sound) sfx.win();
        toast.success(`Nível ${level + 1} superado — ${fmtMzn(amount)}`);
      }
    } else {
      // errou
      const safe = lastSafe;
      setEarned(safe);
      setPhase("over");
      if (sound) sfx.lose();
      onChange(registerDraw(cfg, { game: "quiz", label: `Quiz terminado em nível ${level + 1} — ${safe > 0 ? fmtMzn(safe) : "sem prémio"}`, cost: safe, poolSize: 1, oddsPct: 0 }));
    }
  };

  const use5050 = () => {
    if (used["5050"] || phase !== "playing") return;
    const wrongs = [0, 1, 2, 3].filter((i) => i !== current.correct);
    const toDisable = wrongs.sort(() => Math.random() - 0.5).slice(0, 2);
    setDisabled(toDisable);
    setUsed((u) => ({ ...u, "5050": true }));
    if (sound) sfx.pop();
  };

  const useAudience = () => {
    if (used["plateia"] || phase !== "playing") return;
    // sondagem simulada: maioria tende à resposta correta
    const c = 45 + Math.floor(Math.random() * 26); // 45–70%
    let rest = 100 - c;
    const others = [0, 1, 2, 3].filter((i) => i !== current.correct).sort(() => Math.random() - 0.5);
    const dist = [0, 0, 0, 0];
    dist[current.correct] = c;
    others.forEach((i, k) => {
      const share = k === others.length - 1 ? rest : Math.floor(Math.random() * Math.max(1, rest - (others.length - 1 - k)));
      dist[i] = Math.min(share, rest);
      rest -= dist[i];
    });
    setAudience(dist);
    setUsed((u) => ({ ...u, plateia: true }));
    if (sound) sfx.pop();
  };

  const useSkip = () => {
    if (used["saltar"] || phase !== "playing") return;
    if (level >= questions.length - 1) {
      toast.info("É a última pergunta — sem saltos disponíveis.");
      return;
    }
    setUsed((u) => ({ ...u, saltar: true }));
    setLevel((l) => l + 1); // mantém o nível ganho, apenas troca a pergunta
    if (sound) sfx.pop();
  };

  const requestFs = () => {
    const el = wrapRef.current?.closest("[data-stage-root]") as HTMLElement | null;
    try { el?.requestFullscreen?.(); } catch { /* ignore */ }
  };

  const disclaimer = cfg.compliance.platforms.map((p) => PLATFORM_DISCLAIMERS[p]).join(" ");
  const timerPct = Math.max(0, Math.min(100, (timeLeft / (current?.timeSeconds ?? 30)) * 100));

  return (
    <div data-stage-root className="flex h-full flex-col bg-[#07070a] text-white">
      {!clean && (
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {cfg.brand.logoUrl ? (
            <img src={cfg.brand.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-black" style={{ background: cfg.brand.primaryColor, color: "#000" }}>
              {(cfg.brand.name || "B").slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{cfg.title || GAME_LABELS[cfg.game]}</p>
            <p className="truncate text-[11px] text-zinc-400">{cfg.brand.name}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> AO VIVO
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSound((s) => !s)} aria-label="Som">
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={requestFs} aria-label="Ecrã inteiro"><Maximize2 className="h-4 w-4" /></Button>
          {onExit && <Button size="sm" variant="ghost" onClick={onExit} aria-label="Sair"><X className="h-4 w-4" /></Button>}
        </header>
      )}

      <div ref={wrapRef} className="flex min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
        {/* escada de prémios */}
        <aside className="order-2 w-full shrink-0 lg:order-1 lg:max-h-full lg:w-52 lg:overflow-y-auto" data-testid="stage-ladder">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"><Trophy className="h-3 w-3" />Escada de Prémios</p>
          <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {ladder.map((amount, i) => {
              const isCurrent = i === level;
              const isPast = i < level;
              const safe = isSafeHaven(i);
              return (
                <li key={i}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold lg:w-full ${
                    isCurrent ? "bg-amber-500 text-black" : isPast ? "text-emerald-400" : safe ? "bg-white/10 text-amber-300" : "text-zinc-300"
                  }`}
                  data-testid={isCurrent ? "stage-ladder-current" : undefined}
                >
                  <span className="w-5 text-[10px] opacity-70">{i + 1}</span>
                  <span className="flex-1">{fmtMzn(amount)}</span>
                  {safe && <ShieldCheck className="h-3 w-3" />}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* palco principal */}
        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col items-center gap-5 py-2 lg:order-2 lg:overflow-y-auto lg:px-2">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">{cfg.brand.name} apresenta</p>
                <h1 className="mt-2 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text font-display text-4xl font-black text-transparent sm:text-5xl">
                  QUIZ MILIONÁRIO
                </h1>
                <p className="mt-2 text-sm text-zinc-400">{questions.length} perguntas · prémio máximo {fmtMzn(ladder[ladder.length - 1] || 0)}</p>
                <button
                  onClick={start}
                  data-testid="stage-quiz-start"
                  className="mt-6 flex items-center gap-2 rounded-full px-8 py-3 text-lg font-black shadow-xl transition-transform active:scale-95"
                  style={{ background: cfg.brand.primaryColor, color: "#000" }}
                >
                  <Play className="h-5 w-5" />COMEÇAR
                </button>
              </motion.div>
            )}

            {(phase === "playing" || phase === "revealed") && current && (
              <motion.div key={`q-${level}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-2xl">
                {/* tempo + nível */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">Nível {level + 1}/{questions.length}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" data-testid="stage-quiz-timer">
                    <div className={`h-full rounded-full transition-all duration-1000 ${timerPct < 30 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${timerPct}%` }} />
                  </div>
                  <span className={`text-sm font-black ${timeLeft <= 5 ? "animate-pulse text-red-400" : ""}`}>{timeLeft}s</span>
                </div>

                {/* pergunta */}
                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 to-black p-4 text-center shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <p className="text-base font-extrabold leading-snug sm:text-xl" data-testid="stage-quiz-question">{current.question}</p>
                </div>

                {/* opções */}
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {current.options.map((opt, i) => {
                    const isSel = selected === i;
                    const isOff = disabled.includes(i);
                    const showCorrect = phase === "revealed" && i === current.correct;
                    const showWrong = phase === "revealed" && isSel && i !== current.correct;
                    return (
                      <button
                        key={i}
                        disabled={isOff || phase === "revealed"}
                        onClick={() => { setSelected(i); if (sound) sfx.battleStart(); }}
                        data-testid={`stage-quiz-opt-${i}`}
                        className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition-all
                          ${isOff ? "border-white/5 bg-black/40 text-zinc-600 line-through" :
                            showCorrect ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" :
                            showWrong ? "border-red-500 bg-red-500/20 text-red-300" :
                            isSel ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 bg-white/5 hover:border-amber-400/60"}`}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-black ${isSel || showCorrect ? "bg-amber-400 text-black" : "bg-white/10"}`}>{LETTERS[i]}</span>
                        <span className="flex-1">{opt}</span>
                        {showCorrect && <CheckCircle2 className="h-5 w-5" />}
                        {showWrong && <XCircle className="h-5 w-5" />}
                      </button>
                    );
                  })}
                </div>

                {/* sondagem da plateia */}
                {audience && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3" data-testid="stage-quiz-audience">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Sondagem da plateia (simulada)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {audience.map((v, i) => (
                        <div key={i} className="text-center">
                          <motion.div initial={{ height: 4 }} animate={{ height: Math.max(4, v * 1.1) }} className="mx-auto w-6 rounded-t-md bg-amber-400/80" />
                          <p className="mt-1 text-[10px] font-bold">{LETTERS[i]} {v}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {phase === "win" && (
              <motion.div key="win" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" data-testid="stage-quiz-win">
                <Trophy className="mx-auto h-16 w-16 text-amber-400" />
                <h2 className="mt-3 font-display text-4xl font-black text-amber-300">CAMPEÃO!</h2>
                <p className="mt-2 text-2xl font-black" style={{ color: cfg.brand.primaryColor }}>{fmtMzn(earned)}</p>
                {!clean && (
                  <Button className="mt-6" onClick={start} style={{ background: cfg.brand.primaryColor, color: "#000" }}><RotateCcw className="mr-1 h-4 w-4" />Novo jogo</Button>
                )}
              </motion.div>
            )}

            {phase === "over" && (
              <motion.div key="over" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" data-testid="stage-quiz-over">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">Fim do jogo</p>
                <h2 className="mt-2 font-display text-3xl font-black text-white">{earned > 0 ? `Levas ${fmtMzn(earned)}` : "Sem prémio desta vez"}</h2>
                <p className="mt-1 text-sm text-zinc-400">A resposta certa era: {LETTERS[current?.correct ?? 0]}. {current?.correct !== undefined ? current.options[current.correct] : ""}</p>
                {!clean && (
                  <Button className="mt-6" onClick={start} style={{ background: cfg.brand.primaryColor, color: "#000" }}><RotateCcw className="mr-1 h-4 w-4" />Jogar outra vez</Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ajudas */}
          {(phase === "playing") && (
            <div className="flex gap-2" data-testid="stage-quiz-lifelines">
              <button onClick={use5050} disabled={!!used["5050"]} data-testid="stage-quiz-5050" className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-black ${used["5050"] ? "border-white/5 text-zinc-600" : "border-amber-400 text-amber-300 hover:bg-amber-400/10"}`} title="50:50">
                <Scissors className="h-4 w-4" />
              </button>
              <button onClick={useAudience} disabled={!!used["plateia"]} data-testid="stage-quiz-audience-btn" className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${used["plateia"] ? "border-white/5 text-zinc-600" : "border-sky-400 text-sky-300 hover:bg-sky-400/10"}`} title="Sondagem da plateia">
                <Users className="h-4 w-4" />
              </button>
              <button onClick={useSkip} disabled={!!used["saltar"]} data-testid="stage-quiz-skip" className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${used["saltar"] ? "border-white/5 text-zinc-600" : "border-emerald-400 text-emerald-300 hover:bg-emerald-400/10"}`} title="Saltar pergunta">
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* controlo do apresentador */}
        {!clean && (
          <aside className="order-3 w-full shrink-0 space-y-2 lg:max-h-full lg:w-52 lg:overflow-y-auto" data-testid="stage-quiz-host">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Controlo do apresentador</p>
            {phase === "playing" && (
              <>
                <Button size="sm" className="w-full bg-amber-500 font-bold text-black hover:bg-amber-400" onClick={() => reveal(false)} data-testid="stage-quiz-reveal"><Eye className="mr-1 h-4 w-4" />Revelar resposta</Button>
                <Button size="sm" variant="secondary" className="w-full" onClick={() => setPaused((p) => !p)}>
                  {paused ? <><Play className="mr-1 h-4 w-4" />Retomar</> : <><Pause className="mr-1 h-4 w-4" />Pausar tempo</>}
                </Button>
              </>
            )}
            {phase === "revealed" && (
              <>
                <Button size="sm" className="w-full bg-emerald-500 font-bold text-white hover:bg-emerald-400" onClick={() => judge(true)} data-testid="stage-quiz-right"><CheckCircle2 className="mr-1 h-4 w-4" />Certo ✓</Button>
                <Button size="sm" className="w-full bg-red-500 font-bold text-white hover:bg-red-400" onClick={() => judge(false)} data-testid="stage-quiz-wrong"><XCircle className="mr-1 h-4 w-4" />Errado ✗</Button>
              </>
            )}
            {(phase === "revealed") && (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => { if (level < questions.length - 1) { setLevel((l) => l + 1); setPhase("playing"); } }}><SkipForward className="mr-1 h-4 w-4" />Avançar sem julgar</Button>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-zinc-400">
              <p className="font-bold text-zinc-300">Prémio em jogo</p>
              <p className="mt-1 text-lg font-black text-amber-300">{fmtMzn(ladder[level] || 0)}</p>
              {lastSafe > 0 && <p className="mt-1">Garantido: {fmtMzn(lastSafe)}</p>}
              {cfg.budget.enabled && <p className="mt-2 border-t border-white/10 pt-2">Orçamento restante: <span className="font-bold text-white">{fmtMzn(remaining)}</span></p>}
              {!budgetCanSpin(cfg) && <p className="mt-1 font-bold text-red-400">Orçamento esgotado!</p>}
            </div>
          </aside>
        )}
      </div>

      {cfg.options.showDisclaimer && (
        <div className="border-t border-white/10 bg-black/60 px-4 py-1.5" data-testid="stage-disclaimer">
          <p className="text-[10px] text-zinc-500">{disclaimer || "Promoção amistosa — participação gratuita, sem pagamento."}</p>
        </div>
      )}
    </div>
  );
};

export default StageQuiz;
