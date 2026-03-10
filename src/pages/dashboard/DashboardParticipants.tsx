import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  Mail,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Send,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Participant {
  id: string;
  name: string;
  email: string;
  raffle: string;
  ticketNumber: number;
  status: "active" | "winner" | "cancelled";
  paymentStatus: "paid" | "pending" | "refunded";
  date: string;
}

const mockParticipants: Participant[] = [
  { id: "1", name: "João Mendes", email: "joao@email.com", raffle: "Porsche 911 GT3", ticketNumber: 42, status: "active", paymentStatus: "paid", date: "10 Mar 2026" },
  { id: "2", name: "Maria Santos", email: "maria@email.com", raffle: "Porsche 911 GT3", ticketNumber: 156, status: "active", paymentStatus: "paid", date: "09 Mar 2026" },
  { id: "3", name: "Pedro Lima", email: "pedro@email.com", raffle: "iPhone 16 Pro Max", ticketNumber: 88, status: "active", paymentStatus: "pending", date: "09 Mar 2026" },
  { id: "4", name: "Ana Costa", email: "ana@email.com", raffle: "iPhone 16 Pro Max", ticketNumber: 201, status: "winner", paymentStatus: "paid", date: "08 Mar 2026" },
  { id: "5", name: "Carlos Ferreira", email: "carlos@email.com", raffle: "Setup Gaming RTX 5090", ticketNumber: 567, status: "active", paymentStatus: "paid", date: "08 Mar 2026" },
  { id: "6", name: "Sofia Almeida", email: "sofia@email.com", raffle: "Porsche 911 GT3", ticketNumber: 333, status: "cancelled", paymentStatus: "refunded", date: "07 Mar 2026" },
  { id: "7", name: "Ricardo Nunes", email: "ricardo@email.com", raffle: "Setup Gaming RTX 5090", ticketNumber: 712, status: "active", paymentStatus: "paid", date: "07 Mar 2026" },
  { id: "8", name: "Beatriz Oliveira", email: "beatriz@email.com", raffle: "Villa em Algarve", ticketNumber: 45, status: "active", paymentStatus: "pending", date: "06 Mar 2026" },
  { id: "9", name: "Miguel Rocha", email: "miguel@email.com", raffle: "iPhone 16 Pro Max", ticketNumber: 99, status: "active", paymentStatus: "paid", date: "06 Mar 2026" },
  { id: "10", name: "Laura Martins", email: "laura@email.com", raffle: "Porsche 911 GT3", ticketNumber: 777, status: "active", paymentStatus: "paid", date: "05 Mar 2026" },
];

const statusConfig = {
  active: { label: "Ativo", color: "text-primary", bg: "bg-primary/10", icon: CheckCircle2 },
  winner: { label: "Vencedor", color: "text-accent", bg: "bg-accent/10", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const paymentConfig = {
  paid: { label: "Pago", color: "text-primary", bg: "bg-primary/10" },
  pending: { label: "Pendente", color: "text-accent", bg: "bg-accent/10" },
  refunded: { label: "Reembolsado", color: "text-muted-foreground", bg: "bg-muted/40" },
};

type StatusFilter = "all" | "active" | "winner" | "cancelled";

export default function DashboardParticipants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");

  const filtered = useMemo(() => {
    return mockParticipants.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.raffle.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, statusFilter]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const exportCSV = () => {
    const rows = filtered.map((p) =>
      [p.name, p.email, p.raffle, p.ticketNumber, p.status, p.paymentStatus, p.date].join(",")
    );
    const csv = ["Nome,Email,Sorteio,Bilhete,Status,Pagamento,Data", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participantes-sortex.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => ({
    total: mockParticipants.length,
    active: mockParticipants.filter((p) => p.status === "active").length,
    paid: mockParticipants.filter((p) => p.paymentStatus === "paid").length,
    winners: mockParticipants.filter((p) => p.status === "winner").length,
  }), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Participantes</h1>
          <p className="text-sm text-muted-foreground">Gerir participantes de todos os seus sorteios</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowMessageModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              <Mail className="h-4 w-4" />
              Enviar Mensagem ({selectedIds.size})
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </motion.button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Ativos", value: stats.active, icon: CheckCircle2 },
          { label: "Pagos", value: stats.paid, icon: CheckCircle2 },
          { label: "Vencedores", value: stats.winners, icon: CheckCircle2 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass border-glass-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "active", "winner", "cancelled"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Todos" : statusConfig[f].label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar participante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-glass-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Participante</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Sorteio</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Bilhete</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Pagamento</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const sc = statusConfig[p.status];
                const pc = paymentConfig[p.paymentStatus];
                return (
                  <TableRow key={p.id} className="border-border">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-foreground">{p.raffle}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="font-mono text-sm text-foreground">#{p.ticketNumber}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.color} ${sc.bg}`}>
                        <sc.icon className="h-2.5 w-2.5" />
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${pc.color} ${pc.bg}`}>
                        {pc.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{p.date}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">Nenhum participante encontrado</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowMessageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Enviar Mensagem
                </h3>
                <button onClick={() => setShowMessageModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enviar para {selectedIds.size} participante{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
              </p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                placeholder="Escreva a sua mensagem..."
                className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageText("");
                    setSelectedIds(new Set());
                  }}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
