import HeroPrincipal from "@/components/home/HeroPrincipal";
import BoasVindasRetencao from "@/components/home/BoasVindasRetencao";

/* ═══════════════════════════════════════════════════════════════════════
   v85 — «DESKTOP VIVO»: PRIMEIRA DOBRA EM DUAS COLUNAS.
   Antes: título e botões concentrados à esquerda e uma grande parte do
   desktop VAZIA (feedback: «o desktop precisa de mostrar o motivo para
   regressar, não apenas os caminhos de navegação»).
   Agora:
   · ESQUERDA — a chamada principal (HeroPrincipal, uma frase + 2 botões);
   · DIREITA — o painel vivo de progressão (BoasVindasRetencao variante
     «painel»): visitante vê o loop «Joga hoje. Acumula pontos.
     Desbloqueia prémios.» com NÚMEROS REAIS do catálogo; registado vê
     nível, pontos, barra real, missão do dia e prémios disponíveis.
   Em <lg as colunas empilham (mobile continua no MobileHomeApp).
   ═══════════════════════════════════════════════════════════════════════ */

const HeroDobra = () => {
  return (
    <section aria-labelledby="hero-principal-title" className="px-4 pt-5 sm:pt-8">
      <div className="container mx-auto max-w-6xl">
        <div
          data-testid="home85-dobra"
          className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.05fr_minmax(330px,0.95fr)] lg:gap-8"
        >
          <div className="min-w-0">
            <HeroPrincipal naDobra />
          </div>
          <div className="min-w-0">
            <BoasVindasRetencao variante="painel" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroDobra;
