import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Trophy, Calendar, MapPin, CheckCircle, Building2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface BusinessInfo {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

interface Raffle {
  id: string;
  title: string;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  image_url: string | null;
  slug: string | null;
  end_date: string | null;
  category: string | null;
}

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  end_date: string | null;
}

export default function BusinessProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [profileRes, rafflesRes, contestsRes] = await Promise.all([
        supabase.from("profiles_public").select("*").eq("user_id", id).single(),
        supabase.from("raffles").select("*").eq("business_user_id", id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("contests").select("*").eq("created_by", id).in("status", ["active", "voting", "completed"]).order("created_at", { ascending: false }),
      ]);
      setBusiness(profileRes.data as BusinessInfo | null);
      setRaffles(rafflesRes.data || []);
      setContests(contestsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Empresa não encontrada</h1>
          <Button variant="outline" onClick={() => navigate("/empresas")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Diretório
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    active: "Ativo", completed: "Encerrado", voting: "Em Votação", drawn: "Sorteado",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/empresas")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        {/* Business Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 mb-8"
        >
          <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
            {business.avatar_url ? (
              <img src={business.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              (business.company_name || business.display_name || "E").charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{business.company_name || business.display_name}</h1>
              {business.is_verified && (
                <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
              )}
            </div>
            {business.company_name && business.display_name && (
              <p className="text-sm text-muted-foreground">{business.display_name}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Ticket className="h-4 w-4" /> {raffles.length} sorteios
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" /> {contests.length} concursos
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Desde {business.created_at ? new Date(business.created_at).toLocaleDateString("pt-MZ", { month: "long", year: "numeric" }) : "N/A"}
              </span>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="raffles">
          <TabsList className="mb-6">
            <TabsTrigger value="raffles">Sorteios ({raffles.length})</TabsTrigger>
            <TabsTrigger value="contests">Concursos ({contests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="raffles">
            {raffles.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum sorteio ativo.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {raffles.map((r) => (
                  <Card key={r.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/raffle/${r.slug}`)}>
                    {r.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      <p className="text-sm text-primary font-medium mt-1">🏆 {r.prize_title}</p>
                      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                        <span>{r.sold_tickets}/{r.total_tickets} bilhetes</span>
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {statusLabels[r.status] || r.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contests">
            {contests.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Nenhum concurso disponível.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contests.map((c) => (
                  <Card key={c.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/concursos/${c.id}`)}>
                    {c.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{c.title}</h3>
                      {c.prize_description && (
                        <p className="text-sm text-primary font-medium mt-1">🏆 {c.prize_description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {c.evaluation_type === "views" ? "📹 Visualizações" : "👍 Votos"}
                        </span>
                        <Badge variant={c.status === "active" ? "default" : c.status === "voting" ? "outline" : "secondary"}>
                          {statusLabels[c.status] || c.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
