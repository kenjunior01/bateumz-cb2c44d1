import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (mounted) setUnread(count || 0);
    };
    load();
    const ch = supabase
      .channel("dash-notif-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 glass-strong">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Painel Empresarial
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard/notifications")}
                className="relative text-muted-foreground hover:text-foreground"
                aria-label={`${unread} notificações não lidas`}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-6 pb-24 lg:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
