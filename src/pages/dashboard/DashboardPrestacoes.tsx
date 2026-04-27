import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Loader2,
  Package,
  Pencil,
  Trash2,
  MessageSquare,
  Eye,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";
import { PROVINCES } from "@/lib/provinces";
import { toast } from "sonner";
import {
  CATEGORY_DEFAULTS,
  PRESTACAO_CATEGORIES,
  PRESTACAO_STATUSES,
  productSchema,
  type PrestacaoCategory,
  type PrestacaoStatus,
} from "@/lib/prestacoes";

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  total_price: number;
  min_down_payment: number;
  max_months: number;
  annual_rate: number;
  images: string[];
  province: string | null;
  city: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  whatsapp: string;
  stock: number;
  status: string;
  featured: boolean;
  views_count: number;
};

type Lead = {
  id: string;
  product_id: string;
  visitor_name: string | null;
  visitor_whatsapp: string | null;
  total_price: number;
  down_payment: number;
  months: number;
  monthly_estimate: number;
  source: string;
  created_at: string;
};

type FormState = {
  id?: string;
  title: string;
  category: PrestacaoCategory;
  description: string;
  total_price: string;
  min_down_payment: string;
  max_months: string;
  annual_rate: string;
  images: string;
  province: string;
  city: string;
  brand: string;
  model: string;
  year: string;
  whatsapp: string;
  stock: string;
  status: PrestacaoStatus;
  featured: boolean;
};

function emptyForm(category: PrestacaoCategory = "outros"): FormState {
  const def = CATEGORY_DEFAULTS[category];
  return {
    title: "",
    category,
    description: "",
    total_price: "",
    min_down_payment: "",
    max_months: String(def.maxMonths),
    annual_rate: String(def.annualRate),
    images: "",
    province: "",
    city: "",
    brand: "",
    model: "",
    year: "",
    whatsapp: "",
    stock: "1",
    status: "draft",
    featured: false,
  };
}

export default function DashboardPrestacoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: prods }, { data: ls }] = await Promise.all([
      supabase
        .from("prestacao_products")
        .select("*")
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("prestacao_product_leads")
        .select("*")
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setProducts(
      (prods ?? []).map((p: any) => ({
        ...p,
        images: Array.isArray(p.images) ? p.images : [],
      })),
    );
    setLeads((ls ?? []) as Lead[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const draft = products.filter((p) => p.status === "draft").length;
    const views = products.reduce((s, p) => s + (p.views_count ?? 0), 0);
    return { total: products.length, active, draft, views, leads: leads.length };
  }, [products, leads]);

  function openCreate() {
    setForm(emptyForm());
  }
  function openEdit(p: Product) {
    setForm({
      id: p.id,
      title: p.title,
      category: (p.category as PrestacaoCategory) ?? "outros",
      description: p.description ?? "",
      total_price: String(p.total_price),
      min_down_payment: String(p.min_down_payment),
      max_months: String(p.max_months),
      annual_rate: String(p.annual_rate),
      images: (p.images ?? []).join("\n"),
      province: p.province ?? "",
      city: p.city ?? "",
      brand: p.brand ?? "",
      model: p.model ?? "",
      year: p.year ? String(p.year) : "",
      whatsapp: p.whatsapp,
      stock: String(p.stock),
      status: (p.status as PrestacaoStatus) ?? "draft",
      featured: p.featured,
    });
  }

  async function save() {
    if (!form || !user) return;
    const images = form.images
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      title: form.title,
      category: form.category,
      description: form.description || undefined,
      total_price: Number(form.total_price),
      min_down_payment: Number(form.min_down_payment),
      max_months: Number(form.max_months),
      annual_rate: Number(form.annual_rate),
      images,
      province: form.province,
      city: form.city,
      brand: form.brand,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      whatsapp: form.whatsapp,
      stock: Number(form.stock),
      status: form.status,
      featured: form.featured,
    };

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "Dados inválidos");
      return;
    }

    setSaving(true);
    const dbRow = {
      ...parsed.data,
      description: parsed.data.description || null,
      province: parsed.data.province || null,
      city: parsed.data.city || null,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      business_user_id: user.id,
    };

    const { error } = form.id
      ? await supabase
          .from("prestacao_products")
          .update(dbRow as any)
          .eq("id", form.id)
      : await supabase.from("prestacao_products").insert(dbRow as any);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Produto atualizado" : "Produto criado");
    setForm(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Eliminar este produto?")) return;
    const { error } = await supabase.from("prestacao_products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Produto eliminado");
    load();
  }

  async function toggleStatus(p: Product) {
    const next = p.status === "active" ? "draft" : "active";
    const { error } = await supabase
      .from("prestacao_products")
      .update({ status: next })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Produto ${next === "active" ? "publicado" : "ocultado"}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prestações</h1>
          <p className="text-sm text-muted-foreground">
            Publique e gira os seus produtos a prestações no catálogo Bateu.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo produto
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Ativos", value: stats.active },
          { label: "Rascunhos", value: stats.draft },
          { label: "Visualizações", value: stats.views },
          { label: "Leads", value: stats.leads },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Os meus produtos</h2>
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Ainda não tem produtos. Clique em "Novo produto" para começar.
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{p.title}</p>
                      <Badge
                        variant={p.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {p.status}
                      </Badge>
                      {p.featured && <Badge variant="outline">Destaque</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap mt-1">
                      <span>{formatMZN(Number(p.total_price))}</span>
                      <span>Stock: {p.stock}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {p.views_count ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatus(p)}
                    >
                      {p.status === "active" ? "Ocultar" : "Publicar"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Últimos pedidos via WhatsApp
          </h2>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem pedidos registados ainda. Cada clique em "Contactar vendedor" no
              catálogo aparece aqui.
            </p>
          ) : (
            <div className="space-y-2">
              {leads.map((l) => {
                const product = products.find((p) => p.id === l.product_id);
                return (
                  <div
                    key={l.id}
                    className="text-sm flex items-center justify-between gap-3 p-2 rounded border"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {product?.title ?? "Produto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entrada {formatMZN(Number(l.down_payment))} ·{" "}
                        {l.months} meses · ~{formatMZN(Number(l.monthly_estimate))}/mês
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(l.created_at).toLocaleString("pt-PT")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.id ? "Editar produto" : "Novo produto a prestações"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => {
                      const cat = v as PrestacaoCategory;
                      const def = CATEGORY_DEFAULTS[cat];
                      setForm({
                        ...form,
                        category: cat,
                        annual_rate: form.annual_rate || String(def.annualRate),
                        max_months: form.max_months || String(def.maxMonths),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESTACAO_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({ ...form, status: v as PrestacaoStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESTACAO_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Preço total (MZN) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.total_price}
                    onChange={(e) =>
                      setForm({ ...form, total_price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Entrada mínima (MZN) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.min_down_payment}
                    onChange={(e) =>
                      setForm({ ...form, min_down_payment: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Prazo máximo (meses) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.max_months}
                    onChange={(e) =>
                      setForm({ ...form, max_months: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Taxa anual (ex.: 0.18) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.annual_rate}
                    onChange={(e) =>
                      setForm({ ...form, annual_rate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Stock *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="+258..."
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Província</Label>
                  <Select
                    value={form.province || "_none"}
                    onValueChange={(v) =>
                      setForm({ ...form, province: v === "_none" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p.value} value={p.label}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Imagens (uma URL por linha, máx. 8)</Label>
                  <Textarea
                    rows={3}
                    placeholder="https://...\nhttps://..."
                    value={form.images}
                    onChange={(e) => setForm({ ...form, images: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(v) => setForm({ ...form, featured: v })}
                  />
                  <Label>Destacar no catálogo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
