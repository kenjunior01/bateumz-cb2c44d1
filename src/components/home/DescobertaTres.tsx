import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Gamepad2, Radio, Trophy, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getActiveLiveCount } from "@/lib/liveCount";
import { ALL_GAMES } from "@/lib/gamesCatalog";
import {
  SPORT_LEAGUES, currentSeason, currentRoundHint, formatKickoff, getRound, getStandings,
} from "@/lib/sports";
import kartBanner from "@/assets/kart-banner.png";

/* ═══════════════════════════════════════════════════════════════════════
   v79 — TRÊS cartões de descoberta (visão do produto):
   Jogos populares · Lives próximas · Desporto em destaque.
   Cada cartão: imagem/ícone, estado real, informação principal e UM botão.
   Dados reais — o cartão de lives conta transmissões activas (fonte
   partilhada lib/liveCount) e diz a verdade quando não há nenhuma.
   v85 — «DESKTOP VIVO»: cartões CONCRETOS, não categorias:
   · Jogos → mostra o jogo real (BATEU KART) com a recompensa à vista
     («Até {pontos} pontos por corrida», do catálogo) e aponta DIRETO
     para jogar;
   · Desporto → mostra uma PARTIDA REAL da jornada actual (TheSportsDB,
     com a fonte citada) e diz a verdade quando a fonte não responde —
     nunca inventa equipas nem datas;
   · o banner do KART ganha IMAGEM real do jogo + botão «Jogar agora»
     (arte arcade premium — decisão do feedback desktop).
   ═══════════════════════════════════════════════════════════════════════ */

type PartidaDestaque = { liga: string; nome: string; kickoff: string };

const DescobertaTres = () => {
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  // PARTIDA REAL: undefined = a carregar · null = fonte sem dados (honesto)
  const [partida, setPartida] = useState<PartidaDestaque | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    getActiveLiveCount().then((n) => { if (mounted) setLiveCount(n); });
    return () => { mounted = false; };
  }, []);

  // Próxima partida REAL (TheSportsDB): classificação → pista da ronda →
  // jornada actual → 1.º jogo com kickoff no futuro (ou o 1.º da ronda).
  // Qualquer falha = null → o cartão volta ao texto honesto de sempre.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const liga = SPORT_LEAGUES[0];
        const season = currentSeason();
        const standings = await getStandings(liga.id, season);
        const ronda = currentRoundHint(standings);
        if (!ronda) throw new Error("sem ronda");
        const eventos = await getRound(liga.id, season, ronda);
        const agora = Date.now();
        const proxima = eventos.find((e) => e.kickoff && new Date(e.kickoff).getTime() > agora) ?? eventos[0] ?? null;
        if (!vivo) return;
        setPartida(proxima
          ? { liga: liga.name, nome: proxima.name, kickoff: proxima.kickoff ? formatKickoff(proxima.kickoff) : "" }
          : null);
      } catch {
        if (vivo) setPartida(null);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const kart = ALL_GAMES.find((g) => g.id === "kart");

  const cardCls =
    "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 transition-transform active:scale-[0.98] hover:shadow-[0_4px_18px_rgba(0,0,0,0.10)]";

  return (
    <section aria-label={t("home79.descoberta.label")} className="px-4 pt-5">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
          {/* 1 · Jogos populares — o destaque real é o BATEU KART (grátis, sem registo):
              jogo concreto + recompensa à vista + botão que leva DIRETO a jogar */}
          <Link
            to="/lives?game=kart"
            onClick={() => sfx.tabClick()}
            data-testid="home79-card-jogos"
            className={cardCls}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl shadow-md"
              style={{ background: "linear-gradient(135deg,#009140,#0bb854)" }}
              aria-hidden="true"
            >
              <Gamepad2 className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="mt-3 text-[15px] font-bold text-foreground">{t("home79.jogosCard.titulo")}</span>
            <span className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {t("home79.jogosCard.estado")}
            </span>
            <span className="mt-1.5 text-xs font-black uppercase tracking-wide text-foreground">BATEU KART</span>
            <span data-testid="home85-jogos-recompensa" className="text-[11px] font-black text-amber-600 dark:text-amber-400">
              {t("home79.jogosCard.recompensa", { pontos: String(kart?.pontosMax ?? 120) })}
            </span>
            <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {t("home79.jogosCard.info", { n: String(ALL_GAMES.length) })}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
              {t("home79.jogosCard.botao")}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>

          {/* 2 · Lives próximas — contagem REAL de transmissões activas */}
          <Link
            to="/lives"
            onClick={() => sfx.tabClick()}
            data-testid="home79-card-lives"
            className={cardCls}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl shadow-md"
              style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)" }}
              aria-hidden="true"
            >
              <Radio className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="mt-3 text-[15px] font-bold text-foreground">{t("home79.livesCard.titulo")}</span>
            <span className="mt-0.5 text-xs font-semibold text-rose-500">
              {liveCount === null
                ? t("home79.livesCard.estado.erro")
                : liveCount > 0
                  ? t("home79.livesCard.estado.agora", { n: String(liveCount) })
                  : t("home79.livesCard.estado.vazia")}
            </span>
            <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t("home79.livesCard.info")}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
              {t("home79.livesCard.botao")}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>

          {/* 3 · Desporto em destaque — PARTIDA REAL da jornada (TheSportsDB,
              fonte citada); sem dados, o texto honesto de sempre */}
          <Link
            to="/desporto"
            onClick={() => sfx.tabClick()}
            data-testid="home79-card-desporto"
            className={cardCls}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl shadow-md"
              style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)" }}
              aria-hidden="true"
            >
              <Trophy className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="mt-3 text-[15px] font-bold text-foreground">{t("home79.desportoCard.titulo")}</span>
            {partida ? (
              <>
                <span data-testid="home85-desporto-partida" className="mt-0.5 line-clamp-1 text-xs font-black text-amber-600 dark:text-amber-400">
                  {partida.liga}: {partida.nome}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {partida.kickoff ? `${partida.kickoff} · ` : ""}{t("home79.desportoCard.fonte")}
                </span>
              </>
            ) : (
              <>
                <span className="mt-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {t("home79.desportoCard.estado")}
                </span>
                <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t("home79.desportoCard.info")}</span>
              </>
            )}
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
              {t("home79.desportoCard.botao")}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>

        {/* KART — promovido MAS dentro de Jogos (não é secção de navegação).
            v85: arte ARCADE PREMIUM — imagem real do jogo à esquerda, botão
            «Jogar agora» e a recompensa («Até X pontos por corrida») à vista. */}
        <Link
          to="/lives?game=kart"
          onClick={() => sfx.tabClick()}
          data-testid="home79-kart-destaque"
          className="group mt-3 flex items-stretch overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-r from-[#2a1206] via-[#3b1403] to-[#1a0b02] p-0 text-left shadow-lg shadow-orange-900/20 transition-transform active:scale-[0.98] sm:mt-4"
        >
          <img
            src={kartBanner}
            alt="BATEU KART — corrida arcade"
            data-testid="home85-kart-img"
            className="h-28 w-44 shrink-0 object-cover sm:h-32 sm:w-60"
            loading="lazy"
          />
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3.5 sm:p-4">
            <span className="flex items-center gap-1.5 text-sm font-black text-zinc-50 sm:text-[15px]">
              BATEU KART
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-orange-300 border border-orange-400/30">
                {t("home79.kart.destaque")}
              </span>
            </span>
            <span className="block truncate text-[11px] text-orange-200/80">
              {t("home79.kart.info", { pontos: String(kart?.pontosMax ?? 120) })}
            </span>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1.5 text-[11px] font-black text-white shadow-md shadow-orange-600/30 transition-transform group-hover:scale-[1.03]">
              {t("home79.jogosCard.botao")}
            </span>
          </span>
          <ChevronRight className="mr-3 h-5 w-5 shrink-0 self-center text-orange-300" />
        </Link>
      </div>
    </section>
  );
};

export default DescobertaTres;
