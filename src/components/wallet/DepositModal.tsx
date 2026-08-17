import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, QrCode, Landmark, CreditCard, Globe, ArrowLeft, ArrowRight, Upload, CheckCircle2, Loader2, X, Smartphone, Zap, Bitcoin, Shield, Info, Wallet, FileText, ShoppingBag, MoreHorizontal } from "lucide-react";
import { getPaymentMethodsForCountry, groupMethodsByCategory, PAYMENT_CATEGORY_LABELS, createDepositRequest, formatMZN } from "@/lib/wallet";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onDepositComplete?: () => void;
}

const ICON_MAP: Record<string, typeof Phone> = {
  phone: Phone, "qr-code": QrCode, landmark: Landmark, "credit-card": CreditCard, globe: Globe, smartphone: Smartphone, zap: Zap, bitcoin: Bitcoin, wallet: Wallet, "file-text": FileText, "shopping-bag": ShoppingBag, "more-horizontal": MoreHorizontal,
};

const PRESETS = [100, 250, 500, 1000, 2500, 5000];
const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
};
const INP = "bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-emerald-400";

export default function DepositModal({ open, onOpenChange, userId, onDepositComplete }: Props) {
  const { region } = useRegionalTheme();
  const { format } = useCurrency();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const countryCode = region?.country_code || "MZ";
  const methodsForCountry = useMemo(() => getPaymentMethodsForCountry(countryCode), [countryCode]);
  const grouped = useMemo(() => groupMethodsByCategory(methodsForCountry), [methodsForCountry]);
  const filteredGrouped = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    const filtered = methodsForCountry.filter(m => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));
    return groupMethodsByCategory(filtered);
  }, [grouped, searchQuery, methodsForCountry]);
  const selectedMethod = methodsForCountry.find((m) => m.id === method);

  const reset = useCallback(() => {
    setStep(0); setDir(1); setMethod(""); setAmount(""); setReceipt(null);
    setReceiptName(""); setRef(""); setNotes(""); setLoading(false); setOk(false); setSearchQuery("");
  }, []);

  const handleClose = useCallback((v: boolean) => { if (!v) reset(); onOpenChange(v); }, [onOpenChange, reset]);
  const next = () => { setDir(1); setStep((s) => Math.min(s + 1, 4)); };
  const back = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setReceiptName(f.name);
    const r = new FileReader();
    r.onload = () => setReceipt(r.result as string);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    const n = parseFloat(amount);
    if (!method || !n || n <= 0) return;
    setLoading(true);
    const res = await createDepositRequest(userId, n, method, receipt ?? undefined, ref || undefined, notes || undefined);
    setLoading(false);
    if (res) { setOk(true); setStep(4); onDepositComplete?.(); }
  };

  const canGo = step === 0 ? !!method : step === 1 ? parseFloat(amount) > 0 : true;
  const stepTitles = ["Metodo de Pagamento", "Valor do Deposito", "Comprovativo", "Confirmacao"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-white/10 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg font-bold">
                {ok ? "Deposito Enviado" : stepTitles[step]}
              </DialogTitle>
              <Button variant="ghost" size="icon" className="btn-press text-white/60 hover:text-white hover:bg-white/10 h-8 w-8" onClick={() => handleClose(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!ok && (
              <div className="flex items-center gap-2 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-400 w-8" : "bg-white/20 w-4"}`} />
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="relative min-h-[460px] overflow-y-auto max-h-[70vh]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }} className="px-6 pb-6">

                {step === 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pesquisar metodo de pagamento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                    {Object.entries(filteredGrouped).map(([cat, methods]) => {
                      const catInfo = PAYMENT_CATEGORY_LABELS[cat];
                      const CatIcon = ICON_MAP[catInfo?.icon] ?? MoreHorizontal;
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-2 mt-2">
                            <CatIcon className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{catInfo?.label || cat}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            {methods.map((pm) => {
                              const Ic = ICON_MAP[pm.icon] ?? Globe;
                              const a = method === pm.id;
                              return (
                                <button key={pm.id} onClick={() => setMethod(pm.id)}
                                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 cursor-pointer bg-gradient-to-br ${pm.color || "from-gray-500 to-gray-600"} ${a ? "border-white ring-2 ring-white/40 scale-[1.03]" : "border-white/10 opacity-75 hover:opacity-100"}`}>
                                  <Ic className="h-5 w-5 text-white drop-shadow" />
                                  <span className="text-white text-[11px] font-semibold leading-tight text-center">{pm.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(filteredGrouped).length === 0 && (
                      <div className="text-center py-8 text-white/40 text-sm">Nenhum metodo encontrado</div>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {PRESETS.map((v) => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className={`py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${amount === String(v) ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                          {format(v)}
                        </button>
                      ))}
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs mb-1 block">Outro valor</Label>
                      <Input type="number" min={1} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${INP} input-focus-glow`} />
                    </div>
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-center text-emerald-400 font-bold text-lg">{format(parseFloat(amount))}</p>
                    )}
                    {selectedMethod?.instructions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative rounded-xl overflow-hidden"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${selectedMethod.color || "from-gray-500 to-gray-600"}`} />
                        <div className="ml-4 p-4 bg-white/5 rounded-r-xl border border-white/10">
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-br ${selectedMethod.color || "from-gray-500 to-gray-600"} shadow-lg`}>
                              <Info className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white/90 text-sm font-medium mb-1">{selectedMethod.label}</p>
                              <p className="text-white/60 text-xs leading-relaxed">
                                {selectedMethod.instructions.replace("{amount}", amount && parseFloat(amount) > 0 ? format(parseFloat(amount)) : "0,00")}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-4 space-y-4">
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-emerald-400/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById("deposit-receipt")?.click()}>
                      <input id="deposit-receipt" type="file" accept="image/*" className="hidden" onChange={onFile} />
                      <Upload className="h-10 w-10 mx-auto text-white/40 mb-3" />
                      <p className="text-white/80 text-sm font-medium">{receiptName || "Clique para carregar o comprovativo"}</p>
                      <p className="text-white/40 text-xs mt-1">PNG, JPG ate 5MB</p>
                    </div>
                    {receipt && (
                      <div className="relative rounded-lg overflow-hidden border border-white/10">
                        <img src={receipt} alt="Comprovativo" className="w-full h-40 object-cover" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full"
                          onClick={() => { setReceipt(null); setReceiptName(""); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <div>
                      <Label className="text-white/70 text-xs mb-1 block">Numero de referencia (opcional)</Label>
                      <Input placeholder="Ex: TRF-2024-001" value={ref} onChange={(e) => setRef(e.target.value)} className={`${INP} input-focus-glow`} />
                    </div>
                    <div>
                      <Label className="text-white/70 text-xs mb-1 block">Notas (opcional)</Label>
                      <Textarea placeholder="Alguma informacao adicional..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${INP} input-focus-glow resize-none`} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                      <Row label="Metodo" value={selectedMethod?.label ?? method} />
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Valor</span>
                        <span className="text-emerald-400 font-bold text-lg">{format(parseFloat(amount) || 0)}</span>
                      </div>
                      {ref && <Row label="Referencia" value={ref} />}
                      <Row label="Comprovativo" value={receipt ? "Anexado" : "Nao anexado"} />
                    </div>
                    <p className="text-white/40 text-xs text-center">O seu pedido sera analisado e o saldo creditado apos confirmacao.</p>
                  </div>
                )}

                {step === 4 && ok && (
                  <div className="mt-8 flex flex-col items-center text-center gap-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                      <CheckCircle2 className="h-20 w-20 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-white text-xl font-bold">Pedido Enviado!</h3>
                    <p className="text-white/60 text-sm max-w-xs">O seu deposito de {format(parseFloat(amount) || 0)} via {selectedMethod?.label} foi registado. Sera analisado em breve.</p>
                    <Button onClick={() => handleClose(false)} className="btn-press mt-2 bg-emerald-500 hover:bg-emerald-600 text-white">Fechar</Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {!ok && step < 4 && (
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={back} disabled={step === 0}
                className="btn-press text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {step < 3 ? (
                <Button onClick={next} disabled={!canGo} className="btn-press bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40">
                  Proximo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading || !canGo} className="btn-press bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enviar Pedido
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
