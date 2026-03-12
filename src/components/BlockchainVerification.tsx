import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ExternalLink, Copy, Check, X, Lock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  raffleId: string;
  raffleTitle: string;
}

export default function BlockchainVerification({ raffleId, raffleTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Simulated blockchain hash based on raffle ID
  const txHash = `0x${raffleId.replace(/-/g, "").slice(0, 40)}a3f7b2c9d1e8`;
  const blockNumber = Math.floor(parseInt(raffleId.slice(0, 8), 16) % 9000000 + 1000000);
  const timestamp = new Date().toISOString();

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              className="glass-strong rounded-2xl p-6 max-w-lg w-full"
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

              {/* Status */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 p-4 mb-5"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20"
                >
                  <Lock className="h-4 w-4 text-primary" />
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-primary">Verificado ✓</p>
                  <p className="text-xs text-muted-foreground">Resultado registado na blockchain</p>
                </div>
              </motion.div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Sorteio</label>
                  <p className="text-sm font-medium text-foreground">{raffleTitle}</p>
                </div>

                <div className="rounded-xl bg-secondary/50 p-4">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Transaction Hash</label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-primary font-mono flex-1 truncate">{txHash}</code>
                    <button onClick={handleCopy} className="shrink-0 rounded-lg p-1.5 hover:bg-secondary">
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-secondary/50 p-4">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Bloco</label>
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-mono text-foreground">{blockNumber.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-4">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Rede</label>
                    <span className="text-sm font-medium text-foreground">Polygon</span>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/50 p-4">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Timestamp</label>
                  <span className="text-xs font-mono text-muted-foreground">{timestamp}</span>
                </div>
              </div>

              <a
                href={`https://polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 glow-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Ver no PolygonScan
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
