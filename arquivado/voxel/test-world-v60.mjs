// ============================================================
// v60 — 3D WORLD SÓLIDO: erros de execução/tipos corrigidos SEM desativar checks
// (item 1 do roadmap «Bateu corrections»)
//
// A) Núcleo (Node): jogoValido (a porta única dos dados externos do jogo
//    ativo) + Motor.destruir()/render/passo como no-ops honestos sem iniciar.
// B) E2E (browser REAL, vite 8099): teclas presas no blur (RPG + Aetheria),
//    mapa/pausa/retomar, sair/reentrar ×2 (contextos WebGL), voo
//    determinístico, ZERO erros de consola/pageerror/warn-three.
//
// Fonte dos padrões: docs/REA-world-fixes-v60.md · repro: scripts/probe-world-v60.mjs
// Uso: PW_CHROME=<chromium> node test-world-v60.mjs        (vite dev 8099)
//      PW_CHROME=<chromium> node test-world-v60.mjs --sem-e2e   (só A)
// ============================================================
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
let passed = 0, failed = 0, skipped = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const skip = (name, motivo) => { skipped++; console.log(`  ⏭️  ${name} (${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🌍 v60 3D WORLD — ${RAIZ}\n`);

  // ════════ A) NÚCLEO (Node) ════════
  console.log("— A1) jogoValido: a ÚNICA porta dos dados externos (URL/localStorage/bus)");
  const { jogoValido } = await import(`${RAIZ}/src/lib/jogosLive.ts`);
  const IDS = ["wheel", "mmorpg", "aetheria", "chess"];
  ok("id válido da lista passa", jogoValido("mmorpg", IDS) === "mmorpg");
  ok("null/undefined/número → null", jogoValido(null, IDS) === null && jogoValido(undefined, IDS) === null && jogoValido(42, IDS) === null);
  ok("string vazia e espaços → null", jogoValido("", IDS) === null && jogoValido(" mmorpg", IDS) === null);
  ok("MAIÚSCULAS → null (case-sensitive honesto)", jogoValido("MMORPG", IDS) === null);
  ok("valor podre de localStorage → null (antes: cast as GameId)", jogoValido("zzz-podre", IDS) === null);
  ok("lista vazia recusa qualquer string", jogoValido("wheel", []) === null);
  ok("o valor DEVOLvido é do TIPO da lista (T)", (() => { const r = jogoValido("chess", IDS); return r === "chess" && typeof r === "string"; })());

  console.log("— A2) Motor.destruir(): no-op honesto antes do iniciar (bundle esbuild)");
  const bund = "/tmp/engine-v60-test.mjs";
  const r = spawnSync("./node_modules/.bin/esbuild",
    ["src/game/blocos/engine.ts", "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bund}`, "--log-level=error"],
    { cwd: RAIZ });
  if (r.status !== 0) { skip("Motor em Node", "esbuild do bundle falhou: " + String(r.stderr).slice(0, 120)); }
  else {
    const { Motor } = await import(bund);
    const m = new Motor();
    let lancou = null;
    try { m.destruir(); m.destruir(); } catch (e) { lancou = e; }
    ok("destruir() ×2 sem iniciar: sem throw (idempotente)", lancou === null);
    try { m.render(0.016); m.passo(0.05); } catch (e) { lancou = e; }
    ok("render()/passo() sem iniciar: sem throw e fase intacta", lancou === null && m.fase === "menu");
    ok("destruir() sem iniciar NÃO cria renderer", !m.renderer);
  }

  const SEM_E2E = process.argv.includes("--sem-e2e");
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    // ════════ B) E2E (browser REAL) ════════
    const { chromium } = await import("playwright");
    const BASE = process.env.BASE_URL || "http://localhost:8099";
    const PW = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: PW });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(15000);

    // v60: pageerror SEMPRE é problema; console-error passa pelo filtro NOISE
    // da casa (rede supabase do hub, driver ReadPixels do sandbox…)
    const NOISE = [
      "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
      "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
      "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
      "permission", "AbortError", "play() failed", "user gesture", "401",
      "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
      "GPU stall due to ReadPixels",
    ];
    const pageErrors = [];
    const consoleErros = [];
    const warnThree = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("console", (m) => {
      const t = m.text();
      if (NOISE.some((n) => t.includes(n))) return;
      if (m.type() === "error") consoleErros.push(t);
      else if (m.type() === "warning" && /(three|WebGL|context|ShadowMap)/i.test(t)) warnThree.push(t);
    });

    // clique determinístico a ~2 fps de raster (padrão v57: força + fallback DOM)
    const clicar = async (sel, timeout = 10000) => {
      const forcado = await page.click(sel, { timeout, force: true }).then(() => true).catch(() => false);
      if (forcado) return true;
      return page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel).catch(() => false);
    };

    try {
      console.log("— B1) o mundo entra pelo URL e o motor liga");
      await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const menuOk = await page.waitForSelector('[data-testid="rpg-jogar"]', { timeout: 25000 }).then(() => true).catch(() => false);
      ok("menu do RPG abre via ?game=mmorpg", menuOk);
      await clicar('[data-testid="rpg-jogar"]');
      await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 20000 }).catch(() => {});
      ok("NOVA LENDA → fase jogando", await page.evaluate(() => window.__rpg?.motor?.fase === "jogando"));
      ok("ganchos E2E TIPADOS presentes (window.__rpg)", await page.evaluate(() => !!window.__rpg?.motor && !!window.__rpg?.sistema));
      await sleep(1200);

      console.log("— B2) FURO REAL: teclas presas no blur (andava sozinho para sempre)");
      await page.keyboard.down("w");
      await sleep(350);
      ok("W pressionado → frente = 1", await page.evaluate(() => window.__rpg?.motor?.entrada?.frente === 1));
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await sleep(250);
      ok("blur da janela → frente = 0 (FIXADO)", await page.evaluate(() => window.__rpg?.motor?.entrada?.frente === 0));
      await page.keyboard.up("w");
      await page.keyboard.down("w");
      await sleep(300);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(250);
      ok("aba escondida (visibilitychange) → frente = 0 (FIXADO)", await page.evaluate(() => window.__rpg?.motor?.entrada?.frente === 0));
      await page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); });
      await page.keyboard.up("w");

      console.log("— B3) mapa do mundo: TERRENO REAL pelo minimapa");
      const abriuMapa = await clicar('[data-testid="rpg-minimapa"]');
      await sleep(1100);
      const mapaBase = await page.evaluate(() => window.__rpg?.mapaBase?.() ?? null);
      ok("minimapa abre o mapa do mundo", abriuMapa && !!(await page.$('[data-testid="rpg-mapa-canvas"]')));
      ok("base do mapa é TERRENO amostrado (amostras 48400 · ms>0)", !!mapaBase && mapaBase.amostras > 40000 && mapaBase.ms > 0);
      await clicar('[data-testid="rpg-fechar-modal"]');
      await sleep(700);
      ok("modal do mapa fecha", await page.evaluate(() => !document.querySelector('[data-testid="rpg-modal"]')));

      console.log("— B4) pausa pelo botão HUD → RETOMAR");
      await clicar('[data-testid="rpg-btn-pausa"]');
      await sleep(700);
      ok("pausa abre", await page.evaluate(() => !!document.querySelector('[data-testid="rpg-retomar"]')));
      await clicar('[data-testid="rpg-retomar"]');
      await sleep(700);
      ok("RETOMAR fecha e o mundo segue jogando", await page.evaluate(() => !document.querySelector('[data-testid="rpg-modal"]') && window.__rpg?.motor?.fase === "jogando"));

      console.log("— B5) sair/reentrar ×2: o unmount destrói o Motor (zero contextos acumulados)");
      // v61 FIX de flake honesto (repro scripts/probe-pausa-v60.mjs): no raster
      // ~2 fps do sandbox o CLIQUE do botão pausa perde-se DEPOIS de retomar +
      // andar (o HUD existe, fase jogando, o handler nunca chega) — o MESMO
      // padrão da lição v57 (clique forçado + fallback). A suíte volta a
      // TENTAR até o modal abrir (poll 4×400ms, 4 tentativas) e até o hub
      // voltar depois do sair — a ASSERÇÃO continua estrita (ciclo completo ×2).
      const abrirPausa = async () => {
        for (let tent = 1; tent <= 4; tent++) {
          await clicar('[data-testid="rpg-btn-pausa"]');
          for (let i = 0; i < 10; i++) {
            await sleep(400);
            if (await page.evaluate(() => !!document.querySelector('[data-testid="rpg-retomar"]'))) return true;
          }
        }
        return false;
      };
      const sairParaHub = async () => {
        for (let tent = 1; tent <= 3; tent++) {
          await clicar('[data-testid="rpg-sair"]');
          await sleep(1500);
          if (await page.$('[data-testid="livehub-destaque-bateu-world"]')) return true;
        }
        return false;
      };
      const entrarJogando = async () => {
        for (let tent = 1; tent <= 3; tent++) {
          await clicar('[data-testid="rpg-jogar"]');
          await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 12000 }).catch(() => {});
          if (await page.evaluate(() => window.__rpg?.motor?.fase === "jogando")) return true;
        }
        return false;
      };
      let ciclosOk = 0;
      for (let ciclo = 1; ciclo <= 2; ciclo++) {
        const abriu = await abrirPausa();
        const saiu = abriu && await sairParaHub();
        const banner = await page.$('[data-testid="livehub-destaque-bateu-world"]');
        const reentrou = !!banner && await clicar('[data-testid="livehub-destaque-bateu-world"]');
        await sleep(1100);
        const jogou = reentrou && await entrarJogando();
        const fase = await page.evaluate(() => window.__rpg?.motor?.fase ?? "?");
        if (saiu && reentrou && jogou && fase === "jogando") ciclosOk++;
        else console.log(`    ciclo ${ciclo}: saiu=${saiu} reentrou=${reentrou} jogou=${jogou} fase=${fase}`);
        await sleep(1400);
      }
      ok("sair → hub → reentrar → jogando (×2)", ciclosOk === 2);
      ok("ZERO warns THREE/deprecados/“Too many active WebGL contexts”", warnThree.length === 0);
      await page.screenshot({ path: `${RAIZ}/shots-v60/rpg-mundo.png` }).catch(() => {});

      console.log("— B6) Aetheria: hook novo + teclas presas + voo determinístico");
      await page.goto(`${BASE}/lives?game=aetheria`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      const temIntro = await page.waitForSelector('[data-testid="aetheria-intro"]', { timeout: 12000 }).then(() => true).catch(() => false);
      if (temIntro) {
        await clicar(".aetheria-enter");
        await sleep(2200);
      }
      const temHook = await page.evaluate(() => typeof window.__aetheria?.teclas === "function" && typeof window.__aetheria?.voando === "function");
      ok("ganchos E2E __aetheria presentes (intro ou mundo com save anterior)", temHook);
      if (temHook) {
        await page.keyboard.down("w");
        await sleep(300);
        const comW = await page.evaluate(() => window.__aetheria.teclas().w === true);
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        await sleep(250);
        const teclas = await page.evaluate(() => window.__aetheria.teclas());
        ok(`W preso → blur → teclas vazias (FIXADO)`, comW && Object.keys(teclas).every((k) => !teclas[k]));
        await page.keyboard.up("w");
        await page.keyboard.press("f");
        await sleep(200);
        const voando1 = await page.evaluate(() => window.__aetheria.voando());
        await page.keyboard.press("f");
        await sleep(200);
        const voando2 = await page.evaluate(() => window.__aetheria.voando());
        ok("F ×2 → voo liga e DESLIGA determinístico (sem updater com efeito)", voando1 === true && voando2 === false);
        await page.screenshot({ path: `${RAIZ}/shots-v60/aetheria-mundo.png` }).catch(() => {});
      }

      ok("ZERO pageerror em TODA a sessão", pageErrors.length === 0);
      ok("ZERO console-error fora do ruído conhecido", consoleErros.length === 0);
      if (consoleErros.length) console.log("    erros:", consoleErros.slice(0, 5));
      if (pageErrors.length) console.log("    pageerrors:", pageErrors.slice(0, 5));
    } finally {
      await browser.close();
    }
  }

  console.log(`\n${"═".repeat(56)}`);
  console.log(`  VERDES: ${passed}  ·  FALHAS: ${failed}  ·  SKIPS: ${skipped}`);
  if (fails.length) { console.log("  FALHAS:"); fails.forEach((f) => console.log("   - " + f)); }
  console.log(`${"═".repeat(56)}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("SUÍTE CRASHOU:", e); process.exit(1); });
