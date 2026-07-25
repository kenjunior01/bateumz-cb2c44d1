import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, RefreshCw, Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listVouchers,
  createVoucher,
  generateVoucherCode,
  toggleVoucherStatus,
  deleteVoucher,
  type Voucher,
} from "@/lib/vouchers";
import { supabase } from "@/integrations/supabase/client";

export default function AdminVouchers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoCode, setAutoCode] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 10,
    min_purchase: 0,
    max_uses: 100,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    is_active: true,
    raffle_id: "",
    region: "",
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const data = await listVouchers();
    setVouchers(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);

    const code = autoCode ? generateVoucherCode() : form.code.trim().toUpperCase();
    if (!code) {
      toast.error("Código do cupão é obrigatório");
      setSaving(false);
      return;
    }

    const result = await createVoucher({
      code,
      type: form.type,
      value: Number(form.value),
      min_purchase: form.min_purchase > 0 ? form.min_purchase : undefined,
      max_uses: form.max_uses > 0 ? form.max_uses : undefined,
      valid_from: new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
      is_active: form.is_active,
      created_by: user.id,
      raffle_id: form.raffle_id || undefined,
      region: form.region || undefined,
    });

    setSaving(false);

    if (result) {
      toast.success(`Cupão "${result.code}" criado com sucesso!`);
      setDialogOpen(false);
      fetchVouchers();
    } else {
      toast.error("Erro ao criar cupão. Verifique se o código já existe.");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const ok = await toggleVoucherStatus(id, !isActive);
    if (ok) {
      toast.success(isActive ? "Cupão desactivado" : "Cupão activado");
      fetchVouchers();
    }
  };

  const handleDelete = async (id: string, code: string) => {
    const ok = await deleteVoucher(id);
    if (ok) {
      toast.success(`Cupão "${code}" eliminado`);
      fetchVouchers();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const getStatusBadge = (v: Voucher) => {
    if (!v.is_active)
      return (
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
          Inactivo
        </Badge>
      );
    const now = new Date();
    if (now > new Date(v.valid_until))
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted/30">
          Expirado
        </Badge>
      );
    if (v.max_uses && v.current_uses >= v.max_uses)
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10">
          Esgotado
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
        Activo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Gestão de Cupões</h1>
          <p className="text-sm text-muted-foreground">Criar e gerir cupões promocionais</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchVouchers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cupão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Cupão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Code */}
                <div className="space-y-2">
                  <Label>Código do Cupão</Label>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 flex-1">
                      <Switch
                        checked={autoCode}
                        onCheckedChange={setAutoCode}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="text-xs text-muted-foreground">Auto-gerar</span>
                    </div>
                    {autoCode ? (
                      <div className="flex-1">
                        <div className="h-9.5 rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm tracking-wider text-muted-foreground">
                          BATEU-XXXX-XXXX
                        </div>
                      </div>
                    ) : (
                      <Input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        placeholder="EX: BATEU-PROMO-2024"
                        className="flex-1 font-mono uppercase"
                      />
                    )}
                  </div>
                </div>

                {/* Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de Desconto</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v as "percentage" | "fixed" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (MZN)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                {/* Purchase & Uses */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Compra Mínima (MZN)</Label>
                    <Input
                      type="number"
                      value={form.min_purchase || ""}
                      onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máximo de Usos</Label>
                    <Input
                      type="number"
                      value={form.max_uses || ""}
                      onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
                      min={0}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Válido De</Label>
                    <Input
                      type="date"
                      value={form.valid_from}
                      onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Válido Até</Label>
                    <Input
                      type="date"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label>Activo</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Criar Cupão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vouchers Table */}
      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Nenhum cupão criado</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Cupão" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Válido Até</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm font-semibold tracking-wider">{v.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(v.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {v.type === "percentage" ? "%" : "MZN"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {v.type === "percentage" ? `${v.value}%` : `${v.value} MZN`}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {v.current_uses}
                        {v.max_uses ? ` / ${v.max_uses}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(v.valid_until).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{getStatusBadge(v)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(v.id, v.is_active)}
                        >
                          {v.is_active ? (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(v.id, v.code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
