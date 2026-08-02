import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Mail, Lock, User, Building2, ArrowLeft, Gift, Phone, MapPin,
  Sparkles, PartyPopper, Rocket, ChevronRight, ChevronLeft, Heart, Star, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/provinces";
import { COUNTRIES, getRegions } from "@/lib/regions";
import { playPopSound } from "@/lib/sounds";
import { describeSignUpError } from "@/lib/authErrors";

import mascotHappy from "@/assets/mascot-happy.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotWinner from "@/assets/mascot-winner.png";

const STEP_COUNT = 4;

const INTERESTS = [
  { id: "tech", label: "📱 Tech", emoji: "📱" },
  { id: "fashion", label: "👗 Fashion", emoji: "👗" },
  { id: "travel", label: "✈️ Travel", emoji: "✈️" },
  { id: "sports", label: "⚽ Sports", emoji: "⚽" },
  { id: "food", label: "🍕 Food", emoji: "🍕" },
  { id: "music", label: "🎵 Music", emoji: "🎵" },
  { id: "gaming", label: "🎮 Gaming", emoji: "🎮" },
  { id: "beauty", label: "💄 Beauty", emoji: "💄" },
  { id: "cars", label: "🚗 Cars", emoji: "🚗" },
  { id: "home", label: "🏠 Home", emoji: "🏠" },
  { id: "health", label: "💪 Health", emoji: "💪" },
  { id: "education", label: "📚 Education", emoji: "📚" },
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
  const [country, setCountry] = useState("MZ");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [autoSignedIn, setAutoSignedIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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

  const passwordStrong = (pw: string) =>
    pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

  const canProceed = () => {
    if (step === 0) return accountType !== null;
    if (step === 1)
      return (
        name.length >= 2 &&
        email.includes("@") &&
        passwordStrong(password) &&
        (accountType !== "business" || companyName.trim().length >= 2)
      );
    if (step === 2) return true; // optional data
    if (step === 3) return true; // interests are optional
    return true;
  };

  const friendlyAuthError = (raw: string) => describeSignUpError(raw).message;

  const handleSubmit = async () => {
    setError("");
    if (!passwordStrong(password)) {
      setError("Password needs at least 8 characters, including letters and numbers.");
      setDirection(-1);
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      const { error, session } = await signUp(email, password, {
        display_name: name,
        role: accountType,
        company_name: accountType === "business" ? companyName : undefined,
      });
      setLoading(false);
      if (error) {
        setError(friendlyAuthError(error.message));
      } else if (!session && !error) {
        // Email confirmation required - Supabase returns no session
        setAutoSignedIn(false);
        setSuccess(true);
        playPopSound();
      } else {
      if (refCode) {
        try {
          const { data: referrerProfile } = await supabase
            .from("profiles_public")
            .select("user_id")
            .eq("referral_code", refCode)
            .single();
          if (referrerProfile) {
            localStorage.setItem("sortex_ref", refCode);
          }
        } catch {}
      }
      localStorage.setItem(
        "bateu_signup_extra",
        JSON.stringify({
          phone,
          province,
          city,
          interests,
          company_name: accountType === "business" ? companyName : undefined,
        })
      );
      setAutoSignedIn(!!session);
      setSuccess(true);
      playPopSound();
      }
    } catch (err: any) {
      setLoading(false);
      setError(describeSignUpError(err?.message).message);
      console.error("Signup error:", err);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError("Could not connect with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError("Could not connect with Apple. Please try again.");
      setAppleLoading(false);
    }
  };

  const mascotForStep = step === 0 ? mascotHappy : step === 1 ? mascotExcited : step === 2 ? mascotHappy : mascotWinner;
  const mascotMessage = step === 0
    ? "Let's get started! 🎉 Pick your account type."
    : step === 1
    ? "Great choice! Now your details 🚀"
    : step === 2
    ? "Almost there! Tell us a bit about you 😊"
    : "Last step! What are you into? ✨";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
        <div className="absolute inset-0 flex justify-center">
          {CONFETTI_EMOJIS.map((e, i) => (
            <ConfettiParticle key={i} emoji={e} delay={i * 0.15} />
          ))}
          {CONFETTI_EMOJIS.map((e, i) => (
            <ConfettiParticle key={`b-${i}`} emoji={e} delay={1 + i * 0.1} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 12 }}
          data-testid="signup-success"
          data-auto-signed-in={autoSignedIn ? "true" : "false"}
          className="glass rounded-3xl p-8 max-w-md text-center relative z-10">
          <motion.img src={mascotWinner} alt="Bateu" className="h-24 w-24 mx-auto mb-4" width={96} height={96}
            animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <h2 className="font-display text-2xl font-bold text-foreground">Welcome to Bateu! 🎊</h2>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground mt-3">
            {autoSignedIn
              ? <>Your account <strong className="text-foreground">{email}</strong> is ready.</>
              : <>We sent a confirmation link to <strong className="text-foreground">{email}</strong></>}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-foreground">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span>
                {autoSignedIn
                  ? "You're signed in — start joining raffles and winning prizes!"
                  : "Check your email to activate your account and start winning prizes!"}
              </span>
            </div>
            <Link
              to={autoSignedIn ? (accountType === "business" ? "/dashboard" : "/profile") : "/login"}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              {autoSignedIn ? "Go to my dashboard" : "Go to login"} <ChevronRight className="h-3 w-3" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Infinity, duration: 6 }} />
        <motion.div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }} transition={{ repeat: Infinity, duration: 8 }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg z-10">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/assets/bateu-logo.png" alt="Bateu" className="h-10 w-10 rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-display text-2xl font-bold text-foreground">Bateu</span>
          </Link>

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
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Step {step + 1} of {STEP_COUNT}
            </span>
            {step > 0 && (
              <button onClick={goBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            )}
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div key="step0" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Who are you? 🤔</h2>
                <p className="text-sm text-muted-foreground mb-6">Choose the account type that fits you best</p>

                <div className="grid gap-3">
                  <motion.button onClick={() => { setAccountType("user"); playPopSound(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-4 rounded-2xl p-5 text-left transition-all border-2 ${
                      accountType === "user" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${accountType === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">🎯 Participant</p>
                      <p className="text-xs text-muted-foreground mt-0.5">I want to join raffles, win prizes and earn points!</p>
                      {accountType === "user" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 mt-2 text-primary text-[10px] font-medium">
                          <Check className="h-3 w-3" /> Selected
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
                      <p className="font-bold text-foreground text-sm">🏢 Business</p>
                      <p className="text-xs text-muted-foreground mt-0.5">I want to run raffles to promote my business and engage customers!</p>
                      {accountType === "business" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 mt-2 text-primary text-[10px] font-medium">
                          <Check className="h-3 w-3" /> Selected
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="text-center mb-2">
                    <p className="text-sm font-semibold text-foreground">Quick sign up</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Use your Google or Apple account</p>
                  </div>
                  <Button variant="outline" className="w-full h-10 gap-3 border-border hover:bg-secondary rounded-xl"
                    onClick={handleGoogleSignUp} disabled={googleLoading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {googleLoading ? "A conectar..." : "Continue with Google"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 gap-3 rounded-xl bg-black text-white border-black hover:bg-neutral-800 dark:bg-card dark:text-foreground dark:border-border dark:hover:bg-secondary"
                    onClick={handleAppleSignUp} disabled={appleLoading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {appleLoading ? "A conectar..." : "Continue with Apple"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Your details 📝</h2>
                <p className="text-sm text-muted-foreground mb-5">Essential information for your account</p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" required
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  </div>

                  {accountType === "business" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Business name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your business name" required
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
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters, letters and numbers" required
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                    {password.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                              password.length >= i * 3 ? (passwordStrong(password) && password.length >= 12 ? "bg-primary" : passwordStrong(password) ? "bg-accent" : "bg-destructive") : "bg-secondary"
                            }`} />
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {passwordStrong(password)
                            ? "Nice! Avoid obvious passwords like name+year or \"password123\"."
                            : "Use letters + numbers and at least 8 characters. Common passwords are rejected for security."}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Where are you? 📍</h2>
                <p className="text-sm text-muted-foreground mb-5">Help us show raffles near you <span className="text-[10px]">(opcional)</span></p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84 XXX XXXX"
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Country</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select value={country} onChange={(e) => { setCountry(e.target.value); setProvince(""); setCity(""); }}
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none">
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">Region / State</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); }}
                        className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none">
                        <option value="">Selecione...</option>
                        {getRegions(country).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {province && country === "MZ" && CITIES_BY_PROVINCE[province] && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">City</label>
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
                      <p className="text-xs text-foreground">Friend invite! You both earn <span className="font-bold text-primary">50 points</span> 🎁</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={stepVariants}
                initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-xl font-bold text-foreground mb-1">What are you into? ✨</h2>
                <p className="text-sm text-muted-foreground mb-5">We'll personalize raffles for you <span className="text-[10px]">(opcional)</span></p>

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
                    {interests.length} {interests.length === 1 ? "interest" : "interests"} selected 💖
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 mt-4">{error}</motion.p>
          )}

          <div className="mt-6 flex gap-3">
            {step < STEP_COUNT - 1 ? (
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={goNext} disabled={!canProceed()}
                className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-40 flex items-center justify-center gap-2">
                Continue <ChevronRight className="h-4 w-4" />
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" /> Criar Conta!
                  </>
                )}
              </motion.button>
            )}
          </div>

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

        <div className="mt-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
