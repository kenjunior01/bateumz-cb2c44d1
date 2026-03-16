import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Wifi, WifiOff, Zap, Shield, Star, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const benefits = [
    { icon: Zap, title: "Ultra rápido", desc: "Carrega instantaneamente, mesmo em redes lentas" },
    { icon: WifiOff, title: "Funciona offline", desc: "Acesse seus sorteios mesmo sem internet" },
    { icon: Shield, title: "Seguro e privado", desc: "Seus dados protegidos com encriptação" },
    { icon: Star, title: "Notificações", desc: "Receba alertas de novos sorteios e resultados" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                <Download className="h-3 w-3 text-accent-foreground" />
              </div>
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">
            Instale o SORTEX no seu telemóvel
          </h1>
          <p className="text-lg text-muted-foreground">
            Tenha a experiência completa de sorteios premium direto no seu ecrã inicial. Sem App Store, sem espera.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {benefits.map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="glass h-full">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="max-w-md mx-auto">
          <Card className="glass border-primary/20">
            <CardContent className="p-8 text-center">
              {installed ? (
                <div>
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">App instalada!</h2>
                  <p className="text-sm text-muted-foreground">O SORTEX já está no seu ecrã inicial. Abra e comece a participar!</p>
                </div>
              ) : isIOS ? (
                <div>
                  <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-3">Como instalar no iPhone</h2>
                  <ol className="text-left text-sm text-muted-foreground space-y-3">
                    <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Toque no botão de partilha (ícone ↑) no Safari</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Role e toque em "Adicionar ao Ecrã Inicial"</li>
                    <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Toque "Adicionar" para confirmar</li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                <div>
                  <Download className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">Pronto para instalar</h2>
                  <p className="text-sm text-muted-foreground mb-6">Um toque e o SORTEX fica no seu telemóvel</p>
                  <Button onClick={handleInstall} size="lg" className="w-full gap-2 glow-primary">
                    <Download className="h-5 w-5" /> Instalar SORTEX
                  </Button>
                </div>
              ) : (
                <div>
                  <Wifi className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">Abra no navegador do telemóvel</h2>
                  <p className="text-sm text-muted-foreground">
                    Acesse <span className="text-primary font-semibold">somoz.lovable.app</span> no Chrome ou Safari do seu telemóvel para instalar a app.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
