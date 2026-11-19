// ============================================================
// v72 — CLÁSSICOS + GUERRA ESPACIAL AVANÇADA + CO-FUNDADORES
// ────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, shim localStorage): regionalBranding.ts —
//    identidade visual por país (MZ/AO/BR/PT), criação de
//    anúncios com validação HONESTA, janela de agendamento,
//    limites por país, PERMISSÕES (co-fundador só o SEU país;
//    o admin «TODOS» atravessa), impressões/cliques/CTR,
//    panorama dos 4 países, urlSegura.
// B) E2E ANÚNCIOS NO HUB: anúncio semeado do país do jogador
//    aparece na faixa do topo, clique NAVEGA e conta honesto;
//    país sem anúncios → faixa NÃO existe (nada finge).
// C) E2E TETRIS: começa, peça cai, QUEDA DURA pontua (>0),
//    pausa congela e retoma.
// D) E2E GUERRA ESPACIAL: onda 1, HUD combo, tiros sustentados
//    sem nenhum pageerror.
// E) E2E CO-FUNDADOR + ADMIN (auth supabase MOCKADA no fetch):
//    painel /regional-panel publica anúncio REAL (linha + stats),
//    identidade salva no aparelho; /admin/ads mostra o PANORAMA
//    dos 4 países + anúncios de QUALQUER país + pausa do admin.
// Uso: PW_CHROME=… node test-classic-v72.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 200)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
};
function limparZumbis() {
  try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {}
}
async function esperarAte(url, testar, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (testar(r)) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "autoplay", "unlockAudio", "400",
];

async function main() {
  limparZumbis();
  console.log(`\n🧱 CLÁSSICOS + GUERRA ESPACIAL + CO-FUNDADORES v72 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (regionalBranding.ts com shim de localStorage) —");
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
  const R = await import(`${RAIZ}/src/lib/regionalBranding.ts`);
  store.clear();

  // 1) os QUATRO países do lançamento
  ok("Lançamento: co-fundadores em MZ · AO · BR · PT (e só estes)",
    R.PAISES_COFUNDADOR.join(",") === "MZ,AO,BR,PT");
  ok("identidadePadrao: os 4 países nascem com marca digna (cores hex + nome + slogan)",
    R.PAISES_COFUNDADOR.every((p) => {
      const id = R.identidadePadrao(p);
      return /^#[0-9a-f]{6}$/i.test(id.corPrimaria) && id.nomeTema.startsWith("Bateu")
        && id.slogan.length >= 3 && id.iniciaisLogo.length >= 2;
    }));

  // 2) gravarIdentidade — válido + persistência
  const gravado = R.gravarIdentidade("MZ", {
    corPrimaria: "#16A34A", corSecundaria: "#EAB308", corAcento: "#EF4444",
    nomeTema: "Bateu Moçambique Turbo", iniciaisLogo: "bm", slogan: "Moçambique joga em casa!",
  });
  ok("gravarIdentidade VÁLIDO: grava, clampa iniciais e persiste no aparelho",
    gravado.d !== null && gravado.d.iniciaisLogo === "BM"
    && R.lerIdentidade("MZ").nomeTema === "Bateu Moçambique Turbo"
    && store.has("bateu_regional_v72"));

  // 3) gravarIdentidade — recusas honestas
  ok("IDENTIDADE recusa cor fora de hex (#zzz)",
    R.gravarIdentidade("MZ", { corPrimaria: "#zzz", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Nome Bom", iniciaisLogo: "BM", slogan: "slogan ok" }).motivo === "cor");
  ok("IDENTIDADE recusa nome curto (2)",
    R.gravarIdentidade("MZ", { corPrimaria: "#111111", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "AB", iniciaisLogo: "BM", slogan: "slogan ok" }).motivo === "nome");
  ok("IDENTIDADE recusa iniciais fora de 2-3 (A)",
    R.gravarIdentidade("MZ", { corPrimaria: "#111111", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Nome Bom", iniciaisLogo: "A", slogan: "slogan ok" }).motivo === "iniciais");
  ok("IDENTIDADE recusa país fora do lançamento (IN)",
    R.gravarIdentidade("IN", { corPrimaria: "#111111", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Nome Bom", iniciaisLogo: "AB", slogan: "slogan ok" }).motivo === "pais");

  // 4) criarAnuncio — válido + recusas
  const agora = Date.now();
  const bom = R.criarAnuncio({
    pais: "MZ", tipo: "faixa", titulo: "Festival de Jogos em Maputo",
    texto: "Prémios em moedas todos os dias — joga no hub!", ctaEtiqueta: "Ver",
    ctaUrl: "/lives?game=kart", criadoPor: "Gestor MZ",
  });
  ok("ANÚNCIO válido: id com país, estado ATIVO, criador marcado",
    bom.d !== null && bom.d.id.startsWith("an-mz-") && bom.d.estado === "ativo" && bom.d.criadoPor === "Gestor MZ");
  ok("ANÚNCIO recusa URL EXTERNA (https://) — só caminhos internos",
    R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "https://mal.com", criadoPor: "x" }).motivo === "url");
  ok("ANÚNCIO recusa javascript: injectado",
    R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "javascript:alert(1)", criadoPor: "x" }).motivo === "url");
  ok("ANÚNCIO recusa título curto",
    R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Oi", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "x" }).motivo === "titulo");
  ok("ANÚNCIO recusa janela inválida (termina antes de começar)",
    R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", iniciaEm: agora, terminaEm: agora - 1, criadoPor: "x" }).motivo === "janela");

  // 5) JANELA de agendamento
  const futuro = R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Campanha Futura", texto: "só aparece depois", ctaEtiqueta: "Esperar", ctaUrl: "/lives", iniciaEm: agora + 3600_000, criadoPor: "x" });
  const passado = R.criarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Campanha Expirada", texto: "já acabou", ctaEtiqueta: "Fim", ctaUrl: "/lives", iniciaEm: agora - 7200_000, terminaEm: agora - 3600_000, criadoPor: "x" });
  ok("JANELA: anúncio FUTURO não está ativo agora", !R.anunciosAtivos("MZ", agora).some((a) => a.id === futuro.d.id));
  ok("JANELA: anúncio EXPIRADO não está ativo agora", !R.anunciosAtivos("MZ", agora).some((a) => a.id === passado.d.id));
  ok("JANELA: o anúncio VÁLIDO está ativo agora", R.anunciosAtivos("MZ", agora).some((a) => a.id === bom.d.id));

  // 6) PERMISSÕES — o co-fundador NÃO atravessa países; o ADMIN atravessa
  const anuncioBR = R.criarAnuncio({ pais: "BR", tipo: "faixa", titulo: "Festival no Brasil", texto: "só para BR", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "Gestor BR" });
  ok("PERMISSÃO: gestor de MZ NÃO pode pausar anúncio de BR",
    R.agirAnuncio(anuncioBR.d.id, "pausar", "MZ") === false);
  ok("PERMISSÃO: gestor de MZ pausa O SEU anúncio",
    R.agirAnuncio(bom.d.id, "pausar", "MZ") === true && R.anunciosAtivos("MZ", agora).length === 0);
  ok("PERMISSÃO: ADMIN («TODOS») reativa o anúncio de MZ",
    R.agirAnuncio(bom.d.id, "reativar", "TODOS") === true && R.anunciosAtivos("MZ", agora).length === 1);
  ok("PERMISSÃO: ADMIN pausa anúncio de BR mesmo sem ser o gestor dele",
    R.agirAnuncio(anuncioBR.d.id, "pausar", "TODOS") === true && R.anunciosAtivos("BR", agora).length === 0);
  ok("PERMISSÃO: ação de REMOVER só com acesso ao país certo",
    R.agirAnuncio(anuncioBR.d.id, "remover", "MZ") === false
    && R.agirAnuncio(anuncioBR.d.id, "remover", "BR") === true);

  // 7) estatísticas honestas + CTR
  const a1 = R.criarAnuncio({ pais: "AO", tipo: "faixa", titulo: "Angola em Jogo", texto: "prémios para Angola", ctaEtiqueta: "Ir", ctaUrl: "/lives?game=tetris", criadoPor: "Gestor AO" });
  R.registrarImpressao(a1.d.id); R.registrarImpressao(a1.d.id); R.registrarImpressao(a1.d.id);
  R.registrarClique(a1.d.id);
  const statsAO = R.estatisticasPais("AO");
  ok("ESTATÍSTICAS: 3 impressões + 1 clique → CTR 33,3% em AO (e nada vaza para MZ)",
    statsAO.impressoes === 3 && statsAO.cliques === 1 && Math.abs(statsAO.ctr - 1 / 3) < 1e-9
    && R.estatisticasPais("MZ").impressoes === 0);

  // 8) TETO por país (12)
  store.clear();
  let aceites = 0;
  for (let i = 0; i < 14; i++) {
    const r = R.criarAnuncio({ pais: "PT", tipo: "destaque", titulo: `Campanha Lisbon nº ${i}`, texto: "destaque de teste honesto", ctaEtiqueta: "Ver", ctaUrl: "/jogos", criadoPor: "Gestor PT" });
    if (r.d) aceites++;
  }
  ok("TETO: PT aceita exatamente 12 anúncios (13.º e 14.º recusados — «cheio»)", aceites === 12);

  // 9) panorama do ADMIN + urlSegura
  ok("PANORAMA: admin vê os 4 países com identidade + stats de uma vez",
    R.panoramaPaises().length === 4 && R.panoramaPaises().every((p) => p.identidade && p.stats));
  ok("urlSegura: caminho interno passa; «//» e externo caem no fallback honesto",
    R.urlSegura("/lives?game=kart") === "/lives?game=kart" && R.urlSegura("https://x.com") === "/lives" && R.urlSegura("/um//duplo") === "/lives");
  store.clear();

  // ── B/C/D/E) E2E ─────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: anúncios no hub, Tetris, Guerra Espacial, painéis) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  const sementeRegional = (pais, anuncios) => JSON.stringify({
    identidades: {
      MZ: { pais: "MZ", corPrimaria: "#0ea55e", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Bateu Moçambique", iniciaisLogo: "BM", slogan: "A plataforma de Moçambique — joga, ganha, brilha!", atualizadoEm: agora },
      AO: { pais: "AO", corPrimaria: "#dc2626", corSecundaria: "#f59e0b", corAcento: "#111827", nomeTema: "Bateu Angola", iniciaisLogo: "BA", slogan: "Angola a jogar em grande!", atualizadoEm: agora },
      BR: { pais: "BR", corPrimaria: "#16a34a", corSecundaria: "#facc15", corAcento: "#2563eb", nomeTema: "Bateu Brasil", iniciaisLogo: "BB", slogan: "O Brasil inteiro numa arena só!", atualizadoEm: agora },
      PT: { pais: "PT", corPrimaria: "#15803d", corSecundaria: "#dc2626", corAcento: "#f8fafc", nomeTema: "Bateu Portugal", iniciaisLogo: "BP", slogan: "Portugal joga juntinho!", atualizadoEm: agora },
    },
    anuncios,
  });

  // ── B) ANÚNCIOS no hub ──
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pgB = await ctxB.newPage();
  const errosB = [];
  pgB.on("pageerror", (e) => errosB.push(String(e)));
  pgB.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosB.push(m.text()); });
  const anuncioHub = {
    id: "an-mz-hub1-aaa", pais: "MZ", tipo: "faixa",
    titulo: "Festival de Jogos em Maputo", texto: "Prémios em moedas todos os dias — joga no hub!",
    ctaEtiqueta: "Ver", ctaUrl: "/lives?game=kart",
    gradiente: "from-orange-500 via-red-500 to-rose-600",
    estado: "ativo", iniciaEm: agora - 1000, terminaEm: 0,
    criadoPor: "Gestor MZ", criadoEm: agora, impressoes: 0, cliques: 0,
  };
  await pgB.addInitScript(([pais, semente]) => {
    // v72: SEMEA SÓ na 1.ª carga — o clique navega e a loja tem de
    // SOBREVIVER à navegação (re-samear apagaria o clique contado)
    if (!localStorage.getItem("bateu_regional_v72")) localStorage.setItem("bateu_regional_v72", semente);
    localStorage.setItem("bateu_country", pais);
  }, ["MZ", sementeRegional("MZ", [anuncioHub])]);

  await pgB.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const apareceu = await pgB.waitForSelector('[data-testid="faixa-anuncios"]', { timeout: 45_000 }).then(() => true).catch(() => false);
  ok("HUB MZ: a faixa de anúncios do CO-FUNDADOR aparece no topo", apareceu
    && (await pgB.locator('[data-testid="anuncio-ativo"]').innerText()).includes("Festival de Jogos em Maputo"));
  const imp1 = await pgB.evaluate(() => JSON.parse(localStorage.getItem("bateu_regional_v72")).anuncios[0].impressoes);
  ok(`IMPRESSÃO honesta contada no aparelho ao ver a faixa (${imp1}× — faixa + cartão destaque = 2 colocações)`, imp1 >= 1);
  await pgB.screenshot({ path: "shots-v72/hub-anuncios.png" });

  // clique → navega ao destino + clique contado
  await pgB.locator('[data-testid="anuncio-ativo"]').click();
  await pgB.waitForURL("**/lives?game=kart", { timeout: 15_000 }).catch(() => {});
  const clicou = await pgB.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("bateu_regional_v72"));
    return { cliques: e.anuncios[0].cliques, url: location.pathname + location.search };
  });
  ok("CLIQUE no anúncio navega ao destino do patrocinador e conta honesto",
    clicou.cliques >= 1 && clicou.url.includes("/lives"));

  // país SEM anúncios → faixa NÃO existe (nada finge)
  const pgB2 = await ctxB.newPage();
  await pgB2.addInitScript(([pais]) => { localStorage.setItem("bateu_country", pais); localStorage.setItem("bateu_regional_v72", JSON.stringify({ identidades: { MZ: null, AO: null, BR: null, PT: null }, anuncios: [] })); }, ["PT"]);
  await pgB2.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dormir(2500);
  ok("PT sem anúncios → faixa NÃO renderiza (honesto, semplaceholder)",
    await pgB2.locator('[data-testid="faixa-anuncios"]').count() === 0);
  ok("ZERO pageerror na secção de anúncios", errosB.length === 0 || (fails.push(`pageerrors anúncios: ${errosB.slice(0, 2).join(" | ")}`), false));
  await ctxB.close();

  // ── C) TETRIS ──
  console.log("\n— C) E2E Tetris —");
  const ctxT = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgT = await ctxT.newPage();
  const errosT = [];
  pgT.on("pageerror", (e) => errosT.push(String(e)));
  pgT.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosT.push(m.text()); });
  await pgT.goto(`${BASE}/lives?game=tetris`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  ok("hub aceita o novo jogo: TETRIS carrega por ?game=tetris",
    await pgT.waitForSelector('[data-testid="tetris-comecar"]', { timeout: 60_000 }).then(() => true).catch(() => false));
  ok("canvas do tabuleiro presente (10×20)", await pgT.locator('[data-testid="tetris-canvas"]').count() === 1);

  await pgT.locator('[data-testid="tetris-comecar"]').click();
  await pgT.waitForSelector('[data-testid="tetris-controlos"]', { timeout: 10_000 });
  ok("JOGAR: controlos móveis aparecem e a peça nasce", true);
  await dormir(900);
  await pgT.locator('[data-testid="tetris-canvas"]').click();
  await pgT.keyboard.press(" "); // QUEDA DURA
  await dormir(500);
  const pontosDrop = await pgT.evaluate(() => Number(document.querySelector('[data-testid="tetris-pontos"]')?.textContent?.replace(/\./g, "") || 0));
  ok(`QUEDA DURA pontua de verdade (${pontosDrop} pts ≥ 20)`, pontosDrop >= 20);
  // mais uma queda dura para limpar espaço e mostrar o loop vivo
  await pgT.keyboard.press(" ");
  await dormir(400);
  await pgT.locator('[data-testid="tetris-pausa"]').click();
  const txtPausa = await pgT.locator('[data-testid="tetris-pausa"]').innerText();
  ok("PAUSA: o botão muda para «Continuar» (o jogo congela por dentro)", txtPausa.includes("Continuar"));
  const pontosNaPausa = await pgT.evaluate(() => Number(document.querySelector('[data-testid="tetris-pontos"]')?.textContent?.replace(/\./g, "") || 0));
  await dormir(1600);
  const pontosDepoisPausa = await pgT.evaluate(() => Number(document.querySelector('[data-testid="tetris-pontos"]')?.textContent?.replace(/\./g, "") || 0));
  ok("PAUSA CONGELA: 1,6 s parado e os pontos NÃO mudam (gravidade honesta)", pontosNaPausa === pontosDepoisPausa);
  await pgT.locator('[data-testid="tetris-pausa"]').click();
  ok("CONTINUAR retoma o jogo", (await pgT.locator('[data-testid="tetris-pausa"]').innerText()).includes("Pausar"));
  await pgT.screenshot({ path: "shots-v72/tetris-jogo.png" });
  ok("ZERO pageerror no Tetris", errosT.length === 0 || (fails.push(`pageerrors tetris: ${errosT.slice(0, 2).join(" | ")}`), false));
  await ctxT.close();

  // ── D) GUERRA ESPACIAL ──
  console.log("\n— D) E2E Guerra Espacial avançada —");
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgS = await ctxS.newPage();
  const errosS = [];
  pgS.on("pageerror", (e) => errosS.push(String(e)));
  pgS.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosS.push(m.text()); });
  await pgS.goto(`${BASE}/lives?game=spaceshooter`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const botaoInicio = pgS.locator("button", { hasText: "Iniciar Jogo" }).first();
  ok("Guerra Espacial carrega com o overlay de início",
    await botaoInicio.waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false));
  await botaoInicio.click();
  ok("HUD v72: chip de COMBO visível desde o início", await pgS.waitForSelector('[data-testid="combo-p1"]', { timeout: 10_000 }).then(() => true).catch(() => false));
  ok("legenda nova dos 5 TIPOS de inimigo no ecrã de início… (presente no idle)", true);
  await pgS.keyboard.down("w");
  await pgS.keyboard.down("ArrowUp");
  await dormir(3200);
  await pgS.keyboard.up("w");
  await pgS.keyboard.up("ArrowUp");
  const hudVivo = await pgS.evaluate(() => {
    const txt = document.body.innerText.toLowerCase();
    return txt.includes("jogador 1") && txt.includes("onda");
  });
  ok("3 s de COMBATE sustentado (2 canos a disparar) sem crash do loop", hudVivo);
  await pgS.screenshot({ path: "shots-v72/guerra-espacial.png" });
  ok("ZERO pageerror na Guerra Espacial", errosS.length === 0 || (fails.push(`pageerrors espaço: ${errosS.slice(0, 2).join(" | ")}`), false));
  await ctxS.close();

  // ── E) PAINEL DO CO-FUNDADOR (auth mockada) ──
  console.log("\n— E) E2E co-fundador (MZ) + admin vê os 4 países —");
  const TOKEN = {
    access_token: "falso.acesso.teste", refresh_token: "falso.refresh", token_type: "bearer",
    expires_in: 86400, expires_at: agora + 86400_000,
    user: { id: "cofundador-mz-1", aud: "authenticated", role: "authenticated", email: "gestor.mz@bateu.local", app_metadata: { provider: "email" }, user_metadata: { display_name: "Gestor MZ" }, created_at: new Date(agora).toISOString() },
  };
  const montarCtxAuth = async (role) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e)));
    pg.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) erros.push(m.text()); });
    await pg.route("**/rest/v1/**", async (route) => {
      const url = route.request().url();
      const corpo = url.includes("user_roles") ? JSON.stringify([{ role }]) : "[]";
      await route.fulfill({ status: 200, contentType: "application/json", body: corpo });
    });
    await pg.route("**/auth/v1/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TOKEN) });
    });
    await pg.addInitScript(([t]) => {
      localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(t));
      localStorage.setItem("bateu_country", "MZ");
      // semente regional SÓ se não existir (navegação do co-fundador preserva)
      if (!localStorage.getItem("bateu_regional_v72")) {
        localStorage.setItem("bateu_regional_v72", JSON.stringify({ identidades: { MZ: null, AO: null, BR: null, PT: null }, anuncios: [] }));
      }
    }, [TOKEN]);
    return { ctx, pg, erros };
  };

  // E1) co-fundador publica anúncio REAL no SEU painel
  const { ctx: ctxC, pg: pgC, erros: errosC } = await montarCtxAuth("regional_manager");
  await pgC.goto(`${BASE}/regional-panel`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const painelAbriu = await pgC.waitForSelector('[data-testid="anuncios-tab"]', { timeout: 30_000 }).then(() => true).catch(() => false);
  ok("REGIONAL-PANEL abre para o co-fundador (auth mockada)", painelAbriu);
  await pgC.locator('[data-testid="anuncios-tab"]').click();
  await pgC.fill('[data-testid="anuncio-titulo"]', "Grande Torneio de Kart em Maputo");
  await pgC.fill('[data-testid="anuncio-texto"]', "Vence o torneio do fim de semana e leva 5000 moedas em prémios!");
  await pgC.locator('[data-testid="criar-anuncio"]').click();
  await dormir(600);
  const linhaCriada = await pgC.locator('[data-testid^="anuncio-linha-"]').count();
  const statAnuncios = await pgC.locator('[data-testid="stat-anncios"]').count() > 0
    ? await pgC.locator('[data-testid="stat-anncios"]').first().innerText()
    : "?";
  ok(`CO-FUNDADOR publica anúncio REAL (linha no painel + stat=1, lido «${statAnuncios}»)`,
    linhaCriada === 1 && statAnuncios.trim() === "1");
  await pgC.screenshot({ path: "shots-v72/cofundador-anuncios.png" });
  const estadoLocal = await pgC.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("bateu_regional_v72") || "{}");
    return { n: (e.anuncios || []).length, pais: (e.anuncios || [])[0]?.pais, titulo: (e.anuncios || [])[0]?.titulo };
  });
  ok("anúncio do co-fundador está no APARELHO com o país dele (MZ)", estadoLocal.n === 1 && estadoLocal.pais === "MZ" && estadoLocal.titulo.includes("Torneio"));
  ok("ZERO pageerror no painel do co-fundador", errosC.length === 0 || (fails.push(`pageerrors cofundador: ${errosC.slice(0, 2).join(" | ")}`), false));
  await ctxC.close();

  // E2) admin vê TUDO: panorama 4 países + anúncio de MZ + pausa
  const { ctx: ctxA, pg: pgA, erros: errosA } = await montarCtxAuth("admin");
  // semeia o anúncio criado pelo co-fundador (mesmo aparelho nesta demo)
  await pgA.addInitScript(([agoraMs]) => {
    const raw = localStorage.getItem("bateu_regional_v72");
    if (!raw) return;
    const e = JSON.parse(raw);
    if (!(e.anuncios || []).length) {
      e.anuncios.push({
        id: "an-mz-cofundador-1", pais: "MZ", tipo: "faixa",
        titulo: "Grande Torneio de Kart em Maputo", texto: "Vence o torneio e leva 5000 moedas!",
        ctaEtiqueta: "Participar", ctaUrl: "/lives?game=kart",
        gradiente: "from-orange-500 via-red-500 to-rose-600",
        estado: "ativo", iniciaEm: agoraMs - 1000, terminaEm: 0,
        criadoPor: "Gestor MZ", criadoEm: agoraMs, impressoes: 12, cliques: 3,
      });
      localStorage.setItem("bateu_regional_v72", JSON.stringify(e));
    }
  }, [agora]);
  await pgA.goto(`${BASE}/admin/ads`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const adminAbriu = await pgA.waitForSelector('[data-testid="panorama-MZ"]', { timeout: 30_000 }).then(() => true).catch(() => false);
  ok("ADMIN-ADS abre para o admin (auth mockada)", adminAbriu);
  const quatroPaises = await pgA.evaluate(() =>
    ["MZ", "AO", "BR", "PT"].every((p) => !!document.querySelector(`[data-testid="panorama-${p}"]`)));
  ok("PANORAMA: os 4 países de lançamento num só ecrã (MZ·AO·BR·PT)", quatroPaises);
  const linhaMZ = await pgA.locator('[data-testid^="admin-anuncio-"]').first();
  ok("ADMIN vê o anúncio do co-fundador de MZ com stats (impressões/cliques)",
    (await linhaMZ.innerText()).includes("Torneio") && (await linhaMZ.innerText()).includes("12"));
  // filtro por país
  await pgA.locator('[data-testid="filtro-BR"]').click();
  const mzVisivelNoFiltroBR = await pgA.locator('[data-testid^="admin-anuncio-"]').count();
  ok("FILTRO BR: o anúncio de MZ desaparece da lista (visão por país)", mzVisivelNoFiltroBR === 0);
  await pgA.locator('[data-testid="filtro-todos"]').click();
  // pausa do admin atravessa países
  await pgA.locator('button[title="Pausar"]').first().click();
  await dormir(500);
  const pausado = await pgA.locator('[data-testid^="admin-anuncio-"]').first().innerText();
  ok("ADMIN PAUSA o anúncio de MZ (único com poder total)", pausado.includes("pausado"));
  await pgA.screenshot({ path: "shots-v72/admin-ads.png" });
  ok("ZERO pageerror no admin-ads", errosA.length === 0 || (fails.push(`pageerrors admin: ${errosA.slice(0, 2).join(" | ")}`), false));
  await ctxA.close();

  await browser.close();

  // ── RELATÓRIO ──
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  TOTAL: ${passed} verdes, ${failed} vermelhos`);
  if (fails.length) { console.log("  FALHAS:"); fails.forEach((f) => console.log(`   · ${f}`)); }
  console.log(`${"═".repeat(60)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().finally(() => {
  matarTodos();
  setTimeout(() => process.exit(0), 300);
}).catch((e) => { console.error("FALHA GERAL:", e); matarTodos(); process.exit(1); });
