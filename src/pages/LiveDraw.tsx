import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowLeft, Users, Ticket, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Participant {
  id: string;
  ticket_number: number;
  user_id: string;
  status: string;
}

const LiveDraw = () => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [globeNumbers, setGlobeNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (!routeSlug) return;
    const fetchData = async () => {
      // Try slug first, then UUID
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
        if (w.data) setWinner(w.data);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const startDraw = useCallback(async () => {
    if (participants.length === 0 || !raffle) return;
    setDrawing(true);
    setWinner(null);

    // Animated number cycling
    const totalCycles = 30;
    for (let i = 0; i < totalCycles; i++) {
      const randomIdx = Math.floor(Math.random() * participants.length);
      setCurrentNumber(participants[randomIdx].ticket_number);
      await new Promise((r) => setTimeout(r, 80 + i * 15));
    }

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

    setTimeout(() => {
      setWinner(selectedWinner);
      setDrawing(false);
    }, 500);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6">
              <span className="h-2 w-2 animate-pulse-glow rounded-full bg-accent" />
              Sorteio ao Vivo
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">{raffle.title}</h1>
            <p className="text-lg text-primary font-semibold mb-8">{raffle.prize_title} — {formatMZN(raffle.prize_value)}</p>
          </motion.div>

          {/* Digital Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mx-auto mb-10"
          >
            <div className="relative w-72 h-72 mx-auto">
              {/* Outer ring */}
              <motion.div
                animate={drawing ? { rotate: 360 } : {}}
                transition={drawing ? { repeat: Infinity, duration: 2, ease: "linear" } : {}}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
              />
              <motion.div
                animate={drawing ? { rotate: -360 } : {}}
                transition={drawing ? { repeat: Infinity, duration: 3, ease: "linear" } : {}}
                className="absolute inset-3 rounded-full border-2 border-dashed border-accent/20"
              />

              {/* Globe background */}
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-secondary via-card to-secondary border border-glass-border overflow-hidden">
                {/* Floating numbers inside globe */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {drawing || currentNumber ? (
                    <motion.div
                      key={currentNumber}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <p className="font-display text-7xl font-bold text-primary glow-primary">
                        {currentNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {drawing ? "Sorteando..." : winner ? "VENCEDOR!" : ""}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="text-center">
                      <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Pronto para sortear</p>
                    </div>
                  )}
                </div>

                {/* Orbiting numbers */}
                {drawing &&
                  globeNumbers.slice(0, 12).map((num, i) => (
                    <motion.div
                      key={`orbit-${num}`}
                      animate={{
                        x: [0, Math.cos((i / 12) * Math.PI * 2) * 80, 0],
                        y: [0, Math.sin((i / 12) * Math.PI * 2) * 80, 0],
                        opacity: [0.3, 0.7, 0.3],
                      }}
                      transition={{ repeat: Infinity, duration: 2 + i * 0.2, ease: "linear" }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-mono text-primary/40"
                    >
                      {num}
                    </motion.div>
                  ))}
              </div>

              {/* Glow effect when drawing */}
              {drawing && (
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-4 rounded-full"
                  style={{ boxShadow: "0 0 60px 20px hsl(var(--primary) / 0.2)" }}
                />
              )}
            </div>
          </motion.div>

          {/* Winner announcement */}
          <AnimatePresence>
            {winner && !drawing && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mb-8"
              >
                <Card className="glass border-accent/30 glow-accent max-w-md mx-auto">
                  <CardContent className="p-8 text-center">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.8 }}
                    >
                      <Sparkles className="h-12 w-12 text-accent mx-auto mb-3" />
                    </motion.div>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-2">🎉 Temos um vencedor!</h2>
                    <p className="text-4xl font-display font-bold text-accent mb-2">Bilhete #{winner.ticket_number}</p>
                    <p className="text-sm text-muted-foreground">+500 Luck Points de bónus atribuídos</p>
                  </CardContent>
                </Card>
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
          {!winner && (
            <Button
              onClick={startDraw}
              disabled={drawing || participants.length === 0}
              size="lg"
              className="gap-3 h-14 px-10 text-lg glow-primary"
            >
              {drawing ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Trophy className="h-5 w-5" />
                  </motion.div>
                  Sorteando...
                </>
              ) : (
                <>
                  <Trophy className="h-5 w-5" />
                  Iniciar Sorteio
                </>
              )}
            </Button>
          )}

          {participants.length === 0 && !winner && (
            <p className="text-sm text-muted-foreground mt-4">Nenhum participante ativo neste sorteio.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LiveDraw;
