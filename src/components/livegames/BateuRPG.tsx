// ============================================================
// BATEU RPG: LENDAS DA ARENA — Interface (100% português)
// ────────────────────────────────────────────────────────────
// v63 — RECONSTRUÇÃO COMPLETA a pedido do utilizador: o RPG voxel
// estilo «Minecraft» foi APAGADO e substituído por um MMO de arena
// em VISTA DE TOPO estilo League of Legends com multi-jogador REAL
// estilo hordes.io (servidor autoritativo em server/arena-servidor.mjs).
//
// Menu: seleção de campeão (4 heróis, papéis LoL) + nome.
// Jogo: HUD estilo LoL — vida/mana, barra QWER com cooldowns,
// minimapa, chat da arena, loja na fonte, morte/respawn, estado
// HONESTO do servidor (online × solo — nunca finge multi).
// Móvel: joystick + botões de habilidade.
// ============================================================
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Coins, Crosshair, Heart, Map as MapIcon, Pause, Play, Shield, Skull, Sparkles, Store, Swords, Users, Volume2, VolumeX, Zap, X, ChevronUp } from "lucide-react";
import { MotorArena, type EstadoHud, type AvisosMotor } from "@/game/arena/motor.ts";
import { RedeArena, type EstadoMp } from "@/game/arena/mp.ts";
import { somGlobal } from "@/game/som.ts";
import {
  CAMPEOES, IDs_CAMPEOES, IDS_ITENS, ITENS,
  type CampeaoId, type SlotHabilidade,
} from "@/game/arena/core.ts";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onScore?: (score: number) => void;
  onExit?: () => void;
}

// ── Save do aparelho (honesto:IndexedDB não é preciso — payload pequeno) ──
const LS_SAVE = "bateu_arena_save";
interface SaveArena { nome: string; campeao: CampeaoId; xpTotal: number; essencia: number; itens: Record<string, number>; abates: number; ts: number }
function lerSave(): SaveArena | null {
  try {
    const raw = localStorage.getItem(LS_SAVE);
    if (!raw) return null;
    const p = JSON.parse(raw) as SaveArena;
    if (!IDs_CAMPEOES.includes(p.campeao)) return null;
    return { ...p, xpTotal: Math.max(0, p.xpTotal | 0), essencia: Math.max(0, p.essencia | 0), abates: Math.max(0, p.abates | 0), itens: p.itens && typeof p.itens === "object" ? p.itens : {} };
  } catch { return null; }
}
function guardarSave(s: SaveArena): void {
  try { localStorage.setItem(LS_SAVE, JSON.stringify({ ...s, ts: Date.now() })); } catch { /* honesto: sem espaço */ }
}

const ehToque = typeof window !== "undefined" && ("ontouchstart" in window || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

// ── Contrato E2E tipado (padrão v60 — o compilador prova) ─────
type GanchosArena = ReturnType<MotorArena["ganchos"]>;
declare global {
  interface Window { __arena?: GanchosArena }
}

interface MsgChat { nome: string; texto: string; meu?: boolean; sistema?: boolean }
interface Toast { id: number; texto: string; tipo: "nivel" | "matou" | "erro" | "cura" | "corrigido" }

// v67 SOM: efeitos da arena disparam dos AVISOS do motor + escutas da rede — ver MotorSom
const SOM_ARENA_MUSICA = "arena" as const;

const SLOTS: SlotHabilidade[] = ["Q", "W", "E", "R"];

// ═══════════════════════════════════════════════════════════════
export default function BateuRPG({ onScore, onExit }: Props) {
  const { t } = useLanguage();
  const [fase, setFase] = useState<"menu" | "jogando">("menu");
  const [save, setSave] = useState<SaveArena | null>(() => lerSave());
  const [campeao, setCampeao] = useState<CampeaoId>(() => lerSave()?.campeao ?? "kaimu");
  const [nome, setNome] = useState<string>(() => lerSave()?.nome ?? "");
  const [hud, setHud] = useState<EstadoHud | null>(null);
  const [mpEstado, setMpEstado] = useState<EstadoMp | null>(null);
  const [chat, setChat] = useState<MsgChat[]>([]);
  const [chatAberto, setChatAberto] = useState(false);
  const [chatTexto, setChatTexto] = useState("");
  const [lojaAberta, setLojaAberta] = useState(false);
  const [pausa, setPausa] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flashDano, setFlashDano] = useState(0);
  const [nivelToast, setNivelToast] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const motorRef = useRef<MotorArena | null>(null);
  const redeRef = useRef<RedeArena | null>(null);
  const chatFimRef = useRef<HTMLDivElement | null>(null);
  const toastSeq = useRef(1);
  const rafMini = useRef(0);
  const chatAbertoRef = useRef(false);
  chatAbertoRef.current = chatAberto;

  const pushToast = useCallback((texto: string, tipo: Toast["tipo"]) => {
    const id = toastSeq.current++;
    setToasts((at) => [...at.slice(-3), { id, texto, tipo }]);
    window.setTimeout(() => setToasts((at) => at.filter((x) => x.id !== id)), 2600);
  }, []);

  // ── v67 SOM ──
  const [mudo, setMudo] = useState(() => somGlobal().estaMudo());
  const alternarSom = useCallback(() => {
    const som = somGlobal();
    som.despertar();
    som.definirMudo(!som.estaMudo());
    setMudo(som.estaMudo());
    som.tocar("ui");
  }, []);
  // despertar no 1.º gesto (política de autoplay) + gancho honesto p/ testes + música do JOGO
  useEffect(() => {
    const som = somGlobal();
    window.__som = som;
    const gesto = () => som.despertar();
    window.addEventListener("pointerdown", gesto);
    window.addEventListener("keydown", gesto);
    return () => {
      window.removeEventListener("pointerdown", gesto);
      window.removeEventListener("keydown", gesto);
      som.musica(null);
      som.pararLoops();
      window.__som = undefined;
    };
  }, []);
  useEffect(() => {
    if (fase === "jogando") somGlobal().musica(SOM_ARENA_MUSICA);
  }, [fase]);

  // ── ciclo de vida do jogo ─────────────────────────────────────
  useEffect(() => {
    if (fase !== "jogando" || !canvasRef.current) return;
    const s = lerSave();
    const nomeHeroi = s?.nome || `Herói-${100 + Math.floor(Math.random() * 900)}`;
    const idCanvas = canvasRef.current;

    // rede: tenta SEMPRE ligar ao servidor da arena (honesto se falhar → solo)
    const rede = new RedeArena();
    redeRef.current = rede;
    const mp: RedeArena | null = rede;

    const motor = new MotorArena({
      canvas: idCanvas,
      nome: nomeHeroi,
      campeao,
      nivelInicial: s?.xpTotal ? Math.max(1, nivelAproximada(s.xpTotal)) : 1,
      xpInicial: s?.xpTotal ?? 0,
      essenciaInicial: s?.essencia ?? 0,
      itens: s?.itens ?? {},
      abatesInicial: s?.abates ?? 0,
      rede: mp,
      aoHud: (e) => setHud(e),
      aoAviso: (a: AvisosMotor) => {
        if (a.danoRecebido > 0) { setFlashDano(Date.now()); somGlobal().tocar("arenaGolpe"); } // v67
        if (a.subiuNivel) {
          setNivelToast(Date.now());
          somGlobal().tocar("arenaNivel"); // v67
          pushToast(t("arena.subiuNivel", { n: String(motorRef.current?.estadoHud().nivel ?? "") }), "nivel");
        }
        if (a.matou) { somGlobal().tocar("arenaAbate"); pushToast(t("arena.matou", { mob: t(`arena.mob.${a.matou}`) }), "matou"); } // v67
        if (a.cura > 0) { somGlobal().tocar("arenaCura"); pushToast(`+${Math.round(a.cura)}`, "cura"); } // v67
        if (a.erroHabilidade === "mana") { somGlobal().tocar("erro"); pushToast(t("arena.erro.mana"), "erro"); } // v67
        if (a.erroHabilidade === "cd") { somGlobal().tocar("erro"); pushToast(t("arena.erro.cd"), "erro"); } // v67
      },
      aoGolpeMob: (id, dano, x, z) => { somGlobal().tocar("arenaAcerto"); rede.reportarGolpe(id, dano, x, z); }, // v67: o MEU golpe acertou
      aoMorte: () => { /* o motor já avisa a rede */ },
      aoReviver: () => { /* o motor já renasce com a posição real */ },
    });
    motorRef.current = motor;
    window.__arena = motor.ganchos();

    // escutas da rede → motor + chat
    rede.definirEscutas({
      aoSnapshot: (j, m) => motor.aplicarSnapshot(j, m),
      aoFere: (dano, x, z) => motor.receberFere(dano, x, z),
      aoGolpeMob: (alvoId, dano, x, z) => motor.receberGolpeMob(alvoId, dano, x, z),
      aoMobMorte: (id, tipo, assassino, xp, essencia) => motor.receberMobMorte(id, tipo, assassino, xp, essencia),
      aoFala: (nomeMsg, texto) => {
        setChat((at) => [...at.slice(-40), { nome: nomeMsg, texto }]);
        if (nomeMsg !== nomeHeroi) somGlobal().tocar("arenaChat"); // v67: mensagem dos OUTROS
      },
      aoMudancaEstado: (e) => setMpEstado(e),
      aoCorrigido: (motivo) => pushToast(t("arena.corrigido", { motivo }), "corrigido"),
      // ── v64 PvP ──
      aoEu: (eu) => motor.receberEu(eu),
      aoMorteHeroi: (id, vitima, nomeAssassino) => {
        motor.receberMorteHeroi(id, vitima, nomeAssassino);
        if (vitima === nomeHeroi) somGlobal().tocar("arenaMorte"); // v67: EU morri
        setChat((at) => [...at.slice(-40), {
          nome: "Arena",
          texto: nomeAssassino ? t("arena.pvp.abateu", { a: nomeAssassino, v: vitima }) : t("arena.pvp.mobsAbateu", { v: vitima }),
          sistema: true,
        }]);
      },
      aoRenasceuHeroi: (id, x, z) => {
        motor.receberRenasceuHeroi(id, x, z);
        if (id === rede.meuId()) somGlobal().tocar("arenaRespawn"); // v67: EU renasci
      },
      aoAbatePvp: (vitima, essencia, _xp, _abates) => {
        somGlobal().tocar("arenaAbate"); // v67
        pushToast(t("arena.pvp.abateste", { v: vitima, e: String(essencia) }), "matou");
      },
      aoGolpeHeroi: (alvoId, dano, x, z, de) => motor.receberGolpeHeroi(alvoId, dano, x, z, de),
    });
    rede.ligar(RedeArena.urlPadrao(), {
      nome: nomeHeroi, campeao,
      nivel: motor.paraSave().nivel,
      xpTotal: s?.xpTotal ?? 0,
      essencia: s?.essencia ?? 0,
      itens: s?.itens ?? {},
      abates: s?.abates ?? 0,
    });
    setChat((at) => [...at, { nome: "Arena", texto: RedeArena.urlPadrao() }]);

    // minimapa no próprio rAF
    const desenharMini = () => {
      const mini = miniRef.current;
      if (mini && motorRef.current && !motorRef.current.estaDestruido()) {
        const ctx = mini.getContext("2d");
        if (ctx) motorRef.current.desenharMinimapa(ctx, mini.width);
      }
      rafMini.current = requestAnimationFrame(desenharMini);
    };
    rafMini.current = requestAnimationFrame(desenharMini);

    // teclas globais da UI (B loja · Enter chat · Esc pausa)
    const aoTecla = (ev: KeyboardEvent) => {
      if (chatAbertoRef.current) return;
      const k = ev.key.toLowerCase();
      if (k === "b") { setLojaAberta((v) => !v); ev.preventDefault(); }
      if (k === "enter") { setChatAberto(true); ev.preventDefault(); }
      if (k === "escape") { setPausa((v) => !v); }
    };
    window.addEventListener("keydown", aoTecla);

    // autosave honesto a cada 10 s
    const autosave = window.setInterval(() => {
      const st = motorRef.current?.paraSave();
      if (st) guardarSave({ nome: nomeHeroi, campeao, xpTotal: st.xpTotal, essencia: st.essencia, itens: st.itens, abates: st.abates, ts: Date.now() });
    }, 10_000);

    return () => {
      window.removeEventListener("keydown", aoTecla);
      cancelAnimationFrame(rafMini.current);
      const st = motorRef.current?.paraSave();
      if (st) guardarSave({ nome: nomeHeroi, campeao, xpTotal: st.xpTotal, essencia: st.essencia, itens: st.itens, abates: st.abates, ts: Date.now() });
      const creditos = st?.abates ?? 0;
      rede.sair();
      motorRef.current?.destruir();
      motorRef.current = null;
      window.__arena = undefined;
      if (onScore) onScore(creditos);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  useEffect(() => { chatFimRef.current?.scrollIntoView({ block: "end" }); }, [chat]);

  const sair = useCallback(() => {
    setFase("menu");
    setHud(null);
    setChat([]);
    setLojaAberta(false);
    setPausa(false);
    if (onExit) onExit();
  }, [onExit]);

  const enviarFala = useCallback(() => {
    const texto = chatTexto.trim();
    setChatTexto("");
    if (!texto) { setChatAberto(false); return; }
    const meu = lerSave()?.nome || "Herói";
    const enviado = redeRef.current?.falar(texto) ?? false;
    setChat((at) => [...at.slice(-40), { nome: meu, texto, meu: true }]);
    if (!enviado && mpEstado?.estado !== "online") {
      pushToast(t("arena.modoSolo"), "corrigido");
    }
    setChatAberto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTexto, mpEstado]);

  // ═══════════════════════ MENU ═══════════════════════
  if (fase === "menu") {
    const s = save;
    return (
      <div className="fixed inset-0 z-[80] bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 overflow-y-auto" data-testid="arena-menu">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
          <button onClick={sair} className="self-start flex items-center gap-2 text-slate-300 hover:text-white mb-4" data-testid="arena-menu-voltar">
            <X className="w-5 h-5" /> {t("arena.sair")}
          </button>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-center bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow">
            {t("arena.titulo")}
          </h1>
          <p className="mt-3 max-w-2xl text-center text-slate-300 text-sm sm:text-base">{t("arena.menu.sub")}</p>
          <p className="mt-1 max-w-2xl text-center text-[11px] text-slate-400">{t("arena.menu.mundo")}</p>

          <h2 className="mt-6 text-lg font-bold text-amber-200">{t("arena.escolher")}</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-5xl">
            {IDs_CAMPEOES.map((id) => {
              const c = CAMPEOES[id];
              const sel = campeao === id;
              return (
                <button
                  key={id}
                  onClick={() => setCampeao(id)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${sel ? "border-amber-400 bg-amber-400/10 scale-[1.02]" : "border-white/10 bg-white/5 hover:border-white/25"}`}
                  data-testid={`arena-campeao-${id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.cor }}>
                      <Swords className="w-5 h-5 text-white" />
                    </span>
                    <div>
                      <div className="font-black text-white">{c.nome}</div>
                      <div className="text-[11px] text-slate-300">{t(`arena.papel.${c.papel}`)}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-300 italic">“{t(`arena.hist.${id}`)}”</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                    <span>{Math.round(c.hp + c.hpPorNivel * 9)} HP</span>
                    <span>{Math.round(c.mp + c.mpPorNivel * 9)} MP</span>
                    <span>{c.velocidade} vel</span>
                    <span>{c.alcanceAtaque <= 3 ? "melee" : `${c.alcanceAtaque} alc`}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {SLOTS.map((sl) => (
                      <div key={sl} className="flex items-center gap-1.5 text-[10px] text-slate-200">
                        <span className="w-4 h-4 rounded bg-slate-800 border border-slate-600 grid place-items-center font-bold text-amber-300">{sl}</span>
                        <span className="truncate">{t(`arena.hab.${id}.${sl}`)}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xl">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, 16))}
              placeholder={t("arena.nome")}
              className="flex-1 w-full rounded-xl bg-slate-900/80 border border-white/15 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
              data-testid="arena-nome"
            />
            <button
              onClick={() => {
                const s2: SaveArena = {
                  nome: nome.trim() || `Herói-${100 + Math.floor(Math.random() * 900)}`,
                  campeao,
                  xpTotal: s?.xpTotal ?? 0,
                  essencia: s?.essencia ?? 0,
                  itens: s?.itens ?? {},
                  abates: s?.abates ?? 0,
                  ts: Date.now(),
                };
                guardarSave(s2);
                setSave(s2);
                somGlobal().despertar(); // v67: o «entrar» é o gesto que nasce o AudioContext
                setFase("jogando");
              }}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 font-black text-white hover:brightness-110 active:scale-95"
              data-testid="arena-entrar"
            >
              <span className="inline-flex items-center gap-2"><Play className="w-5 h-5" /> {t("arena.entrar")}</span>
            </button>
          </div>

          {s && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300" data-testid="arena-save">
              <span className="inline-flex items-center gap-1"><ChevronUp className="w-3.5 h-3.5 text-amber-300" /> {t("arena.nivel")} {nivelAproximada(s.xpTotal)}</span>
              <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-300" /> {s.essencia} {t("arena.essencia")}</span>
              <span className="inline-flex items-center gap-1"><Skull className="w-3.5 h-3.5 text-rose-300" /> {s.abates} {t("arena.abates")}</span>
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-500 max-w-lg text-center">{t("arena.menu.nota")}</p>
          <p className="mt-1 text-[11px] text-fuchsia-300/80 max-w-lg text-center" data-testid="arena-pvp-nota">{t("arena.pvp.nota")}</p>
          {/* v67 SOM: botão honesto — o estado vive no aparelho */}
          <div className="mt-3 flex justify-center">
            <button onClick={alternarSom} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10" data-testid="arena-som">
              {mudo ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
              {t(mudo ? "som.ligar" : "som.desligar")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════ JOGO ═══════════════════════
  const def = CAMPEOES[campeao];
  const mpOn = mpEstado?.estado === "online";
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 select-none" data-testid="arena-jogo">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" data-testid="arena-canvas" />

      {/* flash de dano */}
      {flashDano > 0 && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px 30px rgba(220,38,38,0.45)", animation: "arena-fade 0.5s forwards" }} />}

      {/* ── HUD topo-esquerda: nível/XP/essência/abates ── */}
      {hud && (
        <div className="absolute top-2 left-2 flex items-center gap-2" data-testid="arena-hud">
          <div className="relative w-12 h-12 rounded-full bg-slate-900/85 border-2 border-amber-400 grid place-items-center">
            <span className="text-lg font-black text-amber-300">{hud.nivel}</span>
            <svg className="absolute -bottom-0.5 -right-0.5 w-5 h-5" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="5" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="#fbbf24" strokeWidth="5"
                strokeDasharray={`${(hud.xpNoNivel / Math.max(1, hud.xpParaSubirNivel)) * 94} 94`} transform="rotate(-90 18 18)"
              />
            </svg>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-1.5 text-xs text-white">
            <div className="font-bold">{hud.nome}</div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1"><Coins className="w-3 h-3 text-amber-300" /> {hud.essencia}</span>
              <span className="inline-flex items-center gap-1"><Skull className="w-3 h-3 text-rose-300" /> {hud.abates}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── HUD topo-direita: estado do servidor HONESTO ── */}
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1" data-testid="arena-hud-status">
        <div className={`rounded-full px-3 py-1 text-[11px] font-bold border ${mpOn ? "bg-emerald-900/80 border-emerald-500/50 text-emerald-200" : mpEstado?.estado === "a_ligar" ? "bg-sky-900/80 border-sky-500/50 text-sky-200" : "bg-slate-900/80 border-white/20 text-slate-300"}`}>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {mpOn ? t("arena.online", { n: String(mpEstado?.jogadores ?? 1) }) : mpEstado?.estado === "a_ligar" ? t("arena.aLigar") : t("arena.modoSolo")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          {mpOn && <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3" /> {t("arena.ping", { ms: String(mpEstado?.latencia ?? 0) })}</span>}
          <span>{hud?.fps ?? 0} fps</span>
          <button onClick={() => setPausa(true)} className="rounded bg-slate-900/80 border border-white/15 p-1 hover:bg-slate-800" data-testid="arena-pausa-btn" aria-label="pausa">
            <Pause className="w-3.5 h-3.5 text-slate-200" />
          </button>
          <button onClick={sair} className="rounded bg-slate-900/80 border border-white/15 p-1 hover:bg-slate-800" data-testid="arena-sair-btn" aria-label={t("arena.sair")}>
            <X className="w-3.5 h-3.5 text-slate-200" />
          </button>
        </div>
      </div>

      {/* ── fonte: regeneração visível ── */}
      {hud?.emFonte && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-sky-900/80 border border-sky-400/40 px-3 py-1 text-[11px] text-sky-200 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> {t("arena.fonte")}
        </div>
      )}

      {/* ── toasts ── */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        {toasts.map((tt) => (
          <div key={tt.id} className={`rounded-full px-3 py-1 text-xs font-bold border ${tt.tipo === "nivel" ? "bg-amber-500/90 border-amber-300 text-white" : tt.tipo === "matou" ? "bg-emerald-600/90 border-emerald-300 text-white" : tt.tipo === "erro" ? "bg-rose-900/85 border-rose-400/60 text-rose-100" : "bg-slate-900/85 border-white/20 text-slate-200"}`}>
            {tt.texto}
          </div>
        ))}
      </div>

      {/* ── barra QWER estilo LoL (fundo-centro) ── */}
      {hud && !ehToque && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" data-testid="arena-barra">
          <div className="flex gap-1.5">
            {SLOTS.map((sl) => {
              const h = def.habilidades[sl];
              const cd = hud.cds[sl];
              const pronto = cd <= 0 && hud.mp >= h.mana;
              return (
                <button
                  key={sl}
                  onClick={() => motorRef.current?.usarHabilidade(sl)}
                  className={`relative w-12 h-12 rounded-lg border-2 overflow-hidden ${pronto ? "border-amber-400 bg-slate-900/85" : "border-slate-600 bg-slate-900/85"}`}
                  data-testid={`arena-hab-${sl.toLowerCase()}`}
                  title={t(`arena.hab.${campeao}.${sl}`)}
                >
                  <span className={`absolute inset-0 grid place-items-center text-lg font-black ${pronto ? "text-amber-300" : "text-slate-500"}`}>{sl}</span>
                  {cd > 0 && (
                    <>
                      <span className="absolute inset-0 bg-black/60" style={{ clipPath: `inset(0 0 ${(cd / Math.max(0.01, h.cd)) * 100}% 0)` }} />
                      <span className="absolute inset-0 grid place-items-center text-white text-sm font-bold">{cd.toFixed(cd < 3 ? 1 : 0)}</span>
                    </>
                  )}
                  <span className="absolute bottom-0 right-0.5 text-[9px] text-sky-300 font-bold">{h.mana}</span>
                </button>
              );
            })}
          </div>
          {/* vida / mana */}
          <div className="w-64 space-y-1" data-testid="arena-barras">
            <div className="h-4 rounded-full bg-slate-900/85 border border-white/15 overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${(hud.hp / Math.max(1, hud.hpMax)) * 100}%` }} />
              {hud.escudo > 0 && <div className="absolute inset-y-0 left-0 bg-slate-200/70" style={{ width: `${Math.min(100, (hud.escudo / Math.max(1, hud.hpMax)) * 100)}%` }} />}
              <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white drop-shadow">{hud.hp} / {hud.hpMax}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-900/85 border border-white/15 overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400" style={{ width: `${(hud.mp / Math.max(1, hud.mpMax)) * 100}%` }} />
              <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-white drop-shadow">{hud.mp} / {hud.mpMax}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── minimapa (fundo-direita, estilo LoL) ── */}
      <div className="absolute bottom-3 right-3 rounded-lg overflow-hidden border-2 border-amber-500/70 bg-slate-950/90" data-testid="arena-minimapa">
        <canvas ref={miniRef} width={168} height={168} className="block" />
        <div className="absolute top-0.5 left-1 text-[9px] font-bold text-amber-300/90 tracking-wide inline-flex items-center gap-1"><MapIcon className="w-2.5 h-2.5" />{t("arena.minimapa")}</div>
      </div>

      {/* ── botão loja (desktop, junto ao minimapa) ── */}
      {!ehToque && (
        <button
          onClick={() => setLojaAberta((v) => !v)}
          className={`absolute bottom-[190px] right-3 rounded-lg border px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 ${hud?.emFonte ? "border-amber-400 bg-amber-500/20 text-amber-200" : "border-white/15 bg-slate-900/85 text-slate-300"}`}
          data-testid="arena-loja-btn"
        >
          <Store className="w-4 h-4" /> {t("arena.loja")} <span className="text-[9px] opacity-70">B</span>
        </button>
      )}

      {/* ── chat (fundo-esquerda) ── */}
      <div className="absolute bottom-3 left-3 w-64 flex flex-col gap-1" data-testid="arena-chat">
        <div className="max-h-28 overflow-y-auto rounded-lg bg-slate-950/70 border border-white/10 px-2 py-1.5 text-[11px] space-y-0.5">
          {chat.length === 0 && <div className="text-slate-500 italic">{t("arena.chat.dica")}</div>}
          {chat.map((m, i) => (
            <div key={i} className={m.sistema ? "text-fuchsia-300 font-semibold" : m.meu ? "text-amber-200" : m.nome === "Arena" ? "text-sky-300" : "text-slate-200"}>
              {m.sistema ? <span data-testid="arena-killfeed">{m.texto}</span> : <><b>{m.nome}:</b> {m.texto}</>}
            </div>
          ))}
          <div ref={chatFimRef} />
        </div>
        {chatAberto ? (
          <form onSubmit={(e) => { e.preventDefault(); enviarFala(); }}>
            <input
              autoFocus
              value={chatTexto}
              onChange={(e) => setChatTexto(e.target.value.slice(0, 120))}
              onBlur={() => setChatAberto(false)}
              placeholder={t("arena.chat.placeholder")}
              className="w-full rounded-lg bg-slate-900/90 border border-white/20 px-2 py-1.5 text-[11px] text-white outline-none focus:border-amber-400"
              data-testid="arena-chat-input"
            />
          </form>
        ) : (
          <button onClick={() => setChatAberto(true)} className="self-start rounded-lg bg-slate-900/80 border border-white/15 px-2 py-1 text-[10px] text-slate-400 hover:text-white">
            {t("arena.chat.dica")}
          </button>
        )}
      </div>

      {/* ── morte / respawn ── */}
      {hud?.morto && (
        <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-sm grid place-items-center pointer-events-none" data-testid="arena-morte">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-4xl font-black text-rose-200"><Skull className="w-10 h-10" /> {t("arena.morte")}</div>
            {hud.mortePor ? (
              <div className="mt-1 text-rose-200/90 text-sm" data-testid="arena-morte-por">{t("arena.pvp.mortePor", { a: hud.mortePor })}</div>
            ) : null}
            <div className="mt-2 text-white/80">{t("arena.renascerEm", { s: String(Math.ceil(hud.respawnFalta)) })}</div>
          </div>
        </div>
      )}

      {/* ── loja ── */}
      {lojaAberta && (
        <div className="absolute inset-0 bg-slate-950/80 grid place-items-center p-4" data-testid="arena-loja">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-amber-300 inline-flex items-center gap-2"><Store className="w-5 h-5" /> {t("arena.loja.titulo")}</h3>
              <button onClick={() => setLojaAberta(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {!hud?.emFonte && <p className="mt-2 text-xs text-rose-300">{t("arena.loja.perto")}</p>}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {IDS_ITENS.map((id) => {
                const it = ITENS[id];
                const custo = motorRef.current?.custoVisivel(id) ?? it.custo;
                const ja = motorRef.current?.itensCount(id) ?? 0;
                const maxAtingido = ja >= it.max;
                const semEss = (hud?.essencia ?? 0) < custo;
                return (
                  <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{t(`arena.item.${id}`)}</span>
                      <span className="text-[10px] text-slate-400">{ja}/{it.max}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">{t(`arena.itemd.${id}`)}</p>
                    <button
                      onClick={() => {
                        const ok = motorRef.current?.comprar(id) ?? false;
                        if (!ok && !maxAtingido && !semEss) pushToast(t("arena.loja.perto"), "erro");
                        if (!ok && maxAtingido) pushToast(t("arena.loja.max"), "erro");
                        if (!ok && semEss && hud?.emFonte) pushToast(t("arena.loja.semEssencia"), "erro");
                      }}
                      disabled={!hud?.emFonte || maxAtingido || semEss}
                      className={`mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1 ${hud?.emFonte && !maxAtingido && !semEss ? "bg-amber-500 text-white hover:brightness-110" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                      data-testid={`arena-loja-${id}`}
                    >
                      <Coins className="w-3.5 h-3.5" /> {custo} {maxAtingido ? `· ${t("arena.loja.max")}` : ""}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── pausa / controlos ── */}
      {pausa && (
        <div className="absolute inset-0 bg-slate-950/85 grid place-items-center p-4" data-testid="arena-pausa">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5">
            <h3 className="text-xl font-black text-amber-300">{t("arena.pausa.titulo")}</h3>
            <div className="mt-3 space-y-1.5 text-sm text-slate-200">
              <p><b className="text-white">{t("arena.controlos.titulo")}</b></p>
              <p className="inline-flex items-center gap-2"><Crosshair className="w-4 h-4 text-slate-400" /> {t("arena.controlos.mover")}</p>
              <p className="inline-flex items-center gap-2"><Zap className="w-4 h-4 text-slate-400" /> {t("arena.controlos.habilidades")}</p>
              <p className="inline-flex items-center gap-2"><Swords className="w-4 h-4 text-slate-400" /> {t("arena.controlos.atacar")}</p>
              <p className="inline-flex items-center gap-2"><Heart className="w-4 h-4 text-slate-400" /> {t("arena.controlos.zoom")}</p>
              <p className="inline-flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> {t("arena.controlos.loja")}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => setPausa(false)} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white hover:brightness-110" data-testid="arena-pausa-continuar">{t("arena.pausa.continuar")}</button>
              <button onClick={sair} className="rounded-xl border border-white/20 px-4 py-2 text-slate-300 hover:bg-white/5">{t("arena.pausa.sair")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── controlos móveis ── */}
      {ehToque && hud && <ControlosMovel motorRef={motorRef} campeao={campeao} />}
      {ehToque && hud && (
        <div className="absolute bottom-[168px] left-3 w-32 space-y-1" data-testid="arena-barras-mobile">
          <div className="h-3.5 rounded-full bg-slate-900/85 border border-white/15 overflow-hidden relative">
            <div className="h-full bg-emerald-500" style={{ width: `${(hud.hp / Math.max(1, hud.hpMax)) * 100}%` }} />
          </div>
          <div className="h-2.5 rounded-full bg-slate-900/85 border border-white/15 overflow-hidden relative">
            <div className="h-full bg-sky-500" style={{ width: `${(hud.mp / Math.max(1, hud.mpMax)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* nível a subir — destaque grande */}
      {nivelToast > 0 && Date.now() - nivelToast < 2000 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-4xl font-black text-amber-300 drop-shadow-lg pointer-events-none" style={{ animation: "arena-pop 0.6s" }}>
          {t("arena.subiuNivel", { n: String(hud?.nivel ?? "") })}
        </div>
      )}
    </div>
  );
}

// ── Joystick + botões de habilidade para toque ──────────────────
function ControlosMovel({ motorRef, campeao }: { motorRef: RefObject<MotorArena | null>; campeao: CampeaoId }) {
  const { t } = useLanguage();
  const [centro, setCentro] = useState<{ x: number; y: number } | null>(null);
  const [ponto, setPonto] = useState<{ x: number; y: number } | null>(null);
  const zonaRef = useRef<HTMLDivElement | null>(null);

  const aoBaixo = (e: React.PointerEvent) => {
    const r = zonaRef.current!.getBoundingClientRect();
    setCentro({ x: e.clientX - r.left, y: e.clientY - r.top });
    setPonto({ x: e.clientX - r.left, y: e.clientY - r.top });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const aoMover = (e: React.PointerEvent) => {
    if (!centro) return;
    const r = zonaRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    setPonto({ x: px, y: py });
    const dx = px - centro.x, dy = py - centro.y;
    const d = Math.hypot(dx, dy);
    const fator = d > 48 ? 48 / d : 1;
    motorRef.current?.setJoystick((dx * fator) / 48, (dy * fator) / 48);
  };
  const aoLargar = () => { setCentro(null); setPonto(null); motorRef.current?.setJoystick(0, 0); };

  const def = CAMPEOES[campeao];
  return (
    <>
      <div
        ref={zonaRef}
        onPointerDown={aoBaixo}
        onPointerMove={aoMover}
        onPointerUp={aoLargar}
        onPointerCancel={aoLargar}
        className="absolute bottom-4 left-4 w-40 h-40 rounded-full bg-slate-900/35 border border-white/15 touch-none"
        data-testid="arena-joystick"
      >
        {centro && ponto && (
          <>
            <span className="absolute w-12 h-12 rounded-full bg-white/25 border border-white/40" style={{ left: centro.x - 24, top: centro.y - 24 }} />
            <span className="absolute w-8 h-8 rounded-full bg-white/60" style={{ left: ponto.x - 16, top: ponto.y - 16 }} />
          </>
        )}
        {!centro && <span className="absolute inset-0 grid place-items-center text-[10px] text-slate-300">↑←↓→</span>}
      </div>
      <div className="absolute bottom-4 right-4 grid grid-cols-2 gap-2 touch-none" data-testid="arena-botoes-mobile">
        {SLOTS.map((sl) => {
          const h = def.habilidades[sl];
          return (
            <button
              key={sl}
              onPointerDown={(e) => { e.preventDefault(); motorRef.current?.usarHabilidade(sl); }}
              className="w-14 h-14 rounded-full border-2 border-amber-400/80 bg-slate-900/80 text-amber-300 font-black text-lg active:scale-90"
            >
              {sl}
              <span className="block text-[8px] text-sky-300 font-bold">{h.mana}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// nível aproximado para o menu (a regra real é xpParaSubir)
function nivelAproximada(xpTotal: number): number {
  let nivel = 1, resto = xpTotal;
  while (nivel < 18) {
    const precisa = 90 + (nivel - 1) * 48;
    if (resto < precisa) break;
    resto -= precisa; nivel++;
  }
  return nivel;
}
