import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  pt: {
    // Navbar
    "nav.raffles": "Sorteios",
    "nav.contests": "Concursos",
    "nav.business": "Empresas",
    "nav.community": "Comunidade",
    "nav.referral": "Convida & Ganha",
    "nav.points": "Pontos",
    "nav.dashboard": "Dashboard",
    "nav.admin": "Admin",
    "nav.signout": "Sair",
    "nav.signin": "Entrar",
    "nav.signup": "Participar",
    // Hero
    "hero.title.prefix": "O seu próximo",
    "hero.title.highlight": "grande momento",
    "hero.subtitle": "Sorteios transparentes com verificação pública. Prémios reais, vencedores reais.",
    "hero.cta": "Participar agora",
    "hero.badge.verification": "Verificação pública",
    "hero.badge.community": "Comunidade activa",
    "hero.badge.weekly": "Novos toda semana",
    "hero.badge.participants": "participantes",
    // Footer
    "footer.tagline": "A plataforma onde cada sorteio é uma oportunidade real e verificável. Transparência não é promessa — é prova.",
    "footer.raffles": "Sorteios",
    "footer.winners": "Vencedores",
    "footer.howItWorks": "Como Funciona",
    "footer.terms": "Termos",
    "footer.privacy": "Privacidade",
    "footer.community": "Comunidade",
    "footer.faq": "FAQ",
    "footer.rights": "Todos os direitos reservados.",
    // Language switcher
    "lang.pt": "Português",
    "lang.en": "English",
  },
  en: {
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
    "hero.title.prefix": "Your next",
    "hero.title.highlight": "big moment",
    "hero.subtitle": "Transparent raffles with public verification. Real prizes, real winners.",
    "hero.cta": "Join now",
    "hero.badge.verification": "Public verification",
    "hero.badge.community": "Active community",
    "hero.badge.weekly": "New every week",
    "hero.badge.participants": "participants",
    "footer.tagline": "The platform where every raffle is a real and verifiable opportunity. Transparency isn't a promise — it's proof.",
    "footer.raffles": "Raffles",
    "footer.winners": "Winners",
    "footer.howItWorks": "How It Works",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "footer.community": "Community",
    "footer.faq": "FAQ",
    "footer.rights": "All rights reserved.",
    "lang.pt": "Português",
    "lang.en": "English",
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

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
  const t = (key: string) => translations[lang][key] ?? translations.pt[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback so app never crashes if provider is missing
    return {
      lang: "pt" as Lang,
      setLang: () => {},
      t: (k: string) => translations.pt[k] ?? k,
    };
  }
  return ctx;
}
