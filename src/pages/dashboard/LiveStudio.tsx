import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Radio, Calendar, Trophy, Megaphone, BarChart3, Copy, ExternalLink, Plus, X, CheckCircle2, Circle, Play, Pause, Square, Sparkles, MessageSquare, Tv, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchScheduledLiveById, updateScheduledLive, fetchScheduledLiveRanking, buildScheduledLiveUrl, type ScheduledLive } from "@/lib/scheduledLives";
import { listLiveLinks, addLiveLink, removeLiveLink, listPolls, createPoll, closePoll, listPollVotes, listAnnouncements, postAnnouncement, listChecklist, setChecklistItem, getStudioSummary, buildOverlayUrl, PLATFORM_META, type LiveLink, type LivePoll, type LiveAnnouncement, type ChecklistItem, type LivePlatform, type StudioSummary, type ChecklistPhase } from "@/lib/liveStudio";
import { toast } from "sonner";

const tabs = ["pre", "during", "post"] as const;
type TabKey = typeof tabs[number];

const LiveStudio = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [live, setLive] = useState<ScheduledLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("pre");

  const [links, setLinks] = useState<LiveLink[]>([]);
  const [newLink, setNewLink] = useState({ platform: "instagram" as LivePlatform, url: "", label: "" });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<string, number[]>>({});
  const [newPoll, setNewPoll] = useState({ q: "", opts: ["", ""] });
  const [announcements, setAnnouncements] = useState<LiveAnnouncement[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [ranking, setRanking] = useState<any[]>([]);
  const [summary, setSummary] = useState<StudioSummary | null>(null);
  const [prizes, setPrizes] = useState<any[]>([]);

  const reload = async (lid: string) => {
    const [ls, ck, pl, an, rk, sm, pr] = await Promise.all([
      listLiveLinks(lid), listChecklist(lid), listPolls(lid), listAnnouncements(lid),
      fetchScheduledLiveRanking(lid, { limit: 20 }), getStudioSummary(lid),
      supabase.from("live_ambassador_prizes").select("*").eq("scheduled_live_id", lid).order("position"),
    ]);
    setLinks(ls); setChecklist(ck); setPolls(pl); setAnnouncements(an); setRanking(rk); setSummary(sm);
    setPrizes((pr.data as any[]) || []);
    // load votes for open polls
    const votesMap: Record<string, number[]> = {};
    await Promise.all(pl.map(async (p) => {
      const v = await listPollVotes(p.id);
      const counts = new Array(p.options.length).fill(0);
      v.forEach((x) => { if (x.option_index >= 0 && x.option_index < counts.length) counts[x.option_index]++; });
      votesMap[p.id] = counts;
    }));
    setPollVotes(votesMap);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sl = await fetchScheduledLiveById(id);
      if (!active) return;
      setLive(sl);
      if (sl) {
        await reload(sl.id);
        // Auto-select the most relevant tab based on status
        if (sl.status === "live") setTab("during");
        else if (sl.status === "ended" || sl.status === "cancelled") setTab("post");
        else setTab("pre");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!live) return;
    const ch = supabase.channel(`studio-${live.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_polls", filter: `scheduled_live_id=eq.${live.id}` }, () => reload(live.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "live_poll_votes" }, () => reload(live.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "live_announcements", filter: `scheduled_live_id=eq.${live.id}` }, () => reload(live.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "live_ambassador_visits", filter: `scheduled_live_id=eq.${live.id}` }, () => reload(live.id))
      .subscribe();
    const t = setInterval(() => reload(live.id), 15000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [live?.id]);

  const setStatus = async (status: ScheduledLive["status"]) => {
    if (!live) return;
    await updateScheduledLive(live.id, { status } as any);
    setLive({ ...live, status });
    toast.success(`Live: ${status}`);
  };

  const submitLink = async () => {
    if (!live || !newLink.url) return;
    try {
      await addLiveLink({ scheduled_live_id: live.id, platform: newLink.platform, url: newLink.url, label: newLink.label || null, is_primary: links.length === 0 });
      setNewLink({ platform: newLink.platform, url: "", label: "" });
      reload(live.id);
    } catch (e: any) { toast.error("Erro", { description: e.message }); }
  };

  const submitPoll = async () => {
    if (!live || !newPoll.q || newPoll.opts.filter(Boolean).length < 2) return;
    await createPoll(live.id, newPoll.q, newPoll.opts.filter(Boolean));
    setNewPoll({ q: "", opts: ["", ""] });
  };

  const submitAnnouncement = async () => {
    if (!live || !newMsg) return;
    await postAnnouncement(live.id, newMsg);
    setNewMsg("");
  };

  const liveUrl = useMemo(() => live ? buildScheduledLiveUrl(live.slug) : "", [live]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  if (!live) return <div className="text-center py-24"><p className="text-sm text-muted-foreground">Live não encontrada</p><Link to="/dashboard/scheduled-lives" className="text-emerald-600 text-xs">Voltar</Link></div>;
  if (live.business_user_id !== user?.id) return <div className="text-center py-24 text-sm text-muted-foreground">Esta live não te pertence.</div>;

  const isLive = live.status === "live";
  const isEnded = live.status === "ended";
  const isCancelled = live.status === "cancelled";
  const isScheduled = live.status === "scheduled";

  const overlayRanking = buildOverlayUrl(live.id, "ranking");
  const openOverlay = (view: "ranking" | "prizes" | "countdown" | "announcement" = "ranking") => {
    window.open(buildOverlayUrl(live.id, view), "_blank", "noopener,width=1280,height=720");
  };

  const statusBg = isLive
    ? "from-red-500/15 via-amber-500/10 to-emerald-500/10"
    : isEnded
      ? "from-zinc-500/10 via-zinc-400/5 to-zinc-500/10"
      : isCancelled
        ? "from-rose-500/10 via-zinc-400/5 to-rose-500/10"
        : "from-emerald-500/10 via-amber-500/10 to-blue-500/10";

  const statusLabel = isLive ? "AO VIVO" : isEnded ? "Encerrada" : isCancelled ? "Cancelada" : "Agendada";
  const statusPill = isLive
    ? "bg-red-500 text-white animate-pulse"
    : isEnded
      ? "bg-zinc-700 text-white"
      : isCancelled
        ? "bg-rose-500 text-white"
        : "bg-emerald-500/20 text-emerald-700";

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl bg-gradient-to-br ${statusBg} border border-border p-4`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusPill}`}>{statusLabel}</span>
          <span className="text-[11px] text-muted-foreground"><Calendar className="inline h-3 w-3 mr-1" />{new Date(live.scheduled_at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold mt-2">{live.title}</h1>
        {isCancelled && <p className="text-xs text-rose-600 mt-1">Esta live foi cancelada. Apenas o resumo está disponível.</p>}
        {isEnded && <p className="text-xs text-muted-foreground mt-1">Live encerrada — vê o resumo na aba Pós-Live.</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => { navigator.clipboard.writeText(liveUrl); toast.success("Link público copiado!"); }} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-secondary"><Copy className="h-3 w-3" />Link público</button>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-secondary"><ExternalLink className="h-3 w-3" />Abrir live</a>
          <button onClick={() => openOverlay("ranking")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-blue-500 text-white font-bold"><Tv className="h-3 w-3" />Abrir overlay</button>
          <button onClick={() => { navigator.clipboard.writeText(overlayRanking); toast.success("Link do overlay copiado!"); }} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-secondary"><Copy className="h-3 w-3" />Link overlay</button>
          {!isLive && !isEnded && !isCancelled && <button onClick={() => setStatus("live")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-red-500 text-white font-bold"><Play className="h-3 w-3" />Ir Live</button>}
          {isLive && <button onClick={() => setStatus("scheduled")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-amber-500 text-white font-bold"><Pause className="h-3 w-3" />Pausar</button>}
          {!isEnded && !isCancelled && <button onClick={() => setStatus("ended")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-700 text-white font-bold"><Square className="h-3 w-3" />Encerrar</button>}
          {isEnded && <button onClick={() => setStatus("scheduled")} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full bg-emerald-500 text-white font-bold"><Play className="h-3 w-3" />Reabrir</button>}
        </div>
      </div>

      {(() => {
        const recommended: TabKey = isLive ? "during" : (isEnded || isCancelled) ? "post" : "pre";
        const labels: Record<TabKey, string> = { pre: "Pré-Live", during: "Ao Vivo", post: "Pós-Live" };
        return (
          <div className="flex gap-1 p-1 rounded-full bg-secondary/50 w-fit overflow-x-auto">
            {tabs.map((tk) => (
              <button key={tk} onClick={() => setTab(tk)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap relative ${tab === tk ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
                {labels[tk]}
                {recommended === tk && tab !== tk && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />}
              </button>
            ))}
          </div>
        );
      })()}

      {(() => {
        const phaseFor = (t: TabKey): ChecklistPhase => t;
        const items = checklist.filter((c) => c.phase === phaseFor(tab));
        if (items.length === 0) return null;
        const done = items.filter((i) => i.done).length;
        return (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Checklist {tab === "pre" ? "pré-live" : tab === "during" ? "durante" : "pós-live"}</h2>
              <span className="text-[10px] font-bold text-muted-foreground">{done}/{items.length}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {items.map((c) => (
                <li key={c.key}>
                  <button onClick={async () => { await setChecklistItem(live.id, c.key, !c.done); reload(live.id); }} className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-secondary">
                    {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {tab === "pre" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2"><LinkIcon className="h-4 w-4 text-blue-500" />Links das plataformas</h2>
            <ul className="space-y-2 mb-3">
              {links.map((l) => {
                const meta = PLATFORM_META[l.platform];
                return (
                  <li key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border">
                    <span className={`h-7 w-7 rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-[10px] font-bold`}>{meta.label.charAt(0)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{l.label || meta.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{l.url}</p>
                    </div>
                    <button onClick={() => removeLiveLink(l.id).then(() => reload(live.id))} className="text-red-500"><X className="h-4 w-4" /></button>
                  </li>
                );
              })}
              {links.length === 0 && <li className="text-xs text-muted-foreground text-center py-3">Sem links ainda.</li>}
            </ul>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-2">
                <select value={newLink.platform} onChange={(e) => setNewLink({ ...newLink, platform: e.target.value as LivePlatform })} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background">
                  {Object.entries(PLATFORM_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input placeholder="Etiqueta (opcional)" value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background" />
              </div>
              <input placeholder="https://…" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background" />
              <button onClick={submitLink} className="w-full text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center gap-1"><Plus className="h-3 w-3" />Adicionar</button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />Materiais para divulgar</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border p-3 flex flex-col items-center text-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(liveUrl)}`} alt="QR" className="rounded-lg mb-2" />
                <p className="text-[10px] text-muted-foreground">QR Code do convite</p>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Texto pronto</p>
                <textarea readOnly className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-border bg-background" rows={6}
                  value={`🔴 Vamos estar AO VIVO!\n\n${live.title}\n📅 ${new Date(live.scheduled_at).toLocaleString("pt-PT")}\n\nEntra: ${liveUrl}`} />
                <button onClick={() => { navigator.clipboard.writeText(`🔴 Vamos estar AO VIVO!\n\n${live.title}\n📅 ${new Date(live.scheduled_at).toLocaleString("pt-PT")}\n\nEntra: ${liveUrl}`); toast.success("Copiado!"); }} className="w-full text-xs px-3 py-1.5 rounded-full bg-secondary"><Copy className="inline h-3 w-3 mr-1" />Copiar</button>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Overlays para OBS</p>
                {(["ranking", "prizes", "countdown", "announcement"]).map((v) => (
                  <button key={v} onClick={() => { navigator.clipboard.writeText(buildOverlayUrl(live.id, v)); toast.success(`Overlay ${v} copiado!`); }} className="w-full text-[11px] px-3 py-1.5 rounded-full bg-secondary text-left flex items-center gap-2">
                    <Tv className="h-3 w-3" /> {v}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "during" && (
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Ranking ao vivo</h2>
            <ul className="space-y-1.5">
              {ranking.length === 0 && <li className="text-xs text-muted-foreground text-center py-4">Sem visitas ainda</li>}
              {ranking.map((r, i) => (
                <li key={r.ambassador_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border">
                  <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${i === 0 ? "bg-amber-400 text-black" : "bg-muted"}`}>{i + 1}</span>
                  <span className="flex-1 text-xs truncate">{r.display_name || r.ref_code}</span>
                  <span className="text-sm font-extrabold text-emerald-600">{r.visits}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" />Sondagens</h2>
            <ul className="space-y-2 mb-3">
              {polls.map((p) => {
                const counts = pollVotes[p.id] || [];
                const total = counts.reduce((a, b) => a + b, 0);
                return (
                  <li key={p.id} className="rounded-lg border border-border p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold flex-1">{p.question}</p>
                      {p.is_open && <button onClick={() => closePoll(p.id)} className="text-[10px] text-red-500">Fechar</button>}
                      {!p.is_open && <span className="text-[10px] text-muted-foreground">Fechada</span>}
                    </div>
                    {p.options.map((opt, i) => {
                      const c = counts[i] || 0;
                      const pct = total ? Math.round((c / total) * 100) : 0;
                      return (
                        <div key={i} className="text-[11px]">
                          <div className="flex items-center justify-between"><span>{opt}</span><span className="text-muted-foreground">{c} • {pct}%</span></div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
              {polls.length === 0 && <li className="text-xs text-muted-foreground text-center py-3">Sem sondagens.</li>}
            </ul>
            <div className="space-y-1.5 border-t border-border pt-2">
              <input placeholder="Pergunta…" value={newPoll.q} onChange={(e) => setNewPoll({ ...newPoll, q: e.target.value })} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background" />
              {newPoll.opts.map((o, i) => (
                <input key={i} placeholder={`Opção ${i + 1}`} value={o} onChange={(e) => { const v = [...newPoll.opts]; v[i] = e.target.value; setNewPoll({ ...newPoll, opts: v }); }} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background" />
              ))}
              <div className="flex gap-1">
                {newPoll.opts.length < 4 && <button onClick={() => setNewPoll({ ...newPoll, opts: [...newPoll.opts, ""] })} className="text-[10px] px-2 py-1 rounded bg-secondary">+ opção</button>}
                <button onClick={submitPoll} className="ml-auto text-xs px-3 py-1 rounded-full bg-violet-500 text-white font-bold">Lançar</button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Megaphone className="h-4 w-4 text-red-500" />Anúncios</h2>
            <ul className="space-y-1.5 mb-3 max-h-60 overflow-y-auto">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-2">
                  <p className="text-xs">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
                </li>
              ))}
              {announcements.length === 0 && <li className="text-xs text-muted-foreground text-center py-3">Sem anúncios.</li>}
            </ul>
            <div className="space-y-1.5 border-t border-border pt-2">
              <textarea rows={2} placeholder="Próximo prémio em 5 min!" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background" />
              <button onClick={submitAnnouncement} className="w-full text-xs px-3 py-1.5 rounded-full bg-red-500 text-white font-bold">Publicar</button>
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Sortear prémio</p>
              <ul className="space-y-1">
                {prizes.filter((p) => !p.winner_user_id).map((p) => (
                  <li key={p.id}>
                    <button onClick={async () => {
                      const { data, error } = await supabase.rpc("award_ambassador_prize" as any, { p_prize_id: p.id, p_mode: "manual" } as any);
                      if (error) { toast.error(error.message); return; }
                      const r: any = data;
                      if (r?.winner_user_id) { toast.success(`Vencedor: ${r.winner_name}`); await postAnnouncement(live.id, `🏆 ${p.title} entregue a ${r.winner_name}!`); }
                      else toast.info("Sem vencedor possível.");
                    }} className="w-full text-[11px] px-2 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 font-bold flex items-center justify-between">
                      <span>#{p.position} {p.title}</span><Trophy className="h-3 w-3" />
                    </button>
                  </li>
                ))}
                {prizes.filter((p) => !p.winner_user_id).length === 0 && <li className="text-[11px] text-muted-foreground text-center py-2">Tudo entregue ✨</li>}
              </ul>
            </div>
          </section>
        </div>
      )}

      {tab === "post" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { l: "Visitas totais", v: summary.visits_total },
              { l: "Confirmados", v: summary.attendance_total },
              { l: "Sondagens", v: summary.polls_count },
              { l: "Anúncios", v: summary.announcements_count },
              { l: "Prémios", v: summary.prizes_total },
              { l: "Atribuídos", v: summary.prizes_awarded },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">{s.l}</p>
                <p className="font-display text-2xl font-extrabold">{s.v}</p>
              </div>
            ))}
          </div>
          <button onClick={() => {
            const csv = "rank,nome,ref_code,visits\n" + ranking.map((r, i) => `${i + 1},${r.display_name || ""},${r.ref_code},${r.visits}`).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `ranking-${live.slug}.csv`; a.click();
          }} className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold">Exportar CSV do ranking</button>
        </div>
      )}
    </div>
  );
};

export default LiveStudio;
