import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Mail, Lock, User, Building2, ArrowLeft, Gift, Phone, MapPin,
  Sparkles, PartyPopper, Rocket, ChevronRight, ChevronLeft, Heart, Star, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/provinces";
import { playPopSound } from "@/lib/sounds";

import mascotHappy from "@/assets/mascot-happy.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotWinner from "@/assets/mascot-winner.png";

const STEP_COUNT = 4;

const INTERESTS = [
  { id: "tech", label: "📱 Tecnologia", emoji: "📱" },
  { id: "fashion", label: "👗 Moda", emoji: "👗" },
  { id: "travel", label: "✈️ Viagens", emoji: "✈️" },
  { id: "sports", label: "⚽ Desporto", emoji: "⚽" },
  { id: "food", label: "🍕 Comida", emoji: "🍕" },
  { id: "music", label: "🎵 Música", emoji: "🎵" },
  { id: "gaming", label: "🎮 Jogos", emoji: "🎮" },
  { id: "beauty", label: "💄 Beleza", emoji: "💄" },
  { id: "cars", label: "🚗 Carros", emoji: "🚗" },
  { id: "home", label: "🏠 Casa", emoji: "🏠" },
  { id: "health", label: "💪 Saúde", emoji: "💪" },
  { id: "education", label: "📚 Educação", emoji: "📚" },
];

const CONFETTI_EMOJIS = ["🎉", "🎊", "✨", "🌟", "🎈", "🎁", "🏆", "💎"];

function ConfettiParticle({ emoji, delay }: { emoji: string; delay: number }) {
  return (
    <motion.span
      className="absolute text-2xl pointer-events-none"
      initial={{ x: Math.random() * 300 - 150, y: -20, opacity: 1, rotate: 0 }}
      animate={{ y: 400, opacity: 0, rotate: Math.random() * 360 }}
      transition={{ duration: 2 + Math.random(), delay, ease: "easeIn" }}
    >
      {emoji}
    </motion.span>
  );
}

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [accountType, setAccountType] = useState<"user" | "business">("user");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  const goNext = () => {
    setDirection(1);
    setStep(s => Math.min(s + 1, STEP_COUNT - 1));
    playPopSound();
  };
  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    playPopSound();
  };

  const canProceed = () => {
    if (step === 0) return accountType !== null;
    if (step === 1) return name.length >= 2 && email.includes("@") && password.length >= 6;
    if (step === 2) return true; // optional data
    if (step === 3) return true; // interests are optional
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, {
      display_name: name,
      role: accountType,
      company_name: accountType === "business" ? companyName : undefined,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Process referral if ref code exists
      if (refCode) {
        try {
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("referral_code", refCode)
            .single();
          if (referrerProfile) {
            localStorage.setItem("sortex_ref", refCode);
          }
        } catch {}
      }
      // Update profile with extra data after signup
      // This will be done after email confirmation via the profile page
      if (phone || province || city || interests.length > 0) {
        localStorage.setItem("bateu_signup_extra", JSON.stringify({ phone, province, city, interests }));
      }
      setSuccess(true);
      playPopSound();
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const mascotForStep = step === 0 ? mascotHappy : step === 1 ? mascotExcited : step === 2 ? mascotHappy : mascotWinner;
  const mascotMessage = step === 0
    ? "Vamos começar! 🎉 Escolhe o teu tipo de conta!"
    : step === 1
    ? "Excelente escolha! Agora os teus dados! 🚀"
    : step === 2
    ? "Quase lá! Conta-nos mais sobre ti! 😊"
    : "Último passo! O que te interessa? ✨";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
        {/* Confetti */}
        <div className="absolute inset-0 flex justify-center">
          {CONFETTI_EMOJIS.map((e, i) => (
            <ConfettiParticle key={i} emoji={e} delay={i * 0.15} />
          ))}
          {CONFETTI_EMOJIS.map((e, i) => (
            <ConfettiParticle key={`b-${i}`} emoji={e} delay={1 + i * 0.1} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 12 }}
          className="glass rounded-3xl p-8 max-w-md text-center relative z-10">
          <motion.img src={mascotWinner} alt="Bateu" className="h-24 w-24 mx-auto mb-4" width={96} height={96}
            animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <h2 className="font-display text-2xl font-bold text-foreground">Bem-vindo à família! 🎊</h2>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground mt-3">
            Enviámos um link de confirmação para <strong className="text-foreground">{email}</strong>
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-foreground">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span>Verifica o teu email para ativar a conta e começar a ganhar prémios!</span>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
              Ir para o login <ChevronRight className="h-3 w-3" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <motion.div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Infinity, duration: 6 }} />
        <motion.div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }} transition={{ repeat: Infinity, duration: 8 }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg z-10">
        {/* Header with mascot */}
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/assets/bateu-logo.png" alt="Bateu" className="h-10 w-10 rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-display text-2xl font-bold text-foreground">Bateu</span>
          </Link>

          {/* Mascot */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.img src={mascotForStep} alt="Bateu" className="h-16 w-16" width={64} height={64}
              key={step}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
              transition={{ type: "spring", damping: 10, y: { repeat: Infinity, duration: 2 } }} />
            <motion.div key={`msg-${step}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl bg-card border border-border px-4 py-2 text-xs text-foreground max-w-[200px] relative">
              {mascotMessage}
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-card border-l border-b border-border" />
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6 px-4">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <motion.div key={i} className="h-1.5 flex-1 rounded-full overflow-hidden bg-secondary">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              />
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          {/* Step label */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Passo {step + 1} de {STEP_COUNT}
            </span>
            {step > 0 && (
              <button onClick={goBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-3 w-3" /> Voltar
              </button>
            )}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 0: Account Type */}
            {step === 0 && (
              <motion.div key="step0" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Quem és tu? 🤔</h2>
                <p className="text-sm text-muted-foreground mb-6">Escolhe o tipo de conta que mais se adequa a ti</p>

                <div className="grid gap-3">
                  <motion.button onClick={() => { setAccountType("user"); playPopSound(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-4 rounded-2xl p-5 text-left transition-all border-2 ${
                      accountType === "user" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${accountType === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">🎯 Participante</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quero participar em sorteios, ganhar prémios e acumular pontos!</p>
                      {accountType === "user" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 mt-2 text-primary text-[10px] font-medium">
                          <Check className="h-3 w-3" /> Selecionado
                        </motion.div>
                      )}
                    </div>
                  </motion.button>

                  <motion.button onClick={() => { setAccountType("business"); playPopSound(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-4 rounded-2xl p-5 text-left transition-all border-2 ${
                      accountType === "business" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${accountType === "business" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">🏢 Empresa</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quero criar sorteios para promover o meu negócio e engajar clientes!</p>
                      {accountType === "business" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 mt-2 text-primary text-[10px] font-medium">
                          <Check className="h-3 w-3" /> Selecionado
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                </div>

                {/* Google Sign Up */}
                <div className="mt-5">
                  <Button variant="outline" className="w-full h-10 gap-3 border-border hover:bg-secondary"
                    onClick={handleGoogleSignUp} disabled={googleLoading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {googleLoading ? "A conectar..." : "Continuar com Google"}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Credentials */}
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Os teus dados 📝</h2>
                <p className="text-sm text-muted-foreground mb-5">Informações essenciais para a tua conta</p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te chamas?" required
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  </div>

                  {accountType === "business" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Nome da Empresa</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome do negócio" required
                          className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                    {password.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 mt-2">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3 ? (password.length >= 12 ? "bg-primary" : password.length >= 8 ? "bg-accent" : "bg-destructive") : "bg-secondary"
                          }`} />
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Personal Info */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Onde estás? 📍</h2>
                <p className="text-sm text-muted-foreground mb-5">Ajuda-nos a mostrar sorteios perto de ti <span className="text-[10px]">(opcional)</span></p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84 XXX XXXX"
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Província</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); }}
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none">
                        <option value="">Selecione...</option>
                        {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {province && CITIES_BY_PROVINCE[province] && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Cidade</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <select value={city} onChange={(e) => setCity(e.target.value)}
                          className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none">
                          <option value="">Selecione...</option>
                          {CITIES_BY_PROVINCE[province].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {refCode && (
                    <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5">
                      <Gift className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-xs text-foreground">Convite de amigo! Ambos ganham <span className="font-bold text-primary">50 pontos</span> 🎁</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Interests */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">O que te interessa? ✨</h2>
                <p className="text-sm text-muted-foreground mb-5">Vamos personalizar os sorteios para ti <span className="text-[10px]">(opcional)</span></p>

                <div className="grid grid-cols-3 gap-2">
                  {INTERESTS.map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => toggleInterest(item.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-3 text-[11px] font-medium transition-all border-2 ${
                        interests.includes(item.id)
                          ? "border-primary bg-primary/10 text-foreground scale-105"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg">{item.emoji}</span>
                      <span>{item.label.split(" ").slice(1).join(" ")}</span>
                      {interests.includes(item.id) && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Heart className="h-3 w-3 text-primary fill-primary" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {interests.length > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[10px] text-muted-foreground mt-3">
                    {interests.length} {interests.length === 1 ? "interesse" : "interesses"} selecionados 💖
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 mt-4">{error}</motion.p>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex gap-3">
            {step < STEP_COUNT - 1 ? (
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={goNext} disabled={!canProceed()}
                className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-40 flex items-center justify-center gap-2">
                Continuar <ChevronRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={handleSubmit} disabled={loading || !canProceed()}
                className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-40 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    A criar conta...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" /> Criar Conta!
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Skip optional steps */}
          {step >= 2 && step < STEP_COUNT - 1 && (
            <button onClick={goNext} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
              Pular este passo →
            </button>
          )}
          {step === STEP_COUNT - 1 && (
            <button onClick={handleSubmit} disabled={loading}
              className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
              Pular e criar conta →
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
