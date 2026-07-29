import { useEffect, useMemo, useState } from "react";
import { Trophy, Plus, Trash2, Award, Loader2, Sparkles, Download, Save, X, ExternalLink, Copy, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchRanking, buildLiveRankingUrl, type AmbassadorRanking } from "@/lib/ambassador";
import { toast } from "sonner";

type Prize = {
  id: string;
  business_user_id: string;
  scope: "live" | "all_time";
  live_code: string | null;
  position: number;
  title: string;
  description: string | null;
  winner_user_id: string | null;
  awarded_at: string | null;
  award_mode: "auto" | "manual" | null;
  notified_at: string | null;
};

const DashboardAmbassadors = () => {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCode, setFilterCode] = useState<string>("");
  const [scope, setScope] = useState<"live" | "all_time">("all_time");
  const [ranking, setRanking] = useState<AmbassadorRanking[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ scope: "live" | "all_time"; live_code: string; position: number; title: string; description: string }>({
    scope: "all_time", live_code: "", position: 1, title: "", description: "",
  });

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("live_ambassador_prizes")
        .select("*")
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data || []) as Prize[];
      setPrizes(list);
      const r = await fetchRanking(user.id, scope === "live" ? filterCode : undefined);
      setRanking(r);
      // Auto-attribute prizes whose position now has a leader.
      for (const p of list) {
        if (p.winner_user_id) continue;
        if (p.scope === "live" && (!filterCode || p.live_code !== filterCode)) {
          // skip if we don't have ranking for that live loaded
          continue;
        }
        const candidate = r[p.position - 1];
        if (candidate?.user_id) {
          const { data: res, error } = await supabase.rpc("award_ambassador_prize", { p_prize_id: p.id, p_mode: "auto" });
          if (!error && res && (res as any).winner_user_id) {
            toast.success(`Prémio "${p.title}" atribuído automaticamente`);
          }
        }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user?.id, scope, filterCode]);

  const savePrize = async () => {
    if (!user) return;
    if (!draft.title.trim()) return toast.error("Indica o título do prémio");
    if (draft.scope === "live" && !draft.live_code.trim()) return toast.error("Indica o código da live");
    const { error } = await supabase.from("live_ambassador_prizes").insert({
      business_user_id: user.id,
      scope: draft.scope,
      live_code: draft.scope === "live" ? draft.live_code.trim() : null,
      position: draft.position,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
    });
    if (error) return toast.error("Erro ao guardar", { description: error.message });
    toast.success("Prémio adicionado");
    setAdding(false);
    setDraft({ scope: "all_time", live_code: "", position: 1, title: "", description: "" });
    reload();
  };

  const removePrize = async (id: string) => {
    if (!confirm("Remover este prémio?")) return;
    const { error } = await supabase.from("live_ambassador_prizes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Prémio removido");
    reload();
  };

  const awardPrize = async (prize: Prize) => {
    const { data, error } = await supabase.rpc("award_ambassador_prize", { p_prize_id: prize.id, p_mode: "manual" });
    if (error) return toast.error(error.message);
    const res = data as any;
    if (res?.no_winner) return toast.error("Ainda não há embaixador na posição " + prize.position);
    if (res?.already_awarded) return toast.info("Este prémio já foi atribuído.");
    toast.success(`Prémio atribuído${res?.winner_name ? ` a ${res.winner_name}` : ""}. Vencedor notificado.`);
    reload();
  };

  const copyLiveLink = async (code: string) => {
    await navigator.clipboard.writeText(buildLiveRankingUrl(code));
    toast.success("Link público do ranking copiado!");
  };

  const exportCSV = () => {
    const header = "position,display_name,ref_code,visits\n";
    const rows = ranking.map((r, i) => `${i + 1},"${(r.display_name || "").replace(/"/g, '""')}",${r.ref_code},${r.visits}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `embaixadores-${scope === "live" ? filterCode || "live" : "geral"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const liveCodes = useMemo(() => Array.from(new Set(prizes.filter(p => p.scope === "live" && p.live_code).map(p => p.live_code!))), [prizes]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-500" /> Embaixadores da Live
          </h1>
          <p className="text-sm text-muted-foreground">
            Os teus utilizadores partilham um link único e ganham prémios pelo número de novos convidados.
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          <Plus className="h-4 w-4" /> Novo prémio
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold">Novo prémio para embaixadores</h3>
            <button onClick={() => setAdding(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="block mb-1 text-muted-foreground">Âmbito</span>
              <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2">
                <option value="all_time">Acumulado (sempre)</option>
                <option value="live">Por live (código)</option>
              </select>
            </label>
            {draft.scope === "live" && (
              <label className="text-xs">
                <span className="block mb-1 text-muted-foreground">Código da live</span>
                <input value={draft.live_code} onChange={(e) => setDraft({ ...draft, live_code: e.target.value.toUpperCase() })}
                  placeholder="LIVE123" className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono" />
              </label>
            )}
            <label className="text-xs">
              <span className="block mb-1 text-muted-foreground">Posição premiada</span>
              <select value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2">
                {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}º lugar</option>)}
              </select>
            </label>
            <label className="text-xs col-span-2">
              <span className="block mb-1 text-muted-foreground">Título do prémio</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex: Voucher 5.000 MT" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <label className="text-xs col-span-2">
              <span className="block mb-1 text-muted-foreground">Descrição (opcional)</span>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
          </div>
          <button onClick={savePrize} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            <Save className="h-4 w-4" /> Guardar prémio
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Award className="h-4 w-4 text-emerald-500" />
          <h3 className="font-display text-sm font-bold">Prémios configurados</h3>
        </div>
        {prizes.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Ainda não definiste prémios para embaixadores.</p>
        ) : (
          <ul className="divide-y divide-border">
            {prizes.map((p) => (
              <li key={p.id} className="p-4 flex items-center gap-3 flex-wrap">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 font-bold">
                  {p.position}º
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate">{p.title}</p>
                    {p.winner_user_id ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Atribuído
                        </span>
                        {p.notified_at && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 font-bold">
                            🔔 Notificado
                          </span>
                        )}
                        {p.award_mode && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.award_mode === "auto" ? "bg-purple-500/15 text-purple-700" : "bg-slate-500/15 text-slate-700"}`}>
                            {p.award_mode === "auto" ? "Automático" : "Manual"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-bold">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {p.scope === "live" ? `Live ${p.live_code}` : "Acumulado (sempre)"}
                    {p.description ? ` · ${p.description}` : ""}
                    {p.winner_user_id && p.awarded_at ? ` · Atribuído em ${new Date(p.awarded_at).toLocaleString("pt-PT")}` : ""}
                  </p>
                </div>
                {p.scope === "live" && p.live_code && (
                  <>
                    <button onClick={() => copyLiveLink(p.live_code!)}
                      className="text-[11px] px-2 py-1.5 rounded-full bg-secondary inline-flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Link
                    </button>
                    <Link to={`/lives/${p.live_code}/ranking`} target="_blank"
                      className="text-[11px] px-2 py-1.5 rounded-full bg-secondary inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Ver
                    </Link>
                  </>
                )}
                {!p.winner_user_id && (
                  <button onClick={() => awardPrize(p)} className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold">
                    Atribuir ao #{p.position}
                  </button>
                )}
                <button onClick={() => removePrize(p.id)} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="font-display text-sm font-bold flex-1">Ranking de embaixadores</h3>
          <select value={scope} onChange={(e) => setScope(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
            <option value="all_time">Acumulado</option>
            <option value="live">Por live</option>
          </select>
          {scope === "live" && (
            <input value={filterCode} onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
              list="live-codes" placeholder="Código" className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono w-28" />
          )}
          <datalist id="live-codes">{liveCodes.map(c => <option key={c} value={c} />)}</datalist>
          <button onClick={exportCSV} disabled={!ranking.length}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-secondary disabled:opacity-50">
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center inline-flex items-center gap-2 justify-center w-full">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </p>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Sem embaixadores para mostrar.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ranking.map((r, i) => (
              <li key={r.ambassador_id} className="p-3 flex items-center gap-3">
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.display_name || r.ref_code.toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{r.ref_code}</p>
                </div>
                <span className="text-base font-extrabold text-emerald-600">{r.visits}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-500" />
          <h3 className="font-display text-sm font-bold flex-1">Auditoria de prémios</h3>
          <span className="text-[10px] text-muted-foreground">{prizes.length} registo(s)</span>
        </div>
        {prizes.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">Sem histórico ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-bold">Prémio</th>
                  <th className="text-left px-3 py-2 font-bold">Âmbito</th>
                  <th className="text-left px-3 py-2 font-bold">Posição</th>
                  <th className="text-left px-3 py-2 font-bold">Estado</th>
                  <th className="text-left px-3 py-2 font-bold">Modo</th>
                  <th className="text-left px-3 py-2 font-bold">Atribuído em</th>
                  <th className="text-left px-3 py-2 font-bold">Notificado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prizes.map((p) => {
                  const state = !p.winner_user_id ? "pendente" : p.notified_at ? "notificado" : "atribuído";
                  const stateColor = state === "pendente"
                    ? "bg-amber-500/15 text-amber-700"
                    : state === "notificado" ? "bg-sky-500/15 text-sky-700" : "bg-emerald-500/15 text-emerald-700";
                  return (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{p.title}</td>
                      <td className="px-3 py-2">{p.scope === "live" ? `Live ${p.live_code}` : "Acumulado"}</td>
                      <td className="px-3 py-2">#{p.position}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${stateColor}`}>{state}</span>
                      </td>
                      <td className="px-3 py-2">{p.award_mode ? (p.award_mode === "auto" ? "Automático" : "Manual") : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.awarded_at ? new Date(p.awarded_at).toLocaleString("pt-PT") : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.notified_at ? new Date(p.notified_at).toLocaleString("pt-PT") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardAmbassadors;
