// ═══════════════════════════════════════════════════════════════════════
// v54 — BATEU IA (/ia) — o assistente Nemotron da plataforma
// v55 — TRÊS MODOS em abas: CONVERSAR (chat v54 intacto) · VER (visão
//       omni — o snippet do OLHO: content parts + reasoning_budget) ·
//       BUSCAR (embeddings multimodais — o snippet da MEMÓRIA: vetores
//       text_image + cosseno + LojaVetores no browser).
// v56 — IA LÊ A PLATAFORMA (RAG real): a MEMÓRIA enche-se com os dados
//       REAIS da plataforma (sorteios/concursos/blog) e o CHAT lê esse
//       índice — pergunta → vetor query → busca cosseno → contexto com
//       fontes citadas no system. Honestidade: sem fontes acima do
//       limiar, o chat segue SEM contexto (nunca finge que leu); se os
//       embeddings falham, o envio É BLOQUEADO com o erro real.
//
// Chat REAL com a NVIDIA (nvidia/nemotron-3-ultra-550b-a55b): streaming
// token a token, THINKING separado (reasoning_content num painel próprio),
// 6 personas, multi-conversa persistente (localStorage, cap honesto de 20),
// parâmetros completos (modelo/temperatura/top_p/max_tokens), STOP que
// aborta a geração a meio (propagado ao upstream), estatísticas REAIS
// (usage do servidor — nunca inventado), exportação .md.
//
// Onde corre: o browser NUNCA fala com a NVIDIA nem conhece a chave —
//   · modo "edge"  (produção): supabase/functions/nemotron-chat (e as novas
//     nemotron-visao / nemotron-embed) com JWT;
//   · modo "proxy" (dev/testes): server/ia-proxy.mjs via VITE_IA_ENDPOINT
//     (+ VITE_IA_ENDPOINT_VISAO / VITE_IA_ENDPOINT_VETORES);
//   · modo "directo" (SÓ dev, declarado no UI): VITE_NEMOTRON_DIRECTO=1
//     + VITE_NVIDIA_API_KEY — a chave fica no bundle (risco declarado).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Bot, BrainCircuit, ChevronDown, Database, Download, Eraser, Eye, Gavel, LifeBuoy,
  Loader2, Plus, ScanSearch, Send, Settings2, Square, Ticket, Trash2, Trophy, User,
  Upload, X, Gamepad2, HeartHandshake,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClienteNemotron, LIMITES, MODELOS_CONHECIDOS, NemotronError, NemotronRateLimitError,
  conversaParaMarkdown, htmlDeMarkdown, novaConversa, tituloDe,
  type ConversaIa, type MsgIa, type ParametrosIa, type UsoIa,
} from "@/lib/nemotron";
import {
  ClienteNemotronVisao, LIMITES_VISAO, MODELO_VISAO_PADRAO, PARAMETROS_VISAO_PADRAO,
  validarImagemFonte,
  type ParametrosVisao,
} from "@/lib/nemotron-visao";
import {
  ClienteNemotronVetores, LIMITES_VETORES, LojaVetores, MODELO_EMBED_PADRAO,
  arredondarVetor, cosseno, imagemParaDataUrl,
  type ItemVetor, type ResultadoBusca, type TipoEntradaVetor,
} from "@/lib/nemotron-vetores";
import {
  LIMITES_RAG, LojaRag, docParaPassagens, itemVetorParaDoc, montarContextoRag,
  type PassagemRag,
} from "@/lib/nemotron-rag";
import { carregarDocsPlataforma } from "@/lib/ia-plataforma";
// v57 — a resolução do endpoint do CHAT e os cabeçalhos da edge são FONTE
// ÚNICA em src/lib/iaEndpoint.ts (o NPC IA da Cidade partilha A MESMA regra;
// visão/vetores continuam aqui porque só a página /ia os usa).
import { cabecalhosEdge, resolverEndpointChat, type EndpointIa, type ModoIa } from "@/lib/iaEndpoint";
// v82 — CONTEXTO: a IA sabe ONDE o utilizador está (briefing passo 11).
// As páginas publicam factos REAIS; a /ia chega com o contexto preparado:
// chip no composer, perguntas sugeridas da entidade e factos no system.
import {
  contextoParaPrompt, contextoValido, lerContextoIa, limparContextoIaTotal,
  questoesDeContexto, subscreverContextoIa,
  type ContextoIa, type TipoContextoIa,
} from "@/lib/iaContexto";
// v58 — histórico da IA NO SERVIDOR (o passo anotado desde a v54): o chat
// segue o utilizador ENTRE DISPOSITIVOS via ia_historico (RLS, JWT).
import {
  LIMITES_HISTORICO, capSessoes, carimbarMensagens, chaveDe, mesclarMensagens,
  criarGestorHistoricoIa, type EstadoSincUI, type GestorHistoricoIa,
  type MsgHistoricoIa,
} from "@/lib/iaHistorico";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  "desporto real, Mercado Bateu (sorteios, concursos, leilões e bens) e jogos (BATEU KART e mais). " +
  "Conhecimentos da plataforma: bilhetes, carteira, cupões, referências e amigos, Torneios/Arena, " +
  "comunidade e stories. Regras: nunca inventas resultados de sorteios, vencedores, probabilidades " +
  "ou dados legais/licenças — se não souberes, dizês honestamente e apontas a secção certa " +
  "(Transparência, Como Funciona, Suporte). Jogo responsável sempre: a diversão vem primeiro, " +
  "nunca aconselhas gastar mais do que a pessoa pode.";

/* v79 — QUATRO modos e NÃO um chatbot universal (visão do produto):
   Ajuda Bateu (principal) · Desporto · Jogos · Suporte.
   As personas de desenvolvimento (Programador, Tradutor, Criativo,
   Modo Profundo) saem da interface pública — o motor continua lá,
   mas o utilizador que quer saber como participar num sorteio recebe
   respostas directas, não um laboratório de IA. */
const PERSONAS: PersonaIa[] = [
  {
    id: "assistente", icone: LifeBuoy, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és o AJUDA BATEU — o modo principal: respostas curtas, passo a passo, com os caminhos certos no site " +
      "(como participar num sorteio, onde ver vencedores, como funciona a carteira, como levantar um prémio). ",
  },
  {
    id: "desporto", icone: Trophy, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és COMENTADOR DESPORTIVO: análises com energia de narrador, estatísticas quando as souberes " +
      "de verdade (nunca inventadas), e ligas cada análise aos jogos de palpite da Bateu com responsabilidade. ",
  },
  {
    id: "jogos", icone: Gamepad2, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és o GUIA DE JOGOS: explicas como cada jogo funciona (BATEU KART, Tetris, Damas, Xadrez e mais), " +
      "como ganhar PONTOS, como funcionam missões diárias, níveis e prémios — com honestidade: jogar é grátis, " +
      "pontos nunca valem dinheiro e nenhum desbloqueio dá vantagem competitiva. ",
  },
  {
    id: "suporte", icone: HeartHandshake, thinkingPadrao: false,
    prompt: CONTEXTO_PLATAFORMA +
      " Hoje és SUPORTE: resolves problemas práticos — carteira e levantamentos (M-Pesa/Emola), bilhetes que " +
      "não aparecem, pausa e auto-exclusão, limites de jogo — sempre com passos claros e sem prometer prazos " +
      "que não conheces. ",
  },
];

const personaPorId = (id: string) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];

// v82 — ícone do chip de contexto por tipo de página
const ICONE_POR_TIPO: Record<TipoContextoIa, typeof Ticket> = {
  sorteio: Ticket,
  leilao: Gavel,
  concurso: Trophy,
  jogo: Gamepad2,
  desporto: Trophy,
};

// ── Endpoints (browser nunca conhece a chave NVIDIA) ─────────────────────
// v57: resolverEndpointChat + cabecalhosEdge vivem em src/lib/iaEndpoint.ts
// (fonte única partilhada com o NPC IA da Cidade Bateu).

/** v55 — o OLHO: mesma estratégia, função nova. */
function resolverEndpointVisao(): EndpointIa {
  const explicito = import.meta.env.VITE_IA_ENDPOINT_VISAO as string | undefined;
  if (explicito) return { url: explicito, modo: "proxy" };
  const chaveDirecta = import.meta.env.VITE_NVIDIA_API_KEY as string | undefined;
  if (import.meta.env.VITE_NEMOTRON_DIRECTO === "1" && chaveDirecta) {
    return { url: "https://integrate.api.nvidia.com/v1/chat/completions", modo: "directo", chaveDirecta };
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://ngxrdpplyghlugoowjqj.supabase.co";
  return { url: `${base}/functions/v1/nemotron-visao`, modo: "edge" };
}

/** v55 — a MEMÓRIA: embeddings pelo edge `nemotron-embed`. */
function resolverEndpointVetores(): EndpointIa {
  const explicito = import.meta.env.VITE_IA_ENDPOINT_VETORES as string | undefined;
  if (explicito) return { url: explicito, modo: "proxy" };
  const chaveDirecta = import.meta.env.VITE_NVIDIA_API_KEY as string | undefined;
  if (import.meta.env.VITE_NEMOTRON_DIRECTO === "1" && chaveDirecta) {
    return { url: "https://integrate.api.nvidia.com/v1/embeddings", modo: "directo", chaveDirecta };
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://ngxrdpplyghlugoowjqj.supabase.co";
  return { url: `${base}/functions/v1/nemotron-embed`, modo: "edge" };
}

// ── Persistência local do chat (cap honesto) ─────────────────────────────

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

type AbaIa = "conversar" | "ver" | "buscar";

const IaBateu = () => {
  const { t, lang } = useLanguage();
  const endpointInfo = useMemo(resolverEndpointChat, []);
  const endpointVetoresInfo = useMemo(resolverEndpointVetores, []);

  const [aba, setAba] = useState<AbaIa>("conversar");
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
  // v79 — ferramentas TÉCNICAS fora da interface pública (Ver/Buscar):
  // só regressam com o sinal de desenvolvimento localStorage «bateu_ia_dev=1».
  const [modoDev] = useState(() => {
    try { return localStorage.getItem("bateu_ia_dev") === "1"; } catch { return false; }
  });
  const [parametros, setParametros] = useState<ParametrosIa>({
    modelo: MODELOS_CONHECIDOS[0].id as string,
    temperatura: 1,
    topP: 0.95,
    maxTokens: 2048,
    thinking: true,
  });

  // ── v56 — RAG: o índice da plataforma vive no PAI (partilhado pelas abas)
  const lojaRagRef = useRef<LojaRag>(new LojaRag());
  const [ragStats, setRagStats] = useState<{ passagens: number; documentos: number; porTipo: Record<string, number> }>(() => ({ passagens: 0, documentos: 0, porTipo: {} }));
  const [ragAtivo, setRagAtivo] = useState(false);
  const [ragFontes, setRagFontes] = useState<number | null>(null);
  const [aIndexarPlataforma, setAIndexarPlataforma] = useState(false);
  const [ragErro, setRagErro] = useState<string | null>(null);

  const controladorRef = useRef<AbortController | null>(null);
  const fimMensagensRef = useRef<HTMLDivElement | null>(null);
  const caixaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── v58 — histórico da IA NO SERVIDOR (sincronização entre dispositivos) ─
  // pull no montar (importa conversas de outros dispositivos, mergia por
  // CHAVE determinística) + push depois de cada troca. CONVIDADO nunca
  // toca na rede; migração pendente e erro são estados HONESTOS distintos.
  const gestorRef = useRef<GestorHistoricoIa | null>(null);
  const [sincEstado, setSincEstado] = useState<EstadoSincUI>("aSincronizar");
  const [sincMotivo, setSincMotivo] = useState<string | null>(null);

  const paraMsgIa = (m: MsgHistoricoIa): MsgIa => ({
    role: m.papel === "utilizador" ? "user" : "assistant",
    content: m.conteudo,
    raciocinio: m.raciocinio,
    chave: m.chave,
    criadoEm: m.criadoEm,
    tokens: m.tokens ?? undefined,
  });

  useEffect(() => {
    let vivo = true;
    (async () => {
      gestorRef.current = criarGestorHistoricoIa();
      const r = await gestorRef.current.carregar("ia");
      if (!vivo) return;
      if (r.modo === "convidado") { setSincEstado("convidado"); return; }
      if (r.modo === "migracao") { setSincEstado("migracao"); return; }
      if (r.modo === "erro") { setSincEstado("erro"); setSincMotivo(r.motivo ?? null); return; }
      // importar/mergear as sessões do servidor (cap honesto de sessões)
      setConversas((lista) => {
        const porId = new Map(lista.map((c) => [c.id, { ...c }]));
        for (const s of capSessoes(r.sessoes, LIMITES_HISTORICO.SESSOES_CAP)) {
          const existente = porId.get(s.sessao);
          if (existente) {
            const local = carimbarMensagens(existente.mensagens, s.sessao, existente.criadaEm);
            const merge = mesclarMensagens(local.mensagens, s.mensagens, LIMITES.MENSAGENS_CAP);
            porId.set(s.sessao, {
              ...existente,
              mensagens: merge.mensagens.map(paraMsgIa),
              actualizadaEm: Math.max(existente.actualizadaEm, s.mensagens.length ? s.mensagens[s.mensagens.length - 1].criadoEm : 0),
            });
          } else {
            // conversa que só existia noutro dispositivo — importada
            porId.set(s.sessao, {
              id: s.sessao,
              titulo: "",
              criadaEm: s.mensagens[0]?.criadoEm ?? Date.now(),
              actualizadaEm: s.mensagens.length ? s.mensagens[s.mensagens.length - 1].criadoEm : Date.now(),
              personaId: s.persona ?? "assistente",
              mensagens: s.mensagens.map(paraMsgIa),
            });
          }
        }
        return Array.from(porId.values())
          .sort((a, b) => b.actualizadaEm - a.actualizadaEm)
          .slice(0, LIMITES_HISTORICO.SESSOES_CAP);
      });
      setSincEstado("sincronizado");
    })().catch((e) => {
      if (!vivo) return;
      setSincEstado("erro");
      setSincMotivo(String(e?.message ?? e).slice(0, 160));
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => guardarConversas(conversas), [conversas]);
  useEffect(() => {
    if (aba !== "conversar") return;
    fimMensagensRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [aba, conversas, fluxo?.conteudo, fluxo?.raciocinio]);

  const ativa = conversas.find((c) => c.id === ativaId) ?? null;

  // v82 — contexto da página de origem (referência estável do store)
  const contexto: ContextoIa | null = useSyncExternalStore(subscreverContextoIa, lerContextoIa);
  const contextoOk = contextoValido(contexto);
  const questoesCtx = useMemo(() => questoesDeContexto(contexto), [contexto]);

  const systemPrompt = useMemo(() => {
    const p = personaPorId(personaId);
    const lingua = lang === "pt" || lang === "pt-BR" ? "português" : "a língua da mensagem do utilizador";
    // v82 — os factos REAIS da página de origem entram no system (se existirem)
    return p.prompt + contextoParaPrompt(contexto) + ` Responde SEMPRE em ${lingua}.`;
  }, [personaId, lang, contexto]);

  // ── v56 — RAG: sincronizar estatísticas + indexar a plataforma ─────────

  const sincronizarRag = useCallback(() => {
    setRagStats(lojaRagRef.current.estatisticas());
  }, []);

  /** Espera honesta quando o portão de rate (20/min) fecha a meio de um
   *  lote — a indexação é longa e legítima; aguarda o tempo real declarado
   *  e tenta de novo UMA vez (padrão dos núcleos: nunca dispara mais). */
  const vetorizarComEspera = useCallback(
    async (cliente: ClienteNemotronVetores, entradas: { texto: string }[], tentou = false) => {
      try {
        return await cliente.vetorizar(entradas, { inputType: "passage" });
      } catch (err: any) {
        if (err instanceof NemotronRateLimitError && !tentou) {
          await new Promise((r) => setTimeout(r, Math.max(250, err.esperarMs || 1000)));
          return vetorizarComEspera(cliente, entradas, true);
        }
        throw err;
      }
    },
    [],
  );

  const indexarPlataforma = useCallback(async () => {
    if (aIndexarPlataforma) return;
    setAIndexarPlataforma(true);
    setRagErro(null);
    try {
      const resultado = await carregarDocsPlataforma();
      if (!resultado.docs.length) {
        setRagErro(
          resultado.erros.length
            ? `${t("ia.rag.erro")} — ${resultado.erros.slice(0, 3).join(" · ")}`
            : t("ia.rag.vazio"),
        );
        return;
      }
      const cliente = new ClienteNemotronVetores({
        endpoint: endpointVetoresInfo.url,
        chave: endpointVetoresInfo.chaveDirecta,
        cabecalhos: endpointVetoresInfo.modo === "edge" ? await cabecalhosEdge() : undefined,
        tentativas: 2,
      });
      const errosEmb: string[] = [];
      let docsIndexados = 0;
      for (const doc of resultado.docs) {
        let passagens: PassagemRag[];
        try {
          passagens = docParaPassagens(doc);
        } catch {
          continue; // doc sem texto — já contado nos erros da fonte
        }
        const vetores: number[][] = [];
        for (let i = 0; i < passagens.length; i += LIMITES_VETORES.ENTRADAS_CAP) {
          const lote = passagens.slice(i, i + LIMITES_VETORES.ENTRADAS_CAP);
          try {
            const r = await vetorizarComEspera(cliente, lote.map((p) => ({ texto: p.texto })));
            vetores.push(...r.vetores);
          } catch (e: any) {
            errosEmb.push(`${doc.rotulo.slice(0, 60)}: ${String(e?.message ?? e).slice(0, 120)}`);
            break; // doc sem vetores não entra meio-indexado
          }
        }
        if (vetores.length === passagens.length) {
          try {
            lojaRagRef.current.substituirDoc(passagens, vetores);
            docsIndexados++;
          } catch (e: any) {
            errosEmb.push(String(e?.message ?? e).slice(0, 140));
          }
        }
      }
      sincronizarRag();
      const avisos = [...resultado.erros, ...errosEmb];
      if (avisos.length) {
        setRagErro(`${t("ia.rag.parcial")} — ${avisos.slice(0, 3).join(" · ")}`);
      } else {
        setRagErro(null);
      }
      if (docsIndexados > 0) toast.success(`${t("ia.rag.ok")} (${docsIndexados})`);
    } catch (err: any) {
      setRagErro(`${t("ia.rag.erro")} — ${String(err?.message ?? err).slice(0, 160)}`);
    } finally {
      setAIndexarPlataforma(false);
    }
  }, [aIndexarPlataforma, endpointVetoresInfo, vetorizarComEspera, sincronizarRag, t]);

  const limparRag = useCallback(() => {
    lojaRagRef.current.limpar();
    sincronizarRag();
    setRagErro(null);
  }, [sincronizarRag]);

  /** Itens manuais da aba Buscar entram no índice do chat (uma passagem,
   *  o vetor REAL do texto completo — sem chunking inventado). */
  const registrarManualRag = useCallback(
    (item: ItemVetor) => {
      const doc = itemVetorParaDoc(item);
      const passagem: PassagemRag = {
        id: `${doc.id}#p0`,
        docId: doc.id,
        tipo: "manual",
        rotulo: doc.rotulo,
        texto: doc.texto,
      };
      try {
        lojaRagRef.current.substituirDoc([passagem], [item.vetor]);
        sincronizarRag();
      } catch {}
    },
    [sincronizarRag],
  );

  // ── Enviar (chat v54 — intacto) ────────────────────────────────────────

  /** v58 — push de uma troca (pergunta + resposta/parcial) para o histórico
   *  do servidor; as mensagens já nascem carimbadas (chave/criadoEm), o
   *  carimbo só valida e mantém. CONVIDADO/migração = sem pedido nenhum. */
  const empurrarTroca = useCallback(
    (conversaId: string, persona: string, msgs: MsgIa[]) => {
      const troca = carimbarMensagens(msgs, conversaId, 0).mensagens;
      void gestorRef.current?.empurrar("ia", conversaId, troca, persona).then((r) => {
        if (r.modo === "erro") { setSincEstado("erro"); setSincMotivo(r.motivo ?? null); }
        else if (r.modo === "migracao") setSincEstado("migracao");
      }).catch(() => {});
    },
    [],
  );

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

    // v58 — mensagem carimbada NASCE com a meta do histórico sincronizado
    // (chave determinística + criadoEm real; a meta NUNCA vai ao modelo —
    // validarMensagens corta o fio para {role, content})
    const conteudoUtilizador = texto.slice(0, LIMITES.CONTEUDO_CARACTERES_CAP);
    const msgUtilizador: MsgIa = {
      role: "user",
      content: conteudoUtilizador,
      chave: chaveDe(conversaId, agora, "utilizador", conteudoUtilizador),
      criadoEm: agora,
    };
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

    // ── v56 — RAG: pergunta → vetor query → fontes → contexto no system ──
    // Honestidade declarada: com o RAG ativo, se os embeddings falham o
    // envio É BLOQUEADO com o erro real (nunca responde "como se" tivesse
    // lido a plataforma). Sem fontes acima do limiar, segue SEM contexto.
    let fontesUsadas: number | null = null;
    if (ragAtivo && lojaRagRef.current.tamanho > 0) {
      try {
        const clienteVet = new ClienteNemotronVetores({
          endpoint: endpointVetoresInfo.url,
          chave: endpointVetoresInfo.chaveDirecta,
          cabecalhos: endpointVetoresInfo.modo === "edge" ? await cabecalhosEdge() : undefined,
          tentativas: 2,
        });
        const rQuery = await clienteVet.vetorizar([{ texto: texto }], { inputType: "query" });
        const achados = lojaRagRef.current.buscar(rQuery.vetores[0], { k: LIMITES_RAG.TOP_K });
        const contexto = montarContextoRag(achados);
        if (contexto) {
          historico.splice(1, 0, { role: "system", content: contexto });
          fontesUsadas = Math.min(LIMITES_RAG.TOP_K, achados.length);
        } else {
          fontesUsadas = 0;
        }
      } catch (err: any) {
        const e = err instanceof NemotronError ? err : null;
        const detalhe = e?.estado ? ` · HTTP ${e.estado}` : "";
        const mensagem = `${t("ia.rag.erro")}${detalhe} — ${String(err?.message ?? err).slice(0, 140)}`;
        setErro(mensagem);
        toast.error(mensagem);
        setAFluir(false);
        caixaRef.current?.focus();
        return;
      }
    }
    setRagFontes(fontesUsadas);

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
      const conteudoAssistente = conteudoFinal + notaParado;
      const agoraResp = Date.now();
      const msgAssistente: MsgIa = {
        role: "assistant",
        content: conteudoAssistente,
        raciocinio: raciocinioFinal || undefined,
        chave: chaveDe(conversaId, agoraResp, "assistente", conteudoAssistente),
        criadoEm: agoraResp,
        tokens: resultado.uso?.totalTokens ?? undefined,
      };
      setConversas((lista) =>
        lista.map((c) =>
          c.id === conversaId
            ? { ...c, actualizadaEm: Date.now(), mensagens: [...c.mensagens, msgAssistente].slice(-LIMITES.MENSAGENS_CAP) }
            : c,
        ),
      );
      // v58 — push da troca completa (pergunta+resposta) para o servidor
      // (fogo e esquecer — o erro é HONESTO no badge, nunca bloqueia o chat)
      empurrarTroca(conversaId, personaId, [msgUtilizador, msgAssistente]);
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
          const conteudoParcial = conteudoFinal + (conteudoFinal ? "\n\n" : "") + `⚠️ ${mensagem}`;
          const agoraParcial = Date.now();
          const msgParcial: MsgIa = {
            role: "assistant",
            content: conteudoParcial,
            raciocinio: raciocinioFinal || undefined,
            chave: chaveDe(conversaId, agoraParcial, "assistente", conteudoParcial),
            criadoEm: agoraParcial,
          };
          setConversas((lista) =>
            lista.map((c) =>
              c.id === conversaId
                ? { ...c, actualizadaEm: Date.now(), mensagens: [...c.mensagens, msgParcial].slice(-LIMITES.MENSAGENS_CAP) }
                : c,
            ),
          );
          // v58 — a parcial também fica no histórico sincronizado
          empurrarTroca(conversaId, personaId, [msgUtilizador, msgParcial]);
        }
      }
    } finally {
      controladorRef.current = null;
      setFluxo(null);
      setAFluir(false);
      caixaRef.current?.focus();
    }
  }, [entrada, aFluir, ativa, personaId, parametros, systemPrompt, endpointInfo, endpointVetoresInfo, ragAtivo, t]);

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
      // v58 — honesto: apagar é apagar NO SERVIDOR também (quando há sessão;
      // convidado/migração = o gestor declara e nada sai daqui)
      void gestorRef.current?.apagarSessao("ia", id).then((r) => {
        if (r.modo === "erro") { setSincEstado("erro"); setSincMotivo(r.motivo ?? null); }
        else if (r.modo === "migracao") setSincEstado("migracao");
      }).catch(() => {});
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
            {/* v58 — estado HONESTO do histórico no servidor (sincronização
                entre dispositivos — o passo anotado desde a v54) */}
            <Badge
              variant="outline"
              data-testid="ia-sinc-estado"
              title={sincMotivo || undefined}
              className={`gap-1 text-[10px] ${
                sincEstado === "sincronizado" ? "text-violet-500 border-violet-400/40"
                  : sincEstado === "migracao" ? "text-amber-500 border-amber-400/40"
                  : sincEstado === "erro" ? "text-destructive border-destructive/40"
                  : "text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  sincEstado === "sincronizado" ? "bg-violet-500"
                    : sincEstado === "migracao" ? "bg-amber-500"
                    : sincEstado === "erro" ? "bg-destructive"
                    : "bg-muted-foreground/50"
                }`}
              />
              {sincEstado === "sincronizado" ? t("ia.sinc.on")
                : sincEstado === "migracao" ? t("ia.sinc.migracao")
                : sincEstado === "erro" ? t("ia.sinc.erro")
                : sincEstado === "aSincronizar" ? t("ia.sinc.aSincronizar")
                : t("ia.sinc.convidado")}
            </Badge>
            {/* v79: endpoint/supabase host são detalhes de infra — só com modo dev */}
            {modoDev && (
              <Badge variant="outline" data-testid="ia-endpoint-chip" className="gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {t(`ia.config.endpoint.${endpointInfo.modo}`)} · {hostEndpoint}
              </Badge>
            )}
            {uso && aba === "conversar" && (
              <Badge variant="secondary" data-testid="ia-stats" className="text-[10px]">
                {t("ia.stats.tokens")}: {uso.totalTokens ?? "—"} · {t("ia.stats.segundo")}: {uso.tokensPorSegundo ?? "—"} · {t("ia.stats.primeiro")}: {uso.msPrimeiroToken ?? "—"}ms
              </Badge>
            )}
            {aba === "conversar" && ragFontes !== null && (
              <Badge variant="outline" data-testid="ia-rag-fontes" className="text-[10px]">
                <Database className="h-3 w-3 mr-1" /> {t("ia.rag.fontes")}: {ragFontes}
              </Badge>
            )}
            <Button variant="outline" size="sm" data-testid="ia-config-abrir" onClick={() => setConfigAberta((v) => !v)}>
              <Settings2 className="h-4 w-4 mr-1" /> {t("ia.config")}
            </Button>
          </div>
        </div>

        {/* Abas: v79 — o público vê SÓ o chat (Ajuda Bateu). As ferramentas
            de desenvolvimento (Ver/Buscar) voltam com bateu_ia_dev=1. */}
        <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
          {(["conversar", modoDev ? "ver" : null, modoDev ? "buscar" : null]
            .filter(Boolean) as AbaIa[]).map((id) => {
              const Icone = id === "conversar" ? Bot : id === "ver" ? Eye : ScanSearch;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={aba === id}
                  data-testid={`ia-aba-${id}`}
                  onClick={() => setAba(id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                    aba === id ? "bg-primary text-primary-foreground border-primary" : "bg-card/50 hover:bg-accent"
                  }`}
                >
                  <Icone className="h-4 w-4" /> {t(`ia.tab.${id}`)}
                </button>
              );
            })}
        </div>

        {erro && aba === "conversar" && (
          <div data-testid="ia-erro" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between">
            <span>{erro}</span>
            <button onClick={() => setErro(null)} aria-label="fechar"><Eraser className="h-4 w-4" /></button>
          </div>
        )}

        {aba === "conversar" && (
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
                    {contextoOk && contexto && (
                      <div className="sm:col-span-2 md:col-span-3 rounded-xl border bg-secondary/40 px-3 py-2 text-xs flex items-center gap-2" data-testid="ia-contexto-banner">
                        <span className="font-semibold shrink-0">{t("ia.ctx.banner")}</span>
                        <span className="text-muted-foreground truncate">{contexto.titulo}</span>
                      </div>
                    )}
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
                    {(questoesCtx.length
                      ? questoesCtx
                      : [1, 2, 3].map((n) => `ia.persona.${personaId}.s${n}`)
                    ).map((chave, i) => (
                      <button
                        key={chave}
                        data-testid={questoesCtx.length ? `ia-sugestao-ctx-${i + 1}` : `ia-sugestao-${i + 1}`}
                        onClick={() => enviar(t(chave))}
                        className="text-xs rounded-full border px-3 py-1.5 text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
                      >
                        {t(chave)}
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
              {contextoOk && contexto && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-1.5 text-xs" data-testid="ia-contexto-chip">
                  {(() => { const I = ICONE_POR_TIPO[contexto.tipo]; return <I className="h-3.5 w-3.5 text-primary shrink-0" />; })()}
                  <span className="truncate">
                    <span className="font-semibold">{t("ia.ctx.chip")}</span> {contexto.titulo}
                  </span>
                  <a href={contexto.rota} className="underline text-muted-foreground shrink-0 ml-auto" data-testid="ia-contexto-abrir">
                    {t("ia.ctx.abrir")}
                  </a>
                  <button
                    onClick={limparContextoIaTotal}
                    aria-label={t("ia.ctx.limpar")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    data-testid="ia-contexto-limpar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
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

          {/* ── Configurações (v79: técnica — só com bateu_ia_dev=1; o público
              vê apenas a explicação do modo actual) ── */}
          <aside className={`space-y-4 ${configAberta ? "" : "hidden lg:block"}`}>
            <div className="rounded-xl border p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">{t("ia.v79.modo")}</div>
              <div className="flex items-center gap-2">
                {(() => { const P = personaPorId(personaId); return <P.icone className="h-4 w-4 text-primary" />; })()}
                <span className="text-sm font-bold">{t(`ia.persona.${personaId}.nome`)}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{t("ia.v79.modo.desc")}</p>
              <div className="rounded-lg border px-3 py-2 text-[10px] text-muted-foreground">
                {t("ia.v79.rodape")}
              </div>
            </div>

            {modoDev && (
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

              {/* v56 — RAG: o chat lê o índice da plataforma */}
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <div className="text-xs font-semibold">{t("ia.rag.toggle")}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("ia.rag.toggle.desc")} · {ragStats.passagens}
                  </div>
                </div>
                <Switch data-testid="ia-rag" checked={ragAtivo} onCheckedChange={setRagAtivo} />
              </div>
            </div>
            )}

            <div className="rounded-xl border p-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2">{t("ia.conversas")}</div>
              <Button variant="outline" size="sm" data-testid="ia-exportar" onClick={exportarConversa} disabled={!ativa} className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" /> {t("ia.exportar")}
              </Button>
            </div>
          </aside>
        </div>
        )}

        {aba === "ver" && <AbaVer t={t} lang={lang} pensamentoAberto={pensamentoAberto} />}
        {aba === "buscar" && (
          <AbaBuscar
            t={t}
            ragStats={ragStats}
            aIndexarPlataforma={aIndexarPlataforma}
            ragErro={ragErro}
            aoIndexarPlataforma={indexarPlataforma}
            aoLimparRag={limparRag}
            aoRegistrarManual={registrarManualRag}
          />
        )}
      </div>
    </div>
  );
};

// ── v55 — ABA VER: o OLHO da plataforma ─────────────────────────────────
// O snippet oficial: /chat/completions com content parts [text, image_url],
// reasoning_budget 16384, temperature 0.6, top_p 0.95. A imagem entra por
// URL https:// ou por ficheiro (→ data URL base64). O resultado chega em
// streaming com o MESMO painel de pensamento do chat.

function AbaVer({
  t, lang, pensamentoAberto,
}: {
  t: (k: string) => string;
  lang: string;
  pensamentoAberto: boolean;
}) {
  const endpointInfo = useMemo(resolverEndpointVisao, []);
  const [pergunta, setPergunta] = useState("");
  const [imagem, setImagem] = useState("");
  const [fluxo, setFluxo] = useState<FluxoEmCurso | null>(null);
  const [resultado, setResultado] = useState<{ conteudo: string; raciocinio: string } | null>(null);
  const [uso, setUso] = useState<UsoIa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [parametros, setParametros] = useState<ParametrosVisao>({ ...PARAMETROS_VISAO_PADRAO });
  const controladorRef = useRef<AbortController | null>(null);
  const ficheiroRef = useRef<HTMLInputElement | null>(null);

  const lingua = lang === "pt" || lang === "pt-BR" ? "português" : null;

  const escolherFicheiro = useCallback(async (ficheiro: File | undefined) => {
    if (!ficheiro) return;
    if (!ficheiro.type.startsWith("image/")) {
      toast.error(t("ia.ver.imagem.invalida"));
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolver, recusar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver(String(leitor.result));
        leitor.onerror = () => recusar(new Error("file reader"));
        leitor.readAsDataURL(ficheiro);
      });
      validarImagemFonte(dataUrl); // lança com o motivo real se exceder os caps
      setImagem(dataUrl);
      setErro(null);
    } catch (err: any) {
      toast.error(`${t("ia.ver.imagem.invalida")}: ${String(err?.message ?? err).slice(0, 140)}`);
    }
  }, [t]);

  const analisar = useCallback(async () => {
    const texto = pergunta.trim();
    if (!texto || !imagem || fluxo) return;
    setErro(null);
    setResultado(null);
    setUso(null);
    setFluxo({ raciocinio: "", conteudo: "", inicio: Date.now(), parado: false });
    const controlador = new AbortController();
    controladorRef.current = controlador;

    const cliente = new ClienteNemotronVisao({
      endpoint: endpointInfo.url,
      chave: endpointInfo.chaveDirecta,
      cabecalhos: endpointInfo.modo === "edge" ? await cabecalhosEdge() : undefined,
      tentativas: 2,
    });

    const perguntaFinal = lingua ? `${texto} (Responde em ${lingua}.)` : texto;
    let conteudoFinal = "";
    let raciocinioFinal = "";

    try {
      const r = await cliente.analisarStream(perguntaFinal, imagem, parametros, {
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
          }
        },
      });
      setResultado({ conteudo: r.conteudo, raciocinio: r.raciocinio });
      if (r.parado) toast.info(t("ia.erro.parado"));
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      const detalhe = e?.estado ? ` · HTTP ${e.estado}` : "";
      const mensagem = `${t("ia.erro.ligacao")}${detalhe}`;
      if (conteudoFinal || raciocinioFinal) {
        setResultado({ conteudo: conteudoFinal, raciocinio: raciocinioFinal });
        toast.error(mensagem);
      } else {
        setErro(mensagem);
        toast.error(mensagem);
      }
    } finally {
      controladorRef.current = null;
      setFluxo(null);
    }
  }, [pergunta, imagem, fluxo, endpointInfo, parametros, lingua, t]);

  const parar = useCallback(() => controladorRef.current?.abort(), []);

  const imagemInfo = useMemo(() => {
    try { return validarImagemFonte(imagem); } catch { return null; }
  }, [imagem]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      {/* Esquerda: pergunta + imagem + parâmetros */}
      <section className="rounded-xl border bg-card/50 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> {t("ia.ver.titulo")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("ia.ver.desc")}</p>
          <Badge variant="outline" className="mt-2 text-[10px] font-mono">{MODELO_VISAO_PADRAO}</Badge>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">{t("ia.ver.pergunta")}</label>
          <Textarea
            data-testid="ia-ver-pergunta"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder={t("ia.ver.pergunta.placeholder")}
            className="mt-1 min-h-[64px] resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">{t("ia.ver.imagem")}</label>
          <div className="flex gap-2">
            <Input
              data-testid="ia-ver-url"
              value={imagem.startsWith("data:") ? "" : imagem}
              onChange={(e) => { setImagem(e.target.value.trim()); setErro(null); }}
              placeholder="https://…"
              className="flex-1 font-mono text-xs"
              spellCheck={false}
            />
            <Button variant="outline" size="sm" data-testid="ia-ver-ficheiro-botao" onClick={() => ficheiroRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> {t("ia.ver.imagem.ficheiro")}
            </Button>
            {imagem && (
              <Button variant="ghost" size="icon" aria-label={t("ia.ver.imagem.limpar")} onClick={() => setImagem("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            ref={ficheiroRef}
            data-testid="ia-ver-ficheiro"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { escolherFicheiro(e.target.files?.[0]); e.target.value = ""; }}
          />
          {imagem && imagemInfo && (
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <img src={imagem} alt="preview" className="max-h-56 w-full object-contain" />
            </div>
          )}
          {imagemInfo && (
            <p className="text-[10px] text-muted-foreground">
              {t("ia.ver.imagem.info")}: {imagemInfo.tipo === "dados" ? `~${Math.round((imagemInfo.bytesAprox ?? 0) / 1024)} KB` : "URL"} · cap {Math.round(LIMITES_VISAO.IMAGEM_URL_CAP / 1024 / 1024 * 10) / 10} MB
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{t("ia.config.temperatura")}</span>
              <span data-testid="ia-ver-temperatura-valor">{parametros.temperatura}</span>
            </div>
            <Slider
              data-testid="ia-ver-temperatura"
              value={[parametros.temperatura]}
              min={0} max={LIMITES_VISAO.TEMPERATURA_MAX} step={0.05}
              onValueChange={([v]) => setParametros((p) => ({ ...p, temperatura: v }))}
              className="mt-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{t("ia.config.maxtokens")}</span>
              <span data-testid="ia-ver-maxtokens-valor">{parametros.maxTokens}</span>
            </div>
            <Slider
              data-testid="ia-ver-maxtokens"
              value={[parametros.maxTokens]}
              min={256} max={LIMITES_VISAO.MAX_TOKENS_CAP} step={256}
              onValueChange={([v]) => setParametros((p) => ({ ...p, maxTokens: v }))}
              className="mt-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{t("ia.ver.orcamento")}</span>
              <span data-testid="ia-ver-orcamento-valor">{parametros.orcamentoRaciocinio || "—"}</span>
            </div>
            <Slider
              data-testid="ia-ver-orcamento"
              value={[parametros.orcamentoRaciocinio]}
              min={0} max={LIMITES_VISAO.ORCAMENTO_RACIOCINIO_CAP} step={512}
              onValueChange={([v]) => setParametros((p) => ({ ...p, orcamentoRaciocinio: v }))}
              className="mt-2"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">{t("ia.ver.orcamento.desc")}</p>

        <div className="flex items-center gap-2">
          {fluxo ? (
            <Button variant="destructive" data-testid="ia-ver-parar" onClick={parar}>
              <Square className="h-4 w-4 mr-2" /> {t("ia.parar")}
            </Button>
          ) : (
            <Button data-testid="ia-ver-analisar" onClick={analisar} disabled={!pergunta.trim() || !imagem}>
              <Eye className="h-4 w-4 mr-2" /> {t("ia.ver.analisar")}
            </Button>
          )}
          {uso && (
            <Badge variant="secondary" data-testid="ia-ver-stats" className="text-[10px]">
              {t("ia.stats.tokens")}: {uso.totalTokens ?? "—"} · {t("ia.stats.primeiro")}: {uso.msPrimeiroToken ?? "—"}ms
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{t("ia.rodape.honesto")}</p>
      </section>

      {/* Direita: resultado */}
      <section className="rounded-xl border bg-card/50 p-4 min-h-[420px] flex flex-col" data-testid="ia-ver-resultados">
        {erro && (
          <div data-testid="ia-ver-erro" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </div>
        )}
        {!resultado && !fluxo && !erro && (
          <div className="m-auto text-center text-sm text-muted-foreground max-w-xs">
            <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-4">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            {t("ia.ver.vazio")}
          </div>
        )}
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
        {resultado && !fluxo && (
          <MensagemBubble
            mensagem={{ role: "assistant", content: resultado.conteudo, raciocinio: resultado.raciocinio || undefined }}
            indice={0}
            t={t}
            pensamentoAberto={pensamentoAberto}
          />
        )}
      </section>
    </div>
  );
}

// ── v55 — ABA BUSCAR: a MEMÓRIA semântica (embeddings multimodais) ──────
// O snippet oficial: /embeddings com input `texto + data URL` na MESMA
// string, modality text_image, input_type passage (indexar) / query
// (procurar), truncate END. A busca é cosseno REAL sobre a LojaVetores no
// browser (cap honesto de 30 itens, persistida com vetores a 6 casas —
// precisão imune ao erro de arredondamento do cosseno).

const CHAVE_VETORES_STORAGE = "bateu.ia.vetores.v55";

function carregarLoja(loja: LojaVetores): number | null {
  try {
    const cru = localStorage.getItem(CHAVE_VETORES_STORAGE);
    if (!cru) return null;
    const obj = JSON.parse(cru);
    if (!Array.isArray(obj?.itens)) return null;
    for (const i of obj.itens.slice(0, LIMITES_VETORES.PERSISTENCIA_CAP)) {
      if (i && typeof i.id === "string" && Array.isArray(i.vetor) && i.vetor.every((x: any) => Number.isFinite(Number(x)))) {
        loja.adicionar({
          id: String(i.id),
          rotulo: String(i.rotulo ?? "—"),
          texto: String(i.texto ?? ""),
          tipo: (["texto", "imagem", "texto_imagem"].includes(i.tipo) ? i.tipo : "texto") as TipoEntradaVetor,
          vetor: i.vetor.map(Number),
        });
      }
    }
    return loja.estatisticas().dimensao;
  } catch {
    return null;
  }
}

function guardarLoja(loja: LojaVetores, dimensao: number | null): boolean {
  try {
    localStorage.setItem(
      CHAVE_VETORES_STORAGE,
      JSON.stringify({
        dim: dimensao,
        itens: loja.listar().map((i) => ({ ...i, vetor: arredondarVetor(i.vetor) })),
      }),
    );
    return true;
  } catch {
    return false; // quota do localStorage — honesto, o chamador avisa
  }
}

function AbaBuscar({
  t, ragStats, aIndexarPlataforma, ragErro, aoIndexarPlataforma, aoLimparRag, aoRegistrarManual,
}: {
  t: (k: string) => string;
  ragStats: { passagens: number; documentos: number; porTipo: Record<string, number> };
  aIndexarPlataforma: boolean;
  ragErro: string | null;
  aoIndexarPlataforma: () => void;
  aoLimparRag: () => void;
  aoRegistrarManual: (item: ItemVetor) => void;
}) {
  const endpointInfo = useMemo(resolverEndpointVetores, []);
  const lojaRef = useRef<LojaVetores>(new LojaVetores(LIMITES_VETORES.PERSISTENCIA_CAP));
  const [itens, setItens] = useState<ItemVetor[]>([]);
  const [dimensao, setDimensao] = useState<number | null>(null);
  const [rotulo, setRotulo] = useState("");
  const [texto, setTexto] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [aIndexar, setAIndexar] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [aBuscar, setABuscar] = useState(false);
  const [simA, setSimA] = useState("");
  const [simB, setSimB] = useState("");
  const [simValor, setSimValor] = useState<number | null>(null);
  const [aSim, setASim] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const dim = carregarLoja(lojaRef.current);
    if (dim) setDimensao(dim);
    setItens(lojaRef.current.listar());
  }, []);

  const sincronizar = useCallback(() => {
    setItens(lojaRef.current.listar());
    setDimensao(lojaRef.current.estatisticas().dimensao);
    const ok = guardarLoja(lojaRef.current, lojaRef.current.estatisticas().dimensao);
    if (!ok) toast.info(t("ia.buscar.quota"));
  }, [t]);

  const criarCliente = useCallback(async () => {
    return new ClienteNemotronVetores({
      endpoint: endpointInfo.url,
      chave: endpointInfo.chaveDirecta,
      cabecalhos: endpointInfo.modo === "edge" ? await cabecalhosEdge() : undefined,
      tentativas: 2,
    });
  }, [endpointInfo]);

  const indexar = useCallback(async () => {
    if (aIndexar) return;
    const textoLimpo = texto.trim();
    const imagemLimpa = imagemUrl.trim();
    if (!textoLimpo && !imagemLimpa) return;
    setErro(null);
    setAIndexar(true);
    try {
      let imagem: string | undefined;
      if (imagemLimpa) {
        imagem = await imagemParaDataUrl(imagemLimpa); // o caminho do snippet: descarrega → base64
      }
      const cliente = await criarCliente();
      const r = await cliente.vetorizar(
        [{ texto: textoLimpo || "imagem", imagem }],
        { inputType: "passage" }, // indexar = passage (o EXACTO do snippet)
      );
      const tipo: TipoEntradaVetor = textoLimpo && imagem ? "texto_imagem" : imagem ? "imagem" : "texto";
      const itemNovo = lojaRef.current.adicionar({
        id: undefined,
        rotulo: rotulo.trim() || textoLimpo.slice(0, 60) || "imagem",
        texto: textoLimpo,
        tipo,
        vetor: r.vetores[0],
      });
      // v56 — o item manual também entra no índice RAG do chat (vetor real).
      aoRegistrarManual(itemNovo);
      sincronizar();
      setTexto("");
      setImagemUrl("");
      setRotulo("");
      toast.success(t("ia.buscar.indexado"));
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      setErro(`${t("ia.erro.ligacao")}${e?.estado ? ` · HTTP ${e.estado}` : ""} — ${String(err?.message ?? err).slice(0, 160)}`);
      toast.error(String(err?.message ?? err).slice(0, 160));
    } finally {
      setAIndexar(false);
    }
  }, [aIndexar, texto, imagemUrl, rotulo, criarCliente, sincronizar, aoRegistrarManual, t]);

  const buscar = useCallback(async () => {
    const q = consulta.trim();
    if (!q || aBuscar) return;
    if (!lojaRef.current.tamanho) {
      setResultados([]);
      toast.info(t("ia.buscar.sem.itens"));
      return;
    }
    setErro(null);
    setABuscar(true);
    try {
      const cliente = await criarCliente();
      const r = await cliente.vetorizar([{ texto: q }], { inputType: "query" }); // procurar = query
      setDimensao(r.dimensao);
      setResultados(lojaRef.current.buscarVetor(r.vetores[0], { k: 5 }));
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      setErro(`${t("ia.erro.ligacao")}${e?.estado ? ` · HTTP ${e.estado}` : ""} — ${String(err?.message ?? err).slice(0, 160)}`);
    } finally {
      setABuscar(false);
    }
  }, [consulta, aBuscar, criarCliente, t]);

  const calcularSimilaridade = useCallback(async () => {
    const a = simA.trim(), b = simB.trim();
    if (!a || !b || aSim) return;
    setErro(null);
    setASim(true);
    try {
      const cliente = await criarCliente();
      // As duas entradas no MESMO pedido (mesmo input_type — comparação honesta).
      const r = await cliente.vetorizar([{ texto: a }, { texto: b }], { inputType: "query" });
      setDimensao(r.dimensao);
      setSimValor(cosseno(r.vetores[0], r.vetores[1]));
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      setErro(`${t("ia.erro.ligacao")}${e?.estado ? ` · HTTP ${e.estado}` : ""} — ${String(err?.message ?? err).slice(0, 160)}`);
    } finally {
      setASim(false);
    }
  }, [simA, simB, aSim, criarCliente, t]);

  const removerItem = useCallback((id: string) => {
    lojaRef.current.remover(id);
    sincronizar();
    setResultados(null);
  }, [sincronizar]);

  const limparTudo = useCallback(() => {
    lojaRef.current.limpar();
    sincronizar();
    setResultados(null);
    setSimValor(null);
  }, [sincronizar]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* v56 — Plataforma (RAG): dados REAIS no índice que o chat lê */}
      <section className="rounded-xl border bg-card/50 p-4 space-y-3 lg:col-span-2" data-testid="ia-rag-card">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> {t("ia.rag.titulo")}</h2>
          <Badge variant="secondary" data-testid="ia-rag-stats" className="ml-auto text-[10px]">
            {t("ia.rag.passagens")}: {ragStats.passagens} · {t("ia.rag.docs")}: {ragStats.documentos}
            {ragStats.porTipo?.sorteio ? ` · ${t("ia.rag.tipo.sorteio")}: ${ragStats.porTipo.sorteio}` : ""}
            {ragStats.porTipo?.concurso ? ` · ${t("ia.rag.tipo.concurso")}: ${ragStats.porTipo.concurso}` : ""}
            {ragStats.porTipo?.blog ? ` · ${t("ia.rag.tipo.blog")}: ${ragStats.porTipo.blog}` : ""}
            {ragStats.porTipo?.manual ? ` · ${t("ia.rag.tipo.manual")}: ${ragStats.porTipo.manual}` : ""}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{t("ia.rag.desc")}</p>
        {ragErro && (
          <div data-testid="ia-rag-erro" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {ragErro}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button data-testid="ia-rag-botao" onClick={aoIndexarPlataforma} disabled={aIndexarPlataforma}>
            {aIndexarPlataforma ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
            {aIndexarPlataforma ? t("ia.rag.a.indexar") : t("ia.rag.indexar")}
          </Button>
          {!!ragStats.passagens && (
            <Button variant="ghost" size="sm" data-testid="ia-rag-limpar" onClick={aoLimparRag} className="text-muted-foreground">
              <Eraser className="h-3.5 w-3.5 mr-2" /> {t("ia.rag.limpar")}
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{t("ia.rag.nota")}</p>
      </section>

      {/* Indexar */}
      <section className="rounded-xl border bg-card/50 p-4 space-y-3" data-testid="ia-buscar-indexar">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><ScanSearch className="h-5 w-5 text-primary" /> {t("ia.buscar.titulo")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("ia.buscar.desc")}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">{MODELO_EMBED_PADRAO}</Badge>
            {dimensao && <Badge variant="secondary" data-testid="ia-buscar-dim" className="text-[10px]">{t("ia.buscar.dim")}: {dimensao}</Badge>}
            <Badge variant="secondary" className="text-[10px]">{t("ia.buscar.itens")}: {itens.length}/{LIMITES_VETORES.PERSISTENCIA_CAP}</Badge>
          </div>
        </div>

        <Input
          data-testid="ia-buscar-rotulo"
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
          placeholder={t("ia.buscar.rotulo")}
          className="text-sm"
        />
        <Textarea
          data-testid="ia-buscar-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("ia.buscar.texto")}
          className="min-h-[64px] resize-none"
          rows={2}
        />
        <Input
          data-testid="ia-buscar-imagem"
          value={imagemUrl}
          onChange={(e) => setImagemUrl(e.target.value.trim())}
          placeholder={t("ia.buscar.imagem")}
          className="font-mono text-xs"
          spellCheck={false}
        />
        <Button data-testid="ia-buscar-indexar-botao" onClick={indexar} disabled={aIndexar || (!texto.trim() && !imagemUrl.trim())} className="w-full">
          {aIndexar ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          {aIndexar ? t("ia.buscar.a.indexar") : t("ia.buscar.indexar")}
        </Button>
        <p className="text-[10px] text-muted-foreground">{t("ia.buscar.imagem.nota")}</p>

        {!!itens.length && (
          <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border p-2">
            {itens.map((i) => (
              <div key={i.id} data-testid="ia-buscar-item" className="flex items-center gap-2 text-xs rounded-md px-2 py-1 hover:bg-accent">
                <Badge variant="outline" className="text-[9px] shrink-0">{i.tipo}</Badge>
                <span className="truncate flex-1">{i.rotulo}</span>
                <button data-testid="ia-buscar-item-apagar" aria-label={t("ia.apagar")} onClick={() => removerItem(i.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
        {!!itens.length && (
          <Button variant="ghost" size="sm" onClick={limparTudo} className="w-full text-muted-foreground">
            <Eraser className="h-3.5 w-3.5 mr-2" /> {t("ia.buscar.limpar")}
          </Button>
        )}
      </section>

      {/* Buscar + similaridade */}
      <section className="rounded-xl border bg-card/50 p-4 space-y-4" data-testid="ia-buscar-resultados">
        {erro && (
          <div data-testid="ia-buscar-erro" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {erro}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">{t("ia.buscar.query")}</label>
          <div className="flex gap-2">
            <Input
              data-testid="ia-buscar-consulta"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
              placeholder={t("ia.buscar.query.placeholder")}
              className="flex-1"
            />
            <Button data-testid="ia-buscar-buscar-botao" onClick={buscar} disabled={aBuscar || !consulta.trim()}>
              {aBuscar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {resultados !== null && (
          <div className="space-y-2" data-testid="ia-buscar-lista">
            {!resultados.length && <p className="text-xs text-muted-foreground">{t("ia.buscar.sem.resultados")}</p>}
            {resultados.map((r, idx) => (
              <div key={r.item.id} data-testid={`ia-buscar-resultado-${idx}`} className="rounded-lg border p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{r.item.rotulo}</span>
                  <span data-testid={`ia-buscar-score-${idx}`} className="text-xs font-mono text-primary">{(r.pontuacao * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, r.pontuacao * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">{t("ia.buscar.similaridade")}</div>
          <Input data-testid="ia-buscar-sim-a" value={simA} onChange={(e) => setSimA(e.target.value)} placeholder={t("ia.buscar.sim.a")} className="text-xs" />
          <Input data-testid="ia-buscar-sim-b" value={simB} onChange={(e) => setSimB(e.target.value)} placeholder={t("ia.buscar.sim.b")} className="text-xs" />
          <Button variant="outline" size="sm" data-testid="ia-buscar-sim-botao" onClick={calcularSimilaridade} disabled={aSim || !simA.trim() || !simB.trim()} className="w-full">
            {aSim ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
            {t("ia.buscar.sim.calcular")}
          </Button>
          {simValor !== null && (
            <div data-testid="ia-buscar-sim-valor" className="text-center">
              <span className="text-2xl font-bold text-primary">{(Math.max(0, simValor) * 100).toFixed(1)}%</span>
              <span className="text-[10px] text-muted-foreground ml-2">cosseno {simValor.toFixed(4)}</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{t("ia.rodape.honesto")}</p>
      </section>
    </div>
  );
}

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

// v57 — cabecalhosEdge mudou para src/lib/iaEndpoint.ts (fonte única com o NPC).

export default IaBateu;
