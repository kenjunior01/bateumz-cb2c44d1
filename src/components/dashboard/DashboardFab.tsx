import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Ticket, Radio, Trophy, Zap, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DashboardFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: Ticket, label: "Novo Sorteio", to: "/dashboard/raffles/create", color: "from-emerald-500 to-teal-500" },
    { icon: Radio, label: "Agendar Live", to: "/dashboard/scheduled-lives", color: "from-red-500 to-pink-500" },
    { icon: Zap, label: "Ir Live Agora", to: "/dashboard/live-games", color: "from-amber-500 to-orange-500" },
    { icon: Trophy, label: "Novo Prémio", to: "/dashboard/prizes", color: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <div className="lg:hidden fixed right-4 bottom-20 z-40">
      <AnimatePresence>
        {open && (
          <motion.div className="absolute right-0 bottom-16 flex flex-col items-end gap-2"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
            {actions.map((a, i) => (
              <motion.button key={a.label}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { setOpen(false); navigate(a.to); }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-card border border-border shadow-lg">
                <span className={`h-7 w-7 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center`}>
                  <a.icon className="h-4 w-4 text-white" />
                </span>
                <span className="text-xs font-bold whitespace-nowrap">{a.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40 flex items-center justify-center ring-4 ring-background">
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
          {open ? <X className="h-6 w-6 text-primary-foreground" /> : <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />}
        </motion.div>
      </motion.button>
    </div>
  );
}
