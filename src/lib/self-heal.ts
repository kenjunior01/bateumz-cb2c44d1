/**
 * Self-heal para a PWA Bateu.
 *
 * Problema: após um novo deploy, browsers com Service Worker antigo podem
 * servir chunks obsoletos (404 em assets novos, ou TDZ de chunks antigos
 * misturados com novos), mostrando o ecrã "Something went wrong".
 *
 * Solução em 3 camadas:
 *  1. Boot: se o BUILD_ID em execution difere do guardado, um reload limpo
 *     acontece (uma única vez) para apanhar os assets novos.
 *  2. Listeners globais: erros fatais de chunks (import falhado, TDZ entre
 *     chunks) disparam hardReset() uma vez por sessão.
 *  3. Botões do ErrorBoundary: fazem hardReset() (purge de SW + caches +
 *     reload) em vez de um reload simples.
 */

declare const __BUILD_ID__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

const RESET_FLAG = "bateu_selfheal_session";
const BUILD_KEY = "bateu_build_id";

function purgeServiceWorkers(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const sw = navigator.serviceWorker;
      if (!sw?.getRegistrations) return resolve();
      sw.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => resolve())
        .catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

function purgeCaches(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const c = (window as any).caches;
      if (!c?.keys) return resolve();
      c.keys()
        .then((keys: string[]) =>
          Promise.all(keys.map((k) => c.delete(k).catch(() => {})))
        )
        .then(() => resolve())
        .catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

/** Purga SW + caches e recarrega. Guarda: 1x por sessão por motivo. */
export function hardReset(reason = "manual"): void {
  try {
    const flag = `${RESET_FLAG}:${reason}`;
    if (sessionStorage.getItem(flag)) {
      // Já corremos este reset nesta sessão — reload simples.
      window.location.reload();
      return;
    }
    sessionStorage.setItem(flag, "1");
    console.warn("[Bateu self-heal] hard reset:", reason);

    let reloaded = false;
    const done = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    const timeout = setTimeout(done, 2000); // segurança: nunca ficar preso

    Promise.all([purgeServiceWorkers(), purgeCaches()])
      .catch(() => {})
      .then(() => {
        clearTimeout(timeout);
        done();
      });
  } catch {
    window.location.reload();
  }
}

function isFatalAssetError(msg: string): boolean {
  return (
    /Cannot access .* before initialization/i.test(msg) ||
    /Loading (CSS )?chunk [\s\S]* failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

/** Chamar uma única vez no bootstrap (main.tsx). */
export function initBootSelfHeal(): void {
  try {
    // 1) Detecção de novo deploy
    const prev = localStorage.getItem(BUILD_KEY);
    localStorage.setItem(BUILD_KEY, BUILD_ID);
    const isNewDeploy = !!prev && prev !== BUILD_ID;
    // ⚠️ o flag tem de incluir o motivo — hardReset guarda
    // `${RESET_FLAG}:${reason}` (antes lia-se a chave sem sufixo e o
    // guard nunca batia certo → loop de reloads).
    const alreadyReset = !!sessionStorage.getItem(`${RESET_FLAG}:new-deploy`);
    if (isNewDeploy && !alreadyReset) {
      console.info("[Bateu self-heal] novo deploy detectado — refresh");
      // Deixa o React montar; o refresh acontece logo a seguir, uma vez.
      setTimeout(() => hardReset("new-deploy"), 0);
    }

    // 2) Erros fatais de assets → purge
    window.addEventListener("error", (e) => {
      const msg = (e as ErrorEvent)?.message || "";
      if (isFatalAssetError(msg)) hardReset("fatal-boot-error");
    });
    window.addEventListener("unhandledrejection", (e) => {
      const msg = String((e as PromiseRejectionEvent)?.reason?.message || (e as PromiseRejectionEvent)?.reason || "");
      if (isFatalAssetError(msg)) hardReset("chunk-load-failure");
    });
  } catch {
    /* modo privado / storage bloqueado — ignorar */
  }
}
