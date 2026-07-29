import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Palette, Save, Eye, Globe, Smartphone, Wallet, Upload, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WhiteLabelConfig() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          if ((data as any).logo_url) setLogoPreview((data as any).logo_url);
        }
      });
  }, [user]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("O logo deve ter no máximo 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Selecione um ficheiro de imagem válido"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(form.logo_url || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;
    setUploading(true);
    const ext = logoFile.name.split(".").pop();
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("white-label-logos").upload(path, logoFile);
    setUploading(false);
    if (error) { toast.error("Erro ao enviar logo: " + error.message); return null; }
    const { data: urlData } = supabase.storage.from("white-label-logos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!user || !form.brand_name) {
      toast.error("Preencha o nome da marca");
      return;
    }
    setSaving(true);

    let logoUrl = form.logo_url;
    if (logoFile) {
      const uploaded = await uploadLogo();
      if (uploaded) logoUrl = uploaded;
    }

    const payload = { ...form, logo_url: logoUrl, business_user_id: user.id } as any;

    if (existingId) {
      const { error } = await supabase.from("white_label_configs").update(payload).eq("id", existingId);
      if (error) { toast.error("Erro: " + error.message); }
      else { setForm(prev => ({ ...prev, logo_url: logoUrl })); setLogoFile(null); toast.success("Configuração atualizada!"); }
    } else {
      const { data, error } = await supabase.from("white_label_configs").insert(payload).select().single();
      if (error) { toast.error("Erro: " + error.message); }
      else { setExistingId((data as any).id); setForm(prev => ({ ...prev, logo_url: logoUrl })); setLogoFile(null); toast.success("Marca White Label criada!"); }
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const displayLogoUrl = logoPreview || form.logo_url;

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
              <label className="mb-1.5 block text-sm font-medium text-foreground">Logotipo</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              
              {displayLogoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={displayLogoUrl} alt="Logo" className="h-20 w-20 rounded-xl object-cover border border-border shadow-sm" />
                    <button onClick={() => { setLogoFile(null); setLogoPreview(null); setForm(prev => ({ ...prev, logo_url: "" })); }}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors shadow-sm">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Trocar Logo
                    </Button>
                    {logoFile && (
                      <p className="text-[11px] text-accent flex items-center gap-1">
                        <Image className="h-3 w-3" /> Novo ficheiro selecionado: {logoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/40">
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6 mb-1.5" />
                    <p className="text-xs font-medium">Enviar logo</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG até 5MB</p>
                  </div>
                </button>
              )}

              <div className="mt-3">
                <label className="mb-1 block text-[11px] text-muted-foreground">Ou cole o link directo:</label>
                <input name="logo_url" value={form.logo_url} onChange={(e) => {
                  handleChange(e);
                  if (e.target.value && !logoFile) setLogoPreview(e.target.value);
                }} placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-border bg-secondary/50 px-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
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
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> Números de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Configure os números para receber pagamentos dos participantes via mobile money</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Smartphone className="h-3.5 w-3.5 text-destructive" /> Número M-Pesa
                </label>
                <input name="mpesa_number" value={form.mpesa_number} onChange={handleChange} placeholder="84 xxx xxxx"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Wallet className="h-3.5 w-3.5 text-accent" /> Número e-Mola
                </label>
                <input name="emola_number" value={form.emola_number} onChange={handleChange} placeholder="86 xxx xxxx"
                  className="h-10 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass">
          <CardContent className="p-6 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pré-visualização</p>
            <div className="flex items-center gap-3">
              {displayLogoUrl ? (
                <img src={displayLogoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
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
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-end gap-3 pb-6">
        <Button onClick={handleSave} disabled={saving || uploading} className="gap-2 glow-primary">
          {saving || uploading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Save className="h-4 w-4" />}
          {uploading ? "A enviar logo..." : saving ? "A guardar..." : existingId ? "Atualizar Marca" : "Criar Marca White Label"}
        </Button>
      </div>
    </div>
  );
}
