import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useMemo, useState } from "react";
import { Search, BarChart3, Zap, Gift, Palette, Trophy, Wallet, Radio, Sparkles, Bell, Settings, LogOut, Shield, Home, ScrollText, Clock, CreditCard, DollarSign, User, Users, Ticket, Gamepad2, Crown, CircleDot, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; variant?: "dashboard" | "admin"; }

const DASHBOARD_LINKS = [
  { icon: Gamepad2, label: "Centro de Jogos", to: "/dashboard/games-hub" },
  { icon: BarChart3, label: "Analíticas", to: "/dashboard/analytics" },
  { icon: Zap, label: "Analíticas Sociais", to: "/dashboard/social-analytics" },
  { icon: Gift, label: "Prémios", to: "/dashboard/prizes" },
  { icon: Palette, label: "White Label", to: "/dashboard/white-label" },
  { icon: Trophy, label: "Concursos", to: "/dashboard/contests" },
  { icon: Wallet, label: "Prestações", to: "/dashboard/prestacoes" },
  { icon: Radio, label: "Jogos de Live", to: "/dashboard/live-games" },
  { icon: Crown, label: "Milionário", to: "/dashboard/millionaire-manager" },
  { icon: CircleDot, label: "Roleta de Prémios", to: "/dashboard/spin-wheel-manager" },
  { icon: Trophy, label: "Histórico de Lives", to: "/dashboard/live-history" },
  { icon: Swords, label: "Esports", to: "/dashboard/esports" },
  { icon: Swords, label: "Esports Avançado", to: "/dashboard/esports-advanced" },
  { icon: Sparkles, label: "Embaixadores", to: "/dashboard/ambassadors" },
  { icon: Radio, label: "Lives Agendadas", to: "/dashboard/scheduled-lives" },
  { icon: Bell, label: "Notificações", to: "/dashboard/notifications" },
  { icon: Settings, label: "Configurações", to: "/dashboard/settings" },
];

const ADMIN_LINKS = [
  { icon: Home, label: "Visão Geral", to: "/admin" },
  { icon: Users, label: "Utilizadores", to: "/admin/users" },
  { icon: Ticket, label: "Sorteios", to: "/admin/raffles" },
  { icon: Trophy, label: "Concursos", to: "/admin/contests" },
  { icon: CreditCard, label: "Pagamentos", to: "/admin/payments" },
  { icon: DollarSign, label: "Receitas", to: "/admin/revenue" },
  { icon: ScrollText, label: "Auditoria", to: "/admin/audit" },
  { icon: Clock, label: "Tarefas Agendadas", to: "/admin/cron" },
  { icon: Settings, label: "Configurações", to: "/admin/settings" },
];

export function DashboardMoreDrawer({ open, onOpenChange, variant = "dashboard" }: Props) {
  const navigate = useNavigate();
  const { profile, signOut, user, role } = useAuth();
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ kind: "raffle" | "live"; id: string; title: string; href: string }[]>([]);

  const links = variant === "admin" ? ADMIN_LINKS : DASHBOARD_LINKS;
  const filteredLinks = useMemo(() =>
    links.filter((l) => l.label.toLowerCase().includes(q.toLowerCase())), [links, q]);

  useEffect(() => {
    if (!user || !q || q.length < 2 || variant === "admin") { setSearchResults([]); return; }
    let active = true;
    (async () => {
      const [r, l] = await Promise.all([
        supabase.from("raffles").select("id, title, slug").eq("business_user_id", user.id).ilike("title", `%${q}%`).limit(5),
        supabase.from("scheduled_lives").select("id, title, slug").eq("business_user_id", user.id).ilike("title", `%${q}%`).limit(5),
      ]);
      if (!active) return;
      setSearchResults([
        ...(r.data || []).map((x: any) => ({ kind: "raffle" as const, id: x.id, title: x.title, href: `/dashboard/raffles/${x.id}/edit` })),
        ...(l.data || []).map((x: any) => ({ kind: "live" as const, id: x.id, title: x.title, href: `/dashboard/live-studio/${x.id}` })),
      ]);
    })();
    return () => { active = false; };
  }, [q, user, variant]);

  const go = (to: string) => { onOpenChange(false); navigate(to); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88%] sm:w-[420px] p-0 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-4 pt-5 pb-3 space-y-3">
          <SheetTitle className="text-left">{variant === "admin" ? "Menu Admin" : "Menu Empresa"}</SheetTitle>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              {(profile?.display_name || profile?.company_name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.company_name || profile?.display_name || "Utilizador"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{role === "admin" ? "Administrador" : "Plano Business"}</p>
            </div>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar secções, sorteios, lives…"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-background border border-border text-sm" />
          </div>
        </div>

        <div className="px-3 py-3 space-y-4 pb-12">
          {searchResults.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-1.5">Resultados</p>
              <ul className="space-y-1">
                {searchResults.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <button onClick={() => go(r.href)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary text-left">
                      {r.kind === "raffle" ? <Ticket className="h-4 w-4 text-primary" /> : <Radio className="h-4 w-4 text-red-500" />}
                      <span className="text-sm flex-1 truncate">{r.title}</span>
                      <span className="text-[10px] text-muted-foreground">{r.kind === "raffle" ? "Sorteio" : "Live"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-1.5">Secções</p>
            <ul className="space-y-1">
              {filteredLinks.map((l) => (
                <li key={l.to}>
                  <button onClick={() => go(l.to)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-left">
                    <l.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{l.label}</span>
                  </button>
                </li>
              ))}
              {filteredLinks.length === 0 && <li className="text-xs text-muted-foreground text-center py-4">Nada encontrado</li>}
            </ul>
          </div>

          <div className="pt-2 border-t border-border space-y-1">
            <button onClick={() => go("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-left">
              <Home className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Ver site público</span>
            </button>
            {role === "admin" && variant !== "admin" && (
              <button onClick={() => go("/admin")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-left">
                <Shield className="h-4 w-4 text-destructive" /><span className="text-sm">Painel Admin</span>
              </button>
            )}
            {variant === "admin" && (
              <button onClick={() => go("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-left">
                <User className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Voltar ao Dashboard</span>
              </button>
            )}
            <button onClick={async () => { await signOut(); onOpenChange(false); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-left text-destructive">
              <LogOut className="h-4 w-4" /><span className="text-sm">Terminar sessão</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
