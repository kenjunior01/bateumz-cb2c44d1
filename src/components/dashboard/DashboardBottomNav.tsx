import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Ticket, Radio, Users, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

type Tab = { to: string; label: string; icon: any; match?: (p: string) => boolean };

const tabs: Tab[] = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { to: "/dashboard/raffles", label: "Sorteios", icon: Ticket, match: (p) => p.startsWith("/dashboard/raffles") },
  { to: "/dashboard/scheduled-lives", label: "Lives", icon: Radio, match: (p) => p.startsWith("/dashboard/scheduled-lives") || p.startsWith("/dashboard/live") },
  { to: "/dashboard/participants", label: "Pessoas", icon: Users, match: (p) => p.startsWith("/dashboard/participants") },
];

interface Props { onMore: () => void; variant?: "dashboard" | "admin"; }

export function DashboardBottomNav({ onMore, variant = "dashboard" }: Props) {
  const { pathname } = useLocation();

  const adminTabs: Tab[] = [
    { to: "/admin", label: "Painel", icon: LayoutDashboard, match: (p) => p === "/admin" },
    { to: "/admin/raffles", label: "Sorteios", icon: Ticket, match: (p) => p.startsWith("/admin/raffles") },
    { to: "/admin/payments", label: "Pagamentos", icon: Radio, match: (p) => p.startsWith("/admin/payments") },
    { to: "/admin/users", label: "Users", icon: Users, match: (p) => p.startsWith("/admin/users") },
  ];

  const list = variant === "admin" ? adminTabs : tabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      <div className="dash-bottom-glow" />
      <div className="grid grid-cols-5 px-1 pt-1.5 pb-1.5 bg-card/88 backdrop-blur-2xl border-t border-border/30 rounded-t-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.05),inset_0_1px_0_0_hsl(var(--primary)/0.06)]">
        {list.map((t) => {
          const active = t.match ? t.match(pathname) : pathname === t.to;
          return (
            <NavLink key={t.to} to={t.to} end={t.to === "/dashboard" || t.to === "/admin"}
              className="relative flex flex-col items-center gap-0.5 py-2.5 min-h-[54px]">
              {active && (
                <motion.div layoutId={`tab-${variant}`} className="absolute -top-1 h-[3px] w-9 rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_12px_hsl(var(--primary)/0.4)]" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              )}
              <motion.div whileTap={{ scale: 0.85 }}>
                <t.icon className={`h-5 w-5 transition-all duration-200 ${active ? "text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.3)]" : "text-muted-foreground"}`} />
              </motion.div>
              <span className={`text-[10.5px] font-semibold transition-colors duration-200 ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
            </NavLink>
          );
        })}
        <button onClick={onMore} className="relative flex flex-col items-center gap-0.5 py-2.5 min-h-[54px]">
          <motion.div whileTap={{ scale: 0.85 }} className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </motion.div>
          <span className="text-[10.5px] font-semibold text-muted-foreground">Mais</span>
        </button>
      </div>
    </nav>
  );
}
