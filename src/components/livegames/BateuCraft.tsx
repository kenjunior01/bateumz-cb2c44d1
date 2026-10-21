// ============================================================
// BATEUCRAFT: MUNDO LEGO — Interface do jogo (100% português)
// Menu · HUD · controlos móveis · criação · pausa · morte
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { Motor, Captura, Modo } from "@/game/blocos/engine";
import { infoItem } from "@/game/blocos/inventario";
import { CONQUISTAS, WHATSAPP, VIDA_MAX, FOME_MAX } from "@/game/blocos/constants";
import { X, Play, Hammer, Sun, Moon, Camera, Backpack, Pause, Heart, Drumstick, Trophy, MessageCircle, Info, User } from "lucide-react";

interface Props {
  onScore?: (score: number) => void;
  onExit?: () => void;
}

const ehToque = typeof window !== "undefined" && ("ontouchstart" in window || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

// ── Ícones do HUD ─────────────────────────────────────────────
function Coracoes({ vida }: { vida: number }) {
  return (
    <div className="flex gap-[2px]" data-testid="bc-vida">
      {Array.from({ length: 10 }).map((_, i) => {
        const cheio = vida >= (i + 1) * 2, meio = !cheio && vida >= i * 2 + 1;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            <path d="M8 14 C4 11 1.5 8.5 1.5 5.8 C1.5 3.6 3.2 2 5.2 2 C6.4 2 7.5 2.7 8 3.6 C8.5 2.7 9.6 2 10.8 2 C12.8 2 14.5 3.6 14.5 5.8 C14.5 8.5 12 11 8 14Z"
              fill={cheio ? "#e02a2a" : meio ? "url(#meioV)" : "#3a3a3a"} stroke="#1a1a1a" strokeWidth="1" />
            {meio && (
              <defs><linearGradient id="meioV"><stop offset="50%" stopColor="#e02a2a" /><stop offset="50%" stopColor="#3a3a3a" /></linearGradient></defs>
            )}
          </svg>
        );
      })}
    </div>
  );
}
function Fome({ fome }: { fome: number }) {
  return (
    <div className="flex gap-[2px]" data-testid="bc-fome">
      {Array.from({ length: 10 }).map((_, i) => {
        const cheio = fome >= (i + 1) * 2, meio = !cheio && fome >= i * 2 + 1;
        return (
          <svg key={i} width="15" height="15" viewBox="0 0 16 16" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ transform: "scaleX(-1)" }}>
            <path d="M8 14 C4 11 1.5 8.5 1.5 5.8 C1.5 3.6 3.2 2 5.2 2 C6.4 2 7.5 2.7 8 3.6 C8.5 2.7 9.6 2 10.8 2 C12.8 2 14.5 3.6 14.5 5.8 C14.5 8.5 12 11 8 14Z"
              fill={cheio ? "#c88a3a" : meio ? "url(#meioF)" : "#3a3a3a"} stroke="#1a1a1a" strokeWidth="1" />
            {meio && (<defs><linearGradient id="meioF"><stop offset="50%" stopColor="#c88a3a" /><stop offset="50%" stopColor="#3a3a3a" /></linearGradient></defs>)}
          </svg>
        );
      })}
    </div>
  );
}

function IconeItem({ id, qtd, tamanho = 34 }: { id: number; qtd?: number; tamanho?: number }) {
  const info = infoItem(id);
  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }} title={info.nome}>
      {info.bloco ? (
        <div className="w-full h-full rounded-[3px] border border-black/50 shadow-inner"
          style={{ background: `linear-gradient(150deg, ${info.cor1} 0%, ${info.cor1} 45%, ${info.cor2} 55%, ${info.cor2} 100%)` }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="rounded-[2px]" style={{ width: tamanho * 0.16, height: tamanho * 0.78, background: `linear-gradient(180deg, ${info.cor1}, ${info.cor2})`, border: "1px solid rgba(0,0,0,0.5)", transform: "rotate(35deg)" }} />
        </div>
      )}
      {qtd !== undefined && qtd > 1 && (
        <span className="absolute -bottom-1 -right-1 text-[10px] font-bold text-white px-1 rounded bg-black/70">{qtd}</span>
      )}
    </div>
  );
}

export default function BateuCraft({ onScore, onExit }: Props) {
  const telaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motorRef = useRef<Motor>(new Motor());
  const [fase, setFase] = useState<"menu" | "jogando" | "morto">("menu");
  const [cap, setCap] = useState<Captura | null>(null);
  const [modal, setModal] = useState<null | "inv" | "pausa" | "ajuda" | "avatar">(null);
  const [aCarregar, setACarregar] = useState(false);
  const [receitaSel, setReceitaSel] = useState<"criacao" | "fundicao">("criacao");
  const [motorPronto, setMotorPronto] = useState(false);

  // ── Estado da UI ← motor ──
  useEffect(() => {
    const m = motorRef.current;
    m.onEstado = (c) => {
      setCap(c);
      setFase(c.fase === "morto" ? "morto" : "jogando");
    };
    setMotorPronto(true);
  }, []);

  // ── Loop rAF ──
  useEffect(() => {
    let raf = 0, anterior = performance.now();
    const ciclo = (agora: number) => {
      raf = requestAnimationFrame(ciclo);
      const dt = Math.min(0.1, (agora - anterior) / 1000);
      anterior = agora;
      const m = motorRef.current;
      if (m.fase !== "menu") {
        m.passo(dt);
        if (canvasRef.current) m.render(dt);
      }
    };
    raf = requestAnimationFrame(ciclo);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Redimensionar ──
  useEffect(() => {
    const ao = () => motorRef.current.redimensionar();
    window.addEventListener("resize", ao);
    const t = setInterval(ao, 800);
    return () => { window.removeEventListener("resize", ao); clearInterval(t); };
  }, []);

  // ── Ganchos E2E determinísticos ──
  useEffect(() => {
    (window as any).__blocos = {
      motor: motorRef.current,
      captura: () => motorRef.current.captura(),
      pump: (n: number, dt = 0.05) => { for (let i = 0; i < n; i++) motorRef.current.passo(dt); },
      iniciar: (modo: Modo, carregar = false) => {
        if (canvasRef.current) { motorRef.current.iniciar(canvasRef.current, modo, carregar); setFase("jogando"); }
      },
      guardar: () => motorRef.current.guardar(),
      apagarSave: () => motorRef.current.apagarSave(),
      temSave: () => motorRef.current.temSave(),
      // ações
      minerarHold: (v: boolean) => { motorRef.current.entrada.minerando = v; },
      colocar: () => { motorRef.current.colocarPedido = true; },
      atacar: () => { motorRef.current.atacarPedido = true; },
      comer: () => { motorRef.current.comerPedido = true; },
      pular: (v: boolean) => { motorRef.current.entrada.salto = v; },
      selecionar: (i: number) => { motorRef.current.inv.selecao = i; },
      criar: (id: string) => motorRef.current.criar(id),
      receitas: () => motorRef.current.receitas().lista.map((i: any) => ({ id: i.receita.id, pode: i.pode, motivo: i.motivo, categoria: i.receita.categoria })),
      // utilitários de teste
      teleportar: (x: number, y: number, z: number) => { motorRef.current.px = x; motorRef.current.py = y; motorRef.current.pz = z; motorRef.current.vx = motorRef.current.vy = motorRef.current.vz = 0; },
      olhar: (yaw: number, pitch: number) => { motorRef.current.yaw = yaw; motorRef.current.pitch = pitch; },
      dar: (id: number, qtd: number) => motorRef.current.inv.adicionar(id, qtd),
      definirVida: (v: number) => { motorRef.current.vida = v; },
      definirFome: (v: number) => { motorRef.current.fome = v; },
      definirHora: (f: number) => { motorRef.current.tempo = motorRef.current.dia * 600 - 600 + f * 600; },
      limparInv: () => motorRef.current.inv.limpar(),
      // avatar
      definirAvatar: (p: any) => motorRef.current.definirPreferencias(p),
      lerAvatar: () => motorRef.current.lerPreferencias(),
    };
    return () => { try { delete (window as any).__blocos; } catch { /* ignore */ } };
  }, []);

  // ── Teclado / rato (desktop) ──
  useEffect(() => {
    const m = motorRef.current;
    const teclas: Record<string, boolean> = {};
    const sincronizar = () => {
      m.entrada.frente = (teclas["w"] ? 1 : 0) - (teclas["s"] ? 1 : 0);
      m.entrada.lado = (teclas["d"] ? 1 : 0) - (teclas["a"] ? 1 : 0);
      m.entrada.salto = !!teclas[" "];
      m.entrada.correr = !!teclas["shift"];
      m.entrada.subir = !!teclas[" "];
      m.entrada.descer = !!teclas["control"];
      m.criativoVoar = !!teclas["f"] ? !m.criativoVoar : m.criativoVoar;
    };
    const baixo = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      teclas[k] = true;
      if (m.fase === "menu") return;
      if (k >= "1" && k <= "9") m.inv.selecao = parseInt(k) - 1;
      if (k === "e") { setModal((v) => (v === "inv" ? null : "inv")); m.pausado = false; }
      if (k === "escape") { setModal((v) => (v ? null : "pausa")); }
      if (k === "f5") { e.preventDefault(); m.primeiraPessoa = !m.primeiraPessoa; }
      sincronizar();
    };
    const cima = (e: KeyboardEvent) => { teclas[e.key.toLowerCase()] = false; sincronizar(); };
    const mover = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        m.entrada.olharX -= e.movementX * 0.0026;
        m.entrada.olharY -= e.movementY * 0.0026;
      }
    };
    const baixoRato = (e: MouseEvent) => {
      if (m.fase !== "jogando" || modal) return;
      if (e.button === 0) { m.entrada.minerando = true; m.atacarPedido = true; }
      if (e.button === 2) m.colocarPedido = true;
    };
    const cimaRato = (e: MouseEvent) => { if (e.button === 0) m.entrada.minerando = false; };
    const roda = (e: WheelEvent) => {
      if (m.fase !== "jogando") return;
      m.inv.selecao = (m.inv.selecao + (e.deltaY > 0 ? 1 : 8)) % 9;
    };
    const menu = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", baixo);
    window.addEventListener("keyup", cima);
    window.addEventListener("mousemove", mover);
    window.addEventListener("mousedown", baixoRato);
    window.addEventListener("mouseup", cimaRato);
    window.addEventListener("wheel", roda, { passive: true });
    window.addEventListener("contextmenu", menu);
    return () => {
      window.removeEventListener("keydown", baixo);
      window.removeEventListener("keyup", cima);
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mousedown", baixoRato);
      window.removeEventListener("mouseup", cimaRato);
      window.removeEventListener("wheel", roda);
      window.removeEventListener("contextmenu", menu);
    };
  }, [modal]);

  // ── Toque: olhar arrastando na área do canvas ──
  const toqueUltimo = useRef<{ x: number; y: number } | null>(null);
  const aoTocarTela = useCallback((e: React.TouchEvent) => {
    const m = motorRef.current;
    const t = e.touches[0];
    if (!t) return;
    if (toqueUltimo.current) {
      const dx = t.clientX - toqueUltimo.current.x, dy = t.clientY - toqueUltimo.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        m.entrada.olharX -= dx * 0.005;
        m.entrada.olharY -= dy * 0.005;
      }
    }
    toqueUltimo.current = { x: t.clientX, y: t.clientY };
  }, []);
  const aoLargarTela = useCallback(() => { toqueUltimo.current = null; }, []);

  // ── Joystick ──
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joy, setJoy] = useState<{ x: number; y: number } | null>(null);
  const aoMoverJoy = (e: React.TouchEvent) => {
    const alvo = joystickRef.current;
    if (!alvo) return;
    const rect = alvo.getBoundingClientRect();
    const t = e.touches[0];
    if (!t) return;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = (t.clientX - cx) / (rect.width / 2), dy = (t.clientY - cy) / (rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > 1) { dx /= d; dy /= d; }
    setJoy({ x: dx, y: dy });
    const m = motorRef.current;
    m.entrada.frente = -dy;
    m.entrada.lado = dx;
    m.entrada.correr = d > 0.92;
  };
  const aoLargarJoy = () => {
    setJoy(null);
    const m = motorRef.current;
    m.entrada.frente = 0; m.entrada.lado = 0; m.entrada.correr = false;
  };

  // ── Iniciar ──
  const iniciar = (modo: Modo, carregar = false) => {
    setACarregar(true);
    setTimeout(() => {
      if (canvasRef.current) {
        motorRef.current.iniciar(canvasRef.current, modo, carregar);
        setFase("jogando");
      }
      setACarregar(false);
      if (ehToque) {
        try { void telaRef.current?.requestFullscreen?.(); } catch { /* sem fullscreen */ }
      }
    }, 50);
  };

  const sair = () => {
    const m = motorRef.current;
    m.parar();
    try { onScore?.(m.creditos); } catch { /* ignore */ }
    onExit?.();
  };

  const temSave = motorPronto && motorRef.current.temSave();
  const m = motorRef.current;
  const receitas = cap ? m.receitas() : null;

  return (
    <div ref={telaRef} className="fixed inset-0 z-[60] select-none overflow-hidden bg-black" style={{ height: "100dvh" }} data-testid="bc-raiz">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" style={{ height: "100dvh" }}
        onTouchMove={aoTocarTela} onTouchStart={aoTocarTela} onTouchEnd={aoLargarTela} data-testid="bc-canvas" />

      {/* ═══ MENU PRINCIPAL ═══ */}
      {fase === "menu" && !aCarregar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6"
          style={{ background: "linear-gradient(180deg,#1a2a4a 0%,#2a4a3a 55%,#3a5a2a 100%)" }} data-testid="bc-menu">
          <div className="text-center">
            <div className="flex items-end justify-center gap-2">
              {["#e02a2a", "#c88a3a", "#4a9a3a", "#3a6fd8", "#f0c542"].map((c, i) => (
                <div key={i} className="w-6 h-6 md:w-8 md:h-8 rounded-[4px] border-2 border-black/60 shadow-lg" style={{ background: c, transform: `translateY(${i % 2 === 0 ? -6 : 0}px)` }} />
              ))}
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.6)]">BATEUCRAFT</h1>
            <p className="text-amber-300 font-bold text-sm md:text-base tracking-widest">MUNDO LEGO · MINERA · CONSTRÓI · SOBREVIVE</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => iniciar("sobrevivencia")} data-testid="bc-jogar"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-black text-lg text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-[0_4px_0_#065f46]">
              <Play size={22} /> SOBREVIVÊNCIA
            </button>
            <button onClick={() => iniciar("criativo")} data-testid="bc-criativo"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 transition shadow-[0_4px_0_#075985]">
              <Hammer size={20} /> CRIATIVO (voar + blocos)
            </button>
            {temSave && (
              <button onClick={() => iniciar("sobrevivencia", true)} data-testid="bc-continuar"
                className="w-full py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition shadow-[0_4px_0_#92400e]">
                CONTINUAR MUNDO
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModal("avatar")} data-testid="bc-personagem"
                className="flex items-center justify-center gap-1 py-3 rounded-xl font-bold text-white bg-violet-700/80 hover:bg-violet-600 active:scale-95 transition">
                <User size={18} /> PERSONAGEM
              </button>
              <button onClick={() => setModal("ajuda")} data-testid="bc-ajuda"
                className="flex items-center justify-center gap-1 py-3 rounded-xl font-bold text-white bg-slate-700/80 hover:bg-slate-600 active:scale-95 transition">
                <Info size={18} /> COMO JOGAR
              </button>
            </div>
          </div>
          <button onClick={sair} className="text-white/60 underline text-sm">Voltar à plataforma</button>
          <p className="text-white/40 text-xs text-center max-w-xs">Joga sem registo · o teu mundo fica guardado neste aparelho</p>
        </div>
      )}

      {aCarregar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1a2a4a]" data-testid="bc-carregar">
          <div className="flex gap-1">{["#5db03a", "#7a5636", "#8f8f8f", "#e2d39a"].map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-[3px] border border-black/50 animate-bounce" style={{ background: c, animationDelay: `${i * 0.12}s` }} />
          ))}</div>
          <p className="text-white font-bold">A gerar o mundo…</p>
        </div>
      )}

      {/* ═══ HUD ═══ */}
      {fase === "jogando" && cap && (
        <>
          {/* estado — topo esquerda */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-3">
              <Coracoes vida={cap.vida} />
              <Fome fome={cap.fome} />
            </div>
            {cap.ar < 10 && (
              <div className="flex gap-[2px]" data-testid="bc-ar">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/60" style={{ background: cap.ar > i ? "#5ab0f0" : "rgba(0,0,0,0.5)" }} />
                ))}
              </div>
            )}
            <div className="text-[10px] text-white/85 font-mono bg-black/35 rounded px-1.5 py-0.5 w-fit">
              {cap.pos.map((v) => v.toFixed(0)).join(", ")} · {cap.fps} fps
            </div>
          </div>

          {/* relógio + dia — topo direita */}
          <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 text-white text-xs font-bold" data-testid="bc-dia">
              {cap.noite ? <Moon size={14} className="text-sky-300" /> : <Sun size={14} className="text-amber-300" />}
              Dia {cap.dia}
            </div>
            <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 text-white text-xs font-bold" data-testid="bc-creditos">
              <Trophy size={13} className="text-amber-300" /> {cap.creditos}
            </div>
            <button onClick={() => setModal("pausa")} data-testid="bc-pausa" className="bg-black/40 rounded-lg p-1.5 text-white"><Pause size={16} /></button>
          </div>

          {/* avisos */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col gap-1 items-center pointer-events-none w-full px-4">
            {cap.avisos.map((a, i) => (
              <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg ${a.tipo === "conquista" ? "bg-amber-500 text-black" : a.tipo === "dano" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>
                {a.texto}
              </div>
            ))}
          </div>

          {/* mira */}
          {cap.primeiraPessoa && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-5 h-5 relative" data-testid="bc-mira">
                <div className="absolute inset-0 m-auto w-0.5 h-5 bg-white/80 mix-blend-difference" />
                <div className="absolute inset-0 m-auto h-0.5 w-5 bg-white/80 mix-blend-difference" />
              </div>
              {cap.mirando && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-white/90 font-bold whitespace-nowrap bg-black/40 px-1.5 rounded">
                  {cap.mirando.nome}
                </div>
              )}
            </div>
          )}

          {/* CTA créditos → WhatsApp */}
          {cap.ctaWhats && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-green-600 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2" data-testid="bc-cta-whats">
              <MessageCircle size={16} className="text-white" />
              <span className="text-white text-[11px] font-bold">Tens {cap.creditos} créditos! Usa nas histórias e ganha 1 GB</span>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="bg-white text-green-700 text-[10px] font-black px-2 py-1 rounded-lg">FALAR</a>
              <button onClick={() => { m.ctaWhats = false; }} className="text-white/80"><X size={14} /></button>
            </div>
          )}

          {/* hotbar */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-black/45 rounded-xl border border-white/10" data-testid="bc-hotbar">
            {cap.slots.slice(0, 9).map((s, i) => (
              <button key={i} data-testid={`bc-slot-${i}`}
                onClick={() => { m.inv.selecao = i; }}
                className={`relative w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center transition ${cap.selecao === i ? "bg-white/25 ring-2 ring-white" : "bg-black/30"}`}>
                {s && <IconeItem id={s.id} qtd={s.qtd} />}
                <span className="absolute top-0 left-0.5 text-[8px] text-white/60 font-bold">{i + 1}</span>
              </button>
            ))}
          </div>

          {/* botões coluna direita */}
          <div className="absolute right-2 top-12 flex flex-col gap-2">
            <button onClick={() => setModal("inv")} data-testid="bc-inventario" className="w-10 h-10 rounded-xl bg-black/45 text-white flex items-center justify-center"><Backpack size={18} /></button>
            <button onClick={() => { m.primeiraPessoa = !m.primeiraPessoa; }} data-testid="bc-camara" className="w-10 h-10 rounded-xl bg-black/45 text-white flex items-center justify-center"><Camera size={18} /></button>
          </div>

          {/* ═══ CONTROLOS MÓVEIS ═══ */}
          {ehToque && (
            <>
              <div ref={joystickRef}
                onTouchStart={aoMoverJoy} onTouchMove={aoMoverJoy} onTouchEnd={aoLargarJoy}
                data-testid="bc-joystick"
                className="absolute left-4 bottom-16 w-32 h-32 rounded-full bg-black/25 border-2 border-white/25 touch-none">
                <div className="absolute w-14 h-14 rounded-full bg-white/35 border border-white/60 transition-transform"
                  style={{ left: "50%", top: "50%", transform: `translate(-50%,-50%) translate(${(joy?.x ?? 0) * 34}px, ${(joy?.y ?? 0) * 34}px)` }} />
              </div>
              <div className="absolute right-3 bottom-16 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <button data-testid="bc-atacar" onTouchStart={() => { m.atacarPedido = true; }}
                    className="w-14 h-14 rounded-full bg-red-600/85 text-white font-black text-xs border-2 border-black/40 shadow-lg active:scale-90">ATACAR</button>
                  <button data-testid="bc-colocar" onTouchStart={() => { m.colocarPedido = true; }}
                    className="w-14 h-14 rounded-full bg-amber-600/85 text-white font-black text-xs border-2 border-black/40 shadow-lg active:scale-90">POR</button>
                </div>
                <div className="flex gap-2">
                  <button data-testid="bc-minerar"
                    onTouchStart={() => { m.entrada.minerando = true; }}
                    onTouchEnd={() => { m.entrada.minerando = false; }}
                    className="w-16 h-16 rounded-full bg-sky-700/90 text-white font-black text-xs border-2 border-black/40 shadow-lg active:scale-90">MINERAR</button>
                  <button data-testid="bc-pular"
                    onTouchStart={() => { m.entrada.salto = true; m.entrada.subir = true; }}
                    onTouchEnd={() => { m.entrada.salto = false; m.entrada.subir = false; }}
                    className="w-16 h-16 rounded-full bg-emerald-600/90 text-white font-black text-xs border-2 border-black/40 shadow-lg active:scale-90">SALTAR</button>
                </div>
              </div>
            </>
          )}

          {/* barra de progresso de quebra (desktop, perto da mira) */}
          {!ehToque && cap.progressoQuebra > 0 && (
            <div className="absolute left-1/2 top-1/2 mt-6 -translate-x-1/2 w-24 h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${Math.min(100, cap.progressoQuebra * 100)}%` }} />
            </div>
          )}
        </>
      )}

      {/* ═══ MORTE ═══ */}
      {fase === "morto" && cap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-950/80" data-testid="bc-morto">
          <h2 className="text-4xl font-black text-red-300">Morreste!</h2>
          <p className="text-white/80 font-bold">{cap.causaMorte}</p>
          <p className="text-white/60 text-sm">Dia {cap.dia} · {cap.blocosQuebrados} blocos quebrados · {cap.creditos} créditos</p>
          <button onClick={() => { m.renascer(); setFase("jogando"); }} data-testid="bc-renascer"
            className="mt-2 px-8 py-3 rounded-xl font-black text-lg text-white bg-emerald-600 shadow-[0_4px_0_#065f46] active:scale-95">
            RENASCER
          </button>
          <button onClick={sair} className="text-white/60 underline text-sm">Guardar e sair</button>
        </div>
      )}

      {/* ═══ MODAL: INVENTÁRIO + CRIAÇÃO ═══ */}
      {modal === "inv" && (
        <div className="absolute inset-0 bg-black/70 flex items-end md:items-center justify-center p-2 md:p-6" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-2xl max-h-[82dvh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()} data-testid="bc-modal-inv">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-lg">MOCHILA</h3>
              <div className="flex gap-1">
                <button onClick={() => setReceitaSel("criacao")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${receitaSel === "criacao" ? "bg-amber-500 text-black" : "bg-slate-700 text-white"}`}>CRIAÇÃO</button>
                <button onClick={() => setReceitaSel("fundicao")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${receitaSel === "fundicao" ? "bg-orange-600 text-white" : "bg-slate-700 text-white"}`}>FUNDIÇÃO</button>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg bg-slate-700 text-white"><X size={16} /></button>
              </div>
            </div>
            {cap?.mesaPerto && <p className="text-emerald-400 text-[11px] font-bold mb-2">Perto de uma Mesa de Criação — receitas avançadas desbloqueadas</p>}
            {cap?.fornalhaPerto && receitaSel === "fundicao" && <p className="text-orange-400 text-[11px] font-bold mb-2">Perto de uma Fornalha — podes fundir</p>}
            {receitaSel === "fundicao" && !cap?.fornalhaPerto && <p className="text-red-400 text-[11px] font-bold mb-2">Precisas de uma Fornalha colocada por perto</p>}
            <div className="space-y-1.5 mb-4">
              {receitas?.lista.filter((i: any) => i.receita.categoria === receitaSel).map((i: any) => (
                <div key={i.receita.id} className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-2">
                  <IconeItem id={i.receita.resultado[0]} qtd={i.receita.resultado[1]} tamanho={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{i.receita.nome}</p>
                    <p className="text-white/50 text-[10px] truncate">
                      {i.receita.ingredientes.map(([id, q]: [number, number]) => `${q}× ${infoItem(id).nome}`).join(" + ")}
                      {i.receita.mesa ? " · mesa" : ""}
                    </p>
                    {!i.pode && i.motivo && <p className="text-red-400 text-[10px]">{i.motivo}</p>}
                  </div>
                  <button disabled={!i.pode} onClick={() => m.criar(i.receita.id)} data-testid={`bc-criar-${i.receita.id}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black ${i.pode ? "bg-emerald-600 text-white active:scale-95" : "bg-slate-700 text-white/30"}`}>
                    CRIAR
                  </button>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-[10px] font-bold uppercase mb-1">Inventário — toca para selecionar</p>
            <div className="grid grid-cols-9 gap-1">
              {cap?.slots.map((s, i) => (
                <button key={i} data-testid={`bc-inv-${i}`}
                  onClick={() => { m.inv.selecao = Math.min(i, 8); }}
                  className={`aspect-square rounded-md flex items-center justify-center ${cap.selecao === i ? "bg-white/20 ring-1 ring-white" : "bg-black/40"}`}>
                  {s && <IconeItem id={s.id} qtd={s.qtd} tamanho={26} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: PAUSA ═══ */}
      {modal === "pausa" && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center" data-testid="bc-modal-pausa">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-xs flex flex-col gap-3">
            <h3 className="text-white font-black text-xl text-center">PAUSA</h3>
            <button onClick={() => { setModal(null); }} className="py-3 rounded-xl font-bold text-white bg-emerald-600 shadow-[0_4px_0_#065f46] active:scale-95">CONTINUAR</button>
            <button onClick={() => { m.guardar(); setModal(null); }} className="py-3 rounded-xl font-bold text-white bg-sky-600 active:scale-95" data-testid="bc-guardar">GUARDAR MUNDO</button>
            <button onClick={() => setModal("ajuda")} className="py-3 rounded-xl font-bold text-white bg-slate-700 active:scale-95">COMO JOGAR</button>
            <button onClick={() => { m.primeiraPessoa = !m.primeiraPessoa; setModal(null); }} className="py-3 rounded-xl font-bold text-white bg-slate-700 active:scale-95">
              CÂMARA: {cap?.primeiraPessoa ? "1ª PESSOA" : "3ª PESSOA"}
            </button>
            <button onClick={sair} className="py-3 rounded-xl font-bold text-white bg-red-700 active:scale-95" data-testid="bc-sair">GUARDAR E SAIR</button>
          </div>
        </div>
      )}

      {/* ═══ MODAL: AJUDA ═══ */}
      {modal === "ajuda" && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-md text-white text-sm space-y-2 max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="bc-modal-ajuda">
            <h3 className="font-black text-lg mb-1">COMO JOGAR</h3>
            <p><b className="text-amber-300">Mover:</b> {ehToque ? "joystick à esquerda · arrasta o ecrã para olhar" : "WASD · rato para olhar (clica no ecrã para capturar)"}</p>
            <p><b className="text-amber-300">Minerar:</b> {ehToque ? "mantém MINERAR pressionado" : "mantém o botão esquerdo no bloco"}</p>
            <p><b className="text-amber-300">Colocar / atacar:</b> {ehToque ? "botões POR e ATACAR" : "botão direito coloca · esquerto ataca mobs"}</p>
            <p><b className="text-amber-300">Mochila:</b> tecla E ou mochila no topo · aí crias ferramentas e fundes minérios</p>
            <p><b className="text-amber-300">Sobrevive:</b> come carne e maçãs, constrói abrigo antes da noite — os Zumbis LEGO aparecem no escuro e o Estourador explode!</p>
            <p><b className="text-amber-300">Progressão:</b> madeira → tábuas → mesa → picareta → pedra → fornalha → ferro → DIAMANTE. É difícil de propósito.</p>
            <p><b className="text-emerald-300">Créditos:</b> conquistas dão créditos Bateu — troca por histórias e 1 GB via WhatsApp.</p>
            <button onClick={() => setModal(null)} className="mt-2 w-full py-2.5 rounded-xl font-black bg-amber-500 text-black">ENTENDI</button>
          </div>
        </div>
      )}

      {/* ═══ MODAL: PERSONAGEM ═══ */}
      {modal === "avatar" && <ModalPersonagem motor={m} fechar={() => setModal(null)} jogoAtivo={fase === "jogando"} />}
    </div>
  );
}

// ── Personalização LEGO ──────────────────────────────────────
function ModalPersonagem({ motor, fechar, jogoAtivo }: { motor: Motor; fechar: () => void; jogoAtivo: boolean }) {
  const [prefs, setPrefs] = useState(motor.lerPreferencias());
  const CORES_TORSO = ["#2a6adb", "#c23a3a", "#3a9a3a", "#e0a020", "#8a3adb", "#2a2a2a"];
  const CORES_PERNAS = ["#c23a3a", "#2a3a6a", "#3a3a3a", "#c8c8c8", "#4a7a2a", "#e08a2a"];
  const CHAPEUS: { id: any; nome: string }[] = [
    { id: "nenhum", nome: "Calvo" }, { id: "cabelo", nome: "Cabelo" }, { id: "bone", nome: "Boné" }, { id: "capacete", nome: "Capacete" },
  ];
  const aplicar = (p: Partial<typeof prefs>) => {
    const novo = { ...prefs, ...p };
    setPrefs(novo);
    motor.definirPreferencias(novo);
  };
  return (
    <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4" onClick={fechar}>
      <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()} data-testid="bc-modal-avatar">
        <h3 className="text-white font-black text-lg mb-3">O TEU MINIFIG</h3>
        <p className="text-white/60 text-xs mb-2">Cor do torso</p>
        <div className="flex gap-2 mb-3">{CORES_TORSO.map((c) => (
          <button key={c} onClick={() => aplicar({ torso: c })} className={`w-8 h-8 rounded-lg border-2 ${prefs.torso === c ? "ring-2 ring-white border-white" : "border-black/50"}`} style={{ background: c }} />
        ))}</div>
        <p className="text-white/60 text-xs mb-2">Cor das pernas</p>
        <div className="flex gap-2 mb-3">{CORES_PERNAS.map((c) => (
          <button key={c} onClick={() => aplicar({ pernas: c })} className={`w-8 h-8 rounded-lg border-2 ${prefs.pernas === c ? "ring-2 ring-white border-white" : "border-black/50"}`} style={{ background: c }} />
        ))}</div>
        <p className="text-white/60 text-xs mb-2">Cabeça</p>
        <div className="grid grid-cols-4 gap-2 mb-4">{CHAPEUS.map((h) => (
          <button key={h.id} onClick={() => aplicar({ chapeu: h.id })}
            className={`py-2 rounded-lg text-xs font-bold ${prefs.chapeu === h.id ? "bg-white text-black" : "bg-slate-700 text-white"}`}>{h.nome}</button>
        ))}</div>
        <button onClick={fechar} className="w-full py-3 rounded-xl font-black bg-amber-500 text-black active:scale-95">
          {jogoAtivo ? "VOLTAR AO JOGO" : "PRONTO"}
        </button>
      </div>
    </div>
  );
}
