import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount, subscribeNotifications, type LiveNotification } from "@/lib/livePlatform";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const ICONS: Record<string, string> = {
  live_started: "🔴",
  new_follower: "❤️",
  tip_received: "💰",
  achievement_unlocked: "🏆",
  live_reminder: "⏰",
  challenge_received: "⚔️",
  level_up: "⬆️",
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<LiveNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    if (!user) return;
    const [n, u] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
    setNotifs(n as LiveNotification[]);
    setUnread(u);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (!user) return () => {};
    const unsub = subscribeNotifications(() => load());
    return unsub;
  }, [user]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setUnread((prev) => Math.max(0, prev - 1));
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full"
        onClick={() => { setOpen(true); if (unread > 0) handleMarkAll(); }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notificações
              {unread > 0 && <Badge variant="secondary" className="ml-auto">{unread} novas</Badge>}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-1 pr-2">
              <AnimatePresence initial={false}>
                {notifs.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      n.is_read ? "" : "bg-primary/5"
                    }`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{ICONS[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.is_read ? "" : "font-bold"}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                        {new Date(n.created_at).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </motion.div>
                ))}
              </AnimatePresence>
              {notifs.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">Sem notificações</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationBell;
