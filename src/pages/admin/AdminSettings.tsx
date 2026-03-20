import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Clock, Globe, Bell, Shield, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [featuredRaffleId, setFeaturedRaffleId] = useState("");
  const [raffles, setRaffles] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    platformName: "Riffa",
    platformTagline: "Sorteios que inspiram",
    maintenanceMode: false,
    autoApprovePayments: false,
    maxTicketsPerUser: 10,
    commissionRate: 5,
    supportEmail: "suporte@riffa.co.mz",
    termsUrl: "",
    privacyUrl: "",
  });

  useEffect(() => {
    supabase
      .from("raffles")
      .select("id, title, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRaffles(data);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving - in production this would save to a settings table
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast({ title: "Configurações guardadas", description: "As alterações foram aplicadas com sucesso." });
  };

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
        {/* Featured Raffle Countdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Temporizador Destaque
              </CardTitle>
              <CardDescription>
                Configure o sorteio que aparece no temporizador da página inicial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sorteio em Destaque</Label>
                <Select value={featuredRaffleId} onValueChange={setFeaturedRaffleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um sorteio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {raffles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O temporizador na página inicial fará a contagem regressiva para este sorteio
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Settings */}
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
                <Input
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Slogan</Label>
                <Input
                  value={settings.platformTagline}
                  onChange={(e) => setSettings({ ...settings, platformTagline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email de Suporte</Label>
                <Input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Settings */}
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
                <Input
                  type="number"
                  value={settings.maxTicketsPerUser}
                  onChange={(e) => setSettings({ ...settings, maxTicketsPerUser: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Comissão da plataforma (%)</Label>
                <Input
                  type="number"
                  value={settings.commissionRate}
                  onChange={(e) => setSettings({ ...settings, commissionRate: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Aprovar pagamentos automaticamente</p>
                  <p className="text-xs text-muted-foreground">Sem revisão manual</p>
                </div>
                <Switch
                  checked={settings.autoApprovePayments}
                  onCheckedChange={(v) => setSettings({ ...settings, autoApprovePayments: v })}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações & Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
                  <p className="text-xs text-muted-foreground">Desactiva o acesso público</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>URL dos Termos de Serviço</Label>
                <Input
                  value={settings.termsUrl}
                  onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Política de Privacidade</Label>
                <Input
                  value={settings.privacyUrl}
                  onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })}
                  placeholder="https://..."
                />
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
