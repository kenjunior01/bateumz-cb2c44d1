import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Clock, Globe, Bell, Shield, Save, Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredRaffleId, setFeaturedRaffleId] = useState("");
  const [raffles, setRaffles] = useState<any[]>([]);
  const [general, setGeneral] = useState({
    platformName: "Bateu",
    platformTagline: "Sorteios que inspiram",
    supportEmail: "suporte@bateu.co.mz",
    whatsappNumber: "258840000000",
  });
  const [business, setBusiness] = useState({
    maxTicketsPerUser: 10,
    commissionRate: 5,
    autoApprovePayments: false,
  });
  const [maintenance, setMaintenance] = useState({ enabled: false });

  useEffect(() => {
    const load = async () => {
      const [{ data: settings }, { data: activeRaffles }] = await Promise.all([
        supabase.from("platform_settings").select("key, value"),
        supabase.from("raffles").select("id, title, status").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (settings) {
        const map = new Map(settings.map((s: any) => [s.key, s.value]));
        if (map.has("general")) setGeneral(map.get("general") as any);
        if (map.has("business")) setBusiness(map.get("business") as any);
        if (map.has("maintenance")) setMaintenance(map.get("maintenance") as any);
        if (map.has("featured")) setFeaturedRaffleId((map.get("featured") as any)?.raffleId || "");
      }
      if (activeRaffles) setRaffles(activeRaffles);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      supabase.from("platform_settings").update({ value: general as any, updated_at: new Date().toISOString() }).eq("key", "general"),
      supabase.from("platform_settings").update({ value: business as any, updated_at: new Date().toISOString() }).eq("key", "business"),
      supabase.from("platform_settings").update({ value: maintenance as any, updated_at: new Date().toISOString() }).eq("key", "maintenance"),
      supabase.from("platform_settings").update({ value: { raffleId: featuredRaffleId } as any, updated_at: new Date().toISOString() }).eq("key", "featured"),
    ];
    await Promise.all(updates);
    setSaving(false);
    toast({ title: "Configurações guardadas", description: "As alterações foram aplicadas com sucesso." });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Configurações gerais da plataforma</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Featured Raffle */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Temporizador Destaque
              </CardTitle>
              <CardDescription>Sorteio que aparece no temporizador da página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sorteio em Destaque</Label>
                <Select value={featuredRaffleId} onValueChange={setFeaturedRaffleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um sorteio..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {raffles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">O temporizador fará contagem regressiva para este sorteio</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Plataforma
              </CardTitle>
              <CardDescription>Informações gerais da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Plataforma</Label>
                <Input value={general.platformName} onChange={(e) => setGeneral({ ...general, platformName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slogan</Label>
                <Input value={general.platformTagline} onChange={(e) => setGeneral({ ...general, platformTagline: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email de Suporte</Label>
                <Input type="email" value={general.supportEmail} onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* WhatsApp */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                WhatsApp Suporte
              </CardTitle>
              <CardDescription>Número do botão flutuante de suporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Número WhatsApp (com código do país)</Label>
              <Input value={general.whatsappNumber} onChange={(e) => setGeneral({ ...general, whatsappNumber: e.target.value })} placeholder="258840000000" />
              <p className="text-xs text-muted-foreground">Formato: código do país + número, sem espaços (ex: 258841234567)</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Rules */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Regras de Negócio
              </CardTitle>
              <CardDescription>Limites e comissões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Máx. bilhetes por utilizador</Label>
                <Input type="number" value={business.maxTicketsPerUser} onChange={(e) => setBusiness({ ...business, maxTicketsPerUser: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Comissão da plataforma (%)</Label>
                <Input type="number" value={business.commissionRate} onChange={(e) => setBusiness({ ...business, commissionRate: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Aprovar pagamentos automaticamente</p>
                  <p className="text-xs text-muted-foreground">Sem revisão manual</p>
                </div>
                <Switch checked={business.autoApprovePayments} onCheckedChange={(v) => setBusiness({ ...business, autoApprovePayments: v })} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Maintenance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
                  <p className="text-xs text-muted-foreground">Desativa o acesso público temporariamente</p>
                </div>
                <Switch checked={maintenance.enabled} onCheckedChange={(v) => setMaintenance({ enabled: v })} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Configurações
        </Button>
      </div>
    </div>
  );
}
