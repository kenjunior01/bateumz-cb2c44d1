// ============================================================
// BATEUCRAFT — Vista do Super Minecraft (REA de Minecraft)
// HUD limpa, controlos mobile-first, mochila, craft, fornalha,
// baús e TABLET DA PLATAFORMA (acesso a toda a plataforma).
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Backpack, Smartphone, Settings, Camera, Footprints, Zap, Sparkles, ArrowUp } from "lucide-react";
import { CraftEngine } from "./craftEngine";
import {
  RECIPES, ITEMS, BLOCKS, B, Stack, stackId, nameOf, maxStack, type Recipe,
  SELL_PRICES, SELL_BLOCK_PRICES, stackIcon,
} from "./craftData";

export interface CraftViewProps {
  name: string;
  level: number;
  xp: number;
  gold: number;
  uid: string;
  isTouch: boolean;
  onEvent: (ev: any) => void;
  onNavigate: (route: string) => void;
  onStory: (text: string) => void;
  toast: (msg: string, tone?: string) => void;
  onClassic: () => void;
  onExit?: () => void;
}

function xpNeeded(level: number): number { return Math.round(105 * Math.pow(level, 1.8)); }

type Panel = null | "inv" | "craft" | "furnace" | "chest" | "tablet" | "menu";

interface Hud {
  hp: number; maxHp: number; hunger: number; air: number; energy: number;
  dead: boolean; breaking: number; breakTime: number; target: string | null;
  time: number; day: number; x: number; y: number; z: number; facing: string;
  sel: number; fly: boolean; sprint: boolean; fps: number; chunks: number; mobs: number;
  pl: number; nearTable: boolean; biome: string; dashCd: number; kiCd: number;
  ability: { dash: boolean; ki: boolean; fly: boolean };
  stats: { mined: number; placed: number; kills: number; diamonds: number; crystals: number; deaths: number; crafted: number };
}

const EMPTY_HUD: Hud = {
  hp: 20, maxHp: 20, hunger: 20, air: 10, energy: 100, dead: false, breaking: 0, breakTime: 1,
  target: null, time: 0.2, day: 1, x: 0, y: 40, z: 0, facing: "Sul", sel: 0, fly: false,
  sprint: false, fps: 60, chunks: 0, mobs: 0, pl: 0, nearTable: false, biome: "planície",
  dashCd: 0, kiCd: 0, ability: { dash: false, ki: false, fly: false },
  stats: { mined: 0, placed: 0, kills: 0, diamonds: 0, crystals: 0, deaths: 0, crafted: 0 },
};

// ── Joystick virtual ────────────────────────────────────────
function Stick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    active.current = true;
    const r = ref.current!.getBoundingClientRect();
    origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!active.current) return;
    const dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y;
    const max = 52;
    const d = Math.min(max, Math.hypot(dx, dy));
    const a = Math.atan2(dy, dx);
    const kx = Math.cos(a) * d, ky = Math.sin(a) * d;
    setKnob({ x: kx, y: ky });
    onMove(kx / max, ky / max);
  };
  const end = () => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); };
  return (
    <div ref={ref} data-testid="craft-joystick" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      className="pointer-events-auto relative h-[118px] w-[118px] touch-none rounded-full border-2 border-white/25 bg-black/30 backdrop-blur-sm">
      <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white/30" />
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/70 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

export default function CraftView(props: CraftViewProps) {
  const { onEvent, onNavigate, onStory, toast, isTouch } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<CraftEngine | null>(null);
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [, setInvTick] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [booted, setBooted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dist, setDist] = useState(isTouch ? 3 : 4);
  const [camMode, setCamMode] = useState(0);
  const [pick, setPick] = useState<{ l: string; i: number } | null>(null);
  const [sndOn, setSndOn] = useState(true);
  const panelRef = useRef<Panel>(null);
  panelRef.current = panel;

  // ── Motor ───────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || engRef.current) return;
    const eng = new CraftEngine(canvasRef.current, {
      name: props.name, classId: 0, level: props.level, uid: props.uid, isTouch,
      onEvent,
    });
    eng.onHud = (h: Hud) => setHud(h);
    eng.onInv = () => setInvTick((t) => t + 1);
    eng.onUi = (a: { open?: string; close?: boolean }) => {
      if (a.open === "inv") setPanel((p) => (p ? null : "inv"));
      if (a.open === "craft") setPanel("craft");
      if (a.open === "furnace") setPanel("furnace");
      if (a.open === "chest") setPanel("chest");
      if (a.close) setPanel(null);
    };
    engRef.current = eng;
    (window as any).__bwcraft = {
      engine: eng,
      stats: () => eng.getStats(),
      give: (id: string, n?: number) => eng.give(id, n),
      setTime: (t: number) => eng.setTime(t),
      setBlockAt: (x: number, y: number, z: number, id: number) => eng.setBlockAt(x, y, z, id),
      getBlockAt: (x: number, y: number, z: number) => eng.getBlockAt(x, y, z),
      spawn: (type: string) => eng.debugSpawn(type),
      state: () => eng.debugState(),
      save: () => eng.saveNow(),
    };
    const t0 = setTimeout(() => setBooted(true), 500);
    const onHide = () => { if (document.hidden) eng.saveNow(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      clearTimeout(t0);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
      (window as any).__bwcraft = null;
      eng.dispose();
      engRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nível do herói → habilidades
  useEffect(() => { engRef.current?.setPlayerLevel(props.level); }, [props.level]);

  // touch look no canvas
  useEffect(() => {
    if (!isTouch) return;
    const cv = canvasRef.current!;
    let last: { x: number; y: number } | null = null;
    let pid = -1;
    const down = (e: PointerEvent) => {
      if (pid !== -1) return;
      pid = e.pointerId; last = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid || !last) return;
      engRef.current?.look((e.clientX - last.x) * 1.6, (e.clientY - last.y) * 1.6);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => { if (e.pointerId === pid) { pid = -1; last = null; } };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    return () => {
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [isTouch]);

  const eng = engRef.current;
  const setInput = useCallback((patch: any) => engRef.current?.setInput(patch), []);
  const openPanel = (p: Panel) => { setPanel((cur) => (cur === p ? null : p)); engRef.current?.setInput({ break: false }); };

  // objetivo seguinte (guia estilo Minecraft)
  const nextGoal = (() => {
    const st = hud.stats;
    if (st.mined === 0) return { t: "Soca uma árvore 🌳 (SEGURA ⛏)", done: false };
    if (!eng || eng.countItem("b" + B.PLANKS) + eng.countItem("b" + B.LOG) < 1 && st.crafted === 0) return { t: "Crafta Tábuas na mochila 🎒", done: false };
    if (st.crafted === 0) return { t: "Abre a Mochila → Craftar", done: false };
    if (!hud.ability.dash) return { t: "Minera pedra → ferramentas", done: false };
    if (st.placed === 0) return { t: "Constrói a tua casa 🏠", done: false };
    if (st.kills === 0) return { t: "Sobrevive à noite ⚔️", done: false };
    if (st.diamonds === 0) return { t: "Cava fundo: diamantes 💎", done: false };
    if (st.crystals === 0) return { t: "Lenda: acha o Cristal Bateu 🔮", done: false };
    return { t: "Vive a lenda — acessa a Plataforma 📱", done: true };
  })();

  const dayPct = hud.time;
  const isNight = hud.time > 0.5 && hud.time < 1;

  // ── helpers de inventário para os painéis ───────────────────
  const inv = eng?.inv ?? new Array(36).fill(null);
  const chestList = eng && panel === "chest" && (eng as any).openChest ? eng["chests" as any] : null;

  const tapSlot = (list: string, i: number) => {
    const e = engRef.current; if (!e) return;
    if (!pick) { setPick({ l: list, i }); return; }
    if (pick.l === list && pick.i === i) { setPick(null); return; }
    if (list === "inv" && pick.l === "inv") e.invSwap(pick.i, i);
    else e.moveStack(pick.l, pick.i, list, i);
    setPick(null);
  };

  const slotEl = (s: Stack | null, l: string, i: number, size = "h-11 w-11") => (
    <button key={l + i} data-testid={`craft-slot-${l}-${i}`} onClick={() => tapSlot(l, i)}
      className={`relative ${size} shrink-0 rounded-lg border-2 ${pick && pick.l === l && pick.i === i ? "border-amber-300 bg-amber-400/20" : "border-white/15 bg-black/45"} p-0.5`}>
      {s && (
        <>
          <img src={stackIcon(s)} alt="" className="h-full w-full [image-rendering:pixelated]" draggable={false} />
          {s.n > 1 && <span className="absolute bottom-0 right-0.5 text-[10px] font-black text-white drop-shadow">{s.n}</span>}
          {s.dur !== undefined && ITEMS[s.i!]?.tool && (
            <span className="absolute inset-x-0.5 bottom-0.5 h-1 overflow-hidden rounded bg-black/60">
              <span className="block h-full bg-emerald-400" style={{ width: `${(s.dur / ITEMS[s.i!]!.tool!.dur) * 100}%` }} />
            </span>
          )}
        </>
      )}
    </button>
  );

  const hotbar = (
    <div data-testid="craft-hotbar" className="pointer-events-auto flex items-end gap-1 rounded-xl border border-white/15 bg-black/45 p-1.5 backdrop-blur">
      {Array.from({ length: 9 }, (_, i) => {
        const s = inv[i];
        return (
          <button key={i} data-testid={`craft-hot-${i}`} onClick={() => { engRef.current?.selectSlot(i); }}
            className={`relative h-10 w-10 shrink-0 rounded-lg border-2 md:h-11 md:w-11 ${hud.sel === i ? "border-amber-300 bg-amber-400/15 shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "border-white/15 bg-black/40"} p-0.5`}>
            {s && <img src={stackIcon(s)} alt="" className="h-full w-full [image-rendering:pixelated]" draggable={false} />}
            {s && s.n > 1 && <span className="absolute bottom-0 right-0.5 text-[10px] font-black text-white drop-shadow">{s.n}</span>}
          </button>
        );
      })}
    </div>
  );

  // ══ RENDER ══════════════════════════════════════════════════
  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900" data-testid="bateu-craft">
      <canvas ref={canvasRef} data-testid="bw-craft-canvas" className="absolute inset-0 h-full w-full touch-none" />

      {/* BOOT (simples — sai de imediato para não bloquear o primeiro toque) */}
      {!booted && (
        <div data-testid="craft-boot" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-slate-950">
          <div className="animate-bounce text-5xl">⛏️</div>
          <p className="font-display text-lg font-black text-amber-300">A GERAR O MUNDO…</p>
          <p className="text-xs font-bold text-white/50">BateuCraft — Super Minecraft da Bateu</p>
        </div>
      )}

      {/* MORTE */}
      <AnimatePresence>
        {hud.dead && (
          <motion.div key="death" data-testid="craft-death" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-red-950/75">
            <motion.p initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="font-display text-4xl font-black text-red-200">💀 MORRESTE</motion.p>
            <p className="text-xs font-bold text-white/70">A renascer no teu ponto de renascimento…</p>
            <p className="text-[10px] font-semibold text-emerald-300">O teu inventário está seguro 💪</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOPO: chip de estado */}
      <div className="absolute left-2 top-2 z-20 flex flex-col gap-1.5" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
        <div data-testid="craft-status" className="pointer-events-none flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
          <span className="text-amber-300">⚡ PL {hud.pl}</span>
          <span className="text-white/40">|</span>
          <span>Nv {props.level}</span>
          <span className="text-white/40">|</span>
          <span>{isNight ? "🌙" : "☀️"} Dia {hud.day}</span>
          <span className="text-white/40">|</span>
          <span>{hud.x},{hud.y},{hud.z} {hud.facing}</span>
        </div>
        <div className="pointer-events-none flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-950/55 px-2.5 py-1 text-[10px] font-bold text-emerald-200 backdrop-blur" data-testid="craft-goal">
          🎯 {nextGoal.t}
        </div>
      </div>

      {/* TOPO: botões direita */}
      <div className="absolute right-2 top-2 z-20 flex gap-1.5" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
        <button data-testid="craft-btn-tablet" onClick={() => openPanel("tablet")}
          className="flex h-9 items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/25 px-3 text-[11px] font-black text-cyan-100 backdrop-blur active:scale-95">
          <Smartphone className="h-4 w-4" /> PLATAFORMA
        </button>
        <button data-testid="craft-btn-inv" onClick={() => openPanel("inv")} aria-label="Mochila"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur active:scale-95">
          <Backpack className="h-4 w-4" />
        </button>
        <button data-testid="craft-btn-menu" onClick={() => openPanel("menu")} aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur active:scale-95">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* MIRA + alvo */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-5 w-5 opacity-80">
          <div className="absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 bg-white mix-blend-difference" />
          <div className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white mix-blend-difference" />
        </div>
        {hud.breaking > 0 && (
          <div className="absolute left-1/2 top-7 h-1.5 w-16 -translate-x-1/2 overflow-hidden rounded-full bg-black/60">
            <div className="h-full bg-amber-300" style={{ width: `${hud.breaking * 100}%` }} />
          </div>
        )}
      </div>
      <AnimatePresence>
        {hud.target && (
          <motion.div key="tgt" data-testid="craft-target" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-[58%] z-10 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold text-white/85 backdrop-blur">
            {hud.target}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BAIXO: corações + fome + ar + energia + hotbar */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 pb-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex w-full max-w-md items-end justify-between px-3">
          <div className="flex flex-col gap-0.5" data-testid="craft-hp">
            <div className="flex gap-[1px]">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="relative text-[13px] leading-none drop-shadow">{i * 2 + 1 <= hud.hp ? "❤️" : i * 2 < hud.hp ? <span className="opacity-60">❤️</span> : "🖤"}</span>
              ))}
            </div>
            <div className="flex gap-[1px] text-[13px] leading-none drop-shadow" data-testid="craft-hunger">
              {Array.from({ length: 10 }, (_, i) => (<span key={i}>{i * 2 + 1 <= hud.hunger ? "🍗" : i * 2 < hud.hunger ? <span className="opacity-60">🍗</span> : "▫️"}</span>))}
            </div>
            {hud.air < 10 && (
              <div className="flex gap-[1px] text-[12px] leading-none">
                {Array.from({ length: 10 }, (_, i) => (<span key={i}>{i < hud.air ? "🫧" : "·"}</span>))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {hud.ability.dash && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-cyan-300" />
                <div className="h-2 w-20 overflow-hidden rounded-full border border-cyan-300/40 bg-black/50">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-300" style={{ width: `${hud.energy}%` }} />
                </div>
              </div>
            )}
            <div className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-amber-200 backdrop-blur" data-testid="craft-gold">
              💰 {props.gold}
            </div>
          </div>
        </div>
        {/* barra XP */}
        <div className="relative h-2 w-full max-w-md overflow-hidden rounded-full border border-white/10 bg-black/55 px-px" data-testid="craft-xpbar">
          <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-[width]" style={{ width: `${Math.min(100, (props.xp / xpNeeded(props.level)) * 100)}%` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/90 drop-shadow">XP {props.xp}/{xpNeeded(props.level)}</span>
        </div>
        {hotbar}
      </div>

      {/* barra XP: nível à direita */}
      <div className="pointer-events-none absolute bottom-[calc(100%*0.001)]" />

      {/* CONTROLOS MOBILE */}
      {isTouch && (
        <>
          <div className="absolute bottom-24 left-3 z-20" style={{ marginBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
            <Stick onMove={(x, y) => setInput({ mx: x, my: y })} />
          </div>
          <div className="absolute bottom-24 right-3 z-20 flex flex-col items-end gap-2" style={{ marginBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="flex items-end gap-2">
              <button data-testid="craft-btn-break" onPointerDown={(e) => { e.preventDefault(); setInput({ break: true }); engRef.current?.attackOnce(); }} onPointerUp={() => setInput({ break: false })} onPointerCancel={() => setInput({ break: false })}
                className="pointer-events-auto flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 border-amber-300/50 bg-amber-500/30 text-xl backdrop-blur active:scale-95">⛏️</button>
              <button data-testid="craft-btn-place" onPointerDown={(e) => { e.preventDefault(); engRef.current?.placeOnce(); }}
                className="pointer-events-auto flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 border-emerald-300/50 bg-emerald-500/30 text-xl backdrop-blur active:scale-95">🧱</button>
            </div>
            <div className="flex items-end gap-2">
              <button data-testid="craft-btn-sneak" onPointerDown={(e) => { e.preventDefault(); setInput({ sneak: true }); }} onPointerUp={() => setInput({ sneak: false })} onPointerCancel={() => setInput({ sneak: false })}
                className={`pointer-events-auto flex h-11 w-11 touch-none items-center justify-center rounded-full border-2 backdrop-blur active:scale-95 ${hud.sprint ? "border-white/60 bg-white/30" : "border-white/25 bg-black/40"}`}><Footprints className="h-5 w-5 text-white" /></button>
              <button data-testid="craft-btn-cam" onClick={() => { engRef.current?.toggleCam(); setCamMode((c) => 1 - c); }}
                className="pointer-events-auto flex h-11 w-11 touch-none items-center justify-center rounded-full border-2 border-white/25 bg-black/40 backdrop-blur active:scale-95"><Camera className="h-5 w-5 text-white" /></button>
              <button data-testid="craft-btn-fly" onClick={() => engRef.current?.toggleFly()}
                className={`pointer-events-auto flex h-11 w-11 touch-none items-center justify-center rounded-full border-2 backdrop-blur active:scale-95 ${hud.fly ? "border-cyan-300 bg-cyan-400/40" : hud.ability.fly ? "border-sky-300/50 bg-sky-500/25" : "border-white/15 bg-black/40 opacity-60"}`}><ArrowUp className="h-5 w-5 text-white" /></button>
              <button data-testid="craft-btn-jump" onPointerDown={(e) => { e.preventDefault(); setInput({ jump: true }); }} onPointerUp={() => setInput({ jump: false })} onPointerCancel={() => setInput({ jump: false })}
                className="pointer-events-auto flex h-16 w-16 touch-none items-center justify-center rounded-full border-2 border-white/35 bg-white/20 text-[11px] font-black text-white backdrop-blur active:scale-95">SALTAR</button>
            </div>
          </div>
        </>
      )}

      {/* HINT desktop */}
      {!isTouch && !panel && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-lg bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/60 backdrop-blur md:block">
          WASD mover · Espaço saltar · E mochila · Rato esq. minera · dir. coloca · C câmara · Q impulso · R explosão KI · G comer
        </div>
      )}

      {/* ══ PAINÉIS ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {panel && (
          <motion.div key="sheet" data-testid="craft-panel" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 26 }}
            className="absolute inset-x-1.5 bottom-1.5 top-14 z-30 mx-auto flex max-w-md flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-2xl backdrop-blur md:inset-x-auto md:left-1/2 md:w-[430px] md:-translate-x-1/2"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
              <p className="font-display text-sm font-black">
                {panel === "inv" && "🎒 Mochila & Craft"}
                {panel === "craft" && "🛠️ Mesa de Craft"}
                {panel === "furnace" && "🔥 Fornalha"}
                {panel === "chest" && "📦 Baú"}
                {panel === "tablet" && "📱 Plataforma Bateu"}
                {panel === "menu" && "⚙️ Definições"}
              </p>
              <button onClick={() => setPanel(null)} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {/* ── MOCHILA ── */}
              {panel === "inv" && <InvPanel eng={eng} tapSlot={tapSlot} slotEl={slotEl} openCraft={() => setPanel("craft")} nearTable={hud.nearTable} />}
              {/* ── MESA DE CRAFT ── */}
              {(panel === "craft" || panel === "inv") && panel === "craft" && <CraftPanel eng={eng} nearTable={true} />}
              {/* ── FORNALHA ── */}
              {panel === "furnace" && <FurnacePanel eng={eng} slotEl={slotEl} />}
              {/* ── BAÚ ── */}
              {panel === "chest" && <ChestPanel eng={eng} slotEl={slotEl} />}
              {/* ── TABLET DA PLATAFORMA ── */}
              {panel === "tablet" && (
                <TabletPanel eng={eng} onNavigate={onNavigate} onStory={onStory} level={props.level} pl={hud.pl} stats={hud.stats} />
              )}
              {/* ── MENU ── */}
              {panel === "menu" && (
                <MenuPanel
                  sndOn={sndOn} setSndOn={(v) => { setSndOn(v); engRef.current?.setMuted(!v); }}
                  dist={dist} setDist={(n) => { setDist(n); engRef.current?.setRenderDist(n); }}
                  camMode={camMode} onCam={() => { engRef.current?.toggleCam(); setCamMode((c) => 1 - c); }}
                  onClassic={props.onClassic} onExit={props.onExit}
                  hud={hud} onSave={() => { engRef.current?.saveNow(); toast("💾 Mundo guardado!", "good"); }}
                />
              )}
            </div>
            {/* mochila: hotbar + grid no fundo dos painéis de contentor */}
            {(panel === "furnace" || panel === "chest" || panel === "craft") && (
              <div className="border-t border-white/10 bg-black/30 p-2">
                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-white/40">Mochila</p>
                <div className="grid grid-cols-9 gap-1">{inv.slice(9, 36).map((s, k) => slotEl(s, "inv", k + 9, "h-9 w-9"))}</div>
                <div className="mt-1.5 grid grid-cols-9 gap-1">{inv.slice(0, 9).map((s, k) => slotEl(s, "inv", k, "h-9 w-9"))}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {pick && (
        <button onClick={() => setPick(null)} className="absolute inset-x-0 bottom-0 z-20 bg-amber-400/15 py-1 text-[10px] font-black text-amber-200">
          Escolhe o destino do item (toca para cancelar)
        </button>
      )}
    </div>
  );
}

// ── Painel: Mochila ─────────────────────────────────────────
function InvPanel({ eng, tapSlot, slotEl, openCraft, nearTable }: any) {
  const [tab, setTab] = useState<"itens" | "craft" | "vender">("itens");
  const inv = eng?.inv ?? [];
  if (!eng) return null;
  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(["itens", "craft", "vender"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-[11px] font-black ${tab === t ? "bg-amber-400 text-slate-950" : "bg-white/10 text-white/70"}`}>
            {t === "itens" ? "Itens" : t === "craft" ? "Craftar" : "💰 Vender"}
          </button>
        ))}
      </div>
      {tab === "itens" && (
        <div className="grid grid-cols-9 gap-1" data-testid="craft-inv-grid">
          {inv.slice(9, 36).map((s: Stack | null, k: number) => slotEl(s, "inv", k + 9, "h-9 w-9"))}
          <div className="col-span-9 mt-1.5 h-px bg-white/10" />
          {inv.slice(0, 9).map((s: Stack | null, k: number) => slotEl(s, "inv", k, "h-9 w-9"))}
        </div>
      )}
      {tab === "craft" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold text-white/50">{nearTable ? "🛠️ Mesa de craft por perto — TODAS as receitas!" : "Sem mesa por perto — só receitas básicas"}</p>
            <button onClick={openCraft} className="rounded-lg bg-amber-500/90 px-2.5 py-1 text-[10px] font-black text-white">Mesa completa</button>
          </div>
          <CraftPanel eng={eng} nearTable={nearTable} />
        </div>
      )}
      {tab === "vender" && <SellPanel eng={eng} />}
    </div>
  );
}

// ── Painel: Craft (livro de receitas) ───────────────────────
function CraftPanel({ eng, nearTable }: { eng: CraftEngine | null; nearTable: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 700); return () => clearInterval(iv); }, []);
  if (!eng) return null;
  const cats: Array<Recipe["cat"]> = ["básico", "ferramentas", "especial"];
  return (
    <div className="space-y-2" data-testid="craft-recipes">
      {cats.map((cat) => {
        const list = RECIPES.filter((r) => r.cat === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat}>
            <p className="mb-1 mt-1 text-[9px] font-black uppercase tracking-wider text-white/40">{cat === "especial" ? "⚡ Especial Bateu" : cat}</p>
            <div className="space-y-1.5">
              {list.map((r) => {
                const c = eng.canCraft(r);
                return (
                  <div key={r.id} data-testid={`craft-recipe-${r.id}`} className={`flex items-center gap-2 rounded-xl border p-1.5 ${c.ok ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                    <img src={stackIcon(r.out)} alt="" className="h-8 w-8 [image-rendering:pixelated]" draggable={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-black">{nameOf(r.out)} <span className="text-white/40">×{r.out.n}</span></p>
                      <p className="truncate text-[9px] text-white/50">
                        {r.ins.map((ins, k) => `${k ? " + " : ""}${ins.n}× ${nameOf(ins)}`)}
                        {r.table && <span className="ml-1 rounded bg-amber-500/30 px-1 text-amber-200">Mesa</span>}
                      </p>
                    </div>
                    <button
                      data-testid={`craft-make-${r.id}`}
                      disabled={!c.ok}
                      onClick={() => { eng.craft(r.id); setTick((t) => t + 1); }}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${c.ok ? "bg-emerald-500 text-white active:scale-95" : "bg-white/10 text-white/30"}`}>
                      {c.needTable ? "Mesa!" : "Craftar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Painel: Vender (economia ↔ plataforma) ──────────────────
function SellPanel({ eng }: { eng: CraftEngine | null }) {
  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 450); return () => clearInterval(iv); }, []); // refresca após give()/ pickups
  if (!eng) return null;
  const sellables: Array<{ id: string; price: number }> = [];
  for (const [id, p] of Object.entries(SELL_PRICES)) sellables.push({ id: "i" + id, price: p });
  for (const [bid, p] of Object.entries(SELL_BLOCK_PRICES)) sellables.push({ id: "b" + bid, price: p as number });
  const stack = (id: string): Stack | null => id.startsWith("b") ? { b: Number(id.slice(1)), n: 0 } : { i: id.slice(1), n: 0 };
  return (
    <div className="space-y-1.5" data-testid="craft-sell">
      <p className="rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200">
        💱 Vende recursos minados por OURO da plataforma — gasta em sorteios, leilões e vendas reais!
      </p>
      {sellables.sort((a, b) => b.price - a.price).map(({ id, price }) => {
        const have = eng.countItem(id);
        const s = stack(id);
        return (
          <div key={id} data-testid={`craft-sell-${id}`} className={`flex items-center gap-2 rounded-xl border p-1.5 ${have > 0 ? "border-amber-300/30 bg-amber-400/5" : "border-white/10 bg-white/5 opacity-60"}`}>
            <img src={stackIcon(s!)} alt="" className="h-8 w-8 [image-rendering:pixelated]" draggable={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black">{nameOf(s!)}</p>
              <p className="text-[9px] text-white/50">tens {have} · {price} 💰/un</p>
            </div>
            <button disabled={have < 1} onClick={() => { eng.sellItem(id, 1); setTick((t) => t + 1); }} className="rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-black text-white disabled:opacity-40">Vender 1</button>
            <button disabled={have < 1} onClick={() => { eng.sellItem(id, have); setTick((t) => t + 1); }} className="rounded-lg bg-amber-600 px-2 py-1 text-[10px] font-black text-white disabled:opacity-40">Tudo</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Painel: Fornalha ────────────────────────────────────────
function FurnacePanel({ eng, slotEl }: any) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 300); return () => clearInterval(iv); }, []);
  if (!eng) return null;
  const f = (eng as any).furnaces.get((eng as any).openFurn);
  if (!f) return <p className="text-xs text-white/60">Fornalha indisponível.</p>;
  const cookPct = Math.min(1, f.cook / 4);
  const burnPct = f.burn > 0 ? Math.min(1, f.burn / 8) : 0;
  return (
    <div className="flex flex-col items-center gap-3" data-testid="craft-furnace">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          {slotEl(f.inp, "fin", 0, "h-12 w-12")}
          <span className="text-[9px] font-bold text-white/50">FUNDIR</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="h-2 w-14 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-orange-400" style={{ width: `${cookPct * 100}%` }} />
          </div>
          <span className={`mt-1 text-lg ${burnPct > 0 ? "" : "opacity-30 grayscale"}`}>🔥</span>
          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-red-400" style={{ width: `${burnPct * 100}%` }} />
          </div>
          <span className="mt-1 text-[9px] font-bold text-white/50">LENHA</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {slotEl(f.fuel, "ffuel", 0, "h-12 w-12")}
          <span className="text-[9px] font-bold text-white/50">COMBUST.</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <ArrowUp className="h-4 w-4 rotate-180 text-white/40" />
        {slotEl(f.out, "fout", 0, "h-12 w-12")}
        <span className="text-[9px] font-bold text-white/50">RESULTADO</span>
      </div>
      <p className="text-center text-[10px] text-white/45">Ferro/Ouro → Barras · Areia → Vidro · Tronco → Carvão · Carne → Assada</p>
    </div>
  );
}

// ── Painel: Baú ─────────────────────────────────────────────
function ChestPanel({ eng, slotEl }: any) {
  if (!eng) return null;
  const key = (eng as any).openChest;
  const slots = key ? (eng as any).chests.get(key) : null;
  if (!slots) return <p className="text-xs text-white/60">Baú indisponível.</p>;
  return (
    <div className="grid grid-cols-9 gap-1" data-testid="craft-chest-grid">
      {slots.map((s: Stack | null, k: number) => slotEl(s, "chest", k, "h-9 w-9"))}
    </div>
  );
}

// ── Painel: TABLET DA PLATAFORMA ────────────────────────────
function TabletPanel({ eng, onNavigate, onStory, level, pl, stats }: any) {
  const tiles = [
    { e: "🛒", t: "Marketplace", d: "Vendas da plataforma", r: "/marketplace" },
    { e: "🔨", t: "Leilões", d: "Alienação de bens", r: "/alienacao" },
    { e: "🎁", t: "Sorteios", d: "Bilhetes e prémios", r: "/marketplace?tab=raffles" },
    { e: "🏆", t: "Concursos", d: "Ganha prémios reais", r: "/concursos" },
    { e: "⚔️", t: "Esports", d: "Torneios e ligas", r: "/esports" },
    { e: "🎮", t: "Jogos", d: "+80 jogos ao vivo", r: "/jogos" },
    { e: "📺", t: "Lives", d: "Joga com amigos", r: "/lives" },
    { e: "👛", t: "Carteira", d: "Saldo e conversões", r: "/wallet" },
  ];
  const [, setTick] = useState(0);
  return (
    <div className="space-y-3" data-testid="craft-tablet">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-2">
        <div>
          <p className="text-[10px] font-bold text-white/60">POWER LEVEL</p>
          <p className="font-display text-lg font-black text-amber-300" data-testid="craft-tablet-pl">⚡ {pl}</p>
        </div>
        <div className="text-right text-[10px] text-white/60">
          <p>⛏️ {stats.mined} minados</p>
          <p>🧱 {stats.placed} construídos</p>
          <p>⚔️ {stats.kills} vencidos · 💎 {stats.diamonds} 🔮 {stats.crystals}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5" data-testid="craft-tablet-grid">
        {tiles.map((tl) => (
          <button key={tl.t} data-testid={`craft-nav-${tl.t.toLowerCase()}`} onClick={() => onNavigate(tl.r)}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-1 py-2 active:scale-95">
            <span className="text-xl">{tl.e}</span>
            <span className="text-[9px] font-black leading-tight">{tl.t}</span>
            <span className="hidden text-[8px] text-white/40 md:block">{tl.d}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-2.5">
        <p className="mb-1.5 text-[10px] font-black text-emerald-200">📸 Partilha a tua lenda nos Stories</p>
        <button
          onClick={() => onStory(`⛏️ Nível ${level} no BateuCraft! Power Level ${pl} · ${stats.mined} blocos minados · ${stats.diamonds} diamantes ⚡`)}
          className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 py-2 text-[11px] font-black text-white active:scale-95">
          Publicar conquista nos Stories
        </button>
      </div>
      <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-2.5">
        <p className="text-[10px] font-bold text-amber-200">🎫 Baús de sorteio escondidos no subsolo!</p>
        <p className="text-[9px] text-white/50">Encontra baús raros com bilhetes — depois joga em Sorteios para ganhar 1GB e prémios reais.</p>
      </div>
    </div>
  );
}

// ── Painel: Menu ────────────────────────────────────────────
function MenuPanel({ sndOn, setSndOn, dist, setDist, camMode, onCam, onClassic, onExit, hud, onSave }: any) {
  return (
    <div className="space-y-2.5" data-testid="craft-menu">
      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
        <span className="text-[11px] font-bold">🔊 Som do mundo</span>
        <button data-testid="craft-sound" onClick={() => setSndOn(!sndOn)} className={`rounded-full px-3 py-1 text-[10px] font-black ${sndOn ? "bg-emerald-500" : "bg-white/15"}`}>{sndOn ? "LIGADO" : "MUDO"}</button>
      </div>
      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="mb-1 text-[11px] font-bold">🌐 Distância de renderização ({dist} chunks)</p>
        <div className="flex gap-1">
          {[2, 3, 4, 5].map((n) => (
            <button key={n} data-testid={`craft-dist-${n}`} onClick={() => setDist(n)} className={`flex-1 rounded-lg py-1 text-[10px] font-black ${dist === n ? "bg-amber-400 text-slate-950" : "bg-white/10"}`}>
              {n === 2 ? "Máx FPS" : n === 3 ? "Mobile" : n === 4 ? "Normal" : "Longe"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
        <span className="text-[11px] font-bold">🎥 Câmara</span>
        <button data-testid="craft-cam" onClick={onCam} className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">{camMode === 0 ? "1ª pessoa" : "3ª pessoa"}</button>
      </div>
      <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-center text-[9px] font-bold text-white/60">
        <div><p className="text-sm font-black text-white">{hud.fps}</p>FPS</div>
        <div><p className="text-sm font-black text-white">{hud.chunks}</p>Chunks</div>
        <div><p className="text-sm font-black text-white">{hud.mobs}</p>Mobs</div>
      </div>
      <button onClick={onSave} className="w-full rounded-xl bg-emerald-600 py-2 text-[11px] font-black text-white active:scale-95">💾 Guardar mundo agora</button>
      <button data-testid="craft-goclassic" onClick={onClassic} className="w-full rounded-xl bg-sky-600 py-2 text-[11px] font-black text-white active:scale-95">🌍 Ir para o Mundo Clássico 3D</button>
      {onExit && <button onClick={onExit} className="w-full rounded-xl bg-white/10 py-2 text-[11px] font-black text-white/70 active:scale-95">🚪 Sair do Bateu World</button>}
      <p className="text-center text-[9px] text-white/35">BateuCraft v1 — REA de Minecraft · 100% arte própria · guarda automática a cada 14s</p>
    </div>
  );
}
