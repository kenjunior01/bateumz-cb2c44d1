import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Gamepad2, User, Radio, Medal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";

type TabDef = {
  icon: typeof Home;
  labelKey: string;
  href: string;
  teste: string;
  requiresAuth?: boolean;
};

/* v79 — «POUCAS OPÇÕES PRINCIPAIS» (reorganização do produto):
   a barra inferior passa a ter EXATAMENTE as cinco áreas principais da
   plataforma e deixa de duplicar atalhos: Início · Jogos · AO VIVO
   (botão central elevado) · Desporto · Perfil.
   O KART deixa de ser destino da barra (era confundido com uma secção
   de navegação) — continua promovido dentro de Jogos (destaque
   principal) e na homepage. O Mercado também sai da barra: vive no
   cabeçalho/topbar, no menu «Mais» e na homepage. */
const TABS: TabDef[] = [
  { icon: Home, labelKey: "tab.home", href: "/", teste: "mob-tab-home" },
  { icon: Gamepad2, labelKey: "tab.games", href: "/jogos", teste: "mob-tab-jogos" },
  { icon: Medal, labelKey: "tab.sport", href: "/desporto", teste: "mob-tab-desporto" },
  { icon: User, labelKey: "tab.profile", href: "/profile", teste: "mob-tab-profile", requiresAuth: false },
];

/* v79: o botão central elevado é agora AO VIVO (era KART) */
const LIVE_HREF = "/lives";

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

        {/* ═══ AO VIVO — botão central elevado (tile arredondado + gradiente + pulso) ═══ */}
        <button
          onClick={() => go(LIVE_HREF)}
          data-testid="mob-tab-live"
          aria-label={t("tab.live")}
          className="btn-press relative -mt-7 flex w-[72px] flex-col items-center"
        >
          <motion.span
            whileTap={{ scale: 0.88 }}
            className="mob-world-fab"
          >
            <Radio className="h-6 w-6 text-white drop-shadow" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.95)]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
            </span>
          </motion.span>
          <span className="mob-world-fab-label">{t("tab.live")}</span>
        </button>

        {TABS.slice(2).map((tab) =>
          tab.labelKey === "tab.profile" ? (
            <button
              key={tab.labelKey}
              onClick={goProfile}
              data-testid={"mob-tab-profile"}
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
      data-testid={tab.teste}
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
