// ============================================================
// FX TREND — série real de 30 dias do Frankfurter (BCE) (v34)
// · Só moedas publicadas pelo BCE (EUR/USD/BRL/ZAR)
// · MZN/AOA/CVE → nota HONESTA de indisponível (nunca inventa)
// · Sparkline SVG + variação % real entre o 1.º e o último dia
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { getSerieFx, FRANKFURTER_SUPORTADAS, FRANKFURTER_ATTRIBUTION, type SerieFx } from "@/lib/frankfurter";

type Estado = "loading" | "ready" | "error" | "naoSuportado";

export default function FxTrend({ from, to }: { from: string; to: string }) {
  const par = from !== to && FRANKFURTER_SUPORTADAS.has(from) && FRANKFURTER_SUPORTADAS.has(to);
  const [estado, setEstado] = useState<Estado>("loading");
  const [serie, setSerie] = useState<SerieFx | null>(null);
  const [erroMsg, setErroMsg] = useState("");

  const carregar = useCallback(async () => {
    if (!par) { setEstado("naoSuportado"); setSerie(null); return; }
    setEstado("loading");
    setErroMsg("");
    try {
      const s = await getSerieFx(from, to);
      setSerie(s);
      setEstado("ready");
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : "Sem ligação ao Frankfurter");
      setEstado("error");
    }
  }, [par, from, to]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado === "naoSuportado") {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5" data-testid="fx-trend">
        <p className="text-[10px] leading-relaxed text-muted-foreground" data-testid="fx-trend-note">
          <TrendingUp className="h-3 w-3 inline mr-1 -mt-0.5" />
          Tendência de 30 dias indisponível para {from}→{to}: o BCE (Frankfurter) não publica esta moeda — mostramos só a taxa atual real.
        </p>
      </div>
    );
  }

  if (estado === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground rounded-xl border border-border/50 bg-muted/20" data-testid="fx-trend-loading">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> A pedir série de 30 dias (BCE)…
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-center justify-between gap-2" data-testid="fx-trend-erro">
        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">{erroMsg}</p>
        <button onClick={carregar} className="shrink-0 text-amber-600 dark:text-amber-400" aria-label="Tentar tendência novamente">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (estado === "ready" && serie) {
    const taxas = serie.pontos.map((p) => p.taxa);
    const min = Math.min(...taxas), max = Math.max(...taxas);
    const amp = max - min || 1;
    const W = 300, H = 48, PAD = 4;
    const pts = serie.pontos.map((p, i) => {
      const x = PAD + (i / (serie.pontos.length - 1)) * (W - 2 * PAD);
      const y = H - PAD - ((p.taxa - min) / amp) * (H - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const primeiro = taxas[0], ultimo = taxas[taxas.length - 1];
    const variacao = ((ultimo - primeiro) / primeiro) * 100;
    const subiu = variacao >= 0;
    const decimais = ultimo < 10 ? 4 : 2;

    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5" data-testid="fx-trend">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 30 dias · {serie.base}→{serie.simbolo}
          </p>
          <p className={`text-[11px] font-black tabular-nums ${subiu ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} data-testid="fx-trend-meta">
            {subiu ? "▲" : "▼"} {variacao.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-10" data-testid="fx-trend-svg" aria-label={`Tendência de ${serie.base} para ${serie.simbolo} nos últimos 30 dias`}>
          <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} className="fill-primary/10 stroke-none" />
          <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <p className="mt-1 text-[10px] text-muted-foreground tabular-nums" data-testid="fx-trend-range">
          {min.toLocaleString("pt-PT", { maximumFractionDigits: decimais })} — {max.toLocaleString("pt-PT", { maximumFractionDigits: decimais })} {serie.simbolo} · {serie.inicio} → {serie.fim}
        </p>
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">{FRANKFURTER_ATTRIBUTION}</p>
      </div>
    );
  }

  return null;
}
