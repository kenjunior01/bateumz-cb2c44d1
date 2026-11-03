// ============================================================
// SABIAS QUE? — resumo REAL da Wikipédia PT (v34)
// · Rotação diária determinística por 17 artigos PALOP verificados
// · Texto oficial da Wikipédia (não reescrevemos nada)
// · Erro (429/rede) → honesto com retry · atribuição CC BY-SA
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, Lightbulb, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { getSabiasQue, WIKI_ATTRIBUTION, type SabiasQue as DadosSabias } from "@/lib/wikipediaSabias";

type Estado = "loading" | "ready" | "error";

export default function SabiasQue() {
  const [estado, setEstado] = useState<Estado>("loading");
  const [dados, setDados] = useState<DadosSabias | null>(null);
  const [erroMsg, setErroMsg] = useState("");

  const carregar = useCallback(async () => {
    setEstado("loading");
    setErroMsg("");
    try {
      const d = await getSabiasQue();
      setDados(d);
      setEstado("ready");
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : "Sem ligação à Wikipédia");
      setEstado("error");
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div data-testid="sabias-card" className="mb-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/8 via-transparent to-orange-500/5 overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
          <Lightbulb className="h-4 w-4 text-amber-500" />
        </span>
        <h2 className="text-sm font-black text-foreground">Sabias que?</h2>
        <span className="text-[10px] text-muted-foreground">· cultura e história dos PALOP, texto real da Wikipédia</span>
      </div>

      <div className="px-4 pb-3">
        {estado === "loading" && (
          <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground" data-testid="sabias-loading">
            <Loader2 className="h-4 w-4 animate-spin" /> A pedir o resumo real…
          </div>
        )}

        {estado === "error" && (
          <div className="py-3 text-center space-y-2" data-testid="sabias-erro">
            <p className="text-xs text-muted-foreground">{erroMsg}</p>
            <button onClick={carregar} data-testid="sabias-retry"
              className="mx-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/10">
              <RefreshCw className="h-3 w-3" /> Tentar novamente
            </button>
          </div>
        )}

        {estado === "ready" && dados && (
          <div className="flex gap-3 items-start">
            {dados.thumbnail && (
              <img
                src={dados.thumbnail}
                alt=""
                className="hidden sm:block h-20 w-20 rounded-xl object-cover border border-border/50 shrink-0"
                loading="lazy"
                data-testid="sabias-thumb"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-black text-foreground leading-tight" data-testid="sabias-titulo">{dados.titulo}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-4" data-testid="sabias-texto">{dados.extracto}</p>
              <a href={dados.url} target="_blank" rel="noopener noreferrer"
                data-testid="sabias-link"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                <BookOpen className="h-3 w-3" /> Ler na Wikipédia <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      <p className="px-4 py-1.5 text-[10px] text-muted-foreground/70 border-t border-amber-500/15" data-testid="sabias-atrib">
        {WIKI_ATTRIBUTION}
      </p>
    </div>
  );
}
