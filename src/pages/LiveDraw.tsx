import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Trophy, ArrowLeft, Users, Ticket, Sparkles, Crown, Star, Zap, Heart, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { playWinSound, playDrumRoll, playTickSound } from "@/lib/sounds";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import mascotWinner from "@/assets/mascot-winner.png";

interface Participant {
  id: string;
  ticket_number: number;
  user_id: string;
  status: string;
}

// ─── Particle burst on winner ─────────────────────────────────────────
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * Math.PI * 2;
    const distance = 120 + Math.random() * 200;
    const size = 4 + Math.random() * 8;
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--accent))",
      "hsl(45, 100%, 60%)",
      "hsl(280, 80%, 60%)",
      "hsl(0, 90%, 60%)",
      "hsl(180, 80%, 50%)",
    ];
    return { angle, distance, size, color: colors[i % colors.length], delay: Math.random() * 0.4 };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: "50%",
            top: "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance - 50,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1, 0.5],
            rotate: Math.random() * 720,
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Pulsating ring ───────────────────────────────────────────────────
function PulseRings({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{
            duration: 2,
            delay: i * 0.6,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// ─── Floating emoji rain ──────────────────────────────────────────────
function EmojiRain({ active }: { active: boolean }) {
  if (!active) return null;
  const emojis = ["🎉", "🏆", "⭐", "🎊", "💰", "🎁", "✨", "🔥", "💎", "👑"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{ left: `${5 + Math.random() * 90}%` }}
          initial={{ y: -50, opacity: 0, rotate: 0 }}
          animate={{
            y: window.innerHeight + 50,
            opacity: [0, 1, 1, 0],
            rotate: Math.random() * 360,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            ease: "easeIn",
          }}
        >
          {emojis[i % emojis.length]}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Dramatic number slot machine ─────────────────────────────────────
function NumberSlot({ number, isRevealing }: { number: number | null; isRevealing: boolean }) {
  const displayNum = String(number || 0).padStart(4, "0");

  return (
    <div className="flex gap-2 justify-center">
      {displayNum.split("").map((digit, i) => (
        <motion.div
          key={i}
          className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-b from-secondary to-card border border-border overflow-hidden"
          animate={isRevealing ? {
            boxShadow: [
              "0 0 0px hsl(var(--primary) / 0)",
              "0 0 30px hsl(var(--primary) / 0.5)",
              "0 0 0px hsl(var(--primary) / 0)",
            ],
          } : {}}
          transition={{ duration: 0.5, repeat: isRevealing ? Infinity : 0 }}
        >
          <motion.div
            key={`${number}-${i}`}
            initial={{ y: -30, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: i * 0.05 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="font-display text-4xl sm:text-5xl font-black text-primary">
              {digit}
            </span>
          </motion.div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Countdown pre-draw hype ──────────────────────────────────────────
function PreDrawCountdown({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) { onComplete(); return; }
    const timer = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  const labels = ["", "SORTEAR!", "PREPARAR...", "ATENÇÃO..."];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative">
        <PulseRings active={true} />
        <motion.div
          key={count}
          initial={{ scale: 3, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 10, stiffness: 200 }}
          className="relative z-10 text-center"
        >
          {count > 0 ? (
            <>
              <p className="font-display text-[120px] sm:text-[180px] font-black text-primary leading-none"
                style={{ textShadow: "0 0 80px hsl(var(--primary) / 0.5)" }}>
                {count}
              </p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl sm:text-2xl font-bold text-muted-foreground mt-4"
              >
                {labels[count] || ""}
              </motion.p>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="h-24 w-24 text-accent mx-auto" />
              <p className="font-display text-4xl font-black text-accent mt-4">SORTEANDO!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Winner reveal overlay ────────────────────────────────────────────
function WinnerReveal({
  winner,
  raffle,
  onClose,
}: {
  winner: Participant;
  raffle: any;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Gradient background */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 70%)",
        }}
      />

      <EmojiRain active={true} />

      <div className="relative z-10 text-center max-w-lg mx-auto px-4">
        <ConfettiBurst active={true} />

        {/* Crown animation */}
        <motion.div
          initial={{ y: -100, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, delay: 0.3 }}
        >
          <Crown className="h-20 w-20 text-yellow-500 mx-auto mb-4"
            style={{ filter: "drop-shadow(0 0 30px hsl(45, 100%, 50% / 0.5))" }} />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.6 }}
          className="font-display text-4xl sm:text-5xl font-black text-foreground mb-4"
        >
          TEMOS UM VENCEDOR!
        </motion.h2>

        {/* Winner card */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15, delay: 1 }}
        >
          <Card className="glass border-yellow-500/30 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-yellow-500 via-primary to-accent" />
            <CardContent className="p-8">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-lg text-muted-foreground mb-2">O número vencedor é</p>
                <p className="font-display text-7xl sm:text-8xl font-black text-primary mb-4"
                  style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.3)" }}>
                  #{String(winner.ticket_number).padStart(4, "0")}
                </p>
              </motion.div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-base px-4 py-1">
                  <Trophy className="h-4 w-4 mr-2" />
                  {raffle.prize_title}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-accent">{formatMZN(raffle.prize_value)}</p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-6 flex items-center justify-center gap-2 text-sm text-primary"
              >
                <Star className="h-4 w-4" />
                <span>+500 Luck Points de bónus atribuídos</span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8"
        >
          <Button onClick={onClose} size="lg" className="gap-2 glow-primary">
            <PartyPopper className="h-5 w-5" /> Fantástico!
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
const LiveDraw = () => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "countdown" | "drawing" | "winner">("idle");
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [globeNumbers, setGlobeNumbers] = useState<number[]>([]);
  const [heartbeat, setHeartbeat] = useState(false);

  useEffect(() => {
    if (!routeSlug) return;
    const fetchData = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeSlug);
      const raffleQuery = isUUID
        ? supabase.from("raffles").select("*").eq("id", routeSlug).single()
        : supabase.from("raffles").select("*").eq("slug", routeSlug).single();

      const r = await raffleQuery;
      if (r.data) {
        setRaffle(r.data);
        const raffleId = r.data.id;
        const [p, w] = await Promise.all([
          supabase.from("participants").select("*").eq("raffle_id", raffleId).eq("status", "active"),
          supabase.from("participants").select("*").eq("raffle_id", raffleId).eq("status", "winner").maybeSingle(),
        ]);
        if (p.data) {
          setParticipants(p.data);
          setGlobeNumbers(p.data.map((x) => x.ticket_number));
        }
        if (w.data) {
          setWinner(w.data);
          setPhase("winner");
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [routeSlug]);

  const startDraw = useCallback(() => {
    if (participants.length === 0 || !raffle) return;
    setPhase("countdown");
  }, [participants, raffle]);

  const onCountdownComplete = useCallback(async () => {
    setPhase("drawing");
    setHeartbeat(true);
    playDrumRoll();

    // Dramatic number cycling — accelerate then slow down
    const totalCycles = 40;
    for (let i = 0; i < totalCycles; i++) {
      const randomIdx = Math.floor(Math.random() * participants.length);
      setCurrentNumber(participants[randomIdx].ticket_number);
      if (i % 3 === 0) playTickSound();
      // Speed up first, then dramatically slow down
      const speed = i < 20 ? 50 + i * 2 : 50 + i * 8;
      await new Promise((r) => setTimeout(r, speed));
    }

    // Final dramatic pause
    await new Promise(r => setTimeout(r, 800));

    // Pick winner
    const winnerIdx = Math.floor(Math.random() * participants.length);
    const selectedWinner = participants[winnerIdx];
    setCurrentNumber(selectedWinner.ticket_number);

    // Save to DB
    await supabase.from("participants").update({ status: "winner" }).eq("id", selectedWinner.id);
    await supabase.from("raffles").update({ status: "completed" }).eq("id", raffle.id);
    await supabase.from("luck_points").insert({
      user_id: selectedWinner.user_id,
      points: 500,
      action: "bonus",
      description: `Vencedor do sorteio ao vivo: ${raffle.title}`,
      raffle_id: raffle.id,
    });

    // Dramatic pause before reveal
    await new Promise(r => setTimeout(r, 1500));
    playWinSound();
    setWinner(selectedWinner);
    setPhase("winner");
    setHeartbeat(false);
  }, [participants, raffle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Sorteio não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />
        {phase === "drawing" && (
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.1), transparent 60%)" }}
          />
        )}
      </div>

      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20 relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="max-w-3xl mx-auto text-center">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6"
              animate={phase === "drawing" ? { scale: [1, 1.05, 1], borderColor: ["hsl(var(--accent) / 0.3)", "hsl(var(--accent) / 0.8)", "hsl(var(--accent) / 0.3)"] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.span
                className="h-2 w-2 rounded-full bg-accent"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {phase === "drawing" ? "⚡ A Sortear..." : phase === "winner" ? "🏆 Concluído" : "Sorteio ao Vivo"}
            </motion.div>
            <h1 className="font-display text-4xl sm:text-5xl font-black text-foreground mb-2">{raffle.title}</h1>
            <p className="text-lg text-primary font-semibold mb-2">{raffle.prize_title}</p>
            <p className="text-3xl font-display font-black text-accent mb-8">{formatMZN(raffle.prize_value)}</p>
          </motion.div>

          {/* Digital Globe / Number Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-auto mb-10"
          >
            <div className="relative w-80 h-80 mx-auto">
              {/* Outer spinning rings */}
              <motion.div
                animate={phase === "drawing" ? { rotate: 360 } : {}}
                transition={phase === "drawing" ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
              />
              <motion.div
                animate={phase === "drawing" ? { rotate: -360 } : {}}
                transition={phase === "drawing" ? { repeat: Infinity, duration: 3, ease: "linear" } : {}}
                className="absolute inset-3 rounded-full border-2 border-dashed border-accent/20"
              />
              <motion.div
                animate={phase === "drawing" ? { rotate: 360 } : {}}
                transition={phase === "drawing" ? { repeat: Infinity, duration: 5, ease: "linear" } : {}}
                className="absolute inset-6 rounded-full border border-primary/10"
              />

              {/* Globe core */}
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-secondary via-card to-secondary border border-border overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {phase === "drawing" || currentNumber ? (
                    <motion.div
                      key={currentNumber}
                      initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      transition={{ duration: 0.1 }}
                      className="text-center"
                    >
                      <p className="font-display text-7xl font-black text-primary"
                        style={{ textShadow: "0 0 40px hsl(var(--primary) / 0.4)" }}>
                        {currentNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {phase === "drawing" ? "Sorteando..." : winner ? "VENCEDOR!" : ""}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Trophy className="h-14 w-14 text-muted-foreground/30 mx-auto mb-2" />
                      </motion.div>
                      <p className="text-sm text-muted-foreground">Pronto para sortear</p>
                    </div>
                  )}
                </div>

                {/* Orbiting numbers */}
                {phase === "drawing" &&
                  globeNumbers.slice(0, 16).map((num, i) => (
                    <motion.div
                      key={`orbit-${num}`}
                      animate={{
                        x: [0, Math.cos((i / 16) * Math.PI * 2) * 90, 0],
                        y: [0, Math.sin((i / 16) * Math.PI * 2) * 90, 0],
                        opacity: [0.2, 0.6, 0.2],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{ repeat: Infinity, duration: 1.5 + i * 0.15, ease: "linear" }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-mono font-bold text-primary/30"
                    >
                      {num}
                    </motion.div>
                  ))}

                {/* Heartbeat glow */}
                {heartbeat && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: [
                        "inset 0 0 20px hsl(var(--primary) / 0.1)",
                        "inset 0 0 60px hsl(var(--primary) / 0.3)",
                        "inset 0 0 20px hsl(var(--primary) / 0.1)",
                      ],
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Glow effect */}
              {phase === "drawing" && (
                <motion.div
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="absolute inset-4 rounded-full"
                  style={{ boxShadow: "0 0 80px 30px hsl(var(--primary) / 0.15)" }}
                />
              )}
            </div>
          </motion.div>

          {/* Number slot display during draw */}
          <AnimatePresence>
            {(phase === "drawing" || (phase === "winner" && !winner)) && currentNumber && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8"
              >
                <NumberSlot number={currentNumber} isRevealing={phase === "drawing"} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
            <Card className="glass">
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{participants.length}</p>
                <p className="text-xs text-muted-foreground">Participantes</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 text-center">
                <Ticket className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{raffle.sold_tickets}</p>
                <p className="text-xs text-muted-foreground">Bilhetes</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4 text-center">
                <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{formatMZN(raffle.prize_value)}</p>
                <p className="text-xs text-muted-foreground">Prémio</p>
              </CardContent>
            </Card>
          </div>

          {/* Draw button */}
          {phase === "idle" && !winner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Button
                  onClick={startDraw}
                  disabled={participants.length === 0}
                  size="lg"
                  className="gap-3 h-16 px-12 text-xl font-black glow-primary rounded-2xl"
                >
                  <Sparkles className="h-6 w-6" />
                  INICIAR SORTEIO
                </Button>
              </motion.div>
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">Nenhum participante ativo neste sorteio.</p>
              )}
            </motion.div>
          )}

          {/* Drawing state text */}
          {phase === "drawing" && (
            <motion.p
              className="text-lg font-bold text-primary"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⚡ Escolhendo o vencedor...
            </motion.p>
          )}
        </div>
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === "countdown" && (
          <PreDrawCountdown seconds={3} onComplete={onCountdownComplete} />
        )}
      </AnimatePresence>

      {/* Winner reveal overlay */}
      <AnimatePresence>
        {phase === "winner" && winner && (
          <WinnerReveal
            winner={winner}
            raffle={raffle}
            onClose={() => setPhase("idle")}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default LiveDraw;
