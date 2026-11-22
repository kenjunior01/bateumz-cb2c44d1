// ============================================================
// PÁGINA PRÉMIOS (v79) — «O CICLO DE PRÉMIOS»
// ────────────────────────────────────────────────────────────
// «Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios.» — a página torna o ciclo VISÍVEL e
// HONESTO:
// · os 4 passos do ciclo (jogar → pontos → nível → prémios);
// · as 4 CARTEIRAS SEPARADAS explicadas (Pontos ≠ Bilhetes ≠
//   Prémios ≠ Saldo) — cada uma com o CAMINHO real onde vive
//   (regra do produto: nunca misturar nem converter);
// · os CAMINHOS para prémios reais (sorteios, concursos,
//   instant win) — com o que REALMENTE são;
// · os NÍVEIS com desbloqueios COSMÉTICOS/estruturais — nenhum
//   nível dá vantagem competitiva (prova no núcleo v78);
// · NOTA anti-dark-pattern: pontos nunca expiram, nunca viram
//   dinheiro automaticamente — a conversão NÃO EXISTE.
// Padrão v78 (PainelProgressao): copy em PT do produto, dados do
// núcleo puro, ZERO números inventados.
// ============================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Gamepad2, Coins, Trophy, Gift, ArrowRight, Ticket, Sparkles,
  Wallet, Landmark, ShieldCheck, Clock, Store, Medal, Info,
} from "lucide-react";
import { NIVEIS, nivelDe } from "@/lib/progressao";
import { useProgressao } from "@/lib/progressaoStore";

const PASSOS = [
  { icone: Gamepad2, titulo: "Jogas", desc: "Qualquer jogo do catálogo — sem registo obrigatório, direto no navegador." },
  { icone: Coins, titulo: "Ganhas pontos", desc: "Cada jogo tem um teto honesto, exibido no cartão («Até X pontos»). Missões do dia pagam extra." },
  { icone: Trophy, titulo: "Subes de nível", desc: "1 Novo jogador → 2 Explorador → 3 Competidor → 4 Campeão → 5 Lenda Bateu." },
  { icone: Gift, titulo: "Desbloqueias prémios", desc: "Níveis desbloqueiam aparência e estruturas — e os prémios reais vivem nos sorteios e concursos." },
];

const CARTEIRAS = [
  { icone: Coins, nome: "Pontos", cor: "#facc15", oQue: "Progressão: níveis, missões e ranking.", onde: "Vêm dos jogos — valem para sempre.", caminho: { para: "/my-points", rotulo: "Ver os meus pontos" } },
  { icone: Ticket, nome: "Bilhetes", cor: "#58a6ff", oQue: "Entradas para sorteios com regras próprias.", onde: "Ganhos em sorteios e campanhas — nunca convertidos de pontos.", caminho: { para: "/my-tickets", rotulo: "Ver os meus bilhetes" } },
  { icone: Gift, nome: "Prémios", cor: "#e879f9", oQue: "Resgates e prémios ganhos à tua espera.", onde: "Vêm de sorteios, concursos e instant win.", caminho: { para: "/my-tickets", rotulo: "Ver o que ganhei" } },
  { icone: Wallet, nome: "Saldo", cor: "#34d399", oQue: "Dinheiro real da carteira financeira.", onde: "Depósitos e ganhos financeiros — separado do jogo.", caminho: { para: "/wallet", rotulo: "Abrir a carteira" } },
];

const CAMINHOS = [
  { icone: Store, titulo: "Sorteios & Marketplace", desc: "Prémios reais da comunidade — participa com bilhetes, nunca com pontos.", para: "/marketplace" },
  { icone: Trophy, titulo: "Concursos", desc: "Competições com júri ou votação — prémios anunciados em cada concurso.", para: "/concursos" },
  { icone: Sparkles, titulo: "Instant Win", desc: "Prémios imediatos com probabilidades públicas e auditáveis.", para: "/instant-win" },
  { icone: Medal, titulo: "Os meus pontos", desc: "O teu nível, missões do dia e histórico de progressão — o mapa do ciclo.", para: "/my-points" },
];

const corNivel = (n: number) =>
  n >= 5 ? "#f43f5e" : n >= 4 ? "#f59e0b" : n >= 3 ? "#a3e635" : n >= 2 ? "#fb923c" : "#94a3b8";

const Premios = () => {
  const [agora, setAgora] = useState(() => Date.now());
  const { estado, nivel } = useProgressao(agora);
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // fração honesta do caminho até ao próximo nível: p/(p+faltam)
  const pct = nivel.proximo
    ? Math.min(100, Math.round((estado.pontos / (estado.pontos + nivel.proximo.pontosFaltam)) * 100))
    : 100;

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: "var(--area-bg, #0d1117)", color: "var(--area-text, #e6edf3)" }}>
      <Helmet>
        <title>Prémios — o ciclo completo | Bateu</title>
        <meta name="description" content="Jogos geram pontos, pontos geram níveis e níveis desbloqueiam prémios. As 4 carteiras separadas e os caminhos reais para prémios no Bateu." />
      </Helmet>

      {/* HERO — o ciclo em 4 passos */}
      <section className="relative overflow-hidden border-b border-white/5" data-testid="premios-hero">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 0%, rgba(250,204,21,0.10), transparent 45%), radial-gradient(circle at 85% 20%, rgba(232,121,249,0.10), transparent 40%)" }} />
        <div className="container mx-auto px-4 pt-10 pb-8 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: "rgba(250,204,21,0.12)", color: "#facc15" }}>
            <Gift className="h-3 w-3" /> Prémios
          </span>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black font-display leading-tight">
            Do jogo ao prémio — <span className="text-gradient-primary">o ciclo completo</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            No Bateu, os jogos não são uma funcionalidade secundária: são o motor de retenção.
            Tudo o que ganhas jogando fica contigo — os pontos <b>nunca expiram</b> e o progresso nunca é apagado.
          </p>

          {/* os 4 passos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6" data-testid="premios-ciclo-steps">
            {PASSOS.map((p, i) => (
              <motion.div
                key={p.titulo}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="absolute top-3 right-3 text-[10px] font-black opacity-40">{i + 1}.</span>
                <p.icone className="h-6 w-6" style={{ color: "#facc15" }} strokeWidth={1.8} />
                <p className="mt-2 text-sm font-black">{p.titulo}</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{p.desc}</p>
                {i < PASSOS.length - 1 && <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />}
              </motion.div>
            ))}
          </div>

          {/* faixa de progressão REAL (núcleo v78) */}
          <div className="mt-6 rounded-2xl p-4" data-testid="premios-progresso" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: corNivel(nivel.nivel) + "22", color: corNivel(nivel.nivel), border: `1px solid ${corNivel(nivel.nivel)}44` }}>
                  {nivel.nivel}
                </span>
                <div>
                  <p className="text-sm font-black">{nivel.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {estado.pontos.toLocaleString("pt-PT")} pontos
                    {nivel.proximo ? ` · faltam ${nivel.proximo.pontosFaltam.toLocaleString("pt-PT")} para ${nivel.proximo.nome}` : " · nível máximo"}
                  </p>
                </div>
              </div>
              {!estado.jogadorId && (
                <span className="text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: "rgba(88,166,255,0.1)", color: "#58a6ff" }}>
                  Progresso neste aparelho — regista-te para guardar na conta
                </span>
              )}
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${corNivel(nivel.nivel)}, #facc15)` }} />
            </div>
          </div>
        </div>
      </section>

      {/* AS 4 CARTEIRAS — separadas por regra do produto */}
      <section className="container mx-auto px-4 py-8" data-testid="premios-carteiras">
        <h2 className="text-lg font-black font-display">As 4 carteiras — cada uma com as suas regras</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Nunca misturadas: pontos não viram bilhetes nem dinheiro — cada carteira tem caminhos próprios e explícitos.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {CARTEIRAS.map((c, i) => (
            <motion.div
              key={c.nome}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-4 flex flex-col"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.cor}33` }}
            >
              <span className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: c.cor + "1a", border: `1px solid ${c.cor}44` }}>
                <c.icone className="h-4.5 w-4.5" style={{ color: c.cor }} />
              </span>
              <p className="mt-2.5 text-sm font-black" style={{ color: c.cor }}>{c.nome}</p>
              <p className="text-[11px] font-semibold mt-1 leading-snug">{c.oQue}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{c.onde}</p>
              <Link to={c.caminho.para} className="mt-3 inline-flex items-center gap-1 text-[10px] font-black hover:underline" style={{ color: c.cor }}>
                {c.caminho.rotulo} <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CAMINHOS PARA PRÉMIOS REAIS */}
      <section className="container mx-auto px-4 pb-8" data-testid="premios-caminhos">
        <h2 className="text-lg font-black font-display">Caminhos para prémios reais</h2>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {CAMINHOS.map((c, i) => (
            <motion.div
              key={c.titulo}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            >
              <Link
                to={c.para}
                className="flex items-start gap-3 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "rgba(46,160,67,0.12)", border: "1px solid rgba(46,160,67,0.25)" }}>
                  <c.icone className="h-5 w-5" style={{ color: "#2ea043" }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black">{c.titulo}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">{c.desc}</span>
                </span>
                <ArrowRight className="h-4 w-4 mt-1 text-muted-foreground/50" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NÍVEIS & DESBLOQUEIOS — só cosmético/estrutural, honesto */}
      <section className="container mx-auto px-4 pb-8" data-testid="premios-niveis">
        <h2 className="text-lg font-black font-display">Níveis e desbloqueios</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Desbloqueios de aparência e estruturas — <b>nenhum nível dá vantagem em jogo</b> (regra do produto, provada no núcleo).
        </p>
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {NIVEIS.map((n, i) => {
            const alcancado = estado.pontos >= n.pontos;
            return (
              <div
                key={n.nivel}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{ background: alcancado ? corNivel(n.nivel) + "0d" : "transparent", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}
                data-testid={`premios-nivel-${n.nivel}`}
              >
                <span className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: corNivel(n.nivel) + "1a", color: corNivel(n.nivel), border: `1px solid ${corNivel(n.nivel)}44` }}>
                  {n.nivel}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black flex items-center gap-2 flex-wrap">
                    {n.nome}
                    <span className="text-[10px] font-semibold text-muted-foreground">{n.pontos.toLocaleString("pt-PT")} pts</span>
                    {alcancado && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(46,160,67,0.15)", color: "#2ea043" }}>ALCANÇADO</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Desbloqueia: {n.desbloqueia.join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* NOTA HONESTA — anti dark-pattern */}
      <section className="container mx-auto px-4 pb-12" data-testid="premios-nota-honesta">
        <div className="rounded-2xl p-5" style={{ background: "rgba(88,166,255,0.06)", border: "1px solid rgba(88,166,255,0.22)" }}>
          <p className="flex items-center gap-2 text-sm font-black" style={{ color: "#58a6ff" }}>
            <ShieldCheck className="h-4 w-4" /> As regras do ciclo — sem letras pequenas
          </p>
          <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} /> Os pontos <b>nunca expiram</b> — não existe nenhum caminho que os retire sem pedir.</li>
            <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} /> Os pontos <b>nunca viram dinheiro automaticamente</b> — a conversão não existe. Resgates são sempre operações explícitas, com regras próprias.</li>
            <li className="flex gap-2"><Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} /> Missões têm alvos sempre alcançáveis e aviso antes de terminar («expira hoje»). Nada expira sem aviso.</li>
            <li className="flex gap-2"><Landmark className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#58a6ff" }} /> Probabilidades de prémios são públicas e auditáveis na página da transparência.</li>
          </ul>
        </div>

        {/* CTA para o motor do ciclo */}
        <Link
          to="/jogos"
          data-testid="premios-cta-jogos"
          className="mt-6 flex items-center justify-between rounded-2xl px-5 py-4 transition-transform hover:scale-[1.01]"
          style={{ background: "linear-gradient(115deg, rgba(46,160,67,0.18), rgba(13,17,23,0.4))", border: "1px solid rgba(46,160,67,0.35)" }}
        >
          <span>
            <span className="block text-sm font-black">Começa pelo início do ciclo: joga</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5">Cada partida vale pontos — o kart dá até 120.</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: "#2ea043" }}>
            <Gamepad2 className="h-3.5 w-3.5" /> VER JOGOS
          </span>
        </Link>
      </section>
    </div>
  );
};

export default Premios;
