import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Radio, Sparkles, Clock, Gamepad2, Flame, Star, Crown,
  Zap, Users, ChevronUp, ChevronDown, Minus,
  Activity, Fingerprint
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  subscribe, readLatest, bindLiveCode,
  type RoundState, type LiveBusEvent
} from "@/lib/liveBus";
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

type OverlayStyle = 'modern' | 'minimal' | 'neon' | 'classic' | 'gaming';
type LayoutMode = 'leaderboard' | 'scoreboard' | 'minimal' | 'fullscreen';

interface LeaderEntry {
  id: string;
  name: string;
  score: number;
  game: string;
  at: number;
}

interface LeaderEntryEx extends LeaderEntry {
  prevScore?: number;
  prevRank?: number;
  isNew?: boolean;
  scoreDelta?: number;
}

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
  overlayStyle?: OverlayStyle;
}

interface TickerEvent {
  id: string;
  text: string;
  icon: string;
  color: string;
  at: number;
}

const DEFAULT_BRANDING: OverlayBranding = {
  primaryColor: '#fbbf24',
  secondaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  backgroundColor: 'transparent',
  textColor: '#ffffff',
  overlayStyle: 'neon',
};

const getBranding = async (code: string): Promise<OverlayBranding> => {
  try {
    // Try scheduled_lives first (for planned/scheduled events)
    const { data: session } = await sb
      .from('scheduled_lives')
      .select('business_user_id')
      .eq('live_code', code)
      .single();
    let userId = session?.business_user_id;
    
    // Fallback: try live_sessions table (for ad-hoc LiveHub sessions)
    if (!userId) {
      const { data: liveSession } = await sb
        .from('live_sessions')
        .select('business_user_id')
        .eq('live_code', code)
        .single();
      userId = (liveSession as any)?.business_user_id;
    }
    
    if (userId) {
      const { data: brand } = await sb
        .from('company_branding')
        .select('*')
        .eq('user_id', userId)
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
          overlayStyle: (brand.overlay_style as OverlayStyle) || 'neon',
        };
      }
    }
  } catch { /* noop */ }
  return DEFAULT_BRANDING;
};

const AnimatedNumber = ({ value, color, size = 'text-2xl' }: { value: number; color?: string; size?: string }) => {
  const prevRef = useRef(value);
  const [displayVal, setDisplayVal] = useState(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value !== prevRef.current) {
      const diff = value - prevRef.current;
      prevRef.current = value;
      setAnimating(true);
      let cur = displayVal;
      const steps = 14;
      let step = 0;
      const inc = diff / steps;
      const iv = setInterval(() => {
        step++;
        cur += inc;
        setDisplayVal(Math.round(cur));
        if (step >= steps) {
          clearInterval(iv);
          setDisplayVal(value);
          setTimeout(() => setAnimating(false), 200);
        }
      }, 25);
      return () => clearInterval(iv);
    }
  }, [value]);

  return (
    <motion.span
      className={`${size} font-black tabular-nums leading-none inline-block`}
      style={{ color }}
      animate={animating ? { scale: [1, 1.18, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
    >
      {displayVal.toLocaleString()}
    </motion.span>
  );
};

const ParticleBurst = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      angle: (i / 10) * 360,
      distance: 25 + Math.random() * 50,
      size: 3 + Math.random() * 5,
      duration: 0.35 + Math.random() * 0.35,
    })), []);

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: color, left: -p.size / 2, top: -p.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle * Math.PI / 180) * p.distance,
            y: Math.sin(p.angle * Math.PI / 180) * p.distance,
            opacity: 0, scale: 0,
          }}
          transition={{ duration: p.duration, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

const RankIndicator = ({ prev, curr }: { prev?: number; curr: number }) => {
  if (prev === undefined || prev === curr) return <Minus className="w-3 h-3 opacity-30" />;
  if (prev > curr) return <ChevronUp className="w-3 h-3" style={{ color: '#22c55e' }} />;
  return <ChevronDown className="w-3 h-3" style={{ color: '#ef4444' }} />;
};

const OverlayPro = () => {
  const [params] = useSearchParams();
  const codeFromUrl = params.get("code") || "";
  const layoutParam = (params.get("layout") || 'leaderboard') as LayoutMode;
  const [code, setCode] = useState(codeFromUrl || "LIVE");
  const [branding, setBranding] = useState<OverlayBranding>(DEFAULT_BRANDING);
  const [entries, setEntries] = useState<LeaderEntryEx[]>([]);
  const [sorted, setSorted] = useState<LeaderEntryEx[]>([]);
  const [winner, setWinner] = useState<{ name: string; meta?: string } | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [prevRound, setPrevRound] = useState<RoundState | null>(null);
  const [ended, setEnded] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [winnerCount, setWinnerCount] = useState(0);
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>([]);
  const [screenFlash, setScreenFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [newPlayerNotify, setNewPlayerNotify] = useState<{ name: string; id: string } | null>(null);
  const [roundTransition, setRoundTransition] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [scanlineY, setScanlineY] = useState(0);

  const prevEntriesRef = useRef<LeaderEntryEx[]>([]);
  const winnerTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const particleIdRef = useRef(0);
  const prevScoreRef = useRef(0);

  const sty = branding.overlayStyle || 'neon';
  const pc = branding.primaryColor;
  const sc = branding.secondaryColor;
  const ac = branding.accentColor;
  const isNeon = sty === 'neon' || sty === 'gaming';
  const isMinimal = sty === 'minimal' || layoutParam === 'minimal';

  useEffect(() => {
    if (codeFromUrl) {
      bindLiveCode(codeFromUrl);
      getBranding(codeFromUrl).then(setBranding);
    } else {
      const c = readLatest<string>("liveCode");
      if (c) {
        setCode(c);
        bindLiveCode(c);
        getBranding(c).then(setBranding);
      }
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
    if (!isLive) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  useEffect(() => {
    if (!round || round.phase !== "running" || !round.timeLeft) return;
    const baseAt = round.at;
    const baseLeft = round.timeLeft;
    const t = setInterval(() => {
      const left = Math.max(0, baseLeft - Math.floor((Date.now() - baseAt) / 1000));
      setRound(r => (r ? { ...r, timeLeft: left } : r));
      if (left === 0) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, [round?.at, round?.phase]);

  useEffect(() => {
    if (currentScore !== prevScoreRef.current) {
      const diff = currentScore - prevScoreRef.current;
      prevScoreRef.current = currentScore;
      let cur = displayScore;
      const steps = 20;
      let step = 0;
      const inc = diff / steps;
      const iv = setInterval(() => {
        step++;
        cur += inc;
        setDisplayScore(Math.round(cur));
        if (step >= steps) {
          clearInterval(iv);
          setDisplayScore(currentScore);
        }
      }, 25);
      return () => clearInterval(iv);
    }
  }, [currentScore]);

  useEffect(() => {
    if (!isNeon || !isLive) return;
    const t = setInterval(() => { setScanlineY(y => (y + 1) % 100); }, 50);
    return () => clearInterval(t);
  }, [isNeon, isLive]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 6) => {
    const newP = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 40,
      color,
    }));
    setParticles(prev => [...prev, ...newP]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.includes(p))), 900);
  }, []);

  const fireConfetti = useCallback(() => {
    const colors = [pc, sc, ac, '#ff6b6b', '#51cf66', '#ffd43b', '#ff922b', '#cc5de8'];
    confetti({ spread: 360, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 30, shapes: ['square'] as any[], colors, particleCount: 60, origin: { x: 0.3, y: 0.6 } });
    confetti({ spread: 360, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 30, shapes: ['square'] as any[], colors, particleCount: 60, origin: { x: 0.7, y: 0.6 } });
    setTimeout(() => confetti({ spread: 360, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 45, shapes: ['square'] as any[], colors, particleCount: 40, origin: { x: 0.5, y: 0.4 } }), 250);
    setTimeout(() => {
      confetti({ spread: 360, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 30, shapes: ['square'] as any[], colors, particleCount: 30, origin: { x: 0.2, y: 0.3 } });
      confetti({ spread: 360, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 30, shapes: ['square'] as any[], colors, particleCount: 30, origin: { x: 0.8, y: 0.3 } });
    }, 500);
  }, [pc, sc, ac]);

  const addTicker = useCallback((text: string, icon: string, color: string) => {
    const ev: TickerEvent = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, icon, color, at: Date.now() };
    setTickerEvents(prev => [...prev.slice(-12), ev]);
    setTimeout(() => setTickerEvents(prev => prev.filter(t => t.id !== ev.id)), 15000);
  }, []);

  useEffect(() => {
    const unsub = subscribe((evt: LiveBusEvent) => {
      switch (evt.type) {
        case "leaderboard": {
          const raw = evt.payload as LeaderEntry[];
          const newEntries: LeaderEntryEx[] = raw.map(e => {
            const prev = prevEntriesRef.current.find(p => p.id === e.id);
            return { ...e, prevScore: prev?.score, isNew: !prev, scoreDelta: prev ? e.score - prev.score : 0 };
          });
          setEntries(newEntries);
          const s = [...newEntries].sort((a, b) => b.score - a.score).slice(0, 10);
          setSorted(s);
          setTotalPlayers(new Set(newEntries.map(e => e.name)).size);
          setTotalGames(new Set(newEntries.map(e => e.game)).size);
          const fresh = newEntries.find(e => !prevEntriesRef.current.find(p => p.id === e.id));
          if (fresh) {
            setNewPlayerNotify({ name: fresh.name, id: fresh.id });
            addTicker(`${fresh.name} entrou no jogo!`, 'user', pc);
            spawnParticles(70, 50, pc, 4);
            setTimeout(() => setNewPlayerNotify(null), 3000);
          }
          const sj = newEntries.find(e => {
            const prev = prevEntriesRef.current.find(p => p.id === e.id);
            return prev && e.score - prev.score > 50;
          });
          if (sj) {
            addTicker(`${sj.name} +${sj.score - (prevEntriesRef.current.find(p => p.id === sj.id)?.score || 0)} pontos!`, 'zap', ac);
          }
          prevEntriesRef.current = newEntries;
          break;
        }
        case "winner": {
          const w = evt.payload as { name: string; meta?: string; at: number };
          setWinner({ name: w.name, meta: w.meta });
          setWinnerCount(c => c + 1);
          setShowWinnerAnimation(true);
          setPulseEffect(true);
          setScreenFlash(true);
          setScreenShake(true);
          fireConfetti();
          addTicker(`${w.name} VENCEU! ${w.meta || ''}`, 'trophy', pc);
          setTimeout(() => { setScreenFlash(false); setScreenShake(false); }, 600);
          setTimeout(() => { setShowWinnerAnimation(false); setPulseEffect(false); }, 7000);
          if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
          winnerTimeoutRef.current = setTimeout(() => setWinner(null), 9000);
          break;
        }
        case "liveCode":
          if (!codeFromUrl) setCode((evt.payload as string) || "LIVE");
          break;
        case "roundState": {
          const rs = evt.payload as RoundState;
          if (round && round.game !== rs.game && round.phase === 'running') {
            setPrevRound(round);
            setRoundTransition(true);
            addTicker(`Novo jogo: ${rs.game}`, 'gamepad', sc);
            setTimeout(() => { setRoundTransition(false); setPrevRound(null); }, 1500);
          }
          setRound(rs);
          if (rs.phase === "running") { setEnded(false); setIsLive(true); }
          if (rs.score !== undefined) setCurrentScore(rs.score);
          break;
        }
        case "liveStarted":
          setEnded(false); setIsLive(true);
          setEntries([]); setSorted([]); setWinnerCount(0);
          setTotalPlayers(0); setTotalGames(0);
          setCurrentScore(0); setDisplayScore(0); prevScoreRef.current = 0;
          addTicker('Live iniciada!', 'radio', '#22c55e');
          break;
        case "liveEnded":
          setEnded(true); setIsLive(false);
          setRound(r => r ? { ...r, phase: 'ended' } : r);
          addTicker('Live encerrada.', 'alert', '#ef4444');
          break;
        case "config": {
          const cfg = evt.payload as any;
          if (cfg?.branding) setBranding(cfg.branding);
          break;
        }
      }
    });
    return unsub;
  }, [codeFromUrl, fireConfetti, addTicker, spawnParticles, pc, sc, ac, round, sorted]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (i === 1) return <Star className="h-4 w-4 text-gray-300" />;
    if (i === 2) return <Star className="h-3.5 w-3.5 text-amber-600" />;
    return <span className="text-[10px] font-bold opacity-50">{i + 1}</span>;
  };

  const barWidth = (score: number) => {
    const max = sorted[0]?.score || 1;
    return Math.max(8, (score / max) * 100);
  };

  const getRankBorderColor = (i: number) => {
    if (i === 0) return '#fbbf24';
    if (i === 1) return '#9ca3af';
    if (i === 2) return '#d97706';
    return 'transparent';
  };

  const getRankGlow = (i: number) => {
    if (i === 0) return `0 0 12px ${pc}60, 0 0 24px ${pc}20`;
    if (i === 1) return '0 0 8px rgba(156,163,175,0.3)';
    if (i === 2) return '0 0 8px rgba(217,119,6,0.3)';
    return 'none';
  };

  const cssKeyframes = `
    html, body, #root, #overlay-root { background: transparent !important; margin: 0 !important; padding: 0 !important; }
    * { box-sizing: border-box; }
    @keyframes neonPulse {
      0%, 100% { box-shadow: 0 0 8px ${pc}50, 0 0 20px ${pc}25; }
      50% { box-shadow: 0 0 16px ${pc}80, 0 0 40px ${pc}40, 0 0 60px ${pc}20; }
    }
    @keyframes glowText {
      0%, 100% { text-shadow: 0 0 8px ${pc}80, 0 0 16px ${pc}40; }
      50% { text-shadow: 0 0 16px ${pc}CC, 0 0 32px ${pc}60, 0 0 48px ${pc}30; }
    }
    @keyframes borderGlow {
      0%, 100% { border-color: ${pc}40; }
      50% { border-color: ${pc}AA; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes floatSlow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes trophySpin {
      0% { transform: rotateY(0deg) scale(1); }
      25% { transform: rotateY(90deg) scale(1.15); }
      50% { transform: rotateY(180deg) scale(1.3); }
      75% { transform: rotateY(270deg) scale(1.15); }
      100% { transform: rotateY(360deg) scale(1); }
    }
    @keyframes winnerGlow {
      0%, 100% { filter: drop-shadow(0 0 10px ${pc}80) drop-shadow(0 0 20px ${ac}60); }
      50% { filter: drop-shadow(0 0 20px ${pc}CC) drop-shadow(0 0 40px ${ac}80) drop-shadow(0 0 60px ${pc}40); }
    }
    @keyframes ambientOrb1 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
      33% { transform: translate(30px, -20px) scale(1.1); opacity: 0.5; }
      66% { transform: translate(-20px, 10px) scale(0.9); opacity: 0.2; }
    }
    @keyframes ambientOrb2 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
      33% { transform: translate(-40px, 20px) scale(1.2); opacity: 0.4; }
      66% { transform: translate(20px, -30px) scale(0.8); opacity: 0.15; }
    }
    .neon-pulse { animation: neonPulse 2s ease-in-out infinite; }
    .glow-text { animation: glowText 2s ease-in-out infinite; }
    .border-glow { animation: borderGlow 2s ease-in-out infinite; }
    .shimmer-text {
      background: linear-gradient(90deg, ${pc}, #ffffff, ${ac}, ${pc});
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }
    .float-slow { animation: floatSlow 4s ease-in-out infinite; }
    .winner-glow { animation: winnerGlow 1.5s ease-in-out infinite; }
    .trophy-spin { animation: trophySpin 3s ease-in-out infinite; }
  `;

  return (
    <div className="fixed inset-0 overflow-hidden font-sans" style={{ color: branding.textColor }}>
      <style>{cssKeyframes}</style>

      {branding.backgroundImageUrl && (
        <div className="fixed inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${branding.backgroundImageUrl})` }} />
      )}

      {isNeon && isLive && (
        <>
          <div className="fixed w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${pc}25, transparent 70%)`, top: '10%', left: '5%', animation: 'ambientOrb1 8s ease-in-out infinite', filter: 'blur(40px)' }} />
          <div className="fixed w-[250px] h-[250px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ac}20, transparent 70%)`, bottom: '15%', right: '10%', animation: 'ambientOrb2 10s ease-in-out infinite', filter: 'blur(40px)' }} />
        </>
      )}

      {isNeon && isLive && (
        <div className="fixed left-0 right-0 h-[2px] pointer-events-none z-[1]" style={{ top: `${scanlineY}%`, background: `linear-gradient(90deg, transparent, ${pc}30, ${pc}60, ${pc}30, transparent)`, filter: 'blur(1px)' }} />
      )}

      <AnimatePresence>
        {screenFlash && (
          <motion.div className="fixed inset-0 z-[100] pointer-events-none" style={{ background: `radial-gradient(circle, ${pc}40, transparent 70%)` }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />
        )}
      </AnimatePresence>

      <motion.div className="fixed inset-0" animate={screenShake ? { x: [0, -5, 5, -3, 3, 0], y: [0, 3, -3, 5, -5, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.5 }}>

        <div className="absolute top-5 left-5 flex flex-col gap-2.5 items-start z-30">
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} className={`relative flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-2xl shadow-2xl border ${isLive ? 'bg-black/80 border-red-500/50 neon-pulse' : ended ? 'bg-black/80 border-gray-600/40' : 'bg-black/80 border-white/10'}`}>
            <div className="relative">
              <Radio className={`h-5 w-5 ${isLive ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
              <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-gray-600'}`} />
            </div>
            <div className="flex flex-col">
              <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${isLive ? 'text-red-400' : ''}`}>{isLive ? 'AO VIVO' : ended ? 'ENCERRADA' : 'EM BREVE'}</span>
              <span className="text-[9px] opacity-50 font-mono tracking-wider">{code}</span>
            </div>
            {isLive && (
              <motion.span key={elapsed} initial={{ y: -4, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className="text-[13px] font-mono font-black ml-3 pl-3 border-l border-white/10" style={{ color: pc }}>{fmtTime(elapsed)}</motion.span>
            )}
            {isLive && (
              <motion.div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent, ${pc}15, transparent)`, backgroundSize: '200% 100%', animation: 'shimmer 4s linear infinite' }} />
              </motion.div>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {round && !ended && (
              <motion.div key={round.game + round.phase} initial={{ x: -80, opacity: 0, scale: 0.95 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: -80, opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl backdrop-blur-xl border shadow-lg ${isNeon ? 'bg-black/70 border-glow' : 'bg-black/70 border-white/10'}`} style={{ borderColor: `${sc}40` }}>
                <Gamepad2 className="h-4 w-4" style={{ color: ac }} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{round.game}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${round.phase === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{round.phase}</span>
                {round.timeLeft > 0 && (
                  <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/10">
                    <Clock className="h-3.5 w-3.5" />
                    <motion.span key={round.timeLeft} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-mono text-[12px] font-black" style={{ color: round.timeLeft <= 5 ? '#ef4444' : pc }}>{round.timeLeft}s</motion.span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {roundTransition && prevRound && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="px-4 py-2 rounded-xl bg-black/80 backdrop-blur-xl border" style={{ borderColor: `${ac}50` }}>
                <span className="text-[10px] uppercase tracking-[0.15em] opacity-60">Proximo jogo</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Gamepad2 className="h-3.5 w-3.5" style={{ color: sc }} />
                  <span className="text-sm font-black shimmer-text">{round?.game || ''}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5">
          {branding.companyLogoUrl && (
            <motion.div initial={{ scale: 0, opacity: 0, rotate: -180 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={`relative ${isNeon ? 'neon-pulse' : ''}`} style={{ borderRadius: 12 }}>
              <img src={branding.companyLogoUrl} alt="" className="h-12 w-12 rounded-xl object-cover shadow-lg" style={{ border: `2px solid ${pc}50` }} />
            </motion.div>
          )}
          {branding.companyName && (
            <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }} className="px-5 py-1.5 rounded-full backdrop-blur-xl border" style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderColor: `${pc}30` }}>
              <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${isNeon ? 'glow-text' : ''}`} style={{ color: pc }}>{branding.companyName}</span>
            </motion.div>
          )}
          {branding.companySlogan && !isMinimal && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.3, duration: 1 }} className="text-[9px] tracking-widest uppercase max-w-[200px] text-center truncate">{branding.companySlogan}</motion.span>
          )}
        </div>

        <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5 z-30">
          <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }} className={`flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-xl border shadow-lg ${isNeon ? 'border-glow' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: `${sc}30` }}>
              <Users className="h-4 w-4 mb-1" style={{ color: sc }} />
              <AnimatedNumber value={totalPlayers} color={branding.textColor} size="text-xl" />
              <span className="text-[8px] opacity-40 uppercase tracking-wider font-bold">Players</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className={`flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-xl border shadow-lg ${isNeon ? 'border-glow' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: `${ac}30` }}>
              <Flame className="h-4 w-4 mb-1" style={{ color: ac }} />
              <AnimatedNumber value={winnerCount} color={branding.textColor} size="text-xl" />
              <span className="text-[8px] opacity-40 uppercase tracking-wider font-bold">Wins</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} className={`flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-xl border shadow-lg ${isNeon ? 'border-glow' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderColor: `${pc}30` }}>
              <Gamepad2 className="h-4 w-4 mb-1" style={{ color: pc }} />
              <AnimatedNumber value={totalGames} color={branding.textColor} size="text-xl" />
              <span className="text-[8px] opacity-40 uppercase tracking-wider font-bold">Games</span>
            </motion.div>
          </motion.div>
        </div>

        <AnimatePresence>
          {isLive && currentScore > 0 && (layoutParam === 'scoreboard' || layoutParam === 'fullscreen') && (
            <motion.div initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="absolute bottom-20 left-5 z-30">
              <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl backdrop-blur-2xl border shadow-2xl ${isNeon ? 'neon-pulse' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: `${pc}40`, background: 'linear-gradient(135deg, rgba(0,0,0,0.85), rgba(0,0,0,0.7))' }}>
                <Zap className="h-6 w-6" style={{ color: pc }} />
                <div className="flex flex-col">
                  <span className="text-[9px] opacity-50 uppercase tracking-wider font-bold">Pontuacao</span>
                  <motion.span key={displayScore} className="text-3xl font-black tabular-nums leading-none" style={{ color: pc }} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>{displayScore.toLocaleString()}</motion.span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {layoutParam !== 'minimal' && (
          <div className={`absolute z-30 ${layoutParam === 'fullscreen' ? 'top-24 left-5 w-[420px]' : 'top-5 right-5 w-[380px]'} ${layoutParam === 'scoreboard' ? 'top-24 right-5 w-[340px]' : ''}`}>
            <motion.div initial={layoutParam === 'fullscreen' ? { x: -100, opacity: 0 } : { x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22 }} className={`relative rounded-2xl overflow-hidden backdrop-blur-2xl border shadow-2xl ${pulseEffect ? 'neon-pulse' : ''} ${isNeon ? 'border-glow' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: `${pc}30` }}>

              <div className="relative px-5 py-3.5 flex items-center gap-3 overflow-hidden" style={{ background: `linear-gradient(135deg, ${pc}30, ${ac}20, ${sc}15)`, borderBottom: `1px solid ${pc}25` }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${pc}20, transparent)`, backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                  <Trophy className="h-5 w-5 relative z-10" style={{ color: pc }} />
                </motion.div>
                <span className={`text-sm font-black tracking-[0.1em] uppercase relative z-10 ${isNeon ? 'glow-text' : ''}`}>{layoutParam === 'scoreboard' ? 'PLACAR' : 'TOP JOGADORES'}</span>
                <span className="ml-auto text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 relative z-10">{sorted.length}</span>
              </div>

              {sorted.length === 0 ? (
                <div className="py-12 text-center">
                  <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                    <Gamepad2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  </motion.div>
                  <p className="text-[12px] opacity-30 font-bold tracking-wider">AGUARDANDO JOGADORES...</p>
                  <div className="flex justify-center gap-1 mt-3">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pc, opacity: 0.3 }} animate={{ opacity: [0.3, 0.8, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  <AnimatePresence initial={false}>
                    {sorted.map((e, i) => (
                      <motion.li key={e.id} layout initial={{ opacity: 0, x: layoutParam === 'fullscreen' ? -40 : 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1, backgroundColor: e.isNew ? `${pc}15` : i === 0 ? `${pc}08` : 'transparent' }} exit={{ opacity: 0, x: -30, scale: 0.85 }} transition={{ type: 'spring', stiffness: 350, damping: 28, backgroundColor: { duration: 1.5 } }} className="relative px-4 py-3 border-l-[3px] cursor-default" style={{ borderLeftColor: getRankBorderColor(i), boxShadow: getRankGlow(i) }}>

                        {i === 0 && <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, ${pc}08, transparent 60%)` }} />}

                        <div className="flex items-center gap-3 relative z-10">
                          <motion.div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-gray-400/15' : i === 2 ? 'bg-amber-600/15' : 'bg-white/[0.06]'}`} style={i === 0 ? { boxShadow: `0 0 10px ${pc}30` } : {}} whileHover={{ scale: 1.15, rotate: 5 }}>
                            {getRankIcon(i)}
                          </motion.div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-[12px] font-black truncate ${i === 0 ? 'shimmer-text' : i < 3 ? 'text-white' : 'text-white/80'}`}>{e.name}</p>
                              {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0 float-slow" />}
                              <RankIndicator prev={e.prevRank} curr={i} />
                            </div>
                            <p className="text-[9px] opacity-40 truncate mt-0.5">{e.game}</p>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <div className="flex items-center gap-1.5">
                              <AnimatedNumber value={e.score} color={i === 0 ? pc : i < 3 ? '#e5e5e5' : branding.textColor} size="text-[15px]" />
                              {e.scoreDelta !== undefined && e.scoreDelta > 0 && (
                                <motion.span initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -12 }} transition={{ duration: 1.5 }} className="text-[9px] font-black text-emerald-400">+{e.scoreDelta}</motion.span>
                              )}
                            </div>
                            <span className="text-[8px] opacity-30 font-bold">pts</span>
                          </div>
                        </div>

                        <div className="mt-2 ml-11 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: i === 0 ? pc : i === 1 ? '#9ca3af' : i === 2 ? ac : `${sc}80`, boxShadow: i === 0 ? `0 0 8px ${pc}60` : 'none' }} initial={{ width: 0 }} animate={{ width: `${barWidth(e.score)}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.05 }} />
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </motion.div>
          </div>
        )}

        {layoutParam !== 'minimal' && (
          <div className="absolute bottom-0 left-0 right-0 z-30">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.3 }} className="relative" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.85))', paddingTop: 30 }}>
              <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl backdrop-blur-xl border overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderColor: `${pc}20`, borderTop: `1px solid ${pc}30` }}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Activity className="h-3.5 w-3.5" style={{ color: pc }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60">Live</span>
                  </div>
                  <div className="w-px h-4 bg-white/10 shrink-0" />
                  <div className="flex-1 overflow-hidden relative h-5">
                    <AnimatePresence mode="popLayout">
                      {tickerEvents.length > 0 ? (
                        tickerEvents.map(ev => (
                          <motion.div key={ev.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 0.8 }} exit={{ x: -100, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="absolute inset-0 flex items-center gap-2 whitespace-nowrap">
                            <Fingerprint className="h-3 w-3 shrink-0" style={{ color: ev.color }} />
                            <span className="text-[11px] font-bold">{ev.text}</span>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div key="empty" className="absolute inset-0 flex items-center" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}>
                          <span className="text-[10px] tracking-wider">Aguardando eventos...</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {newPlayerNotify && layoutParam !== 'minimal' && (
            <motion.div key={newPlayerNotify.id} initial={{ x: 200, opacity: 0, scale: 0.8 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 200, opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 250, damping: 22 }} className={`absolute top-1/2 -translate-y-1/2 ${layoutParam === 'fullscreen' ? 'right-5' : 'right-[400px]'} z-40`}>
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl backdrop-blur-2xl border shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: `${sc}50`, boxShadow: `0 0 20px ${sc}30, 0 0 40px ${sc}15` }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${sc}, ${ac})`, boxShadow: `0 0 15px ${sc}50` }}>
                  <Users className="h-5 w-5 text-white" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.15em] opacity-50 font-bold">Novo jogador</span>
                  <span className="text-sm font-black" style={{ color: sc }}>{newPlayerNotify.name}</span>
                </div>
                <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}>
                  <Sparkles className="h-5 w-5" style={{ color: pc }} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {particles.map(p => (
          <ParticleBurst key={p.id} x={p.x} y={p.y} color={p.color} />
        ))}

        <AnimatePresence>
          {winner && showWinnerAnimation && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <motion.div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

              <motion.div initial={{ opacity: 0, scale: 0.3, y: 80, rotateX: -30 }} animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, scale: 0.8, y: 40, transition: { duration: 0.5, ease: 'easeIn' } }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} className="relative winner-glow">
                <motion.div className="absolute -inset-4 rounded-[28px] pointer-events-none" style={{ background: `linear-gradient(135deg, ${pc}60, ${ac}40, ${sc}60)`, filter: 'blur(20px)' }} animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} />

                <div className="relative px-14 py-8 rounded-3xl backdrop-blur-2xl border-2 shadow-2xl" style={{ background: `linear-gradient(135deg, ${pc}E6, ${ac}CC, ${pc}E6)`, borderColor: 'rgba(255,255,255,0.3)', backgroundSize: '200% 200%', animation: 'shimmer 3s ease infinite' }}>
                  <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`, backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="trophy-spin">
                        <Trophy className="h-16 w-16 text-yellow-900 drop-shadow-lg" />
                      </div>
                      <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <Sparkles className="h-6 w-6 text-yellow-800" />
                      </motion.div>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                          <Crown className="h-5 w-5 text-yellow-800" />
                        </motion.div>
                        <span className="text-[11px] uppercase tracking-[0.3em] font-black text-black/60">VENCEDOR</span>
                        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}>
                          <Crown className="h-5 w-5 text-yellow-800" />
                        </motion.div>
                      </div>
                      <motion.p className="text-4xl font-black text-black leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.15)' }} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 18 }}>{winner.name}</motion.p>
                      {winner.meta && (
                        <motion.p className="text-base font-bold text-black/60 mt-1" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>{winner.meta}</motion.p>
                      )}
                    </div>

                    <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}>
                      <Trophy className="h-14 w-14 text-yellow-900" />
                    </motion.div>
                  </div>

                  <div className="flex justify-center gap-2 mt-4 relative z-10">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-700/60" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8], y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15, ease: 'easeInOut' }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {isNeon && isLive && layoutParam !== 'minimal' && (
        <>
          <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none z-20">
            <div className="absolute top-3 left-3 w-8 h-[2px]" style={{ backgroundColor: `${pc}50` }} />
            <div className="absolute top-3 left-3 w-[2px] h-8" style={{ backgroundColor: `${pc}50` }} />
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none z-20">
            <div className="absolute top-3 right-3 w-8 h-[2px]" style={{ backgroundColor: `${pc}50` }} />
            <div className="absolute top-3 right-3 w-[2px] h-8" style={{ backgroundColor: `${pc}50` }} />
          </div>
          <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none z-20">
            <div className="absolute bottom-3 left-3 w-8 h-[2px]" style={{ backgroundColor: `${pc}50` }} />
            <div className="absolute bottom-3 left-3 w-[2px] h-8" style={{ backgroundColor: `${pc}50` }} />
          </div>
          <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none z-20">
            <div className="absolute bottom-3 right-3 w-8 h-[2px]" style={{ backgroundColor: `${pc}50` }} />
            <div className="absolute bottom-3 right-3 w-[2px] h-8" style={{ backgroundColor: `${pc}50` }} />
          </div>
        </>
      )}
    </div>
  );
};

export default OverlayPro;
