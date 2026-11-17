// ============================================================
// NPC IA — PAINEL DE CONVERSA DA BATEU IA NA PRAÇA (v57)
// O passo anotado desde a v54: a IA dentro da Cidade Bateu.
// Chat REAL (nvidia/nemotron-3-ultra-550b-a55b) pela MESMA via do
// resto da plataforma: resolverEndpointChat (fonte única v57) —
// proxy em dev/testes, edge function em produção; a chave NUNCA
// chega ao browser.
//
// Honestidade:
//   · a saudação inicial é CÓPIA LOCAL (i18n), não IA a fingir;
//   · stats reais do usage (nunca estimadas) — o NPC mostra o total
//     de tokens quando o upstream envia usage;
//   · STOP aborta a sério (AbortSignal propagado) e a nota «Parado
//     por ti» fica guardada na mensagem parcial (padrão v54);
//   · erros reais no banner com o estado HTTP — nunca silenciados;
//   · histórico local cap 12 (LIMITES_NPC), validado pelo núcleo
//     puro npcIa.ts (o MESMO módulo que o teste Node prova).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Eraser, Send, Square, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClienteNemotron, MODELO_PADRAO, NemotronError, NemotronRateLimitError,
  PortaoRateLimit, htmlDeMarkdown,
  type UsoIa,
} from "@/lib/nemotron";
import { cabecalhosEdge, resolverEndpointChat } from "@/lib/iaEndpoint";
import {
  LIMITES_NPC, NPC_IA_NOME, contextoCidade, promptSistemaNpc, validarHistoricoNpc,
  type ContextoNpc, type MsgNpc,
} from "@/game/cidade/npcIa";

interface FluxoNpc {
  raciocinio: string;
  conteudo: string;
}

export default function NpcIa({
  onFechar,
  contextoDados,
}: {
  onFechar: () => void;
  /** Factos medidos da cidade, recolhidos FRESCOS antes de cada envio. */
  contextoDados: () => ContextoNpc;
}) {
  const { t } = useLanguage();
  const [mensagens, setMensagens] = useState<MsgNpc[]>(() =>
    validarHistoricoNpc((() => {
      try { return JSON.parse(localStorage.getItem(LIMITES_NPC.CHAVE_STORAGE) ?? "[]"); }
      catch { return []; }
    })()),
  );
  const [entrada, setEntrada] = useState("");
  const [aFluir, setAFluir] = useState(false);
  const [fluxo, setFluxo] = useState<FluxoNpc | null>(null);
  const [uso, setUso] = useState<UsoIa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pensar, setPensar] = useState(false);

  const controladorRef = useRef<AbortController | null>(null);
  const clienteRef = useRef<ClienteNemotron | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const caixaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cliente com o MESMO endpoint do resto da plataforma (fonte única v57)
  // e portão PRÓPRIO do NPC (10/min, intervalo 1,2 s — caps do núcleo).
  useEffect(() => {
    let vivo = true;
    (async () => {
      const info = resolverEndpointChat();
      const cab = info.modo === "edge" ? await cabecalhosEdge() : undefined;
      if (!vivo) return;
      clienteRef.current = new ClienteNemotron({
        endpoint: info.url,
        chave: info.chaveDirecta,
        cabecalhos: cab,
        tentativas: 2,
        portao: new PortaoRateLimit(LIMITES_NPC.PORTAO_POR_MIN, LIMITES_NPC.PORTAO_JANELA_MS, LIMITES_NPC.PORTAO_INTERVALO_MS),
      });
    })();
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LIMITES_NPC.CHAVE_STORAGE, JSON.stringify(mensagens)); } catch {}
  }, [mensagens]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, fluxo?.conteudo, fluxo?.raciocinio, erro]);

  useEffect(() => {
    // foco honesto ao abrir (o pai monta este componente já aberto)
    const t2 = setTimeout(() => caixaRef.current?.focus(), 120);
    return () => clearTimeout(t2);
  }, []);

  const enviar = useCallback(async (textoDireto?: string) => {
    const texto = (textoDireto ?? entrada).trim().slice(0, LIMITES_NPC.ENTRADA_CAP);
    if (!texto || aFluir || !clienteRef.current) return;
    setErro(null);
    setUso(null);
    setEntrada("");
    const pergunta: MsgNpc = { role: "user", content: texto };
    const mensagensAntes = mensagens;
    setMensagens((m) => [...m, pergunta]);
    setAFluir(true);
    setFluxo({ raciocinio: "", conteudo: "" });

    const ctx = contextoDados();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    try {
      const r = await clienteRef.current.conversarStream({
        mensagens: [
          { role: "system", content: promptSistemaNpc(ctx) },
          { role: "system", content: contextoCidade(ctx) },
          ...mensagensAntes,
          pergunta,
        ],
        parametros: {
          modelo: MODELO_PADRAO,
          temperatura: 0.7,
          topP: 0.95,
          maxTokens: LIMITES_NPC.MAX_TOKENS,
          thinking: pensar,
        },
        sinal: controlador.signal,
        aoEvento: (e) => {
          if (e.tipo === "raciocinio") setFluxo((f) => (f ? { ...f, raciocinio: f.raciocinio + e.texto } : f));
          if (e.tipo === "conteudo") setFluxo((f) => (f ? { ...f, conteudo: f.conteudo + e.texto } : f));
          if (e.tipo === "uso") setUso(e.uso);
        },
      });
      // nota honesta do STOP: guardada NA mensagem parcial (padrão v54) —
      // com parcial ou sem, o jogador vê que o corte foi dele
      const corpo = r.parado
        ? ((r.conteudo ? r.conteudo + "\n\n" : "") + t("cidade.npc.parado"))
        : r.conteudo;
      const resposta: MsgNpc = {
        role: "assistant",
        content: corpo.slice(0, LIMITES_NPC.RESPOSTA_CAP),
      };
      setMensagens((m) => [...m, resposta]);
      if (r.uso) setUso(r.uso);
    } catch (e: any) {
      if (e instanceof NemotronRateLimitError) {
        setErro(`${t("cidade.npc.rate")} (${Math.ceil((e.esperarMs || 1000) / 1000)}s)`);
      } else if (e instanceof NemotronError) {
        setErro(`${t("cidade.npc.erro")} — ${String(e.message).slice(0, 220)}`);
      } else {
        setErro(`${t("cidade.npc.erro")} — ${String(e?.message ?? e).slice(0, 220)}`);
      }
      // a pergunta fica (o jogador vê o que não foi respondido — honesto);
      // abort a meio entra aqui via AbortError: guarda a parcial
      setFluxo((f) => {
        if (f && f.conteudo) {
          setMensagens((m) => [...m, { role: "assistant", content: (f.conteudo + "\n\n" + t("cidade.npc.parado")).slice(0, LIMITES_NPC.RESPOSTA_CAP) }]);
        }
        return null;
      });
    } finally {
      setAFluir(false);
      setFluxo(null);
      controladorRef.current = null;
    }
  }, [entrada, aFluir, mensagens, pensar, t, contextoDados]);

  const parar = useCallback(() => {
    controladorRef.current?.abort();
  }, []);

  const limpar = useCallback(() => {
    if (aFluir) controladorRef.current?.abort();
    setMensagens([]);
    setErro(null);
    setUso(null);
    try { localStorage.removeItem(LIMITES_NPC.CHAVE_STORAGE); } catch {}
  }, [aFluir]);

  const sugestoes = useMemo(
    () => [t("cidade.npc.sug1"), t("cidade.npc.sug2"), t("cidade.npc.sug3"), t("cidade.npc.sug4")],
    [t],
  );

  return (
    <div
      data-testid="cd-npc-painel"
      className="w-full max-w-lg rounded-2xl border border-violet-400/30 bg-[#120b26]/95 backdrop-blur shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── cabeçalho ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/30 border border-violet-300/40">
          <Brain size={15} className="text-violet-200" />
          <span className="absolute inset-0 rounded-full animate-pulse bg-violet-400/20" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-tight">{NPC_IA_NOME}</p>
          <p className="text-[10px] text-violet-200/70 leading-tight">{t("cidade.npc.cargo")}</p>
        </div>
        {uso?.totalTokens != null && (
          <span data-testid="cd-npc-usage" className="text-[10px] tabular-nums text-white/50 border border-white/10 rounded-full px-2 py-0.5">
            {uso.totalTokens} {t("cidade.npc.tokens")}
          </span>
        )}
        <button
          onClick={limpar}
          title={t("cidade.npc.limpar")}
          data-testid="cd-npc-limpar"
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          <Eraser size={14} />
        </button>
        <button
          onClick={onFechar}
          title="×"
          data-testid="cd-npc-fechar"
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition text-xl leading-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── mensagens ── */}
      <div className="px-4 py-3 space-y-2.5 h-72 overflow-y-auto" data-testid="cd-npc-mensagens">
        {!mensagens.length && !fluxo && (
          <div className="space-y-3 pt-2">
            <p className="text-[12px] leading-relaxed text-white/80 border border-violet-300/20 bg-violet-400/10 rounded-xl px-3 py-2.5" data-testid="cd-npc-ola">
              {t("cidade.npc.ola")}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {sugestoes.map((s, i) => (
                <button
                  key={i}
                  data-testid={`cd-npc-sugestao-${i}`}
                  onClick={() => enviar(s)}
                  className="text-left text-[11px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) => (
          m.role === "user" ? (
            <div key={`u${i}`} className="flex justify-end" data-testid={`cd-npc-msg-${i}`}>
              <p className="max-w-[85%] text-[12px] leading-snug rounded-2xl rounded-br-sm px-3 py-2 bg-violet-500/80 text-white whitespace-pre-wrap break-words">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={`a${i}`} className="flex justify-start" data-testid={`cd-npc-msg-${i}`}>
              <div className="max-w-[88%] text-[12px] leading-relaxed rounded-2xl rounded-bl-sm px-3 py-2 bg-white/8 border border-white/10 text-white/90">
                {m.content && (
                  <div
                    data-testid={`cd-npc-conteudo-${i}`}
                    className="ia-md [&_a]:text-violet-300 [&_code]:text-amber-200 [&_pre]:bg-black/40 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:my-1 [&_pre]:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: htmlDeMarkdown(m.content) }}
                  />
                )}
              </div>
            </div>
          )
        ))}

        {/* fluxo em curso */}
        {fluxo && (
          <div className="flex justify-start" data-testid="cd-npc-fluxo">
            <div className="max-w-[88%] text-[12px] leading-relaxed rounded-2xl rounded-bl-sm px-3 py-2 bg-white/8 border border-white/10 text-white/90">
              {fluxo.raciocinio && (
                <details className="mb-1.5 group" data-testid="cd-npc-raciocinio">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-violet-300/80 select-none">
                    {t("cidade.npc.pensamento")}
                  </summary>
                  <p className="mt-1 text-[10px] leading-snug text-white/45 whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {fluxo.raciocinio}
                  </p>
                </details>
              )}
              <div
                data-testid="cd-npc-conteudo-fluxo"
                className="ia-md [&_a]:text-violet-300 [&_code]:text-amber-200"
                dangerouslySetInnerHTML={{ __html: htmlDeMarkdown(fluxo.conteudo) }}
              />
              <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-violet-300 animate-pulse rounded-sm" />
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* ── erro honesto ── */}
      {erro && (
        <div className="mx-4 mb-2 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 flex items-center justify-between gap-2" data-testid="cd-npc-erro">
          <span className="text-[11px] text-rose-200 leading-snug">{erro}</span>
          <button onClick={() => setErro(null)} aria-label="fechar" className="text-rose-300/70 hover:text-rose-200">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── entrada ── */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={caixaRef}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
            rows={2}
            maxLength={LIMITES_NPC.ENTRADA_CAP}
            placeholder={t("cidade.npc.pergunta")}
            data-testid="cd-npc-caixa"
            disabled={aFluir}
            className="flex-1 resize-none rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-[12px] text-white placeholder:text-white/35 focus:outline-none focus:border-violet-300/50 disabled:opacity-50"
          />
          {aFluir ? (
            <button
              onClick={parar}
              data-testid="cd-npc-parar"
              className="px-3 py-2.5 rounded-xl font-black text-[12px] bg-rose-500/80 text-white active:scale-95 transition flex items-center gap-1"
            >
              <Square size={12} /> {t("cidade.npc.parar")}
            </button>
          ) : (
            <button
              onClick={() => enviar()}
              disabled={!entrada.trim()}
              data-testid="cd-npc-enviar"
              className="px-3 py-2.5 rounded-xl font-black text-[12px] bg-gradient-to-r from-violet-400 to-fuchsia-500 text-slate-950 active:scale-95 transition disabled:opacity-40 flex items-center gap-1"
            >
              <Send size={12} /> {t("cidade.npc.enviar")}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pensar}
              onChange={(e) => setPensar(e.target.checked)}
              data-testid="cd-npc-pensar"
              className="accent-violet-400"
            />
            {t("cidade.npc.pensamento")}
          </label>
          <p className="text-[9px] text-white/35 leading-tight text-right flex-1" data-testid="cd-npc-nota">
            {t("cidade.npc.nota")}
          </p>
        </div>
      </div>
    </div>
  );
}
