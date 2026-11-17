import type { Lang } from "@/contexts/LanguageContext";

export type LegalLang = "en" | "pt";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface TransparencySection {
  title: string;
  description: string;
  details: string[];
}

export function resolveLegalLang(lang: Lang): LegalLang {
  return lang.startsWith("pt") ? "pt" : "en";
}

export const termsContent: Record<LegalLang, { title: string; sections: LegalSection[] }> = {
  en: {
    title: "Terms & Conditions",
    sections: [
      {
        title: "1. Acceptance of Terms",
        paragraphs: [
          "By accessing and using the Bateu platform, you accept and agree to comply with these Terms & Conditions. If you do not agree with any of the terms, you must stop using the platform immediately.",
        ],
      },
      {
        title: "2. Service Description",
        paragraphs: [
          "Bateu is a premium digital raffle platform that lets verified businesses create and manage transparent raffles, and lets users participate by purchasing digital tickets.",
        ],
      },
      {
        title: "3. Eligibility",
        paragraphs: [
          "To use the platform you must be at least 18 years old and reside in one of the countries we serve (United States, Canada, Portugal, Brazil, Mozambique, Angola). The platform reserves the right to request identification documents.",
        ],
      },
      {
        title: "4. Payments and Tickets",
        paragraphs: [
          "Payments are processed through PayPal (US, Canada, Portugal, Brazil) or through local methods with manual receipt confirmation where applicable (M-Pesa, e-Mola, Multicaixa, MB Way, Pix, bank transfer). Each ticket purchased is tied to a unique number and recorded immutably on the platform. Tickets are non-refundable once payment is confirmed.",
        ],
      },
      {
        title: "5. Draws and Results",
        paragraphs: [
          "Draws are conducted transparently and verifiably. Results are final and not subject to appeal. The platform uses verification systems to guarantee fair draws.",
        ],
      },
      {
        title: "6. Businesses and Activation Fee",
        paragraphs: [
          "Businesses wishing to create raffles must register as a business account and are subject to an activation fee defined by the platform. All raffles go through an approval process before publication.",
        ],
      },
      {
        title: "7. Liability",
        paragraphs: [
          "Bateu is not liable for technical failures of payment providers, temporary service unavailability, or actions of third parties that violate these terms.",
        ],
      },
      {
        title: "8. Contact",
        paragraphs: [
          "For questions related to these terms, contact us through the in-platform support or via the channels listed in the Help Center.",
        ],
      },
    ],
  },
  pt: {
    title: "Termos e Condições",
    sections: [
      {
        title: "1. Aceitação dos Termos",
        paragraphs: [
          "Ao aceder e utilizar a plataforma Bateu, aceita e concorda em cumprir estes Termos e Condições. Se não concordar com algum termo, deve deixar de utilizar a plataforma imediatamente.",
        ],
      },
      {
        title: "2. Descrição do Serviço",
        paragraphs: [
          "A Bateu é uma plataforma digital premium de sorteios que permite a empresas verificadas criar e gerir sorteios transparentes, e a utilizadores participarem mediante a compra de bilhetes digitais.",
        ],
      },
      {
        title: "3. Elegibilidade",
        paragraphs: [
          "Para utilizar a plataforma deve ter pelo menos 18 anos e residir num dos países que servimos (Estados Unidos, Canadá, Portugal, Brasil, Moçambique, Angola). A plataforma reserva-se o direito de solicitar documentos de identificação.",
        ],
      },
      {
        title: "4. Pagamentos e Bilhetes",
        paragraphs: [
          "Os pagamentos são processados via PayPal (EUA, Canadá, Portugal, Brasil) ou métodos locais com confirmação manual de comprovativo quando aplicável (M-Pesa, e-Mola, Multicaixa, MB Way, Pix, transferência bancária). Cada bilhete adquirido está associado a um número único e registado de forma imutável na plataforma. Os bilhetes não são reembolsáveis após confirmação do pagamento.",
        ],
      },
      {
        title: "5. Sorteios e Resultados",
        paragraphs: [
          "Os sorteios são realizados de forma transparente e verificável. Os resultados são finais e não estão sujeitos a recurso. A plataforma utiliza sistemas de verificação para garantir sorteios justos.",
        ],
      },
      {
        title: "6. Empresas e Taxa de Ativação",
        paragraphs: [
          "As empresas que desejam criar sorteios devem registar-se como conta empresarial e estão sujeitas a uma taxa de ativação definida pela plataforma. Todos os sorteios passam por um processo de aprovação antes da publicação.",
        ],
      },
      {
        title: "7. Responsabilidade",
        paragraphs: [
          "A Bateu não se responsabiliza por falhas técnicas de fornecedores de pagamento, indisponibilidade temporária do serviço ou ações de terceiros que violem estes termos.",
        ],
      },
      {
        title: "8. Contacto",
        paragraphs: [
          "Para questões relacionadas com estes termos, contacte-nos através do suporte na plataforma ou dos canais indicados no Centro de Ajuda.",
        ],
      },
    ],
  },
};

export const privacyContent: Record<LegalLang, { title: string; sections: LegalSection[] }> = {
  en: {
    title: "Privacy Policy",
    sections: [
      {
        title: "1. Data Collection",
        paragraphs: [
          "Bateu collects only the data strictly necessary to run the platform: name, phone number, email address, and payment information. Data is collected at registration and when entering raffles.",
        ],
      },
      {
        title: "2. Use of Data",
        paragraphs: [
          "Personal data is used exclusively to: manage your account and profile, process raffle entries, communicate results and notifications, and comply with legal obligations.",
        ],
      },
      {
        title: "3. Storage and Security",
        paragraphs: [
          "All data is stored on secure servers with end-to-end encryption. We follow industry best practices to protect our users' information.",
        ],
      },
      {
        title: "4. Data Sharing",
        paragraphs: [
          "We do not share, sell, or rent personal data to third parties. Data may only be shared when required by law or with the user's explicit consent.",
        ],
      },
      {
        title: "5. User Rights",
        paragraphs: [
          "You have the right to access, correct, update, or request the deletion of your personal data at any time, through account settings or by contacting support.",
        ],
      },
      {
        title: "6. Cookies",
        paragraphs: [
          "The platform uses essential cookies to operate the service and analytics cookies to improve user experience. You can disable non-essential cookies in your browser settings.",
        ],
      },
      {
        title: "7. Changes",
        paragraphs: [
          "This policy may be updated periodically. Users will be notified of significant changes through the platform.",
        ],
      },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    sections: [
      {
        title: "1. Recolha de Dados",
        paragraphs: [
          "A Bateu recolhe apenas os dados estritamente necessários para operar a plataforma: nome, número de telefone, endereço de email e informações de pagamento. Os dados são recolhidos no registo e ao participar em sorteios.",
        ],
      },
      {
        title: "2. Utilização dos Dados",
        paragraphs: [
          "Os dados pessoais são utilizados exclusivamente para: gerir a sua conta e perfil, processar participações em sorteios, comunicar resultados e notificações, e cumprir obrigações legais.",
        ],
      },
      {
        title: "3. Armazenamento e Segurança",
        paragraphs: [
          "Todos os dados são armazenados em servidores seguros com encriptação de ponta a ponta. Seguimos as melhores práticas da indústria para proteger a informação dos nossos utilizadores.",
        ],
      },
      {
        title: "4. Partilha de Dados",
        paragraphs: [
          "Não partilhamos, vendemos ou alugamos dados pessoais a terceiros. Os dados só podem ser partilhados quando exigido por lei ou com consentimento explícito do utilizador.",
        ],
      },
      {
        title: "5. Direitos do Utilizador",
        paragraphs: [
          "Tem o direito de aceder, corrigir, atualizar ou solicitar a eliminação dos seus dados pessoais a qualquer momento, através das definições da conta ou contactando o suporte.",
        ],
      },
      {
        title: "6. Cookies",
        paragraphs: [
          "A plataforma utiliza cookies essenciais para operar o serviço e cookies analíticos para melhorar a experiência. Pode desativar cookies não essenciais nas definições do seu navegador.",
        ],
      },
      {
        title: "7. Alterações",
        paragraphs: [
          "Esta política pode ser atualizada periodicamente. Os utilizadores serão notificados de alterações significativas através da plataforma.",
        ],
      },
    ],
  },
};

export const transparencyContent: Record<
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
};
