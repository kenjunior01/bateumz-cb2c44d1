import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, Ticket, Users, DollarSign, Trophy, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMZN } from "@/lib/currency";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "purchase" | "payment" | "winner" | "approval";
  title: string;
  description: string;
  time: string;
  read: boolean;
  raffleSlug?: string;
}

export default function DashboardNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      // Build notifications from recent participants on user's raffles
      const { data: raffles } = await supabase
        .from("raffles")
        .select("id, title, slug, status")
        .eq("business_user_id", user.id);

      if (!raffles || raffles.length === 0) { setLoading(false); return; }

      const raffleIds = raffles.map(r => r.id);
      const raffleMap = new Map(raffles.map(r => [r.id, r]));

      const { data: participants } = await supabase
        .from("participants")
        .select("id, ticket_number, payment_status, payment_method, created_at, raffle_id, status")
        .in("raffle_id", raffleIds)
        .order("created_at", { ascending: false })
        .limit(30);

      const notifs: Notification[] = [];

      participants?.forEach(p => {
        const raffle = raffleMap.get(p.raffle_id);
        if (!raffle) return;

        if (p.status === "winner") {
          notifs.push({
            id: `winner-${p.id}`,
            type: "winner",
            title: `🏆 Vencedor escolhido!`,
            description: `Bilhete #${p.ticket_number} venceu o sorteio "${raffle.title}"`,
            time: p.created_at,
            read: false,
            raffleSlug: raffle.slug || raffle.id,
          });
        } else if (p.payment_status === "pending") {
          notifs.push({
            id: `payment-${p.id}`,
            type: "payment",
            title: "💳 Pagamento pendente",
            description: `Bilhete #${p.ticket_number} em "${raffle.title}" aguarda confirmação`,
            time: p.created_at,
            read: false,
            raffleSlug: raffle.slug || raffle.id,
          });
        } else {
          notifs.push({
            id: `purchase-${p.id}`,
            type: "purchase",
            title: "🎫 Nova compra de bilhete",
            description: `Bilhete #${p.ticket_number} comprado para "${raffle.title}"`,
            time: p.created_at,
            read: true,
            raffleSlug: raffle.slug || raffle.id,
          });
        }
      });

      // Add approval notifications
      raffles.filter(r => r.status === "active").forEach(r => {
        notifs.push({
          id: `approval-${r.id}`,
          type: "approval",
          title: "✅ Sorteio aprovado",
          description: `O sorteio "${r.title}" foi aprovado e está ativo`,
          time: new Date().toISOString(),
          read: true,
          raffleSlug: r.slug || r.id,
        });
      });

      setNotifications(notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const iconConfig = {
    purchase: { icon: Ticket, color: "text-primary bg-primary/10" },
    payment: { icon: DollarSign, color: "text-accent bg-accent/10" },
    winner: { icon: Trophy, color: "text-yellow-500 bg-yellow-500/10" },
    approval: { icon: CheckCircle2, color: "text-primary bg-primary/10" },
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Fique a par de todas as atividades dos seus sorteios
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{unreadCount} notificação(ões) não lida(s)</p>
                <p className="text-xs text-muted-foreground">Clique numa notificação para ver detalhes</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma notificação por agora</p>
              <p className="text-xs text-muted-foreground mt-1">As notificações aparecerão quando houver atividade nos seus sorteios</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <AnimatePresence>
                {notifications.map((n, i) => {
                  const config = iconConfig[n.type];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => n.raffleSlug && navigate(`/raffle/${n.raffleSlug}`)}
                      className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-secondary/30 ${
                        !n.read ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{timeAgo(n.time)}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
