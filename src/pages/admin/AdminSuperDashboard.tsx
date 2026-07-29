import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase: any = _supabase;
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Globe, Users, TrendingUp, DollarSign, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface Region {
  id: string;
  country_code: string;
  label: string;
  flag: string;
  currency: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  user_id: string;
  email: string;
  full_name?: string;
}

interface RegionalAdmin {
  id: string;
  user_id: string;
  country_code: string;
  assigned_by: string;
  created_at: string;
  profile?: Profile;
}

interface GlobalStats {
  total_regions: number;
  total_admins: number;
  total_raffles: number;
  total_revenue: number;
}

export default function AdminSuperDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [admins, setAdmins] = useState<RegionalAdmin[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [newRegionCode, setNewRegionCode] = useState("");
  const [newRegionLabel, setNewRegionLabel] = useState("");
  const [newRegionCurrency, setNewRegionCurrency] = useState("USD");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminCountry, setNewAdminCountry] = useState("");

  useEffect(() => {
    if (!user || role !== "superadmin") return;
    loadData();
  }, [user, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all regions
      const { data: regionsData, error: regionsError } = await supabase
        .from("regions")
        .select("*")
        .order("label");

      if (regionsError) throw regionsError;
      setRegions(regionsData || []);

      // Load all regional admins
      const { data: adminsData, error: adminsError } = await supabase
        .from("admin_regions")
        .select("*")
        .order("created_at", { ascending: false });

      if (adminsError) throw adminsError;

      // Fetch profiles for all admins
      if (adminsData && adminsData.length > 0) {
        const userIds = adminsData.map(a => a.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);

        if (!profilesError && profilesData) {
          // Join profiles with admins
          const adminsWithProfiles = adminsData.map(admin => ({
            ...admin,
            profile: profilesData.find(p => p.user_id === admin.user_id)
          }));
          setAdmins(adminsWithProfiles);
        } else {
          setAdmins(adminsData);
        }
      } else {
        setAdmins(adminsData || []);
      }

      // Calculate global stats
      const { data: rafflesData, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, ticket_price, sold_tickets");

      if (rafflesError) throw rafflesError;

      const totalRaffles = rafflesData?.length || 0;
      const totalRevenue = rafflesData?.reduce(
        (sum, r) => sum + ((r.sold_tickets || 0) * (r.ticket_price || 0)),
        0
      ) || 0;

      setStats({
        total_regions: regionsData?.length || 0,
        total_admins: adminsData?.length || 0,
        total_raffles: totalRaffles,
        total_revenue: totalRevenue,
      });
    } catch (error) {
      console.error("Error loading super admin data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const createRegion = async () => {
    if (!newRegionCode.trim() || !newRegionLabel.trim()) {
      toast.error("Código e nome da região são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("regions")
        .insert({
          country_code: newRegionCode.toUpperCase(),
          label: newRegionLabel,
          currency: newRegionCurrency,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setRegions([...regions, data]);
      setNewRegionCode("");
      setNewRegionLabel("");
      setNewRegionCurrency("USD");
      toast.success("Região criada com sucesso!");
    } catch (error) {
      console.error("Error creating region:", error);
      toast.error("Erro ao criar região");
    } finally {
      setSaving(false);
    }
  };

  const assignAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminCountry) {
      toast.error("Email e país são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("email", newAdminEmail)
        .single();

      if (userError) {
        toast.error("Utilizador não encontrado");
        setSaving(false);
        return;
      }

      // Assign the user as admin for the region
      const { data, error } = await supabase
        .from("admin_regions")
        .insert({
          user_id: userData.user_id,
          country_code: newAdminCountry,
          assigned_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      setAdmins([...admins, data]);
      setNewAdminEmail("");
      setNewAdminCountry("");
      toast.success("Admin atribuído com sucesso!");
    } catch (error) {
      console.error("Error assigning admin:", error);
      toast.error("Erro ao atribuir admin");
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from("admin_regions")
        .delete()
        .eq("id", adminId);

      if (error) throw error;

      setAdmins(admins.filter((a) => a.id !== adminId));
      toast.success("Admin removido");
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Erro ao remover admin");
    }
  };

  const toggleRegionStatus = async (regionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("regions")
        .update({ is_active: !currentStatus })
        .eq("id", regionId);

      if (error) throw error;

      setRegions(
        regions.map((r) =>
          r.id === regionId ? { ...r, is_active: !currentStatus } : r
        )
      );
      toast.success("Status atualizado");
    } catch (error) {
      console.error("Error updating region status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (authLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (role !== "superadmin") return <Navigate to="/admin" replace />;
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Super Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regiões</p>
                <p className="text-3xl font-bold">{stats?.total_regions || 0}</p>
              </div>
              <Globe className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins Regionais</p>
                <p className="text-3xl font-bold">{stats?.total_admins || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorteios Globais</p>
                <p className="text-3xl font-bold">{stats?.total_raffles || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Global</p>
                <p className="text-3xl font-bold">${(stats?.total_revenue || 0).toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="regions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="regions">Regiões</TabsTrigger>
          <TabsTrigger value="admins">Admins Regionais</TabsTrigger>
          <TabsTrigger value="settings">Configurações Globais</TabsTrigger>
        </TabsList>

        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Criar Nova Região
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <Label className="text-xs">Código (ex: BR, US)</Label>
                  <Input
                    placeholder="BR"
                    value={newRegionCode}
                    onChange={(e) => setNewRegionCode(e.target.value.toUpperCase())}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome da Região</Label>
                  <Input
                    placeholder="Brasil"
                    value={newRegionLabel}
                    onChange={(e) => setNewRegionLabel(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Moeda</Label>
                  <Input
                    placeholder="BRL"
                    value={newRegionCurrency}
                    onChange={(e) => setNewRegionCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
                <Button onClick={createRegion} disabled={saving} className="mt-6">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Todas as Regiões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Moeda</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          Nenhuma região criada
                        </TableCell>
                      </TableRow>
                    ) : (
                      regions.map((region) => (
                        <TableRow key={region.id}>
                          <TableCell className="font-bold">{region.flag} {region.country_code}</TableCell>
                          <TableCell>{region.label}</TableCell>
                          <TableCell>{region.currency}</TableCell>
                          <TableCell>
                            <Badge variant={region.is_active ? "default" : "outline"}>
                              {region.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(region.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleRegionStatus(region.id, region.is_active)}
                            >
                              {region.is_active ? "Desativar" : "Ativar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Atribuir Admin Regional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label className="text-xs">Email do Utilizador</Label>
                  <Input
                    placeholder="admin@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">País/Região</Label>
                  <select
                    value={newAdminCountry}
                    onChange={(e) => setNewAdminCountry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Escolhe uma região...</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.country_code}>
                        {r.flag} {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={assignAdmin} disabled={saving} className="mt-6">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Atribuir
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admins Regionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>País/Região</TableHead>
                      <TableHead>Atribuído em</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhum admin regional atribuído
                        </TableCell>
                      </TableRow>
                    ) : (
                      admins.map((admin) => {
                        const region = regions.find((r) => r.country_code === admin.country_code);
                        return (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div className="font-medium">
                                {admin.profile?.full_name || "Utilizador"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {admin.user_id.slice(0, 8)}...
                              </div>
                            </TableCell>
                            <TableCell>
                              {admin.profile?.email || "-"}
                            </TableCell>
                            <TableCell>
                              {region && <span>{region.flag} {region.label}</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(admin.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAdmin(admin.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Globais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold mb-4">Gestão de Plataforma</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar Configurações Globais
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Gerenciar Comissões Regionais
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Visualizar Logs de Auditoria
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
