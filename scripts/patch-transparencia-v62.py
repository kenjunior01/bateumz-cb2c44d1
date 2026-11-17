#!/usr/bin/env python3
# v62 — roadmap item 11: SÓ CONFIANÇA VERIFICÁVEL. A página /transparencia
# inventava blockchain (Polygon), «Certified RNG», AES-256, RGPD, «24/7»,
# «0 incidentes» — nenhuma destas coisas existe no código. O que É real e
# verificável: commit-reveal SHA-256 (compromisso publicado ANTES do sorteio,
# prova verificada NO BROWSER com Web Crypto — DrawProofPanel), apuramento
# server-side pela edge function raffle-draw, registos de auditoria das ações
# críticas (lib/audit.ts), histórico de vencedores público, resultados em
# direto, aprovação de sorteios empresariais e suporte por email. Reescrita
# completa do transparencyContent (en+pt) com esses factos.
import sys

CAMINHO = "src/lib/legal-content.ts"
src = open(CAMINHO, encoding="utf-8").read()

ini = src.find("export const transparencyContent")
marcador = src.find("};", src.find("howItWorksSteps", ini))
if ini < 0 or marcador < 0:
    print("LIMITES NÃO ENCONTRADOS"); sys.exit(1)
fim = marcador + 2  # inclui o };

NOVO = '''export const transparencyContent: Record<
  LegalLang,
  {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    stats: { value: string; label: string }[];
    sections: TransparencySection[];
    ctaTitle: string;
    ctaSubtitle: string;
    ctaFaq: string;
    ctaHistory: string;
    verifyTitle: string;
    verifySubtitle: string;
    howItWorksTitle: string;
    howItWorksSteps: { step: string; title: string; desc: string }[];
  }
> = {
  en: {
    badge: "Transparency & Security",
    title: "How We Earn",
    titleHighlight: "Your Trust",
    subtitle:
      "Every Bateu draw follows the same verifiable pattern: the commitment is published BEFORE the draw, the result is determined server-side, and you can verify the proof in your own browser. Only what the platform actually does is stated here.",
    stats: [
      { value: "SHA-256", label: "Commitment published before the draw" },
      { value: "2", label: "Phases: commitment and reveal" },
      { value: "100%", label: "Draws with a verifiable proof" },
      { value: "Public", label: "Winner history" },
    ],
    sections: [
      {
        title: "Commitment published before the draw (commit-reveal)",
        description:
          "Before the draw runs, the platform publishes the SHA-256 hash (the commitment) of the draw seed. After the draw, the seed is revealed — and the hash must match, or the result is not valid.",
        details: [
          "The commitment is generated server-side and published before the draw",
          "The seed only opens after the draw — it cannot be swapped afterwards without breaking the hash",
          "The commitment and the reveal are public in the draw page",
        ],
      },
      {
        title: "Proof you can verify in your own browser",
        description:
          "You don't have to take the platform's word for it: the verification runs locally in your browser with Web Crypto, recomputing the SHA-256 chain from the revealed seed and comparing it with the published commitment.",
        details: [
          "The verification panel recomputes the proof in your browser (Web Crypto)",
          "No browser extension or external tool needed — the button is in every draw",
          "A failed verification is shown honestly, never hidden",
        ],
      },
      {
        title: "Server-side winner determination",
        description:
          "The winning ticket is determined by the same server function for every draw. There is no manual pick: the draw runs through one auditable code path, and the result only stands when the published proof matches.",
        details: [
          "One draw function for all raffles — the same rule for every participant",
          "The result is accompanied by the seed and the hash for verification",
          "Draws also happen live on the draw page",
        ],
      },
      {
        title: "Audit trail of critical actions",
        description:
          "The platform keeps audit records of critical administrative actions — including the approval that every business raffle goes through before it is published.",
        details: [
          "Critical actions are recorded with author and timestamp",
          "Business raffles go through an approval step before publishing",
          "Business accounts are separate from participant accounts",
        ],
      },
      {
        title: "Participant protection",
        description:
          "Clear rules, public results and a direct channel when something goes wrong. The participation rules — including the 18+ minimum age — are published in the Terms.",
        details: [
          "Rules published in the Terms and Conditions",
          "Winner history is public — anyone can consult it",
          "Support by email at suporte@bateu.co.mz",
          "Responsible-play guidance on the Player Protection page",
        ],
      },
      {
        title: "Transparency",
        description:
          "Results are published in real time and stay consultable. We state only what we can show you — no blockchain, no external certifications, no invented numbers.",
        details: [
          "Draw results published in real time on the draw page",
          "Complete winner history, consultable by anyone",
          "Verification explained step by step on this page",
          "When we don't know or can't verify something, we say so",
        ],
      },
    ],
    ctaTitle: "Have Questions?",
    ctaSubtitle: "The verification is explained above — and the support channel is open for anything else.",
    ctaFaq: "View FAQ",
    ctaHistory: "View History",
    verifyTitle: "Verify a Specific Draw",
    verifySubtitle: "Enter a raffle ID from a winner card or use the link shared after a draw.",
    howItWorksTitle: "How verification works",
    howItWorksSteps: [
      { step: "1", title: "Commitment published", desc: "Before the draw, the SHA-256 of the seed is published — it can no longer be changed." },
      { step: "2", title: "Server-side draw", desc: "The same draw function determines the winning ticket for every draw." },
      { step: "3", title: "Seed revealed", desc: "After the draw, the seed is revealed alongside the result." },
      { step: "4", title: "Verification in your browser", desc: "Web Crypto recomputes the proof and compares it with the published commitment." },
    ],
  },
  pt: {
    badge: "Transparência & Segurança",
    title: "Como Garantimos a",
    titleHighlight: "Sua Confiança",
    subtitle:
      "Cada sorteio da Bateu segue o mesmo padrão verificável: o compromisso é publicado ANTES do sorteio, o resultado é apurado server-side e a prova pode ser verificada no seu próprio browser. Aqui está apenas o que a plataforma realmente faz.",
    stats: [
      { value: "SHA-256", label: "Compromisso publicado antes do sorteio" },
      { value: "2", label: "Fases: compromisso e revelação" },
      { value: "100%", label: "Sorteios com prova verificável" },
      { value: "Público", label: "Histórico de vencedores" },
    ],
    sections: [
      {
        title: "Compromisso publicado antes do sorteio (commit-reveal)",
        description:
          "Antes de o sorteio correr, a plataforma publica o hash SHA-256 (o compromisso) da seed do sorteio. Depois do sorteio, a seed é revelada — e o hash tem de coincidir, senão o resultado não vale.",
        details: [
          "O compromisso é gerado server-side e publicado antes do sorteio",
          "A seed só abre depois do sorteio — não pode ser trocada depois sem partir o hash",
          "O compromisso e a revelação são públicos na página do sorteio",
        ],
      },
      {
        title: "Prova que pode verificar no seu browser",
        description:
          "Não precisa de acreditar na palavra da plataforma: a verificação corre localmente no seu browser com Web Crypto, recalculando a cadeia SHA-256 da seed revelada e comparando-a com o compromisso publicado.",
        details: [
          "O painel de verificação recalcula a prova no seu browser (Web Crypto)",
          "Não precisa de extensão nem de ferramenta externa — o botão está em cada sorteio",
          "Uma verificação falhada é mostrada honestamente, nunca escondida",
        ],
      },
      {
        title: "Apuramento server-side",
        description:
          "O bilhete vencedor é apurado pela mesma função do servidor em todos os sorteios. Não há escolha manual: o sorteio corre num único caminho de código auditável e o resultado só vale quando a prova publicada coincide.",
        details: [
          "Uma função de sorteio para todos os sorteios — a mesma regra para cada participante",
          "O resultado acompanha a seed e o hash para verificação",
          "Os sorteios também acontecem em direto na página do sorteio",
        ],
      },
      {
        title: "Registos de auditoria das ações críticas",
        description:
          "A plataforma guarda registos de auditoria das ações administrativas críticas — incluindo a aprovação por que todos os sorteios empresariais passam antes de serem publicados.",
        details: [
          "Ações críticas registadas com autor e carimbo temporal",
          "Sorteios empresariais passam por uma aprovação antes de publicar",
          "Contas empresariais são separadas das contas de participantes",
        ],
      },
      {
        title: "Proteção do participante",
        description:
          "Regras claras, resultados públicos e um canal direto quando algo falha. As regras de participação — incluindo a idade mínima de 18 anos — estão publicadas nos Termos.",
        details: [
          "Regras publicadas nos Termos e Condições",
          "Histórico de vencedores público — qualquer pessoa pode consultá-lo",
          "Suporte por email em suporte@bateu.co.mz",
          "Orientação de jogo responsável na página de Proteção do Jogador",
        ],
      },
      {
        title: "Transparência",
        description:
          "Os resultados são publicados em tempo real e ficam consultáveis. Enunciamos apenas o que conseguimos mostrar — sem blockchain, sem certificações externas, sem números inventados.",
        details: [
          "Resultados de sorteios publicados em tempo real na página do sorteio",
          "Histórico completo de vencedores, consultável por qualquer pessoa",
          "A verificação explicada passo a passo nesta página",
          "Quando não sabemos ou não conseguimos verificar algo, dizemo-lo",
        ],
      },
    ],
    ctaTitle: "Tem Dúvidas?",
    ctaSubtitle: "A verificação está explicada acima — e o canal de suporte está aberto para o resto.",
    ctaFaq: "Ver FAQ",
    ctaHistory: "Ver Histórico",
    verifyTitle: "Verificar um Sorteio Específico",
    verifySubtitle: "Utilize o ID do sorteio a partir de um cartão de vencedor ou o link partilhado após o sorteio.",
    howItWorksTitle: "Como funciona a verificação",
    howItWorksSteps: [
      { step: "1", title: "Compromisso publicado", desc: "Antes do sorteio, o SHA-256 da seed é publicado — deixou de poder ser mudado." },
      { step: "2", title: "Sorteio server-side", desc: "A mesma função de sorteio apura o bilhete vencedor em todos os sorteios." },
      { step: "3", title: "Seed revelada", desc: "Depois do sorteio, a seed é revelada ao lado do resultado." },
      { step: "4", title: "Verificação no seu browser", desc: "A Web Crypto recalcula a prova e compara-a com o compromisso publicado." },
    ],
  },
};'''

src = src[:ini] + NOVO + src[fim:]
open(CAMINHO, "w", encoding="utf-8").write(src)
print("transparencyContent reescrito (en+pt) — factos verificáveis apenas")
