import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield, Building2, User, MoreVertical, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  is_verified: boolean;
  role: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");

      if (profiles && roles) {
        const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
        setUsers(
          profiles.map((p) => ({
            ...p,
            role: roleMap.get(p.user_id) || "user",
          }))
        );
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.display_name?.toLowerCase().includes(s) || u.company_name?.toLowerCase().includes(s) || u.user_id.includes(s));
    }
    return true;
  });

  const roleConfig: Record<string, { label: string; color: string; icon: typeof User }> = {
    admin: { label: "Admin", color: "bg-destructive/10 text-destructive", icon: Shield },
    business: { label: "Empresa", color: "bg-primary/10 text-primary", icon: Building2 },
    user: { label: "Utilizador", color: "bg-secondary text-muted-foreground", icon: User },
  };

  const stats = {
    total: users.length,
    business: users.filter((u) => u.role === "business").length,
    regular: users.filter((u) => u.role === "user").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Utilizadores</h1>
        <p className="text-sm text-muted-foreground">Gerir todos os utilizadores da plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
          { label: "Empresas", value: stats.business, icon: Building2, color: "text-primary" },
          { label: "Participantes", value: stats.regular, icon: User, color: "text-accent" },
          { label: "Admins", value: stats.admin, icon: Shield, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar utilizadores..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["all", "user", "business", "admin"].map((r) => (
            <Button key={r} variant={roleFilter === r ? "default" : "outline"} size="sm" onClick={() => setRoleFilter(r)}>
              {r === "all" ? "Todos" : roleConfig[r]?.label || r}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Data de Registo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const config = roleConfig[u.role] || roleConfig.user;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                            {(u.display_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.display_name || "Sem nome"}</p>
                            {u.company_name && <p className="text-xs text-muted-foreground">{u.company_name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <config.icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString("pt-MZ")}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
