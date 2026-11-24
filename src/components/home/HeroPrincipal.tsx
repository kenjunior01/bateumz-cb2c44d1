import { Link } from "react-router-dom";
import { Gamepad2, Radio, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/* ═══════════════════════════════════════════════════════════════════════
   v79 — «POUCAS OPÇÕES PRINCIPAIS»: UMA chamada principal na homepage.
   Substitui o bombardeamento de banners/cartões/círculos por UMA frase
   (a promessa honesta da plataforma) + DOIS botões reais:
   Explorar jogos · Ver ao vivo.
   Os três cartões de descoberta vivem no DescobertaTres (separado).
   v85 — «DESKTOP VIVO»: na dobra em duas colunas (HeroDobra) a chamada
   é a coluna ESQUERDA — sem section/container próprios (a moldura vem
   do HeroDobra). Por omissão (MobileHomeApp) mantém a moldura original.
   ═══════════════════════════════════════════════════════════════════════ */

const HeroPrincipal = ({ naDobra = false }: { naDobra?: boolean }) => {
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();

  const conteudo = (
    <>
      <h1
        id="hero-principal-title"
        data-testid="home79-frase"
        className="font-display text-2xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
      >
        {t("home79.frase")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base lg:text-lg">
        {t("home79.sub")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-6">
        <Link
          to="/jogos"
          onClick={() => sfx.tabClick()}
          data-testid="home79-cta-jogos"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.97] hover:brightness-110 sm:text-base"
        >
          <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          {t("home79.ctaJogos")}
        </Link>
        <Link
          to="/lives"
          onClick={() => sfx.tabClick()}
          data-testid="home79-cta-live"
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-transform active:scale-[0.97] hover:bg-secondary sm:text-base"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          {t("home79.ctaLive")}
        </Link>
      </div>

      {/* garantia mínima sempre visível sob a chamada (não compete com os jogos) */}
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        {t("home79.garantia")}
      </p>
    </>
  );

  if (naDobra) return conteudo;

  return (
    <section aria-labelledby="hero-principal-title" className="px-4 pt-5 sm:pt-8">
      <div className="container mx-auto max-w-6xl">{conteudo}</div>
    </section>
  );
};

export default HeroPrincipal;
