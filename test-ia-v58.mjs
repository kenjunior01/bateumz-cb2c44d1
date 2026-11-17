// ═══════════════════════════════════════════════════════════════════════
// test-ia-v58.mjs — HISTÓRICO DA IA NO SERVIDOR — suíte
//
// O passo anotado desde a v54 (junto com o NPC, feito na v57): o histórico
// do chat da IA (página /ia e o NPC da Cidade) passa a viver no Supabase
// (tabela ia_historio com RLS) e segue o utilizador ENTRE DISPOSITIVOS.
//
// A) Núcleo isomórfico no Node: chave determinística (determinismo,
//    estabilidade, diferenciação por criadoEm/papel/conteúdo), validação
//    (papel/conteúdo/caps/tokens inválidos→null), carimbo pré-v58 (sem
//    criadoEm → sintético), merge por chave (servidor ganha, ordem, cap),
//    linhas ↔ mensagens (linha podre → null), agrupar sessões + cap,
//    FIO SEGURO: validarMensagens (o fio NVIDIA) corta a meta extra.
// B) Cliente ↔ PostgREST MOCKADO: o mock PROVA o fio — GET com
//    superficie/order/limit; POST com on_conflict=user_id,chave e
//    Prefer: resolution=ignore-duplicates; DELETE com filtros; estados
//    honestos (convidado NUNCA toca na rede · PGRST205 → "migracao" ·
//    500 → "erro" com motivo); linhas podres descartadas com contagem.
// C) Supabase REAL (skippável honesta): anon → se a tabela ainda não
//    existe (PGRST205) SKIP com a migração apontada; se existe, prova o
//    RLS a bloquear o anónimo; tenta signUp REAL (se o projecto não exige
//    confirmação de email, o ciclo push→pull→apagar corre DE VERDADE).
// D) E2E Playwright: /ia com badge honesto de convidado + chat regresso
//    (mock NVIDIA); /cidade com o NPC a falar e o chip honesto; CONVIDADO
//    faz ZERO pedidos a rest/v1/ia_historico (prova de honestidade);
//    zero erros de console; shots-v58/.
//
// Uso: node test-ia-v58.mjs            (leva vite 8099, proxy 8789, mock 59994)
//      node test-ia-v58.mjs --sem-e2e  (só A+B+C, sem browser)
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const SEM_E2E = process.argv.includes("--sem-e2e");
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_MOCK = Number(process.env.PORTA_MOCK || 59994);
const PORTA_MOCK_REST = Number(process.env.PORTA_MOCK_REST || 59995);
const PORTA_PROXY = Number(process.env.PORTA_PROXY || 8789);

let ok = 0, fail = 0, skips = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const skip = (nome, motivo) => { skips++; console.log("  ⏭️ ", nome, `(${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Núcleo isomórfico — o MESMO módulo que o browser usa (padrão v46–v58)
const {
  LIMITES_HISTORICO, SESSAO_NPC, hashFnv1a, chaveDe,
  validarMensagemHistorico, ErroHistoricoIa, carimbarMensagens, mesclarMensagens,
  linhaParaMensagem, mensagemParaLinha, agruparPorSessao, capSessoes,
  criarGestorHistoricoIa,
} = await import(`${RAIZ}/src/lib/iaHistorico.ts`);
// o fio do chat (para provar que a meta NUNCA chega ao modelo)
const { validarMensagens } = await import(`${RAIZ}/src/lib/nemotron.ts`);
// o NPC (validarHistoricoNpc leva a meta validada — v58)
const { validarHistoricoNpc, LIMITES_NPC } = await import(`${RAIZ}/src/game/cidade/npcIa.ts`);

const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

// ── Mock PostgREST (o fio ia_historico REAL, servido por nós) ────────────

const pedidosRest = []; // { metodo, caminho, prefer, corpo }
let modoMockRest = "ok"; // "ok" | "pgrst205" | "erro500"
let linhasMockRest = [];

const mockRest = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", () => {
    let corpo = [];
    try { corpo = JSON.parse(cru || "[]"); } catch {}
    pedidosRest.push({
      metodo: req.method,
      caminho: req.url,
      prefer: req.headers.prefer ?? "",
      corpo,
    });
    if (modoMockRest === "pgrst205") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: "PGRST205", message: "Could not find the table 'ia_historico' in the schema cache", hint: null, details: null }));
      return;
    }
    if (modoMockRest === "erro500") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: "XX999", message: "explosão no servidor de teste" }));
      return;
    }
    if (!req.url.startsWith("/rest/v1/ia_historico")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "rota desconhecida no mock" }));
      return;
    }
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(linhasMockRest));
      return;
    }
    if (req.method === "POST") {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(corpo));
      return;
    }
    if (req.method === "DELETE") {
      res.writeHead(204, {});
      res.end();
      return;
    }
    res.writeHead(405, {});
    res.end();
  });
});

// ── Mock upstream NVIDIA (chat v54 — SSE real) ───────────────────────────

let ultimoCorpoChat = null;
const mockNvidia = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", () => {
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    if (!req.headers.authorization?.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "sem autorização" } }));
      return;
    }
    ultimoCorpoChat = corpo;
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    const pedacos = [];
    for (const c of ["Olá! ", "Resposta do ", "mock v58."]) {
      pedacos.push(`data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`);
    }
    pedacos.push(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 } })}\n\n`);
    pedacos.push("data: [DONE]\n\n");
    let i = 0;
    const passo = () => {
      if (i >= pedacos.length) { res.end(); return; }
      const p = pedacos[i++];
      if (res.destroyed) return;
      setTimeout(() => { if (!res.destroyed) { res.write(p); passo(); } }, 12);
    };
    passo();
  });
});

// ── Helpers de subprocessos (lição v49/v53/v56: GRUPO, nunca só o pai) ──

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
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
  for (const padrao of ["vite --port 8099 --strictPort", "server/ia-proxy.mjs"]) {
    try { spawnSync("pkill", ["-f", padrao], { stdio: "ignore" }); } catch {}
  }
}
async function esperarAte(url, testar, ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try {
      const r = await fetch(url);
      if (!testar || testar(r)) return true;
    } catch {}
    await sleep(300);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n💾 BATEU IA v58 — HISTÓRICO NO SERVIDOR — ${RAIZ}\n`);
  limparZumbis();

  // ── A) Núcleo isomórfico ──
  console.log("— A) Núcleo iaHistorico (Node)");

  t("LIMITES_HISTORICO: caps declarados (conteúdo 8000 · sessão 60 · sessões 20)",
    LIMITES_HISTORICO.CONTEUDO_CAP === 8000 && LIMITES_HISTORICO.MENSAGENS_SESSAO_CAP === 60 && LIMITES_HISTORICO.SESSOES_CAP === 20,
    JSON.stringify(LIMITES_HISTORICO));
  t("SESSAO_NPC = 'praca' (janela única da Praça do Imbondeiro)", SESSAO_NPC === "praca", SESSAO_NPC);

  // chave determinística — a espinha da idempotência
  const k1 = chaveDe("ia-xyz", 1000, "utilizador", "Olá, como participo?");
  const k2 = chaveDe("ia-xyz", 1000, "utilizador", "Olá, como participo?");
  t("chave DETERMINÍSTICA: mesma entrada → mesma chave", k1 === k2);
  t("chave difere por criadoEm (pergunta IGUAL em momento diferente NÃO se perde)",
    k1 !== chaveDe("ia-xyz", 2000, "utilizador", "Olá, como participo?"));
  t("chave difere por papel", k1 !== chaveDe("ia-xyz", 1000, "assistente", "Olá, como participo?"));
  t("chave difere por sessão", k1 !== chaveDe("ia-abc", 1000, "utilizador", "Olá, como participo?"));
  t("chave difere por conteúdo", k1 !== chaveDe("ia-xyz", 1000, "utilizador", "Outra pergunta"));
  t("hashFnv1a: 8 hex estável", /^[0-9a-f]{8}$/.test(hashFnv1a("capulana")) && hashFnv1a("capulana") === hashFnv1a("capulana"));
  t("chave cabe no cap (≤140)", k1.length <= LIMITES_HISTORICO.CHAVE_CAP, k1);

  // validação — o que pode entrar no histórico
  const msgBoa = { papel: "utilizador", conteudo: "Quanto custa um bilhete?", criadoEm: 1700000000000 };
  const v1 = validarMensagemHistorico(msgBoa, 0, "ia-x");
  t("validarMensagemHistorico: mensagem boa passa e ganha chave determinística", v1.chave === chaveDe("ia-x", 1700000000000, "utilizador", msgBoa.conteudo));
  t("validar: aceita a forma do fio (role/content → papel/conteudo)",
    validarMensagemHistorico({ role: "user", content: "olá", criadoEm: 1 }, 0, "s").papel === "utilizador");
  for (const [nome, msg] of [
    ["papel inválido", { papel: "system", conteudo: "x", criadoEm: 1 }],
    ["conteúdo vazio", { papel: "utilizador", conteudo: "   ", criadoEm: 1 }],
    ["criadoEm inválido", { papel: "utilizador", conteudo: "x", criadoEm: -5 }],
  ]) {
    let lancou = false;
    try { validarMensagemHistorico(msg, 0, "s"); } catch (e) { lancou = e instanceof ErroHistoricoIa; }
    t(`validar: ${nome} → ErroHistoricoIa`, lancou);
  }
  const vCap = validarMensagemHistorico({ papel: "utilizador", conteudo: "a".repeat(9000), criadoEm: 1 }, 0, "s");
  t("validar: conteúdo truncado ao cap 8000 (nunca rejeita o que o chat pode gerar)", vCap.conteudo.length === 8000);
  const vTok = validarMensagemHistorico({ papel: "assistente", conteudo: "x", criadoEm: 1, tokens: 999999999 }, 0, "s");
  t("validar: tokens absurdos → NULL (nunca inventados)", vTok.tokens === null);
  const vTok2 = validarMensagemHistorico({ papel: "assistente", conteudo: "x", criadoEm: 1, tokens: 38 }, 0, "s");
  t("validar: tokens reais passam", vTok2.tokens === 38);

  // carimbo — pré-v58 (sem criadoEm) ganha sintético; com chave mantém
  const car = carimbarMensagens(
    [
      { role: "user", content: "pergunta antiga" },                  // pré-v58 sem nada
      { role: "assistant", content: "resposta antiga" },             // pré-v58 sem nada
      { papel: "utilizador", conteudo: "nova", criadoEm: 555 },      // v58 completo
      "linha podre",                                                  // descartada
      { role: "assistant", content: "" },                             // descartada (vazia)
    ],
    "conv-1", 777000,
  );
  t("carimbar: 3 mensagens válidas, 2 descartadas CONTADAS",
    car.mensagens.length === 3 && car.descartadas === 2, `${car.mensagens.length}/${car.descartadas}`);
  t("carimbar pré-v58: criadoEm sintético baseEm+i (só ordena — nunca mostrado)",
    car.mensagens[0].criadoEm === 777000 && car.mensagens[1].criadoEm === 777001);
  t("carimbar: mesmo input → MESMO carimbo (determinismo entre dispositivos)",
    JSON.stringify(carimbarMensagens([{ role: "user", content: "p" }], "c", 100)) ===
    JSON.stringify(carimbarMensagens([{ role: "user", content: "p" }], "c", 100)));
  const comChave = carimbarMensagens([{ papel: "utilizador", conteudo: "x", criadoEm: 9, chave: "minha-chave" }], "c", 100);
  t("carimbar: chave EXISTENTE é mantida (carimbada uma vez, nunca recalculada)", comChave.mensagens[0].chave === "minha-chave");
  const naoMuta = [{ role: "user", content: "p" }];
  carimbarMensagens(naoMuta, "c", 1);
  t("carimbar: NÃO muta os objectos de entrada", !("chave" in naoMuta[0]));

  // merge — dedupe por chave, servidor ganha, ordem, cap
  const mA = { chave: "a", papel: "utilizador", conteudo: "A", criadoEm: 100 };
  const mB = { chave: "b", papel: "assistente", conteudo: "B", criadoEm: 200 };
  const mC = { chave: "c", papel: "utilizador", conteudo: "C", criadoEm: 300 };
  const mA2 = { chave: "a", papel: "utilizador", conteudo: "A-do-servidor", criadoEm: 100 };
  const merge1 = mesclarMensagens([mA, mB], [mA2, mC], 60);
  t("merge: 3 únicas (1 duplicada contada)", merge1.mensagens.length === 3 && merge1.duplicadas === 1);
  t("merge: o SERVIDOR ganha no conflito de chave", merge1.mensagens.find((m) => m.chave === "a")?.conteudo === "A-do-servidor");
  t("merge: deServidor conta o que só o servidor tinha", merge1.deServidor === 1);
  t("merge: ordem por criadoEm", merge1.mensagens.map((m) => m.chave).join("") === "abc");
  const merge2 = mesclarMensagens([mA, mB, mC], [], 2);
  t("merge: cap fica com as MAIS RECENTES", merge2.mensagens.length === 2 && merge2.mensagens[0].chave === "b");

  // linhas ↔ mensagens
  const linhaBoa = mensagemParaLinha(mA, USER_ID, "ia", "conv-1", "guia");
  t("mensagemParaLinha: forma do fio completa (user_id/superficie/sessao/papel/conteudo/criada_em ISO)",
    linhaBoa.user_id === USER_ID && linhaBoa.superficie === "ia" && linhaBoa.sessao === "conv-1" &&
    linhaBoa.papel === "utilizador" && linhaBoa.persona === "guia" && linhaBoa.criada_em === new Date(100).toISOString());
  t("mensagemParaLinha: recusa user_id não-UUID", (() => { try { mensagemParaLinha(mA, "não-uuid", "ia", "s"); return false; } catch { return true; } })());
  const deVolta = linhaParaMensagem(linhaBoa);
  t("linhaParaMensagem: round-trip fiel (criada_por_cliente vence)",
    deVolta?.chave === mA.chave && deVolta?.criadoEm === 100 && deVolta?.papel === "utilizador");
  const linhasPodres = [
    linhaBoa,
    { ...linhaBoa, papel: "system" },                       // papel inválido
    { ...linhaBoa, chave: "" },                              // chave vazia
    { ...linhaBoa, conteudo: "" },                           // conteúdo vazio
    { ...linhaBoa, user_id: "não-uuid" },                    // user_id podre
    { ...linhaBoa, chave: "x2", criada_por_cliente: null, criada_em: "não é data" }, // sem tempo legível
    { ...linhaBoa, chave: "x3", superficie: "outro" },       // superfície inválida
    "não é objecto",
  ];
  const ressuscitadas = linhasPodres.map(linhaParaMensagem);
  t("linhaParaMensagem: só a linha boa sobrevive (7 podres → null)",
    ressuscitadas.filter(Boolean).length === 1 && ressuscitadas[0] !== null, `${ressuscitadas.filter(Boolean).length}/8`);
  const daIso = linhaParaMensagem({ ...linhaBoa, chave: "iso", criada_por_cliente: null, criada_em: new Date(999).toISOString() });
  t("linhaParaMensagem: sem criada_por_cliente → criada_em ISO vence (dispositivos antigos)", daIso?.criadoEm === 999);

  // sessões
  const agr = agruparPorSessao([
    { ...linhaBoa, sessao: "conv-1" },
    { ...linhaBoa, chave: "k2", criada_por_cliente: 200, sessao: "conv-1" },
    { ...linhaBoa, chave: "k3", criada_por_cliente: 50, sessao: "conv-2", papel: "assistente", persona: null },
    { ...linhaBoa, papel: "system" }, // podre
  ]);
  t("agruparPorSessao: 2 sessões, podres descartadas contadas",
    agr.sessoes.length === 2 && agr.descartadas === 1, `${agr.sessoes.length}/${agr.descartadas}`);
  t("agruparPorSessao: mensagens ordenadas dentro da sessão",
    agr.sessoes[0].sessao === "conv-1" && agr.sessoes[0].mensagens[0].criadoEm === 100);
  t("agruparPorSessao: persona da 1.ª pergunta guardada", agr.sessoes[0].persona === "guia");
  t("capSessoes: mantém as mais recentes", capSessoes(agr.sessoes, 1).length === 1 && capSessoes(agr.sessoes, 1)[0].sessao === "conv-1");

  // FIO SEGURO — a meta nunca chega ao modelo
  const fio = validarMensagens([
    { role: "user", content: "pergunta", chave: "abc", criadoEm: 123, tokens: 9 },
    { role: "assistant", content: "resposta", raciocinio: "pensou", chave: "def", criadoEm: 124 },
  ]);
  t("FIO SEGURO: validarMensagens corta a meta — só role/content chegam ao modelo",
    JSON.stringify(fio) === JSON.stringify([{ role: "user", content: "pergunta" }, { role: "assistant", content: "resposta" }]),
    JSON.stringify(fio));
  const npcMeta = validarHistoricoNpc([{ role: "user", content: "olá", chave: "npc1", criadoEm: 5 }, { role: "assistant", content: "oi", chave: 42, criadoEm: -3 }]);
  t("NPC: validarHistoricoNpc leva a meta VALIDADA (chave string ok; podre sai)",
    npcMeta[0].chave === "npc1" && npcMeta[0].criadoEm === 5 && npcMeta[1].chave === undefined && npcMeta[1].criadoEm === undefined);

  // ── B) Cliente ↔ PostgREST mockado ──
  console.log("— B) Gestor ↔ PostgREST mockado (o fio REAL provado)");
  await new Promise((r) => { mockRest.listen(PORTA_MOCK_REST, () => r()); });
  const { createClient } = await import(`${RAIZ}/node_modules/@supabase/supabase-js/dist/module/index.js`).catch(() => import("@supabase/supabase-js"));
  const cliMock = createClient(`http://127.0.0.1:${PORTA_MOCK_REST}`, "chave-anonima-de-teste");
  const sessaoUser = { id: USER_ID };
  const gestor = criarGestorHistoricoIa(cliMock, async () => sessaoUser);
  const gestorConvidado = criarGestorHistoricoIa(cliMock, async () => null);

  pedidosRest.length = 0;
  const rConv = await gestorConvidado.carregar("ia");
  t("CONVIDADO honesto: carregar sem sessão → modo 'convidado'", rConv.modo === "convidado");
  t("CONVIDADO honesto: ZERO pedidos ao servidor", pedidosRest.length === 0, `${pedidosRest.length}`);
  const rConvPush = await gestorConvidado.empurrar("npc", SESSAO_NPC, [mA], null);
  t("CONVIDADO honesto: empurrar sem sessão → 'convidado', 0 enviadas, 0 pedidos",
    rConvPush.modo === "convidado" && rConvPush.enviadas === 0 && pedidosRest.length === 0);

  linhasMockRest = [linhaBoa, { ...linhaBoa, papel: "system" }]; // 1 boa + 1 podre
  pedidosRest.length = 0;
  const rCarga = await gestor.carregar("ia");
  t("carregar: modo ok com 1 sessão", rCarga.modo === "ok" && rCarga.sessoes.length === 1);
  t("carregar: linha podre descartada COM contagem honesta", rCarga.descartadas === 1);
  const get = pedidosRest[0];
  t("carregar: GET na tabela certa com superficie/order/limit do fio",
    get?.metodo === "GET" && get.caminho.includes("/rest/v1/ia_historico") &&
    get.caminho.includes("superficie=eq.ia") && get.caminho.includes("order=criada_em.asc"),
    get?.caminho);

  pedidosRest.length = 0;
  const troca = carimbarMensagens([mA, mB], "conv-1", 0).mensagens;
  const rPush = await gestor.empurrar("ia", "conv-1", troca, "guia");
  const post = pedidosRest[0];
  t("empurrar: modo ok, 2 enviadas", rPush.modo === "ok" && rPush.enviadas === 2, JSON.stringify(rPush));
  t("empurrar: POST idempotente — on_conflict=user_id,chave NO FIO (vírgula URL-encoded conta)",
    post?.metodo === "POST" && decodeURIComponent(post.caminho).includes("on_conflict=user_id,chave"), post?.caminho);
  t("empurrar: Prefer resolution=ignore-duplicates NO FIO",
    post?.prefer.includes("resolution=ignore-duplicates"), post?.prefer);
  const corpoPost = Array.isArray(post?.corpo) ? post.corpo : [];
  t("empurrar: linhas com user_id/superficie/sessao/papel/conteudo/criada_em",
    corpoPost.length === 2 && corpoPost[0].user_id === USER_ID && corpoPost[0].superficie === "ia" &&
    corpoPost[0].sessao === "conv-1" && corpoPost[0].papel === "utilizador" &&
    typeof corpoPost[0].criada_em === "string" && corpoPost[0].criada_por_cliente === 100,
    JSON.stringify(corpoPost[0] ?? {}));
  t("empurrar: persona vai SÓ nas perguntas (resposta null — nunca inventada)",
    corpoPost[0].persona === "guia" && corpoPost[1].persona === null);
  pedidosRest.length = 0;
  const rPushVazio = await gestor.empurrar("ia", "conv-1", [], null);
  t("empurrar: vazio → ok 0, ZERO pedidos (não mexe no servidor à toa)", rPushVazio.enviadas === 0 && pedidosRest.length === 0);

  pedidosRest.length = 0;
  await gestor.apagarSessao("npc", SESSAO_NPC);
  const del = pedidosRest[0];
  t("apagarSessao: DELETE com os DOIS filtros (superficie+sessao — RLS limita o user)",
    del?.metodo === "DELETE" && del.caminho.includes("superficie=eq.npc") && del.caminho.includes(`sessao=eq.${SESSAO_NPC}`), del?.caminho);
  pedidosRest.length = 0;
  await gestor.apagarTudo("ia");
  const delTudo = pedidosRest[0];
  t("apagarTudo: DELETE por superfície com filtro válido do PostgREST",
    delTudo?.metodo === "DELETE" && delTudo.caminho.includes("superficie=eq.ia"), delTudo?.caminho);

  modoMockRest = "pgrst205";
  const rMig = await gestor.carregar("ia");
  t("migração pendente: PGRST205 → modo 'migracao' (declara, nunca finge)", rMig.modo === "migracao");
  const rMigPush = await gestor.empurrar("ia", "conv-1", troca, null);
  t("migração pendente: empurrar → 'migracao' sem erro falso", rMigPush.modo === "migracao");
  modoMockRest = "erro500";
  const rErro = await gestor.carregar("npc");
  t("erro real do servidor: modo 'erro' com o MOTIVO real", rErro.modo === "erro" && (rErro.motivo ?? "").includes("explosão"), rErro.motivo);
  modoMockRest = "ok";

  // ── C) Supabase REAL (skippável honesta) ──
  console.log("— C) Supabase REAL (a migração foi aplicada?)");
  let envReal = {};
  try {
    const cru = readFileSync(join(RAIZ, ".env"), "utf8");
    for (const linha of cru.split("\n")) {
      const m = linha.match(/^([A-Z_]+)=(.*)\s*$/);
      if (m && !envReal[m[1]]) envReal[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
    }
  } catch {}
  const urlReal = envReal.VITE_SUPABASE_URL || envReal.SUPABASE_URL;
  const chaveReal = envReal.VITE_SUPABASE_PUBLISHABLE_KEY || envReal.SUPABASE_PUBLISHABLE_KEY;
  if (!urlReal || !chaveReal) {
    skip("Supabase real", "sem VITE_SUPABASE_URL/KEY no .env");
  } else {
    const cliReal = createClient(urlReal, chaveReal);
    const { data: dadosAnon, error: erroAnon } = await cliReal.from("ia_historico").select("*").limit(1);
    if (erroAnon && (erroAnon.code === "PGRST205" || /could not find the table/i.test(erroAnon.message ?? ""))) {
      skip("Supabase real: tabela ia_historico", `migração ainda não aplicada — SQL no repo: supabase/migrations/20261117_ia_historico.sql (Dashboard → SQL Editor)`);
    } else if (erroAnon) {
      t("Supabase real: tabela responde (erro HONESTO declarado)", true, `${erroAnon.code}: ${String(erroAnon.message).slice(0, 80)}`);
    } else {
      t("Supabase real: tabela ia_historico EXISTE e o RLS bloqueia o anónimo", Array.isArray(dadosAnon) && dadosAnon.length === 0, `${dadosAnon?.length} linhas visíveis para anon`);
      // signUp REAL — se o projecto não exigir confirmação de email, o ciclo
      // completo corre DE VERDADE (push → pull → apagar no Supabase vivo)
      const email = `v58-${Date.now()}@teste.bateu.local`;
      const { data: signup, error: erroSignup } = await cliReal.auth.signUp({ email, password: `V58-${Math.random().toString(36).slice(2)}x!` });
      if (erroSignup) {
        skip("Supabase real: signUp", `${erroSignup.code ?? ""} ${String(erroSignup.message).slice(0, 80)}`);
      } else if (!signup?.session) {
        skip("Supabase real: ciclo autenticado", "projecto exige confirmação de email — o UI declara 'convidado' até à sessão (honesto)");
      } else {
        const gestorReal = criarGestorHistoricoIa(cliReal, async () => ({ id: signup.session?.user?.id ?? USER_ID }));
        const trocaReal = carimbarMensagens(
          [
            { papel: "utilizador", conteudo: "Teste REAL v58: quanto custa o bilhete?", criadoEm: Date.now() - 10 },
            { papel: "assistente", conteudo: "Teste REAL v58: resposta curta.", criadoEm: Date.now(), tokens: 19 },
          ],
          `conv-v58-real`,
          0,
        ).mensagens;
        const push = await gestorReal.empurrar("ia", "conv-v58-real", trocaReal, "assistente");
        t("REAL: empurrar 2 linhas para o Supabase vivo", push.modo === "ok" && push.enviadas === 2, JSON.stringify(push));
        const carga = await gestorReal.carregar("ia");
        const sessaoReal = carga.sessoes.find((s) => s.sessao === "conv-v58-real");
        t("REAL: puxar de volta as MESMAS 2 linhas (merge pelos chaves reais)",
          carga.modo === "ok" && sessaoReal?.mensagens.length === 2 &&
          sessaoReal?.mensagens[0].conteudo.includes("Teste REAL v58"), JSON.stringify(carga.motivo ?? ""));
        const push2 = await gestorReal.empurrar("ia", "conv-v58-real", trocaReal, "assistente");
        t("REAL: reempurrar AS MESMAS chaves NÃO duplica (idempotência viva)", push2.modo === "ok");
        const carga2 = await gestorReal.carregar("ia");
        t("REAL: ainda 2 linhas depois do re-push", carga2.sessoes.find((s) => s.sessao === "conv-v58-real")?.mensagens.length === 2);
        const apagar = await gestorReal.apagarTudo("ia");
        const carga3 = await gestorReal.carregar("ia");
        t("REAL: apagarTudo limpa a superfície do utilizador",
          apagar.modo === "ok" && !(carga3.sessoes.find((s) => s.sessao === "conv-v58-real")), JSON.stringify(apagar));
        await cliReal.auth.signOut().catch(() => {});
      }
    }
  }

  // ── D) E2E Playwright ──
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    console.log("— D) E2E Playwright (/ia + /cidade com o NPC)");
    let chromium = null;
    try { ({ chromium } = await import("playwright")); } catch {}
    if (!chromium) {
      skip("E2E (browser)", "playwright indisponível");
    } else {
      mkdirSync(join(RAIZ, "shots-v58"), { recursive: true });
      const proxyEnv = { IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_ENVFILE: ".env.ia" };
      if (!existsSync(join(RAIZ, ".env.ia"))) proxyEnv.IA_ENVFILE = "none";
      const proxy = correr("node", ["server/ia-proxy.mjs"], proxyEnv);
      const proxyNoAr = await esperarAte(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`, (r) => r.status === 200, 20000);
      t("proxy v58 no ar", proxyNoAr);
      if (proxyNoAr) {
        const saude = await (await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`)).json();
        t("saúde declara v58", saude.versão === "v58", saude.versão);
        t("saúde NUNCA revela a chave", JSON.stringify(saude).toLowerCase().includes("nvapi") === false);
      }

      const viteEnv = {
        VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`,
        VITE_IA_ENDPOINT_VETORES: `http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`,
      };
      const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], viteEnv);
      const viteNoAr = await esperarAte(`${BASE}/ia`, (r) => r.status === 200, 60000);
      t("vite dev no ar em 8099", viteNoAr);

      const NOISE = [
        "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
        "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
        "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture",
        "401", "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "apikey", "Auth",
        "Failed to fetch", "TypeError", "NetworkError", "pointer", "three", "THREE", "WebGL",
      ];
      const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
      const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
      const consoleErros = [];
      page.on("pageerror", (e) => consoleErros.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) consoleErros.push(m.text()); });

      // honestidade PROVADA: qualquer pedido a ia_historico fica registado
      // (convidado tem de fazer ZERO — o servidor nunca é tocado)
      let pedidosHistorico = 0;
      await page.route(/\/rest\/v1\/ia_historico/, (route) => { pedidosHistorico++; route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "bloqueado no teste" }) }); });

      // clima mockado para o contexto do NPC (padrão v57)
      await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
        route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
      await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
        route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));

      // ── /ia: badge honesto + chat regresso ──
      await page.goto(`${BASE}/ia`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="ia-sinc-estado"]', { timeout: 20000 }).catch(() => {});
      const sincTexto = await page.getByTestId("ia-sinc-estado").textContent().catch(() => "");
      t("/ia: badge de sincronização visível", !!sincTexto, sincTexto ?? "");
      t("/ia: CONVIDADO declara 'só neste dispositivo' (nunca finge sincronizado)",
        /Só neste dispositivo/i.test(sincTexto ?? ""), sincTexto ?? "");
      t("/ia: CONVIDADO fez ZERO pedidos ao histórico do servidor", pedidosHistorico === 0, `${pedidosHistorico}`);

      await page.getByTestId("ia-caixa").fill("Qual é o horário do suporte?");
      await page.getByTestId("ia-enviar").click();
      let respondeu = false;
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        const txt = await page.getByTestId("ia-mensagens").textContent().catch(() => "");
        if (txt && txt.includes("mock v58")) { respondeu = true; break; }
      }
      t("/ia: chat regresso — resposta em streaming do upstream", respondeu);
      t("/ia: meta da sincronização NUNCA entra no corpo do chat (fio limpo)",
        ultimoCorpoChat?.messages?.every((m) => !("chave" in m) && !("criadoEm" in m)) === true,
        JSON.stringify(ultimoCorpoChat?.messages ?? []).slice(0, 120));
      t("/ia: convidado não empurrou nada ao servidor (0 pedidos até aqui)", pedidosHistorico === 0, `${pedidosHistorico}`);
      await page.screenshot({ path: join(RAIZ, "shots-v58", "ia-sinc-convidado.png") });

      // ── /cidade: NPC com chip honesto ──
      await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
      await page.waitForFunction(
        () => { const el = document.querySelector("[data-testid=cd-clima-inicio]"); return el && /26[.,]4/.test(el.textContent ?? ""); },
        null, { timeout: 12000 },
      ).catch(() => {});
      await page.getByTestId("cd-entrar").click();
      await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 20000 }).catch(() => {});
      await page.evaluate(() => window.__cidade.pump(30));
      await sleep(900);
      await page.evaluate(() => window.__cidade?.npcAbrir?.());
      await sleep(600);
      const painel = await page.getByTestId("cd-npc-painel").isVisible().catch(() => false);
      t("cidade: painel do NPC abre", painel);
      // o chip passa de «aSincronizar» (transitório honesto) a um estado final —
      // espera a transição (o getSession é local, mas o rAF do sandbox é lento)
      await page.waitForFunction(
        () => { const el = document.querySelector("[data-testid=cd-npc-sinc]"); return el && !/A sincronizar/i.test(el.textContent ?? ""); },
        null, { timeout: 10000 },
      ).catch(() => {});
      const sincNpc = await page.getByTestId("cd-npc-sinc").textContent().catch(() => "");
      t("cidade: chip do NPC declara 'só neste dispositivo' (convidado honesto)",
        /Só neste dispositivo/i.test(sincNpc ?? ""), sincNpc ?? "");
      await page.getByTestId("cd-npc-sugestao-0").click();
      let npcRespondeu = false;
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        const txt = await page.getByTestId("cd-npc-mensagens").textContent().catch(() => "");
        if (txt && txt.includes("mock v58")) { npcRespondeu = true; break; }
      }
      t("cidade: NPC responde em streaming (persona+contexto intatos)", npcRespondeu);
      t("cidade: convidado fez ZERO pedidos ao histórico durante a conversa", pedidosHistorico === 0, `${pedidosHistorico}`);
      await page.screenshot({ path: join(RAIZ, "shots-v58", "npc-praca-v58.png") });

      const errosReais = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
      t("zero erros de console (sem ruído)", errosReais.length === 0, errosReais.slice(0, 3).join(" | "));

      await browser.close().catch(() => {});
    }
  }

  // ── Fecho ──
  console.log(`\n${"═".repeat(58)}`);
  console.log(`  VERDES: ${ok}  ·  FALHAS: ${fail}  ·  SKIPS: ${skips}`);
  if (fail) { console.log("  FALHAS:"); for (const f of falhas) console.log("   ·", f); }
  console.log(`${"═".repeat(58)}\n`);
}

// ── Boot ──
await mockNvidia.listen(PORTA_MOCK, () => {});
main()
  .catch((e) => { console.error("CRASH:", e); fail++; })
  .finally(() => {
    matarTodos();
    try { mockNvidia.close(); } catch {}
    try { mockRest.close(); } catch {}
    process.exit(fail ? 1 : 0);
  });
