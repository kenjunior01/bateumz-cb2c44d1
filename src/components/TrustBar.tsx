import { Link } from "react-router-dom";
import { ShieldCheck, LifeBuoy, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCountryLabel } from "@/lib/regions";

/* Nomes de países em PT (os COUNTRIES de regions.ts estão em EN — a barra de
   confiança é a primeira coisa que se lê, tem de falar a língua do mercado).
   Fonte da lista: mercados realmente suportados pelo seletor da plataforma. */
const PAISES_PT: Record<string, string> = {
  MZ: "Moçambique",
  AO: "Angola",
  BR: "Brasil",
  PT: "Portugal",
  CV: "Cabo Verde",
  US: "Estados Unidos",
  CA: "Canadá",
  IN: "Índia",
  ES: "Espanha",
  FR: "França",
  GB: "Reino Unido",
  DE: "Alemanha",
  IT: "Itália",
};

/* ═══════════════════════════════════════════════════════════════════════
   v39 — BARRA DE CONFIANÇA (auditoria bateu.online, P0 2):
   «mostrar desde o primeiro ecrã: país activo, idade mínima,
   enquadramento e como protegemos jogadores».
   Honesta por construção: não inventa licença nem número de operador —
   liga a páginas REAIS que existem na plataforma (/protecao, /transparencia,
   /suporte). Zero animação (WCAG: conteúdo essencial nunca depende de motion).
   v85 — «TOPO FINO»: barra MUITO fina (país · +18 · suporte num só fio) —
   o conteúdo principal começa mais cedo; os links ficam, a altura não.
   ═══════════════════════════════════════════════════════════════════════ */
const TrustBar = () => {
  const { t } = useLanguage();

  // País activo: preferência guardada pelo seletor de região; se nada
  // guardado, mostra o mercado principal (MZ) sem fingir geolocalização.
  const paisCodigo =
    (typeof localStorage !== "undefined" && localStorage.getItem("bateu_region")) || "MZ";
  const pais = PAISES_PT[paisCodigo] ?? getCountryLabel(paisCodigo);

  return (
    <div
      data-testid="trust-bar"
      aria-label={t("trustbar.aria")}
      className="w-full border-b border-white/10 bg-[rgba(8,10,16,0.55)] backdrop-blur"
    >
      <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-4 py-1 text-[11px] leading-relaxed text-zinc-300 sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-100">{pais}</span>
          <span aria-hidden="true" className="text-border">·</span>
          <span
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-bold text-amber-600 dark:text-amber-400"
            title={t("trustbar.ageTitle")}
          >
            {t("trustbar.age")}
          </span>
        </div>

        <nav aria-label={t("trustbar.aria")} className="flex items-center gap-x-3 gap-y-0.5">
          <Link
            to="/protecao"
            className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="trust-protecao"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {t("trustbar.protection")}
          </Link>
          <Link
            to="/transparencia"
            className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="trust-transparencia"
          >
            <BadgeCheck className="h-3 w-3" aria-hidden="true" />
            {t("trustbar.transparency")}
          </Link>
          <Link
            to="/suporte"
            className="inline-flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-primary"
            data-testid="trust-suporte"
          >
            <LifeBuoy className="h-3 w-3" aria-hidden="true" />
            {t("trustbar.support")}
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default TrustBar;
