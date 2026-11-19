// ============================================================
// BATEU KART: CIRCUITO DAS LENDAS — Interface (v65)
// ────────────────────────────────────────────────────────────
// Kart racer estilo Mario Kart com CORRIDAS LONGAS (3 pistas de
// 1,5-2 km × 3-5 voltas) e GARAGEM: moedas ganhas em corrida
// melhoram o CARRO (motor, turbo, pneus, blindagem) e as ARMAS.
//
// Menu: pista (desbloqueada por nível) + voltas + garagem.
// Corrida: HUD arcade — posição, volta, velocímetro, item, moedas,
// minimapa, contagem 3-2-1-JÁ, «sentido contrário», pausa,
// resultados com payout.
// HONESTO: corrida contra 11 pilotos IA — corridas ONLINE são o
// passo futuro declarado (nada finge multiplayer).
// Móvel: botões grandes (◀ ▶ · acelerar · derrapar · item).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, CarFront, Check, ChevronUp, Coins, Flag, Gauge,
  Lock, Pause, Play, Timer, Trophy, Volume2, VolumeX, Wifi, Wrench, X, Zap,
} from "lucide-react";
import { MotorKart, type EstadoHudKart, type AvisosKart, type GanchosKart } from "@/game/kart/motor.ts";
import { RedeKart, type EstadoMpKart } from "@/game/kart/mp.ts";
import { adaptadorSomKart, somGlobal, type MotorSom } from "@/game/som.ts";
import {
  IDS_KARTS, IDS_MELHORIAS, PISTAS, KARTS, custoMelhoria, kartDesbloqueado,
  nivelDeXp, pistaPorId, recompensaCorrida, statsDe, validarSaveKart,
  type KartId, type MelhoriaId, type SaveKart,
} from "@/game/kart/core.ts";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  onScore?: (score: number) => void;
  onExit?: () => void;
}

interface InicioRede {
  meuId: number;
  pistaId: string;
  voltas: number;
  corredores: { id: number; nome: string; kart: string; cor: number; eJogador: boolean }[];
}

// ── Save do aparelho (honesto: o progresso é do dispositivo) ──
const LS_SAVE = "bateu_kart_save";
function lerSave(): SaveKart {
  try {
    const raw = localStorage.getItem(LS_SAVE);
    if (!raw) return validarSaveKart(null);
    return validarSaveKart(JSON.parse(raw));
  } catch { return validarSaveKart(null); }
}
function guardarSave(s: SaveKart): void {
  try { localStorage.setItem(LS_SAVE, JSON.stringify({ ...s, ts: Date.now() })); } catch { /* sem espaço — honesto */ }
}

const ehToque = typeof window !== "undefined" && ("ontouchstart" in window || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

declare global {
  interface Window { __kart?: GanchosKart; __som?: MotorSom }
}

interface Toast { id: number; texto: string; tipo: "item" | "golpe" | "info" | "turbo" }

const ICONES_ITEM: Record<string, string> = {
  cogumelo: "🍄", cogumelo3: "🍄×3", casca: "🟢", cascaAlvo: "🔴",
  oleo: "🛢️", missil: "🚀", raio: "⚡", escudo: "🛡️",
};

function melhoriasDe(s: SaveKart, kart: KartId): Partial<Record<MelhoriaId, number>> {
  const out: Partial<Record<MelhoriaId, number>> = {};
  for (const m of IDS_MELHORIAS) out[m] = s.melhorias[`${kart}.${m}`] ?? 0;
  return out;
}

const ORDEM = (p: number): string => `${p}º`;

// ═══════════════════════════════════════════════════════════════
export default function BateuKart({ onScore, onExit }: Props) {
  const { t } = useLanguage();
  const [fase, setFase] = useState<"menu" | "corrida">("menu");
  const [save, setSave] = useState<SaveKart>(() => lerSave());
  const [pistaSel, setPistaSel] = useState<string>(() => lerSave().kart === "cupim" ? "vulcao" : "praia");
  const [voltasSel, setVoltasSel] = useState<number>(4);
  // v68 BATALHA: modo do jogo (solo) — corrida clássica OU batalha de balões no Coliseu
  const [modoJogo, setModoJogo] = useState<"corrida" | "batalha">("corrida");
  const [garagemAberta, setGaragemAberta] = useState(false);
  const [kartSel, setKartSel] = useState<KartId>(() => lerSave().kart);
  const [hud, setHud] = useState<EstadoHudKart | null>(null);
  const [pausa, setPausa] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [corridaKey, setCorridaKey] = useState(0);
  // ── v66 ONLINE ──
  const [modoRede, setModoRede] = useState(false);            // corrida online EM CURSO
  const [redeEstado, setRedeEstado] = useState<EstadoMpKart | null>(null);
  const [lobbyInfo, setLobbyInfo] = useState<{ espera: number; presentes: number; teto: number } | null>(null);
  const [avisoRede, setAvisoRede] = useState<string | null>(null);
  const [nomePiloto] = useState(() => `Piloto-${Math.floor(1000 + Math.random() * 9000)}`);
  // ── v67 SOM ──
  const [mudo, setMudo] = useState(() => somGlobal().estaMudo());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const motorRef = useRef<MotorKart | null>(null);
  const redeRef = useRef<RedeKart | null>(null);
  const inicioRedeRef = useRef<InicioRede | null>(null);
  const motorIdRef = useRef(6);                               // MEU slot (solo = 6)
  const pistaRecRef = useRef<string>(pistaSel);               // pista da corrida EM CURSO (a rede decide)
  const fimRedeRef = useRef(false);                           // payout local injetado 1×
  const modoRedeRef = useRef(false);
  modoRedeRef.current = modoRede;
  const modoJogoRef = useRef<"corrida" | "batalha">("corrida");
  const rafMini = useRef(0);
  const toastSeq = useRef(1);
  const salvoRef = useRef(false);
  const pausaRef = useRef(false);
  pausaRef.current = pausa;

  const pushToast = useCallback((texto: string, tipo: Toast["tipo"]) => {
    const id = toastSeq.current++;
    setToasts((at) => [...at.slice(-3), { id, texto, tipo }]);
    window.setTimeout(() => setToasts((at) => at.filter((x) => x.id !== id)), 2400);
  }, []);

  const nivel = nivelDeXp(save.xp);

  // pausa do React → motor (congela a SIMULAÇÃO, não só o overlay)
  useEffect(() => {
    motorRef.current?.pausar(pausa);
  }, [pausa]);

  // ── v67 SOM: despertar no 1.º gesto (política de autoplay) + gancho honesto p/ testes ──
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

  // ── v67 SOM: música segue a fase (menu = tema do menu · corrida = tema de corrida) ──
  useEffect(() => {
    somGlobal().musica(fase === "corrida" ? "corrida" : "menu");
  }, [fase]);

  const alternarSom = useCallback(() => {
    const som = somGlobal();
    som.despertar();
    som.definirMudo(!som.estaMudo());
    setMudo(som.estaMudo());
    som.tocar("ui");
  }, []);

  // ── v66: cliente da sala de corridas (uma instância por componente) ──
  useEffect(() => {
    const rede = new RedeKart();
    redeRef.current = rede;
    rede.definirEscutas({
      aoEstado: (e) => {
        setRedeEstado({ ...e });
        if (e.estado === "solo") setAvisoRede(t("kart.mp.semServidor"));
      },
      aoLobby: (info) => setLobbyInfo({ ...info }),
      aoInicio: (info) => {
        inicioRedeRef.current = info;
        motorIdRef.current = info.meuId;
        pistaRecRef.current = info.pistaId;
        fimRedeRef.current = false;
        setModoRede(true);
        setAvisoRede(null);
        setHud(null);
        setPausa(false);
        setCorridaKey((k) => k + 1);
        setFase("corrida");
      },
      aoSnap: (s) => motorRef.current?.aplicarSnap(s),
      aoFim: () => { /* a fase fim chega pela própria snapshot — nada aqui */ },
      aoSaiuCorredor: (id, nome) => {
        if (motorRef.current && id !== motorRef.current.idMeu()) pushToast(t("kart.mp.saiuCorredor", { nome }), "info");
      },
      aoCorrigido: (motivo) => {
        if (motivo === "sala-cheia-espera") pushToast(t("kart.mp.espectando"), "info");
        else pushToast(t("kart.mp.corrigido", { motivo }), "golpe");
      },
    });
    return () => { rede.fechar(); redeRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ciclo de vida da corrida ──────────────────────────────────
  useEffect(() => {
    if (fase !== "corrida" || !canvasRef.current) return;
    salvoRef.current = false;
    const inicioRede = modoRedeRef.current ? inicioRedeRef.current : null;
    const pistaId = inicioRede ? inicioRede.pistaId : pistaSel;
    pistaRecRef.current = pistaId;
    const def = pistaPorId(pistaId);
    if (!def) return;
    const leve = new URLSearchParams(window.location.search).has("kart-leve") || ehToque;
    const recordeAnterior = lerSave().recordes[pistaId] ?? Infinity;

    const motor = new MotorKart({
      canvas: canvasRef.current,
      pistaId,
      voltas: inicioRede ? inicioRede.voltas : voltasSel,
      kartJogador: kartSel,
      melhorias: melhoriasDe(lerSave(), kartSel),
      nomeJogador: inicioRede ? nomePiloto : "Tu",
      recordeAnterior,
      leve,
      som: adaptadorSomKart(somGlobal()), // v67
      batalha: modoJogoRef.current === "batalha", // v68
      aoHud: (e) => {
        // v66 ONLINE: o payout é DO APARELHO — calculado localmente 1× quando a sala fecha
        if (e.fase === "fim" && !e.payout && modoRedeRef.current && !fimRedeRef.current) {
          fimRedeRef.current = true;
          const meuTempo = e.resultados.find((r) => r.id === motorIdRef.current)?.tempo ?? 0;
          const rec = recompensaCorrida(e.posicao, e.moedas, e.voltas);
          const recorde = meuTempo > 0 && meuTempo < recordeAnterior;
          setHud({ ...e, payout: { moedas: rec.moedas, xp: rec.xp, recorde } });
          return;
        }
        setHud(e);
      },
      aoAviso: (a: AvisosKart) => {
        if (a.itemNovo) pushToast(`${ICONES_ITEM[a.itemNovo] ?? ""} ${t(`kart.item.${a.itemNovo}`)}`, "item");
        if (a.golpeRecebido) pushToast(t("kart.golpeRecebido", { item: a.golpeRecebido === "raio" ? "⚡" : t(`kart.item.${a.golpeRecebido}`) }), "golpe");
        if (a.voltaNova && modoJogoRef.current !== "batalha") pushToast(t("kart.voltaNova", { n: String(a.voltaNova) }), "info");
        if (a.derivaTurbo) pushToast(a.derivaTurbo === 2 ? t("kart.turboLaranja") : t("kart.turboAzul"), "turbo");
        if (a.rampa) pushToast(t("kart.rampa"), "turbo");
        // v68 BATALHA
        if (a.balaoPerdido) pushToast(t("batalha.balaoPerdido"), "golpe");
        if (a.eliminadoEu) pushToast(t("batalha.eliminadoEu"), "golpe");
        if (a.eliminadoOutro) {
          pushToast(a.eliminadoOutro.por
            ? t("batalha.eliminadoPor", { v: a.eliminadoOutro.nome, p: a.eliminadoOutro.por })
            : t("batalha.eliminadoSem", { v: a.eliminadoOutro.nome }), "info");
        }
      },
      // v66 ONLINE: o uso de item vai por MENSAGEM própria (o servidor é quem usa)
      ...(inicioRede ? {
        idJogador: inicioRede.meuId,
        corredoresRede: inicioRede.corredores as never,
        aoPulsarItemRede: () => redeRef.current?.mandarUso(),
      } : {}),
    });
    motorRef.current = motor;
    if (inicioRede) redeRef.current?.definirFonteEntrada(() => motor.obterEntrada());
    window.__kart = motor.ganchos();

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

    // Esc = pausa
    const aoTecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setPausa((v) => !v);
    };
    window.addEventListener("keydown", aoTecla);

    return () => {
      window.removeEventListener("keydown", aoTecla);
      cancelAnimationFrame(rafMini.current);
      if (inicioRede) redeRef.current?.definirFonteEntrada(null);
      motorRef.current?.destruir();
      motorRef.current = null;
      window.__kart = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, corridaKey]);

  // ── fim de corrida: payout + recordes UMA vez ─────────────────
  useEffect(() => {
    if (fase !== "corrida" || !hud || hud.fase !== "fim" || !hud.payout || salvoRef.current) return;
    salvoRef.current = true;
    setSave((atual) => {
      const s = validarSaveKart(atual);
      const tempoFim = hud.resultados.find((r) => r.id === motorIdRef.current)?.tempo ?? 0;
      const pistaId = pistaRecRef.current;
      const novo: SaveKart = {
        ...s,
        moedas: s.moedas + hud.payout!.moedas,
        xp: s.xp + hud.payout!.xp,
        corridas: s.corridas + 1,
        vitorias: s.vitorias + (hud.posicao === 1 ? 1 : 0),
        recordes: tempoFim > 0 ? { ...s.recordes, [pistaId]: Math.min(s.recordes[pistaId] ?? Infinity, tempoFim) } : s.recordes,
        ts: Date.now(),
      };
      guardarSave(novo);
      return novo;
    });
    if (onScore) onScore(hud.payout.moedas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud?.fase, fase]);

  const sair = useCallback(() => {
    setFase("menu");
    setHud(null);
    setPausa(false);
    setGaragemAberta(false);
    setModoRede(false);
    if (onExit) onExit();
  }, [onExit]);

  const correrOutraVez = useCallback(() => {
    setHud(null);
    setPausa(false);
    // v66 ONLINE: o fim devolve ao MENU — a sala manda a próxima corrida sozinha
    if (modoRedeRef.current) { setFase("menu"); return; }
    setCorridaKey((k) => k + 1);
  }, []);

  // ── v66 ONLINE: entrar/sair da sala ──
  const entrarRede = useCallback(() => {
    setAvisoRede(null);
    redeRef.current?.ligar(RedeKart.urlPadrao(), {
      nome: nomePiloto,
      kart: kartSel,
      melhorias: melhoriasDe(lerSave(), kartSel),
    });
  }, [kartSel, nomePiloto]);

  const sairRede = useCallback(() => {
    redeRef.current?.fechar();
    setRedeEstado(null);
    setLobbyInfo(null);
    setAvisoRede(null);
  }, []);

  const comprarMelhoria = useCallback((mel: MelhoriaId) => {
    setSave((atual) => {
      const s = validarSaveKart(atual);
      const chave = `${kartSel}.${mel}`;
      const nv = s.melhorias[chave] ?? 0;
      const custo = custoMelhoria(nv);
      if (custo === 0 || s.moedas < custo) return s;
      const novo = { ...s, moedas: s.moedas - custo, melhorias: { ...s.melhorias, [chave]: nv + 1 } };
      guardarSave(novo);
      return novo;
    });
  }, [kartSel]);

  const escolherKart = useCallback((id: KartId) => {
    setSave((atual) => {
      const s = validarSaveKart(atual);
      const nivelAgora = nivelDeXp(s.xp);
      const est = kartDesbloqueado(id, s.possuidos, nivelAgora, s.moedas);
      if (!est.sim) return s;
      if (!s.possuidos.includes(id)) {
        const novo: SaveKart = { ...s, possuidos: [...s.possuidos, id], moedas: s.moedas - KARTS[id].custoMoedas, kart: id };
        guardarSave(novo);
        setKartSel(id);
        return novo;
      }
      const novo = { ...s, kart: id };
      guardarSave(novo);
      setKartSel(id);
      return novo;
    });
  }, []);

  // ═══════════════════════ MENU ═══════════════════════
  if (fase === "menu") {
    const stats = statsDe(kartSel, melhoriasDe(save, kartSel));
    return (
      <div className="fixed inset-0 z-[80] bg-gradient-to-b from-slate-950 via-orange-950 to-slate-950 overflow-y-auto" data-testid="kart-menu">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
          <button onClick={sair} className="self-start flex items-center gap-2 text-slate-300 hover:text-white mb-3" data-testid="kart-menu-voltar">
            <X className="w-5 h-5" /> {t("kart.sair")}
          </button>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-center bg-gradient-to-r from-orange-300 via-amber-100 to-red-300 bg-clip-text text-transparent drop-shadow">
            {t("kart.titulo")}
          </h1>
          <p className="mt-3 max-w-2xl text-center text-slate-300 text-sm sm:text-base">{t("kart.menu.sub")}</p>
          <p className="mt-1 text-center text-[11px] text-slate-400" data-testid="kart-menu-nota">{t("kart.menu.nota")}</p>

          {/* v67 SOM: botão honesto — o estado vive no aparelho */}
          <div className="mt-2 flex justify-center">
            <button onClick={alternarSom} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10" data-testid="kart-som">
              {mudo ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
              {t(mudo ? "som.ligar" : "som.desligar")}
            </button>
          </div>

          {/* progressão */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-200 rounded-2xl border border-white/10 bg-white/5 px-5 py-3" data-testid="kart-save-info">
            <span className="inline-flex items-center gap-1"><ChevronUp className="w-3.5 h-3.5 text-amber-300" /> {t("kart.nivel")} <b className="text-amber-200">{nivel}</b></span>
            <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-yellow-300" /> <b className="text-yellow-200">{save.moedas}</b> {t("kart.moedas")}</span>
            <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-rose-300" /> {save.vitorias} {t("kart.vitorias")}</span>
            <span className="inline-flex items-center gap-1"><Flag className="w-3.5 h-3.5 text-sky-300" /> {save.corridas} {t("kart.corridas")}</span>
            {save.recordes[pistaSel] && (
              <span className="inline-flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-emerald-300" /> {t("kart.recorde")} {Math.floor(save.recordes[pistaSel] / 60)}:{String(Math.floor(save.recordes[pistaSel] % 60)).padStart(2, "0")}</span>
            )}
          </div>

          {/* pistas */}
          <h2 className="mt-7 text-lg font-bold text-orange-200">{t("kart.pistas")}</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-4xl">
            {PISTAS.map((p) => {
              const bloqueada = nivel < p.nivelNecessario;
              const sel = pistaSel === p.id;
              return (
                <button
                  key={p.id}
                  disabled={bloqueada}
                  onClick={() => { setPistaSel(p.id); setVoltasSel(p.voltasSugeridas); }}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${sel ? "border-orange-400 bg-orange-400/10 scale-[1.02]" : "border-white/10 bg-white/5"} ${bloqueada ? "opacity-45 cursor-not-allowed" : "hover:border-white/30"}`}
                  data-testid={`kart-pista-${p.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-white">{p.nome}</div>
                    {bloqueada ? <Lock className="w-4 h-4 text-slate-400" /> : sel ? <Check className="w-4 h-4 text-orange-300" /> : null}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300">{t(`kart.pista.desc.${p.id}`)}</div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {bloqueada ? t("kart.pista.bloqueada", { n: String(p.nivelNecessario) }) : `${p.voltasSugeridas} ${t("kart.voltas.suger")}`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* voltas */}
          <div className="mt-5 flex items-center gap-2">
            <span className="text-xs text-slate-300">{t("kart.voltas")}:</span>
            {[3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setVoltasSel(v)}
                className={`w-12 py-2 rounded-xl font-bold text-sm ${voltasSel === v ? "bg-orange-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"}`}
                data-testid={`kart-volta-${v}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* carro atual + garagem */}
          <button
            onClick={() => setGaragemAberta(true)}
            className="mt-6 w-full max-w-xl rounded-2xl border-2 border-amber-500/60 bg-amber-500/10 p-4 hover:bg-amber-500/20 transition-colors"
            data-testid="kart-garagem"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: KARTS[kartSel].cor }}>
                <CarFront className="w-5 h-5 text-white" />
              </span>
              <div className="text-left flex-1">
                <div className="font-black text-white flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-300" /> {t("kart.garagem")}: {KARTS[kartSel].nome}</div>
                <div className="text-[11px] text-slate-300">{t("kart.stats.vel")} {Math.round(stats.velMax * 4)} km/h · {t("kart.stats.turbo")} ×{stats.turboMult.toFixed(2)} · {t("kart.stats.pneus")} {stats.virada.toFixed(2)} · {t("kart.stats.blind")} −{Math.round(stats.stunReducao * 100)}% · {t("kart.stats.armas")} +{Math.round(stats.poderArma * 100)}%</div>
              </div>
            </div>
          </button>

          {/* correr — v68: CORRIDA clássica OU BATALHA de balões */}
          <button
            onClick={() => { modoJogoRef.current = "corrida"; setModoJogo("corrida"); setCorridaKey((k) => k + 1); setFase("corrida"); }}
            className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-10 py-4 font-black text-lg text-white hover:brightness-110 active:scale-95"
            data-testid="kart-entrar"
          >
            <span className="inline-flex items-center gap-2"><Play className="w-6 h-6" /> {t("kart.correr")}</span>
          </button>
          <button
            onClick={() => { modoJogoRef.current = "batalha"; setModoJogo("batalha"); setCorridaKey((k) => k + 1); setFase("corrida"); }}
            className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 px-8 py-3.5 font-black text-base text-white hover:brightness-110 active:scale-95"
            data-testid="kart-batalha"
          >
            <span className="inline-flex items-center gap-2"><span className="text-xl">🎈</span> {t("batalha.menu.botao")}</span>
          </button>
          <p className="mt-2 text-[11px] text-fuchsia-300/90 text-center max-w-md" data-testid="kart-batalha-sub">{t("batalha.menu.sub")}</p>
          <p className="mt-1 text-[11px] text-slate-500">{t("kart.controles")}</p>

          {/* ── v66: SALA ONLINE (honesto: sem servidor, nada finge) ── */}
          <div className="mt-6 w-full max-w-xl rounded-2xl border-2 border-sky-500/40 bg-sky-500/5 p-4" data-testid="kart-online-painel">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center bg-sky-600"><Wifi className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white">{t("kart.mp.titulo")}</div>
                <div className="text-[11px] text-slate-300">{t("kart.mp.sub")}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={entrarRede}
                disabled={redeEstado?.estado === "a_ligar"}
                className="rounded-xl bg-sky-600 px-4 py-2.5 font-black text-sm text-white hover:brightness-110 disabled:opacity-60"
                data-testid="kart-entrar-online"
              >
                {redeEstado?.estado === "a_ligar" ? t("kart.mp.ligando") : t("kart.mp.titulo")}
              </button>
              {redeEstado && (redeEstado.estado === "lobby" || redeEstado.estado === "corrida") && (
                <button onClick={sairRede} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700" data-testid="kart-sair-online">
                  {t("kart.mp.sair")}
                </button>
              )}
              {redeEstado?.estado === "lobby" && (
                <span className="text-xs font-bold text-sky-200" data-testid="kart-online-lobby">
                  {t("kart.mp.lobby", { s: String(lobbyInfo?.espera ?? 0), n: String(lobbyInfo?.presentes ?? 1) })}
                </span>
              )}
              {redeEstado?.estado === "corrida" && !modoRede && (
                <span className="text-xs font-bold text-emerald-300">{t("kart.mp.ligado")}</span>
              )}
            </div>
            {avisoRede && <div className="mt-2 text-[11px] text-amber-300" data-testid="kart-online-aviso">{avisoRede}</div>}
          </div>
        </div>

        {/* ── GARAGEM ── */}
        {garagemAberta && (
          <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm overflow-y-auto" data-testid="kart-garagem-modal">
            <div className="min-h-full flex flex-col items-center px-4 py-8">
              <div className="w-full max-w-4xl rounded-3xl border border-white/15 bg-slate-900/90 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-amber-200 flex items-center gap-2"><Wrench className="w-5 h-5" /> {t("kart.garagem.titulo")}</h2>
                  <button onClick={() => setGaragemAberta(false)} data-testid="kart-garagem-fechar" className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-slate-300" /></button>
                </div>
                <div className="mt-1 text-xs text-yellow-200 flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> {save.moedas} {t("kart.moedas")}</div>

                {/* karts */}
                <h3 className="mt-4 text-sm font-bold text-slate-200">{t("kart.garagem.karts")}</h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IDS_KARTS.map((id) => {
                    const k = KARTS[id];
                    const est = kartDesbloqueado(id, save.possuidos, nivel, save.moedas);
                    const sel = kartSel === id;
                    const meu = save.possuidos.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => escolherKart(id)}
                        className={`text-left rounded-2xl border-2 p-3 transition-all ${sel ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/5 hover:border-white/30"} ${!est.sim ? "opacity-55" : ""}`}
                        data-testid={`kart-kart-${id}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: k.cor }}><CarFront className="w-4 h-4 text-white" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              {k.nome}
                              {meu && sel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-black">{t("kart.garagem.selecionado")}</span>}
                              {!meu && est.sim && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-black font-black">{t("kart.garagem.comprar")} {k.custoMoedas}</span>}
                              {!est.sim && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-bold"><Lock className="w-3 h-3" /> {est.motivo === "nivel" ? t("kart.garagem.nivel", { n: String(k.nivelNecessario) }) : `${k.custoMoedas} 🪙`}</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{k.descricao}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* melhorias do kart selecionado */}
                <h3 className="mt-5 text-sm font-bold text-slate-200">{t("kart.garagem.melhorias")} — {KARTS[kartSel].nome}</h3>
                <div className="mt-2 space-y-2">
                  {IDS_MELHORIAS.map((mel) => {
                    const nv = save.melhorias[`${kartSel}.${mel}`] ?? 0;
                    const custo = custoMelhoria(nv);
                    const teto = custo === 0;
                    const pode = !teto && save.moedas >= custo;
                    return (
                      <div key={mel} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5" data-testid={`kart-melhoria-${mel}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white text-sm">{t(`kart.mel.${mel}.nome`)}</div>
                          <div className="text-[11px] text-slate-400">{t(`kart.mel.${mel}.desc`)}</div>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`w-3 h-3 rounded-full ${i < nv ? "bg-amber-400" : "bg-slate-700"}`} />
                          ))}
                        </div>
                        {teto ? (
                          <span className="text-[11px] font-bold text-emerald-300 px-2">{t("kart.mel.teto")}</span>
                        ) : (
                          <button
                            onClick={() => comprarMelhoria(mel)}
                            disabled={!pode}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black ${pode ? "bg-amber-500 text-black hover:brightness-110" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                            data-testid={`kart-comprar-${mel}`}
                          >
                            {custo} 🪙
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════ CORRIDA ═══════════════════════
  const contagemTxt = hud?.fase === "contagem" ? hud.contagem : hud?.fase === "corrida" && hud.tempo < 1.0 ? 0 : null;
  const humanosNaCorrida = modoRede && inicioRedeRef.current ? inicioRedeRef.current.corredores.filter((c) => c.eJogador).length : 0;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 select-none" data-testid="kart-jogo">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" data-testid="kart-canvas" />

      {/* v66: badge ONLINE (abaixo do botão de pausa para não colidir) */}
      {modoRede && humanosNaCorrida > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 rounded-xl bg-sky-600/90 border border-sky-300/50 px-3 py-1 text-[11px] font-black text-white" data-testid="kart-online-badge">
          {t("kart.mp.badge", { n: String(humanosNaCorrida) })}
        </div>
      )}

      {/* ── HUD topo-esquerda: posição/volta/tempo/moedas ── */}
      {hud && (
        <div className="absolute top-2 left-2 flex flex-col gap-1.5" data-testid="kart-hud">
          <div className="rounded-2xl bg-slate-900/80 border border-white/15 px-4 py-2 text-white flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300" data-testid="kart-pos">{ORDEM(hud.posicao)}</span>
            <span className="text-xs text-slate-400">/ {hud.total}</span>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-1.5 text-xs text-white flex items-center gap-3">
            {hud.batalha ? (
              <>
                <span data-testid="kart-batalha-baloes" className="inline-flex items-center gap-1">
                  <b className="text-fuchsia-300">{"🎈".repeat(Math.min(hud.batalha.baloes, 5))}</b>
                  <span className="text-slate-300">×{hud.batalha.baloes}</span>
                </span>
                <span data-testid="kart-batalha-vivos" className="text-emerald-300">{t("batalha.hud.vivos", { n: String(hud.batalha.vivos) })}</span>
                <span data-testid="kart-batalha-tempo" className="text-slate-300">
                  {Math.floor(hud.batalha.tempoRestante / 60)}:{String(Math.floor(hud.batalha.tempoRestante % 60)).padStart(2, "0")}
                </span>
              </>
            ) : (
              <span data-testid="kart-volta">{t("kart.hud.volta")} <b className="text-orange-300">{hud.volta}</b>/{hud.voltas}</span>
            )}
            <span data-testid="kart-tempo" className="text-slate-300">{Math.floor(hud.tempo / 60)}:{String(Math.floor(hud.tempo % 60)).padStart(2, "0")}</span>
            <span data-testid="kart-moedas" className="inline-flex items-center gap-1 text-yellow-300"><Coins className="w-3.5 h-3.5" /> {hud.moedas}</span>
          </div>
        </div>
      )}

      {/* ── minimapa ── */}
      <div className="absolute top-2 right-2 rounded-2xl bg-slate-900/70 border border-white/15 p-1.5">
        <canvas ref={miniRef} width={140} height={140} className="block" data-testid="kart-minimapa" />
      </div>

      {/* ── velocímetro ── */}
      {hud && (
        <div className="absolute bottom-3 right-3 rounded-2xl bg-slate-900/80 border border-white/15 px-4 py-2 text-right" data-testid="kart-vel">
          <div className="text-2xl font-black text-white leading-none">{Math.round(hud.vel * 4)}</div>
          <div className="text-[10px] text-slate-400">km/h</div>
          {(hud.boost || hud.escudo) && (
            <div className="mt-1 flex gap-1 justify-end">
              {hud.boost && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-black font-black">TURBO</span>}
              {hud.escudo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500 text-black font-black">🛡️</span>}
            </div>
          )}
        </div>
      )}

      {/* ── item ── */}
      {hud && (
        <div className="absolute bottom-16 sm:bottom-3 left-1/2 -translate-x-1/2">
          <button
            onClick={() => motorRef.current?.pulsarItem()}
            className={`w-16 h-16 rounded-2xl border-2 grid place-items-center text-3xl font-black ${hud.item ? "bg-slate-900/85 border-amber-400 hover:bg-slate-800" : "bg-slate-900/60 border-white/15"}`}
            data-testid="kart-item"
          >
            {hud.item ? ICONES_ITEM[hud.item] ?? "?" : ""}
          </button>
        </div>
      )}

      {/* ── contagem / JÁ! ── */}
      {contagemTxt !== null && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-8xl font-black text-white drop-shadow-lg" data-testid="kart-contagem">
            {contagemTxt === 0 ? <span className="text-emerald-300">{t("kart.ja")}</span> : contagemTxt}
          </div>
        </div>
      )}

      {/* ── sentido contrário ── */}
      {hud?.contrario && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 rounded-xl bg-red-600/90 px-5 py-2 font-black text-white animate-pulse" data-testid="kart-contrario">
          {t("kart.contrario")}
        </div>
      )}

      {/* ── flash de golpe ── */}
      {hud?.stun && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px 30px rgba(230,70,60,0.5)", animation: "arena-fade 0.6s forwards" }} />}

      {/* ── toasts ── */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center pointer-events-none">
        {toasts.map((to) => (
          <div key={to.id} className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white border ${to.tipo === "golpe" ? "bg-red-900/85 border-red-500/60" : to.tipo === "item" ? "bg-amber-900/85 border-amber-500/60" : to.tipo === "turbo" ? "bg-orange-900/85 border-orange-500/60" : "bg-slate-900/85 border-white/20"}`}>
            {to.texto}
          </div>
        ))}
      </div>

      {/* ── pausa ── */}
      <button onClick={() => setPausa(true)} className="absolute top-2 left-1/2 -translate-x-1/2 rounded-xl bg-slate-900/80 border border-white/15 p-2.5 hover:bg-slate-800" data-testid="kart-pausa">
        <Pause className="w-5 h-5 text-white" />
      </button>
      {pausa && !hud?.payout && (
        <div className="absolute inset-0 z-[85] bg-black/70 grid place-items-center" data-testid="kart-pausa-modal">
          <div className="rounded-3xl border border-white/15 bg-slate-900/95 p-6 w-72 text-center">
            <h2 className="text-xl font-black text-white mb-4">{t("kart.pausa.titulo")}</h2>
            <button onClick={() => setPausa(false)} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white mb-2 hover:brightness-110" data-testid="kart-retomar">{t("kart.pausa.retomar")}</button>
            <button onClick={alternarSom} className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 font-bold text-slate-100 mb-2 hover:brightness-110" data-testid="kart-som-pausa">
              {mudo ? <span className="inline-flex items-center gap-2 justify-center"><VolumeX className="w-4 h-4" /> {t("som.ligar")}</span> : <span className="inline-flex items-center gap-2 justify-center"><Volume2 className="w-4 h-4" /> {t("som.desligar")}</span>}
            </button>
            <button onClick={() => { motorRef.current?.pausar(false); sair(); }} className="w-full rounded-xl bg-slate-700 px-4 py-3 font-bold text-white hover:brightness-110" data-testid="kart-sair-pausa">{t("kart.pausa.sair")}</button>
          </div>
        </div>
      )}

      {/* ── móvel: botões ── */}
      {ehToque && (
        <>
          <div className="absolute bottom-6 left-4 flex gap-3">
            <button
              className="w-16 h-16 rounded-full bg-slate-900/80 border-2 border-white/25 grid place-items-center active:bg-slate-700"
              onPointerDown={() => motorRef.current?.setEntrada({ virar: -1 })}
              onPointerUp={() => motorRef.current?.setEntrada({ virar: 0 })}
              onPointerLeave={() => motorRef.current?.setEntrada({ virar: 0 })}
            ><ArrowLeft className="w-7 h-7 text-white" /></button>
            <button
              className="w-16 h-16 rounded-full bg-slate-900/80 border-2 border-white/25 grid place-items-center active:bg-slate-700"
              onPointerDown={() => motorRef.current?.setEntrada({ virar: 1 })}
              onPointerUp={() => motorRef.current?.setEntrada({ virar: 0 })}
              onPointerLeave={() => motorRef.current?.setEntrada({ virar: 0 })}
            ><ArrowRight className="w-7 h-7 text-white" /></button>
          </div>
          <div className="absolute bottom-40 right-4 flex flex-col gap-2">
            <button
              className="w-14 h-14 rounded-full bg-emerald-700/90 border-2 border-emerald-400/50 grid place-items-center active:bg-emerald-600"
              onPointerDown={() => motorRef.current?.setEntrada({ derrapar: true })}
              onPointerUp={() => motorRef.current?.setEntrada({ derrapar: false })}
            ><Gauge className="w-6 h-6 text-white" /></button>
          </div>
          <div className="absolute bottom-6 right-4">
            <button
              className="w-20 h-20 rounded-full bg-orange-600/90 border-2 border-orange-300/60 grid place-items-center active:bg-orange-500"
              onPointerDown={() => motorRef.current?.setEntrada({ acelerar: true })}
              onPointerUp={() => motorRef.current?.setEntrada({ acelerar: false })}
              onPointerLeave={() => motorRef.current?.setEntrada({ acelerar: false })}
            ><Zap className="w-8 h-8 text-white" /></button>
          </div>
        </>
      )}

      {/* ── resultados ── */}
      {hud?.payout && (
        <div className="absolute inset-0 z-[86] bg-black/75 grid place-items-center overflow-y-auto" data-testid="kart-resultados">
          <div className="my-auto rounded-3xl border border-white/15 bg-slate-900/95 p-6 w-[min(92vw,480px)]">
            <h2 className="text-center text-2xl font-black text-amber-300 flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6" /> {t(hud.batalha ? "batalha.resultado.titulo" : "kart.resultado.titulo", { pos: ORDEM(hud.posicao) })}
            </h2>
            {hud.batalha && (
              <div className="mt-1 text-center text-xs text-fuchsia-200" data-testid="batalha-resumo">
                {t("batalha.resultado.resumo", { b: String(hud.batalha.baloes), g: String(hud.batalha.golpes) })}
              </div>
            )}
            <div className="mt-3 flex justify-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 text-yellow-200" data-testid="kart-payout"><Coins className="w-4 h-4" /> +{hud.payout.moedas} {t("kart.moedas")}</span>
              <span className="inline-flex items-center gap-1 text-sky-200"><ChevronUp className="w-4 h-4" /> +{hud.payout.xp} XP</span>
            </div>
            {hud.payout.recorde && (
              <div className="mt-2 text-center text-xs font-black text-emerald-300">{t("kart.resultado.recorde")}</div>
            )}
            <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-xs">
                <tbody>
                  {hud.resultados.map((r) => {
                    const bal = hud.batalha?.classificacao.find((x) => x.id === r.id);
                    return (
                      <tr key={r.id} className={`${r.id === motorIdRef.current ? "bg-amber-400/15 text-amber-200 font-bold" : "text-slate-300"} border-b border-white/5`}>
                        <td className="px-3 py-1.5 w-10">{ORDEM(r.posicao)}</td>
                        <td className="px-2 py-1.5">{r.nome}</td>
                        <td className="px-3 py-1.5 text-right text-slate-400" data-testid={"batalha-tabela-baloes"}>
                          {hud.batalha && bal ? `${"🎈".repeat(Math.min(bal.baloes, 5))} ${bal.baloes}` : r.tempo > 0 ? `${Math.floor(r.tempo / 60)}:${String(Math.floor(r.tempo % 60)).padStart(2, "0")}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={correrOutraVez} className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 font-black text-white hover:brightness-110" data-testid="kart-de-novo">{t("kart.resultado.denovo")}</button>
              <button onClick={sair} className="w-full rounded-xl bg-slate-700 px-4 py-2.5 font-bold text-white hover:brightness-110" data-testid="kart-resultados-sair">{t("kart.pausa.sair")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
