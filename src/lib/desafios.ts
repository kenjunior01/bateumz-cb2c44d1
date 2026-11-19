// =============================================================
// DESAFIOS DE EMPRESAS — v70 (BATEU KART × plataforma)
// ─────────────────────────────────────────────────────────────
// Empresas (patrocinadoras) lançam DESAFIOS com PRÉMIOS para o
// jogo: pódios numa pista, caixas «?», balões estourados na
// batalha, vitórias online… O jogador cumpre, CLAMA as moedas.
//
// REGRA DA CASA (honestidade):
// · SEM CONTAS DE EMPRESA ainda — o catálogo vive no APARELHO
//   (`bateu_desafios_v1`) e a Sala de Patrocínios cria desafios
//   de demonstração (`bateu_desafios_custom_v1`) com o MEU
//   mecanismo real (validação, metas, prémios, claim 1×). Nada
//   finge backend: a nota está na UI.
// · SEGURO EM NODE — todo o acesso a localStorage é guardado e
//   as suítes importam isto sem browser (usa o shim do teste).
// · NÚCLEO PURO — nenhuma função toca React/three/DOM.
// =============================================================

// ── empresa patrocinadora ─────────────────────────────────────
export interface EmpresaPatro {
  id: string;
  nome: string;
  sector: string;
  cor: string;        // CSS hex — cor da marca nos cartões
  iniciais: string;   // logótipo gerado (2-3 letras)
  tagline: string;
}

// ── metas (união discriminada — cada tipo alimenta-se de dados
//    que o jogo JÁ produz honestamente) ─────────────────────────
export type MetaDesafio =
  | { tipo: "podio"; pista: string; top: number; modo: "corrida" | "batalha" | "qualquer" }
  | { tipo: "corridasCompletas"; n: number; modo: "corrida" | "batalha" | "online" | "qualquer" }
  | { tipo: "vitorias"; n: number; modo: "corrida" | "batalha" | "online" | "qualquer" }
  | { tipo: "moedasCorrida"; n: number }        // moedas recolhidas NUMA corrida (melhor marca)
  | { tipo: "caixas"; n: number }               // caixas «?» abertas (acumulado)
  | { tipo: "baloes"; n: number }               // balões estourados POR MIM na batalha (acumulado)
  | { tipo: "onlineCorridas"; n: number };      // corridas ONLINE completas (acumulado)

export interface DesafioEmpresa {
  id: string;
  empresa: EmpresaPatro;
  titulo: string;
  desc: string;
  meta: MetaDesafio;
  premioMoedas: number;
  premioXp: number;
  nivelMin: number;
  criadoEm: number;
  personalizado?: boolean; // criado pela Sala de Patrocínios (aparelho)
}

// ── resultado de uma corrida/batalha (o que o BateuKart alimenta) ──
export interface ResultadoKart {
  modo: "corrida" | "batalha" | "online";
  pista: string;
  posicao: number;
  total: number;
  moedas: number;          // moedas recolhidas NA corrida
  caixas: number;          // caixas «?» que EU abri
  miniTurbos: number;      // mini-turbos (fase 2) meus
  baloes: number;          // balões estourados POR MIM (batalha)
  venceu: boolean;
}

// ── estado por desafio (aparelho) ─────────────────────────────
export interface EstadoDesafio {
  prog: number;
  reclamado: boolean;
  concluidoEm?: number;
}
export interface EstadoDesafios {
  porId: Record<string, EstadoDesafio>;
  ts: number;
}

export const CHAVE_DESAFIOS = "bateu_desafios_v1";
export const CHAVE_CUSTOM = "bateu_desafios_custom_v1";

// ── limites honestos ──────────────────────────────────────────
export const TETO_META: Record<Exclude<MetaDesafio["tipo"], "podio">, number> = {
  corridasCompletas: 50,
  vitorias: 25,
  moedasCorrida: 60,
  caixas: 60,
  baloes: 60,
  onlineCorridas: 50,
};
export const PREMIO_MIN = 50;
export const PREMIO_MAX = 10000;

// ── catálogo do lançamento (empresas fictícias — NADA de marcas reais) ──
const EMPRESA = (id: string, nome: string, sector: string, cor: string, iniciais: string, tagline: string): EmpresaPatro =>
  ({ id, nome, sector, cor, iniciais, tagline });

export const CATALOGO_DESAFIOS: DesafioEmpresa[] = [
  {
    id: "tropicola-podio-praia",
    empresa: EMPRESA("tropicola", "TropiCola", "Bebidas", "#e0453a", "TC", "O gás que acompanha a tua derrapagem."),
    titulo: "Pódio na Praia do Bateu",
    desc: "A TropiCola patrocina o pódio tropical: termina TOP 3 na Praia do Bateu e leva o prémio em moedas.",
    meta: { tipo: "podio", pista: "praia", top: 3, modo: "qualquer" },
    premioMoedas: 400, premioXp: 60, nivelMin: 1,
    criadoEm: 0,
  },
  {
    id: "turbotec-caixas",
    empresa: EMPRESA("turbotec", "TurboTec Peças", "Auto-peças", "#31c46c", "TT", "Peças que o teu kart merece."),
    titulo: "Caçador de Caixas «?»",
    desc: "Abre 12 caixas «?» em corridas — a TurboTec paga cada surpresa em moedas de engenharia.",
    meta: { tipo: "caixas", n: 12 },
    premioMoedas: 350, premioXp: 40, nivelMin: 1,
    criadoEm: 0,
  },
  {
    id: "aeroamazonica-online",
    empresa: EMPRESA("aeroamazonica", "AeroAmazónica", "Viação", "#2ea043", "AA", "Voamos alto — tu também."),
    titulo: "Estreia Online",
    desc: "Completa 3 corridas na SALA ONLINE com pilotos reais — a AeroAmazónica celebra a tua estreia internacional.",
    meta: { tipo: "onlineCorridas", n: 3 },
    premioMoedas: 500, premioXp: 80, nivelMin: 2,
    criadoEm: 0,
  },
  {
    id: "cascaecia-vitorias",
    empresa: EMPRESA("cascaecia", "Casca & Cia.", "Armas de kart", "#3ddc55", "C&C", "Casca que nunca falha… quase nunca."),
    titulo: "3 Vitórias no Circuito",
    desc: "Vence 3 corridas (solo, online ou batalha) — a Casca & Cia. acredita no campeão dentro de ti.",
    meta: { tipo: "vitorias", n: 3, modo: "qualquer" },
    premioMoedas: 600, premioXp: 90, nivelMin: 2,
    criadoEm: 0,
  },
  {
    id: "balloonbank-baloes",
    empresa: EMPRESA("balloonbank", "BalloonBank Seguros", "Seguros", "#9b3de0", "BB", "Cobrimos balões estourados."),
    titulo: "Estourador Profissional",
    desc: "Estoura 10 balões de rivais na BATALHA — o BalloonBank paga por balão documentado.",
    meta: { tipo: "baloes", n: 10 },
    premioMoedas: 450, premioXp: 70, nivelMin: 1,
    criadoEm: 0,
  },
  {
    id: "pneusmumbo-moedas",
    empresa: EMPRESA("pneusmumbo", "Pneus Mumbo", "Pneus", "#e6b31e", "PM", "Agarra o asfalto. Ou a areia."),
    titulo: "Rico em Moedas",
    desc: "Recolhe 20 moedas NUMA única corrida — os Pneus Mumbo pagam a linha perfeita.",
    meta: { tipo: "moedasCorrida", n: 20 },
    premioMoedas: 300, premioXp: 45, nivelMin: 1,
    criadoEm: 0,
  },
  {
    id: "bancolendas-corridas",
    empresa: EMPRESA("bancolendas", "Banco das Lendas", "Banca", "#e0b31e", "BL", "Onde os campeões guardam o ouro."),
    titulo: "Maratona do Circuito",
    desc: "Completa 5 corridas quaisquer (corrida, batalha ou online) — o Banco das Lendas rende o bónus à vista.",
    meta: { tipo: "corridasCompletas", n: 5, modo: "qualquer" },
    premioMoedas: 380, premioXp: 55, nivelMin: 1,
    criadoEm: 0,
  },
  {
    id: "energeticozimbo-podio-vulcao",
    empresa: EMPRESA("energeticozimbo", "Energético Zimbo", "Energéticos", "#ff5a2a", "EZ", "Calor que acende o turbo."),
    titulo: "Frieza no Vulcão",
    desc: "Sobe ao pódio (TOP 3) no Vulcão Ferido — o Zimbo paga o único desafio que arde mais que a lava.",
    meta: { tipo: "podio", pista: "vulcao", top: 3, modo: "qualquer" },
    premioMoedas: 550, premioXp: 85, nivelMin: 4,
    criadoEm: 0,
  },
];

// ── persistência honesta (aparelho) ───────────────────────────
function lsLer(chave: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(chave) : null; } catch { return null; }
}
function lsGuardar(chave: string, valor: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(chave, valor); } catch { /* sem storage — honesto */ }
}

export function lerEstado(): EstadoDesafios {
  try {
    const raw = lsLer(CHAVE_DESAFIOS);
    if (raw) {
      const p = JSON.parse(raw) as EstadoDesafios;
      if (p && typeof p.porId === "object" && p.porId) return p;
    }
  } catch { /* corrupto → novo */ }
  return { porId: {}, ts: 0 };
}

function guardarEstado(e: EstadoDesafios): void {
  lsGuardar(CHAVE_DESAFIOS, JSON.stringify(e));
}

export function lerCustom(): DesafioEmpresa[] {
  try {
    const raw = lsLer(CHAVE_CUSTOM);
    if (raw) {
      const lista = JSON.parse(raw) as DesafioEmpresa[];
      if (Array.isArray(lista)) return lista.filter((d) => d && d.id && d.empresa && d.meta);
    }
  } catch { /* corrupto → vazio */ }
  return [];
}

function guardarCustom(lista: DesafioEmpresa[]): void {
  lsGuardar(CHAVE_CUSTOM, JSON.stringify(lista));
}

// ── catálogo visível (lançamento + personalizados do aparelho) ──
export function listarDesafios(nivel: number): DesafioEmpresa[] {
  const todos = [...CATALOGO_DESAFIOS, ...lerCustom()];
  return todos.filter((d) => nivel >= d.nivelMin);
}

export function desafioPorId(id: string): DesafioEmpresa | null {
  return CATALOGO_DESAFIOS.find((d) => d.id === id) ?? lerCustom().find((d) => d.id === id) ?? null;
}

// ── alvo da meta (o número a bater) ───────────────────────────
export function metaAlvo(d: DesafioEmpresa): number {
  if (d.meta.tipo === "podio") return 1;
  return TETO_META[d.meta.tipo] !== undefined ? Math.min(d.meta.n, TETO_META[d.meta.tipo]) : d.meta.n;
}

/** Progresso ATUAL do desafio (0…alvo). */
export function progDe(id: string): number {
  const d = desafioPorId(id);
  if (!d) return 0;
  const alvo = metaAlvo(d);
  return Math.min(alvo, lerEstado().porId[id]?.prog ?? 0);
}

export function estaConcluido(id: string): boolean {
  const d = desafioPorId(id);
  return !!d && progDe(id) >= metaAlvo(d);
}

export function podeClamar(id: string): boolean {
  return estaConcluido(id) && !(lerEstado().porId[id]?.reclamado);
}

// ── aplicar um RESULTADO a todos os desafios ──────────────────
// Devolve os ids que FICARAM concluídos neste resultado (para toast).
export function registarResultado(res: ResultadoKart): string[] {
  const estado = lerEstado();
  const concluidos: string[] = [];
  const todos = [...CATALOGO_DESAFIOS, ...lerCustom()];
  for (const d of todos) {
    const st = estado.porId[d.id] ?? { prog: 0, reclamado: false };
    if (st.reclamado) continue; // reclamado congela (honesto: prémio 1×)
    const alvo = metaAlvo(d);
    let inc = 0;
    const m = d.meta;
    switch (m.tipo) {
      case "podio":
        // pódio: 1 corrida qualificada (pista + top + modo) vale o alvo (1)
        inc = res.posicao >= 1 && res.posicao <= m.top
          && (m.pista === "qualquer" || m.pista === res.pista)
          && (m.modo === "qualquer" || m.modo === res.modo) ? 1 : 0;
        break;
      case "corridasCompletas":
        inc = m.modo === "qualquer" || m.modo === res.modo ? 1 : 0;
        break;
      case "vitorias":
        inc = res.venceu && (m.modo === "qualquer" || m.modo === res.modo) ? 1 : 0;
        break;
      case "moedasCorrida":
        // melhor MARCA numa única corrida (não acumula)
        inc = res.moedas;
        st.prog = Math.min(alvo, Math.max(st.prog, inc));
        if (st.prog >= alvo && st.prog > 0) concluidos.push(d.id);
        estado.porId[d.id] = st;
        continue;
      case "caixas":
        inc = res.caixas;
        break;
      case "baloes":
        inc = res.modo === "batalha" ? res.baloes : 0;
        break;
      case "onlineCorridas":
        inc = res.modo === "online" ? 1 : 0;
        break;
    }
    if (inc > 0) st.prog = Math.min(alvo, st.prog + inc);
    if (st.prog >= alvo && st.prog > 0 && inc > 0) concluidos.push(d.id);
    estado.porId[d.id] = st;
  }
  estado.ts = Date.now();
  guardarEstado(estado);
  return concluidos;
}

/** Clama o prémio 1× — devolve as moedas ou null (não concluído/já clamado). */
export function clamar(id: string): { moedas: number; xp: number } | null {
  const d = desafioPorId(id);
  if (!d || !podeClamar(id)) return null;
  const estado = lerEstado();
  estado.porId[id] = { ...(estado.porId[id] ?? { prog: 0 }), reclamado: true, concluidoEm: Date.now() };
  estado.ts = Date.now();
  guardarEstado(estado);
  return { moedas: d.premioMoedas, xp: d.premioXp };
}

// ── Sala de Patrocínios: uma empresa cria o SEU desafio ───────
export interface InputDesafio {
  empresaNome: string;
  sector: string;
  titulo: string;
  desc: string;
  meta: MetaDesafio;
  premioMoedas: number;
  nivelMin: number;
}

const CORES_MARCA = ["#e0453a", "#31c46c", "#2ea043", "#9b3de0", "#ff5a2a", "#e6b31e", "#3ddc55", "#40c4ff", "#ff4081", "#e0b31e"];

export function validaInputDesafio(i: InputDesafio): { sim: boolean; motivo: string } {
  const nome = (i.empresaNome ?? "").trim();
  const titulo = (i.titulo ?? "").trim();
  if (nome.length < 2 || nome.length > 24) return { sim: false, motivo: "nome da empresa 2-24" };
  if (titulo.length < 4 || titulo.length > 60) return { sim: false, motivo: "título 4-60" };
  if ((i.desc ?? "").trim().length < 8 || i.desc.length > 220) return { sim: false, motivo: "descrição 8-220" };
  if (!Number.isFinite(i.premioMoedas) || i.premioMoedas < PREMIO_MIN || i.premioMoedas > PREMIO_MAX) return { sim: false, motivo: `prémio ${PREMIO_MIN}-${PREMIO_MAX}` };
  if (!Number.isFinite(i.nivelMin) || i.nivelMin < 1 || i.nivelMin > 30) return { sim: false, motivo: "nível 1-30" };
  const m = i.meta;
  if (!m || typeof m.tipo !== "string") return { sim: false, motivo: "meta ausente" };
  if (m.tipo === "podio") {
    if (!["praia", "deserto", "vulcao", "qualquer"].includes(m.pista)) return { sim: false, motivo: "pista inválida" };
    if (![1, 2, 3].includes(m.top)) return { sim: false, motivo: "top 1-3" };
  } else if (m.tipo === "moedasCorrida") {
    if (!Number.isFinite(m.n) || m.n < 5 || m.n > TETO_META.moedasCorrida) return { sim: false, motivo: `moedas 5-${TETO_META.moedasCorrida}` };
  } else if (m.tipo === "baloes" || m.tipo === "caixas") {
    if (!Number.isFinite(m.n) || m.n < 1 || m.n > TETO_META[m.tipo]) return { sim: false, motivo: `${m.tipo} 1-${TETO_META[m.tipo]}` };
  } else if (m.tipo === "corridasCompletas" || m.tipo === "vitorias" || m.tipo === "onlineCorridas") {
    if (!Number.isFinite(m.n) || m.n < 1 || m.n > TETO_META[m.tipo]) return { sim: false, motivo: `${m.tipo} 1-${TETO_META[m.tipo]}` };
  } else {
    return { sim: false, motivo: "meta desconhecida" };
  }
  return { sim: true, motivo: "" };
}

/** Cria o desafio personalizado (demonstração no aparelho) e devolve-o. */
export function criarDesafio(input: InputDesafio): { d: DesafioEmpresa | null; motivo: string } {
  const v = validaInputDesafio(input);
  if (!v.sim) return { d: null, motivo: v.motivo };
  const slug = input.empresaNome.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "empresa";
  const iniciais = input.empresaNome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "EM";
  const empresa: EmpresaPatro = {
    id: `${slug}-${Date.now().toString(36)}`,
    nome: input.empresaNome.trim(),
    sector: (input.sector || "Patrocínio").trim().slice(0, 24),
    cor: CORES_MARCA[Math.floor(Math.random() * CORES_MARCA.length)],
    iniciais: iniciais.slice(0, 3),
    tagline: "Patrocinador oficial do Circuito das Lendas.",
  };
  const d: DesafioEmpresa = {
    id: `custom-${empresa.id}`,
    empresa,
    titulo: input.titulo.trim(),
    desc: input.desc.trim(),
    meta: input.meta,
    premioMoedas: Math.round(input.premioMoedas),
    premioXp: Math.max(10, Math.round(input.premioMoedas / 8)),
    nivelMin: Math.round(input.nivelMin),
    criadoEm: Date.now(),
    personalizado: true,
  };
  const lista = lerCustom();
  if (lista.length >= 24) lista.shift(); // teto honesto do aparelho
  lista.push(d);
  guardarCustom(lista);
  return { d, motivo: "" };
}
