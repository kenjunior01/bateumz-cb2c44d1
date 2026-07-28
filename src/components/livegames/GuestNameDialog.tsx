import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gamepad2, User } from "lucide-react";
import { toast } from "sonner";

interface GuestNameDialogProps {
  open: boolean;
  onNameSubmit: (name: string) => void;
  gameTitle: string;
  gameEmoji: string;
}

export default function GuestNameDialog({ open, onNameSubmit, gameTitle, gameEmoji }: GuestNameDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Digite seu nome (mínimo 2 letras)");
      return;
    }
    if (trimmed.length > 30) {
      toast.error("Nome muito longo (máximo 30 letras)");
      return;
    }
    setSubmitting(true);
    localStorage.setItem("bateumz_guest_name", trimmed);
    setTimeout(() => {
      onNameSubmit(trimmed);
      setName("");
      setSubmitting(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5" />
          <div className="relative p-6 pb-0">
            <DialogHeader className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl shadow-xl"
              >
                {gameEmoji}
              </motion.div>
              <DialogTitle className="text-xl font-bold">Jogar {gameTitle}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Digite seu nome para participar. Sem registo necessário!
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="relative p-6 pt-4">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Seu nome..."
                  className="pl-10 h-12 text-base rounded-xl border-2 focus:border-primary transition-colors"
                  autoFocus
                  maxLength={30}
                  disabled={submitting}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || name.trim().length < 2}
                className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl transition-all gap-2"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Gamepad2 className="h-5 w-5" />
                )}
                {submitting ? "Entrando..." : "Jogar Agora!"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Seu nome aparecerá no histórico do jogo
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
