import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Ticket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

type RaffleStatus = "active" | "pending" | "completed" | "cancelled";

interface Raffle {
  id: string;
  name: string;
  prize: string;
  status: RaffleStatus;
  ticketPrice: string;
  soldTickets: number;
  totalTickets: number;
  revenue: string;
  endDate: string;
  image: string;
}

const mockRaffles: Raffle[] = [
  {
    id: "1",
    name: "Porsche 911 GT3",
    prize: "Porsche 911 GT3 2025",
    status: "active",
    ticketPrice: "R$ 50",
    soldTickets: 780,
    totalTickets: 1000,
    revenue: "R$ 39.000",
    endDate: "15 Abr 2026",
    image: "🏎️",
  },
  {
    id: "2",
    name: "iPhone 16 Pro Max",
    prize: "iPhone 16 Pro Max 1TB",
    status: "active",
    ticketPrice: "R$ 5",
    soldTickets: 456,
    totalTickets: 500,
    revenue: "R$ 22.800",
    endDate: "20 Mar 2026",
    image: "📱",
  },
  {
    id: "3",
    name: "Villa em Algarve",
    prize: "Férias de 7 dias no Algarve",
    status: "pending",
    ticketPrice: "R$ 25",
    soldTickets: 0,
    totalTickets: 2000,
    revenue: "R$ 0",
    endDate: "01 Mai 2026",
    image: "🏖️",
  },
  {
    id: "4",
    name: "Setup Gaming RTX 5090",
    prize: "PC Gaming Completo RTX 5090",
    status: "completed",
    ticketPrice: "R$ 50",
    soldTickets: 800,
    totalTickets: 800,
    revenue: "R$ 40.000",
    endDate: "28 Fev 2026",
    image: "🎮",
  },
  {
    id: "5",
    name: "Rolex Submariner",
    prize: "Rolex Submariner Date 41mm",
    status: "cancelled",
    ticketPrice: "R$ 100",
    soldTickets: 45,
    totalTickets: 500,
    revenue: "R$ 4.500",
    endDate: "—",
    image: "⌚",
  },
];

const statusConfig: Record<
  RaffleStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  active: {
    label: "Ativo",
    color: "text-primary",
    bg: "bg-primary/10",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pendente",
    color: "text-accent",
    bg: "bg-accent/10",
    icon: Clock,
  },
  completed: {
    label: "Concluído",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: XCircle,
  },
};

const filterTabs: { label: string; value: RaffleStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Pendentes", value: "pending" },
  { label: "Concluídos", value: "completed" },
];

export default function DashboardRaffles() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RaffleStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = mockRaffles.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Meus Sorteios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerir e monitorizar todos os seus sorteios
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard/raffles/create")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
        >
          <Plus className="h-4 w-4" />
          Novo Sorteio
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar sorteios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
          />
        </div>
      </div>

      {/* Raffles List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((raffle) => {
            const config = statusConfig[raffle.status];
            const pct = Math.round(
              (raffle.soldTickets / raffle.totalTickets) * 100
            );
            return (
              <motion.div
                key={raffle.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="glass border-glass-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">
                        {raffle.image}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {raffle.name}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color} ${config.bg}`}
                          >
                            <config.icon className="h-2.5 w-2.5" />
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {raffle.ticketPrice}/bilhete · Encerra{" "}
                          {raffle.endDate}
                        </p>
                      </div>

                      <div className="hidden items-center gap-6 md:flex">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-foreground">
                            {raffle.soldTickets}/{raffle.totalTickets}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {raffle.revenue}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Receita
                          </p>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenu(
                              openMenu === raffle.id ? null : raffle.id
                            )
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {openMenu === raffle.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl glass border border-glass-border p-1"
                            >
                              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                <Eye className="h-3.5 w-3.5" /> Ver detalhes
                              </button>
                              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                <Edit className="h-3.5 w-3.5" /> Editar
                              </button>
                              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum sorteio encontrado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
