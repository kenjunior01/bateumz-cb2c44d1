import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, AlertTriangle, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getFxRates, convert, fmtMoney, FX_CURRENCIES, FX_ATTRIBUTION,
  type FxData,
} from "@/lib/exchangeRates";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════
// CONVERSOR DE MOEDAS — taxas REAIS da ExchangeRate-API (v30)
//
// · Números 100% reais do fornecedor (base USD, actualização diária)
// · Moedas da realidade da plataforma: USD · EUR · AOA · MZN · BRL · ZAR
// · Data da taxa EXIBIDA — nunca disfarçamos taxa velha de actual
// · Offline: mostra a última taxa real conhecida com aviso honesto
// · Painel calmo, números alinhados em tabular-nums (skill taste:
//   quiet panels, aligned figures, data-focused color)
// ═══════════════════════════════════════════════════════════════════════

type Status = "loading" | "ready" | "error";

export default function CurrencyConverter() {
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [fx, setFx] = useState<FxData | null>(null);
  const [stale, setStale] = useState(false);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("MZN");
  const [amount, setAmount] = useState("100");

  const load = useCallback(async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      const data = await getFxRates();
      setFx(data);
      // honestidade: se a taxa veio da cache (não do pedido de agora), avisamos
      setStale(Date.now() - data.updatedAt > 7 * 60 * 60_000);
      setStatus("ready");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Sem ligação ao serviço de taxas");
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const n = parseFloat(amount.replace(",", "."));
  const result = fx && Number.isFinite(n) && n > 0 ? convert(n, from, to, fx.rates) : null;
  const swap = () => { setFrom(to); setTo(from); };

  const currencyOptions = FX_CURRENCIES.map((c) => (
    <SelectItem key={c.code} value={c.code} className="text-sm">
      {c.flag} {c.code}
    </SelectItem>
  ));

  return (
    <Card data-testid="fx-converter">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Conversor de Moedas
          </CardTitle>
          {status === "ready" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} aria-label="Actualizar taxas" data-testid="fx-refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Taxas reais de câmbio, actualizadas diariamente pelo fornecedor.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" data-testid="fx-loading">
            <Loader2 className="h-4 w-4 animate-spin" /> A pedir taxas reais…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-center space-y-2" data-testid="fx-error">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500" />
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Taxas indisponíveis</p>
            <p className="text-[11px] text-muted-foreground">{errMsg}</p>
            <Button onClick={load} variant="outline" size="sm" className="h-7 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
          </div>
        )}

        {status === "ready" && fx && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">De</label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  className="h-11 text-right font-bold tabular-nums"
                  data-testid="fx-amount"
                  aria-label="Montante a converter"
                />
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-10 text-sm font-bold" data-testid="fx-from" aria-label="Moeda de origem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{currencyOptions}</SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="icon" onClick={swap} className="mb-8 h-9 w-9 shrink-0" aria-label="Trocar moedas" data-testid="fx-swap">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Para</label>
                <div className="h-11 rounded-md border border-input bg-secondary/40 flex items-center justify-end px-3 font-black tabular-nums overflow-hidden" data-testid="fx-result">
                  {result !== null ? fmtMoney(result, to) : "—"}
                </div>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-10 text-sm font-bold" data-testid="fx-to" aria-label="Moeda de destino">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{currencyOptions}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Honesty line: data REAL da taxa + aviso se vier de cache */}
            <p className={cn("text-[10px] leading-relaxed", stale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} data-testid="fx-meta">
              1 USD = {fx.rates[to] ? fx.rates[to].toFixed(2) : "—"} {to}
              {" · "}Taxa de {fx.providerDate || new Date(fx.updatedAt).toLocaleDateString("pt-PT")}
              {stale && " (guardada no teu dispositivo — sem ligação para renovar)"}
            </p>
          </>
        )}

        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 pt-1" data-testid="fx-attribution">
          <ExternalLink className="h-3 w-3 shrink-0" /> {FX_ATTRIBUTION}
        </p>
      </CardContent>
    </Card>
  );
}
