import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Pause, Trophy, ChevronLeft, ChevronRight, ChevronDown, RotateCw, Archive, ArrowDownToLine, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { playSfx, haptic } from "@/components/games/kit";

// sons do KIT (tabela fechada) → nomes do Tetris
const SOM = {
  linha: (n: number) => playSfx(n >= 2 ? "combo" : "coin"),
  quedaDura: () => playSfx("explosion", { volume: 0.5, pitch: 1.6 }),
  rodar: () => playSfx("click", { pitch: 1.8, volume: 0.5 }),
  guardar: () => playSfx("pop"),
  mover: () => playSfx("tick", { volume: 0.3, pitch: 2 }),
  nivel: () => playSfx("levelup"),
  fim: () => playSfx("lose"),
  inicio: () => playSfx("powerup"),
  pausa: () => playSfx("click", { pitch: 0.7 }),
};

// ═══ TETRIS CLÁSSICO — v72 ════════════════════════════════════
// O clássico mundial que as pessoas MAIS jogam, na versão digna:
// · saco de 7 (7-bag — distribuição honesta, nunca seca de peças)
// · HOLD + fila de próximas ×3 + peça FANTASMA
// · kicks de parede (a peça roda perto da parede/da pilha)
// · pontos CLÁSSICOS: linha 100/300/500/800 × nível, soft/hard
//   drop, COMBO e back-to-back (tetris seguido ×1,5)
// · nível sobe a cada 10 linhas — a gravidade acelera
// · partículas + flash + tremor nas limpezas (suco arcade)
// · móvel: 6 botões grandes + pausa · teclado: setas/ZX/C/espaço

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "idle" | "playing" | "paused" | "over";

const LARG = 10, ALT = 20;
const LINHAS_POR_NIVEL = 10;
const LOCK_DELAY_MS = 500;
const PONTOS_LINHA = [0, 100, 300, 500, 800];

// v73: exportados para o DUELO 2P (TetrisDuelo.tsx) — fonte única das peças
export { LARG, ALT, LOCK_DELAY_MS, PONTOS_LINHA, LINHAS_POR_NIVEL };

// peças (matrizes 4×4 no estado de rotação 0 — rotação por matriz)
export const PECAS: Record<string, { cor: string; neon: string; celas: Array<[number, number]>[] }> = {
  I: {
    cor: "#22d3ee", neon: "#0ea5e9",
    celas: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
  },
  O: {
    cor: "#facc15", neon: "#eab308",
    celas: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
  },
  T: {
    cor: "#c084fc", neon: "#a855f7",
    celas: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  S: {
    cor: "#4ade80", neon: "#22c55e",
    celas: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
  },
  Z: {
    cor: "#f87171", neon: "#ef4444",
    celas: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [0, 2], [1, 1]],
    ],
  },
  J: {
    cor: "#60a5fa", neon: "#3b82f6",
    celas: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
  },
  L: {
    cor: "#fb923c", neon: "#f97316",
    celas: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  },
};

export type TipoPeca = keyof typeof PECAS;
export interface Parte { tipo: TipoPeca; rot: number; x: number; y: number }

export function novoSaco(): TipoPeca[] {
  const tipos: TipoPeca[] = ["I", "O", "T", "S", "Z", "J", "L"];
  for (let i = tipos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
  }
  return tipos;
}

export const KICKS: Array<[number, number]> = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, -2]];

export function gravidadeMs(nivel: number): number {
  // curva clássica suavizada: nível 1 = 800 ms → nível 15 = 80 ms
  return Math.max(80, Math.round(800 * Math.pow(0.85, nivel - 1)));
}

// v73: o DUELO 2P carrega só quando é pedido (o solo continua leve)
const TetrisDuelo = lazy(() => import("./TetrisDuelo"));

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; maxVida: number; cor: string; tam: number }

export default function Tetris({ onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // v73: DUELO 2P — quando ativo, o duelo substitui o solo (botão «Voltar ao solo»)
  const [modo, setModo] = useState<"solo" | "duelo">("solo");
  const [fase, setFase] = useState<Phase>("idle");
  const [pontos, setPontos] = useState(0);
  const [linhas, setLinhas] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [recorde, setRecorde] = useState(() => {
    try { return Number(localStorage.getItem("bateu_tetris_recorde") || 0); } catch { return 0; }
  });
  const [fimDeJogo, setFimDeJogo] = useState<{ pontos: number; linhas: number } | null>(null);
  const [toastTxt, setToastTxt] = useState<{ txt: string; cor: string } | null>(null);
  const [proximo, setProximo] = useState<TipoPeca[]>([]);
  const [holdTipo, setHoldTipo] = useState<TipoPeca | null>(null);

  // ── estado do jogo em refs (o loop manda; o React só espelha) ──
  // v72 FURO (apanhado pela suíte): nascer vazio fazia o loop de RENDER
  // desenhar antes do 1.º «Jogar» → tabuleiro.current[y] undefined →
  // TypeError por frame. A grelha nasce de uma vez.
  const tabuleiro = useRef<Array<Array<string | null>>>(
    Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null))
  );
  const atual = useRef<Parte | null>(null);
  const fila = useRef<TipoPeca[]>([]);
  const hold = useRef<TipoPeca | null>(null);
  const holdUsado = useRef(false);
  const faseRef = useRef<Phase>("idle");
  const nivelRef = useRef(1);
  const accQueda = useRef(0);
  const accLock = useRef(0);
  const noSolo = useRef(false);
  const particulas = useRef<Particula[]>([]);
  const shake = useRef(0);
  const flash = useRef(0);
  const pontRef = useRef(0);
  const comboRef = useRef(0);
  const b2b = useRef(false);
  const linhasRef = useRef(0);
  const ultimaLimpeza = useRef(0);

  const setFase2 = (f: Phase) => { faseRef.current = f; setFase(f); };

  // ── tabuleiro limpo ──
  const limparTabuleiro = () => {
    tabuleiro.current = Array.from({ length: ALT }, () => Array<string | null>(LARG).fill(null));
  };

  // ── colisão ──
  const colide = useCallback((p: Parte, dx = 0, dy = 0, rot = p.rot): boolean => {
    const def = PECAS[p.tipo];
    for (const [cx, cy] of def.celas[((rot % 4) + 4) % 4]) {
      const x = p.x + cx + dx, y = p.y + cy + dy;
      if (x < 0 || x >= LARG || y >= ALT) return true;
      if (y >= 0 && tabuleiro.current[y][x]) return true;
    }
    return false;
  }, []);

  // ── próxima peça do saco (fila infinita de sacos de 7) ──
  const tirarDaFila = useCallback((): TipoPeca => {
    while (fila.current.length < 7) fila.current.push(...novoSaco());
    return fila.current.shift()!;
  }, []);

  const spawn = useCallback((): boolean => {
    const tipo = tirarDaFila();
    const p: Parte = { tipo, rot: 0, x: 3, y: -1 };
    // tenta nascer um pouco acima; se já colide → GAME OVER
    if (colide(p)) { return false; }
    atual.current = p;
    holdUsado.current = false;
    accQueda.current = 0;
    accLock.current = 0;
    noSolo.current = false;
    setProximo(fila.current.slice(0, 3));
    return true;
  }, [colide, tirarDaFila]);

  // ── lock da peça no tabuleiro + limpeza de linhas ──
  const fixar = useCallback((): boolean => {
    const p = atual.current;
    if (!p) return false;
    const def = PECAS[p.tipo];
    let foraDoTopo = false;
    for (const [cx, cy] of def.celas[((p.rot % 4) + 4) % 4]) {
      const x = p.x + cx, y = p.y + cy;
      if (y < 0) { foraDoTopo = true; continue; }
      tabuleiro.current[y][x] = p.tipo;
    }
    // linhas completas
    let limpas: number[] = [];
    for (let y = 0; y < ALT; y++) {
      if (tabuleiro.current[y].every((c) => c !== null)) limpas.push(y);
    }
    if (limpas.length > 0) {
      // partículas das linhas limpas
      for (const y of limpas) {
        for (let x = 0; x < LARG; x++) {
          const cor = PECAS[tabuleiro.current[y][x] as TipoPeca]?.cor ?? "#fff";
          for (let k = 0; k < 3; k++) {
            particulas.current.push({
              x: (x + 0.5), y: (y + 0.5),
              vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 1) * 5,
              vida: 1, maxVida: 1, cor, tam: 2 + Math.random() * 3,
            });
          }
        }
      }
      // remove de baixo para cima
      limpas.sort((a, b) => b - a);
      for (const y of limpas) {
        tabuleiro.current.splice(y, 1);
        tabuleiro.current.unshift(Array<string | null>(LARG).fill(null));
      }
      // PONTUAÇÃO clássica + combo + B2B
      const nome: Record<number, string> = { 1: "SINGLE", 2: "DOUBLE", 3: "TRIPLE", 4: "TETRIS!" };
      comboRef.current += 1;
      const bonusCombo = comboRef.current > 1 ? 50 * (comboRef.current - 1) : 0;
      let ganho = PONTOS_LINHA[limpas.length] * nivelRef.current + bonusCombo;
      const tetris = limpas.length === 4;
      if (tetris && b2b.current) ganho = Math.round(ganho * 1.5);
      b2b.current = tetris;
      pontRef.current += ganho;
      linhasRef.current += limpas.length;
      const novoNivel = 1 + Math.floor(linhasRef.current / LINHAS_POR_NIVEL);
      if (novoNivel > nivelRef.current) {
        nivelRef.current = novoNivel;
        setToastTxt({ txt: `NÍVEL ${novoNivel}!`, cor: "#facc15" });
        SOM.nivel();
      } else {
        setToastTxt({ txt: `${nome[limpas.length]}${comboRef.current > 1 ? ` · COMBO ×${comboRef.current}` : ""}${bonusCombo ? ` +${bonusCombo}` : ""}`, cor: tetris ? "#22d3ee" : "#4ade80" });
      }
      if (tetris) { shake.current = 1; flash.current = 0.7; }
      else if (limpas.length >= 2) shake.current = 0.45;
      SOM.linha(limpas.length);
      haptic(tetris ? [30, 40, 30] : 20);
      setPontos(pontRef.current);
      setLinhas(linhasRef.current);
      setNivel(nivelRef.current);
      setCombo(comboRef.current);
      ultimaLimpeza.current = performance.now();
    } else {
      // combo quebra quando uma peça não limpa linha
      comboRef.current = 0;
      setCombo(0);
    }
    atual.current = null;
    return !foraDoTopo || limpas.length > 0;
  }, []);

  // ── ações do jogador ──
  const mover = useCallback((dx: number) => {
    const p = atual.current;
    if (!p || faseRef.current !== "playing") return;
    if (!colide(p, dx, 0)) {
      p.x += dx;
      if (noSolo.current) accLock.current = 0; // movimento re-armazena o lock delay
      SOM.mover();
    }
  }, [colide]);

  const rodar = useCallback(() => {
    const p = atual.current;
    if (!p || faseRef.current !== "playing") return;
    const novaRot = (p.rot + 1) % 4;
    for (const [dx, dy] of KICKS) {
      if (!colide(p, dx, dy, novaRot)) {
        p.rot = novaRot;
        p.x += dx;
        p.y += dy;
        if (noSolo.current) accLock.current = 0;
        SOM.rodar();
        return;
      }
    }
  }, [colide]);

  const quedaSuave = useCallback(() => {
    const p = atual.current;
    if (!p || faseRef.current !== "playing") return;
    if (!colide(p, 0, 1)) {
      p.y += 1;
      pontRef.current += 1;
      setPontos(pontRef.current);
      accQueda.current = 0;
    }
  }, [colide]);

  const quedaDura = useCallback(() => {
    const p = atual.current;
    if (!p || faseRef.current !== "playing") return;
    let n = 0;
    while (!colide(p, 0, 1)) { p.y += 1; n++; }
    pontRef.current += n * 2;
    setPontos(pontRef.current);
    SOM.quedaDura();
    haptic(35);
    shake.current = Math.max(shake.current, 0.35);
    fixar();
    if (!spawn()) terminar();
  }, [colide, fixar, spawn]);

  const guardar = useCallback(() => {
    if (!atual.current || faseRef.current !== "playing" || holdUsado.current) return;
    const atualTipo = atual.current.tipo;
    SOM.guardar();
    if (hold.current) {
      const t = hold.current;
      hold.current = atualTipo;
      const p: Parte = { tipo: t, rot: 0, x: 3, y: -1 };
      if (colide(p)) { hold.current = t; return; }
      atual.current = p;
      accQueda.current = 0;
      accLock.current = 0;
      noSolo.current = false;
    } else {
      hold.current = atualTipo;
      if (!spawn()) terminar();
    }
    setHoldTipo(hold.current);
    holdUsado.current = true;
  }, [colide, spawn]);

  const terminar = useCallback(() => {
    setFase2("over");
    const rec = Math.max(recorde, pontRef.current);
    setRecorde(rec);
    try { localStorage.setItem("bateu_tetris_recorde", String(rec)); } catch { /* sem armazenamento */ }
    setFimDeJogo({ pontos: pontRef.current, linhas: linhasRef.current });
    SOM.fim();
    try { onScore?.("tetris", pontRef.current); } catch { /* fora do modo live */ }
  }, [onScore, recorde]);

  // ── começar ──
  const comecar = useCallback(() => {
    limparTabuleiro();
    fila.current = [];
    hold.current = null;
    holdUsado.current = false;
    particulas.current = [];
    pontRef.current = 0;
    comboRef.current = 0;
    b2b.current = false;
    linhasRef.current = 0;
    nivelRef.current = 1;
    shake.current = 0;
    flash.current = 0;
    setPontos(0); setLinhas(0); setNivel(1); setCombo(0);
    setHoldTipo(null); setFimDeJogo(null); setToastTxt(null);
    setFase2("playing");
    if (!spawn()) terminar();
    SOM.inicio();
  }, [spawn, terminar]);

  // ── LOOP principal (dt-honesto, pausa congela TUDO) ──
  useEffect(() => {
    let raf = 0;
    let ultimo = performance.now();
    const desenhar = (agora: number) => {
      raf = requestAnimationFrame(desenhar);
      const dt = Math.min(100, agora - ultimo);
      ultimo = agora;

      // SIMULAÇÃO só quando a jogar
      if (faseRef.current === "playing" && atual.current) {
        const p = atual.current;
        const noChao = colide(p, 0, 1);
        noSolo.current = noChao;
        if (noChao) {
          accLock.current += dt;
          if (accLock.current >= LOCK_DELAY_MS) {
            fixar();
            if (!spawn()) { terminar(); }
          }
        } else {
          accLock.current = 0;
          accQueda.current += dt;
          const g = gravidadeMs(nivelRef.current);
          while (accQueda.current >= g && atual.current) {
            accQueda.current -= g;
            if (!colide(atual.current, 0, 1)) atual.current.y += 1;
            else break;
          }
        }
      }

      // ── RENDERIZAÇÃO (canvas) ──
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = cv.clientWidth, ch = cv.clientHeight;
      if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
        cv.width = Math.round(cw * dpr);
        cv.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cel = Math.min(cw / LARG, ch / ALT);
      const ox = (cw - cel * LARG) / 2, oy = (ch - cel * ALT) / 2;

      // tremor
      let sx = 0, sy = 0;
      if (shake.current > 0) {
        sx = (Math.random() - 0.5) * 6 * shake.current;
        sy = (Math.random() - 0.5) * 6 * shake.current;
        shake.current = Math.max(0, shake.current - dt / 400);
      }
      ctx.save();
      ctx.translate(sx, sy);

      // fundo
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(-10, -10, cw + 20, ch + 20);
      // grelha subtil
      ctx.strokeStyle = "rgba(148,163,184,0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= LARG; x++) {
        ctx.beginPath(); ctx.moveTo(ox + x * cel, oy); ctx.lineTo(ox + x * cel, oy + ALT * cel); ctx.stroke();
      }
      for (let y = 0; y <= ALT; y++) {
        ctx.beginPath(); ctx.moveTo(ox, oy + y * cel); ctx.lineTo(ox + LARG * cel, oy + y * cel); ctx.stroke();
      }

      // flash de tetris
      if (flash.current > 0) {
        ctx.fillStyle = `rgba(34,211,238,${flash.current * 0.25})`;
        ctx.fillRect(ox, oy, LARG * cel, ALT * cel);
        flash.current = Math.max(0, flash.current - dt / 350);
      }

      // célula com brilho
      const celula = (x: number, y: number, tipo: string, fantasma = false, alpha = 1) => {
        const def = PECAS[tipo as TipoPeca];
        const px = ox + x * cel, py = oy + y * cel;
        ctx.globalAlpha = fantasma ? 0.22 : alpha;
        ctx.fillStyle = def?.cor ?? "#94a3b8";
        const r = Math.max(2, cel * 0.14);
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, cel - 2, cel - 2, r);
        ctx.fill();
        if (!fantasma) {
          ctx.shadowColor = def?.neon ?? "#000";
          ctx.shadowBlur = cel * 0.4;
          ctx.fill();
          ctx.shadowBlur = 0;
          // brilho superior (aspecto 3D)
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.beginPath();
          ctx.roundRect(px + 3, py + 3, cel - 6, cel * 0.28, r * 0.6);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      };

      // tabuleiro
      for (let y = 0; y < ALT; y++) {
        for (let x = 0; x < LARG; x++) {
          const t = tabuleiro.current[y][x];
          if (t) celula(x, y, t);
        }
      }

      // peça atual + fantasma
      const p = atual.current;
      if (p && faseRef.current !== "over") {
        const def = PECAS[p.tipo];
        // fantasma: onde a peça VAI cair
        let gy = p.y;
        while (!colide(p, 0, gy - p.y + 1)) gy++;
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

      // partículas
      for (const pt of particulas.current) {
        pt.x += pt.vx * (dt / 1000);
        pt.y += pt.vy * (dt / 1000);
        pt.vy += 9 * (dt / 1000);
        pt.vida -= dt / 900;
        if (pt.vida > 0) {
          ctx.globalAlpha = Math.max(0, pt.vida / pt.maxVida);
          ctx.fillStyle = pt.cor;
          ctx.beginPath();
          ctx.arc(ox + pt.x * cel, oy + pt.y * cel, pt.tam, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      particulas.current = particulas.current.filter((pt) => pt.vida > 0);

      // toast flutuante (TETRIS! / COMBO)
      if (toastTxt && Date.now() - ultimaLimpeza.current < 1200) {
        ctx.globalAlpha = Math.min(1, (1200 - (Date.now() - ultimaLimpeza.current)) / 400);
        ctx.font = `900 ${Math.round(cel * 0.62)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = toastTxt.cor;
        ctx.shadowBlur = 14;
        ctx.fillStyle = toastTxt.cor;
        ctx.fillText(toastTxt.txt, cw / 2, oy + ALT * cel * 0.32);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      // aviso de pausa no canvas (honesto — o jogo CONGELA)
      if (faseRef.current === "paused") {
        ctx.fillStyle = "rgba(11,16,32,0.72)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "800 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUSA", cw / 2, ch / 2 - 6);
        ctx.font = "500 12px system-ui, sans-serif";
        ctx.fillText("o tempo e a gravidade estão parados", cw / 2, ch / 2 + 18);
      }
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, [colide, fixar, spawn, terminar, toastTxt]);

  // ── teclado ──
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (faseRef.current === "playing") { setFase2("paused"); SOM.pausa(); return; }
        if (faseRef.current === "paused") { setFase2("playing"); SOM.inicio(); return; }
      }
      if (faseRef.current !== "playing") return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); mover(-1); break;
        case "ArrowRight": e.preventDefault(); mover(1); break;
        case "ArrowDown": e.preventDefault(); quedaSuave(); break;
        case "ArrowUp": e.preventDefault(); rodar(); break;
        case " ": e.preventDefault(); quedaDura(); break;
        case "z": case "Z": case "x": case "X": rodar(); break;
        case "c": case "C": guardar(); break;
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [mover, rodar, quedaSuave, quedaDura, guardar]);

  // mini-próximas / hold renderizados em HTML (fila já em state)
  const chipPeca = (t: TipoPeca, pequeno = false) => {
    const def = PECAS[t];
    const celas = def.celas[0];
    const xs = celas.map((c) => c[0]), ys = celas.map((c) => c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const tam = pequeno ? 9 : 11;
    return (
      <div className="relative" style={{ width: (maxX - minX + 1) * tam, height: (maxY - minY + 1) * tam }}>
        {celas.map(([cx, cy], i) => (
          <span
            key={i}
            className="absolute rounded-[2px]"
            style={{
              left: (cx - minX) * tam, top: (cy - minY) * tam,
              width: tam - 1, height: tam - 1,
              background: def.cor, boxShadow: `0 0 6px ${def.neon}`,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto select-none" data-testid="tetris-root">
      {modo === "duelo" && (
        <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">a abrir o duelo…</div>}>
          <TetrisDuelo onScore={onScore} onSair={() => setModo("solo")} />
        </Suspense>
      )}
      {modo === "solo" && (<>
      {/* topo: pontuação */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl bg-card border border-border px-3 py-2 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Pontos</p>
          <p className="text-lg font-extrabold text-amber-400" data-testid="tetris-pontos">{pontos.toLocaleString("pt")}</p>
        </div>
        <div className="rounded-xl bg-card border border-border px-3 py-2 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Linhas · Nível</p>
          <p className="text-lg font-extrabold text-cyan-400">{linhas} · {nivel}</p>
        </div>
        <div className="rounded-xl bg-card border border-border px-3 py-2 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1"><Trophy className="w-3 h-3" /> Recorde</p>
          <p className="text-lg font-extrabold text-fuchsia-400">{recorde.toLocaleString("pt")}</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-stretch">
        {/* TABULEIRO */}
        <div className="relative rounded-2xl border-2 border-indigo-500/40 overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.25)] bg-[#0b1020]">
          <canvas ref={canvasRef} className="w-full h-[420px] sm:h-[480px] block" data-testid="tetris-canvas" />

          {fase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b1020]/90">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                <p className="text-4xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">TETRIS</p>
                <p className="text-xs text-muted-foreground mt-1">7 peças · hold · fantasma · combos</p>
              </motion.div>
              <Button size="lg" onClick={comecar} className="gap-2 font-bold" data-testid="tetris-comecar">
                <Play className="w-5 h-5" /> Jogar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setModo("duelo")} className="gap-1.5" data-testid="tetris-duelo">
                <Swords className="w-4 h-4" /> Duelo 2P — mesmo ecrã
              </Button>
              <p className="text-[10px] text-muted-foreground">← → mover · ↑ rodar · ↓ suave · espaço = queda dura · C = hold</p>
            </div>
          )}

          {fase === "over" && fimDeJogo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b1020]/92" data-testid="tetris-fim">
              <p className="text-2xl font-black text-rose-400">GAME OVER</p>
              <div className="flex gap-6 text-center">
                <div><p className="text-[10px] text-muted-foreground uppercase">Pontos</p><p className="text-xl font-extrabold text-amber-400">{fimDeJogo.pontos.toLocaleString("pt")}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase">Linhas</p><p className="text-xl font-extrabold text-cyan-400">{fimDeJogo.linhas}</p></div>
              </div>
              {fimDeJogo.pontos >= recorde && fimDeJogo.pontos > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">🏆 Novo recorde!</Badge>
              )}
              <Button onClick={comecar} className="gap-2 font-bold" data-testid="tetris-recomecar"><RotateCcw className="w-4 h-4" /> Outra vez</Button>
            </motion.div>
          )}
        </div>

        {/* LATERAL: hold + próximas + combo */}
        <div className="flex flex-col gap-2 w-[86px] sm:w-[110px]">
          <div className="rounded-xl bg-card border border-border p-2 text-center">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Hold</p>
            <div className="flex justify-center h-7 items-center">
              {holdTipo ? chipPeca(holdTipo, true) : <span className="text-[10px] text-muted-foreground/50">—</span>}
            </div>
          </div>
          <div className="rounded-xl bg-card border border-border p-2 text-center flex-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Próximas</p>
            <div className="flex flex-col items-center gap-1.5" data-testid="tetris-proximas">
              {proximo.length > 0 ? proximo.map((t, i) => <div key={i}>{chipPeca(t, true)}</div>)
                : ["T", "I", "L"].map((t, i) => <div key={i}>{chipPeca(t as TipoPeca, true)}</div>)}
            </div>
          </div>
          {combo > 1 && (
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-2 text-center">
              <p className="text-[9px] font-bold text-amber-400 uppercase">Combo</p>
              <p className="text-lg font-black text-amber-400">×{combo}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* CONTROLOS móveis */}
      {fase === "playing" && (
        <div className="mt-3 grid grid-cols-6 gap-1.5" data-testid="tetris-controlos">
          {[
            { ic: ChevronLeft, acao: () => mover(-1), titulo: "Esquerda" },
            { ic: RotateCw, acao: rodar, titulo: "Rodar" },
            { ic: ChevronRight, acao: () => mover(1), titulo: "Direita" },
            { ic: ChevronDown, acao: quedaSuave, titulo: "Descer" },
            { ic: ArrowDownToLine, acao: quedaDura, titulo: "Queda dura" },
            { ic: Archive, acao: guardar, titulo: "Hold" },
          ].map((b, i) => (
            <button
              key={i}
              onPointerDown={(e) => { e.preventDefault(); b.acao(); }}
              className="h-11 rounded-xl bg-card border border-border flex items-center justify-center active:bg-primary/20 active:scale-95 transition-transform touch-none"
              aria-label={b.titulo}
            >
              <b.ic className="w-5 h-5" />
            </button>
          ))}
        </div>
      )}

      {/* pausa / retomar */}
      {(fase === "playing" || fase === "paused") && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline" size="sm"
            onClick={() => { const nova = fase === "playing" ? "paused" : "playing"; setFase2(nova); nova === "playing" ? SOM.inicio() : SOM.pausa(); }}
            className="gap-1.5"
            data-testid="tetris-pausa"
          >
            {fase === "playing" ? <><Pause className="w-3.5 h-3.5" /> Pausar</> : <><Play className="w-3.5 h-3.5" /> Continuar</>}
          </Button>
        </div>
      )}
      </>) }
    </div>
  );
}
