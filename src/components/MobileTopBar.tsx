import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import bateuLogo from "@/assets/bateu-logo.png";

const MobileTopBar = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
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
      .channel("topbar-notif")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          load();
          if (payload.eventType === "INSERT" && payload.new) {
            const n = payload.new;
            const fn = n.type === "success" ? toast.success : n.type === "error" ? toast.error : toast;
            (fn as any)(n.title || "Nova notificação", { description: n.message });
          }
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link to="/" className="flex items-center gap-1.5">
          <img src={bateuLogo} alt="Bateu" className="h-8 w-8" />
          <span className="font-display text-lg font-bold">Bateu</span>
        </Link>

        <div className="flex items-center gap-1">
          {user && (
            <button
              onClick={() => navigate("/my-points")}
              className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1.5 text-xs font-bold text-accent"
              aria-label={t("menu.points")}
            >
              <Star className="h-3.5 w-3.5 fill-accent" /> {t("menu.points")}
            </button>
          )}
          {/* LanguageSwitcher disabled: EN-only platform */}
          <ThemeToggle />
          <button
            onClick={() => navigate(user ? "/dashboard/notifications" : "/login")}
            className="relative p-2 text-foreground"
            aria-label={t("nav.notifications")}
          >
            <Bell className="h-5 w-5" />
            {user && unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
