import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Palette, Save, Eye, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WhiteLabelConfig() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    logo_url: "",
    primary_color: "#22c55e",
    secondary_color: "#eab308",
    custom_domain: "",
    description: "",
    mpesa_number: "",
    emola_number: "",
  });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("white_label_configs")
      .select("*")
      .eq("business_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            brand_name: (data as any).brand_name || "",
            logo_url: (data as any).logo_url || "",
            primary_color: (data as any).primary_color || "#22c55e",
            secondary_color: (data as any).secondary_color || "#eab308",
            custom_domain: (data as any).custom_domain || "",
            description: (data as any).description || "",
            mpesa_number: (data as any).mpesa_number || "",
            emola_number: (data as any).emola_number || "",
          });
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !form.brand_name) {
      toast.error("Preencha o nome da marca");
      return;
    }
    setSaving(true);
    const payload = { ...form, business_user_id: user.id } as any;

    if (existingId) {
      const { error } = await supabase.from("white_label_configs").update(payload).eq("id", existingId);
      if (error) { toast.error("Erro: " + error.message); }
      else { toast.success("Configuração atualizada!"); }
    } else {
      const { data, error } = await supabase.from("white_label_configs").insert(payload).select().single();
      if (error) { toast.error("Erro: " + error.message); }
      else { setExistingId((data as any).id); toast.success("Marca White Label criada!"); }
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" /> White Label
        </h1>
        <p className="text-sm text-muted-foreground">Personalize a plataforma com a sua marca para campanhas exclusivas</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass">
          <CardHeader><CardTitle className="text-lg">Identidade da Marca</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nome da Marca *</label>
              <input name="brand_name" value={form.brand_name} onChange={handleChange} placeholder="Ex: Vodacom Promo"
                className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Descrição</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Descrição da sua campanha..."
                className="w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">URL do Logotipo</label>
              <input name="logo_url" value={form.logo_url} onChange={handleChange} placeholder="https://..."
                className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="glass">
          <CardHeader><CardTitle className="text-lg">Cores & Domínio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Cor Primária</label>
                <div className="flex items-center gap-3">
                  <input type="color" name="primary_color" value={form.primary_color} onChange={handleChange}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
                  <input value={form.primary_color} onChange={handleChange} name="primary_color"
                    className="h-10 flex-1 rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Cor Secundária</label>
                <div className="flex items-center gap-3">
                  <input type="color" name="secondary_color" value={form.secondary_color} onChange={handleChange}
                    className="h-10 w-14 rounded-lg border border-border cursor-pointer" />
                  <input value={form.secondary_color} onChange={handleChange} name="secondary_color"
                    className="h-10 flex-1 rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
                <Globe className="h-3.5 w-3.5" /> Domínio Personalizado (opcional)
              </label>
              <input name="custom_domain" value={form.custom_domain} onChange={handleChange} placeholder="promo.suaempresa.co.mz"
                className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pré-visualização</p>
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: form.primary_color, color: "#fff" }}>
                    {form.brand_name.charAt(0) || "S"}
                  </div>
                )}
                <span className="font-display text-lg font-bold text-foreground">{form.brand_name || "Sua Marca"}</span>
              </div>
              <div className="flex gap-2">
                <div className="h-8 rounded-lg px-4 flex items-center text-xs font-medium text-white" style={{ backgroundColor: form.primary_color }}>
                  Botão Primário
                </div>
                <div className="h-8 rounded-lg px-4 flex items-center text-xs font-medium text-white" style={{ backgroundColor: form.secondary_color }}>
                  Botão Secundário
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end gap-3 pb-6">
        <Button onClick={handleSave} disabled={saving} className="gap-2 glow-primary">
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Save className="h-4 w-4" />}
          {saving ? "A guardar..." : existingId ? "Atualizar Marca" : "Criar Marca White Label"}
        </Button>
      </div>
    </div>
  );
}
