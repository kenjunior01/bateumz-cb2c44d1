import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Star, ChevronDown, Trophy, Ticket, Sparkles, Building2, Users, Calendar, MessageCircle, History, ShieldCheck, Radio, HelpCircle, BookOpen, Gift, Store, Gamepad2, Newspaper } from "lucide-react";
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
import RegionCountrySwitcher from "@/components/RegionCountrySwitcher";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import bateuLogo from "@/assets/bateu-logo.png";

type SubItem = { label: string; href: string; icon: typeof Trophy; desc: string; badge?: string };
type MenuGroup = { label: string; items: SubItem[] };

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const { rt } = useRegionalTheme();

  const groups: MenuGroup[] = [
    {
      label: rt("nav.group.raffles", "Raffles"),
      items: [
        { label: rt("nav.marketplace", "Marketplace"), href: "/marketplace", icon: Store, desc: rt("nav.marketplace.desc", "All active raffles") },
        { label: rt("nav.contests", "Contests"), href: "/concursos", icon: Trophy, desc: rt("nav.contests.desc", "Photo, video and talent") },
        { label: rt("nav.instantwin", "Instant Win"), href: "/instant-win", icon: Sparkles, desc: rt("nav.instantwin.desc", "Scratch cards & spin wheel") },
        { label: rt("nav.mytickets", "My Tickets"), href: "/my-tickets", icon: Ticket, desc: rt("nav.mytickets.desc", "Track your entries") },
      ],
    },
    {
      label: rt("nav.group.business", "Business"),
      items: [
        { label: rt("nav.directory", "Directory"), href: "/empresas", icon: Building2, desc: rt("nav.directory.desc", "Verified partner brands") },
        { label: rt("nav.installments.catalog", "Installments Catalog"), href: "/prestacoes/catalogo", icon: Calendar, desc: rt("nav.installments.catalog.desc", "Vehicles, real estate & more"), badge: rt("nav.badge.new", "New") },
        { label: rt("nav.installments.about", "About Installments"), href: "/prestacoes", icon: Calendar, desc: rt("nav.installments.about.desc", "How financed payments work") },
        { label: rt("nav.createraffle", "Create Raffle"), href: "/dashboard/raffles/create", icon: Gift, desc: rt("nav.createraffle.desc", "Launch your own raffle") },
      ],
    },
    {
      label: rt("nav.group.entertainment", "Entretenimento"),
      items: [
        { label: rt("nav.games", "Todos os Jogos"), href: "/jogos", icon: Gamepad2, desc: rt("nav.games.desc", "50+ jogos online gratis, jogue agora!"), badge: "Hot" },
        { label: rt("nav.livedraw", "Live Draw"), href: "/lives-agora", icon: Radio, desc: rt("nav.livedraw.desc", "Lives a acontecer agora") },
        { label: rt("nav.lives", "Jogos ao Vivo"), href: "/lives", icon: Radio, desc: rt("nav.lives.desc", "Engajamento ao vivo para empresas") },
        { label: rt("nav.blog", "Blog"), href: "/blog", icon: Newspaper, desc: rt("nav.blog.desc", "Dicas, novidades e conteudo viral"), badge: "Novo" },
      ],
    },
    {
      label: rt("nav.group.community", "Comunidade"),
      items: [
        { label: rt("nav.hub", "Hub"), href: "/community", icon: MessageCircle, desc: rt("nav.hub.desc", "Chat e votacoes em tempo real") },
        { label: rt("nav.winners", "Historico de Vencedores"), href: "/historico", icon: History, desc: rt("nav.winners.desc", "Sorteios concluidos") },
        { label: rt("nav.transparency", "Transparencia"), href: "/transparencia", icon: ShieldCheck, desc: rt("nav.transparency.desc", "Verificacao blockchain") },
        { label: rt("nav.how", "Como Funciona"), href: "/como-funciona", icon: BookOpen, desc: rt("nav.how.desc", "Guia rapido da plataforma") },
      ],
    },
    {
      label: rt("nav.group.more", "Mais"),
      items: [
        { label: rt("nav.referral", "Indique e Ganhe"), href: "/referral", icon: Users, desc: rt("nav.referral.desc", "Convide amigos, ganhe pontos") },
        { label: rt("nav.faq", "FAQ"), href: "/faq", icon: HelpCircle, desc: rt("nav.faq.desc", "Perguntas frequentes") },
      ],
    },
  ];



  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 navbar-glass-premium hidden lg:block"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
          <span
            className="font-display text-xl font-bold"
            style={{ color: "var(--region-primary, hsl(var(--foreground)))" }}
          >
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
          <RegionCountrySwitcher compact />
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/my-points" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
                <Star className="h-4 w-4 text-accent" /> {t("nav.points")}
              </Link>
              <Link to={role === "admin" ? "/admin" : role === "business" ? "/dashboard" : "/profile"} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                {role === "business" || role === "admin" ? t("nav.dashboard") : t("nav.profile")}
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
              <Link
                to="/register"
                style={{ background: "var(--region-primary, hsl(var(--primary)))" }}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow-primary"
              >
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
