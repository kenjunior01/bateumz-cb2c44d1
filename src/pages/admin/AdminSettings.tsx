import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Clock, Globe, Bell, Shield, Save, Loader2, MessageCircle, Eye, EyeOff, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredRaffleId, setFeaturedRaffleId] = useState("");
  const [countdownEnabled, setCountdownEnabled] = useState(false);
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
    minTicketPrice: 10,
    maxRafflesPerBusiness: 20,
    requirePaymentProof: true,
  });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "Estamos em manutenção. Voltamos em breve!" });
  const [announcements, setAnnouncements] = useState({
    enabled: false,
    message: "",
    type: "info" as "info" | "warning" | "success",
  });

  useEffect(() => {
    const load = async () => {
      const [{ data: settings }, { data: activeRaffles }] = await Promise.all([
        supabase.from("platform_settings").select("key, value"),
        supabase.from("raffles").select("id, title, status, end_date, prize_title").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (settings) {
        const map = new Map(settings.map((s: any) => [s.key, s.value]));
        if (map.has("general")) setGeneral(prev => ({ ...prev, ...(map.get("general") as any) }));
        if (map.has("business")) setBusiness(prev => ({ ...prev, ...(map.get("business") as any) }));
        if (map.has("maintenance")) setMaintenance(prev => ({ ...prev, ...(map.get("maintenance") as any) }));
        if (map.has("announcements")) setAnnouncements(prev => ({ ...prev, ...(map.get("announcements") as any) }));
        if (map.has("featured")) {
          const f = map.get("featured") as any;
          setFeaturedRaffleId(f?.raffleId || "");
          setCountdownEnabled(f?.countdownEnabled === true);
        }
      }
      if (activeRaffles) setRaffles(activeRaffles);
      setLoading(false);
    };
    load();
  }, []);

  const upsertSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("platform_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("platform_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", key);
    } else {
      await supabase.from("platform_settings").insert({ key, value: value as any });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      upsertSetting("general", general),
      upsertSetting("business", business),
      upsertSetting("maintenance", maintenance),
      upsertSetting("announcements", announcements),
      upsertSetting("featured", { raffleId: featuredRaffleId, countdownEnabled }),
    ]);
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

  const selectedRaffle = raffles.find(r => r.id === featuredRaffleId);

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
        {/* Featured Raffle + Countdown Toggle */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Temporizador Destaque
              </CardTitle>
              <CardDescription>Controla o temporizador da página inicial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3 border border-primary/20">
                <div>
                  <p className="text-sm font-medium text-foreground">Ativar Temporizador</p>
                  <p className="text-xs text-muted-foreground">
                    {countdownEnabled ? "Visível na homepage" : "Oculto na homepage"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {countdownEnabled ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <Eye className="h-3 w-3 mr-1" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <EyeOff className="h-3 w-3 mr-1" /> Offline
                    </Badge>
                  )}
                  <Switch checked={countdownEnabled} onCheckedChange={setCountdownEnabled} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sorteio em Destaque</Label>
                <Select value={featuredRaffleId} onValueChange={setFeaturedRaffleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um sorteio..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {raffles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title} — {r.prize_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRaffle && (
                <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-1">
                  <p className="font-medium text-foreground">{selectedRaffle.title}</p>
                  <p className="text-muted-foreground">Prémio: {selectedRaffle.prize_title}</p>
                  <p className="text-muted-foreground">
                    Termina: {selectedRaffle.end_date ? new Date(selectedRaffle.end_date).toLocaleDateString("pt-MZ") : "Sem data"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcement Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-accent" />
                Banner de Anúncio
              </CardTitle>
              <CardDescription>Mensagem visível no topo de todas as páginas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-accent/5 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Ativar Banner</p>
                  <p className="text-xs text-muted-foreground">Exibir anúncio global</p>
                </div>
                <Switch checked={announcements.enabled} onCheckedChange={(v) => setAnnouncements({ ...announcements, enabled: v })} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={announcements.message}
                  onChange={(e) => setAnnouncements({ ...announcements, message: e.target.value })}
                  placeholder="Ex: Grande sorteio este fim de semana! 🎉"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={announcements.type} onValueChange={(v: any) => setAnnouncements({ ...announcements, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Informação</SelectItem>
                    <SelectItem value="warning">⚠️ Aviso</SelectItem>
                    <SelectItem value="success">✅ Sucesso</SelectItem>
                  </SelectContent>
                </Select>
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
              <p className="text-xs text-muted-foreground">Formato: código do país + número (ex: 258841234567)</p>
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
              <CardDescription>Limites, comissões e regras</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Máx. bilhetes/utilizador</Label>
                  <Input type="number" value={business.maxTicketsPerUser} onChange={(e) => setBusiness({ ...business, maxTicketsPerUser: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão (%)</Label>
                  <Input type="number" value={business.commissionRate} onChange={(e) => setBusiness({ ...business, commissionRate: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Preço mín. bilhete (MZN)</Label>
                  <Input type="number" value={business.minTicketPrice} onChange={(e) => setBusiness({ ...business, minTicketPrice: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Máx. sorteios/empresa</Label>
                  <Input type="number" value={business.maxRafflesPerBusiness} onChange={(e) => setBusiness({ ...business, maxRafflesPerBusiness: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Aprovar pagamentos automaticamente</p>
                  <p className="text-xs text-muted-foreground">Sem revisão manual</p>
                </div>
                <Switch checked={business.autoApprovePayments} onCheckedChange={(v) => setBusiness({ ...business, autoApprovePayments: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Exigir comprovativo de pagamento</p>
                  <p className="text-xs text-muted-foreground">Upload obrigatório de recibo</p>
                </div>
                <Switch checked={business.requirePaymentProof} onCheckedChange={(v) => setBusiness({ ...business, requirePaymentProof: v })} />
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
                  <p className="text-xs text-muted-foreground">Desativa o acesso público temporariamente</p>
                </div>
                <Switch checked={maintenance.enabled} onCheckedChange={(v) => setMaintenance({ ...maintenance, enabled: v })} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem de manutenção</Label>
                <Input
                  value={maintenance.message}
                  onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                  placeholder="Estamos em manutenção..."
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Configurações
        </Button>
      </div>
    </div>
  );
}
