import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, Upload, Plus, Trash2, Globe, Palette, Languages } from "lucide-react";
import { COUNTRIES } from "@/lib/regions";

interface RegionRow {
  id: string;
  country_code: string;
  label: string;
  flag: string | null;
  currency: string;
  name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  banner_url: string | null;
  custom_css: string | null;
  default_language: string | null;
  tagline: string | null;
  is_active: boolean;
}

interface TranslationRow {
  id: string;
  key: string;
  language_code: string;
  value: string;
  region_id: string | null;
}

const LANGS = ["en", "pt", "pt-BR", "es", "fr"];

export default function AdminRegionalBranding() {
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newLang, setNewLang] = useState("en");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // What countries can this user manage?
      let countries: string[] = [];
      if (role === "superadmin") {
        countries = COUNTRIES.map((c) => c.code);
      } else {
        const { data } = await supabase
          .from("admin_regions")
          .select("country_code")
          .eq("user_id", user.id);
        countries = (data ?? []).map((r: any) => r.country_code);
      }
      setAllowedCountries(countries);

      if (countries.length === 0) {
        setLoading(false);
        return;
      }

      const { data: regs } = await supabase
        .from("regions")
        .select("*")
        .in("country_code", countries)
        .order("label");

      setRegions((regs ?? []) as RegionRow[]);
      const first = (regs?.[0] as RegionRow | undefined)?.id ?? null;
      setSelectedId(first);
      setLoading(false);
    })();
  }, [user, role]);

  const selected = useMemo(() => regions.find((r) => r.id === selectedId) || null, [regions, selectedId]);

  useEffect(() => {
    if (!selected) { setTranslations([]); return; }
    (async () => {
      const { data } = await supabase
        .from("translations")
        .select("*")
        .eq("region_id", selected.id)
        .order("language_code");
      setTranslations((data ?? []) as TranslationRow[]);
    })();
  }, [selected?.id]);

  if (authLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (role !== "admin" && role !== "superadmin") return <Navigate to="/admin" replace />;

  const updateField = (k: keyof RegionRow, v: any) => {
    if (!selected) return;
    setRegions((rs) => rs.map((r) => (r.id === selected.id ? { ...r, [k]: v } : r)));
  };

  async function uploadAsset(kind: "logo" | "banner", file: File) {
    if (!selected) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${selected.country_code}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("regional-assets").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data } = supabase.storage.from("regional-assets").getPublicUrl(path);
    updateField(kind === "logo" ? "logo_url" : "banner_url", data.publicUrl);
    toast.success(`${kind === "logo" ? "Logo" : "Banner"} carregado`);
  }

  async function saveRegion() {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("regions")
      .update({
        name: selected.name,
        tagline: selected.tagline,
        primary_color: selected.primary_color,
        secondary_color: selected.secondary_color,
        accent_color: selected.accent_color,
        logo_url: selected.logo_url,
        banner_url: selected.banner_url,
        custom_css: selected.custom_css,
        default_language: selected.default_language,
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Região atualizada");
  }

  async function addTranslation() {
    if (!selected || !newKey.trim() || !newValue.trim()) return;
    const { data, error } = await supabase
      .from("translations")
      .insert({ key: newKey.trim(), value: newValue.trim(), language_code: newLang, region_id: selected.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setTranslations((t) => [...t, data as TranslationRow]);
    setNewKey(""); setNewValue("");
    toast.success("Tradução adicionada");
  }

  async function deleteTranslation(id: string) {
    const { error } = await supabase.from("translations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTranslations((t) => t.filter((x) => x.id !== id));
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (regions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Branding Regional</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sem regiões atribuídas. Pede ao superadmin para te atribuir um país.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Branding Regional</h1>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Região</Label>
          <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.flag ? `${r.flag} ` : ""}{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Identidade Visual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome amigável da região</Label>
                <Input value={selected.name ?? ""} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: Bateu Moçambique" />
              </div>
              <div className="space-y-2">
                <Label>Slogan / Tagline</Label>
                <Input value={selected.tagline ?? ""} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Ex: O sorteio do teu bairro" />
              </div>
              <div className="space-y-2">
                <Label>Cor primária</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-16 h-10 p-1" value={selected.primary_color ?? "#0B1F3A"} onChange={(e) => updateField("primary_color", e.target.value)} />
                  <Input value={selected.primary_color ?? ""} onChange={(e) => updateField("primary_color", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor secundária</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-16 h-10 p-1" value={selected.secondary_color ?? "#C9A24C"} onChange={(e) => updateField("secondary_color", e.target.value)} />
                  <Input value={selected.secondary_color ?? ""} onChange={(e) => updateField("secondary_color", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de destaque</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-16 h-10 p-1" value={selected.accent_color ?? "#B22234"} onChange={(e) => updateField("accent_color", e.target.value)} />
                  <Input value={selected.accent_color ?? ""} onChange={(e) => updateField("accent_color", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Idioma padrão</Label>
                <Select value={selected.default_language ?? "en"} onValueChange={(v) => updateField("default_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                {selected.logo_url && <img src={selected.logo_url} alt="logo" className="h-12 object-contain bg-muted rounded p-1" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAsset("logo", e.target.files[0])} />
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                {selected.banner_url && <img src={selected.banner_url} alt="banner" className="h-24 w-full object-cover rounded" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAsset("banner", e.target.files[0])} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>CSS personalizado (avançado)</Label>
                <Textarea rows={5} className="font-mono text-xs" value={selected.custom_css ?? ""} onChange={(e) => updateField("custom_css", e.target.value)} placeholder=":root { --foo: bar; }" />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button onClick={saveRegion} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar alterações
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Languages className="h-4 w-4" /> Traduções da região</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[1fr_2fr_120px_auto]">
                <Input placeholder="Chave (ex: hero.title)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                <Input placeholder="Valor traduzido" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                <Select value={newLang} onValueChange={setNewLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={addTranslation}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chave</TableHead>
                      <TableHead>Idioma</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {translations.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Sem traduções específicas para esta região.</TableCell></TableRow>
                    ) : translations.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.key}</TableCell>
                        <TableCell><code className="text-xs">{t.language_code}</code></TableCell>
                        <TableCell>{t.value}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteTranslation(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
