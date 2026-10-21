// ============================================================
// BATEUCRAFT — Atlas de texturas procedurais (pixel art original)
// 16×16 px por tile, NearestFilter para ficar BEM NÍTIDO.
// Nenhuma imagem externa: tudo desenhado em canvas.
// ============================================================

import { Aleatorio } from "./noise";

export const TILE = 16;
export const COLS_ATLAS = 8, LINHAS_ATLAS = 3;

// Índices dos tiles no atlas
export const T = {
  RELVA_TOPO: 0, RELVA_LADO: 1, TERRA: 2, PEDRA: 3, PEDREGULHO: 4, AREIA: 5,
  AGUA: 6, TRONCO_TOPO: 7, TRONCO_LADO: 8, FOLHAS: 9, FOLHAS_ALT: 10, TABUAS: 11,
  CARVAO: 12, FERRO: 13, OURO: 14, DIAMANTE: 15, ROCHA_MAE: 16, MESA_TOPO: 17,
  MESA_LADO: 18, FORNALHA_TOPO: 19, FORNALHA_FRENTE: 20, TOCHA: 21, VIDRO: 22,
};

type Pixel = [number, number, number];

function hex(c: string): Pixel {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function clamp255(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }

/** Desenha um tile 16×16 num ImageData, variando a cor base por pixel */
function pintar(
  ctx: CanvasRenderingContext2D, col: number, linha: number,
  base: string, variacao = 14, semente = 1,
  detalhe?: (px: (x: number, y: number, cor: Pixel) => void) => void,
) {
  const img = ctx.createImageData(TILE, TILE);
  const b = hex(base);
  const rnd = new Aleatorio(semente * 7919 + col * 131 + linha * 17);
  const set = (x: number, y: number, c: Pixel) => {
    const i = (y * TILE + x) * 4;
    img.data[i] = clamp255(c[0]); img.data[i + 1] = clamp255(c[1]); img.data[i + 2] = clamp255(c[2]); img.data[i + 3] = 255;
  };
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const d = (rnd.proximo() - 0.5) * 2 * variacao;
    set(x, y, [b[0] + d, b[1] + d, b[2] + d]);
  }
  if (detalhe) detalhe((x, y, c) => { if (x >= 0 && x < TILE && y >= 0 && y < TILE) set(x, y, c); });
  ctx.putImageData(img, col * TILE, linha * TILE);
}

const MISTURAR = (a: Pixel, b: Pixel, t: number): Pixel =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Cria o atlas completo (128×48) */
export function criarAtlas(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = COLS_ATLAS * TILE; cv.height = LINHAS_ATLAS * TILE;
  const ctx = cv.getContext("2d")!;

  const verde = hex("#4f9e2f"), verdeEsc = hex("#3a7a20"), terraEsc = hex("#5d4028"),
    cinza = hex("#8a8a8a"), cinzaEsc = hex("#6a6a6a");

  // 0 relva topo
  pintar(ctx, 0, 0, "#4f9e2f", 18, 11, (px) => {
    for (let i = 0; i < 22; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), verdeEsc);
  });
  // 1 relva lado — terra com faixa verde no topo
  pintar(ctx, 1, 0, "#7a5636", 14, 12, (px) => {
    for (let x = 0; x < 16; x++) {
      const h = 3 + (x % 3);
      for (let y = 0; y < h; y++) px(x, y, MISTURAR(verde, verdeEsc, (x * 7 + y * 13) % 5 / 5));
    }
  });
  // 2 terra
  pintar(ctx, 2, 0, "#7a5636", 16, 13, (px) => {
    for (let i = 0; i < 14; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), terraEsc);
  });
  // 3 pedra
  pintar(ctx, 3, 0, "#8a8a8a", 12, 14, (px) => {
    for (let i = 0; i < 10; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), cinzaEsc);
  });
  // 4 pedregulho — pedras arredondadas
  pintar(ctx, 4, 0, "#7d7d7d", 8, 15, (px) => {
    const pedras: Pixel = hex("#9b9b9b"), sombra: Pixel = hex("#585858");
    const rec = [[1, 1, 6, 4], [9, 2, 5, 5], [2, 8, 5, 6], [9, 9, 6, 5], [6, 6, 3, 3]] as const;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, sombra);
    for (const [rx, ry, rw, rh] of rec)
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++)
        px(x, y, MISTURAR(pedras, cinza, ((x + y) % 4) / 6));
  });
  // 5 areia
  pintar(ctx, 5, 0, "#dcc98f", 12, 16);
  // 6 água — ondas horizontais
  pintar(ctx, 6, 0, "#3a6fd8", 8, 17, (px) => {
    const claro: Pixel = hex("#5a8ff0");
    for (let y = 2; y < 16; y += 5) for (let x = 0; x < 16; x++) if ((x + y) % 7 < 4) px(x, y, claro);
  });
  // 7 tronco topo — anéis
  pintar(ctx, 7, 0, "#9a6b39", 6, 18, (px) => {
    const anel: Pixel = hex("#7a5124"), centro: Pixel = hex("#b5854e");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 2.2) px(x, y, centro); else if (Math.abs((d % 3) - 1.4) < 0.55) px(x, y, anel);
    }
  });
  // 8 tronco lado — casca vertical
  pintar(ctx, 8, 0, "#6d4a26", 10, 19, (px) => {
    const casca: Pixel = hex("#8a6034");
    for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if ((x + y) % 5 !== 0) px(x, y, casca);
  });
  // 9 folhas
  pintar(ctx, 9, 0, "#3e8c2a", 20, 20, (px) => {
    const esc: Pixel = hex("#2c6a1c"), buraco: Pixel = hex("#255c17");
    for (let i = 0; i < 20; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), esc);
    for (let i = 0; i < 6; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), buraco);
  });
  // 10 folhas alternativa (outono suave)
  pintar(ctx, 10, 0, "#43882d", 22, 21, (px) => {
    const lima: Pixel = hex("#6aa53c");
    for (let i = 0; i < 12; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), lima);
  });
  // 11 tábuas — pranchas horizontais
  pintar(ctx, 11, 1, "#b78b52", 8, 22, (px) => {
    const linha: Pixel = hex("#8a6238"), veio: Pixel = hex("#a37c46");
    for (let y = 0; y < 16; y++) { if (y % 4 === 3) for (let x = 0; x < 16; x++) px(x, y, linha); else for (let x = 0; x < 16; x++) if ((x * 3 + y) % 9 === 0) px(x, y, veio); }
    px(7, 1, linha); px(3, 5, linha); px(12, 9, linha); px(6, 13, linha);
  });
  // 12–15 minérios: pedra + manchas coloridas
  const mina = (col: number, linha: number, semente: number, cor: string) =>
    pintar(ctx, col, linha, "#8a8a8a", 12, semente, (px) => {
      const gema = hex(cor), gemaEsc = hex(cor).map((v) => v * 0.7) as Pixel;
      const manchas = [[3, 3], [10, 4], [5, 10], [12, 11], [8, 7]] as const;
      for (const [mx, my] of manchas) {
        px(mx, my, gema); px(mx + 1, my, gemaEsc); px(mx, my + 1, gemaEsc); px(mx + 1, my + 1, gema);
      }
    });
  mina(12, 1, 31, "#2b2b2b");   // carvão
  mina(13, 1, 32, "#d8af93");   // ferro
  mina(14, 1, 33, "#f0d04a");   // ouro
  mina(15, 1, 34, "#4fe0d8");   // diamante
  // 16 rocha-mãe
  pintar(ctx, 0, 2, "#3a3a3a", 16, 35, (px) => {
    const esc: Pixel = hex("#1c1c1c"), clr: Pixel = hex("#555");
    for (let i = 0; i < 24; i++) px(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), Math.random() < 0.5 ? esc : clr);
  });
  // 17 mesa topo — grelha
  pintar(ctx, 1, 2, "#b78b52", 8, 36, (px) => {
    const grade: Pixel = hex("#6d4a26"), branco: Pixel = hex("#d8c9a8");
    for (let i = 0; i < 16; i++) { px(i, 0, grade); px(i, 15, grade); px(0, i, grade); px(15, i, grade); px(i, 7, grade); px(7, i, grade); }
    for (const [gx, gy] of [[3, 3], [11, 3], [3, 11], [11, 11]] as const) { px(gx, gy, branco); px(gx + 1, gy, branco); px(gx, gy + 1, branco); }
  });
  // 18 mesa lado — tábuas com ferramentas
  pintar(ctx, 2, 2, "#9a7243", 10, 37, (px) => {
    const linha: Pixel = hex("#6d4a26"), serr: Pixel = hex("#c8c8c8");
    for (let y = 0; y < 16; y++) { if (y % 5 === 4) for (let x = 0; x < 16; x++) px(x, y, linha); }
    for (let y = 2; y < 7; y++) px(4, y, serr);
    for (let x = 3; x < 6; x++) px(x, 2, serr);
  });
  // 19 fornalha topo
  pintar(ctx, 3, 2, "#6e6e6e", 10, 38, (px) => {
    const borda: Pixel = hex("#4a4a4a");
    for (let i = 0; i < 16; i++) { px(i, 0, borda); px(i, 15, borda); px(0, i, borda); px(15, i, borda); }
  });
  // 20 fornalha frente — boca de fogo
  pintar(ctx, 4, 2, "#6e6e6e", 10, 39, (px) => {
    const borda: Pixel = hex("#4a4a4a"), fogo: Pixel = hex("#f08a2a"), fogo2: Pixel = hex("#f0c542");
    for (let i = 0; i < 16; i++) { px(i, 0, borda); px(i, 15, borda); px(0, i, borda); px(15, i, borda); }
    for (let y = 8; y < 14; y++) for (let x = 4; x < 12; x++) px(x, y, fogo);
    for (let y = 10; y < 13; y++) for (let x = 6; x < 10; x++) px(x, y, fogo2);
  });
  // 21 tocha — pau + chama
  pintar(ctx, 5, 2, "#000000", 0, 40, (px) => {
    const pau: Pixel = hex("#8a5a2a"), chama: Pixel = hex("#f0c542"), nuc: Pixel = hex("#fff0a0");
    for (let y = 6; y < 16; y++) for (let x = 7; x < 9; x++) px(x, y, pau);
    for (let y = 2; y < 6; y++) for (let x = 6; x < 10; x++) px(x, y, chama);
    px(7, 3, nuc); px(8, 3, nuc); px(7, 4, nuc); px(8, 4, nuc);
  });
  // 22 vidro — moldura + brilho
  pintar(ctx, 6, 2, "#bfe6f0", 4, 41, (px) => {
    const mold: Pixel = hex("#8fb8c8"), brilho: Pixel = hex("#ffffff");
    for (let i = 0; i < 16; i++) { px(i, 0, mold); px(i, 15, mold); px(0, i, mold); px(15, i, mold); }
    for (let i = 2; i < 7; i++) px(i, 9 - i + 2, brilho);
  });

  return cv;
}

/** Cara de personagem LEGO (amarela, olhos e sorriso) para a cabeça cilíndrica */
export function criarCaraLego(cor: string, tipo: "heroi" | "zumbi" | "estourador" | "porco"): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 64;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = cor; ctx.fillRect(0, 0, 64, 64);
  const ruido = new Aleatorio(999);
  // grão de plástico
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = ruido.proximo() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(Math.floor(ruido.proximo() * 64), Math.floor(ruido.proximo() * 64), 1, 1);
  }
  const olho = (x: number, y: number, w: number, h: number, corOlho = "#ffffff", pupila = "#181818") => {
    ctx.fillStyle = corOlho; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pupila; ctx.fillRect(x + Math.floor(w / 4), y + Math.floor(h / 3), Math.max(2, Math.floor(w / 2)), Math.floor(h / 2));
  };
  if (tipo === "heroi") {
    olho(18, 22, 8, 10); olho(38, 22, 8, 10);
    ctx.fillStyle = "#181818";
    ctx.fillRect(24, 40, 16, 3); ctx.fillRect(22, 38, 3, 3); ctx.fillRect(39, 38, 3, 3);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(26, 46, 12, 2);
  } else if (tipo === "zumbi") {
    olho(16, 20, 10, 8, "#c8e0a0", "#0a2a08");
    olho(38, 22, 8, 10, "#c8e0a0", "#0a2a08");
    ctx.fillStyle = "#0a2a08"; ctx.fillRect(22, 40, 20, 4); ctx.fillRect(26, 44, 12, 3);
    ctx.fillStyle = "#4a7a2a"; ctx.fillRect(10, 34, 6, 4); ctx.fillRect(48, 30, 5, 5);
  } else if (tipo === "estourador") {
    ctx.fillStyle = "#0a2a08";
    ctx.fillRect(14, 18, 12, 12); ctx.fillRect(38, 18, 12, 12);
    ctx.fillStyle = "#4fe0d8"; ctx.fillRect(17, 21, 5, 5); ctx.fillRect(41, 21, 5, 5);
    ctx.fillStyle = "#0a2a08"; ctx.fillRect(24, 34, 16, 6); ctx.fillRect(20, 38, 6, 10); ctx.fillRect(38, 38, 6, 10);
  } else {
    // porco: focinho
    ctx.fillStyle = "#d06a8a"; ctx.fillRect(22, 32, 20, 14);
    ctx.fillStyle = "#8a3a54"; ctx.fillRect(26, 36, 4, 6); ctx.fillRect(34, 36, 4, 6);
    olho(14, 18, 7, 8, "#fff", "#181818"); olho(43, 18, 7, 8, "#fff", "#181818");
  }
  return cv;
}
