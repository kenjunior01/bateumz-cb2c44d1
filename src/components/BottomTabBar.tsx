import { useState } from "react";
import {
  Home, Search, User, Trophy, Plus, Ticket, Sparkles, Building2,
  MessageCircle, History, ShieldCheck, Calendar, BookOpen, HelpCircle,
  Users, Gift, Star, Bell, Settings, LogOut, Store, Zap,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";

type ActionItem = {
  icon: typeof Home;
  labelKey: string;
  href: string;
  grad: string;
  badgeKey?: string;
  descKey?: string;
};

const ACTION_GROUPS: { titleKey: string; items: ActionItem[] }[] = [
  {
    titleKey: "fab.group.raffles",
    items: [
      { icon: Store, labelKey: "menu.marketplace", href: "/marketplace", grad: "from-primary to-accent", descKey: "menu.marketplace.desc" },
      { icon: Trophy, labelKey: "menu.contests", href: "/concursos", grad: "from-amber-500 to-orange-500", descKey: "menu.contests.desc" },
      { icon: Sparkles, labelKey: "menu.instantWin", href: "/instant-win", grad: "from-violet-500 to-fuchsia-500", descKey: "menu.instantWin.desc" },
      { icon: Radio, labelKey: "menu.liveHub", href: "/lives", grad: "from-red-500 to-pink-500", badgeKey: "menu.badge.new" },
      { icon: Ticket, labelKey: "menu.myTickets", href: "/my-tickets", grad: "from-emerald-500 to-teal-500" },
    ],
  },
  {
    titleKey: "fab.group.business",
    items: [
      { icon: Building2, labelKey: "menu.directory", href: "/empresas", grad: "from-blue-500 to-cyan-500" },
      { icon: Calendar, labelKey: "menu.installments", href: "/prestacoes/catalogo", grad: "from-rose-500 to-pink-500", badgeKey: "menu.badge.new" },
      { icon: Gift, labelKey: "menu.createRaffle", href: "/dashboard/raffles/create", grad: "from-yellow-500 to-amber-500" },
    ],
  },
  {
    titleKey: "fab.group.community",
    items: [
      { icon: MessageCircle, labelKey: "menu.hub", href: "/community", grad: "from-sky-500 to-indigo-500" },
      { icon: History, labelKey: "menu.winners", href: "/historico", grad: "from-amber-500 to-yellow-500" },
      { icon: ShieldCheck, labelKey: "menu.transparency", href: "/transparencia", grad: "from-emerald-500 to-green-500" },
      { icon: Users, labelKey: "menu.referral", href: "/referral", grad: "from-fuchsia-500 to-pink-500" },
    ],
  },
  {
    titleKey: "fab.group.more",
    items: [
      { icon: BookOpen, labelKey: "menu.howItWorks", href: "/como-funciona", grad: "from-slate-500 to-slate-600" },
      { icon: HelpCircle, labelKey: "menu.faq", href: "/faq", grad: "from-zinc-500 to-zinc-600" },
      { icon: Star, labelKey: "menu.points", href: "/my-points", grad: "from-amber-500 to-orange-500" },
    ],
  },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [contestsOpen, setContestsOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;

  const tabs = [
    { icon: Home, labelKey: "tab.home", href: "/" },
    { icon: Search, labelKey: "tab.explore", href: "/marketplace" },
    null,
    { icon: Trophy, labelKey: "tab.contests", href: "#contests" },
    { icon: User, labelKey: "tab.profile", href: user ? "/dashboard" : "/login" },
  ];

  const goOrAuth = (href: string, requiresAuth = false) => {
    setMoreOpen(false);
    if (requiresAuth && !user) navigate("/login");
    else navigate(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
        <div className="relative">
          <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" />

          <div className="relative grid grid-cols-5 items-end px-1 pb-1 pt-1">
            {tabs.map((tab, idx) => {
              if (idx === 2) {
                return (
                  <div key="fab" className="flex justify-center -mt-7">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMoreOpen(true)}
                      aria-label={t("tab.menu")}
                      className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary to-accent shadow-lg shadow-primary/40 flex items-center justify-center ring-4 ring-background"
                    >
                      <motion.div
                        animate={{ rotate: moreOpen ? 45 : 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
                      </motion.div>
                    </motion.button>
                  </div>
                );
              }

              if (!tab) return null;

              if (tab.href === "#contests") {
                return (
                  <button
                    key={tab.labelKey}
                    onClick={() => setContestsOpen(true)}
                    className="relative flex flex-col items-center gap-1 py-2 min-h-[56px]"
                  >
                    <tab.icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">{t(tab.labelKey)}</span>
                  </button>
                );
              }

              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.labelKey}
                  to={tab.href}
                  className="relative flex flex-col items-center gap-1 py-2 min-h-[56px]"
                >
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <tab.icon className={`h-6 w-6 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {t(tab.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto p-0 rounded-t-3xl border-t-2 border-primary/20">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 pt-4 pb-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {t("fab.quickAccess")}
              </SheetTitle>
              {user && (
                <button
                  onClick={() => goOrAuth("/my-points")}
                  className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent"
                >
                  <Star className="h-3 w-3 fill-accent" /> {t("menu.points")}
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-4 space-y-5 pb-32">
            {!user ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => goOrAuth("/login")}
                  className="rounded-xl border border-border bg-secondary/50 py-2.5 text-sm font-semibold"
                >
                  {t("fab.signin")}
                </button>
                <button
                  onClick={() => goOrAuth("/register")}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent py-2.5 text-sm font-bold text-primary-foreground"
                >
                  {t("fab.createAccount")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: User, labelKey: "fab.dashboard", href: "/dashboard" },
                  { icon: Bell, labelKey: "fab.alerts", href: "/dashboard/notifications" },
                  { icon: Settings, labelKey: "fab.account", href: "/dashboard/settings" },
                  ...(role === "admin"
                    ? [{ icon: ShieldCheck, labelKey: "fab.admin", href: "/admin" }]
                    : [{ icon: LogOut, labelKey: "fab.logout", href: "__logout" }]),
                ].map((q) => (
                  <button
                    key={q.labelKey}
                    onClick={() => {
                      if (q.href === "__logout") { signOut(); setMoreOpen(false); }
                      else goOrAuth(q.href);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl bg-secondary/50 py-2.5"
                  >
                    <q.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-medium">{t(q.labelKey)}</span>
                  </button>
                ))}
              </div>
            )}

            {ACTION_GROUPS.map((group) => (
              <div key={group.titleKey}>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  {t(group.titleKey)}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {group.items.map((item) => (
                    <motion.button
                      key={item.labelKey}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => goOrAuth(item.href)}
                      className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-card border border-border/60 p-2.5 hover:border-primary/40 active:bg-secondary/40 transition-colors"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.grad} shadow-md`}>
                        <item.icon className="h-6 w-6 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-[11.5px] font-semibold leading-tight text-center line-clamp-2 px-0.5">
                        {t(item.labelKey)}
                      </span>
                      {item.badgeKey && (
                        <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-foreground shadow">
                          {t(item.badgeKey)}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={contestsOpen} onOpenChange={setContestsOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto p-0 rounded-t-3xl">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 pt-4 pb-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
            <SheetTitle className="text-left">{t("fab.contestsTitle")}</SheetTitle>
          </div>
          <div onClick={() => setContestsOpen(false)}>
            <ContestTypesShowcase />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomTabBar;
