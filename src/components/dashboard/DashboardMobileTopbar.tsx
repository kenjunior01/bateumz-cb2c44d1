import { Bell, Search, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import bateuLogo from "@/assets/bateu-logo.png";
import { formatDistanceToNowStrict } from "date-fns";
import { pt } from "date-fns/locale";
import { motion } from "framer-motion";

interface Props { onOpenDrawer: () => void; variant?: "dashboard" | "admin"; }

export function DashboardMobileTopbar({ onOpenDrawer, variant = "dashboard" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { data, count } = await (supabase as any)
        .from("notifications")
        .select("id, title, message, created_at, read, type", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!mounted) return;
      setRecent(data || []);
      const { count: c } = await (supabase as any)
        .from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false);
      setUnread(c || 0);
    };
    load();
    const ch = supabase
      .channel("dash-topbar-notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const notifBase = variant === "admin" ? "/admin" : "/dashboard/notifications";

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-2xl border-b border-border/40 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 px-3 h-[52px]">
        <a href="/" className="shrink-0">
          <img src={bateuLogo} alt="Bateu" className="h-7 w-7 rounded-lg" />
        </a>
        <button onClick={() => navigate(variant === "admin" ? "/admin" : "/dashboard")} className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary/50 border border-border/30 text-left text-xs text-muted-foreground hover:bg-secondary/70 transition-colors">
          <Search className="h-3.5 w-3.5 opacity-60" /> Pesquisar…
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary/70 transition-colors" aria-label={`${unread} notificações`}>
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-br from-primary to-accent text-[9px] font-bold text-primary-foreground flex items-center justify-center shadow-[0_2px_8px_hsl(var(--primary)/0.3)]"
                >
                  {unread > 99 ? "99+" : unread}
                </motion.span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 max-h-[60vh] overflow-y-auto">
            <div className="sticky top-0 px-3 py-2.5 border-b bg-card/95 backdrop-blur flex items-center justify-between">
              <p className="text-xs font-bold">Notificações</p>
              <button onClick={() => navigate(notifBase)} className="text-[11px] text-primary font-semibold">Ver todas</button>
            </div>
            <ul className="divide-y divide-border">
              {recent.length === 0 && <li className="p-4 text-xs text-muted-foreground text-center">Nada por aqui ainda.</li>}
              {recent.map((n) => (
                <li key={n.id} className={`px-3 py-2.5 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                  <p className="text-[12.5px] font-semibold leading-tight">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNowStrict(new Date(n.created_at), { locale: pt, addSuffix: true })}</p>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenDrawer}
          className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary/70 transition-colors"
        >
          <Menu className="h-[18px] w-[18px] text-muted-foreground" />
        </motion.button>
      </div>
    </header>
  );
}
