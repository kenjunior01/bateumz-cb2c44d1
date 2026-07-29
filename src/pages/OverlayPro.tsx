import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Radio, Sparkles, Clock, Gamepad2, Flame, Star, Crown, Zap, Users, Heart, Gift } from "lucide-react";
import { subscribe, readLatest, type RoundState, type LiveBusEvent, bindLiveCode, type LeaderEntry } from "@/lib/liveBus";
import { supabase } from "@/integrations/supabase/client";

interface OverlayBranding {
  companyName?: string;
  companySlogan?: string;
  companyLogoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  backgroundImageUrl?: string;
}

const DEFAULT_BRANDING: OverlayBranding = {
  primaryColor: '#fbbf24',
  secondaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  backgroundColor: 'transparent',
  textColor: '#ffffff',
};

const getBranding = async (code: string): Promise<OverlayBranding> => {
  try {
    const { data: session } = await supabase
      .from('scheduled_lives')
      .select('business_user_id')
      .eq('live_code', code)
      .single();
    if (session?.business_user_id) {
      const { data: brand } = await supabase
        .from('company_branding')
        .select('*')
        .eq('user_id', session.business_user_id)
        .single();
      if (brand) {
        return {
          companyName: brand.company_name || undefined,
          companySlogan: brand.company_slogan || undefined,
          companyLogoUrl: brand.company_logo_url || undefined,
          primaryColor: brand.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: brand.secondary_color || DEFAULT_BRANDING.secondaryColor,
          accentColor: brand.accent_color || DEFAULT_BRANDING.accentColor,
          backgroundColor: 'transparent',
          textColor: brand.text_color || DEFAULT_BRANDING.textColor,
          backgroundImageUrl: brand.background_image_url || undefined,
        };
      }
    }
  } catch {}
  return DEFAULT_BRANDING;
};

const OverlayPro = () => {
  const [params] = useSearchParams();
  const codeFromUrl = params.get("code") || "";
  const [code, setCode] = useState(codeFromUrl || "LIVE");
  const [branding, setBranding] = useState<OverlayBranding>(DEFAULT_BRANDING);
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [sorted, setSorted] = useState<LeaderEntry[]>([]);
  const [winner, setWinner] = useState<{ name: string; meta?: string } | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [ended, setEnded] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [winnerCount, setWinnerCount] = useState(0);
  const [confettiParticles, setConfettiParticles] = useState<{id:number;x:number;y:number;color:string;size:number;delay:number;duration:number;rotation:number}[]>([]);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [newEntryHighlight, setNewEntryHighlight] = useState<string | null>(null);
  const prevEntriesRef = useRef<LeaderEntry[]>([]);
  const winnerTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const confettiIdRef = useRef(0);

  useEffect(() => {
    if (codeFromUrl) {
      bindLiveCode(codeFromUrl);
      getBranding(codeFromUrl).then(setBranding);
    } else {
      const c = readLatest<string>("liveCode");
      if (c) { setCode(c); bindLiveCode(c); getBranding(c).then(setBranding); }
    }
  }, [codeFromUrl]);

  useEffect(() => {
    const started = readLatest<{ code: string; at: number }>("liveStarted");
    const endedEvt = readLatest<{ code: string; at: number }>("liveEnded");
    const startedAt = started?.at || 0;
    const endedAt = endedEvt?.at || 0;
    setEnded(endedAt > startedAt);
    setIsLive(startedAt > 0 && endedAt <= startedAt);
  }, []);

  useEffect(() => {
    if (!round || round.phase !== "running" || !round.timeLeft) return;
    const baseAt = round.at;
    const baseLeft = round.timeLeft;
    const t = setInterval(() => {
      const left = Math.max(0, baseLeft - Math.floor((Date.now() - baseAt) / 1000));
      setRound((r) => (r ? { ...r, timeLeft: left } : r));
      if (left === 0) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, [round?.at, round?.phase]);

  const triggerConfetti = useCallback(() => {
    const newParticles = Array.from({ length: 60 }, () => ({
      id: confettiIdRef.current++,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: [branding.primaryColor, branding.secondaryColor, branding.accentColor, '#ff6b6b', '#51cf66', '#ffd43b', '#ff922b', '#cc5de8'][Math.floor(Math.random() * 8)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 2,
      rotation: Math.random() * 360,
    }));
    setConfettiParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setConfettiParticles(prev => prev.filter(p => !newParticles.includes(p))), 4000);
  }, [branding]);

  useEffect(() => {
    const unsub = subscribe((evt: LiveBusEvent) => {
      switch (evt.type) {
        case "leaderboard": {
          const newEntries = evt.payload as LeaderEntry[];
          setEntries(newEntries);
          const s = [...newEntries].sort((a, b) => b.score - a.score).slice(0, 8);
          setSorted(s);
          const names = new Set(newEntries.map(e => e.name));
          setTotalPlayers(names.size);
          const games = new Set(newEntries.map(e => e.game));
          setTotalGames(games.size);
          if (newEntries.length > prevEntriesRef.current.length) {
            const latest = newEntries[newEntries.length - 1];
            if (latest) {
              setNewEntryHighlight(latest.id);
              setTimeout(() => setNewEntryHighlight(null), 2000);
            }
          }
          prevEntriesRef.current = newEntries;
          break;
        }
        case "winner": {
          const w = evt.payload as { name: string; meta?: string };
          setWinner(w);
          setWinnerCount(c => c + 1);
          setShowWinnerAnimation(true);
          setPulseEffect(true);
          triggerConfetti();
          setTimeout(() => { setShowWinnerAnimation(false); setPulseEffect(false); }, 6000);
          if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
          winnerTimeoutRef.current = setTimeout(() => setWinner(null), 8000);
          break;
        }
        case "liveCode":
          if (!codeFromUrl) setCode((evt.payload as string) || "LIVE");
          break;
        case "roundState": {
          const rs = evt.payload as RoundState;
          setRound(rs);
          if (rs.phase === "running") {
            setEnded(false);
            setIsLive(true);
          }
          if (rs.score !== undefined) setCurrentScore(rs.score);
          break;
        }
        case "liveStarted":
          setEnded(false);
          setIsLive(true);
          setEntries([]);
          setSorted([]);
          setWinnerCount(0);
          setTotalPlayers(0);
          setTotalGames(0);
          setCurrentScore(0);
          break;
        case "liveEnded":
          setEnded(true);
          setIsLive(false);
          setRound((r) => r ? { ...r, phase: "ended" } : r);
          break;
        case "config": {
          const cfg = evt.payload as any;
          if (cfg?.branding) setBranding(cfg.branding);
          break;
        }
      }
    });
    return unsub;
  }, [codeFromUrl, triggerConfetti]);

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (i === 1) return <Star className="h-4 w-4 text-gray-300" />;
    if (i === 2) return <Star className="h-4 w-4 text-amber-600" />;
    return <span className="text-[10px] font-bold opacity-60">{i + 1}</span>;
  };

  const getRankBg = (i: number) => {
    if (i === 0) return "bg-yellow-500/20 border-yellow-500/30";
    if (i === 1) return "bg-gray-400/10 border-gray-400/20";
    if (i === 2) return "bg-amber-600/10 border-amber-600/20";
    return "bg-white/5 border-white/5";
  };

  const barWidth = (score: number) => {
    const max = sorted[0]?.score || 1;
    return Math.max(8, (score / max) * 100);
  };

  return (
    <div className="min-h-screen bg-transparent text-white font-display overflow-hidden" style={{ color: branding.textColor }}>
      <style>{`
        html, body, #root, #overlay-root { background: transparent !important; }
        @keyframes overlayPulse { 0%,100%{ box-shadow: 0 0 20px ${branding.primaryColor}40; } 50%{ box-shadow: 0 0 40px ${branding.primaryColor}80, 0 0 80px ${branding.accentColor}40; } }
        @keyframes overlayGlow { 0%,100%{ opacity:0.6; } 50%{ opacity:1; } }
        @keyframes overlaySlideIn { from { transform: translateX(100px); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes overlayShine { 0%{ background-position: -200% 0; } 100%{ background-position: 200% 0; } }
        @keyframes overlayFloat { 0%,100%{ transform: translateY(0px); } 50%{ transform: translateY(-6px); } }
        @keyframes overlayBounce { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.05); } }
        @keyframes overlayWinnerPulse { 0%,100%{ transform: scale(1) rotate(-1deg); } 50%{ transform: scale(1.03) rotate(1deg); } }
        .overlay-pulse { animation: overlayPulse 2s ease-in-out infinite; }
        .overlay-glow { animation: overlayGlow 1.5s ease-in-out infinite; }
        .overlay-shine { background: linear-gradient(90deg, transparent, ${branding.primaryColor}60, transparent); background-size: 200% 100%; animation: overlaySlideIn 3s linear infinite; }
        .overlay-float { animation: overlayFloat 3s ease-in-out infinite; }
        .overlay-bounce { animation: overlayBounce 2s ease-in-out infinite; }
        .overlay-winner-pulse { animation: overlayWinnerPulse 0.5s ease-in-out infinite; }
      `}</style>

      {branding.backgroundImageUrl && (
        <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${branding.backgroundImageUrl})` }} />
      )}

      {confettiParticles.map(p => (
        <motion.div key={p.id} className="fixed pointer-events-none z-50"
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotation + 720, scale: 0.3 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        >
          <div style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color, borderRadius: 2 }} />
        </motion.div>
      ))}

      <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-30">
        <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`relative flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl border ${isLive ? 'bg-red-500/90 border-red-400/50 overlay-pulse' : ended ? 'bg-slate-800/90 border-slate-600/50' : 'bg-slate-800/90 border-slate-600/50'}`} style={!isLive && !ended ? {} : {}}>
          <div className={`relative`}><Radio className={`h-4 w-4 ${isLive ? 'animate-pulse' : ''}`} /><div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isLive ? 'bg-white animate-ping' : 'bg-gray-500'}`} /></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-widest uppercase">{isLive ? 'AO VIVO' : ended ? 'ENCERRADA' : 'EM BREVE'}</span>
            <span className="text-[9px] opacity-70 font-mono">{code}</span>
          </div>
          {isLive && <span className="text-[11px] font-mono font-bold ml-2" style={{ color: branding.primaryColor }}>{fmtTime(elapsed)}</span>}
        </motion.div>

        {round && !ended && (
          <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
            <Gamepad2 className="h-3.5 w-3.5" style={{ color: branding.accentColor }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{round.game}</span>
            <span className={`text-[9px] font-bold ${round.phase === 'running' ? 'text-emerald-400' : 'text-amber-400'}`}>{round.phase}</span>
            {round.timeLeft > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-[11px] font-bold" style={{ color: round.timeLeft <= 5 ? '#ef4444' : branding.primaryColor }}>{round.timeLeft}s</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        {branding.companyLogoUrl && (
          <motion.img initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            src={branding.companyLogoUrl} alt="" className="h-10 w-10 rounded-xl object-cover shadow-lg mb-1" />
        )}
        {branding.companyName && (
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
            className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: branding.primaryColor }}>{branding.companyName}</span>
          </motion.div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-30">
        <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex gap-2">
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <Users className="h-3.5 w-3.5 mb-0.5" style={{ color: branding.secondaryColor }} />
            <span className="text-lg font-black leading-none">{totalPlayers}</span>
            <span className="text-[8px] opacity-60 uppercase">Jogadores</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <Flame className="h-3.5 w-3.5 mb-0.5" style={{ color: branding.accentColor }} />
            <span className="text-lg font-black leading-none">{winnerCount}</span>
            <span className="text-[8px] opacity-60 uppercase">Vitórias</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <Gamepad2 className="h-3.5 w-3.5 mb-0.5" style={{ color: branding.primaryColor }} />
            <span className="text-lg font-black leading-none">{totalGames}</span>
            <span className="text-[8px] opacity-60 uppercase">Jogos</span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-4 right-4 w-80 z-30">
        <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          className={`rounded-2xl overflow-hidden backdrop-blur-xl border shadow-2xl ${pulseEffect ? 'overlay-pulse' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.75)', borderColor: `${branding.primaryColor}30` }}>
          <div className="relative px-4 py-3 flex items-center gap-2 overflow-hidden" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}40, ${branding.accentColor}30)` }}>
            <div className="overlay-shine absolute inset-0" />
            <Trophy className="h-5 w-5 relative z-10" style={{ color: branding.primaryColor }} />
            <span className="text-sm font-black tracking-wide relative z-10">TOP JOGADORES</span>
            <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 relative z-10">{sorted.length} participantes</span>
          </div>
          {sorted.length === 0 ? (
            <div className="py-8 text-center">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Gamepad2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              </motion.div>
              <p className="text-[11px] opacity-50">Aguardando jogadores...</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
              <AnimatePresence initial={false}>
                {sorted.map((e, i) => (
                  <motion.li key={e.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`relative px-3 py-2.5 border-l-2 ${getRankBg(i)} ${newEntryHighlight === e.id ? 'ring-1 ring-inset' : ''}`}
                    style={{ borderLeftColor: i === 0 ? branding.primaryColor : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : 'transparent', ringColor: newEntryHighlight === e.id ? branding.primaryColor : undefined }}>
                    {i === 0 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none" />}
                    <div className="flex items-center gap-2.5 relative z-10">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 shrink-0">
                        {getRankIcon(i)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-black truncate ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-200' : ''}`}>{e.name}</p>
                          {i === 0 && <Crown className="h-3 w-3 text-yellow-400 shrink-0" />}
                        </div>
                        <p className="text-[9px] opacity-50 truncate">{e.game}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-black tabular-nums" style={{ color: i === 0 ? branding.primaryColor : 'white' }}>{e.score}</span>
                        <span className="text-[8px] opacity-40">pts</span>
                      </div>
                    </div>
                    <div className="mt-1 ml-9 h-1 rounded-full bg-white/5 overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: i === 0 ? branding.primaryColor : i === 1 ? '#9ca3af' : branding.accentColor }}
                        initial={{ width: 0 }} animate={{ width: `${barWidth(e.score)}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }} />
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </div>

      <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-2 items-start max-w-xs">
        {isLive && currentScore > 0 && (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
            <Zap className="h-4 w-4" style={{ color: branding.primaryColor }} />
            <span className="text-[10px] opacity-60">Pontuação Atual</span>
            <span className="text-lg font-black" style={{ color: branding.primaryColor }}>{currentScore}</span>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {winner && showWinnerAnimation && (
          <motion.div initial={{ opacity: 0, scale: 0.5, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40">
            <div className="relative overlay-winner-pulse">
              <div className="absolute inset-0 rounded-3xl blur-xl opacity-50" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})` }} />
              <div className="relative px-10 py-6 rounded-3xl backdrop-blur-xl border-2 border-white/20 shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}E6, ${branding.accentColor}CC)` }}>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      <Crown className="h-10 w-10 text-yellow-300" />
                    </motion.div>
                    <Sparkles className="h-5 w-5 text-yellow-200 mt-1 overlay-glow" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-3 w-3 text-red-300" />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80">VENCEDOR</span>
                      <Gift className="h-3 w-3 text-yellow-300" />
                    </div>
                    <p className="text-3xl font-black text-black leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{winner.name}</p>
                    {winner.meta && <p className="text-sm font-bold text-black/70 mt-1">{winner.meta}</p>}
                  </div>
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Trophy className="h-12 w-12 text-yellow-900" />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverlayPro;
