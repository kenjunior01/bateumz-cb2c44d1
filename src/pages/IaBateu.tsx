// ═══════════════════════════════════════════════════════════════════════
// v54 — BATEU IA (/ia) — o assistente Nemotron da plataforma
//
// Chat REAL com a NVIDIA (nvidia/nemotron-3-ultra-550b-a55b): streaming
// token a token, THINKING separado (reasoning_content num painel próprio),
// 6 personas, multi-conversa persistente (localStorage, cap honesto de 20),
// parâmetros completos (modelo/temperatura/top_p/max_tokens), STOP que
// aborta a geração a meio (propagado ao upstream), estatísticas REAIS
// (usage do servidor — nunca inventado), exportação .md.
//
// Onde corre: o browser NUNCA fala com a NVIDIA nem conhece a chave —
//   · modo "edge"  (produção): supabase/functions/nemotron-chat com JWT;
//   · modo "proxy" (dev/testes): server/ia-proxy.mjs via VITE_IA_ENDPOINT;
//   · modo "directo" (SÓ dev, declarado no UI): VITE_NEMOTRON_DIRECTO=1
//     + VITE_NVIDIA_API_KEY — a chave fica no bundle (risco declarado).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot, BrainCircuit, ChevronDown, Code2, Download, Eraser, Globe, LifeBuoy,
  Loader2, Plus, Send, Settings2, Sparkles, Square, Trash2, Trophy, User,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ClienteNemotron, LIMITES, MODELOS_CONHECIDOS, NemotronError, NemotronRateLimitError,
  conversaParaMarkdown, htmlDeMarkdown, novaConversa, tituloDe,
  type ConversaIa, type MsgIa, type ParametrosIa, type UsoIa,
} from "@/lib/nemotron";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ── Personas (prompts de sistema; a regra final manda responder na língua do utilizador) ──

interface PersonaIa {
  id: string;
  icone: typeof Bot;
  thinkingPadrao: boolean;
  prompt: string;
}

const CONTEXTO_PLATAFORMA =
  "És a IA oficial da Bateu — a plataforma moçambicana de sorteios verificados, jogos ao vivo, " +
  "desporto real, marketplace, leilões esports, alienação de bens e a Cidade Bateu 3D. " +
  "Conhecimentos da plataforma: bilhetes, carteira, cupões, referências e amigos, Torneios/Arena, " +
  "comunidade e stories. Regras: nunca inventas resultados de sorteios, vencedores, probabilidades " +
  "ou dados legais/licenças — se não souberes, dizês honestamente e apontas a secção certa " +
  "(Transparência, Como Funciona, Suporte). Jogo responsável sempre: a diversão vem primeiro, " +
  "nunca aconselhas gastar mais do que a pessoa pode.";

const PERSONAS: PersonaIa[] = [
  {
    id: "assistente", icone: LifeBuoy, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és o GUIA da plataforma: respostas curtas, passo a passo, com os caminhos certos no site " +
      "(bilhetes, carteira, como participar, como levantar). ",
  },
  {
    id: "desporto", icone: Trophy, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és COMENTADOR DESPORTIVO: análises com energia de narrador, estatísticas quando as souberes " +
      "de verdade (nunca inventadas), e ligas cada análise aos jogos de palpite da Bateu com responsabilidade. ",
  },
  {
    id: "criativo", icone: Sparkles, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és CRIATIVO: ideias, legendas, stories, nomes e textos com humor moçambicano. Formato sempre " +
      "pronto a copiar. ",
  },
  {
    id: "tradutor", icone: Globe, thinkingPadrao: false,
    prompt:
      "És TRADUTOR profissional (PT ↔ EN ↔ ES ↔ FR, incl. changana quando possível). Traduz o que o " +
      "utilizador mandar mantendo o tom e o formato; se o pedido for ambíguo, entregas as duas versões. " +
      "Nunca acrescentas conteúdo que não estava no original. ",
  },
  {
    id: "programador", icone: Code2, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és PROGRAMADOR par: código completo e correto em blocos ``` com a linguagem declarada, " +
      "explicações mínimas, exemplos executáveis. ",
  },
  {
    id: "pensador", icone: BrainCircuit, thinkingPadrao: true,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és MODO PROFUNDO: pensas devagar (o reasoning aparece no painel de pensamento), estruturas " +
      "a resposta com prós, contras e trade-offs, e distingues FACTO de OPINIÃO. ",
  },
];

const personaPorId = (id: string) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];

// ── Endpoint (browser nunca conhece a chave NVIDIA) ──────────────────────

type ModoIa = "edge" | "proxy" | "directo";

function resolverEndpoint(): { url: string; modo: ModoIa; chaveDirecta?: string } {
  const explicito = import.meta.env.VITE_IA_ENDPOINT as string | undefined;
  if (explicito) return { url: explicito, modo: "proxy" };
  const chaveDirecta = import.meta.env.VITE_NVIDIA_API_KEY as string | undefined;
  if (import.meta.env.VITE_NEMOTRON_DIRECTO === "1" && chaveDirecta) {
    return { url: "https://integrate.api.nvidia.com/v1/chat/completions", modo: "directo", chaveDirecta };
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://ngxrdpplyghlugoowjqj.supabase.co";
  return { url: `${base}/functions/v1/nemotron-chat`, modo: "edge" };
}

// ── Persistência local (cap honesto) ─────────────────────────────────────

const CHAVE_STORAGE = "bateu.ia.v54";
const CONVERSAS_CAP = 20;

function carregarConversas(): ConversaIa[] {
  try {
    const cru = localStorage.getItem(CHAVE_STORAGE);
    if (!cru) return [];
    const lista = JSON.parse(cru);
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((c: any) => c && typeof c.id === "string" && Array.isArray(c.mensagens))
      .slice(0, CONVERSAS_CAP)
      .map((c: any) => ({
        id: String(c.id),
        titulo: typeof c.titulo === "string" ? c.titulo : "",
        criadaEm: Number(c.criadaEm) || Date.now(),
        actualizadaEm: Number(c.actualizadaEm) || Date.now(),
        personaId: typeof c.personaId === "string" ? c.personaId : "assistente",
        mensagens: c.mensagens.slice(0, LIMITES.MENSAGENS_CAP),
      }));
  } catch {
    return [];
  }
}

function guardarConversas(lista: ConversaIa[]) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista.slice(0, CONVERSAS_CAP)));
  } catch {}
}

// ── Página ───────────────────────────────────────────────────────────────

interface FluxoEmCurso {
  raciocinio: string;
  conteudo: string;
  inicio: number;
  parado: boolean;
}

const IaBateu = () => {
  const { t, lang } = useLanguage();
  const endpointInfo = useMemo(resolverEndpoint, []);

  const [conversas, setConversas] = useState<ConversaIa[]>(() => carregarConversas());
  const [ativaId, setAtivaId] = useState<string | null>(() => carregarConversas()[0]?.id ?? null);
  const [entrada, setEntrada] = useState("");
  const [aFluir, setAFluir] = useState(false);
  const [fluxo, setFluxo] = useState<FluxoEmCurso | null>(null);
  const [uso, setUso] = useState<UsoIa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState("assistente");
  const [pensamentoAberto, setPensamentoAberto] = useState(true);
  const [configAberta, setConfigAberta] = useState(false);
  const [parametros, setParametros] = useState<ParametrosIa>({
    modelo: MODELOS_CONHECIDOS[0].id as string,
    temperatura: 1,
    topP: 0.95,
    maxTokens: 2048,
    thinking: true,
  });

  const controladorRef = useRef<AbortController | null>(null);
  const fimMensagensRef = useRef<HTMLDivElement | null>(null);
  const caixaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => guardarConversas(conversas), [conversas]);
  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversas, fluxo?.conteudo, fluxo?.raciocinio]);

  const ativa = conversas.find((c) => c.id === ativaId) ?? null;

  const systemPrompt = useMemo(() => {
    const p = personaPorId(personaId);
    const lingua = lang === "pt" || lang === "pt-BR" ? "português" : "a língua da mensagem do utilizador";
    return p.prompt + ` Responde SEMPRE em ${lingua}.`;
  }, [personaId, lang]);

  // ── Enviar ─────────────────────────────────────────────────────────────

  const enviar = useCallback(async (textoDirecto?: string) => {
    const texto = (textoDirecto ?? entrada).trim();
    if (!texto || aFluir) return;
    setErro(null);
    setUso(null);
    setAFluir(true);

    const persona = personaPorId(personaId);
    const agora = Date.now();

    let conversa = ativa;
    if (!conversa) {
      conversa = novaConversa(personaId, agora);
      setConversas((lista) => [conversa!, ...lista].slice(0, CONVERSAS_CAP));
      setAtivaId(conversa.id);
    }
    const conversaId = conversa.id;

    const msgUtilizador: MsgIa = { role: "user", content: texto.slice(0, LIMITES.CONTEUDO_CARACTERES_CAP) };
    setConversas((lista) =>
      lista.map((c) =>
        c.id === conversaId
          ? { ...c, personaId, actualizadaEm: agora, mensagens: [...c.mensagens, msgUtilizador].slice(-LIMITES.MENSAGENS_CAP) }
          : c,
      ),
    );
    setEntrada("");

    // Histórico que vai ao modelo: system + últimas mensagens (caps do núcleo).
    const historico: MsgIa[] = [
      { role: "system", content: systemPrompt },
      ...conversa.mensagens.slice(-(LIMITES.MENSAGENS_CAP - 1)),
      msgUtilizador,
    ];

    setFluxo({ raciocinio: "", conteudo: "", inicio: Date.now(), parado: false });
    const controlador = new AbortController();
    controladorRef.current = controlador;

    const cliente = new ClienteNemotron({
      endpoint: endpointInfo.url,
      chave: endpointInfo.chaveDirecta,
      cabecalhos: endpointInfo.modo === "edge" ? await cabecalhosEdge() : undefined,
      tentativas: 2,
    });

    let conteudoFinal = "";
    let raciocinioFinal = "";
    let parado = false;

    try {
      const resultado = await cliente.conversarStream({
        mensagens: historico,
        parametros: { ...parametros, thinking: persona.thinkingPadrao ? parametros.thinking : parametros.thinking },
        sinal: controlador.signal,
        aoEvento: (e) => {
          if (e.tipo === "raciocinio") {
            raciocinioFinal += e.texto;
            setFluxo((f) => (f ? { ...f, raciocinio: raciocinioFinal } : f));
          } else if (e.tipo === "conteudo") {
            conteudoFinal += e.texto;
            setFluxo((f) => (f ? { ...f, conteudo: conteudoFinal } : f));
          } else if (e.tipo === "uso") {
            setUso(e.uso);
          } else if (e.tipo === "fim") {
            // nada — o fim é tratado abaixo
          }
        },
      });
      conteudoFinal = resultado.conteudo;
      raciocinioFinal = resultado.raciocinio;
      parado = resultado.parado;

      const notaParado = parado && conteudoFinal ? ` — ${t("ia.erro.parado")}` : "";
      const msgAssistente: MsgIa = {
        role: "assistant",
        content: conteudoFinal + notaParado,
        raciocinio: raciocinioFinal || undefined,
      };
      setConversas((lista) =>
        lista.map((c) =>
          c.id === conversaId
            ? { ...c, actualizadaEm: Date.now(), mensagens: [...c.mensagens, msgAssistente].slice(-LIMITES.MENSAGENS_CAP) }
            : c,
        ),
      );
      if (parado) toast.info(t("ia.erro.parado"));
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      if (err?.name === "AbortError") {
        parado = true;
        toast.info(t("ia.erro.parado"));
      } else if (err instanceof NemotronRateLimitError) {
        setErro(`${t("ia.erro.limite")} (${Math.ceil((err.esperarMs ?? 1000) / 1000)}s)`);
        toast.error(`${t("ia.erro.limite")} (${Math.ceil((err.esperarMs ?? 1000) / 1000)}s)`);
      } else {
        const detalhe = e?.estado ? ` · HTTP ${e.estado}` : "";
        const mensagem = `${t("ia.erro.ligacao")}${detalhe}`;
        setErro(mensagem + (e?.message && e.estado ? "" : ""));
        toast.error(mensagem);
        if (conteudoFinal || raciocinioFinal) {
          const msgParcial: MsgIa = {
            role: "assistant",
            content: conteudoFinal + (conteudoFinal ? "\n\n" : "") + `⚠️ ${mensagem}`,
            raciocinio: raciocinioFinal || undefined,
          };
          setConversas((lista) =>
            lista.map((c) =>
              c.id === conversaId
                ? { ...c, actualizadaEm: Date.now(), mensagens: [...c.mensagens, msgParcial].slice(-LIMITES.MENSAGENS_CAP) }
                : c,
            ),
          );
        }
      }
    } finally {
      controladorRef.current = null;
      setFluxo(null);
      setAFluir(false);
      caixaRef.current?.focus();
    }
  }, [entrada, aFluir, ativa, personaId, parametros, systemPrompt, endpointInfo, t]);

  const parar = useCallback(() => {
    controladorRef.current?.abort();
  }, []);

  // ── Conversas ──────────────────────────────────────────────────────────

  const novaConversaAgora = useCallback(() => {
    const c = novaConversa(personaId);
    setConversas((lista) => [c, ...lista].slice(0, CONVERSAS_CAP));
    setAtivaId(c.id);
    setErro(null);
    setUso(null);
    caixaRef.current?.focus();
  }, [personaId]);

  const apagarConversa = useCallback(
    (id: string) => {
      setConversas((lista) => {
        const nova = lista.filter((c) => c.id !== id);
        if (id === ativaId) setAtivaId(nova[0]?.id ?? null);
        return nova;
      });
    },
    [ativaId],
  );

  const exportarConversa = useCallback(() => {
    if (!ativa) return;
    const md = conversaParaMarkdown(ativa);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bateu-ia-${ativa.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("ia.exportar.feito"));
  }, [ativa, t]);

  const trocarPersona = useCallback(
    (id: string) => {
      setPersonaId(id);
      const p = personaPorId(id);
      setParametros((antigos) => ({ ...antigos, thinking: p.thinkingPadrao }));
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  const hostEndpoint = (() => {
    try { return new URL(endpointInfo.url).host; } catch { return endpointInfo.url; }
  })();

  return (
    <div data-testid="ia-pagina" className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{t("ia.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("ia.subtitle")}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Badge variant="outline" data-testid="ia-endpoint-chip" className="gap-1 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {t(`ia.config.endpoint.${endpointInfo.modo}`)} · {hostEndpoint}
            </Badge>
            {uso && (
              <Badge variant="secondary" data-testid="ia-stats" className="text-[10px]">
                {t("ia.stats.tokens")}: {uso.totalTokens ?? "—"} · {t("ia.stats.segundo")}: {uso.tokensPorSegundo ?? "—"} · {t("ia.stats.primeiro")}: {uso.msPrimeiroToken ?? "—"}ms
              </Badge>
            )}
            <Button variant="outline" size="sm" data-testid="ia-config-abrir" onClick={() => setConfigAberta((v) => !v)}>
              <Settings2 className="h-4 w-4 mr-1" /> {t("ia.config")}
            </Button>
          </div>
        </div>

        {erro && (
          <div data-testid="ia-erro" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between">
            <span>{erro}</span>
            <button onClick={() => setErro(null)} aria-label="fechar"><Eraser className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
          {/* ── Conversas ── */}
          <aside className="hidden lg:flex flex-col gap-2">
            <Button data-testid="ia-nova-conversa" onClick={novaConversaAgora} className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" /> {t("ia.nova.conversa")}
            </Button>
            <div className="text-xs font-medium text-muted-foreground px-1 pt-2">{t("ia.conversas")}</div>
            <ScrollArea className="h-[420px] rounded-lg border">
              <div className="p-2 flex flex-col gap-1">
                {!conversas.length && <p className="text-xs text-muted-foreground px-2 py-4">{t("ia.sem.conversas")}</p>}
                {conversas.map((c, i) => (
                  <div
                    key={c.id}
                    data-testid={`ia-conversa-${i}`}
                    className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${c.id === ativaId ? "bg-accent" : ""}`}
                    onClick={() => { setAtivaId(c.id); setPersonaId(c.personaId || "assistente"); }}
                  >
                    <span className="truncate flex-1">{tituloDe(c)}</span>
                    <button
                      data-testid={`ia-apagar-${i}`}
                      aria-label={t("ia.apagar")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); apagarConversa(c.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* ── Chat ── */}
          <section className="flex flex-col rounded-xl border bg-card/50 min-h-[560px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="ia-mensagens">
              {!ativa && !fluxo && (
                <div data-testid="ia-estado-vazio" className="pt-10 pb-6">
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-4">
                      <BrainCircuit className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold">{t("ia.vazio.titulo")}</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">{t("ia.vazio.desc")}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 max-w-3xl mx-auto">
                    {PERSONAS.map((p) => (
                      <button
                        key={p.id}
                        data-testid={`ia-persona-${p.id}`}
                        onClick={() => trocarPersona(p.id)}
                        className={`text-left rounded-xl border p-3 transition-all hover:border-primary/60 hover:bg-primary/5 ${personaId === p.id ? "border-primary/60 bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p.icone className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{t(`ia.persona.${p.id}.nome`)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t(`ia.persona.${p.id}.desc`)}</p>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 max-w-3xl mx-auto flex flex-wrap gap-2 justify-center">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        data-testid={`ia-sugestao-${n}`}
                        onClick={() => enviar(t(`ia.persona.${personaId}.s${n}`))}
                        className="text-xs rounded-full border px-3 py-1.5 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
                      >
                        {t(`ia.persona.${personaId}.s${n}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ativa?.mensagens.map((m, i) => (
                <MensagemBubble key={i} mensagem={m} indice={i} t={t} pensamentoAberto={pensamentoAberto} />
              ))}

              {fluxo && (
                <MensagemBubble
                  mensagem={{ role: "assistant", content: fluxo.conteudo, raciocinio: fluxo.raciocinio || undefined }}
                  indice={-1}
                  t={t}
                  pensamentoAberto={pensamentoAberto}
                  aFluir
                  msInicio={fluxo.inicio}
                />
              )}
              <div ref={fimMensagensRef} />
            </div>

            {/* Composer */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <Button variant="outline" size="icon" data-testid="ia-nova-conversa-mobile" className="lg:hidden shrink-0" onClick={novaConversaAgora} aria-label={t("ia.nova.conversa")}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Textarea
                  ref={caixaRef as any}
                  data-testid="ia-caixa"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  placeholder={t("ia.escrever")}
                  className="min-h-[52px] max-h-40 resize-none"
                  rows={2}
                  disabled={aFluir}
                />
                {aFluir ? (
                  <Button variant="destructive" size="icon" data-testid="ia-parar" onClick={parar} aria-label={t("ia.parar")} className="shrink-0 h-[52px] w-[52px]">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button data-testid="ia-enviar" onClick={() => enviar()} disabled={!entrada.trim()} className="shrink-0 h-[52px] w-[52px]" aria-label={t("ia.enviar")}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{t("ia.rodape.honesto")}</p>
            </div>
          </section>

          {/* ── Configurações ── */}
          <aside className={`space-y-4 ${configAberta ? "" : "hidden lg:block"}`}>
            <div className="rounded-xl border p-4 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{t("ia.config.modelo")}</label>
                <select
                  data-testid="ia-modelo"
                  value={parametros.modelo}
                  onChange={(e) => setParametros((p) => ({ ...p, modelo: e.target.value }))}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  {MODELOS_CONHECIDOS.map((m) => (
                    <option key={m.id} value={m.id}>{m.rotulo}</option>
                  ))}
                </select>
                <input
                  data-testid="ia-modelo-custom"
                  value={parametros.modelo}
                  onChange={(e) => setParametros((p) => ({ ...p, modelo: e.target.value }))}
                  className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs font-mono"
                  aria-label={t("ia.config.modelo.custom")}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">{t("ia.config.temperatura")}</span>
                  <span data-testid="ia-temperatura-valor">{parametros.temperatura}</span>
                </div>
                <Slider
                  data-testid="ia-temperatura"
                  value={[parametros.temperatura]}
                  min={0} max={LIMITES.TEMPERATURA_MAX} step={0.05}
                  onValueChange={([v]) => setParametros((p) => ({ ...p, temperatura: v }))}
                  className="mt-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">{t("ia.config.topp")}</span>
                  <span data-testid="ia-topp-valor">{parametros.topP}</span>
                </div>
                <Slider
                  data-testid="ia-topp"
                  value={[parametros.topP]}
                  min={0} max={LIMITES.TOP_P_MAX} step={0.05}
                  onValueChange={([v]) => setParametros((p) => ({ ...p, topP: v }))}
                  className="mt-2"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">{t("ia.config.maxtokens")}</span>
                  <span data-testid="ia-maxtokens-valor">{parametros.maxTokens}</span>
                </div>
                <Slider
                  data-testid="ia-maxtokens"
                  value={[parametros.maxTokens]}
                  min={256} max={LIMITES.MAX_TOKENS_CAP} step={256}
                  onValueChange={([v]) => setParametros((p) => ({ ...p, maxTokens: v }))}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="text-xs font-semibold">{t("ia.config.thinking")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("ia.config.thinking.desc")}</div>
                </div>
                <Switch data-testid="ia-thinking" checked={parametros.thinking} onCheckedChange={(v) => setParametros((p) => ({ ...p, thinking: v }))} />
              </div>

              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="text-xs font-semibold">{t("ia.raciocinio")}</div>
                  <div className="text-[10px] text-muted-foreground">{t("ia.raciocinio.desc")}</div>
                </div>
                <Switch data-testid="ia-pensamento-visivel" checked={pensamentoAberto} onCheckedChange={setPensamentoAberto} />
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2">{t("ia.conversas")}</div>
              <Button variant="outline" size="sm" data-testid="ia-exportar" onClick={exportarConversa} disabled={!ativa} className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" /> {t("ia.exportar")}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ── Bolha de mensagem (com painel de pensamento) ────────────────────────

function MensagemBubble({
  mensagem, indice, t, pensamentoAberto, aFluir, msInicio,
}: {
  mensagem: MsgIa;
  indice: number;
  t: (k: string) => string;
  pensamentoAberto: boolean;
  aFluir?: boolean;
  msInicio?: number;
}) {
  const [aberto, setAberto] = useState(pensamentoAberto);
  useEffect(() => setAberto(pensamentoAberto), [pensamentoAberto]);
  const meu = mensagem.role === "user";

  const decorrido = aFluir && msInicio ? Math.round((Date.now() - msInicio) / 100) / 10 : null;
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    if (!aFluir) return;
    const id = setInterval(() => setAgora((v) => v + 1), 100);
    return () => clearInterval(id);
  }, [aFluir]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-2 ${meu ? "justify-end" : "justify-start"}`}
      data-testid={`ia-msg-${meu ? "utilizador" : "assistente"}${indice >= 0 ? `-${indice}` : ""}`}
    >
      {!meu && (
        <div className="shrink-0 mt-1 p-1.5 rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-2 ${meu ? "items-end" : ""}`}>
        {!!mensagem.raciocinio && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5">
            <button
              data-testid={`ia-raciocinio-toggle${indice >= 0 ? `-${indice}` : ""}`}
              onClick={() => setAberto((v) => !v)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary/90"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              {t("ia.raciocinio")}
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${aberto ? "rotate-180" : ""}`} />
            </button>
            {aberto && (
              <div
                data-testid={`ia-raciocinio${indice >= 0 ? `-${indice}` : ""}`}
                className="px-3 pb-2 text-xs text-muted-foreground whitespace-pre-wrap border-t border-primary/20 pt-2 max-h-56 overflow-y-auto"
              >
                {mensagem.raciocinio}
              </div>
            )}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${meu ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}
          data-testid={meu ? undefined : `ia-conteudo${indice >= 0 ? `-${indice}` : ""}`}
        >
          {meu ? (
            <span className="whitespace-pre-wrap break-words">{mensagem.content}</span>
          ) : mensagem.content ? (
            <span className="ia-markdown" dangerouslySetInnerHTML={{ __html: htmlDeMarkdown(mensagem.content) }} />
          ) : (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("ia.a.pensar")}
              {decorrido !== null && <span className="text-[10px]">{decorrido.toFixed(1)}s</span>}
            </span>
          )}
          {aFluir && mensagem.content && <span className="ml-0.5 inline-block h-3.5 w-2 bg-primary/70 animate-pulse align-text-bottom" />}
        </div>
      </div>
      {meu && (
        <div className="shrink-0 mt-1 p-1.5 rounded-lg bg-secondary">
          <User className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}

// ── Cabeçalhos da edge function (JWT do utilizador — a chave NVIDIA fica no Deno) ──

async function cabecalhosEdge(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}`, apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" };
  } catch {}
  return { apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" };
}

export default IaBateu;
