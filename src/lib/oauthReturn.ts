// ============================================================
// v62 — RETORNO OAUTH (roadmap item 5: «Verify and correct managed
// Google/Apple registration and signup errors»).
// O fluxo managed (Lovable cloud-auth) volta para redirect_uri = origem.
// Quando o utilizador cancela ou o provedor recusa, o erro vem nos PARAMS
// do URL (query OU fragment — o Google usa fragment). Antes de hoje esse
// retorno morria na homepage sem uma palavra. Puro browser E Node.
// ============================================================

export interface RetornoOAuth {
  provedor: string | null;      // "google" | "apple" | null (desconhecido)
  erro: string;                 // código do provedor (ex.: access_denied)
  descricao: string;            // texto do provedor, se existir
}

/* v62: captura ÚNICA feita INLINE no index.html (antes de QUALQUER script
   externo — o gtag do Google também faz history.replaceState para limpar
   parâmetros e, em corrida com o bundle, apagava o erro que o Google/Apple
   devolveram; repro: /login?error=… com o gtag em cache). O módulo lê
   window.__oauthRetorno e valida a forma — valor podre é recusado. */
declare global {
  interface Window { __oauthRetorno?: RetornoOAuth | null }
}
const capturaDoInline = (): RetornoOAuth | null => {
  if (typeof window === "undefined") return null;
  const bruto = window.__oauthRetorno;
  if (!bruto || typeof bruto !== "object") return null;
  if (typeof bruto.erro !== "string" || bruto.erro.length === 0) return null;
  if (typeof bruto.descricao !== "string") return null;
  if (bruto.provedor !== null && bruto.provedor !== "google" && bruto.provedor !== "apple") return null;
  return bruto;
};
export const RETORNO_OAUTH_INICIAL: RetornoOAuth | null =
  capturaDoInline() ??
  (typeof window !== "undefined" ? erroOAuthDoUrl(window.location.search, window.location.hash) : null);

/** Mostra o retorno de forma RESILIENTE a remounts (o double-mount inicial
 *  do React descarta estado — a flag one-shot em módulo deixava o erro
 *  invisível no segundo mount; repro: ~50% das corridas do E2E). O espelho
 *  em sessionStorage com janela de 30 s cobre remounts imediatos: o mount
 *  atual re- Lê o espelho e mostra o MESMO erro. Janela fecha depois —
 *  visitas futuras ao /login não re-mostram um erro antigo. */
const CHAVE_ESPELHO = "bateu_oauth_erro";
const JANELA_ESPELHO_MS = 30_000;
export function consumirRetornoOAuth(): RetornoOAuth | null {
  // 1) params no URL/inline — a fonte primária (o inline vence o gtag)
  const direto = RETORNO_OAUTH_INICIAL ?? erroOAuthDoUrl(
    typeof window !== "undefined" ? window.location.search : "",
    typeof window !== "undefined" ? window.location.hash : "",
  );
  if (direto) {
    try {
      sessionStorage.setItem(CHAVE_ESPELHO, JSON.stringify({ ...direto, ts: Date.now() }));
    } catch { /* sessionStorage indisponível */ }
    limparErroOAuth();
    return direto;
  }
  // 2) espelho recente (remount dentro da janela)
  try {
    const bruto = sessionStorage.getItem(CHAVE_ESPELHO);
    if (!bruto) return null;
    const parse = JSON.parse(bruto) as { provedor: string | null; erro: string; descricao: string; ts: number };
    if (typeof parse.erro !== "string" || typeof parse.ts !== "number") return null;
    if (Date.now() - parse.ts > JANELA_ESPELHO_MS) return null;
    return { provedor: parse.provedor, erro: parse.erro, descricao: parse.descricao };
  } catch { return null; }
}

/** Extrai o erro OAuth do searchParams (query) e do fragmento (#).
 *  Os provedores devolvem ?error=…&error_description=… OU
 *  #error=…&error_description=… — as duas formas são verificadas.
 *  null = não há erro de OAuth no URL. */
export function erroOAuthDoUrl(search: string, hash: string): RetornoOAuth | null {
  const ler = (params: URLSearchParams): RetornoOAuth | null => {
    const erro = params.get("error");
    if (!erro) return null;
    const descricao = params.get("error_description") ?? "";
    const provedorBruto = params.get("provider") ?? "";
    const provedor = provedorBruto.toLowerCase().includes("apple")
      ? "apple"
      : provedorBruto.toLowerCase().includes("google")
        ? "google"
        : null;
    return { provedor, erro, descricao };
  };
  try {
    const porQuery = ler(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search));
    if (porQuery) return porQuery;
    const fragmento = hash.startsWith("#") ? hash.slice(1) : hash;
    if (fragmento) return ler(new URLSearchParams(fragmento));
  } catch {
    return null; // URL podre — nunca lança
  }
  return null;
}

/** Remove os parâmetros de erro OAuth do URL (history.replaceState) — o
 *  erro é mostrado UMA vez; recarregar não deve voltar a mostrá-lo. */
export function limparErroOAuth(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  // limpeza DIFERIDA (250 ms): um remount imediato ainda encontra os params
  // no URL e mostra o MESMO erro (o espelho em consumirRetornoOAuth cobre o
  // resto) — a limpeza imediata era a metade do bug do remount
  setTimeout(() => {
    try {
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    url.searchParams.delete("provider");
    let novoFragmento = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (novoFragmento) {
      const p = new URLSearchParams(novoFragmento);
      p.delete("error");
      p.delete("error_description");
      p.delete("provider");
      novoFragmento = p.toString();
    }
    const novo =
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + (novoFragmento ? `#${novoFragmento}` : "");
    window.history.replaceState(null, "", novo);
    } catch { /* history indisponível — o erro continua no URL, mostrado uma vez */ }
  }, 250);
}

/** Tempo máximo de espera pelo OAuth managed (o popup/redirect pode morrer
 *  calado em webviews — cap honesto com mensagem própria). */
export const TIMEOUT_OAUTH_MS = 15_000;

export interface ResultadoOAuth<T> {
  valor: T | null;
  erro: Error | null;
  /** true quando o motivo foi o relógio (o SDK não respondeu). */
  porTimeout: boolean;
}

/** Corrida contra o relógio: se o provider SDK não responder em 15 s,
 *  devolve erro honesto (o estado «A ligar...» nunca fica preso). */
export function comTimeoutOAuth<T>(promessa: Promise<T>, ms = TIMEOUT_OAUTH_MS): Promise<ResultadoOAuth<T>> {
  return new Promise((resolve) => {
    let assentado = false;
    const relogio = setTimeout(() => {
      if (assentado) return;
      assentado = true;
      resolve({ valor: null, erro: new Error("oauth_timeout"), porTimeout: true });
    }, ms);
    promessa.then(
      (valor) => {
        if (assentado) return;
        assentado = true;
        clearTimeout(relogio);
        resolve({ valor, erro: null, porTimeout: false });
      },
      (e: unknown) => {
        if (assentado) return;
        assentado = true;
        clearTimeout(relogio);
        resolve({ valor: null, erro: e instanceof Error ? e : new Error(String(e)), porTimeout: false });
      },
    );
  });
}
