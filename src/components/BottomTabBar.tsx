import { useState } from "react";
import {
  Home, Search, User, Trophy, Plus, Ticket, Sparkles, Building2,
  MessageCircle, History, ShieldCheck, Calendar, BookOpen, HelpCircle,
  Users, Gift, Star, Bell, Settings, LogOut, Store, Zap, X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";

type ActionItem = {
  icon: typeof Home;
  label: string;
  href: string;
  grad: string;
  badge?: string;
  desc?: string;
};

const ACTION_GROUPS: { title: string; items: ActionItem[] }[] = [
  {
    title: "🎟️ Sorteios & Concursos",
    items: [
      { icon: Store, label: "Marketplace", href: "/marketplace", grad: "from-primary to-accent", desc: "Todos ativos" },
      { icon: Trophy, label: "Concursos", href: "/concursos", grad: "from-amber-500 to-orange-500", desc: "Fotos & vídeo" },
      { icon: Sparkles, label: "Instant Win", href: "/instant-win", grad: "from-violet-500 to-fuchsia-500", desc: "Raspadinhas" },
      { icon: Ticket, label: "Meus Bilhetes", href: "/my-tickets", grad: "from-emerald-500 to-teal-500" },
    ],
  },
  {
    title: "🏢 Empresas",
    items: [
      { icon: Building2, label: "Diretório", href: "/empresas", grad: "from-blue-500 to-cyan-500" },
      { icon: Calendar, label: "Prestações", href: "/prestacoes/catalogo", grad: "from-rose-500 to-pink-500", badge: "Novo" },
      { icon: Gift, label: "Criar Sorteio", href: "/dashboard/raffles/create", grad: "from-yellow-500 to-amber-500" },
    ],
  },
  {
    title: "👥 Comunidade",
    items: [
      { icon: MessageCircle, label: "Hub", href: "/community", grad: "from-sky-500 to-indigo-500" },
      { icon: History, label: "Vencedores", href: "/historico", grad: "from-amber-500 to-yellow-500" },
      { icon: ShieldCheck, label: "Transparência", href: "/transparencia", grad: "from-emerald-500 to-green-500" },
      { icon: Users, label: "Referência", href: "/referral", grad: "from-fuchsia-500 to-pink-500" },
    ],
  },
  {
    title: "ℹ️ Mais",
    items: [
      { icon: BookOpen, label: "Como Funciona", href: "/como-funciona", grad: "from-slate-500 to-slate-600" },
      { icon: HelpCircle, label: "FAQ", href: "/faq", grad: "from-zinc-500 to-zinc-600" },
      { icon: Star, label: "Pontos", href: "/my-points", grad: "from-amber-500 to-orange-500" },
    ],
  },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [contestsOpen, setContestsOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;

  const tabs = [
    { icon: Home, label: "Início", href: "/" },
    { icon: Search, label: "Explorar", href: "/marketplace" },
    null, // FAB slot
    { icon: Trophy, label: "Concursos", href: "#contests" },
    { icon: User, label: "Perfil", href: user ? "/dashboard" : "/login" },
  ];

  const goOrAuth = (href: string, requiresAuth = false) => {
    setMoreOpen(false);
    if (requiresAuth && !user) navigate("/login");
    else navigate(href);
  };

  return (
    <>
      {/* Bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
        <div className="relative">
          {/* Curved background with notch for FAB */}
          <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" />

          <div className="relative grid grid-cols-5 items-end px-1 pb-1 pt-1">
            {tabs.map((tab, idx) => {
              if (idx === 2) {
                // FAB Central estilo Meituan
                return (
                  <div key="fab" className="flex justify-center -mt-7">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMoreOpen(true)}
                      aria-label="Menu rápido"
                      className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary to-accent shadow-lg shadow-primary/40 flex items-center justify-center ring-4 ring-background"
                    >
                      <motion.div
                        animate={{ rotate: moreOpen ? 45 : 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
                      </motion.div>
                      {/* Pulse ring */}
                      <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-40" />
                    </motion.button>
                  </div>
                );
              }

              if (!tab) return null;

              // Concursos -> abre sheet específico
              if (tab.href === "#contests") {
                return (
                  <button
                    key={tab.label}
                    onClick={() => setContestsOpen(true)}
                    className="relative flex flex-col items-center gap-1 py-2 min-h-[56px]"
                  >
                    <tab.icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-muted-foreground">{tab.label}</span>
                  </button>
                );
              }

              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.label}
                  to={tab.href}
                  className="relative flex flex-col items-center gap-1 py-2 min-h-[56px]"
                >
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <tab.icon className={`h-6 w-6 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mega-menu Bottom Sheet (FAB) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto p-0 rounded-t-3xl border-t-2 border-primary/20">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 pt-4 pb-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Acesso rápido
              </SheetTitle>
              {user && (
                <button
                  onClick={() => goOrAuth("/my-points")}
                  className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent"
                >
                  <Star className="h-3 w-3 fill-accent" /> Pontos
                </button>
              )}
            </div>
          </div>

          <div className="px-4 py-4 space-y-5 pb-32">
            {/* Quick CTAs */}
            {!user ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => goOrAuth("/login")}
                  className="rounded-xl border border-border bg-secondary/50 py-2.5 text-sm font-semibold"
                >
                  Entrar
                </button>
                <button
                  onClick={() => goOrAuth("/register")}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Criar conta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: User, label: "Painel", href: "/dashboard" },
                  { icon: Bell, label: "Alertas", href: "/dashboard/notifications" },
                  { icon: Settings, label: "Conta", href: "/dashboard/settings" },
                  ...(role === "admin" ? [{ icon: ShieldCheck, label: "Admin", href: "/admin" }] : [{ icon: LogOut, label: "Sair", href: "__logout" }]),
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={() => {
                      if (q.href === "__logout") { signOut(); setMoreOpen(false); }
                      else goOrAuth(q.href);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl bg-secondary/50 py-2.5"
                  >
                    <q.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-medium">{q.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action groups */}
            {ACTION_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  {group.title}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {group.items.map((item) => (
                    <motion.button
                      key={item.label}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => goOrAuth(item.href)}
                      className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-card border border-border/60 p-2.5 hover:border-primary/40 active:bg-secondary/40 transition-colors"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.grad} shadow-md`}>
                        <item.icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                      </div>
                      <span className="text-[10.5px] font-semibold leading-tight text-center line-clamp-2 px-0.5">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase text-accent-foreground shadow">
                          {item.badge}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Concursos sheet */}
      <Sheet open={contestsOpen} onOpenChange={setContestsOpen}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto p-0 rounded-t-3xl">
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 pt-4 pb-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
            <SheetTitle className="text-left">🏆 Tipos de Concursos</SheetTitle>
          </div>
          <div onClick={() => setContestsOpen(false)}>
            <ContestTypesShowcase />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomTabBar;
