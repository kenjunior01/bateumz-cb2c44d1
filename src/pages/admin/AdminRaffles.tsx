import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Search, Eye, Trash2, CheckCircle2, Clock, XCircle, Trophy, ExternalLink, ShieldCheck, AlertTriangle, DollarSign, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary bg-primary/10", icon: CheckCircle2 },
  draft: { label: "Rascunho", color: "text-muted-foreground bg-muted/40", icon: Clock },
  pending_payment: { label: "Aguarda Pagamento", color: "text-yellow-500 bg-yellow-500/10", icon: DollarSign },
  pending_activation: { label: "Aguarda Aprovação", color: "text-orange-500 bg-orange-500/10", icon: AlertTriangle },
  completed: { label: "Concluído", color: "text-muted-foreground bg-muted/40", icon: Trophy },
  cancelled: { label: "Cancelado", color: "text-destructive bg-destructive/10", icon: XCircle },
  rejected: { label: "Rejeitado", color: "text-destructive bg-destructive/10", icon: Ban },
};

export default function AdminRaffles() {
  const [raffles, setRaffles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

  const fetchRaffles = async () => {
    const { data } = await supabase.from("raffles").select("*").order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }
    
    // Fetch business profiles for display
    const bizIds = [...new Set(data.map((r) => r.business_user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, is_verified").in("user_id", bizIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    
    setRaffles(data.map((r) => ({ ...r, _profile: profileMap.get(r.business_user_id) || null })));
    setLoading(false);
  };

  useEffect(() => { fetchRaffles(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("participants").delete().eq("raffle_id", id);
    const { error } = await supabase.from("raffles").delete().eq("id", id);
    if (!error) {
      setRaffles((r) => r.filter((x) => x.id !== id));
      toast.success("Sorteio eliminado");
    }
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("raffles").update({ status: "active", activation_fee_paid: true } as any).eq("id", id);
    if (!error) {
      toast.success("Sorteio aprovado e ativado!");
      fetchRaffles();
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Indique o motivo da rejeição"); return; }
    const { error } = await supabase.from("raffles").update({ status: "rejected", rejection_reason: rejectReason } as any).eq("id", rejectModal.id);
    if (!error) {
      toast.success("Sorteio rejeitado");
      setRejectModal({ open: false, id: "" });
      setRejectReason("");
      fetchRaffles();
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("raffles").update({ status } as any).eq("id", id);
    toast.success(`Status alterado para ${statusConfig[status]?.label || status}`);
    fetchRaffles();
  };

  const filtered = raffles.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: raffles.length,
    active: raffles.filter((r) => r.status === "active").length,
    pending: raffles.filter((r) => r.status === "pending_activation" || r.status === "pending_payment").length,
    revenue: raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0),
    fees: raffles.filter((r) => r.activation_fee_paid).reduce((s, r) => {
      const total = Number(r.ticket_price) * r.total_tickets;
      return s + total * (Number(r.activation_fee_percentage || 5) / 100);
    }, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Sorteios</h1>
        <p className="text-sm text-muted-foreground">Aprovação, ativação e supervisão de todos os sorteios</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        {[
          { label: "Total", value: stats.total, icon: Ticket },
          { label: "Ativos", value: stats.active, icon: CheckCircle2 },
          { label: "Pendentes", value: stats.pending, icon: AlertTriangle },
          { label: "Receita Total", value: formatMZN(stats.revenue), icon: DollarSign },
          { label: "Taxas Cobradas", value: formatMZN(stats.fees), icon: ShieldCheck },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar sorteios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending_activation", "active", "draft", "completed", "rejected"].map((s) => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s === "all" ? "Todos" : statusConfig[s]?.label || s}
              {s === "pending_activation" && stats.pending > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white font-bold">{stats.pending}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorteio</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const config = statusConfig[r.status] || statusConfig.draft;
                  const pct = r.total_tickets > 0 ? Math.round((r.sold_tickets / r.total_tickets) * 100) : 0;
                  const feeAmount = Number(r.ticket_price) * r.total_tickets * (Number(r.activation_fee_percentage || 5) / 100);
                  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                  return (
                    <TableRow key={r.id} className={r.status === "pending_activation" ? "bg-orange-500/5" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.prize_title} · {formatMZN(Number(r.ticket_price))}/bilhete</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-foreground">{profile?.display_name || "—"}</span>
                          {profile?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <config.icon className="h-3 w-3 mr-1" />{config.label}
                        </Badge>
                        {r.rejection_reason && r.status === "rejected" && (
                          <p className="text-[10px] text-destructive mt-1 max-w-[150px] truncate" title={r.rejection_reason}>
                            {r.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{formatMZN(feeAmount)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({r.activation_fee_percentage || 5}%)</span>
                        </div>
                        <Badge variant={r.activation_fee_paid ? "default" : "secondary"} className="text-[9px] mt-1">
                          {r.activation_fee_paid ? "Pago" : "Não pago"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{r.sold_tickets}/{r.total_tickets}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Link to={`/raffle/${r.slug || r.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          {(r.status === "pending_activation" || r.status === "draft") && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id)} title="Aprovar e ativar">
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setRejectModal({ open: true, id: r.id })} title="Rejeitar">
                                <Ban className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                          {r.status === "active" && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "cancelled")}>
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum sorteio encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => { if (!o) { setRejectModal({ open: false, id: "" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Sorteio</DialogTitle>
            <DialogDescription>Indique o motivo da rejeição. A empresa será notificada.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: Imagem do prémio não corresponde à descrição..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, id: "" })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Rejeitar Sorteio</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
