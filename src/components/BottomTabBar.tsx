import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ShoppingBag, User, Play, Swords } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";

type TabDef = {
  icon: typeof Home;
  labelKey: string;
  href: string;
  requiresAuth?: boolean;
};

/* Barra inferior mobile — v62 (roadmap item 7): QUATRO destinos de
   navegação + a ação central WORLD 3D elevada (tile arredondado com
   gradiente roxo + brilho, ícone Play e rótulo "WORLD"). Os sorteios
   deixam de ser destino próprio da barra: a homepage é a descoberta de
   loja/sorteios/histórias (item 6) — o /concursos continua pelo menu e
   pelas secções da homepage. */
const TABS: TabDef[] = [
  { icon: Home, labelKey: "tab.home", href: "/" },
  { icon: ShoppingBag, labelKey: "tab.shop", href: "/marketplace" },
  { icon: Swords, labelKey: "tab.arena", href: "/arena" },
  { icon: User, labelKey: "tab.profile", href: "/profile", requiresAuth: false },
];

const WORLD_HREF = "/lives?game=kart";

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sfx } = useSoundEffects();

  if (
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/overlay") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/empresa")
  ) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href.split("?")[0]);
  };

  const go = (href: string) => {
    sfx.tabClick();
    navigate(href);
  };

  const goProfile = () => {
    sfx.tabClick();
    navigate(user ? "/profile" : "/login");
  };

  return (
    <nav className="mob-bottom-bar lg:hidden safe-area-bottom">
      <div className="mob-bottom-bar-glow" />
      <div className="mob-bottom-bar-inner">
        {TABS.slice(0, 2).map((tab) => (
          <BottomTab key={tab.labelKey} tab={tab} isActive={isActive} onGo={go} t={t} />
        ))}

        {/* ═══ WORLD — botão central elevado (tile arredondado + gradiente + brilho) ═══ */}
        <button
          onClick={() => go(WORLD_HREF)}
          data-testid="mob-tab-world"
          aria-label="BATEU KART"
          className="btn-press relative -mt-7 flex w-[72px] flex-col items-center"
        >
          <motion.span
            whileTap={{ scale: 0.88 }}
            className="mob-world-fab"
          >
            <Play className="h-6 w-6 text-white fill-white drop-shadow" />
          </motion.span>
          <span className="mob-world-fab-label">KART</span>
        </button>

        {TABS.slice(2).map((tab) =>
          tab.labelKey === "tab.profile" ? (
            <button
              key={tab.labelKey}
              onClick={goProfile}
              className={"btn-press mob-bottom-tab " + (isActive("/profile") && user ? "mob-bottom-tab-active" : "")}
            >
              <tab.icon className={"mob-bottom-tab-icon " + (isActive("/profile") && user ? "mob-bottom-tab-icon-active" : "")} />
              <span className={"mob-bottom-tab-label " + (isActive("/profile") && user ? "mob-bottom-tab-label-active" : "")}>
                {t(tab.labelKey)}
              </span>
            </button>
          ) : (
            <BottomTab key={tab.labelKey} tab={tab} isActive={isActive} onGo={go} t={t} />
          ),
        )}
      </div>
    </nav>
  );
};

/* ─── separador normal com estados ativos animados ─── */
function BottomTab({
  tab,
  isActive,
  onGo,
  t,
}: {
  tab: TabDef;
  isActive: (href: string) => boolean;
  onGo: (href: string) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}) {
  const active = isActive(tab.href);
  return (
    <button
      onClick={() => onGo(tab.href)}
      data-testid={"mob-tab-" + tab.href.replace("/", "")}
      className={"btn-press mob-bottom-tab " + (active ? "mob-bottom-tab-active" : "")}
    >
      {active && (
        <motion.div
          layoutId="bottom-tab-glow"
          className="breathing-glow mob-bottom-tab-glow"
          style={{ "--glow-color": "#a855f7" } as React.CSSProperties}
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
}

export default BottomTabBar;
