import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, BadgeCheck, Flag, Trophy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getActiveLiveCount } from "@/lib/liveCount";
import { ALL_GAMES } from "@/lib/gamesCatalog";

/* ═══════════════════════════════════════════════════════════════════════
   v79 — ACTIVIDADE REAL da plataforma (visão do produto):
   · Próxima live
   · Último vencedor verificado
   · Destaque da semana (escolha editorial REAL — nunca «mais jogado» inventado)
   · Partida em destaque
   REGRA: se não houver dados, mostra-se uma mensagem clara. NUNCA uma
   caixa vazia, nunca um número inventado.
   ═══════════════════════════════════════════════════════════════════════ */

type Vencedor = { id: string; display_name: string; prize_title: string; won_at: string };

function Linha({
  icon: Icon,
  titulo,
  valor,
  to,
  cta,
  teste,
  destaque,
}: {
  icon: typeof Radio;
  titulo: string;
  valor: string;
  to: string;
  cta: string;
  teste: string;
  destaque?: boolean;
}) {
  return (
    <Link
      to={to}
      data-testid={teste}
      className={
        "group flex items-center gap-3 rounded-2xl border p-3.5 transition-transform active:scale-[0.98] " +
        (destaque
          ? "border-orange-500/25 bg-gradient-to-r from-[#2a1206] via-[#3b1403] to-[#1a0b02]"
          : "border-border bg-card hover:bg-secondary/40")
      }
    >
      <span
        className={
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl " +
          (destaque ? "bg-gradient-to-br from-orange-500 to-rose-600" : "bg-primary/10 text-primary")
        }
        aria-hidden="true"
      >
        <Icon className={"h-4 w-4 " + (destaque ? "text-white fill-white" : "")} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={"block text-[11px] font-bold uppercase tracking-wider " + (destaque ? "text-orange-300/80" : "text-muted-foreground")}>
          {titulo}
        </span>
        <span className={"mt-0.5 block truncate text-sm font-semibold " + (destaque ? "text-zinc-50" : "text-foreground")}>
          {valor}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

const ActividadeReal = () => {
  const { t } = useLanguage();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [vencedor, setVencedor] = useState<Vencedor | null | undefined>(undefined); // undefined = a carregar

  useEffect(() => {
    let mounted = true;
    getActiveLiveCount().then((n) => { if (mounted) setLiveCount(n); });

    (async () => {
      try {
        const { data } = await supabase.rpc("get_public_winners" as any, { p_limit: 1 } as any);
        const first = (data as unknown as Vencedor[])?.[0];
        if (mounted) setVencedor(first ?? null);
      } catch {
        if (mounted) setVencedor(null);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const kart = ALL_GAMES.find((g) => g.id === "kart");

  return (
    <section aria-labelledby="home79-atividade" className="px-4 pt-8">
      <div className="container mx-auto max-w-6xl">
        <div id="home79-atividade" className="mb-3">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">{t("home79.atividade.titulo")}</h2>
          <p className="text-xs text-muted-foreground">{t("home79.atividade.sub")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          <Linha
            icon={Radio}
            titulo={t("home79.atividade.proximaLive")}
            valor={
              liveCount === null
                ? t("home79.livesCard.estado.erro")
                : liveCount > 0
                  ? t("home79.atividade.proximaLive.agora", { n: String(liveCount) })
                  : t("home79.atividade.proximaLive.vazia")
            }
            to="/lives"
            cta={t("home79.livesCard.botao")}
            teste="home79-ativ-live"
          />
          <Linha
            icon={BadgeCheck}
            titulo={t("home79.atividade.vencedor")}
            valor={
              vencedor === undefined
                ? t("home79.atividade.aCarregar")
                : vencedor
                  ? `${vencedor.display_name} — ${vencedor.prize_title}`
                  : t("home79.atividade.vencedor.vazia")
            }
            to="/historico"
            cta={t("home79.atividade.verVencedores")}
            teste="home79-ativ-vencedor"
          />
          <Linha
            icon={Flag}
            titulo={t("home79.atividade.jogoTop")}
            valor={t("home79.atividade.jogoTop.valor", { pontos: String(kart?.pontosMax ?? 120) })}
            to="/lives?game=kart"
            cta={t("home79.jogosCard.botao")}
            teste="home79-ativ-jogo"
            destaque
          />
          <Linha
            icon={Trophy}
            titulo={t("home79.atividade.partida")}
            valor={t("home79.atividade.partida.vazia")}
            to="/desporto"
            cta={t("home79.atividade.verDesporto")}
            teste="home79-ativ-partida"
          />
        </div>
      </div>
    </section>
  );
};

export default ActividadeReal;
