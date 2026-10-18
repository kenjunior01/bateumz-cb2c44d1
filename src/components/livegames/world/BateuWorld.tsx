// ============================================================
// MUNDO BATEU — Interface do jogo (React) · v1
// Recriado do zero: mundo extenso estilo top-down com
// construção + proteção, roubo, duelos 1v1, vilões/chefes,
// desafios de empresas, cupões reais, banco de pontos,
// ranking de poder e mundo que cresce com a plataforma.
// ============================================================
// @ts-nocheck

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Map as MapIcon, Backpack, Hammer, ScrollText, Ticket, Trophy,
  Maximize2, Minimize2, Volume2, VolumeX, Landmark, ExternalLink, Share2,
  Gamepad2, LogOut, ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  CLASSES, ITEMS, DAILIES, BUILDINGS, LANDMARKS, VILLAINS, RARITY_META,
  fmtNum, type BuildKind,
} from "./bworld/types";
import {
  createGame, tick, doAttack, castAbility, castUltimate, doInteract,
  useItemAt, sellItemAt, storeVault, takeVault, claimArea, placeBuild,
  upgradeProtection, startDuel, closeDuel, respawnPlayer, saveGame,
  loadGame, newSave, currentPower, drainActivity, claimChallenge,
  applyPlatform, startHeist, pushEvent, gainXp, type GameState, type GameEvent,
} from "./bworld/engine";
import { renderWorld, renderMinimap, renderBigMap, setViewport, cam } from "./bworld/render";
import { shadowBasesAround, tileAt, regionAt } from "./bworld/gen";
import {
  fetchPlatformData, upsertCharacter, upsertWorldProgress, setCharacterOffline,
  worldRoute, fmtMZN, voucherLabel, MODALITY_LABEL, exchangeWorldPoints,
  claimWorldVoucher, logWorldActivity, flushWorldActivity, subscribePlatformLive,
  type PlatformData,
} from "./platformSync";
import { challengeFromPlatform } from "./bworld/types";
import { worldAudio } from "./worldAudio";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
  onNavigate?: (route: string) => void;
  onExit?: () => void;
}

const SAVE_KEY = "bateu_mundo_save_v1";

export default function BateuWorld({ onScore, onNavigate, onExit }: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"boot" | "create" | "play">("boot");
  const gRef = useRef<GameState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const [hud, setHud] = useState(0);
  const [panel, setPanel] = useState<string | null>(null);
  const [toasts, setToasts] = useState<(GameEvent & { addedAt: number })[]>([]);
  const [muted, setMuted] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [onb, setOnb] = useState(false);
  const [buildSel, setBuildSel] = useState<BuildKind | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<{ code: string; label: string }[]>([]);
  const isMobile = useMemo(
    () => (typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 1024)),
    []
  );

  // id de convidado estável
  const guestId = useMemo(() => {
    try {
      let id = localStorage.getItem("bateu_mundo_guest");
      if (!id) {
        id = "gw-" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("bateu_mundo_guest", id);
      }
      return id;
    } catch { return "gw-anon"; }
  }, []);
  const uid = user?.id || guestId;

  // ── boot: carregar save ──
  useEffect(() => {
    try { setOnb(!localStorage.getItem("bateu_mundo_onb")); } catch { /* */ }
    const s = loadGame();
    if (s && s.name) {
      try { gRef.current = createGame(s, { expansion: 1 }); setPhase("play"); } catch { setPhase("create"); }
    } else setPhase("create");
    return () => { try { setCharacterOffline(gRef.current?.p.uid || guestId); } catch { /* */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── iniciar mundo novo ──
  const startWorld = useCallback((name: string, classId: number) => {
    const save = newSave(name, classId, uid);
    gRef.current = createGame(save, { expansion: 1 });
    saveGame(gRef.current);
    setPhase("play");
    try { worldAudio.ensure(); worldAudio.startAmbient?.(); } catch { /* */ }
    logWorldActivity(uid, "mundo_enter", `${name} entrou no Mundo Bateu`, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ── teclado ──
  useEffect(() => {
    if (phase !== "play") return;
    const down = (e: KeyboardEvent) => {
      const g = gRef.current; if (!g) return;
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === " ") { e.preventDefault(); doAttack(g); }
      if (e.key.toLowerCase() === "e") doInteract(g);
      if (e.key.toLowerCase() === "q") castAbility(g, 0);
      if (e.key.toLowerCase() === "r") castAbility(g, 1);
      if (e.key.toLowerCase() === "f") castUltimate(g);
      if (e.key.toLowerCase() === "b") setPanel((p) => (p === "bag" ? null : "bag"));
      if (e.key.toLowerCase() === "m") setPanel((p) => (p === "map" ? null : "map"));
      if (e.key === "Escape") { setPanel(null); setBuildSel(null); }
    };
    const up = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [phase]);

  // ── loop principal ──
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let hudT = 0;
    let syncT = 0;
    let unsub: null | (() => void) = null;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });

    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth || window.innerWidth;
      const h = c.clientHeight || window.innerHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      setViewport(w, h, dpr);
      cam.zoom = w < 700 ? 0.78 : w < 1100 ? 0.92 : 1.05;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    const doSync = async () => {
      const g = gRef.current; if (!g) return;
      try {
        const data = await fetchPlatformData();
        const chs = challengeFromPlatform(data.contests || [], data.vouchers || []);
        applyPlatform(g, data, chs);
        const p = g.p;
        const st = p; const stAtk = (p as any).atk || 10; const stDef = (p as any).def || 5; const stSpd = (p as any).spd || 1;
        upsertCharacter({
          guest_id: p.uid, user_id: user?.id || null, name: p.name, class_id: p.classId,
          level: p.level, xp: p.xp, gold: Math.round(p.gold), hp: Math.round(p.hp),
          max_hp: p.maxHp, atk: stAtk, spd: stSpd, total_kills: p.kills, is_online: true,
        }).catch?.(() => { });
        upsertWorldProgress({
          guest_id: p.uid, user_id: user?.id || null, name: p.name, class_id: p.classId,
          level: p.level, points: currentPower(p), kills: p.kills,
          discoveries: p.discoveries.slice(0, 40), xp: p.xp, gold: Math.round(p.gold),
          deaths: p.deaths, def: stDef, vouchers_count: (p as any).pendingVouchers?.length || 0,
          waves_best: p.trofeus,
        }).catch?.(() => { });
        const acts = drainActivity();
        for (const a of acts.slice(-12)) logWorldActivity(a.guestId, a.kind, a.label, a.value);
        flushWorldActivity();
        onScore?.("Bateu World", currentPower(p));
      } catch { /* silencioso */ }
    };

    const loop = (tNow: number) => {
      raf = requestAnimationFrame(loop);
      const g = gRef.current;
      if (!g || !ctx) return;
      try { (window as any).__mundo = g; } catch { /* */ }
      const dt = Math.min(64, tNow - last);
      last = tNow;
      // teclado → controlos
      const k = keysRef.current;
      let mx = 0, my = 0;
      if (k["w"] || k["arrowup"]) my -= 1;
      if (k["s"] || k["arrowdown"]) my += 1;
      if (k["a"] || k["arrowleft"]) mx -= 1;
      if (k["d"] || k["arrowright"]) mx += 1;
      if (mx || my) { g.controls.mx = mx; g.controls.my = my; g.controls.sprint = !!k["shift"]; }
      else if (!g.joyActive) { g.controls.mx = 0; g.controls.my = 0; }

      try { tick(g, dt); } catch (e) { console.warn("[Mundo] tick:", e); }
      try { renderWorld(ctx, g, dt); } catch (e) { console.warn("[Mundo] render:", e); }

      frames++;
      if (frames % 3 === 0) {
        const mini = miniRef.current;
        if (mini) {
          const mctx = mini.getContext("2d");
          if (mctx) renderMinimap(mctx, g, mini.width || 100);
        }
      }
      hudT += dt;
      if (hudT > 240) {
        hudT = 0;
        setHud((h) => h + 1);
        // eventos → toasts
        if (g.events.length) {
          const evs = g.events.splice(0, g.events.length).map((e) => ({ ...e, addedAt: Date.now() }));
          setToasts((prev) => [...prev, ...evs].slice(-4));
          for (const ev of evs) {
            if (ev.kind === "epic") {
              try { confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ["#fbbf24", "#f59e0b", "#38bdf8", "#fde047"] }); } catch { /* */ }
              // sugestão de partilha em momentos épicos
              if (/NÍVEL|VILÃO|CUPÃO|LENDÁRIO|VITÓRIA|DESCOBERTA/.test(ev.text)) setShareMsg(ev.text);
            }
          }
        }
      }
      syncT += dt;
      if (syncT > 25000) { syncT = 0; doSync(); }
    };
    raf = requestAnimationFrame(loop);
    // hook para testes E2E e ferramentas (padrão window.__bw do projeto)
    try {
      (window as any).__mundoApi = {
        doAttack, castAbility, castUltimate, doInteract, placeBuild, claimArea,
        startHeist, pushEvent, gainXp, shadowBasesAround, tileAt, regionAt,
        upgradeProtection, startDuel, saveGame, respawnPlayer, closeDuel,
      };
    } catch { /* */ }
    try { unsub = subscribePlatformLive(() => { /* ping: próximos syncs atualizam */ }); } catch { /* */ }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      try { unsub?.(); } catch { /* */ }
      const g = gRef.current;
      if (g) { saveGame(g); setCharacterOffline(g.p.uid); }
    };
  }, [phase, uid, user, onScore]);

  // ── limpar toasts antigos ──
  useEffect(() => {
    const iv = setInterval(() => {
      setToasts((prev) => prev.filter((t) => Date.now() - t.addedAt < 5200));
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  // ── fullscreen ──
  const toggleFs = useCallback(async () => {
    try {
      const el = rootRef.current;
      if (!document.fullscreenElement) {
        await el?.requestFullscreen?.({ navigationUI: "hide" });
        try { (screen.orientation as any)?.lock?.("landscape").catch?.(() => { }); } catch { /* */ }
        setIsFs(true);
      } else {
        await document.exitFullscreen?.();
        setIsFs(false);
      }
    } catch { /* */ }
  }, []);

  // ── joystick ──
  const joyRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number } | null>(null);
  const onJoyStart = (e: React.TouchEvent) => {
    const g = gRef.current; if (!g) return;
    const t = e.changedTouches[0];
    joyRef.current = { id: t.identifier, ox: t.clientX, oy: t.clientY };
    (g as any).joyActive = true;
    setJoyKnob({ x: 0, y: 0 });
  };
  const onJoyMove = (e: React.TouchEvent) => {
    const g = gRef.current; if (!g || !joyRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== joyRef.current.id) continue;
      const dx = t.clientX - joyRef.current.ox;
      const dy = t.clientY - joyRef.current.oy;
      const d = Math.hypot(dx, dy);
      const max = 52;
      const cl = Math.min(1, d / max);
      const a = Math.atan2(dy, dx);
      g.controls.mx = Math.cos(a) * cl;
      g.controls.my = Math.sin(a) * cl;
      g.controls.sprint = cl > 0.9;
      setJoyKnob({ x: Math.cos(a) * cl * max, y: Math.sin(a) * cl * max });
    }
  };
  const onJoyEnd = () => {
    const g = gRef.current;
    joyRef.current = null;
    setJoyKnob(null);
    if (g) { (g as any).joyActive = false; g.controls.mx = 0; g.controls.my = 0; g.controls.sprint = false; }
  };

  // ── clique no canvas = atacar (desktop) ──
  const onCanvasClick = useCallback(() => {
    const g = gRef.current; if (!g) return;
    if (g.buildMode || buildSel) { placeBuild(g, buildSel || g.buildMode); setBuildSel(null); (g as any).buildMode = null; return; }
    doAttack(g);
  }, [buildSel]);

  // ── partilhar (stories) ──
  const shareStory = useCallback(async (navigate: boolean) => {
    const g = gRef.current;
    const text = shareMsg || "Estou a jogar o MUNDO BATEU!";
    try {
      await logWorldActivity(uid, "mundo_story", text, 1);
      if (navigator.share) { navigator.share({ text: `${text} — MUNDO BATEU na Bateu!` }).catch(() => { }); }
    } catch { /* */ }
    if (navigate) { onNavigate?.("/stories"); }
    setShareMsg(null);
  }, [shareMsg, uid, onNavigate]);

  // ── reclamar cupão na conta ──
  const claimCupao = useCallback(async (voucherId: string, code: string, label: string) => {
    const ok = await claimWorldVoucher(voucherId, code, label);
    setClaimed((prev) => [{ code, label }, ...prev]);
    const g = gRef.current;
    if (g) {
      g.p.inv = g.p.inv.filter((i) => i.id !== "cupao_mundo");
      logWorldActivity(uid, "mundo_cupao", `Reclamou cupão ${code}`, 1);
    }
    setToastLocal(ok ? `Cupão ${code} guardado na tua conta!` : "Cupão guardado localmente — entra na conta para sincronizar!");
  }, [uid]);

  const [localToast, setLocalToast] = useState("");
  const setToastLocal = (m: string) => { setLocalToast(m); setTimeout(() => setLocalToast(""), 4000); };

  // ── trocar troféus no banco ──
  const doExchange = useCallback(async () => {
    const g = gRef.current; if (!g) return;
    const tro = g.p.trofeus;
    if (tro < 10) { setToastLocal("Precisas de 10+ troféus para trocar."); return; }
    const res = await exchangeWorldPoints(tro * 5, uid);
    if (res === "ok") setToastLocal(`🎉 ${tro * 5} pontos creditados na tua conta!`);
    else if (res === "no-auth") setToastLocal("Entra na conta para receber dinheiro real — troca guardada!");
    else setToastLocal("Pedido registado — o banco processa em breve!");
    logWorldActivity(uid, "mundo_exchange", `Trocou ${tro} troféus`, tro);
  }, [uid]);

  // ═══════════════════ RENDER ═══════════════════
  const g = gRef.current;
  const p = g?.p;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[70] bg-[#0b1220] select-none overflow-hidden" data-testid="bateu-root">
      {phase !== "play" && (
        <BootScreen phase={phase} onStart={startWorld} onNavigate={onNavigate} hasUser={!!user} />
      )}

      {phase === "play" && g && p && (
        <>
          {/* canvas do mundo */}
          <canvas
            ref={canvasRef}
            data-testid="bateu-world"
            className="absolute inset-0 w-full h-full touch-none"
            onClick={onCanvasClick}
          />

          {/* ── HUD superior esquerdo: jogador ── */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none z-20" data-testid="bw-hud-player">
            <div className="bg-black/55 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/10 min-w-[180px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">{["⚔️", "🏹", "🔮"][p.classId]}</span>
                <span className="text-white font-extrabold text-[12px] leading-none truncate max-w-[110px]">{p.name}</span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 rounded px-1">Nv {p.level}</span>
                {!user && <span data-testid="bw-guest-chip" className="text-[9px] font-bold text-sky-300 bg-sky-500/20 rounded px-1">CONVIDADO</span>}
              </div>
              <div className="mt-1 h-1.5 rounded bg-black/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-red-400" style={{ width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` }} />
              </div>
              <div className="mt-0.5 h-1 rounded bg-black/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${p.energy}%` }} />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-white/80 font-semibold">
                <span>💰 {fmtNum(p.gold)}</span>
                <span>🏆 {fmtNum(p.trofeus)}</span>
                <span>⚡ {fmtNum(currentPower(p))}</span>
                {p.heat > 5 && <span className="text-rose-300 animate-pulse">🚨 {Math.round(p.heat)}%</span>}
              </div>
              <div className="mt-0.5 h-1 rounded bg-black/50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${Math.min(100, (p.xp / xpNeed(p.level)) * 100)}%` }} />
              </div>
            </div>
            <div className="text-[10px] font-bold text-white/75 bg-black/40 rounded-lg px-2 py-0.5 w-fit">
              📍 {g.regionName} · {g.night ? "🌙 noite" : "☀️ dia"} {g.weather === "chuva" ? "🌧️" : g.weather === "vento" ? "🍃" : ""}
            </div>
          </div>

          {/* ── minimapa + botões à direita ── */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-20">
            <div className="relative">
              <canvas ref={miniRef} width={isMobile ? 92 : 116} height={isMobile ? 92 : 116} className="rounded-full border border-white/20 shadow-lg" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8.5px] font-bold bg-black/60 text-white/90 rounded px-1.5">MAPA</div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <HudBtn testid="bw-bigmap" icon={<MapIcon size={16} />} label="Mapa" onClick={() => setPanel(panel === "map" ? null : "map")} />
              <HudBtn testid="bw-bag" icon={<Backpack size={16} />} label="Mochila" onClick={() => setPanel(panel === "bag" ? null : "bag")} badge={p.inv.length ? String(p.inv.length) : undefined} />
              <HudBtn testid="bw-build" icon={<Hammer size={16} />} label="Casa" onClick={() => setPanel(panel === "build" ? null : "build")} />
              <HudBtn testid="bw-quests" icon={<ScrollText size={16} />} label="Missões" onClick={() => setPanel(panel === "quests" ? null : "quests")} />
              <HudBtn testid="bw-cupoes" icon={<Ticket size={16} />} label="Cupões" onClick={() => setPanel(panel === "cupoes" ? null : "cupoes")} badge={p.inv.filter((i: any) => i.id === "cupao_mundo").length ? "🎟️" : undefined} />
              <HudBtn testid="bw-rank" icon={<Trophy size={16} />} label="Ranking" onClick={() => setPanel(panel === "rank" ? null : "rank")} />
              <HudBtn testid="bw-music" icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />} label="Som" onClick={() => { try { const m = worldAudio.toggleMute(); setMuted(m); } catch { setMuted((m) => !m); } }} />
              <HudBtn testid="bw-fs" icon={isFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />} label="Ecrã" onClick={toggleFs} />
              <HudBtn testid="bw-hub" icon={<Gamepad2 size={16} />} label="Hub" onClick={() => onNavigate?.("/lives")} />
              <HudBtn testid="bw-exit" icon={<LogOut size={16} />} label="Sair" onClick={() => { saveGame(g); onExit?.(); }} />
            </div>
          </div>

          {/* ── rastreador de missão (topo centro) ── */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-black/50 rounded-full px-3 py-1 text-[10.5px] font-bold text-white/90 border border-white/10">
              {nextObjective(g)}
            </div>
          </div>

          {/* ── toasts ── */}
          <div className="absolute top-11 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none w-[86%] max-w-md">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`w-fit max-w-full text-center rounded-xl px-3 py-1.5 text-[11.5px] font-bold border shadow-lg ${
                    t.kind === "epic" ? "bg-amber-500/90 border-amber-300 text-black"
                    : t.kind === "good" ? "bg-emerald-600/90 border-emerald-300 text-white"
                    : t.kind === "bad" ? "bg-rose-700/90 border-rose-300 text-white"
                    : "bg-slate-800/90 border-slate-400 text-white"}`}
                >
                  {t.emoji} {t.text}
                </motion.div>
              ))}
            </AnimatePresence>
            {localToast && (
              <div className="rounded-xl px-3 py-1.5 text-[11.5px] font-bold bg-sky-600/95 border border-sky-300 text-white shadow-lg">
                {localToast}
              </div>
            )}
          </div>

          {/* ── boss bar ── */}
          {bossInfo(g) && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[70%] max-w-sm" data-testid="bw-bossbar">
              <div className="text-center text-[12px] font-black text-rose-200 drop-shadow">{bossInfo(g)!.emoji} {bossInfo(g)!.name}</div>
              <div className="h-2.5 rounded-full bg-black/60 border border-rose-400/40 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-600 to-red-400 transition-all" style={{ width: `${bossInfo(g)!.pct}%` }} />
              </div>
            </div>
          )}

          {/* ── roubo em curso ── */}
          {g.heist && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 w-[70%] max-w-xs" data-testid="bw-heist">
              <div className="bg-black/80 rounded-xl border border-amber-400/50 p-3 text-center">
                <div className="text-[12px] font-black text-amber-300 animate-pulse">🥷 A ROUBAR…</div>
                <div className="mt-1.5 h-2.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${Math.min(100, (g.heist.t / g.heist.dur) * 100)}%` }} />
                </div>
                <button className="mt-2 text-[10px] font-bold text-white/70 underline" onClick={() => { (g as any).heist = null; }}>desistir</button>
              </div>
            </div>
          )}

          {/* ── duelo ── */}
          {g.duel && (
            <DuelOverlay duel={g.duel} pHp={p.hp} pMaxHp={p.maxHp} onClose={() => { closeDuel(g); setHud((h) => h + 1); }} onAtk={() => doAttack(g)} />
          )}

          {/* ── morte ── */}
          {p.dead && (
            <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center" data-testid="bw-dead">
              <div className="text-center">
                <div className="text-6xl mb-3">💀</div>
                <div className="text-white font-black text-xl">Foste derrotado…</div>
                <div className="text-white/70 text-sm mt-1">O mundo é perigoso. Levanta-te e continua!</div>
                <button data-testid="bw-respawn" className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl px-6 py-2.5" onClick={() => { respawnPlayer(g); }}>
                  CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* ── interação contextual ── */}
          {g.interact && !p.dead && !g.duel && (
            <motion.button
              initial={{ opacity: 0, y: 8, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }}
              data-testid="bw-interact"
              className="absolute bottom-32 left-1/2 z-30 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-full px-5 py-2.5 shadow-xl border border-emerald-200 text-[13px] flex items-center gap-1.5 max-w-[80vw]"
              onClick={() => doInteract(g)}
            >
              <span className="text-base">✋</span>
              <span className="truncate">{g.interact.label}</span>
              {g.interact.sub && <span className="hidden sm:inline text-[10px] font-bold opacity-70">· {g.interact.sub}</span>}
            </motion.button>
          )}

          {/* ── modo construir ── */}
          {buildSel && !p.dead && (
            <button
              data-testid="bw-build-place"
              className="absolute bottom-44 left-1/2 -translate-x-1/2 z-30 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-full px-5 py-2.5 shadow-xl border border-amber-200 text-[13px]"
              onClick={() => { if (placeBuild(g, buildSel)) setBuildSel(null); }}
            >
              🔨 Construir {BUILDINGS[buildSel].emoji} {BUILDINGS[buildSel].name}
            </button>
          )}

          {/* ── controlos mobile ── */}
          {isMobile && !p.dead && (
            <>
              <div
                data-testid="bw-joystick"
                className="absolute bottom-5 left-4 z-30 w-32 h-32 rounded-full bg-white/10 border border-white/25 touch-none"
                onTouchStart={onJoyStart}
                onTouchMove={onJoyMove}
                onTouchEnd={onJoyEnd}
                onTouchCancel={onJoyEnd}
              >
                <div className="absolute w-14 h-14 rounded-full bg-white/30 border border-white/50 backdrop-blur-sm" style={{
                  left: "50%", top: "50%", transform: `translate(calc(-50% + ${joyKnob?.x || 0}px), calc(-50% + ${joyKnob?.y || 0}px))`,
                }} />
              </div>
              <div className="absolute bottom-5 right-4 z-30 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  {p.charge >= 100 && (
                    <button data-testid="bw-ult" className="w-13 h-13 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-200 text-black font-black text-[10px] w-[52px] h-[52px] shadow-lg animate-bounce" onClick={() => castUltimate(g)}>
                      💥<br />ULT
                    </button>
                  )}
                  <ActBtn testid="bw-ability-1" emoji={CLASSES[p.classId].abilities[0].emoji} cd={cdPct(g, 0)} onClick={() => castAbility(g, 0)} />
                  <ActBtn testid="bw-ability-2" emoji={CLASSES[p.classId].abilities[1].emoji} cd={cdPct(g, 1)} onClick={() => castAbility(g, 1)} />
                </div>
                <button
                  data-testid="bw-attack"
                  className="w-[74px] h-[74px] rounded-full bg-gradient-to-br from-rose-500 to-red-600 border-2 border-rose-300 text-white font-black text-[13px] shadow-xl active:scale-95"
                  onClick={() => doAttack(g)}
                >
                  ⚔️<br />ATACAR
                </button>
              </div>
            </>
          )}

          {/* ── hotbar desktop ── */}
          {!isMobile && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 items-end" data-testid="bw-hotbar">
              {p.inv.slice(0, 5).map((it, i) => (
                <button key={i} className="w-12 h-12 rounded-lg bg-black/55 border border-white/20 flex flex-col items-center justify-center hover:border-amber-300"
                  onClick={() => { useItemAt(g, i); setHud((h) => h + 1); }}>
                  <span className="text-lg leading-none">{ITEMS[it.id]?.emoji || "❓"}</span>
                  <span className="text-[8px] text-white/70 font-bold">{it.qty}</span>
                </button>
              ))}
              <div className="text-[9px] text-white/50 font-bold ml-2 self-center">ESPAÇO atacar · E interagir · Q/R habilidades · F ult</div>
            </div>
          )}

          {/* ── onboarding ── */}
          {onb && (
            <motion.div initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} data-testid="bw-onb"
              className="absolute bottom-24 left-1/2 z-40 bg-slate-900/95 border border-amber-400/40 rounded-2xl p-4 w-[88%] max-w-md shadow-2xl">
              <div className="text-amber-300 font-black text-sm">🌍 BEM-VINDO AO MUNDO BATEU</div>
              <ul className="mt-2 space-y-1 text-[11.5px] text-white/85 font-medium">
                <li>🏠 <b>Reivindica terra e constrói a tua casa</b> com paredes, baú e torreta (painel Casa).</li>
                <li>🥷 <b>Rouba baús de outros heróis</b> à noite — cuidado com os alarmes e guardas!</li>
                <li>⚔️ <b>Desafia heróis para duelos 1v1</b> e rouba itens ao vencido.</li>
                <li>👹 <b>6 vilões</b> dominam as regiões — derrota tenentes e enfrenta-os.</li>
                <li>🎟️ <b>Cupões reais da plataforma</b> caem de vilões, duelos e desafios de empresas.</li>
              </ul>
              <button data-testid="bw-onb-skip" className="mt-3 w-full bg-amber-500 text-black font-black rounded-xl py-2 text-[12px]" onClick={() => {
                setOnb(false);
                try { localStorage.setItem("bateu_mundo_onb", "1"); } catch { /* */ }
              }}>ENTENDI, VAMOS JOGAR!</button>
            </motion.div>
          )}

          {/* ── partilha (stories) ── */}
          <AnimatePresence>
            {shareMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                <div className="bg-slate-900 rounded-2xl border border-fuchsia-400/40 p-5 w-full max-w-sm">
                  <div className="text-fuchsia-300 font-black text-sm flex items-center gap-1.5"><Share2 size={15} /> MOMENTO ÉPICO!</div>
                  <div className="mt-2 bg-black/40 rounded-xl p-3 text-white text-[13px] font-bold">✨ {shareMsg}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="bg-fuchsia-500 text-white font-black rounded-xl py-2.5 text-[12px]" onClick={() => shareStory(true)}>
                      Publicar nos Stories
                    </button>
                    <button className="bg-slate-700 text-white font-black rounded-xl py-2.5 text-[12px]" onClick={() => shareStory(false)}>
                      Só partilhar
                    </button>
                  </div>
                  <button className="mt-2 w-full text-white/50 text-[11px] font-bold" onClick={() => setShareMsg(null)}>agora não</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── painéis ── */}
          <AnimatePresence>
            {panel && (
              <PanelShell testid="bw-panel" title={PANEL_TITLES[panel] || "Painel"} onClose={() => setPanel(null)}>
                {panel === "bag" && <BagPanel g={g} onAct={() => setHud((h) => h + 1)} />}
                {panel === "build" && <BuildPanel g={g} buildSel={buildSel} setBuildSel={setBuildSel} onAct={() => { setHud((h) => h + 1); }} onToast={setToastLocal} />}
                {panel === "map" && <MapPanel g={g} mapRef={mapRef} />}
                {panel === "quests" && <QuestsPanel g={g} onAct={() => setHud((h) => h + 1)} />}
                {panel === "cupoes" && (
                  <CupoesPanel
                    g={g} claimed={claimed} onClaim={claimCupao} onExchange={doExchange}
                    onNavigate={onNavigate} platform={g.platform}
                  />
                )}
                {panel === "rank" && <RankPanel g={g} platform={g.platform} />}
                {panel === "settings" && (
                  <SettingsPanel onNavigate={onNavigate} onExit={() => { saveGame(g); onExit?.(); }} toggleFs={toggleFs} isFs={isFs} onShare={() => setShareMsg("O meu herói está a dominar o MUNDO BATEU!")} />
                )}
              </PanelShell>
            )}
          </AnimatePresence>
        </>
      )}
    </div>,
    document.body
  );
}
function xpNeed(level: number) { return Math.floor(90 * Math.pow(level, 2.45)) + 140 * level; }
function bossInfo(g: GameState): { name: string; emoji: string; pct: number } | null {
  const b = g.ents.find((e) => e.kind === "boss" && !e.dead);
  if (!b) return null;
  return { name: b.name || "Chefe", emoji: b.emoji, pct: Math.max(0, (b.hp / b.maxHp) * 100) };
}
function cdPct(g: GameState, i: number): number {
  const p = g.p;
  const ab = CLASSES[p.classId].abilities[i];
  const cd = p.abilityCds[ab.id] || 0;
  return cd > Date.now() ? ((cd - Date.now()) / ab.cd) * 100 : 0;
}
function nextObjective(g: GameState): string {
  const p = g.p;
  if (g.duel) return `⚔️ DUELO vs ${g.duel.oppName}`;
  if (g.heist) return "🥷 Roubo em curso — mantém-te perto do baú!";
  if (!p.base.claimed) return "🏠 Reivindica terra e constrói a tua casa (painel Casa)";
  const d = p.quest;
  const un = DAILIES.find((x) => {
    const v = { kills: d.kills, collect: d.collect, steal: d.steal, duel: d.duel, visit: d.visit }[x.id] || 0;
    return v < x.goal;
  });
  if (un) return `${un.emoji} ${un.label}`;
  const ch = g.challenges.find((c) => !(c as any).done);
  if (ch) return `📋 ${ch.title}`;
  return "🌍 Explora, luta e cresce — o mundo é teu!";
}

const PANEL_TITLES: Record<string, string> = {
  bag: "🎒 Mochila & Baú", build: "🏠 Minha Casa", map: "🗺️ Mapa do Mundo",
  quests: "📜 Missões & Desafios", cupoes: "🎟️ Cupões & Banco", rank: "🏆 Ranking de Poder", settings: "⚙️ Definições",
};

function HudBtn({ testid, icon, label, onClick, badge }: { testid: string; icon: any; label: string; onClick: () => void; badge?: string }) {
  return (
    <button data-testid={testid} onClick={onClick}
      className="relative w-10 h-10 rounded-xl bg-black/55 border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/75 active:scale-95 shadow"
      aria-label={label} title={label}>
      {icon}
      {badge && <span className="absolute -top-1 -right-1 text-[9px] font-black bg-amber-500 text-black rounded-full px-1">{badge}</span>}
    </button>
  );
}
function ActBtn({ testid, emoji, cd, onClick }: { testid: string; emoji: string; cd: number; onClick: () => void }) {
  return (
    <button data-testid={testid} onClick={onClick}
      className="relative w-[52px] h-[52px] rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-sky-300/60 text-xl shadow-lg active:scale-95 overflow-hidden">
      <span className="relative z-10">{emoji}</span>
      {cd > 0 && (
        <span className="absolute inset-0 bg-black/65 flex items-center justify-center text-[10px] font-black text-white" style={{ clipPath: `inset(${100 - cd}% 0 0 0)` }}>
          {Math.ceil((cd / 100) * 0 + cd / 12)}
        </span>
      )}
    </button>
  );
}

function PanelShell({ testid, title, onClose, children }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black/55 flex items-end sm:items-center sm:justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        data-testid={testid}
        className="bg-slate-900/97 border border-white/15 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[76vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-white font-black text-[14px]">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════ ECRÃ DE CRIAÇÃO ═══════════════
function BootScreen({ phase, onStart, onNavigate, hasUser }: any) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState(0);
  const creating = phase === "create";
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 overflow-y-auto bg-gradient-to-b from-[#0b1220] via-[#101a2e] to-[#1a1208]" data-testid={creating ? "bateu-create" : "bateu-boot"}>
      <div className="w-full max-w-md py-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="text-5xl mb-1">🌍</div>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">MUNDO</span>{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">BATEU</span>
          </h1>
          <p className="text-white/60 text-[12px] font-bold mt-1">Constrói · Rouba · Duelda · Derrota vilões · Ganha cupões reais</p>
        </motion.div>

        {!creating ? (
          <div className="mt-8 text-center text-white/70 font-bold text-sm animate-pulse">A abrir o mundo…</div>
        ) : (
          <div className="mt-6 space-y-3">
            {!hasUser && (
              <div className="bg-sky-500/15 border border-sky-400/30 rounded-xl p-3" data-testid="guest-note">
                <div className="text-sky-200 text-[11.5px] font-bold">
                  🎮 Estás em modo <b>CONVIDADO</b> — podes jogar já! Cria conta para guardar cupões reais, troféus e dinheiro na plataforma.
                </div>
                <button data-testid="guest-register" className="mt-2 text-[11px] font-black text-sky-300 underline flex items-center gap-1" onClick={() => onNavigate?.("/register")}>
                  Criar conta grátis <ChevronRight size={12} />
                </button>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="text-white/70 text-[11px] font-black uppercase tracking-wide">Nome do herói</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder="Nome do teu herói"
                className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold text-[14px] outline-none focus:border-amber-400"
              />
              <label className="block mt-3 text-white/70 text-[11px] font-black uppercase tracking-wide">Classe</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {CLASSES.map((c) => (
                  <button key={c.id} onClick={() => setCls(c.id)}
                    className={`rounded-xl p-2.5 border-2 text-center transition ${cls === c.id ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-black/30"}`}>
                    <div className="text-xl">{c.emoji}</div>
                    <div className="text-[10.5px] font-black text-white mt-0.5">{c.name}</div>
                    <div className="text-[8.5px] text-white/50 font-bold">❤{c.hp} ⚔{c.atk} 🛡{c.def}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[10.5px] text-white/60 font-medium min-h-[28px]">{CLASSES[cls].desc}</div>
              <div className="mt-1 flex gap-1.5">
                {CLASSES[cls].abilities.map((a) => (
                  <span key={a.id} className="text-[9px] font-bold bg-white/10 rounded px-1.5 py-0.5 text-white/80">{a.emoji} {a.name}</span>
                ))}
              </div>
            </div>

            <button
              data-testid="bw-enter"
              disabled={!name.trim()}
              onClick={() => onStart(name.trim(), cls)}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black rounded-2xl py-3.5 text-[15px] shadow-xl disabled:opacity-40 active:scale-[0.99]"
            >
              🌍 ENTRAR NO MUNDO
            </button>
            <div className="text-center text-[9.5px] text-white/40 font-semibold leading-relaxed">
              O mundo é enorme e cresce com a plataforma · evoluir é DIFÍCIL e valioso · morrer custa ouro
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════ MOCHILA ═══════════════
function BagPanel({ g, onAct }: any) {
  const p = g.p;
  const [tab, setTab] = useState<"inv" | "vault">("inv");
  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        <button className={`flex-1 rounded-xl py-1.5 text-[11px] font-black ${tab === "inv" ? "bg-amber-500 text-black" : "bg-white/10 text-white/70"}`} onClick={() => setTab("inv")}>Mochila ({p.inv.length}/24)</button>
        <button data-testid="bw-vault-tab" className={`flex-1 rounded-xl py-1.5 text-[11px] font-black ${tab === "vault" ? "bg-amber-500 text-black" : "bg-white/10 text-white/70"}`} onClick={() => setTab("vault")}>📦 Baú da casa ({p.vault.length})</button>
      </div>
      {tab === "inv" && (
        p.inv.length === 0 ? (
          <div className="text-white/50 text-[12px] font-bold text-center py-6">Mochila vazia — caça, recolhe e rouba para encher!</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {p.inv.map((it: any, i: number) => {
              const def = ITEMS[it.id] || { emoji: "❓", name: it.id, rarity: "comum", kind: "material", value: 0 };
              const rm = RARITY_META[def.rarity];
              return (
                <div key={i} className="rounded-xl border p-2 flex flex-col items-center" style={{ borderColor: rm.color + "66", background: rm.color + "11" }}>
                  <div className="text-xl">{def.emoji}</div>
                  <div className="text-[9px] font-black text-white text-center leading-tight mt-0.5">{def.name}</div>
                  <div className="text-[9px] font-black" style={{ color: rm.color }}>×{it.qty}</div>
                  <div className="flex gap-1 mt-1">
                    <button className="text-[8.5px] font-black bg-emerald-500 text-black rounded px-1.5 py-0.5"
                      onClick={() => { useItemAt(g, i); onAct(); }}>
                      {def.kind === "consumivel" ? "USAR" : def.kind === "arma" || def.kind === "armadura" || def.kind === "amuleto" ? "EQUIPAR" : def.kind === "cupao" ? "🎟️" : "—"}
                    </button>
                    {def.kind === "material" && (
                      <button className="text-[8.5px] font-black bg-yellow-500 text-black rounded px-1.5 py-0.5"
                        onClick={() => { sellItemAt(g, i); onAct(); }}>VENDER</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      {tab === "vault" && (
        p.vault.length === 0 ? (
          <div className="text-white/50 text-[12px] font-bold text-center py-6">Baú vazio — constrói um baú em casa e guarda tesouros (cuidado com roubos!).</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {p.vault.map((it: any, i: number) => {
              const def = ITEMS[it.id] || { emoji: "❓", name: it.id, rarity: "comum" };
              const rm = RARITY_META[def.rarity];
              return (
                <button key={i} className="rounded-xl border p-2 flex flex-col items-center active:scale-95"
                  style={{ borderColor: rm.color + "66", background: rm.color + "11" }}
                  onClick={() => { takeVault(g, i); onAct(); }}>
                  <div className="text-xl">{def.emoji}</div>
                  <div className="text-[9px] font-black text-white leading-tight">{def.name}</div>
                  <div className="text-[8.5px] font-black text-emerald-300">TIRAR ×{it.qty}</div>
                </button>
              );
            })}
          </div>
        )
      )}
      {tab === "inv" && p.inv.length > 0 && (
        <button className="mt-3 w-full bg-white/10 text-white/80 font-black rounded-xl py-2 text-[11.5px]"
          onClick={() => {
            for (let i = p.inv.length - 1; i >= 0; i--) {
              const def = ITEMS[p.inv[i].id];
              if (def && def.kind === "material") storeVault(g, i);
            }
            onAct();
          }}>
            📦 Guardar materiais no baú
        </button>
      )}
      <div className="mt-3 flex items-center justify-between bg-black/30 rounded-xl px-3 py-2">
        <div className="text-[11px] text-white/70 font-bold">⚔️ Equipado:</div>
        <div className="flex gap-1.5">
          {["arma", "armadura", "amuleto"].map((slot) => {
            const id = p.equip[slot];
            const def = id ? ITEMS[id] : null;
            return (
              <span key={slot} className="text-[9.5px] font-black bg-white/10 rounded px-1.5 py-1 text-white/85">
                {def ? `${def.emoji} ${def.name}` : `— ${slot}`}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════ CASA / CONSTRUÇÃO ═══════════════
function BuildPanel({ g, buildSel, setBuildSel, onAct, onToast }: any) {
  const p = g.p;
  const protNames = ["—", "Cerca + Alarme", "Muros + Alarme", "Torreta + Fortaleza"];
  return (
    <div className="space-y-3">
      {!p.base.claimed ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-center">
          <div className="text-3xl">🚩</div>
          <div className="text-white font-black text-[13px] mt-1">Reivindica a tua terra!</div>
          <div className="text-white/60 text-[11px] font-medium mt-1">
            Fica num local livre (longe das vilas e de outras bases) e reivindica 7×7 tiles para construir a tua casa.
          </div>
          <button data-testid="bw-claim" className="mt-3 bg-amber-500 text-black font-black rounded-xl px-5 py-2.5 text-[12.5px]"
            onClick={() => {
              const ok = claimArea(g, Math.floor(g.p.x), Math.floor(g.p.y) + 2);
              if (ok) onToast("🚩 Terra reivindicada! Agora constrói!");
              onAct();
            }}>
            REIVINDICAR TERRA AQUI
          </button>
        </div>
      ) : (
        <>
          <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-white">🛡️ Escudo: {protNames[p.base.prot]} (nível {p.base.prot}/3)</div>
              <div className="text-[10px] text-white/60 font-medium">Protege o teu baú de roubos. Expira em {Math.max(0, Math.round((p.base.protUntil - Date.now()) / 3600000))}h</div>
            </div>
            <button data-testid="bw-prot-up" className="bg-emerald-500 text-black font-black rounded-xl px-3 py-2 text-[11px]"
              onClick={() => { upgradeProtection(g); onAct(); }}>
              MELHORAR
            </button>
          </div>
          <div>
            <div className="text-[11px] font-black text-white/80 mb-1.5">CONSTRUIR (fica à tua frente)</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(BUILDINGS).map((b: any) => {
                const sel = buildSel === b.kind;
                return (
                  <button key={b.kind} data-testid={`bw-bld-${b.kind}`}
                    className={`rounded-xl p-2 border text-center ${sel ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-black/30"}`}
                    onClick={() => setBuildSel(sel ? null : b.kind)}>
                    <div className="text-lg">{b.emoji}</div>
                    <div className="text-[8.5px] font-black text-white leading-tight">{b.name}</div>
                    <div className="text-[8px] font-bold text-amber-300">
                      {Object.entries(b.cost).map(([m, q]) => `${ITEMS[m]?.emoji}${q}`).join(" ")}
                    </div>
                  </button>
                );
              })}
            </div>
            {buildSel && (
              <div className="mt-2 text-[10.5px] text-amber-200 font-bold bg-amber-500/10 rounded-lg px-2.5 py-1.5">
                {BUILDINGS[buildSel].desc} — fecha e toca em «🔨 CONSTRUIR» no mundo.
              </div>
            )}
          </div>
          <div className="bg-black/30 rounded-xl p-3">
            <div className="text-[10.5px] font-black text-white/80">🏠 A tua casa fica em ({p.base.x}, {p.base.y})</div>
            <div className="text-[10px] text-white/55 font-medium mt-0.5">
              Dica: à NOITE os roubos têm +12% de sucesso — mas os guardas também patrulham mais!
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════ MAPA ═══════════════
function MapPanel({ g, mapRef }: any) {
  useEffect(() => {
    const c = mapRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) renderBigMap(ctx, g, c.width, c.height);
  }, [g, mapRef]);
  return (
    <div>
      <canvas ref={mapRef} width={440} height={440} className="w-full rounded-xl border border-white/15" data-testid="bw-bigmap-canvas" />
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-bold text-white/75">
        <div>🟡 Vilas · ✨ Marcos descobertos</div>
        <div>👹 Arenas de vilões · ⬜ Tua casa</div>
      </div>
      <div className="mt-2 bg-black/30 rounded-xl p-3 text-[11px] font-bold text-white/75">
        🌍 Territórios desbloqueados: <b className="text-amber-300">{g.expansion}/8</b> — o mundo EXPANDE quando mais utilizadores entram e empresas colocam desafios!
      </div>
    </div>
  );
}

// ═══════════════ MISSÕES ═══════════════
function QuestsPanel({ g, onAct }: any) {
  const p = g.p;
  const dvals: any = { kills: p.quest.kills, collect: p.quest.collect, steal: p.quest.steal, duel: p.quest.duel, visit: p.quest.visit };
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-black text-white/80 mb-1.5">⚡ DIÁRIAS (recomeçam hoje à meia-noite)</div>
        <div className="space-y-1.5">
          {DAILIES.map((d) => {
            const v = Math.min(d.goal, dvals[d.id] || 0);
            const done = v >= d.goal;
            const claimed = p.quest.claimed[d.id];
            return (
              <div key={d.id} className={`rounded-xl px-3 py-2 flex items-center gap-2 border ${done && !claimed ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/30"}`}>
                <span className="text-lg">{d.emoji}</span>
                <div className="flex-1">
                  <div className="text-[11px] font-black text-white">{d.label}</div>
                  <div className="h-1.5 mt-1 rounded bg-black/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${(v / d.goal) * 100}%` }} />
                  </div>
                </div>
                {claimed ? <span className="text-[10px] font-black text-emerald-300">✓</span>
                  : done ? (
                    <button className="text-[10px] font-black bg-emerald-500 text-black rounded-lg px-2 py-1"
                      onClick={() => {
                        p.quest.claimed[d.id] = true;
                        p.gold += d.reward; p.trofeus += 2;
                        onAct();
                      }}>+{d.reward}💰</button>
                  ) : <span className="text-[10px] font-black text-white/50">{v}/{d.goal}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-black text-white/80 mb-1.5">📋 DESAFIOS DE EMPRESAS (cupões reais!)</div>
        {g.challenges.length === 0 ? (
          <div className="text-white/50 text-[12px] font-bold">A carregar desafios da plataforma…</div>
        ) : (
          <div className="space-y-1.5">
            {g.challenges.map((c: any) => {
              const prog = Math.min(c.objective.goal, c.progress || 0);
              const done = !!c.done;
              return (
                <div key={c.id} className={`rounded-xl px-3 py-2 border ${done && !c.claimed ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-black/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black text-white">{c.title}</div>
                    <div className="text-[9px] font-black text-sky-300">{c.reward.trofeus}🏆</div>
                  </div>
                  <div className="text-[10px] text-white/60 font-medium">{c.desc}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded bg-black/50 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-400" style={{ width: `${(prog / c.objective.goal) * 100}%` }} />
                    </div>
                    <span className="text-[9.5px] font-black text-white/60">{prog}/{c.objective.goal}</span>
                    {done && !c.claimed && (
                      <button className="text-[10px] font-black bg-amber-500 text-black rounded-lg px-2 py-1"
                        onClick={() => { claimChallenge(g, c.id); onAct(); }}>RECLAMAR</button>
                    )}
                    {c.claimed && <span className="text-[10px] font-black text-emerald-300">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div className="text-[11px] font-black text-white/80 mb-1.5">👹 SAGA DOS VILÕES</div>
        <div className="grid grid-cols-2 gap-1.5">
          {VILLAINS.map((v) => {
            const def = p.saga.defeated[v.id] || 0;
            return (
              <div key={v.id} className={`rounded-xl px-2.5 py-2 border ${def ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-black/30"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{v.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-white truncate">{v.name}</div>
                    <div className="text-[8.5px] font-bold text-white/55 truncate">{v.title}</div>
                  </div>
                  {def > 0 && <span className="ml-auto text-[9px] font-black text-emerald-300">✓{def}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════ CUPÕES & BANCO ═══════════════
function CupoesPanel({ g, claimed, onClaim, onExchange, onNavigate, platform }: any) {
  const p = g.p;
  const cupoes = p.inv.filter((i: any) => i.id === "cupao_mundo");
  const pending: any[] = (p as any).pendingVouchers || [];
  const vouchers = platform?.vouchers || [];
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-amber-500/15 to-yellow-500/5 border border-amber-400/30 rounded-2xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-amber-300" />
            <div>
              <div className="text-white font-black text-[12.5px]">🏦 Banco de Pontos</div>
              <div className="text-white/60 text-[10.5px] font-bold">{p.trofeus} troféus → {p.trofeus * 5} pontos da plataforma</div>
            </div>
          </div>
          <button data-testid="bw-exchange" className="bg-amber-500 text-black font-black rounded-xl px-3 py-2 text-[11px]" onClick={onExchange}>
            TROCAR
          </button>
        </div>
      </div>

      {(cupoes.length > 0 || pending.length > 0) && (
        <div>
          <div className="text-[11px] font-black text-white/80 mb-1.5">🎟️ CUPÕES PARA RECLAMAR NA CONTA</div>
          <div className="space-y-1.5">
            {pending.map((v: any, i: number) => (
              <div key={"p" + i} className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[11.5px] font-black text-white">🎟️ {v.code}</div>
                  <div className="text-[10px] font-bold text-fuchsia-300">{v.label} — válido na loja/leilões</div>
                </div>
                <button className="text-[10.5px] font-black bg-fuchsia-500 text-white rounded-lg px-2.5 py-1.5"
                  onClick={() => { onClaim(v.id, v.code, v.label); (p as any).pendingVouchers = pending.filter((_, j) => j !== i); }}>
                  RECLAMAR
                </button>
              </div>
            ))}
            {cupoes.map((_: any, i: number) => (
              <div key={"c" + i} className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[11.5px] font-black text-white">🎟️ Cupão do Mundo</div>
                  <div className="text-[10px] font-bold text-amber-300">Cupão exclusivo por feitos no mundo!</div>
                </div>
                <button className="text-[10.5px] font-black bg-amber-500 text-black rounded-lg px-2.5 py-1.5"
                  onClick={() => onClaim("mundo", "BATEU-MUNDO-10", "-10%")}>
                  RECLAMAR
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {claimed.length > 0 && (
        <div>
          <div className="text-[11px] font-black text-white/80 mb-1.5">✅ RECLAMADOS NA TUA CONTA</div>
          <div className="flex flex-wrap gap-1.5">
            {claimed.map((c, i) => (
              <span key={i} className="text-[10px] font-black bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 rounded-lg px-2 py-1">
                {c.code} {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] font-black text-white/80 mb-1.5">🛒 CUPÕES ATIVOS DA PLATAFORMA</div>
        {vouchers.length === 0 ? (
          <div className="text-white/50 text-[11.5px] font-bold">Sem cupões públicos neste momento.</div>
        ) : (
          <div className="space-y-1.5">
            {vouchers.slice(0, 6).map((v: any) => (
              <button key={v.id} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between active:scale-[0.99]"
                onClick={() => onNavigate?.("/marketplace")}>
                <div className="text-left">
                  <div className="text-[11px] font-black text-white">{v.code}</div>
                  <div className="text-[9.5px] font-bold text-white/55">{voucherLabel(v)} em compras</div>
                </div>
                <ExternalLink size={14} className="text-sky-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-black/30 rounded-xl p-3">
        <div className="text-[10.5px] font-bold text-white/60">
          💡 Rouba baús, derrota vilões e completa desafios de empresas para ganhar MAIS cupões reais. Depois usa-os no Mercado, Sorteios e Leilões da plataforma!
        </div>
      </div>
    </div>
  );
}

// ═══════════════ RANKING ═══════════════
function RankPanel({ g, platform }: any) {
  const p = g.p;
  const myPower = currentPower(p);
  const lb = platform?.leaderboard || [];
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 border border-violet-400/30 rounded-2xl p-3.5 text-center">
        <div className="text-[10.5px] font-black text-violet-200 uppercase tracking-wide">O teu Poder</div>
        <div className="text-3xl font-black text-white mt-0.5">⚡ {fmtNum(myPower)}</div>
        <div className="text-[10.5px] font-bold text-white/60 mt-0.5">
          Nv {p.level} · {p.kills} vitórias · {p.deaths} derrotas · 🏆 {p.trofeus}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-black text-white/80 mb-1.5">👑 TOP HERÓIS DA PLATAFORMA</div>
        {lb.length === 0 ? (
          <div className="text-white/50 text-[12px] font-bold">A carregar ranking global…</div>
        ) : (
          <div className="space-y-1">
            {lb.slice(0, 12).map((r: any, i: number) => (
              <div key={i} className={`rounded-xl px-3 py-1.5 flex items-center gap-2 border ${r.name === p.name ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-black/30"}`}>
                <span className="text-[11px] font-black text-white/60 w-5">{i + 1}.</span>
                <span className="text-base">{["⚔️", "🏹", "🔮"][r.classId] || "🛡️"}</span>
                <span className="text-[11px] font-black text-white flex-1 truncate">{r.name}</span>
                <span className="text-[10px] font-black text-sky-300">Nv{r.level}</span>
                <span className="text-[10px] font-black text-amber-300">⚡{fmtNum(r.level * 120 + r.gold * 0.02)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-black/30 rounded-xl p-3 text-[10.5px] font-bold text-white/60">
        O Poder cresce com nível, equipamento e troféus. Derrota vilões e vence duelos para subir no ranking global!
      </div>
    </div>
  );
}

// ═══════════════ DEFINIÇÕES ═══════════════
function SettingsPanel({ onNavigate, onExit, toggleFs, isFs, onShare }: any) {
  return (
    <div className="space-y-2.5">
      <button className="w-full bg-white/10 rounded-xl px-4 py-3 text-left text-[12px] font-black text-white flex items-center justify-between active:scale-[0.99]" onClick={toggleFs}>
        <span className="flex items-center gap-2">{isFs ? <Minimize2 size={15} /> : <Maximize2 size={15} />} Ecrã inteiro</span>
        <ChevronRight size={14} className="opacity-50" />
      </button>
      <button className="w-full bg-white/10 rounded-xl px-4 py-3 text-left text-[12px] font-black text-white flex items-center justify-between active:scale-[0.99]" onClick={onShare}>
        <span className="flex items-center gap-2"><Share2 size={15} /> Partilhar nos Stories</span>
        <ChevronRight size={14} className="opacity-50" />
      </button>
      <button className="w-full bg-white/10 rounded-xl px-4 py-3 text-left text-[12px] font-black text-white flex items-center justify-between active:scale-[0.99]" onClick={() => onNavigate?.("/lives")}>
        <span className="flex items-center gap-2"><Gamepad2 size={15} /> Hub da plataforma</span>
        <ChevronRight size={14} className="opacity-50" />
      </button>
      <button className="w-full bg-white/10 rounded-xl px-4 py-3 text-left text-[12px] font-black text-white flex items-center justify-between active:scale-[0.99]" onClick={() => onNavigate?.("/sorteios")}>
        <span className="flex items-center gap-2"><Ticket size={15} /> Sorteios ativos</span>
        <ChevronRight size={14} className="opacity-50" />
      </button>
      <button className="w-full bg-rose-600/80 rounded-xl px-4 py-3 text-left text-[12px] font-black text-white flex items-center justify-between active:scale-[0.99]" onClick={onExit}>
        <span className="flex items-center gap-2"><LogOut size={15} /> Sair do Mundo</span>
        <ChevronRight size={14} className="opacity-50" />
      </button>
      <div className="text-center text-[9.5px] text-white/40 font-semibold pt-1">
        MUNDO BATEU v1 · o progresso guarda-se sozinho (6s) e sincroniza com a tua conta
      </div>
    </div>
  );
}

// ═══════════════ DUELO ═══════════════
function DuelOverlay({ duel, pHp, pMaxHp, onClose, onAtk }: any) {
  const d = duel;
  return (
    <div className="absolute inset-0 z-40 pointer-events-none" data-testid="bw-duel">
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[80%] max-w-sm pointer-events-auto">
        <div className="bg-black/70 rounded-2xl border border-fuchsia-400/50 p-3">
          {d.phase === "count" && (
            <div className="text-center" data-testid="bw-duel-count">
              <div className="text-[11px] font-black text-fuchsia-300">⚔️ DUELO 1v1 — APOSTA: {d.stakeGold}💰 + item</div>
              <div className="text-5xl font-black text-white mt-1">{Math.max(1, Math.ceil(d.t / 1000))}</div>
              <div className="text-[10px] font-bold text-white/60">vs {d.oppName}</div>
            </div>
          )}
          {d.phase === "fight" && (
            <div data-testid="bw-duel-hud">
              <div className="flex items-center justify-between text-[10.5px] font-black text-white">
                <span>EU</span><span className="text-fuchsia-300">⚔️ vs ⚔️</span><span>{d.oppName}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-black/60 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, (pHp / pMaxHp) * 100))}%` }} />
              </div>
              <div className="mt-1 h-2 rounded bg-black/60 overflow-hidden">
                <div className="h-full bg-rose-400" style={{ width: `${Math.max(0, (d.oppHp / d.oppMaxHp) * 100)}%` }} />
              </div>
              <button className="mt-2 w-full bg-rose-500 text-white font-black rounded-xl py-2 text-[12px] pointer-events-auto" onClick={onAtk}>
                ⚔️ ATACAR
              </button>
            </div>
          )}
          {d.phase === "end" && (
            <div className="text-center" data-testid="bw-duel-end">
              <div className="text-4xl">{d.result === "win" ? "🏆" : "💀"}</div>
              <div className={`text-lg font-black ${d.result === "win" ? "text-amber-300" : "text-rose-300"}`}>
                {d.result === "win" ? "VITÓRIA!" : "DERROTA…"}
              </div>
              <div className="text-[11px] font-bold text-white/70 mt-0.5">
                {d.result === "win" ? `+${d.stakeGold} ouro + item +8 🏆` : `-${d.stakeGold} ouro`}
              </div>
              <button className="mt-2 bg-white/15 text-white font-black rounded-xl px-5 py-2 text-[12px] pointer-events-auto" onClick={onClose}>
                CONTINUAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

