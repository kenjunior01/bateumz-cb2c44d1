// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v34 — Cliente Radio Browser (rádios PALOP ao vivo)
//
// Fonte: radio-browser.info (public-apis → Music/Audio) — base de dados
// comunitária de rádios, pública, sem chave, CORS aberto.
//
// VALIDAÇÃO AO VIVO (2026-11-03, scripts/probe-apis-v34.sh, registada em
// docs/REA-apis-publicas-v34.md):
// · de1.api.radio-browser.info/json/stations/bycountrycodeexact/MZ → HTTP 200 ✅
//   (1.ª estação: "Rádio Moçambique Antena Nacional", stream https real)
// · mesmo host /CV → HTTP 200 ✅ (Caboradio) — Access-Control-Allow-Origin: *
//
// PALOP: filtramos por código ISO EXACTO (MZ, AO, CV) com hidebroken=true
// (a fonte marca estações mortas) e ordenação por votos da comunidade.
// Honestidade: os streams são de emissores reais e podem estar offline —
// o erro do <audio> é mostrado como erro, nunca escondido.
// Atribuição: "Rádios © Radio Browser (radio-browser.info) — comunidade".
// ═══════════════════════════════════════════════════════════════════════

const MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
];

const CACHE_TTL = 6 * 60 * 60_000; // 6 h — a base muda devagar
const LS_PREFIX = "bateumz.radio.";

export const RADIO_ATTRIBUTION =
  "Rádios © Radio Browser (radio-browser.info) · estações da comunidade";

export class RadioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RadioError";
  }
}

export interface RadioEstacao {
  uuid: string;
  nome: string;
  url: string;          // url_resolved (redirects já seguidos)
  favicon: string;
  homepage: string;
  codec: string;
  bitrate: number;
  tags: string[];
  votos: number;
  pais: string;
}

export const PAISES_PALOP = [
  { cc: "MZ", bandeira: "🇲🇿", nome: "Moçambique" },
  { cc: "AO", bandeira: "🇦🇴", nome: "Angola" },
  { cc: "CV", bandeira: "🇨🇻", nome: "Cabo Verde" },
] as const;

export type CcPalop = (typeof PAISES_PALOP)[number]["cc"];

async function reqJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new RadioError(`Radio Browser HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof RadioError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new RadioError("Radio Browser demorou demasiado (timeout)");
    }
    throw new RadioError("Sem ligação ao Radio Browser");
  } finally {
    clearTimeout(timer);
  }
}

/** Faz o pedido tentando os espelhos conhecidos pela comunidade, em ordem. */
async function comEspelhos<T>(caminho: string): Promise<T> {
  let ultimoErro: unknown = null;
  for (const espelho of MIRRORS) {
    try {
      return await reqJson<T>(espelho + caminho);
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new RadioError("Espelhos do Radio Browser indisponíveis");
}

interface LinhaEstacao {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  url?: string;
  favicon?: string;
  homepage?: string;
  codec?: string;
  bitrate?: number;
  tags?: string;
  votes?: number;
  countrycode?: string;
}

function paraEstacao(r: LinhaEstacao): RadioEstacao | null {
  const url = r.url_resolved || r.url;
  if (!r.stationuuid || !r.name || !url) return null;
  if (!/^https:\/\//i.test(url)) return null; // streams http puro são bloqueados em páginas https — não prometemos o que não funciona
  return {
    uuid: r.stationuuid,
    nome: r.name.trim(),
    url,
    favicon: r.favicon && /^https:\/\//i.test(r.favicon) ? r.favicon : "",
    homepage: r.homepage && /^https:\/\//i.test(r.homepage) ? r.homepage : "",
    codec: r.codec ?? "",
    bitrate: typeof r.bitrate === "number" ? r.bitrate : 0,
    tags: (r.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3),
    votos: typeof r.votes === "number" ? r.votes : 0,
    pais: r.countrycode ?? "",
  };
}

function lerCache(cc: string): { fresco: RadioEstacao[] | null; velho: RadioEstacao[] | null } {
  try {
    const raw = localStorage.getItem(LS_PREFIX + cc);
    if (!raw) return { fresco: null, velho: null };
    const g = JSON.parse(raw) as { t: number; lista: RadioEstacao[] };
    return {
      fresco: Date.now() - g.t < CACHE_TTL ? g.lista : null,
      velho: g.lista,
    };
  } catch {
    return { fresco: null, velho: null };
  }
}

function guardarCache(cc: string, lista: RadioEstacao[]) {
  try { localStorage.setItem(LS_PREFIX + cc, JSON.stringify({ t: Date.now(), lista })); } catch { /* quota */ }
}

const emVoo = new Map<string, Promise<RadioEstacao[]>>();

/** Estações reais de um país PALOP (cache 6 h + stale-on-error honesto). */
export async function getRadios(cc: CcPalop): Promise<RadioEstacao[]> {
  const cached = lerCache(cc);
  if (cached.fresco) return cached.fresco;

  let pedido = emVoo.get(cc);
  if (!pedido) {
    const caminho = `/json/stations/bycountrycodeexact/${cc}?hidebroken=true&order=votes&reverse=true&limit=12`;
    pedido = comEspelhos<LinhaEstacao[]>(caminho)
      .then((linhas) => {
        const lista = (linhas ?? []).map(paraEstacao).filter((e): e is RadioEstacao => e !== null);
        guardarCache(cc, lista);
        return lista;
      })
      .finally(() => { emVoo.delete(cc); });
    emVoo.set(cc, pedido);
  }

  try {
    return await pedido;
  } catch (erroRede) {
    if (cached.velho && cached.velho.length) return cached.velho; // offline → última lista real, UI avisa
    throw erroRede;
  }
}
