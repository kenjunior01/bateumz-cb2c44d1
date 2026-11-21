// =============================================================
// PONTE REGIONAL — v73 (o aparelho fala com o SERVIDOR regional)
// ─────────────────────────────────────────────────────────────
// As ações dos co-fundadores/admin já funcionavam NO APARELHO
// (regionalBranding.ts). Esta ponte acrescenta o caminho REAL:
// quando um SERVIDOR regional está configurado (URL + token) as
// ações vão AO SERVIDOR — que executa O MESMO núcleo puro
// (regionalCore.ts) e guarda para TODA a região — e o resultado
// é ESPELHADO no aparelho para que o hub (AdSlot) e os painéis
// vejam a verdade do servidor mesmo depois de offline.
//
// HONESTIDADE (a regra da casa):
// · SEM servidor configurado OU servidor indisponível → TUDO
//   continua a funcionar no aparelho e a função devolve
//   fonte: "aparelho" — nada finge sincronização.
// · COM servidor → fonte: "servidor" (o painel mostra isto).
// · Cada pedido tem teto de tempo (1,8 s) — nunca trava a UI.
// =============================================================

import {
  type PaisCoFundador, type EstadoRegional, type AnuncioRegional,
  type IdentidadeVisual, type MotivoAnuncio, type MotivoIdentidade,
  criarAnuncio, gravarIdentidade, agirAnuncio, registrarImpressao,
  registrarClique, panoramaPaises, lerIdentidade, hidratarNoAparelho,
} from "./regionalBranding";

export type FonteRegional = "servidor" | "aparelho";

const CHAVE_URL = "bateu_regional_url";
const CHAVE_TOKEN = "bateu_regional_token";
const TETO_MS = 1800;

export function lerConfigServidor(): { url: string; token: string } {
  try {
    return {
      url: (localStorage.getItem(CHAVE_URL) || "").trim(),
      token: (localStorage.getItem(CHAVE_TOKEN) || "").trim(),
    };
  } catch { return { url: "", token: "" }; }
}

export function guardarConfigServidor(url: string, token: string): void {
  try {
    localStorage.setItem(CHAVE_URL, url.trim());
    localStorage.setItem(CHAVE_TOKEN, token.trim());
  } catch { /* aparelho cheio → silencioso */ }
}

export function limparConfigServidor(): void {
  try {
    localStorage.removeItem(CHAVE_URL);
    localStorage.removeItem(CHAVE_TOKEN);
  } catch { /* noop */ }
}

/** Fonte EM USO (sync): url configurada → o painel anuncia «servidor». */
export function fonteConfigurada(): FonteRegional {
  return lerConfigServidor().url ? "servidor" : "aparelho";
}

// ── fetch com teto honesto ────────────────────────────────────
async function pedir(caminho: string, opcoes: RequestInit = {}): Promise<{ codigo: number; corpo: any } | null> {
  const { url } = lerConfigServidor();
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TETO_MS);
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}${caminho}`, {
      ...opcoes,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(lerConfigServidor().token ? { Authorization: `Bearer ${lerConfigServidor().token}` } : {}),
        ...(opcoes.headers || {}),
      },
    });
    const corpo = await r.json().catch(() => null);
    return { codigo: r.status, corpo };
  } catch { return null; } finally { clearTimeout(timer); }
}

/** Sonda rápida para o painel: «o servidor está a ouvir?». */
export async function testarServidor(): Promise<{ ok: boolean; mensagem: string }> {
  const r = await pedir("/saude");
  if (!r) return { ok: false, mensagem: "Servidor não respondeu (fonte fica no APARELHO — nada se perde)." };
  if (r.corpo?.ok) {
    return {
      ok: true,
      mensagem: `Servidor v${r.corpo.versao} no ar — ${r.corpo.anuncios} anúncio(s) · escrita ${r.corpo.escritaAberta ? "aberta (com tokens)" : "SÓ-LEITURA"}.`,
    };
  }
  return { ok: false, mensagem: "Resposta estranha do servidor." };
}

/**
 * CARREGA o estado do servidor e ESPELHA no aparelho.
 * Sem servidor / falha → devolve o estado do aparelho (fonte honesta).
 */
export async function carregarEstado(): Promise<{ fonte: FonteRegional; panorama: ReturnType<typeof panoramaPaises> }> {
  const r = await pedir("/estado");
  if (r?.codigo === 200 && r.corpo) {
    const e = r.corpo.estado as EstadoRegional | undefined;
    if (e && hidratarNoAparelho(e)) return { fonte: "servidor", panorama: panoramaPaises() };
    // resposta do servidor sem estado completo (gestor vê só o seu país)
    if (r.corpo.identidade) {
      // espelha a identidade + anúncios do próprio país
      const id = r.corpo.identidade as IdentidadeVisual;
      const atual = lerIdentidade(id.pais);
      hidratarNoAparelho({
        identidades: { ...{ MZ: atual, AO: atual, BR: atual, PT: atual }, [id.pais]: id },
        anuncios: (r.corpo.anuncios as AnuncioRegional[]) || [],
      });
      return { fonte: "servidor", panorama: panoramaPaises() };
    }
  }
  return { fonte: "aparelho", panorama: panoramaPaises() };
}

export interface ResultadoPublicacao {
  ok: boolean;
  motivo: MotivoAnuncio | MotivoIdentidade | null;
  fonte: FonteRegional;
}

/** IDENTIDADE visual — servidor primeiro, aparelho como rede de segurança. */
export async function publicarIdentidade(
  pais: PaisCoFundador,
  dados: { corPrimaria: string; corSecundaria: string; corAcento: string; nomeTema: string; iniciaisLogo: string; slogan: string }
): Promise<ResultadoPublicacao> {
  const r = await pedir("/identidade", { method: "POST", body: JSON.stringify({ pais, ...dados }) });
  if (r?.codigo === 200 && r.corpo?.ok) {
    // espelha no aparelho (a UI toda lê daqui)
    gravarIdentidade(pais, dados);
    return { ok: true, motivo: null, fonte: "servidor" };
  }
  if (r && r.codigo >= 400 && r.corpo?.motivo) {
    // o SERVIDOR recusou com motivo do núcleo — não cai para o aparelho
    // (evita «no servidor é 403 mas no meu aparelho grava» — a mesma regra vale)
    return { ok: false, motivo: r.corpo.motivo, fonte: "servidor" };
  }
  const local = gravarIdentidade(pais, dados);
  return { ok: local.motivo === "ok", motivo: local.motivo, fonte: "aparelho" };
}

/** NOVO ANÚNCIO — servidor primeiro, aparelho como rede de segurança. */
export async function publicarAnuncio(
  entrada: {
    pais: PaisCoFundador;
    tipo: "faixa" | "destaque";
    titulo: string;
    texto: string;
    ctaEtiqueta: string;
    ctaUrl: string;
    gradiente?: string;
    iniciaEm?: number;
    terminaEm?: number;
    criadoPor: string;
  }
): Promise<{ ok: boolean; motivo: MotivoAnuncio | null; fonte: FonteRegional; anuncio: AnuncioRegional | null }> {
  const r = await pedir("/anuncio", { method: "POST", body: JSON.stringify(entrada) });
  if (r?.codigo === 200 && r.corpo?.ok) {
    const local = criarAnuncio(entrada);
    return { ok: true, motivo: null, fonte: "servidor", anuncio: (r.corpo.anuncio as AnuncioRegional) ?? local.d };
  }
  if (r && r.codigo >= 400 && r.corpo?.motivo) {
    return { ok: false, motivo: r.corpo.motivo, fonte: "servidor", anuncio: null };
  }
  const local = criarAnuncio(entrada);
  return { ok: local.motivo === "ok", motivo: local.motivo, fonte: "aparelho", anuncio: local.d };
}

/** AÇÃO (pausar/reativar/remover) — o papel é executado NO SERVIDOR. */
export async function agirRemoto(
  id: string,
  acao: "pausar" | "reativar" | "remover",
  paisDoGestor: PaisCoFundador | "TODOS"
): Promise<{ ok: boolean; fonte: FonteRegional; erro: string | null }> {
  const r = await pedir("/acao", { method: "POST", body: JSON.stringify({ id, acao }) });
  if (r?.codigo === 200 && r.corpo?.ok) {
    agirAnuncio(id, acao, paisDoGestor); // espelha no aparelho
    return { ok: true, fonte: "servidor", erro: null };
  }
  if (r && r.codigo >= 400) {
    return { ok: false, fonte: "servidor", erro: r.corpo?.erro || `recusado (${r.codigo})` };
  }
  const ok = agirAnuncio(id, acao, paisDoGestor);
  return { ok, fonte: "aparelho", erro: ok ? null : "ação recusada no aparelho" };
}

// ── CONTADORES públicos (fire-and-forget — nunca bloqueia UI) ─
export function contarImpressao(id: string): void {
  registrarImpressao(id);
  pedir("/impressao", { method: "POST", body: JSON.stringify({ id }) }).catch(() => {});
}

export function contarClique(id: string): void {
  registrarClique(id);
  pedir("/clique", { method: "POST", body: JSON.stringify({ id }) }).catch(() => {});
}
