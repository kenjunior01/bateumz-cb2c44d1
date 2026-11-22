// ============================================================
// PAINEL DE PROGRESSÃO (v78) — «JOGOS NO CENTRO DA RETENÇÃO»
// ─────────────────────────────────────────────────────────────
// «Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios.» — o painel mostra o CICLO a valer:
// · faixa de progressão (Pontos · Nível · quanto falta);
// · MISSÕES DO DIA (determinísticas, alvos alcançáveis, AVISO
//   honesto quando estão a acabar);
// · RECOMENDAÇÕES por REGRAS (não IA) com razão honesta por jogo;
// · CARTUBEIRAS SEPARADAS: Pontos ≠ Bilhetes ≠ Prémios ≠ Saldo
//   (nunca misturadas — regra do produto);
// · CONVIDADO: mensagem honesta «Joga sem registo…» — o progresso
//   fica SÓ no aparelho (o painel declara).
// Os desbloqueios de nível são COSMÉTICOS/estruturais — nenhum
// nível altera stats de jogo (vantagem injusta não existe aqui).
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ALL_GAMES, pontosMaxDe } from "@/lib/gamesCatalog";
import { useProgressao } from "@/lib/progressaoStore";
import { avisoExpiracao, recomendarJogos, visaoCarteiras, NIVEIS } from "@/lib/progressao";

const NIVEIS_BASE = NIVEIS.map((n) => n.pontos);

const PainelProgressao = ({ onAbrirJogo }: { onAbrirJogo?: (jogoId: string) => void }) => {
  const { toast } = useToast();
  const [agora, setAgora] = useState(() => Date.now());
  const { estado, nivel, reclamar, registrarPartida } = useProgressao(agora);

  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  // v78 PONTE dos JOGOS: qualquer jogo anuncia o fim da partida no bus do
  // window (`bateu:partida` { jogoId, vitoria, pontos }) e o PAINEL — o único
  // dono da store — aplica TUDO numa transição atómica do NÚCLEO.
  useEffect(() => {
    const onPartida = (ev: Event) => {
      const d = (ev as CustomEvent<{ jogoId?: string; vitoria?: boolean; pontos?: number }>).detail;
      const jogoId = typeof d?.jogoId === "string" ? d.jogoId.slice(0, 40) : "";
      if (!jogoId) return;
      registrarPartida(jogoId, {
        vitoria: d?.vitoria === true,
        pontos: typeof d?.pontos === "number" ? d.pontos : undefined,
        teto: pontosMaxDe(jogoId),
      });
    };
    window.addEventListener("bateu:partida", onPartida as EventListener);
    return () => window.removeEventListener("bateu:partida", onPartida as EventListener);
  }, [registrarPartida]);

  const catalogo = useMemo(() => ALL_GAMES
    .filter((g) => g.pontosMax && g.minutos && g.dificuldade)
    .map((g) => ({
      id: g.id,
      label: g.label,
      minutosMax: g.minutos ?? 5,
      dificuldade: g.dificuldade ?? "Média",
      multiplayer: g.players.includes("1v1") || g.players.includes("VS"),
      precisaConta: false, // TODOS os jogos do catálogo são jogáveis sem registo (honesto)
    })), []);
  const recomendacoes = useMemo(
    () => recomendarJogos(estado, catalogo, agora, {}),
    [estado, catalogo, agora],
  );
  const jogoPorId = useMemo(() => new Map(ALL_GAMES.map((g) => [g.id, g])), []);
  const missoes = estado.missoes.slice(0, 3);
  const nomeJogo = (id: string | null) => (id ? jogoPorId.get(id)?.label.split(":")[0] ?? id : "qualquer jogo");
  const carteiras = visaoCarteiras(estado, 0, 0, { valor: 0, moeda: "MZN" });

  const reclamarAgora = (id: string) => {
    const r = reclamar(id);
    if (r.motivo === "ok") {
      toast({ title: `+${r.pontos} pontos — missão concluída!`, description: "Os pontos nunca expiram. Continua a subir de nível." });
    } else if (r.motivo === "falta") {
      toast({ title: "Missão ainda não concluída", description: "Joga o que falta para poder reclamar." });
    } else {
      toast({ title: "Missão indisponível", description: r.motivo === "expirada" ? "O prazo acabou — há missão nova amanhã." : "Esta missão já foi reclamada." });
    }
  };

  const base = NIVEIS_BASE[nivel.nivel - 1] ?? 0;
  // progresso DENTRO do nível: (pontos − base) / (alvo do próximo − base)
  const span = nivel.proximo ? Math.max(1, (estado.pontos + nivel.proximo.pontosFaltam) - base) : 1;
  const pct = nivel.proximo ? Math.max(4, Math.min(96, Math.round(((estado.pontos - base) / span) * 100))) : 100;

  return (
    <div data-testid="painel-progressao" className="mb-5 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-fuchsia-500/5 p-4 sm:p-5">
      {/* CONVIDADO: mensagem honesta (o progresso está no APARELHO) */}
      {!estado.jogadorId && (
        <div data-testid="progressao-convidado" className="mb-3 flex flex-col gap-2 rounded-2xl border border-sky-500/40 bg-sky-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-sky-100">
            Joga sem registo. Regista-te para guardar os teus pontos e desbloquear prémios.
          </p>
          <span className="text-[11px] text-sky-300/80 sm:whitespace-nowrap">
            Progresso atual: só neste dispositivo
          </span>
        </div>
      )}

      {/* FAIXA DE PROGRESSÃO: Pontos · Nível · quanto falta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span data-testid="progressao-pontos" className="font-display text-2xl font-black text-amber-300">{estado.pontos.toLocaleString("pt-PT")}</span>
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">pontos</span>
          <span data-testid="progressao-nivel" className="rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-3 py-0.5 text-xs font-black text-fuchsia-200">
            Nível {nivel.nivel} · {nivel.nome}
          </span>
        </div>
        {/* CARTUBEIRAS SEPARADAS (regra do produto — nunca misturadas) */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]" data-testid="progressao-carteiras">
          <span className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-bold text-amber-200">Pontos: {estado.pontos.toLocaleString("pt-PT")}</span>
          <span className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-bold text-emerald-200">Bilhetes: {carteiras.bilhetes}</span>
          <span className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-2 py-1 font-bold text-sky-200">Prémios: {carteiras.premiosDisponiveis}</span>
          <span className="rounded-lg border border-slate-400/40 bg-slate-400/10 px-2 py-1 font-bold text-slate-200">Saldo: 0 MZN</span>
        </div>
      </div>

      {/* barra até ao próximo nível (desbloqueios cosméticos — nunca stats) */}
      {nivel.proximo ? (
        <div className="mt-2" data-testid="progressao-barra">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Faltam <b className="text-foreground">{nivel.proximo.pontosFaltam.toLocaleString("pt-PT")}</b> pontos para o nível {nivel.proximo.nivel} · {nivel.proximo.nome}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-bold text-amber-300">Nível máximo atingido — Lenda Bateu. Os pontos continuam a valer prémios.</p>
      )}

      {/* MISSÕES DO DIA (determinísticas, alvo alcançável, com aviso de prazo) */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Missão do dia</p>
        <div className="grid gap-2 sm:grid-cols-3" data-testid="progressao-missoes">
          {missoes.length === 0 && (
            <p className="text-xs text-muted-foreground">Missões novas chegam com a próxima partida.</p>
          )}
          {missoes.map((mm) => {
            const av = avisoExpiracao(mm, agora);
            const completa = mm.progresso >= mm.alvo;
            return (
              <div key={mm.id} data-testid={`progressao-missao-${mm.modelo}`} className={`rounded-2xl border p-3 ${completa ? "border-emerald-400/60 bg-emerald-400/10" : "border-border bg-card/60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-snug">{mm.titulo}</p>
                  {av.expiraBreve && <span className="whitespace-nowrap rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">termina hoje</span>}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {mm.jogosDistintos > 0 ? "Jogos distintos hoje: " : mm.jogoId ? `Em ${nomeJogo(mm.jogoId)}: ` : "Partidas hoje: "}
                  <b className="text-foreground">{mm.progresso}/{mm.alvo}</b>
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-300">+{mm.pontos} pontos</span>
                  {mm.reclamada ? (
                    <span className="text-[10px] font-bold text-emerald-300">✓ reclamada</span>
                  ) : (
                    <button
                      data-testid={`progressao-reclamar-${mm.modelo}`}
                      onClick={() => reclamarAgora(mm.id)}
                      disabled={!completa}
                      className={`rounded-lg px-3 py-1 text-[11px] font-black transition ${completa ? "bg-emerald-500 text-white hover:bg-emerald-400" : "cursor-not-allowed bg-muted text-muted-foreground"}`}
                    >
                      {completa ? "Reclamar" : "Em curso"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECOMENDAÇÕES (REGRAS determinísticas — não IA; razão honesta por jogo) */}
      {recomendacoes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Recomendados para ti</p>
          <div className="flex flex-wrap gap-2" data-testid="progressao-recomendacoes">
            {recomendacoes.map((r) => {
              const g = jogoPorId.get(r.jogoId);
              if (!g) return null;
              return (
                <button
                  key={r.jogoId}
                  onClick={() => onAbrirJogo?.(r.jogoId)}
                  className="group flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-left transition hover:border-primary/60 hover:bg-primary/5"
                >
                  <span className="text-lg">{g.emoji}</span>
                  <span className="flex flex-col">
                    <span className="text-[11px] font-bold leading-tight">{g.label.split(":")[0]}</span>
                    <span className="text-[10px] text-muted-foreground">{r.razao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Joga → ganha pontos → sobe de nível → desbloqueia vantagens. Os desbloqueios são de aparência e acesso — nunca dão vantagem em jogo.
        {pontosMaxDe("kart") > 0 && <> O BATEU KART rende até <b>{pontosMaxDe("kart")} pontos</b> por corrida.</>}
      </p>
    </div>
  );
};

export default PainelProgressao;
