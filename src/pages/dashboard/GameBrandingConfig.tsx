import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Palette,
  Save,
  Upload,
  X,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Trophy,
  Crown,
  Gamepad2,
  Monitor,
  Zap,
  Star,
  Check,
} from "lucide-react";

// Preset theme definitions
const PRESETS = [
  { name: "Amarelo Premium", primary: "#fbbf24", secondary: "#f97316", accent: "#eab308", bg: "#0a0a0a", text: "#ffffff" },
  { name: "Azul Corporativo", primary: "#3b82f6", secondary: "#06b6d4", accent: "#8b5cf6", bg: "#0f172a", text: "#f1f5f9" },
  { name: "Roxo Neon", primary: "#a855f7", secondary: "#ec4899", accent: "#6366f1", bg: "#0a0014", text: "#e9d5ff" },
  { name: "Verde Gaming", primary: "#10b981", secondary: "#22d3ee", accent: "#84cc16", bg: "#022c22", text: "#d1fae5" },
  { name: "Vermelho Live", primary: "#ef4444", secondary: "#f97316", accent: "#fbbf24", bg: "#1a0000", text: "#fee2e2" },
];

// Overlay style definitions
type OverlayStyle = "modern" | "minimal" | "neon" | "classic" | "gaming";

const OVERLAY_STYLES: { id: OverlayStyle; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "modern", label: "Moderno", icon: <Monitor className="h-5 w-5" />, desc: "Limpo e profissional" },
  { id: "minimal", label: "Minimal", icon: <Eye className="h-5 w-5" />, desc: "Elegante e simples" },
  { id: "neon", label: "Neon", icon: <Zap className="h-5 w-5" />, desc: "Brilhante e vibrante" },
  { id: "classic", label: "Classico", icon: <Crown className="h-5 w-5" />, desc: "Tradicional e sofisticado" },
  { id: "gaming", label: "Gaming", icon: <Gamepad2 className="h-5 w-5" />, desc: "Dinamico e intenso" },
];

// Mock leaderboard data for preview
const MOCK_LEADERBOARD = [
  { rank: 1, name: "Ana Silva", score: 2850 },
  { rank: 2, name: "Carlos M.", score: 2340 },
  { rank: 3, name: "Beatriz L.", score: 1980 },
  { rank: 4, name: "Diogo R.", score: 1650 },
  { rank: 5, name: "Elena F.", score: 1420 },
];

// Spring animation configs defined outside JSX
const fadeInUp = { type: "spring" as const, stiffness: 120, damping: 14 };
const fadeInUpSlow = { type: "spring" as const, stiffness: 100, damping: 16 };
const staggerChildren = { type: "spring" as const, stiffness: 140, damping: 12 };
const scaleIn = { type: "spring" as const, stiffness: 200, damping: 15 };

// Default branding state
const DEFAULT_BRANDING = {
  company_name: "",
  company_slogan: "",
  company_logo_url: "",
  background_image_url: "",
  primary_color: "#22c55e",
  secondary_color: "#eab308",
  accent_color: "#f97316",
  background_color: "#0a0a0a",
  text_color: "#ffffff",
  overlay_style: "modern" as OverlayStyle,
  enabled: true,
};

// Main component
export default function GameBrandingConfig() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Load existing branding on mount
  useEffect(() => {
    if (!user) return;

    const loadBranding = async () => {
      const { data } = await supabase
        .from("company_branding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const row = data as any;
        setExistingId(row.id);
        setBranding({
          company_name: row.company_name || "",
          company_slogan: row.company_slogan || "",
          company_logo_url: row.company_logo_url || "",
          background_image_url: row.background_image_url || "",
          primary_color: row.primary_color || "#22c55e",
          secondary_color: row.secondary_color || "#eab308",
          accent_color: row.accent_color || "#f97316",
          background_color: row.background_color || "#0a0a0a",
          text_color: row.text_color || "#ffffff",
          overlay_style: row.overlay_style || "modern",
          enabled: row.enabled ?? true,
        });
        if (row.company_logo_url) setLogoPreview(row.company_logo_url);
        if (row.background_image_url) setBgPreview(row.background_image_url);
      }
      setLoading(false);
    };

    loadBranding();
  }, [user]);

  // Field change helpers
  const updateField = useCallback((field: string, value: string | boolean) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    setBranding((prev) => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
      background_color: preset.bg,
      text_color: preset.text,
    }));
  }, []);

  // File selection handlers
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O logo deve ter no maximo 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem valido");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem de fundo deve ter no maximo 10MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem valido");
      return;
    }
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  };

  // Upload helpers
  const uploadFile = async (
    file: File,
    type: "logo" | "bg",
  ): Promise<string | null> => {
    setUploading(type);
    const ext = file.name.split(".").pop();
    const prefix = type === "logo" ? "logo" : "bg";
    const path = `${user!.id}/${prefix}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("company-branding-logos")
      .upload(path, file);

    setUploading(null);

    if (error) {
      toast.error("Erro ao enviar ficheiro: " + error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("company-branding-logos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  // Save handler
  const handleSave = async () => {
    if (!user) return;

    if (!branding.company_name.trim()) {
      toast.error("Preencha o nome da empresa");
      return;
    }

    setSaving(true);

    let logoUrl = branding.company_logo_url;
    let bgUrl = branding.background_image_url;

    if (logoFile) {
      const uploaded = await uploadFile(logoFile, "logo");
      if (uploaded) logoUrl = uploaded;
    }

    if (bgFile) {
      const uploaded = await uploadFile(bgFile, "bg");
      if (uploaded) bgUrl = uploaded;
    }

    const payload = {
      user_id: user.id,
      company_name: branding.company_name,
      company_slogan: branding.company_slogan,
      company_logo_url: logoUrl,
      background_image_url: bgUrl,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color,
      background_color: branding.background_color,
      text_color: branding.text_color,
      overlay_style: branding.overlay_style,
      enabled: branding.enabled,
    } as any;

    if (existingId) {
      const { error } = await supabase
        .from("company_branding")
        .update(payload)
        .eq("id", existingId);

      if (error) {
        toast.error("Erro ao guardar: " + error.message);
      } else {
        setBranding((prev) => ({
          ...prev,
          company_logo_url: logoUrl,
          background_image_url: bgUrl,
        }));
        setLogoFile(null);
        setBgFile(null);
        toast.success("Branding atualizado com sucesso!");
      }
    } else {
      const { data, error } = await supabase
        .from("company_branding")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao guardar: " + error.message);
      } else {
        setExistingId((data as any).id);
        setBranding((prev) => ({
          ...prev,
          company_logo_url: logoUrl,
          background_image_url: bgUrl,
        }));
        setLogoFile(null);
        setBgFile(null);
        toast.success("Branding criado com sucesso!");
      }
    }

    setSaving(false);
  };

  // Preview helpers
  const previewLogo = logoPreview || branding.company_logo_url;
  const previewBg = bgPreview || branding.background_image_url;

  const getOverlayBorderStyle = (): React.CSSProperties => {
    switch (branding.overlay_style) {
      case "neon":
        return {
          boxShadow: `0 0 20px ${branding.accent_color}66, inset 0 0 20px ${branding.primary_color}11`,
          border: `2px solid ${branding.accent_color}44`,
        };
      case "gaming":
        return {
          boxShadow: `4px 4px 0px ${branding.accent_color}, inset 0 1px 0 ${branding.accent_color}33`,
          border: `2px solid ${branding.accent_color}`,
          borderRadius: "0",
        };
      case "classic":
        return {
          boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
          border: `1px solid ${branding.primary_color}66`,
        };
      case "minimal":
        return {
          boxShadow: `0 1px 3px rgba(0,0,0,0.12)`,
          border: `1px solid ${branding.primary_color}22`,
        };
      default:
        return {
          boxShadow: `0 8px 32px ${branding.primary_color}33`,
          border: `1px solid ${branding.primary_color}44`,
        };
    }
  };

  const getRankStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { color: branding.accent_color };
    if (rank === 2) return { color: branding.secondary_color };
    if (rank === 3) return { color: "#cd7f32" };
    return { color: branding.text_color + "99" };
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Render
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={fadeInUp}
        className="flex items-center gap-3"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.accent_color})` }}
        >
          <Palette className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Branding do Jogo
          </h1>
          <p className="text-sm text-muted-foreground">
            Personalize a identidade visual dos seus jogos ao vivo
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fadeInUp}
          >
            <Card className="glass">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" style={{ color: branding.primary_color }} />
                  Identidade da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company_name" className="mb-1.5 block">
                    Nome da Empresa
                  </Label>
                  <Input
                    id="company_name"
                    value={branding.company_name}
                    onChange={(e) => updateField("company_name", e.target.value)}
                    placeholder="Ex: Bateu Mozambique"
                  />
                </div>
                <div>
                  <Label htmlFor="company_slogan" className="mb-1.5 block">
                    Slogan / Tagline
                  </Label>
                  <Input
                    id="company_slogan"
                    value={branding.company_slogan}
                    onChange={(e) => updateField("company_slogan", e.target.value)}
                    placeholder="Ex: Onde cada aposta e uma oportunidade"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeInUp, delay: 0.05 }}
          >
            <Card className="glass">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5" style={{ color: branding.accent_color }} />
                  Temas Pre-definidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PRESETS.map((preset) => (
                    <motion.button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="group relative overflow-hidden rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
                      style={{ background: preset.bg }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      transition={scaleIn}
                    >
                      <div className="mb-2 flex gap-1.5">
                        <div className="h-4 w-4 rounded-full" style={{ background: preset.primary }} />
                        <div className="h-4 w-4 rounded-full" style={{ background: preset.secondary }} />
                        <div className="h-4 w-4 rounded-full" style={{ background: preset.accent }} />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: preset.text }}>
                        {preset.name}
                      </p>
                      <div
                        className="absolute inset-x-0 bottom-0 h-0.5 transition-all group-hover:h-1"
                        style={{ background: `linear-gradient(90deg, ${preset.primary}, ${preset.accent})` }}
                      />
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeInUp, delay: 0.1 }}
          >
            <Card className="glass">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" style={{ color: branding.primary_color }} />
                  Cores da Marca
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Cor Primaria
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => updateField("primary_color", e.target.value)}
                        className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={branding.primary_color}
                        onChange={(e) => updateField("primary_color", e.target.value)}
                        className="h-10 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Cor Secundaria
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={branding.secondary_color}
                        onChange={(e) => updateField("secondary_color", e.target.value)}
                        className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={branding.secondary_color}
                        onChange={(e) => updateField("secondary_color", e.target.value)}
                        className="h-10 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Cor de Destaque
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => updateField("accent_color", e.target.value)}
                        className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={branding.accent_color}
                        onChange={(e) => updateField("accent_color", e.target.value)}
                        className="h-10 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Cor de Fundo
                    </Label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={branding.background_color}
                        onChange={(e) => updateField("background_color", e.target.value)}
                        className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={branding.background_color}
                        onChange={(e) => updateField("background_color", e.target.value)}
                        className="h-10 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Cor do Texto
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={branding.text_color}
                      onChange={(e) => updateField("text_color", e.target.value)}
                      className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={branding.text_color}
                      onChange={(e) => updateField("text_color", e.target.value)}
                      className="h-10 flex-1 font-mono text-sm"
                    />
                    <div
                      className="flex h-10 w-20 items-center justify-center rounded-lg border border-border text-xs font-medium"
                      style={{
                        background: branding.background_color,
                        color: branding.text_color,
                      }}
                    >
                      Preview
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeInUp, delay: 0.15 }}
          >
            <Card className="glass">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" style={{ color: branding.secondary_color }} />
                  Logo e Fundo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                <div>
                  <Label className="mb-2 block text-sm font-medium">Logotipo da Empresa</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />

                  {previewLogo ? (
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={previewLogo}
                          alt="Company logo"
                          className="h-20 w-20 rounded-xl object-cover border border-border shadow-sm"
                        />
                        <button
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                            updateField("company_logo_url", "");
                            if (logoInputRef.current) logoInputRef.current.value = "";
                          }}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" /> Trocar Logo
                        </Button>
                        {logoFile && (
                          <p className="text-[11px] flex items-center gap-1" style={{ color: branding.accent_color }}>
                            <ImageIcon className="h-3 w-3" /> Novo ficheiro: {logoFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/40"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-6 w-6 mb-1.5" />
                        <p className="text-xs font-medium">Enviar logotipo</p>
                        <p className="text-[10px] text-muted-foreground">PNG, JPG ate 5MB</p>
                      </div>
                    </button>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block text-sm font-medium">Imagem de Fundo</Label>
                  <input
                    ref={bgInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgSelect}
                    className="hidden"
                  />

                  {previewBg ? (
                    <div className="space-y-2">
                      <div className="relative h-24 overflow-hidden rounded-xl border border-border shadow-sm">
                        <img
                          src={previewBg}
                          alt="Background"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <button
                          onClick={() => {
                            setBgFile(null);
                            setBgPreview(null);
                            updateField("background_image_url", "");
                            if (bgInputRef.current) bgInputRef.current.value = "";
                          }}
                          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bgInputRef.current?.click()}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" /> Trocar Fundo
                        </Button>
                        {bgFile && (
                          <p className="text-[11px] flex items-center gap-1" style={{ color: branding.accent_color }}>
                            <ImageIcon className="h-3 w-3" /> Novo ficheiro: {bgFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/40"
                    >
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-6 w-6 mb-1.5" />
                        <p className="text-xs font-medium">Enviar imagem de fundo</p>
                        <p className="text-[10px] text-muted-foreground">PNG, JPG ate 10MB</p>
                      </div>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeInUp, delay: 0.2 }}
          >
            <Card className="glass">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5" style={{ color: branding.accent_color }} />
                  Estilo do Overlay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  {OVERLAY_STYLES.map((style) => {
                    const isSelected = branding.overlay_style === style.id;
                    return (
                      <motion.button
                        key={style.id}
                        onClick={() => updateField("overlay_style", style.id)}
                        className="relative flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all"
                        style={{
                          background: isSelected
                            ? `${branding.primary_color}18`
                            : "transparent",
                          border: `2px solid ${
                            isSelected ? branding.primary_color : "transparent"
                          }`,
                        }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        transition={scaleIn}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            background: isSelected
                              ? branding.primary_color
                              : branding.primary_color + "33",
                            color: isSelected ? "#ffffff" : branding.primary_color,
                          }}
                        >
                          {style.icon}
                        </div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: isSelected ? branding.primary_color : "var(--foreground)" }}
                        >
                          {style.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {style.desc}
                        </p>
                        {isSelected && (
                          <motion.div
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center"
                            style={{ background: branding.primary_color }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={scaleIn}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeInUp, delay: 0.25 }}
            className="pb-8"
          >
            <Button
              onClick={handleSave}
              disabled={saving || uploading !== null}
              className="w-full gap-2 glow-primary"
              size="lg"
            >
              {saving || uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {uploading === "logo"
                ? "A enviar logo..."
                : uploading === "bg"
                  ? "A enviar fundo..."
                  : saving
                    ? "A guardar..."
                    : existingId
                      ? "Atualizar Branding"
                      : "Guardar Branding"}
            </Button>
          </motion.div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={fadeInUpSlow}
          >
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: branding.primary_color }} />
              <span className="text-sm font-semibold text-foreground">Pre-visualizacao ao Vivo</span>
            </div>

            <div
              className="relative overflow-hidden"
              style={{
                ...getOverlayBorderStyle(),
                borderRadius:
                  branding.overlay_style === "gaming" ? "0" : "16px",
              }}
            >
              <div
                className="relative min-h-[180px] p-5"
                style={{
                  background: previewBg
                    ? `url(${previewBg}) center/cover no-repeat`
                    : branding.background_color,
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: previewBg
                      ? `linear-gradient(135deg, ${branding.background_color}ee, ${branding.background_color}88)`
                      : "none",
                  }}
                />

                {branding.overlay_style === "neon" && (
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `radial-gradient(ellipse at top, ${branding.primary_color}44 0%, transparent 60%)`,
                    }}
                  />
                )}

                <div className="relative z-10 flex items-start gap-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={previewLogo || "placeholder"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={scaleIn}
                    >
                      {previewLogo ? (
                        <img
                          src={previewLogo}
                          alt="Logo"
                          className="h-14 w-14 rounded-xl object-cover shadow-lg"
                          style={{
                            border: `2px solid ${branding.primary_color}44`,
                          }}
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`,
                            color: "#ffffff",
                            border: `2px solid ${branding.primary_color}44`,
                          }}
                        >
                          {branding.company_name.charAt(0) || "B"}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex-1 min-w-0">
                    <h2
                      className="font-display text-xl font-bold truncate"
                      style={{ color: branding.text_color }}
                    >
                      {branding.company_name || "Nome da Empresa"}
                    </h2>
                    <p
                      className="text-sm mt-0.5 truncate"
                      style={{ color: branding.text_color + "99" }}
                    >
                      {branding.company_slogan || "Slogan da sua empresa"}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <motion.div
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: "#ef4444",
                          color: "#ffffff",
                        }}
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        AO VIVO
                      </motion.div>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: branding.text_color + "77" }}
                      >
                        1.2k espectadores
                      </span>
                    </div>
                  </div>
                </div>

                {branding.overlay_style === "gaming" && (
                  <div
                    className="absolute top-0 right-0 h-24 w-24 opacity-20"
                    style={{
                      background: `linear-gradient(135deg, transparent 50%, ${branding.accent_color} 50%)`,
                    }}
                  />
                )}
                {branding.overlay_style === "modern" && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{
                      background: `linear-gradient(90deg, ${branding.primary_color}, ${branding.accent_color}, ${branding.secondary_color})`,
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...fadeInUpSlow, delay: 0.08 }}
            style={{
              ...getOverlayBorderStyle(),
              borderRadius:
                branding.overlay_style === "gaming" ? "0" : "16px",
            }}
          >
            <div
              className="p-5"
              style={{ background: branding.background_color }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: branding.accent_color }} />
                  <span
                    className="font-display text-sm font-bold"
                    style={{ color: branding.text_color }}
                  >
                    Leaderboard
                  </span>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    background: branding.primary_color + "22",
                    color: branding.primary_color,
                  }}
                >
                  RODADA #42
                </span>
              </div>

              <div className="space-y-2">
                {MOCK_LEADERBOARD.map((entry, index) => (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      ...staggerChildren,
                      delay: index * 0.06,
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                    style={{
                      background:
                        entry.rank <= 3
                          ? `${branding.primary_color}11`
                          : "transparent",
                      border: `1px solid ${
                        entry.rank === 1
                          ? branding.accent_color + "33"
                          : "transparent"
                      }`,
                      borderRadius:
                        branding.overlay_style === "gaming" ? "0" : "8px",
                    }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center text-sm font-bold">
                      {entry.rank === 1 ? (
                        <Crown className="h-5 w-5" style={{ color: branding.accent_color }} />
                      ) : (
                        <span style={getRankStyle(entry.rank)}>
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`,
                        color: "#ffffff",
                      }}
                    >
                      {entry.name.charAt(0)}
                    </div>

                    <span
                      className="flex-1 text-sm font-medium truncate"
                      style={{ color: branding.text_color }}
                    >
                      {entry.name}
                    </span>

                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{
                        color:
                          entry.rank === 1
                            ? branding.accent_color
                            : branding.text_color,
                      }}
                    >
                      {entry.score.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 h-0.5 w-full" style={{
                background: `linear-gradient(90deg, ${branding.primary_color}44, ${branding.accent_color}22, transparent)`,
              }} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...fadeInUpSlow, delay: 0.16 }}
            className="flex h-10 overflow-hidden"
            style={{
              borderRadius:
                branding.overlay_style === "gaming" ? "0" : "12px",
            }}
          >
            <div className="flex-1" style={{ background: branding.primary_color }} />
            <div className="flex-1" style={{ background: branding.secondary_color }} />
            <div className="flex-1" style={{ background: branding.accent_color }} />
            <div className="flex-1" style={{ background: branding.background_color }} />
            <div
              className="flex flex-1 items-center justify-center text-[10px] font-bold"
              style={{
                background: branding.text_color,
                color: branding.background_color,
              }}
            >
              Aa
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
