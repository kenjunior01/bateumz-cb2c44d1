import { Home, Search, Ticket, User, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";

const tabs = [
  { icon: Home, label: "Início", href: "/" },
  { icon: Search, label: "Explorar", href: "/marketplace" },
  { icon: Trophy, label: "Concursos", action: "contests" as const },
  { icon: Ticket, label: "Bilhetes", href: "/my-points", auth: true },
  { icon: User, label: "Perfil", href: "/dashboard", auth: true },
];

const BottomTabBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [contestsOpen, setContestsOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {tabs.map((tab) => {
            const isContestAction = tab.action === "contests";
            const isActive = !isContestAction && location.pathname === tab.href;

            const inner = (
              <>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );

            if (isContestAction) {
              return (
                <Sheet key={tab.label} open={contestsOpen} onOpenChange={setContestsOpen}>
                  <SheetTrigger asChild>
                    <button className="relative flex flex-col items-center gap-0.5 px-2 py-2 min-w-[56px]">
                      {inner}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0 rounded-t-2xl">
                    <SheetHeader className="px-4 pt-4 pb-2">
                      <SheetTitle className="text-left">🏆 Tipos de Concursos</SheetTitle>
                    </SheetHeader>
                    <div onClick={() => setContestsOpen(false)}>
                      <ContestTypesShowcase />
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            const href = tab.auth && !user ? "/login" : tab.href!;

            return (
              <Link
                key={tab.label}
                to={href}
                className="relative flex flex-col items-center gap-0.5 px-2 py-2 min-w-[56px]"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomTabBar;
