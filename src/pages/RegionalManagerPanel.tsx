import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Settings, Palette, Gamepad2, Users, Globe, Save, RefreshCw,
  Plus, Zap, Shield, Crown, Eye, Megaphone, Coins, Dices, Banknote, Percent,
  TrendingUp, Activity, Radio, DollarSign, ArrowUpRight, ArrowDownRight,
  Clock, CreditCard, Wallet, Filter, Search,
  CheckCircle2, XCircle, AlertTriangle, Bell, PieChart,
  Hash, HandCoins, Receipt, Building2, UserPlus, BadgeDollarSign
} from "lucide-react";
import { formatMoney, type SupportedCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COUNTRIES } from "@/lib/regions";
import { getPaymentMethodsForCountry, groupMethodsByCategory, PAYMENT_CATEGORY_LABELS, type PaymentMethodItem } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;
const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };

const regionalGameData: Record<string, { games: { name: string; emoji: string; desc: string }[]; emoji: string; label: string }> = {
  IN: { games: [{ name: 'Teen Patti', emoji: '\u{1F0CF}', desc: 'Jogo de cartas indiano popular' }, { name: 'Carrom', emoji: '\u26AB', desc: 'Jogo de tabuleiro de precisão' }, { name: 'Kabaddi Raid', emoji: '\u{1F93C}', desc: 'Simulação do desporto Kabaddi' }, { name: 'Ludo', emoji: '\u{1F3B2}', desc: 'Jogo de tabuleiro clássico' }, { name: 'Uruse (Mancala)', emoji: '\u{1FAD8}', desc: 'Jogo de sementes tradicional' }], emoji: '\u{1F1EE}\u{1F1F3}', label: 'Jogos Indianos' },
  BR: { games: [{ name: 'Bicho', emoji: '\u{1F98E}', desc: 'Jogo de sorteio popular' }, { name: 'Dominó', emoji: '\u265F', desc: 'Dominó clássico' }, { name: 'Truco', emoji: '\u{1F0CF}', desc: 'Jogo de cartas de bluff' }], emoji: '\u{1F1E7}\u{1F1F7}', label: 'Jogos Brasileiros' },
  MZ: { games: [{ name: 'Ntchuva', emoji: '\u{1F327}', desc: 'Jogo de pedra moçambicano' }, { name: 'Chigogo', emoji: '\u{1F965}', desc: 'Jogo com sementes' }, { name: 'Urusse', emoji: '\u{1FAD8}', desc: 'Variante moçambicana do Mancala' }, { name: 'Mexerica', emoji: '\u{1F34A}', desc: 'Jogo popular de Maputo' }, { name: 'Uri', emoji: '\u{1F9F5}', desc: 'Jogo de cordas' }, { name: 'Capulana Quiz', emoji: '\u{1F9E0}', desc: 'Quiz sobre cultura moçambicana' }, { name: 'Djikota', emoji: '\u{1F3AF}', desc: 'Jogo de mira tradicional' }], emoji: '\u{1F1F2}\u{1F1FF}', label: 'Jogos Moçambicanos' },
  AO: { games: [{ name: 'Urusse', emoji: '\u{1FAD8}', desc: 'Variante angolana' }, { name: 'Dominó', emoji: '\u265F', desc: 'Dominó clássico' }, { name: 'Quimbar', emoji: '\u{1F941}', desc: 'Jogo de ritmo angolana' }], emoji: '\u{1F1E6}\u{1F1F4}', label: 'Jogos Angolanos' },
  PT: { games: [{ name: 'Dominó', emoji: '\u265F', desc: 'Dominó tradicional' }, { name: 'Cartas', emoji: '\u{1F0CF}', desc: 'Jogos de cartas' }, { name: 'Bingo', emoji: '\u{1F3B0}', desc: 'Bingo clássico' }], emoji: '\u{1F1F5}\u{1F1F9}', label: 'Jogos Portugueses' },
  US: { games: [{ name: 'Chess', emoji: '\u2654', desc: 'Xadrez clássico' }, { name: 'Checkers', emoji: '\u265F', desc: 'Damas' }, { name: 'Battleship', emoji: '\u{1F6A2}', desc: 'Batalha Naval' }, { name: 'Connect 4', emoji: '\u{1F534}', desc: 'Liga 4' }], emoji: '\u{1F1FA}\u{1F1F8}', label: 'Classic Games' },
  CA: { games: [{ name: 'Chess', emoji: '\u2654', desc: 'Xadrez clássico' }, { name: 'Checkers', emoji: '\u265F', desc: 'Damas' }, { name: 'Battleship', emoji: '\u{1F6A2}', desc: 'Batalha Naval' }, { name: 'Connect 4', emoji: '\u{1F534}', desc: 'Liga 4' }], emoji: '\u{1F1E8}\u{1F1E6}', label: 'Classic Games' },
};

interface ActivityLog { id: string; action: string; details: string; created_at: string; }
interface FinancialRecord { id: string; type: string; amount: number; status: string; method: string; destination?: string; created_at: string; }
interface UserRecord { id: string; email: string; full_name?: string; created_at: string; }

const ICON_MAP: Record<string, any> = {
  phone: '\u{1F4DE}', "qr-code": '\u{1F4F1}', landmark: '\u{1F3E2}', "credit-card": '\u{1F4B3}', globe: '\u{1F310}', smartphone: '\u{1F4F1}', zap: '\u26A1', bitcoin: '\u{20BF}', wallet: '\u{1F456}',
};

export default function RegionalManagerPanel() {
  const { user } = useAuth();
  const { region } = useRegionalTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const [managerData, setManagerData] = useState<any>(null);
  const [regionStats, setRegionStats] = useState({ users: 0, games: 0, revenue: 0, lives: 0, pendingDeposits: 0, pendingWithdrawals: 0, recentActivity: [] as ActivityLog[], topMethods: [] as { method: string; count: number; total: number }[] });
  const [loadingStats, setLoadingStats] = useState(true);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [finFilter, setFinFilter] = useState<string>("all");
  const [finSearch, setFinSearch] = useState("");
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState<Set<string>>(new Set());
  const [paymentConfig, setPaymentConfig] = useState<Record<string, { enabled: boolean; min_amount: number; max_amount: number; account_details: string }>>({});
  const [branding, setBranding] = useState({ primary_color: "", secondary_color: "", accent_color: "", theme_name: "", logo_url: "", banner_url: "" });
  const [settings, setSettings] = useState({ enable_spin_wheel: true, enable_millionaire_game: true, enable_challenge_games: true, enable_live_games: true, maintenance_mode: false });
  const [announcement, setAnnouncement] = useState({ enabled: false, text: "", cta_label: "", cta_url: "" });
  const [nativeGames, setNativeGames] = useState<any[]>([]);
  const [betConfig, setBetConfig] = useState({ min_bet: 10, max_bet: 10000, default_bet: 50, enable_p2p_betting: true, enable_bot_betting: true, commission_percent: 5, regional_games_enabled: true, featured_games: [] as string[], min_withdrawal: 100, auto_cashout_threshold: 5000 });
  const cc = (region?.country_code || 'MZ') as SupportedCurrency;
  const countryGameData = regionalGameData[region?.country_code || ''];
  const [regionalGames, setRegionalGames] = useState(countryGameData?.games.map(g => ({ ...g, active: true })) || []);

  // Load functions
  const loadManagerData = useCallback(async () => { if (!user) return; const { data } = await sb.from("regional_managers").select("*").eq("user_id", user.id).maybeSingle(); if (data) setManagerData(data); }, [user]);
  const loadDashboardStats = useCallback(async () => {
    if (!region?.id) return; setLoadingStats(true);
    try {
      const [usersRes, gamesRes, livesRes, depositsRes, withdrawalsRes, txRes] = await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }).limit(1),
        sb.from("spin_wheel_games").select("id", { count: "exact", head: true }).eq("region_id", region.id).limit(1),
        sb.from("scheduled_lives").select("id", { count: "exact", head: true }).eq("region_id", region.id).limit(1),
        sb.from("deposit_requests").select("id,amount,status,method,created_at").eq("status", "pending").limit(50),
        sb.from("withdrawal_requests").select("id,amount,status,method,created_at").eq("status", "pending").limit(50),
        sb.from("wallet_transactions").select("id,type,amount,direction,status,created_at,description").order("created_at", { ascending: false }).limit(15),
      ]);
      const allDep = depositsRes.data || [];
      const methodMap: Record<string, { count: number; total: number }> = {};
      allDep.forEach((d: any) => { if (!methodMap[d.method]) methodMap[d.method] = { count: 0, total: 0 }; methodMap[d.method].count++; methodMap[d.method].total += d.amount || 0; });
      setRegionStats({ users: usersRes.count || 0, games: gamesRes.count || 0, lives: livesRes.count || 0, pendingDeposits: depositsRes.data?.length || 0, pendingWithdrawals: withdrawalsRes.data?.length || 0, revenue: 0, recentActivity: (txRes.data || []).slice(0, 10).map((tx: any) => ({ id: tx.id, action: tx.type, details: tx.description || tx.type, created_at: tx.created_at })), topMethods: Object.entries(methodMap).map(([method, d]) => ({ method, ...d })).sort((a, b) => b.total - a.total).slice(0, 5) });
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  }, [region]);
  const loadFinancialData = useCallback(async () => {
    if (!region?.id) return; setLoadingFinancial(true);
    try {
      const [depRes, withRes] = await Promise.all([
        sb.from("deposit_requests").select("id,amount,status,method,created_at").order("created_at", { ascending: false }).limit(100),
        sb.from("withdrawal_requests").select("id,amount,status,method,destination,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      setFinancialRecords([...(depRes.data || []).map((d: any) => ({ ...d, type: "deposit" })), ...(withRes.data || []).map((w: any) => ({ ...w, type: "withdrawal", user_email: w.destination }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) { console.error(e); } finally { setLoadingFinancial(false); }
  }, [region]);
  const loadUsers = useCallback(async () => { if (!region?.id) return; setLoadingUsers(true); try { const { data } = await sb.from("profiles").select("id,email,full_name,created_at").order("created_at", { ascending: false }).limit(100); setUsers((data || []) as UserRecord[]); } catch (e) { console.error(e); } finally { setLoadingUsers(false); } }, [region]);
  const loadBranding = useCallback(async () => { if (!region?.id) return; const { data } = await sb.from("regional_branding").select("*").eq("region_id", region.id).maybeSingle(); if (data) setBranding({ primary_color: data.primary_color || "", secondary_color: data.secondary_color || "", accent_color: data.accent_color || "", theme_name: data.theme_name || "", logo_url: data.logo_url || "", banner_url: data.banner_url || "" }); }, [region]);
  const loadSettings = useCallback(async () => { if (!region?.id) return; const { data } = await sb.from("regional_settings").select("*").eq("region_id", region.id).maybeSingle(); if (data) setSettings({ enable_spin_wheel: data.enable_spin_wheel ?? true, enable_millionaire_game: data.enable_millionaire_game ?? true, enable_challenge_games: data.enable_challenge_games ?? true, enable_live_games: data.enable_live_games ?? true, maintenance_mode: data.maintenance_mode ?? false }); }, [region]);
  const loadNativeGames = useCallback(async () => { if (!region?.id) return; const { data } = await sb.from("native_games").select("*").eq("region_id", region.id).order("created_at", { ascending: false }); setNativeGames(data || []); }, [region]);
  const loadBetConfig = useCallback(async () => { if (!region?.id) return; try { const { data } = await sb.from("regional_bet_config").select("*").eq("region_id", region.id).maybeSingle(); if (data) setBetConfig({ min_bet: data.min_bet ?? 10, max_bet: data.max_bet ?? 10000, default_bet: data.default_bet ?? 50, enable_p2p_betting: data.enable_p2p_betting ?? true, enable_bot_betting: data.enable_bot_betting ?? true, commission_percent: data.commission_percent ?? 5, regional_games_enabled: data.regional_games_enabled ?? true, featured_games: data.featured_games ?? [], min_withdrawal: data.min_withdrawal ?? 100, auto_cashout_threshold: data.auto_cashout_threshold ?? 5000 }); } catch { const s = localStorage.getItem(`bet_config_${region.id}`); if (s) setBetConfig(JSON.parse(s)); } }, [region]);
  const loadRegionalGames = useCallback(async () => { if (!region?.id) return; try { const { data } = await sb.from("regional_games_config").select("*").eq("region_id", region.id).maybeSingle(); if (data?.games) setRegionalGames(typeof data.games === 'string' ? JSON.parse(data.games) : data.games); } catch { const s = localStorage.getItem(`regional_games_${region.id}`); if (s) setRegionalGames(JSON.parse(s)); } }, [region]);
  const loadPaymentConfig = useCallback(async () => { if (!region?.id) return; try { const { data } = await sb.from("regional_payment_config").select("*").eq("region_id", region.id).maybeSingle(); if (data?.config) { const c = typeof data.config === 'string' ? JSON.parse(data.config) : data.config; setPaymentConfig(c); setEnabledMethods(new Set(Object.entries(c).filter(([, v]: [string, any]) => v.enabled).map(([k]) => k))); } } catch {} }, [region]);

  useEffect(() => { loadManagerData(); loadDashboardStats(); loadBranding(); loadSettings(); loadNativeGames(); loadBetConfig(); loadRegionalGames(); loadPaymentConfig(); }, [loadManagerData, loadDashboardStats, loadBranding, loadSettings, loadNativeGames, loadBetConfig, loadRegionalGames, loadPaymentConfig]);
  useEffect(() => { if (activeTab === "financeiro" && financialRecords.length === 0) loadFinancialData(); if (activeTab === "users" && users.length === 0) loadUsers(); }, [activeTab, financialRecords.length, users.length, loadFinancialData, loadUsers]);

  // Save handlers
  const handleSaveBranding = async () => { setSaving(true); try { const { error } = await sb.from("regional_branding").upsert({ ...branding, region_id: region?.id, updated_at: new Date().toISOString() }, { onConflict: "region_id" }); if (error) throw error; toast.success(t("regional.panel.brandingSaved")); } catch { toast.error(t("regional.panel.brandingError")); } setSaving(false); };
  const handleSaveSettings = async () => { setSaving(true); try { const { error } = await sb.from("regional_settings").upsert({ ...settings, region_id: region?.id, updated_at: new Date().toISOString() }, { onConflict: "region_id" }); if (error) throw error; toast.success(t("regional.panel.settingsSaved")); } catch { toast.error(t("regional.panel.settingsError")); } setSaving(false); };
  const handleSaveAnnouncement = async () => { setSaving(true); try { const { error } = await sb.from("regional_announcements").upsert({ ...announcement, region_id: region?.id, updated_by: user?.id }, { onConflict: "region_id" }); if (error) throw error; toast.success(t("regional.panel.announcementSaved")); } catch { toast.error(t("regional.panel.announcementError")); } setSaving(false); };
  const handleCreateGame = async () => { setSaving(true); try { const { data, error } = await sb.from("native_games").insert({ region_id: region?.id, name: `Jogo Personalizado ${nativeGames.length + 1}`, type: "custom", is_active: false, config: {}, created_by: user?.id }).select().single(); if (error) throw error; setNativeGames(prev => [data, ...prev]); toast.success(t("regional.panel.gameCreated")); } catch { toast.error(t("regional.panel.gameCreateError")); } setSaving(false); };
  const handleSaveBetConfig = async () => { setSaving(true); try { const { error } = await sb.from("regional_bet_config").upsert({ ...betConfig, region_id: region?.id, updated_at: new Date().toISOString() }, { onConflict: "region_id" }); if (error) throw error; toast.success("Configuracao salva com sucesso"); } catch { toast.success("Configuracao salva localmente"); } setSaving(false); };
  const handleSaveRegionalGames = async () => { setSaving(true); try { const { error } = await sb.from("regional_games_config").upsert({ region_id: region?.id, games: regionalGames, updated_at: new Date().toISOString() }, { onConflict: "region_id" }); if (error) throw error; toast.success("Jogos regionais salvos"); } catch { toast.success("Salvos localmente"); } setSaving(false); };
  const handleSavePaymentConfig = async () => { setSaving(true); try { const { error } = await sb.from("regional_payment_config").upsert({ region_id: region?.id, config: paymentConfig, updated_at: new Date().toISOString() }, { onConflict: "region_id" }); if (error) throw error; toast.success("Pagamentos salvos"); } catch { toast.success("Salvos localmente"); } setSaving(false); };
  const toggleMethod = (mid: string) => {
    setEnabledMethods(prev => { const n = new Set(prev); if (n.has(mid)) n.delete(mid); else n.add(mid); setPaymentConfig(c => ({ ...c, [mid]: { enabled: !prev.has(mid), min_amount: c[mid]?.min_amount ?? 10, max_amount: c[mid]?.max_amount ?? 50000, account_details: c[mid]?.account_details ?? "" } })); return n; });
  };

  const activeBetsCount = regionalGames.filter(g => g.active).length;
  const managerRole = managerData?.role === "senior_manager" ? t("regional.panel.seniorManager") : t("regional.panel.regionalManager");
  const managerRegions = managerData?.region_ids || [];
  const countryInfo = COUNTRIES.find(c => c.code === region?.country_code);
  const refreshAll = () => { loadDashboardStats(); loadBranding(); loadSettings(); loadNativeGames(); loadBetConfig(); loadRegionalGames(); loadPaymentConfig(); if (activeTab === "financeiro") loadFinancialData(); if (activeTab === "users") loadUsers(); };

  const filteredFinancial = useMemo(() => {
    let d = financialRecords; if (finFilter !== "all") d = d.filter(r => r.type === finFilter); if (finSearch.trim()) d = d.filter(r => r.method?.toLowerCase().includes(finSearch.toLowerCase()) || r.destination?.toLowerCase().includes(finSearch.toLowerCase())); return d;
  }, [financialRecords, finFilter, finSearch]);
  const filteredUsers = useMemo(() => { if (!usersSearch.trim()) return users; const q = usersSearch.toLowerCase(); return users.filter(u => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)); }, [users, usersSearch]);
  const methodsForCountry = useMemo(() => getPaymentMethodsForCountry(region?.country_code), [region?.country_code]);
  const groupedMethods = useMemo(() => groupMethodsByCategory(methodsForCountry), [methodsForCountry]);

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; color: string; label: string }> = {
      pending: { icon: Clock, color: "bg-amber-500/10 text-amber-600", label: "Pendente" },
      approved: { icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600", label: "Aprovado" },
      completed: { icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600", label: "Concluido" },
      rejected: { icon: XCircle, color: "bg-red-500/10 text-red-600", label: "Rejeitado" },
    };
    const s = map[status] || { icon: Clock, color: "bg-muted text-muted-foreground", label: status };
    return <span className={"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full " + s.color}><s.icon className="w-3 h-3" />{s.label}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-b">
        <div className="container mx-auto px-4 sm:px-6 py-5">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent"><Crown className="h-5 w-5 text-white" /></div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold font-display">{t("regional.panel.title")}</h1>
                  <p className="text-[11px] text-muted-foreground">{t("regional.panel.manageIndependently")}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{managerRole}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">{countryInfo?.flag} {countryInfo?.label || region?.label}</span>
                {managerRegions.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-card">{managerRegions.length} regioes</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={refreshAll}><RefreshCw className="w-3.5 h-3.5" /> {t("regional.panel.refresh")}</Button>
          </motion.div>

          {/* MINI STATS ROW */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }} className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-4">
            {[
              { icon: Users, label: "Utilizadores", value: regionStats.users, color: "from-blue-500 to-cyan-400" },
              { icon: Gamepad2, label: "Jogos", value: regionStats.games, color: "from-violet-500 to-purple-400" },
              { icon: Radio, label: "Lives", value: regionStats.lives, color: "from-red-500 to-orange-400" },
              { icon: DollarSign, label: "Receita", value: regionStats.revenue, color: "from-emerald-500 to-green-400" },
              { icon: Coins, label: "Apostas", value: activeBetsCount, color: "from-amber-500 to-yellow-400" },
              { icon: ArrowDownRight, label: "Dep. Pendentes", value: regionStats.pendingDeposits, color: "from-sky-500 to-blue-400" },
              { icon: ArrowUpRight, label: "Lev. Pendentes", value: regionStats.pendingWithdrawals, color: "from-rose-500 to-red-400" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING, delay: 0.12 + i * 0.02 }} className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-2.5">
                <div className={"flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br " + s.color + " mb-1.5"}><s.icon className="h-3.5 w-3.5 text-white" /></div>
                <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* TABS */}
      <div className="container mx-auto px-4 sm:px-6 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5 bg-muted/50 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-background text-xs"><PieChart className="w-3.5 h-3.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-1.5 data-[state=active]:bg-background text-xs"><BadgeDollarSign className="w-3.5 h-3.5" /> Financeiro</TabsTrigger>
            <TabsTrigger value="pagamentos" className="gap-1.5 data-[state=active]:bg-background text-xs"><CreditCard className="w-3.5 h-3.5" /> Pagamentos</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-background text-xs"><Users className="w-3.5 h-3.5" /> Utilizadores</TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5 data-[state=active]:bg-background text-xs"><Palette className="w-3.5 h-3.5" /> {t("regional.panel.branding")}</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-background text-xs"><Settings className="w-3.5 h-3.5" /> {t("regional.panel.settings")}</TabsTrigger>
            <TabsTrigger value="announcement" className="gap-1.5 data-[state=active]:bg-background text-xs"><Megaphone className="w-3.5 h-3.5" /> {t("regional.panel.announcements")}</TabsTrigger>
            <TabsTrigger value="apostas" className="gap-1.5 data-[state=active]:bg-background text-xs"><Coins className="w-3.5 h-3.5" /> Apostas</TabsTrigger>
            <TabsTrigger value="regional_games" className="gap-1.5 data-[state=active]:bg-background text-xs"><Dices className="w-3.5 h-3.5" /> Jogos</TabsTrigger>
          </TabsList>

          {/* === DASHBOARD TAB === */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Activity Log */}
              <Card className="neon-border">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4" /> Actividade Recente</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {loadingStats ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div> :
                  regionStats.recentActivity.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Sem atividade recente</p> :
                  <div className="space-y-1.5">{regionStats.recentActivity.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Hash className="h-3.5 w-3.5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.details || a.action}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}</div>}
                </CardContent>
              </Card>
              {/* Top Payment Methods */}
              <Card className="neon-border">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><HandCoins className="w-4 h-4" /> Metodos de Pagamento Populares</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {regionStats.topMethods.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Sem dados de pagamentos</p> :
                  <div className="space-y-2">{regionStats.topMethods.map((m, i) => {
                    const maxTotal = regionStats.topMethods[0]?.total || 1;
                    const pct = (m.total / maxTotal) * 100;
                    return (
                      <div key={m.method} className="space-y-1">
                        <div className="flex items-center justify-between text-xs"><span className="font-medium">{m.method}</span><span className="text-muted-foreground">{m.count} pedidos | {formatMoney(m.total, cc)}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" /></div>
                      </div>
                    );
                  })}</div>}
                </CardContent>
              </Card>
            </div>
            {/* Pending Actions Summary */}
            {(regionStats.pendingDeposits > 0 || regionStats.pendingWithdrawals > 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Acoes Pendentes</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Voce tem {regionStats.pendingDeposits} depositos e {regionStats.pendingWithdrawals} levantamentos aguardando aprovacao. Aceda ao separador Financeiro para processar.</p>
                      </div>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => setActiveTab("financeiro")}>Ver</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* === FINANCEIRO TAB === */}
          <TabsContent value="financeiro" className="space-y-4">
            <Card className="neon-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm"><Receipt className="w-4 h-4" /> Transacoes Financeiras</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input placeholder="Pesquisar..." value={finSearch} onChange={e => setFinSearch(e.target.value)} className="pl-8 h-8 w-44 text-xs" /></div>
                    <div className="flex rounded-lg border p-0.5 bg-muted/50">
                      {["all", "deposit", "withdrawal"].map(f => (
                        <button key={f} onClick={() => setFinFilter(f)} className={"px-2.5 py-1 rounded-md text-[11px] font-medium transition-all " + (finFilter === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>{f === "all" ? "Todos" : f === "deposit" ? "Depositos" : "Levantamentos"}</button>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={loadFinancialData}><RefreshCw className="w-3 h-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingFinancial ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div> :
                filteredFinancial.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma transacao encontrada</p> :
                <div className="space-y-1.5">{filteredFinancial.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + (r.type === "deposit" ? "bg-emerald-500/10" : "bg-red-500/10")}>{r.type === "deposit" ? <ArrowDownRight className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-red-600" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-xs font-medium">{r.type === "deposit" ? "Deposito" : "Levantamento"}</p>{statusBadge(r.status)}</div>
                      <p className="text-[10px] text-muted-foreground">{r.method} {r.destination ? `→ ${r.destination}` : ""} | {new Date(r.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <p className={"text-sm font-bold " + (r.type === "deposit" ? "text-emerald-600" : "text-red-600")}>{r.type === "deposit" ? "+" : "-"}{formatMoney(r.amount, cc)}</p>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === PAGAMENTOS TAB (NEW) === */}
          <TabsContent value="pagamentos" className="space-y-4">
            <Card className="neon-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> Metodos de Pagamento da Regiao</CardTitle>
                  <Button size="sm" onClick={handleSavePaymentConfig} disabled={saving} className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : "Guardar"}</Button>
                </div>
                <p className="text-xs text-muted-foreground">Active ou desactive os metodos disponiveis para {countryInfo?.label || "esta regiao"}. Configure os dados de cada conta.</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {Object.entries(groupedMethods).map(([cat, methods]) => {
                  const catInfo = PAYMENT_CATEGORY_LABELS[cat];
                  return (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-3">{catInfo?.label || cat} ({methods.length})</p>
                      <div className="space-y-2">
                        {methods.map(m => {
                          const enabled = enabledMethods.has(m.id);
                          return (
                            <div key={m.id} className="rounded-xl border border-border/40 bg-card/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className={"h-8 w-8 rounded-lg bg-gradient-to-br " + (m.color || "from-gray-500 to-gray-600") + " flex items-center justify-center text-white text-xs font-bold"}>{m.label.charAt(0)}</div>
                                  <div><p className="text-sm font-semibold">{m.label}</p><p className="text-[10px] text-muted-foreground">{m.desc}</p></div>
                                </div>
                                <Switch checked={enabled} onCheckedChange={() => toggleMethod(m.id)} />
                              </div>
                              {enabled && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid sm:grid-cols-3 gap-2 pl-10 pt-1">
                                  <div className="space-y-1"><Label className="text-[10px]">Valor Minimo ({cc})</Label><Input type="number" value={paymentConfig[m.id]?.min_amount ?? 10} onChange={e => setPaymentConfig(p => ({ ...p, [m.id]: { ...p[m.id], enabled: true, min_amount: Number(e.target.value), max_amount: p[m.id]?.max_amount ?? 50000, account_details: p[m.id]?.account_details ?? "" } }))} className="h-8 text-xs" /></div>
                                  <div className="space-y-1"><Label className="text-[10px]">Valor Maximo ({cc})</Label><Input type="number" value={paymentConfig[m.id]?.max_amount ?? 50000} onChange={e => setPaymentConfig(p => ({ ...p, [m.id]: { ...p[m.id], enabled: true, min_amount: p[m.id]?.min_amount ?? 10, max_amount: Number(e.target.value), account_details: p[m.id]?.account_details ?? "" } }))} className="h-8 text-xs" /></div>
                                  <div className="space-y-1"><Label className="text-[10px]">Dados da Conta</Label><Input placeholder={m.placeholder || "Numero, IBAN, chave..."} value={paymentConfig[m.id]?.account_details ?? ""} onChange={e => setPaymentConfig(p => ({ ...p, [m.id]: { ...p[m.id], enabled: true, min_amount: p[m.id]?.min_amount ?? 10, max_amount: p[m.id]?.max_amount ?? 50000, account_details: e.target.value } }))} className="h-8 text-xs" /></div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === USERS TAB (NEW) === */}
          <TabsContent value="users" className="space-y-4">
            <Card className="neon-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm"><Users className="w-4 h-4" /> Utilizadores da Regiao</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input placeholder="Pesquisar email ou nome..." value={usersSearch} onChange={e => setUsersSearch(e.target.value)} className="pl-8 h-8 w-52 text-xs" /></div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={loadUsers}><RefreshCw className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingUsers ? <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}</div> :
                filteredUsers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Nenhum utilizador encontrado</p> :
                <div className="space-y-1.5">{filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><UserPlus className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-[10px] text-muted-foreground">{u.email}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === BRANDING TAB === */}
          <TabsContent value="branding"><Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Palette className="w-4 h-4" /> {t("regional.panel.visualIdentity")}</CardTitle></CardHeader><CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {[{ key: "primary_color", label: t("regional.panel.primaryColor") }, { key: "secondary_color", label: t("regional.panel.secondaryColor") }, { key: "accent_color", label: t("regional.panel.accentColor") }].map(f => (
                <div key={f.key} className="space-y-1.5"><Label className="text-xs">{f.label}</Label><div className="flex gap-2"><input type="color" value={branding[f.key as keyof typeof branding]} onChange={e => setBranding(p => ({ ...p, [f.key]: e.target.value }))} className="h-9 w-12 rounded-lg border cursor-pointer" /><Input value={branding[f.key as keyof typeof branding]} onChange={e => setBranding(p => ({ ...p, [f.key]: e.target.value }))} className="h-9 text-xs" /></div></div>
              ))}
              <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.themeName")}</Label><Input value={branding.theme_name} onChange={e => setBranding(p => ({ ...p, theme_name: e.target.value }))} placeholder="Ex: Bateu India" className="h-9 text-xs" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.logoUrl")}</Label><Input value={branding.logo_url} onChange={e => setBranding(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.bannerUrl")}</Label><Input value={branding.banner_url} onChange={e => setBranding(p => ({ ...p, banner_url: e.target.value }))} placeholder="https://..." className="h-9 text-xs" /></div>
            </div>
            <div className="flex justify-end"><Button onClick={handleSaveBranding} disabled={saving} size="sm" className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : t("regional.panel.saveBranding")}</Button></div>
          </CardContent></Card></TabsContent>

          {/* === SETTINGS TAB === */}
          <TabsContent value="settings"><Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Settings className="w-4 h-4" /> {t("regional.panel.regionSettings")}</CardTitle></CardHeader><CardContent className="space-y-3">
            {[{ key: "enable_spin_wheel" as const, label: t("regional.panel.spinWheel"), desc: t("regional.panel.spinWheelDesc"), icon: Gamepad2 },{ key: "enable_millionaire_game" as const, label: t("regional.panel.millionaire"), desc: t("regional.panel.millionaireDesc"), icon: TrendingUp },{ key: "enable_challenge_games" as const, label: t("regional.panel.challengeGames"), desc: t("regional.panel.challengeGamesDesc"), icon: Zap },{ key: "enable_live_games" as const, label: t("regional.panel.liveGames"), desc: t("regional.panel.liveGamesDesc"), icon: Activity }].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><item.icon className="h-3.5 w-3.5 text-primary" /></div><div><p className="text-xs font-semibold">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div></div><Switch checked={settings[item.key]} onCheckedChange={v => setSettings(p => ({ ...p, [item.key]: v }))} /></div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/30 bg-red-500/5"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10"><Shield className="h-3.5 w-3.5 text-red-500" /></div><div><p className="text-xs font-semibold">{t("regional.panel.maintenanceMode")}</p><p className="text-[10px] text-muted-foreground">{t("regional.panel.maintenanceDesc")}</p></div></div><Switch checked={settings.maintenance_mode} onCheckedChange={v => setSettings(p => ({ ...p, maintenance_mode: v }))} /></div>
            <div className="flex justify-end"><Button onClick={handleSaveSettings} disabled={saving} size="sm" className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : t("regional.panel.saveSettings")}</Button></div>
          </CardContent></Card></TabsContent>

          {/* === ANNOUNCEMENT TAB === */}
          <TabsContent value="announcement"><Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Megaphone className="w-4 h-4" /> {t("regional.panel.announcementTitle")}</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/30"><div><p className="text-xs font-semibold">{t("regional.panel.announcementActive")}</p><p className="text-[10px] text-muted-foreground">{t("regional.panel.announcementActiveDesc")}</p></div><Switch checked={announcement.enabled} onCheckedChange={v => setAnnouncement(p => ({ ...p, enabled: v }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.announcementText")}</Label><Textarea value={announcement.text} onChange={e => setAnnouncement(p => ({ ...p, text: e.target.value }))} placeholder="Ex: Grande sorteio!" rows={3} className="text-xs" /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.ctaLabel")}</Label><Input value={announcement.cta_label} onChange={e => setAnnouncement(p => ({ ...p, cta_label: e.target.value }))} placeholder="Participar" className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">{t("regional.panel.ctaUrl")}</Label><Input value={announcement.cta_url} onChange={e => setAnnouncement(p => ({ ...p, cta_url: e.target.value }))} placeholder="/marketplace" className="h-9 text-xs" /></div>
            </div>
            <div className="flex justify-end"><Button onClick={handleSaveAnnouncement} disabled={saving} size="sm" className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : t("regional.panel.saveAnnouncement")}</Button></div>
          </CardContent></Card></TabsContent>

          {/* === APOSTAS TAB === */}
          <TabsContent value="apostas" className="space-y-4">
            <Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Coins className="w-4 h-4" /> Configuracao de Apostas</CardTitle></CardHeader><CardContent className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                {[{ key: "min_bet", label: "Aposta Minima" },{ key: "max_bet", label: "Aposta Maxima" },{ key: "default_bet", label: "Aposta Padrao" }].map(f => (
                  <div key={f.key} className="space-y-1.5"><Label className="text-xs">{f.label}</Label><div className="relative"><Input type="number" value={betConfig[f.key as keyof typeof betConfig] as number} onChange={e => setBetConfig(p => ({ ...p, [f.key]: Number(e.target.value) }))} className="h-9 text-xs" /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{cc}</span></div></div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Saque Minimo</Label><div className="relative"><Input type="number" value={betConfig.min_withdrawal} onChange={e => setBetConfig(p => ({ ...p, min_withdrawal: Number(e.target.value) }))} className="h-9 text-xs" /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{cc}</span></div></div>
                <div className="space-y-1.5"><Label className="text-xs">Auto Cashout (limite)</Label><div className="relative"><Input type="number" value={betConfig.auto_cashout_threshold} onChange={e => setBetConfig(p => ({ ...p, auto_cashout_threshold: Number(e.target.value) }))} className="h-9 text-xs" /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{cc}</span></div></div>
              </div>
              {[{ key: "enable_p2p_betting" as const, label: "Apostas P2P", desc: "Permitir apostas entre utilizadores" },{ key: "enable_bot_betting" as const, label: "Apostas com Bots", desc: "Bots preenchem mesas" },{ key: "regional_games_enabled" as const, label: "Jogos Regionais", desc: "Activar jogos tradicionais" }].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors"><div><p className="text-xs font-semibold">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.desc}</p></div><Switch checked={betConfig[item.key]} onCheckedChange={v => setBetConfig(p => ({ ...p, [item.key]: v }))} /></div>
              ))}
              <div className="space-y-2"><div className="flex items-center justify-between"><Label className="flex items-center gap-1.5 text-xs"><Percent className="w-3.5 h-3.5" /> Comissao ({betConfig.commission_percent}%)</Label><span className="text-[10px] text-muted-foreground">0% - 20%</span></div><input type="range" min="0" max="20" step="0.5" value={betConfig.commission_percent} onChange={e => setBetConfig(p => ({ ...p, commission_percent: Number(e.target.value) }))} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted" /></div>
            </CardContent></Card>
            <div className="flex justify-end"><Button onClick={handleSaveBetConfig} disabled={saving} size="sm" className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : "Guardar Configuracao"}</Button></div>
          </TabsContent>

          {/* === REGIONAL GAMES TAB === */}
          <TabsContent value="regional_games" className="space-y-4">
            <Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Gamepad2 className="w-4 h-4" /> Jogos Nativos</CardTitle></CardHeader><CardContent>
              <div className="flex items-center justify-between mb-4"><p className="text-xs text-muted-foreground">{nativeGames.length} jogos criados</p><Button onClick={handleCreateGame} disabled={saving} size="sm" className="gap-1"><Plus className="w-3.5 h-3.5" /> {saving ? "..." : t("regional.panel.createGame")}</Button></div>
              {nativeGames.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">{t("regional.panel.noGames")}</p> :
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{nativeGames.map((game, i) => (
                <motion.div key={game.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: i * 0.04 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 card-glow-hover">
                  <div className="flex items-center justify-between mb-2"><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + (game.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>{game.is_active ? t("regional.panel.active") : t("regional.panel.inactive")}</span><span className="text-[9px] text-muted-foreground">{game.type}</span></div>
                  <h4 className="text-sm font-bold mb-0.5">{game.name}</h4><p className="text-[10px] text-muted-foreground">{t("regional.panel.createdOn")} {new Date(game.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" className="flex-1 gap-1 text-[10px] h-7" onClick={() => toast.info(t("regional.panel.editorDev"))}><Settings className="w-3 h-3" /> {t("regional.panel.configure")}</Button><Button size="sm" variant="outline" className="gap-1 text-[10px] h-7 w-8 p-0" onClick={() => toast.info(t("regional.panel.previewDev"))}><Eye className="w-3 h-3" /></Button></div>
                </motion.div>
              ))}</div>}
            </CardContent></Card>
            {countryGameData && <Card className="neon-border"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><span className="text-lg">{countryGameData.emoji}</span> {countryGameData.label}</CardTitle></CardHeader><CardContent>
              <p className="text-xs text-muted-foreground mb-3">Active ou desactive os jogos regionais para {countryInfo?.label || region?.label}.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{regionalGames.map((game, i) => (
                <motion.div key={game.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: i * 0.04 }} className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 card-glow-hover">
                  <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-xl">{game.emoji}</span><span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + (game.active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>{game.active ? "Activo" : "Inactivo"}</span></div><Switch checked={game.active} onCheckedChange={v => setRegionalGames(prev => prev.map((g: any) => g.name === game.name ? { ...g, active: v } : g))} /></div>
                  <h4 className="text-sm font-bold mb-0.5">{game.name}</h4><p className="text-[10px] text-muted-foreground">{game.desc}</p>
                </motion.div>
              ))}</div>
            </CardContent></Card>}
            <div className="flex justify-end"><Button onClick={handleSaveRegionalGames} disabled={saving} size="sm" className="gap-1"><Save className="w-3.5 h-3.5" /> {saving ? "..." : "Guardar Jogos"}</Button></div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
