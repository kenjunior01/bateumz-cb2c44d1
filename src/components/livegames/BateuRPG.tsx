// ============================================================
// BATEU RPG: LENDAS — Interface do jogo (100% português)
// Menu (dificuldade Médio→Difícil→Lenda) · HUD RPG (vida, XP,
// nível, missão, bússola, boss) · Missões / Diário / Habilidades ·
// controlos móveis · morte e renascimento · clima REAL (Open-Meteo)
// Substitui o BateuCraft na plataforma (v41 — pedido do utilizador).
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { Motor, type CamaraModo } from "@/game/blocos/engine";
import { SistemaRPG, type CapturaRpg } from "@/game/rpg/sistemaRpg";
import {
  ORDEM_DIFICULDADE, DIFICULDADES_RPG, type DificuldadeRpg,
  RAMOS_RPG, NOMES_RAMO, EFEITO_RAMO, NIVEL_MAX_RAMO_RPG,
  NIVEL_MAX, REGIOES, POIS,
} from "@/game/rpg/core";
import { estimarEspaco, mbLegivel } from "@/game/armazem";
import { infoItem } from "@/game/blocos/inventario";
import { ITENS, NIVEL_MAR } from "@/game/blocos/constants";
import { X, Play, Swords, Sun, Moon, Camera, Pause, Trophy, Compass, Map as MapIcon, BookOpen, Sparkles, ShieldAlert, CloudRain, CloudLightning, CloudSun, Skull, ChevronUp, HelpCircle } from "lucide-react";
import { procurarCidade, getClimaAtual, wmoDescricaoPt, wmoParaMeteo, wmoEhNeve, OPENMETEO_ATTRIBUTION, type CidadeEncontrada, type ClimaAtual } from "@/lib/openMeteo";

interface Props {
  onScore?: (score: number) => void;
  onExit?: () => void;
}

const ehToque = typeof window !== "undefined" && ("ontouchstart" in window || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

// ── Clima REAL (Open-Meteo) — herdado do padrão v31 ────────────
interface ClimaRealEstado {
  ativa: boolean;
  cidade: CidadeEncontrada | null;
  clima: ClimaAtual | null;
  erro: string;
}
const LS_CLIMA_REAL = "bateumz.climaReal";

function carregarClimaReal(): ClimaRealEstado {
  try {
    const raw = localStorage.getItem(LS_CLIMA_REAL);
    if (raw) {
      const p = JSON.parse(raw) as { ativa?: boolean; cidade?: CidadeEncontrada };
      if (p?.ativa && p?.cidade?.nome && typeof p.cidade.latitude === "number") {
        return { ativa: true, cidade: p.cidade, clima: null, erro: "" };
      }
    }
  } catch { /* localStorage indisponível */ }
  return { ativa: false, cidade: null, clima: null, erro: "" };
}

// ── HUD: corações e fome (herdados do motor partilhado) ────────
function Coracoes({ vida }: { vida: number }) {
  return (
    <div className="flex gap-[2px]" data-testid="rpg-vida">
      {Array.from({ length: 10 }).map((_, i) => {
        const cheio = vida >= (i + 1) * 2, meio = !cheio && vida >= i * 2 + 1;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            <path d="M8 14 C4 11 1.5 8.5 1.5 5.8 C1.5 3.6 3.2 2 5.2 2 C6.4 2 7.5 2.7 8 3.6 C8.5 2.7 9.6 2 10.8 2 C12.8 2 14.5 3.6 14.5 5.8 C14.5 8.5 12 11 8 14Z"
              fill={cheio ? "#e02a2a" : meio ? "url(#rpgMeioV)" : "#3a3a3a"} stroke="#1a1a1a" strokeWidth="1" />
            {meio && (<defs><linearGradient id="rpgMeioV"><stop offset="50%" stopColor="#e02a2a" /><stop offset="50%" stopColor="#3a3a3a" /></linearGradient></defs>)}
          </svg>
        );
      })}
    </div>
  );
}
function Fome({ fome }: { fome: number }) {
  return (
    <div className="flex gap-[2px]" data-testid="rpg-fome">
      {Array.from({ length: 10 }).map((_, i) => {
        const cheio = fome >= (i + 1) * 2, meio = !cheio && fome >= i * 2 + 1;
        return (
          <svg key={i} width="15" height="15" viewBox="0 0 16 16" className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ transform: "scaleX(-1)" }}>
            <path d="M8 14 C4 11 1.5 8.5 1.5 5.8 C1.5 3.6 3.2 2 5.2 2 C6.4 2 7.5 2.7 8 3.6 C8.5 2.7 9.6 2 10.8 2 C12.8 2 14.5 3.6 14.5 5.8 C14.5 8.5 12 11 8 14Z"
              fill={cheio ? "#c88a3a" : meio ? "url(#rpgMeioF)" : "#3a3a3a"} stroke="#1a1a1a" strokeWidth="1" />
            {meio && (<defs><linearGradient id="rpgMeioF"><stop offset="50%" stopColor="#c88a3a" /><stop offset="50%" stopColor="#3a3a3a" /></linearGradient></defs>)}
          </svg>
        );
      })}
    </div>
  );
}

function IconeItem({ id, qtd, tamanho = 34 }: { id: number; qtd?: number; tamanho?: number }) {
  const info = infoItem(id);
  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <div className="w-full h-full rounded-[4px] border border-black/60 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${info.cor1}, ${info.cor2})` }}>
        <span className="text-[9px] font-black text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
          {info.nome.slice(0, 2).toUpperCase()}
        </span>
      </div>
      {qtd !== undefined && qtd > 1 && (
        <span className="absolute -bottom-1 -right-1 text-[10px] font-black text-white bg-black/70 rounded px-1">{qtd}</span>
      )}
    </div>
  );
}

const COR_AVISO: Record<string, string> = {
  nivel: "from-amber-500/90 to-yellow-400/90",
  missao: "from-violet-600/90 to-fuchsia-500/90",
  descoberta: "from-emerald-600/90 to-teal-400/90",
  boss: "from-rose-700/90 to-red-500/90",
  info: "from-slate-700/90 to-slate-500/90",
};

const METEO_ICONE = { limpo: CloudSun, chuva: CloudRain, tempestade: CloudLightning } as const;

function relogio(horaFrac: number): string {
  const h = Math.floor(horaFrac * 24);
  const m = Math.floor((horaFrac * 24 - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function BateuRPG({ onScore, onExit }: Props) {
  const motorRef = useRef<Motor>(new Motor());
  const sistemaRef = useRef<SistemaRPG>(new SistemaRPG());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [fase, setFase] = useState<"inicio" | "jogando" | "morto">("inicio");
  const [cap, setCap] = useState<ReturnType<Motor["captura"]> | null>(null);
  const [rpg, setRpg] = useState<CapturaRpg | null>(null);
  const [modal, setModal] = useState<null | "missoes" | "diario" | "habilidades" | "pausa" | "mapa" | "ajuda">(null);
  const [camaraModo, setCamaraModo] = useState<CamaraModo>(motorRef.current.camaraModo);
  const [somMudo, setSomMudo] = useState(motorRef.current.mudo);
  const [aCarregar, setACarregar] = useState(false);
  const [difMenu, setDifMenu] = useState<DificuldadeRpg>("medio");
  const [savePronto, setSavePronto] = useState(false);
  const [temSave, setTemSave] = useState(false);
  const [espacoEst, setEspacoEst] = useState<{ uso: number; quota: number } | "pendente" | null>(null);
  const [flashDano, setFlashDano] = useState(0);
  const [climaReal, setClimaReal] = useState<ClimaRealEstado>(() => carregarClimaReal());
  const climaRef = useRef(climaReal);
  useEffect(() => { climaRef.current = climaReal; }, [climaReal]);
  const [buscaCidade, setBuscaCidade] = useState("");
  const [buscando, setBuscando] = useState(false);
  const modalRef = useRef<null | typeof modal>(null);
  const [ajudaMenu, setAjudaMenu] = useState(false);
  const [confRecomecar, setConfRecomecar] = useState(false);
  const mapaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rpgRef = useRef<CapturaRpg | null>(null);
  const desenharMapaRef = useRef<() => void>(() => { /* ligado no primeiro render */ });
  useEffect(() => { modalRef.current = modal; }, [modal]);
  const [creditosEnviados, setCreditosEnviados] = useState(0);

  // ── carregar save (IDB) para o menu ──
  useEffect(() => {
    let vivo = true;
    sistemaRef.current.quandoSavePronto().then((p) => {
      if (!vivo) return;
      setSavePronto(true);
      setTemSave(
        p.xp > 0 || p.missoes.concluidasTotal > 0 || p.descobertas.regioes.length > 0 || p.descobertas.pois.length > 0,
      );
      setDifMenu(p.dificuldade);
    });
    estimarEspaco().then((e) => { if (vivo) setEspacoEst(e); });
    return () => { vivo = false; };
  }, []);

  // ── aplicar clima real guardado ao começar ──
  useEffect(() => {
    if (fase !== "jogando") return;
    const c = climaRef.current.clima;
    if (climaRef.current.ativa && c) motorRef.current.definirMeteo(wmoParaMeteo(c.codigoWmo), 660);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // ── estado ← motor + sistema ──
  const vidaAnterior = useRef<number | null>(null);
  useEffect(() => {
    const m = motorRef.current;
    const s = sistemaRef.current;
    // mundo/spawn RPG ANTES de qualquer iniciar (fabricaMundo + spawnFixo)
    s.preparar(m);
    m.onEstado = (c) => {
      // antes do iniciar o motor ainda está em "menu" — emissões prematuras
      // (ex.: clima real aplicado no menu) NUNCA podem ligar a UI de jogo
      if (m.fase === "menu") return;
      setCap(c);
      setFase(c.fase === "morto" ? "morto" : "jogando");
      if (vidaAnterior.current !== null && c.vida < vidaAnterior.current - 0.01) setFlashDano((k) => k + 1);
      vidaAnterior.current = c.vida;
    };
    setSavePronto(true);
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
        sistemaRef.current.tick(dt);
        if (canvasRef.current) m.render(dt);
        // HUD a ~12 Hz (o motor emite o resto)
        const capturaAgora = sistemaRef.current.captura();
        rpgRef.current = capturaAgora;
        setRpg(capturaAgora);
        if (modalRef.current === "mapa") desenharMapaRef.current();
      }
    };
    raf = requestAnimationFrame(ciclo);
    return () => cancelAnimationFrame(raf);
  }, []);

  // créditos → leaderboard da plataforma (quando crescem)
  useEffect(() => {
    if (!rpg || !onScore) return;
    if (rpg.creditos > creditosEnviados) {
      setCreditosEnviados(rpg.creditos);
      onScore(rpg.creditos);
    }
  }, [rpg?.creditos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redimensionar ──
  useEffect(() => {
    const ao = () => motorRef.current.redimensionar();
    window.addEventListener("resize", ao);
    const t = setInterval(ao, 800);
    return () => { window.removeEventListener("resize", ao); clearInterval(t); };
  }, []);

  // ── Ganchos E2E determinísticos ──
  useEffect(() => {
    (window as any).__rpg = {
      motor: motorRef.current,
      sistema: sistemaRef.current,
      captura: () => motorRef.current.captura(),
      capturaRpg: () => sistemaRef.current.captura(),
      perfil: () => sistemaRef.current.perfil,
      pump: (n: number, dt = 0.05) => { for (let i = 0; i < n; i++) { motorRef.current.passo(dt); sistemaRef.current.tick(dt); } },
      iniciar: (carregar = false) => {
        if (canvasRef.current) {
          sistemaRef.current.preparar(motorRef.current);
          motorRef.current.iniciar(canvasRef.current, "sobrevivencia", false);
          sistemaRef.current.ligarAposIniciar();
          setFase("jogando");
        }
        void carregar;
      },
      novoJogo: (dif: DificuldadeRpg) => sistemaRef.current.novoJogo(dif),
      definirDificuldade: (d: DificuldadeRpg) => sistemaRef.current.definirDificuldade(d),
      gastarPonto: (r: string) => sistemaRef.current.gastarPonto(r as any),
      temSave: () => sistemaRef.current.temSave(),
      guardar: () => sistemaRef.current.guardar(),
      apagarSave: () => sistemaRef.current.apagarSave(),
      teleportar: (x: number, y: number, z: number) => { const mm = motorRef.current; mm.px = x; mm.py = y; mm.pz = z; mm.vx = mm.vy = mm.vz = 0; },
      olhar: (yaw: number, pitch = 0) => { motorRef.current.yaw = yaw; motorRef.current.pitch = pitch; },
      atacar: () => { motorRef.current.atacarPedido = true; },
      atacarDirecto: () => motorRef.current.atacar(),
      comer: () => { motorRef.current.comerPedido = true; },
      pular: (v: boolean) => { motorRef.current.entrada.salto = v; },
      mover: (frente: number, lado = 0, seg = 1) => {
        const mm = motorRef.current;
        mm.entrada.frente = frente; mm.entrada.lado = lado;
        for (let i = 0; i < Math.round(seg * 20); i++) { mm.passo(0.05); sistemaRef.current.tick(0.05); }
        mm.entrada.frente = 0; mm.entrada.lado = 0;
      },
      spawnarMob: (tipo: "porco" | "zumbi" | "estourador" | "vaca" | "galinha" | "aranha", dx = 3, dz = 0) => {
        const mm = motorRef.current;
        return mm.gestor.spawnar(tipo, mm.px + dx, mm.py + 1.5, mm.pz + dz);
      },
      definirVida: (v: number) => { motorRef.current.vida = v; },
      definirHora: (f: number) => { const mm = motorRef.current; mm.tempo = mm.dia * 600 - 600 + f * 600; },
      definirMeteo: (mt: "limpo" | "chuva" | "tempestade", seg?: number) => motorRef.current.definirMeteo(mt, seg),
      meteo: () => motorRef.current.meteo,
      selecionar: (i: number) => { motorRef.current.inv.selecao = i; },
      dar: (id: number, qtd = 1) => motorRef.current.inv.adicionar(id, qtd),
      limparInv: () => motorRef.current.inv.limpar(),
      pausar: (v: boolean) => { motorRef.current.pausado = v; },
      ciclarCamara: () => { const c = motorRef.current.ciclarCamara(); setCamaraModo(c); return c; },
      // clima real (Open-Meteo)
      climaEstado: () => {
        const c = climaRef.current;
        return {
          ativa: c.ativa,
          cidade: c.cidade?.nome ?? null,
          clima: c.clima ? { temperatura: c.clima.temperatura, codigoWmo: c.clima.codigoWmo, meteoJogo: wmoParaMeteo(c.clima.codigoWmo) } : null,
          erro: c.erro,
        };
      },
      climaAtivar: (nome: string) => procurarCidade(nome).then((rs) => {
        if (rs[0]) { ativarClimaReal(rs[0]); return rs[0]; }
        throw new Error("Cidade não encontrada");
      }),
      climaDesativar: () => desativarClimaReal(),
      // v44: contagens honestas da base de terreno real do mapa
      mapaBase: () => ({ ...mapaBaseInfoRef.current }),
    };
    return () => { try { delete (window as any).__rpg; } catch { /* ignore */ } };
  }, []);

  // ── clima real: aplicar / procurar ──
  const ativarClimaReal = (cidade: CidadeEncontrada) => {
    const estado: ClimaRealEstado = { ativa: true, cidade, clima: null, erro: "" };
    setClimaReal(estado);
    try { localStorage.setItem(LS_CLIMA_REAL, JSON.stringify({ ativa: true, cidade })); } catch { /* ignore */ }
    getClimaAtual(cidade).then((clima) => {
      setClimaReal((v) => ({ ...v, clima }));
      if (motorRef.current.fase === "jogando") motorRef.current.definirMeteo(wmoParaMeteo(clima.codigoWmo), 660);
    }).catch(() => setClimaReal((v) => ({ ...v, erro: "Não foi possível obter o clima do Open-Meteo agora. O jogo segue o ciclo simulado — honesto." })));
  };
  const desativarClimaReal = () => {
    setClimaReal({ ativa: false, cidade: null, clima: null, erro: "" });
    try { localStorage.removeItem(LS_CLIMA_REAL); } catch { /* ignore */ }
    if (motorRef.current.fase === "jogando") motorRef.current.definirMeteo("limpo");
  };
  const procurar = () => {
    const nome = buscaCidade.trim();
    if (!nome || buscando) return;
    setBuscando(true);
    procurarCidade(nome).then((rs) => {
      setBuscando(false);
      if (rs[0]) { ativarClimaReal(rs[0]); setBuscaCidade(""); }
      else setClimaReal((v) => ({ ...v, erro: `Não encontrei “${nome}”. Experimenta: Maputo, Luanda, Praia.` }));
    }).catch(() => { setBuscando(false); setClimaReal((v) => ({ ...v, erro: "A busca falhou (rede?). O clima do jogo continua honesto — limpo por omissão." })); });
  };

  // ── Teclado / rato (desktop) ──
  useEffect(() => {
    const m = motorRef.current;
    const teclas: Record<string, boolean> = {};
    const sincronizar = () => {
      m.entrada.frente = (teclas["w"] ? 1 : 0) - (teclas["s"] ? 1 : 0);
      m.entrada.lado = (teclas["d"] ? 1 : 0) - (teclas["a"] ? 1 : 0);
      m.entrada.salto = !!teclas[" "];
      m.entrada.correr = !!teclas["shift"];
      m.entrada.zoom = !!teclas["z"];
    };
    const baixo = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      teclas[k] = true;
      if (m.fase === "menu") return;
      if (k >= "1" && k <= "9") m.inv.selecao = parseInt(k) - 1;
      if (k === "j") setModal((v) => (v === "missoes" ? null : "missoes"));
      if (k === "k") setModal((v) => (v === "habilidades" ? null : "habilidades"));
      if (k === "m") setModal((v) => (v === "mapa" ? null : "mapa"));
      if (k === "escape") {
        if (modalRef.current === "pausa") { m.pausado = false; setModal(null); }
        else if (modalRef.current) { setModal(null); m.pausado = false; }
        else if (m.fase === "jogando") { m.pausado = true; setModal("pausa"); }
      }
      if (k === "f5") { e.preventDefault(); setCamaraModo(m.ciclarCamara()); }
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
      if (m.fase !== "jogando" || modalRef.current) return;
      if (e.button === 0) { m.entrada.minerando = true; m.atacarPedido = true; }
      if (e.button === 2) {
        const s = m.inv.selecionado();
        if (s && ITENS[s.id]?.comida) m.comerPedido = true;
      }
    };
    const cimaRato = (e: MouseEvent) => { if (e.button === 0) m.entrada.minerando = false; };
    const roda = (e: WheelEvent) => {
      if (m.fase !== "jogando") return;
      m.inv.selecao = (m.inv.selecao + (e.deltaY > 0 ? 1 : 8)) % 9;
    };
    const menuC = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", baixo);
    window.addEventListener("keyup", cima);
    window.addEventListener("mousemove", mover);
    window.addEventListener("mousedown", baixoRato);
    window.addEventListener("mouseup", cimaRato);
    window.addEventListener("wheel", roda, { passive: true });
    window.addEventListener("contextmenu", menuC);
    return () => {
      window.removeEventListener("keydown", baixo);
      window.removeEventListener("keyup", cima);
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mousedown", baixoRato);
      window.removeEventListener("mouseup", cimaRato);
      window.removeEventListener("wheel", roda);
      window.removeEventListener("contextmenu", menuC);
    };
  }, []);

  const capturarRato = useCallback(() => {
    if (ehToque) return;
    const c = canvasRef.current;
    if (!c || document.pointerLockElement === c) return;
    try { (c.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => { /* negado */ }); } catch { /* sem pointer lock */ }
  }, []);
  useEffect(() => {
    if (modal && document.pointerLockElement) { try { document.exitPointerLock(); } catch { /* ignore */ } }
  }, [modal]);
  useEffect(() => {
    if (fase === "morto" && document.pointerLockElement) { try { document.exitPointerLock(); } catch { /* ignore */ } }
  }, [fase]);

  // ── Toque: olhar + joystick ──
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

  // ── iniciar / sair ──
  const iniciar = async (carregar: boolean) => {
    setACarregar(true);
    if (!carregar) await sistemaRef.current.novoJogo(difMenu);
    setTimeout(() => {
      if (canvasRef.current) {
        sistemaRef.current.preparar(motorRef.current);
        motorRef.current.iniciar(canvasRef.current, "sobrevivencia", false);
        sistemaRef.current.ligarAposIniciar();
        setFase("jogando");
      }
      setACarregar(false);
    }, 60);
  };
  const renascer = () => {
    motorRef.current.renascer();
    setFase("jogando");
  };
  const sair = () => {
    void sistemaRef.current.guardar().then(() => onScore?.(sistemaRef.current.perfil.creditos));
    onExit?.();
  };

  const m = motorRef.current;
  const s = sistemaRef.current;
  const MeteoIcone = cap ? (METEO_ICONE[cap.meteo] ?? CloudSun) : CloudSun;

  // ── Mapa do mundo (canvas) — redesenhado a cada frame enquanto aberto ──
  // v44: base de TERRENO REAL amostrada do mundo (alturaTerreno+bioma do
  // MundoRPG — os mesmos dados que geram os chunks, semente SEED_RPG) pintada
  // UMA vez num canvas fora do ecrã e copiada com drawImage a cada frame.
  // Nada inventado: água onde o terreno fica sob o NIVEL_MAR, areia na faixa
  // da costa, rocha/picos da serra por altura real, floresta do miombo e
  // planície pelo bioma real. Contagens honestas expostas no __rpg.mapaBase.
  const mapaBaseRef = useRef<HTMLCanvasElement | null>(null);
  const mapaBaseInfoRef = useRef<{ amostras: number; agua: number; rocha: number; floresta: number; ms: number }>(
    { amostras: 0, agua: 0, rocha: 0, floresta: 0, ms: 0 });
  const renderMapaBase = useCallback(() => {
    const t0 = performance.now();
    const T = 660, EXT = 132, PASSO = 3; // 3px ≈ 1,2 blocos de mundo
    const cv = document.createElement("canvas");
    cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const mundo = motorRef.current.mundo;
    let amostras = 0, agua = 0, rocha = 0, floresta = 0;
    for (let sy = 0; sy < T; sy += PASSO) {
      for (let sx = 0; sx < T; sx += PASSO) {
        const x = (sx / T) * (2 * EXT) - EXT;
        const z = (sy / T) * (2 * EXT) - EXT;
        const h = mundo.alturaTerreno(x, z);
        const b = mundo.bioma(x, z);
        amostras++;
        let cor: string;
        if (h < NIVEL_MAR - 6) { cor = "#16336e"; agua++; }
        else if (h < NIVEL_MAR - 1) { cor = "#1e4a94"; agua++; }
        else if (h <= NIVEL_MAR + 1) cor = "#d3c088";               // areia da costa
        else if (h > 66) { cor = "#c9d2dc"; rocha++; }              // picos da serra
        else if (h > 52) { cor = "#8b93a1"; rocha++; }              // rocha alta da serra
        else if (b === "montanha") { cor = "#7d8590"; rocha++; }
        else if (b === "floresta") { cor = h % 2 ? "#2b5e33" : "#275431"; floresta++; }
        else if (b === "deserto") cor = "#c0a96b";
        else cor = h % 2 ? "#3f7a36" : "#397031";                   // planície
        ctx.fillStyle = cor;
        ctx.fillRect(sx, sy, PASSO, PASSO);
      }
    }
    mapaBaseRef.current = cv;
    mapaBaseInfoRef.current = { amostras, agua, rocha, floresta, ms: Math.round(performance.now() - t0) };
  }, []);

  const desenharMapa = useCallback(() => {
    const cv = mapaCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const T = 660;
    if (cv.width !== T) { cv.width = T; cv.height = T; }
    const EXT = 132; // mundo de −132 a +132 (cobre todas as regiões)
    const px = (x: number) => ((x + EXT) / (2 * EXT)) * T;
    const pz = (z: number) => ((z + EXT) / (2 * EXT)) * T;
    // v44: base de terreno real (amostrada uma vez, cacheada fora do ecrã)
    if (!mapaBaseRef.current) renderMapaBase();
    if (mapaBaseRef.current) ctx.drawImage(mapaBaseRef.current, 0, 0);
    else { ctx.fillStyle = "#0a140d"; ctx.fillRect(0, 0, T, T); }
    // grelha suave
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let g = -120; g <= 120; g += 30) {
      ctx.beginPath(); ctx.moveTo(px(g), 0); ctx.lineTo(px(g), T); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pz(g)); ctx.lineTo(T, pz(g)); ctx.stroke();
    }
    const s = sistemaRef.current;
    const desc = s.perfil.descobertas;
    // Terras Selvagens (fora das regiões)
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Terras Selvagens", px(-98), pz(-6));
    ctx.fillText("Terras Selvagens", px(96), pz(-84));
    // regiões (v44: terreno real por baixo — descoberta leva um tint suave da
    // cor da região; não descoberta leva um véu escuro, só «???» + Nv)
    for (const r of REGIOES) {
      const descoberta = desc.regioes.includes(r.id);
      ctx.beginPath();
      ctx.arc(px(r.cx), pz(r.cz), (r.raio / (2 * EXT)) * T, 0, Math.PI * 2);
      ctx.fillStyle = descoberta ? r.cor + "26" : "rgba(4,8,6,0.62)";
      ctx.fill();
      ctx.strokeStyle = descoberta ? r.cor : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = descoberta ? "#ffffff" : "rgba(255,255,255,0.4)";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(descoberta ? r.nome : "???", px(r.cx), pz(r.cz) - 4);
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = descoberta ? r.cor : "rgba(255,255,255,0.3)";
      ctx.fillText(`Nv ${r.nivel}`, px(r.cx), pz(r.cz) + 12);
    }
    // POIs (◆ baús)
    for (const p of POIS) {
      const descoberto = desc.pois.includes(p.id);
      ctx.save();
      ctx.translate(px(p.x), pz(p.z));
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = descoberto ? "#fbbf24" : "rgba(255,255,255,0.25)";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
      if (descoberto) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(p.nome, px(p.x), pz(p.z) - 9);
      }
    }
    // objetivo atual (★)
    const obj = rpgRef.current?.objetivo;
    if (obj && Number.isFinite(obj.x)) {
      ctx.fillStyle = "#f472b6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("★", px(obj.x), pz(obj.z) + 7);
    }
    // jogador (seta branca; frente = −z a yaw 0 → rotação −yaw)
    const m = motorRef.current;
    ctx.save();
    ctx.translate(px(m.px), pz(m.pz));
    ctx.rotate(-m.yaw);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // Norte
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("N", T - 20, 22);
  }, []);
  useEffect(() => { desenharMapaRef.current = desenharMapa; }, [desenharMapa]);

  // ── Como jogar — usado no modal (a jogar) e no menu inicial ──
  const renderAjuda = () => (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-white/80 text-xs font-bold mb-1 flex items-center gap-1"><Trophy size={13} /> O OBJETIVO DA LENDA</p>
        <p className="text-white/60 text-[11px] leading-relaxed">Explora 6 regiões (Nv 1–5) e 8 locais, abre os 9 baús de tesouro, vive 6 capítulos de história e derrota o GUARDIÃO nas Ruínas de Kivulivuli. Cada baú rende créditos para a plataforma; cada caçada, noite sobrevivida e capítulo rende XP até ao nível 30.</p>
      </div>
      <div>
        <p className="text-white/80 text-xs font-bold mb-1">CONTROLOS — COMPUTADOR</p>
        <ul className="text-white/60 text-[11px] grid grid-cols-2 gap-x-2 gap-y-0.5">
          <li>WASD — mover</li>
          <li>Espaço — saltar</li>
          <li>Shift — correr</li>
          <li>Z — zoom</li>
          <li>Rato — olhar</li>
          <li>Clique esq. — minerar/atacar</li>
          <li>Clique dir. — comer</li>
          <li>1–9 / roda — hotbar</li>
          <li>J — missões</li>
          <li>K — habilidades</li>
          <li>M — mapa do mundo</li>
          <li>ESC — pausa</li>
          <li>F5 — câmara</li>
        </ul>
      </div>
      <div>
        <p className="text-white/80 text-xs font-bold mb-1">CONTROLOS — TELEMÓVEL</p>
        <ul className="text-white/60 text-[11px] list-disc ml-4">
          <li>Joystick (canto inferior esquerdo) para andar; arrasta o ecrã para olhar</li>
          <li>Botões ATACAR · SALTAR · COMER; toca nos itens da hotbar</li>
          <li>Botões MISSÕES · DIÁRIO · MAPA · HAB. · pausa no topo do HUD</li>
        </ul>
      </div>
      <div>
        <p className="text-white/80 text-xs font-bold mb-1">COMO SE PROGRESSA</p>
        <ul className="text-white/60 text-[11px] list-disc ml-4">
          <li>XP vem de caçadas, noites sobrevividas, baús, capítulos e diárias (3 por dia, iguais para todos)</li>
          <li>Cada nível dá 1 ponto: GUERREIRO (+dano) · EXPLORADOR (+velocidade) · SÁBIO (+XP e cura fora de combate)</li>
          <li>A dificuldade (escolhida no menu) muda a vida e o dano dos inimigos e o valor das recompensas</li>
          <li>O progresso guarda-se sozinho a cada 8 s neste aparelho (IndexedDB + localStorage)</li>
          <li>Morrer não apaga a lenda: renasces na Aldeia com XP, missões e descobertas</li>
        </ul>
      </div>
      <div className="border-t border-white/10 pt-2">
        <p className="text-white/50 text-[10px] leading-relaxed" data-testid="rpg-ajuda-fontes">
          Fontes: clima real por {OPENMETEO_ATTRIBUTION} · arquitetura de mundo aberto estudada de Veloren (GPLv3) — só a forma do skillset e a separação mundo/estado inspiraram o código, que é próprio · motor voxel partilhado com a CIDADE BATEU.
        </p>
      </div>
    </div>
  );

  // ══════════════════════ RENDER ══════════════════════
  return (
    <div className="fixed inset-0 z-50 bg-[#101c14] select-none" data-testid="rpg-root">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onClick={capturarRato}
        onTouchStart={aoTocarTela}
        onTouchEnd={aoLargarTela}
        onTouchMove={aoTocarTela}
      />
      {flashDano > 0 && (
        <div key={flashDano} className="absolute inset-0 pointer-events-none bg-red-600/25 animate-pulse" style={{ animationDuration: "0.4s" }} />
      )}

      {/* ═══ MENU ═══ */}
      {fase === "inicio" && !aCarregar && (
        <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[#0c1710] via-[#12251a] to-[#0a120d] flex flex-col items-center justify-center py-8 px-4">
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <div className="text-center">
              <h1 className="font-display text-3xl font-black text-amber-300 tracking-wide" data-testid="rpg-titulo">BATEU RPG: LENDAS</h1>
              <p className="text-white/60 text-sm mt-1">Explora 6 regiões, derrota as criaturas da noite e escreve a tua lenda.</p>
              <p className="text-white/35 text-[11px] mt-1">Mundo voxel único (semente fixa) · progresso guardado neste aparelho</p>
            </div>

            {/* dificuldade */}
            <div className="w-full bg-black/40 rounded-2xl p-3 border border-white/10">
              <p className="text-white/80 text-xs font-bold mb-2 flex items-center gap-1"><ShieldAlert size={13} /> DIFICULDADE (afeta inimigos e recompensas)</p>
              <div className="grid grid-cols-3 gap-2">
                {ORDEM_DIFICULDADE.map((d) => {
                  const regras = DIFICULDADES_RPG[d];
                  const ativo = difMenu === d;
                  return (
                    <button key={d} onClick={() => setDifMenu(d)} data-testid={`rpg-dif-${d}`}
                      className={`p-2 rounded-xl text-left transition border ${ativo ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                      <p className={`text-[11px] font-black ${ativo ? "text-amber-300" : "text-white/70"}`}>{regras.nome}</p>
                      <p className="text-[9px] text-white/50 leading-tight mt-0.5">Inimigos ×{regras.multHpMob} · XP ×{regras.multXP}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/45 text-[10px] mt-2" data-testid="rpg-dif-desc">{DIFICULDADES_RPG[difMenu].desc}</p>
            </div>

            {/* jogar */}
            <div className="w-full flex flex-col gap-2">
              <button onClick={() => iniciar(false)} data-testid="rpg-jogar"
                className="w-full py-3.5 rounded-xl font-black text-white bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 active:scale-95 transition flex items-center justify-center gap-2">
                <Play size={18} /> NOVA LENDA
              </button>
              {savePronto && temSave && (
                <button onClick={() => iniciar(true)} data-testid="rpg-continuar"
                  className="w-full py-3 rounded-xl font-bold text-white bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 transition flex items-center justify-center gap-2">
                  <ChevronUp size={17} className="rotate-90" /> CONTINUAR A LENDA
                </button>
              )}
            </div>
            <button onClick={() => setAjudaMenu(true)} data-testid="rpg-como-jogar"
              className="w-full py-2 rounded-xl font-bold text-white/80 bg-white/10 hover:bg-white/15 transition text-xs flex items-center justify-center gap-1">
              <HelpCircle size={14} /> COMO JOGAR
            </button>
            {savePronto && temSave && (
              confRecomecar ? (
                <div className="w-full flex gap-2" data-testid="rpg-recomecar-confirm">
                  <button onClick={() => { void s.apagarSave().then(() => { setTemSave(false); setConfRecomecar(false); }); }}
                    className="flex-1 py-2 rounded-xl font-black text-white bg-rose-700 hover:bg-rose-600 transition text-[11px]">APAGAR E RECOMEÇAR</button>
                  <button onClick={() => setConfRecomecar(false)}
                    className="flex-1 py-2 rounded-xl font-bold text-white/70 bg-white/10 hover:bg-white/15 transition text-[11px]">manter o save</button>
                </div>
              ) : (
                <button onClick={() => setConfRecomecar(true)} data-testid="rpg-recomecar"
                  className="text-white/35 underline text-[11px]">recomeçar do zero (apaga o save)</button>
              )
            )}

            {/* clima real */}
            <div className="w-full bg-black/40 rounded-2xl p-3 border border-white/10">
              <p className="text-white/80 text-xs font-bold mb-2 flex items-center gap-1"><Sun size={13} /> CLIMA REAL (opcional)</p>
              {climaReal.ativa && climaReal.cidade ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-xs font-bold truncate" data-testid="rpg-clima-cidade">{climaReal.cidade.nome}</p>
                    <p className="text-white/55 text-[10px]" data-testid="rpg-clima-info">
                      {climaReal.clima
                        ? `${wmoDescricaoPt(climaReal.clima.codigoWmo)}${climaReal.clima.temperatura !== null ? ` · ${climaReal.clima.temperatura}°C` : ""}${wmoEhNeve(climaReal.clima.codigoWmo) ? " · neve" : ""}`
                        : "a obter o clima…"}
                    </p>
                  </div>
                  <button onClick={desativarClimaReal} className="text-white/50 underline text-[11px] shrink-0" data-testid="rpg-clima-desativar">desativar</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={buscaCidade} onChange={(e) => setBuscaCidade(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") procurar(); }}
                    placeholder="A tua cidade (ex.: Maputo)" data-testid="rpg-clima-input"
                    className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none placeholder:text-white/30" />
                  <button onClick={procurar} disabled={buscando} data-testid="rpg-clima-ativar"
                    className="px-3 py-2 rounded-lg bg-sky-700/80 text-white text-xs font-bold disabled:opacity-50">{buscando ? "…" : "aplicar"}</button>
                </div>
              )}
              {climaReal.erro && <p className="text-rose-300 text-[10px] mt-1" data-testid="rpg-clima-erro">{climaReal.erro}</p>}
              <p className="text-white/30 text-[9px] mt-1">{OPENMETEO_ATTRIBUTION}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full">
              <button onClick={() => { setSomMudo(m.alternarSom()); }} className="py-2.5 rounded-xl font-bold text-white bg-slate-700/80 hover:bg-slate-600 text-xs">
                {somMudo ? "SOM: DESLIGADO" : "SOM: LIGADO"}
              </button>
              <button onClick={() => { const c = m.ciclarCamara(); setCamaraModo(c); }} className="py-2.5 rounded-xl font-bold text-white bg-slate-700/80 hover:bg-slate-600 text-xs flex items-center justify-center gap-1">
                <Camera size={14} /> {camaraModo === "primeira" ? "1ª PESSOA" : camaraModo === "terceira" ? "3ª PESSOA" : "OMBRO"}
              </button>
            </div>
            <p className="text-white/25 text-[9px] text-center leading-relaxed max-w-xs" data-testid="rpg-atribuicao">
              v42 · clima real por Open-Meteo.com · arquitetura aberta estudada de Veloren (GPLv3 — só a forma, código próprio) · motor voxel partilhado com a CIDADE BATEU
            </p>
            <button onClick={sair} className="text-white/60 underline text-sm">Voltar à plataforma</button>
            <p className="text-white/35 text-[11px] text-center max-w-xs">Joga sem registo · o progresso (XP, missões, descobertas) fica neste aparelho — sobrevive a limpezas do localStorage via IndexedDB</p>
            <p className="text-white/30 text-[10px] text-center" data-testid="rpg-espaco">
              {espacoEst === "pendente" ? "" : espacoEst
                ? `Armazenamento: ${mbLegivel(espacoEst.uso)} MB usados de ${mbLegivel(espacoEst.quota)} MB`
                : "Armazenamento: quota não revelada pelo navegador"}
            </p>
          </div>
        </div>
      )}

      {/* ═══ AJUDA no menu inicial ═══ */}
      {fase === "inicio" && ajudaMenu && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4" onClick={() => setAjudaMenu(false)}>
          <div className="bg-[#15221a] rounded-2xl border border-white/15 max-w-lg w-full max-h-[85vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()} data-testid="rpg-ajuda-menu">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-black text-lg flex items-center gap-2"><HelpCircle size={18} className="text-sky-300" /> COMO JOGAR</h2>
              <button onClick={() => setAjudaMenu(false)} data-testid="rpg-fechar-ajuda-menu" className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            {renderAjuda()}
          </div>
        </div>
      )}

      {aCarregar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#101c14]" data-testid="rpg-carregar">
          <div className="flex gap-1">{["#f59e0b", "#22c55e", "#a78bfa", "#fb923c"].map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-[3px] border border-black/50 animate-bounce" style={{ background: c, animationDelay: `${i * 0.12}s` }} />
          ))}</div>
          <p className="text-white font-bold">A forjar a lenda…</p>
        </div>
      )}

      {/* ═══ HUD ═══ */}
      {fase !== "inicio" && cap && rpg && (
        <>
          {/* ── topo esquerda: vida, fome, posição ── */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-3"><Coracoes vida={cap.vida} /><Fome fome={cap.fome} /></div>
            {cap.ar < 10 && (
              <div className="flex gap-[2px]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/60" style={{ background: cap.ar > i ? "#5ab0f0" : "rgba(0,0,0,0.5)" }} />
                ))}
              </div>
            )}
            <div className="bg-black/45 rounded-lg px-2 py-1 flex items-center gap-2">
              <span className="text-amber-300 font-black text-xs" data-testid="rpg-nivel">Nv {rpg.nivel}</span>
              <div className="w-24 h-2 rounded-full bg-black/60 overflow-hidden" data-testid="rpg-xpbar">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${rpg.xpFalta > 0 ? Math.min(100, (rpg.xpAtual / (rpg.xpAtual + rpg.xpFalta)) * 100) : 100}%` }} />
              </div>
              {rpg.pontos > 0 && (
                <span className="bg-violet-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 animate-pulse" data-testid="rpg-pontos">{rpg.pontos} pts</span>
              )}
            </div>
            <div className="text-[10px] text-white/85 font-mono bg-black/35 rounded px-1.5 py-0.5 w-fit">
              {cap.pos.map((v) => v.toFixed(0)).join(", ")} · {cap.fps} fps
            </div>
          </div>

          {/* ── topo direita: região, relógio, clima, créditos ── */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
            {rpg.regiao && (
              <div className="bg-black/45 rounded-lg px-2 py-1 border-l-2" style={{ borderColor: rpg.regiao.cor }} data-testid="rpg-regiao">
                <p className="text-white text-[11px] font-bold leading-none">{rpg.regiao.nome}</p>
                <p className="text-white/50 text-[9px] mt-0.5">nível recomendado {rpg.regiao.nivel}</p>
              </div>
            )}
            <div className="bg-black/45 rounded-lg px-2 py-1 flex items-center gap-1.5">
              {cap.noite ? <Moon size={11} className="text-indigo-300" /> : <MeteoIcone size={11} className="text-amber-200" />}
              <span className="text-white text-[11px] font-bold">Dia {cap.dia} · {relogio(cap.horaFrac)}</span>
            </div>
            <div className="bg-black/45 rounded-lg px-2 py-1 flex items-center gap-1" data-testid="rpg-creditos">
              <Trophy size={11} className="text-amber-300" />
              <span className="text-white text-[11px] font-bold">{rpg.creditos} créditos</span>
            </div>
            {/* bússola do objetivo */}
            {rpg.objetivo && !Number.isNaN(rpg.objetivo.x) && (
              <div className="bg-black/45 rounded-lg px-2 py-1 flex items-center gap-2" data-testid="rpg-bussola">
                <Compass size={12} className="text-emerald-300" />
                <div className="w-6 h-6 relative">
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: `rotate(${((Math.atan2(-(rpg.objetivo.x - cap.pos[0]), -(rpg.objetivo.z - cap.pos[1]))) - m.yaw) * 180 / Math.PI}deg)` }}>
                    <ChevronUp size={16} className="text-emerald-300" strokeWidth={3} />
                  </div>
                </div>
                <span className="text-white/80 text-[9px] max-w-[110px] truncate">{rpg.objetivo.texto}</span>
              </div>
            )}
          </div>

          {/* ── tracker da missão atual (baixo esquerda) ── */}
          {rpg.capitulo && !rpg.historiaFeita && (
            <div className="absolute bottom-2 left-2 bg-black/50 rounded-xl px-3 py-2 max-w-[240px] pointer-events-none" data-testid="rpg-missao-tracker">
              <p className="text-fuchsia-300 text-[9px] font-black tracking-wider">CAPÍTULO {rpg.capitulo.id.replace("h", "")}</p>
              <p className="text-white text-xs font-bold">{rpg.capitulo.titulo}</p>
              {rpg.capitulo.objetivos.map((o, i) => (
                <p key={i} className={`text-[10px] mt-0.5 ${o.prog >= o.qtd ? "text-emerald-300 line-through" : "text-white/70"}`}>
                  {o.prog >= o.qtd ? "✓" : "○"} {o.texto} ({o.prog}/{o.qtd})
                </p>
              ))}
            </div>
          )}

          {/* ── boss bar ── */}
          {rpg.boss.vivo && rpg.boss.hp !== undefined && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-72 pointer-events-none" data-testid="rpg-bossbar">
              <p className="text-center text-rose-300 text-xs font-black tracking-widest">GUARDIÃO DAS RUÍNAS</p>
              <div className="h-3 rounded-full bg-black/70 border border-rose-900 overflow-hidden mt-0.5">
                <div className="h-full bg-gradient-to-r from-rose-700 to-red-500" style={{ width: `${Math.max(0, (rpg.boss.hp / Math.max(1, rpg.boss.hpMax ?? 1)) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* ── avisos RPG (centro topo) ── */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            {rpg.avisos.slice(-4).map((a, i) => (
              <div key={`${i}-${a.texto}`} className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${COR_AVISO[a.tipo] ?? COR_AVISO.info} text-white text-xs font-bold shadow-lg max-w-[320px] text-center`}>
                {a.texto}
              </div>
            ))}
          </div>

          {/* ── hotbar + botões ── */}
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-2">
            <div className="flex gap-1 bg-black/45 rounded-lg p-1.5" data-testid="rpg-hotbar">
              {cap.slots.slice(0, 9).map((slot, i) => (
                <button key={i} onClick={() => { m.inv.selecao = i; }} data-testid={`rpg-slot-${i}`}
                  className={`w-9 h-9 rounded-[4px] border-2 flex items-center justify-center ${cap.selecao === i ? "border-white bg-white/20" : "border-white/20 bg-black/30"}`}>
                  {slot && <IconeItem id={slot.id} qtd={slot.qtd} tamanho={30} />}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setModal("missoes")} data-testid="rpg-btn-missoes"
                className="px-2.5 py-2 rounded-lg bg-black/55 text-white text-[10px] font-bold flex items-center gap-1"><BookOpen size={13} /> MISSÕES</button>
              <button onClick={() => setModal("diario")} data-testid="rpg-btn-diario"
                className="px-2.5 py-2 rounded-lg bg-black/55 text-white text-[10px] font-bold flex items-center gap-1"><MapIcon size={13} /> DIÁRIO</button>
              <button onClick={() => setModal("mapa")} data-testid="rpg-btn-mapa"
                className="px-2.5 py-2 rounded-lg bg-black/55 text-white text-[10px] font-bold flex items-center gap-1"><Compass size={13} /> MAPA</button>
              <button onClick={() => setModal("habilidades")} data-testid="rpg-btn-habilidades"
                className="px-2.5 py-2 rounded-lg bg-black/55 text-white text-[10px] font-bold flex items-center gap-1"><Sparkles size={13} /> HAB.</button>
              <button onClick={() => { m.pausado = true; setModal("pausa"); }} data-testid="rpg-btn-pausa"
                className="px-2.5 py-2 rounded-lg bg-black/55 text-white"><Pause size={13} /></button>
            </div>
          </div>

          {/* ── nome do item visado ── */}
          {cap.mirando && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/60 rounded-lg px-3 py-1 pointer-events-none">
              <p className="text-white/90 text-xs font-bold">{cap.mirando.nome}</p>
            </div>
          )}

          {/* ── controles móveis ── */}
          {ehToque && (
            <>
              <div ref={joystickRef} onTouchStart={aoMoverJoy} onTouchMove={aoMoverJoy} onTouchEnd={aoLargarJoy} data-testid="rpg-joystick"
                className="absolute bottom-20 left-4 w-32 h-32 rounded-full bg-black/30 border border-white/20 pointer-events-auto">
                <div className="absolute w-12 h-12 rounded-full bg-white/30 border border-white/40 pointer-events-none"
                  style={{ left: `calc(50% + ${(joy?.x ?? 0) * 32}px - 24px)`, top: `calc(50% + ${(joy?.y ?? 0) * 32}px - 24px)` }} />
              </div>
              <div className="absolute bottom-24 right-4 flex flex-col gap-2 items-center">
                <button onTouchStart={() => { m.atacarPedido = true; }} data-testid="rpg-btn-atacar"
                  className="w-16 h-16 rounded-full bg-rose-600/80 border-2 border-white/30 text-white font-black text-xs flex items-center justify-center">ATACAR</button>
                <button onTouchStart={() => { m.entrada.salto = true; }} onTouchEnd={() => { m.entrada.salto = false; }}
                  className="w-14 h-14 rounded-full bg-sky-600/70 border-2 border-white/30 text-white font-black text-[10px]">SALTAR</button>
                <button onTouchStart={() => { m.comerPedido = true; }} data-testid="rpg-btn-comer"
                  className="w-12 h-12 rounded-full bg-amber-600/70 border-2 border-white/30 text-white font-black text-[10px]">COMER</button>
              </div>
            </>
          )}

          {/* ═══ MODAIS ═══ */}
          {modal && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4" onClick={() => { if (modal !== "pausa") { setModal(null); m.pausado = false; } }}>
              <div className="bg-[#15221a] rounded-2xl border border-white/15 max-w-lg w-full max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()} data-testid="rpg-modal">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-black text-lg flex items-center gap-2">
                    {modal === "missoes" && <><BookOpen size={18} className="text-fuchsia-400" /> MISSÕES</>}
                    {modal === "diario" && <><MapIcon size={18} className="text-emerald-400" /> DIÁRIO DE EXPLORAÇÃO</>}
                    {modal === "habilidades" && <><Sparkles size={18} className="text-violet-400" /> HABILIDADES</>}
                    {modal === "mapa" && <><MapIcon size={18} className="text-amber-300" /> MAPA DO MUNDO</>}
                    {modal === "ajuda" && <><HelpCircle size={18} className="text-sky-300" /> COMO JOGAR</>}
                    {modal === "pausa" && <><Pause size={18} className="text-white" /> PAUSA</>}
                  </h2>
                  <button onClick={() => { setModal(null); m.pausado = false; }} data-testid="rpg-fechar-modal" className="text-white/60 hover:text-white"><X size={20} /></button>
                </div>

                {/* MISSÕES */}
                {modal === "missoes" && (
                  <div className="flex flex-col gap-3">
                    {rpg.capitulo && (
                      <div className="bg-fuchsia-900/30 rounded-xl p-3 border border-fuchsia-500/30" data-testid="rpg-capitulo">
                        <p className="text-fuchsia-300 text-[9px] font-black tracking-wider">HISTÓRIA · CAPÍTULO {rpg.capitulo.id.replace("h", "")} DE {HISTORIA_TOTAL}</p>
                        <p className="text-white font-black">{rpg.capitulo.titulo}</p>
                        {rpg.capitulo.objetivos.map((o, i) => (
                          <div key={i} className="mt-1.5">
                            <div className="flex justify-between text-[11px]">
                              <span className={o.prog >= o.qtd ? "text-emerald-300 line-through" : "text-white/80"}>{o.texto}</span>
                              <span className="text-white/50 font-mono">{o.prog}/{o.qtd}</span>
                            </div>
                            <div className="h-1 rounded-full bg-black/50 mt-0.5 overflow-hidden">
                              <div className="h-full bg-fuchsia-400" style={{ width: `${(o.prog / o.qtd) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                        <p className="text-white/45 text-[10px] mt-2">Recompensa: +{HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.xp ?? "—"} XP · +{HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.creditos ?? "—"} créditos</p>
                      </div>
                    )}
                    {rpg.historiaFeita && (
                      <div className="bg-amber-900/30 rounded-xl p-3 border border-amber-500/40">
                        <p className="text-amber-300 font-black text-sm">A lenda está escrita.</p>
                        <p className="text-white/60 text-[11px] mt-0.5">Os 6 capítulos da história estão concluídos. As Terras Selvagens continuam tuas — caça, explora, vive.</p>
                      </div>
                    )}
                    <p className="text-white/70 text-[11px] font-bold flex items-center gap-1"><Sun size={12} /> DIÁRIAS DE HOJE (renovam à meia-noite)</p>
                    {rpg.diarias.map((d) => (
                      <div key={d.id} className={`rounded-xl p-2.5 border ${d.feita ? "bg-emerald-900/25 border-emerald-500/30" : "bg-black/30 border-white/10"}`} data-testid={`rpg-diaria-${d.id.split(":")[2]}`}>
                        <div className="flex justify-between items-center">
                          <p className={`text-xs font-bold ${d.feita ? "text-emerald-300 line-through" : "text-white"}`}>{d.titulo}</p>
                          <span className="text-white/45 text-[10px] font-mono">{d.feita ? "✓" : `${d.prog}/${d.qtd}`}</span>
                        </div>
                        <p className="text-white/60 text-[10px]">{d.texto}</p>
                        <p className="text-white/40 text-[9px] mt-0.5">+{d.xp} XP · +{d.creditos} créditos</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* DIÁRIO */}
                {modal === "diario" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-white/70 text-[11px]">Regiões: <b className="text-white" data-testid="rpg-regioes-cont">{rpg.descobertas.regioes}/{rpg.totalRegioes}</b> · Locais: <b className="text-white">{rpg.descobertas.pois}/{rpg.totalPois}</b> · Baús: <b className="text-white">{rpg.descobertas.baus}/{rpg.totalBaus}</b></p>
                    {REGIOES.map((r) => {
                      const descoberta = s.perfil.descobertas.regioes.includes(r.id);
                      return (
                        <div key={r.id} className={`rounded-xl p-2.5 border ${descoberta ? "bg-black/30 border-white/10" : "bg-black/50 border-white/5"}`} data-testid={`rpg-regiao-${r.id}`}>
                          <div className="flex justify-between items-center">
                            <p className={`text-xs font-black ${descoberta ? "text-white" : "text-white/35"}`}>{descoberta ? r.nome : "???"}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${r.cor}33`, color: descoberta ? r.cor : "#666" }}>Nv {r.nivel}</span>
                          </div>
                          {descoberta && <p className="text-white/55 text-[10px] mt-0.5">{r.desc}</p>}
                        </div>
                      );
                    })}
                    <p className="text-white/70 text-[11px] font-bold mt-1">LOCAIS</p>
                    {POIS.map((p) => {
                      const descoberto = s.perfil.descobertas.pois.includes(p.id);
                      return (
                        <div key={p.id} className="rounded-xl p-2 border border-white/5 bg-black/20" data-testid={`rpg-poi-${p.id}`}>
                          <div className="flex justify-between items-center">
                            <p className={`text-[11px] font-bold ${descoberto ? "text-white" : "text-white/35"}`}>{descoberto ? p.nome : "???"}</p>
                            <span className="text-white/35 text-[9px] font-mono">{descoberto ? `${p.x}, ${p.z}` : "—"}</span>
                          </div>
                          {descoberto && <p className="text-white/50 text-[10px] mt-0.5">{p.desc}</p>}
                        </div>
                      );
                    })}
                    <div className="grid grid-cols-4 gap-2 text-center mt-1">
                      {[["Hostis", rpg.kills.hostil], ["Mortes", rpg.mortes], ["Blocos", rpg.blocos], ["Nível", rpg.nivel]].map(([k, v]) => (
                        <div key={String(k)} className="bg-black/30 rounded-lg py-2">
                          <p className="text-white font-black text-sm">{String(v)}</p>
                          <p className="text-white/45 text-[9px]">{String(k)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HABILIDADES */}
                {modal === "habilidades" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-white/70 text-[11px]" data-testid="rpg-pontos-modal">
                      Pontos disponíveis: <b className="text-violet-300 font-black">{rpg.pontos}</b> · cada nível ganho dá 1 ponto (máx. {NIVEL_MAX} níveis)
                    </p>
                    {RAMOS_RPG.map((r) => {
                      const nivel = rpg.skills[r];
                      const max = nivel >= NIVEL_MAX_RAMO_RPG;
                      return (
                        <div key={r} className="bg-black/30 rounded-xl p-3 border border-white/10" data-testid={`rpg-ramo-${r}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-black text-sm">{NOMES_RAMO[r]} <span className="text-white/50 font-bold">· nível {nivel}/{NIVEL_MAX_RAMO_RPG}</span></p>
                            <button onClick={() => { if (s.gastarPonto(r)) setRpg(s.captura()); }} data-testid={`rpg-aprender-${r}`}
                              disabled={rpg.pontos < 1 || max}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${max ? "bg-white/10 text-white/40" : rpg.pontos >= 1 ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-white/10 text-white/40"}`}>
                              {max ? "MÁXIMO" : "APRENDER (1 pt)"}
                            </button>
                          </div>
                          <ul className="mt-1.5 flex flex-col gap-0.5">
                            {EFEITO_RAMO[r].map((e, i) => (
                              <li key={i} className="text-[10px] text-white/60 flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${i < nivel ? "bg-emerald-400" : "bg-white/20"}`} /> {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    <p className="text-white/35 text-[10px]">Curva de XP com a forma logística estudada do skillset do Veloren (v38) — fórmula própria, zero código GPL.</p>
                  </div>
                )}

                {/* MAPA DO MUNDO */}
                {modal === "mapa" && (
                  <div className="flex flex-col gap-2" data-testid="rpg-mapa">
                    <canvas ref={mapaCanvasRef} className="w-full rounded-xl border border-white/10" data-testid="rpg-mapa-canvas" />
                    <div className="grid grid-cols-2 gap-1.5">
                      {REGIOES.map((r) => {
                        const descoberta = sistemaRef.current.perfil.descobertas.regioes.includes(r.id);
                        return (
                          <div key={r.id} className="flex items-center gap-1.5 text-[10px]" data-testid={`rpg-mapa-regiao-${r.id}`}>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: descoberta ? r.cor : "rgba(255,255,255,0.2)" }} />
                            <span className={descoberta ? "text-white/80" : "text-white/35"}>{descoberta ? r.nome : "???"}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-white/45 text-[10px]">
                      ★ objetivo atual · ◆ locais com baú · seta branca = tu. Descobertas: {rpg.descobertas.regioes}/{rpg.totalRegioes} regiões · {rpg.descobertas.pois}/{rpg.totalPois} locais · {rpg.descobertas.baus}/{rpg.totalBaus} baús
                    </p>
                    <p className="text-white/30 text-[9px]" data-testid="rpg-mapa-fonte">
                      Terreno real amostrado do mundo (semente fixa — água, costa, serra e miombo são os mesmos dados que geram os blocos) · regiões não descobertas ficam cobertas até lá chegares.
                    </p>
                  </div>
                )}

                {/* AJUDA */}
                {modal === "ajuda" && renderAjuda()}

                {/* PAUSA */}
                {modal === "pausa" && (
                  <div className="flex flex-col gap-2.5">
                    <button onClick={() => { setModal(null); m.pausado = false; capturarRato(); }} data-testid="rpg-retomar"
                      className="w-full py-3 rounded-xl font-black text-white bg-emerald-700 hover:bg-emerald-600">RETOMAR</button>
                    <div className="bg-black/30 rounded-xl p-2.5 text-[10px] text-white/60 grid grid-cols-2 gap-y-0.5" data-testid="rpg-pausa-info">
                      <span>Dificuldade: <b className="text-white" data-testid="rpg-pausa-dif">{rpg.dificuldade.nome}</b></span>
                      <span>Nível: <b className="text-white">{rpg.nivel}/{NIVEL_MAX}</b></span>
                      <span>Créditos: <b className="text-white">{rpg.creditos}</b></span>
                      <span>Mortes: <b className="text-white">{rpg.mortes}</b></span>
                      <span>Descobertas: <b className="text-white">{rpg.descobertas.regioes}/{rpg.totalRegioes} · {rpg.descobertas.pois}/{rpg.totalPois}</b></span>
                      <span>História: <b className="text-white">{rpg.historiaFeita ? "completa" : `capítulo ${rpg.capitulo?.id.replace("h", "")}/6`}</b></span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setModal("mapa")} data-testid="rpg-pausa-mapa"
                        className="py-2.5 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center gap-1"><MapIcon size={14} /> MAPA</button>
                      <button onClick={() => setModal("ajuda")} data-testid="rpg-pausa-ajuda"
                        className="py-2.5 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center gap-1"><HelpCircle size={14} /> AJUDA</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setSomMudo(m.alternarSom()); }} className="py-2.5 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-600 text-xs">
                        {somMudo ? "SOM: DESLIGADO" : "SOM: LIGADO"}
                      </button>
                      <button onClick={() => { const c = m.ciclarCamara(); setCamaraModo(c); }} className="py-2.5 rounded-xl font-bold text-white bg-slate-700 hover:bg-slate-600 text-xs flex items-center justify-center gap-1">
                        <Camera size={14} /> CÂMARA
                      </button>
                    </div>
                    <button onClick={() => { void s.guardar(); setModal("pausa"); }} data-testid="rpg-guardar"
                      className="w-full py-2.5 rounded-xl font-bold text-white bg-sky-800 hover:bg-sky-700 text-xs">GUARDAR AGORA</button>
                    <button onClick={sair} data-testid="rpg-sair"
                      className="w-full py-2.5 rounded-xl font-bold text-white bg-rose-800/80 hover:bg-rose-700 text-xs">SAIR PARA A PLATAFORMA</button>
                    <p className="text-white/40 text-[10px] text-center">O progresso guarda-se automaticamente a cada 8 segundos.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ MORTE ═══ */}
      {fase === "morto" && cap && (
        <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center gap-4 p-4" data-testid="rpg-morte">
          <Skull size={44} className="text-rose-400" />
          <h2 className="text-rose-200 font-display text-3xl font-black">A lenda pausou-se…</h2>
          <p className="text-white/70 text-sm text-center max-w-sm">
            {cap.causaMorte || "O mundo da lenda é duro"} · {rpg?.mortes ?? 0}ª morte<br />
            <span className="text-white/45 text-[11px]">O XP, as missões e as descobertas ficam — renasces na Aldeia Inicial.</span>
          </p>
          <button onClick={renascer} data-testid="rpg-renascer"
            className="px-6 py-3 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-500 active:scale-95 transition flex items-center gap-2">
            <Swords size={17} /> RENASCER NA ALDEIA
          </button>
          <button onClick={sair} className="text-white/60 underline text-sm">Sair da lenda</button>
        </div>
      )}
    </div>
  );
}

// recompensas da história (só para mostrar no painel — a verdade vive no core.ts)
const HISTORIA_TOTAL = 6;
const HISTORIA_RECOMPENSAS: Record<string, { xp: number; creditos: number }> = {
  h1: { xp: 60, creditos: 10 },
  h2: { xp: 110, creditos: 15 },
  h3: { xp: 160, creditos: 20 },
  h4: { xp: 200, creditos: 25 },
  h5: { xp: 260, creditos: 30 },
  h6: { xp: 420, creditos: 60 },
};
