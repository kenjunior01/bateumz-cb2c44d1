import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Crown, DollarSign, Percent } from "lucide-react";
import { formatMoney } from "@/lib/currency";

interface Region { country_code: string; label: string; flag: string | null; currency: string; }
interface CommissionRow { user_id: string; country_code: string; commission_percentage: number; display_name?: string | null; }

interface CountrySummary {
  country: string;
  flag: string | null;
  label: string;
  currency: string;
  revenue: number;
  tickets: number;
  raffles: number;
  admins: CommissionRow[];
  totalCommissionPct: number;
  commissionAmount: number;
  platformNet: number;
}

export default function AdminRegionalRevenue() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CountrySummary[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: regions }, { data: raffles }, { data: comms }, { data: ar }] = await Promise.all([
        supabase.from("regions").select("*").eq("is_active", true).order("label"),
        supabase.from("raffles").select("country, currency, ticket_price, sold_tickets"),
        supabase.from("regional_commissions").select("user_id, country_code, commission_percentage"),
        supabase.from("admin_regions").select("user_id, country_code"),
      ]);
      const adminIds = Array.from(new Set([...(comms ?? []).map((c: any) => c.user_id), ...(ar ?? []).map((a: any) => a.user_id)]));
      const { data: profs } = adminIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", adminIds)
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));

      const summary = new Map<string, CountrySummary>();
      for (const r of (regions ?? []) as Region[]) {
        summary.set(r.country_code, {
          country: r.country_code, flag: r.flag, label: r.label, currency: r.currency,
          revenue: 0, tickets: 0, raffles: 0, admins: [], totalCommissionPct: 0,
          commissionAmount: 0, platformNet: 0,
        });
      }
      for (const raffle of (raffles ?? []) as any[]) {
        const s = summary.get(raffle.country ?? "US");
        if (!s) continue;
        const rev = Number(raffle.ticket_price ?? 0) * Number(raffle.sold_tickets ?? 0);
        s.revenue += rev;
        s.tickets += Number(raffle.sold_tickets ?? 0);
        s.raffles += 1;
      }
      for (const c of (comms ?? []) as any[]) {
        const s = summary.get(c.country_code);
        if (!s) continue;
        s.admins.push({ ...c, display_name: profMap.get(c.user_id) ?? null });
        s.totalCommissionPct += Number(c.commission_percentage);
      }
      for (const a of (ar ?? []) as any[]) {
        const s = summary.get(a.country_code);
        if (!s) continue;
        if (!s.admins.find((x) => x.user_id === a.user_id)) {
          s.admins.push({ user_id: a.user_id, country_code: a.country_code, commission_percentage: 0, display_name: profMap.get(a.user_id) ?? null });
        }
      }
      for (const s of summary.values()) {
        s.commissionAmount = (s.revenue * s.totalCommissionPct) / 100;
        s.platformNet = s.revenue - s.commissionAmount;
      }
      setRows(Array.from(summary.values()).sort((a, b) => b.revenue - a.revenue));
      setLoading(false);
    })();
  }, []);

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (role !== "superadmin") return <Navigate to="/admin" replace />;

  const grandRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const grandCommission = rows.reduce((s, r) => s + r.commissionAmount, 0);
  const grandNet = rows.reduce((s, r) => s + r.platformNet, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Crown className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Regional Revenue</h1>
          <p className="text-sm text-muted-foreground">Per-country revenue and regional admin commissions.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total revenue (all regions)</p>
          <p className="text-2xl font-bold mt-1 flex items-center gap-1"><DollarSign className="h-5 w-5" />{formatMoney(grandRevenue, "USD")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Regional commissions</p>
          <p className="text-2xl font-bold mt-1 flex items-center gap-1 text-amber-500"><Percent className="h-5 w-5" />{formatMoney(grandCommission, "USD")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Platform net</p>
          <p className="text-2xl font-bold mt-1 text-primary">{formatMoney(grandNet, "USD")}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Breakdown by country</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Raffles</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Regional admins</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead>Commission $</TableHead>
                    <TableHead>Platform net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.country}>
                      <TableCell><div className="flex items-center gap-2"><span>{r.flag}</span><span className="font-medium">{r.label}</span><Badge variant="outline" className="text-xs">{r.currency}</Badge></div></TableCell>
                      <TableCell>{r.raffles}</TableCell>
                      <TableCell>{r.tickets}</TableCell>
                      <TableCell className="font-medium">{formatMoney(r.revenue, r.currency as any)}</TableCell>
                      <TableCell>
                        {r.admins.length === 0 ? <span className="text-xs text-muted-foreground">Unassigned</span> : (
                          <div className="space-y-0.5">
                            {r.admins.map((a) => (
                              <div key={a.user_id} className="text-xs">
                                {a.display_name ?? a.user_id.slice(0, 8)} <span className="text-muted-foreground">· {a.commission_percentage}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{r.totalCommissionPct}%</TableCell>
                      <TableCell className="text-amber-500">{formatMoney(r.commissionAmount, r.currency as any)}</TableCell>
                      <TableCell className="font-medium text-primary">{formatMoney(r.platformNet, r.currency as any)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
