import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield, Building2, User, ShieldCheck, Crown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
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
  const { role: myRole } = useAuth();
  const isSuper = myRole === "superadmin";
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    if (profiles && roles) {
      const priority = ["superadmin", "admin", "business", "user"];
      const roleMap = new Map<string, string>();
      for (const r of roles as any[]) {
        const cur = roleMap.get(r.user_id);
        if (!cur || priority.indexOf(r.role) < priority.indexOf(cur)) roleMap.set(r.user_id, r.role);
      }
      setUsers(profiles.map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || "user" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current } as any).eq("user_id", userId);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, is_verified: !current } : u));
      toast.success(!current ? "Business verified" : "Verification removed");
    } else toast.error(error.message);
  };

  const setUserRole = async (userId: string, newRole: "user" | "business" | "admin" | "superadmin") => {
    if (!isSuper) return toast.error("Superadmin only");
    if (!confirm(`Set role to "${newRole}" for this user?`)) return;
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any);
    if (error) return toast.error(error.message);
    toast.success(`Role set to ${newRole}`);
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (u.display_name?.toLowerCase().includes(s) || u.company_name?.toLowerCase().includes(s) || u.user_id.includes(s));
    }
    return true;
  });

  const roleConfig: Record<string, { label: string; color: string; icon: typeof User }> = {
    superadmin: { label: "Superadmin", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: Crown },
    admin: { label: "Admin", color: "bg-destructive/10 text-destructive", icon: Shield },
    business: { label: "Business", color: "bg-primary/10 text-primary", icon: Building2 },
    user: { label: "User", color: "bg-secondary text-muted-foreground", icon: User },
  };

  const stats = {
    total: users.length,
    business: users.filter((u) => u.role === "business").length,
    regular: users.filter((u) => u.role === "user").length,
    admin: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage all users across the platform{isSuper ? " · Superadmin tools enabled" : ""}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
          { label: "Businesses", value: stats.business, icon: Building2, color: "text-primary" },
          { label: "Participants", value: stats.regular, icon: User, color: "text-accent" },
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
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap -mx-1 px-1 overflow-x-auto sm:overflow-visible">
          {["all", "user", "business", "admin", "superadmin"].map((r) => (
            <Button key={r} variant={roleFilter === r ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => setRoleFilter(r)}>
              {r === "all" ? "All" : roleConfig[r]?.label || r}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">{u.display_name || "Unnamed"}</p>
                              {u.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            {u.company_name && <p className="text-xs text-muted-foreground">{u.company_name}</p>}
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{u.user_id}</p>
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
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {u.role === "business" && (
                            <Button variant={u.is_verified ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
                              onClick={() => toggleVerified(u.user_id, u.is_verified)}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {u.is_verified ? "Verified" : "Verify"}
                            </Button>
                          )}
                          {isSuper && u.role !== "admin" && u.role !== "superadmin" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs"
                              onClick={() => setUserRole(u.user_id, "admin")}>
                              <ArrowUpCircle className="h-3.5 w-3.5" /> Make Admin
                            </Button>
                          )}
                          {isSuper && u.role === "admin" && (
                            <Button size="sm" className="gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                              onClick={() => setUserRole(u.user_id, "superadmin")}>
                              <Crown className="h-3.5 w-3.5" /> Promote Superadmin
                            </Button>
                          )}
                          {isSuper && (u.role === "admin" || u.role === "superadmin") && (
                            <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive"
                              onClick={() => setUserRole(u.user_id, "user")}>
                              <ArrowDownCircle className="h-3.5 w-3.5" /> Demote
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
