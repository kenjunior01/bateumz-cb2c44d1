// ============================================================
// QUIZ DA PRAÇA — perguntas REAIS da Open Trivia DB (v34)
// · Escada de dificuldade real: 2 fáceis → 2 médias → 2 difíceis
//   (mesma fonte honesta do Milionário, v25)
// · Nota honesta: o catálogo da fonte é em inglês — mostramos como
//   está, sem "traduzir por conta" (zero dados inventados)
// · Recompensa: +2 créditos de cidade por acerto, SÓ depois de
//   responder mesmo (adicionarCreditosCidade no fim)
// ============================================================

import { useCallback, useState } from "react";
import { HelpCircle, Loader2, Sparkles } from "lucide-react";
import { getReadyQuestions, type ReadyQuestion } from "@/lib/openTriviaDB";
import { adicionarCreditosCidade } from "@/game/cidade/missoes";
import { fireConfetti } from "@/lib/celebrate";
import { useLanguage } from "@/contexts/LanguageContext";

type Fase = "inicio" | "jogando" | "resultado" | "erro";
const CREDITO_POR_ACERTO = 2;

export default function QuizPraca() {
  const { t } = useLanguage();
  const [fase, setFase] = useState<Fase>("inicio");
  const [perguntas, setPerguntas] = useState<ReadyQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [creditosGanhos, setCreditosGanhos] = useState<number | null>(null);
  const [erroMsg, setErroMsg] = useState("");

  const comecar = useCallback(async () => {
    setFase("inicio");
    setErroMsg("");
    try {
      // escada real 2+2+2 com a API de alto nível (decodificada + opções
      // embaralhadas com crypto) — a getLadderQuestions devolve o formato
      // BRUTO da API (consumido pelo Milionário) e não serve aqui
      const [faceis, medias, dificeis] = await Promise.all([
        getReadyQuestions(2, undefined, "easy").catch(() => []),
        getReadyQuestions(2, undefined, "medium").catch(() => []),
        getReadyQuestions(2, undefined, "hard").catch(() => []),
      ]);
      const perg = [...faceis, ...medias, ...dificeis];
      if (perg.length === 0) throw new Error("A fonte não devolveu perguntas");
      setPerguntas(perg);
      setIdx(0);
      setAcertos(0);
      setEscolhida(null);
      setCreditosGanhos(null);
      setFase("jogando");
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : "Sem ligação à Open Trivia DB");
      setFase("erro");
    }
  }, []);

  const responder = (i: number) => {
    if (escolhida !== null) return;
    setEscolhida(i);
    if (i === perguntas[idx].correctIndex) setAcertos((a) => a + 1);
  };

  const seguinte = () => {
    if (idx + 1 >= perguntas.length) {
      // recompensa honesta: só agora, pelo que realmente acertaste
      const ganho = acertos * CREDITO_POR_ACERTO;
      if (ganho > 0) adicionarCreditosCidade(ganho);
      setCreditosGanhos(ganho);
      setFase("resultado");
      if (acertos >= Math.ceil(perguntas.length * 0.65)) fireConfetti({ intensity: "medium" });
    } else {
      setIdx((i) => i + 1);
      setEscolhida(null);
    }
  };

  if (fase === "inicio" || fase === "erro") {
    return (
      <div className="text-center space-y-3 py-2" data-testid="cd-quiz-inicio">
        <HelpCircle className="h-8 w-8 mx-auto text-teal-300" />
        <p className="text-xs text-white/70 leading-relaxed">{t("cidade.quizIntro")}</p>
        {fase === "erro" && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-2.5 space-y-1.5" data-testid="cd-quiz-erro">
            <p className="text-[11px] font-bold text-amber-300">{t("cidade.quizIndisp")}</p>
            <p className="text-[10px] text-white/60">{erroMsg}</p>
          </div>
        )}
        <button onClick={comecar} data-testid="cd-quiz-comecar"
          className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 active:scale-[0.98] transition">
          {fase === "erro" ? t("cidade.quizTentar") : t("cidade.quizComecar")}
        </button>
        <p className="text-[10px] text-white/40 leading-relaxed">{t("cidade.quizNota")}</p>
      </div>
    );
  }

  if (fase === "jogando" && perguntas[idx]) {
    const p = perguntas[idx];
    const nivel = p.difficulty === "easy" ? "●○○" : p.difficulty === "medium" ? "●●○" : "●●●";
    return (
      <div className="space-y-3" data-testid="cd-quiz-jogando">
        <div className="flex items-center justify-between text-[10px] text-white/50 font-bold">
          <span data-testid="cd-quiz-progresso">{idx + 1}/{perguntas.length} · {nivel}</span>
          <span>{t("cidade.quizAcertos")}: {acertos}</span>
        </div>
        <p className="text-[13px] font-bold text-white leading-snug min-h-10" data-testid="cd-quiz-pergunta">{p.text}</p>
        <div className="space-y-1.5">
          {p.options.map((op, i) => {
            const certa = i === p.correctIndex;
            const revelar = escolhida !== null;
            return (
              <button key={i} onClick={() => responder(i)} disabled={revelar}
                data-testid={`cd-quiz-opcao-${i}`}
                className={`w-full text-left px-3 py-2 rounded-xl border text-[12px] leading-snug transition
                  ${revelar
                    ? certa
                      ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200 font-bold"
                      : i === escolhida
                        ? "border-rose-400/70 bg-rose-400/15 text-rose-200"
                        : "border-white/10 text-white/40"
                    : "border-white/15 bg-white/5 text-white/85 hover:bg-white/10 active:scale-[0.99]"}`}>
                {op}
              </button>
            );
          })}
        </div>
        {escolhida !== null && (
          <div className="flex items-center justify-between gap-2" data-testid="cd-quiz-feedback">
            <p className={`text-[11px] font-black ${escolhida === p.correctIndex ? "text-emerald-300" : "text-rose-300"}`}>
              {escolhida === p.correctIndex ? "✓ " + t("cidade.quizCerto") : "✗ " + t("cidade.quizErrado")}
            </p>
            <button onClick={seguinte} data-testid="cd-quiz-seguinte"
              className="px-4 py-2 rounded-xl font-black text-[12px] bg-white/10 border border-white/20 text-white active:scale-95">
              {idx + 1 >= perguntas.length ? t("cidade.quizVerResultado") : t("cidade.quizSeguinte")}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (fase === "resultado") {
    return (
      <div className="text-center space-y-3 py-2" data-testid="cd-quiz-resultado">
        <p className="text-3xl">{acertos >= 5 ? "🏆" : acertos >= 3 ? "🎉" : "💪"}</p>
        <p className="text-lg font-black text-white" data-testid="cd-quiz-nota">
          {t("cidade.quizAcertos")}: {acertos}/{perguntas.length}
        </p>
        {creditosGanhos !== null && creditosGanhos > 0 && (
          <p className="text-sm font-black text-amber-300 flex items-center justify-center gap-1" data-testid="cd-quiz-creditos">
            <Sparkles className="h-4 w-4" /> +{creditosGanhos} {t("cidade.creditos")}
          </p>
        )}
        {creditosGanhos === 0 && (
          <p className="text-xs text-white/60">{t("cidade.quizZero")}</p>
        )}
        <button onClick={comecar} data-testid="cd-quiz-repetir"
          className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 active:scale-[0.98] transition">
          {t("cidade.quizRepetir")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-6 text-xs text-white/60" data-testid="cd-quiz-loading">
      <Loader2 className="h-4 w-4 animate-spin" /> {t("cidade.quizAcarregar")}
    </div>
  );
}
