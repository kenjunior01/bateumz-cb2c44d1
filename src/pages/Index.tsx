// ============================================================
// v62 — HOMEPAGE NOVA (roadmap items 6+8): descoberta de LOJA e
// SORTEIOS + HISTÓRIAS do topo, numa direção visual legível.
// Direção escolhida: «editorial limpa» — fundo da plataforma, cartões
// com bordo nítido, tipografia contrastante, zero partículas/neon/
// confetti (o antigo Index.tsx tinha 829 linhas de ruído visual +
// @ts-nocheck — check desativado, contra as regras da casa).
// Tudo aqui são componentes REAIS de dados (supabase/locais):
// HeroAgora (v39 — entradas honestas), ContinuePlayRail (registo real
// de progressão), SorteiosConcursosRollUp + VendasRollUp (descoberta),
// StoriesCarousel (histórias reais), PlatformFeed (atividade real).
// Mobile mantém o MobileHomeApp (v26 — já com descoberta própria).
// ============================================================
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import TrustBar from "@/components/TrustBar";
import Footer from "@/components/Footer";
import HeroAgora from "@/components/HeroAgora";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Gamepad2, ChevronRight, ShoppingBag, Ticket, Newspaper } from "lucide-react";

const MobileHomeApp = lazy(() => import("@/components/mobile/MobileHomeApp"));
const ContinuePlayRail = lazy(() => import("@/components/home/ContinuePlayRail").then(m => ({ default: m.default })));
const SorteiosConcursosRollUp = lazy(() => import("@/components/home/SorteiosConcursosRollUp").then(m => ({ default: m.default })));
const VendasRollUp = lazy(() => import("@/components/home/VendasRollUp").then(m => ({ default: m.default })));
const StoriesCarousel = lazy(() => import("@/components/StoriesCarousel").then(m => ({ default: m.default })));
const PlatformFeed = lazy(() => import("@/components/home/PlatformFeed").then(m => ({ default: m.default })));

const SectionHeader = ({ icon: Icon, titulo, sub, href, label }: { icon: typeof ShoppingBag; titulo: string; sub: string; href: string; label: string }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight">{titulo}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary shrink-0"
    >
      {label} <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  </div>
);

const Home = () => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  useSEO({
    title: "Jogos Online, Sorteios ao Vivo e Desporto",
    description: "Joga, acompanha e participa em jogos e sorteios ao vivo com resultados verificáveis. Feita para Moçambique, Angola, Cabo Verde e Brasil. +18 — joga com responsabilidade.",
    canonicalPath: "/",
  });

  if (isMobile) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <MobileHomeApp />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TrustBar />
      <Navbar />
      <main id="conteudo-principal" className="pb-16">
        {/* ── HERO: uma ação principal + três entradas honestas (v39) ── */}
        <HeroAgora />

        {/* v62 — CTA central de jogo (o mesmo testid da v262 para os testes):
            destino real, sem promessa inventada */}
        <section className="px-4 pb-8">
          <div className="container mx-auto max-w-6xl">
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-bold glow-primary"
              data-testid="home-cta-jogar-central"
            >
              <Link to="/lives?game=kart" className="flex items-center justify-center gap-2">
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                {t("home.cta.mundo")}
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">{t("home.cta.nota")}</p>
          </div>
        </section>

        <Suspense fallback={<div className="h-40" />}>
          <ContinuePlayRail />
        </Suspense>

        {/* ── SORTEIOS & CONCURSOS — descoberta com dados reais ── */}
        <section className="px-4 py-8" aria-labelledby="home-sorteios">
          <div className="container mx-auto max-w-6xl">
            <div id="home-sorteios">
              <SectionHeader
                icon={Ticket}
                titulo={t("home.sorteios.titulo")}
                sub={t("home.sorteios.sub")}
                href="/marketplace"
                label={t("home.verTudo")}
              />
            </div>
            <Suspense fallback={<div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />}>
              <SorteiosConcursosRollUp />
            </Suspense>
          </div>
        </section>

        {/* ── LOJA — descoberta do mercado ── */}
        <section className="px-4 py-8" aria-labelledby="home-loja">
          <div className="container mx-auto max-w-6xl">
            <div id="home-loja">
              <SectionHeader
                icon={ShoppingBag}
                titulo={t("home.loja.titulo")}
                sub={t("home.loja.sub")}
                href="/marketplace"
                label={t("home.verTudo")}
              />
            </div>
            <Suspense fallback={<div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />}>
              <VendasRollUp />
            </Suspense>
          </div>
        </section>

        {/* ── HISTÓRIAS — rail real (criadores + plataforma) ── */}
        <section className="py-6" aria-label={t("home.historias.sub")}>
          <Suspense fallback={<div className="h-44" />}>
            <StoriesCarousel embedded />
          </Suspense>
        </section>

        {/* ── ATIVIDADE REAL DA PLATAFORMA ── */}
        <section className="px-4 py-8" aria-labelledby="home-atividade">
          <div className="container mx-auto max-w-6xl">
            <div id="home-atividade" className="flex items-center gap-3 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
                <Newspaper className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight">{t("home.atividade.titulo")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("home.atividade.sub")}</p>
              </div>
            </div>
            <Suspense fallback={<div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />}>
              <PlatformFeed />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
