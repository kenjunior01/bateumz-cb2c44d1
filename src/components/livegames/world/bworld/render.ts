// ============================================================
// MUNDO BATEU — Renderizador canvas 2D de alta nitidez · v1
// Sem filtros de blur (leve no telemóvel), cores ricas,
// dia/noite com luzes reais, clima, água animada, sombras
// suaves e minimapa/mapa grande.
// ============================================================
// @ts-nocheck

import {
  BIOMES, BUILDINGS, CLASSES, ITEMS, LANDMARKS, RARITY_META, T, TILE, VILLAINS,
  type BuildKind,
} from "./types";
import { propAt, regionAt, shadowBaseAt, shadowBasesAround, tileAt, VILLAGES, villainArena, unlockedRegions, type PropKind } from "./gen";
import type { Ent, GameState } from "./engine";

// ─── Cache de tiles/props por chunk ──────────────────────────
const tileCache = new Map<string, Uint8Array>();
const propCache = new Map<string, (PropKind | null)[]>();
const TREE_SOLID = new Set(["arvore", "palmeira", "cacto", "rocha"]);

function chunkKey(cx: number, cy: number, exp: number) { return `${cx},${cy},${exp}`; }

export function getChunkTiles(g: GameState, cx: number, cy: number): Uint8Array {
  const k = chunkKey(cx, cy, g.expansion);
  let c = tileCache.get(k);
  if (!c) {
    c = new Uint8Array(256);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      c[y * 16 + x] = tileAt(cx * 16 + x, cy * 16 + y, g.expansion);
    }
    if (tileCache.size > 500) { const first = tileCache.keys().next().value; tileCache.delete(first); }
    tileCache.set(k, c);
  }
  return c;
}
export function getChunkProps(g: GameState, cx: number, cy: number): (PropKind | null)[] {
  const k = chunkKey(cx, cy, g.expansion);
  let c = propCache.get(k);
  if (!c) {
    c = new Array(256);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      c[y * 16 + x] = propAt(cx * 16 + x, cy * 16 + y);
    }
    if (propCache.size > 300) { const first = propCache.keys().next().value; propCache.delete(first); }
    propCache.set(k, c);
  }
  return c;
}

export function invalidateCaches() { tileCache.clear(); propCache.clear(); }

// ─── Cores de tiles (paleta terrosa de Angola) ───────────────
const TILE_COLORS: Record<number, [string, string]> = {
  [T.OCEAN]: ["#1d5f8a", "#174f73"],
  [T.SAND]: ["#e8d5a3", "#dcc48c"],
  [T.GRASS]: ["#7aa648", "#6d9640"],
  [T.FOREST]: ["#3d7a45", "#356b3d"],
  [T.DESERT]: ["#e0b56f", "#d5a75f"],
  [T.ROCK]: ["#8d8578", "#7c7468"],
  [T.ROAD]: ["#b39268", "#a8865e"],
  [T.RIVER]: ["#3f83ad", "#38759c"],
  [T.CITY]: ["#b8a98f", "#ab9c83"],
  [T.WOODFLOOR]: ["#a3774b", "#986f45"],
  [T.FARM]: ["#7c5f38", "#715634"],
  [T.SNOW]: ["#e8ecef", "#dce1e6"],
  [T.WALL]: ["#7d6950", "#6f5c46"],
  [T.DOOR]: ["#8b5a2b", "#7e5127"],
  [T.BRIDGE]: ["#9c7442", "#90693c"],
  [T.DIRT]: ["#a5825a", "#987651"],
  [T.MIST]: ["#1b2432", "#151d29"],
  [T.PLAZA]: ["#c4b49a", "#b7a78c"],
};
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// ─── Estado da câmara ────────────────────────────────────────
export interface Cam { x: number; y: number; zoom: number; }
export const cam: Cam = { x: 0, y: 0, zoom: 1 };

let W = 0, H = 0, DPR = 1;
export function setViewport(w: number, h: number, dpr: number) { W = w; H = h; DPR = dpr; }
export function tilePx(): number { return TILE * cam.zoom; }

// ─── Render principal ────────────────────────────────────────
export function renderWorld(ctx: CanvasRenderingContext2D, g: GameState, dtMs: number) {
  const t = performance.now();
  const tp = tilePx();
  const viewW = W / tp, viewH = H / tp;

  // câmara segue suave
  const targetX = g.p.x, targetY = g.p.y;
  const k = Math.min(1, dtMs * 0.008);
  cam.x += (targetX - cam.x) * k;
  cam.y += (targetY - cam.y) * k;
  let shakeX = 0, shakeY = 0;
  if (g.screenShake > 0.2) { shakeX = (Math.random() - 0.5) * g.screenShake; shakeY = (Math.random() - 0.5) * g.screenShake; }

  const camX = cam.x + shakeX, camY = cam.y + shakeY;
  const left = camX - viewW / 2, top = camY - viewH / 2;
  const x0 = Math.floor(left), y0 = Math.floor(top);
  const x1 = Math.ceil(left + viewW), y1 = Math.ceil(top + viewH);
  const w2s = (wx: number, wy: number): [number, number] => [(wx - left) * tp, (wy - top) * tp];

  ctx.save();
  ctx.imageSmoothingEnabled = true;

  // ── fundo ──
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, 0, W, H);

  // ── tiles ──
  const phase = g.phase;
  const isNight = g.night;
  const timeShift = isNight ? -18 : phase < 0.06 || phase > 0.94 ? -6 : phase > 0.44 && phase < 0.58 ? 10 : 0;
  const c0x = Math.floor(x0 / 16), c1x = Math.floor(x1 / 16), c0y = Math.floor(y0 / 16), c1y = Math.floor(y1 / 16);
  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      const tiles = getChunkTiles(g, cx, cy);
      for (let ly = 0; ly < 16; ly++) {
        const wy = cy * 16 + ly;
        if (wy < y0 - 1 || wy > y1 + 1) continue;
        for (let lx = 0; lx < 16; lx++) {
          const wx = cx * 16 + lx;
          if (wx < x0 - 1 || wx > x1 + 1) continue;
          const tt = tiles[ly * 16 + lx];
          const [sx, sy] = w2s(wx, wy);
          const pal = TILE_COLORS[tt] || TILE_COLORS[T.DIRT];
          let base = timeShift !== 0 ? shade(pal[0], timeShift) : pal[0];
          // variação sutil por tile
          const v = ((wx * 7 + wy * 13) % 5) - 2;
          if (v !== 0) base = shade(typeof base === "string" && base.startsWith("#") ? base : pal[0], v * 3);
          ctx.fillStyle = base;
          ctx.fillRect(sx, sy, tp + 1, tp + 1);
          // detalhe por tipo
          if (tt === T.OCEAN || tt === T.RIVER) {
            const wob = Math.sin(t * 0.0016 + wx * 1.3 + wy * 2.1) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255,255,255,${0.05 + wob * 0.09})`;
            ctx.fillRect(sx, sy + tp * 0.25 + wob * 4, tp, tp * 0.16);
          } else if (tt === T.ROAD || tt === T.BRIDGE) {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            if ((wx + wy) % 3 === 0) ctx.fillRect(sx + tp * 0.3, sy + tp * 0.42, tp * 0.34, tp * 0.12);
          } else if (tt === T.PLAZA) {
            ctx.strokeStyle = "rgba(0,0,0,0.09)";
            ctx.lineWidth = 1.2;
            ctx.strokeRect(sx + 2, sy + 2, tp - 4, tp - 4);
          } else if (tt === T.WALL) {
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(sx, sy, tp, tp * 0.28);
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(sx + 2, sy + tp * 0.34, tp - 4, tp * 0.14);
          } else if (tt === T.MIST) {
            const pulse = 0.16 + Math.sin(t * 0.0009 + wx + wy) * 0.08;
            ctx.fillStyle = `rgba(130,170,220,${pulse})`;
            ctx.fillRect(sx, sy, tp + 1, tp + 1);
          }
        }
      }
    }
  }

  // ── props (árvores, rochas, flores) ──
  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      const props = getChunkProps(g, cx, cy);
      for (let ly = 0; ly < 16; ly++) {
        const wy = cy * 16 + ly;
        if (wy < y0 || wy > y1) continue;
        for (let lx = 0; lx < 16; lx++) {
          const wx = cx * 16 + lx;
          if (wx < x0 || wx > x1) continue;
          const pk = props[ly * 16 + lx];
          if (!pk) continue;
          drawProp(ctx, w2s, wx, wy, pk, tp, t);
        }
      }
    }
  }

  // ── bases de sombra visíveis ──
  for (const b of shadowBasesAround(camX, camY, viewW)) {
    drawShadowBase(ctx, w2s, b, tp, t, g);
  }

  // ── vilas: tabuletas/estruturas extras + nomes ──
  for (const v of VILLAGES) {
    if (Math.abs(v.x - camX) > viewW / 2 + 10 || Math.abs(v.y - camY) > viewH / 2 + 10) continue;
    drawVillage(ctx, w2s, v, tp, t);
  }

  // ── marcos ──
  for (const lm of LANDMARKS) {
    if (Math.abs(lm.x - camX) > viewW / 2 + 6 || Math.abs(lm.y - camY) > viewH / 2 + 6) continue;
    const [sx, sy] = w2s(lm.x, lm.y);
    drawMonument(ctx, sx, sy, lm.emoji, tp, t);
    ctx.font = `700 ${Math.max(11, tp * 0.24)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(lm.name, sx + 1.5, sy - tp * 1.16 + 1.5);
    ctx.fillStyle = "#ffe9a8";
    ctx.fillText(lm.name, sx, sy - tp * 1.16);
  }

  // ── arenas de vilões ──
  for (const v of VILLAINS) {
    const ar = villainArena(v.region);
    if (!ar || Math.abs(ar.x - camX) > viewW / 2 + 8 || Math.abs(ar.y - camY) > viewH / 2 + 8) continue;
    const [sx, sy] = w2s(ar.x, ar.y);
    ctx.strokeStyle = v.color + "66";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx + tp / 2, sy + tp / 2, tp * 2.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${tp * 1.2}px system-ui`;
    ctx.fillText(v.emoji, sx, sy + tp * 0.4);
    ctx.font = `800 ${Math.max(11, tp * 0.26)}px system-ui`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(`${v.name} — ARENA`, sx + 1, sy - tp * 1.5 + 1);
    ctx.fillStyle = v.color;
    ctx.fillText(`${v.name} — ARENA`, sx, sy - tp * 1.5);
  }

  // ── estruturas do jogador ──
  for (const [, part] of g.structures) {
    if (Math.abs(part.x - camX) > viewW / 2 + 2 || Math.abs(part.y - camY) > viewH / 2 + 2) continue;
    drawBuildPart(ctx, w2s, part, tp, t);
  }
  // ── terra reivindicada: cerca de luz ──
  if (g.p.base.claimed && Math.abs(g.p.base.x - camX) < viewW && Math.abs(g.p.base.y - camY) < viewH) {
    const [bx, by] = w2s(g.p.base.x - 3.5, g.p.base.y - 3.5);
    const s = 7 * tp;
    ctx.strokeStyle = "rgba(250,204,21,0.5)";
    ctx.setLineDash([9, 7]);
    ctx.lineWidth = 2.4;
    ctx.strokeRect(bx, by, s, s);
    ctx.setLineDash([]);
    ctx.font = `800 ${Math.max(10, tp * 0.22)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText("TUA TERRA", bx + s / 2 + 1, by - 6 + 1);
    ctx.fillStyle = "#fde047";
    ctx.fillText("TUA TERRA", bx + s / 2, by - 6);
  }

  // ── entidades ──
  const ents = [...g.ents].filter((e) => !e.dead || t - (e.deadT || 0) < 900)
    .sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (Math.abs(e.x - camX) > viewW / 2 + 3 || Math.abs(e.y - camY) > viewH / 2 + 3) continue;
    drawEnt(ctx, w2s, e, tp, t, g);
  }

  // ── duelo: oponente ──
  if (g.duel && g.duel.phase !== "end") {
    const d = g.duel;
    const [sx, sy] = w2s(d.oppX, d.oppY);
    drawHeroBody(ctx, sx, sy, tp, "#f472b6", "🤺", t);
    drawNameBar(ctx, sx, sy - tp * 0.95, d.oppName, d.oppHp, d.oppMaxHp, tp, "#f472b6");
  }

  // ── jogador ──
  {
    const p = g.p;
    const [sx, sy] = w2s(p.x, p.y);
    const cls = CLASSES[p.classId];
    if (p.dead) {
      ctx.font = `${tp * 1.1}px system-ui`;
      ctx.fillText("💀", sx, sy);
    } else {
      if (p.iframes > 0 && Math.floor(t / 90) % 2 === 0) { /* pisca invuln */ }
      else {
        drawHeroBody(ctx, sx, sy, tp, cls.color, ["⚔️", "🏹", "🔮"][p.classId] || "⚔️", t, p.anim, p.moving);
        // arco de ataque
        if (p.attackAnim > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 3.4;
          ctx.beginPath();
          const a0 = p.face - 0.7, a1 = p.face + 0.7;
          ctx.arc(sx, sy, tp * 0.86, a0, a1);
          ctx.stroke();
        }
        ctx.font = `800 ${Math.max(10, tp * 0.2)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText(p.name, sx + 1, sy - tp * 0.92 + 1);
        ctx.fillStyle = "#fff";
        ctx.fillText(p.name, sx, sy - tp * 0.92);
      }
    }
  }

  // ── projéteis ──
  for (const pr of g.projectiles) {
    const [sx, sy] = w2s(pr.x, pr.y);
    ctx.font = `${tp * 0.5}px system-ui`;
    ctx.textAlign = "center";
    const em = pr.kind === "fogo" ? "🔥" : pr.kind === "flecha" ? "➹" : pr.kind === "canhao" ? "⚫" : "⌖";
    ctx.fillText(em, sx, sy);
  }

  // ── partículas ──
  for (const pa of g.particles) {
    const [sx, sy] = w2s(pa.x, pa.y);
    const alpha = Math.max(0, pa.life / pa.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pa.color;
    ctx.fillRect(sx - pa.size / 2, sy - pa.size / 2, pa.size, pa.size);
  }
  ctx.globalAlpha = 1;

  // ── floats (dano/XP) ──
  for (const f of g.floats) {
    const [sx, sy] = w2s(f.x, f.y);
    const alpha = Math.min(1, f.life / 400);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${f.size + tp * 0.08}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(f.text, sx + 1, sy + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, sx, sy);
  }
  ctx.globalAlpha = 1;

  // ── iluminação (noite) ──
  if (isNight || (phase > 0.46 && phase < 0.56) || (phase > 0.94)) {
    const dark = isNight ? 0.62 : 0.3;
    const lightCanvas = getLightCanvas();
    const lctx = lightCanvas.getContext("2d");
    const lw = Math.max(2, Math.floor(W / 4)), lh = Math.max(2, Math.floor(H / 4));
    if (lightCanvas.width !== lw || lightCanvas.height !== lh) { lightCanvas.width = lw; lightCanvas.height = lh; }
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = `rgba(9,14,34,${dark})`;
    lctx.fillRect(0, 0, lw, lh);
    lctx.globalCompositeOperation = "destination-out";
    const hole = (wx: number, wy: number, radiusTiles: number, intensity = 1) => {
      const [sx, sy] = w2s(wx, wy);
      const r = radiusTiles * tp / 4;
      const grad = lctx.createRadialGradient(sx / 4, sy / 4, r * 0.15, sx / 4, sy / 4, r);
      grad.addColorStop(0, `rgba(0,0,0,${0.95 * intensity})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = grad;
      lctx.fillRect(sx / 4 - r, sy / 4 - r, r * 2, r * 2);
    };
    hole(g.p.x, g.p.y, 5.2, 1);
    for (const [, part] of g.structures) {
      if (part.kind === "lanterna") hole(part.x + 0.5, part.y + 0.5, 4.6, 0.95);
    }
    for (const e of g.ents) {
      if (e.dead) continue;
      if (e.kind === "npc" && e.role === "ferreiro") hole(e.x, e.y, 3.4, 0.8);
      if (e.kind === "boss") hole(e.x, e.y, 4.4, 0.7);
    }
    for (const v of VILLAGES) hole(v.board.x + 0.5, v.board.y + 0.5, 3, 0.7);
    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(lightCanvas, 0, 0, W, H);
  }

  // ── clima ──
  if (g.weather === "chuva") {
    ctx.strokeStyle = "rgba(160,190,230,0.35)";
    ctx.lineWidth = 1.4;
    const n = 70;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const rx = ((t * 0.35 + i * 137.5) % (W + 80)) - 40;
      const ry = (t * 0.62 + i * 219.7) % (H + 40) - 20;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 16);
    }
    ctx.stroke();
  } else if (g.weather === "vento") {
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 22; i++) {
      const rx = ((t * 0.5 + i * 211) % (W + 120)) - 60;
      const ry = (i * 97 + Math.sin(t * 0.001 + i) * 30) % H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + 20, ry - 4, rx + 44, ry);
      ctx.stroke();
    }
  }

  // ── vinheta sutil (sem blur) ──
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.52, W / 2, H / 2, Math.max(W, H) * 0.74);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,10,16,0.34)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

// ─── Canvas auxiliar de luz ──────────────────────────────────
let lightCanvas: HTMLCanvasElement | null = null;
function getLightCanvas(): HTMLCanvasElement {
  if (!lightCanvas) lightCanvas = document.createElement("canvas");
  return lightCanvas;
}

// ─── Desenho: props ──────────────────────────────────────────
function drawProp(ctx: CanvasRenderingContext2D, w2s: any, wx: number, wy: number, kind: PropKind, tp: number, t: number) {
  const [sx, sy] = w2s(wx, wy);
  const cx = sx + tp / 2, by = sy + tp * 0.9;
  if (kind === "arvore") {
    const sway = Math.sin(t * 0.0012 + wx * 2.3) * tp * 0.045;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, by + 2, tp * 0.3, tp * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(cx - tp * 0.07, by - tp * 0.62, tp * 0.14, tp * 0.62);
    ctx.fillStyle = "#2f6b38";
    ctx.beginPath();
    ctx.arc(cx + sway, by - tp * 0.86, tp * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8348";
    ctx.beginPath();
    ctx.arc(cx + sway - tp * 0.14, by - tp * 0.98, tp * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "palmeira") {
    const sway = Math.sin(t * 0.0016 + wx) * tp * 0.06;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, by + 2, tp * 0.28, tp * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6b3f";
    ctx.lineWidth = tp * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.quadraticCurveTo(cx + sway * 0.5, by - tp * 0.7, cx + sway, by - tp * 1.15);
    ctx.stroke();
    ctx.fillStyle = "#4d9e57";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(cx + sway + Math.cos(a) * tp * 0.26, by - tp * 1.2 + Math.sin(a) * tp * 0.14, tp * 0.24, tp * 0.1, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "cacto") {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, by + 2, tp * 0.2, tp * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4f8f4f";
    ctx.fillRect(cx - tp * 0.09, by - tp * 0.55, tp * 0.18, tp * 0.55);
    ctx.fillRect(cx - tp * 0.26, by - tp * 0.4, tp * 0.16, tp * 0.09);
    ctx.fillRect(cx - tp * 0.26, by - tp * 0.4, tp * 0.09, tp * 0.22);
    ctx.fillRect(cx + tp * 0.1, by - tp * 0.46, tp * 0.16, tp * 0.09);
    ctx.fillRect(cx + tp * 0.19, by - tp * 0.46, tp * 0.07, tp * 0.2);
  } else if (kind === "rocha") {
    ctx.fillStyle = "#8a8378";
    ctx.beginPath();
    ctx.ellipse(cx, by - tp * 0.12, tp * 0.24, tp * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9c958a";
    ctx.beginPath();
    ctx.ellipse(cx - tp * 0.05, by - tp * 0.17, tp * 0.13, tp * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "touca") {
    ctx.fillStyle = "#5d8a3c";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + i * tp * 0.14, by - tp * 0.06, tp * 0.09, tp * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "flor") {
    ctx.font = `${tp * 0.34}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(["🌼", "🌸", "🌻"][(wx + wy) % 3], cx, by - tp * 0.08);
  } else {
    ctx.strokeStyle = "#6f9a4c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - tp * 0.12, by);
    ctx.lineTo(cx - tp * 0.04, by - tp * 0.2);
    ctx.moveTo(cx, by);
    ctx.lineTo(cx, by - tp * 0.26);
    ctx.moveTo(cx + tp * 0.12, by);
    ctx.lineTo(cx + tp * 0.05, by - tp * 0.18);
    ctx.stroke();
  }
}

// ─── Desenho: base de sombra ─────────────────────────────────
function drawShadowBase(ctx: CanvasRenderingContext2D, w2s: any, b: any, tp: number, t: number, g: GameState) {
  const [sx, sy] = w2s(b.x - 2.5, b.y - 2.5);
  const s = 5 * tp;
  // plataforma
  ctx.fillStyle = "rgba(90,70,50,0.35)";
  ctx.fillRect(sx, sy, s, s);
  // paredes (proteção visual)
  const protColor = ["#94a3b8", "#d97706", "#dc2626", "#7c3aed"][b.prot] || "#94a3b8";
  ctx.strokeStyle = protColor;
  ctx.lineWidth = Math.max(3, tp * 0.14);
  ctx.strokeRect(sx + 3, sy + 3, s - 6, s - 6);
  // baú central
  const [bx2, by2] = w2s(b.x + 0.5, b.y + 0.5);
  ctx.font = `${tp * 0.62}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("📦", bx2, by2 + tp * 0.2);
  // bandeira do dono
  const [fx, fy] = w2s(b.x - 2.5, b.y - 2.5);
  ctx.strokeStyle = "#57534e";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(fx + 6, fy + tp);
  ctx.lineTo(fx + 6, fy - tp * 0.6);
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  const wv = Math.sin(t * 0.004) * 3;
  ctx.moveTo(fx + 6, fy - tp * 0.6);
  ctx.lineTo(fx + tp * 0.6, fy - tp * 0.45 + wv);
  ctx.lineTo(fx + 6, fy - tp * 0.3);
  ctx.fill();
  // nome + proteção
  ctx.font = `800 ${Math.max(10, tp * 0.2)}px system-ui`;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(`🏠 ${b.owner} · escudo ${b.prot}/3`, bx2 + 1, sy - 5 + 1);
  ctx.fillStyle = protColor;
  ctx.fillText(`🏠 ${b.owner} · escudo ${b.prot}/3`, bx2, sy - 5);
}

// ─── Desenho: vila ───────────────────────────────────────────
function drawVillage(ctx: CanvasRenderingContext2D, w2s: any, v: any, tp: number, t: number) {
  // tabuleta de desafios
  const [bx, by] = w2s(v.board.x + 0.5, v.board.y + 0.5);
  ctx.font = `${tp * 0.9}px system-ui`;
  ctx.textAlign = "center";
  const bounce = Math.sin(t * 0.003) * tp * 0.06;
  ctx.fillText("📋", bx, by + bounce);
  // balão "desafios"
  ctx.font = `800 ${Math.max(9, tp * 0.19)}px system-ui`;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText("DESAFIOS", bx + 1, by - tp * 0.7 + 1);
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("DESAFIOS", bx, by - tp * 0.7);
  // banca do mercado
  const [mx, my] = w2s(v.market.x + 0.5, v.market.y - 0.4);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(mx - tp * 0.5, my - tp * 0.28, tp, tp * 0.16);
  ctx.fillStyle = "#fff";
  ctx.fillRect(mx - tp * 0.5, my - tp * 0.14, tp, tp * 0.07);
  if (v.bank) {
    const [kx, ky] = w2s(v.bank.x + 0.5, v.bank.y - 0.3);
    ctx.font = `${tp * 0.8}px system-ui`;
    ctx.fillText("🏛️", kx, ky);
  }
  // nome da vila
  const [vx, vy] = w2s(v.x, v.y - 5);
  ctx.font = `900 ${Math.max(12, tp * 0.26)}px system-ui`;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(v.name.toUpperCase(), vx + 1, vy + 1);
  ctx.fillStyle = "#fde68a";
  ctx.fillText(v.name.toUpperCase(), vx, vy);
}

function drawMonument(ctx: CanvasRenderingContext2D, sx: number, sy: number, emoji: string, tp: number, t: number) {
  const bob = Math.sin(t * 0.0025) * tp * 0.08;
  ctx.font = `${tp * 1.5}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(emoji, sx, sy + tp * 0.4 + bob);
}

// ─── Desenho: estrutura do jogador ───────────────────────────
function drawBuildPart(ctx: CanvasRenderingContext2D, w2s: any, part: any, tp: number, t: number) {
  const [sx, sy] = w2s(part.x, part.y);
  const kind: BuildKind = part.kind;
  if (kind === "parede") {
    ctx.fillStyle = "#8a6f4d";
    ctx.fillRect(sx + 1, sy + 1, tp - 2, tp - 2);
    ctx.fillStyle = "#75593a";
    ctx.fillRect(sx + 1, sy + tp * 0.6, tp - 2, tp * 0.4);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(sx + 1.5, sy + 1.5, tp - 3, tp - 3);
  } else if (kind === "porta") {
    ctx.fillStyle = "#a06a33";
    ctx.fillRect(sx + tp * 0.16, sy + 2, tp * 0.68, tp - 4);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(sx + tp * 0.72, sy + tp * 0.5, tp * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const def = BUILDINGS[kind];
    ctx.font = `${tp * 0.72}px system-ui`;
    ctx.textAlign = "center";
    if (kind === "plantacao" && part.ready) {
      const pulse = 1 + Math.sin(t * 0.004) * 0.08;
      ctx.font = `${tp * 0.72 * pulse}px system-ui`;
      ctx.fillText("🌾", sx + tp / 2, sy + tp * 0.72);
    } else {
      ctx.fillText(def.emoji, sx + tp / 2, sy + tp * 0.72);
    }
  }
}

// ─── Desenho: entidade ───────────────────────────────────────
function drawEnt(ctx: CanvasRenderingContext2D, w2s: any, e: Ent, tp: number, t: number, g: GameState) {
  const [sx, sy] = w2s(e.x, e.y);
  if (e.dead) {
    ctx.globalAlpha = Math.max(0, 1 - (t - (e.deadT || 0)) / 900);
    ctx.font = `${tp * 0.6}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(e.emoji, sx, sy);
    ctx.globalAlpha = 1;
    return;
  }
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + tp * 0.3, tp * 0.26, tp * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  if (e.kind === "npc") {
    ctx.font = `${tp * 0.82}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(e.emoji, sx, sy + tp * 0.28);
    if (e.name) {
      ctx.font = `700 ${Math.max(9, tp * 0.17)}px system-ui`;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(e.name, sx + 0.8, sy - tp * 0.62 + 0.8);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(e.name, sx, sy - tp * 0.62);
    }
  } else {
    const bob = Math.sin(e.anim * 2) * tp * 0.045;
    // corpo
    ctx.fillStyle = e.hitFlash > 0 ? "#fff" : e.color;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, tp * (e.kind === "boss" ? 0.42 : 0.27), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // emoji/face
    ctx.font = `${tp * (e.kind === "boss" ? 0.62 : 0.42)}px system-ui`;
    ctx.fillText(e.emoji, sx, sy + tp * 0.16 + bob);
    // bar HP
    if (e.hp < e.maxHp || e.kind === "boss") {
      const bw = tp * (e.kind === "boss" ? 1.5 : 0.66);
      drawBar(ctx, sx - bw / 2, sy - tp * 0.66 + bob, bw, tp * 0.12, e.hp / e.maxHp, e.kind === "boss" ? "#f87171" : "#4ade80");
    }
    // nome
    if (e.kind === "boss" || e.name) {
      ctx.font = `800 ${Math.max(10, tp * (e.kind === "boss" ? 0.24 : 0.17))}px system-ui`;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(e.name || "", sx + 1, sy - tp * (e.kind === "boss" ? 1.05 : 0.86) + bob + 1);
      ctx.fillStyle = e.kind === "boss" ? "#fecaca" : "#e2e8f0";
      ctx.fillText(e.name || "", sx, sy - tp * (e.kind === "boss" ? 1.05 : 0.86) + bob);
    }
    // telegraph do boss
    if ((e.telegraph || 0) > 0) {
      ctx.strokeStyle = "rgba(248,113,113,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy + bob, tp * 2.1 * (1 - (e.telegraph || 0) / 900), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // balão de fala
  if (e.chat && (e.chatUntil || 0) > t) {
    ctx.font = `600 ${Math.max(9, tp * 0.18)}px system-ui`;
    const wTxt = ctx.measureText(e.chat).width;
    const bx = sx - wTxt / 2 - 6, byy = sy - tp * 1.25;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, bx, byy - tp * 0.22, wTxt + 12, tp * 0.34, 5);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.fillText(e.chat, sx, byy);
  }
}

function drawHeroBody(ctx: CanvasRenderingContext2D, sx: number, sy: number, tp: number, color: string, emoji: string, t: number, anim = 0, moving = false) {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + tp * 0.32, tp * 0.27, tp * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  const bob = moving ? Math.sin(anim * 2.4) * tp * 0.05 : Math.sin(t * 0.002) * tp * 0.02;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy + bob, tp * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `${tp * 0.46}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(emoji, sx, sy + tp * 0.18 + bob);
}

function drawNameBar(ctx: CanvasRenderingContext2D, sx: number, sy: number, name: string, hp: number, maxHp: number, tp: number, color: string) {
  ctx.font = `800 ${Math.max(10, tp * 0.2)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(name, sx + 1, sy + 1);
  ctx.fillStyle = color;
  ctx.fillText(name, sx, sy);
  const bw = tp * 1.1;
  drawBar(ctx, sx - bw / 2, sy + tp * 0.16, bw, tp * 0.13, hp / maxHp, color);
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number, color: string) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 3);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, Math.max(2, w * Math.max(0, Math.min(1, pct))), h, 2.4);
  ctx.fill();
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─── Minimapa ────────────────────────────────────────────────
export function renderMinimap(ctx: CanvasRenderingContext2D, g: GameState, size: number) {
  const range = 40; // tiles de raio
  const c = size / 2;
  const scale = size / (range * 2);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);
  const step = 2;
  for (let dy = -range; dy <= range; dy += step) {
    for (let dx = -range; dx <= range; dx += step) {
      const wx = Math.floor(g.p.x) + dx, wy = Math.floor(g.p.y) + dy;
      const tt = tileAt(wx, wy, g.expansion);
      const pal = TILE_COLORS[tt];
      if (!pal) continue;
      ctx.fillStyle = pal[0];
      ctx.fillRect(c + dx * scale, c + dy * scale, scale * step + 0.6, scale * step + 0.6);
    }
  }
  // vilas
  for (const v of VILLAGES) {
    const dx = (v.x - g.p.x) * scale, dy = (v.y - g.p.y) * scale;
    if (Math.abs(dx) > c || Math.abs(dy) > c) continue;
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(c + dx - 2, c + dy - 2, 4, 4);
  }
  // base
  if (g.p.base.claimed) {
    const dx = (g.p.base.x - g.p.x) * scale, dy = (g.p.base.y - g.p.y) * scale;
    if (Math.abs(dx) < c && Math.abs(dy) < c) {
      ctx.fillStyle = "#fde047";
      ctx.fillRect(c + dx - 2.4, c + dy - 2.4, 5, 5);
    }
  }
  // inimigos
  for (const e of g.ents) {
    if (e.dead || e.kind === "npc") continue;
    const dx = (e.x - g.p.x) * scale, dy = (e.y - g.p.y) * scale;
    if (Math.abs(dx) > c - 2 || Math.abs(dy) > c - 2) continue;
    ctx.fillStyle = e.kind === "boss" ? "#f87171" : e.kind === "shadow" ? "#38bdf8" : e.kind === "guarda" ? "#60a5fa" : "#f87171";
    ctx.beginPath();
    ctx.arc(c + dx, c + dy, e.kind === "boss" ? 3.2 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // jogador
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(c, c, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.lineTo(c + Math.cos(g.p.face) * 8, c + Math.sin(g.p.face) * 8);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Mapa grande (painel) ────────────────────────────────────
export function renderBigMap(ctx: CanvasRenderingContext2D, g: GameState, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);
  const worldR = 300;
  const scale = Math.min(w, h) / (worldR * 2.1);
  const cx = w / 2, cy = h / 2;
  const w2m = (wx: number, wy: number): [number, number] => [cx + wx * scale, cy + wy * scale];
  // fundo por região
  for (let wx = -worldR; wx <= worldR; wx += 6) {
    for (let wy = -worldR; wy <= worldR; wy += 6) {
      const reg = regionAt(wx, wy);
      const pal = TILE_COLORS[BIOMES[reg.biome].ground];
      const [mx, my] = w2m(wx, wy);
      ctx.fillStyle = pal[0];
      ctx.fillRect(mx, my, 6 * scale + 0.8, 6 * scale + 0.8);
    }
  }
  // vilas + marcos
  ctx.textAlign = "center";
  for (const v of VILLAGES) {
    const [mx, my] = w2m(v.x, v.y);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 9px system-ui";
    ctx.fillStyle = "#fde68a";
    ctx.fillText(v.name, mx, my - 7);
  }
  for (const lm of LANDMARKS) {
    const [mx, my] = w2m(lm.x, lm.y);
    ctx.font = "12px system-ui";
    ctx.fillText(lm.emoji, mx, my);
    const found = g.p.discoveries.includes(lm.id);
    if (found) {
      ctx.strokeStyle = "rgba(74,222,128,0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(mx, my - 4, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // arenas
  for (const v of VILLAINS) {
    const ar = villainArena(v.region);
    if (!ar) continue;
    const [mx, my] = w2m(ar.x, ar.y);
    ctx.font = "14px system-ui";
    ctx.fillText(v.emoji, mx, my);
  }
  // base do jogador
  if (g.p.base.claimed) {
    const [mx, my] = w2m(g.p.base.x, g.p.base.y);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 6, my - 6, 12, 12);
  }
  // jogador
  const [mx, my] = w2m(g.p.x, g.p.y);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(mx, my, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.stroke();
  // legenda
  const unlocked = unlockedRegions(g.expansion);
  ctx.font = "700 11px system-ui";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`🌍 ${unlocked.length}/${REGIONS_TOTAL()} territórios — o mundo cresce com a plataforma!`, 12, h - 12);
}
function REGIONS_TOTAL() { return 8; }
