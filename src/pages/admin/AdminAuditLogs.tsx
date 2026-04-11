import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollText, Search, Filter, Clock, User, Ticket, CreditCard, Settings, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_name?: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof Ticket }> = {
  payment_approved: { label: "Pagamento Aprovado", color: "bg-green-500/10 text-green-600", icon: CreditCard },
  payment_rejected: { label: "Pagamento Rejeitado", color: "bg-red-500/10 text-red-600", icon: CreditCard },
  raffle_created: { label: "Sorteio Criado", color: "bg-blue-500/10 text-blue-600", icon: Ticket },
  raffle_approved: { label: "Sorteio Aprovado", color: "bg-green-500/10 text-green-600", icon: Ticket },
  raffle_rejected: { label: "Sorteio Rejeitado", color: "bg-red-500/10 text-red-600", icon: Ticket },
  raffle_cancelled: { label: "Sorteio Cancelado", color: "bg-orange-500/10 text-orange-600", icon: Ticket },
  raffle_deleted: { label: "Sorteio Eliminado", color: "bg-red-500/10 text-red-600", icon: Ticket },
  raffle_updated: { label: "Sorteio Atualizado", color: "bg-blue-500/10 text-blue-600", icon: Ticket },
  raffle_drawn: { label: "Sorteio Realizado", color: "bg-purple-500/10 text-purple-600", icon: Ticket },
  settings_updated: { label: "Configurações", color: "bg-gray-500/10 text-gray-600", icon: Settings },
  user_verified: { label: "Utilizador Verificado", color: "bg-green-500/10 text-green-600", icon: User },
  social_entry_approved: { label: "Entrada Social Aprovada", color: "bg-green-500/10 text-green-600", icon: Shield },
  social_entry_rejected: { label: "Entrada Social Rejeitada", color: "bg-red-500/10 text-red-600", icon: Shield },
  maintenance_toggled: { label: "Manutenção", color: "bg-yellow-500/10 text-yellow-600", icon: Settings },
  countdown_toggled: { label: "Temporizador", color: "bg-indigo-500/10 text-indigo-600", icon: Clock },
};

const ENTITY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "raffle", label: "Sorteios" },
  { value: "payment", label: "Pagamentos" },
  { value: "settings", label: "Configurações" },
  { value: "user", label: "Utilizadores" },
  { value: "social_entry", label: "Social" },
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((l: any) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);

      setLogs(data.map((l: any) => ({
        ...l,
        details: (l.details as Record<string, unknown>) || {},
        user_name: profileMap.get(l.user_id) || "Sistema",
      })));
    } else {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const cfg = ACTION_CONFIG[l.action];
        return (
          (cfg?.label || l.action).toLowerCase().includes(s) ||
          (l.user_name || "").toLowerCase().includes(s) ||
          JSON.stringify(l.details).toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [logs, search, entityFilter]);

  const stats = useMemo(() => ({
    total: logs.length,
    today: logs.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    payments: logs.filter((l) => l.entity_type === "payment").length,
    raffles: logs.filter((l) => l.entity_type === "raffle").length,
  }), [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" /> Logs de Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registo de todas as ações administrativas na plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: ScrollText, color: "text-primary" },
          { label: "Hoje", value: stats.today, icon: Clock, color: "text-green-500" },
          { label: "Pagamentos", value: stats.payments, icon: CreditCard, color: "text-blue-500" },
          { label: "Sorteios", value: stats.raffles, icon: Ticket, color: "text-purple-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nos logs..." className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {ENTITY_FILTERS.map((f) => (
            <Button key={f.value} variant={entityFilter === f.value ? "default" : "outline"} size="sm"
              onClick={() => setEntityFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> {filtered.length} registos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filtered.map((log, i) => {
                const cfg = ACTION_CONFIG[log.action] || { label: log.action, color: "bg-muted text-muted-foreground", icon: ScrollText };
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-[10px] ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          por <span className="font-medium text-foreground">{log.user_name}</span>
                        </span>
                      </div>
                      {Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {Object.entries(log.details)
                            .filter(([, v]) => v !== null && v !== undefined)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM HH:mm", { locale: pt })}
                    </time>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
