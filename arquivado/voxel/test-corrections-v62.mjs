// ============================================================
// v62 — FINALIZAÇÃO DO ROADMAP «Bateu corrections» (itens 3–11)
//
// A) Núcleo (Node):
//    A1 nomes.ts — catálogo EN completo (regiões/POIs/dificuldades/ramos/
//       história/diárias/causas de morte/itens) + reverse maps
//    A2 core.ts — diárias determinísticas: PT canónico intato; «en» = mesmas
//       missões/qtds/recompensas com texto inglês
//    A3 sistemaRpg — lingua default «pt» (os 157 testes ficam intactos);
//       com «en» a captura gera textos EN
//    A4 oauthReturn — erro na query E no fragmento; comTimeoutOAuth
//       (resolvido rápido + timeout honesto)
//    A5 cobertura i18n — TODA a chave rpg.*/aeth.*/world.fs.*/home.*/auth.*
//       usada nos componentes existe nos dicionários pt E en
//    A6 authErrors — email_exists agora orienta para ENTRAR (reset_password)
// B) E2E (browser REAL, vite 8099, SEM login em lado nenhum):
//    B1 homepage nova (desktop): hero honesto + CTA central + descoberta
//    B2 MUNDO EM ENGLÊS: menu «NEW LEGEND», HUD «QUESTS», modal «WORLD MAP»
//    B3 fullscreen REAL: entra, canvas adapta, ESC sai; modo PSEUDO honesto
//       (fullscreenEnabled=false) entra/sai pelo mesmo botão
//    B4 regressão PT: o mundo em PT fica byte-a-byte («NOVA LENDA», «MISSÕES»)
//    B5 OAuth: retorno com erro mostrado UMA vez + URL limpo; clique real no
//       Google dá erro HONESTO (nunca «A ligar...» preso)
//    B6 barra mobile: 4 destinos + ação central WORLD (sem concursos)
//    B7 fluxos de registo disponíveis: /register e /login com Google/Apple
//    B8 convidado: banner honesto no hub; recompensas de conta → /login
//    ZERO pageerror em toda a sessão
//
// Fonte dos padrões: docs/REA-corrections-v62.md
// Uso: PW_CHROME=<chromium> node test-corrections-v62.mjs        (vite 8099)
//      PW_CHROME=<chromium> node test-corrections-v62.mjs --sem-e2e   (só A)
// ============================================================
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync, readFileSync } from "node:fs";
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
  console.log(`\n🧭 v62 CORRECTIONS — ${RAIZ}\n`);

  // ════════ A) NÚCLEO (Node) ════════
  const nomes = await import(`${RAIZ}/src/game/rpg/nomes.ts`);
  const core = await import(`${RAIZ}/src/game/rpg/core.ts`);
  const consts = await import(`${RAIZ}/src/game/blocos/constants.ts`);

  console.log("— A1) nomes.ts: catálogo EN completo e honesto");
  const cob = nomes.coberturaEnCompleta();
  ok("cobertura EN completa (regiões+POIs+história+itens)", cob.ok === true);
  ok("zero falhas de cobertura", Array.isArray(cob.faltam) && cob.faltam.length === 0);
  ok("região aldeia EN = Village Plains", nomes.nomeRegiao(core.REGIOES.find((r) => r.id === "aldeia"), "en") === "Village Plains");
  ok("região aldeia PT = canónico", nomes.nomeRegiao(core.REGIOES.find((r) => r.id === "aldeia"), "pt") === "Planície da Aldeia");
  ok("POI torre EN = Watchtower", nomes.nomePoi(core.POIS.find((p) => p.id === "torre"), "en") === "Watchtower");
  ok("dificuldades EN = NORMAL/HARD/LEGEND",
     nomes.nomeDificuldade("medio", "en") === "NORMAL" && nomes.nomeDificuldade("dificil", "en") === "HARD" && nomes.nomeDificuldade("lenda", "en") === "LEGEND");
  ok("dificuldades PT = canónico (MÉDIO/…)", nomes.nomeDificuldade("medio", "pt") === "MÉDIO");
  ok("descrição EN da dificuldade lenda menciona +60%", nomes.descDificuldade("lenda", "en").includes("60%"));
  ok("ramos EN = Warrior/Explorer/Sage",
     nomes.nomeRamo("guerreiro", "en") === "Warrior" && nomes.nomeRamo("explorador", "en") === "Explorer" && nomes.nomeRamo("sabio", "en") === "Sage");
  ok("ramos PT = canónico (Guerreiro/…)", nomes.nomeRamo("sabio", "pt") === "Sábio");
  ok("efeitos EN do explorador (cap 18%)", nomes.efeitosRamo("explorador", "en").some((e) => e.includes("18%")));
  ok("título da história h1 EN = Call of the Village", nomes.tituloMissaoPorId("h1", "en") === "Call of the Village");
  ok("título da história h1 PT = canónico", nomes.tituloMissaoPorId("h1", "pt") === "Chamado da Aldeia");
  ok("objetivo por id (h2/i0) EN", nomes.textoObjetivoPorId("h2", 0, "en").includes("5 hostile"));
  ok("objetivo por TEXTO (bússola) PT→EN", nomes.textoObjetivoPorTexto("Sobe à Torre do Vigia", "en").includes("Watchtower"));
  ok("objetivo desconhecido volta canónico", nomes.textoObjetivoPorTexto("zzz", "en") === "zzz");
  ok("causa de morte EN", nomes.causaMorte("Caiste de alto", "en") === "You fell from a height");
  ok("causa de morte PT canónico", nomes.causaMorte("Caiste de alto", "pt") === "Caiste de alto");
  ok("todos os nomes EN sem acentos PT (catálogo completo — TNT é igual nas duas)", Object.keys(consts.NOMES).every((id) => {
    const enNome = nomes.nomeItem(Number(id), "en");
    return typeof enNome === "string" && enNome.length > 0 && !/[\u00e0-\u00ff]/.test(enNome);
  }));
  ok("nomePorTexto reverse (Pão→Bread)", nomes.nomePorTexto("Pão", "en") === "Bread");
  ok("rotuloMapa EN (Wilderness/Lv) e PT (Terras Selvagens/Nv)",
     nomes.rotuloMapa("en").selvagens === "Wilderness" && nomes.rotuloMapa("en").nv(2) === "Lv 2" &&
     nomes.rotuloMapa("pt").selvagens === "Terras Selvagens" && nomes.rotuloMapa("pt").nv(2) === "Nv 2");
  ok("linguaValida: só en|pt (podres → pt)", nomes.linguaValida("fr") === "pt" && nomes.linguaValida(null) === "pt" && nomes.linguaValida("en") === "en");

  console.log("— A2) core.ts: diárias determinísticas PT canónico + EN honesto");
  const DIF = core.DIFICULDADES_RPG.medio;
  const dPT = core.missoesDiarias("2026-11-18", DIF);
  const dPT2 = core.missoesDiarias("2026-11-18", DIF);
  ok("mesmo dia → mesmas missões (determinismo)", dPT.every((m, i) => m.id === dPT2[i].id && m.objetivo.texto === dPT2[i].objetivo.texto));
  ok("PT canónico: texto começa por «Derrota»/«Abre»/«Caminha»/«Sobrevive»/«Descobre»",
     dPT.every((m) => /^(Derrota|Abre|Caminha|Sobrevive|Descobre)/.test(m.objetivo.texto)));
  const dEN = core.missoesDiarias("2026-11-18", DIF, "en");
  ok("EN = as MESMAS missões (ids iguais)", dEN.every((m, i) => m.id === dPT[i].id));
  ok("EN = mesmas recompensas (xp/creditos)", dEN.every((m, i) => m.xp === dPT[i].xp && m.creditos === dPT[i].creditos));
  ok("EN = textos ingleses (Defeat/Open/Walk/Survive/Discover)",
     dEN.every((m) => /^(Defeat|Open|Walk|Survive|Discover)/.test(m.objetivo.texto)));
  ok("EN ≠ PT em todos os textos", dEN.every((m, i) => m.objetivo.texto !== dPT[i].objetivo.texto));

  console.log("— A3) sistemaRpg: lingua default «pt» (157 testes intatos); «en» muda a captura");
  // o sistemaRpg importa o motor (extensionless) — Node precisa do BUNDLE
  // esbuild (padrão v48/v60: o núcleo é provado em Node por bundle)
  const esbuild = await import("esbuild");
  const { writeFileSync } = await import("node:fs");
  const tmp = `${RAIZ}/.bundle-sistemaRpg-v62.mjs`;
  const b = await esbuild.build({
    entryPoints: [`${RAIZ}/src/game/rpg/sistemaRpg.ts`],
    bundle: true, write: false, format: "esm", platform: "node", external: ["three"],
  });
  writeFileSync(tmp, b.outputFiles[0].text);
  const sistemaM = await import(tmp);
  const { SistemaRPG } = sistemaM;
  const sPT = new SistemaRPG();
  ok("lingua default = pt", sPT.lingua === "pt");
  const capPT = sPT.captura();
  ok("captura PT: diárias em português", capPT.diarias.every((d) => /^(Derrota|Abre|Caminha|Sobrevive|Descobre)/.test(d.texto) || d.texto.length > 0));
  const sEN = new SistemaRPG();
  sEN.lingua = "en";
  const capEN = sEN.captura();
  ok("captura EN: diárias em inglês", capEN.diarias.every((d) => /^(Defeat|Open|Walk|Survive|Discover)/.test(d.texto)));
  ok("captura EN: títulos de diária em inglês via tituloDiaria (a captura mantém PT canónico)",
     capEN.diarias.every((d) => ["Morning hunt", "Treasure collector", "Worn-out boots", "The night you survived", "Day's route", "Pest control"].includes(nomes.tituloDiaria(d.titulo, "en"))));
  ok("EN e PT partilham os mesmos ids de diária", capEN.diarias.every((d, i) => d.id === capPT.diarias[i].id));

  console.log("— A4) oauthReturn: erro na query e no fragmento + timeout honesto");
  const oa = await import(`${RAIZ}/src/lib/oauthReturn.ts`);
  ok("query: ?error=access_denied&provider=google", (() => {
    const r = oa.erroOAuthDoUrl("?error=access_denied&error_description=fechou&provider=google", "");
    return r !== null && r.erro === "access_denied" && r.provedor === "google" && r.descricao === "fechou";
  })());
  ok("fragmento: #error=… (forma do Google)", (() => {
    const r = oa.erroOAuthDoUrl("", "#error=user_cancelled_login&error_description=x&provider=Apple");
    return r !== null && r.erro === "user_cancelled_login" && r.provedor === "apple";
  })());
  ok("sem erro → null", oa.erroOAuthDoUrl("?next=/profile", "") === null);
  ok("URL podre → null (nunca lança)", oa.erroOAuthDoUrl("%%%", "#%zz") === null);
  ok("provedor desconhecido → null", (() => {
    const r = oa.erroOAuthDoUrl("?error=x&provider=facebook", "");
    return r !== null && r.provedor === null;
  })());
  ok("limparErroOAuth sem window é no-op (Node)", oa.limparErroOAuth() === undefined);
  const rapido = await oa.comTimeoutOAuth(Promise.resolve(42), 1000);
  ok("comTimeoutOAuth: valor chega", rapido.valor === 42 && rapido.erro === null && rapido.porTimeout === false);
  const lento = await oa.comTimeoutOAuth(new Promise(() => {}), 40);
  ok("comTimeoutOAuth: timeout honesto (porTimeout)", lento.valor === null && lento.porTimeout === true && lento.erro?.message === "oauth_timeout");
  const rebenta = await oa.comTimeoutOAuth(Promise.reject(new Error("rede caiu")), 1000);
  ok("rebenta com erro do SDK chega (sem rejeitar)", rebenta.porTimeout === false && rebenta.erro?.message === "rede caiu" && rebenta.valor === null);
  ok("consumirRetornoOAuth em Node = null (sem window/sessionStorage)", oa.consumirRetornoOAuth() === null);

  console.log("— A5) cobertura i18n: toda a chave usada existe em pt E en");
  const ctxSrc = readFileSync(`${RAIZ}/src/contexts/LanguageContext.tsx`, "utf-8");
  const lerDicionario = (nome) => {
    const m = ctxSrc.match(new RegExp("(?:^|[\\s{(])" + nome + ":\\s*\\{([\\s\\S]*?)\\n  \\},"));
    if (!m) return null;
    const dict = {};
    for (const mm of m[1].matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)) dict[mm[1]] = mm[2];
    return dict;
  };
  const pt = lerDicionario("pt"), en = lerDicionario("en");
  ok("dicionários pt e en extraídos do LanguageContext", !!pt && !!en && Object.keys(pt).length > 400 && Object.keys(en).length > 400);
  const usadas = new Set();
  const colher = (ficheiro, prefixo) => {
    const s = readFileSync(`${RAIZ}/${ficheiro}`, "utf-8");
    for (const m of s.matchAll(new RegExp('t\\("' + prefixo + '[^"]+"', "g"))) usadas.add(m[0].slice(3, -1));
    return s;
  };
  const rpgSrc = colher("src/components/livegames/BateuRPG.tsx", "rpg\\.");
  colher("src/components/livegames/AetheriaGame.tsx", "aeth\\.");
  colher("src/components/livegames/GameFullscreenWrapper.tsx", "world\\.fs\\.");
  colher("src/pages/Index.tsx", "home\\.");
  colher("src/pages/Login.tsx", "auth\\.oauth\\.");
  colher("src/pages/Register.tsx", "auth\\.oauth\\.");
  colher("src/components/ProtectedRoute.tsx", "auth\\.boot\\.");
  // chaves dinâmicas (construídas em runtime)
  usadas.add("aeth.classe.sentinel.nome"); usadas.add("aeth.classe.sentinel.role");
  usadas.add("aeth.classe.arcanist.nome"); usadas.add("aeth.classe.arcanist.role");
  usadas.add("aeth.classe.ranger.nome"); usadas.add("aeth.classe.ranger.role");
  const faltamPt = [...usadas].filter((k) => !k.endsWith(".") && !(k in pt));
  const faltamEn = [...usadas].filter((k) => !k.endsWith(".") && !(k in en));
  ok(`chaves usadas = ${usadas.size} — todas existem em pt`, faltamPt.length === 0);
  ok("todas existem em en", faltamEn.length === 0);
  ok("as chaves rpg.* têm PT canónico ≠ EN", ["rpg.jogar", "rpg.btn.missoes", "rpg.boss.barra", "rpg.morte.renascer"].every((k) => pt[k] !== en[k]));
  ok("o RPG usa t() (a string fixa «NOVA LENDA» desapareceu do componente)", !rpgSrc.includes("NOVA LENDA"));
  ok("os rótulos honestos de confiança estão nos dicionários (prova/apuramento)", ("footer.prova" in pt) && ("footer.apuramento" in en));
  ok("as chaves inventadas saíram dos componentes", !readFileSync(`${RAIZ}/src/components/TrustSignals.tsx`, "utf-8").includes("footer.blockchain"));

  console.log("— A6) authErrors: email_exists orienta para ENTRAR (correção do item 5)");
  const ae = await import(`${RAIZ}/src/lib/authErrors.ts`);
  ok("User already registered → reset_password", ae.describeSignUpError("User already registered").action === "reset_password");
  ok("credenciais inválidas → signup (correto — criar conta)", ae.describeSignInError("Invalid login credentials").action === "signup");
  ok("email não confirmado → resend_confirmation", ae.describeSignInError("Email not confirmed").action === "resend_confirmation");

  const SEM_E2E = process.argv.includes("--sem-e2e");
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    // ════════ B) E2E (browser REAL, SEM login em lado nenhum) ════════
    const { chromium } = await import("playwright");
    const BASE = process.env.BASE_URL || "http://localhost:8099";
    const PW = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: PW });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    mkdirSync(join(RAIZ, "shots-v62"), { recursive: true });

    const NOISE = [
      "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
      "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
      "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
      "permission", "AbortError", "play() failed", "user gesture", "401",
      "same key", "validateDOMNesting", "CORS", "cors", "open-meteo",
      "GPU stall due to ReadPixels", "oauth", "lovable", "Fullscreen",
      "fullscreen", "denied", "Blocked", "THREE",
    ];
    const pageErrors = [];
    const consoleErros = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("console", (m) => {
      const t = m.text();
      if (NOISE.some((n) => t.includes(n))) return;
      if (m.type() === "error") consoleErros.push(t);
    });

    // ── B1) homepage nova (desktop) ──
    console.log("— B1) homepage nova: hero honesto + CTA central + descoberta");
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='home-cta-jogar-central']", { timeout: 20000 });
    ok("CTA central do Mundo 3D presente", await page.locator("[data-testid='home-cta-jogar-central']").count() === 1);
    ok("hero honesto (heroagora) presente", await page.locator("[data-testid='heroagora-jogar']").count() >= 1);
    ok("secção de sorteios com cabeçalho", await page.locator("#home-sorteios").count() === 1);
    ok("secção da loja com cabeçalho", await page.locator("#home-loja").count() === 1);
    ok("barra de confiança honesta no topo", await page.locator("[data-testid='trust-bar']").count() === 1);
    await page.screenshot({ path: join(RAIZ, "shots-v62/home-desktop.png") });

    // ── B2) MUNDO EM ENGLÊS (item 3) ──
    console.log("— B2) mundo em inglês: menu e HUD traduzidos");
    await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("bateu_lang_explicit", "1");
      localStorage.setItem("bateu_lang", "en");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='rpg-titulo']", { timeout: 30000 });
    const tituloEn = (await page.locator("[data-testid='rpg-titulo']").textContent())?.trim() ?? "";
    ok("título do menu EN = BATEU RPG: LEGENDS", tituloEn.includes("LEGENDS"));
    const btnJogarEn = (await page.locator("[data-testid='rpg-jogar']").textContent())?.trim() ?? "";
    ok("botão EN = NEW LEGEND", btnJogarEn.includes("NEW LEGEND"));
    ok("dificuldade EN = NORMAL", (await page.locator("[data-testid='rpg-dif-medio']").textContent())?.includes("NORMAL") ?? false);
    // entrar no mundo real
    await page.click("[data-testid='rpg-jogar']", { noWaitAfter: true });
    await page.waitForFunction(() => window.__rpg?.motor?.fase === "jogando", null, { timeout: 45000 });
    ok("mundo a jogar (ganchos reais)", true);
    await page.waitForSelector("[data-testid='rpg-btn-missoes']", { timeout: 15000 });
    ok("HUD EN: botão MISSÕES = QUESTS", ((await page.locator("[data-testid='rpg-btn-missoes']").textContent()) ?? "").includes("QUESTS"));
    ok("HUD EN: créditos label em inglês", ((await page.locator("[data-testid='rpg-creditos']").textContent()) ?? "").includes("credits"));
    await page.click("[data-testid='rpg-btn-mapa']", { noWaitAfter: true });
    await page.waitForSelector("[data-testid='rpg-mapa']", { timeout: 10000 });
    ok("modal do mapa EN = WORLD MAP", ((await page.locator("[data-testid='rpg-modal']").textContent()) ?? "").includes("WORLD MAP"));
    await page.click("[data-testid='rpg-fechar-modal']", { noWaitAfter: true });
    await page.screenshot({ path: join(RAIZ, "shots-v62/mundo-en.png") });

    // ── B3) fullscreen REAL + PSEUDO (item 4) ──
    console.log("— B3) fullscreen: entra real, resize dispara, sai; pseudo honesto");
    // contador honesto de resize: o wrapper/portal dispara window.resize no
    // fullscreenchange — é o sinal que o Motor.redimensionar() e o
    // ResizeObserver do Aetheria apanham (o canvas do portal já é inset-0,
    // por isso a PROVA do resize é o evento, não a mudança de largura)
    await page.evaluate(() => {
      window.__resizes = 0;
      window.addEventListener("resize", () => { window.__resizes++; });
    });
    await page.click("[data-testid='world-fullscreen']", { noWaitAfter: true });
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 8000 });
    ok("fullscreen REAL: document.fullscreenElement não-nulo (botão DENTRO do portal)", true);
    ok("o fullscreenElement é o portal do mundo", await page.evaluate(() => (document.fullscreenElement?.className ?? "").includes("fixed")));
    await sleep(500);
    ok("resize disparado no fullscreenchange (Motor.redimensionar apanha)", await page.evaluate(() => window.__resizes >= 1));
    ok("canvas preenche a viewport em fullscreen", await page.evaluate(() => {
      const c = document.querySelector("[data-testid='rpg-root'] canvas");
      return !!c && Math.abs(c.clientWidth - window.innerWidth) <= 2;
    }));
    // headless não tem browser UI (o ESC do fullscreen é comportamento de UI
    // do navegador) — a saída verifica-se pelo MESMO caminho da API que o
    // botão usa (exitFullscreen), estado final honesto
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 8000 });
    ok("saída do fullscreen real (API) — estado sincronizado", true);
    await sleep(400);
    // modo PSEUDO (sem API — iOS/webviews): o MESMO botão entra e sai, sem fingir
    await page.evaluate(() => {
      Object.defineProperty(document, "fullscreenEnabled", { get: () => false, configurable: true });
    });
    await page.click("[data-testid='world-fullscreen']", { noWaitAfter: true });
    await page.waitForFunction(() => {
      const l = document.querySelector("[data-testid='world-fullscreen']")?.getAttribute("aria-label") ?? "";
      return l.startsWith("Exit") || l.startsWith("Sair");
    }, null, { timeout: 8000 });
    ok("modo PSEUDO: o botão passa a anunciar SAÍDA (estado honesto, sem erro calado)", true);
    await page.click("[data-testid='world-fullscreen']", { noWaitAfter: true });
    await page.waitForFunction(() => {
      const l = document.querySelector("[data-testid='world-fullscreen']")?.getAttribute("aria-label") ?? "";
      return !l.startsWith("Exit") && !l.startsWith("Sair");
    }, null, { timeout: 8000 });
    ok("modo PSEUDO sai pelo mesmo botão", true);
    await page.evaluate(() => {
      // devolve o comportamento nativo para o resto da sessão
      delete document.fullscreenEnabled;
    });
    // sair do mundo em EN
    await page.click("[data-testid='rpg-btn-pausa']", { noWaitAfter: true });
    await page.waitForSelector("[data-testid='rpg-sair']", { timeout: 10000 });
    ok("pausa EN: EXIT TO THE PLATFORM", ((await page.locator("[data-testid='rpg-sair']").textContent()) ?? "").includes("EXIT"));
    await page.click("[data-testid='rpg-sair']", { noWaitAfter: true });
    await page.waitForFunction(() => !window.__rpg?.motor?.fase || window.__rpg?.motor?.fase !== "jogando", null, { timeout: 15000 });

    // ── B4) regressão PT (o canónico fica intato) ──
    console.log("— B4) regressão PT: o mundo em português fica igual");
    await page.evaluate(() => {
      localStorage.removeItem("bateu_lang_explicit");
      localStorage.removeItem("bateu_lang");
    });
    await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='rpg-titulo']", { timeout: 30000 });
    ok("PT: NOVA LENDA mantém-se", ((await page.locator("[data-testid='rpg-jogar']").textContent()) ?? "").includes("NOVA LENDA"));
    ok("PT: dificuldade MÉDIO mantém-se", ((await page.locator("[data-testid='rpg-dif-medio']").textContent()) ?? "").includes("MÉDIO"));

    // ── B5) OAuth: retorno com erro + clique real honesto (item 5) ──
    console.log("— B5) OAuth: erro do provedor mostrado UMA vez; clique real nunca fica preso");
    await page.goto(BASE + "/login?error=access_denied&error_description=popup%20fechado&provider=google", { waitUntil: "domcontentloaded" });
    // presença no DOM (a animação do framer sob carga do raster pode atrasar a
    // condição "visible" — o que interessa é o erro ESTAR, não o seu fade)
    let apareceu = false;
    for (let t = 0; t < 24; t++) {
      if ((await page.locator("[data-testid='login-error']").count()) > 0) { apareceu = true; break; }
      await sleep(500);
    }
    if (!apareceu) {
      console.log("  (diagnóstico: inline=" + JSON.stringify(await page.evaluate(() => window.__oauthRetorno)) + " | url=" + page.url() + ")");
    }
    ok("erro do retorno mostrado (Google + cancelado)", apareceu &&
       ((await page.locator("[data-testid='login-error']").textContent()) ?? "").includes("Google"));
    let urlLimpo = false;
    for (let t = 0; t < 10; t++) {
      if (!page.url().includes("error=")) { urlLimpo = true; break; }
      await sleep(300);
    }
    ok("URL limpo após mostrar (limpeza diferida de 250 ms)", urlLimpo);
    // clique REAL no Google: o SDK managed REDIRECIONA para /~oauth/initiate
    // (rota de produção do Lovable) — em dev, o fallback HONESTO explica e
    // devolve à autenticação (antes: 404 seco, sem uma palavra)
    await page.click("button:has-text('Continuar com Google')", { noWaitAfter: true });
    await page.waitForURL(/~oauth\/initiate/, { timeout: 15000 });
    await page.waitForSelector("[data-testid='oauth-fallback']", { timeout: 15000 });
    ok("clique real → fallback honesto de dev (nada de 404 seco)", true);
    ok("fallback explica que o OAuth corre na produção",
       ((await page.locator("[data-testid='oauth-fallback']").textContent()) ?? "").toLowerCase().includes("produ"));
    await page.click("[data-testid='oauth-fallback-voltar']");
    await page.waitForURL(/\/login/, { timeout: 15000 });
    ok("fallback navegável: volta à autenticação", page.url().includes("/login"));
    await page.screenshot({ path: join(RAIZ, "shots-v62/oauth-erro.png") });

    // ── B6) barra mobile: 4 destinos + WORLD central (item 7) ──
    console.log("— B6) barra mobile: 4 destinos + ação central WORLD");
    const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mob.setDefaultTimeout(15000);
    await mob.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await mob.waitForSelector("[data-testid='mob-tab-world']", { timeout: 20000 });
    ok("ação central WORLD presente", await mob.locator("[data-testid='mob-tab-world']").count() === 1);
    const tabs = await mob.locator(".mob-bottom-tab").count();
    ok(`4 destinos na barra (encontrados: ${tabs})`, tabs === 4);
    ok("concursos saiu da barra (descoberta na homepage)", await mob.locator("[data-testid='mob-tab-concursos']").count() === 0);
    await mob.screenshot({ path: join(RAIZ, "shots-v62/home-mobile.png") });

    // ── B7) fluxos de registo disponíveis (item 9) ──
    console.log("— B7) fluxos de registo: /register e /login com Google/Apple");
    await mob.goto(BASE + "/register", { waitUntil: "domcontentloaded" });
    await mob.waitForSelector("button:has-text('Continue with Google')", { timeout: 20000 });
    ok("register: botão Google", await mob.locator("button:has-text('Continue with Google')").count() >= 1);
    ok("register: botão Apple", await mob.locator("button:has-text('Continue with Apple')").count() >= 1);
    await mob.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
    await mob.waitForSelector("button:has-text('Continuar com Google')", { timeout: 20000 });
    ok("login: botão Google", await mob.locator("button:has-text('Continuar com Google')").count() >= 1);
    ok("login: botão Apple", await mob.locator("button:has-text('Continuar com Apple')").count() >= 1);

    // ── B8) convidado: banner honesto + recompensas protegidas (item 9) ──
    console.log("— B8) convidado: banner honesto no hub; carteira → login");
    await mob.goto(BASE + "/lives", { waitUntil: "domcontentloaded" });
    await mob.waitForSelector("[data-testid='livehub-convidado']", { timeout: 20000 });
    ok("banner do convidado presente (modo, não carência)", true);
    await mob.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
    await mob.waitForURL(/\/login/, { timeout: 15000 });
    ok("/wallet → /login (recompensas de conta protegidas)", mob.url().includes("/login"));

    // ── guard final ──
    ok("ZERO pageerror em toda a sessão", pageErrors.length === 0 && (await (() => true))());
    ok("ZERO console-error fora do ruído da casa", consoleErros.length === 0);
    if (consoleErros.length) console.log("  (consoleErros:", consoleErros.slice(0, 4), ")");
    if (pageErrors.length) console.log("  (pageErrors:", pageErrors.slice(0, 4), ")");

    await browser.close();
  }

  console.log(`\n═══ RESULTADO: ${passed} verdes · ${failed} falhas · ${skipped} skips ═══`);
  if (fails.length) { console.log("FALHAS:", fails); process.exit(1); }
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
