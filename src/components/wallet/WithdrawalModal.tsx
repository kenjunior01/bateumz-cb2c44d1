import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, QrCode, Landmark, Globe, ArrowLeft, ArrowRight, CheckCircle2, Loader2, X, Wallet } from "lucide-react";
import { WITHDRAWAL_METHODS, createWithdrawalRequest, getBalance, formatMZN } from "@/lib/wallet";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  currentBalance: number;
  onWithdrawalComplete?: () => void;
}

const ICON_MAP: Record<string, typeof Phone> = {
  phone: Phone, "qr-code": QrCode, landmark: Landmark, globe: Globe,
};
const PRESETS = [100, 250, 500, 1000, 2500];
const TITLES = ["Metodo de Levantamento", "Valor a Levantar", "Destino", "Confirmacao"];
const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
};
const INP = "bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-amber-400";

export default function WithdrawalModal({ open, onOpenChange, userId, currentBalance, onWithdrawalComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  const reset = useCallback(() => {
    setStep(0); setDir(1); setMethod(""); setAmount(""); setDest(""); setLoading(false); setOk(false);
  }, []);

  const handleClose = useCallback((v: boolean) => { if (!v) reset(); onOpenChange(v); }, [onOpenChange, reset]);
  const next = () => { setDir(1); setStep((s) => Math.min(s + 1, 4)); };
  const back = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const selectedMethod = WITHDRAWAL_METHODS.find((m) => m.id === method);
  const numAmount = parseFloat(amount) || 0;
  const canGo = step === 0 ? !!method : step === 1 ? numAmount > 0 && numAmount <= currentBalance : step === 2 ? dest.trim().length > 0 : true;

  const submit = async () => {
    if (!method || numAmount <= 0 || !dest) return;
    setLoading(true);
    const res = await createWithdrawalRequest(userId, numAmount, method, dest.trim());
    setLoading(false);
    if (res) { setOk(true); setStep(4); onWithdrawalComplete?.(); }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-amber-950/90 to-slate-900/95 border border-amber-500/20 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg font-bold">
                {ok ? "Levantamento Enviado" : TITLES[step]}
              </DialogTitle>
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => handleClose(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!ok && (
              <div className="flex items-center gap-2 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-amber-400 w-8" : "bg-white/20 w-4"}`} />
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="relative min-h-[340px] overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }} className="px-6 pb-6">

                {step === 0 && (
                  <div className="mt-4 space-y-2">
                    {WITHDRAWAL_METHODS.map((wm) => {
                      const Ic = ICON_MAP[wm.icon] ?? Globe;
                      const active = method === wm.id;
                      return (
                        <button key={wm.id} onClick={() => setMethod(wm.id)}
                          className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all duration-200 cursor-pointer ${active ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/60 ring-2 ring-amber-400/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${active ? "from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30" : "from-white/10 to-white/5"}`}>
                            <Ic className="h-5 w-5 text-white" />
                          </div>
                          <span className={`text-sm font-semibold ${active ? "text-amber-300" : "text-white/80"}`}>{wm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-white/60 text-xs">
                        <Wallet className="h-4 w-4" />
                        <span>Disponivel</span>
                      </div>
                      <span className="text-amber-400 font-bold text-sm">{formatMZN(currentBalance)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESETS.map((v) => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className={`py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${amount === String(v) ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                          {formatMZN(v)}
                        </button>
                      ))}
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs mb-1 block">Outro valor (MZN)</Label>
                      <Input type="number" min={1} max={currentBalance} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={INP} />
                    </div>
                    {amount && (
                      <p className={`text-center font-bold text-lg ${numAmount > currentBalance ? "text-red-400" : "text-amber-400"}`}>
                        {numAmount > currentBalance ? "Saldo insuficiente" : formatMZN(numAmount)}
                      </p>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedMethod && (() => { const Ic = ICON_MAP[selectedMethod.icon] ?? Globe; return <Ic className="h-5 w-5 text-amber-400" />; })()}
                      <span className="text-white font-semibold text-sm">{selectedMethod?.label}</span>
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs mb-1 block">Destino</Label>
                      <Input placeholder={selectedMethod?.placeholder ?? ""} value={dest} onChange={(e) => setDest(e.target.value)} className={INP} />
                    </div>
                    <p className="text-white/40 text-xs text-center">O levantamento sera enviado para este destino.</p>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                      <Row label="Metodo" value={selectedMethod?.label ?? method} />
                      <Row label="Valor" value={formatMZN(numAmount)} highlight />
                      <Row label="Destino" value={dest} />
                    </div>
                    <p className="text-white/40 text-xs text-center">O pedido sera processado em 1-3 dias uteis.</p>
                  </div>
                )}

                {step === 4 && ok && (
                  <div className="mt-8 flex flex-col items-center text-center gap-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                      <CheckCircle2 className="h-20 w-20 text-amber-400" />
                    </motion.div>
                    <h3 className="text-white text-xl font-bold">Pedido Enviado!</h3>
                    <p className="text-white/60 text-sm max-w-xs">O seu levantamento de {formatMZN(numAmount)} via {selectedMethod?.label} foi registado com sucesso.</p>
                    <Button onClick={() => handleClose(false)} className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">Fechar</Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {!ok && step < 4 && (
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={back} disabled={step === 0}
                className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {step < 3 ? (
                <Button onClick={next} disabled={!canGo} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-40">
                  Proximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading || !canGo} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-40">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className={highlight ? "text-amber-400 font-bold text-lg" : "text-white font-medium"}>{value}</span>
    </div>
  );
}
