// ═══════════════════════════════════════════════════════════════════
// HORDAS DE BATEU — componente React: entrada estilo hordes.io
// (título → classe → facção → nome → Carregando Mundo) + HUD completo:
// frame do jogador, alvo, barra de skills, cast bar, chat com abas,
// tracker de quests, frames de grupo, minimapa, morte/ressurreição.
// Sem registo: personagem guardada em localStorage.
// ═══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Skull, Users, Backpack, Sparkles } from "lucide-react";
import { HordesEngine, type HudState } from "./hordesEngine";
import {
  CLASSES, FACCOES, SKILLS, QUESTS, xpParaNivel, nomePeca, mobPorId,
  type QuestDef,
} from "./hordesData";

interface Props {
  onScore?: (name: string, score: number) => void;
  onNavigate?: (route: string) => void;
  onExit?: () => void;
}

interface MsgChat { tipo: "geral" | "combate" | "sistema"; msg: string; t: number; }
interface ItemInv { nome: string; raridade: number; peca: string; }
interface ProgQuest { quantos: Record<string, number>; }

const LS_CHAR = "bateu.hordes.char.v1";
const LS_QUEST = "bateu.hordes.quests.v1";

export default function HordesWorld({ onScore, onNavigate, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HordesEngine | null>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);

  // ── fases: titulo → criar → loading → jogo ──
  const [fase, setFase] = useState<"titulo" | "criar" | "loading" | "jogo">("titulo");
  const [classe, setClasse] = useState(0);
  const [faccao, setFaccao] = useState(0);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");

  // ── HUD ──
  const [hud, setHud] = useState<HudState | null>(null);
  const [chat, setChat] = useState<MsgChat[]>([]);
  const [abaChat, setAbaChat] = useState<"geral" | "combate">("geral");
  const [msgInput, setMsgInput] = useState("");
  const [nivelToast, setNivelToast] = useState(0);
  const [lootToast, setLootToast] = useState<{ txt: string; rar: number } | null>(null);
  const [inventario, setInventario] = useState<ItemInv[]>([]);
  const [showInv, setShowInv] = useState(false);
  const [morto, setMorto] = useState(false);
  const [npcPerto, setNpcPerto] = useState<string | null>(null);
  const [dlgNpc, setDlgNpc] = useState<string | null>(null);

  // ── quests (REA: cadeia com pré-requisitos) ──
  const [questAtiva, setQuestAtiva] = useState<QuestDef | null>(null);
  const [prog, setProg] = useState<ProgQuest>({ quantos: {} });
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [questCompletavel, setQuestCompletavel] = useState(false);

  const questAtivaRef = useRef<QuestDef | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const nomeOk = /^[A-Za-z0-9]{3,16}$/.test(nome); // REA: a-Z 0-9, 3–16

  // persistência local
  useEffect(() => {
    try {
      const c = localStorage.getItem(LS_CHAR);
      const q = localStorage.getItem(LS_QUEST);
      if (q) {
        const p = JSON.parse(q);
        setConcluidas(p.concluidas ?? []);
        setQuestAtiva(p.ativa ?? null);
        setProg(p.prog ?? { quantos: {} });
      }
      if (c) {
        const ch = JSON.parse(c);
        if (ch.nome && ch.classe !== undefined) {
          setNome(ch.nome); setClasse(ch.classe); setFaccao(ch.faccao ?? 0);
          setFase("criar");
        }
      }
    } catch { /* ignore */ }
  }, []);

  const guardaQuests = useCallback((ativa: QuestDef | null, prog2: ProgQuest, concl: string[]) => {
    try { localStorage.setItem(LS_QUEST, JSON.stringify({ ativa: ativa, prog: prog2, concluidas: concl })); } catch { /* ignore */ }
  }, []);

  const enviaHudLog = useCallback((tipo: MsgChat["tipo"], msg: string) => {
    setChat(prev => [...prev.slice(-80), { tipo, msg, t: Date.now() }]);
  }, []);

  // ── entrar no mundo ──
  const entraMundo = useCallback(() => {
    if (!nomeOk) { setErroNome("O nome só pode ter letras e números (3 a 16 caracteres)."); return; }
    setErroNome("");
    try { localStorage.setItem(LS_CHAR, JSON.stringify({ nome, classe, faccao })); } catch { /* ignore */ }
    setFase("loading");
    // Carregando Mundo (REA: loading real)
    setTimeout(() => setFase("jogo"), 900);
  }, [nome, nomeOk, classe, faccao]);

  // ── montar engine ──
  useEffect(() => {
    if (fase !== "jogo" || !canvasRef.current || engineRef.current) return;
    const eng = new HordesEngine();
    engineRef.current = eng;
    eng.mount(canvasRef.current, { nome, classe, faccao }, {
      onHud: (h) => {
        setHud(h);
        setMorto(!h.vivo);
      },
      onLog: (tipo, msg) => enviaHudLog(tipo, msg),
      onNivel: (nv) => {
        setNivelToast(nv);
        setTimeout(() => setNivelToast(0), 2600);
        try { onScore?.(nome, nv * 500 + (hud?.ouro ?? 0)); } catch { /* ignore */ }
      },
      onKill: (mobId) => {
        // progresso de quests (REA: objetivos "mata N de X")
        setProg(prev => {
          const q = questAtivaRef.current;
          if (!q || !q.objetivos.some(o => o.mob === mobId)) return prev;
          const quantos = { ...prev.quantos, [mobId]: (prev.quantos[mobId] ?? 0) + 1 };
          return { quantos };
        });
      },
      onLoot: (ouro, peca, raridade) => {
        if (peca) {
          const txt = nomePeca(CLASSES[classe], peca, raridade);
          setLootToast({ txt, rar: raridade });
          setInventario(prev => [...prev, { nome: txt, raridade: raridade, peca }]);
          setTimeout(() => setLootToast(null), 3200);
        }
      },
      onMorte: () => setMorto(true),
    });
    eng.setMini(miniRef.current);
    enviaHudLog("sistema", `Bem-vindo a Hordas de Bateu, ${nome}! Escolhe uma zona no minimapa e caça os mobs certos para o teu nível.`);
    enviaHudLog("sistema", "WASD para mover · clica num mob para mirar · 1-8 skills · Q poção · Tab alvo próximo");
    // loop de proximidade do NPC
    const iv = setInterval(() => {
      const st = (window as unknown as { __bw?: Record<string, (a?: unknown) => unknown> }).__bw;
      if (!st) return;
      // NPC perto é derivado do hud z/x vs aldeia
      const h = eng.hudSnap();
      setNpcPerto(h.zona === "Aldeia Aurora" && Math.hypot(h.x, h.z) < 16 ? "Aldeia Aurora" : null);
    }, 800);
    return () => {
      clearInterval(iv);
      eng.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const questAtivaRef2 = questAtivaRef;
  useEffect(() => { questAtivaRef2.current = questAtiva; guardaQuests(questAtiva, prog, concluidas); }, [questAtiva, prog, concluidas, guardaQuests, questAtivaRef2]);

  // verificar quest completável
  useEffect(() => {
    const q = questAtiva;
    if (!q) { setQuestCompletavel(false); return; }
    const tudo = q.objetivos.every(o => (prog.quantos[o.mob] ?? 0) >= o.quantos);
    setQuestCompletavel(tudo);
  }, [prog, questAtiva]);

  // aceitar/entregar quests
  const aceitaQuest = useCallback((q: QuestDef) => {
    setQuestAtiva(q);
    setProg({ quantos: {} });
    setDlgNpc(null);
    enviaHudLog("sistema", `📜 Quest aceite: ${q.titulo}`);
  }, [enviaHudLog]);

  const completaQuest = useCallback(() => {
    const q = questAtiva;
    if (!q) return;
    const novas = [...concluidas, q.id];
    setConcluidas(novas);
    setQuestAtiva(null);
    setProg({ quantos: {} });
    setDlgNpc(null);
    enviaHudLog("sistema", `✅ ${q.titulo} concluída! +${q.xp} XP · +${q.ouro} ouro${q.recompensaArma ? " · arma da tua classe" : ""}${q.recompensaLivro ? " · livro de skill" : ""}${q.recompensaPeca ? ` · ${nomePeca(CLASSES[classe], q.recompensaPeca, 1)}` : ""}`);
    // recompensas via hooks do motor
    const w = window as unknown as { __bw?: { questReward?: (xp: number, ouro: number) => void } };
    if (w.__bw?.questReward) w.__bw.questReward(q.xp, q.ouro);
    else engineRef.current?.recompensa(q.xp, q.ouro);
    if (q.recompensaPeca) {
      const txt = nomePeca(CLASSES[classe], q.recompensaPeca, 2);
      setInventario(prev => [...prev, { nome: txt, raridade: 2, peca: q.recompensaPeca! }]);
    }
  }, [questAtiva, concluidas, classe, enviaHudLog]);

  // fullscreen real (regra permanente: mobile fullscreen 100dvh)
  const pedirFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => { /* ignore */ });
    }
  }, []);

  useEffect(() => {
    if (fase === "jogo") {
      document.body.style.overflow = "hidden";
      const vh = () => document.documentElement.style.setProperty("--bw-vh", `${window.innerHeight * 0.01}px`);
      vh();
      window.addEventListener("resize", vh);
      return () => { document.body.style.overflow = ""; window.removeEventListener("resize", vh); };
    }
  }, [fase]);

  // reporta score ao sair
  const sair = useCallback(() => {
    const nv = hud?.nivel ?? 1;
    try { onScore?.(nome, nv * 500 + (hud?.ouro ?? 0)); } catch { /* ignore */ }
    engineRef.current?.dispose();
    engineRef.current = null;
    onExit?.();
  }, [hud, nome, onScore, onExit]);

  // joystick móvel
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyVec, setJoyVec] = useState({ x: 0, z: 0, ativo: false });
  const joyTouch = (e: React.PointerEvent) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dz = (e.clientY - cy) / (r.height / 2);
    const mag = Math.hypot(dx, dz);
    if (mag > 1) { dx /= mag; dz /= mag; }
    setJoyVec({ x: dx, z: dz, ativo: true });
    engineRef.current?.setMove(dx, dz);
  };
  const joySolta = () => { setJoyVec({ x: 0, z: 0, ativo: false }); engineRef.current?.setMove(0, 0); };

  const [camRotRef] = useState({ dragging: false, lastX: 0 });
  const camTouchStart = (e: React.PointerEvent) => { camRotRef.dragging = true; camRotRef.lastX = e.clientX; };
  const camTouchMove = (e: React.PointerEvent) => {
    if (!camRotRef.dragging) return;
    engineRef.current?.setCamRotate(e.clientX - camRotRef.lastX);
    camRotRef.lastX = e.clientX;
  };
  const camTouchEnd = () => { camRotRef.dragging = false; };

  const enviarChat = () => {
    const m = msgInput.trim();
    if (!m) return;
    setMsgInput("");
    const w = window as unknown as { __bw?: { sendChat?: (s: string) => void } };
    if (w.__bw?.sendChat) w.__bw.sendChat(m);
  };
// ═══════ PARTE 2: render — colada no fim de HordesWorld.tsx ═══════

  // ── ecrã de título (REA: Welcome + Start playing) ──
  if (fase === "titulo") {
    return (
      <div className="fixed inset-0 z-[80] bg-gradient-to-b from-[#0b1016] via-[#101820] to-[#1a0f14] flex flex-col items-center justify-center overflow-y-auto px-4" style={{ height: "100dvh" }}>
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(244,201,93,0.22), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(240,86,62,0.18), transparent 55%)" }} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative text-center">
          <div className="text-[11px] font-bold tracking-[0.4em] text-amber-300/80 uppercase">O MMORPG da plataforma</div>
          <h1 className="font-display text-5xl sm:text-7xl font-black mt-2 bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(245,158,11,0.35)]">
            HORDAS DE BATEU
          </h1>
          <p className="text-slate-300/90 text-sm sm:text-base mt-3 max-w-md mx-auto">
            4 classes · 2 facções em guerra · 10 zonas · 50 níveis · dezenas de mobs, quests e skills — no navegador, sem registo.
          </p>
          <button
            data-testid="bw-start"
            onClick={() => { pedirFullscreen(); setFase("criar"); }}
            className="mt-8 px-10 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-lg shadow-[0_8px_40px_rgba(245,158,11,0.45)] hover:scale-[1.03] active:scale-95 transition"
          >
            COMEÇAR A JOGAR ▶
          </button>
          <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span>⚔️ Guerreiro</span><span>🔮 Mago</span><span>🏹 Arqueiro</span><span>✨ Clérigo</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── criação de personagem (REA: charmenu.create — classe → facção → nome) ──
  if (fase === "criar") {
    const cl = CLASSES[classe];
    return (
      <div className="fixed inset-0 z-[80] bg-[#0b1016] overflow-y-auto" style={{ height: "100dvh" }}>
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-black text-white">Criação de Personagem</h2>
            {onExit && <button onClick={onExit} className="text-slate-400 hover:text-white p-2" aria-label="Fechar"><X className="h-5 w-5" /></button>}
          </div>
          <p className="text-slate-400 text-xs mt-1">Escolhe com atenção — a tua classe define as skills e a facção define os teus aliados.</p>

          {/* classes (REA: 4 ícones com descrição) */}
          <h3 className="mt-6 text-amber-300 font-bold text-sm uppercase tracking-wider">Selecionar uma Classe</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {CLASSES.map(c => (
              <button key={c.id} data-testid={`bw-class-${c.id}`} onClick={() => setClasse(c.id)}
                className={`text-left rounded-xl border p-3 transition ${classe === c.id ? "border-amber-400 bg-amber-400/10 shadow-[0_0_24px_rgba(245,158,11,0.25)]" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                <div className="text-3xl">{c.emoji}</div>
                <div className="font-black text-white mt-1" style={{ color: c.cor }}>{c.nome}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{c.arma}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.atributos.map(a => (
                    <span key={a.chave} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                      {a.chave} <span className="text-white">{a.valor}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[9px] text-slate-300 leading-snug">{c.desc}</div>
                <div className="mt-2 flex gap-1 text-[10px]">
                  <span className="text-rose-300">❤ {c.hp}</span>
                  <span className="text-sky-300">💧 {c.mp}</span>
                </div>
              </button>
            ))}
          </div>

          {/* skills iniciais da classe */}
          <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Skills de {cl.nome} (aprendes por nível)</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {cl.skills.slice(0, 5).map((sid, i) => {
                const s = SKILLS[sid];
                return (
                  <div key={sid} className="flex items-center gap-1.5 rounded-lg bg-black/40 px-2 py-1">
                    <span className="text-base">{s.emoji}</span>
                    <div>
                      <div className="text-[11px] font-bold text-white leading-none">{s.nome}</div>
                      <div className="text-[9px] text-slate-400">nv {s.nivel}{i === 0 ? " · inicial" : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* facções (REA: Vanguard vs Bloodlust + neutra, com lore) */}
          <h3 className="mt-6 text-amber-300 font-bold text-sm uppercase tracking-wider">Selecionar uma Facção</h3>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {FACCOES.map(f => (
              <button key={f.id} data-testid={`bw-faction-${f.id}`} onClick={() => setFaccao(f.id)}
                className={`text-left rounded-xl border p-3 transition ${faccao === f.id ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: f.cor, boxShadow: `0 0 12px ${f.cor}` }} />
                  <span className="font-black text-white text-sm">{f.nome}</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-2 leading-snug">{f.lore}</p>
              </button>
            ))}
          </div>

          {/* nome (REA: 3–16, a-Z 0-9) */}
          <h3 className="mt-6 text-amber-300 font-bold text-sm uppercase tracking-wider">Introduzir um nome</h3>
          <input
            data-testid="bw-name-input"
            value={nome}
            onChange={e => setNome(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
            placeholder="O teu nome de herói"
            maxLength={16}
            className="mt-3 w-full max-w-sm rounded-xl bg-black/50 border border-white/15 px-4 py-3 text-white font-bold tracking-wide outline-none focus:border-amber-400"
          />
          <div className="text-[10px] text-slate-400 mt-1.5">Só letras e números, entre 3 e 16 caracteres, sem espaços.</div>
          {erroNome && <div className="text-rose-400 text-xs mt-1">{erroNome}</div>}

          <button
            data-testid="bw-enter"
            onClick={entraMundo}
            disabled={!nomeOk}
            className={`mt-6 w-full sm:w-auto px-12 py-4 rounded-xl font-black text-lg transition ${nomeOk ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95" : "bg-white/10 text-slate-500 cursor-not-allowed"}`}
          >
            ENTRAR NO MUNDO →
          </button>
        </div>
      </div>
    );
  }

  // ── Carregando Mundo (REA: "Loading World") ──
  if (fase === "loading") {
    return (
      <div className="fixed inset-0 z-[80] bg-[#0b1016] flex flex-col items-center justify-center" style={{ height: "100dvh" }}>
        <div className="text-6xl animate-bounce">⚔️</div>
        <div data-testid="bw-loading" className="font-display text-2xl font-black text-white mt-6">Carregando Mundo</div>
        <div className="w-56 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-600" initial={{ width: "5%" }} animate={{ width: "100%" }} transition={{ duration: 0.8 }} />
        </div>
        <div className="text-slate-400 text-xs mt-3">{CLASSES[classe].emoji} {nome} · {FACCOES[faccao].nome}</div>
      </div>
    );
  }

  // ═══════════ JOGO ═══════════
  const cl = CLASSES[hud?.classe ?? classe];
  const ids = cl.skills.filter(sid => SKILLS[sid].nivel <= (hud?.nivel ?? 1));
  const chatFiltrada = chat.filter(c => abaChat === "geral" ? c.tipo !== "combate" : true);
  return (
    <div data-testid="bw-play" className="fixed inset-0 z-[80] bg-black select-none overflow-hidden" style={{ height: "100dvh" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* ── frame do jogador (REA: retrato/HP/MP/XP sup. esq.) ── */}
      {hud && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 rounded-xl bg-black/55 backdrop-blur px-2.5 py-1.5 border border-white/10">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl border" style={{ borderColor: cl.cor, background: `${cl.cor}22` }}>{cl.emoji}</div>
            <div className="min-w-[168px]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white font-bold text-[12px] leading-none">{hud.nome}</span>
                <span className="text-amber-300 font-black text-[11px]">Nv {hud.nivel}</span>
                <span className="text-yellow-300 text-[10px] ml-auto">🪙 {hud.ouro}</span>
              </div>
              <div className="mt-1 h-2.5 w-full rounded-full bg-black/60 overflow-hidden border border-black/50">
                <div data-testid="bw-hpbar" className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${(hud.hp / hud.hpMax) * 100}%` }} />
              </div>
              <div className="text-[8px] text-emerald-200/90 font-bold leading-none mt-0.5">{hud.hp} / {hud.hpMax}</div>
              <div className="mt-0.5 h-2 w-full rounded-full bg-black/60 overflow-hidden border border-black/50">
                <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all" style={{ width: `${(hud.mp / hud.mpMax) * 100}%` }} />
              </div>
              <div className="text-[8px] text-sky-200/90 font-bold leading-none mt-0.5">MP {hud.mp} / {hud.mpMax}</div>
            </div>
          </div>
          {/* barra de XP */}
          <div className="mt-1 h-1.5 w-[228px] rounded-full bg-black/60 overflow-hidden border border-black/50">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all" style={{ width: `${Math.min(100, (hud.xp / hud.xpProx) * 100)}%` }} />
          </div>
          <div className="text-[8px] text-purple-200/80 font-bold mt-0.5">XP {hud.xp} / {hud.xpProx}</div>
          {/* buffs */}
          {hud.buffs.length > 0 && (
            <div className="mt-1 flex gap-1">{hud.buffs.map((b, i) => <span key={i} className="text-sm drop-shadow">{b}</span>)}</div>
          )}
          {hud.combos > 1 && <div className="mt-1 text-orange-400 font-black text-xs drop-shadow">COMBO ×{hud.combos}</div>}
        </div>
      )}

      {/* ── frame do alvo (REA: centro-topo) ── */}
      {hud?.alvo && (
        <div data-testid="bw-target" className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-56">
          <div className="rounded-xl bg-black/55 backdrop-blur px-3 py-1.5 border border-white/10 text-center">
            <div className="text-[11px] font-bold text-white leading-none">
              {hud.alvo.nome} <span className="text-slate-300">· nv {hud.alvo.nivel}</span>
              {hud.alvo.raridade > 0 && <span className="ml-1 text-[9px] font-black" style={{ color: ["", "#fbbf24", "#c084fc", "#f97316"][hud.alvo.raridade] }}>{["", "ELITE", "RARO", "CHEFE"][hud.alvo.raridade]}</span>}
            </div>
            <div className="mt-1 h-2.5 w-full rounded-full bg-black/60 overflow-hidden border border-black/50">
              <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all" style={{ width: `${(hud.alvo.hp / hud.alvo.hpMax) * 100}%` }} />
            </div>
            <div className="text-[8px] text-rose-200/90 font-bold mt-0.5">{hud.alvo.hp} / {hud.alvo.hpMax} · {hud.alvo.dist}m</div>
          </div>
        </div>
      )}

      {/* ── cast bar (REA: canalização) ── */}
      {hud?.cast && (
        <div data-testid="bw-castbar" className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-60 pointer-events-none">
          <div className="rounded-lg bg-black/60 border border-sky-400/40 px-2 py-1">
            <div className="text-[10px] text-sky-200 font-bold text-center">{hud.cast.nome}</div>
            <div className="h-1.5 rounded-full bg-black/60 overflow-hidden mt-0.5">
              <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-400" style={{ width: `${(1 - hud.cast.t / hud.cast.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── minimapa (REA: sup. dir. + zona + coords) ── */}
      <div className="absolute top-2 right-2 z-20 pointer-events-none">
        <canvas ref={miniRef} width={124} height={124} className="rounded-full border-2 border-white/20 bg-black/60" />
        {hud && (
          <div className="text-center mt-1">
            <div data-testid="bw-zone" className="text-[11px] font-black text-white drop-shadow bg-black/50 rounded px-2 py-0.5 inline-block">{hud.zona}</div>
            <div className="text-[9px] text-slate-300 font-bold drop-shadow">{hud.x}, {hud.z}</div>
          </div>
        )}
      </div>

      {/* ── tracker de quests (REA: direita) ── */}
      {questAtiva && (
        <div data-testid="bw-quest" className="absolute top-44 right-2 z-20 w-52 pointer-events-none">
          <div className="rounded-xl bg-black/55 backdrop-blur border border-amber-400/30 p-2.5">
            <div className="text-[10px] font-black text-amber-300 uppercase tracking-wide">📜 {questAtiva.titulo}</div>
            {questAtiva.objetivos.length === 0 ? (
              <div className="text-[10px] text-slate-200 mt-1">Fala com {questAtiva.npc.split(" ").slice(-1)} na aldeia.</div>
            ) : (
              <div className="mt-1 space-y-0.5">
                {questAtiva.objetivos.map(o => {
                  const feito = Math.min(o.quantos, prog.quantos[o.mob] ?? 0);
                  const mobNome = mobPorId(o.mob).nome;
                  return (
                    <div key={o.mob} className="text-[10px] text-slate-200 flex justify-between gap-1">
                      <span className="truncate">{mobNome}</span>
                      <span className={feito >= o.quantos ? "text-emerald-400 font-black" : "font-bold"}>{feito}/{o.quantos}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {questCompletavel && <div className="text-[10px] text-emerald-300 font-black mt-1.5 animate-pulse">✔ Regressa a {questAtiva.npc}!</div>}
          </div>
        </div>
      )}

      {/* ── frames de grupo (REA: party frames) ── */}
      <div data-testid="bw-party-frames" className="absolute left-2 top-32 z-10 pointer-events-none space-y-1">
        {(window as unknown as { __bw?: { party?: () => { nome: string; nivel: number; hpFrac: number }[] } }).__bw?.party?.()?.map((p, i) => (
          <div key={i} className="w-36 rounded-lg bg-black/50 border border-white/10 px-2 py-1">
            <div className="text-[9px] font-bold text-sky-200 leading-none truncate">{p.nome} <span className="text-slate-400">Nv {p.nivel}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-black/60 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${p.hpFrac * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── chat (REA: inf. esq. com abas Geral/Combate) ── */}
      <div data-testid="bw-chat" className="absolute bottom-2 left-2 z-20 w-[290px] max-w-[46vw]">
        <div className="flex gap-1 mb-1">
          <button data-testid="bw-chat-tab-geral" onClick={() => setAbaChat("geral")}
            className={`text-[9px] font-black px-2 py-0.5 rounded-t ${abaChat === "geral" ? "bg-black/70 text-amber-300" : "bg-black/40 text-slate-400"}`}>GERAL</button>
          <button data-testid="bw-chat-tab-combate" onClick={() => setAbaChat("combate")}
            className={`text-[9px] font-black px-2 py-0.5 rounded-t ${abaChat === "combate" ? "bg-black/70 text-rose-300" : "bg-black/40 text-slate-400"}`}>COMBATE</button>
        </div>
        <div data-testid="bw-chat-log" ref={logRef}
          className="h-24 overflow-y-auto rounded-lg bg-black/55 backdrop-blur border border-white/10 px-2 py-1.5 text-[10px] leading-snug space-y-0.5">
          {chatFiltrada.map((c, i) => (
            <div key={i} className={c.tipo === "sistema" ? "text-amber-200/90" : c.tipo === "combate" ? "text-rose-200/80" : "text-slate-100"}>
              {c.tipo === "geral" ? <span className="text-sky-400 font-bold">[Geral] </span> : null}{c.msg}
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          <input data-testid="bw-chat-input" value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") enviarChat(); }}
            placeholder="Diz algo ao mundo…"
            className="flex-1 rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-[10px] text-white outline-none focus:border-amber-400" />
          <button data-testid="bw-chat-send" onClick={enviarChat}
            className="rounded-lg bg-amber-500/90 px-2.5 text-black text-[10px] font-black">➤</button>
        </div>
      </div>

      {/* ── barra de skills (REA: centro-baixo, 1-8 + poção Q) ── */}
      {hud && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
          <div className="flex gap-1.5 items-end">
            {ids.map((sid, i) => {
              const s = SKILLS[sid];
              const cdIdx = i;
              const cd = hud.cds[cdIdx] ?? 0;
              return (
                <button key={sid} onClick={() => engineRef.current?.usaSkill(sid)}
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center transition ${cd > 0 ? "border-white/10 bg-black/70" : "border-amber-400/60 bg-black/60 hover:border-amber-300"}`}>
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span className="text-[7px] text-slate-300 font-bold leading-none mt-0.5">{s.nome.split(" ")[0]}</span>
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded bg-black/85 text-[9px] font-black text-amber-300 flex items-center justify-center border border-amber-400/50">{i + 1}</span>
                  {cd > 0 && (
                    <span className="absolute inset-0 rounded-xl bg-black/70 flex items-center justify-center text-white font-black text-sm">{cd.toFixed(1)}</span>
                  )}
                </button>
              );
            })}
            <button onClick={() => engineRef.current?.pocao()} data-testid="bw-pocao"
              className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 border-rose-400/60 bg-black/60 flex flex-col items-center justify-center">
              <span className="text-xl leading-none">🧪</span>
              <span className="text-[7px] text-rose-200 font-bold">Q</span>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded bg-black/85 text-[9px] font-black text-rose-300 flex items-center justify-center border border-rose-400/50">{hud.pocoes}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── toasts de nível/loot ── */}
      <AnimatePresence>
        {nivelToast > 0 && (
          <motion.div data-testid="bw-levelup" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
            <div className="font-display text-4xl font-black bg-gradient-to-b from-amber-200 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(245,158,11,0.6)]">NÍVEL {nivelToast}!</div>
            <div className="text-amber-200 text-sm font-bold">+8 HP máximo · cura total</div>
          </motion.div>
        )}
        {lootToast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-24 right-2 z-30 pointer-events-none">
            <div className="rounded-lg bg-black/70 border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: ["#d4d4d8", "#4ade80", "#60a5fa", "#c084fc"][lootToast.rar], color: ["#d4d4d8", "#4ade80", "#60a5fa", "#c084fc"][lootToast.rar] }}>
              🎁 {lootToast.txt}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── botões utilitários ── */}
      <div className="absolute top-2 right-36 z-20 flex gap-1">
        <button onClick={() => setShowInv(v => !v)} className="rounded-lg bg-black/60 border border-white/15 p-1.5 text-slate-200" aria-label="Mochila">
          <Backpack className="h-4 w-4" />
        </button>
        <button onClick={sair} className="rounded-lg bg-black/60 border border-white/15 p-1.5 text-rose-300" aria-label="Sair">
          <X className="h-4 w-4" />
        </button>
      </div>
      {npcPerto && !dlgNpc && (
        <button onClick={() => setDlgNpc("Aldeia Aurora")} className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 rounded-xl bg-amber-500 text-black font-black text-xs px-4 py-2 shadow-lg animate-pulse">
          💬 Falar com os NPCs da aldeia (E)
        </button>
      )}

      {/* ── inventário ── */}
      {showInv && (
        <div className="absolute top-14 right-2 z-30 w-60 rounded-xl bg-black/85 backdrop-blur border border-white/15 p-3">
          <div className="flex items-center justify-between">
            <div className="text-white font-black text-xs flex items-center gap-1"><Backpack className="h-3.5 w-3.5" /> MOCHILA</div>
            <button onClick={() => setShowInv(false)}><X className="h-3.5 w-3.5 text-slate-400" /></button>
          </div>
          {inventario.length === 0 ? (
            <div className="text-[10px] text-slate-400 mt-2">Vazia. Caça mobs — 22% largam peças!</div>
          ) : (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {inventario.map((it, i) => (
                <div key={i} className="text-[10px] font-bold rounded px-2 py-1 bg-white/5" style={{ color: ["#d4d4d8", "#4ade80", "#60a5fa", "#c084fc"][it.raridade] }}>
                  {it.nome}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── diálogo do NPC (quests/loja/cura) ── */}
      <AnimatePresence>
        {dlgNpc && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-md rounded-2xl bg-[#101820]/95 backdrop-blur border border-amber-400/30 p-4">
            <div className="flex items-center justify-between">
              <div className="font-black text-amber-300 text-sm flex items-center gap-1"><Sparkles className="h-4 w-4" /> Aldeia Aurora — NPCs</div>
              <button onClick={() => setDlgNpc(null)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="mt-3 space-y-2 max-h-52 overflow-y-auto">
              {/* quest atual: entregar ou próxima disponível */}
              {questAtiva && questCompletavel && (
                <button onClick={completaQuest} data-testid="bw-quest-complete" className="w-full text-left rounded-xl bg-emerald-600/20 border border-emerald-400/40 px-3 py-2 hover:bg-emerald-600/30">
                  <div className="text-[11px] font-black text-emerald-300">✔ Entregar: {questAtiva.titulo}</div>
                  <div className="text-[10px] text-emerald-200/80">+{questAtiva.xp} XP · +{questAtiva.ouro} ouro · recompensa!</div>
                </button>
              )}
              {QUESTS.filter(q => !concluidas.includes(q.id) && q.id !== questAtiva?.id && (!q.preRequisito || concluidas.includes(q.preRequisito)) && (hud?.nivel ?? 1) >= q.minNivel && !questAtiva).map(q => (
                <button key={q.id} onClick={() => aceitaQuest(q)} data-testid="bw-quest-accept" className="w-full text-left rounded-xl bg-white/5 border border-white/15 px-3 py-2 hover:bg-white/10">
                  <div className="text-[11px] font-black text-amber-200">❗ {q.titulo}</div>
                  <div className="text-[10px] text-slate-300">{q.npc} · nv {q.minNivel}+ · {q.objetivos.length ? q.objetivos.map(o => `${o.quantos}× ${mobPorId(o.mob).nome}`).join(", ") : "entrega"} · +{q.xp} XP</div>
                </button>
              ))}
              {/* sacerdote */}
              <button onClick={() => { engineRef.current?.curaTotal(); setDlgNpc(null); }} className="w-full text-left rounded-xl bg-white/5 border border-white/15 px-3 py-2 hover:bg-white/10">
                <div className="text-[11px] font-black text-sky-200">✨ Sacerdote Alva — Cura completa (grátis)</div>
                <div className="text-[10px] text-slate-300">Restaura HP e MP na hora.</div>
              </button>
              {/* mercador */}
              <button onClick={() => { engineRef.current?.comprarPocao(); }} className="w-full text-left rounded-xl bg-white/5 border border-white/15 px-3 py-2 hover:bg-white/10">
                <div className="text-[11px] font-black text-yellow-200">💰 Mercador Tila — Poção de vida (25 ouro)</div>
                <div className="text-[10px] text-slate-300">+1 poção (máx 9). Usa com Q.</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ecrã de morte (REA: ressurreição) ── */}
      {morto && (
        <div data-testid="bw-death" className="absolute inset-0 z-40 bg-red-950/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <Skull className="h-16 w-16 text-rose-400" />
            <div className="font-display text-4xl font-black text-rose-300 mt-3">Morreste</div>
            <div className="text-rose-200/80 text-xs mt-1 text-center max-w-xs">O Sacerdote Alva chama a tua alma de volta à Aldeia Aurora. Perdes nada além do orgulho.</div>
            {hud && hud.morteT !== null && hud.morteT > 0 ? (
              <div className="mt-5 text-rose-200 font-black text-lg">{Math.ceil(hud.morteT)}s…</div>
            ) : (
              <button data-testid="bw-respawn" onClick={() => { engineRef.current?.ressuscitar(); setMorto(false); }}
                className="mt-5 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black shadow-[0_8px_30px_rgba(245,158,11,0.4)] hover:scale-105 transition">
                ✨ RESSUSCITAR
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* ── controlos móveis: joystick + botões ── */}
      <div className="sm:hidden">
        <div ref={joyRef}
          onPointerDown={joyTouch} onPointerMove={e => { if (joyVec.ativo) joyTouch(e); }} onPointerUp={joySolta} onPointerLeave={joySolta}
          className="absolute bottom-24 left-4 z-30 w-28 h-28 rounded-full bg-white/5 border border-white/20 touch-none">
          <div className="absolute w-12 h-12 rounded-full bg-white/25 border border-white/40" style={{ left: 40 + joyVec.x * 30, top: 40 + joyVec.z * 30 }} />
        </div>
        <div
          onPointerDown={camTouchStart} onPointerMove={camTouchMove} onPointerUp={camTouchEnd} onPointerLeave={camTouchEnd}
          className="absolute bottom-24 right-4 z-30 w-28 h-28 rounded-full bg-white/5 border border-white/20 touch-none flex items-center justify-center text-white/40 text-[9px] font-bold text-center pointer-events-auto">
          arrasta<br />para rodar
        </div>
        <button onClick={() => engineRef.current?.ataqueInstantaneo()}
          className="absolute bottom-56 right-6 z-30 w-16 h-16 rounded-full bg-rose-600/85 border-2 border-rose-300 text-white font-black text-[10px] touch-none">
          ATACAR
        </button>
      </div>

      {/* dica de zona no início */}
      {hud && hud.nivel === 1 && !questAtiva && (
        <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
          <div className="rounded-xl bg-black/60 border border-amber-400/30 px-4 py-2 text-[11px] text-amber-100 font-bold">
            <MapPin className="inline h-3 w-3 mr-1" /> Vai a sul/este até a <span className="text-amber-300">Floresta da Guarda</span> (nv 1–8) e clica nos mobs para atacar!
          </div>
        </div>
      )}
    </div>
  );
}
