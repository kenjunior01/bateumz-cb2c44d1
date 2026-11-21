// ============================================================
// v73 — SERVIDOR REGIONAL + PONTE + TETRIS DUELO 2P + IA ESQUIVA
// ────────────────────────────────────────────────────────────
// A) NÚCLEO PURO (Node): regionalCore.ts — o MESMO núcleo que o
//    servidor e o aparelho executam: identidade, anúncios, teto
//    12/país, agendamento, permissões, stats/CTR, panorama.
// B) IA ESQUIVA (Node): src/game/space/ia.ts — decidirEsquiva é
//    PURO e DETERMINÍSTICO (bala abaixo → foge; tank nunca; merger).
// C) SERVIDOR REAL (Node spawn, HTTP): /saude · /publico/:pais ·
//    impressão/clique públicos · permissões 401/403/422 · teto 12
//    · PERSISTÊNCIA (matar e relançar) · modo SÓ-LEITURA honesto.
// D) E2E (vite + browser + servidor REAL): a ponte dos painéis —
//    co-fundador MZ publica NO SERVIDOR (badge LIGADO, linha + stats
//    no aparelho), admin pausa ATRAVESSANDO países (verificado no
//    servidor), modo APARELHO honesto sem servidor.
// E) E2E TETRIS DUELO 2P: dois tabuleiros, queda dura dos DOIS,
//    LIXO manda K.O. (gancho ?duelo-teste=1), pausa honesta.
// F) E2E GUERRA ESPACIAL: combate 3 s + legenda ESQUIVAM + zero erro.
// Uso: PW_CHROME=… node test-regional-v73.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_SRV = 8790;
const SRV = `http://localhost:${PORTA_SRV}`;
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
function matarTodos() {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
}
function limparZumbis() {
  try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {}
  try { spawnSync("pkill", ["-f", "regional-servidor.mjs"], { stdio: "ignore" }); } catch {}
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
  console.log(`\n🧱 REGIONAL v73 — servidor + ponte + duelo + esquiva — ${BASE}\n`);

  // ── A) NÚCLEO PURO ───────────────────────────────────────────
  console.log("— A) Núcleo puro (regionalCore.ts — ZERO localStorage) —");
  const C = await import(`${RAIZ}/src/lib/regionalCore.ts`);
  const agora = Date.now();

  const estado0 = C.estadoPadrao();
  ok("NÚCLEO: estado de nascer com as 4 identidades de lançamento e 0 anúncios",
    C.PAISES_COFUNDADOR.join(",") === "MZ,AO,BR,PT"
    && ["MZ", "AO", "BR", "PT"].every((p) => /^#[0-9a-f]{6}$/i.test(estado0.identidades[p].corPrimaria)
      && estado0.identidades[p].nomeTema.startsWith("Bateu")) && estado0.anuncios.length === 0);

  const id1 = C.validarIdentidade("MZ", {
    corPrimaria: "#16A34A", corSecundaria: "#EAB308", corAcento: "#EF4444",
    nomeTema: "Bateu Moçambique Turbo", iniciaisLogo: "bm", slogan: "Moçambique joga em casa!",
  });
  ok("NÚCLEO: validarIdentidade VÁLIDO (iniciais clamped para BM)",
    id1.motivo === "ok" && id1.d.iniciaisLogo === "BM");
  C.aplicarIdentidade(estado0, id1.d);
  ok("NÚCLEO: aplicarIdentidade grava no estado (nome tema lá está)",
    estado0.identidades.MZ.nomeTema === "Bateu Moçambique Turbo");
  ok("NÚCLEO: recusas honestas — cor má / nome curto / país fora",
    C.validarIdentidade("MZ", { corPrimaria: "#zzz", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Nome Bom", iniciaisLogo: "BM", slogan: "slogan ok" }).motivo === "cor"
    && C.validarIdentidade("MZ", { corPrimaria: "#111111", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "AB", iniciaisLogo: "BM", slogan: "slogan ok" }).motivo === "nome"
    && C.validarIdentidade("IN", { corPrimaria: "#111111", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Nome Bom", iniciaisLogo: "AB", slogan: "slogan ok" }).motivo === "pais");

  const an1 = C.validarAnuncio({
    pais: "MZ", tipo: "faixa", titulo: "Festival de Jogos em Maputo",
    texto: "Prémios em moedas todos os dias — joga no hub!", ctaEtiqueta: "Ver",
    ctaUrl: "/lives?game=kart", criadoPor: "Gestor MZ",
  }, estado0);
  ok("NÚCLEO: validarAnuncio VÁLIDO (id an-mz-, estado ativo, criador)",
    an1.motivo === "ok" && an1.d.id.startsWith("an-mz-") && an1.d.estado === "ativo" && an1.d.criadoPor === "Gestor MZ");
  C.aplicarAnuncio(estado0, an1.d);
  ok("NÚCLEO: recusa URL externa, javascript: e janela inválida",
    C.validarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "https://mal.com", criadoPor: "x" }, estado0).motivo === "url"
    && C.validarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "javascript:alert(1)", criadoPor: "x" }, estado0).motivo === "url"
    && C.validarAnuncio({ pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", iniciaEm: agora, terminaEm: agora - 1, criadoPor: "x" }, estado0).motivo === "janela");

  // permissões no núcleo (o que o SERVIDOR executa)
  const anBR = C.validarAnuncio({ pais: "BR", tipo: "faixa", titulo: "Festival no Brasil", texto: "só para BR", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "Gestor BR" }, estado0);
  C.aplicarAnuncio(estado0, anBR.d);
  ok("PERMISSÕES do núcleo: gestor MZ não mexe em BR; admin «TODOS» atravessa",
    C.agirAnuncioEm(estado0, anBR.d.id, "pausar", "MZ") === false
    && C.agirAnuncioEm(estado0, anBR.d.id, "pausar", "TODOS") === true
    && C.agirAnuncioEm(estado0, anBR.d.id, "reativar", "BR") === true);
  C.registrarImpressaoEm(estado0, an1.d.id);
  C.registrarImpressaoEm(estado0, an1.d.id);
  C.registrarCliqueEm(estado0, an1.d.id);
  const statsMZ = C.estatisticasPaisDe(estado0, "MZ");
  ok("ESTATÍSTICAS do núcleo: 2 impressões + 1 clique → CTR 50% (MZ), BR intacto",
    statsMZ.impressoes === 2 && statsMZ.cliques === 1 && Math.abs(statsMZ.ctr - 0.5) < 1e-9
    && C.estatisticasPaisDe(estado0, "BR").impressoes === 0);
  ok("PANORAMA do núcleo: 4 países com identidade + stats de uma vez",
    C.panoramaDe(estado0).length === 4 && C.panoramaDe(estado0).every((p) => p.identidade && p.stats));
  ok("urlSegura no núcleo: interno passa; externo e «//» caem no fallback",
    C.urlSegura("/lives?game=kart") === "/lives?game=kart" && C.urlSegura("https://x.com") === "/lives" && C.urlSegura("/um//duplo") === "/lives");

  // hidratar estado podre (do ficheiro do servidor)
  ok("hidratarEstado: JSON podre → estado de nascer (nunca crasha)",
    C.hidratarEstado(null).anuncios.length === 0
    && C.hidratarEstado({ identidades: { MZ: estado0.identidades.MZ }, anuncios: [] }).identidades.BR.corPrimaria === estado0.identidades.BR.corPrimaria);

  // teto de 12 no núcleo
  let aceites = 0;
  for (let i = 0; i < 14; i++) {
    const r = C.validarAnuncio({ pais: "PT", tipo: "destaque", titulo: `Campanha Lisbon nº ${i}`, texto: "destaque de teste honesto", ctaEtiqueta: "Ver", ctaUrl: "/jogos", criadoPor: "Gestor PT" }, estado0);
    if (r.d) { aceites++; C.aplicarAnuncio(estado0, r.d); }
  }
  ok("TETO no núcleo: PT aceita exatamente 12 (13.º e 14.º «cheio»)", aceites === 12);

  // ── B) IA ESQUIVA (pura, determinística) ─────────────────────
  console.log("\n— B) IA da esquiva (src/game/space/ia.ts — 100% determinística) —");
  const IA = await import(`${RAIZ}/src/game/space/ia.ts`);
  const baseE = { x: 300, y: 200, size: 13, kind: "fighter", dodgeCd: 0 };
  ok("ESQUIVA: bala a subir pela ESQUERDA → merger para a DIREITA",
    IA.decidirEsquiva(baseE, [{ x: 285, y: 120 }], 600) === 1);
  ok("ESQUIVA: bala a subir pela DIREITA → merger para a ESQUERDA",
    IA.decidirEsquiva(baseE, [{ x: 320, y: 100 }], 600) === -1);
  ok("ESQUIVA: bala CENTRADA → foge para o lado com MAIS espaço",
    IA.decidirEsquiva({ ...baseE, x: 100 }, [{ x: 100, y: 150 }], 600) === 1
    && IA.decidirEsquiva({ ...baseE, x: 500 }, [{ x: 500, y: 150 }], 600) === -1);
  ok("ESQUIVA: tank (skill 0) e normal NUNCA desviam — é um tanque",
    IA.decidirEsquiva({ ...baseE, kind: "tank" }, [{ x: 285, y: 120 }], 600) === 0
    && IA.decidirEsquiva({ ...baseE, kind: "normal" }, [{ x: 285, y: 120 }], 600) === 0);
  ok("ESQUIVA: merger em curso (dodgeCd>0) → mantém a direção, não decide de novo",
    IA.decidirEsquiva({ ...baseE, dodgeCd: 5 }, [{ x: 285, y: 120 }], 600) === 0);
  ok("ESQUIVA: bala ACIMA (dy<=0) ou LONGE (>150) ou lateral (>janela) → sem ameaça",
    IA.decidirEsquiva(baseE, [{ x: 300, y: 260 }], 600) === 0
    && IA.decidirEsquiva(baseE, [{ x: 300, y: 30 }], 600) === 0
    && IA.decidirEsquiva(baseE, [{ x: 400, y: 120 }], 600) === 0);
  ok("ESQUIVA: destrezas por tipo (scout > fighter > kamikaze > splitter > tank/normal)",
    IA.ESQUIVA_SKILL.scout > IA.ESQUIVA_SKILL.fighter
    && IA.ESQUIVA_SKILL.fighter > IA.ESQUIVA_SKILL.kamikaze
    && IA.ESQUIVA_SKILL.kamikaze > IA.ESQUIVA_SKILL.splitter
    && IA.ESQUIVA_SKILL.tank === 0 && IA.ESQUIVA_SKILL.normal === 0);
  const dec1 = IA.decidirEsquiva(baseE, [{ x: 285, y: 120 }], 600);
  const dec2 = IA.decidirEsquiva(baseE, [{ x: 285, y: 120 }], 600);
  ok("ESQUIVA: DETERMINÍSTICA — mesma entrada → MESMA decisão (2×)",
    dec1 === dec2 && dec1 === 1);

  // ── C) SERVIDOR REAL ─────────────────────────────────────────
  console.log("\n— C) Servidor regional REAL (HTTP, persistência, permissões) —");
  const FICHEIRO = `/tmp/regional-v73-teste-${process.pid}.json`;
  const envServ = {
    PORT: String(PORTA_SRV),
    REGIAO_ADMIN_TOKEN: "adm73",
    REGIAO_GESTOR_MZ: "mz73",
    REGIAO_GESTOR_BR: "br73",
    REGIAO_ESTADO: FICHEIRO,
  };
  correr("node", ["server/regional-servidor.mjs"], envServ);
  ok("SERVIDOR: /saude responde com 4 países e escrita aberta",
    await esperarAte(`${SRV}/saude`, async (r) => {
      const j = await r.json().catch(() => null);
      return j?.ok === true && j.paises === 4 && j.escritaAberta === true;
    }, 15000));

  const post = async (caminho, corpo, token) => fetch(`${SRV}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(corpo),
  });
  const get = async (caminho, token) => fetch(`${SRV}${caminho}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const rSemToken = await get("/estado");
  ok("SERVIDOR: /estado SEM token → 401 com motivo claro (nada finge)", rSemToken.status === 401);

  const estMZ = await (await get("/estado", "mz73")).json();
  ok("SERVIDOR: gestor MZ vê SÓ o seu país (papel gestor + identidade MZ)",
    estMZ.papel === "gestor" && estMZ.pais === "MZ" && estMZ.identidade?.nomeTema === "Bateu Moçambique");

  const criaMZ = await post("/anuncio", {
    pais: "MZ", tipo: "faixa", titulo: "Grande Torneio de Kart em Maputo",
    texto: "Vence o torneio do fim de semana e leva 5000 moedas em prémios!",
    ctaEtiqueta: "Participar", ctaUrl: "/lives?game=kart", criadoPor: "Gestor MZ",
  }, "mz73").then((r) => r.json());
  ok("SERVIDOR: co-fundador MZ publica anúncio REAL no SEU país",
    criaMZ.ok === true && criaMZ.anuncio.pais === "MZ" && criaMZ.anuncio.estado === "ativo");
  const idAnMZ = criaMZ.anuncio.id;

  const cruzaPais = await post("/anuncio", { pais: "BR", tipo: "faixa", titulo: "Título Bom Aqui", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "x" }, "mz73");
  const cruzaIdent = await post("/identidade", { pais: "BR", corPrimaria: "#111111", corSecundaria: "#223344", corAcento: "#445566", nomeTema: "Nome Bom", iniciaisLogo: "AB", slogan: "slogan ok" }, "mz73");
  ok("SERVIDOR: co-fundador MZ NÃO pode criar anúncio nem identidade em BR (403)",
    cruzaPais.status === 403 && cruzaIdent.status === 403);

  const acaoBr = await post("/acao", { id: idAnMZ, acao: "pausar" }, "br73");
  ok("SERVIDOR: gestor BR NÃO pode pausar anúncio de MZ (403)", acaoBr.status === 403);

  const panGestor = await get("/panorama", "mz73");
  const panAdmin = await get("/panorama", "adm73").then((r) => r.json());
  ok("SERVIDOR: panorama EXCLUSIVO do admin (gestor 403; admin vê os 4 países)",
    panGestor.status === 403 && panAdmin.panorama.length === 4);

  const imp = await post("/impressao", { id: idAnMZ }).then((r) => r.json());
  const cli = await post("/clique", { id: idAnMZ }).then((r) => r.json());
  ok("SERVIDOR: impressão/clique PÚBLICOS contam honesto (1/1)",
    imp.ok === true && imp.impressoes === 1 && cli.ok === true && cli.cliques === 1);

  const pub = await get("/publico/MZ").then((r) => r.json());
  ok("SERVIDOR: /publico/MZ lista os ativos do país (faixa do torneio)",
    pub.pais === "MZ" && pub.ativos.length === 1 && pub.ativos[0].titulo.includes("Torneio"));

  const invalido = await post("/anuncio", { pais: "MZ", tipo: "faixa", titulo: "Oi", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "x" }, "mz73");
  const invalidoCorpo = await invalido.json();
  ok("SERVIDOR: validação do NÚCLEO no servidor (título curto → 422 «titulo»)",
    invalido.status === 422 && invalidoCorpo.motivo === "titulo");

  // teto de 12 no servidor (BR)
  for (let i = 0; i < 12; i++) {
    await post("/anuncio", { pais: "BR", tipo: "destaque", titulo: `Campanha BR nº ${i}`, texto: "destaque de teste honesto", ctaEtiqueta: "Ver", ctaUrl: "/jogos", criadoPor: "Gestor BR" }, "br73");
  }
  const cheio = await post("/anuncio", { pais: "BR", tipo: "destaque", titulo: "Campanha 13", texto: "destaque de teste honesto", ctaEtiqueta: "Ver", ctaUrl: "/jogos", criadoPor: "Gestor BR" }, "br73").then((r) => r.json());
  ok("SERVIDOR: teto de 12 anúncios/país executado NO SERVIDOR (13.º → «cheio»)",
    cheio.ok !== true && cheio.motivo === "cheio");

  // PERSISTÊNCIA: matar e relançar com o MESMO ficheiro
  try { spawnSync("pkill", ["-f", "regional-servidor.mjs"], { stdio: "ignore" }); } catch {}
  await dormir(700);
  correr("node", ["server/regional-servidor.mjs"], envServ);
  await esperarAte(`${SRV}/saude`, () => true, 15000);
  const estAdmin2 = await (await get("/estado", "adm73")).json();
  const anMZ2 = estAdmin2.estado.anuncios.find((a) => a.id === idAnMZ);
  ok("PERSISTÊNCIA: servidor morre e renasce — anúncio MZ com as stats lá estão",
    anMZ2 && anMZ2.impressoes === 1 && anMZ2.cliques === 1);

  // admin atravessa países: pausa o anúncio de MZ
  const acaoAdmin = await post("/acao", { id: idAnMZ, acao: "pausar" }, "adm73");
  const pubDepois = await get("/publico/MZ").then((r) => r.json());
  ok("SERVIDOR: ADMIN pausa anúncio de MZ (atravessa países) → público deixa de ver",
    acaoAdmin.status === 200 && pubDepois.ativos.length === 0);

  // modo SÓ-LEITURA honesto (sem tokens)
  try { spawnSync("pkill", ["-f", "regional-servidor.mjs"], { stdio: "ignore" }); } catch {}
  await dormir(700);
  const FICHEIRO2 = `/tmp/regional-v73-readonly-${process.pid}.json`;
  correr("node", ["server/regional-servidor.mjs"], { PORT: String(PORTA_SRV), REGIAO_ESTADO: FICHEIRO2 });
  await esperarAte(`${SRV}/saude`, () => true, 15000);
  const saude2 = await get("/saude").then((r) => r.json());
  const escritaSemToken = await post("/anuncio", { pais: "MZ", tipo: "faixa", titulo: "Título Bom", texto: "texto bom", ctaEtiqueta: "Ver", ctaUrl: "/lives", criadoPor: "x" });
  ok("SERVIDOR: sem tokens → modo SÓ-LEITURA declarado e escrita 401",
    saude2.escritaAberta === false && escritaSemToken.status === 401
    && (await escritaSemToken.json()).erro.includes("SÓ-LEITURA"));

  // ── D) E2E — a PONTE nos painéis (servidor real + vite) ──────
  console.log("\n— D) E2E (vite + browser + servidor REAL: ponte dos painéis) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  const TOKEN = {
    access_token: "falso.acesso.teste", refresh_token: "falso.refresh", token_type: "bearer",
    expires_in: 86400, expires_at: agora + 86400_000,
    user: { id: "cofundador-mz-1", aud: "authenticated", role: "authenticated", email: "gestor.mz@bateu.local", app_metadata: { provider: "email" }, user_metadata: { display_name: "Gestor MZ" }, created_at: new Date(agora).toISOString() },
  };
  const montarCtxAuth = async ({ role, url, token }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await ctx.newPage();
    const erros = [];
    pg.on("pageerror", (e) => erros.push(String(e)));
    pg.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) erros.push(m.text()); });
    await pg.route("**/rest/v1/**", async (route) => {
      const u = route.request().url();
      const corpo = u.includes("user_roles") ? JSON.stringify([{ role }]) : "[]";
      await route.fulfill({ status: 200, contentType: "application/json", body: corpo });
    });
    await pg.route("**/auth/v1/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TOKEN) });
    });
    await pg.addInitScript(([t, srvUrl, tok]) => {
      localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(t));
      localStorage.setItem("bateu_country", "MZ");
      if (srvUrl) localStorage.setItem("bateu_regional_url", srvUrl);
      if (tok) localStorage.setItem("bateu_regional_token", tok);
    }, [TOKEN, url || "", token || ""]);
    return { ctx, pg, erros };
  };

  // relançar o servidor COMPLETO (com tokens) para os E2E — ficheiro NOVO
  // (a secção C deixou o estado do teste de persistência; os E2E precisam
  // de uma página em BRANCO para as contagens serem exatas)
  try { spawnSync("pkill", ["-f", "regional-servidor.mjs"], { stdio: "ignore" }); } catch {}
  await dormir(700);
  const FICHEIRO_D = `/tmp/regional-v73-e2e-${process.pid}.json`;
  correr("node", ["server/regional-servidor.mjs"], { ...envServ, REGIAO_ESTADO: FICHEIRO_D });
  await esperarAte(`${SRV}/saude`, () => true, 15000);

  // D1) co-fundador com SERVIDOR: badge LIGADO + publicação vai ao servidor
  const { ctx: ctxC, pg: pgC, erros: errosC } = await montarCtxAuth({ role: "regional_manager", url: SRV, token: "mz73" });
  await pgC.goto(`${BASE}/regional-panel`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgC.waitForSelector('[data-testid="anuncios-tab"]', { timeout: 30_000 }).catch(() => {});
  await pgC.locator('[data-testid="anuncios-tab"]').click();
  const badgeLigado = await pgC.waitForSelector('[data-testid="gestor-fonte"]', { timeout: 20_000 })
    .then(() => pgC.locator('[data-testid="gestor-fonte"]').innerText()).catch(() => "");
  ok("PONTE co-fundador: badge mostra LIGADO (a ponte chegou ao servidor)",
    badgeLigado.toUpperCase().includes("LIGADO"));
  await pgC.fill('[data-testid="anuncio-titulo"]', "Festival Regional no Servidor");
  await pgC.fill('[data-testid="anuncio-texto"]', "Publicado pela ponte v73 — vale para TODA a região!");
  await pgC.locator('[data-testid="criar-anuncio"]').click();
  await dormir(900);
  const linhaNoPainel = await pgC.locator('[data-testid^="anuncio-linha-"]').count();
  ok("PONTE co-fundador: anúncio aparece no painel (linha criada)", linhaNoPainel === 1);
  const noServidor = await get("/estado", "mz73").then((r) => r.json());
  ok("PONTE co-fundador: o anúncio está NO SERVIDOR (a ação vale para a região)",
    (noServidor.anuncios || []).some((a) => a.titulo.includes("Festival Regional no Servidor")));
  const noAparelho = await pgC.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("bateu_regional_v72") || "{}");
    return (e.anuncios || []).some((a) => a.titulo.includes("Festival Regional no Servidor"));
  });
  ok("PONTE co-fundador: ESPELHADO no aparelho (o hub continua a ler daqui)", noAparelho === true);
  await pgC.screenshot({ path: "shots-v73/gestor-servidor.png" });
  ok("ZERO pageerror no painel do co-fundador com servidor", errosC.length === 0 || (fails.push(`pageerrors cofundador: ${errosC.slice(0, 2).join(" | ")}`), false));
  await ctxC.close();

  // D2) ADMIN com servidor: visão total + pausa ATRAVESSANDO países
  const { ctx: ctxA, pg: pgA, erros: errosA } = await montarCtxAuth({ role: "admin", url: SRV, token: "adm73" });
  await pgA.goto(`${BASE}/admin/ads`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgA.waitForSelector('[data-testid="panorama-MZ"]', { timeout: 30_000 }).catch(() => {});
  const badgeAdmin = await pgA.locator('[data-testid="admin-fonte"]').innerText().catch(() => "");
  ok("PONTE admin: badge SERVIDOR regional (a visão total vem do servidor)",
    badgeAdmin.toUpperCase().includes("SERVIDOR"));
  const quatro = await pgA.evaluate(() => ["MZ", "AO", "BR", "PT"].every((p) => !!document.querySelector(`[data-testid="panorama-${p}"]`)));
  ok("PONTE admin: PANORAMA dos 4 países num só ecrã", quatro);
  const anunciosVisiveis = await pgA.locator('[data-testid^="admin-anuncio-"]').count();
  ok("PONTE admin: vê o anúncio do co-fundador vindo do SERVIDOR (visão total)", anunciosVisiveis >= 1);
  await pgA.locator('button[title="Pausar"]').first().click();
  await dormir(900);
  const pausadoNoServidor = await get("/estado", "adm73").then((r) => r.json());
  const nPausados = pausadoNoServidor.estado.anuncios.filter((a) => a.estado === "pausado").length;
  ok("PONTE admin: pausa executada NO SERVIDOR (atravessa países)", nPausados >= 1);
  await pgA.screenshot({ path: "shots-v73/admin-servidor.png" });
  ok("ZERO pageerror no admin-ads com servidor", errosA.length === 0 || (fails.push(`pageerrors admin: ${errosA.slice(0, 2).join(" | ")}`), false));
  await ctxA.close();

  // D3) co-fundador SEM servidor: modo APARELHO honesto
  const { ctx: ctxL, pg: pgL, erros: errosL } = await montarCtxAuth({ role: "regional_manager", url: "", token: "" });
  await pgL.goto(`${BASE}/regional-panel`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgL.waitForSelector('[data-testid="anuncios-tab"]', { timeout: 30_000 }).catch(() => {});
  await pgL.locator('[data-testid="anuncios-tab"]').click();
  const badgeLocal = await pgL.waitForSelector('[data-testid="gestor-fonte"]', { timeout: 20_000 })
    .then(() => pgL.locator('[data-testid="gestor-fonte"]').innerText()).catch(() => "");
  ok("SEM servidor: badge APARELHO (honesto — nada finge sincronização)",
    badgeLocal.toUpperCase().includes("APARELHO"));
  await pgL.fill('[data-testid="anuncio-titulo"]', "Anúncio Local do Aparelho");
  await pgL.fill('[data-testid="anuncio-texto"]', "Sem servidor tudo funciona no aparelho como sempre!");
  await pgL.locator('[data-testid="criar-anuncio"]').click();
  await dormir(700);
  const localDevice = await pgL.evaluate(() => {
    const e = JSON.parse(localStorage.getItem("bateu_regional_v72") || "{}");
    return (e.anuncios || []).some((a) => a.titulo.includes("Anúncio Local do Aparelho"));
  });
  const servNaoMudou = await get("/estado", "mz73").then((r) => r.json());
  const nServ = servNaoMudou.anuncios.filter((a) => a.pais === "MZ").length;
  ok("SEM servidor: publicação funciona NO APARELHO e NÃO suja o servidor",
    localDevice === true && nServ === 1);
  ok("ZERO pageerror no modo aparelho", errosL.length === 0 || (fails.push(`pageerrors aparelho: ${errosL.slice(0, 2).join(" | ")}`), false));
  await ctxL.close();

  // ── E) TETRIS DUELO 2P ───────────────────────────────────────
  console.log("\n— E) E2E Tetris DUELO 2P (dois tabuleiros, lixo, K.O.) —");
  const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgD = await ctxD.newPage();
  const errosD = [];
  pgD.on("pageerror", (e) => errosD.push(String(e)));
  pgD.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosD.push(m.text()); });
  await pgD.goto(`${BASE}/lives?game=tetris&duelo-teste=1`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pgD.waitForSelector('[data-testid="tetris-comecar"]', { timeout: 60_000 }).catch(() => {});
  ok("DUELO: botão «Duelo 2P» no ecrã inicial do Tetris",
    await pgD.locator('[data-testid="tetris-duelo"]').isVisible().catch(() => false));
  await pgD.locator('[data-testid="tetris-duelo"]').click();
  await pgD.waitForSelector('[data-testid="duelo-root"]', { timeout: 15_000 }).catch(() => {});
  const doisTabuleiros = await pgD.locator('[data-testid="duelo-board-1"]').count()
    + await pgD.locator('[data-testid="duelo-board-2"]').count();
  ok("DUELO: DOIS tabuleiros no mesmo ecrã", doisTabuleiros === 2);
  await pgD.locator('[data-testid="duelo-comecar"]').click();
  await dormir(400);
  // foco fora dos botões (o espaço/enter não reativam nada)
  await pgD.locator('[data-testid="duelo-board-1"]').click({ position: { x: 30, y: 220 } });
  await pgD.keyboard.press(" ");   // P1 queda dura
  await pgD.keyboard.press("Enter"); // P2 queda dura
  await pgD.keyboard.press("a"); await pgD.keyboard.press("d"); await pgD.keyboard.press("w");
  await dormir(300);
  const jogoRodou = await pgD.evaluate(() => {
    const d = window.__duelo;
    if (!d) return { gancho: false };
    return {
      gancho: true,
      p1Ativo: !!d.js.current[0].atual || d.faseRef.current === "playing",
      fase: d.faseRef.current,
    };
  });
  ok("DUELO: teclas dos DOIS jogadores (WASD/Enter/espaço) sem crash e fase playing",
    jogoRodou.gancho === true && jogoRodou.fase === "playing");
  await pgD.screenshot({ path: "shots-v73/duelo-2p.png" });

  // o CORAÇÃO: lixo manda K.O. (P2 com topo cheio recebe lixo de P1)
  await pgD.evaluate(() => {
    const d = window.__duelo;
    // P2 com blocos no TOPO → lixo de 2 linhas mata
    d.js.current[1].tabuleiro[0][3] = "L";
    d.js.current[1].tabuleiro[1][5] = "L";
    d.mandarLixo(0, 2); // P1 manda 2 linhas de lixo → P2 enche até cima
  });
  const vencedorTxt = await pgD.waitForSelector('[data-testid="duelo-vencedor"]', { timeout: 8_000 })
    .then(() => pgD.locator('[data-testid="duelo-vencedor"]').innerText()).catch(() => "");
  ok("DUELO: LIXO mata — P2 enche até cima e «JOGADOR 1 VENCEU»",
    vencedorTxt.includes("JOGADOR 1 VENCEU"));
  // revanche: o estado volta ao jogo
  await pgD.locator('[data-testid="duelo-recomecar"]').click();
  await dormir(300);
  const revanche = await pgD.evaluate(() => {
    const d = window.__duelo;
    return d.faseRef.current === "playing" && d.js.current[0].vivo && d.js.current[1].vivo;
  });
  ok("DUELO: revanche volta ao playing com os DOIS vivos (estado limpo)", revanche === true);
  await pgD.locator('[data-testid="duelo-pausa"]').click();
  const pausaPausado = await pgD.evaluate(() => window.__duelo.faseRef.current);
  await dormir(1200);
  const pausaMantida = await pgD.evaluate(() => window.__duelo.faseRef.current);
  ok("DUELO: PAUSA congela os DOIS honestamente (1,2 s parado)", pausaPausado === "paused" && pausaMantida === "paused");
  ok("ZERO pageerror no duelo", errosD.length === 0 || (fails.push(`pageerrors duelo: ${errosD.slice(0, 2).join(" | ")}`), false));
  await ctxD.close();

  // ── F) GUERRA ESPACIAL (esquiva no ar) ───────────────────────
  console.log("\n— F) E2E Guerra Espacial (IA que ESQUIVA) —");
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pgS = await ctxS.newPage();
  const errosS = [];
  pgS.on("pageerror", (e) => errosS.push(String(e)));
  pgS.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) errosS.push(m.text()); });
  await pgS.goto(`${BASE}/lives?game=spaceshooter`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const botaoInicio = pgS.locator("button", { hasText: "Iniciar Jogo" }).first();
  ok("Guerra Espacial carrega com o overlay de início",
    await botaoInicio.waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false));
  ok("legenda v73: «ESQUIVAM!» visível (a IA nova está documentada na tela)",
    (await pgS.locator("body").innerText()).includes("ESQUIVAM"));
  await botaoInicio.click();
  ok("HUD combo visível desde o início", await pgS.waitForSelector('[data-testid="combo-p1"]', { timeout: 10_000 }).then(() => true).catch(() => false));
  await pgS.keyboard.down("w");
  await pgS.keyboard.down("ArrowUp");
  await dormir(3200);
  await pgS.keyboard.up("w");
  await pgS.keyboard.up("ArrowUp");
  const hudVivo = await pgS.evaluate(() => {
    const txt = document.body.innerText.toLowerCase();
    return txt.includes("jogador 1") && txt.includes("onda");
  });
  ok("3 s de COMBATE com a esquiva no loop sem crash", hudVivo);
  await pgS.screenshot({ path: "shots-v73/guerra-espacial.png" });
  ok("ZERO pageerror na Guerra Espacial v73", errosS.length === 0 || (fails.push(`pageerrors espaço: ${errosS.slice(0, 2).join(" | ")}`), false));
  await ctxS.close();

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
