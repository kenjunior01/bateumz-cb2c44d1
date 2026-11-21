// =============================================================
// NÚCLEO REGIONAL PURO — v73 (a LÓGICA que cliente e servidor
// partilham — o MESMO padrão honesto do core do KART v66)
// ─────────────────────────────────────────────────────────────
// ZERO localStorage · ZERO fetch · ZERO DOM: todas as funções
// operam sobre um objeto de estado que quem chama possui. O
// servidor regional (server/regional-servidor.mjs) e o aparelho
// (regionalBranding.ts) usam EXATAMENTE as MESMAS regras:
// validação, limites, permissões e estatísticas.
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
  return { pais, ...base[pais], atualizadoEm: 0 };
}

/** Estado de nascer (as 4 identidades de lançamento, nenhum anúncio). */
export function estadoPadrao(): EstadoRegional {
  return {
    identidades: {
      MZ: identidadePadrao("MZ"), AO: identidadePadrao("AO"),
      BR: identidadePadrao("BR"), PT: identidadePadrao("PT"),
    },
    anuncios: [],
  };
}

/** Estado vindo de ficheiro/JSON podre → substituído pelo padrão (nunca crasha). */
export function hidratarEstado(cru: unknown): EstadoRegional {
  try {
    const p = cru as EstadoRegional;
    if (p && p.identidades && typeof p.identidades === "object" && Array.isArray(p.anuncios)) {
      // completa as identidades em falta (estado antigo → nunca undefined)
      const padrao = estadoPadrao();
      for (const pais of PAISES_COFUNDADOR) {
        if (!p.identidades[pais]) p.identidades[pais] = padrao.identidades[pais];
      }
      return p;
    }
  } catch { /* podre → padrão */ }
  return estadoPadrao();
}

// ── IDENTIDADE VISUAL ─────────────────────────────────────────
export type MotivoIdentidade =
  | "pais" | "cor" | "nome" | "iniciais" | "slogan" | "ok";

export function validarIdentidade(
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
  return {
    d: {
      pais,
      corPrimaria: dados.corPrimaria.toLowerCase(),
      corSecundaria: dados.corSecundaria.toLowerCase(),
      corAcento: dados.corAcento.toLowerCase(),
      nomeTema: nome, iniciaisLogo: ini, slogan,
      atualizadoEm: Date.now(),
    },
    motivo: "ok",
  };
}

/** Grava a identidade no estado (mutação do dono do estado). */
export function aplicarIdentidade(estado: EstadoRegional, identidade: IdentidadeVisual): void {
  estado.identidades[identidade.pais] = identidade;
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

export interface EntradaAnuncio {
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

/** Valida a entrada e devolve o anúncio pronto (ou o motivo da recusa). */
export function validarAnuncio(
  entrada: EntradaAnuncio,
  estado: EstadoRegional
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
  if (estado.anuncios.filter((a) => a.pais === entrada.pais).length >= LIMITES.maxAnunciosPorPais) return { d: null, motivo: "cheio" };
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
  return { d: anuncio, motivo: "ok" };
}

/** Insere um anúncio já validado no estado. */
export function aplicarAnuncio(estado: EstadoRegional, anuncio: AnuncioRegional): void {
  estado.anuncios.push(anuncio);
}

/** CTA só aceita CAMINHOS INTERNOS — nunca injecta javascript:. */
export function urlSegura(url: string): string {
  const u = url.trim();
  if (!u.startsWith("/") || u.includes("//")) return "/lives";
  return u;
}

/** Ativos AGORA: estado ativo + dentro da janela de agendamento. */
export function anunciosAtivosDe(estado: EstadoRegional, pais: PaisCoFundador, agora: number = Date.now()): AnuncioRegional[] {
  return estado.anuncios.filter(
    (a) => a.pais === pais && a.estado === "ativo" && a.iniciaEm <= agora && (a.terminaEm === 0 || a.terminaEm > agora)
  );
}

/** ADMIN VÊ TUDO — todos os anúncios de todos os países. */
export function listarTodosDe(estado: EstadoRegional): AnuncioRegional[] {
  return estado.anuncios.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}

export function listarAnunciosPaisDe(estado: EstadoRegional, pais: PaisCoFundador): AnuncioRegional[] {
  return listarTodosDe(estado).filter((a) => a.pais === pais);
}

export type AcaoAnuncio = "pausar" | "reativar" | "remover" | "aprovar";

/** Co-fundador muda o SEU país · admin (verTudo=true) muda QUALQUER país. */
export function agirAnuncioEm(
  estado: EstadoRegional,
  id: string,
  acao: AcaoAnuncio,
  paisDoGestor: PaisCoFundador | "TODOS"
): boolean {
  const a = estado.anuncios.find((x) => x.id === id);
  if (!a) return false;
  // o ÚNICO que atravessa países é o admin (paisDoGestor === "TODOS")
  if (paisDoGestor !== "TODOS" && a.pais !== paisDoGestor) return false;
  if (acao === "pausar") a.estado = "pausado";
  else if (acao === "reativar") a.estado = "ativo";
  else if (acao === "remover") estado.anuncios = estado.anuncios.filter((x) => x.id !== id);
  else return false;
  return true;
}

export function registrarImpressaoEm(estado: EstadoRegional, id: string): void {
  const a = estado.anuncios.find((x) => x.id === id);
  if (!a) return;
  a.impressoes += 1;
}

export function registrarCliqueEm(estado: EstadoRegional, id: string): void {
  const a = estado.anuncios.find((x) => x.id === id);
  if (!a) return;
  a.cliques += 1;
}

/** Estatísticas honestas por país (para os painéis). */
export function estatisticasPaisDe(estado: EstadoRegional, pais: PaisCoFundador): { anuncios: number; ativos: number; impressoes: number; cliques: number; ctr: number } {
  const todos = listarAnunciosPaisDe(estado, pais);
  const imp = todos.reduce((s, a) => s + a.impressoes, 0);
  const cli = todos.reduce((s, a) => s + a.cliques, 0);
  return {
    anuncios: todos.length,
    ativos: anunciosAtivosDe(estado, pais).length,
    impressoes: imp,
    cliques: cli,
    ctr: imp > 0 ? cli / imp : 0,
  };
}

/** Painel do admin: panorama dos QUATRO países de uma vez. */
export function panoramaDe(estado: EstadoRegional): Array<{ pais: PaisCoFundador; identidade: IdentidadeVisual; stats: ReturnType<typeof estatisticasPaisDe> }> {
  return PAISES_COFUNDADOR.map((p) => ({ pais: p, identidade: estado.identidades[p] ?? identidadePadrao(p), stats: estatisticasPaisDe(estado, p) }));
}
