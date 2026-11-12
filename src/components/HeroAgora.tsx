import { Link } from "react-router-dom";
import { Gamepad2, Radio, Trophy, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/* ═══════════════════════════════════════════════════════════════════════
   v39 — HERO FUNCIONAL (auditoria bateu.online, P0 3):
   «A home deve ter UMA acção principal e três entradas claras:
   Jogar, Ver sorteios ao vivo, Acompanhar desporto.»
   Três cartões, um só destino real cada, preço/risco nenhum (entradas
   grátis de navegação). Sem contadores falsos, sem espectadores inventados.
   ═══════════════════════════════════════════════════════════════════════ */

interface Entrada {
  to: string;
  icon: typeof Gamepad2;
  titleKey: string;
  subKey: string;
  /* gradiente do ícone — cores semânticas estáveis da plataforma */
  gradiente: string;
  teste: string;
  live?: boolean;
}

const ENTRADAS: Entrada[] = [
  {
    to: "/jogos",
    icon: Gamepad2,
    titleKey: "heroagora.play",
    subKey: "heroagora.playSub",
    gradiente: "linear-gradient(135deg,#009140,#0bb854)",
    teste: "heroagora-jogar",
  },
  {
    to: "/lives",
    icon: Radio,
    titleKey: "heroagora.live",
    subKey: "heroagora.liveSub",
    gradiente: "linear-gradient(135deg,#7c3aed,#c026d3)",
    teste: "heroagora-live",
    live: true,
  },
  {
    to: "/desporto",
    icon: Trophy,
    titleKey: "heroagora.sport",
    subKey: "heroagora.sportSub",
    gradiente: "linear-gradient(135deg,#b45309,#f59e0b)",
    teste: "heroagora-desporto",
  },
];

const HeroAgora = () => {
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();

  return (
    <section aria-labelledby="heroagora-title" className="px-4 pt-4 sm:pt-5">
      <div className="container mx-auto max-w-6xl">
        <h2
          id="heroagora-title"
          data-testid="heroagora-title"
          className="mb-3 font-display text-lg font-bold tracking-tight text-zinc-100 sm:text-xl"
        >
          {t("heroagora.title")}
        </h2>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
          {ENTRADAS.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              onClick={() => sfx.tabClick()}
              data-testid={e.teste}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-transform active:scale-[0.98] sm:flex-col sm:items-start sm:p-4 sm:shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:transition-shadow sm:hover:shadow-[0_4px_18px_rgba(0,0,0,0.10)] focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-md sm:h-12 sm:w-12"
                style={{ background: e.gradiente }}
                aria-hidden="true"
              >
                <e.icon className="h-5 w-5 text-white" strokeWidth={2} />
              </span>

              <span className="min-w-0 flex-1 sm:mt-1">
                <span className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">
                  {t(e.titleKey)}
                  {e.live && (
                    <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-rose-500">
                      AO VIVO
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:whitespace-normal">
                  {t(e.subKey)}
                </span>
              </span>

              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroAgora;
