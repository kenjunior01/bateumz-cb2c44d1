// ============================================================
// CIDADE BATEU — página do mundo-âncora da plataforma (v1)
// Rota: /cidade · Motor voxel original · distritos = portais
// Honestidade: clima real (openMeteo) com fonte visível; erros
// mostrados como erros; progresso vem só do teu dispositivo.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Clock3, CloudSun, CloudOff, Landmark, Trophy, Home, Volume2, VolumeX,
  Camera, Info, Sparkles, MapPin, Thermometer, ArrowUp, RotateCw,
} from "lucide-react";
import * as THREE from "three";
import { Motor, CAMARA_NOMES, METEO_NOMES, type CamaraModo, type Captura } from "@/game/blocos/engine";
import {
  MundoCidade, DISTRITOS, portalPerto, SEED_CIDADE, pacificarGestor, posDistrito,
  POS_CASA, POS_TROFEUS, ALTURA_PLATEAU, type Distrito,
} from "@/game/cidade/cidade";
import { estadoMissao, missoesDeHoje, registarVisita, progressoMissao, creditosCidade } from "@/game/cidade/missoes";
import {
  procurarCidade, getClimaAtual, wmoParaMeteo, OPENMETEO_ATTRIBUTION,
  type CidadeEncontrada, type ClimaAtual,
} from "@/lib/openMeteo";
import { fireConfetti } from "@/lib/celebrate";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

interface Rotulo { id: string; nome: string; cor: string; x: number; y: number; visivel: boolean; perto: boolean; rota: string; tipo: "distrito" | "casa" | "trofeus" }
interface Aviso { texto: string; k: number }

const CORES_MAPA: Record<number, string> = {
  1: "#4f9e2f", 2: "#7a5636", 3: "#8a8a8a", 4: "#7d7d7d", 5: "#dcc98f",
  6: "#3a6fd8", 7: "#9a6b39", 8: "#3e8c2a", 9: "#b78b52", 11: "#a37c46",
  16: "#6e6e6e", 17: "#f0c542", 18: "#bfe6f0", 19: "#c23a3a", 20: "#c89a62",
};

function MiniMapa({ motor }: { motor: Motor }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const desenhar = () => {
      const cv = cvRef.current;
      if (!cv || motor.fase !== "jogando") return;
      const d = motor.miniMapa(24);
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const px = cv.width / d.lado;
      ctx.fillStyle = "#0a0a14"; ctx.fillRect(0, 0, cv.width, cv.height);
      for (let z = 0; z < d.lado; z++) for (let x = 0; x < d.lado; x++) {
        const id = d.celulas[z * d.lado + x];
        if (!id) continue;
        ctx.fillStyle = CORES_MAPA[id] ?? "#666";
        ctx.fillRect(x * px, z * px, px + 0.5, px + 0.5);
      }
      // pontos dos distritos (cores dos portais)
      for (const di of DISTRITOS) {
        const [bx, bz] = posDistrito(di);
        const mx = (bx - (d.px - 24)) * px, mz = (bz - (d.pz - 24)) * px;
        if (mx < -4 || mx > cv.width + 4 || mz < -4 || mz > cv.height + 4) continue;
        ctx.fillStyle = di.cor;
        ctx.beginPath(); ctx.arc(mx, mz, 2.6, 0, 7); ctx.fill();
      }
      const cx2 = cv.width / 2, cy2 = cv.height / 2;
      const ang = -d.yaw + Math.PI;
      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(ang);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(0.75, 0.75, cv.width - 1.5, cv.height - 1.5);
    };
    desenhar();
    const t = setInterval(desenhar, 500);
    return () => clearInterval(t);
  }, [motor]);
  return <canvas ref={cvRef} width={96} height={96} data-testid="cd-minimapa"
    className="rounded-lg shadow-lg border border-white/20" />;
}

export default function CidadeBateu() {
  useSEO({ title: "Cidade Bateu — o mundo-âncora da bateumz", description: "Explora a cidade voxel da plataforma: cada distrito é um portal para os sorteios, desporto, lives, jogos e muito mais." });
  const { t } = useLanguage();
  const navigate = useNavigate();

  const motorRef = useRef<Motor>(new Motor());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vaoRef = useRef<HTMLDivElement>(null);

  const [fase, setFase] = useState<"inicio" | "jogando">("inicio");
  const [cap, setCap] = useState<Captura | null>(null);
  const [camaraModo, setCamaraModo] = useState<CamaraModo>(motorRef.current.camaraModo);
  const [somMudo, setSomMudo] = useState(motorRef.current.mudo);
  const [rotulos, setRotulos] = useState<Rotulo[]>([]);
  const [portal, setPortal] = useState<{ nome: string; rota: string; tipo: "distrito" | "casa" | "trofeus" } | null>(null);
  const [relogio, setRelogio] = useState("--:--");
  const [noite, setNoite] = useState(false);
  const [modal, setModal] = useState<"trofeus" | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [missaoTick, setMissaoTick] = useState(0); // força re-render do painel de missões
  const [climaReal, setClimaReal] = useState<{ cidade?: CidadeEncontrada; clima?: ClimaAtual; erro?: string; ativa: boolean }>({ ativa: false });
  const climaRef = useRef(climaReal);
  useEffect(() => { climaRef.current = climaReal; }, [climaReal]);
  const [creditos, setCreditos] = useState(creditosCidade());

  const missaoEstado = useRef(estadoMissao());
  const rotulosRef = useRef<Rotulo[]>([]);
  useEffect(() => { rotulosRef.current = rotulos; }, [rotulos]);
  const portalAtual = useRef<string | null>(null);
  const ultimasAvisos = useRef(0);
  const ultRotT = useRef(0);
  const ultHoraT = useRef(0);

  // ── Clima real (openMeteo) — com erro honesto, nunca inventado ──
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cidades = await procurarCidade("Maputo");
        if (!cidades[0]) throw new Error("sem resultado do geocoding");
        const clima = await getClimaAtual(cidades[0]);
        if (!vivo) return;
        setClimaReal({ cidade: cidades[0], clima, ativa: true });
        motorRef.current.definirMeteo(wmoParaMeteo(clima.codigoWmo), 660);
      } catch (e) {
        if (!vivo) return;
        setClimaReal({ ativa: false, erro: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { vivo = false; };
  }, []);

  // ── Entrar na cidade ──
  const entrar = useCallback(() => {
    const m = motorRef.current;
    const cv = canvasRef.current;
    if (!cv || m.fase !== "menu") return;
    m.fabricaMundo = () => new MundoCidade();
    m.spawnFixo = [0.5, ALTURA_PLATEAU + 1.02, 6.5]; // praça, virado ao imbondeiro
    m.iniciar(cv, "criativo", false);
    if (m.gestor) pacificarGestor(m.gestor, m.mundo); // cidade sempre pacífica
    m.yaw = Math.PI; // olha para norte (praça)
    setFase("jogando");
    m.redimensionar();
  }, []);

  // ── Ganchos E2E determinísticos ──
  const faseRef = useRef(fase);
  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => {
    (window as any).__cidade = {
      motor: motorRef.current,
      captura: () => motorRef.current.captura(),
      pump: (n: number, dt = 0.05) => { for (let i = 0; i < n; i++) motorRef.current.passo(dt); },
      teleportar: (x: number, y: number, z: number) => {
        const m = motorRef.current;
        m.px = x; m.py = y; m.pz = z; m.vx = m.vy = m.vz = 0;
      },
      olhar: (yaw: number, pitch: number) => { motorRef.current.yaw = yaw; motorRef.current.pitch = pitch; },
      fase: () => faseRef.current,
      creditos: () => creditosCidade(),
      missao: () => estadoMissao(),
      rotulos: () => rotulosRef.current,
      portalPerto: (x: number, z: number) => portalPerto(x, z),
      clima: () => climaRef.current,
    };
    return () => { try { delete (window as any).__cidade; } catch { /* ignore */ } };
  }, []);

  // ── Estado ← motor ──
  useEffect(() => {
    const m = motorRef.current;
    m.onEstado = (c) => {
      setCap(c);
      if (c.fase === "jogando") setFase("jogando");
      if (c.avisos.length !== ultimasAvisos.current) {
        ultimasAvisos.current = c.avisos.length;
        const u = c.avisos[c.avisos.length - 1];
        if (u) setAviso({ texto: u.texto, k: Date.now() });
      }
    };
    return () => { m.onEstado = null; };
  }, []);

  // ── Loop rAF: passo + render + rótulos flutuantes + relógio ──
  useEffect(() => {
    let raf = 0, anterior = performance.now();
    const ciclo = (agora: number) => {
      raf = requestAnimationFrame(ciclo);
      const dt = Math.min(0.1, (agora - anterior) / 1000);
      anterior = agora;
      const m = motorRef.current;
      if (m.fase === "menu") return;
      m.passo(dt);
      if (canvasRef.current) m.render(dt);

      // rótulos 3D → ecrã (limitado a ~8 Hz)
      if (agora - ultRotT.current > 120) {
        ultRotT.current = agora;
        const cv = canvasRef.current;
        if (cv) {
          const w = cv.clientWidth, h = cv.clientHeight;
          const v = new THREE.Vector3();
          const prox = portalPerto(m.px, m.pz, 8);
          const novos: Rotulo[] = DISTRITOS.map((di) => {
            const [bx, bz] = posDistrito(di);
            // âncora baixa quando estás perto (evita sair do frustum por cima)
            const ancora = prox?.distrito?.id === di.id ? ALTURA_PLATEAU + 4.5 : ALTURA_PLATEAU + 8.5;
            v.set(bx + 0.5, ancora, bz + 0.5).project(m.camara);
            const visivel = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
            return {
              id: di.id, nome: di.nome, cor: di.cor, rota: di.rota, tipo: "distrito" as const,
              x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visivel,
              perto: prox?.tipo === "distrito" && prox.distrito?.id === di.id,
            };
          });
          for (const [bx, bz] of [POS_CASA]) {
            v.set(bx + 0.5, ALTURA_PLATEAU + 8.5, bz + 0.5).project(m.camara);
            novos.push({
              id: "__casa__", nome: t("cidade.casa"), cor: "#fbbf24", rota: "", tipo: "casa",
              x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h,
              visivel: v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15,
              perto: prox?.tipo === "casa",
            });
          }
          v.set(POS_TROFEUS[0] + 0.5, ALTURA_PLATEAU + 7.5, POS_TROFEUS[1] + 0.5).project(m.camara);
          novos.push({
            id: "__trofeus__", nome: t("cidade.trofeus"), cor: "#e879f9", rota: "", tipo: "trofeus",
            x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h,
            visivel: v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15,
            perto: prox?.tipo === "trofeus",
          });
          setRotulos(novos);

          // prompt de portal
          if (prox) {
            const nome = prox.tipo === "casa" ? t("cidade.casa") : prox.tipo === "trofeus" ? t("cidade.trofeus") : prox.distrito?.nome ?? "";
            setPortal({ nome, rota: prox.distrito?.rota ?? "", tipo: prox.tipo });
            // registar visita UMA vez por entrada
            const chave = prox.tipo === "casa" ? "__casa__" : prox.tipo === "trofeus" ? "__trofeus__" : prox.distrito?.id ?? null;
            if (chave && portalAtual.current !== chave) {
              portalAtual.current = chave;
              const feitas = registarVisita(chave);
              setCreditos(creditosCidade());
              setMissaoTick((k) => k + 1);
              if (feitas.length) {
                fireConfetti({ intensity: "medium" });
                setAviso({ texto: `★ ${feitas[0].desc}`, k: Date.now() });
              }
            }
          } else {
            setPortal(null);
            portalAtual.current = null;
          }
        }
      }

      // relógio (2 Hz)
      if (agora - ultHoraT.current > 500) {
        ultHoraT.current = agora;
        const f = m.horaFrac;
        const hh = Math.floor(f * 24), mm = Math.floor(((f * 24) % 1) * 60);
        setRelogio(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
        setNoite(m.noite);
      }
    };
    raf = requestAnimationFrame(ciclo);
    return () => cancelAnimationFrame(raf);
  }, [t]);

  // ── Redimensionar ──
  useEffect(() => {
    const ao = () => motorRef.current.redimensionar();
    window.addEventListener("resize", ao);
    const t2 = setInterval(ao, 800);
    return () => { window.removeEventListener("resize", ao); clearInterval(t2); };
  }, []);

  // ── Entrar num portal (distrito) ──
  const entrarPortal = useCallback((rota: string) => {
    if (!rota) return;
    navigate(rota);
  }, [navigate]);

  const abrirPortalAtual = useCallback(() => {
    if (!portal) return;
    if (portal.tipo === "trofeus") { setModal("trofeus"); return; }
    if (portal.tipo === "distrito" && portal.rota) entrarPortal(portal.rota);
  }, [portal, entrarPortal]);

  // ── Teclado (desktop) ──
  useEffect(() => {
    if (fase !== "jogando") return;
    const m = motorRef.current;
    const teclas: Record<string, boolean> = {};
    const sincronizar = () => {
      m.entrada.frente = (teclas["w"] ? 1 : 0) - (teclas["s"] ? 1 : 0);
      m.entrada.lado = (teclas["d"] ? 1 : 0) - (teclas["a"] ? 1 : 0);
      m.entrada.salto = !!teclas[" "];
      m.entrada.correr = !!teclas["shift"];
      m.entrada.subir = !!teclas[" "];
      m.entrada.descer = !!teclas["control"];
    };
    const baixo = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      teclas[k] = true;
      if (k === "f5") { e.preventDefault(); setCamaraModo(m.ciclarCamara()); }
      if (k === "e") abrirPortalAtual();
      if (k === "f" && m.modo === "criativo") m.criativoVoar = !m.criativoVoar;
      sincronizar();
    };
    const cima = (e: KeyboardEvent) => { teclas[e.key.toLowerCase()] = false; sincronizar(); };
    const mover = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasRef.current) {
        m.entrada.olharX -= e.movementX * 0.0026;
        m.entrada.olharY -= e.movementY * 0.0026;
      }
    };
    window.addEventListener("keydown", baixo);
    window.addEventListener("keyup", cima);
    window.addEventListener("mousemove", mover);
    return () => {
      window.removeEventListener("keydown", baixo);
      window.removeEventListener("keyup", cima);
      window.removeEventListener("mousemove", mover);
    };
  }, [fase, abrirPortalAtual]);

  // ── Controlos móveis: joystick (esq.) + olhar (dir.) ──
  const joyRef = useRef<{ id: number | null; cx: number; cy: number }>({ id: null, cx: 0, cy: 0 });
  const lookRef = useRef<{ id: number | null; x: number; y: number }>({ id: null, x: 0, y: 0 });

  const joyInicio = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    joyRef.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const joyMove = (e: React.PointerEvent) => {
    if (joyRef.current.id !== e.pointerId) return;
    const m = motorRef.current;
    const dx = e.clientX - joyRef.current.cx, dy = e.clientY - joyRef.current.cy;
    const norm = (v: number) => Math.max(-1, Math.min(1, v / 46));
    m.entrada.lado = norm(dx);
    m.entrada.frente = -norm(dy);
  };
  const joyFim = () => {
    joyRef.current.id = null;
    const m = motorRef.current;
    m.entrada.frente = 0; m.entrada.lado = 0;
  };
  const lookInicio = (e: React.PointerEvent) => {
    lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const lookMove = (e: React.PointerEvent) => {
    if (lookRef.current.id !== e.pointerId) return;
    const m = motorRef.current;
    m.entrada.olharX -= (e.clientX - lookRef.current.x) * 0.0046;
    m.entrada.olharY -= (e.clientY - lookRef.current.y) * 0.0046;
    lookRef.current.x = e.clientX; lookRef.current.y = e.clientY;
  };

  const missao = missoesDeHoje();
  void missaoTick;

  // Portal para body: evita que wrappers com filter/transform criem um
  // containing block e esmaguem o layout fixed do jogo.
  return createPortal(
    <div ref={vaoRef} className="fixed inset-0 bg-[#0b1020] overflow-hidden select-none" data-testid="cd-raiz">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" data-testid="cd-canvas"
        onClick={() => { if (fase === "jogando") canvasRef.current?.requestPointerLock?.(); }} />

      {/* ═══ ECRÃ DE INÍCIO ═══ */}
      {fase === "inicio" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-gradient-to-b from-[#0b1020] via-[#101a38] to-[#1a1040]"
          data-testid="cd-inicio">
          <div className="w-full max-w-lg text-white text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-300/30 px-3 py-1 text-[11px] font-bold text-amber-300 mb-4">
              <Landmark size={13} /> {t("cidade.badge")} · MZ · AO · CV
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-rose-300 to-violet-300 bg-clip-text text-transparent">
              {t("cidade.titulo")}
            </h1>
            <p className="text-white/70 mt-3 text-sm leading-relaxed">{t("cidade.subtitulo")}</p>

            <div className="grid grid-cols-3 gap-2 mt-5 text-[11px]">
              {DISTRITOS.slice(0, 9).map((di) => (
                <div key={di.id} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 truncate" style={{ borderColor: `${di.cor}44` }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: di.cor }} />
                  {di.nome}
                </div>
              ))}
            </div>

            <button onClick={entrar} data-testid="cd-entrar"
              className="mt-6 w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 active:scale-[0.98] transition shadow-xl shadow-amber-500/20">
              {t("cidade.entrar")}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/60" data-testid="cd-clima-inicio">
              {climaReal.clima && climaReal.cidade ? (
                <>
                  <CloudSun size={13} className="text-sky-300" />
                  {t("cidade.climaReal")}: {climaReal.cidade.nome} · {climaReal.clima.temperatura.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}°C
                </>
              ) : climaReal.erro ? (
                <>
                  <CloudOff size={13} className="text-white/40" />
                  {t("cidade.climaOff")}
                </>
              ) : (
                <span className="animate-pulse">{t("cidade.climaAcarregar")}</span>
              )}
            </div>
            <p className="mt-2 text-[10px] text-white/35">{t("cidade.fonte")} · open-meteo.com · {t("cidade.semente")}: {SEED_CIDADE}</p>
          </div>
        </div>
      )}

      {/* ═══ HUD ═══ */}
      {fase === "jogando" && (
        <>
          {/* topo esquerda: voltar + créditos */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            <button onClick={() => navigate("/")} data-testid="cd-voltar"
              className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur">
              <ArrowLeft size={17} />
            </button>
            <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-white backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest text-white/50 leading-none">{t("cidade.titulo")}</p>
              <p className="text-sm font-black leading-tight flex items-center gap-1" data-testid="cd-creditos">
                <Sparkles size={13} className="text-amber-300" /> {creditos} <span className="text-[10px] font-bold text-white/50">{t("cidade.creditos")}</span>
              </p>
            </div>
          </div>

          {/* topo centro: relógio + meteo */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-white text-sm font-bold flex items-center gap-1.5 backdrop-blur" data-testid="cd-relogio">
              <Clock3 size={14} className={noite ? "text-indigo-300" : "text-amber-300"} /> {relogio}
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-white text-xs font-bold backdrop-blur" data-testid="cd-meteo">
              {cap ? METEO_NOMES[cap.meteo] : "—"}
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-white text-xs flex items-center gap-1 backdrop-blur" data-testid="cd-clima">
              {climaReal.clima && climaReal.cidade ? (
                <>
                  <Thermometer size={12} className="text-sky-300" />
                  {climaReal.cidade.nome} {climaReal.clima.temperatura.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}°
                </>
              ) : (
                <span className="text-white/50 flex items-center gap-1"><CloudOff size={12} /> {t("cidade.climaOff")}</span>
              )}
            </div>
          </div>

          {/* topo direita: minimapa + botões */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
            <MiniMapa motor={motorRef.current} />
            <div className="flex gap-2">
              <button onClick={() => setCamaraModo(motorRef.current.ciclarCamara())} data-testid="cd-camara"
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur" title={CAMARA_NOMES[camaraModo]}>
                <Camera size={16} />
              </button>
              <button onClick={() => { const m = motorRef.current; setSomMudo(!m.alternarSom()); }}
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur">
                {somMudo ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={() => setModal("trofeus")} data-testid="cd-trofeus-btn"
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur">
                <Trophy size={16} />
              </button>
            </div>
          </div>

          {/* rótulos flutuantes dos distritos */}
          {rotulos.filter((r) => r.visivel).map((r) => (
            <div key={r.id} className="absolute z-10 pointer-events-none" style={{ left: r.x, top: r.y, transform: "translate(-50%, -100%)" }}
              data-testid={`cd-rotulo-${r.id.replace(/^__|__$/g, "")}`}>
              <div className="flex flex-col items-center gap-1">
                <div className="px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap backdrop-blur border shadow-lg"
                  style={{ background: "rgba(2,6,23,0.62)", borderColor: `${r.cor}66`, color: r.cor }}>
                  {r.tipo === "distrito" && <MapPin size={10} className="inline mr-1 -mt-0.5" />}
                  {r.tipo === "casa" && <Home size={10} className="inline mr-1 -mt-0.5" />}
                  {r.tipo === "trofeus" && <Trophy size={10} className="inline mr-1 -mt-0.5" />}
                  {r.nome}
                </div>
                {r.perto && portal?.nome === r.nome && portal.tipo === "distrito" && (
                  <button onClick={() => entrarPortal(r.rota)} data-testid="cd-portal-cta" className="pointer-events-auto
                    px-4 py-2 rounded-xl font-black text-[13px] text-slate-950 shadow-xl active:scale-95 transition"
                    style={{ background: r.cor }}>
                    {t("cidade.entrarEm")} {r.nome} →
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* prompt central (casa/troféus) */}
          {portal && portal.tipo !== "distrito" && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
              <button onClick={abrirPortalAtual} data-testid="cd-portal-especial"
                className="px-5 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-xl active:scale-95">
                {portal.tipo === "trofeus" ? <><Trophy size={14} className="inline mr-1 -mt-0.5" />{t("cidade.abrirTrofeus")}</> : <><Home size={14} className="inline mr-1 -mt-0.5" />{portal.nome}</>}
              </button>
            </div>
          )}

          {/* painel de missões */}
          <div className="absolute bottom-3 left-3 z-20 w-56 rounded-2xl bg-black/60 border border-white/15 backdrop-blur p-3 text-white"
            data-testid="cd-missoes">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-300" /> {t("cidade.missoes")}
            </p>
            <div className="space-y-1.5">
              {missao.map((ms) => {
                const e = missaoEstado.current;
                const prog = progressoMissao(ms, e);
                const feita = e.reclamadas.includes(ms.id);
                return (
                  <div key={ms.id} className={`text-[11px] leading-tight ${feita ? "text-emerald-300" : "text-white/85"}`}>
                    <div className="flex items-center gap-1">
                      <span>{feita ? "✓" : "•"}</span>
                      <span className="flex-1">{ms.desc}</span>
                      <span className="tabular-nums text-white/45">{feita ? "" : `${prog}/${ms.alvo}`}</span>
                    </div>
                    {!feita && ms.alvo > 1 && (
                      <div className="h-1 rounded bg-white/10 mt-0.5 ml-3.5">
                        <div className="h-1 rounded bg-amber-300 transition-all" style={{ width: `${(prog / ms.alvo) * 100}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* aviso/toast */}
          {aviso && (
            <div key={aviso.k} className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-black/70 border border-amber-300/40 text-amber-200 text-sm font-bold animate-fade-in"
              onAnimationEnd={() => setTimeout(() => setAviso(null), 2200)} data-testid="cd-aviso">
              {aviso.texto}
            </div>
          )}

          {/* controlos móveis (só ecrãs táteis) */}
          <div className="md:hidden">
            <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-2 items-end">
              <button data-testid="cd-saltar"
                onPointerDown={() => { motorRef.current.entrada.salto = true; motorRef.current.entrada.subir = true; }}
                onPointerUp={() => { motorRef.current.entrada.salto = false; motorRef.current.entrada.subir = false; }}
                onPointerLeave={() => { motorRef.current.entrada.salto = false; motorRef.current.entrada.subir = false; }}
                className="w-14 h-14 rounded-full bg-black/55 border border-white/20 text-white flex items-center justify-center active:scale-95 backdrop-blur">
                <ArrowUp size={20} />
              </button>
              <button data-testid="cd-correr"
                onPointerDown={() => { motorRef.current.entrada.correr = true; }}
                onPointerUp={() => { motorRef.current.entrada.correr = false; }}
                className="w-11 h-11 rounded-full bg-black/55 border border-white/20 text-white flex items-center justify-center active:scale-95 backdrop-blur">
                <RotateCw size={16} className="hidden" /><span className="text-[10px] font-black">RUN</span>
              </button>
            </div>
            {/* joystick */}
            <div data-testid="cd-joystick"
              onPointerDown={joyInicio} onPointerMove={joyMove} onPointerUp={joyFim} onPointerCancel={joyFim}
              className="absolute bottom-16 left-6 z-20 w-28 h-28 rounded-full bg-black/35 border border-white/20 touch-none backdrop-blur">
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/25 border border-white/30" />
            </div>
            {/* área de olhar (resto do ecrã, sob o HUD) */}
            <div data-testid="cd-olhar"
              onPointerDown={lookInicio} onPointerMove={lookMove}
              className="absolute inset-0 z-0 touch-none" />
          </div>

          {/* dica de controlos (desktop) */}
          <div className="hidden md:block absolute bottom-3 right-3 z-20 text-[10px] text-white/45 text-right leading-relaxed">
            WASD {t("cidade.andar")} · {t("cidade.rato")} {t("cidade.olhar")} · F5 {t("cidade.camara")} · E {t("cidade.interagir")} · F {t("cidade.voar")}
          </div>
        </>
      )}

      {/* ═══ MODAL: SALA DE TROFÉUS ═══ */}
      {modal === "trofeus" && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-5 w-full max-w-md text-white max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} data-testid="cd-modal-trofeus">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg flex items-center gap-2"><Trophy size={18} className="text-amber-300" />{t("cidade.trofeus")}</h3>
              <button onClick={() => setModal(null)} className="text-white/70 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-white/60 mb-4">{t("cidade.trofeusDesc")}</p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3 text-sm space-y-2" data-testid="cd-trofeus-missoes">
              {missoesDeHoje().map((ms) => {
                const e = missaoEstado.current;
                const feita = e.reclamadas.includes(ms.id);
                return (
                  <p key={ms.id} className={feita ? "text-emerald-300" : "text-white/80"}>
                    {feita ? "🏆" : "◻"} {ms.desc} <span className="text-white/40">(+15 {t("cidade.creditos")})</span>
                  </p>
                );
              })}
              <p className="text-amber-200 font-bold pt-1 border-t border-white/10">
                <Sparkles size={12} className="inline mr-1 -mt-0.5" />{t("cidade.total")}: {creditosCidade()} {t("cidade.creditos")}
              </p>
            </div>
            {climaReal.clima && climaReal.cidade && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 mb-3 text-xs" data-testid="cd-clima-detalhe">
                <p className="font-bold flex items-center gap-1.5"><CloudSun size={13} className="text-sky-300" />
                  {t("cidade.climaReal")} — {climaReal.cidade.nome}{climaReal.cidade.pais ? `, ${climaReal.cidade.pais}` : ""}
                  <span className="ml-auto text-sky-300">{climaReal.clima.temperatura.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}°C</span>
                </p>
                <p className="text-white/60 mt-1">{t("cidade.climaSinc")}</p>
                <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1"><Info size={10} /> {OPENMETEO_ATTRIBUTION}</p>
              </div>
            )}
            <p className="text-[10px] text-white/40">{t("cidade.honesto")} · {t("cidade.semente")}: {SEED_CIDADE}</p>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
