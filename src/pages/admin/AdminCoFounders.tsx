import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Crown, Percent, Globe, Save, Trash2, UserPlus } from "lucide-react";

interface Region { country_code: string; label: string; flag: string | null; currency: string; }
interface AdminRow {
  user_id: string;
  display_name: string | null;
  email_hint?: string | null;
  country_code: string | null;
  commission_percentage: number | null;
}

export default function AdminCoFounders() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<Region[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; display_name: string | null; company_name: string | null }[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newPct, setNewPct] = useState("10");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: regs }, { data: roles }, { data: ar }, { data: rc }, { data: profsAll }] = await Promise.all([
      supabase.from("regions").select("*").order("label"),
      supabase.from("user_roles").select("user_id").in("role", ["admin", "superadmin"]),
      supabase.from("admin_regions").select("user_id, country_code"),
      supabase.from("regional_commissions").select("user_id, commission_percentage"),
      supabase.from("profiles").select("user_id, display_name, company_name").order("created_at", { ascending: false }).limit(500),
    ]);
    const adminIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    const profMap = new Map((profsAll ?? []).map((p: any) => [p.user_id, p.display_name]));

    const arMap = new Map((ar ?? []).map((r: any) => [r.user_id, r.country_code]));
    const rcMap = new Map((rc ?? []).map((r: any) => [r.user_id, Number(r.commission_percentage)]));

    setAllProfiles((profsAll ?? []) as any);
    setRegions((regs ?? []) as Region[]);
    setAdmins(adminIds.map((uid) => ({
      user_id: uid,
      display_name: profMap.get(uid) ?? null,
      country_code: arMap.get(uid) ?? null,
      commission_percentage: rcMap.get(uid) ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (role !== "superadmin") return <Navigate to="/admin" replace />;

  const saveRow = async (row: AdminRow, country: string, pct: number) => {
    setSaving(true);
    try {
      // Ensure user has admin role (auto-promote regional CEO if needed)
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", row.user_id);
      const roles = (existingRoles ?? []).map((r: any) => r.role);
      if (!roles.includes("admin") && !roles.includes("superadmin")) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: row.user_id, role: "admin" } as any);
        if (roleErr) throw roleErr;
      }
      const upsertAR = await supabase.from("admin_regions").upsert(
        { user_id: row.user_id, country_code: country },
        { onConflict: "user_id" }
      );
      if (upsertAR.error) throw upsertAR.error;
      const upsertRC = await supabase.from("regional_commissions").upsert(
        { user_id: row.user_id, country_code: country, commission_percentage: pct },
        { onConflict: "user_id" }
      );
      if (upsertRC.error) throw upsertRC.error;
      toast({ title: "Saved", description: "Regional CEO promoted and commission updated." });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row: AdminRow) => {
    if (!confirm(`Remove regional assignment for ${row.display_name ?? row.user_id}?`)) return;
    await Promise.all([
      supabase.from("admin_regions").delete().eq("user_id", row.user_id),
      supabase.from("regional_commissions").delete().eq("user_id", row.user_id),
    ]);
    toast({ title: "Removed" });
    load();
  };

  const addNew = async () => {
    if (!newUserId.trim() || !newCountry) {
      toast({ title: "Missing fields", description: "User ID and country are required.", variant: "destructive" });
      return;
    }
    await saveRow({ user_id: newUserId.trim() } as AdminRow, newCountry, Number(newPct) || 10);
    setNewUserId(""); setNewCountry(""); setNewPct("10");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Co-founder Settings</h1>
          <p className="text-sm text-muted-foreground">Assign regional admins to countries and set commission percentages.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Assign new regional CEO</CardTitle>
          <p className="text-xs text-muted-foreground">Pick any user — they will be promoted to admin and linked to the selected country.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto]">
          <Select value={newUserId} onValueChange={setNewUserId}>
            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {allProfiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.display_name || p.company_name || "Unnamed"} · {p.user_id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newCountry} onValueChange={setNewCountry}>
            <SelectTrigger><Globe className="h-4 w-4 mr-1" /><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>{regions.map(r => (
              <SelectItem key={r.country_code} value={r.country_code}>{r.flag} {r.label}</SelectItem>
            ))}</SelectContent>
          </Select>
          <div className="relative">
            <Input type="number" min={0} max={100} step={0.5} value={newPct} onChange={(e) => setNewPct(e.target.value)} className="pr-8" />
            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Button onClick={addNew} disabled={saving || !newUserId || !newCountry}>Promote</Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Regional admins</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No admin users yet.</p>
          ) : (
            <div className="space-y-2">
              {admins.map((row) => (
                <AdminEditor key={row.user_id} row={row} regions={regions} onSave={saveRow} onRemove={removeRow} saving={saving} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminEditor({ row, regions, onSave, onRemove, saving }: {
  row: AdminRow; regions: Region[]; saving: boolean;
  onSave: (r: AdminRow, c: string, p: number) => void;
  onRemove: (r: AdminRow) => void;
}) {
  const [country, setCountry] = useState(row.country_code ?? "");
  const [pct, setPct] = useState(String(row.commission_percentage ?? 10));
  const dirty = country !== (row.country_code ?? "") || Number(pct) !== (row.commission_percentage ?? 10);

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto_auto] items-center p-3 rounded-lg border border-border bg-card/40">
      <div className="min-w-0">
        <p className="font-medium truncate">{row.display_name || "Unnamed admin"}</p>
        <p className="text-xs text-muted-foreground truncate font-mono">{row.user_id}</p>
        {row.country_code && (
          <Badge variant="secondary" className="mt-1">
            {regions.find(r => r.country_code === row.country_code)?.flag} {row.country_code}
          </Badge>
        )}
      </div>
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger><Globe className="h-4 w-4 mr-1" /><SelectValue placeholder="Assign country" /></SelectTrigger>
        <SelectContent>{regions.map(r => (
          <SelectItem key={r.country_code} value={r.country_code}>{r.flag} {r.label}</SelectItem>
        ))}</SelectContent>
      </Select>
      <div className="relative">
        <Input type="number" min={0} max={100} step={0.5} value={pct} onChange={(e) => setPct(e.target.value)} className="pr-8" />
        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <Button size="sm" disabled={!country || !dirty || saving} onClick={() => onSave(row, country, Number(pct) || 0)}>
        <Save className="h-4 w-4 mr-1" /> Save
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onRemove(row)} disabled={!row.country_code}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
