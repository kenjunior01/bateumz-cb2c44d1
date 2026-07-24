import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Bell, Shield, Save, Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NotificationSettings from "@/components/notifications/NotificationSettings";

export default function DashboardSettings() {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: profile?.display_name || "",
    companyName: profile?.company_name || "",
    phone: profile?.phone || "",
    emailNotifications: true,
    smsNotifications: false,
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.displayName,
        company_name: form.companyName,
        phone: form.phone,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível guardar.", variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado", description: "As alterações foram guardadas." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gira o teu perfil e preferências</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Perfil
              </CardTitle>
              <CardDescription>Informações do teu perfil empresarial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome de Exibição</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+258..." />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
              <CardDescription>Configurações de notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificações por email</p>
                  <p className="text-xs text-muted-foreground">Receber actualizações sobre sorteios</p>
                </div>
                <Switch checked={form.emailNotifications} onCheckedChange={(v) => setForm({ ...form, emailNotifications: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificações por SMS</p>
                  <p className="text-xs text-muted-foreground">Receber SMS de resultados</p>
                </div>
                <Switch checked={form.smsNotifications} onCheckedChange={(v) => setForm({ ...form, smsNotifications: v })} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Pagamentos
              </CardTitle>
              <CardDescription>Dados para receber pagamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para configurar os dados de recebimento (M-Pesa, e-Mola), aceda às configurações de White Label.
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "/dashboard/white-label"}>
                Configurar White Label
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <NotificationSettings />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança
              </CardTitle>
              <CardDescription>Segurança da conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Email: {user?.email}
              </p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "/forgot-password"}>
                Alterar Palavra-passe
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Alterações
        </Button>
      </div>
    </div>
  );
}
