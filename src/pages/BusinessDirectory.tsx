import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, CheckCircle, Ticket, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface BusinessItem {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  raffle_count: number;
  contest_count: number;
}

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Get all business role users
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

      // Sort: verified first, then by activity
      items.sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return (b.raffle_count + b.contest_count) - (a.raffle_count + a.contest_count);
      });

      setBusinesses(items);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return businesses;
    const q = search.toLowerCase();
    return businesses.filter(b =>
      (b.company_name || "").toLowerCase().includes(q) ||
      (b.display_name || "").toLowerCase().includes(q)
    );
  }, [businesses, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Diretório de Empresas</h1>
          <p className="text-muted-foreground">Encontre empresas, veja os seus sorteios e concursos</p>
        </motion.div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar empresas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
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
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/30"
                  onClick={() => navigate(`/empresa/${b.user_id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
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
