// ============================================================
// PAINEL DE DESBLOQUEIOS (v80) — «PROGRESSÃO DESBLOQUEIA PRÉMIOS»
// ─────────────────────────────────────────────────────────────
// Componente PRESENTACIONAL (zero hooks de store — o DONO da
// store passa tudo por props; a regra v78 «um único dono por
// rota» mantém-se: duas instâncias de useProgressao com o efeito
// de re-agendamento podiam REVERTER um claim). Os donos hoje:
// · PainelProgressao (hub) — passa as suas;
// · Profile — dono próprio na rota /profile.
//
// Mostra o CATÁLOGO REAL dos desbloqueios (núcleo desbloqueios.ts
// sincronizado com NIVEIS v78): desbloqueado → com ação
// «Usar/A usar» (moldura/título/tema) ou «Ativo» (avatar);
// bloqueado → nível e pontos EXATOS que faltam (nada de
// «quase lá» fictício). Tudo COSMÉTICO/ESTRUTURAL — nunca stats.
// ============================================================
import { motion } from "framer-motion";
import { Lock, Check, Crown } from "lucide-react";
import {
  CAT_DESBLOQUEIOS, tipoSelecionavel, podeUsar,
} from "@/lib/desbloqueios";
import { NIVEIS } from "@/lib/progressao";
import type { EstadoProgressao } from "@/lib/progressao";
import type { CosmeticosEstado } from "@/lib/desbloqueios";
import type { EstadoNivel } from "@/lib/progressao";

type TipoEscolha = "moldura" | "titulo" | "tema";

const NOME_NIVEL = new Map(NIVEIS.map((n) => [n.nivel, n.nome]));

const PainelDesbloqueios = ({
  estado,
  nivel,
  cosmeticos,
  escolher,
  compacto = false,
}: {
  estado: EstadoProgressao;
  nivel: EstadoNivel;
  cosmeticos: CosmeticosEstado;
  escolher: (tipo: TipoEscolha, id: string | null) => { motivo: string };
  compacto?: boolean;
}) => {
  const selecionado = (tipo: TipoEscolha, id: string) =>
    cosmeticos[`${tipo}Id` as keyof CosmeticosEstado] === id;

  return (
    <div data-testid="painel-desbloqueios" className={compacto ? "" : "mt-4"}>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
        Desbloqueios do nível <span className="normal-case text-muted-foreground/70">(aparência e acesso — nunca vantagem em jogo)</span>
      </p>

      {/* PRÉVIA: a moldura + o título SELECIONADOS aplicados de verdade */}
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-3 py-2.5" data-testid="desbloqueios-previa">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: cosmeticos.molduraId
              ? `3px solid ${CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.molduraId)?.cor ?? "#f59e0b"}`
              : "2px solid rgba(255,255,255,0.14)",
            boxShadow: cosmeticos.molduraId ? `0 0 12px ${CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.molduraId)?.cor ?? "#f59e0b"}55` : "none",
          }}
        >
          {estado.jogadorId ? estado.jogadorId.slice(0, 2).toUpperCase() : "TU"}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black leading-tight">
            Nível {nivel.nivel} · {nivel.nome}
            {cosmeticos.tituloId && (
              <span
                data-testid="desbloqueios-titulo-ativo"
                className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                style={{
                  color: CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.tituloId)?.cor,
                  background: (CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.tituloId)?.cor ?? "#f59e0b") + "1a",
                  border: `1px solid ${CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.tituloId)?.cor ?? "#f59e0b"}55`,
                }}
              >
                <Crown className="h-2.5 w-2.5" />
                {CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.tituloId)?.nome.replace("Título «", "«").replace("»", "»")}
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {cosmeticos.molduraId
              ? `A usar: ${CAT_DESBLOQUEIOS.find((d) => d.id === cosmeticos.molduraId)?.nome}`
              : "Sem moldura — escolhe uma desbloqueada abaixo."}
          </p>
        </div>
      </div>

      {/* GRELHA do catálogo completo — honesta: bloqueado mostra o que falta */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="desbloqueios-grelha">
        {CAT_DESBLOQUEIOS.map((d, i) => {
          const aberto = podeUsar(d.id, nivel.nivel);
          const emUso = aberto && (
            (d.tipo === "moldura" && selecionado("moldura", d.id)) ||
            (d.tipo === "titulo" && selecionado("titulo", d.id)) ||
            (d.tipo === "tema" && selecionado("tema", d.id))
          );
          const sele = tipoSelecionavel(d.tipo);
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.03 }}
              data-testid={`desbloqueio-${d.id}`}
              className={`relative rounded-2xl border p-3 ${aberto ? "" : "opacity-70"}`}
              style={{
                borderColor: aberto ? d.cor + "55" : "rgba(255,255,255,0.08)",
                background: aberto ? d.cor + "0d" : "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: aberto ? d.cor : "rgba(255,255,255,0.35)" }}>
                  {d.tipo}
                </span>
                {emUso ? (
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">A USAR</span>
                ) : !aberto ? (
                  <span className="flex items-center gap-0.5 rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> Nv {d.nivel}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-xs font-black leading-tight ${aberto ? "" : "text-muted-foreground"}`}>{d.nome}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{d.desc}</p>
              <div className="mt-2">
                {!aberto ? (
                  <p className="text-[10px] font-bold text-muted-foreground" data-testid={`desbloqueio-falta-${d.id}`}>
                    {NOME_NIVEL.get(d.nivel)} · {NIVEIS.find((n) => n.nivel === d.nivel)?.pontos.toLocaleString("pt-PT")} pts
                  </p>
                ) : !sele ? (
                  <p className="flex items-center gap-1 text-[10px] font-black text-emerald-300">
                    <Check className="h-3 w-3" /> {d.tipo === "avatar" ? "Ativo" : "Disponível"}
                  </p>
                ) : emUso ? (
                  <button
                    data-testid={`desbloqueio-remover-${d.id}`}
                    onClick={() => escolher(d.tipo as TipoEscolha, null)}
                    className="rounded-lg border border-border bg-white/5 px-2.5 py-1 text-[10px] font-bold text-muted-foreground transition hover:bg-white/10"
                  >
                    Remover
                  </button>
                ) : (
                  <button
                    data-testid={`desbloqueio-usar-${d.id}`}
                    onClick={() => escolher(d.tipo as TipoEscolha, d.id)}
                    className="rounded-lg px-2.5 py-1 text-[10px] font-black text-white transition hover:brightness-110"
                    style={{ background: d.cor }}
                  >
                    Usar
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PainelDesbloqueios;
