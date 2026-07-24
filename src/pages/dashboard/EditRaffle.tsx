import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/provinces";

export default function EditRaffle() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prize_title: "",
    prize_value: "",
    ticket_price: "",
    total_tickets: "",
    end_date: "",
    province: "",
    city: "",
    hide_prize_value: false,
    max_winners: "1",
    max_tickets_per_user: "",
  });

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from("raffles")
      .select("*")
      .eq("id", id)
      .eq("business_user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Sorteio não encontrado");
          navigate("/dashboard/raffles");
          return;
        }
        setForm({
          title: data.title || "",
          description: data.description || "",
          prize_title: data.prize_title || "",
          prize_value: String(data.prize_value || ""),
          ticket_price: String(data.ticket_price || ""),
          total_tickets: String(data.total_tickets || ""),
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : "",
          province: data.province || "",
          city: data.city || "",
          hide_prize_value: data.hide_prize_value || false,
          max_winners: String((data as any).max_winners || 1),
          max_tickets_per_user: (data as any).max_tickets_per_user ? String((data as any).max_tickets_per_user) : "",
        });
        setLoading(false);
      });
  }, [id, user]);

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("raffles")
      .update({
        title: form.title,
        description: form.description || null,
        prize_title: form.prize_title,
        prize_value: Number(form.prize_value) || 0,
        ticket_price: Number(form.ticket_price) || 0,
        total_tickets: Number(form.total_tickets) || 100,
        end_date: form.end_date || null,
        province: form.province || null,
        city: form.city || null,
        hide_prize_value: form.hide_prize_value,
        max_winners: Number(form.max_winners) || 1,
        max_tickets_per_user: form.max_tickets_per_user ? Number(form.max_tickets_per_user) : null,
      } as any)
      .eq("id", id)
      .eq("business_user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar: " + error.message);
    } else {
      toast.success("Sorteio actualizado com sucesso!");
      navigate("/dashboard/raffles");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const cities = form.province ? (CITIES_BY_PROVINCE as Record<string, string[]>)[form.province] || [] : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard/raffles")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Editar Sorteio</h1>
          <p className="text-sm text-muted-foreground">Actualize os detalhes do seu sorteio</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle>Informações do Sorteio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Sorteio *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Título do Prémio *</Label>
                <Input value={form.prize_title} onChange={(e) => setForm({ ...form, prize_title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor do Prémio (MZN)</Label>
                <Input type="number" value={form.prize_value} onChange={(e) => setForm({ ...form, prize_value: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço por Bilhete (MZN)</Label>
                <Input type="number" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Total de Bilhetes</Label>
                <Input type="number" value={form.total_tickets} onChange={(e) => setForm({ ...form, total_tickets: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Número de Vencedores</Label>
                <Input type="number" min="1" value={form.max_winners} onChange={(e) => setForm({ ...form, max_winners: e.target.value })} />
                <p className="text-[10px] text-muted-foreground">Quantos vencedores serão sorteados</p>
              </div>
              <div className="space-y-2">
                <Label>Máx. bilhetes por utilizador</Label>
                <Input type="number" min="1" value={form.max_tickets_per_user} onChange={(e) => setForm({ ...form, max_tickets_per_user: e.target.value })} placeholder="Sem limite" />
                <p className="text-[10px] text-muted-foreground">Deixe vazio para sem limite</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Encerramento</Label>
              <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Província</Label>
                <select
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                >
                  <option value="">Selecionar...</option>
                  {PROVINCES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground"
                >
                  <option value="">Selecionar...</option>
                  {cities.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/dashboard/raffles")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Alterações
        </Button>
      </div>
    </div>
  );
}
