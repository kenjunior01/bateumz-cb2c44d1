import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Trophy, TrendingUp, DollarSign, Globe } from "lucide-react";
import { toast } from "sonner";

interface RegionStats {
  total_raffles: number;
  active_raffles: number;
  total_participants: number;
  total_revenue: number;
  pending_payments: number;
}

interface RegionData {
  id: string;
  country_code: string;
  label: string;
  flag: string;
  currency: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_language: string;
}

export default function AdminRegionalDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<RegionData | null>(null);
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [recentRaffles, setRecentRaffles] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "superadmin")) return;
    loadData();
  }, [user, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get user's assigned region
      const { data: adminRegion, error: adminError } = await supabase
        .from("admin_regions")
        .select("country_code")
        .eq("user_id", user!.id)
        .single();

      if (adminError && role !== "superadmin") {
        toast.error("Você não tem uma região atribuída");
        setLoading(false);
        return;
      }

      const countryCode = adminRegion?.country_code || "US";

      // Load region data
      const { data: regionData, error: regionError } = await supabase
        .from("regions")
        .select("*")
        .eq("country_code", countryCode)
        .single();

      if (regionError) throw regionError;
      setRegion(regionData);

      // Load stats
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, status, sold_tickets, ticket_price")
        .eq("country", countryCode);

      if (rafflesError) throw rafflesError;

      const stats = {
        total_raffles: raffles?.length || 0,
        active_raffles: raffles?.filter((r) => r.status === "active").length || 0,
        total_participants: raffles?.reduce((sum, r) => sum + (r.sold_tickets || 0), 0) || 0,
        total_revenue: raffles?.reduce((sum, r) => sum + ((r.sold_tickets || 0) * (r.ticket_price || 0)), 0) || 0,
        pending_payments: 0, // TODO: Calculate from payments table
      };
      setStats(stats);

      // Load recent raffles
      const { data: recent, error: recentError } = await supabase
        .from("raffles")
        .select("id, title, status, sold_tickets, total_tickets, created_at")
        .eq("country", countryCode)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentRaffles(recent || []);

      // Load top users by participation
      const { data: topUsersData, error: topUsersError } = await supabase
        .from("participants")
        .select("user_id, count(*)")
        .eq("status", "active")
        .order("count", { ascending: false })
        .limit(5);

      if (topUsersError) throw topUsersError;
      setTopUsers(topUsersData || []);
    } catch (error) {
      console.error("Error loading regional dashboard:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (role !== "admin" && role !== "superadmin") return <Navigate to="/admin" replace />;
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">
          Painel Regional {region && `- ${region.flag} ${region.label}`}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorteios Totais</p>
                <p className="text-3xl font-bold">{stats?.total_raffles || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-3xl font-bold">{stats?.active_raffles || 0}</p>
              </div>
              <Badge className="bg-green-500">Ativo</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="text-3xl font-bold">{stats?.total_participants || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita</p>
                <p className="text-3xl font-bold">
                  {region?.currency} {(stats?.total_revenue || 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold">{stats?.pending_payments || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="raffles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="raffles">Sorteios Recentes</TabsTrigger>
          <TabsTrigger value="users">Usuários Ativos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Recent Raffles */}
        <TabsContent value="raffles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Sorteios</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRaffles.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Nenhum sorteio criado ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {recentRaffles.map((raffle) => (
                    <div
                      key={raffle.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <h3 className="font-bold">{raffle.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {raffle.sold_tickets}/{raffle.total_tickets} ingressos vendidos
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={raffle.status === "active" ? "default" : "outline"}
                        >
                          {raffle.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Users */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Mais Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  Nenhuma participação registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">Usuário {user.user_id.slice(0, 8)}</span>
                      </div>
                      <span className="font-bold">{user.count} participações</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Região</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {region && (
                <>
                  <div>
                    <p className="text-sm font-medium">Nome da Região</p>
                    <p className="text-muted-foreground">{region.name || region.label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Código do País</p>
                    <p className="text-muted-foreground">{region.country_code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Moeda</p>
                    <p className="text-muted-foreground">{region.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Idioma Padrão</p>
                    <p className="text-muted-foreground">{region.default_language}</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Editar Configurações
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
