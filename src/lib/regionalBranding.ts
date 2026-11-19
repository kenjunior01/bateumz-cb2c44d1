// =============================================================
// CO-FUNDADORES REGIONAIS — v72 (identidade visual + ANÚNCIOS)
// ─────────────────────────────────────────────────────────────
// Cada país tem um CO-FUNDADOR (gestor regional) que gere a
// SUA região de forma INDEPENDENTE, «como se fosse dono»:
// · IDENTIDADE VISUAL — cores primária/secundária/acento,
//   nome do tema, iniciais do logótipo e slogan DO SEU país.
// · ANÚNCIOS — banners com título, texto, chamada (CTA),
//   esquema de cores, agendamento (início/fim) e estatísticas
//   HONESTAS (impressões e cliques registados no aparelho).
//
// OS QUATRO PAÍSES DE LANÇAMENTO: MZ, AO, BR, PT.
//
// REGRA DA CASA (honestidade — igual aos desafios v70):
// · SEM BACKEND AINDA — o estado vive no APARELHO
//   (`bateu_regional_v72`). Os painéis não fingem Supabase:
//   o admin lê a MESMA fonte local para ver TUDO (é o único
//   que atravessa países); o co-fundador só edita O SEU país.
// · SEGURO EM NODE — todo o acesso a localStorage é guardado
//   (as suítes importam isto com o shim).
// · NÚCLEO PURO — nenhuma função toca React/DOM.
// =============================================================

export const PAISES_COFUNDADOR = ["MZ", "AO", "BR", "PT"] as const;
export type PaisCoFundador = (typeof PAISES_COFUNDADOR)[number];

export const PAIS_INFO: Record<PaisCoFundador, { nome: string; bandeira: string; moeda: string; fuso: string }> = {
  MZ: { nome: "Moçambique", bandeira: "🇲🇿", moeda: "MZN", fuso: "Africa/Maputo" },
  AO: { nome: "Angola", bandeira: "🇦🇴", moeda: "AOA", fuso: "Africa/Luanda" },
  BR: { nome: "Brasil", bandeira: "🇧🇷", moeda: "BRL", fuso: "America/Sao_Paulo" },
  PT: { nome: "Portugal", bandeira: "🇵🇹", moeda: "EUR", fuso: "Europe/Lisbon" },
};

// ── identidade visual por país ────────────────────────────────
export interface IdentidadeVisual {
  pais: PaisCoFundador;
  corPrimaria: string;   // hex — botões, gradientes
  corSecundaria: string; // hex
  corAcento: string;     // hex
  nomeTema: string;      // ex. «Bateu Moçambique»
  iniciaisLogo: string;  // 2-3 letras
  slogan: string;
  atualizadoEm: number;
}

// ── anúncios por país ────────────────────────────────────────
export type TipoAnuncio = "faixa" | "destaque"; // faixa = strip no topo do hub · destaque = cartão na grelha
export type EstadoAnuncio = "ativo" | "pausado";

export interface AnuncioRegional {
  id: string;
  pais: PaisCoFundador;
  tipo: TipoAnuncio;
  titulo: string;        // 3-40 chars
  texto: string;         // 3-120 chars
  ctaEtiqueta: string;   // 2-24 chars
  ctaUrl: string;        // caminho interno (/…) — nunca url externa arbitrada
  gradiente: string;     // classes tailwind from-… via-… to-…
  estado: EstadoAnuncio;
  iniciaEm: number;      // epoch ms — agendamento
  terminaEm: number;     // epoch ms — 0 = sem prazo
  criadoPor: string;     // nome do co-fundador
  criadoEm: number;
  impressoes: number;
  cliques: number;
}

export interface EstadoRegional {
  identidades: Record<PaisCoFundador, IdentidadeVisual>;
  anuncios: AnuncioRegional[];
}

const CHAVE = "bateu_regional_v72";

// ── limites honestos (validação do núcleo) ────────────────────
export const LIMITES = {
  tituloMin: 3, tituloMax: 40,
  textoMin: 3, textoMax: 120,
  ctaEtiquetaMin: 2, ctaEtiquetaMax: 24,
  maxAnunciosPorPais: 12,
};

const GRADIENTES_VALIDOS = [
  "from-orange-500 via-red-500 to-rose-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-600 to-indigo-700",
  "from-amber-500 to-orange-600",
  "from-fuchsia-600 to-purple-700",
  "from-blue-600 to-cyan-500",
  "from-lime-500 to-emerald-600",
];
export { GRADIENTES_VALIDOS };

const HEX_RE = /^#[0-9a-f]{6}$/i;

// ── predefinidos de LANÇAMENTO (a identidade nasce digna) ─────
export function identidadePadrao(pais: PaisCoFundador): IdentidadeVisual {
  const base: Record<PaisCoFundador, Omit<IdentidadeVisual, "atualizadoEm" | "pais">> = {
    MZ: { corPrimaria: "#0ea55e", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Bateu Moçambique", iniciaisLogo: "BM", slogan: "A plataforma de Moçambique — joga, ganha, brilha!" },
    AO: { corPrimaria: "#dc2626", corSecundaria: "#f59e0b", corAcento: "#111827", nomeTema: "Bateu Angola", iniciaisLogo: "BA", slogan: "Angola a jogar em grande!" },
    BR: { corPrimaria: "#16a34a", corSecundaria: "#facc15", corAcento: "#2563eb", nomeTema: "Bateu Brasil", iniciaisLogo: "BB", slogan: "O Brasil inteiro numa arena só!" },
    PT: { corPrimaria: "#15803d", corSecundaria: "#dc2626", corAcento: "#f8fafc", nomeTema: "Bateu Portugal", iniciaisLogo: "BP", slogan: "Portugal joga juntinho!" },
  };
  return { pais, ...base[pais], atualizadoEm: Date.now() };
}

// ── armazenamento seguro ──────────────────────────────────────
function lerEstado(): EstadoRegional {
  try {
    const cru = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE) : null;
    if (cru) {
      const p = JSON.parse(cru) as EstadoRegional;
      if (p && p.identidades && Array.isArray(p.anuncios)) return p;
    }
  } catch { /* podre → omitir */ }
  return {
    identidades: {
      MZ: identidadePadrao("MZ"), AO: identidadePadrao("AO"),
      BR: identidadePadrao("BR"), PT: identidadePadrao("PT"),
    },
    anuncios: [],
  };
}

function gravarEstado(e: EstadoRegional): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch { /* aparelho cheio → silencioso */ }
}

// ── IDENTIDADE VISUAL ─────────────────────────────────────────
export function lerIdentidade(pais: PaisCoFundador): IdentidadeVisual {
  return lerEstado().identidades[pais] ?? identidadePadrao(pais);
}

export type MotivoIdentidade =
  | "pais" | "cor" | "nome" | "iniciais" | "slogan" | "ok";

export function gravarIdentidade(
  pais: PaisCoFundador,
  dados: { corPrimaria: string; corSecundaria: string; corAcento: string; nomeTema: string; iniciaisLogo: string; slogan: string }
): { d: IdentidadeVisual | null; motivo: MotivoIdentidade } {
  if (!PAISES_COFUNDADOR.includes(pais)) return { d: null, motivo: "pais" };
  if (!HEX_RE.test(dados.corPrimaria) || !HEX_RE.test(dados.corSecundaria) || !HEX_RE.test(dados.corAcento)) return { d: null, motivo: "cor" };
  const nome = dados.nomeTema.trim();
  if (nome.length < 3 || nome.length > 40) return { d: null, motivo: "nome" };
  const ini = dados.iniciaisLogo.trim().toUpperCase();
  if (ini.length < 2 || ini.length > 3) return { d: null, motivo: "iniciais" };
  const slogan = dados.slogan.trim();
  if (slogan.length < 3 || slogan.length > 120) return { d: null, motivo: "slogan" };
  const e = lerEstado();
  const nova: IdentidadeVisual = { pais, corPrimaria: dados.corPrimaria.toLowerCase(), corSecundaria: dados.corSecundaria.toLowerCase(), corAcento: dados.corAcento.toLowerCase(), nomeTema: nome, iniciaisLogo: ini, slogan, atualizadoEm: Date.now() };
  e.identidades[pais] = nova;
  gravarEstado(e);
  return { d: nova, motivo: "ok" };
}

// aplica as cores como variáveis CSS (--region-*) — a identidade
// do co-fundador fica VISÍVEL em toda a plataforma no ato.
export function cssVarsDeIdentidade(id: IdentidadeVisual): Record<string, string> {
  return {
    "--region-primary": id.corPrimaria,
    "--region-secondary": id.corSecundaria,
    "--region-accent": id.corAcento,
  };
}

// ── ANÚNCIOS ──────────────────────────────────────────────────
export type MotivoAnuncio =
  | "pais" | "titulo" | "texto" | "cta" | "url" | "gradiente"
  | "tipo" | "cheio" | "janela" | "ok";

export function criarAnuncio(
  entrada: {
    pais: PaisCoFundador;
    tipo: TipoAnuncio;
    titulo: string;
    texto: string;
    ctaEtiqueta: string;
    ctaUrl: string;
    gradiente?: string;
    iniciaEm?: number;
    terminaEm?: number;
    criadoPor: string;
  }
): { d: AnuncioRegional | null; motivo: MotivoAnuncio } {
  if (!PAISES_COFUNDADOR.includes(entrada.pais)) return { d: null, motivo: "pais" };
  if (entrada.tipo !== "faixa" && entrada.tipo !== "destaque") return { d: null, motivo: "tipo" };
  const titulo = entrada.titulo.trim();
  if (titulo.length < LIMITES.tituloMin || titulo.length > LIMITES.tituloMax) return { d: null, motivo: "titulo" };
  const texto = entrada.texto.trim();
  if (texto.length < LIMITES.textoMin || texto.length > LIMITES.textoMax) return { d: null, motivo: "texto" };
  const cta = entrada.ctaEtiqueta.trim();
  if (cta.length < LIMITES.ctaEtiquetaMin || cta.length > LIMITES.ctaEtiquetaMax) return { d: null, motivo: "cta" };
  const url = entrada.ctaUrl.trim();
  if (!url.startsWith("/") || url.length < 2 || url.length > 120 || url.includes("//")) return { d: null, motivo: "url" };
  const grad = entrada.gradiente && GRADIENTES_VALIDOS.includes(entrada.gradiente)
    ? entrada.gradiente : GRADIENTES_VALIDOS[0];
  const e = lerEstado();
  if (e.anuncios.filter((a) => a.pais === entrada.pais).length >= LIMITES.maxAnunciosPorPais) return { d: null, motivo: "cheio" };
  const agora = Date.now();
  const iniciaEm = entrada.iniciaEm ?? agora;
  const terminaEm = entrada.terminaEm ?? 0;
  if (terminaEm !== 0 && terminaEm <= iniciaEm) return { d: null, motivo: "janela" };
  const anuncio: AnuncioRegional = {
    id: `an-${entrada.pais.toLowerCase()}-${agora.toString(36)}-${Math.floor(Math.random() * 46656).toString(36).padStart(3, "0")}`,
    pais: entrada.pais,
    tipo: entrada.tipo,
    titulo, texto,
    ctaEtiqueta: cta,
    ctaUrl: url,
    gradiente: grad,
    estado: "ativo",
    iniciaEm, terminaEm,
    criadoPor: entrada.criadoPor.trim().slice(0, 24) || "Co-fundador",
    criadoEm: agora,
    impressoes: 0,
    cliques: 0,
  };
  e.anuncios.push(anuncio);
  gravarEstado(e);
  return { d: anuncio, motivo: "ok" };
}

/** CTA só aceita CAMINHOS INTERNOS — nunca injecta javascript:. */
export function urlSegura(url: string): string {
  const u = url.trim();
  if (!u.startsWith("/") || u.includes("//")) return "/lives";
  return u;
}

/** Ativos AGORA: estado ativo + dentro da janela de agendamento. */
export function anunciosAtivos(pais: PaisCoFundador, agora: number = Date.now()): AnuncioRegional[] {
  return lerEstado().anuncios.filter(
    (a) => a.pais === pais && a.estado === "ativo" && a.iniciaEm <= agora && (a.terminaEm === 0 || a.terminaEm > agora)
  );
}

/** ADMIN VÊ TUDO — todos os anúncios de todos os países. */
export function listarTodosAnuncios(): AnuncioRegional[] {
  return lerEstado().anuncios.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}

export function listarAnunciosPais(pais: PaisCoFundador): AnuncioRegional[] {
  return listarTodosAnuncios().filter((a) => a.pais === pais);
}

export type AcaoAnuncio = "pausar" | "reativar" | "remover" | "aprovar";

/** Co-fundador muda o SEU país · admin (verTudo=true) muda QUALQUER país. */
export function agirAnuncio(
  id: string,
  acao: AcaoAnuncio,
  paisDoGestor: PaisCoFundador | "TODOS"
): boolean {
  const e = lerEstado();
  const a = e.anuncios.find((x) => x.id === id);
  if (!a) return false;
  // o ÚNICO que atravessa países é o admin (paisDoGestor === "TODOS")
  if (paisDoGestor !== "TODOS" && a.pais !== paisDoGestor) return false;
  if (acao === "pausar") a.estado = "pausado";
  else if (acao === "reativar") a.estado = "ativo";
  else if (acao === "remover") e.anuncios = e.anuncios.filter((x) => x.id !== id);
  else return false;
  gravarEstado(e);
  return true;
}

export function registrarImpressao(id: string): void {
  const e = lerEstado();
  const a = e.anuncios.find((x) => x.id === id);
  if (!a) return;
  a.impressoes += 1;
  gravarEstado(e);
}

export function registrarClique(id: string): void {
  const e = lerEstado();
  const a = e.anuncios.find((x) => x.id === id);
  if (!a) return;
  a.cliques += 1;
  gravarEstado(e);
}

/** Estatísticas honestas por país (para os painéis). */
export function estatisticasPais(pais: PaisCoFundador): { anuncios: number; ativos: number; impressoes: number; cliques: number; ctr: number } {
  const todos = listarAnunciosPais(pais);
  const imp = todos.reduce((s, a) => s + a.impressoes, 0);
  const cli = todos.reduce((s, a) => s + a.cliques, 0);
  return {
    anuncios: todos.length,
    ativos: anunciosAtivos(pais).length,
    impressoes: imp,
    cliques: cli,
    ctr: imp > 0 ? cli / imp : 0,
  };
}

/** Painel do admin: panorama dos QUATRO países de uma vez. */
export function panoramaPaises(): Array<{ pais: PaisCoFundador; identidade: IdentidadeVisual; stats: ReturnType<typeof estatisticasPais> }> {
  return PAISES_COFUNDADOR.map((p) => ({ pais: p, identidade: lerIdentidade(p), stats: estatisticasPais(p) }));
}
