import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Menu, Star, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileNav } from "@/contexts/MobileNavigationContext";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RegionCountrySwitcher from "@/components/RegionCountrySwitcher";
import bateuLogo from "@/assets/bateu-logo.png";

const MobileTopBar = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { toggleMenu } = useMobileNav();
  const [unread, setUnread] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const loadLive = async () => {
      const { count } = await (supabase as any)
        .from("lives").select("id", { count: "exact", head: true }).eq("status", "active");
      setLiveCount(count || 0);
    };
    loadLive();
    const ch = supabase
      .channel("topbar-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lives" }, loadLive)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let mounted = true;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      if (mounted) setUnread(count || 0);
    };
    load();
    const ch = supabase
      .channel("topbar-notif")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: "user_id=eq." + user.id },
        (payload: any) => {
          load();
          if (payload.eventType === "INSERT" && payload.new) {
            const n = payload.new;
            const fn = n.type === "success" ? toast.success : n.type === "error" ? toast.error : toast;
            (fn as any)(n.title || "New notification", { description: n.message });
          }
        }
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  if (location.pathname.startsWith("/overlay")) return null;

  return (
    <header className={"mob-topbar lg:hidden" + (scrolled ? " mob-topbar-scrolled" : "")}>
      <div className="flex items-center justify-between px-3 py-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className={"mob-topbar-logo " + (scrolled ? "mob-topbar-logo-sm" : "")}>
            <img src={bateuLogo} alt="Bateu" className="h-full w-full rounded-lg object-cover" />
          </div>
          <div className="flex flex-col">
            <span className={"font-display font-bold leading-tight transition-all " + (scrolled ? "text-base" : "text-lg")}>
              Bateu
            </span>
            {liveCount > 0 && !scrolled && (
              <span className="mob-topbar-live-chip">
                <Radio className="h-2.5 w-2.5" />
                {liveCount} {t("mob.livesActive")}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {user && liveCount > 0 && scrolled && (
            <span className="mob-topbar-live-pill">
              <span className="mob-topbar-live-dot" />
              {liveCount}
            </span>
          )}
          {user && (
            <Link
              to="/my-points"
              className={"flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-accent font-bold transition-all " + (scrolled ? "text-[10px]" : "text-[11px]")}
            >
              <Star className={scrolled ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {!scrolled && t("mob.pts")}
            </Link>
          )}
          <LanguageSwitcher />
          <RegionCountrySwitcher compact />
          <ThemeToggle />
          <button
            onClick={() => { if (user) window.location.href = "/dashboard/notifications"; else window.location.href = "/login"; }}
            className="mob-topbar-icon-btn relative"
            aria-label={t("nav.notifications")}
          >
            <Bell className="h-[18px] w-[18px]" />
            {user && unread > 0 && (
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    key={"notif-" + unread}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="mob-topbar-notif-badge"
                  >
                    {unread > 9 ? "9+" : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={toggleMenu}
            className="mob-topbar-hamburger"
            aria-label={t("mob.menu")}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="mob-hamburger-svg">
              <motion.line
                x1="3" y1="5" x2="17" y2="5"
                className="stroke-current"
                strokeWidth="2" strokeLinecap="round"
                variants={{
                  open: { y1: 10, x2: 10, rotate: 45 },
                  closed: { y1: 5, x2: 17, rotate: 0 },
                }}
                animate="closed"
                transition={{ duration: 0.2 }}
              />
              <motion.line
                x1="3" y1="10" x2="17" y2="10"
                className="stroke-current"
                strokeWidth="2" strokeLinecap="round"
                variants={{
                  open: { opacity: 0, x1: 10 },
                  closed: { opacity: 1, x1: 3 },
                }}
                animate="closed"
                transition={{ duration: 0.15 }}
              />
              <motion.line
                x1="3" y1="15" x2="17" y2="15"
                className="stroke-current"
                strokeWidth="2" strokeLinecap="round"
                variants={{
                  open: { y1: 10, x2: 10, rotate: -45 },
                  closed: { y1: 15, x2: 17, rotate: 0 },
                }}
                animate="closed"
                transition={{ duration: 0.2 }}
              />
            </svg>
          </motion.button>
        </div>
      </div>
      <div className="mob-topbar-glow" aria-hidden="true" />
    </header>
  );
};

export default MobileTopBar;
