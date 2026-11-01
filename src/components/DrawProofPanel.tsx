import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Hash, Clock, RefreshCw, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDrawCommit, getDrawResult, verifyDrawProof,
  type RaffleDrawCommit, type RaffleDrawResult, type DrawVerification,
} from "@/lib/raffleDraws";

// ═══════════════════════════════════════════════════════════════════════
// REA SORTEIOS — Painel de Prova do Sorteio (substitui o antigo
// "BlockchainVerification" que mostrava dados fabricados).
// Mostra o compromisso real (SHA-256 do seed) publicado ANTES do sorteio
// e permite verificar a prova NO PRÓPRIO BROWSER (Web Crypto) — sem
// confiar no servidor nem em hashes decorativos.
// ═══════════════════════════════════════════════════════════════════════

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const TruncHash = ({ value }: { value: string }) => (
  <code className="block max-w-full truncate rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground" title={value}>
    {value}
  </code>
);

interface Props {
  raffleId: string;
  raffleTitle?: string;
  className?: string;
}

const DrawProofPanel = ({ raffleId, raffleTitle, className }: Props) => {
  const [commit, setCommit] = useState<RaffleDrawCommit | null>(null);
  const [result, setResult] = useState<RaffleDrawResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<DrawVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    const c = await getDrawCommit(raffleId);
    setCommit(c);
    if (c) {
      const r = await getDrawResult(c.id);
      setResult(r);
    } else {
      setResult(null);
    }
    setVerification(null);
    setLoading(false);
  };

  useEffect(() => {
    if (raffleId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleId]);

  const runVerification = async () => {
    if (!result || !commit) return;
    setVerifying(true);
    const v = await verifyDrawProof(
      result.server_seed,
      commit.server_seed_hash,
      commit.client_seed,
      commit.nonce,
      result.draw_index,
      result.participants_count
    );
    setVerification(v);
    setVerifying(false);
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className ?? ""}`} data-testid="draw-proof-panel">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold">Prova do Sorteio — Verificável</h3>
            <p className="text-[11px] text-muted-foreground">
              {raffleTitle ? `${raffleTitle} · ` : ""}Compromisso SHA-256 + apuramento HMAC-SHA256
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="gap-1">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-muted/50" />
      ) : !commit ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center">
          <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">
            O compromisso criptográfico é publicado automaticamente quando o sorteio começa.
            Voltará aqui depois para verificar a prova.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Compromisso (publicado antes do sorteio)</p>
              <TruncHash value={commit.server_seed_hash} />
              <p className="text-[10px] text-muted-foreground">SHA-256(server_seed) · {fmtTime(commit.committed_at)}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Semente do cliente / nonce</p>
              <TruncHash value={commit.client_seed} />
              <p className="text-[10px] text-muted-foreground">nonce {commit.nonce} · N {result?.participants_count ?? "—"} participantes</p>
            </div>
          </div>

          {commit.status === "committed" && !result && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Compromisso publicado e selado. A semente será revelada no momento do apuramento — ninguém pode trocá-la sem invalidar o hash acima.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">Semente revelada ({fmtTime(result.revealed_at)})</p>
                <TruncHash value={result.server_seed} />
                <p className="text-[10px] text-muted-foreground">Fórmula: {result.formula}</p>
              </div>

              {!verification ? (
                <Button onClick={runVerification} disabled={verifying} size="sm" className="w-full gap-2" data-testid="verify-draw-btn">
                  {verifying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  Verificar prova neste dispositivo
                </Button>
              ) : verification.pass ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3" data-testid="draw-verified-ok">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    <p className="font-bold">PROVA VERIFICADA ✓</p>
                    <p className="mt-0.5">
                      SHA-256 corresponde ao compromisso e o recálculo HMAC-SHA256 no teu browser deu o índice {verification.recomputedIndex} de {verification.participantsCount} — o mesmo bilhete vencedor.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3" data-testid="draw-verified-fail">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="text-xs text-destructive">
                    <p className="font-bold">Prova inválida</p>
                    <p className="mt-0.5">
                      {verification.seedMatchesCommit
                        ? `O recálculo deu índice ${verification.recomputedIndex}, diferente do publicado (${verification.expectedIndex}). Reporta imediatamente.`
                        : "A semente revelada NÃO corresponde ao compromisso publicado. Reporta imediatamente."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              Verificação feita 100% no teu dispositivo com Web Crypto (SHA-256/HMAC) — sem confiar no servidor.
            </p>
            {commit.status === "revealed" && <Badge variant="outline" className="ml-auto text-[10px]">revelado</Badge>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawProofPanel;
