// ============================================================
// BOAS-VINDAS COM RETENÇÃO (v83) — «A RETENÇÃO À VISTA»
// v85 — «DESKTOP VIVO»: o bloco passa a ter variante PAINEL
// (coluna direita da primeira dobra em duas colunas, HeroDobra)
// além da variante BLOCO (MobileHomeApp — intacta).
// ────────────────────────────────────────────────────────────
// Visão do produto: «A homepage deve mostrar a progressão, não
// apenas links.» Este painel adapta-se ao estado da conta:
// · VISITANTE: o loop «Joga hoje. Acumula pontos. Desbloqueia
//   prémios.» + NÚMEROS REAIS do catálogo (jogos grátis, missão
//   do dia do aparelho, prémios activos) + o que muda com o
//   registo — dito com honestidade (jogar grátis já é possível
//   agora; nada é bloqueado);
// · REGISTADO: «Olá, {nome}» · Nível · pontos · BARRA de
//   progresso REAL até ao nível seguinte · quanto falta ·
//   [Continuar a jogar] · MISSÃO DO DIA (núcleo v78, progresso
//   real) · TORNEIO activo (dados reais; sem torneio diz-se) ·
//   desbloqueios do nível seguinte · PRÉMIOS DISPONÍVEIS
//   (contagem real de sorteios+concursos activos).
// Regras da casa: ZERO números inventados (tudo do núcleo v78 +
// tabelas reais; contagem partilhada lib/counts — 1 pedido/30 s);
// o convidado nunca é pressionado e NUNCA rende o chip de
// sincronização; os pontos nunca expiram — nada aqui cria pressa
// artificial. Com a v84 o progresso segue a conta — o chip diz
// a verdade sobre cada estado.
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
import { countRows } from "@/lib/counts";
import { ALL_GAMES } from "@/lib/gamesCatalog";
import ChipSincProgressao from "@/components/progressao/ChipSincProgressao";

const BoasVindasRetencao = ({ variante = "bloco" }: { variante?: "bloco" | "painel" } = {}) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [agora, setAgora] = useState(() => Date.now());
  const { estado, nivel, reclamar } = useProgressao(agora);
  const [torneio, setTorneio] = useState<Tournament | null>(null);
  const [torneioEstado, setTorneioEstado] = useState<"aCarregar" | "ok" | "vazio">("aCarregar");
  // PRÉMIOS DISPONÍVEIS — contagem REAL (sorteios + concursos activos),
  // pelo mesmo caminho partilhado do roll-up (cache 30 s, 1 pedido por tabela).
  const [premios, setPremios] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      countRows("raffles", { col: "status", val: "active" }),
      countRows("contests", { col: "status", val: "active" }),
    ]).then(([r, c]) => {
      if (!vivo) return;
      setPremios(r === null && c === null ? null : (r ?? 0) + (c ?? 0));
    });
    return () => { vivo = false; };
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
    // Missão do dia REAL do aparelho — o convidado pode cumpri-la jogando grátis
    const missaoVisitante = estado.missoes.find((m) => !m.reclamada && m.terminaEm >= agora) ?? null;

    const conteudo = (
      <div data-testid="reten-bv-visitante" className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-emerald-500/5 p-4 sm:p-5">
        <p data-testid="reten-painel-titulo" className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          {t("reten.painel.titulo")}
        </p>
        {/* o loop da retenção com força visual — é a promessa real da plataforma */}
        <p data-testid="reten-loop" className="mt-1.5 font-display text-base font-black leading-snug text-foreground sm:text-lg">
          {t("reten.loop")}
        </p>

        {/* números REAIS (catálogo + núcleo do aparelho + tabelas activas) */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
            <p data-testid="reten-stat-jogos" className="text-lg font-black leading-tight text-emerald-500">
              {ALL_GAMES.length}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">{t("reten.painel.jogosGratis", { n: String(ALL_GAMES.length) })}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
            <p data-testid="reten-stat-premios" className="text-lg font-black leading-tight text-amber-500">
              {premios === null ? "—" : premios}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {premios === 0 ? t("reten.painel.premios.vazia") : t("reten.painel.premios")}
            </p>
          </div>
        </div>

        {/* missão do dia REAL — o convidado já pode jogá-la (grátis, sem registo) */}
        {missaoVisitante && (
          <div className="mt-2 rounded-xl border border-border bg-background/40 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{t("reten.missao.titulo")}</p>
            <p className="mt-0.5 text-xs font-bold leading-snug text-foreground">{missaoVisitante.titulo}</p>
            <p data-testid="reten-visitante-missao-prog" className="mt-0.5 text-[11px] text-muted-foreground">
              <b className="text-foreground">{missaoVisitante.progresso}/{missaoVisitante.alvo}</b>
              {" · "}
              <span className="font-black text-amber-300">+{missaoVisitante.pontos}</span>
            </p>
          </div>
        )}

        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          <Smartphone className="mr-1.5 inline h-4 w-4 text-sky-400" aria-hidden="true" />
          {t("reten.visitante.sem")}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          <Sparkles className="mr-1.5 inline h-4 w-4 text-amber-400" aria-hidden="true" />
          {t("reten.visitante.com")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/register"
            data-testid="reten-cta-registo"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform active:scale-95 hover:brightness-110"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("reten.visitante.cta")}
          </Link>
          <Link
            to="/jogos"
            data-testid="reten-cta-jogar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 transition-transform active:scale-95 hover:bg-emerald-500/15 dark:text-emerald-400"
          >
            <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("reten.painel.jogarGratis")}
          </Link>
        </div>
      </div>
    );

    if (variante === "painel") return <div data-testid="reten-bv" className="w-full">{conteudo}</div>;
    return (
      <section className="px-4 pt-4 sm:pt-5" data-testid="reten-bv">
        <div className="container mx-auto max-w-6xl">{conteudo}</div>
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

  // BARRA DE PROGRESSO REAL: (pontos − base do nível) ÷ (alvo − base) —
  // os números vêm do núcleo v78; nível máximo = barra cheia (honesto).
  const basePontos = NIVEIS.find((n) => n.nivel === nivel.nivel)?.pontos ?? 0;
  const alvoPontos = nivel.proximo ? estado.pontos + nivel.proximo.pontosFaltam : estado.pontos;
  const pct = nivel.proximo
    ? Math.min(100, Math.max(0, Math.round(((estado.pontos - basePontos) / Math.max(1, alvoPontos - basePontos)) * 100)))
    : 100;

  const reclamarAgora = () => {
    if (!missao) return;
    reclamar(missao.id); // núcleo valida (falta/expirada/já) — o estado volta a renderizar
  };

  const conteudo = (
    <div data-testid="reten-bv-registado" className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-fuchsia-500/5 p-4 sm:p-5">
      <p data-testid="reten-painel-titulo" className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
        {t("reten.painel.titulo")}
      </p>
      {/* faixa de progressão: Olá · Nível · pontos · quanto falta */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <p data-testid="reten-ola" className="font-display text-lg font-black text-foreground sm:text-xl">
            {t("reten.ola", { nome: primeiroNome })}
          </p>
          <span data-testid="reten-nivel" className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-2.5 py-0.5 text-xs font-black text-fuchsia-200">
            {t("reten.nivel", { n: String(nivel.nivel), nome: nivel.nome })}
          </span>
          <span data-testid="reten-pontos" className="text-sm font-bold text-amber-300">
            {t("reten.pontos", { pontos: estado.pontos.toLocaleString("pt-PT") })}
          </span>
          {/* v84: estado REAL da sincronização (nunca finge) */}
          <ChipSincProgressao variante="chip" />
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

      {/* barra de progresso REAL até ao nível seguinte */}
      <div className="mt-3">
        <div
          data-testid="reten-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("reten.painel.barraAria")}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            data-testid="reten-barra-fill"
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {nivel.proximo ? (
          <span data-testid="reten-faltam" className="mt-1 block text-[11px] text-muted-foreground">
            {t("reten.faltam", { faltam: nivel.proximo.pontosFaltam.toLocaleString("pt-PT"), proximo: nivel.proximo.nome })}
          </span>
        ) : (
          <span data-testid="reten-faltam" className="mt-1 block text-[11px] font-bold text-amber-300">{t("reten.nivelMax")}</span>
        )}
      </div>

      {/* três cartões do ciclo: missão do dia · torneio · desbloqueios
          (painel empilha; bloco mobile mantém as 3 colunas ≥sm) */}
      <div className={"mt-3 grid gap-2.5 " + (variante === "painel" ? "grid-cols-1" : "sm:grid-cols-3")}>
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
          <ChipSincProgressao variante="linha" />
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

      {/* PRÉMIOS DISPONÍVEIS — contagem REAL (raffles + concursos activos);
          null = fontes indisponíveis → a linha some (nunca um zero falso) */}
      {premios !== null && (
        <div data-testid="reten-premios" className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            {t("reten.painel.premios")}
            <span data-testid="reten-premios-valor" className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400">
              {premios}
            </span>
          </p>
          {premios > 0 ? (
            <Link to="/premios" data-testid="reten-premios-ver" className="text-[11px] font-black text-primary hover:underline">
              {t("reten.painel.verPremios")}
            </Link>
          ) : (
            <span className="text-[11px] text-muted-foreground">{t("reten.painel.premios.vazia")}</span>
          )}
        </div>
      )}
    </div>
  );

  if (variante === "painel") return <div data-testid="reten-bv" className="w-full">{conteudo}</div>;
  return (
    <section className="px-4 pt-4 sm:pt-5" data-testid="reten-bv">
      <div className="container mx-auto max-w-6xl">{conteudo}</div>
    </section>
  );
};

export default BoasVindasRetencao;
