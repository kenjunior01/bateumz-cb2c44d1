/**
 * routePrefetch — v26 Web Excellence
 *
 * Navegação instantânea na versão web: quando o utilizador faz hover (ou foco,
 * ou toca) num link interno, o chunk da rota de destino é descarregado ANTES do
 * clique. Ao clicar, o React.lazy resolve do cache — transição sem espera.
 *
 * Padrão usado por Vercel/GitHub/Linear. Sem librarias externas: ~60 linhas.
 * Idempotente (cada chunk só pede 1× por sessão) e inofensivo em mobile
 * (touchstart dispara no mesmo toque do clique, sem custo extra).
 */

const ROUTE_CHUNKS: Array<[RegExp, () => Promise<unknown>]> = [
  // Módulos competitivos e hubs (destinos mais navegados)
  [/^\/jogos-gratis/, () => import("@/pages/games-gratis/FreeGamesHub.tsx")],
  [/^\/desporto/, () => import("@/pages/desporto/DesportoHub.tsx")],
  [/^\/ligas/, () => import("@/pages/leagues/LeaguesListPage.tsx")],
  [/^\/esports/, () => import("@/pages/esports/EsportsHub.tsx")],
  [/^\/tournaments/, () => import("@/pages/tournaments/TournamentsList.tsx")],
  [/^\/lives-agora/, () => import("@/pages/LivesAgora.tsx")],
  [/^\/lives/, () => import("@/pages/LiveHub.tsx")],
  [/^\/batalhas/, () => import("@/pages/Battles.tsx")],
  [/^\/arena/, () => import("@/pages/Arena.tsx")],
  // Descoberta
  [/^\/jogo\//, () => import("@/pages/GameDetail.tsx")],
  [/^\/todos-jogos/, () => import("@/pages/AllGames.tsx")],
  [/^\/jogos/, () => import("@/pages/AllGames.tsx")],
  [/^\/marketplace/, () => import("@/pages/Marketplace.tsx")],
  [/^\/leiloes/, () => import("@/pages/Leiloes.tsx")],
  [/^\/instant-win/, () => import("@/pages/InstantWin.tsx")],
  [/^\/concursos/, () => import("@/pages/Contests.tsx")],
  // Conteúdo e confiança
  [/^\/blog/, () => import("@/pages/Blog.tsx")],
  [/^\/empresas/, () => import("@/pages/BusinessDirectory.tsx")],
  [/^\/negocios/, () => import("@/pages/BusinessEcosystem.tsx")],
  [/^\/community/, () => import("@/pages/Community.tsx")],
  [/^\/como-funciona/, () => import("@/pages/HowItWorks.tsx")],
  [/^\/faq/, () => import("@/pages/FAQ.tsx")],
  [/^\/transparencia/, () => import("@/pages/Transparency.tsx")],
  [/^\/historico/, () => import("@/pages/RaffleHistory.tsx")],
  [/^\/pontos/, () => import("@/pages/EngagementLeaderboard.tsx")],
  // Jogos e conta
  [/^\/games\/millionaire/, () => import("@/pages/games/MillionairePage.tsx")],
  [/^\/login/, () => import("@/pages/Login.tsx")],
  [/^\/register/, () => import("@/pages/Register.tsx")],
];

const fetched = new Set<string>();

function prefetchFor(href: string) {
  if (!href || !href.startsWith("/")) return;
  for (const [re, load] of ROUTE_CHUNKS) {
    if (re.test(href) && !fetched.has(href)) {
      fetched.add(href);
      // silencioso: falha de rede aqui é inofensiva (o clique volta a pedir)
      load().catch(() => fetched.delete(href));
      return;
    }
  }
}

const HOVER_DELAY_MS = 65; // evita prefetch em varrimentos rápidos do rato
let hoverTimer: number | undefined;
let lastTarget: string | null = null;

function onOver(e: Event) {
  const target = e.target as HTMLElement | null;
  const a = target?.closest?.("a[href^='/']") as HTMLAnchorElement | null;
  const href = a?.getAttribute("href") ?? null;
  if (!href || href === lastTarget) return;
  lastTarget = href;
  window.clearTimeout(hoverTimer);
  hoverTimer = window.setTimeout(() => prefetchFor(href), HOVER_DELAY_MS);
}

function onFocusIn(e: Event) {
  const target = e.target as HTMLElement | null;
  const a = target?.closest?.("a[href^='/']") as HTMLAnchorElement | null;
  const href = a?.getAttribute("href");
  if (href) prefetchFor(href); // teclado: sem atraso
}

/** Instala os listeners globais uma única vez (chamado no AppShell). */
export function initRoutePrefetch() {
  if (typeof window === "undefined" || (window as { __bateuPrefetch?: boolean }).__bateuPrefetch) return;
  (window as { __bateuPrefetch?: boolean }).__bateuPrefetch = true;
  document.addEventListener("mouseover", onOver, { passive: true });
  document.addEventListener("focusin", onFocusIn, { passive: true });
  // mobile: o toque já leva ao clique; aquecer no primeiro toque não custa nada
  document.addEventListener("touchstart", onFocusIn, { passive: true });
}

/**
 * v26.2 Web Excellence — aquece o chunk da rota ACTUAL durante o ecrã de marca.
 *
 * O main.tsx só aquecia a home; quem chegava por deep-link (/desporto,
 * /jogos-gratis, partilha nas redes) via o ecrã de marca e SÓ DEPOIS começava a
 * descarregar o chunk da rota — serializado. Chamado no arranque, este helper
 * resolve o chunk do pathname corrente em paralelo com a marca.
 */
export function warmRouteChunkFor(pathname: string) {
  if (!pathname || pathname === "/") return; // a home já é aquecida pelo main.tsx
  for (const [re, load] of ROUTE_CHUNKS) {
    if (re.test(pathname)) {
      load().catch(() => { /* silencioso: o lazy() volta a pedir */ });
      return;
    }
  }
}
