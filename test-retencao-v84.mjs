// ═══════════════════════════════════════════════════════════════════════
// v84 — «O PROGRESSO SEGUE A CONTA» (binding jogadorId + servidor)
// A fatia anotada desde a v83: o progresso registado passa a seguir a
// CONTA entre dispositivos. Suíte em duas partes:
//   A) NÚCLEO Node (progressaoConta.ts — padrão esbuild v60/v80):
//      · merge por MÁXIMO (pontos nunca descem, nunca dupla-contam);
//      · missões unidas por MODELO (progresso máximo, reclamada vence);
//      · contadores DO DIA pela atividade de hoje (união de jogos);
//      · linha do servidor validada (user_id tem de bater CERTO);
//      · impressão do estado: contadores do dia NÃO pagam envio (anti-spam
//        — o tick de 30 s da UI regrava sem nunca ligar à rede).
//   B) E2E (sessão fake no localStorage + rotas REST mockadas):
//      · CONVIDADO: ZERO pedidos a rest/v1/progressao_conta (contador);
//      · LOGIN OK: absorção do convidado (120 pontos passam à conta),
//        ficheiro de convidado limpo DEPOIS de absorvido, chip «Na conta»,
//        upsert com jogador_id = conta e as missões do convidado dentro;
//      · SERVIDOR > APARELHO: conta com 500 no servidor vence os 100
//        locais (máximo honesto) e volta ao servidor no upsert;
//      · MIGRAÇÃO PENDENTE: PGRST205 declarado (nunca fingido);
//      · ERRO: motivo real no chip/linha, aparelho como fonte;
//      · PARTIDA → PUSH: bateu:partida no bus → upsert com os pontos do
//        jogo (debounce 1,2 s) — o ciclo Joga→Ganha→Conta fecha no servidor.
// Pré-requisito: vite dev em :8099 (externo). Uso:
//   PW_CHROME=… node test-retencao-v84.mjs
// ═══════════════════════════════════════════════════════════════════════
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
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
const UID = "84e2e000-0000-4000-8000-00000000e284";
const CHAVE_CONVIDADO = "bateu_progressao_v78";
const CHAVE_CONTA = `bateu_progressao_v78:u:${UID}`;

// erros de consola que são RUÍDO conhecido do ambiente (não furos da v84)
const RUIDO = [
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "permission", "AbortError", "play() failed", "user gesture", "JWT", "PGRST",
  "fetchPriority", "third-party cookie", "storage",
];
const erroReal = (msg) => !RUIDO.some((r) => msg.toLowerCase().includes(r.toLowerCase()));

let D; // núcleo progressaoConta
let P; // núcleo progressao

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🎮 O PROGRESSO SEGUE A CONTA v84 — ${BASE} (ref ${SB_REF})\n`);

  // ── A) NÚCLEO ─────────────────────────────────────────────────────
  console.log("— A) Núcleo puro (progressaoConta.ts) —");
  {
    const bundle = `${RAIZ}/.v84-nucleo-bundle.mjs`;
    execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/progressaoConta.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundle}`], { stdio: "pipe" });
    D = await import(bundle);
    P = await import(`${RAIZ}/src/lib/progressao.ts`);

    // 1) chave do cache por conta
    ok("chaveCacheConta deriva a chave por conta", D.chaveCacheConta("abc") === `bateu_progressao_v78:u:abc`);
    ok("chaveCacheConta SANITIZA (caracteres estranhos nunca entram na chave; cap 24+60=84)", D.chaveCacheConta("a/b?c#x".repeat(30)).length <= 84 && !D.chaveCacheConta("a/b?c").includes("/"));

    // 2) MERGE por máximo — pontos nunca descem
    const agora = Date.now();
    const a = { ...P.estadoPadrao("uA"), pontos: 120 };
    const b = { ...P.estadoPadrao("uB"), pontos: 500 };
    ok("merge: pontos = MÁXIMO (a<b)", D.mesclarEstados(a, b, agora).pontos === 500);
    ok("merge: pontos = MÁXIMO (b<a)", D.mesclarEstados(b, a, agora).pontos === 500);
    ok("merge: total de missões = máximo", D.mesclarEstados({ ...a, missoesConcluidasTotal: 3 }, { ...b, missoesConcluidasTotal: 7 }, agora).missoesConcluidasTotal === 7);
    ok("merge: últimaAtividade = máxima", D.mesclarEstados({ ...a, ultimaAtividade: 10 }, { ...b, ultimaAtividade: 20 }, agora).ultimaAtividade === 20);

    // 3) missões unidas por MODELO
    const hoje = new Date(agora); hoje.setHours(23, 59, 59, 999);
    const mkMissao = (id, modelo, progresso, reclamada = false) => ({
      id, modelo, titulo: `T ${modelo}`, jogoId: null, jogosDistintos: 0,
      alvo: 2, progresso, pontos: 100, criadaEm: agora, terminaEm: hoje.getTime(), reclamada,
    });
    const mA = { ...a, missoes: [mkMissao("m1", "joga-kart", 1), mkMissao("m2", "vence-1", 2)] };
    const mB = { ...b, missoes: [mkMissao("m3", "joga-kart", 2), mkMissao("m4", "joga-memoria", 0, true)] };
    const mm = D.mesclarEstados(mA, mB, agora).missoes;
    ok("missões unidas por MODELO (3 modelos, não 4 linhas)", mm.length === 3 && mm.filter((x) => x.modelo === "joga-kart").length === 1);
    ok("missão unida: progresso = máximo (1 vs 2 → 2)", mm.find((x) => x.modelo === "joga-kart").progresso === 2);
    ok("missão unida: «reclamada» vence em qualquer lado", mm.find((x) => x.modelo === "joga-memoria").reclamada === true);
    ok("missão unida: o id vem da escolhida", mm.find((x) => x.modelo === "joga-kart").id === "m3");

    // 4) caps do merge
    const doze = Array.from({ length: 15 }, (_, i) => mkMissao(`x${i}`, `mod-${i}`, 0));
    ok("merge: missões capadas a 12", D.mesclarEstados({ ...a, missoes: doze }, { ...b, missoes: [] }, agora).missoes.length === 12);

    // 5) contadores DO DIA
    const diaHoje = (() => { const d = new Date(agora); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
    const dA = { ...a, diaContador: diaHoje, corridas: 2, jogosHoje: ["kart"], vitoriasHoje: 1 };
    const dB = { ...b, diaContador: diaHoje, corridas: 3, jogosHoje: ["tetris"], vitoriasHoje: 0 };
    const uni = D.mesclarEstados(dA, dB, agora);
    ok("dia: corridas = máximo (2 vs 3 → 3)", uni.corridas === 3);
    ok("dia: jogosHoje = união sem duplicados", uni.jogosHoje.length === 2 && uni.jogosHoje.includes("kart") && uni.jogosHoje.includes("tetris"));
    ok("dia: vitoriasHoje = máximo (1 vs 0 → 1)", uni.vitoriasHoje === 1);
    const velho = { ...a, diaContador: "2026-01-01", corridas: 9, jogosHoje: ["kart"] };
    const soHoje = D.mesclarEstados(velho, dB, agora);
    ok("dia: a atividade de OUTRO dia não contamina hoje", soHoje.corridas === 3 && soHoje.jogosHoje.length === 1);
    const nenhum = D.mesclarEstados({ ...a, diaContador: "2026-01-01" }, { ...b, diaContador: "2026-01-02" }, agora);
    ok("dia: nenhum é de hoje → contadores do dia nascem vazios (honesto)", nenhum.corridas === 0 && nenhum.diaContador === "");

    // 6) ABSORÇÃO do convidado
    const conta = { ...P.estadoPadrao("uVelho"), pontos: 40 };
    const convidado = { ...P.estadoPadrao(""), pontos: 120, missoes: [mkMissao("g1", "joga-kart", 1)] };
    const abs = D.absorverConvidado(conta, convidado, UID, agora);
    ok("absorção: pontos = máximo (40 vs 120 → 120)", abs.pontos === 120);
    ok("absorção: jogadorId = CONTA (nunca o do convidado)", abs.jogadorId === UID);
    ok("absorção: missões do convidado entram", abs.missoes.some((x) => x.modelo === "joga-kart"));
    ok("absorção: nunca muta (os originais ficam intactos)", conta.pontos === 40 && convidado.pontos === 120);

    // 7) LINHA do servidor
    const linhaBoa = { user_id: UID, jogador_id: UID, pontos: 700, missoes_concluidas_total: 2, missoes: [mkMissao("s1", "vence-1", 1)] };
    const estServ = D.linhaParaEstado(linhaBoa, UID);
    ok("linha → estado: pontos/totais/missões validados", estServ?.pontos === 700 && estServ.missoesConcluidasTotal === 2 && estServ.missoes[0].modelo === "vence-1");
    ok("linha → estado: jogadorId FORÇADO à conta", estServ?.jogadorId === UID);
    ok("linha de OUTRA conta → null (RLS provado no núcleo)", D.linhaParaEstado({ ...linhaBoa, user_id: "outra" }, UID) === null);
    ok("linha podre → hidratada sem lançar (pontos string → 0)", D.linhaParaEstado({ user_id: UID, pontos: "podre", missoes: "x" }, UID)?.pontos === 0);
    ok("linha null/ausente → null", D.linhaParaEstado(null, UID) === null);
    ok("linha com missões PODRES → descartadas contadas", D.linhaParaEstado({ user_id: UID, pontos: 5, missoes: [{ id: "x" }, null, "podre", mkMissao("ok1", "joga-kart", 1)] }, UID)?.missoes.length === 1);

    // 8) estado → linha (caps)
    const estAlto = { ...P.estadoPadrao(UID), pontos: 99_999_999 };
    const linhaAlta = D.estadoParaLinha(estAlto, UID);
    ok("estado → linha: pontos CAPADOS ao limite do servidor", linhaAlta?.pontos === D.LIMITES_PROGRESSAO_CONTA.PONTOS_CAP);
    ok("estado → linha: user_id inválido → null", D.estadoParaLinha(estAlto, "") === null);
    const round = D.linhaParaEstado(linhaAlta, UID);
    ok("round-trip linha ↔ estado mantém o estado", round?.pontos === D.LIMITES_PROGRESSAO_CONTA.PONTOS_CAP && round.jogadorId === UID);

    // 9) IMPRESSÃO — o anti-spam do push (o tick de 30 s NÃO paga rede)
    const base = { ...P.estadoPadrao(UID), diaContador: diaHoje, corridas: 3, jogosHoje: ["kart"], vitoriasHoje: 1 };
    const soDia = { ...base, corridas: 4 };
    ok("impressão: SÓ contadores do dia mudaram → NÃO envia (zero pedidos no tick)", D.deveEnviar(D.impressaoEstado(base), soDia) === false);
    ok("impressão: pontos mudaram → envia", D.deveEnviar(D.impressaoEstado(base), { ...base, pontos: 1 }) === true);
    ok("impressão: missão reclamada mudou → envia", D.deveEnviar(D.impressaoEstado(base), { ...base, missoes: [mkMissao("m1", "joga-kart", 2, true)] }) === true);
    ok("impressão: nada mudou → não envia", D.deveEnviar(D.impressaoEstado(base), base) === false);
    ok("estadoContaPadrao: nasce vinculado à conta", D.estadoContaPadrao(UID).jogadorId === UID);
  }

  // ── B) E2E ────────────────────────────────────────────────────────
  console.log("— B) E2E (sessão fake + rotas REST mockadas) —");
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  const sessaoFake = () => ({
    access_token: "e2e-fake-access-token", token_type: "bearer",
    expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: "e2e-fake-refresh",
    user: {
      id: UID, aud: "authenticated", role: "authenticated", email: "ester84@bateu.test",
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
  async function novoCenario(modo, { sementes = [], pagina = "/" } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const pedidos = { contaGet: 0, contaPost: 0, posts: [], erros: [] };
    page.on("pageerror", (e) => { if (erroReal(String(e))) pedidos.erros.push(String(e)); });
    page.on("console", (m) => { if (m.type() === "error" && erroReal(m.text())) pedidos.erros.push(m.text()); });

    const linhaServidor = {
      user_id: UID, jogador_id: UID, pontos: 500, missoes_concluidas_total: 1,
      missoes: [{ id: "s-vence", modelo: "vence-1", titulo: "Vence 1 partida hoje", jogoId: null, jogosDistintos: 0, alvo: 1, progresso: 1, pontos: 200, criadaEm: Date.now() - 3600e3, terminaEm: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })(), reclamada: false }],
    };

    await ctx.route(`**${new URL(SB_URL).host}/**`, async (route) => {
      const url = route.request().url();
      const metodo = route.request().method();
      if (url.includes("/rest/v1/progressao_conta")) {
        if (metodo === "GET" || metodo === "HEAD") {
          pedidos.contaGet++;
          if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.progressao_conta' in the schema cache", details: null, hint: null }) });
          if (modo === "erro") return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "XX500", message: "boom interno" }) });
          if (modo === "servidor") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([linhaServidor]) });
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        if (metodo === "POST") {
          let corpo = {};
          try { corpo = JSON.parse(route.request().postData() || "{}"); } catch { /* podre */ }
          pedidos.contaPost++;
          pedidos.posts.push(corpo);
          if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.progressao_conta' in the schema cache", details: null, hint: null }) });
          return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        }
      }
      // resto do supabase (profiles/user_roles/admin_regions/tournaments/rpc) → vazio honesto
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

  // B1 · CONVIDADO: ZERO pedidos à tabela da conta
  console.log("■ B1. Convidado — zero pedidos a progressao_conta (perímetro)");
  {
    const { page, pedidos, ctx } = await novoCenario("convidado");
    ok("bloco de VISITANTE honesto à vista", await page.locator("[data-testid='reten-bv-visitante']").isVisible().catch(() => false));
    ok("SEM chip de sincronização (convidado não finge)", (await page.locator("[data-testid='reten-sinc']").count()) === 0);
    ok("ZERO pedidos a rest/v1/progressao_conta", pedidos.contaGet === 0 && pedidos.contaPost === 0, `get=${pedidos.contaGet} post=${pedidos.contaPost}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B2 · LOGIN OK: absorção do convidado → conta, push com as missões
  console.log("■ B2. Login — convidado absorvido (120 pontos passam à conta) + push");
  {
    const missaoConvidado = {
      id: "g-kart", modelo: "joga-kart", titulo: "Joga BATEU KART 1 vez", jogoId: "kart",
      jogosDistintos: 0, alvo: 1, progresso: 1, pontos: 100,
      criadaEm: Date.now() - 60e3, terminaEm: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })(), reclamada: false,
    };
    const sementes = [[CHAVE_CONVIDADO, JSON.stringify({ versao: 1, jogadorId: "", pontos: 120, corridas: 0, diaContador: "", jogosHoje: [], vitoriasHoje: 0, missoes: [missaoConvidado], missoesConcluidasTotal: 0, ultimaAtividade: Date.now() - 60e3 })]];
    const { page, pedidos, ctx } = await novoCenario("ok", { sementes });
    // chip chega a «sincronizado» (pull + push completos)
    await page.waitForFunction(() => document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") === "sincronizado", null, { timeout: 9000 }).catch(() => {});
    ok("chip de sincronização = «sincronizado»", (await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "")) === "sincronizado");
    ok("bloco REGISTADO à vista (homepage com progressão)", await page.locator("[data-testid='reten-bv-registado']").isVisible().catch(() => false));
    ok("linha honesta: «guardado na conta»", (await page.locator("[data-testid='reten-sinc-linha']").textContent().catch(() => "")).includes("conta"));
    ok("hub fez pull (1 GET)", pedidos.contaGet >= 1, `get=${pedidos.contaGet}`);
    ok("hub fez push (upsert POST)", pedidos.contaPost >= 1, `post=${pedidos.contaPost}`);
    const ultimo = pedidos.posts[pedidos.posts.length - 1] || {};
    ok("upsert: os 120 pontos do convidado FORAM para a conta", ultimo.pontos === 120, `pontos=${ultimo.pontos}`);
    ok("upsert: jogador_id = binding da conta", ultimo.jogador_id === UID, `jogador_id=${ultimo.jogador_id}`);
    ok("upsert: user_id = conta autenticada", ultimo.user_id === UID);
    ok("upsert: as missões do convidado viajaram (modelo joga-kart)", Array.isArray(ultimo.missoes) && ultimo.missoes.some((x) => x?.modelo === "joga-kart"));
    const convidadoApos = await page.evaluate((k) => localStorage.getItem(k), CHAVE_CONVIDADO);
    ok("ficheiro de convidado LIMPO depois de absorvido (nada fica em dupla)", convidadoApos === null || JSON.parse(convidadoApos || "{}").pontos === 0);
    const cacheConta = await page.evaluate((k) => localStorage.getItem(k), CHAVE_CONTA);
    ok("cache POR CONTA criado no aparelho", !!cacheConta && JSON.parse(cacheConta).pontos === 120);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B3 · SERVIDOR > APARELHO: os 500 do servidor vencem os 100 locais
  console.log("■ B3. Merge servidor vs aparelho — o MÁXIMO vence (nunca desce)");
  {
    const sementes = [[CHAVE_CONTA, JSON.stringify({ versao: 1, jogadorId: UID, pontos: 100, corridas: 0, diaContador: "", jogosHoje: [], vitoriasHoje: 0, missoes: [], missoesConcluidasTotal: 0, ultimaAtividade: 0 })]];
    const { page, pedidos, ctx } = await novoCenario("servidor", { sementes });
    await page.waitForFunction(() => document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") === "sincronizado", null, { timeout: 9000 }).catch(() => {});
    ok("chip = sincronizado", (await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "")) === "sincronizado");
    ok("UI mostra os 500 do SERVIDOR (nunca os 100 do aparelho)", (await page.locator("[data-testid='reten-pontos']").textContent().catch(() => "")).includes("500"));
    const ultimo = pedidos.posts[pedidos.posts.length - 1] || {};
    ok("upsert devolve os 500 ao servidor (conta igual em todo o lado)", ultimo.pontos === 500, `pontos=${ultimo.pontos}`);
    ok("missão do servidor («Vence 1») entra no estado", Array.isArray(ultimo.missoes) && ultimo.missoes.some((x) => x?.modelo === "vence-1"));
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B4 · MIGRAÇÃO PENDENTE: PGRST205 declarado, nunca fingido
  console.log("■ B4. Migração pendente (PGRST205) — declarado com honestidade");
  {
    const { page, pedidos, ctx } = await novoCenario("migracao");
    await page.waitForFunction(() => document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") === "migracao", null, { timeout: 9000 }).catch(() => {});
    ok("chip = «migração pendente»", (await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "")) === "migracao");
    ok("linha declara a migração (aparelho por agora)", (await page.locator("[data-testid='reten-sinc-linha']").textContent().catch(() => "")).toLowerCase().includes("migra"));
    ok("ZERO upsert depois da migração pendente (nada é fingido)", pedidos.contaPost === 0, `post=${pedidos.contaPost}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B5 · ERRO: motivo real, aparelho como fonte
  console.log("■ B5. Erro do servidor — motivo real, progresso seguro no aparelho");
  {
    const { page, pedidos, ctx } = await novoCenario("erro");
    await page.waitForFunction(() => document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") === "erro", null, { timeout: 9000 }).catch(() => {});
    ok("chip = «erro»", (await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "")).length > 0);
    ok("linha com o MOTIVO real", (await page.locator("[data-testid='reten-sinc-linha']").textContent().catch(() => "")).length > 10);
    ok("ZERO upsert no erro (nada é fingido)", pedidos.contaPost === 0, `post=${pedidos.contaPost}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // B6 · PARTIDA → PUSH: o ciclo Joga→Ganha→Conta fecha no servidor
  console.log("■ B6. Partida no bus → push do ciclo ao servidor (debounce 1,2 s)");
  {
    // o PainelProgressao (o ÚNICO dono da store e o ouvinte do bus) vive no hub /lives
    const { page, pedidos, ctx } = await novoCenario("ok", { pagina: "/lives" });
    ok("painel de progressão à vista no hub", await page.locator("[data-testid='painel-progressao']").isVisible().catch(() => false));
    await page.waitForFunction(() => document.querySelector("[data-testid='painel-progressao'] [data-testid='reten-sinc']")?.getAttribute("data-sinc") === "sincronizado", null, { timeout: 9000 }).catch(() => {});
    const postsAposBind = pedidos.contaPost;
    // UMA partida real pelo bus (o mesmo caminho que o kart usa no payout)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } }));
    });
    await dormir(2600); // debounce 1,2 s + margem
    ok("a partida pagou UM upsert novo", pedidos.contaPost === postsAposBind + 1, `antes=${postsAposBind} depois=${pedidos.contaPost}`);
    const ultimo = pedidos.posts[pedidos.posts.length - 1] || {};
    ok("upsert com os 120 pontos da partida (teto do catálogo)", ultimo.pontos === 120, `pontos=${ultimo.pontos}`);
    ok("zero erros reais de consola", pedidos.erros.length === 0, pedidos.erros.slice(0, 2).join(" | "));
    await ctx.close();
  }

  await browser.close();

  // ── VEREDICTO ─────────────────────────────────────────────────────
  console.log(`\n══ v84 — ${pass} pass / ${fail} fail ══`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
