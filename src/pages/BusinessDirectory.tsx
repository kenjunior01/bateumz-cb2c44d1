import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Search, CheckCircle, Ticket, Trophy, TrendingUp, Star, ArrowRight, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface BusinessItem {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  raffle_count: number;
  contest_count: number;
}

const SHOWCASE_STATS = [
  { icon: Users, label: "Empresas Ativas", value: "50+", color: "text-primary" },
  { icon: Trophy, label: "Concursos Realizados", value: "200+", color: "text-accent" },
  { icon: TrendingUp, label: "Participações Totais", value: "10K+", color: "text-primary" },
  { icon: Star, label: "Taxa de Engajamento", value: "85%", color: "text-accent" },
];

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "business");
      if (!roles || roles.length === 0) { setLoading(false); return; }
      
      const businessIds = roles.map(r => r.user_id);
      
      const [profilesRes, rafflesRes, contestsRes] = await Promise.all([
        supabase.from("profiles_public").select("*").in("user_id", businessIds),
        supabase.from("raffles").select("business_user_id").eq("status", "active"),
        supabase.from("contests").select("created_by").in("status", ["active", "voting", "completed"]),
      ]);

      const profiles = profilesRes.data || [];
      const rafflesByUser: Record<string, number> = {};
      (rafflesRes.data || []).forEach((r: any) => {
        rafflesByUser[r.business_user_id] = (rafflesByUser[r.business_user_id] || 0) + 1;
      });
      const contestsByUser: Record<string, number> = {};
      (contestsRes.data || []).forEach((c: any) => {
        contestsByUser[c.created_by] = (contestsByUser[c.created_by] || 0) + 1;
      });

      const items: BusinessItem[] = profiles.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        company_name: p.company_name,
        avatar_url: p.avatar_url,
        is_verified: p.is_verified,
        raffle_count: rafflesByUser[p.user_id] || 0,
        contest_count: contestsByUser[p.user_id] || 0,
      }));

      items.sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return (b.raffle_count + b.contest_count) - (a.raffle_count + a.contest_count);
      });

      setBusinesses(items);
      setLoading(false);
    };
    load();
  }, []);

  const [filter, setFilter] = useState<"all" | "verified" | "active">("all");

  const filtered = useMemo(() => {
    let list = businesses;
    if (filter === "verified") list = list.filter((b) => b.is_verified);
    if (filter === "active") list = list.filter((b) => b.raffle_count + b.contest_count > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          (b.company_name || "").toLowerCase().includes(q) ||
          (b.display_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [businesses, search, filter]);

  const chipCategories = [
    { id: "all", label: "Todas", icon: "🏢", count: businesses.length },
    { id: "verified", label: "Verificadas", icon: "✅", count: businesses.filter((b) => b.is_verified).length },
    { id: "active", label: "Ativas", icon: "⚡", count: businesses.filter((b) => b.raffle_count + b.contest_count > 0).length },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-2 md:py-8 pb-10 max-w-6xl">
        {/* Mobile sticky header */}
        <MobileDiscoveryHeader
          title="Diretório de Empresas"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar empresa..."
          categories={chipCategories}
          activeCategory={filter}
          onCategoryChange={(id) => setFilter(id as any)}
        />

        {/* Hero (desktop) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block text-center mb-12 pt-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Diretório de Empresas
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Descubra empresas que criam experiências incríveis — sorteios, concursos e muito mais para a sua comunidade
          </p>
          {!user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Link to="/register">
                <Button size="lg" className="gap-2 shadow-lg">
                  <Sparkles className="h-4 w-4" /> Crie o seu primeiro concurso grátis
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Stats showcase */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {SHOWCASE_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08, type: "spring" }}
              whileHover={{ y: -2 }}
              className="glass rounded-xl p-4 text-center"
            >
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA banner for businesses */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20 flex flex-col md:flex-row items-center gap-4"
        >
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
              🚀 A sua empresa ainda não está aqui?
            </h2>
            <p className="text-sm text-muted-foreground">
              Registe-se como empresa e crie concursos que atraiam milhares de participantes. O primeiro concurso é grátis!
            </p>
          </div>
          <Link to="/register">
            <Button className="gap-2 shrink-0 shadow-md">
              Começar Agora <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar empresas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 glass"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-1">Nenhuma empresa encontrada</p>
            <p className="text-sm text-muted-foreground">Tente uma pesquisa diferente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b, i) => (
              <motion.div
                key={b.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 glass"
                  onClick={() => navigate(`/empresa/${b.user_id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0 overflow-hidden">
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        ) : (
                          (b.company_name || b.display_name || "E").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold truncate">{b.company_name || b.display_name}</p>
                          {b.is_verified && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        {b.company_name && b.display_name && b.company_name !== b.display_name && (
                          <p className="text-xs text-muted-foreground truncate">{b.display_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" /> {b.raffle_count} sorteios
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" /> {b.contest_count} concursos
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
