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
  Camera, Info, Sparkles, MapPin, Thermometer, ArrowUp, RotateCw, Radio, Store, Globe,
  MessageCircle, Send, BookOpen, Compass, Footprints, Brain, Gauge,
} from "lucide-react";
import * as THREE from "three";
import { Motor, CAMARA_NOMES, METEO_NOMES, type CamaraModo, type Captura } from "@/game/blocos/engine";
import {
  MundoCidade, DISTRITOS, portalPerto, SEED_CIDADE, pacificarGestor, posDistrito,
  POS_CASA, POS_TROFEUS, POS_QUIOSQUE, ALTURA_PLATEAU, SPAWN_PRACA, type Distrito,
} from "@/game/cidade/cidade";
import { estadoMissao, missoesDeHoje, registarVisita, progressoMissao, creditosCidade, estadoCadeia, registarQuiz, registarNoitePraca, descobrirMarco, creditoMissaoAtual, restaurarProgressoCidadeDeIDB } from "@/game/cidade/missoes";
// v38 — progressão, exploração e ambiente (padrões do estudo Veloren)
import {
  lerPerfil, guardarPerfil, ganharXP, gastarPonto, nivelDeXP, xpNoNivel,
  DIFICULDADES, RAMOS, NIVEL_MAX_RAMO, escalaVelocidade, bonusQuizCreditos, bonusCreditoMissao,
  type Perfil, type Ramo, type Dificuldade,
} from "@/game/cidade/progressao";
import { MARCOS, marcoPerto, marcosPerto } from "@/game/cidade/marcos";
import { AmbienteSonoro } from "@/game/cidade/ambiente";
import {
  procurarCidade, getClimaAtual, wmoParaMeteo, OPENMETEO_ATTRIBUTION,
  type CidadeEncontrada, type ClimaAtual,
} from "@/lib/openMeteo";
import { fireConfetti } from "@/lib/celebrate";
import { getArAtual, rotuloAqi, AQI_ATTRIBUTION, type ArAtual } from "@/lib/airQuality";
import RadiosPALOP from "@/components/lives/RadiosPALOP";
import { CidadeMP, type EstadoMP, type FalaInfo } from "@/game/cidade/multijogador"; // v36/37 — presença partilhada + chat da praça
import QuizPraca from "@/components/cidade/QuizPraca";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

interface Rotulo { id: string; nome: string; cor: string; x: number; y: number; visivel: boolean; perto: boolean; rota: string; tipo: "distrito" | "casa" | "trofeus" | "quiosque" }
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
  const [portal, setPortal] = useState<{ nome: string; rota: string; tipo: "distrito" | "casa" | "trofeus" | "quiosque" } | null>(null);
  const [relogio, setRelogio] = useState("--:--");
  const [noite, setNoite] = useState(false);
  const [modal, setModal] = useState<"trofeus" | "quiosque" | "diario" | null>(null);
  const [tabQuiosque, setTabQuiosque] = useState<"radio" | "quiz">("radio");
  // v38 — Diário: 3 separadores (Progresso · Exploração · Dificuldade)
  const [tabDiario, setTabDiario] = useState<"progresso" | "exploracao" | "dificuldade">("progresso");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [missaoTick, setMissaoTick] = useState(0); // força re-render do painel de missões
  const [climaReal, setClimaReal] = useState<{ cidade?: CidadeEncontrada; clima?: ClimaAtual; erro?: string; ativa: boolean }>({ ativa: false });
  // v34 — qualidade do ar REAL (Open-Meteo Air Quality) para a mesma cidade
  const [ar, setAr] = useState<ArAtual | "erro" | null>(null);
  const arRef = useRef<ArAtual | "erro" | null>(null);
  useEffect(() => { arRef.current = ar; }, [ar]);
  const climaRef = useRef(climaReal);
  useEffect(() => { climaRef.current = climaReal; }, [climaReal]);
  const [creditos, setCreditos] = useState(creditosCidade());

  // ── v38 — progressão (perfil local honesto), exploração e ambiente ──
  const [perfilV, setPerfilV] = useState(0); // força re-render quando o perfil muda
  const ambienteRef = useRef<AmbienteSonoro | null>(null);
  const noiteAntesRef = useRef(false);
  const nivelVistoRef = useRef(1); // para celebrar subidas de nível
  const bump = useCallback(() => setPerfilV((k) => k + 1), []);
  void perfilV;
  // v39 — recuperação honesta: se o browser limpou o localStorage, o
  // progresso (perfil/missões/créditos) volta do espelho IndexedDB.
  const restauradoRef = useRef<{ perfil: boolean; missao: boolean; creditos: boolean } | null>(null);
  useEffect(() => {
    let vivo = true;
    restaurarProgressoCidadeDeIDB().then((r) => {
      if (!vivo) return;
      restauradoRef.current = r;
      if (r.perfil || r.missao || r.creditos) bump(); // refresca HUD com o progresso reposto
    });
    return () => { vivo = false; };
  }, [bump]);

  // ── v36 — presença partilhada (PoC N3, padrões Veloren do estudo v36):
  // só liga se houver URL (?mp=ws://… ou localStorage bateu_cidade_mp_url) —
  // sem servidor o jogo fica 100% local como sempre (honesto).
  const mpRef = useRef<CidadeMP | null>(null);
  const [mpEstado, setMpEstado] = useState<EstadoMP>("off");
  const [mpInfo, setMpInfo] = useState<string | null>(null);
  const [mpN, setMpN] = useState(0);
  // v37 — chat da praça + reconciliação honesta
  const [mpFalas, setMpFalas] = useState<FalaInfo[]>([]);
  const [chatTexto, setChatTexto] = useState("");
  const ultimaCorrecaoRef = useRef<{ x: number; z: number; em: number } | null>(null);

  const enviarFala = useCallback(() => {
    const texto = chatTexto.trim();
    if (!texto) return;
    const enviada = mpRef.current?.falar(texto) ?? false;
    if (enviada) setChatTexto("");
    else setAviso({ texto: t("cidade.mpChatLimitada"), k: Date.now() });
  }, [chatTexto, t]);

  useEffect(() => {
    const mp = new CidadeMP({
      alturaEm: (x, z) => {
        try { return motorRef.current.mundo?.alturaTerreno(x, z) ?? ALTURA_PLATEAU; }
        catch { return ALTURA_PLATEAU; }
      },
      onEstado: (e, info) => { setMpEstado(e); setMpInfo(info ?? null); if (e === "off") setMpFalas([]); },
      onAviso: (texto) => setAviso({ texto, k: Date.now() }),
      // v37 — chat da praça
      onFala: (f) => setMpFalas((p) => [...p.slice(-7), f]),
      // v37 — reconciliação: o servidor cortou um salto ilegal → ajusta com aviso honesto
      onCorrecao: (x, z) => {
        const m = motorRef.current;
        try {
          m.px = x; m.pz = z;
          m.py = (m.mundo?.alturaTerreno(x, z) ?? ALTURA_PLATEAU) + 1.02;
          m.vx = m.vy = m.vz = 0;
        } catch { /* mundo ainda não pronto */ }
        ultimaCorrecaoRef.current = { x, z, em: Date.now() };
        setAviso({ texto: t("cidade.mpCorrigido"), k: Date.now() });
      },
    });
    mpRef.current = mp;
    return () => { mp.desligar(); mpRef.current = null; };
  }, []);

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
        try {
          const arAg = await getArAtual(cidades[0].latitude, cidades[0].longitude);
          if (!vivo) return;
          setAr(arAg);
        } catch { if (vivo) setAr("erro"); }
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
    m.spawnFixo = [SPAWN_PRACA[0], ALTURA_PLATEAU + 1.02, SPAWN_PRACA[1]]; // praça (spawn do core.ts — igual ao servidor)
    m.iniciar(cv, "criativo", false);
    if (m.gestor) pacificarGestor(m.gestor, m.mundo); // cidade sempre pacífica
    m.yaw = Math.PI; // olha para norte (praça)
    // v38 — progressão aplica efeitos reais + ambiente sonoro (gesto = clique)
    const perfil = lerPerfil();
    m.escalaVel = escalaVelocidade(perfil);
    nivelVistoRef.current = nivelDeXP(perfil.xp);
    if (!ambienteRef.current) ambienteRef.current = new AmbienteSonoro();
    ambienteRef.current.ligar();
    setFase("jogando");
    m.redimensionar();
    // v36 — presença partilhada opt-in (nunca liga sem URL explícita)
    try {
      const urlMp = new URLSearchParams(window.location.search).get("mp") || localStorage.getItem("bateu_cidade_mp_url");
      if (urlMp && mpRef.current) {
        const nome = localStorage.getItem("bateu_cidade_nome") || `Viajante-${Math.floor(100 + Math.random() * 900)}`;
        mpRef.current.ligar(urlMp, nome);
      }
    } catch { /* sem MP — fica solo honesto */ }
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
      portalPerto: (x: number, z: number, r?: number) => portalPerto(x, z, r ?? DIFICULDADES[lerPerfil().dificuldade].raioPortal),
      clima: () => climaRef.current,
      ar: () => arRef.current,
      abrirQuiosque: () => setModal("quiosque"),
      // v36 — ganchos MP para E2E (nunca ligam sem URL explícita)
      mpEstado: () => mpRef.current?.estado ?? "off",
      mpRemotos: () => mpRef.current?.remotosInfo() ?? [],
      mpLigar: (url: string, nome?: string) => {
        const n = nome || localStorage.getItem("bateu_cidade_nome") || `Viajante-${Math.floor(100 + Math.random() * 900)}`;
        mpRef.current?.ligar(url, n);
      },
      // v37 — chat da praça + reconciliação (ganchos E2E)
      mpFalar: (texto: string) => mpRef.current?.falar(texto) ?? false,
      mpFalas: () => mpRef.current?.falasInfo() ?? [],
      ultimaCorrecao: () => ultimaCorrecaoRef.current,
      // v38 — envio MP determinístico (mesmo contrato do ciclo rAF; o raster
      // por software do sandbox corre a ~2 fps e estrangula o ritmo de envio)
      mpPasso: (dt: number) => mpRef.current?.passo(dt, motorRef.current.px, motorRef.current.pz, motorRef.current.yaw),
      // ── v38 — progressão, exploração e ambiente (ganchos E2E) ──
      perfil: () => lerPerfil(),
      // v39 — resultado da recuperação IDB→LS (E2E)
      restaurado: () => restauradoRef.current,
      darXP: (n: number) => {
        const ev = ganharXP(lerPerfil(), n);
        bump();
        return { xp: ev.perfil.xp, pontos: ev.perfil.pontos, subiuPara: ev.subiuPara ?? null };
      },
      gastarPonto: (ramo: string) => {
        const r = gastarPonto(lerPerfil(), ramo as Ramo);
        if (r) motorRef.current.escalaVel = escalaVelocidade(r);
        bump();
        return r;
      },
      definirDificuldade: (d: string) => {
        const reg = DIFICULDADES[d as Dificuldade];
        if (!reg) return null;
        const p = lerPerfil();
        p.dificuldade = reg.id;
        guardarPerfil(p);
        bump();
        return p;
      },
      descobertas: () => lerPerfil().marcos,
      marcoPerto: (x: number, z: number) => marcoPerto(x, z),
      cadeia: () => estadoCadeia(lerPerfil()),
      ambiente: () => ambienteRef.current?.estado() ?? { ativo: false, noite: false, chuva: 0 },
      escalaVel: () => motorRef.current.escalaVel,
      missoesHoje: () => missoesDeHoje(),
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
      mpRef.current?.passo(dt, m.px, m.pz, m.yaw); // v36 — envio 10 Hz + interpolação dos remotos
      if (canvasRef.current) m.render(dt);

      // rótulos 3D → ecrã (limitado a ~8 Hz)
      if (agora - ultRotT.current > 120) {
        ultRotT.current = agora;
        const cv = canvasRef.current;
        if (cv) {
          const w = cv.clientWidth, h = cv.clientHeight;
          const v = new THREE.Vector3();
          // v38 — raios de proximidade vêm da dificuldade do perfil (honesto)
          const raioPortal = DIFICULDADES[lerPerfil().dificuldade].raioPortal;
          const prox = portalPerto(m.px, m.pz, raioPortal);
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
          v.set(POS_QUIOSQUE[0] + 0.5, ALTURA_PLATEAU + 7, POS_QUIOSQUE[1] + 0.5).project(m.camara);
          novos.push({
            id: "__quiosque__", nome: t("cidade.quiosque"), cor: "#2dd4bf", rota: "", tipo: "quiosque",
            x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h,
            visivel: v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15,
            perto: prox?.tipo === "quiosque",
          });
          setRotulos(novos);

          // prompt de portal
          if (prox) {
            const nome = prox.tipo === "casa" ? t("cidade.casa")
              : prox.tipo === "trofeus" ? t("cidade.trofeus")
              : prox.tipo === "quiosque" ? t("cidade.quiosque")
              : prox.distrito?.nome ?? "";
            setPortal({ nome, rota: prox.distrito?.rota ?? "", tipo: prox.tipo });
            // registar visita UMA vez por entrada (v38: "__quiosque__" também conta —
            // antes caía em `null` e o quiósque nunca registava visita/cadeia)
            const chave = prox.tipo === "casa" ? "__casa__"
              : prox.tipo === "trofeus" ? "__trofeus__"
              : prox.tipo === "quiosque" ? "__quiosque__"
              : prox.distrito?.id ?? null;
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

          // ── v38 — descoberta de marcos (padrão WaypointArea, location.rs:34;
          // TODOS os do raio — o mais-próximo-sozinho deixava a praça sem descobrir) ──
          const perfilAgora = lerPerfil();
          const cercas = marcosPerto(m.px, m.pz, DIFICULDADES[perfilAgora.dificuldade].raioMarco);
          for (const cerca of cercas) {
            if (perfilAgora.marcos.includes(cerca.marco.id)) continue;
            const res = descobrirMarco(cerca.marco.id);
            if (res) {
              fireConfetti({ intensity: "low" });
              setAviso({ texto: t("cidade.marcoNovo", { nome: cerca.marco.nome, xp: String(res.xpGanho) }), k: Date.now() });
              bump();
            }
          }
          // ── v38 — festa de subida de nível (uma vez por nível) ──
          const nv = nivelDeXP(perfilAgora.xp);
          if (nv > nivelVistoRef.current) {
            const ganhoPontos = nv - nivelVistoRef.current;
            nivelVistoRef.current = nv;
            fireConfetti({ intensity: "medium" });
            setAviso({ texto: t("cidade.nivelSubiu", { n: String(nv), p: String(ganhoPontos) }), k: Date.now() });
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
        setMpN(mpRef.current?.nNoMundo ?? 0); // v36
        // v38 — anoitecer na praça (capítulo da cadeia) + ambiente sonoro
        if (m.noite && !noiteAntesRef.current && Math.hypot(m.px, m.pz) < 10) {
          const caps = registarNoitePraca();
          if (caps.length) {
            bump();
            setAviso({ texto: `★ ${t("cidade.cadeiaTitulo")}: ${caps[0].titulo}`, k: Date.now() });
          }
        }
        noiteAntesRef.current = m.noite;
        ambienteRef.current?.passo(m.noite, m.chuvaNivel);
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
    if (portal.tipo === "quiosque") { setTabQuiosque("radio"); setModal("quiosque"); return; }
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
      // v37 — a escrever no chat: o teclado é do texto, não do jogo
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA")) return;
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
  // v38 — cadeia atual + perfil para HUD (re-render sobe com missaoTick/perfilV)
  const cadeiaAgora = estadoCadeia(lerPerfil());
  const perfilAgora = lerPerfil();
  const defDif = (d: Dificuldade) => { const p = lerPerfil(); p.dificuldade = d; guardarPerfil(p); bump(); };

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

            {/* v38 — dificuldade escolhe-se no arranque (e no Diário) */}
            <div className="mt-5" data-testid="cd-dif-inicio">
              <p className="text-[11px] uppercase tracking-widest text-white/50 mb-1.5 flex items-center justify-center gap-1"><Gauge size={12} /> {t("cidade.difTitulo")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(["passeio", "cidadao", "desafiador"] as Dificuldade[]).map((d) => (
                  <button key={d} onClick={() => defDif(d)} data-testid={`cd-dif-${d}`}
                    className={`py-2 rounded-xl text-[11px] font-black border transition ${perfilAgora.dificuldade === d ? "bg-amber-400/15 border-amber-300/60 text-amber-200" : "border-white/15 text-white/60"}`}>
                    {t(`cidade.dif${d.charAt(0).toUpperCase()}${d.slice(1)}`)}
                  </button>
                ))}
              </div>
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
            <p className="mt-1 text-[10px] text-white/35">{t("cidade.mpNota")}</p>
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
              {/* v38 — nível + XP (curva do estudo Veloren, atividade real) */}
              {(() => {
                const p = lerPerfil();
                const nv = nivelDeXP(p.xp);
                const { noNivel, custo } = xpNoNivel(p.xp);
                return (
                  <div className="mt-1" data-testid="cd-nivel">
                    <p className="text-[10px] font-bold text-violet-300 leading-none flex items-center gap-1">
                      {t("cidade.nivel")} {nv}
                      {p.pontos > 0 && <span className="text-amber-300" data-testid="cd-pontos">· {p.pontos} {t("cidade.pontos")}</span>}
                    </p>
                    <div className="h-1 rounded bg-white/15 mt-0.5 w-full">
                      <div className="h-1 rounded bg-violet-400 transition-all" data-testid="cd-xp-bar"
                        style={{ width: `${Math.min(100, (noNivel / Math.max(1, custo)) * 100)}%` }} />
                    </div>
                  </div>
                );
              })()}
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
            {/* v36 — presença partilhada (só aparece quando há MP ativo) */}
            {mpEstado !== "off" && (
              <div className="px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur" data-testid="cd-mp">
                <Globe size={12} className={mpEstado === "ligado" ? "text-emerald-300" : mpEstado === "erro" ? "text-rose-300" : "text-white/50 animate-pulse"} />
                {mpEstado === "ligado" && <span data-testid="cd-mp-n">{mpN} {t("cidade.mpNoMundo")}</span>}
                {mpEstado === "a_ligar" && <span data-testid="cd-mp-estado">{t("cidade.mpLigando")}{mpInfo ? ` · ${mpInfo}` : ""}</span>}
                {mpEstado === "erro" && <span data-testid="cd-mp-estado">{t("cidade.mpErro")}{mpInfo ? ` — ${mpInfo}` : ""}</span>}
              </div>
            )}
          </div>

          {/* topo direita: minimapa + botões */}
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
            <MiniMapa motor={motorRef.current} />
            <div className="flex gap-2">
              <button onClick={() => setCamaraModo(motorRef.current.ciclarCamara())} data-testid="cd-camara"
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur" title={CAMARA_NOMES[camaraModo]}>
                <Camera size={16} />
              </button>
              <button onClick={() => { const m = motorRef.current; setSomMudo(!m.alternarSom()); ambienteRef.current?.alternarMudo(); }}
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur" data-testid="cd-som-btn">
                {somMudo ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={() => { setTabDiario("progresso"); setModal("diario"); }} data-testid="cd-diario-btn"
                className="p-2.5 rounded-xl bg-black/55 border border-white/15 text-white active:scale-95 backdrop-blur">
                <BookOpen size={16} />
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
                  {r.tipo === "quiosque" && <Store size={10} className="inline mr-1 -mt-0.5" />}
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

          {/* prompt central (casa/troféus/quiosque) */}
          {portal && portal.tipo !== "distrito" && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
              <button onClick={abrirPortalAtual} data-testid="cd-portal-especial"
                className="px-5 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-xl active:scale-95">
                {portal.tipo === "trofeus" && <><Trophy size={14} className="inline mr-1 -mt-0.5" />{t("cidade.abrirTrofeus")}</>}
                {portal.tipo === "quiosque" && <><Radio size={14} className="inline mr-1 -mt-0.5" />{t("cidade.quiosqueAbrir")}</>}
                {portal.tipo === "casa" && <><Home size={14} className="inline mr-1 -mt-0.5" />{portal.nome}</>}
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
              {/* v38 — capítulo atual do Roteiro do Imbondeiro */}
              <div className="pt-1.5 mt-1 border-t border-white/10" data-testid="cd-cadeia">
                {!cadeiaAgora.completo && cadeiaAgora.capitulo && (
                  <>
                    <p className="text-[9px] uppercase tracking-widest text-violet-300/80 mb-0.5 flex items-center gap-1">
                      <Compass size={10} /> {t("cidade.cadeiaTitulo")} · {t("cidade.capitulo", { n: String(cadeiaAgora.indice + 1) })}
                    </p>
                    <div className="text-[11px] leading-tight text-white/85">
                      <div className="flex items-center gap-1">
                        <span>•</span>
                        <span className="flex-1">{cadeiaAgora.capitulo.titulo} — {cadeiaAgora.capitulo.desc}</span>
                        <span className="tabular-nums text-white/45">{cadeiaAgora.prog}/{cadeiaAgora.alvo}</span>
                      </div>
                      {cadeiaAgora.alvo > 1 && (
                        <div className="h-1 rounded bg-white/10 mt-0.5 ml-3.5">
                          <div className="h-1 rounded bg-violet-400 transition-all" style={{ width: `${(cadeiaAgora.prog / cadeiaAgora.alvo) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </>
                )}
                {cadeiaAgora.completo && (
                  <p className="text-[11px] text-emerald-300 flex items-center gap-1"><Trophy size={11} /> {t("cidade.cadeiaFeito")}</p>
                )}
              </div>
            </div>
          </div>

          {/* v37 — chat da praça (só com mundo partilhado ligado) */}
          {mpEstado === "ligado" && (
            <div className="absolute bottom-[11.5rem] md:bottom-[9.5rem] left-3 z-20 w-56" data-testid="cd-chat">
              <div className="rounded-2xl bg-black/60 border border-white/15 backdrop-blur p-2 text-white space-y-1 mb-1.5 min-h-[2.1rem] flex flex-col justify-end">
                {mpFalas.length === 0 ? (
                  <p className="text-[10px] text-white/40 px-1 flex items-center gap-1"><MessageCircle size={10} /> {t("cidade.mpChatVazio")}</p>
                ) : mpFalas.slice(-4).map((f, i) => (
                  <p key={`${f.em}-${f.id}-${i}`} className="text-[11px] leading-tight break-words" data-testid="cd-chat-linha">
                    <span className="font-black text-sky-300">{f.nome}: </span>
                    <span className="text-white/90">{f.texto}</span>
                  </p>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={chatTexto} onChange={(e) => setChatTexto(e.target.value)}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") enviarFala(); }}
                  onKeyUp={(e) => e.stopPropagation()}
                  data-testid="cd-chat-input" maxLength={140} enterKeyHint="send"
                  placeholder={t("cidade.mpChatFala")}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-sky-400/60 backdrop-blur" />
                <button onClick={enviarFala} data-testid="cd-chat-enviar" aria-label={t("cidade.mpChatEnviar")}
                  className="px-2.5 rounded-xl bg-sky-500/80 border border-white/15 text-white active:scale-95 backdrop-blur">
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}

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

      {/* ═══ MODAL: DIÁRIO (v38 — progressão · exploração · dificuldade) ═══ */}
      {modal === "diario" && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-violet-400/25 rounded-2xl p-4 w-full max-w-md text-white max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} data-testid="cd-modal-diario">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg flex items-center gap-2"><BookOpen size={18} className="text-violet-300" />{t("cidade.diario")}</h3>
              <button onClick={() => setModal(null)} className="text-white/70 text-xl leading-none" data-testid="cd-diario-fechar">×</button>
            </div>
            <div className="flex gap-1.5 mb-3">
              {(["progresso", "exploracao", "dificuldade"] as const).map((tab) => (
                <button key={tab} onClick={() => setTabDiario(tab)} data-testid={`cd-diario-tab-${tab}`}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-black border transition ${tabDiario === tab ? "bg-violet-400/15 border-violet-300/60 text-violet-200" : "border-white/15 text-white/60"}`}>
                  {tab === "progresso" ? t("cidade.tabProgressao") : tab === "exploracao" ? t("cidade.tabExploracao") : t("cidade.tabDificuldade")}
                </button>
              ))}
            </div>

            {tabDiario === "progresso" && (() => {
              const p = lerPerfil();
              const nv = nivelDeXP(p.xp);
              const { noNivel, custo } = xpNoNivel(p.xp);
              const descs: Record<Ramo, string> = {
                explorador: t("cidade.ramoExploradorDesc"),
                atleta: t("cidade.ramoAtletaDesc"),
                sabio: t("cidade.ramoSabioDesc"),
                cidadao: t("cidade.ramoCidadaoDesc"),
              };
              const icones: Record<Ramo, typeof Compass> = { explorador: Compass, atleta: Footprints, sabio: Brain, cidadao: Home };
              const nomes: Record<Ramo, string> = {
                explorador: t("cidade.ramoExplorador"), atleta: t("cidade.ramoAtleta"),
                sabio: t("cidade.ramoSabio"), cidadao: t("cidade.ramoCidadao"),
              };
              return (
                <div className="space-y-3" data-testid="cd-diario-progresso">
                  <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-3">
                    <p className="text-2xl font-black text-violet-200" data-testid="cd-diario-nivel">{t("cidade.nivel")} {nv}</p>
                    <div className="h-1.5 rounded bg-white/10 mt-2">
                      <div className="h-1.5 rounded bg-violet-400 transition-all" style={{ width: `${Math.min(100, (noNivel / Math.max(1, custo)) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 tabular-nums">{noNivel} / {custo} {t("cidade.xp")}</p>
                    <p className="text-[11px] text-amber-300 font-bold mt-1" data-testid="cd-diario-pontos">{p.pontos} {t("cidade.pontos")}</p>
                  </div>
                  {RAMOS.map((r) => {
                    const Icone = icones[r];
                    const nivel = p.skills[r];
                    const max = nivel >= NIVEL_MAX_RAMO;
                    return (
                      <div key={r} className="rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-center gap-2.5" data-testid={`cd-ramo-${r}`}>
                        <Icone size={17} className="text-violet-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-black">
                            {nomes[r]}
                            <span className="ml-1.5 text-white/45 font-bold">{"●".repeat(nivel)}{"○".repeat(NIVEL_MAX_RAMO - nivel)}</span>
                          </p>
                          <p className="text-[10px] text-white/55 leading-tight">{descs[r]}</p>
                        </div>
                        <button onClick={() => { const rr = gastarPonto(lerPerfil(), r); if (rr) motorRef.current.escalaVel = escalaVelocidade(rr); bump(); }}
                          disabled={p.pontos < 1 || max} data-testid={`cd-aprender-${r}`}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-violet-400/20 border border-violet-300/50 text-violet-200 disabled:opacity-35 disabled:cursor-not-allowed active:scale-95">
                          {t("cidade.aprender")}
                        </button>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-white/40">{t("cidade.difNota")}</p>
                </div>
              );
            })()}

            {tabDiario === "exploracao" && (() => {
              const p = lerPerfil();
              return (
                <div className="space-y-2" data-testid="cd-diario-exploracao">
                  <p className="text-[12px] font-bold text-white/80" data-testid="cd-marcos-contagem">
                    {t("cidade.marcosContagem", { a: String(p.marcos.length), b: String(MARCOS.length) })}
                  </p>
                  {MARCOS.map((mk) => {
                    const achou = p.marcos.includes(mk.id);
                    return (
                      <div key={mk.id} className={`rounded-xl border p-2.5 ${achou ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-white/5"}`} data-testid={`cd-marco-${mk.id}`}>
                        <p className={`text-[12px] font-black flex items-center gap-1.5 ${achou ? "text-emerald-200" : "text-white/45"}`}>
                          <MapPin size={12} /> {achou ? mk.nome : "???"}
                          {mk.natural && <span className="text-[9px] uppercase tracking-wider text-white/35">· {t("cidade.natural")}</span>}
                        </p>
                        {achou && <p className="text-[10px] text-white/60 leading-tight mt-0.5">{mk.desc}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {tabDiario === "dificuldade" && (() => {
              const p = lerPerfil();
              return (
                <div className="space-y-2" data-testid="cd-diario-dificuldade">
                  {(["passeio", "cidadao", "desafiador"] as Dificuldade[]).map((d) => {
                    const ativo = p.dificuldade === d;
                    return (
                      <button key={d} onClick={() => { defDif(d); }}
                        data-testid={`cd-dif-card-${d}`}
                        className={`w-full text-left rounded-xl border p-3 transition ${ativo ? "border-amber-300/60 bg-amber-400/10" : "border-white/15 bg-white/5"}`}>
                        <p className={`text-[13px] font-black flex items-center gap-1.5 ${ativo ? "text-amber-200" : "text-white/85"}`}>
                          <Gauge size={13} /> {t(`cidade.dif${d.charAt(0).toUpperCase()}${d.slice(1)}`)}
                          {ativo && <span className="ml-auto text-[10px] text-amber-300">✓</span>}
                        </p>
                        <p className="text-[10px] text-white/55 leading-tight mt-0.5">{t(`cidade.dif${d.charAt(0).toUpperCase()}${d.slice(1)}Desc`)}</p>
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-white/40">{t("cidade.difNota")}</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ MODAL: QUIOSQUE DA PRAÇA (v34 — rádio + quiz reais) ═══ */}
      {modal === "quiosque" && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-slate-900 border border-teal-400/25 rounded-2xl p-4 w-full max-w-md text-white max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} data-testid="cd-modal-quiosque">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg flex items-center gap-2"><Store size={18} className="text-teal-300" />{t("cidade.quiosque")}</h3>
              <button onClick={() => setModal(null)} className="text-white/70 text-xl leading-none" data-testid="cd-quiosque-fechar">×</button>
            </div>
            <div className="flex gap-1.5 mb-3">
              <button onClick={() => setTabQuiosque("radio")} data-testid="cd-quiosque-tab-radio"
                className={`flex-1 py-2 rounded-xl text-[12px] font-black border transition ${tabQuiosque === "radio" ? "bg-teal-400/15 border-teal-300/60 text-teal-200" : "border-white/15 text-white/60"}`}>
                <Radio size={13} className="inline mr-1 -mt-0.5" />{t("cidade.tabRadio")}
              </button>
              <button onClick={() => setTabQuiosque("quiz")} data-testid="cd-quiosque-tab-quiz"
                className={`flex-1 py-2 rounded-xl text-[12px] font-black border transition ${tabQuiosque === "quiz" ? "bg-teal-400/15 border-teal-300/60 text-teal-200" : "border-white/15 text-white/60"}`}>
                <Sparkles size={13} className="inline mr-1 -mt-0.5" />{t("cidade.tabQuiz")}
              </button>
            </div>
            {tabQuiosque === "radio" ? <RadiosPALOP compacto /> : (
              <QuizPraca
                bonusPorAcerto={bonusQuizCreditos(lerPerfil())}
                aoFim={(acertos) => {
                  // v38 — XP real pelos acertos + capítulos da cadeia que fechem
                  const r = registarQuiz(acertos);
                  setCreditos(creditosCidade());
                  bump();
                  if (r.capitulos.length) setAviso({ texto: `★ ${t("cidade.cadeiaTitulo")}: ${r.capitulos[0].titulo}`, k: Date.now() });
                  else if (r.xpGanho > 0) setAviso({ texto: `+${r.xpGanho} XP`, k: Date.now() });
                }}
              />
            )}
            <p className="text-[10px] text-white/40 mt-3">{t("cidade.honesto")}</p>
          </div>
        </div>
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
                    {feita ? "🏆" : "◻"} {ms.desc} <span className="text-white/40">(+{creditoMissaoAtual()} {t("cidade.creditos")})</span>
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
                {typeof ar === "object" && ar !== null && (
                  <p className="mt-1.5 font-bold" data-testid="cd-aqi">
                    {t("cidade.aqi")}: <span style={{ color: rotuloAqi(ar.aqi).cor }} data-testid="cd-aqi-valor">{rotuloAqi(ar.aqi).rotulo} (EAQI {ar.aqi})</span>
                    {ar.pm25 !== null && <span className="text-white/50 font-normal"> · PM2.5 {ar.pm25.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} µg/m³</span>}
                  </p>
                )}
                {ar === "erro" && (
                  <p className="mt-1.5 text-white/50" data-testid="cd-aqi-erro">{t("cidade.aqiIndisp")}</p>
                )}
                <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1"><Info size={10} /> {OPENMETEO_ATTRIBUTION}</p>
                <p className="text-[10px] text-white/40 flex items-center gap-1"><Info size={10} /> {AQI_ATTRIBUTION}</p>
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
