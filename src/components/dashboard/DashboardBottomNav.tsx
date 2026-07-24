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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 px-1 pt-1 pb-1">
        {list.map((t) => {
          const active = t.match ? t.match(pathname) : pathname === t.to;
          return (
            <NavLink key={t.to} to={t.to} end={t.to === "/dashboard" || t.to === "/admin"}
              className="relative flex flex-col items-center gap-0.5 py-2 min-h-[56px]">
              {active && (
                <motion.div layoutId={`tab-${variant}`} className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              )}
              <t.icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10.5px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
            </NavLink>
          );
        })}
        <button onClick={onMore} className="relative flex flex-col items-center gap-0.5 py-2 min-h-[56px]">
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10.5px] font-medium text-muted-foreground">Mais</span>
        </button>
      </div>
    </nav>
  );
}
