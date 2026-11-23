// ═══════════════════════════════════════════════════════════════════════
// v82 — «A IA SUGERE UM JOGO» — recomendação NVIDIA no hub /jogos
//
// Regra do briefing (passo 11): a IA SÓ SUGERE — nunca inscreve, nunca
// promete pontos, nunca decide. Factos reais do núcleo puro do catálogo:
// jogo do dia (determinístico), populares da semana, histórico REAL do
// aparelho. A resposta é validada contra o catálogo — nome inventado
// NUNCA vira sugestão (honesto: sem sugestão em vez de link morto).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Square, Loader2, ChevronRight } from "lucide-react";
import { ALL_GAMES, playsOf, bestOf, weeklyPopular, type GameDef } from "@/lib/gamesCatalog";
import { MODELO_PADRAO, ClienteNemotron, NemotronError } from "@/lib/nemotron";
import { cabecalhosEdge, resolverEndpointChat } from "@/lib/iaEndpoint";
import { PROMPT_SUGESTAO_JOGO, analisarSugestaoJogoIA } from "@/lib/iaSugestoes";

interface SugestaoVisivel {
  jogo: string;
  razao: string;
  id: string;
}

type EstadoSug = "parado" | "aFluir" | "erro" | "feito";

export default function SugestaoIaJogo({ doDiaGame }: { doDiaGame: GameDef | null }) {
  const [estado, setEstado] = useState<EstadoSug>("parado");
  const [sugestoes, setSugestoes] = useState<SugestaoVisivel[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const controladorRef = useRef<AbortController | null>(null);

  const parar = useCallback(() => controladorRef.current?.abort(), []);

  const sugerir = useCallback(async () => {
    if (estado === "aFluir") return;
    setEstado("aFluir");
    setSugestoes([]);
    setErro(null);
    const controlador = new AbortController();
    controladorRef.current = controlador;

    // Factos REAIS (nenhum inventado): catálogo real + núcleo do hub.
    const catalogo = ALL_GAMES.map(
      (g) => `- "${g.label}" (categoria ${g.category}, dificuldade ${g.dificuldade}, ~${g.minutos} min, até ${g.pontosMax} pts)`,
    );
    const doDia = doDiaGame?.label ?? null;
    const populares = weeklyPopular(5).map((g) => g.label);
    const historico = ALL_GAMES
      .filter((g) => playsOf(g.id) > 0)
      .sort((a, b) => playsOf(b.id) - playsOf(a.id))
      .slice(0, 5)
      .map((g) => `${g.label} (${playsOf(g.id)}× jogadas, melhor ${bestOf(g.id)})`);

    try {
      const info = resolverEndpointChat();
      const cliente = new ClienteNemotron({
        endpoint: info.url,
        chave: info.chaveDirecta,
        cabecalhos: info.modo === "edge" ? await cabecalhosEdge() : undefined,
        tentativas: 2,
      });
      const r = await cliente.conversarStream({
        mensagens: [
          { role: "system", content: PROMPT_SUGESTAO_JOGO },
          {
            role: "user",
            content:
              "CATÁLOGO REAL (rótulos EXACTOS):\n" + catalogo.join("\n") +
              "\n\nFACTOS DO UTILIZADOR (dados reais):\n" +
              `- Jogo do dia: ${doDia ?? "—"}\n` +
              `- Populares esta semana: ${populares.length ? populares.join(", ") : "—"}\n` +
              `- Histórico deste aparelho: ${historico.length ? historico.join("; ") : "vazio — jogador novo"}`,
          },
        ],
        parametros: { modelo: MODELO_PADRAO, temperatura: 0.9, topP: 0.95, maxTokens: 300, thinking: false },
        sinal: controlador.signal,
      });
      const validas = analisarSugestaoJogoIA(
        r.conteudo,
        ALL_GAMES.map((g) => g.label),
      )
        .map((s) => ({ ...s, id: ALL_GAMES.find((g) => g.label === s.jogo)?.id ?? "" }))
        .filter((s) => s.id && s.jogo !== doDia);
      if (validas.length) {
        setSugestoes(validas);
        setEstado("feito");
      } else {
        setErro("A IA respondeu fora do catálogo real — sem sugestão (honesto). Tenta de novo.");
        setEstado("erro");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setEstado("parado");
      } else {
        const e = err instanceof NemotronError ? err : null;
        setErro(`A IA não conseguiu sugerir${e?.estado ? ` · HTTP ${e.estado}` : ""} — ${String(err?.message ?? err).slice(0, 120)}`);
        setEstado("erro");
      }
    } finally {
      controladorRef.current = null;
    }
  }, [estado, doDiaGame]);

  return (
    <div className="rounded-2xl mb-5 p-3.5" data-testid="jogos-ia-sugestao" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.3)" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-2 text-sm font-black font-display">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          A IA sugere um jogo
          <span className="text-[9px] font-medium text-muted-foreground normal-case">· sugestão, não decisão · nunca promete pontos</span>
        </div>
        {estado === "aFluir" ? (
          <button
            className="text-[10px] font-bold px-2 py-1 rounded-lg text-red-300 hover:text-red-200 flex items-center gap-1"
            onClick={parar}
            data-testid="jogos-ia-parar"
          >
            <Square className="h-3 w-3" /> Parar
          </button>
        ) : (
          <button
            className="text-[10px] font-black px-3 py-1.5 rounded-lg text-white flex items-center gap-1 hover:opacity-90 transition-opacity"
            style={{ background: "rgba(139,92,246,0.85)" }}
            onClick={sugerir}
            data-testid="jogos-ia-botao"
          >
            <Sparkles className="h-3 w-3" />
            {sugestoes.length ? "Sugerir outro" : "Sugerir com IA"}
          </button>
        )}
      </div>

      {estado === "aFluir" && (
        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1.5" data-testid="jogos-ia-aPensar">
          <Loader2 className="h-3 w-3 animate-spin" /> A IA está a escolher no catálogo real…
        </p>
      )}

      {estado === "erro" && erro && (
        <p className="text-[11px] text-red-400 mt-1.5" data-testid="jogos-ia-erro">{erro}</p>
      )}

      {sugestoes.length > 0 && estado === "feito" && (
        <div className="mt-2 space-y-2" data-testid="jogos-ia-lista">
          {sugestoes.map((s) => (
            <Link
              key={s.jogo}
              to={`/jogo/${s.id}`}
              className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/5 transition-colors"
              data-testid={`jogos-ia-item-${s.id}`}
            >
              <span className="flex-1 min-w-0">
                <span className="text-sm font-bold block truncate">{s.jogo}</span>
                <span className="text-[11px] text-muted-foreground line-clamp-2">{s.razao}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
