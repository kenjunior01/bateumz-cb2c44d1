import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, ArrowUp, ArrowDown, Sparkles, Crown, Trophy, Vote,
  Radio, Users, CircleDollarSign, ChevronRight, Eye, Zap, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPowerRankings, getPolls, votarPoll, getStreamsAoVivo, getPrizePool,
  carregarTimeFantasy,
  type PowerRankTeam, type Poll,
} from "@/lib/esports-features";
import { formatMZN } from "@/lib/currency";

/**
 * Widgets avançados do hub de esports (v2):
 *  · PowerRankingsWidget — ranking composto com forma e streaks
 *  · PollWidget — previsões da comunidade votáveis
 *  · PrizePoolWidget — crowdfunding do prémio com progresso
 *  · StreamsWidget — transmissões e watch parties ao vivo
 *  · FantasyCTA — entrada rápida para o fantasy
 */

const ACCENT = "#00d4ff";
const ACCENT2 = "#7b2ff7";
const LIVE = "#ff4655";
const GOLD = "#fbbf24";

// ─────────────────────────────────────────────────────────────
export function PowerRankingsWidget() {
  const navigate = useNavigate();
  const [top, setTop] = useState<PowerRankTeam[]>([]);
  useEffect(() => { setTop(getPowerRankings().slice(0, 5)); }, []);

  const corForma = (r: "W" | "L" | "D") => (r === "W" ? "#2ea043" : r === "L" ? "#ff4655" : "#71717a");

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5" data-testid="widget-power-rankings">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <TrendingUp size={15} className="text-cyan-400" />
          Power Rankings
        </h3>
        <button onClick={() => navigate('/esports/leaderboard')} className="text-[10px] text-gray-500 hover:text-gray-300">Semana 12</button>
      </div>
      <div className="space-y-2">
        {top.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
            <span className="text-[10px] font-black w-5 text-center text-gray-500">#{t.ranking}</span>
            <span className="text-lg shrink-0">{t.logo_emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-200 truncate">{t.nome}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {t.forma.map((f, i) => (
                  <span key={i} className="h-1.5 w-3 rounded-sm" style={{ background: corForma(f) }} />
                ))}
                <span className="text-[9px] text-gray-600 ml-1">
                  {t.streak > 0 ? `${t.streak} vitórias seguidas` : t.streak < 0 ? `${Math.abs(t.streak)} derrotas seguidas` : "sem streak"}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-black" style={{ color: ACCENT }}>{t.rating}</div>
              <div className="text-[9px] font-bold flex items-center justify-end gap-0.5" style={{ color: t.rating_delta >= 0 ? "#2ea043" : LIVE }}>
                {t.rating_delta >= 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                {Math.abs(t.rating_delta)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
        Rating composto: resultados, forma dos últimos 5, K/D e prémios conquistados.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export function PollWidget() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setPolls(getPolls()); }, []);
  const poll = polls[idx];

  const votar = (opcaoId: string) => {
    if (!poll) return;
    const novos = votarPoll(poll.id, opcaoId);
    setPolls([...novos]);
  };

  if (!poll) return null;
  const jaVotou = poll.meu_voto != null;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5" data-testid="widget-poll">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Vote size={15} className="text-violet-400" />
          Previsões da Comunidade
        </h3>
        {polls.length > 1 && (
          <div className="flex gap-1">
            {polls.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === idx ? 14 : 6, background: i === idx ? ACCENT2 : "rgba(255,255,255,0.15)" }}
                aria-label={`Previsão ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <h4 className="text-sm font-bold text-white leading-snug">{poll.pergunta}</h4>
      <p className="text-[10px] text-gray-500 mt-0.5">{poll.contexto}</p>

      <div className="mt-3 space-y-2">
        {poll.opcoes.map((o) => {
          const minha = poll.meu_voto === o.id;
          return (
            <button
              key={o.id}
              onClick={() => votar(o.id)}
              className="w-full text-left rounded-xl overflow-hidden relative"
              style={{ border: `1px solid ${minha ? ACCENT2 + "66" : "rgba(255,255,255,0.07)"}` }}
              data-testid={`poll-opcao-${o.id}`}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{
                  width: jaVotou ? `${Math.round(o.pct * 100)}%` : "0%",
                  background: minha ? `${ACCENT2}22` : "rgba(255,255,255,0.05)",
                }}
              />
              <div className="relative px-3 py-2.5 flex items-center justify-between gap-2">
                <span className={"text-xs font-bold truncate " + (minha ? "text-white" : "text-gray-300")}>
                  {minha && <Crown size={10} className="inline mr-1 -mt-0.5" style={{ color: ACCENT2 }} />}
                  {o.label}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: minha ? ACCENT2 : "#71717a" }}>
                  {jaVotou ? `${Math.round(o.pct * 100)}% · odd ${o.odds}` : "votar"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-600">
        <span className="inline-flex items-center gap-1"><Users size={9} /> {poll.total_votos.toLocaleString("pt-PT")} votos</span>
        {jaVotou && <span className="text-violet-400 font-bold">Voto registado ✓</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export function PrizePoolWidget() {
  const pool = useMemo(() => getPrizePool(), []);
  const pct = Math.min(100, ((pool.base + pool.crowdfunding) / pool.meta) * 100);

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5" data-testid="widget-prize-pool">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
        <CircleDollarSign size={15} className="text-yellow-400" />
        Prize Pool Crowdfund
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white">{formatMZN(pool.base + pool.crowdfunding)}</span>
        <span className="text-xs text-gray-500">de {formatMZN(pool.meta)}</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, #f59e0b)`, boxShadow: `0 0 12px ${GOLD}55` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-600">
        <span>{pool.contribuidores.toLocaleString("pt-PT")} contribuidores · empresas + fãs</span>
        <span className="font-bold text-yellow-500/80">{Math.round(pct)}%</span>
      </div>
      <div className="mt-3 space-y-1">
        {pool.distribuicao.slice(0, 3).map((d) => (
          <div key={d.lugar} className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500">{d.lugar}º lugar · {Math.round(d.pct * 100)}%</span>
            <span className="font-bold text-gray-300">{formatMZN(d.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export function StreamsWidget() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<ReturnType<typeof getStreamsAoVivo>>([]);
  useEffect(() => { setStreams(getStreamsAoVivo()); }, []);

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5" data-testid="widget-streams">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: LIVE }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: LIVE }} />
          </span>
          Transmissões ao Vivo
        </h3>
        <span className="text-[10px] text-gray-600">{streams.length} canais</span>
      </div>
      <div className="space-y-2">
        {streams.map((s) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/lives')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
          >
            <div
              className="h-10 w-16 rounded-lg shrink-0 flex items-center justify-center text-xl relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${ACCENT2}22, ${ACCENT}12)` }}
            >
              {s.emoji}
              <span className="absolute bottom-0.5 right-0.5 text-[8px] font-black px-1 rounded" style={{ background: LIVE, color: "#fff" }}>
                {s.viewers.toLocaleString("pt-PT")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-200 truncate">{s.titulo}</div>
              <div className="text-[10px] text-gray-600 flex items-center gap-1.5 mt-0.5">
                <Eye size={9} /> {s.canal}
                {s.is_watch_party && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `${GOLD}22`, color: GOLD }}>
                    WATCH PARTY
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={13} className="text-gray-700 shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export function FantasyCTA() {
  const navigate = useNavigate();
  const temTime = useMemo(() => carregarTimeFantasy() != null, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      onClick={() => navigate('/esports/fantasy')}
      style={{ background: `linear-gradient(135deg, ${ACCENT2}22, ${ACCENT}10)`, border: `1px solid ${ACCENT2}44` }}
      data-testid="widget-fantasy-cta"
    >
      <div className="p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT2}22` }}>
          <Sparkles className="h-6 w-6" style={{ color: ACCENT2 }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">Fantasy Esports — ronda ao vivo</div>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            {temTime ? "Escalona o teu time e acompanha os pontos ao vivo." : "Monta 5 estrelas com 100 de orçamento. Grátis!"}
          </p>
        </div>
        <Button size="sm" className="shrink-0 font-black" style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, border: "none" }}>
          {temTime ? "Escalar" : "Jogar"}
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
export function GrelhaCTA() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      onClick={() => navigate('/esports/brackets')}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      data-testid="widget-grelha-cta"
    >
      <div className="p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}14` }}>
          <GitBranch className="h-6 w-6" style={{ color: ACCENT }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">Grelha dos Playoffs</div>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            Quartos → Semis → Grande Final. Toca num confronto e vê o histórico direto.
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 font-black">
          Ver grelha
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>
    </motion.div>
  );
}
