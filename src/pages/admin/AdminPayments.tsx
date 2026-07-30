import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Search, CheckCircle2, Clock, XCircle, Eye, Smartphone, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const sb: any = supabase;

interface Payment {
  id: string;
  ticket_number: number;
  payment_status: string;
  payment_method: string | null;
  receipt_url: string | null;
  created_at: string;
  user_id: string;
  raffle_id: string;
  raffle_title?: string;
  ticket_price?: number;
  user_name?: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");
  const [loading, setLoading] = useState(true);
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  const fetchPayments = async () => {
    const { data } = await sb
      .from("participants")
      .select("*, raffles(title, ticket_price)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      // Fetch profile names
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);

      setPayments(
        data.map((p: any) => ({
          ...p,
          raffle_title: p.raffles?.title,
          ticket_price: Number(p.raffles?.ticket_price || 0),
          user_name: nameMap.get(p.user_id) || "Sem nome",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const handleApprove = async (id: string) => {
    const { error } = await sb
      .from("participants")
      .update({ payment_status: "completed" })
      .eq("id", id);
    if (!error) {
      await logAudit("payment_approved", "payment", id);
      toast.success("Pagamento aprovado!");
      fetchPayments();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await sb
      .from("participants")
      .update({ payment_status: "rejected" })
      .eq("id", id);
    if (!error) {
      await logAudit("payment_rejected", "payment", id);
      toast.success("Pagamento rejeitado");
      fetchPayments();
    }
  };

  const getReceiptUrl = (path: string) => {
    const { data } = sb.storage.from("payment-receipts").getPublicUrl(path);
    return data.publicUrl;
  };

  const filtered = payments.filter((p) => {
    if (filter !== "all" && p.payment_status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.raffle_title?.toLowerCase().includes(s) ||
        p.user_name?.toLowerCase().includes(s) ||
        p.ticket_number.toString().includes(s)
      );
    }
    return true;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.payment_status === "pending").length,
    completed: payments.filter((p) => p.payment_status === "completed").length,
    revenue: payments
      .filter((p) => p.payment_status === "completed")
      .reduce((s, p) => s + (p.ticket_price || 0), 0),
  };

  const methodIcon = (method: string | null) => {
    if (method === "mpesa") return <Smartphone className="h-3 w-3" />;
    if (method === "emola") return <Wallet className="h-3 w-3" />;
    return <CreditCard className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Pagamentos</h1>
        <p className="text-sm text-muted-foreground">Aprovar e gerir pagamentos de bilhetes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pendentes", value: stats.pending, color: "text-accent" },
          { label: "Aprovados", value: stats.completed, color: "text-primary" },
          { label: "Receita Confirmada", value: formatMZN(stats.revenue), color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-4">
                <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar pagamentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "completed", "rejected"]).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "completed" ? "Aprovados" : "Rejeitados"}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div data-mobile-wrapped className="overflow-x-auto">
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Sorteio</TableHead>
                  <TableHead>Bilhete</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-foreground text-sm">{p.user_name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{p.raffle_title || "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatMZN(p.ticket_price || 0)}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{p.ticket_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {methodIcon(p.payment_method)}
                        {p.payment_method === "mpesa" ? "M-Pesa" : p.payment_method === "emola" ? "e-Mola" : p.payment_method || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.payment_status === "completed"
                            ? "bg-primary/10 text-primary"
                            : p.payment_status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                        }
                      >
                        {p.payment_status === "completed" ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</>
                        ) : p.payment_status === "rejected" ? (
                          <><XCircle className="h-3 w-3 mr-1" />Rejeitado</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" />Pendente</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {p.receipt_url && (
                          <Button variant="ghost" size="sm" onClick={() => setReceiptModal(p.receipt_url)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {p.payment_status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(p.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleReject(p.id)}>
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!receiptModal} onOpenChange={() => setReceiptModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprovativo de Pagamento</DialogTitle>
          </DialogHeader>
          {receiptModal && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={getReceiptUrl(receiptModal)}
                alt="Comprovativo"
                className="w-full h-auto max-h-[500px] object-contain bg-secondary"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
