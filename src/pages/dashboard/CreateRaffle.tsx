import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Calendar, Ticket, Info } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function CreateRaffle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prize_title: "",
    prize_value: "",
    ticket_price: "",
    total_tickets: "",
    start_date: "",
    end_date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title || !form.prize_title || !form.ticket_price || !form.total_tickets) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("raffles").insert({
      business_user_id: user.id,
      title: form.title,
      description: form.description || null,
      prize_title: form.prize_title,
      prize_value: Number(form.prize_value) || 0,
      ticket_price: Number(form.ticket_price) || 0,
      total_tickets: Number(form.total_tickets) || 100,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: "draft",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar sorteio: " + error.message);
      return;
    }
    toast.success("Sorteio criado com sucesso!");
    navigate("/dashboard/raffles");
  };

  const estimatedRevenue = (Number(form.ticket_price) || 0) * (Number(form.total_tickets) || 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/dashboard/raffles")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Criar Novo Sorteio</h1>
          <p className="text-sm text-muted-foreground">Configure os detalhes do seu sorteio</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass border-glass-border">
          <CardHeader><CardTitle className="text-lg">Informações do Prémio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nome do Sorteio *</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Ex: Porsche 911 GT3 2025"
                className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Descrição</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Descreva o prémio e regras..."
                className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Título do Prémio *</label>
                <input name="prize_title" value={form.prize_title} onChange={handleChange} placeholder="Ex: Porsche 911 GT3"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Valor do Prémio (MZN)</label>
                <input name="prize_value" type="number" value={form.prize_value} onChange={handleChange} placeholder="15.000.000"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Imagem do Prémio</label>
              <div className="flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/40">
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 mb-2" />
                  <p className="text-xs">Arraste ou clique para enviar</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG até 5MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-glass-border">
          <CardHeader><CardTitle className="text-lg">Configuração de Bilhetes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Ticket className="h-3.5 w-3.5" /> Preço por Bilhete (MZN) *
                </label>
                <input name="ticket_price" type="number" value={form.ticket_price} onChange={handleChange} placeholder="500"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Ticket className="h-3.5 w-3.5" /> Total de Bilhetes *
                </label>
                <input name="total_tickets" type="number" value={form.total_tickets} onChange={handleChange} placeholder="1000"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Data de Início
                </label>
                <input type="datetime-local" name="start_date" value={form.start_date} onChange={handleChange}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Data de Encerramento
                </label>
                <input type="datetime-local" name="end_date" value={form.end_date} onChange={handleChange}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>Receita estimada: <span className="font-semibold text-foreground">{formatMZN(estimatedRevenue)}</span></p>
                <p className="mt-1">A plataforma cobra uma comissão de 5% sobre o valor total arrecadado.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => navigate("/dashboard/raffles")}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
          Cancelar
        </button>
        <Button onClick={handleSubmit} disabled={saving} className="gap-2 glow-primary">
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Ticket className="h-4 w-4" />}
          Criar Sorteio
        </Button>
      </div>
    </div>
  );
}
