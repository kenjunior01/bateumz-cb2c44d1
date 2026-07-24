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
      "At Bateu, every draw is verifiable, every result is immutable, and every participant is protected. Discover how our technology ensures total fairness.",
    stats: [
      { value: "100%", label: "Draws on blockchain" },
      { value: "256-bit", label: "SSL encryption" },
      { value: "24/7", label: "Monitoring" },
      { value: "0", label: "Security incidents" },
    ],
    sections: [
      {
        title: "Cryptographically Secure RNG",
        description:
          "We use a cryptographically secure random number generator based on multiple entropy sources. Each draw generates a unique seed recorded on the blockchain before the result is revealed.",
        details: [
          "CSPRNG algorithm (Cryptographically Secure Pseudo-Random Number Generator)",
          "Seed composed of timestamp + block hash + server data",
          "Impossible to predict or manipulate the outcome",
        ],
      },
      {
        title: "Blockchain Verification",
        description:
          "All draws are recorded on the Polygon blockchain, ensuring immutability and traceability. Anyone can independently verify that results have not been tampered with.",
        details: [
          "Recorded on Polygon network (Proof-of-Stake)",
          "Public and verifiable transaction hash",
          "Seed data published before the draw",
        ],
      },
      {
        title: "Data Security",
        description:
          "Your personal and financial information is protected with bank-grade encryption. We comply with international security best practices.",
        details: [
          "256-bit SSL/TLS encryption on all communications",
          "Sensitive data encrypted at rest (AES-256)",
          "Two-factor authentication available",
          "GDPR and data protection compliance",
        ],
      },
      {
        title: "Audit & Compliance",
        description:
          "We maintain detailed records of all platform operations. Our audit system ensures full traceability of administrative actions.",
        details: [
          "Immutable audit logs for all critical actions",
          "Periodic security reviews",
          "Multi-step approval process for business raffles",
        ],
      },
      {
        title: "Participant Protection",
        description:
          "We implement rigorous measures to protect participants against fraud and ensure a fair experience for everyone.",
        details: [
          "Identity verification for organizing businesses",
          "Ticket limits per user to prevent monopolization",
          "Reporting and dispute resolution system",
          "Transparent refund policy",
        ],
      },
      {
        title: "Total Transparency",
        description:
          "We believe transparency is the foundation of trust. All our processes are open and verifiable.",
        details: [
          "Draw results published in real time",
          "Platform statistics publicly accessible",
          "Live activity feed with real transactions",
          "Complete winner history accessible to all",
        ],
      },
    ],
    ctaTitle: "Have Questions?",
    ctaSubtitle: "Our team is available to clarify any questions about security and transparency.",
    ctaFaq: "View FAQ",
    ctaHistory: "View History",
    verifyTitle: "Verify a Specific Draw",
    verifySubtitle: "Enter a raffle ID from a winner card or use the link shared after a draw.",
    howItWorksTitle: "How verification works",
    howItWorksSteps: [
      { step: "1", title: "Seed published", desc: "Before the draw, a unique seed is generated and recorded." },
      { step: "2", title: "Draw executed", desc: "The RNG selects the winning ticket using the published seed." },
      { step: "3", title: "Blockchain record", desc: "The result hash is stored on Polygon for permanent proof." },
      { step: "4", title: "Public audit", desc: "Anyone can verify the transaction on the blockchain explorer." },
    ],
  },
  pt: {
    badge: "Transparência & Segurança",
    title: "Como Garantimos a",
    titleHighlight: "Sua Confiança",
    subtitle:
      "Na Bateu, cada sorteio é verificável, cada resultado é imutável e cada participante é protegido. Descubra como a nossa tecnologia garante justiça total.",
    stats: [
      { value: "100%", label: "Sorteios na blockchain" },
      { value: "256-bit", label: "Encriptação SSL" },
      { value: "24/7", label: "Monitorização" },
      { value: "0", label: "Incidentes de segurança" },
    ],
    sections: [
      {
        title: "Gerador de Números Aleatórios (RNG)",
        description:
          "Utilizamos um sistema de geração de números aleatórios criptograficamente seguro, baseado em múltiplas fontes de entropia. Cada sorteio gera uma seed única registada na blockchain antes do resultado ser revelado.",
        details: [
          "Algoritmo CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)",
          "Seed composta por timestamp + hash do bloco + dados do servidor",
          "Impossível prever ou manipular o resultado",
        ],
      },
      {
        title: "Verificação Blockchain",
        description:
          "Todos os sorteios são registados na blockchain Polygon, garantindo imutabilidade e rastreabilidade. Qualquer pessoa pode verificar de forma independente que os resultados não foram adulterados.",
        details: [
          "Registo na rede Polygon (Proof-of-Stake)",
          "Hash da transação público e verificável",
          "Dados da seed publicados antes do sorteio",
        ],
      },
      {
        title: "Segurança de Dados",
        description:
          "A sua informação pessoal e financeira está protegida com encriptação de grau bancário. Cumprimos as melhores práticas internacionais de segurança.",
        details: [
          "Encriptação SSL/TLS 256-bit em todas as comunicações",
          "Dados sensíveis encriptados em repouso (AES-256)",
          "Autenticação de dois fatores disponível",
          "Conformidade com RGPD e leis de proteção de dados",
        ],
      },
      {
        title: "Auditoria e Conformidade",
        description:
          "Mantemos registos detalhados de todas as operações da plataforma. O nosso sistema de auditoria garante total rastreabilidade de ações administrativas.",
        details: [
          "Logs de auditoria imutáveis para todas as ações críticas",
          "Revisão periódica de segurança",
          "Processo de aprovação multi-etapa para sorteios empresariais",
        ],
      },
      {
        title: "Proteção do Participante",
        description:
          "Implementamos medidas rigorosas para proteger os participantes contra fraude e garantir uma experiência justa para todos.",
        details: [
          "Verificação de identidade para empresas organizadoras",
          "Limites de bilhetes por utilizador para prevenir monopolização",
          "Sistema de denúncias e resolução de disputas",
          "Política de reembolso transparente",
        ],
      },
      {
        title: "Transparência Total",
        description:
          "Acreditamos que a transparência é a base da confiança. Todos os nossos processos são abertos e verificáveis.",
        details: [
          "Resultados de sorteios publicados em tempo real",
          "Estatísticas da plataforma acessíveis publicamente",
          "Feed de atividade ao vivo com transações reais",
          "Histórico completo de vencedores acessível a todos",
        ],
      },
    ],
    ctaTitle: "Tem Dúvidas?",
    ctaSubtitle: "A nossa equipa está disponível para esclarecer qualquer questão sobre segurança e transparência.",
    ctaFaq: "Ver FAQ",
    ctaHistory: "Ver Histórico",
    verifyTitle: "Verificar um Sorteio Específico",
    verifySubtitle: "Utilize o ID do sorteio a partir de um cartão de vencedor ou o link partilhado após o sorteio.",
    howItWorksTitle: "Como funciona a verificação",
    howItWorksSteps: [
      { step: "1", title: "Seed publicada", desc: "Antes do sorteio, é gerada e registada uma seed única." },
      { step: "2", title: "Sorteio executado", desc: "O RNG seleciona o bilhete vencedor com a seed publicada." },
      { step: "3", title: "Registo blockchain", desc: "O hash do resultado é guardado na Polygon como prova permanente." },
      { step: "4", title: "Auditoria pública", desc: "Qualquer pessoa pode verificar a transação no explorador blockchain." },
    ],
  },
};
