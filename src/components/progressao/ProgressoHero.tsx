// ============================================================
// PROGRESSO NO HERO (v87 — «DESKTOP DE PRODUTO»)
// ─────────────────────────────────────────────────────────────
// Versão COMPACTA e SÓ-DE-LEITURA do ciclo «Pontos → Nível →
// Missões → Prémios» para a coluna direita do hero desktop (≥lg):
// os números do jogador ficam ACIMA da dobra — antes só apareciam
// depois de rolar (o painel completo vive na secção de baixo).
// Regras da casa respeitadas:
// · LÊ a MESMA store (`bateu_progressao_v78`) via useProgressao —
//   NÃO existe segunda store nem segunda fonte de verdade;
// · NÃO reclama, NÃO ouve o bus `bateu:partida` — o painel completo
//   (PainelProgressao) continua a ser o ÚNICO dono das mutações
//   (assim uma partida nunca é registada DUAS vezes);
// · sincroniza pelo evento `bateu:progressao` que o gravar() anuncia;
// · NÚMEROS HONESTOS: só o que está na store — zero inventado.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Ticket, Gift, Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgressao } from "@/lib/progressaoStore";
import { visaoCarteiras, NIVEIS } from "@/lib/progressao";

const NIVEIS_BASE = NIVEIS.map((n) => n.pontos);

const ProgressoHero = ({ onVerPainel }: { onVerPainel?: () => void }) => {
  const { t } = useLanguage();
  const [agora, setAgora] = useState(() => Date.now());
  const { estado, nivel } = useProgressao(agora);

  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const carteiras = useMemo(
    () => visaoCarteiras(estado, 0, 0, { valor: 0, moeda: "MZN" }),
    [estado],
  );
  const missao = estado.missoes[0] ?? null;

  // progresso DENTRO do nível — mesma fórmula do painel completo
  const base = NIVEIS_BASE[nivel.nivel - 1] ?? 0;
  const span = nivel.proximo ? Math.max(1, (estado.pontos + nivel.proximo.pontosFaltam) - base) : 1;
  const pct = nivel.proximo ? Math.max(4, Math.min(96, Math.round(((estado.pontos - base) / span) * 100))) : 100;

  const estadoMissao = missao?.reclamada
    ? t("livehub.hero.missaoReclamada")
    : missao && missao.progresso >= missao.alvo
      ? t("livehub.hero.missaoCompleta")
      : t("livehub.hero.missaoEmCurso");
  const classeMissao = missao?.reclamada
    ? "text-emerald-300/80"
    : missao && missao.progresso >= missao.alvo
      ? "bg-emerald-500/15 text-emerald-300"
      : "bg-muted text-muted-foreground";

  return (
    <div
      data-testid="progressao-hero"
      className="rounded-3xl border border-border bg-card/90 p-4 shadow-[0_2px_16px_rgba(0,0,0,0.10)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t("livehub.hero.progressoTitulo")}
        </p>
        <span data-testid="progressao-hero-nivel" className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-2.5 py-0.5 text-[10px] font-black text-fuchsia-200">
          {t("livehub.hero.nivelChip", { n: String(nivel.nivel), nome: nivel.nome })}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span data-testid="progressao-hero-pontos" className="font-display text-3xl font-black text-amber-300">
          {estado.pontos.toLocaleString("pt-PT")}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("livehub.hero.pontos")}
        </span>
      </div>

      {/* barra até ao próximo nível (desbloqueios cosméticos — nunca stats) */}
      {nivel.proximo ? (
        <div className="mt-1.5" data-testid="progressao-hero-barra">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t("livehub.hero.faltam", { n: nivel.proximo.pontosFaltam.toLocaleString("pt-PT"), nivel: String(nivel.proximo.nivel), nome: nivel.proximo.nome })}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-[10px] font-bold text-amber-300">{t("livehub.hero.nivelMax")}</p>
      )}

      {/* CARTEIRAS separadas (regra do produto — nunca misturadas) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]" data-testid="progressao-hero-carteiras">
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-bold text-emerald-200">
          <Ticket className="h-3 w-3" aria-hidden="true" /> {t("livehub.hero.bilhetes")}: {carteiras.bilhetes}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 font-bold text-sky-200">
          <Gift className="h-3 w-3" aria-hidden="true" /> {t("livehub.hero.premios")}: {carteiras.premiosDisponiveis}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-400/40 bg-slate-400/10 px-2 py-0.5 font-bold text-slate-200">
          <Wallet className="h-3 w-3" aria-hidden="true" /> {t("livehub.hero.saldo")}: 0 MZN
        </span>
      </div>

      {/* MISSÃO DO DIA (1.ª) — estado real, reclamar continua NO PAINEL */}
      <div className="mt-2.5 rounded-2xl border border-border bg-card/60 px-3 py-2" data-testid="progressao-hero-missao">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t("livehub.hero.missaoTitulo")}</p>
        {missao ? (
          <>
            <p className="mt-0.5 text-[11px] font-bold leading-snug">{missao.titulo}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                <b className="text-foreground">{missao.progresso}/{missao.alvo}</b> · <span className="font-black text-amber-300">+{missao.pontos} pts</span>
              </span>
              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${classeMissao}`}>
                {estadoMissao}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("livehub.hero.missaoSem")}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onVerPainel?.()}
        data-testid="progressao-hero-ver"
        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary transition hover:bg-primary/20"
      >
        {t("livehub.hero.verTudo")} <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
};

export default ProgressoHero;
