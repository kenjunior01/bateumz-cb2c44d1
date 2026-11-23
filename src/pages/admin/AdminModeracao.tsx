// ═══════════════════════════════════════════════════════════════════════
// v82 — MODERAÇÃO DA COMUNIDADE COM IA — «A IA SUGERE, TU DECIDES»
//
// Briefing (passo 11): triagem da comunidade com NVIDIA Nemotron. A IA
// ANALISA e CLASSIFICA (ok / duvidoso / suspeito) com motivo e acção
// SUGERIDA — e NUNCA decide: remover é sempre uma escolha EXPLÍCITA do
// moderador (confirmação em 2 passos; a IA não tem botão próprio).
//
// Honestidade: respostas sem JSON válido = «sem veredicto» (nunca
// inventado); erros da IA mostrados como estão; a remoção usa a política
// RLS já existente (DELETE próprio OU has_role admin) — zero migração.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, HelpCircle, Loader2, MessageSquare,
  ShieldAlert, Sparkles, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MODELO_PADRAO, ClienteNemotron, NemotronError } from "@/lib/nemotron";
import { cabecalhosEdge, resolverEndpointChat } from "@/lib/iaEndpoint";
import { PROMPT_MODERADOR, analisarVeredictoIA, type VeredictoIA } from "@/lib/iaSugestoes";

interface LinhaMsg {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
}

type EstadoVeredicto =
  | { estado: "analisando" }
  | { estado: "feito"; veredicto: VeredictoIA }
  | { estado: "erro"; erro: string };

const CAP_MSG = 600;
const LOTE_CAP = 10;

const ROTULO_CLAS: Record<string, { texto: string; cls: string; icone: typeof CheckCircle2 }> = {
  ok: { texto: "Normal", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icone: CheckCircle2 },
  dubio: { texto: "Duvidoso", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icone: HelpCircle },
  suspeito: { texto: "Suspeito", cls: "bg-red-500/15 text-red-400 border-red-500/30", icone: AlertTriangle },
};

const ROTULO_ACAO: Record<string, string> = {
  manter: "manter",
  avisar: "avisar o autor",
  remover: "remover — decisão tua",
  escalar: "escalar",
};

export default function AdminModeracao() {
  const [msgs, setMsgs] = useState<LinhaMsg[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [veredictos, setVeredictos] = useState<Record<string, EstadoVeredicto>>({});
  const [aAnalisarLote, setAAnalisarLote] = useState(false);
  const [confirmarId, setConfirmarId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErroCarregar(null);
    const { data, error } = await supabase
      .from("community_messages")
      .select("id, content, message_type, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      setErroCarregar(String(error.message ?? error).slice(0, 160));
      setMsgs([]);
    } else {
      setMsgs((data ?? []) as LinhaMsg[]);
    }
    setACarregar(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const analisarUma = useCallback(async (cliente: ClienteNemotron, msg: LinhaMsg): Promise<boolean> => {
    setVeredictos((v) => ({ ...v, [msg.id]: { estado: "analisando" } }));
    try {
      const r = await cliente.conversarStream({
        mensagens: [
          { role: "system", content: PROMPT_MODERADOR },
          { role: "user", content: `Mensagem (${msg.message_type || "general"}):\n${msg.content.slice(0, CAP_MSG)}` },
        ],
        parametros: { modelo: MODELO_PADRAO, temperatura: 0.2, topP: 0.9, maxTokens: 220, thinking: false },
      });
      const v = analisarVeredictoIA(r.conteudo);
      if (!v) {
        setVeredictos((vs) => ({
          ...vs,
          [msg.id]: { estado: "erro", erro: "Resposta da IA sem JSON válido — sem veredicto (honesto). Tenta de novo." },
        }));
        return false;
      }
      setVeredictos((vs) => ({ ...vs, [msg.id]: { estado: "feito", veredicto: v } }));
      return true;
    } catch (err: any) {
      const e = err instanceof NemotronError ? err : null;
      setVeredictos((vs) => ({
        ...vs,
        [msg.id]: {
          estado: "erro",
          erro: `IA indisponível${e?.estado ? ` · HTTP ${e.estado}` : ""} — ${String(err?.message ?? err).slice(0, 120)}`,
        },
      }));
      return false;
    }
  }, []);

  // Lote sequencial (o portão de rate do cliente é respeitado: uma de cada vez)
  const analisarLote = useCallback(async () => {
    if (aAnalisarLote) return;
    setAAnalisarLote(true);
    try {
      const info = resolverEndpointChat();
      const cliente = new ClienteNemotron({
        endpoint: info.url,
        chave: info.chaveDirecta,
        cabecalhos: info.modo === "edge" ? await cabecalhosEdge() : undefined,
        tentativas: 2,
      });
      const alvo = msgs.filter((m) => veredictos[m.id]?.estado !== "feito").slice(0, LOTE_CAP);
      for (const m of alvo) {
        await analisarUma(cliente, m);
      }
    } finally {
      setAAnalisarLote(false);
    }
  }, [aAnalisarLote, msgs, veredictos, analisarUma]);

  // Uma mensagem (botão individual) — mesmo cliente, mesmo contrato
  const analisarIndividual = useCallback(async (msg: LinhaMsg) => {
    const info = resolverEndpointChat();
    const cliente = new ClienteNemotron({
      endpoint: info.url,
      chave: info.chaveDirecta,
      cabecalhos: info.modo === "edge" ? await cabecalhosEdge() : undefined,
      tentativas: 2,
    });
    await analisarUma(cliente, msg);
  }, [analisarUma]);

  // Remoção SEMPRE humana, em 2 passos (a IA não decide nem remove)
  const remover = useCallback(async (msg: LinhaMsg) => {
    if (confirmarId !== msg.id) {
      setConfirmarId(msg.id);
      return;
    }
    setRemovendoId(msg.id);
    const { error } = await supabase.from("community_messages").delete().eq("id", msg.id);
    setRemovendoId(null);
    setConfirmarId(null);
    if (error) {
      toast.error(`Não removou: ${String(error.message ?? error).slice(0, 120)}`);
    } else {
      toast.success("Mensagem removida — decisão do moderador.");
      setMsgs((l) => l.filter((x) => x.id !== msg.id));
    }
  }, [confirmarId]);

  const analisadas = msgs.filter((m) => veredictos[m.id]?.estado === "feito").length;
  const sugestRemocao = msgs.filter((m) => veredictos[m.id]?.estado === "feito" && (veredictos[m.id] as any).veredicto?.acaoSugerida === "remover").length;
  const pendentes = msgs.filter((m) => veredictos[m.id]?.estado !== "feito").length;

  return (
    <div className="space-y-4" data-testid="admin-moderacao">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Moderação da comunidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            A IA TRIA e SUGERE — nunca decide: a remoção é sempre uma tua escolha explícita, com
            confirmação. Veredictos sem JSON válido ficam «sem veredicto» em vez de serem inventados.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} data-testid="admin-mod-recarregar">
          Recarregar
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs" data-testid="admin-mod-stats">
        <Badge variant="outline">{msgs.length} mensagens recentes</Badge>
        <Badge variant="outline">{analisadas} analisadas</Badge>
        <Badge variant="outline">{pendentes} por analisar</Badge>
        {sugestRemocao > 0 && (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
            {sugestRemocao} sugestão(ões) de remoção — a decisão é tua
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={analisarLote}
          disabled={aAnalisarLote || msgs.length === 0}
          data-testid="admin-mod-analisar-lote"
        >
          {aAnalisarLote ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          Analisar {Math.min(LOTE_CAP, pendentes)} seguintes com IA
        </Button>
      </div>

      {aCarregar ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : erroCarregar ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400" data-testid="admin-mod-erro-carregar">
          Não conseguiu carregar as mensagens: {erroCarregar}
        </div>
      ) : msgs.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Sem mensagens recentes na comunidade — nada a triar (honesto).
        </div>
      ) : (
        <div className="space-y-2" data-testid="admin-mod-lista">
          {msgs.map((m) => {
            const v = veredictos[m.id];
            const feito = v?.estado === "feito" ? v.veredicto : null;
            const rot = feito ? ROTULO_CLAS[feito.classificacao] : null;
            const IconeClas = rot?.icone ?? ShieldAlert;
            return (
              <div key={m.id} className="rounded-xl border p-3.5 space-y-2" data-testid={`admin-mod-msg-${m.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content.slice(0, 400)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {m.message_type || "general"} · {new Date(m.created_at).toLocaleString("pt-PT")}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {v?.estado === "analisando" && (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> a analisar…
                      </Badge>
                    )}
                    {v?.estado === "erro" && (
                      <p className="text-[10px] text-red-400 max-w-[220px] text-right" data-testid={`admin-mod-erro-${m.id}`}>
                        {v.erro}
                      </p>
                    )}
                    {feito && rot && (
                      <div className="text-right space-y-1" data-testid={`admin-mod-veredicto-${m.id}`}>
                        <Badge className={rot.cls}>
                          <IconeClas className="h-3 w-3 mr-1" /> SUGESTÃO DA IA: {rot.texto}
                        </Badge>
                        {feito.motivo && <p className="text-[10px] text-muted-foreground max-w-[240px]">{feito.motivo}</p>}
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          acção sugerida: {ROTULO_ACAO[feito.acaoSugerida] ?? feito.acaoSugerida}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => analisarIndividual(m)}
                        disabled={aAnalisarLote || v?.estado === "analisando"}
                        data-testid={`admin-mod-analisar-${m.id}`}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {feito ? "Reanalisar" : "Analisar com IA"}
                      </Button>
                      <Button
                        size="sm"
                        variant={confirmarId === m.id ? "destructive" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => remover(m)}
                        disabled={removendoId === m.id}
                        data-testid={`admin-mod-remover-${m.id}`}
                      >
                        {removendoId === m.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                        {confirmarId === m.id ? "Confirmar remoção" : "Remover"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
