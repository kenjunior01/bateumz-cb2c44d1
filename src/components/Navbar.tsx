import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Star, ChevronDown, Trophy, Ticket, Sparkles, Building2, Users, Calendar, MessageCircle, History, ShieldCheck, Radio, HelpCircle, BookOpen, Gift, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import bateuLogo from "@/assets/bateu-logo.png";

type SubItem = { label: string; href: string; icon: typeof Trophy; desc: string; badge?: string };
type MenuGroup = { label: string; items: SubItem[] };

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();

  const groups: MenuGroup[] = [
    {
      label: "Sorteios",
      items: [
        { label: "Marketplace", href: "/marketplace", icon: Store, desc: "Todos os sorteios ativos" },
        { label: "Concursos", href: "/concursos", icon: Trophy, desc: "Fotos, vídeos, talentos" },
        { label: "Instant Win", href: "/instant-win", icon: Sparkles, desc: "Raspadinhas e roda da sorte" },
        { label: "Meus Bilhetes", href: "/my-tickets", icon: Ticket, desc: "Acompanhar participações" },
      ],
    },
    {
      label: "Empresas",
      items: [
        { label: "Diretório", href: "/empresas", icon: Building2, desc: "Empresas parceiras verificadas" },
        { label: "Vendas a Prestações", href: "/prestacoes", icon: Calendar, desc: "Pague em até 60x", badge: "Em breve" },
        { label: "Criar Sorteio", href: "/dashboard/raffles/new", icon: Gift, desc: "Para o seu negócio" },
      ],
    },
    {
      label: "Comunidade",
      items: [
        { label: "Hub", href: "/community", icon: MessageCircle, desc: "Chat e enquetes em tempo real" },
        { label: "Histórico de Vencedores", href: "/historico", icon: History, desc: "Sorteios finalizados" },
        { label: "Transparência", href: "/transparencia", icon: ShieldCheck, desc: "Verificação blockchain" },
        { label: "Live Draw", href: "/marketplace", icon: Radio, desc: "Sorteios ao vivo" },
      ],
    },
    {
      label: "Mais",
      items: [
        { label: "Como Funciona", href: "/como-funciona", icon: BookOpen, desc: "Guia rápido da plataforma" },
        { label: "Programa de Referência", href: "/referral", icon: Users, desc: "Convide e ganhe pontos" },
        { label: "FAQ", href: "/faq", icon: HelpCircle, desc: "Perguntas frequentes" },
      ],
    },
  ];



  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-foreground">
            Bateu
          </span>
        </Link>

        <div className="hidden lg:flex">
          <NavigationMenu>
            <NavigationMenuList>
              {groups.map((g) => (
                <NavigationMenuItem key={g.label}>
                  <NavigationMenuTrigger className="bg-transparent text-sm font-medium text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                    {g.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[420px] gap-1 p-3">
                      {g.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            to={item.href}
                            className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/20">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                                {item.badge && (
                                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/my-points" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
                <Star className="h-4 w-4 text-accent" /> {t("nav.points")}
              </Link>
              <Link to="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                {t("nav.dashboard")}
              </Link>
              {role === "admin" && (
                <Link to="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                  {t("nav.admin")}
                </Link>
              )}
              <button onClick={signOut} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {t("nav.signout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                {t("nav.signin")}
              </Link>
              <Link to="/register" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary">
                <Zap className="h-4 w-4" />
                {t("nav.signup")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border lg:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-4 max-h-[70vh] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
                  <div className="flex flex-col gap-0.5">
                    {g.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
                      >
                        <item.icon className="h-4 w-4 text-primary" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link to="/register" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                <Zap className="h-4 w-4" />
                {t("nav.signup")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
