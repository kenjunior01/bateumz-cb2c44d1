// ============================================================
// v79 — HOMEPAGE DESKTOP «POUCAS OPÇÕES PRINCIPAIS»:
// EXATAMENTE os cinco blocos da visão do produto:
//   1. Cabeçalho simples (Navbar v79) + TrustBar
//   2. UMA chamada principal (HeroPrincipal — uma frase, 2 botões)
//   3. TRÊS cartões de descoberta (DescobertaTres)
//   4. ACTIVIDADE REAL (ActividadeReal + sorteios disponíveis com
//      dados reais — mensagem clara quando não há dados)
//   5. CONFIANÇA no fim (ConfiancaFim + Footer)
// Sai da homepage (reorganizado, não eliminado):
//   · stories «Seu Status»/«Bateu Oficial» → Comunidade
//   · roll-up da loja → Mercado Bateu (página própria)
//   · CTA central duplicado (o hero JÁ tem os dois botões)
// Tudo aqui são componentes REAIS de dados (supabase/locais).
// ============================================================
import { lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import TrustBar from "@/components/TrustBar";
import Footer from "@/components/Footer";
import HeroPrincipal from "@/components/home/HeroPrincipal";
import DescobertaTres from "@/components/home/DescobertaTres";
import ActividadeReal from "@/components/home/ActividadeReal";
import ConfiancaFim from "@/components/home/ConfiancaFim";

const MobileHomeApp = lazy(() => import("@/components/mobile/MobileHomeApp"));
const ContinuePlayRail = lazy(() => import("@/components/home/ContinuePlayRail").then(m => ({ default: m.default })));
const SorteiosConcursosRollUp = lazy(() => import("@/components/home/SorteiosConcursosRollUp").then(m => ({ default: m.default })));

const Home = () => {
  const isMobile = useIsMobile();

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
      {/* 1 · cabeçalho */}
      <TrustBar />
      <Navbar />
      <main id="conteudo-principal" className="pb-16 pt-20 lg:pt-20">
        {/* pt-20: a navbar é FIXA (topo = fundo do banner de anúncio) — o
            respiro evita que a chamada principal nasça por baixo dela. */}
        {/* 2 · UMA chamada principal */}
        <HeroPrincipal />

        {/* 3 · TRÊS cartões de descoberta (KART promovido DENTRO de jogos) */}
        <DescobertaTres />

        {/* 4 · ACTIVIDADE REAL */}
        <ActividadeReal />

        {/* 4b · SORTEIOS DISPONÍVEIS — descoberta com dados reais */}
        <section className="px-4 py-8" aria-label="Sorteios disponíveis">
          <div className="container mx-auto max-w-6xl">
            <Suspense fallback={<div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />}>
              <SorteiosConcursosRollUp />
            </Suspense>
          </div>
        </section>

        {/* continuar a jogar — progressão REAL do próprio jogador (v78) */}
        <Suspense fallback={<div className="h-40" />}>
          <ContinuePlayRail />
        </Suspense>

        {/* 5 · CONFIANÇA */}
        <ConfiancaFim />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
