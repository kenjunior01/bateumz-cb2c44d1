import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ExternalLink, Copy, Check, X, Lock, Hash, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  raffleId: string;
  raffleTitle: string;
}

interface Verification {
  tx_hash: string;
  block_number: number;
  network: string;
  winner_ticket_number: number | null;
  seed_data: Record<string, unknown> | null;
  verified_at: string;
}

export default function BlockchainVerification({ raffleId, raffleTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!open || checked) return;
    const fetchVerification = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blockchain_verifications")
        .select("tx_hash, block_number, network, winner_ticket_number, seed_data, verified_at")
        .eq("raffle_id", raffleId)
        .maybeSingle();
      if (data) setVerification(data as unknown as Verification);
      setChecked(true);
      setLoading(false);
    };
    fetchVerification();
  }, [open, raffleId, checked]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate deterministic hash for unverified raffles (preview)
  const previewHash = `0x${raffleId.replace(/-/g, "").slice(0, 40)}`;
  const displayData = verification || {
    tx_hash: previewHash,
    block_number: Math.floor(parseInt(raffleId.slice(0, 8), 16) % 9000000 + 1000000),
    network: "polygon",
    winner_ticket_number: null,
    seed_data: null,
    verified_at: null,
  };

  const explorerUrl = displayData.network === "polygon"
    ? `https://polygonscan.com/tx/${displayData.tx_hash}`
    : `https://etherscan.io/tx/${displayData.tx_hash}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Shield className="h-4 w-4" />
        Verificar Blockchain
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">Verificação Blockchain</h3>
                    <p className="text-xs text-muted-foreground">Resultados imutáveis e transparentes</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-secondary">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">A verificar na blockchain...</p>
                </div>
              ) : (
                <>
                  {/* Status */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 rounded-xl border p-4 mb-5 ${
                      verification
                        ? "bg-primary/10 border-primary/20"
                        : "bg-accent/10 border-accent/20"
                    }`}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        verification ? "bg-primary/20" : "bg-accent/20"
                      }`}
                    >
                      {verification ? (
                        <Lock className="h-4 w-4 text-primary" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-accent" />
                      )}
                    </motion.div>
                    <div>
                      {verification ? (
                        <>
                          <p className="text-sm font-semibold text-primary">Verificado ✓</p>
                          <p className="text-xs text-muted-foreground">Resultado registado na blockchain</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-accent">Pendente</p>
                          <p className="text-xs text-muted-foreground">A verificação será registada após o sorteio</p>
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* Winner info */}
                  {verification?.winner_ticket_number && (
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 mb-4">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Bilhete Vencedor</label>
                      <p className="text-2xl font-display font-bold text-primary">#{verification.winner_ticket_number}</p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3 mb-6">
                    <div className="rounded-xl bg-secondary/50 p-4">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Sorteio</label>
                      <p className="text-sm font-medium text-foreground">{raffleTitle}</p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-4">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Transaction Hash</label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-primary font-mono flex-1 truncate">{displayData.tx_hash}</code>
                        <button onClick={() => handleCopy(displayData.tx_hash)} className="shrink-0 rounded-lg p-1.5 hover:bg-secondary">
                          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-secondary/50 p-4">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Bloco</label>
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-mono text-foreground">{displayData.block_number.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-secondary/50 p-4">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Rede</label>
                        <span className="text-sm font-medium text-foreground capitalize">{displayData.network}</span>
                      </div>
                    </div>

                    {displayData.verified_at && (
                      <div className="rounded-xl bg-secondary/50 p-4">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Timestamp</label>
                        <span className="text-xs font-mono text-muted-foreground">
                          {new Date(displayData.verified_at).toLocaleString("pt-MZ")}
                        </span>
                      </div>
                    )}

                    {/* Seed data for transparency */}
                    {verification?.seed_data && (
                      <div className="rounded-xl bg-secondary/50 p-4">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Dados de Verificação</label>
                        <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto">
                          {JSON.stringify(verification.seed_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {verification ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver no {displayData.network === "polygon" ? "PolygonScan" : "Etherscan"}
                    </a>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      A hash de verificação será gerada automaticamente após o sorteio ser realizado.
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
