import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Users, Gift, Star, Check, Share2, ArrowRight, Smartphone, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { playPopSound } from "@/lib/sounds";

const SIGNUP_BONUS = 50;
const FIRST_PURCHASE_BONUS = 100;

export default function Referral() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .single();
      setReferralCode(prof?.referral_code || null);

      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      setReferrals(refs || []);

      const { data: points } = await supabase
        .from("luck_points")
        .select("points")
        .eq("user_id", user.id);
      setTotalPoints(points?.reduce((s, p) => s + p.points, 0) || 0);
    };
    fetch();
  }, [user]);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";

  const shareText = `🎁 Join me on Bateu — the premium raffle platform for the US & Canada. Sign up with my link and we both earn ${SIGNUP_BONUS} Luck Points. Plus, I get ${FIRST_PURCHASE_BONUS} bonus points when you make your first PayPal purchase! 🏆`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    playPopSound();
    toast.success("Link copied! 🎉");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Bateu — Premium Raffles", text: shareText, url: referralLink });
    } else {
      handleCopy();
    }
  };

  const handleFacebook = () => {
    playPopSound();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareText)}`, "_blank");
  };
  const handleTwitter = () => {
    playPopSound();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const handleSMS = () => {
    playPopSound();
    window.open(`sms:?body=${encodeURIComponent(`${shareText}\n\n${referralLink}`)}`, "_blank");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Gift className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold text-foreground mb-3">Invite friends, earn Luck Points</h1>
            <p className="text-muted-foreground mb-6">Create an account to start inviting friends and stacking points.</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate("/login")} variant="outline">Sign in</Button>
              <Button onClick={() => navigate("/register")} className="glow-primary">Create account</Button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  const rewards = [
    { points: 50, reward: "1 free ticket on a daily raffle", emoji: "🎫" },
    { points: 150, reward: "3 tickets on any free raffle", emoji: "🎁" },
    { points: 500, reward: "20% off a premium raffle", emoji: "💎" },
    { points: 1000, reward: "VIP ticket on an exclusive draw", emoji: "👑" },
  ];

  const firstPurchaseUnlocked = referrals.filter((r) => (r.first_purchase_bonus_points ?? 0) > 0).length;
  const nextMilestone = rewards.find(r => totalPoints < r.points);
  const progressToNext = nextMilestone ? Math.min(100, (totalPoints / nextMilestone.points) * 100) : 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-10">
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="inline-block mb-4"
          >
            <Gift className="h-14 w-14 text-accent" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Refer &amp; Earn 🎉
          </h1>
          <p className="text-muted-foreground">
            Every friend who signs up with your link gives you <span className="text-primary font-bold">{SIGNUP_BONUS} Luck Points</span> —
            and when they make their <span className="text-accent font-bold">first PayPal purchase</span>, you earn an extra
            <span className="text-primary font-bold"> {FIRST_PURCHASE_BONUS} bonus points</span>.
          </p>
        </motion.div>

        {/* Bonus campaign banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="max-w-2xl mx-auto mb-8 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card/40 to-primary/10 p-5 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Limited-time campaign</p>
          <p className="text-sm text-foreground">
            🚀 Bonus boost: get <span className="font-bold text-primary">+{FIRST_PURCHASE_BONUS} Luck Points</span> automatically
            the moment a friend you invited completes their first PayPal checkout.
          </p>
        </motion.div>

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-4 mb-8">
          {[
            { icon: Star, label: "Total points", value: totalPoints, color: "text-accent" },
            { icon: Users, label: "Friends invited", value: referrals.length, color: "text-primary" },
            { icon: Trophy, label: "Signup bonuses", value: referrals.length * SIGNUP_BONUS, color: "text-primary" },
            { icon: Sparkles, label: "First-purchase bonuses", value: firstPurchaseUnlocked * FIRST_PURCHASE_BONUS, color: "text-accent" },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
              <Card className="glass hover:border-primary/20 transition-colors">
                <CardContent className="p-5 text-center">
                  <stat.icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
                  <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Progress */}
        {nextMilestone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="max-w-xl mx-auto mb-8">
            <Card className="glass border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Next reward</span>
                  <span className="text-xs font-bold text-accent">{nextMilestone.emoji} {nextMilestone.reward}</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }} transition={{ duration: 1, delay: 0.5 }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{totalPoints} / {nextMilestone.points} points</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Share Link */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-xl mx-auto mb-8">
          <Card className="glass border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">Your invite link</h2>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="flex-1 rounded-xl bg-secondary/50 border border-border px-4 py-2.5 text-sm text-foreground truncate font-mono">
                  {referralLink || "Generating…"}
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 shrink-0 rounded-xl">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button onClick={handleFacebook} size="sm" className="gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl h-10">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </Button>
                <Button onClick={handleTwitter} size="sm" variant="outline" className="gap-2 rounded-xl h-10">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X/Twitter
                </Button>
                <Button onClick={handleSMS} size="sm" variant="outline" className="gap-2 rounded-xl h-10">
                  <Smartphone className="h-4 w-4" />
                  SMS
                </Button>
              </div>

              <Button onClick={handleShare} className="w-full gap-2 glow-primary rounded-xl">
                <Share2 className="h-4 w-4" /> Share another way
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Points Rewards & Friends */}
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gift className="h-5 w-5 text-accent" /> What you can unlock</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rewards.map((r) => (
                  <motion.div key={r.points}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-all ${totalPoints >= r.points ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <Badge className={`shrink-0 ${totalPoints >= r.points ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {r.points} pts
                    </Badge>
                    <span className="text-sm text-foreground flex-1">{r.reward}</span>
                    {totalPoints >= r.points && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Card className="glass">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Friends invited</CardTitle></CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-8">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground mb-2">No invites yet</p>
                    <p className="text-xs text-muted-foreground">Share your link to start stacking Luck Points!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <AnimatePresence>
                      {referrals.map((r, i) => {
                        const purchased = (r.first_purchase_bonus_points ?? 0) > 0;
                        return (
                          <motion.div key={r.id}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-xl bg-secondary/30 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {(r.referred_id || "?").slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm text-foreground">Friend #{i + 1}</span>
                                {purchased && (
                                  <p className="text-[10px] text-accent font-semibold">PayPal purchase bonus unlocked ✨</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <Badge className="bg-primary/20 text-primary">+{r.points_awarded} pts</Badge>
                              {purchased && (
                                <Badge className="bg-accent/20 text-accent">+{r.first_purchase_bonus_points} bonus</Badge>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-12 max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-6">How it works</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {[
              { step: "1", text: "Share your link", emoji: "🔗" },
              { step: "2", text: "Friend signs up", emoji: "✅" },
              { step: "3", text: `Both get ${SIGNUP_BONUS} points`, emoji: "🎁" },
              { step: "4", text: `You earn +${FIRST_PURCHASE_BONUS} on their 1st PayPal buy`, emoji: "💸" },
            ].map((s, i) => (
              <motion.div key={s.step}
                className="flex items-center gap-3 flex-1"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.1 }}
              >
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xl">{s.emoji}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Step {s.step}</p>
                  <p className="text-sm font-medium text-foreground">{s.text}</p>
                </div>
                {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
