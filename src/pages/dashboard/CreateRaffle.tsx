import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Calendar, DollarSign, Ticket, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function CreateRaffle() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    prizeValue: "",
    ticketPrice: "",
    totalTickets: "",
    startDate: "",
    endDate: "",
    category: "",
  });

  const categories = [
    "Automóveis",
    "Tecnologia",
    "Viagens",
    "Lifestyle",
    "Gaming",
    "Imóveis",
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard/raffles")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Criar Novo Sorteio
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure os detalhes do seu sorteio
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Informações do Prémio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nome do Sorteio
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Porsche 911 GT3 2025"
                className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Descrição
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Descreva o prémio e regras do sorteio..."
                className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Categoria
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5" /> Valor do Prémio
                </label>
                <input
                  name="prizeValue"
                  value={form.prizeValue}
                  onChange={handleChange}
                  placeholder="R$ 250.000"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Image upload area */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Imagem do Prémio
              </label>
              <div className="flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/40">
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 mb-2" />
                  <p className="text-xs">Arraste ou clique para enviar</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    PNG, JPG até 5MB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Configuração de Bilhetes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Ticket className="h-3.5 w-3.5" /> Preço por Bilhete
                </label>
                <input
                  name="ticketPrice"
                  value={form.ticketPrice}
                  onChange={handleChange}
                  placeholder="R$ 50"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Ticket className="h-3.5 w-3.5" /> Total de Bilhetes
                </label>
                <input
                  name="totalTickets"
                  value={form.totalTickets}
                  onChange={handleChange}
                  placeholder="1000"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Data de Início
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Data de Encerramento
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                A receita estimada será calculada automaticamente com base no preço
                e número total de bilhetes. A plataforma cobra uma comissão de 5%
                sobre o valor total arrecadado.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end gap-3 pb-6">
        <button
          onClick={() => navigate("/dashboard/raffles")}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          Cancelar
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
        >
          Criar Sorteio
        </motion.button>
      </div>
    </div>
  );
}
