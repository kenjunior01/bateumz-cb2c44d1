// =============================================================
// CO-FUNDADORES REGIONAIS — v73 (identidade visual + ANÚNCIOS)
// ─────────────────────────────────────────────────────────────
// WRAPPER FINO sobre o NÚCLEO PURO (regionalCore.ts): toda a
// regra (validação, limites, permissões, stats) vive lá — o MESMO
// núcleo que o SERVIDOR REGIONAL (server/regional-servidor.mjs)
// executa. Aqui só há o armazenamento do APARELHO:
// · IDENTIDADE VISUAL — cores primária/secundária/acento,
//   nome do tema, iniciais do logótipo e slogan DO SEU país.
// · ANÚNCIOS — banners com título, texto, chamada (CTA),
//   esquema de cores, agendamento (início/fim) e estatísticas
//   HONESTAS (impressões e cliques registados no aparelho).
//
// OS QUATRO PAÍSES DE LANÇAMENTO: MZ, AO, BR, PT.
//
// REGRA DA CASA (honestidade):
// · a ponte (redeRegional.ts) pode SUBIR isto para o servidor
//   regional — quando ele não está, TUDO continua a funcionar
//   NO APARELHO (`bateu_regional_v72`), como sempre. Nada finge.
// · SEGURO EM NODE — todo o acesso a localStorage é guardado
//   (as suítes importam isto com o shim).
// · NÚCLEO PURO — nenhuma função toca React/DOM.
// =============================================================

import {
  PAISES_COFUNDADOR, PAIS_INFO, LIMITES, GRADIENTES_VALIDOS,
  type PaisCoFundador, type IdentidadeVisual, type TipoAnuncio,
  type EstadoAnuncio, type AnuncioRegional, type EstadoRegional,
  type MotivoIdentidade, type MotivoAnuncio, type AcaoAnuncio,
  identidadePadrao, hidratarEstado, validarIdentidade, aplicarIdentidade,

  cssVarsDeIdentidade, validarAnuncio, aplicarAnuncio, urlSegura,
  anunciosAtivosDe, listarTodosDe, listarAnunciosPaisDe, agirAnuncioEm,
  registrarImpressaoEm, registrarCliqueEm, estatisticasPaisDe, panoramaDe,
} from "./regionalCore.ts";

// re-exporta TUDO que os painéis/suítes já importam daqui
// (assinaturas INTACTAS — v72 não muda uma linha de chamada)
export {
  PAISES_COFUNDADOR, PAIS_INFO, LIMITES, GRADIENTES_VALIDOS,
  identidadePadrao, urlSegura, cssVarsDeIdentidade,
};
export type {
  PaisCoFundador, IdentidadeVisual, TipoAnuncio, EstadoAnuncio,
  AnuncioRegional, EstadoRegional, MotivoIdentidade, MotivoAnuncio, AcaoAnuncio,
};

const CHAVE = "bateu_regional_v72";

// ── armazenamento seguro do APARELHO ──────────────────────────
function lerEstado(): EstadoRegional {
  try {
    const cru = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE) : null;
    if (cru) return hidratarEstado(JSON.parse(cru));
  } catch { /* podre → padrão */ }
  return hidratarEstado(null);
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

export function gravarIdentidade(
  pais: PaisCoFundador,
  dados: { corPrimaria: string; corSecundaria: string; corAcento: string; nomeTema: string; iniciaisLogo: string; slogan: string }
): { d: IdentidadeVisual | null; motivo: MotivoIdentidade } {
  const r = validarIdentidade(pais, dados);
  if (!r.d) return r;
  const e = lerEstado();
  aplicarIdentidade(e, r.d);
  gravarEstado(e);
  return r;
}

// ── ANÚNCIOS ──────────────────────────────────────────────────
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
  const e = lerEstado();
  const r = validarAnuncio(entrada, e);
  if (!r.d) return r;
  aplicarAnuncio(e, r.d);
  gravarEstado(e);
  return r;
}

/** Ativos AGORA: estado ativo + dentro da janela de agendamento. */
export function anunciosAtivos(pais: PaisCoFundador, agora: number = Date.now()): AnuncioRegional[] {
  return anunciosAtivosDe(lerEstado(), pais, agora);
}

/** ADMIN VÊ TUDO — todos os anúncios de todos os países. */
export function listarTodosAnuncios(): AnuncioRegional[] {
  return listarTodosDe(lerEstado());
}

export function listarAnunciosPais(pais: PaisCoFundador): AnuncioRegional[] {
  return listarAnunciosPaisDe(lerEstado(), pais);
}

/** Co-fundador muda o SEU país · admin (verTudo=true) muda QUALQUER país. */
export function agirAnuncio(
  id: string,
  acao: AcaoAnuncio,
  paisDoGestor: PaisCoFundador | "TODOS"
): boolean {
  const e = lerEstado();
  const ok = agirAnuncioEm(e, id, acao, paisDoGestor);
  if (ok) gravarEstado(e);
  return ok;
}

export function registrarImpressao(id: string): void {
  const e = lerEstado();
  registrarImpressaoEm(e, id);
  gravarEstado(e);
}

export function registrarClique(id: string): void {
  const e = lerEstado();
  registrarCliqueEm(e, id);
  gravarEstado(e);
}

/** Estatísticas honestas por país (para os painéis). */
export function estatisticasPais(pais: PaisCoFundador): { anuncios: number; ativos: number; impressoes: number; cliques: number; ctr: number } {
  return estatisticasPaisDe(lerEstado(), pais);
}

/** Painel do admin: panorama dos QUATRO países de uma vez. */
export function panoramaPaises(): Array<{ pais: PaisCoFundador; identidade: IdentidadeVisual; stats: ReturnType<typeof estatisticasPais> }> {
  return panoramaDe(lerEstado());
}

/**
 * PONTE v73 — grava no APARELHO um estado vindo do SERVIDOR regional
 * (a ponte redeRegional.ts espelha para que TUDO que já lê daqui —
 * AdSlot do hub, painéis — veja a verdade do servidor mesmo offline).
 * Estado podre → ignorado (nunca substitui por lixo).
 */
export function hidratarNoAparelho(estado: EstadoRegional): boolean {
  try {
    if (!estado || typeof estado !== "object") return false;
    if (!estado.identidades || !Array.isArray(estado.anuncios)) return false;
    gravarEstado(hidratarEstado(estado));
    return true;
  } catch { return false; }
}
