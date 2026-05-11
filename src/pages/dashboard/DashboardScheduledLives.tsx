import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Trophy, Copy, ExternalLink, X, Loader2, Trash2, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  createScheduledLive, listScheduledLives, cancelScheduledLive,
  buildScheduledLiveUrl, type ScheduledLive,
} from "@/lib/scheduledLives";
import { toast } from "sonner";

const empty = { title: "", description: "", cover_url: "", source_type: "external" as "external" | "internal", external_url: "", external_platform: "youtube", live_code: "", scheduled_at: "", ends_at: "" };

const DashboardScheduledLives = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduledLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<ScheduledLive | null>(null);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [newPrize, setNewPrize] = useState({ position: 1, title: "", description: "" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setItems(await listScheduledLives(user.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!selected) { setPrizes([]); return; }
    (async () => {
      const { data } = await supabase
        .from("live_ambassador_prizes").select("*")
        .eq("scheduled_live_id", selected.id).order("position");
      setPrizes(data || []);
    })();
  }, [selected]);

  const submit = async () => {
    if (!user) return;
    if (!form.title || !form.scheduled_at) { toast.error("Preenche título e data"); return; }
    if (form.source_type === "external" && !form.external_url) { toast.error("Indica o URL da live"); return; }
    if (form.source_type === "internal" && !form.live_code) { toast.error("Indica o código da live interna"); return; }
    setSaving(true);
    try {
      await createScheduledLive({
        business_user_id: user.id,
        title: form.title,
        description: form.description || undefined,
        cover_url: form.cover_url || undefined,
        source_type: form.source_type,
        external_url: form.external_url || undefined,
        external_platform: form.external_platform || undefined,
        live_code: form.live_code || undefined,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
      });
      toast.success("Live agendada!");
      setShowForm(false); setForm(empty); load();
    } catch (e: any) {
      toast.error("Erro ao agendar", { description: e.message });
    } finally { setSaving(false); }
  };

  const addPrize = async () => {
    if (!selected || !newPrize.title) return;
    const { error } = await supabase.from("live_ambassador_prizes").insert({
      business_user_id: selected.business_user_id,
      scope: "live",
      live_code: selected.live_code || selected.id,
      scheduled_live_id: selected.id,
      position: newPrize.position,
      title: newPrize.title,
      description: newPrize.description || null,
    });
    if (error) { toast.error("Erro ao adicionar prémio", { description: error.message }); return; }
    setNewPrize({ position: (newPrize.position || 0) + 1, title: "", description: "" });
    const { data } = await supabase.from("live_ambassador_prizes").select("*").eq("scheduled_live_id", selected.id).order("position");
    setPrizes(data || []);
  };

  const removePrize = async (id: string) => {
    await supabase.from("live_ambassador_prizes").delete().eq("id", id);
    setPrizes(prizes.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Lives agendadas</h1>
          <p className="text-sm text-muted-foreground">Cria lives e premeia quem mais convidados levar.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold">
          <Plus className="h-4 w-4" /> Agendar live
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-dashed border-border">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ainda não tens lives agendadas.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((sl) => (
            <motion.div key={sl.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${sl.status === "live" ? "bg-red-500/15 text-red-600" : sl.status === "ended" ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700"}`}>
                  {sl.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{sl.source_type}</span>
              </div>
              <h3 className="font-display font-bold">{sl.title}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(sl.scheduled_at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => { navigator.clipboard.writeText(buildScheduledLiveUrl(sl.slug)); toast.success("Link copiado!"); }}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary"><Copy className="h-3 w-3" /> URL</button>
                <a href={buildScheduledLiveUrl(sl.slug)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary"><ExternalLink className="h-3 w-3" /> Abrir</a>
                <button onClick={() => setSelected(sl)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-500 text-white"><Trophy className="h-3 w-3" /> Prémios</button>
                {sl.status !== "cancelled" && sl.status !== "ended" && (
                  <button onClick={async () => { await cancelScheduledLive(sl.id); toast.success("Cancelada"); load(); }}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-muted text-foreground"><X className="h-3 w-3" /> Cancelar</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New live modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold">Agendar live</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold">Título *</label>
                <input className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold">Descrição</label>
                <textarea rows={2} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold">URL da capa</label>
                <input className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, source_type: "external" })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold ${form.source_type === "external" ? "bg-emerald-500 text-white" : "bg-muted"}`}>Live externa</button>
                <button onClick={() => setForm({ ...form, source_type: "internal" })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold ${form.source_type === "internal" ? "bg-emerald-500 text-white" : "bg-muted"}`}>Live interna (Bateu)</button>
              </div>
              {form.source_type === "external" ? (
                <>
                  <div>
                    <label className="text-xs font-bold">URL da live *</label>
                    <input placeholder="https://youtube.com/live/..." className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Plataforma</label>
                    <select className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.external_platform} onChange={(e) => setForm({ ...form, external_platform: e.target.value })}>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="facebook">Facebook</option>
                      <option value="other">Outra</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-bold">Código da live (LiveHub) *</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.live_code} onChange={(e) => setForm({ ...form, live_code: e.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">Início *</label>
                  <input type="datetime-local" className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold">Fim</label>
                  <input type="datetime-local" className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </div>
              </div>
              <button disabled={saving} onClick={submit} className="w-full px-4 py-2.5 rounded-full bg-emerald-500 text-white font-bold disabled:opacity-50">
                {saving ? "A guardar…" : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prizes modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold">Prémios — {selected.title}</h2>
              <button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
            </div>
            <ul className="space-y-2 mb-4">
              {prizes.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border">
                  <span className="w-7 h-7 bg-amber-500 text-black rounded-full flex items-center justify-center text-xs font-bold">#{p.position}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.title}</p>
                    {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
                  </div>
                  <button onClick={() => removePrize(p.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {prizes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem prémios ainda.</p>}
            </ul>
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-bold">Adicionar prémio</p>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min={1} className="border border-border rounded-xl px-3 py-2 text-sm bg-background" value={newPrize.position} onChange={(e) => setNewPrize({ ...newPrize, position: parseInt(e.target.value) || 1 })} />
                <input placeholder="Título" className="col-span-2 border border-border rounded-xl px-3 py-2 text-sm bg-background" value={newPrize.title} onChange={(e) => setNewPrize({ ...newPrize, title: e.target.value })} />
              </div>
              <input placeholder="Descrição (opcional)" className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background" value={newPrize.description} onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })} />
              <button onClick={addPrize} className="w-full px-4 py-2 rounded-full bg-emerald-500 text-white font-bold text-sm">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardScheduledLives;
