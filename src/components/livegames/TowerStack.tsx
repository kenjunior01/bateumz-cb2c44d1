
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, ArrowDown, Layers } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Block {
  x: number;
  width: number;
  hue: number;
}

interface FallingPiece {
  x: number;
  worldY: number;
  width: number;
  vy: number;
  opacity: number;
  hue: number;
}

interface Particle {
  x: number;
  worldY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

interface GameState {
  blocks: Block[];
  fallingPieces: FallingPiece[];
  particles: Particle[];
  swingingBlock: Block | null;
  score: number;
  gameOver: boolean;
  started: boolean;
  combo: number;
  msg: string | null;
  msgTimer: number;
  flash: number;
  cameraY: number;
  phase: number;
  baseHue: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CANVAS_HEIGHT = 500;
const BLOCK_H = 22;
const INIT_W_RATIO = 0.6;
const PERFECT_TH = 2;
const MIN_W = 4;
const BASE_SPD = 2.5;
const SPD_INC = 0.12;
const GRAVITY = 0.35;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeGame(hue: number, halfW: number): GameState {
  const w = halfW * INIT_W_RATIO;
  return {
    blocks: [{ x: (halfW - w) / 2, width: w, hue }],
    fallingPieces: [],
    particles: [],
    swingingBlock: null,
    score: 0,
    gameOver: false,
    started: false,
    combo: 0,
    msg: null,
    msgTimer: 0,
    flash: 0,
    cameraY: 0,
    phase: 0,
    baseHue: hue,
  };
}

function spawnSwing(g: GameState) {
  const top = g.blocks[g.blocks.length - 1];
  g.swingingBlock = {
    x: 0,
    width: top.width,
    hue: g.baseHue + g.blocks.length * 9,
  };
}

function swingXPos(phase: number, bw: number, halfW: number) {
  return (halfW - bw) * 0.5 * (1 + Math.sin(phase));
}

function spd(score: number) {
  return BASE_SPD + score * SPD_INC;
}

function makeStars(n: number, w: number, h: number): Star[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 1.5 + 0.5,
    brightness: Math.random() * 0.5 + 0.2,
  }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TowerStack({ onScore, liveCode: _liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gamesRef = useRef<[GameState, GameState] | null>(null);
  const starsRef = useRef<Star[]>([]);
  const initRef = useRef(false);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  const [canvasW, setCanvasW] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [overFlags, setOverFlags] = useState<[boolean, boolean]>([false, false]);
  const [ready, setReady] = useState(false);

  /* ---- measure container ---- */
  useEffect(() => {
    const m = () => {
      const w = containerRef.current?.clientWidth ?? 0;
      if (w > 0) setCanvasW(w);
    };
    m();
    window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);

  /* ---- init game ---- */
  useEffect(() => {
    if (initRef.current || canvasW <= 0) return;
    initRef.current = true;
    const hw = canvasW / 2;
    const g1 = makeGame(185, hw);
    const g2 = makeGame(330, hw);
    spawnSwing(g1);
    spawnSwing(g2);
    g1.started = true;
    g2.started = true;
    gamesRef.current = [g1, g2];
    starsRef.current = makeStars(90, canvasW, CANVAS_HEIGHT);
    setScores([0, 0]);
    setOverFlags([false, false]);
    setReady(true);
  }, [canvasW]);

  /* ---- drop block ---- */
  const dropBlock = useCallback((pi: number) => {
    const games = gamesRef.current;
    if (!games) return;
    const g = games[pi];
    if (!g || g.gameOver || !g.swingingBlock || !g.started) return;

    const cv = canvasRef.current;
    if (!cv) return;
    const halfW = cv.width / 2;
    const sw = g.swingingBlock;
    const sx = swingXPos(g.phase, sw.width, halfW);
    const top = g.blocks[g.blocks.length - 1];

    const oL = Math.max(sx, top.x);
    const oR = Math.min(sx + sw.width, top.x + top.width);
    const oW = oR - oL;
    const newWorldY = g.blocks.length * BLOCK_H;

    /* miss */
    if (oW <= 0 || oW < MIN_W) {
      g.gameOver = true;
      g.swingingBlock = null;
      g.msg = 'Caiu!';
      g.msgTimer = 200;
      setOverFlags(prev => {
        const next: [boolean, boolean] = [prev[0], prev[1]];
        next[pi] = true;
        if (next[0] && next[1]) {
          if (games[0].score > games[1].score)
            onScoreRef.current?.('Jogador 1', games[0].score);
          else if (games[1].score > games[0].score)
            onScoreRef.current?.('Jogador 2', games[1].score);
          else
            onScoreRef.current?.('Jogador 1', games[0].score);
        }
        return next;
      });
      return;
    }

    /* perfect? */
    const diff = Math.abs(sx - top.x);
    const isPerfect = diff < PERFECT_TH && oW >= top.width - PERFECT_TH;

    let nX: number;
    let nW: number;

    if (isPerfect) {
      nX = top.x;
      nW = top.width;
      g.combo++;
      g.flash = 18;
      g.msg = g.combo > 1 ? `Perfeito! x${g.combo}` : 'Perfeito!';
      g.msgTimer = 70;
      burstParticles(g, top, newWorldY, 25);
    } else {
      g.combo = 0;
      nX = oL;
      nW = oW;

      /* falling cut pieces */
      if (sx < top.x) {
        const cw = top.x - sx;
        if (cw > 0.5)
          g.fallingPieces.push({
            x: sx, worldY: newWorldY, width: cw,
            vy: 0, opacity: 0.9, hue: sw.hue,
          });
      }
      if (sx + sw.width > top.x + top.width) {
        const cs = top.x + top.width;
        const cw = sx + sw.width - cs;
        if (cw > 0.5)
          g.fallingPieces.push({
            x: cs, worldY: newWorldY, width: cw,
            vy: 0, opacity: 0.9, hue: sw.hue,
          });
      }

      if (oW > sw.width * 0.45) {
        g.msg = 'Bom!';
        g.msgTimer = 40;
        burstParticles(g, { x: nX, width: nW, hue: sw.hue }, newWorldY, 6);
      }
    }

    g.blocks.push({ x: nX, width: nW, hue: sw.hue });
    g.score++;
    g.swingingBlock = null;
    spawnSwing(g);
    setScores([games[0].score, games[1].score]);
  }, []);

  function burstParticles(g: GameState, block: Block, worldY: number, count: number) {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x: block.x + Math.random() * block.width,
        worldY: worldY + BLOCK_H * 0.5,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 1,
        life: 35 + Math.random() * 25,
        maxLife: 60,
        hue: block.hue + (Math.random() - 0.5) * 30,
        size: Math.random() * 3 + 1,
      });
    }
  }

  /* ---- keyboard ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); dropBlock(0); }
      if (e.code === 'Enter') { e.preventDefault(); dropBlock(1); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dropBlock]);

  /* ---- pointer on canvas ---- */
  const handlePtr = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const halfW = rect.width / 2;
    dropBlock(x < halfW ? 0 : 1);
  }, [dropBlock]);

  /* ---- animation loop ---- */
  useEffect(() => {
    if (!ready) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let fid: number;
    const loop = () => {
      const games = gamesRef.current;
      if (!games) { fid = requestAnimationFrame(loop); return; }
      const W = cv.width;
      const H = CANVAS_HEIGHT;
      const halfW = W / 2;

      /* update */
      for (let p = 0; p < 2; p++) {
        const g = games[p];
        if (!g.gameOver && g.swingingBlock) {
          g.phase += spd(g.score) * 0.03;
        }
        const tgt = Math.max(0, (g.blocks.length + 1) * BLOCK_H - H * 0.65);
        g.cameraY += (tgt - g.cameraY) * 0.08;
        for (const fp of g.fallingPieces) {
          fp.vy += GRAVITY;
          fp.worldY -= fp.vy;
          fp.opacity -= 0.018;
        }
        g.fallingPieces = g.fallingPieces.filter(fp => fp.opacity > 0 && fp.worldY > -200);
        for (const pt of g.particles) {
          pt.x += pt.vx;
          pt.worldY += pt.vy;
          pt.vy -= 0.12;
          pt.life--;
          pt.vx *= 0.97;
        }
        g.particles = g.particles.filter(pt => pt.life > 0);
        if (g.msgTimer > 0) { g.msgTimer--; if (g.msgTimer <= 0) g.msg = null; }
        if (g.flash > 0) g.flash--;
      }

      /* draw */
      ctx.clearRect(0, 0, W, H);

      /* background */
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#020617');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* stars */
      for (const s of starsRef.current) {
        const sy = ((s.y - (games[0].cameraY + games[1].cameraY) * 0.05) % H + H) % H;
        ctx.globalAlpha = s.brightness;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* each player */
      for (let p = 0; p < 2; p++) {
        const g = games[p];
        const ox = p * halfW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, 0, halfW, H);
        ctx.clip();

        const toX = (wx: number) => ox + wx;
        const toY = (wy: number) => H - (wy - g.cameraY) - BLOCK_H;

        /* stacked blocks */
        for (let i = 0; i < g.blocks.length; i++) {
          const b = g.blocks[i];
          const cy = toY(i * BLOCK_H);
          if (cy > H + BLOCK_H || cy < -BLOCK_H * 2) continue;
          const cx = toX(b.x);
          const isCombo = g.combo > 1 && i >= g.blocks.length - g.combo;
          const sat = isCombo ? 100 : 80;
          const lit = isCombo ? 62 : 52;

          if (isCombo) {
            ctx.shadowColor = `hsl(${b.hue}, 100%, 60%)`;
            ctx.shadowBlur = 6 + g.combo * 4;
          }

          const gr = ctx.createLinearGradient(0, cy, 0, cy + BLOCK_H);
          gr.addColorStop(0, `hsl(${b.hue}, ${sat}%, ${lit}%)`);
          gr.addColorStop(1, `hsl(${b.hue + 15}, ${sat}%, ${lit - 12}%)`);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.roundRect(cx, cy, b.width, BLOCK_H, 3);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          /* highlight */
          ctx.fillStyle = 'rgba(255,255,255,0.13)';
          ctx.beginPath();
          ctx.roundRect(cx, cy, b.width, BLOCK_H * 0.35, [3, 3, 0, 0]);
          ctx.fill();
        }

        /* swinging block */
        if (g.swingingBlock && !g.gameOver) {
          const sw = g.swingingBlock;
          const sx = swingXPos(g.phase, sw.width, halfW);
          const sy = toY(g.blocks.length * BLOCK_H);

          ctx.globalAlpha = 0.85;
          const sg = ctx.createLinearGradient(0, sy, 0, sy + BLOCK_H);
          sg.addColorStop(0, `hsl(${sw.hue}, 80%, 60%)`);
          sg.addColorStop(1, `hsl(${sw.hue + 15}, 80%, 48%)`);
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.roundRect(toX(sx), sy, sw.width, BLOCK_H, 3);
          ctx.fill();
          ctx.globalAlpha = 1;

          /* faint guide */
          const tb = g.blocks[g.blocks.length - 1];
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(toX(tb.x), sy + BLOCK_H * 0.5);
          ctx.lineTo(toX(tb.x + tb.width), sy + BLOCK_H * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        /* falling pieces */
        for (const fp of g.fallingPieces) {
          const cy = toY(fp.worldY);
          if (cy > H + 100 || cy < -100) continue;
          ctx.globalAlpha = Math.max(0, fp.opacity);
          ctx.fillStyle = `hsl(${fp.hue}, 65%, 42%)`;
          ctx.beginPath();
          ctx.roundRect(toX(fp.x), cy, fp.width, BLOCK_H, 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* particles */
        for (const pt of g.particles) {
          const cy = toY(pt.worldY);
          if (cy < -50 || cy > H + 50) continue;
          const a = pt.life / pt.maxLife;
          ctx.globalAlpha = a;
          ctx.fillStyle = `hsl(${pt.hue}, 100%, 72%)`;
          ctx.beginPath();
          ctx.arc(toX(pt.x), cy, pt.size * a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* flash */
        if (g.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${g.flash / 36})`;
          ctx.fillRect(ox, 0, halfW, H);
        }

        /* message */
        if (g.msg && g.msgTimer > 0) {
          const a = Math.min(1, g.msgTimer / 15);
          ctx.globalAlpha = a;
          ctx.font = 'bold 22px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (g.msg.includes('Perfeito')) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#fbbf24';
          } else if (g.msg === 'Bom!') {
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#4ade80';
          } else {
            ctx.shadowColor = '#f87171';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#f87171';
          }
          const msgY = toY(g.blocks.length * BLOCK_H) - 24;
          ctx.fillText(g.msg, ox + halfW / 2, msgY);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }

        /* hint */
        if (g.score === 0 && !g.gameOver) {
          const pulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.3;
          ctx.globalAlpha = pulse;
          ctx.font = '14px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Solte para empilhar!', ox + halfW / 2, H * 0.45);
          ctx.globalAlpha = 1;
        }

        /* game over overlay on canvas */
        if (g.gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(ox, 0, halfW, H);
          ctx.font = 'bold 32px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f87171';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 12;
          ctx.fillText('Caiu!', ox + halfW / 2, H * 0.44);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.font = '16px system-ui,sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`Altura: ${g.score}`, ox + halfW / 2, H * 0.44 + 36);
        }

        ctx.restore();
      }

      /* divider */
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;

      fid = requestAnimationFrame(loop);
    };

    fid = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fid);
  }, [ready]);

  /* ---- restart ---- */
  const restart = useCallback(() => {
    initRef.current = false;
    setReady(false);
    gamesRef.current = null;
    setScores([0, 0]);
    setOverFlags([false, false]);
    requestAnimationFrame(() => {
      const w = containerRef.current?.clientWidth ?? 0;
      if (w > 0) setCanvasW(w);
    });
  }, []);

  const bothDone = overFlags[0] && overFlags[1];

  /* ---- JSX ---- */
  return (
    <div className="flex flex-col gap-3 w-full" ref={containerRef}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs shrink-0">
            Jogador 1
          </Badge>
          <motion.span
            key={scores[0]}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className="text-cyan-300 font-bold text-lg truncate"
          >
            {scores[0]} blocos
          </motion.span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-4 h-4 text-white/50" />
          <span className="text-white/70 font-black tracking-widest text-xs">TORRE VS</span>
          <Layers className="w-4 h-4 text-white/50" />
        </div>

        <div className="flex items-center gap-2 min-w-0 justify-end">
          <motion.span
            key={scores[1]}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className="text-pink-300 font-bold text-lg truncate"
          >
            {scores[1]} blocos
          </motion.span>
          <Badge variant="outline" className="border-pink-500/50 text-pink-400 text-xs shrink-0">
            Jogador 2
          </Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          width={canvasW || 600}
          height={CANVAS_HEIGHT}
          className="w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800 cursor-pointer"
          style={{ height: CANVAS_HEIGHT, touchAction: 'none' }}
          onPointerDown={handlePtr}
        />

        <AnimatePresence>
          {bothDone && (
            <motion.div
              key="winner"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl z-10"
            >
              <motion.p
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={cn(
                  'text-3xl font-black tracking-tight',
                  scores[0] > scores[1]
                    ? 'text-cyan-400'
                    : scores[1] > scores[0]
                      ? 'text-pink-400'
                      : 'text-amber-400',
                )}
              >
                {scores[0] > scores[1]
                  ? 'Jogador 1 Venceu!'
                  : scores[1] > scores[0]
                    ? 'Jogador 2 Venceu!'
                    : 'Empate!'}
              </motion.p>
              <div className="flex gap-8 mt-4 text-sm text-slate-300">
                <span>
                  Jogador 1:{' '}
                  <span className="text-cyan-400 font-bold">{scores[0]} blocos</span>
                </span>
                <span>
                  Jogador 2:{' '}
                  <span className="text-pink-400 font-bold">{scores[1]} blocos</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowDown className="w-3.5 h-3.5" />
          <span>P1: Espaço</span>
          <span className="mx-1 text-slate-700">|</span>
          <span>P2: Enter</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={restart}
          className="gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar Tudo
        </Button>
      </motion.div>
    </div>
  );
}
