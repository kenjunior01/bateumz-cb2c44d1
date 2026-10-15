import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GitBranch, Trophy, Zap, Radio, ChevronRight, Swords, Flame, Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/useSEO";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getPowerRankings, getH2H, getStreamsAoVivo, type PowerRankTeam } from "@/lib/esports-features";

/**
 * BracketsPage — Grelha interativa da Bateu Pro League.
 * Quartos → Semis → Final, com resultados ao vivo, H2H por
 * confronto e campeão em destaque. Horizontal scroll no mobile.
 */

const ACCENT = "#00d4ff";
const ACCENT2 = "#7b2ff7";
const LIVE = "#ff4655";

interface Slot {
  equipa: PowerRankTeam | null;
  placar: number;
  venceu: boolean;
}

interface Confronto {
  id: string;
  fase: "quartos" | "semis" | "final";
  a: Slot;
  b: Slot;
  ao_vivo: boolean;
  termina: boolean;
}

function buildBrackets(): { confrontos: Confronto[]; campeao: PowerRankTeam | null } {
  const pr = getPowerRankings();
  const [t1, t2, t3, t4, t5, t6, t7, t8] = [pr[0], pr[1], pr[2], pr[3], pr[4], pr[5], pr[6], pr[7]];

  const q: Confronto[] = [
    { id: "q1", fase: "quartos", a: { equipa: t1, placar: 2, venceu: true }, b: { equipa: t8, placar: 0, venceu: false }, ao_vivo: false, termina: false },
    { id: "q2", fase: "quartos", a: { equipa: t4, placar: 1, venceu: false }, b: { equipa: t5, placar: 2, venceu: true }, ao_vivo: false, termina: false },
    { id: "q3", fase: "quartos", a: { equipa: t2, placar: 2, venceu: true }, b: { equipa: t7, placar: 1, venceu: false }, ao_vivo: false, termina: false },
    { id: "q4", fase: "quartos", a: { equipa: t3, placar: 1, venceu: false }, b: { equipa: t6, placar: 2, venceu: true }, ao_vivo: false, termina: false },
  ];
  const s: Confronto[] = [
    { id: "s1", fase: "semis", a: { equipa: t1, placar: 2, venceu: true }, b: { equipa: t5, placar: 1, venceu: false }, ao_vivo: false, termina: false },
    { id: "s2", fase: "semis", a: { equipa: t2, placar: 1, venceu: false }, b: { equipa: t6, placar: 1, venceu: false }, ao_vivo: true, termina: false },
  ];
  const f: Confronto[] = [
    { id: "f1", fase: "final", a: { equipa: t1, placar: 0, venceu: false }, b: { equipa: null, placar: 0, venceu: false }, ao_vivo: false, termina: true },
  ];
  return { confrontos: [...q, ...s, ...f], campeao: null };
}

function CartaoEquipa({ slot, pequeno }: { slot: Slot; pequeno?: boolean }) {
  const e = slot.equipa;
  if (!e) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-zinc-600 text-xs font-bold" style={{ background: "rgba(255,255,255,0.02)" }}>
        <span className="h-6 w-6 rounded-lg bg-white/5" /> A aguardar…
      </div>
    );
  }
  return (
    <div
      className={"flex items-center gap-2.5 px-3 rounded-xl transition-all " + (pequeno ? "py-2" : "py-2.5")}
      style={{
        background: slot.venceu ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${slot.venceu ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.06)"}`,
        opacity: slot.venceu ? 1 : 0.82,
      }}
    >
      <span className="text-lg shrink-0">{e.logo_emoji}</span>
      <div className="min-w-0 flex-1">
        <div className={"text-xs font-black truncate " + (slot.venceu ? "text-white" : "text-zinc-400")}>{e.nome}</div>
        <div className="text-[9px] text-zinc-600 font-bold tracking-wider">{e.tag} · #{e.ranking} PR</div>
      </div>
      <span
        className={"shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black tabular-nums " + (slot.venceu ? "text-white" : "text-zinc-500")}
        style={{ background: slot.venceu ? `${ACCENT}22` : "rgba(255,255,255,0.04)" }}
      >
        {slot.placar}
      </span>
    </div>
  );
}

function ConfrontoCard({ c, onSelect }: { c: Confronto; onSelect: (c: Confronto) => void }) {
  const labelFase = c.fase === "quartos" ? "Quartos" : c.fase === "semis" ? "Semifinal" : "GRANDE FINAL";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.35 }}
      onClick={() => onSelect(c)}
      className="rounded-2xl p-3 cursor-pointer hover:scale-[1.02] transition-transform shrink-0 w-[240px] sm:w-auto"
      style={{
        background: "linear-gradient(160deg, rgba(10,14,22,0.9), rgba(8,10,18,0.9))",
        border: `1px solid ${c.ao_vivo ? LIVE + "66" : "rgba(255,255,255,0.07)"}`,
        boxShadow: c.ao_vivo ? `0 0 24px ${LIVE}22` : "0 6px 24px rgba(0,0,0,0.4)",
      }}
      data-testid={`confronto-${c.id}`}
    >
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: c.fase === "final" ? ACCENT2 : ACCENT }}>
          {labelFase}
        </span>
        {c.ao_vivo ? (
          <span className="flex items-center gap-1 text-[9px] font-black tracking-wider" style={{ color: LIVE }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: LIVE }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: LIVE }} />
            </span>
            AO VIVO
          </span>
        ) : c.termina ? (
          <span className="text-[9px] font-black tracking-wider" style={{ color: ACCENT2 }}>SÁB · 19H</span>
        ) : (
          <span className="text-[9px] font-bold text-zinc-600">TERMINADO</span>
        )}
      </div>
      <div className="space-y-1.5">
        <CartaoEquipa slot={c.a} />
        <CartaoEquipa slot={c.b} />
      </div>
      <div className="mt-2 text-[10px] text-zinc-600 flex items-center gap-1 justify-end">
        Ver confronto <ChevronRight className="h-3 w-3" />
      </div>
    </motion.div>
  );
}

function PainelH2H({ c, onClose }: { c: Confronto; onClose: () => void }) {
  if (!c.a.equipa || !c.b.equipa) return null;
  const h2h = getH2H(c.a.equipa.id, c.b.equipa.id);
  const totalV = h2h.equipaA.vitorias + h2h.equipaB.vitorias + h2h.empates;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl p-5"
      style={{ background: "linear-gradient(160deg, rgba(12,16,26,0.98), rgba(8,10,18,0.98))", border: `1px solid ${ACCENT}33` }}
      data-testid="painel-h2h"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm flex items-center gap-2"><Swords className="h-4 w-4" style={{ color: ACCENT }} /> Histórico direto</h3>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded">Fechar</button>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-center flex-1">
          <div className="text-3xl">{h2h.equipaA.emoji}</div>
          <div className="text-xs font-black mt-1 truncate">{h2h.equipaA.nome}</div>
          <div className="text-2xl font-black" style={{ color: ACCENT }}>{h2h.equipaA.vitorias}</div>
        </div>
        <div className="text-center px-3">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Empates</div>
          <div className="text-xl font-black text-zinc-400">{h2h.empates}</div>
          <div className="text-[10px] text-zinc-600 mt-1">{totalV} confrontos</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-3xl">{h2h.equipaB.emoji}</div>
          <div className="text-xs font-black mt-1 truncate">{h2h.equipaB.nome}</div>
          <div className="text-2xl font-black" style={{ color: ACCENT2 }}>{h2h.equipaB.vitorias}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {h2h.ultimos.map((u, i) => (
          <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
            <span className="text-zinc-600 font-mono">{u.data}</span>
            <span className="font-bold text-zinc-300">{u.resultado}</span>
            <span className="font-black tabular-nums text-white">{u.placar}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function BracketsPage() {
  useSEO({ title: "Grelhas — Bateu Esports", description: "Segue a grelha completa da Bateu Pro League: quartos, semifinais e grande final ao vivo, com histórico direto entre equipas.", canonicalPath: "/esports/brackets" });
  const { sfx } = useSoundEffects();
  const [selecionado, setSelecionado] = useState<Confronto | null>(null);
  const { confrontos, campeao } = useMemo(buildBrackets, []);
  const streams = useMemo(() => getStreamsAoVivo().filter((s) => s.destaque), []);
  const quartos = confrontos.filter((c) => c.fase === "quartos");
  const semis = confrontos.filter((c) => c.fase === "semis");
  const final = confrontos.filter((c) => c.fase === "final");

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--area-bg)" }} data-testid="brackets-page">
      {/* hero */}
      <section className="px-4 sm:px-6 pt-8 pb-6" style={{ background: `radial-gradient(ellipse 60% 80% at 50% -10%, ${ACCENT}14, transparent 60%)` }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="h-4 w-4" style={{ color: ACCENT }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Playoffs · Split 2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Grelha dos <span style={{ color: ACCENT }}>Playoffs</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Oito equipas, troféu único. Toca em qualquer confronto para ver o histórico direto entre as equipas.
          </p>
          {streams.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs" style={{ background: `${LIVE}0f`, border: `1px solid ${LIVE}44` }}>
              <Radio className="h-3.5 w-3.5" style={{ color: LIVE }} />
              <span className="font-bold">{streams[0].titulo}</span>
              <span className="text-zinc-400">· {streams[0].viewers.toLocaleString("pt-PT")} a ver</span>
            </div>
          )}
        </div>
      </section>

      {/* grelha */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid gap-6 md:grid-cols-3 overflow-x-auto">
          {/* quartos */}
          <div className="min-w-[260px]">
            <div className="flex items-center gap-2 mb-3">
              <Swords className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-400">Quartos de Final</h2>
            </div>
            <div className="space-y-3">
              {quartos.map((c) => <ConfrontoCard key={c.id} c={c} onSelect={setSelecionado} />)}
            </div>
          </div>
          {/* semis */}
          <div className="min-w-[260px] md:border-l md:border-white/5 md:pl-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-400">Semifinais</h2>
            </div>
            <div className="space-y-3">
              {semis.map((c) => <ConfrontoCard key={c.id} c={c} onSelect={setSelecionado} />)}
            </div>
            {/* campeão placeholder */}
            <div className="mt-6 rounded-2xl p-4 text-center" style={{ border: `1px dashed ${ACCENT}44`, background: `${ACCENT}08` }}>
              <Trophy className="h-6 w-6 mx-auto mb-1.5" style={{ color: ACCENT2 }} />
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Troféu Bateu Pro</div>
              <div className="text-xs text-zinc-600 mt-1">250.000 MT + crowdfund</div>
            </div>
          </div>
          {/* final */}
          <div className="min-w-[260px] md:border-l md:border-white/5 md:pl-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" style={{ color: ACCENT2 }} />
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-400">Grande Final</h2>
            </div>
            <div className="space-y-3">
              {final.map((c) => <ConfrontoCard key={c.id} c={c} onSelect={setSelecionado} />)}
            </div>
            {campeao && (
              <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, rgba(123,47,247,0.15), rgba(0,212,255,0.08))", border: `1px solid ${ACCENT2}44` }}>
                <Star className="h-6 w-6 mx-auto mb-1.5" style={{ color: ACCENT2 }} />
                <div className="text-sm font-black">{campeao.nome}</div>
                <Badge className="mt-1">CAMPEÃO</Badge>
              </div>
            )}
          </div>
        </div>

        {/* painel H2H */}
        {selecionado && (
          <div className="mt-6">
            <PainelH2H c={selecionado} onClose={() => setSelecionado(null)} />
          </div>
        )}
      </main>
    </div>
  );
}
