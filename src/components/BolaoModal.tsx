import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, X, Link2, Plus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  raffleId: string;
  raffleTitle: string;
  open: boolean;
  onClose: () => void;
}

export default function BolaoModal({ raffleId, raffleTitle, open, onClose }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("Meu Bolão");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("boloes")
      .insert({ raffle_id: raffleId, creator_id: user.id, name })
      .select("invite_code")
      .single();
    if (error) {
      toast.error("Erro ao criar bolão");
      setLoading(false);
      return;
    }
    // Join as member - need bolao id first
    const { data: bolaoData } = await supabase
      .from("boloes")
      .select("id")
      .eq("invite_code", data.invite_code)
      .single();
    if (bolaoData) {
      await supabase.from("bolao_members").insert({
        bolao_id: bolaoData.id,
        user_id: user.id,
      });
    }
    
    setCreatedCode(data.invite_code);
    toast.success("Bolão criado com sucesso!");
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setLoading(true);
    const { data: bolao } = await supabase
      .from("boloes")
      .select("id, raffle_id, status")
      .eq("invite_code", joinCode.trim())
      .single();
    if (!bolao || bolao.status !== "open") {
      toast.error("Código inválido ou bolão fechado");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("bolao_members").insert({
      bolao_id: bolao.id,
      user_id: user.id,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Já estás neste bolão" : "Erro ao entrar");
    } else {
      toast.success("Entrou no bolão com sucesso!");
    }
    setLoading(false);
  };

  const shareLink = createdCode ? `${window.location.origin}/marketplace?bolao=${createdCode}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Bolão</h3>
                  <p className="text-xs text-muted-foreground">{raffleTitle}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setTab("create"); setCreatedCode(null); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  tab === "create" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="h-4 w-4" /> Criar
              </button>
              <button
                onClick={() => setTab("join")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  tab === "join" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="h-4 w-4" /> Entrar
              </button>
            </div>

            {tab === "create" ? (
              createdCode ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Código do Bolão</p>
                    <p className="font-display text-3xl font-bold text-primary tracking-wider">{createdCode}</p>
                  </div>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="text-xs bg-secondary" />
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Partilhe o código ou link com os seus amigos!</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Nome do Bolão</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bolão da galera" className="bg-secondary" />
                  </div>
                  <Button onClick={handleCreate} disabled={loading} className="w-full gap-2 glow-primary">
                    {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <Link2 className="h-4 w-4" />}
                    Criar Bolão
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Código do Bolão</label>
                  <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Ex: a3f7b2c9" className="bg-secondary font-mono text-center text-lg tracking-wider" />
                </div>
                <Button onClick={handleJoin} disabled={loading || !joinCode.trim()} className="w-full gap-2 glow-primary">
                  {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <UserPlus className="h-4 w-4" />}
                  Entrar no Bolão
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
