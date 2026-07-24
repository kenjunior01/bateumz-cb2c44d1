import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, Edit3, MapPin, Mail, Shield, Search,
  ChevronDown, ChevronUp, Globe, BarChart3, UserCheck, AlertTriangle,
  X, Check, Loader2, Eye, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUNTRIES, REGIONS_BY_COUNTRY } from "@/lib/regions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RegionalManager {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  avatar_url?: string;
  region_ids: string[];
  is_active: boolean;
  role: "manager" | "senior_manager";
  created_at: string;
  last_login?: string;
  stats?: ManagerStats;
}

interface ManagerStats {
  total_users: number;
  total_revenue: number;
  active_lives: number;
  total_games: number;
}

interface Region {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  description?: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  manager_id?: string;
  user_count?: number;
  created_at: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português (PT)" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

const CURRENCIES = [
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "BRL", label: "BRL (R$)", symbol: "R$" },
  { code: "MZN", label: "MZN (MT)", symbol: "MT" },
  { code: "AOA", label: "AOA (Kz)", symbol: "Kz" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
];

export default function AdminRegionalManagers() {
  const { t } = useLanguage();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("managers");
  const [managers, setManagers] = useState<RegionalManager[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedManager, setExpandedManager] = useState<string | null>(null);

  // Manager dialog
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<RegionalManager | null>(null);
  const [managerForm, setManagerForm] = useState({
    email: "",
    name: "",
    role: "manager" as "manager" | "senior_manager",
    region_ids: [] as string[],
    is_active: true,
  });
  const [savingManager, setSavingManager] = useState(false);

  // Region dialog
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionForm, setRegionForm] = useState({
    name: "",
    country_code: "",
    description: "",
    language_code: "en",
    currency_code: "USD",
    timezone: "UTC",
    is_active: true,
  });
  const [savingRegion, setSavingRegion] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "manager" | "region"; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [managersRes, regionsRes] = await Promise.all([
        supabase.from("regional_managers").select("*").order("created_at", { ascending: false }),
        supabase.from("regions").select("*").order("country_code", { ascending: true }),
      ]);
      if (managersRes.data) setManagers(managersRes.data as RegionalManager[]);
      if (regionsRes.data) setRegions(regionsRes.data as Region[]);
    } catch (err) {
      console.error("Error loading regional data:", err);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ===== Manager CRUD =====
  const openAddManager = () => {
    setEditingManager(null);
    setManagerForm({ email: "", name: "", role: "manager", region_ids: [], is_active: true });
    setManagerDialogOpen(true);
  };

  const openEditManager = (m: RegionalManager) => {
    setEditingManager(m);
    setManagerForm({
      email: m.user_email || "",
      name: m.user_name || "",
      role: m.role,
      region_ids: m.region_ids || [],
      is_active: m.is_active,
    });
    setManagerDialogOpen(true);
  };

  const handleSaveManager = async () => {
    if (!managerForm.email || !managerForm.name) {
      toast.error(t("regional.managerName") + " / " + t("regional.managerEmail") + " required");
      return;
    }
    setSavingManager(true);
    try {
      if (editingManager) {
        const { error } = await supabase
          .from("regional_managers")
          .update({
            user_name: managerForm.name,
            role: managerForm.role,
            region_ids: managerForm.region_ids,
            is_active: managerForm.is_active,
          })
          .eq("id", editingManager.id);
        if (error) throw error;
        toast.success(t("common.save") + "!");
      } else {
        const { error } = await supabase
          .from("regional_managers")
          .insert({
            user_email: managerForm.email,
            user_name: managerForm.name,
            role: managerForm.role,
            region_ids: managerForm.region_ids,
            is_active: managerForm.is_active,
          });
        if (error) throw error;
        toast.success(t("regional.addManager") + "!");
      }
      setManagerDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error saving manager");
    } finally {
      setSavingManager(false);
    }
  };

  // ===== Region CRUD =====
  const openAddRegion = () => {
    setEditingRegion(null);
    setRegionForm({ name: "", country_code: "", description: "", language_code: "en", currency_code: "USD", timezone: "UTC", is_active: true });
    setRegionDialogOpen(true);
  };

  const openEditRegion = (r: Region) => {
    setEditingRegion(r);
    setRegionForm({
      name: r.name,
      country_code: r.country_code,
      description: r.description || "",
      language_code: r.language_code,
      currency_code: r.currency_code,
      timezone: r.timezone,
      is_active: r.is_active,
    });
    setRegionDialogOpen(true);
  };

  const handleSaveRegion = async () => {
    if (!regionForm.name || !regionForm.country_code) {
      toast.error(t("regional.name") + " / " + t("regional.country") + " required");
      return;
    }
    setSavingRegion(true);
    try {
      const country = COUNTRIES.find(c => c.code === regionForm.country_code);
      const payload = {
        ...regionForm,
        country_name: country?.label || regionForm.country_code,
      };
      if (editingRegion) {
        const { error } = await supabase.from("regions").update(payload).eq("id", editingRegion.id);
        if (error) throw error;
        toast.success(t("common.save") + "!");
      } else {
        const { error } = await supabase.from("regions").insert(payload);
        if (error) throw error;
        toast.success(t("regional.createRegion") + "!");
      }
      setRegionDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error saving region");
    } finally {
      setSavingRegion(false);
    }
  };

  // ===== Delete =====
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const table = deleteTarget.type === "manager" ? "regional_managers" : "regions";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(t("regional.removeManager"));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error deleting");
    } finally {
      setDeleting(false);
    }
  };

  const filteredManagers = managers.filter(m =>
    m.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRegionName = (regionId: string) => {
    const r = regions.find(r => r.id === regionId);
    return r?.name || regionId;
  };

  const getCountryFlag = (code: string) => {
    return COUNTRIES.find(c => c.code === code)?.flag || "🌍";
  };

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                <Globe className="inline h-8 w-8 mr-2 text-cyan-400" />
                {t("regional.title")}
              </h1>
              <p className="text-slate-400 mt-1">{t("regional.dashboard")} — {t("regional.managers")} & {t("regional.regions")}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openAddManager} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20">
                <Plus className="h-4 w-4 mr-2" /> {t("regional.addManager")}
              </Button>
              <Button onClick={openAddRegion} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <MapPin className="h-4 w-4 mr-2" /> {t("regional.createRegion")}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { icon: Users, label: t("regional.managers"), value: managers.length, color: "from-cyan-500 to-blue-600", shadow: "shadow-cyan-500/20" },
            { icon: MapPin, label: t("regional.regions"), value: regions.length, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
            { icon: UserCheck, label: t("regional.users"), value: managers.reduce((a, m) => a + (m.stats?.total_users || 0), 0).toLocaleString(), color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20" },
            { icon: BarChart3, label: t("regional.revenue"), value: "$" + managers.reduce((a, m) => a + (m.stats?.total_revenue || 0), 0).toLocaleString(), color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20" },
          ].map((stat, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden relative group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <CardContent className="p-5 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                    <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/80 border border-slate-800 p-1 rounded-2xl">
            <TabsTrigger value="managers" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> {t("regional.managers")}
            </TabsTrigger>
            <TabsTrigger value="regions" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
              <MapPin className="h-4 w-4 mr-2" /> {t("regional.regions")}
            </TabsTrigger>
          </TabsList>

          {/* MANAGERS TAB */}
          <TabsContent value="managers" className="mt-6">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder={`${t("common.search")}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 rounded-xl h-12"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
            ) : filteredManagers.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <Users className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-semibold">{t("regional.noManagers")}</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredManagers.map((manager) => (
                    <motion.div
                      key={manager.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card
                        className="bg-slate-900/50 border-slate-800 backdrop-blur-sm cursor-pointer hover:border-slate-700 transition-all duration-300 overflow-hidden"
                        onClick={() => setExpandedManager(expandedManager === manager.id ? null : manager.id)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${manager.role === "senior_manager" ? "from-amber-500 to-orange-600" : "from-cyan-500 to-blue-600"} flex items-center justify-center text-white font-black text-lg shadow-lg`}
                            >
                              {manager.user_name?.charAt(0)?.toUpperCase() || "?"}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${manager.is_active ? "bg-emerald-400" : "bg-slate-600"}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-bold truncate">{manager.user_name}</h3>
                                <Badge variant={manager.role === "senior_manager" ? "default" : "secondary"}
                                  className={manager.role === "senior_manager" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-800 text-slate-400"}
                                >
                                  {manager.role === "senior_manager" ? "Senior" : "Manager"}
                                </Badge>
                                {!manager.is_active && <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">Inactive</Badge>}
                              </div>
                              <p className="text-sm text-slate-500 truncate">{manager.user_email}</p>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {manager.region_ids?.length || 0} {t("regional.assignedRegions").toLowerCase()}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white" onClick={(e) => { e.stopPropagation(); openEditManager(manager); }}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "manager", id: manager.id, name: manager.user_name || "" }); setDeleteDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {expandedManager === manager.id ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {expandedManager === manager.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t("regional.users")}</p>
                                    <p className="text-xl font-black text-white">{(manager.stats?.total_users || 0).toLocaleString()}</p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t("regional.revenue")}</p>
                                    <p className="text-xl font-black text-emerald-400">${(manager.stats?.total_revenue || 0).toLocaleString()}</p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t("regional.activeLives")}</p>
                                    <p className="text-xl font-black text-cyan-400">{manager.stats?.active_lives || 0}</p>
                                  </div>
                                  <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t("regional.totalGames")}</p>
                                    <p className="text-xl font-black text-violet-400">{manager.stats?.total_games || 0}</p>
                                  </div>
                                </div>
                                {(manager.region_ids?.length || 0) > 0 && (
                                  <div className="mt-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{t("regional.assignedRegions")}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {manager.region_ids.map(rid => (
                                        <Badge key={rid} variant="outline" className="border-slate-700 text-slate-400 bg-slate-800/50">
                                          {getCountryFlag(regions.find(r => r.id === rid)?.country_code || "")} {getRegionName(rid)}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* REGIONS TAB */}
          <TabsContent value="regions" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {regions.map((region) => (
                    <motion.div
                      key={region.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-all duration-300 group overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{getCountryFlag(region.country_code)}</span>
                              <div>
                                <CardTitle className="text-white text-base font-bold">{region.name}</CardTitle>
                                <p className="text-xs text-slate-500">{region.country_code} · {region.language_code.toUpperCase()} · {region.currency_code}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditRegion(region)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setDeleteTarget({ type: "region", id: region.id, name: region.name }); setDeleteDialogOpen(true); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {region.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{region.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {region.user_count || 0}</span>
                            <Badge variant={region.is_active ? "default" : "secondary"} className={region.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400"}>
                              {region.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== MANAGER DIALOG ===== */}
      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingManager ? t("regional.editRegion").replace("Region", "Manager") : t("regional.addManager")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.managerName")}</Label>
              <Input value={managerForm.name} onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })} className="bg-slate-800 border-slate-700" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.managerEmail")}</Label>
              <Input type="email" value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} className="bg-slate-800 border-slate-700" placeholder="manager@company.com" disabled={!!editingManager} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Role</Label>
              <Select value={managerForm.role} onValueChange={(v) => setManagerForm({ ...managerForm, role: v as any })}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="senior_manager">Senior Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.assignedRegions")}</Label>
              <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 p-2 space-y-1">
                {regions.map(region => (
                  <label key={region.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={managerForm.region_ids.includes(region.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setManagerForm({ ...managerForm, region_ids: [...managerForm.region_ids, region.id] });
                        } else {
                          setManagerForm({ ...managerForm, region_ids: managerForm.region_ids.filter(id => id !== region.id) });
                        }
                      }}
                      className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-300">{getCountryFlag(region.country_code)} {region.name}</span>
                  </label>
                ))}
                {regions.length === 0 && <p className="text-xs text-slate-600 text-center py-2">No regions created yet</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-400">Active</Label>
              <Switch checked={managerForm.is_active} onCheckedChange={(v) => setManagerForm({ ...managerForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManagerDialogOpen(false)} className="border-slate-700 text-slate-300">{t("regional.cancel")}</Button>
            <Button onClick={handleSaveManager} disabled={savingManager} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
              {savingManager && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t("regional.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== REGION DIALOG ===== */}
      <Dialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingRegion ? t("regional.editRegion") : t("regional.createRegion")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.name")}</Label>
              <Input value={regionForm.name} onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })} className="bg-slate-800 border-slate-700" placeholder="e.g. Mozambique" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.country")}</Label>
              <Select value={regionForm.country_code} onValueChange={(v) => setRegionForm({ ...regionForm, country_code: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">{t("regional.description")}</Label>
              <Textarea value={regionForm.description} onChange={(e) => setRegionForm({ ...regionForm, description: e.target.value })} className="bg-slate-800 border-slate-700" rows={2} placeholder="Optional description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">{t("regional.language")}</Label>
                <Select value={regionForm.language_code} onValueChange={(v) => setRegionForm({ ...regionForm, language_code: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">{t("regional.currency")}</Label>
                <Select value={regionForm.currency_code} onValueChange={(v) => setRegionForm({ ...regionForm, currency_code: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Timezone</Label>
              <Input value={regionForm.timezone} onChange={(e) => setRegionForm({ ...regionForm, timezone: e.target.value })} className="bg-slate-800 border-slate-700" placeholder="UTC" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-400">Active</Label>
              <Switch checked={regionForm.is_active} onCheckedChange={(v) => setRegionForm({ ...regionForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRegionDialogOpen(false)} className="border-slate-700 text-slate-300">{t("regional.cancel")}</Button>
            <Button onClick={handleSaveRegion} disabled={savingRegion} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
              {savingRegion && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t("regional.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> {t("regional.removeManager")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">{t("regional.confirmRemove")}</p>
          <p className="text-white font-bold">{deleteTarget?.name}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-slate-700 text-slate-300">{t("regional.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t("regional.removeManager")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
