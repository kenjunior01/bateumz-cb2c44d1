
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, ArrowDown, Layers, Trophy } from 'lucide-react';

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
  layer: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface NebulaBlob {
  x: number;
  y: number;
  radius: number;
  hue: number;
  alpha: number;
  parallax: number;
}

interface CollapseBlock {
  x: number;
  worldY: number;
  width: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  hue: number;
}

interface PerfectRing {
  cx: number;
  worldY: number;
  hue: number;
  life: number;
  maxLife: number;
  width: number;
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
  cameraVel: number;
  phase: number;
  baseHue: number;
  collapseBlocks: CollapseBlock[];
  collapseTimer: number;
  perfectRings: PerfectRing[];
}

interface BackgroundData {
  stars: Star[];
  nebulae: NebulaBlob[];
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
const PARALLAX_LAYERS = [0.015, 0.04, 0.08];

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
    cameraVel: 0,
    phase: 0,
    baseHue: hue,
    collapseBlocks: [],
    collapseTimer: 0,
    perfectRings: [],
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

function makeBackground(w: number, h: number): BackgroundData {
  const stars: Star[] = [];
  /* Layer 0 – far, small, dim */
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1 + 0.3,
      brightness: Math.random() * 0.3 + 0.1,
      layer: 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.005 + Math.random() * 0.01,
    });
  }
  /* Layer 1 – mid */
  for (let i = 0; i < 35; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.3 + 0.5,
      brightness: Math.random() * 0.4 + 0.2,
      layer: 1,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.008 + Math.random() * 0.015,
    });
  }
  /* Layer 2 – near, larger, brighter */
  for (let i = 0; i < 15; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.8 + 0.8,
      brightness: Math.random() * 0.4 + 0.3,
      layer: 2,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.012 + Math.random() * 0.02,
    });
  }

  const nebulae: NebulaBlob[] = [
    { x: w * 0.2, y: h * 0.3, radius: 120, hue: 220, alpha: 0.03, parallax: 0.02 },
    { x: w * 0.75, y: h * 0.6, radius: 100, hue: 320, alpha: 0.025, parallax: 0.015 },
    { x: w * 0.5, y: h * 0.15, radius: 80, hue: 180, alpha: 0.02, parallax: 0.025 },
  ];

  return { stars, nebulae };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TowerStack({ onScore, liveCode: _liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gamesRef = useRef<[GameState, GameState] | null>(null);
  const bgRef = useRef<BackgroundData | null>(null);
  const initRef = useRef(false);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  const [canvasW, setCanvasW] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [combos, setCombos] = useState<[number, number]>([0, 0]);
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
    bgRef.current = makeBackground(canvasW, CANVAS_HEIGHT);
    setScores([0, 0]);
    setCombos([0, 0]);
    setOverFlags([false, false]);
    setReady(true);
  }, [canvasW]);

  /* ---- trigger tower collapse on game over ---- */
  const triggerCollapse = useCallback((g: GameState) => {
    g.collapseTimer = Math.min(100, g.blocks.length * 3);
    for (let i = 1; i < g.blocks.length; i++) {
      const b = g.blocks[i];
      g.collapseBlocks.push({
        x: b.x,
        worldY: i * BLOCK_H,
        width: b.width,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * -1.5,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        opacity: 1,
        hue: b.hue,
      });
    }
    g.blocks = [g.blocks[0]]; // keep only base
  }, []);

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
      burstParticles(g, { x: sx, width: sw.width, hue: sw.hue }, newWorldY, 15);
      triggerCollapse(g);
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
      burstParticles(g, top, newWorldY, 30);
      g.perfectRings.push({
        cx: nX + nW / 2,
        worldY: newWorldY + BLOCK_H * 0.5,
        hue: sw.hue,
        life: 50,
        maxLife: 50,
        width: nW,
      });
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
        burstParticles(g, { x: nX, width: nW, hue: sw.hue }, newWorldY, 8);
      }
    }

    g.blocks.push({ x: nX, width: nW, hue: sw.hue });
    g.score++;
    g.swingingBlock = null;
    spawnSwing(g);
    setScores([games[0].score, games[1].score]);
    setCombos([games[0].combo, games[1].combo]);
  }, [triggerCollapse]);

  function burstParticles(g: GameState, block: Block, worldY: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      g.particles.push({
        x: block.x + Math.random() * block.width,
        worldY: worldY + BLOCK_H * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 + 1.5,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        hue: block.hue + (Math.random() - 0.5) * 40,
        size: Math.random() * 3.5 + 1,
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
      const bg = bgRef.current;
      if (!games || !bg) { fid = requestAnimationFrame(loop); return; }
      const W = cv.width;
      const H = CANVAS_HEIGHT;
      const halfW = W / 2;
      const now = Date.now();

      /* ============ UPDATE ============ */
      for (let p = 0; p < 2; p++) {
        const g = games[p];

        /* swing */
        if (!g.gameOver && g.swingingBlock) {
          g.phase += spd(g.score) * 0.03;
        }

        /* spring camera */
        const tgt = Math.max(0, (g.blocks.length + 1) * BLOCK_H - H * 0.6);
        const camSpeed = g.gameOver ? 0.03 : 0.08;
        const camDamp = g.gameOver ? 0.92 : 0.82;
        g.cameraVel = g.cameraVel * camDamp + (tgt - g.cameraY) * camSpeed;
        g.cameraY += g.cameraVel;

        /* falling pieces */
        for (const fp of g.fallingPieces) {
          fp.vy += GRAVITY;
          fp.worldY -= fp.vy;
          fp.opacity -= 0.018;
        }
        g.fallingPieces = g.fallingPieces.filter(fp => fp.opacity > 0 && fp.worldY > -200);

        /* particles */
        for (const pt of g.particles) {
          pt.x += pt.vx;
          pt.worldY += pt.vy;
          pt.vy -= 0.12;
          pt.life--;
          pt.vx *= 0.97;
        }
        g.particles = g.particles.filter(pt => pt.life > 0);

        /* perfect rings */
        for (const ring of g.perfectRings) {
          ring.life--;
        }
        g.perfectRings = g.perfectRings.filter(r => r.life > 0);

        /* collapse blocks */
        for (const cb of g.collapseBlocks) {
          cb.vy += GRAVITY * 0.6;
          cb.worldY -= cb.vy;
          cb.x += cb.vx;
          cb.vx *= 0.995;
          cb.rotation += cb.rotSpeed;
          cb.opacity -= 0.006;
        }
        g.collapseBlocks = g.collapseBlocks.filter(
          cb => cb.opacity > 0 && cb.worldY > -400,
        );
        if (g.collapseTimer > 0) g.collapseTimer--;

        /* message timer */
        if (g.msgTimer > 0) { g.msgTimer--; if (g.msgTimer <= 0) g.msg = null; }
        if (g.flash > 0) g.flash--;
      }

      /* ============ DRAW ============ */
      ctx.clearRect(0, 0, W, H);

      /* ---- background gradient ---- */
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#0c1225');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      /* ---- nebula blobs ---- */
      const avgCam = (games[0].cameraY + games[1].cameraY) * 0.5;
      for (const nb of bg.nebulae) {
        const ny = ((nb.y - avgCam * nb.parallax) % (H + nb.radius * 2) + H + nb.radius * 2) % (H + nb.radius * 2) - nb.radius;
        const grad = ctx.createRadialGradient(nb.x, ny, 0, nb.x, ny, nb.radius);
        grad.addColorStop(0, `hsla(${nb.hue}, 60%, 50%, ${nb.alpha})`);
        grad.addColorStop(0.5, `hsla(${nb.hue}, 50%, 40%, ${nb.alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(nb.x - nb.radius, ny - nb.radius, nb.radius * 2, nb.radius * 2);
      }

      /* ---- parallax stars with twinkle ---- */
      for (const s of bg.stars) {
        const px = PARALLAX_LAYERS[s.layer];
        const sy = ((s.y - avgCam * px) % H + H) % H;
        const twinkle = 0.6 + 0.4 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.brightness * twinkle;
        ctx.fillStyle = s.layer === 2 ? '#e0e7ff' : '#fff';
        ctx.beginPath();
        ctx.arc(s.x, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
        /* glow halo on near stars */
        if (s.layer === 2 && s.size > 1.2) {
          ctx.globalAlpha = s.brightness * twinkle * 0.15;
          ctx.beginPath();
          ctx.arc(s.x, sy, s.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* ============ EACH PLAYER ============ */
      for (let p = 0; p < 2; p++) {
        const g = games[p];
        const ox = p * halfW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, 0, halfW, H);
        ctx.clip();

        const toX = (wx: number) => ox + wx;
        const toY = (wy: number) => H - (wy - g.cameraY) - BLOCK_H;

        /* ---- stacked blocks (3D effect) ---- */
        for (let i = 0; i < g.blocks.length; i++) {
          const b = g.blocks[i];
          const cy = toY(i * BLOCK_H);
          if (cy > H + BLOCK_H || cy < -BLOCK_H * 3) continue;
          const cx = toX(b.x);
          const isCombo = g.combo > 1 && i >= g.blocks.length - g.combo;
          const sat = isCombo ? 100 : 80;
          const lit = isCombo ? 65 : 52;

          /* drop shadow */
          ctx.shadowColor = isCombo ? `hsl(${b.hue}, 100%, 60%)` : 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = isCombo ? 8 + g.combo * 5 : 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;

          /* main face with 3-stop gradient */
          const gr = ctx.createLinearGradient(0, cy, 0, cy + BLOCK_H);
          gr.addColorStop(0, `hsl(${b.hue}, ${sat}%, ${lit + 8}%)`);
          gr.addColorStop(0.35, `hsl(${b.hue}, ${sat}%, ${lit + 2}%)`);
          gr.addColorStop(1, `hsl(${b.hue + 15}, ${sat}%, ${lit - 12}%)`);
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.roundRect(cx, cy, b.width, BLOCK_H, 3);
          ctx.fill();

          /* reset shadow */
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          /* top highlight (3D top face) */
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.beginPath();
          ctx.roundRect(cx + 1, cy, b.width - 2, 3, [3, 3, 0, 0]);
          ctx.fill();

          /* inner highlight band */
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(cx + 2, cy + 3, b.width - 4, 2);

          /* bottom edge (darker for 3D depth) */
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.roundRect(cx + 1, cy + BLOCK_H - 3, b.width - 2, 3, [0, 0, 3, 3]);
          ctx.fill();

          /* left edge highlight (light from top-left) */
          if (b.width > 8) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(cx + 1, cy + 2, 1.5, BLOCK_H - 4);

            /* right edge shadow */
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
            ctx.fillRect(cx + b.width - 2.5, cy + 2, 1.5, BLOCK_H - 4);
          }
        }

        /* ---- swinging block ---- */
        if (g.swingingBlock && !g.gameOver) {
          const sw = g.swingingBlock;
          const sx = swingXPos(g.phase, sw.width, halfW);
          const sy = toY(g.blocks.length * BLOCK_H);

          ctx.globalAlpha = 0.88;

          /* shadow */
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;

          const sg = ctx.createLinearGradient(0, sy, 0, sy + BLOCK_H);
          sg.addColorStop(0, `hsl(${sw.hue}, 85%, 65%)`);
          sg.addColorStop(1, `hsl(${sw.hue + 15}, 85%, 50%)`);
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.roundRect(toX(sx), sy, sw.width, BLOCK_H, 3);
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          /* top highlight */
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.roundRect(toX(sx) + 1, sy, sw.width - 2, 3, [3, 3, 0, 0]);
          ctx.fill();
          ctx.globalAlpha = 1;

          /* faint guide line */
          const tb = g.blocks[g.blocks.length - 1];
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(toX(tb.x), sy + BLOCK_H * 0.5);
          ctx.lineTo(toX(tb.x + tb.width), sy + BLOCK_H * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        /* ---- perfect rings ---- */
        for (const ring of g.perfectRings) {
          const progress = 1 - ring.life / ring.maxLife;
          const rcx = toX(ring.cx);
          const rcy = toY(ring.worldY - BLOCK_H * 0.5);
          const rx = ring.width * 0.5 + progress * 35;
          const ry = rx * 0.3;
          const alpha = (1 - progress) * 0.7;

          ctx.strokeStyle = `hsla(${ring.hue}, 100%, 75%, ${alpha})`;
          ctx.lineWidth = Math.max(0.5, 2.5 - progress * 2);
          ctx.beginPath();
          ctx.ellipse(rcx, rcy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();

          /* inner glow ring */
          if (progress < 0.5) {
            const innerAlpha = (1 - progress * 2) * 0.3;
            ctx.strokeStyle = `hsla(${ring.hue}, 100%, 85%, ${innerAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(rcx, rcy, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        /* ---- falling pieces (with gradient) ---- */
        for (const fp of g.fallingPieces) {
          const cy = toY(fp.worldY);
          if (cy > H + 100 || cy < -100) continue;
          ctx.globalAlpha = Math.max(0, fp.opacity);
          const fpg = ctx.createLinearGradient(0, cy, 0, cy + BLOCK_H);
          fpg.addColorStop(0, `hsl(${fp.hue}, 70%, 50%)`);
          fpg.addColorStop(1, `hsl(${fp.hue + 15}, 70%, 38%)`);
          ctx.fillStyle = fpg;
          ctx.beginPath();
          ctx.roundRect(toX(fp.x), cy, fp.width, BLOCK_H, 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* ---- collapse blocks (rotating, falling) ---- */
        for (const cb of g.collapseBlocks) {
          const cy = toY(cb.worldY);
          if (cy > H + 100 || cy < -100) continue;
          ctx.save();
          const centerX = toX(cb.x) + cb.width / 2;
          const centerY = cy + BLOCK_H / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate(cb.rotation);
          ctx.globalAlpha = Math.max(0, cb.opacity);

          const cbg = ctx.createLinearGradient(-cb.width / 2, -BLOCK_H / 2, -cb.width / 2, BLOCK_H / 2);
          cbg.addColorStop(0, `hsl(${cb.hue}, 75%, 55%)`);
          cbg.addColorStop(1, `hsl(${cb.hue + 15}, 75%, 40%)`);
          ctx.fillStyle = cbg;
          ctx.beginPath();
          ctx.roundRect(-cb.width / 2, -BLOCK_H / 2, cb.width, BLOCK_H, 2);
          ctx.fill();

          /* highlight on collapsing blocks */
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(-cb.width / 2 + 1, -BLOCK_H / 2, cb.width - 2, 3);

          ctx.restore();
        }
        ctx.globalAlpha = 1;

        /* ---- particles (with glow) ---- */
        for (const pt of g.particles) {
          const cy = toY(pt.worldY);
          if (cy < -50 || cy > H + 50) continue;
          const a = pt.life / pt.maxLife;
          ctx.globalAlpha = a * 0.9;

          /* particle glow */
          const pgr = ctx.createRadialGradient(toX(pt.x), cy, 0, toX(pt.x), cy, pt.size * a * 2.5);
          pgr.addColorStop(0, `hsla(${pt.hue}, 100%, 80%, ${a})`);
          pgr.addColorStop(0.4, `hsla(${pt.hue}, 100%, 65%, ${a * 0.5})`);
          pgr.addColorStop(1, `hsla(${pt.hue}, 100%, 50%, 0)`);
          ctx.fillStyle = pgr;
          ctx.beginPath();
          ctx.arc(toX(pt.x), cy, pt.size * a * 2.5, 0, Math.PI * 2);
          ctx.fill();

          /* particle core */
          ctx.fillStyle = `hsl(${pt.hue}, 100%, 85%)`;
          ctx.beginPath();
          ctx.arc(toX(pt.x), cy, pt.size * a * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* ---- flash ---- */
        if (g.flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${g.flash / 40})`;
          ctx.fillRect(ox, 0, halfW, H);
        }

        /* ---- message (floating upward) ---- */
        if (g.msg && g.msgTimer > 0) {
          const a = Math.min(1, g.msgTimer / 15);
          const maxTimer = g.msg.includes('Perfeito') ? 70 : g.msg === 'Bom!' ? 40 : 200;
          const floatUp = (maxTimer - g.msgTimer) * 0.4;
          const msgY = Math.max(H * 0.15, H * 0.35 - floatUp);
          const scale = g.msg.includes('Perfeito')
            ? 1 + Math.max(0, (70 - g.msgTimer)) * 0.003
            : 1;

          ctx.save();
          ctx.translate(ox + halfW / 2, msgY);
          ctx.scale(scale, scale);
          ctx.globalAlpha = a;

          ctx.font = 'bold 22px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (g.msg.includes('Perfeito')) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 22;
            ctx.fillStyle = '#fbbf24';
          } else if (g.msg === 'Bom!') {
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#4ade80';
          } else {
            ctx.shadowColor = '#f87171';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#f87171';
          }
          ctx.fillText(g.msg, 0, 0);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        /* ---- hint ---- */
        if (g.score === 0 && !g.gameOver) {
          const pulse = 0.4 + Math.sin(now * 0.004) * 0.3;
          ctx.globalAlpha = pulse;
          ctx.font = '14px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Solte para empilhar!', ox + halfW / 2, H * 0.45);
          ctx.globalAlpha = 1;
        }

        /* ---- game over overlay (after collapse finishes) ---- */
        if (g.gameOver && g.collapseTimer <= 0 && g.collapseBlocks.length < 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(ox, 0, halfW, H);
          ctx.font = 'bold 32px system-ui,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f87171';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 14;
          ctx.fillText('Caiu!', ox + halfW / 2, H * 0.44);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.font = '16px system-ui,sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`Altura: ${g.score}`, ox + halfW / 2, H * 0.44 + 36);
        }

        ctx.restore();
      }

      /* ---- divider ---- */
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
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
    bgRef.current = null;
    setScores([0, 0]);
    setCombos([0, 0]);
    setOverFlags([false, false]);
    requestAnimationFrame(() => {
      const w = containerRef.current?.clientWidth ?? 0;
      if (w > 0) setCanvasW(w);
    });
  }, []);

  const bothDone = overFlags[0] && overFlags[1];

  /* ============ JSX ============ */
  return (
    <div className="flex flex-col gap-3 w-full" ref={containerRef}>
      {/* ---- Score bar ---- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-gradient-to-r from-cyan-900/30 via-slate-900/40 to-pink-900/30 border border-white/10 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs shrink-0">
            Jogador 1
          </Badge>
          <motion.span
            key={`s0-${scores[0]}`}
            initial={{ scale: 1.3, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-cyan-300 font-bold text-lg truncate"
          >
            {scores[0]}
          </motion.span>
          <AnimatePresence>
            {combos[0] > 1 && (
              <motion.span
                key={`c0-${combos[0]}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                className="text-amber-400 font-black text-xs bg-amber-400/10 px-1.5 py-0.5 rounded"
              >
                x{combos[0]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-4 h-4 text-white/40" />
          <span className="text-white/60 font-black tracking-widest text-xs">TORRE VS</span>
          <Layers className="w-4 h-4 text-white/40" />
        </div>

        <div className="flex items-center gap-2 min-w-0 justify-end">
          <AnimatePresence>
            {combos[1] > 1 && (
              <motion.span
                key={`c1-${combos[1]}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                className="text-amber-400 font-black text-xs bg-amber-400/10 px-1.5 py-0.5 rounded"
              >
                x{combos[1]}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            key={`s1-${scores[1]}`}
            initial={{ scale: 1.3, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-pink-300 font-bold text-lg truncate"
          >
            {scores[1]}
          </motion.span>
          <Badge variant="outline" className="border-pink-500/50 text-pink-400 text-xs shrink-0">
            Jogador 2
          </Badge>
        </div>
      </motion.div>

      {/* ---- Canvas area ---- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          width={canvasW || 600}
          height={CANVAS_HEIGHT}
          className="w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800/80 cursor-pointer shadow-2xl shadow-black/40"
          style={{ height: CANVAS_HEIGHT, touchAction: 'none' }}
          onPointerDown={handlePtr}
        />

        {/* Winner overlay */}
        <AnimatePresence mode="wait">
          {bothDone && (
            <motion.div
              key="winner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm rounded-2xl z-10"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center mb-3',
                  scores[0] > scores[1]
                    ? 'bg-cyan-400/20 ring-2 ring-cyan-400/50'
                    : scores[1] > scores[0]
                      ? 'bg-pink-400/20 ring-2 ring-pink-400/50'
                      : 'bg-amber-400/20 ring-2 ring-amber-400/50',
                )}
              >
                <Trophy className={cn(
                  'w-7 h-7',
                  scores[0] > scores[1]
                    ? 'text-cyan-400'
                    : scores[1] > scores[0]
                      ? 'text-pink-400'
                      : 'text-amber-400',
                )} />
              </motion.div>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
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

              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-8 mt-4 text-sm text-slate-300"
              >
                <span>
                  Jogador 1:{' '}
                  <span className="text-cyan-400 font-bold">{scores[0]} blocos</span>
                </span>
                <span>
                  Jogador 2:{' '}
                  <span className="text-pink-400 font-bold">{scores[1]} blocos</span>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---- Controls bar ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.25 }}
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
          className="gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar Tudo
        </Button>
      </motion.div>
    </div>
  );
}
