import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings, Palette, Gamepad2, BarChart3, Users, Globe, Save, RefreshCw,
  Plus, ToggleLeft, ToggleRight, Zap, Shield, Crown, Eye, Megaphone,
  TrendingUp, DollarSign, Activity, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { COUNTRIES, getRegions } from "@/lib/regions";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };

export default function RegionalManagerPanel() {
  const { user, profile } = useAuth();
  const { region, rt } = useRegionalTheme();
  const [activeTab, setActiveTab] = useState("branding");
  const [saving, setSaving] = useState(false);
  const [managerData, setManagerData] = useState<any>(null);
  const [regionStats, setRegionStats] = useState({ users: 0, games: 0, revenue: 0, lives: 0 });

  const [branding, setBranding] = useState({
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    theme_name: "",
    logo_url: "",
    banner_url: "",
  });

  const [settings, setSettings] = useState({
    enable_spin_wheel: true,
    enable_millionaire_game: true,
    enable_challenge_games: true,
    enable_live_games: true,
    maintenance_mode: false,
  });

  const [announcement, setAnnouncement] = useState({
    enabled: false,
    text: "",
    cta_label: "",
    cta_url: "",
  });

  const [nativeGames, setNativeGames] = useState<any[]>([]);

  const loadManagerData = useCallback(async () => {
    if (!user) return;
    const { data } = await sb.from("regional_managers").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setManagerData(data);
  }, [user]);

  const loadRegionStats = useCallback(async () => {
    if (!region?.id) return;
    const [usersRes, gamesRes, livesRes] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }).limit(1),
      sb.from("spin_wheel_games").select("id", { count: "exact", head: true }).eq("region_id", region.id).limit(1),
      sb.from("scheduled_lives").select("id", { count: "exact", head: true }).eq("region_id", region.id).limit(1),
    ]);
    setRegionStats({
      users: usersRes.count || 0,
      games: gamesRes.count || 0,
      revenue: 0,
      lives: livesRes.count || 0,
    });
  }, [region]);

  const loadBranding = useCallback(async () => {
    if (!region?.id) return;
    const { data } = await sb.from("regional_branding").select("*").eq("region_id", region.id).maybeSingle();
    if (data) {
      setBranding({
        primary_color: data.primary_color || "",
        secondary_color: data.secondary_color || "",
        accent_color: data.accent_color || "",
        theme_name: data.theme_name || "",
        logo_url: data.logo_url || "",
        banner_url: data.banner_url || "",
      });
    }
  }, [region]);

  const loadSettings = useCallback(async () => {
    if (!region?.id) return;
    const { data } = await sb.from("regional_settings").select("*").eq("region_id", region.id).maybeSingle();
    if (data) {
      setSettings({
        enable_spin_wheel: data.enable_spin_wheel ?? true,
        enable_millionaire_game: data.enable_millionaire_game ?? true,
        enable_challenge_games: data.enable_challenge_games ?? true,
        enable_live_games: data.enable_live_games ?? true,
        maintenance_mode: data.maintenance_mode ?? false,
      });
    }
  }, [region]);

  const loadAnnouncement = useCallback(async () => {
    if (!region?.id) return;
    const { data } = await sb.from("regional_announcements").select("*").eq("region_id", region.id).maybeSingle();
    if (data) {
      setAnnouncement({
        enabled: data.enabled ?? false,
        text: data.text || "",
        cta_label: data.cta_label || "",
        cta_url: data.cta_url || "",
      });
    }
  }, [region]);

  const loadNativeGames = useCallback(async () => {
    if (!region?.id) return;
    const { data } = await sb.from("native_games").select("*").eq("region_id", region.id).order("created_at", { ascending: false });
    setNativeGames(data || []);
  }, [region]);

  useEffect(() => {
    loadManagerData();
    loadRegionStats();
    loadBranding();
    loadSettings();
    loadNativeGames();
    loadAnnouncement();
  }, [loadManagerData, loadRegionStats, loadBranding, loadSettings, loadNativeGames, loadAnnouncement]);

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const payload = { ...branding, region_id: region?.id, updated_at: new Date().toISOString() };
      const { error } = await sb.from("regional_branding").upsert(payload, { onConflict: "region_id" });
      if (error) throw error;
      toast.success("Branding saved successfully!");
    } catch (err) {
      toast.error("Could not save branding");
    }
    setSaving(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, region_id: region?.id, updated_at: new Date().toISOString() };
      const { error } = await sb.from("regional_settings").upsert(payload, { onConflict: "region_id" });
      if (error) throw error;
      toast.success("Settings saved!");
    } catch (err) {
      toast.error("Could not save settings");
    }
    setSaving(false);
  };

  const handleSaveAnnouncement = async () => {
    setSaving(true);
    try {
      const payload = { ...announcement, region_id: region?.id, updated_by: user?.id };
      const { error } = await sb.from("regional_announcements").upsert(payload, { onConflict: "region_id" });
      if (error) throw error;
      toast.success("Announcement saved!");
    } catch (err) {
      toast.error("Could not save the announcement");
    }
    setSaving(false);
  };

  const handleCreateGame = async () => {
    setSaving(true);
    try {
      const newGame = {
        region_id: region?.id,
        name: "New Game " + (nativeGames.length + 1),
        type: "custom",
        is_active: false,
        config: {},
        created_by: user?.id,
      };
      const { data, error } = await sb.from("native_games").insert(newGame).select().single();
      if (error) throw error;
      setNativeGames((prev) => [data, ...prev]);
      toast.success("Game created! Configure it below.");
    } catch (err) {
      toast.error("Could not create the game");
    }
    setSaving(false);
  };

  const handleToggleGame = async (game: any) => {
    const next = !game.is_active;
    setNativeGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, is_active: next } : g)));
    const { error } = await sb.from("native_games").update({ is_active: next }).eq("id", game.id);
    if (error) {
      setNativeGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, is_active: !next } : g)));
      toast.error("Could not update the game");
      return;
    }
    toast.success(next ? "Game activated" : "Game deactivated");
  };

  const handleRenameGame = async (game: any, name: string) => {
    if (!name.trim() || name === game.name) return;
    setNativeGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, name } : g)));
    const { error } = await sb.from("native_games").update({ name }).eq("id", game.id);
    if (error) toast.error("Could not rename the game");
  };

  const statCards = [
    { icon: Users, label: "Users", value: regionStats.users, color: "from-blue-500 to-cyan-400" },
    { icon: Gamepad2, label: "Active games", value: regionStats.games, color: "from-violet-500 to-purple-400" },
    { icon: Radio, label: "Lives hosted", value: regionStats.lives, color: "from-red-500 to-orange-400" },
    { icon: DollarSign, label: "Revenue", value: regionStats.revenue, color: "from-emerald-500 to-green-400" },
  ];

  const countryInfo = COUNTRIES.find((c) => c.code === region?.country_code);
  const managerRole = managerData?.role === "senior_manager" ? "Senior Manager" : "Regional Manager";
  const managerRegions = managerData?.region_ids || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-b">
        <div className="container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-display">Regional Manager Panel</h1>
                  <p className="text-sm text-muted-foreground">Manage your region independently</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">{managerRole}</span>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-accent/10 text-accent">{countryInfo?.flag} {countryInfo?.label || region?.label}</span>
                {managerRegions.length > 0 && (
                  <span className="text-xs px-3 py-1 rounded-full border border-border bg-card">{managerRegions.length} region(s)</span>
                )}
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => { loadRegionStats(); loadBranding(); loadSettings(); loadNativeGames(); }}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING, delay: 0.15 + i * 0.05 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4">
                <div className={"flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br " + s.color + " mb-2"}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-muted/50 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="branding" className="gap-2 data-[state=active]:bg-background"><Palette className="w-4 h-4" /> Branding</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-background"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
            <TabsTrigger value="games" className="gap-2 data-[state=active]:bg-background"><Gamepad2 className="w-4 h-4" /> Native Games</TabsTrigger>
            <TabsTrigger value="announcement" className="gap-2 data-[state=active]:bg-background"><Megaphone className="w-4 h-4" /> Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Card className="neon-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Regional Visual Identity</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Primary color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={branding.primary_color} onChange={(e) => setBranding((p) => ({ ...p, primary_color: e.target.value }))} className="h-10 w-14 rounded-lg border cursor-pointer" />
                      <Input value={branding.primary_color} onChange={(e) => setBranding((p) => ({ ...p, primary_color: e.target.value }))} placeholder="hsl(220 70% 18%)" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={branding.secondary_color} onChange={(e) => setBranding((p) => ({ ...p, secondary_color: e.target.value }))} className="h-10 w-14 rounded-lg border cursor-pointer" />
                      <Input value={branding.secondary_color} onChange={(e) => setBranding((p) => ({ ...p, secondary_color: e.target.value }))} placeholder="hsl(352 73% 50%)" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={branding.accent_color} onChange={(e) => setBranding((p) => ({ ...p, accent_color: e.target.value }))} className="h-10 w-14 rounded-lg border cursor-pointer" />
                      <Input value={branding.accent_color} onChange={(e) => setBranding((p) => ({ ...p, accent_color: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme name</Label>
                    <Input value={branding.theme_name} onChange={(e) => setBranding((p) => ({ ...p, theme_name: e.target.value }))} placeholder="e.g. Bateu India" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={branding.logo_url} onChange={(e) => setBranding((p) => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Banner URL</Label>
                    <Input value={branding.banner_url} onChange={(e) => setBranding((p) => ({ ...p, banner_url: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveBranding} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save branding"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="neon-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Region Settings</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "enable_spin_wheel" as const, label: "Spin Wheel", desc: "Allow a customised spin wheel", icon: Gamepad2 },
                  { key: "enable_millionaire_game" as const, label: "Millionaire Quiz", desc: "Quiz game with prizes", icon: TrendingUp },
                  { key: "enable_challenge_games" as const, label: "Challenge Games", desc: "Challenges between players", icon: Zap },
                  { key: "enable_live_games" as const, label: "Live Games", desc: "Interactive live shows with games", icon: Activity },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch checked={settings[item.key]} onCheckedChange={(v) => setSettings((p) => ({ ...p, [item.key]: v }))} />
                  </div>
                ))}
                <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                      <Shield className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Maintenance mode</p>
                      <p className="text-xs text-muted-foreground">Temporarily disable this region for visitors</p>
                    </div>
                  </div>
                  <Switch checked={settings.maintenance_mode} onCheckedChange={(v) => setSettings((p) => ({ ...p, maintenance_mode: v }))} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Regional Native Games</h3>
                  <p className="text-sm text-muted-foreground">Create and manage games exclusive to your region</p>
                </div>
                <Button onClick={handleCreateGame} disabled={saving} className="gap-2">
                  <Plus className="w-4 h-4" /> {saving ? "..." : "Create game"}
                </Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nativeGames.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No native games created yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click "Create game" to get started.</p>
                  </div>
                )}
                {nativeGames.map((game, i) => (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: i * 0.05 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 card-glow-hover">
                    <div className="flex items-center justify-between mb-3">
                      <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (game.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>{game.is_active ? "Active" : "Inactive"}</span>
                      <span className="text-[10px] text-muted-foreground">{game.type}</span>
                    </div>
                    <h4 className="font-bold mb-1">{game.name}</h4>
                    <p className="text-xs text-muted-foreground">Created {new Date(game.created_at).toLocaleDateString("en-US")}</p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant={game.is_active ? "secondary" : "default"} className="flex-1 gap-1 text-xs" onClick={() => handleToggleGame(game)}>
                        {game.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                        {game.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
                        const name = window.prompt("Game name", game.name);
                        if (name !== null) handleRenameGame(game, name);
                      }}>
                        <Settings className="w-3 h-3" /> Rename
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="announcement">
            <Card className="neon-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Regional Announcement</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/30">
                  <div>
                    <p className="text-sm font-semibold">Announcement active</p>
                    <p className="text-xs text-muted-foreground">Show an announcement banner at the top of the page</p>
                  </div>
                  <Switch checked={announcement.enabled} onCheckedChange={(v) => setAnnouncement((p) => ({ ...p, enabled: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Announcement text</Label>
                  <Textarea value={announcement.text} onChange={(e) => setAnnouncement((p) => ({ ...p, text: e.target.value }))} placeholder="e.g. Big Diwali giveaway!" rows={3} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA button label</Label>
                    <Input value={announcement.cta_label} onChange={(e) => setAnnouncement((p) => ({ ...p, cta_label: e.target.value }))} placeholder="Join now" />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA URL</Label>
                    <Input value={announcement.cta_url} onChange={(e) => setAnnouncement((p) => ({ ...p, cta_url: e.target.value }))} placeholder="/marketplace" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveAnnouncement} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save announcement"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
