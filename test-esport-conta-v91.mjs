// ═══════════════════════════════════════════════════════════════════════
// v91 — «E-SPORT SEGUE A CONTA» (torneios/ligas no servidor, padrão v84)
// A fatia anotada desde a v86/v87: o e-sport do aparelho passa a seguir a
// CONTA entre dispositivos. Suíte em duas partes:
//   A) NÚCLEO Node (esportConta.ts + esport.ts — bundle esbuild, padrão v84):
//      · hidratar dura: torneio/liga podre → null (nunca lança), jogo
//        inválido fora, prémio clampado 100..5000, rivais IA SEMPRE
//        etiquetados (eBot não negociável), histórico capado às últimas 24;
//      · MERGE: UNIÃO por id (aparelhos coexistem) · mesmo id vence o MAIS
//        AVANÇADO (claim → estado → histórico → atividade) e NUNCA mistura
//        participantes · caps 12/8 (mesmos do SQL);
//      · LINHA do servidor: user_id tem de bater CERTO (RLS provado);
//      · IMPRESSÃO anti-spam: ordem dos arrays NÃO paga envio; claim paga.
//   B) E2E (sessão fake no localStorage + rotas REST mockadas):
//      · CONVIDADO: ZERO pedidos a rest/v1/esport_conta (contador);
//      · LOGIN OK: absorção do torneio de convidado (passa à conta),
//        ficheiro de convidado limpo DEPOIS de absorvido, chip «Na conta»,
//        upsert com jogador_id = conta e o torneio dentro;
//      · SERVIDOR UNE: conta com outro torneio no servidor → os DOIS
//        coexistem no aparelho (união por id) e voltam no push;
//      · MIGRAÇÃO PENDENTE: PGRST205 declarado (nunca fingido);
//      · ERRO: motivo real no chip, aparelho como fonte;
//      · CLAIM → PUSH: reclamar o prémio num torneio terminado → 2.º upsert
//        com premioReclamado=true — o prémio NUNCA é pago duas vezes
//        (claim vence no merge e viaja).
// Pré-requisito: vite dev em :8099. Uso:
//   PW_CHROME=… node test-esport-conta-v91.mjs
// ═══════════════════════════════════════════════════════════════════════
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXE = process.env.PW_CHROME;
const BASE = process.env.BASE_URL || "http://localhost:8099";
const RAIZ = process.cwd();
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── .env (ref do projeto supabase — padrão da casa: strip de aspas) ─────
function lerEnv(chave) {
  try {
    const texto = readFileSync(`${RAIZ}/.env`, "utf-8");
    const linha = texto.split("\n").find((l) => l.startsWith(`${chave}=`));
    if (!linha) return "";
    return linha.slice(chave.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch { return ""; }
}
const SB_URL = lerEnv("VITE_SUPABASE_URL") || "https://ngxrdpplyghlugoowjqj.supabase.co";
const SB_REF = new URL(SB_URL).hostname.split(".")[0];
const UID = "91e2e000-0000-4000-8000-00000000e291";
const CHAVE_CONVIDADO = "bateu_esport_v1";
const CHAVE_CONTA = `bateu_esport_v1:u:${UID}`;

// erros de consola que são RUÍDO conhecido do ambiente (não furos da v91)
const RUIDO = [
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "permission", "AbortError", "play() failed", "user gesture", "JWT", "PGRST",
  "fetchPriority", "third-party cookie", "storage",
];
const erroReal = (msg) => !RUIDO.some((r) => msg.toLowerCase().includes(r.toLowerCase()));

let D; // núcleo esportConta
let E; // núcleo esport (criarTorneio — torneios com a FORMA REAL do núcleo)

// inputs válidos (validaTorneio/validaLiga do núcleo aceitam 1.ª à primeira)
const INPUT_A = { nome: "Copa Convidado v91", jogo: "kart", formato: "campeonato", tamanho: 12, premioPontos: 500, pista: "praia", voltas: 3, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const INPUT_B = { nome: "Copa Servidor v91", jogo: "chess", formato: "campeonato", tamanho: 8, premioPontos: 300, pista: "qualquer", voltas: 4, janelaDias: 5, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const INPUT_LIGA = { nome: "Liga Convidado v91", jogo: "tetris", premioPontos: 400, janelaDias: 10, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };

/** Torneio REAL do núcleo (mesma forma que a UI escreve) em estado dado. */
function torneioReal(input, agoraMs, estado = "inscricao") {
  const { t } = E.criarTorneio(input, agoraMs);
  if (!t) throw new Error(`criarTorneio recusou ${input.nome}`);
  if (estado === "terminado") {
    t.estado = "terminado";
    t.vencedorId = "eu";
    t.participantes = [{ id: "eu", nome: "Eu", pontos: 18, vitorias: 0, partidas: 1, eBot: false }];
    t.historico.push({ em: agoraMs + 1000, texto: "Janela fechada — campeão: Eu" });
  }
  return t;
}
function estadoCom(torneios = [], ligas = [], agoraMs = 0) {
  return { torneios, ligas, ts: agoraMs };
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🎮 E-SPORT SEGUE A CONTA v91 — ${BASE} (ref ${SB_REF})\n`);

  // ── A) NÚCLEO ─────────────────────────────────────────────────────
  console.log("— A) Núcleo puro (esportConta.ts + esport.ts) —");
  const AGORA = Date.now();
  {
    const bundle = `${RAIZ}/.v91-nucleo-bundle.mjs`;
    execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/esportConta.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundle}`], { stdio: "pipe" });
    D = await import(bundle);
    E = await import(`${RAIZ}/src/lib/esport.ts`);

    // A1 · chave do cache por conta
    ok("chaveCacheContaEsport deriva a chave por conta", D.chaveCacheContaEsport("abc") === "bateu_esport_v1:u:abc");
    ok("chaveCacheContaEsport SANITIZA (caracteres estranhos nunca entram)", !D.chaveCacheContaEsport("a/b?c#x".repeat(30)).includes("/") && D.chaveCacheContaEsport("a/b?c#x".repeat(30)).length <= 60 + 20);

    // A2 · hidratar dura
    const tReal = torneioReal(INPUT_A, AGORA);
    ok("hidratar: torneio REAL do núcleo passa intacto", !!D.hidratarTorneioEsport(JSON.parse(JSON.stringify(tReal))));
    ok("hidratar: torneio SEM nome → null", D.hidratarTorneioEsport({ ...tReal, nome: "" }) === null);
    ok("hidratar: jogo INEXISTENTE no catálogo → null", D.hidratarTorneioEsport({ ...tReal, jogo: "nao-existe" }) === null);
    ok("hidratar: formato podre → null", D.hidratarTorneioEsport({ ...tReal, formato: "copa" }) === null);
    ok("hidratar: organizador podre → null", D.hidratarTorneioEsport({ ...tReal, organizador: { nome: "", cor: 9 } }) === null);
    ok("hidratar: prémio fora do produto é clampado (9999 → 5000)", D.hidratarTorneioEsport({ ...tReal, premioPontos: 9999 }).premioPontos === 5000);
    ok("hidratar: prémio teto baixo é clampado (5 → 100)", D.hidratarTorneioEsport({ ...tReal, premioPontos: 5 }).premioPontos === 100);
    ok("hidratar: liga podre → null", D.hidratarLigaEsport({ ...torneioReal(INPUT_B, AGORA), temporada: null, organizador: null }) === null);
    ok("hidratar: estado podre → vazio (nunca lança)", (() => { const e = D.hidratarEstadoEsport({ torneios: "não", ligas: 42, ts: "x" }); return e.torneios.length === 0 && e.ligas.length === 0; })());

    // A3 · honestidade NÃO negociável: rivais IA sempre etiquetados
    const linhaPodre = D.hidratarTorneioEsport({ ...JSON.parse(JSON.stringify(tReal)), participantes: [
      { id: "eu", nome: "Eu", pontos: 0, vitorias: 0, partidas: 0, eBot: false },
      { id: "kudisso", nome: "Kudisso", pontos: 0, vitorias: 0, partidas: 0, eBot: false }, // podre: diz que não é bot
    ] });
    ok("hidratar: participante fora do «eu» volta a ficar etiquetado IA", linhaPodre.participantes.find((p) => p.id === "kudisso").eBot === true && linhaPodre.participantes.find((p) => p.id === "eu").eBot === false);

    // A4 · histórico capado às ÚLTIMAS 24
    const histCheio = Array.from({ length: 40 }, (_, i) => ({ em: AGORA + i, texto: `entrada ${i}` }));
    ok("hidratar: histórico capado às últimas 24 (as recentes ficam)", D.hidratarTorneioEsport({ ...JSON.parse(JSON.stringify(tReal)), historico: histCheio }).historico.length === 24 && D.hidratarTorneioEsport({ ...JSON.parse(JSON.stringify(tReal)), historico: histCheio }).historico[23].texto === "entrada 39");

    // A5 · MERGE: união por id
    const tB = torneioReal(INPUT_B, AGORA + 10);
    const uniao = D.mesclarEstadosEsport(estadoCom([tReal]), estadoCom([tB]));
    ok("merge: torneios de aparelhos DIFERENTES coexistem", uniao.torneios.length === 2 && uniao.torneios.some((x) => x.id === tReal.id) && uniao.torneios.some((x) => x.id === tB.id));

    // A6 · MERGE: mesmo id — claim vence, estado vence, histórico vence
    const tClaimA = torneioReal(INPUT_A, AGORA); tClaimA.estado = "terminado"; tClaimA.vencedorId = "eu"; tClaimA.premioReclamado = false;
    const tClaimB = JSON.parse(JSON.stringify(tClaimA)); tClaimB.premioReclamado = true;
    ok("merge: mesmo id — o PRÉMIO reclamado vence (nunca pago duas vezes)", D.mesclarEstadosEsport(estadoCom([tClaimA]), estadoCom([tClaimB])).torneios[0].premioReclamado === true);
    const tEstA = torneioReal(INPUT_A, AGORA); tEstA.estado = "inscricao";
    const tEstB = JSON.parse(JSON.stringify(tEstA)); tEstB.estado = "ativo"; tEstB.participantes = [{ id: "eu", nome: "Eu", pontos: 5, vitorias: 0, partidas: 1, eBot: false }];
    const vEst = D.mesclarEstadosEsport(estadoCom([tEstA]), estadoCom([tEstB])).torneios[0];
    ok("merge: mesmo id — estado MAIS avançado vence (ativo > inscrição)", vEst.estado === "ativo" && vEst.participantes.length === 1);
    const tHA = torneioReal(INPUT_A, AGORA);
    const tHB = JSON.parse(JSON.stringify(tHA)); tHB.historico.push({ em: AGORA + 5, texto: "Partida de kart contabilizada" });
    ok("merge: mesmo id — MAIS histórico vence (mais partidas reais)", D.mesclarEstadosEsport(estadoCom([tHA]), estadoCom([tHB])).torneios[0].historico.length === 2);
    ok("merge: mesmo id NUNCA mistura participantes (mostra o mais avançado)", D.mesclarEstadosEsport(estadoCom([tEstA]), estadoCom([tEstB])).torneios[0].participantes.length === 1);

    // A7 · MERGE: caps 12/8 (os MESMOS do SQL)
    const quinze = Array.from({ length: 15 }, (_, i) => torneioReal({ ...INPUT_A, nome: `Torneio cap ${i}` }, AGORA + i));
    const cincoLigas = Array.from({ length: 11 }, (_, i) => {
      const { l } = E.criarLiga({ ...INPUT_LIGA, nome: `Liga cap ${i}` }, AGORA + i);
      return l;
    });
    ok("merge: torneios capados a 12", D.mesclarEstadosEsport(estadoCom(quinze), estadoCom([])).torneios.length === 12);
    ok("merge: ligas capadas a 8", D.mesclarEstadosEsport(estadoCom([], cincoLigas), estadoCom([])).ligas.length === 8);

    // A8 · absorção convidado → conta (união)
    ok("absorver: união convidado + conta (mesma regra do merge)", D.absorverConvidadoEsport(estadoCom([tReal]), estadoCom([tB])).torneios.length === 2);

    // A9 · LINHA do servidor: binding + RLS provado
    const linha = D.estadoParaLinhaEsport(estadoCom([tReal]), UID);
    ok("linha: user_id da conta", linha.user_id === UID);
    ok("linha: jogador_id = binding da conta", linha.jogador_id === UID);
    ok("linha: torneios validados dentro", linha.torneios.length === 1 && linha.torneios[0].id === tReal.id);
    ok("linha: user_id inválido → null (nada sai sem conta)", D.estadoParaLinhaEsport(estadoCom([tReal]), "") === null);
    ok("linha de OUTRA conta → null (RLS provado no núcleo)", D.linhaParaEstadoEsport({ user_id: "outra-conta", torneios: [tReal], ligas: [] }, UID) === null);
    ok("linha podre → null (nunca lança)", D.linhaParaEstadoEsport("lixo", UID) === null);
    const volta = D.linhaParaEstadoEsport(D.estadoParaLinhaEsport(estadoCom([tReal]), UID), UID);
    ok("round-trip linha ↔ estado: torneio intato", volta.torneios.length === 1 && volta.torneios[0].nome === tReal.nome && volta.torneios[0].participantes.every((p) => p.eBot === (p.id !== "eu")));

    // A10 · IMPRESSÃO anti-spam
    const imp1 = D.impressaoEstadoEsport(estadoCom([tReal, tB]));
    const imp2 = D.impressaoEstadoEsport(estadoCom([tB, tReal])); // ordem do array TROCA
    ok("impressão: ordem dos arrays NÃO paga envio (impressão igual)", imp1 === imp2);
    ok("impressão: estado igual → deveEnviar false", D.deveEnviarEsport(imp1, estadoCom([tReal, tB])) === false);
    const tP = JSON.parse(JSON.stringify(tReal)); tP.premioReclamado = true;
    ok("impressão: CLAIM paga envio (deveEnviar true)", D.deveEnviarEsport(imp1, estadoCom([tP, tB])) === true);
    const tMais = JSON.parse(JSON.stringify(tReal)); tMais.participantes = [{ id: "eu", nome: "Eu", pontos: 25, vitorias: 1, partidas: 1, eBot: false }];
    ok("impressão: partida real (pontos do participante) paga envio", D.deveEnviarEsport(imp1, estadoCom([tMais, tB])) === true);
  }

  // ── B) E2E ────────────────────────────────────────────────────────
  console.log("— B) E2E (sessão fake + rotas REST mockadas) —");
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  const sessaoFake = () => ({
    access_token: "e2e-fake-access-token", token_type: "bearer",
    expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: "e2e-fake-refresh",
    user: {
      id: UID, aud: "authenticated", role: "authenticated", email: "ester91@bateu.test",
      email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { display_name: "Ester" },
      identities: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    },
  });

  /**
   * Cenário: mocks de rota + sementes de localStorage + contador de pedidos.
   * modo: "ok" (GET []/POST 201) · "servidor" (GET com linha) · "migracao"
   * (PGRST205) · "erro" (GET 500)
   */
  async function novoCenario(modo, { sementes = [], pagina = "/tournaments" } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const pedidos = { esportGet: 0, esportPost: 0, posts: [], corpos: [], erros: [] };
    page.on("pageerror", (e) => { if (erroReal(String(e))) pedidos.erros.push(String(e)); });
    page.on("console", (m) => { if (m.type() === "error" && erroReal(m.text())) pedidos.erros.push(m.text()); });

    // torneio do SERVIDOR (outra aparelho) — forma REAL do núcleo
    const tServidor = torneioReal(INPUT_B, AGORA + 20);
    const linhaServidor = {
      user_id: UID, jogador_id: UID, atualizado_em: new Date().toISOString(),
      torneios: [tServidor], ligas: [],
    };

    await ctx.route(`**${new URL(SB_URL).host}/**`, async (route) => {
      const url = route.request().url();
      const metodo = route.request().method();
      if (url.includes("/rest/v1/esport_conta")) {
        if (metodo === "GET" || metodo === "HEAD") {
          pedidos.esportGet++;
          if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.esport_conta' in the schema cache", details: null, hint: null }) });
          if (modo === "erro") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "XX500", message: "boom interno" }) });
          if (modo === "servidor") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([linhaServidor]) });
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        if (metodo === "POST") {
          let corpo = {};
          try { corpo = JSON.parse(route.request().postData() || "{}"); } catch { /* podre */ }
          pedidos.esportPost++;
          pedidos.posts.push(corpo);
          pedidos.corpos.push(route.request().postData() || "");
          if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.esport_conta' in the schema cache", details: null, hint: null }) });
          return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        }
      }
      // resto do supabase (profiles/user_roles/tournaments/leagues/rpc/…) → vazio honesto
      if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessaoFake()) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await ctx.addInitScript(([ref, sementesArg, sessao]) => {
      for (const [chave, valor] of sementesArg) localStorage.setItem(chave, valor);
      if (sessao) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessao));
    }, [SB_REF, sementes, modo === "convidado" ? null : sessaoFake()]);

    await page.goto(BASE + pagina, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    return { ctx, page, pedidos };
  }

  const seedConvidado = (torneio, ligas = []) => [[CHAVE_CONVIDADO, JSON.stringify(estadoCom(torneio, ligas, AGORA))]];
  const esperaSinc = (page, valor, teto = 10_000) => page.waitForFunction(
    (v) => document.querySelector("[data-testid='esport-sinc']")?.getAttribute("data-sinc") === v,
    valor, { timeout: teto },
  ).catch(() => null);

  // B1 · CONVIDADO: ZERO pedidos à tabela da conta
  console.log("■ B1. Convidado — zero pedidos a esport_conta (perímetro)");
  {
    const tGuest = torneioReal(INPUT_A, AGORA);
    const { page, pedidos, ctx } = await novoCenario("convidado", { sementes: seedConvidado([tGuest]) });
    ok("torneio de convidado VISÍVEL na lista", (await page.locator("[data-testid='torneios-local-section']").count()) === 1);
    ok("SEM chip de sincronização (convidado não finge)", (await page.locator("[data-testid='esport-sinc']").count()) === 0);
    ok("ZERO pedidos a rest/v1/esport_conta", pedidos.esportGet === 0 && pedidos.esportPost === 0, `get=${pedidos.esportGet} post=${pedidos.esportPost}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B2 · LOGIN OK: absorção do convidado → conta, push com o torneio
  console.log("■ B2. Login — torneio de convidado absorvido pela conta + push");
  {
    const tGuest = torneioReal(INPUT_A, AGORA);
    const { page, pedidos, ctx } = await novoCenario("ok", { sementes: seedConvidado([tGuest]) });
    await esperaSinc(page, "sincronizado");
    ok("chip de sincronização = «sincronizado»", (await page.locator("[data-testid='esport-sinc']").getAttribute("data-sinc").catch(() => "")) === "sincronizado");
    ok("torneio absorvido VISÍVEL na lista (chave da conta)", (await page.locator("[data-testid='torneios-local-section']").count()) === 1 && (await page.locator(`[data-testid='torneios-local-card-${tGuest.id}']`).count()) === 1);
    const chaveConvidado = await page.evaluate(() => localStorage.getItem("bateu_esport_v1"));
    ok("ficheiro de CONVIDADO limpo DEPOIS de absorvido", chaveConvidado === null, `valor=${chaveConvidado}`);
    const naConta = await page.evaluate((k) => localStorage.getItem(k), CHAVE_CONTA);
    ok("cache POR CONTA tem o torneio", naConta !== null && naConta.includes(tGuest.nome));
    ok("pull (1 GET)", pedidos.esportGet >= 1, `get=${pedidos.esportGet}`);
    ok("push (upsert POST)", pedidos.esportPost >= 1, `post=${pedidos.esportPost}`);
    const ultimo = pedidos.posts[pedidos.posts.length - 1] || {};
    ok("upsert: jogador_id = binding da conta", ultimo.jogador_id === UID, `jogador_id=${ultimo.jogador_id}`);
    ok("upsert: o torneio do convidado FOI para a conta", Array.isArray(ultimo.torneios) && ultimo.torneios.some((x) => x.id === tGuest.id), `torneios=${(ultimo.torneios || []).length}`);
    ok("upsert: ligas vazias honestas", Array.isArray(ultimo.ligas) && ultimo.ligas.length === 0);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B3 · SERVIDOR UNE: os dois torneios coexistem (união por id)
  console.log("■ B3. Pull — o torneio do servidor UNE-se ao do aparelho");
  {
    const tGuest = torneioReal(INPUT_A, AGORA);
    const { page, pedidos, ctx } = await novoCenario("servidor", { sementes: seedConvidado([tGuest]) });
    await esperaSinc(page, "sincronizado");
    ok("OS DOIS torneios no aparelho (união por id)", (await page.locator("[data-testid='torneios-local-section'] button").count()) === 2, `n=${await page.locator("[data-testid='torneios-local-section'] button").count()}`);
    const ultimo = pedidos.posts[pedidos.posts.length - 1] || {};
    ok("push devolve a UNIÃO ao servidor", Array.isArray(ultimo.torneios) && ultimo.torneios.length === 2, `torneios=${(ultimo.torneios || []).length}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B4 · MIGRAÇÃO PENDENTE: PGRST205 declarado (nunca fingido)
  console.log("■ B4. PGRST205 — «migração pendente» declarado");
  {
    const tGuest = torneioReal(INPUT_A, AGORA);
    const { page, pedidos, ctx } = await novoCenario("migracao", { sementes: seedConvidado([tGuest]) });
    await esperaSinc(page, "migracao");
    ok("chip = «migração pendente»", (await page.locator("[data-testid='esport-sinc']").getAttribute("data-sinc").catch(() => "")) === "migracao");
    ok("torneio do aparelho continua VISÍVEL (aparelho é a fonte)", (await page.locator(`[data-testid='torneios-local-card-${tGuest.id}']`).count()) === 1);
    ok("ZERO upserts fingidos (POST só falhou, nunca mentiu)", pedidos.esportGet >= 1 && pedidos.esportPost <= 1, `get=${pedidos.esportGet} post=${pedidos.esportPost}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B5 · ERRO real: motivo no chip, aparelho segue como fonte
  console.log("■ B5. Erro do servidor — estado honesto, aparelho fonte");
  {
    const tGuest = torneioReal(INPUT_A, AGORA);
    const { page, ctx } = await novoCenario("erro", { sementes: seedConvidado([tGuest]) });
    await esperaSinc(page, "erro");
    ok("chip = «erro»", (await page.locator("[data-testid='esport-sinc']").getAttribute("data-sinc").catch(() => "")) === "erro");
    ok("torneio do aparelho continua VISÍVEL", (await page.locator(`[data-testid='torneios-local-card-${tGuest.id}']`).count()) === 1);
    await ctx.close();
  }

  // B6 · CLAIM → PUSH: o prémio reclamado viaja (nunca pago duas vezes)
  console.log("■ B6. Claim — prémio reclamado vai para o servidor (1×)");
  {
    const tFim = torneioReal(INPUT_A, AGORA - 86_400_000, "terminado");
    const { page, pedidos, ctx } = await novoCenario("ok", { sementes: seedConvidado([tFim]) });
    await esperaSinc(page, "sincronizado");
    const antes = pedidos.esportPost;
    await page.goto(`${BASE}/tournaments/${tFim.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='torneio-local-clamar']", { timeout: 15_000 });
    await page.click("[data-testid='torneio-local-clamar']");
    await page.waitForSelector("[data-testid='torneio-local-reclamado']", { timeout: 8_000 });
    // o push do claim leva o debounce de 1,2 s (e o recarregar da página paga
    // um push honesto do re-bind — por isso a espera é pelo POST COM o claim,
    // nunca por contagem de pedidos)
    const teto = Date.now() + 12_000;
    let achou = false;
    while (Date.now() < teto) {
      const ult = pedidos.posts[pedidos.posts.length - 1];
      if (ult && Array.isArray(ult.torneios) && ult.torneios.some((x) => x.id === tFim.id && x.premioReclamado === true)) { achou = true; break; }
      await dormir(300);
    }
    ok("claim pago no aparelho («Reclamado» à vista)", (await page.locator("[data-testid='torneio-local-reclamado']").count()) === 1);
    ok("claim pagou um NOVO push (debounce respeitado)", pedidos.esportPost > antes, `antes=${antes} depois=${pedidos.esportPost}`);
    ok("upsert do claim: premioReclamado=true no servidor", achou, `posts=${pedidos.esportPost}`);
    ok("linha honesta do e-sport à vista (detalhe)", (await page.locator("[data-testid='esport-sinc-linha']").count()) === 1);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B7 · MOBILE: perímetro intato em 390px
  console.log("■ B7. Mobile 390 — perímetro do convidado intato");
  {
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageM = await ctxM.newPage();
    const errosM = [];
    pageM.on("pageerror", (e) => { if (erroReal(String(e))) errosM.push(String(e)); });
    pageM.on("console", (m) => { if (m.type() === "error" && erroReal(m.text())) errosM.push(m.text()); });
    let pedidosM = 0;
    await ctxM.route(`**${new URL(SB_URL).host}/**`, async (route) => {
      const url = route.request().url();
      if (url.includes("/rest/v1/esport_conta")) pedidosM++;
      if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    const tGuest = torneioReal(INPUT_A, AGORA);
    await ctxM.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [CHAVE_CONVIDADO, JSON.stringify(estadoCom([tGuest], [], AGORA))]);
    await pageM.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded" });
    await pageM.waitForTimeout(2200);
    ok("mobile: torneio de convidado visível", (await pageM.locator("[data-testid='torneios-local-section']").count()) === 1);
    ok("mobile: ZERO pedidos a esport_conta", pedidosM === 0, `n=${pedidosM}`);
    ok("mobile: zero erros reais de consola", errosM.length === 0, errosM.slice(0, 2).join(" | "));
    await ctxM.close();
  }

  await browser.close();

  // ── RESUMO ────────────────────────────────────────────────────────
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`RESULTADO: ${pass} verdes · ${fail} falhas`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error("FALHA DA SUÍTE:", e); process.exit(1); });
