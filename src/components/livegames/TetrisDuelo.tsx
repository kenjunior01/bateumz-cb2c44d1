import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Swords, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { playSfx, haptic } from "@/components/games/kit";
// v73: fonte ÚNICA das peças — as MESMAS 7 peças, kicks e gravidade do solo
import { LARG, ALT, LOCK_DELAY_MS, PECAS, KICKS, gravidadeMs, novoSaco, type TipoPeca, type Parte } from "./Tetris";

const SOM = {
  linha: (n: number) => playSfx(n >= 2 ? "combo" : "coin"),
  quedaDura: () => playSfx("explosion", { volume: 0.5, pitch: 1.6 }),
  rodar: () => playSfx("click", { pitch: 1.8, volume: 0.5 }),
  mover: () => playSfx("tick", { volume: 0.25, pitch: 2 }),
  guardar: () => playSfx("pop"),
  lixo: () => playSfx("hit", { volume: 0.5, pitch: 0.8 }),
  vit: () => playSfx("levelup"),
  inicio: () => playSfx("powerup"),
  pausa: () => playSfx("click", { pitch: 0.7 }),
};

// ═══ TETRIS DUELO 2P — v73 ══════════════════════════════════════
// O duelo CLÁSSICO em casa: dois tabuleiros no MESMO ecrã, cada
// jogador com o seu saco de 7, hold e fantasma. Quem limpa linhas
// MANDA LIXO para o adversário (DOUBLE→1, TRIPLE→2, TETRIS→4
// linhas cinzentas com um furo cada — as linhas do adversário
// SOBEM). Perde quem encher até cima. WASD+Espaço+Q vs SETAS+
// Enter+M. P pausa OS DOIS honestamente (fase congela).
// Teclado de SOFA — no telemóvel é honesto: o duelo é de teclado.

const NOMES = ["JOGADOR 1", "JOGADOR 2"];
const CORES_J = ["#fb923c", "#38bdf8"]; // âmbar vs ciano

// lixo que cada limpeza manda (0 = só pontos)
const LIXO_POR_LINHA = [0, 0, 1, 2, 4];
const COR_LIXO = "#64748b";

interface Props {
  onScore?: (name: string, score: number) => void;
  onSair?: () => void;
}

type Fase = "idle" | "playing" | "paused" | "over";

interface Jogador {
  tabuleiro: Array<Array<string | null>>;
  atual: Parte | null;
  fila: TipoPeca[];
  hold: TipoPeca | null;
  holdUsado: boolean;
  pontos: number;
  linhas: number;
  enviadas: number;       // linhas de lixo MANDADAS (HUD honesto)
  nivel: number;
  combo: number;
  b2b: boolean;
  accQueda: number;
  accLock: number;
  noSolo: boolean;
  vivo: boolean;
}

function jogadorNovo(): Jogador {
  return {
    tabuleiro: Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null)),
    atual: null, fila: [], hold: null, holdUsado: false,
    pontos: 0, linhas: 0, enviadas: 0, nivel: 1, combo: 0, b2b: false,
    accQueda: 0, accLock: 0, noSolo: false, vivo: true,
  };
}

export default function TetrisDuelo({ onScore, onSair }: Props) {
  const canvases = useRef<Array<HTMLCanvasElement | null>>([null, null]);
  const [fase, setFase] = useState<Fase>("idle");
  const [vencedor, setVencedor] = useState<number | null>(null); // 0 | 1
  const [hud, setHud] = useState<{ p: Array<{ pontos: number; linhas: number; enviadas: number; nivel: number }> }>({
    p: [{ pontos: 0, linhas: 0, enviadas: 0, nivel: 1 }, { pontos: 0, linhas: 0, enviadas: 0, nivel: 1 }],
  });

  const faseRef = useRef<Fase>("idle");
  const js = useRef<Jogador[]>([jogadorNovo(), jogadorNovo()]);
  const toast = useRef<{ txt: string; cor: string; j: number; ate: number } | null>(null);

  const setFase2 = (f: Fase) => { faseRef.current = f; setFase(f); };

  // ── colisão de um jogador ──
  const colide = useCallback((j: Jogador, p: Parte, dx = 0, dy = 0, rot = p.rot): boolean => {
    const def = PECAS[p.tipo];
    for (const [cx, cy] of def.celas[((rot % 4) + 4) % 4]) {
      const x = p.x + cx + dx, y = p.y + cy + dy;
      if (x < 0 || x >= LARG || y >= ALT) return true;
      if (y >= 0 && j.tabuleiro[y][x]) return true;
    }
    return false;
  }, []);

  const spawn = useCallback((j: Jogador): boolean => {
    while (j.fila.length < 7) j.fila.push(...novoSaco());
    const tipo = j.fila.shift()!;
    const p: Parte = { tipo, rot: 0, x: 3, y: -1 };
    if (colide(j, p)) { j.atual = null; return false; }
    j.atual = p;
    j.holdUsado = false;
    j.accQueda = 0; j.accLock = 0; j.noSolo = false;
    return true;
  }, [colide]);

  // ── fim do duelo: o ÚLTIMO-de-pé vence ──
  const terminar = useCallback((perdedor: number) => {
    const v = 1 - perdedor;
    setVencedor(v);
    setFase2("over");
    SOM.vit();
    try { onScore?.("tetris", js.current[v].pontos); } catch { /* fora do modo live */ }
  }, [onScore]);

  // ── LIXO: n linhas cinzentas com furo SOBEM no tabuleiro do rival ──
  const mandarLixo = useCallback((de: number, n: number) => {
    const alvo = js.current[1 - de];
    if (!alvo.vivo || n <= 0) return;
    // morre se as linhas de CIMA têm blocos (sobem para fora do tabuleiro)
    if (alvo.tabuleiro.slice(0, n).some((r) => r.some((c) => c !== null))) {
      alvo.vivo = false;
      terminar(1 - de); // K.O. por lixo — quem mandou vence JÁ (não espera o próximo lock)
      return;
    }
    for (let k = 0; k < n; k++) {
      const linha = Array<string | null>(LARG).fill("X"); // «X» = lixo cinzento
      linha[Math.floor(Math.random() * LARG)] = null;    // SEMPRE um furo
      alvo.tabuleiro.shift();
      alvo.tabuleiro.push(linha);
    }
    toast.current = { txt: `${NOMES[de]} mandou ${n} linha${n > 1 ? "s" : ""}!`, cor: "#f87171", j: 1 - de, ate: performance.now() + 1100 };
    SOM.lixo();
    haptic(25);
  }, [terminar]);

  // ── fixar peça + limpeza + lixo ao rival ──
  const fixar = useCallback((jIdx: number): boolean => {
    const j = js.current[jIdx];
    const p = j.atual;
    if (!p) return false;
    const def = PECAS[p.tipo];
    let foraDoTopo = false;
    for (const [cx, cy] of def.celas[((p.rot % 4) + 4) % 4]) {
      const x = p.x + cx, y = p.y + cy;
      if (y < 0) { foraDoTopo = true; continue; }
      j.tabuleiro[y][x] = p.tipo;
    }
    const limpas: number[] = [];
    for (let y = 0; y < ALT; y++) if (j.tabuleiro[y].every((c) => c !== null)) limpas.push(y);
    if (limpas.length > 0) {
      limpas.sort((a, b) => b - a);
      for (const y of limpas) {
        j.tabuleiro.splice(y, 1);
        j.tabuleiro.unshift(Array<string | null>(LARG).fill(null));
      }
      j.combo += 1;
      const bonusCombo = j.combo > 1 ? 50 * (j.combo - 1) : 0;
      let ganho = [0, 100, 300, 500, 800][limpas.length] * j.nivel + bonusCombo;
      const tetris = limpas.length === 4;
      if (tetris && j.b2b) ganho = Math.round(ganho * 1.5);
      j.b2b = tetris;
      j.pontos += ganho;
      j.linhas += limpas.length;
      j.nivel = 1 + Math.floor(j.linhas / 10);
      // o CORAÇÃO do duelo: limpar linhas ATACA o rival
      const lixo = LIXO_POR_LINHA[limpas.length];
      if (lixo > 0) { j.enviadas += lixo; mandarLixo(jIdx, lixo); }
      toast.current = {
        txt: `${NOMES[jIdx]}: ${["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"][limpas.length]}${j.combo > 1 ? ` ×${j.combo}` : ""}${lixo > 0 ? ` → ${lixo} lixo` : ""}`,
        cor: tetris ? "#22d3ee" : CORES_J[jIdx], j: jIdx, ate: performance.now() + 1100,
      };
      if (tetris) haptic([30, 40, 30]); else haptic(18);
      SOM.linha(limpas.length);
    } else {
      j.combo = 0;
    }
    j.atual = null;
    return !foraDoTopo || limpas.length > 0;
  }, [mandarLixo]);

  // ── ações por jogador ──
  const mover = useCallback((jIdx: number, dx: number) => {
    const j = js.current[jIdx];
    if (!j.atual || faseRef.current !== "playing" || !j.vivo) return;
    if (!colide(j, j.atual, dx, 0)) {
      j.atual.x += dx;
      if (j.noSolo) j.accLock = 0;
      SOM.mover();
    }
  }, [colide]);

  const rodar = useCallback((jIdx: number) => {
    const j = js.current[jIdx];
    if (!j.atual || faseRef.current !== "playing" || !j.vivo) return;
    const novaRot = (j.atual.rot + 1) % 4;
    for (const [dx, dy] of KICKS) {
      if (!colide(j, j.atual, dx, dy, novaRot)) {
        j.atual.rot = novaRot; j.atual.x += dx; j.atual.y += dy;
        if (j.noSolo) j.accLock = 0;
        SOM.rodar();
        return;
      }
    }
  }, [colide]);

  const quedaSuave = useCallback((jIdx: number) => {
    const j = js.current[jIdx];
    if (!j.atual || faseRef.current !== "playing" || !j.vivo) return;
    if (!colide(j, j.atual, 0, 1)) {
      j.atual.y += 1; j.pontos += 1; j.accQueda = 0;
    }
  }, [colide]);

  const quedaDura = useCallback((jIdx: number) => {
    const j = js.current[jIdx];
    if (!j.atual || faseRef.current !== "playing" || !j.vivo) return;
    while (!colide(j, j.atual, 0, 1)) j.atual.y += 1;
    SOM.quedaDura();
    haptic(30);
    fixar(jIdx);
    if (j.vivo && !spawn(j)) j.vivo = false;
    // é aqui que o duelo acaba: quem encheu perde
    if (!j.vivo) terminar(jIdx);
  }, [colide, fixar, spawn, terminar]);

  const guardar = useCallback((jIdx: number) => {
    const j = js.current[jIdx];
    if (!j.atual || faseRef.current !== "playing" || j.holdUsado || !j.vivo) return;
    SOM.guardar();
    const t = j.atual.tipo;
    if (j.hold) {
      const troca: Parte = { tipo: j.hold, rot: 0, x: 3, y: -1 };
      if (colide(j, troca)) return;
      j.hold = t;
      j.atual = troca;
      j.accQueda = 0; j.accLock = 0; j.noSolo = false;
    } else {
      j.hold = t;
      if (!spawn(j)) { j.vivo = false; terminar(jIdx); return; }
    }
    j.holdUsado = true;
  }, [colide, spawn, terminar]);

  // ── começar ──
  const comecar = useCallback(() => {
    js.current = [jogadorNovo(), jogadorNovo()];
    setVencedor(null);
    toast.current = null;
    setHud({
      p: [{ pontos: 0, linhas: 0, enviadas: 0, nivel: 1 }, { pontos: 0, linhas: 0, enviadas: 0, nivel: 1 }],
    });
    setFase2("playing");
    for (const j of js.current) if (!spawn(j)) j.vivo = false;
    SOM.inicio();
  }, [spawn]);

  // v73: gancho HONESTO para a suíte — só existe com ?duelo-teste=1
  // (nunca em jogadas reais). Expõe as MESMAS funções que os jogadores usam.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    if (new URLSearchParams(window.location.search).get("duelo-teste") === "1") {
      w.__duelo = { js, mandarLixo, fixar, spawn, comecar, faseRef, terminar };
    } else {
      delete w.__duelo;
    }
  }, [mandarLixo, fixar, spawn, comecar, terminar]);

  // ── LOOP único desenha OS DOIS tabuleiros ──
  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const passo = (agora: number) => {
      raf = requestAnimationFrame(passo);
      const dt = Math.min(100, agora - ultimo);
      ultimo = agora;

      // simulação dos DOIS (pausa honesta congela ambos)
      if (faseRef.current === "playing") {
        for (let i = 0; i < 2; i++) {
          const j = js.current[i];
          if (!j.vivo || !j.atual) continue;
          const p = j.atual;
          if (colide(j, p, 0, 1)) {
            j.noSolo = true;
            j.accLock += dt;
            if (j.accLock >= LOCK_DELAY_MS) {
              fixar(i);
              if (j.vivo && !spawn(j)) { j.vivo = false; terminar(i); }
            }
          } else {
            j.noSolo = false;
            j.accQueda += dt;
            const g = gravidadeMs(j.nivel);
            while (j.accQueda >= g && j.atual) {
              j.accQueda -= g;
              if (!colide(j, j.atual, 0, 1)) j.atual.y += 1;
              else break;
            }
          }
        }
        // espelha HUD (barato — 2×4 números)
        setHud({ p: js.current.map((j) => ({ pontos: j.pontos, linhas: j.linhas, enviadas: j.enviadas, nivel: j.nivel })) });
      }

      // ── render dos dois canvases ──
      for (let i = 0; i < 2; i++) {
        const cv = canvases.current[i];
        const ctx = cv?.getContext("2d");
        if (!cv || !ctx) continue;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = cv.clientWidth, ch = cv.clientHeight;
        if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
          cv.width = Math.round(cw * dpr);
          cv.height = Math.round(ch * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, cw, ch);
        const cel = Math.min(cw / LARG, ch / ALT);
        const ox = (cw - cel * LARG) / 2, oy = (ch - cel * ALT) / 2;
        const j = js.current[i];

        // grelha
        ctx.strokeStyle = "rgba(148,163,184,0.07)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= LARG; x++) { ctx.beginPath(); ctx.moveTo(ox + x * cel, oy); ctx.lineTo(ox + x * cel, oy + ALT * cel); ctx.stroke(); }
        for (let y = 0; y <= ALT; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cel); ctx.lineTo(ox + LARG * cel, oy + y * cel); ctx.stroke(); }

        const celula = (x: number, y: number, tipo: string, fantasma = false) => {
          const def = PECAS[tipo];
          const px = ox + x * cel, py = oy + y * cel;
          ctx.globalAlpha = fantasma ? 0.22 : 1;
          ctx.fillStyle = tipo === "X" ? COR_LIXO : (def?.cor ?? "#94a3b8");
          const r = Math.max(2, cel * 0.14);
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, cel - 2, cel - 2, r);
          ctx.fill();
          if (!fantasma && tipo !== "X") {
            ctx.shadowColor = def?.neon ?? "#000";
            ctx.shadowBlur = cel * 0.35;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255,255,255,0.26)";
            ctx.beginPath();
            ctx.roundRect(px + 3, py + 3, cel - 6, cel * 0.26, r * 0.6);
            ctx.fill();
          } else if (tipo === "X") {
            // risco do lixo (o furo é visível)
            ctx.strokeStyle = "rgba(15,23,42,0.55)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px + 4, py + cel - 4); ctx.lineTo(px + cel - 4, py + 4); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        };

        for (let y = 0; y < ALT; y++) for (let x = 0; x < LARG; x++) {
          const t = j.tabuleiro[y][x];
          if (t) celula(x, y, t);
        }

        // peça atual + fantasma
        const p = j.atual;
        if (p && faseRef.current !== "over" && j.vivo) {
          const def = PECAS[p.tipo];
          let gy = p.y;
          while (!colide(j, p, 0, gy - p.y + 1)) gy++;
          if (gy !== p.y) {
            for (const [cx, cy] of def.celas[((p.rot % 4) + 4) % 4]) {
              const x = p.x + cx, y = gy + cy;
              if (y >= 0) celula(x, y, p.tipo, true);
            }
          }
          for (const [cx, cy] of def.celas[((p.rot % 4) + 4) % 4]) {
            const x = p.x + cx, y = p.y + cy;
            if (y >= 0) celula(x, y, p.tipo);
          }
        }

        // toast do duelo (lixo recebido / limpezas)
        if (toast.current && toast.current.j === i && agora < toast.current.ate) {
          ctx.globalAlpha = Math.min(1, (toast.current.ate - agora) / 400);
          ctx.font = `900 ${Math.round(cel * 0.5)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.shadowColor = toast.current.cor;
          ctx.shadowBlur = 12;
          ctx.fillStyle = toast.current.cor;
          ctx.fillText(toast.current.txt, cw / 2, oy + ALT * cel * 0.3);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }

        // X por cima de quem morreu
        if (!j.vivo) {
          ctx.fillStyle = "rgba(11,16,32,0.78)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = "#f87171";
          ctx.font = "900 26px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("K.O.", cw / 2, ch / 2);
        }
        if (faseRef.current === "paused") {
          ctx.fillStyle = "rgba(11,16,32,0.72)";
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "800 18px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("PAUSA", cw / 2, ch / 2);
        }
      }
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [colide, fixar, spawn, terminar]);

  // ── teclado (WASD+Espaço+Q vs SETAS+Enter+M · P pausa ambos) ──
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        if (faseRef.current === "playing") { setFase2("paused"); SOM.pausa(); return; }
        if (faseRef.current === "paused") { setFase2("playing"); SOM.inicio(); return; }
      }
      if (faseRef.current !== "playing") return;
      switch (e.key) {
        // JOGADOR 1 — metade esquerda do teclado
        case "a": case "A": mover(0, -1); break;
        case "d": case "D": mover(0, 1); break;
        case "w": case "W": rodar(0); break;
        case "s": case "S": quedaSuave(0); break;
        case " ": e.preventDefault(); quedaDura(0); break;
        case "q": case "Q": guardar(0); break;
        // JOGADOR 2 — metade direita (setas)
        case "ArrowLeft": e.preventDefault(); mover(1, -1); break;
        case "ArrowRight": e.preventDefault(); mover(1, 1); break;
        case "ArrowUp": e.preventDefault(); rodar(1); break;
        case "ArrowDown": e.preventDefault(); quedaSuave(1); break;
        case "Enter": e.preventDefault(); quedaDura(1); break;
        case "m": case "M": guardar(1); break;
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [mover, rodar, quedaSuave, quedaDura, guardar]);

  return (
    <div className="w-full max-w-4xl mx-auto select-none" data-testid="duelo-root">
      {/* placar dos DOIS */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {NOMES.map((nome, i) => (
          <div key={nome} className="rounded-xl bg-card border border-border px-3 py-2" style={{ borderColor: `${CORES_J[i]}44` }}>
            <p className="text-[10px] font-bold uppercase flex items-center justify-between" style={{ color: CORES_J[i] }}>
              {nome} <span className="text-muted-foreground normal-case">Nv {hud.p[i].nivel}</span>
            </p>
            <div className="flex items-baseline gap-3 mt-0.5">
              <p className="text-lg font-extrabold text-foreground">{hud.p[i].pontos.toLocaleString("pt")}</p>
              <p className="text-[10px] text-muted-foreground">linhas {hud.p[i].linhas} · lixo enviado <span className="font-bold text-rose-400" data-testid={`duelo-enviado-${i + 1}`}>{hud.p[i].enviadas}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* DOIS tabuleiros lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        {NOMES.map((_, i) => (
          <div key={i} className="relative rounded-2xl border-2 overflow-hidden bg-[#0b1020]" style={{ borderColor: `${CORES_J[i]}55`, boxShadow: `0 0 22px ${CORES_J[i]}22` }}>
            <canvas ref={(el) => { canvases.current[i] = el; }} className="w-full h-[380px] sm:h-[440px] block" data-testid={`duelo-board-${i + 1}`} />
            {fase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0b1020]/90">
                <p className="text-sm font-black" style={{ color: CORES_J[i] }}>{NOMES[i]}</p>
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed px-2">
                  {i === 0 ? "A/D mover · W rodar · S descer · ESPAÇO queda dura · Q hold" : "← → mover · ↑ rodar · ↓ descer · ENTER queda dura · M hold"}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* barra de baixo */}
      <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
        {fase === "idle" && (
          <Button size="lg" onClick={comecar} className="gap-2 font-bold" data-testid="duelo-comecar">
            <Swords className="w-5 h-5" /> Começar o duelo
          </Button>
        )}
        {(fase === "playing" || fase === "paused") && (
          <Button variant="outline" size="sm" onClick={() => {
            const nova = faseRef.current === "playing" ? "paused" : "playing";
            setFase2(nova);
            nova === "playing" ? SOM.inicio() : SOM.pausa();
          }} data-testid="duelo-pausa" className="gap-1.5">
            {fase === "playing" ? "Pausar (P)" : "Continuar (P)"}
          </Button>
        )}
        {fase === "over" && vencedor !== null && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2 w-full">
            <Badge className="text-sm font-black px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none" data-testid="duelo-vencedor">
              🏆 {NOMES[vencedor]} VENCEU! ({hud.p[vencedor].pontos.toLocaleString("pt")} pts · {hud.p[vencedor].enviadas} linhas de lixo)
            </Badge>
            <div className="flex gap-2">
              <Button onClick={comecar} className="gap-1.5" data-testid="duelo-recomecar"><RotateCcw className="w-4 h-4" /> Revanche</Button>
              {onSair && <Button variant="outline" onClick={onSair} className="gap-1.5" data-testid="duelo-sair"><ArrowLeft className="w-4 h-4" /> Voltar ao solo</Button>}
            </div>
          </motion.div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        DOUBLE manda 1 linha · TRIPLE 2 · <span className="text-cyan-400 font-bold">TETRIS 4</span> — quem encher até cima perde. P pausa os dois.
      </p>
    </div>
  );
}

// re-export para o Tetris.tsx não duplicar tipos
export { LIXO_POR_LINHA };
