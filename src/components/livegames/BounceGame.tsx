import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Play, Trophy, CircleDot, ArrowLeft, ArrowRight, Volume2, VolumeX } from "lucide-react";

/**
 * BOUNCE — o clássico da bola quicando, estilo app nativo.
 * Sobe plataformas, junta anéis, evita espinhos e não caia!
 * Visual limpo e moderno: céu suave, plataformas planas, sem exageros.
 */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "menu" | "playing" | "gameover";

interface Platform {
  x: number; y: number; w: number;
  type: "normal" | "moving" | "spike" | "spring";
  dir: number; speed: number; minX: number; maxX: number;
  baseX: number;
}

interface Ring { x: number; y: number; taken: boolean; t: number; }
interface Cloud { x: number; y: number; s: number; v: number; }

const WORLD_W = 480;
const WORLD_H = 720;
const GRAV = 1500;          // px/s²
const BOUNCE_V = -760;      // impulso do salto
const SPRING_V = -1250;     // impulso da mola
const MOVE = 260;           // px/s horizontal
const BALL_R = 14;

const C = {
  sky1: "#bfe3ff", sky2: "#eef8ff",
  plat: "#3f8cff", platTop: "#7db5ff", platSide: "#2f6fd8",
  spike: "#ff5d6c",
  spring: "#31c48d",
  ring: "#ffb020",
  ball: "#ff7a3d", ballDark: "#e05a1f", ballLight: "#ffd9c4",
  ink: "#1e2a3a",
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function BounceGame({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => { try { return parseInt(localStorage.getItem("bounce_best") || "0") || 0; } catch { return 0; } });
  const [lives, setLives] = useState(3);
  const [muted, setMuted] = useState(false);
  const [height, setHeight] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const keys = useRef({ left: false, right: false });
  const state = useRef({
    x: WORLD_W / 2, y: WORLD_H - 140, vx: 0, vy: 0,
    camY: 0, maxY: 0, score: 0, lives: 3, ringsTaken: 0,
    platforms: [] as Platform[], rings: [] as Ring[], clouds: [] as Cloud[],
    lastT: 0, squash: 0, running: false, dead: false, shakeT: 0,
  });

  // ---------- áudio simples (sem ficheiros) ----------
  const audioRef = useRef<{ ctx: AudioContext | null }>({ ctx: null });
  const beep = useCallback((freq: number, dur = 0.08, type: OscillatorType = "sine", vol = 0.16) => {
    if (muted) return;
    try {
      if (!audioRef.current.ctx) audioRef.current.ctx = new AudioContext();
      const ctx = audioRef.current.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* sem áudio */ }
  }, [muted]);

  // ---------- geração de mundo ----------
  const genWorld = useCallback(() => {
    const s = state.current;
    s.platforms = []; s.rings = []; s.clouds = [];
    s.x = WORLD_W / 2; s.y = WORLD_H - 140; s.vx = 0; s.vy = BOUNCE_V;
    s.camY = 0; s.maxY = 0; s.score = 0; s.lives = 3; s.ringsTaken = 0;
    s.dead = false; s.squash = 0; s.shakeT = 0;

    // plataforma inicial larga
    s.platforms.push({ x: WORLD_W / 2 - 80, y: WORLD_H - 100, w: 160, type: "normal", dir: 1, speed: 0, minX: 0, maxX: 0, baseX: 0 });

    // escada de plataformas até cima (gera sob demanda)
    let y = WORLD_H - 190;
    let i = 0;
    while (y > -WORLD_H * 6) {
      genRow(s, y, i);
      y -= rand(88, 118);
      i++;
    }
    for (let c = 0; c < 7; c++) s.clouds.push({ x: rand(0, WORLD_W), y: rand(0, WORLD_H), s: rand(0.5, 1.2), v: rand(6, 14) });
  }, []);

  const genRow = (s: typeof state.current, y: number, i: number) => {
    const diff = Math.min(1, i / 60); // 0→1 dificuldade
    const w = rand(150 - 70 * diff, 210 - 90 * diff);
    const x = rand(12, WORLD_W - w - 12);
    const type: Platform["type"] =
      Math.random() < 0.10 + 0.10 * diff ? "spike" :
      Math.random() < 0.10 ? "spring" :
      Math.random() < 0.12 + 0.18 * diff ? "moving" : "normal";
    const speed = type === "moving" ? rand(40, 60 + 60 * diff) : 0;
    const range = type === "moving" ? rand(50, 120) : 0;
    s.platforms.push({
      x, y, w, type, dir: Math.random() < 0.5 ? -1 : 1, speed,
      minX: x - range, maxX: x + range, baseX: x,
    });
    // anéis por cima (mais raros com dificuldade)
    if (type !== "spike" && Math.random() < 0.62 - 0.2 * diff) {
      s.rings.push({ x: x + w / 2, y: y - rand(34, 54), taken: false, t: Math.random() * 6 });
    }
  };

  // ---------- loop ----------
  const step = useCallback((t: number) => {
    const s = state.current;
    if (!s.running) return;
    const dt = Math.min(0.033, (t - s.lastT) / 1000 || 0.016);
    s.lastT = t;

    // input
    let ax = 0;
    if (keys.current.left) ax -= MOVE;
    if (keys.current.right) ax += MOVE;
    s.vx = ax; // controlo direto (responsivo)
    s.x += s.vx * dt;
    if (s.x < BALL_R) { s.x = BALL_R; }
    if (s.x > WORLD_W - BALL_R) { s.x = WORLD_W - BALL_R; }

    // física
    s.vy += GRAV * dt;
    s.y += s.vy * dt;

    // colisões (só a descer)
    if (s.vy > 0) {
      for (const p of s.platforms) {
        const top = p.y;
        if (s.x + BALL_R * 0.7 > p.x && s.x - BALL_R * 0.7 < p.x + p.w &&
            s.y + BALL_R > top && s.y + BALL_R < top + 26) {
          if (p.type === "spike") {
            // espinho = perde vida
            s.lives -= 1; s.shakeT = 0.25;
            beep(160, 0.18, "sawtooth", 0.2);
            setLives(s.lives);
            if (s.lives <= 0) { die(); return; }
            s.vy = BOUNCE_V; s.squash = 1;
            continue;
          }
          s.vy = p.type === "spring" ? SPRING_V : BOUNCE_V;
          s.squash = 1;
          beep(p.type === "spring" ? 720 : 300, p.type === "spring" ? 0.12 : 0.07, p.type === "spring" ? "triangle" : "sine");
          if (p.type === "spring") beep(960, 0.1, "triangle", 0.1);
          break;
        }
      }
    }

    // anéis
    for (const r of s.rings) {
      if (!r.taken) {
        const dx = r.x - s.x, dy = r.y - s.y;
        if (dx * dx + dy * dy < (BALL_R + 11) * (BALL_R + 11)) {
          r.taken = true; s.ringsTaken++; s.score += 25;
          beep(1180, 0.09, "triangle", 0.14);
          setTimeout(() => beep(1560, 0.09, "triangle", 0.12), 70);
          setScore(s.score);
        }
      }
      r.t += dt * 3;
    }

    // plataformas em movimento
    for (const p of s.platforms) {
      if (p.type === "moving") {
        p.x += p.dir * p.speed * dt;
        if (p.x < p.minX) { p.x = p.minX; p.dir = 1; }
        if (p.x > p.maxX) { p.x = p.maxX; p.dir = -1; }
      }
    }

    // altura → pontos
    const climbed = Math.max(0, Math.floor((s.maxY - s.y) / 10));
    const newScore = s.ringsTaken * 25 + climbed;
    if (newScore !== s.score) { s.score = newScore; setScore(s.score); }
    s.maxY = Math.min(s.maxY, s.y);
    setHeight(Math.max(0, Math.floor((WORLD_H - 100 - s.y) / 10)));

    // caiu?
    if (s.y - s.camY > WORLD_H + 60) {
      s.lives -= 1; s.shakeT = 0.3;
      beep(140, 0.25, "sawtooth", 0.22);
      setLives(s.lives);
      if (s.lives <= 0) { die(); return; }
      // reposiciona na plataforma mais próxima abaixo da câmara
      s.y = s.camY + 120; s.vy = 0; s.x = WORLD_W / 2;
    }

    // câmara segue para cima
    const targetCam = s.y - WORLD_H * 0.58;
    if (targetCam < s.camY) s.camY += (targetCam - s.camY) * Math.min(1, dt * 8);

    // gera mais plataformas acima
    const topVisible = s.camY - 200;
    let highest = Infinity;
    for (const p of s.platforms) highest = Math.min(highest, p.y);
    while (highest > topVisible) {
      highest -= rand(88, 118);
      genRow(s, highest, Math.floor((WORLD_H - highest) / 100));
    }
    // limpa o que ficou muito abaixo
    if (s.platforms.length > 140) {
      s.platforms = s.platforms.filter(p => p.y < s.camY + WORLD_H + 300);
      s.rings = s.rings.filter(r => r.y < s.camY + WORLD_H + 300);
    }

    // nuvens
    for (const c of s.clouds) { c.y += c.v * dt * 0.3; if (c.y > WORLD_H + 40) { c.y = -40; c.x = rand(0, WORLD_W); } }
    if (s.squash > 0) s.squash = Math.max(0, s.squash - dt * 5);
    if (s.shakeT > 0) s.shakeT -= dt;

    draw();
  }, [beep]);

  const die = () => {
    const s = state.current;
    s.running = false;
    setPhase("gameover");
    setBest(b => {
      const nb = Math.max(b, s.score);
      try { localStorage.setItem("bounce_best", String(nb)); } catch { /* ignora */ }
      return nb;
    });
    try { onScore?.("Bounce", s.score); } catch { /* ignora */ }
  };

  // ---------- desenho (limpo e moderno) ----------
  const draw = () => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const s = state.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== WORLD_W * dpr) { cv.width = WORLD_W * dpr; cv.height = WORLD_H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // céu
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, C.sky1); sky.addColorStop(1, C.sky2);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    const shake = s.shakeT > 0 ? Math.sin(s.shakeT * 60) * 5 * s.shakeT : 0;
    ctx.save();
    ctx.translate(shake, 0);

    // nuvens simples
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const c of s.clouds) {
      const cy = c.y - s.camY * 0.25;
      const yy = ((cy % (WORLD_H + 80)) + WORLD_H + 80) % (WORLD_H + 80) - 40;
      ctx.beginPath();
      ctx.arc(c.x, yy, 16 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 16 * c.s, yy + 4 * c.s, 12 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x - 16 * c.s, yy + 5 * c.s, 11 * c.s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(0, -s.camY);

    // plataformas
    for (const p of s.platforms) {
      if (p.y < s.camY - 40 || p.y > s.camY + WORLD_H + 40) continue;
      if (p.type === "spike") {
        ctx.fillStyle = "#ffdfe2";
        roundRect(ctx, p.x, p.y, p.w, 18, 8); ctx.fill();
        ctx.fillStyle = C.spike;
        const n = Math.floor(p.w / 14);
        for (let k = 0; k < n; k++) {
          const sx = p.x + 7 + k * 14;
          ctx.beginPath(); ctx.moveTo(sx - 6, p.y + 4); ctx.lineTo(sx, p.y - 7); ctx.lineTo(sx + 6, p.y + 4); ctx.closePath(); ctx.fill();
        }
      } else if (p.type === "spring") {
        ctx.fillStyle = "#dcfce7";
        roundRect(ctx, p.x, p.y, p.w, 18, 8); ctx.fill();
        ctx.fillStyle = C.spring;
        roundRect(ctx, p.x, p.y, p.w, 8, 4); ctx.fill();
        ctx.fillStyle = C.spring;
        const cx = p.x + p.w / 2;
        ctx.beginPath(); ctx.moveTo(cx - 9, p.y - 2); ctx.lineTo(cx + 9, p.y - 2); ctx.lineTo(cx, p.y - 14); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = C.platSide;
        roundRect(ctx, p.x, p.y + 4, p.w, 16, 8); ctx.fill();
        ctx.fillStyle = p.type === "moving" ? "#63a4ff" : C.plat;
        roundRect(ctx, p.x, p.y, p.w, 16, 8); ctx.fill();
        ctx.fillStyle = C.platTop;
        roundRect(ctx, p.x + 4, p.y + 2, p.w - 8, 4, 2); ctx.fill();
      }
    }

    // anéis
    for (const r of s.rings) {
      if (r.taken || r.y < s.camY - 30 || r.y > s.camY + WORLD_H + 30) continue;
      const yy = r.y + Math.sin(r.t) * 3;
      ctx.lineWidth = 4.5; ctx.strokeStyle = C.ring;
      ctx.beginPath(); ctx.ellipse(r.x, yy, 10, 12 * Math.abs(Math.cos(r.t * 0.8)) + 4, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // bola
    const sq = 1 - s.squash * 0.28;
    const sw = 1 + s.squash * 0.22;
    ctx.fillStyle = C.ballDark;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 2, BALL_R * sw, BALL_R * sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ball;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, BALL_R * sw, BALL_R * sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ballLight;
    ctx.beginPath(); ctx.ellipse(s.x - 4, s.y - 5, 4.5, 3.5, -0.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore(); // camY
    ctx.restore(); // shake

    // HUD interno
    ctx.fillStyle = "rgba(30,42,58,0.8)";
    roundRect(ctx, 10, 10, 108, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(`⚽ ${s.score}`, 20, 30);
    ctx.fillStyle = "rgba(30,42,58,0.8)";
    roundRect(ctx, WORLD_W - 118, 10, 108, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(`♥ ${s.lives}`, WORLD_W - 106, 30);
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // ---------- controlo do ciclo ----------
  useEffect(() => {
    if (phase !== "playing") return;
    const s = state.current;
    s.running = true; s.lastT = performance.now();
    let raf = 0;
    const loop = (t: number) => { step(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); s.running = false; };
  }, [phase, step]);

  // teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const start = () => {
    genWorld();
    setScore(0); setLives(3); setHeight(0);
    setPhase("playing");
    beep(560, 0.1, "triangle");
  };

  // toque nos lados do ecrã (além dos botões)
  const touchSide = (side: "left" | "right", on: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keys.current[side] = on;
  };

  return (
    <div className="w-full max-w-md mx-auto" data-testid="bounce-game">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg">⚽</div>
          <div>
            <h3 className="font-black text-base leading-none">Bounce</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">O clássico da bola quicando{liveCode ? ` · Live ${liveCode}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="gap-1"><Trophy className="h-3 w-3" /> {best}</Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMuted(m => !m)} title={muted ? "Ativar som" : "Silenciar"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Área de jogo */}
      <div ref={wrapRef} className="relative rounded-3xl overflow-hidden border-2 border-sky-200/60 shadow-xl bg-gradient-to-b from-sky-100 to-indigo-50">
        <canvas
          ref={canvasRef}
          className="w-full block touch-none select-none"
          style={{ aspectRatio: `${WORLD_W}/${WORLD_H}` }}
          data-testid="bounce-canvas"
        />

        <AnimatePresence>
          {phase === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-sky-900/40 to-indigo-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 p-6 text-center">
              <motion.div className="text-6xl" animate={{ y: [0, -14, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>⚽</motion.div>
              <div>
                <h2 className="text-3xl font-black text-white drop-shadow">BOUNCE</h2>
                <p className="text-white/85 text-sm mt-2 max-w-[260px]">
                  Quica nas plataformas, junta os anéis e evita os espinhos. Tens 3 vidas — até onde chegas?
                </p>
              </div>
              <Button size="lg" className="rounded-full px-8 font-black bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700" onClick={start} data-testid="bounce-play">
                <Play className="h-5 w-5 mr-1" /> JOGAR
              </Button>
              <p className="text-white/60 text-[11px]">← → para mover · ou os botões no ecrã</p>
            </motion.div>
          )}

          {phase === "gameover" && (
            <motion.div key="over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-indigo-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="text-5xl">💥</motion.div>
              <h2 className="text-2xl font-black text-white">Fim de Jogo!</h2>
              <div className="flex gap-6 text-white">
                <div><p className="text-[10px] uppercase tracking-wide text-white/60">Pontos</p><p className="text-2xl font-black" data-testid="bounce-final">{score}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-white/60">Altura</p><p className="text-2xl font-black">{height}m</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-white/60">Recorde</p><p className="text-2xl font-black">{best}</p></div>
              </div>
              {score >= best && score > 0 && <Badge className="bg-amber-400 text-amber-950 font-black">NOVO RECORDE! 🏆</Badge>}
              <Button size="lg" className="rounded-full px-8 font-black mt-1 bg-gradient-to-r from-sky-500 to-indigo-600" onClick={start}>
                <RotateCcw className="h-5 w-5 mr-1" /> JOGAR DE NOVO
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controles touch (durante o jogo) */}
        {phase === "playing" && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-between px-4 pointer-events-none">
            <button
              className="pointer-events-auto h-16 w-24 rounded-2xl bg-slate-900/35 active:bg-slate-900/60 backdrop-blur flex items-center justify-center text-white touch-none select-none"
              onTouchStart={touchSide("left", true)} onTouchEnd={touchSide("left", false)}
              onMouseDown={touchSide("left", true)} onMouseUp={touchSide("left", false)} onMouseLeave={touchSide("left", false)}
              aria-label="Esquerda" data-testid="bounce-left"
            ><ArrowLeft className="h-7 w-7" /></button>
            <button
              className="pointer-events-auto h-16 w-24 rounded-2xl bg-slate-900/35 active:bg-slate-900/60 backdrop-blur flex items-center justify-center text-white touch-none select-none"
              onTouchStart={touchSide("right", true)} onTouchEnd={touchSide("right", false)}
              onMouseDown={touchSide("right", true)} onMouseUp={touchSide("right", false)} onMouseLeave={touchSide("right", false)}
              aria-label="Direita" data-testid="bounce-right"
            ><ArrowRight className="h-7 w-7" /></button>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-2">
        {score} pontos · {height} m de altura
      </p>
    </div>
  );
}
