import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Ticket, Trophy, Calendar, MapPin, Mail, Phone, Edit2, Camera, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMZN } from "@/lib/currency";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Participation {
  id: string;
  ticket_number: number;
  payment_status: string;
  payment_method: string | null;
  status: string;
  created_at: string;
  raffle: {
    title: string;
    prize_title: string;
    ticket_price: number;
    status: string;
    slug: string | null;
    image_url: string | null;
    end_date: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  confirmed: { label: "Confirmado", icon: CheckCircle2, color: "text-primary" },
  pending: { label: "Pendente", icon: AlertCircle, color: "text-yellow-500" },
  rejected: { label: "Rejeitado", icon: XCircle, color: "text-destructive" },
  active: { label: "Ativo", icon: CheckCircle2, color: "text-primary" },
};

const Profile = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, spent: 0 });

  useEffect(() => {
    if (!user) return;
    setDisplayName(profile?.display_name || "");
    setPhone(profile?.phone || "");

    const fetchParticipations = async () => {
      const { data } = await supabase
        .from("participants")
        .select("id, ticket_number, payment_status, payment_method, status, created_at, raffle_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        setParticipations([]);
        setLoading(false);
        return;
      }

      const raffleIds = [...new Set(data.map((p) => p.raffle_id))];
      const { data: raffles } = await supabase
        .from("raffles")
        .select("id, title, prize_title, ticket_price, status, slug, image_url, end_date")
        .in("id", raffleIds);

      const raffleMap = new Map(raffles?.map((r) => [r.id, r]) || []);

      const mapped: Participation[] = data.map((p) => ({
        ...p,
        raffle: raffleMap.get(p.raffle_id) || null,
      }));

      setParticipations(mapped);

      const confirmed = mapped.filter((p) => p.payment_status === "confirmed").length;
      const pending = mapped.filter((p) => p.payment_status === "pending").length;
      const spent = mapped
        .filter((p) => p.payment_status === "confirmed")
        .reduce((sum, p) => sum + (p.raffle?.ticket_price || 0), 0);

      setStats({ total: mapped.length, confirmed, pending, spent });
      setLoading(false);
    };

    fetchParticipations();
  }, [user, profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, phone })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao guardar perfil");
    } else {
      toast.success("Perfil actualizado!");
      setEditing(false);
    }
  };

  const initials = (profile?.display_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-20 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-24 sm:pt-28 pb-24">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <Card className="glass border-primary/10 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />
            <CardContent className="relative px-4 sm:px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10 text-center sm:text-left">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-3 max-w-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Telefone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84..." className="mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? "A guardar..." : "Guardar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                        {profile?.display_name || "Utilizador"}
                      </h1>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 max-w-full truncate"><Mail className="h-3.5 w-3.5 shrink-0" />{user?.email}</span>
                        {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Membro desde {new Date(user?.created_at || "").toLocaleDateString("pt-MZ", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {!editing && (
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setEditing(true)}>
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Bilhetes", value: stats.total, icon: Ticket, color: "bg-primary/15 text-primary" },
            { label: "Confirmados", value: stats.confirmed, icon: CheckCircle2, color: "bg-green-500/15 text-green-500" },
            { label: "Pendentes", value: stats.pending, icon: Clock, color: "bg-yellow-500/15 text-yellow-500" },
            { label: "Total Gasto", value: formatMZN(stats.spent), icon: Trophy, color: "bg-accent/15 text-accent" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="glass">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-bold text-foreground text-lg">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Participation History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Histórico de Participações</h2>
              <TabsList className="glass border border-border">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="confirmed" className="text-xs">Confirmados</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">Pendentes</TabsTrigger>
              </TabsList>
            </div>

            {["all", "confirmed", "pending"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                {participations.length === 0 ? (
                  <Card className="glass">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Ticket className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground font-medium">Ainda não participaste em nenhum sorteio</p>
                      <Button className="mt-4" onClick={() => navigate("/marketplace")}>
                        Explorar Sorteios
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {participations
                        .filter((p) => tab === "all" || p.payment_status === tab)
                        .map((p, i) => {
                          const sc = statusConfig[p.payment_status] || statusConfig.pending;
                          const StatusIcon = sc.icon;
                          return (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              <Card
                                className="glass hover:border-primary/20 transition-all cursor-pointer group"
                                onClick={() => p.raffle?.slug && navigate(`/raffle/${p.raffle.slug}`)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-4">
                                    {p.raffle?.image_url ? (
                                      <img
                                        src={p.raffle.image_url}
                                        alt={p.raffle.title}
                                        className="h-14 w-14 rounded-xl object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Ticket className="h-6 w-6 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                            {p.raffle?.title || "Sorteio"}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            🎁 {p.raffle?.prize_title || "Prémio"}
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                                          #{String(p.ticket_number).padStart(4, "0")}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span className={`flex items-center gap-1 ${sc.color}`}>
                                            <StatusIcon className="h-3.5 w-3.5" />
                                            {sc.label}
                                          </span>
                                          <span>{p.payment_method?.toUpperCase() || "—"}</span>
                                          <span>{new Date(p.created_at).toLocaleDateString("pt-MZ")}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">
                                          {formatMZN(p.raffle?.ticket_price || 0)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                    </AnimatePresence>
                    {participations.filter((p) => tab === "all" || p.payment_status === tab).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhum bilhete com este estado.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
