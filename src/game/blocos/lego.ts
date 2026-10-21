// ============================================================
// BATEUCRAFT — Personagens LEGO (minifigs originais)
// Cabeça cilíndrica amarela, torso trapezoidal, braços e pernas
// articulados. Zumbi, Porco e Estourador no mesmo estilo.
// ============================================================

import * as THREE from "three";
import { criarCaraLego } from "./textures";

export interface AvatarLego {
  grupo: THREE.Group;
  pernaE: THREE.Mesh; pernaD: THREE.Mesh;
  bracoE: THREE.Mesh; bracoD: THREE.Mesh;
  corpo: THREE.Group;           // tronco+cabeça (para o zumbi inclinar)
  mao: THREE.Group;             // item na mão
  torchLight?: THREE.PointLight;
}

const MAT = (cor: string, opts?: THREE.MeshLambertMaterialParameters) =>
  new THREE.MeshLambertMaterial({ color: cor, ...opts });

/** Minifig humanoide genérica */
export function criarMinifig(opcoes: {
  torso: string; pernas: string; bracos?: string;
  cara?: "heroi" | "zumbi"; chapeu?: "nenhum" | "cabelo" | "bone" | "capacete";
  corChapeu?: string;
}): AvatarLego {
  const grupo = new THREE.Group();
  const corBracos = opcoes.bracos ?? opcoes.torso;

  // ── Pernas (2 blocos retangulares, pivô no topo) ──
  const geometriaPerna = new THREE.BoxGeometry(0.22, 0.55, 0.26);
  geometriaPerna.translate(0, -0.275, 0); // pivô no quadril
  const matPerna = MAT(opcoes.pernas);
  const pernaE = new THREE.Mesh(geometriaPerna, matPerna);
  pernaE.position.set(-0.13, 0.55, 0);
  const pernaD = new THREE.Mesh(geometriaPerna, matPerna);
  pernaD.position.set(0.13, 0.55, 0);

  // ancas (liga as pernas)
  const ancas = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.28), MAT(opcoes.pernas));
  ancas.position.y = 0.62;

  // ── Torso trapezoidal (mais largo em cima, como minifig) ──
  const silhuetaTorso = new THREE.Shape();
  silhuetaTorso.moveTo(-0.26, 0); silhuetaTorso.lineTo(0.26, 0);
  silhuetaTorso.lineTo(0.32, 0.55); silhuetaTorso.lineTo(-0.32, 0.55);
  silhuetaTorso.closePath();
  const geometriaTorso = new THREE.ExtrudeGeometry(silhuetaTorso, { depth: 0.3, bevelEnabled: false });
  geometriaTorso.translate(0, 0, -0.15);
  const torso = new THREE.Mesh(geometriaTorso, MAT(opcoes.torso));
  torso.position.y = 0.69;

  // ── Cabeça cilíndrica amarela com cara ──
  const geometriaCabeca = new THREE.CylinderGeometry(0.24, 0.24, 0.3, 20);
  const texturaCara = new THREE.CanvasTexture(criarCaraLego("#f5c93a", opcoes.cara ?? "heroi"));
  texturaCara.colorSpace = THREE.SRGBColorSpace;
  texturaCara.magFilter = THREE.NearestFilter;
  const materiaisCabeca = [
    MAT("#f5c93a"), MAT("#f5c93a"),
    new THREE.MeshLambertMaterial({ map: texturaCara }), // lado +Z = cara
    MAT("#f5c93a"), MAT("#f5c93a"), MAT("#f5c93a"),
  ];
  const cabeca = new THREE.Mesh(geometriaCabeca, materiaisCabeca);
  cabeca.position.y = 1.42;

  // pino no topo da cabeça (assinatura LEGO)
  const pino = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), MAT("#f5c93a"));
  pino.position.y = 1.6;

  // ── Chapéu / cabelo ──
  if (opcoes.chapeu && opcoes.chapeu !== "nenhum") {
    const corCh = opcoes.corChapeu ?? "#6a4a2a";
    if (opcoes.chapeu === "cabelo") {
      const cabelo = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.12, 20), MAT(corCh));
      cabelo.position.y = 1.62;
      const franja = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), MAT(corCh));
      franja.position.y = 1.55;
      grupo.add(cabelo, franja);
    } else if (opcoes.chapeu === "bone") {
      const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 16), MAT(corCh));
      copa.position.y = 1.63;
      const viseira = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.26), MAT(corCh));
      viseira.position.set(0, 1.58, 0.22);
      grupo.add(copa, viseira);
    } else {
      const capacete = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT(corCh));
      capacete.position.y = 1.56;
      grupo.add(capacete);
    }
  }

  // ── Braços (pivô no ombro) + mãos em C ──
  const geometriaBraco = new THREE.BoxGeometry(0.16, 0.42, 0.18);
  geometriaBraco.translate(0, -0.21, 0);
  const matBraco = MAT(corBracos);
  const maoGeo = new THREE.TorusGeometry(0.075, 0.045, 8, 12, Math.PI * 1.5);
  const maoMat = MAT("#f5c93a");

  const bracoE = new THREE.Mesh(geometriaBraco, matBraco);
  bracoE.position.set(-0.4, 1.2, 0);
  const maoE = new THREE.Mesh(maoGeo, maoMat);
  maoE.position.set(0, -0.42, 0); maoE.rotation.x = Math.PI / 2; maoE.rotation.z = Math.PI;
  bracoE.add(maoE);

  const bracoD = new THREE.Mesh(geometriaBraco, matBraco);
  bracoD.position.set(0.4, 1.2, 0);
  const maoD = new THREE.Mesh(maoGeo, maoMat);
  maoD.position.set(0, -0.42, 0); maoD.rotation.x = Math.PI / 2; maoD.rotation.z = Math.PI;
  bracoD.add(maoD);

  // ── Mão segura item ──
  const mao = new THREE.Group();
  mao.position.set(0, -0.46, 0.05);
  bracoD.add(mao);

  grupo.add(pernaE, pernaD, ancas, torso, cabeca, pino, bracoE, bracoD);
  return { grupo, pernaE, pernaD, bracoE, bracoD, corpo: grupo, mao };
}

/** Miniatura do item na mão: cubo (bloco) ou ferramenta estilizada */
export function criarItemMao(id: number, corBloco?: [string, string]): THREE.Group {
  const g = new THREE.Group();
  if (id === 0) return g;
  if (id < 100) {
    // bloco em miniatura
    const cor = corBloco ?? ["#8a8a8a", "#6a6a6a"];
    const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22),
      [MAT(cor[0]), MAT(cor[0]), MAT(cor[0]), MAT(cor[0]), MAT(cor[1]), MAT(cor[1])].map((m) => m));
    g.add(cubo);
    return g;
  }
  // ferramentas: cabo + cabeça
  const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.34, 0.045), MAT("#8a5a2a"));
  cabo.position.y = -0.17;
  g.add(cabo);
  const mats: Record<string, string> = { madeira: "#b78b52", pedra: "#9a9a9a", ferro: "#d8d8d8", diamante: "#4fe0d8" };
  const cor = mats.ferro;
  const nome = (id === 108 || id === 112) ? "madeira" : (id === 109 || id === 113) ? "pedra" : (id === 110 || id === 114) ? "ferro" : "diamante";
  const corCab = mats[nome] ?? cor;
  if (id >= 108 && id <= 111 || id === 116) {
    // picareta / pá
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.06), MAT(corCab));
    cabeca.position.y = 0.02;
    g.add(cabeca);
    if (id === 116) cabeca.scale.set(0.6, 1.6, 1.4);
  } else {
    // espada
    const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.03), MAT(corCab));
    lamina.position.y = 0.1;
    const guarda = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), MAT("#6d4a26"));
    guarda.position.y = -0.08;
    g.add(lamina, guarda);
  }
  return g;
}

/** Zumbi LEGO — pele verde, braços à frente */
export function criarZumbi(): AvatarLego {
  const a = criarMinifig({ torso: "#3a5a8a", pernas: "#2a3a5a", bracos: "#4a7a2a", cara: "zumbi" });
  a.bracoE.rotation.x = -Math.PI / 2; a.bracoD.rotation.x = -Math.PI / 2;
  return a;
}

/** Porco LEGO — caixa rosa com focinho */
export function criarPorco(): THREE.Group {
  const g = new THREE.Group();
  const rosa = MAT("#f0a0b0"), rosaEsc = MAT("#d88a9a");
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.86), rosa);
  corpo.position.y = 0.44;
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.3), rosa);
  cabeca.position.set(0, 0.56, 0.52);
  const texturaCara = new THREE.CanvasTexture(criarCaraLego("#f0a0b0", "porco"));
  texturaCara.colorSpace = THREE.SRGBColorSpace; texturaCara.magFilter = THREE.NearestFilter;
  (cabeca as any).material = [rosa, rosa, rosa, rosa, new THREE.MeshLambertMaterial({ map: texturaCara }), rosa];
  const pernaGeo = new THREE.BoxGeometry(0.14, 0.24, 0.14);
  const pernas: THREE.Mesh[] = [];
  for (const [px, pz] of [[-0.22, 0.3], [0.22, 0.3], [-0.22, -0.3], [0.22, -0.3]]) {
    const p = new THREE.Mesh(pernaGeo, rosaEsc);
    p.position.set(px, 0.12, pz);
    pernas.push(p); g.add(p);
  }
  const rabo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), rosaEsc);
  rabo.position.set(0, 0.56, -0.46);
  g.add(corpo, cabeca, rabo);
  (g as any).__pernas = pernas;
  return g;
}

/** Estourador — corpo verde alto, 4 pernas curtas (explosivo) */
export function criarEstourador(): THREE.Group {
  const g = new THREE.Group();
  const verde = MAT("#4a9a3a"), verdeEsc = MAT("#3a7a2a");
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.9, 0.3), verde);
  corpo.position.y = 0.68;
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.34), verde);
  cabeca.position.y = 1.34;
  const texturaCara = new THREE.CanvasTexture(criarCaraLego("#4a9a3a", "estourador"));
  texturaCara.colorSpace = THREE.SRGBColorSpace; texturaCara.magFilter = THREE.NearestFilter;
  (cabeca as any).material = [verde, verde, verde, verde, new THREE.MeshLambertMaterial({ map: texturaCara }), verde];
  const pernaGeo = new THREE.BoxGeometry(0.16, 0.24, 0.2);
  const pernas: THREE.Mesh[] = [];
  for (const [px, pz] of [[-0.13, 0.08], [0.13, 0.08], [-0.13, -0.08], [0.13, -0.08]]) {
    const p = new THREE.Mesh(pernaGeo, verdeEsc);
    p.position.set(px, 0.12, pz);
    pernas.push(p); g.add(p);
  }
  g.add(corpo, cabeca);
  (g as any).__pernas = pernas;
  return g;
}
