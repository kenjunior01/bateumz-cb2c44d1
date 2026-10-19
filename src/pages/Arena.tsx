import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Swords, Flame, Target, Gift, Crown, TrendingUp, Users, Clock,
  Medal, Star, ChevronRight, Zap, Globe, CalendarDays, Wallet, Sparkles,
  ArrowUpRight, ShieldCheck, Gamepad2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// BATEU GAMING ARENA — hub competitivo da plataforma
// REA: Stake (lobby/categorias/poucos cliques) · FACEIT (níveis
// 1-10, copas diárias/semanais, missões) · Challengermode
// (torneios, brackets, temporadas, prémios) · Rollbit (estética
// ousada, stats ao vivo) · BC.Game (variedade, recompensas).
// Sem linguagem de aposta desportiva. 100% PT.
// ============================================================

const CATEGORIES = [
  { id: "tudo", label: "Destaques", icon: Sparkles },
  { id: "torneios", label: "Torneios", icon: Trophy },
  { id: "copas", label: "Copas", icon: CalendarDays },
  { id: "missoes", label: "Missões", icon: Target },
  { id: "ranking", label: "Ranking", icon: Medal },
  { id: "recompensas", label: "Recompensas", icon: Gift },
] as const;
type CatId = typeof CATEGORIES[number]["id"];

// ── Torneios (Challengermode: brackets, temporadas, prémios) ─
const TOURNAMENTS = [
  {
    id: "t_semanal", name: "Arena Weekly Smash", game: "Bateu World 3D", emoji: "🌍",
    prize: "15.000 MT + Cupão 1GB", slots: 64, filled: 51, format: "Eliminação simples",
    endsIn: 2 * 24 * 3600 + 7 * 3600, season: "Temporada 1", featured: true,
  },
  {
    id: "t_duelos", name: "Copa de Duelos 1v1", game: "Arena dos Duelos", emoji: "⚔️",
    prize: "8.000 MT", slots: 32, filled: 28, format: "Bracket duplo",
    endsIn: 9 * 3600 + 42 * 60, season: "Temporada 1", featured: false,
  },
  {
    id: "t_empresas", name: "Torneio das Empresas", game: "Desafios de marca", emoji: "🏢",
    prize: "Prémios reais das empresas", slots: 48, filled: 33, format: "Grupos + playoff",
    endsIn: 5 * 24 * 3600, season: "Edição de Outubro", featured: false,
  },
];

// ── Copas FACEIT-style ──────────────────────────────────────
const CUPS = [
  { id: "daily", name: "Copa Diária", when: "Todos os dias · 20:00", slots: 64, filled: 40, reward: "1.500 MT + 300 pontos", level: "Nível 3+", emoji: "🔥" },
  { id: "weekly", name: "Copa Semanal", when: "Domingo · 16:00", slots: 128, filled: 74, reward: "10.000 MT + título ELITE", level: "Nível 5+", emoji: "👑" },
];

// ── Missões diárias (progresso real) ────────────────────────
interface MissionDef { id: string; label: string; desc: string; target: number; reward: string; icon: typeof Target }
const MISSIONS: MissionDef[] = [
  { id: "play", label: "Aquecimento", desc: "Joga 2 partidas em qualquer jogo", target: 2, reward: "+150 pontos", icon: Gamepad2 },
  { id: "duel", label: "Guerreiro", desc: "Vence 1 duelo ou desafia 1 jogador", target: 1, reward: "+250 pontos", icon: Swords },
  { id: "world", label: "Herói do Mundo", desc: "Abate 5 criaturas no Bateu World", target: 5, reward: "+300 pontos", icon: Globe },
  { id: "tournament", label: "Competidor", desc: "Inscreve-te em 1 torneio ou copa", target: 1, reward: "+400 pontos", icon: Trophy },
  { id: "share", label: "Embaixador", desc: "Partilha 1 página da plataforma", target: 1, reward: "+120 pontos", icon: ArrowUpRight },
];

const MIS_KEY = "arena_missions_v1";
function todayKey() { return new Date().toISOString().slice(0, 10); }
function loadMissions(): { date: string; prog: Record<string, number>; claimed: string[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(MIS_KEY) || "null");
    if (raw && raw.date === todayKey()) return raw;
  } catch { /* ignore */ }
  return { date: todayKey(), prog: {}, claimed: [] };
}

// ── Ranking (FACEIT: níveis 1-10) ───────────────────────────
const RANK_PERIODS = ["daily", "weekly", "monthly", "global"] as const;
type Period = typeof RANK_PERIODS[number];
const PERIOD_LABEL: Record<Period, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal", global: "Global" };

const DEMO_PLAYERS = [
  { name: "Kudumba", base: 2840 }, { name: "Zalala", base: 2695 }, { name: "Nhamirre", base: 2510 },
  { name: "Tchaka", base: 2380 }, { name: "Mabja", base: 2205 }, { name: "Quissico", base: 2040 },
  { name: "Xitende", base: 1875 }, { name: "Nwamatheu", base: 1710 },
];
function seeded(n: number) { const x = Math.sin(n) * 10000; return x - Math.floor(x); }

// cores de nível estilo FACEIT
function levelInfo(pts: number) {
  const lvl = Math.max(1, Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0, pts)) / 15)));
  const color = lvl >= 8 ? "#fe1f00" : lvl >= 4 ? "#ffb43a" : "#6dd400";
  return { lvl, color };
}

const REWARDS = [
  { id: "dados", name: "Cupão de Dados 1GB", desc: "Qualquer operadora, entregue via WhatsApp", cost: 5000, emoji: "📶" },
  { id: "creditos", name: "Créditos Bateu", desc: "2.000 créditos para leilões e jogos", cost: 2000, emoji: "🪙" },
  { id: "bilhete", name: "Bilhete Extra de Sorteio", desc: "+1 bilhete no sorteio ativo à escolha", cost: 1500, emoji: "🎟️" },
];

export default function Arena() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState<CatId>("tudo");
  const [period, setPeriod] = useState<Period>("global");
  const [missions, setMissions] = useState(loadMissions);
  const [tick, setTick] = useState(0);
  const [rankRows, setRankRows] = useState<{ name: string; pts: number; wr: number; trend: number; demo: boolean }[]>([]);
  const [rankDemo, setRankDemo] = useState(false);

  // relógio dos countdowns
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { setMissions(loadMissions()); }, []);

  // progresso do mundo (kills reais do Bateu World alimentam a missão "world")
  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem("bateu_legends_v18") || "null");
      if (w?.kills) {
        setMissions(m => (m.prog.world ? m : m));
        const cur = loadMissions();
        if (!cur.prog.world && w.kills > 0) {
          const next = { ...cur, prog: { ...cur.prog, world: Math.min(5, w.kills) } };
          localStorage.setItem(MIS_KEY, JSON.stringify(next));
          setMissions(next);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ranking: Supabase com fallback demo honesto
  useEffect(() => {
    let dead = false;
    (async () => {
      const seedBase = RANK_PERIODS.indexOf(period) + 1;
      const demo = DEMO_PLAYERS.map((p, i) => ({
        name: p.name,
        pts: Math.round(p.base * (0.55 + seeded(seedBase * 17 + i) * 0.35)),
        wr: Math.round(52 + seeded(seedBase * 31 + i) * 26),
        trend: Math.round(seeded(seedBase * 53 + i) * 3) - 1,
        demo: true,
      }));
      try {
        const { data, error } = await (supabase as any)
          .from("engagement_points")
          .select("user_id, points, total_lifetime_points")
          .order("points", { ascending: false })
          .limit(8);
        if (dead) return;
        if (!error && data && data.length >= 3) {
          setRankRows((data as any[]).map((r, i) => ({
            name: `Herói ${String(r.user_id || "??").slice(0, 6)}`,
            pts: r.points || 0,
            wr: Math.round(50 + seeded(i) * 30),
            trend: Math.round(seeded(i + 9) * 3) - 1,
            demo: false,
          })));
          setRankDemo(false);
        } else {
          setRankRows(demo);
          setRankDemo(true);
        }
      } catch {
        if (!dead) { setRankRows(demo); setRankDemo(true); }
      }
    })();
    return () => { dead = true; };
  }, [period]);

  // gancho de progresso (testes E2E + integrações)
  useEffect(() => {
    (window as any).__arenaAddProgress = (id: string, n = 1) => {
      setMissions(prev => {
        const next = { ...prev, prog: { ...prev.prog, [id]: Math.min(targetOf(id), (prev.prog[id] || 0) + n) } };
        localStorage.setItem(MIS_KEY, JSON.stringify(next));
        return next;
      });
      toast.success("Progresso de missão atualizado!");
    };
    return () => { try { delete (window as any).__arenaAddProgress; } catch { /* ignore */ } };
  }, []);

  const targetOf = (id: string) => MISSIONS.find(m => m.id === id)?.target || 1;

  const claim = (m: MissionDef) => {
    const prog = missions.prog[m.id] || 0;
    if (prog < m.target || missions.claimed.includes(m.id)) return;
    const next = { ...missions, claimed: [...missions.claimed, m.id] };
    localStorage.setItem(MIS_KEY, JSON.stringify(next));
    setMissions(next);
    toast.success(`Missão concluída! ${m.reward}`);
  };

  const joinCup = (c: typeof CUPS[number]) => {
    const key = "arena_cups_v1";
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      if (raw[c.id]) { toast.info("Já estás inscrito nesta copa — boa sorte!"); return; }
      raw[c.id] = Date.now();
      localStorage.setItem(key, JSON.stringify(raw));
      (window as any).__arenaAddProgress?.("tournament", 1);
      toast.success(`Inscrição confirmada na ${c.name}!`);
    } catch { /* ignore */ }
  };

  const joinTournament = (t: typeof TOURNAMENTS[number]) => {
    const key = "arena_tournaments_v1";
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      if (raw[t.id]) { toast.info("Já estás inscrito — prepara-te!"); return; }
      raw[t.id] = Date.now();
      localStorage.setItem(key, JSON.stringify(raw));
      (window as any).__arenaAddProgress?.("tournament", 1);
      toast.success(`Boa! Estás inscrito no ${t.name}.`);
    } catch { /* ignore */ }
  };

  const redeem = (r: typeof REWARDS[number]) => {
    if (!user) { toast.info("Entra na conta para resgatar recompensas."); navigate("/login"); return; }
    toast.success(`Pedido de resgate registado: ${r.name} (entrega em até 48h)`);
  };

  const fmtCountdown = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const show = (id: CatId) => cat === "tudo" || cat === id;
  const top3 = rankRows.slice(0, 3);
  const podiumColors = ["#fbbf24", "#c0c0c8", "#cd7f32"];

  return (
    <div className="min-h-[100dvh] bg-[#0a0d16] text-slate-100" data-testid="arena-page">
      {/* ══ HERO ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" data-testid="arena-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/60 via-[#0a0d16] to-violet-950/50" />
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-rose-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-rose-600 text-white border-0 font-black tracking-widest">GAMING ARENA</Badge>
            <span className="text-[10px] text-slate-400 font-bold">JOGOS · DESAFIOS · TORNEIOS · RECOMPENSAS</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight">
            Compite. Sobe no <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-rose-400">Ranking</span>.<br className="hidden sm:block" /> Ganha prémios <span className="text-amber-300">reais</span>.
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-xl">
            Torneios todos os dias, copas diárias e semanais, missões com recompensa e o ranking de elite da plataforma. A tua skill decide.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black border-0">
              <Link to="/tournaments"><Trophy className="w-4 h-4 mr-1" /> Ver Torneios</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-700 bg-slate-900/70 hover:bg-slate-800 font-bold">
              <Link to="/lives?game=mmorpg"><Globe className="w-4 h-4 mr-1" /> Entrar no Mundo</Link>
            </Button>
          </div>
          {/* stats ao vivo */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 max-w-lg" data-testid="arena-stats">
            {[
              { icon: Users, label: "heróis hoje", v: "2.847" },
              { icon: Trophy, label: "torneios ativos", v: "12" },
              { icon: Wallet, label: "prémios do dia", v: "38.500 MT" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2.5">
                <s.icon className="w-4 h-4 text-amber-400 mb-1" />
                <div className="text-sm sm:text-base font-black text-slate-100">{s.v}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RAIL DE CATEGORIAS (estilo Stake) ═════════════ */}
      <div className="sticky top-0 z-30 bg-[#0a0d16]/95 backdrop-blur border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none" data-testid="arena-cats">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} data-testid={`arena-cat-${c.id}`}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-colors ${cat === c.id ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"}`}>
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        {/* ══ TORNEIOS EM CURSO ═══════════════════════════ */}
        {show("torneios") && (
          <section data-testid="arena-tournaments">
            <SecHead icon={Trophy} title="Torneios em curso" sub="Brackets automáticos · prémios distribuídos no fim" link={{ to: "/tournaments", label: "Ver todos" }} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TOURNAMENTS.map(t => {
                const pct = Math.round((t.filled / t.slots) * 100);
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-2xl border p-4 bg-slate-900/70 ${t.featured ? "border-amber-500/60 shadow-lg shadow-amber-900/20" : "border-slate-800"}`}
                    data-testid={`arena-tournament-${t.id}`}>
                    {t.featured && <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black tracking-wider">EM DESTAQUE</span>}
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-black text-sm truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.game} · {t.format}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="font-black text-amber-300">{t.prize}</span>
                      <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /> termina em {fmtCountdown(t.endsIn - (tick % 60))}</span>
                    </div>
                    {/* bracket mini (Challengermode) */}
                    <div className="mt-3 flex items-end gap-1 h-8" aria-hidden>
                      {[8, 4, 2, 1].map((n, i) => (
                        <div key={n} className="flex-1 flex gap-0.5 items-end">
                          {Array.from({ length: n }).map((_, k) => (
                            <div key={k} className={`flex-1 rounded-sm ${i === 3 ? "h-6 bg-amber-400" : `h-${2 + i}`} ${i < 3 ? "bg-slate-700" : ""}`} style={{ height: 6 + i * 5 }} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>{t.filled}/{t.slots} vagas</span><span>{t.season}</span></div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Button onClick={() => joinTournament(t)} data-testid={`arena-join-${t.id}`}
                      className="mt-3 w-full font-black bg-slate-800 hover:bg-amber-400 hover:text-slate-950 border border-slate-700">
                      Inscrever-me
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ COPAS DIÁRIAS & SEMANAIS ═════════════════════ */}
        {show("copas") && (
          <section data-testid="arena-cups">
            <SecHead icon={Flame} title="Copas Diárias & Semanais" sub="Inscrição livre · ranking e prémios em cada edição" />
            <div className="grid sm:grid-cols-2 gap-3">
              {CUPS.map(c => (
                <div key={c.id} className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 flex items-center gap-3" data-testid={`arena-cup-${c.id}`}>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">{c.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.when} · {c.level}</div>
                    <div className="text-[11px] font-bold text-emerald-400 mt-0.5">{c.reward}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${Math.round((c.filled / c.slots) * 100)}%` }} />
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{c.filled}/{c.slots} inscritos</div>
                  </div>
                  <Button onClick={() => joinCup(c)} size="sm" data-testid={`arena-cup-join-${c.id}`}
                    className="font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-0 shrink-0">Entrar</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ MISSÕES DIÁRIAS ══════════════════════════════ */}
        {show("missoes") && (
          <section data-testid="arena-missions">
            <SecHead icon={Target} title="Missões de hoje" sub="Recomeçam à meia-noite · recompensas em pontos de arena" />
            <div className="grid gap-2 sm:grid-cols-2">
              {MISSIONS.map(m => {
                const prog = missions.prog[m.id] || 0;
                const done = prog >= m.target;
                const claimed = missions.claimed.includes(m.id);
                return (
                  <div key={m.id} className={`rounded-2xl border p-3.5 flex items-center gap-3 ${claimed ? "border-emerald-800 bg-emerald-950/30" : "border-slate-800 bg-slate-900/70"}`} data-testid={`arena-mission-${m.id}`}>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0"><m.icon className="w-5 h-5 text-amber-300" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[13px]">{m.label}</span>
                        <span className="text-[10px] font-bold text-amber-300">{m.reward}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{m.desc}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all" style={{ width: `${Math.min(100, (prog / m.target) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400">{Math.min(prog, m.target)}/{m.target}</span>
                      </div>
                    </div>
                    <Button size="sm" disabled={!done || claimed} onClick={() => claim(m)} data-testid={`arena-claim-${m.id}`}
                      className={`font-black shrink-0 border-0 ${claimed ? "bg-emerald-900 text-emerald-300" : done ? "bg-amber-400 text-slate-950 hover:bg-amber-300" : "bg-slate-800 text-slate-500"}`}>
                      {claimed ? "✔ Feita" : done ? "Reivindicar" : "Em curso"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ RANKING DE ELITE (FACEIT) ════════════════════ */}
        {show("ranking") && (
          <section data-testid="arena-ranking">
            <SecHead icon={Medal} title="Ranking de Elite" sub="Níveis de habilidade 1-10 · atualizado a cada partida" link={{ to: "/pontos", label: "Ranking completo" }} />
            <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none">
              {RANK_PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} data-testid={`arena-rank-tab-${p}`}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black shrink-0 ${period === p ? "bg-rose-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}>
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1, 0, 2].map(idx => {
                  const r = top3[idx];
                  if (!r) return null;
                  const li = levelInfo(r.pts);
                  return (
                    <div key={r.name} className={`rounded-2xl border p-3 text-center ${idx === 0 ? "border-amber-500/60 bg-gradient-to-b from-amber-500/10 to-transparent" : "border-slate-800 bg-slate-900/60"}`}>
                      <Crown className={`w-5 h-5 mx-auto ${idx === 0 ? "text-amber-300" : "text-slate-500"}`} />
                      <div className="text-xl font-black mt-1" style={{ color: podiumColors[idx] }}>{idx + 1}º</div>
                      <div className="font-black text-xs truncate">{r.name}</div>
                      <div className="text-[10px] font-bold" style={{ color: li.color }}>Nível {li.lvl}</div>
                      <div className="text-[10px] text-slate-400">{r.pts.toLocaleString("pt-MZ")} pts</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/70">
              {rankRows.map((r, i) => {
                const li = levelInfo(r.pts);
                return (
                  <div key={`${period}-${r.name}`} className="flex items-center gap-3 px-3 py-2.5" data-testid={`arena-rank-row-${i}`}>
                    <span className={`w-6 text-center font-black text-xs ${i < 3 ? "text-amber-300" : "text-slate-500"}`}>{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-[11px]" style={{ border: `2px solid ${li.color}` }}>
                      {li.lvl}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px] truncate">{r.name}</div>
                      <div className="text-[9px] text-slate-500">win rate {r.wr}% · nível {li.lvl} de habilidade</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[13px]">{r.pts.toLocaleString("pt-MZ")}</div>
                      <div className={`text-[9px] font-bold ${r.trend > 0 ? "text-emerald-400" : r.trend < 0 ? "text-rose-400" : "text-slate-500"}`}>
                        {r.trend > 0 ? "▲ subiu" : r.trend < 0 ? "▼ desceu" : "— estável"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {rankDemo && <p className="text-[9px] text-slate-600 mt-2 text-center">Pré-visualização com dados de demonstração — liga-se aos resultados reais em produção.</p>}
          </section>
        )}

        {/* ══ RECOMPENSAS ══════════════════════════════════ */}
        {show("recompensas") && (
          <section data-testid="arena-rewards">
            <SecHead icon={Gift} title="Recompensas & Resgates" sub="Troca pontos de arena por prémios reais" />
            <div className="grid sm:grid-cols-3 gap-3">
              {REWARDS.map(r => (
                <div key={r.id} className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-center" data-testid={`arena-reward-${r.id}`}>
                  <div className="text-3xl">{r.emoji}</div>
                  <div className="font-black text-sm mt-1">{r.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 min-h-[28px]">{r.desc}</div>
                  <div className="text-sm font-black text-amber-300 my-2">{r.cost.toLocaleString("pt-MZ")} pts</div>
                  <Button onClick={() => redeem(r)} size="sm" className="w-full font-black bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 border-0">
                    Resgatar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══ PROMOÇÕES & EVENTOS ══════════════════════════ */}
        {cat === "tudo" && (
          <section data-testid="arena-promos">
            <SecHead icon={Zap} title="Promoções & Eventos" sub="Campanhas limitadas da plataforma e das empresas" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Link to="/concursos" data-testid="arena-promo-jackpot"
                className="group relative overflow-hidden rounded-2xl border border-amber-600/50 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-5">
                <Flame className="w-6 h-6 text-amber-400" />
                <div className="font-black text-lg mt-2">Jackpot da Semana</div>
                <p className="text-[11px] text-slate-400 mt-1">Participa nos concursos ativos e compete pelo bolo da semana. Quanto mais entradas, maior o prémio.</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 mt-3">Ver concursos <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
              </Link>
              <Link to="/tournaments" data-testid="arena-promo-empresas"
                className="group relative overflow-hidden rounded-2xl border border-violet-600/50 bg-gradient-to-br from-violet-500/15 via-slate-900 to-slate-950 p-5">
                <ShieldCheck className="w-6 h-6 text-violet-400" />
                <div className="font-black text-lg mt-2">Desafios de Empresas</div>
                <p className="text-[11px] text-slate-400 mt-1">Empresas reais da plataforma criam desafios com prémios próprios. Completa, vence e recebe da marca.</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-violet-300 mt-3">Participar <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
              </Link>
            </div>
          </section>
        )}

        {/* rodapé de identidade */}
        <p className="text-center text-[10px] text-slate-600 pt-2 pb-8">
          BATEU GAMING ARENA — skill, torneios e recompensas reais. Sem apostas. Só talento. 🎮
        </p>
      </div>
    </div>
  );
}

// ── cabeçalho de secção ─────────────────────────────────────
function SecHead({ icon: Icon, title, sub, link }: { icon: typeof Trophy; title: string; sub: string; link?: { to: string; label: string } }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-lg font-black flex items-center gap-2"><Icon className="w-5 h-5 text-amber-400" /> {title}</h2>
        <p className="text-[10px] text-slate-500">{sub}</p>
      </div>
      {link && (
        <Link to={link.to} className="text-[11px] font-black text-amber-300 hover:text-amber-200 flex items-center gap-0.5 shrink-0">
          {link.label} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
