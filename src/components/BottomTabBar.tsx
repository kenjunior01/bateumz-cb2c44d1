import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, Trophy, Wallet, LayoutGrid, Radio } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMobileNav } from "@/contexts/MobileNavigationContext";

type TabDef = {
  icon: typeof Home;
  labelKey: string;
  href: string;
  requiresAuth?: boolean;
};

const TABS: TabDef[] = [
  { icon: Home, labelKey: "tab.home", href: "/" },
  { icon: Search, labelKey: "tab.explore", href: "/marketplace" },
  { icon: Radio, labelKey: "tab.live", href: "/lives-agora" },
  { icon: Trophy, labelKey: "tab.contests", href: "/concursos" },
  { icon: Wallet, labelKey: "tab.wallet", href: "/wallet", requiresAuth: true },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toggleMenu } = useMobileNav();

  if (
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/overlay")
  ) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const goOrAuth = (href: string, requiresAuth?: boolean) => {
    if (requiresAuth && !user) navigate("/login");
    else navigate(href);
  };

  return (
    <nav className="mob-bottom-bar lg:hidden safe-area-bottom">
      <div className="mob-bottom-bar-glow" />
      <div className="mob-bottom-bar-inner">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <button
              key={tab.labelKey}
              onClick={() => goOrAuth(tab.href, tab.requiresAuth)}
              className={"mob-bottom-tab " + (active ? "mob-bottom-tab-active" : "")}
            >
              {active && (
                <motion.div
                  layoutId="bottom-tab-glow"
                  className="mob-bottom-tab-glow"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="bottom-tab-dot"
                  className="mob-bottom-tab-dot"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon className={"mob-bottom-tab-icon " + (active ? "mob-bottom-tab-icon-active" : "")} />
              <span className={"mob-bottom-tab-label " + (active ? "mob-bottom-tab-label-active" : "")}>
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}

        <button
          onClick={toggleMenu}
          className="mob-bottom-tab mob-bottom-tab-menu"
        >
          <motion.div
            className="mob-bottom-tab-menu-icon"
            whileTap={{ scale: 0.85, rotate: 90 }}
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={2} />
          </motion.div>
          <span className="mob-bottom-tab-label">{t("tab.menu")}</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomTabBar;
