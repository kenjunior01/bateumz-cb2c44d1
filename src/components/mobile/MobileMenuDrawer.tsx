import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Zap, Star, ChevronRight, Trophy, Ticket, Sparkles, Building2, Users,
  MessageCircle, History, ShieldCheck, Radio, HelpCircle, BookOpen,
  Gift, Store, Gamepad2, Bell, Search, Flame, Wallet,
  BadgeCheck, LogOut, Settings, User, X, Home, Layers,
  Swords, Newspaper, CreditCard, Target, Dice5, Globe, ChevronDown, Play, Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMobileNav } from "@/contexts/MobileNavigationContext";
import { supabase } from "@/integrations/supabase/client";
import bateuLogo from "@/assets/bateu-logo.png";

type NavItem = {
  icon: typeof Home;
  labelKey: string;
  href: string;
  badge?: string;
  live?: boolean;
  trending?: boolean;
  grad: string;
};

type NavGroup = {
  titleKey: string;
  icon: typeof Trophy;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "mob.group.raffles",
    icon: Ticket,
    items: [
      { icon: Store, labelKey: "menu.marketplace", href: "/marketplace", grad: "from-primary to-accent" },
      { icon: Trophy, labelKey: "menu.contests", href: "/concursos", grad: "from-amber-500 to-orange-500" },
      { icon: Sparkles, labelKey: "menu.instantWin", href: "/instant-win", grad: "from-violet-500 to-fuchsia-500" },
      { icon: Radio, labelKey: "menu.liveHub", href: "/lives", grad: "from-red-500 to-pink-500", live: true },
      { icon: Ticket, labelKey: "menu.myTickets", href: "/my-tickets", grad: "from-emerald-500 to-teal-500" },
    ],
  },
  {
    titleKey: "mob.group.games",
    icon: Gamepad2,
    items: [
      { icon: Zap, labelKey: "menu.games", href: "/jogos", grad: "from-amber-400 to-yellow-600", badge: "NOVO" },
      { icon: Swords, labelKey: "mob.battles", href: "/jogos", grad: "from-blue-600 to-indigo-800", trending: true },
      { icon: Dice5, labelKey: "mob.spinWheel", href: "/marketplace?tab=games", grad: "from-purple-500 to-pink-600" },
      { icon: Target, labelKey: "tournament.title", href: "/tournaments", grad: "from-emerald-500 to-teal-600", badge: "NOVO" },
    ],
  },
  {
    titleKey: "mob.group.business",
    icon: Building2,
    items: [
      { icon: Building2, labelKey: "menu.directory", href: "/empresas", grad: "from-blue-500 to-cyan-500" },
      { icon: CreditCard, labelKey: "menu.installments", href: "/prestacoes/catalogo", grad: "from-rose-500 to-pink-500", badge: "NOVO" },
      { icon: Gift, labelKey: "menu.createRaffle", href: "/dashboard/raffles/create", grad: "from-yellow-500 to-amber-500" },
    ],
  },
  {
    titleKey: "mob.group.community",
    icon: Users,
    items: [
      { icon: MessageCircle, labelKey: "menu.hub", href: "/community", grad: "from-sky-500 to-indigo-500" },
      { icon: History, labelKey: "menu.winners", href: "/historico", grad: "from-amber-500 to-yellow-500" },
      { icon: ShieldCheck, labelKey: "menu.transparency", href: "/transparencia", grad: "from-emerald-500 to-green-500" },
      { icon: Users, labelKey: "menu.referral", href: "/referral", grad: "from-fuchsia-500 to-pink-500" },
      { icon: Newspaper, labelKey: "menu.blog", href: "/blog", grad: "from-slate-500 to-slate-600" },
    ],
  },
  {
    titleKey: "mob.group.more",
    icon: Layers,
    items: [
      { icon: BookOpen, labelKey: "menu.howItWorks", href: "/como-funciona", grad: "from-slate-500 to-slate-600" },
      { icon: HelpCircle, labelKey: "menu.faq", href: "/faq", grad: "from-zinc-500 to-zinc-600" },
      { icon: Globe, labelKey: "mob.languages", href: "/", grad: "from-teal-500 to-cyan-600" },
      { icon: Shield, labelKey: "mob.terms", href: "/termos", grad: "from-gray-500 to-gray-600" },
    ],
  },
];

const QUICK_ACTIONS = [
  { icon: Radio, labelKey: "mob.liveNow", href: "/lives-agora", live: true, grad: "from-red-500 to-rose-600" },
  { icon: Gamepad2, labelKey: "mob.games", href: "/jogos", grad: "from-purple-500 to-violet-600" },
  { icon: Store, labelKey: "mob.shop", href: "/marketplace", grad: "from-blue-500 to-indigo-600" },
  { icon: Ticket, labelKey: "mob.tickets", href: "/my-tickets", grad: "from-emerald-500 to-teal-600" },
];

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants: Variants = {
  hidden: { y: "-100%", opacity: 0.5, scale: 0.95 },
  visible: {
    y: 0, opacity: 1, scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 28, mass: 0.8 },
  },
  exit: {
    y: "-100%", opacity: 0.5, scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 24 } },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } },
};

export default function MobileMenuDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const { format } = useCurrency();
  const { menuOpen, setMenuOpen } = useMobileNav();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    [NAV_GROUPS[0].titleKey]: true,
  });
  const [liveCount, setLiveCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => { setMenuOpen(false); }, [location.pathname, setMenuOpen]);

  useEffect(() => {
    const loadLive = async () => {
      const { count } = await (supabase as any)
        .from("lives").select("id", { count: "exact", head: true }).eq("status", "active");
      setLiveCount(count || 0);
    };
    loadLive();
    const ch = supabase
      .channel("mob-menu-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lives" }, loadLive)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!user) { setWalletBalance(null); setUnread(0); return; }
    let mounted = true;
    const load = async () => {
      const { data: wd } = await (supabase as any)
        .from("wallets").select("balance").eq("user_id", user.id).single();
      if (mounted && wd) setWalletBalance(wd.balance);
      const { count } = await (supabase as any)
        .from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      if (mounted) setUnread(count || 0);
    };
    load();
    const ch = supabase
      .channel("mob-menu-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: "user_id=eq." + user.id }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "user_id=eq." + user.id }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const toggleGroup = (titleKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [titleKey]: !prev[titleKey] }));
  };

  const goOrAuth = (href: string, requiresAuth = false) => {
    setMenuOpen(false);
    if (requiresAuth && !user) navigate("/login");
    else navigate(href);
  };

  const userDashboardHref = role === "admin" ? "/admin" : role === "business" ? "/dashboard" : "/profile";

  if (location.pathname.startsWith("/overlay")) return null;

  return (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            key="mob-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md lg:hidden"
            onClick={() => setMenuOpen(false)}
          />

          <motion.div
            key="mob-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[101] flex flex-col lg:hidden overflow-hidden"
            style={{ background: "hsl(var(--background))" }}
          >
            <div className="mob-menu-glow" aria-hidden="true" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="mob-menu-header">
                <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
                  <div className="mob-menu-logo-ring">
                    <img src={bateuLogo} alt="Bateu" className="h-9 w-9 rounded-lg" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-xl font-bold">Bateu</span>
                      <BadgeCheck className="h-4 w-4 text-primary" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
                      {t("mob.tagline")}
                    </span>
                  </div>
                </Link>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/80 text-foreground"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden mob-menu-scroll">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="px-4 pt-4 pb-8 space-y-3"
                >
                  <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2.5">
                    {QUICK_ACTIONS.map((qa) => (
                      <button
                        key={qa.labelKey}
                        onClick={() => goOrAuth(qa.href, qa.href === "/my-tickets")}
                        className="mob-quick-card group"
                      >
                        <div className={"flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br " + qa.grad + " shadow-lg group-active:scale-90 transition-transform"}>
                          <qa.icon className="h-5 w-5 text-white" strokeWidth={2} />
                          {qa.live && <span className="mob-quick-live-dot" />}
                        </div>
                        <span className="text-[10.5px] font-semibold mt-1.5 text-center leading-tight">{t(qa.labelKey)}</span>
                      </button>
                    ))}
                  </motion.div>

                  {liveCount > 0 && (
                    <motion.div variants={itemVariants}>
                      <button
                        onClick={() => goOrAuth("/lives-agora")}
                        className="mob-live-banner w-full flex items-center gap-3 rounded-2xl px-4 py-3"
                      >
                        <span className="mob-live-pulse-ring" aria-hidden="true" />
                        <Radio className="h-5 w-5 text-white shrink-0" />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">{liveCount} {t("mob.livesActive")}</p>
                          <p className="text-[11px] text-white/80">{t("mob.tapToWatch")}</p>
                        </div>
                        <Play className="h-5 w-5 text-white/80" />
                      </button>
                    </motion.div>
                  )}

                  <motion.div variants={itemVariants}>
                    <button
                      onClick={() => goOrAuth("/marketplace")}
                      className="w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-left backdrop-blur-sm"
                    >
                      <Search className="h-4.5 w-4.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground flex-1">{t("mob.searchPlaceholder")}</span>
                    </button>
                  </motion.div>

                  {!user && (
                    <motion.div variants={itemVariants}>
                      <button
                        onClick={() => goOrAuth("/register")}
                        className="mob-hero-cta w-full flex items-center gap-3.5 rounded-2xl p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                          <Flame className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">{t("mob.cta.title")}</p>
                          <p className="text-[11px] text-white/80">{t("mob.cta.subtitle")}</p>
                        </div>
                        <Zap className="h-4 w-4 text-white" />
                      </button>
                    </motion.div>
                  )}

                  {user && (
                    <motion.div variants={itemVariants}>
                      <button
                        onClick={() => goOrAuth(userDashboardHref)}
                        className="mob-user-card w-full flex items-center gap-3 rounded-2xl p-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                          {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold truncate">
                            {role === "admin" ? t("mob.admin") : role === "business" ? t("mob.business") : t("mob.hiUser")}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </motion.div>
                  )}

                  <div className="space-y-1">
                    {NAV_GROUPS.map((group) => {
                      const isExpanded = expandedGroups[group.titleKey] !== false;
                      return (
                        <motion.div key={group.titleKey} variants={itemVariants}>
                          <button
                            onClick={() => toggleGroup(group.titleKey)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <group.icon className="h-3.5 w-3.5" strokeWidth={2} />
                            </div>
                            <span className="flex-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              {t(group.titleKey)}
                            </span>
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
                                exit={{ height: 0, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-3 gap-2 pb-1.5">
                                  {group.items.map((item) => (
                                    <motion.button
                                      key={item.labelKey}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={() => goOrAuth(item.href, item.href === "/my-tickets")}
                                      className="mob-menu-item group flex flex-col items-center gap-1.5 rounded-2xl bg-card/80 border border-border/50 p-2.5 backdrop-blur-sm"
                                    >
                                      <div className={"relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br " + item.grad + " shadow-md group-active:scale-90 transition-transform"}>
                                        <item.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                                        {item.live && <span className="mob-item-live-dot" />}
                                        {item.badge && <span className="mob-item-badge">{item.badge}</span>}
                                      </div>
                                      <span className="text-[10.5px] font-semibold leading-tight text-center line-clamp-2 px-0.5">
                                        {t(item.labelKey)}
                                      </span>
                                      {item.trending && (
                                        <span className="mob-item-trending">
                                          <Flame className="h-2.5 w-2.5" /> Trending
                                        </span>
                                      )}
                                    </motion.button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.div variants={itemVariants} className="pt-3 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-2">
                      {walletBalance !== null && (
                        <button
                          onClick={() => goOrAuth("/wallet")}
                          className="mob-wallet-pill flex items-center justify-center gap-2 rounded-2xl py-3"
                        >
                          <Wallet className="h-4 w-4 text-white" />
                          <span className="text-sm font-bold text-white">{t("mob.wallet")}: {format(walletBalance)}</span>
                          <span className="mob-wallet-shine" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        onClick={() => goOrAuth("/my-points")}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 py-3"
                      >
                        <Star className="h-4 w-4 text-accent fill-accent/30" />
                        <span className="text-sm font-bold text-accent">{t("mob.points")}</span>
                      </button>
                    </div>

                    {!user ? (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => goOrAuth("/login")}
                          className="flex items-center justify-center rounded-2xl border border-border bg-secondary/50 py-3 text-sm font-semibold"
                        >
                          {t("mob.signin")}
                        </button>
                        <button
                          onClick={() => goOrAuth("/register")}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-white"
                        >
                          <Zap className="h-4 w-4" /> {t("mob.signup")}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <button onClick={() => goOrAuth(userDashboardHref)} className="mob-footer-action">
                          <User className="h-4 w-4" />
                          <span>{t("mob.profile")}</span>
                        </button>
                        <button onClick={() => goOrAuth(role === "business" ? "/dashboard/notifications" : "/profile")} className="mob-footer-action relative">
                          <Bell className="h-4 w-4" />
                          <span>{t("mob.alerts")}</span>
                          {unread > 0 && <span className="mob-notif-badge">{unread > 9 ? "9+" : unread}</span>}
                        </button>
                        <button onClick={() => goOrAuth(role === "business" ? "/dashboard/settings" : "/profile")} className="mob-footer-action">
                          <Settings className="h-4 w-4" />
                          <span>{t("mob.settings")}</span>
                        </button>
                        <button onClick={() => { setMenuOpen(false); signOut(); }} className="mob-footer-action">
                          <LogOut className="h-4 w-4" />
                          <span>{t("mob.logout")}</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
