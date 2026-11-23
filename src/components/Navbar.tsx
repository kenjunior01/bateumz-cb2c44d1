import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import {
  X, Zap, ChevronDown, Star, Gamepad2, Radio, Medal, Store, Gift,
  MessageCircle, History, Ticket, BrainCircuit, Users, LifeBuoy,
  ShieldCheck, BookOpen, HeartHandshake, Landmark, KeyRound, CreditCard,
  Bell, Search, Wallet, ArrowRight, BadgeCheck, LayoutGrid, Crown,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import ThemeToggle from "@/components/ThemeToggle";
import SoundSettings from "@/components/SoundSettings";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RegionCountrySwitcher from "@/components/RegionCountrySwitcher";
import { supabase } from "@/integrations/supabase/client";
import { abrirBuscaGlobal } from "@/components/search/GlobalSearch";
import bateuLogo from "@/assets/bateu-logo.png";
// v26.2: counts partilhados (1 pedido/30s por tabela+filtro em toda a app)
import { countRows } from "@/lib/counts";
// supabase is used directly as (supabase as any) below

/* ═══════════════════════════════════════════════════════════════════════
   v79 — CABEÇALHO DESKTOP «POUCAS OPÇÕES PRINCIPAIS»:
       Logo | Jogos | Ao vivo | Desporto | Mercado | Mais | Pesquisar | Entrar/Participar
   Sai do cabeçalho (reorganizado, NÃO eliminado):
   · os 5 mega-menus com ícones sem texto (causa do overflow a 1280px)
   · os atalhos directos duplicados (Desporto/Ligas/Jogos Grátis)
   · os switchers de região/idioma/som/tema → dentro do menu «Mais»
   · o menu mobile embutido (código morto — a barra inferior + drawer
     MobileMenuDrawer já são a navegação mobile)
   Todas as outras áreas continuam acessíveis: «Mais» tem o menu
   secundário completo (Vencedores, Histórico, Comunidade, Bateu IA,
   Indique e ganhe, Suporte, Transparência, Como funciona, Protecção do
   jogador, Termos, Privacidade + negócios) e as preferências.
   ═══════════════════════════════════════════════════════════════════════ */

const ANNOUNCEMENT_KEY = "bateu_navbar_announcement_dismissed";
type Announcement = {
  id: string;
  emoji: "🔥",
  text: string;
  cta: { label: string; href: string };
  gradient: string;
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [unread, setUnread] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  // v62 (item 8): altura REAL do banner de anúncio (o 38 fixo subestimava o
  // bar — o navbar ficava parcialmente SOB ele e os itens perdiam cliques)
  const [alturaAnuncio, setAlturaAnuncio] = useState(38);
  const lastY = useRef(0);
  const navRef = useRef<HTMLDivElement>(null);
  const anuncioRef = useRef<HTMLDivElement>(null);
  const maisRef = useRef<HTMLDivElement>(null);
  const { user, role, signOut, profile } = useAuth();
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();

  const currentAnnouncement: Announcement | null = {
    id: "live-may2025",
    emoji: "🔥",
    text: t("nav.announcement.text"),
    cta: { label: t("nav.announcement.cta"), href: "/lives-agora" },
    gradient: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)) 45%, hsl(var(--accent)))",
  };
  const { format } = useCurrency();
  const location = useLocation();

  // Premium scroll progress indicator (top of viewport)
  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
    restDelta: 0.001,
  });

  // Scroll-aware: shrink navbar and auto-hide on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y > 200) {
        setHidden(y > lastY.current && y - lastY.current > 5);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if announcement was dismissed in this session
  useEffect(() => {
    setAnnouncementDismissed(sessionStorage.getItem(ANNOUNCEMENT_KEY) === currentAnnouncement?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notification count for desktop bell
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let mounted = true;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (mounted) setUnread(count || 0);
    };
    load();
    const ch = (supabase as any)
      .channel("nav-notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; (supabase as any).removeChannel(ch); };
  }, [user]);

  // Live activity count — real-time pulse of how many streams are active right now
  useEffect(() => {
    let mounted = true;
    const load = () => {
      countRows("live_sessions", { col: "status", val: "active" })
        .then((n) => { if (mounted) setLiveCount(n ?? 0); });
    };
    load();
    const ch = (supabase as any)
      .channel("nav-live-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, () => load())
      .subscribe();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; (supabase as any).removeChannel(ch); clearInterval(interval); };
  }, []);

  // Wallet balance for authed users
  useEffect(() => {
    if (!user) { setWalletBalance(null); return; }
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();
        if (mounted && typeof data?.balance === "number") setWalletBalance(data.balance);
      } catch {
        if (mounted) setWalletBalance(null);
      }
    };
    load();
    const ch = (supabase as any)
      .channel("nav-wallet")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; (supabase as any).removeChannel(ch); };
  }, [user]);

  // Fecha «Mais» em navegação e clique-fora
  useEffect(() => { setMaisAberto(false); }, [location.pathname]);
  useEffect(() => {
    if (!maisAberto) return;
    const onDoc = (e: MouseEvent) => {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) setMaisAberto(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMaisAberto(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [maisAberto]);

  // Cursor-follow spotlight — desktop only
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = navRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    el.style.setProperty("--navbar-mx", `${x}%`);
  }, []);

  // Build initials for avatar
  const initials = (() => {
    const name: string = profile?.display_name?.trim() || user?.email?.split("@")[0] || "U";
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((p: string) => p.charAt(0).toUpperCase()).join("") || "U";
  })();

  const dismissAnnouncement = () => {
    if (currentAnnouncement) {
      sessionStorage.setItem(ANNOUNCEMENT_KEY, currentAnnouncement.id);
      setAnnouncementDismissed(true);
    }
  };

  /* ── navegação principal: EXATAMENTE as áreas principais + «Mais» ──
     v83 «A RETENÇÃO À VISTA»: Prémios entra nos principais (a visão:
     «a página Prémios deve ser uma das áreas principais») e o Mercado
     passa a secundário no «Mais» — Jogos · Ao vivo · Desporto · Prémios. */
  const principais = [
    { to: "/jogos", label: t("nav79.jogos"), icon: Gamepad2, teste: "nav79-desktop-jogos" },
    { to: "/lives", label: t("nav79.live"), icon: Radio, teste: "nav79-desktop-live", live: true },
    { to: "/desporto", label: t("nav79.desporto"), icon: Medal, teste: "nav79-desktop-desporto" },
    { to: "/premios", label: t("nav79.premios"), icon: Gift, teste: "nav79-desktop-premios" },
  ];

  /* ── menu secundário «Mais» (funções continuam a existir, organizadas) ── */
  const maisSecundario: { label: string; href: string; icon: typeof History }[] = [
    { label: t("nav.winners"), href: "/historico", icon: History },
    { label: t("nav79.historico"), href: "/my-tickets", icon: Ticket },
    { label: t("nav.hub"), href: "/community", icon: MessageCircle },
    { label: t("nav.ia"), href: "/ia", icon: BrainCircuit },
    { label: t("nav.referral"), href: "/referral", icon: Users },
    { label: t("nav.faq"), href: "/faq", icon: LifeBuoy },
    { label: t("nav.transparency"), href: "/transparencia", icon: ShieldCheck },
    { label: t("nav.how"), href: "/como-funciona", icon: BookOpen },
    { label: t("nav79.protecao"), href: "/protecao", icon: HeartHandshake },
    { label: t("mob.terms"), href: "/termos", icon: Landmark },
    { label: t("nav79.privacidade"), href: "/privacy", icon: ShieldCheck },
  ];
  const maisNegocios: { label: string; href: string; icon: typeof History }[] = [
    // v83 — o Mercado (sorteios/loja/leilões) passa a secundário organizado
    { label: t("nav79.mercado"), href: "/marketplace", icon: Store },
    { label: t("nav79.negocios"), href: "/negocios", icon: LifeBuoy },
    { label: t("nav79.leiloes"), href: "/alienacao", icon: KeyRound },
    { label: t("nav79.prestacoes"), href: "/prestacoes/catalogo", icon: CreditCard },
  ];

  // Show/hide navbar on specific routes (overlay, dashboard, admin)
  useEffect(() => {
    const el = anuncioRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const mede = () => setAlturaAnuncio(Math.max(38, Math.round(el.getBoundingClientRect().bottom)));
    mede();
    const ro = new ResizeObserver(mede);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentAnnouncement, announcementDismissed]);

  const hideNavbar = location.pathname.startsWith("/overlay/");
  if (hideNavbar) return null;

  const linkCls = (ativo: boolean) =>
    "navbar-trigger flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 " +
    (ativo ? "bg-secondary/60 text-foreground" : "bg-transparent text-foreground/85 hover:bg-secondary/50 hover:text-foreground");

  return (
    <>
      <AnimatePresence>
        {currentAnnouncement && !announcementDismissed && (
          <motion.div
            ref={anuncioRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="relative z-[51] hidden lg:block overflow-hidden"
          >
            <div
              style={{ background: currentAnnouncement.gradient }}
              className="relative overflow-hidden"
            >
              <div className="absolute inset-0 animate-shimmer" aria-hidden="true" />
              <div className="navbar-announcement-inner relative flex items-center justify-between px-6 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="text-xl"
                    aria-hidden="true"
                  >
                    {currentAnnouncement.emoji}
                  </motion.span>
                  <p className="text-xs font-semibold text-primary-foreground truncate">
                    {currentAnnouncement.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={currentAnnouncement.cta.href}
                    onClick={() => { dismissAnnouncement(); sfx.dismiss(); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold text-primary-foreground backdrop-blur-sm transition-all hover:bg-white/25 hover:scale-105 active:scale-95"
                  >
                    {currentAnnouncement.cta.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => { dismissAnnouncement(); sfx.dismiss(); }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-primary-foreground/70 transition-colors hover:bg-white/30 hover:text-primary-foreground"
                    aria-label="Fechar anúncio"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        ref={navRef}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: hidden ? -100 : 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onMouseMove={handleMouseMove}
        className="navbar-shell fixed left-0 right-0 z-50 hidden lg:block transition-[top] duration-300"
        style={{ top: currentAnnouncement && !announcementDismissed ? alturaAnuncio : 0 }}
      >
        <div className="navbar-spotlight" aria-hidden="true" />

        <motion.div
          aria-hidden="true"
          className="navbar-scroll-progress"
          style={{ scaleX: progressScaleX }}
        />
        <div className="navbar-aurora-strip" aria-hidden="true" />
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, var(--region-primary, hsl(var(--primary))) 20%, hsl(var(--accent)) 50%, var(--region-primary, hsl(var(--primary))) 80%, transparent)",
            backgroundSize: "300% 100%",
            animation: "border-flow 4s linear infinite",
            opacity: scrolled ? 1 : 0.4,
          }}
        />

        <div
          className={
            "relative transition-all duration-500 ease-out " +
            (scrolled ? "navbar-scrolled glass-strong shadow-elegant" : "glass-subtle")
          }
        >
          <div
            className={
              "container mx-auto flex items-center justify-between gap-2 transition-all duration-500 " +
              (scrolled ? "px-6 py-2" : "px-6 py-3")
            }
          >
            {/* logo */}
            <div className="group relative flex items-center gap-2.5">
              <Link to="/" className="relative flex items-center gap-2.5">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="navbar-logo-ring relative"
                >
                  <img
                    src={bateuLogo}
                    alt="Bateu"
                    className={"transition-all duration-500 " + (scrolled ? "h-8 w-8" : "h-9 w-9")}
                  />
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
                <span
                  className={"navbar-brand-text font-display font-bold transition-all duration-500 text-gradient-primary " + (scrolled ? "text-lg" : "text-xl")}
                >
                  Bateu
                </span>
                <span className="navbar-verified-dot hidden xl:inline-flex" title={t("nav.verified")}>
                  <BadgeCheck className="h-[10px] w-[10px]" strokeWidth={2.5} />
                </span>
              </Link>
            </div>

            {/* ═══ navegação principal: Jogos · Ao vivo · Desporto · Mercado · Mais ═══ */}
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
              {principais.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  className={linkCls(location.pathname.startsWith(p.to))}
                  data-testid={p.teste}
                  onClick={() => sfx.click()}
                >
                  <p.icon className="h-[13px] w-[13px]" strokeWidth={2.2} aria-hidden="true" />
                  <span>{p.label}</span>
                  {"live" in p && p.live && liveCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-500 tabular-nums">
                      {liveCount > 99 ? "99+" : liveCount}
                    </span>
                  )}
                </Link>
              ))}

              {/* Mais — menu secundário completo + preferências */}
              <div className="relative" ref={maisRef}>
                <button
                  type="button"
                  onClick={() => { setMaisAberto((v) => !v); sfx.click(); }}
                  className={linkCls(maisAberto) + " flex"}
                  data-testid="nav79-desktop-mais"
                  aria-expanded={maisAberto}
                  aria-haspopup="menu"
                >
                  <LayoutGrid className="h-[13px] w-[13px]" strokeWidth={2.2} aria-hidden="true" />
                  <span>{t("nav79.mais")}</span>
                  <ChevronDown className={"h-3 w-3 transition-transform duration-200 " + (maisAberto ? "rotate-180" : "")} aria-hidden="true" />
                </button>

                <AnimatePresence>
                  {maisAberto && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-full z-50 mt-2 w-[300px] rounded-2xl border border-border/60 bg-popover p-2 shadow-elegant"
                      role="menu"
                    >
                      <div className="max-h-[62vh] overflow-y-auto">
                        {maisSecundario.map((item) => (
                          <Link
                            key={item.href + item.label}
                            to={item.href}
                            onClick={() => { setMaisAberto(false); sfx.click(); }}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
                          >
                            <item.icon className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
                            <span>{item.label}</span>
                          </Link>
                        ))}

                        <div className="my-2 h-px bg-border/60" />
                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {t("nav.group.business")}
                        </p>
                        {maisNegocios.map((item) => (
                          <Link
                            key={item.href + item.label}
                            to={item.href}
                            onClick={() => { setMaisAberto(false); sfx.click(); }}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
                          >
                            <item.icon className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
                            <span>{item.label}</span>
                          </Link>
                        ))}

                        <div className="my-2 h-px bg-border/60" />
                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {t("mob.settings")}
                        </p>
                        <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                          <RegionCountrySwitcher compact />
                          <LanguageSwitcher />
                          <SoundSettings compact />
                          <ThemeToggle />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ═══ Pesquisar + autenticação ═══ */}
            <div className="hidden items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={() => { sfx.inputFocus(); abrirBuscaGlobal(); }}
                className="navbar-search-trigger group flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md transition-colors hover:bg-secondary/50 hover:text-foreground"
                aria-label={t("nav.search")}
                data-testid="navbar-busca"
              >
                <Search className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                <span className="hidden max-w-40 truncate xl:inline">{t("nav.search.placeholder")}</span>
                <kbd className="navbar-kbd hidden xl:inline-flex">⌘K</kbd>
              </button>

              {user && (
                <Link
                  to={role === "business" ? "/dashboard/notifications" : "/profile"}
                  className="navbar-bell relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-secondary/50"
                  aria-label={t("nav.notifications")}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 && (
                    <span className="navbar-bell-badge absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground px-1 shadow-glow">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              )}

              <div className="w-px h-6 bg-border/60 mx-1" />

              {user ? (
                <motion.div
                  className="navbar-user-cluster flex items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1 backdrop-blur-md"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {walletBalance !== null && (
                    <Link
                      to="/wallet"
                      className="navbar-wallet-pill group relative"
                      title={t("nav.wallet")}
                      aria-label={t("nav.wallet")}
                    >
                      <span className="navbar-wallet-shine" aria-hidden="true" />
                      <Wallet className="h-3.5 w-3.5 relative" />
                      <span className="tabular-nums relative">{format(walletBalance)}</span>
                    </Link>
                  )}
                  <Link
                    to="/my-points"
                    className="navbar-points-pill group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-secondary/50"
                    title={t("nav.points")}
                  >
                    <Star className="h-4 w-4 text-accent fill-accent/30 transition-transform group-hover:rotate-12" />
                    <span className="text-gradient-primary font-semibold">
                      {t("nav.points")}
                    </span>
                  </Link>
                  <Link
                    to={role === "admin" ? "/admin" : role === "business" ? "/dashboard" : "/profile"}
                    className="navbar-avatar-ring avatar-ring"
                    title={profile?.display_name || t("nav.profile")}
                    aria-label={t("nav.profile")}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile?.display_name || "Perfil"} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </Link>
                  {role === "admin" && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      {t("nav.admin")}
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-secondary/50"
                    title={t("nav.signout")}
                    aria-label={t("nav.signout")}
                  >
                    {t("nav.signout")}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Link
                    to="/login"
                    className="hover-lift rounded-xl px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-secondary/50"
                    data-testid="navbar-entrar"
                  >
                    {t("nav.signin")}
                  </Link>
                  <Link
                    to="/register"
                    className="glow-primary hover-lift flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03]"
                    data-testid="navbar-participar"
                  >
                    <Zap className="h-4 w-4" />
                    {t("nav.signup")}
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  );
};

export default Navbar;
