// ============================================================
// BOAS-VINDAS COM RETENÇÃO (v83) — «A RETENÇÃO À VISTA»
// ────────────────────────────────────────────────────────────
// Visão do produto: «A homepage deve mostrar a progressão, não
// apenas links.» Este bloco adapta-se ao estado da conta:
// · VISITANTE: o que muda com o registo — dito com honestidade
//   (jogar grátis já é possível agora; nada é bloqueado);
// · REGISTADO: «Olá, {nome}» · Nível · pontos · quanto falta ·
//   [Continuar a jogar] · MISSÃO DO DIA (núcleo v78, progresso
//   real) · TORNEIO activo (dados reais; sem torneio diz-se) ·
//   desbloqueios do nível seguinte (só aparência/acesso).
// Regras da casa: ZERO números inventados (tudo do núcleo v78 +
// tabela `tournaments`); o convidado nunca é pressionado; os
// pontos nunca expiram — nada aqui cria pressa artificial.
// A progressão vive no aparelho (núcleo v78) — o bloco DECLARA-o
// em vez de prometer sincronização que ainda não existe.
// ============================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Gamepad2, Gift, Sparkles, Smartphone, Trophy, UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgressao } from "@/lib/progressaoStore";
import { NIVEIS } from "@/lib/progressao";
import { getActiveTournament, type Tournament } from "@/lib/tournaments";

const BoasVindasRetencao = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [agora, setAgora] = useState(() => Date.now());
  const { estado, nivel, reclamar } = useProgressao(agora);
  const [torneio, setTorneio] = useState<Tournament | null>(null);
  const [torneioEstado, setTorneioEstado] = useState<"aCarregar" | "ok" | "vazio">("aCarregar");

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Torneio REAL da tabela `tournaments` — sem torneio activo DIZ-SE
  // («Sem torneios activos agora»), nunca é inventado.
  useEffect(() => {
    if (!user) { setTorneioEstado("vazio"); return; }
    let vivo = true;
    setTorneioEstado("aCarregar");
    getActiveTournament()
      .then((tt) => { if (!vivo) return; setTorneio(tt); setTorneioEstado(tt ? "ok" : "vazio"); })
      .catch(() => { if (vivo) setTorneioEstado("vazio"); });
    return () => { vivo = false; };
  }, [user?.id]);

  // ── VISITANTE: o valor de registar, sem pressionar nem bloquear ──
  if (!user) {
    return (
      <section className="px-4 pt-4 sm:pt-5" data-testid="reten-bv">
        <div className="container mx-auto max-w-6xl">
          <div data-testid="reten-bv-visitante" className="rounded-2xl border border-border bg-card/60 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-sm font-bold text-foreground">
              <Smartphone className="mr-1.5 inline h-4 w-4 text-sky-400" aria-hidden="true" />
              {t("reten.visitante.sem")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-amber-400" aria-hidden="true" />
              {t("reten.visitante.com")}
            </p>
            <div className="mt-3">
              <Link
                to="/register"
                data-testid="reten-cta-registo"
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/60 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-transform active:scale-95 hover:bg-primary/15"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t("reten.visitante.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── REGISTADO: a progressão à vista (núcleo v78 + torneios reais) ──
  const primeiroNome = (profile?.display_name?.trim() || user.email?.split("@")[0] || "").split(/\s+/)[0] || "";
  const missao = estado.missoes.find((m) => !m.reclamada && m.terminaEm >= agora) ?? null;
  const missaoCompleta = !!missao && missao.progresso >= missao.alvo;
  const proximoDesbloqueia = nivel.proximo
    ? (NIVEIS.find((n) => n.nivel === nivel.proximo?.nivel)?.desbloqueia ?? [])
    : [];

  const reclamarAgora = () => {
    if (!missao) return;
    reclamar(missao.id); // núcleo valida (falta/expirada/já) — o estado volta a renderizar
  };

  return (
    <section className="px-4 pt-4 sm:pt-5" data-testid="reten-bv">
      <div className="container mx-auto max-w-6xl">
        <div data-testid="reten-bv-registado" className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-fuchsia-500/5 p-4 sm:p-5">
          {/* faixa de progressão: Olá · Nível · pontos · quanto falta */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p data-testid="reten-ola" className="font-display text-lg font-black text-foreground sm:text-xl">
                {t("reten.ola", { nome: primeiroNome })}
              </p>
              <span data-testid="reten-nivel" className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-2.5 py-0.5 text-xs font-black text-fuchsia-200">
                {t("reten.nivel", { n: String(nivel.nivel), nome: nivel.nome })}
              </span>
              <span data-testid="reten-pontos" className="text-sm font-bold text-amber-300">
                {t("reten.pontos", { pontos: estado.pontos.toLocaleString("pt-PT") })}
              </span>
              {nivel.proximo ? (
                <span data-testid="reten-faltam" className="text-xs text-muted-foreground">
                  {t("reten.faltam", { faltam: nivel.proximo.pontosFaltam.toLocaleString("pt-PT"), proximo: nivel.proximo.nome })}
                </span>
              ) : (
                <span data-testid="reten-faltam" className="text-xs font-bold text-amber-300">{t("reten.nivelMax")}</span>
              )}
            </div>
            <Link
              to="/jogos"
              data-testid="reten-continuar"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 hover:brightness-110"
            >
              <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t("reten.continuar")}
            </Link>
          </div>

          {/* três cartões do ciclo: missão do dia · torneio · desbloqueios */}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            {/* MISSÃO DO DIA (núcleo v78 — progresso real, alvo alcançável) */}
            <div data-testid="reten-missao" className="rounded-2xl border border-border bg-card/60 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{t("reten.missao.titulo")}</p>
              {missao ? (
                <>
                  <p className="mt-1 text-xs font-bold leading-snug text-foreground">{missao.titulo}</p>
                  <p data-testid="reten-missao-prog" className="mt-1 text-[11px] text-muted-foreground">
                    <b className="text-foreground">{missao.progresso}/{missao.alvo}</b>
                    {" · "}
                    <span className="font-black text-amber-300">+{missao.pontos}</span>
                  </p>
                  {missao.reclamada ? (
                    <p className="mt-2 text-[11px] font-bold text-emerald-400">✓ {t("reten.missao.reclamada")}</p>
                  ) : (
                    <button
                      data-testid="reten-missao-reclamar"
                      onClick={reclamarAgora}
                      disabled={!missaoCompleta}
                      className={`mt-2 w-full rounded-lg px-3 py-1.5 text-[11px] font-black transition ${missaoCompleta ? "bg-emerald-500 text-white hover:bg-emerald-400" : "cursor-not-allowed bg-muted text-muted-foreground"}`}
                    >
                      {missaoCompleta ? t("reten.missao.reclamar") : t("reten.missao.emCurso")}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">{t("reten.missao.vazia")}</p>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground/70">{t("reten.missao.aparelho")}</p>
            </div>

            {/* TORNEIO (dados reais da tabela; sem torneio DIZ-SE) */}
            <div data-testid="reten-torneio" className="rounded-2xl border border-border bg-card/60 p-3">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                <Trophy className="h-3 w-3" aria-hidden="true" /> {t("reten.torneio.titulo")}
              </p>
              {torneioEstado === "ok" && torneio ? (
                <>
                  <p className="mt-1 text-xs font-bold leading-snug text-foreground">{torneio.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="mr-1 inline h-3 w-3" aria-hidden="true" />
                    {new Date(torneio.start_date).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                    {torneio.prize_description ? ` · ${torneio.prize_description}` : ""}
                  </p>
                  <Link to={`/tournaments/${torneio.id}`} className="mt-2 inline-block text-[11px] font-black text-primary hover:underline">
                    {t("reten.torneio.ver")}
                  </Link>
                </>
              ) : torneioEstado === "aCarregar" ? (
                <p className="mt-2 text-[11px] text-muted-foreground">…</p>
              ) : (
                <>
                  <p data-testid="reten-torneio-vazio" className="mt-1.5 text-[11px] text-muted-foreground">{t("reten.torneio.vazio")}</p>
                  <Link to="/tournaments" className="mt-2 inline-block text-[11px] font-black text-primary hover:underline">
                    {t("reten.torneio.ver")}
                  </Link>
                </>
              )}
            </div>

            {/* DESBLOQUEIOS DO NÍVEL SEGUINTE (só aparência/acesso — honesto) */}
            <div data-testid="reten-desbloqueios" className="rounded-2xl border border-border bg-card/60 p-3">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                <Gift className="h-3 w-3" aria-hidden="true" /> {t("reten.desbloqueios.titulo")}
              </p>
              {nivel.proximo ? (
                <>
                  <p className="mt-1 text-xs font-bold text-foreground">
                    {t("reten.nivel", { n: String(nivel.proximo.nivel), nome: nivel.proximo.nome })}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{proximoDesbloqueia.join(" · ") || "—"}</p>
                </>
              ) : (
                <p className="mt-1.5 text-[11px] font-bold text-amber-300">{t("reten.desbloqueios.max")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoasVindasRetencao;
