import { Link } from "react-router-dom";
import { BookOpen, ShieldCheck, HeartHandshake, LifeBuoy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* ═══════════════════════════════════════════════════════════════════════
   v79 — bloco CONFIANÇA no fim da homepage (visão do produto):
   Como funciona · Resultados verificáveis · Jogo responsável · Suporte.
   A transparência fica VISÍVEL mas não compete com os jogos — é a última
   secção da página, discreta e a um toque de distância.
   ═══════════════════════════════════════════════════════════════════════ */

const CONF = [
  { to: "/como-funciona", icon: BookOpen, labelKey: "home79.conf.como", teste: "home79-conf-como" },
  { to: "/transparencia", icon: ShieldCheck, labelKey: "home79.conf.verificavel", teste: "home79-conf-verificavel" },
  { to: "/protecao", icon: HeartHandshake, labelKey: "home79.conf.responsavel", teste: "home79-conf-responsavel" },
  { to: "/faq", icon: LifeBuoy, labelKey: "home79.conf.suporte", teste: "home79-conf-suporte" },
];

const ConfiancaFim = () => {
  const { t } = useLanguage();

  return (
    <section aria-label={t("home79.conf.label")} className="px-4 pt-8 pb-10">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {CONF.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              data-testid={c.teste}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
            >
              <c.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">{t(c.labelKey)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ConfiancaFim;
