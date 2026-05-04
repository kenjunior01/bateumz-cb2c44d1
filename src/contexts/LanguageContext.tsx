import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  pt: {
    // ===== Navbar / Top =====
    "nav.raffles": "Sorteios",
    "nav.contests": "Concursos",
    "nav.business": "Empresas",
    "nav.community": "Comunidade",
    "nav.referral": "Convida & Ganha",
    "nav.points": "Pontos",
    "nav.dashboard": "Painel",
    "nav.admin": "Admin",
    "nav.signout": "Sair",
    "nav.signin": "Entrar",
    "nav.signup": "Participar",
    "nav.notifications": "Notificações",

    // ===== Hero =====
    "hero.title.prefix": "O seu próximo",
    "hero.title.highlight": "grande momento",
    "hero.subtitle": "Sorteios transparentes com verificação pública. Prémios reais, vencedores reais.",
    "hero.cta": "Participar agora",
    "hero.badge.verification": "Verificação pública",
    "hero.badge.community": "Comunidade activa",
    "hero.badge.weekly": "Novos toda semana",
    "hero.badge.participants": "participantes",

    // ===== Mobile bottom tab =====
    "tab.home": "Início",
    "tab.explore": "Explorar",
    "tab.contests": "Concursos",
    "tab.profile": "Perfil",
    "tab.menu": "Menu rápido",

    // ===== FAB Mega-menu =====
    "fab.quickAccess": "Acesso rápido",
    "fab.signin": "Entrar",
    "fab.createAccount": "Criar conta",
    "fab.dashboard": "Painel",
    "fab.alerts": "Alertas",
    "fab.account": "Conta",
    "fab.admin": "Admin",
    "fab.logout": "Sair",
    "fab.group.raffles": "🎟️ Sorteios & Concursos",
    "fab.group.business": "🏢 Empresas",
    "fab.group.community": "👥 Comunidade",
    "fab.group.more": "ℹ️ Mais",
    "fab.contestsTitle": "🏆 Tipos de Concursos",
    "menu.marketplace": "Marketplace",
    "menu.marketplace.desc": "Todos activos",
    "menu.contests": "Concursos",
    "menu.contests.desc": "Fotos e vídeo",
    "menu.instantWin": "Instant Win",
    "menu.instantWin.desc": "Raspadinhas",
    "menu.myTickets": "Meus Bilhetes",
    "menu.directory": "Diretório",
    "menu.installments": "Prestações",
    "menu.createRaffle": "Criar Sorteio",
    "menu.hub": "Hub",
    "menu.winners": "Vencedores",
    "menu.transparency": "Transparência",
    "menu.referral": "Referência",
    "menu.howItWorks": "Como Funciona",
    "menu.faq": "FAQ",
    "menu.points": "Pontos",
    "menu.badge.new": "Novo",

    // ===== Search =====
    "search.location": "Localização",
    "search.placeholderPrefix": "Buscar",
    "search.button": "Buscar",
    "search.clear": "Limpar",
    "search.voice": "Pesquisa por voz",
    "search.scan": "Ler código",
    "search.trending": "Tendências",
    "search.quickAccess": "Acesso rápido",
    "search.chip.trending": "🔥 Em alta",
    "search.chip.new": "🆕 Novos",
    "search.chip.ending": "⏳ A terminar",
    "search.chip.cheap": "💰 Económicos",
    "search.chip.premium": "🏆 Premium",

    // ===== Categories =====
    "cat.all": "Todos",
    "cat.vehicles": "Veículos",
    "cat.electronics": "Eletrónicos",
    "cat.realestate": "Imóveis",
    "cat.travel": "Viagens",
    "cat.gaming": "Gaming",
    "cat.fashion": "Moda",
    "cat.prizes": "Prémios",
    "cat.contests": "Concursos",
    "cat.health": "Saúde",
    "cat.food": "Comida",
    "cat.family": "Família",
    "cat.more": "Mais",
    "cat.sectionTitle": "Categorias",
    "cat.filterByRegion": "🌍 Filtrar por região:",

    // ===== Mobile actions =====
    "mobile.viewAll": "Ver Todos",
    "mobile.myTickets": "Meus Bilhetes",

    // ===== Live ticker =====
    "ticker.live": "Ao vivo",

    // ===== Common =====
    "common.loading": "A carregar...",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.confirm": "Confirmar",
    "common.close": "Fechar",
    "common.back": "Voltar",
    "common.next": "Seguinte",
    "common.continue": "Continuar",
    "common.search": "Pesquisar",
    "common.filter": "Filtrar",
    "common.clear": "Limpar",

    // ===== Footer =====
    "footer.tagline": "A plataforma onde cada sorteio é uma oportunidade real e verificável. Transparência não é promessa — é prova.",
    "footer.raffles": "Sorteios",
    "footer.winners": "Vencedores",
    "footer.howItWorks": "Como Funciona",
    "footer.terms": "Termos",
    "footer.privacy": "Privacidade",
    "footer.community": "Comunidade",
    "footer.faq": "FAQ",
    "footer.rights": "Todos os direitos reservados.",

    // ===== Payments (checkout) =====
    "pay.howToPay": "Como deseja pagar?",
    "pay.method.mpesa": "M-Pesa",
    "pay.method.mpesa.desc": "Vodacom Moçambique",
    "pay.method.emola": "e-Mola",
    "pay.method.emola.desc": "Movitel Moçambique",
    "pay.method.card": "Cartão",
    "pay.method.card.desc": "Visa / Mastercard",
    "pay.method.multicaixa": "Multicaixa Express",
    "pay.method.multicaixa.desc": "Pagamento móvel Angola",
    "pay.method.unitelMoney": "Unitel Money",
    "pay.method.unitelMoney.desc": "Carteira móvel Unitel",
    "pay.method.africellMoney": "Africell Money",
    "pay.method.africellMoney.desc": "Carteira móvel Africell",
    "pay.method.baiTransfer": "Transferência BAI",
    "pay.method.baiTransfer.desc": "IBAN Banco BAI Angola",
    "pay.method.bfaTransfer": "Transferência BFA",
    "pay.method.bfaTransfer.desc": "IBAN Banco BFA Angola",
    "pay.method.pix": "Pix",
    "pay.method.pix.desc": "Pagamento instantâneo Brasil",
    "pay.method.boleto": "Boleto Bancário",
    "pay.method.boleto.desc": "Vence em 1-3 dias úteis",
    "pay.method.cardBR": "Cartão (Brasil)",
    "pay.method.cardBR.desc": "Crédito ou débito • parcelado",
    "pay.method.paypal": "PayPal",
    "pay.method.paypal.desc": "Pagamento internacional",

    "pay.notConfigured.title": "{method} não configurado",
    "pay.notConfigured.desc": "A empresa ainda não configurou {method}. Contacte o organizador.",
    "pay.payVia": "Pagar via {method}",
    "pay.sendTo": "Enviar para:",
    "pay.amountToSend": "Valor a enviar",
    "pay.steps": "Passos para transferência:",
    "pay.copyNumber": "Copiar número",
    "pay.afterPaymentNotice": "Após o pagamento, envie o comprovativo abaixo. A empresa confirmará e os bilhetes serão activados.",
    "pay.receiptLabel": "📎 Comprovativo de Pagamento",
    "pay.receiptUpload": "Toque para enviar comprovativo",

    // Pix specific
    "pay.pix.copyKey": "Copiar chave Pix",
    "pay.pix.scanQr": "Aproxime a câmara para ler o QR Pix",
    "pay.pix.key": "Chave Pix",
    "pay.pix.brcode": "Pix Copia & Cola",

    // Boleto specific
    "pay.boleto.barcode": "Linha digitável do boleto",
    "pay.boleto.dueDate": "Vencimento",
    "pay.boleto.payAt": "Pague em qualquer banco, lotérica ou aplicativo até a data de vencimento.",

    // Bank transfer (Angola)
    "pay.bank.iban": "IBAN",
    "pay.bank.holder": "Titular",
    "pay.bank.reference": "Referência",
    "pay.bank.includeRef": "Inclua a referência na descrição da transferência.",
  },

  en: {
    // ===== Navbar =====
    "nav.raffles": "Raffles",
    "nav.contests": "Contests",
    "nav.business": "Business",
    "nav.community": "Community",
    "nav.referral": "Refer & Earn",
    "nav.points": "Points",
    "nav.dashboard": "Dashboard",
    "nav.admin": "Admin",
    "nav.signout": "Sign out",
    "nav.signin": "Sign in",
    "nav.signup": "Join",
    "nav.notifications": "Notifications",

    // Hero
    "hero.title.prefix": "Your next",
    "hero.title.highlight": "big moment",
    "hero.subtitle": "Transparent raffles with public verification. Real prizes, real winners.",
    "hero.cta": "Join now",
    "hero.badge.verification": "Public verification",
    "hero.badge.community": "Active community",
    "hero.badge.weekly": "New every week",
    "hero.badge.participants": "participants",

    // Mobile bottom tab
    "tab.home": "Home",
    "tab.explore": "Explore",
    "tab.contests": "Contests",
    "tab.profile": "Profile",
    "tab.menu": "Quick menu",

    // FAB
    "fab.quickAccess": "Quick access",
    "fab.signin": "Sign in",
    "fab.createAccount": "Create account",
    "fab.dashboard": "Dashboard",
    "fab.alerts": "Alerts",
    "fab.account": "Account",
    "fab.admin": "Admin",
    "fab.logout": "Sign out",
    "fab.group.raffles": "🎟️ Raffles & Contests",
    "fab.group.business": "🏢 Business",
    "fab.group.community": "👥 Community",
    "fab.group.more": "ℹ️ More",
    "fab.contestsTitle": "🏆 Contest Types",
    "menu.marketplace": "Marketplace",
    "menu.marketplace.desc": "All active",
    "menu.contests": "Contests",
    "menu.contests.desc": "Photo & video",
    "menu.instantWin": "Instant Win",
    "menu.instantWin.desc": "Scratch cards",
    "menu.myTickets": "My Tickets",
    "menu.directory": "Directory",
    "menu.installments": "Installments",
    "menu.createRaffle": "Create Raffle",
    "menu.hub": "Hub",
    "menu.winners": "Winners",
    "menu.transparency": "Transparency",
    "menu.referral": "Referral",
    "menu.howItWorks": "How it works",
    "menu.faq": "FAQ",
    "menu.points": "Points",
    "menu.badge.new": "New",

    // Search
    "search.location": "Location",
    "search.placeholderPrefix": "Search",
    "search.button": "Search",
    "search.clear": "Clear",
    "search.voice": "Voice search",
    "search.scan": "Scan code",
    "search.trending": "Trending",
    "search.quickAccess": "Quick access",
    "search.chip.trending": "🔥 Trending",
    "search.chip.new": "🆕 New",
    "search.chip.ending": "⏳ Ending soon",
    "search.chip.cheap": "💰 Affordable",
    "search.chip.premium": "🏆 Premium",

    // Categories
    "cat.all": "All",
    "cat.vehicles": "Vehicles",
    "cat.electronics": "Electronics",
    "cat.realestate": "Real estate",
    "cat.travel": "Travel",
    "cat.gaming": "Gaming",
    "cat.fashion": "Fashion",
    "cat.prizes": "Prizes",
    "cat.contests": "Contests",
    "cat.health": "Health",
    "cat.food": "Food",
    "cat.family": "Family",
    "cat.more": "More",
    "cat.sectionTitle": "Categories",
    "cat.filterByRegion": "🌍 Filter by region:",

    // Mobile actions
    "mobile.viewAll": "View all",
    "mobile.myTickets": "My tickets",

    "ticker.live": "Live",

    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.continue": "Continue",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.clear": "Clear",

    "footer.tagline": "The platform where every raffle is a real and verifiable opportunity. Transparency isn't a promise — it's proof.",
    "footer.raffles": "Raffles",
    "footer.winners": "Winners",
    "footer.howItWorks": "How It Works",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.community": "Community",
    "footer.faq": "FAQ",
    "footer.rights": "All rights reserved.",

    // Payments
    "pay.howToPay": "How would you like to pay?",
    "pay.method.mpesa": "M-Pesa",
    "pay.method.mpesa.desc": "Vodacom Mozambique",
    "pay.method.emola": "e-Mola",
    "pay.method.emola.desc": "Movitel Mozambique",
    "pay.method.card": "Card",
    "pay.method.card.desc": "Visa / Mastercard",
    "pay.method.multicaixa": "Multicaixa Express",
    "pay.method.multicaixa.desc": "Angola mobile payment",
    "pay.method.unitelMoney": "Unitel Money",
    "pay.method.unitelMoney.desc": "Unitel mobile wallet",
    "pay.method.africellMoney": "Africell Money",
    "pay.method.africellMoney.desc": "Africell mobile wallet",
    "pay.method.baiTransfer": "BAI transfer",
    "pay.method.baiTransfer.desc": "Banco BAI Angola IBAN",
    "pay.method.bfaTransfer": "BFA transfer",
    "pay.method.bfaTransfer.desc": "Banco BFA Angola IBAN",
    "pay.method.pix": "Pix",
    "pay.method.pix.desc": "Brazil instant payment",
    "pay.method.boleto": "Bank slip (Boleto)",
    "pay.method.boleto.desc": "Due in 1-3 business days",
    "pay.method.cardBR": "Card (Brazil)",
    "pay.method.cardBR.desc": "Credit or debit • installments",
    "pay.method.paypal": "PayPal",
    "pay.method.paypal.desc": "International payment",

    "pay.notConfigured.title": "{method} not configured",
    "pay.notConfigured.desc": "The organizer hasn't configured {method} yet. Please contact them.",
    "pay.payVia": "Pay via {method}",
    "pay.sendTo": "Send to:",
    "pay.amountToSend": "Amount to send",
    "pay.steps": "Transfer steps:",
    "pay.copyNumber": "Copy number",
    "pay.afterPaymentNotice": "After paying, upload the receipt below. The organizer will confirm and your tickets will be activated.",
    "pay.receiptLabel": "📎 Payment receipt",
    "pay.receiptUpload": "Tap to upload receipt",

    "pay.pix.copyKey": "Copy Pix key",
    "pay.pix.scanQr": "Point your camera at the Pix QR code",
    "pay.pix.key": "Pix key",
    "pay.pix.brcode": "Pix Copy & Paste",

    "pay.boleto.barcode": "Boleto digit line",
    "pay.boleto.dueDate": "Due date",
    "pay.boleto.payAt": "Pay at any bank, lottery agent or banking app before the due date.",

    "pay.bank.iban": "IBAN",
    "pay.bank.holder": "Account holder",
    "pay.bank.reference": "Reference",
    "pay.bank.includeRef": "Include the reference in the transfer description.",
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function format(template: string, vars?: Record<string, string>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "pt";
    const saved = localStorage.getItem("bateu_lang") as Lang | null;
    if (saved === "pt" || saved === "en") return saved;
    const browser = navigator.language?.toLowerCase() || "";
    return browser.startsWith("en") ? "en" : "pt";
  });

  useEffect(() => {
    localStorage.setItem("bateu_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: string, vars?: Record<string, string>) =>
    format(translations[lang][key] ?? translations.pt[key] ?? key, vars);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: "pt" as Lang,
      setLang: () => {},
      t: (k: string, vars?: Record<string, string>) => format(translations.pt[k] ?? k, vars),
    };
  }
  return ctx;
}
