
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase: any = _supabase;
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/regions";

interface RegionalPlan {
  id: string;
  country_code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPlans() {
  const { user, role, adminCountries, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<RegionalPlan[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [availableCountries, setAvailableCountries] = useState<{ code: string; label: string; currency: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RegionalPlan>>({
    name: "",
    description: "",
    price: 0,
    currency: "",
    billing_cycle: "monthly",
    features: [],
    is_active: true,
    is_popular: false,
  });

  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "superadmin")) return;

    const loadCountries = async () => {
      if (role === "superadmin") {
        const { data: regions } = await supabase.from("regions").select("*");
        setAvailableCountries((regions || []).map((r: any) => ({
          code: r.country_code,
          label: r.label,
          currency: r.currency,
        })));
        if (regions && regions.length > 0) {
          setSelectedCountry(regions[0].country_code);
        }
      } else {
        const regionOptions = adminCountries.map((code) => {
          const country = COUNTRIES.find((c) => c.code === code);
          return {
            code,
            label: country?.label || code,
            currency: country?.currency || "USD",
          };
        });
        setAvailableCountries(regionOptions);
        if (adminCountries.length > 0) {
          setSelectedCountry(adminCountries[0]);
        }
      }
    };

    loadCountries();
  }, [user, role, adminCountries, authLoading]);

  useEffect(() => {
    if (!selectedCountry) return;
    loadPlans();
  }, [selectedCountry]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("regional_plans")
        .select("*")
        .eq("country_code", selectedCountry)
        .order("price", { ascending: true });
      if (error) throw error;
      setPlans(
        (data || []).map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
        }))
      );
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setForm({
      ...form,
      features: [...(form.features || []), featureInput.trim()],
    });
    setFeatureInput("");
  };

  const handleRemoveFeature = (index: number) => {
    const newFeatures = [...(form.features || [])];
    newFeatures.splice(index, 1);
    setForm({ ...form, features: newFeatures });
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("regional_plans")
          .update({
            ...form,
            country_code: selectedCountry,
            currency: form.currency || availableCountries.find((c) => c.code === selectedCountry)?.currency || "USD",
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Plano atualizado!");
      } else {
        const { error } = await supabase.from("regional_plans").insert({
          ...form,
          country_code: selectedCountry,
          currency: form.currency || availableCountries.find((c) => c.code === selectedCountry)?.currency || "USD",
          created_by: user?.id,
        });
        if (error) throw error;
        toast.success("Plano criado!");
      }
      loadPlans();
      setEditingId(null);
      setForm({
        name: "",
        description: "",
        price: 0,
        currency: "",
        billing_cycle: "monthly",
        features: [],
        is_active: true,
        is_popular: false,
      });
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: RegionalPlan) => {
    setEditingId(plan.id);
    setForm({ ...plan });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza de que quer apagar este plano?")) return;
    try {
      const { error } = await supabase.from("regional_plans").delete().eq("id", id);
      if (error) throw error;
      toast.success("Plano apagado!");
      loadPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Erro ao apagar plano");
    }
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  if (!user || (role !== "admin" && role !== "superadmin"))
    return <Navigate to="/admin" replace />;

  const currentCountryCurrency = availableCountries.find((c) => c.code === selectedCountry)?.currency;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Planos</h1>
          <p className="text-muted-foreground">
            Gerencie planos de subscrição regionais para empresas.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Plano" : "Novo Plano"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableCountries.length > 1 && (
                <div className="space-y-2">
                  <Label>País</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCountries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Básico, Pro, Empresarial"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o que está incluído no plano"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preço</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="29.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciclo de Pagamento</Label>
                  <Select
                    value={form.billing_cycle}
                    onValueChange={(v) => setForm({ ...form, billing_cycle: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Funcionalidades</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddFeature()}
                    placeholder="Adicione uma funcionalidade"
                  />
                  <Button onClick={handleAddFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.features || []).map((f, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {f}
                      <button
                        onClick={() => handleRemoveFeature(i)}
                        className="ml-1 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_popular}
                    onCheckedChange={(v) => setForm({ ...form, is_popular: v })}
                  />
                  <Label>Popular</Label>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    A salvar...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Atualizar" : "Criar"}
                  </>
                )}
              </Button>

              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      description: "",
                      price: 0,
                      currency: "",
                      billing_cycle: "monthly",
                      features: [],
                      is_active: true,
                      is_popular: false,
                    });
                  }}
                  className="w-full"
                >
                  Cancelar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                Nenhum plano criado para este país ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  {plan.is_popular && (
                    <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <p className="text-2xl font-bold mt-2">
                          {currentCountryCurrency || plan.currency} {plan.price.toFixed(2)}
                          <span className="text-sm text-muted-foreground font-normal">
                            /{plan.billing_cycle === "monthly" ? "mês" : "ano"}
                          </span>
                        </p>
                      </div>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    )}
                    <ul className="space-y-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit2 className="h-3 w-3 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
