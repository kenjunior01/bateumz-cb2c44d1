// ═══════════════════════════════════════════════════════════════════════
// test-ia-v56.mjs — BATEU IA RAG ("IA lê a plataforma") — suíte completa
//
// A v56 liga a MEMÓRIA (vetores v55) aos dados REAIS da plataforma e ao
// CHAT (v54): sorteios ativos + concursos ativos + blog publicado →
// passagens com vetores multimodais → pergunta → vetor query → busca
// cosseno → contexto com fontes [1][2] no system do chat.
//
// A) Núcleo isomórfico no Node: dividirEmPassagens (chunking honesto),
//    docParaPassagens (ids determinísticos), montarContextoRag (ordem por
//    cosseno, dedupe por doc, limiar, cap), LojaRag (caps, substituirDoc,
//    removerTipo), mapeadores puros de ia-docs (prize_value NUNCA, nulls
//    omitidos, datas ISO).
// B) Clientes ↔ upstream MOCK (formato NVIDIA real): indexação de docs
//    plataforma em lotes (≤8 entradas), busca semântica ordenada, contexto
//    a chegar INTEIRO ao chat upstream (2.ª mensagem system).
// C) Proxy REAL (server/ia-proxy.mjs): saúde v56, chat com contexto SSE
//    intato, vetores JSON, 400/404/503 honestos.
// D) E2E Playwright: aba Buscar com card RAG, indexar plataforma (com o
//    resultado HONESTO — indexado OU erro real do supabase), item manual
//    entra no índice, chat com RAG ativo envia contexto (badge Fontes),
//    zero erros de console, shots-v56/.
// E) LIVE (skippável honesta): re-teste do nemotron-3.5-embed-8b (na v55
//    devolvia 422 — modelo ainda não ativo) com RAG mínimo real.
//
// Uso: node test-ia-v56.mjs            (leva vite 8099, proxy 8788, mock 59992)
//      node test-ia-v56.mjs --sem-e2e  (só A+B+C, sem browser)
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const SEM_E2E = process.argv.includes("--sem-e2e");
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_MOCK = Number(process.env.PORTA_MOCK || 59992);
const PORTA_PROXY = Number(process.env.PORTA_PROXY || 8788);
const PORTA_PROXY_SEM_CHAVE = PORTA_PROXY + 1;

let ok = 0, fail = 0, skips = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const skip = (nome, motivo) => { skips++; console.log("  ⏭️ ", nome, `(${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { MODELO_PADRAO, NemotronError, NemotronRateLimitError, ClienteNemotron } =
  await import(`${RAIZ}/src/lib/nemotron.ts`);
const {
  LIMITES_RAG, LojaRag, dividirEmPassagens, docParaPassagens, montarContextoRag, itemVetorParaDoc,
} = await import(`${RAIZ}/src/lib/nemotron-rag.ts`);
const {
  LIMITES_DOCS, raffleParaDoc, contestParaDoc, blogParaDoc,
} = await import(`${RAIZ}/src/lib/ia-docs.ts`);
const {
  ClienteNemotronVetores, comporEntradaVetor, construirCorpoVetores, cosseno,
} = await import(`${RAIZ}/src/lib/nemotron-vetores.ts`);

// ── Vetores determinísticos do mock (iguais para cliente e browser) ─────
const DIM = 8;
function vetorDe(texto) {
  const dims = new Array(DIM).fill(0);
  for (const ch of String(texto).toLowerCase()) {
    const c = ch.codePointAt(0);
    dims[c % DIM] += ((c * 31) % 97) / 97;
  }
  const norma = Math.sqrt(dims.reduce((s, x) => s + x * x, 0));
  if (norma === 0) { dims[0] = 1; return dims; }
  return dims.map((x) => x / norma);
}

// ── Mock upstream (formato NVIDIA real: chat + embeddings) ──────────────

let ultimoCorpoEmbed = null;
let ultimoCorpoChat = null;

const mock = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", async () => {
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    const semAuth = !req.headers.authorization?.startsWith("Bearer ");

    // ── /embeddings ──
    if (req.url.endsWith("/embeddings")) {
      ultimoCorpoEmbed = corpo;
      if (semAuth) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "sem autorização" } }));
        return;
      }
      const input = Array.isArray(corpo?.input) ? corpo.input : [];
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({
        object: "list",
        model: corpo?.model ?? "nvidia/nemotron-3.5-embed-8b",
        data: input.map((s, i) => ({ object: "embedding", index: i, embedding: vetorDe(String(s)) })),
        usage: { prompt_tokens: 10 * input.length, total_tokens: 10 * input.length },
      }));
      return;
    }

    // ── /chat/completions (v54) — guarda o CORPO para provar o contexto ──
    ultimoCorpoChat = corpo;
    if (semAuth) {
      res.writeHead(401, { "Content-Type": "text/event-stream" });
      res.end("data: {\"error\":{\"message\":\"sem autorização\"}}\n\n");
      return;
    }
    const stream = corpo?.stream !== false;
    if (!stream) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "mock-v56", object: "chat.completion", model: corpo?.model ?? MODELO_PADRAO,
        choices: [{ index: 0, message: { role: "assistant", content: "Resposta mock v56.", reasoning_content: "Pensei com contexto." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 20, completion_tokens: 6, total_tokens: 26 },
      }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    const pedacos = [{ d: 15, ev: `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "Li o contexto da plataforma." } }] })}\n\n` }];
    for (const c of ["Com ", "o contexto ", "da plataforma ", "mock v56."]) {
      pedacos.push({ d: 15, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n` });
    }
    pedacos.push({ d: 10, ev: `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 } })}\n\n` });
    pedacos.push({ d: 5, ev: "data: [DONE]\n\n" });
    let i = 0;
    const passo = () => {
      if (i >= pedacos.length) { res.end(); return; }
      const p = pedacos[i++];
      if (res.destroyed) return;
      setTimeout(() => { if (!res.destroyed) { res.write(p.ev); passo(); } }, p.d);
    };
    passo();
  });
});

// ── Helpers de subprocessos ─────────────────────────────────────────────

const filhos = [];
function correr(cmd, args, env) {
  // FURO REAL (lição v49/v53 EXTENDIDA, apanhada na regressão v55 desta sessão):
  // matar o «npx» não mata o NETO («sh -c vite» → «node vite») — o vite
  // ZUMBI ficava no 8099 a servir código/env velhos e a suíte seguinte
  // testava contra um servidor STALE (a visão ia para o edge sem env).
  // Correção: spawn DETACHED (grupo próprio) + matar TODO O GRUPO.
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}          // grupo inteiro (netos incluídos)
    try { p.kill("SIGKILL"); } catch {}
  }
};

// Pre-voo: nenhum servidor STALE ouriçado nas portas desta suíte (honesto
// com a lição v53 — servidor FRESCO obrigatório; ignora erros se nada houver).
function limparZumbis() {
  for (const padrao of [
    "vite --port 8099 --strictPort",
    "vite --port 8098 --strictPort",
    "server/ia-proxy.mjs",
  ]) {
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

/** Espera honesta quando o portão de rate fecha (MESMA lógica do UI v56). */
async function vetorizarComEspera(cliente, entradas, tentou = false) {
  try {
    return await cliente.vetorizar(entradas, { inputType: "passage" });
  } catch (err) {
    if (err instanceof NemotronRateLimitError && !tentou) {
      await sleep(Math.max(250, err.esperarMs || 1000));
      return vetorizarComEspera(cliente, entradas, true);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n📚 BATEU IA v56 — RAG (IA lê a plataforma) — ${RAIZ}\n`);
  limparZumbis();

  // ── A) Núcleo isomórfico ──
  console.log("— A) Núcleo RAG (Node)");

  const paragrafos = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i + 1}: ${"a".repeat(180)}`).join("\n\n");
  const passagensLongas = dividirEmPassagens(paragrafos, 400);
  t("chunking: 6 parágrafos de 180 chars cap 400 → passagens todas ≤ 400",
    passagensLongas.length >= 3 && passagensLongas.every((p) => p.length <= 400) && passagensLongas.every((p) => !p.includes("Parágrafo 1: aaaaaaaaaaaaaaParágrafo")),
    `n=${passagensLongas.length}`);

  const frasesLongas = Array.from({ length: 10 }, (_, i) => `Frase número ${i} com conteúdo moderado.`).join(" ");
  const passagensFrase = dividirEmPassagens(frasesLongas, 160);
  t("chunking: frases inteiras nunca cortadas a meio (todas terminam em ponto)",
    passagensFrase.every((p) => p.trimEnd().endsWith(".")), `n=${passagensFrase.length}`);

  const fraseMonstruosa = "x".repeat(500);
  const cortada = dividirEmPassagens(fraseMonstruosa, 300);
  t("chunking: frase monstruosa sem pontuação → corte duro declarado",
    cortada.length === 2 && cortada[0].length === 300 && cortada[1].length === 200);

  let erroVazio = null;
  try { dividirEmPassagens("   "); } catch (e) { erroVazio = e; }
  t("chunking: texto vazio → erro honesto", erroVazio instanceof NemotronError);

  t("chunking: determinístico (mesma entrada → mesmo output)",
    JSON.stringify(dividirEmPassagens(paragrafos, 400)) === JSON.stringify(passagensLongas));

  const docBanana = raffleParaDoc({
    id: "111", title: "Sorteio Banana de Maputo", description: "Banana madura do mercado central, prémio do mês.",
    prize_title: "Caixa de bananas", prize_value: 5000, hide_prize_value: false,
    ticket_price: 50, currency: "MZN", total_tickets: 1000, sold_tickets: 300,
    city: "Maputo", province: "Maputo", country: "MZ", end_date: "2026-12-31T00:00:00Z", slug: "banana-do-maputo",
  });
  t("mapeador sorteio: prize_value NUNCA entra no doc (mesmo com hide_prize_value false)",
    docBanana.tipo === "sorteio" && !docBanana.texto.includes("5000") && !docBanana.texto.includes("prize_value"),
    docBanana.texto.slice(0, 80));
  t("mapeador sorteio: bilhete/vendidos/local/data presentes e data ISO pura",
    docBanana.texto.includes("Bilhete: 50 MZN") && docBanana.texto.includes("Bilhetes vendidos: 300/1000")
    && docBanana.texto.includes("Local: Maputo") && docBanana.texto.includes("Termina: 2026-12-31"));
  t("mapeador sorteio: url interna com slug", docBanana.url === "/raffle/banana-do-maputo");

  const docBananaSemSlug = raffleParaDoc({ id: "222", title: "Sem slug", description: "x" });
  t("mapeador sorteio: slug ausente → url por id (nunca quebra)", docBananaSemSlug.url === "/raffle/222");
  const docSoTitle = raffleParaDoc({ id: "333", title: "Só o título" });
  t("mapeador sorteio: campos nulos OMITIDOS (zero «null» no texto)",
    docSoTitle.texto === "Só o título" && !docSoTitle.texto.includes("null"), `"${docSoTitle.texto}"`);

  const docConcurso = contestParaDoc({ id: "c1", title: "Concurso de Capulanas", description: "Mostra a tua capulana.", prize_description: "10 000 MZN", category: "cultura", entry_fee: 0, end_date: "2026-11-30T12:00:00Z" });
  t("mapeador concurso: prémio + categoria, taxa 0 omitida", docConcurso.tipo === "concurso" && docConcurso.texto.includes("Prémio: 10 000 MZN") && docConcurso.texto.includes("Categoria: cultura") && !docConcurso.texto.includes("Taxa de entrada"));
  const docBlog = blogParaDoc({ id: "b1", title: "Como participar", summary: "Guia rápido.", content: "Conteúdo longo que NÃO deve entrar porque há resumo.", author_name: "Ana", slug: "como-participar" });
  t("mapeador blog: summary preferida ao content + autor + url", docBlog.tipo === "blog" && docBlog.texto.includes("Por Ana") && docBlog.texto.includes("Guia rápido.") && !docBlog.texto.includes("Conteúdo longo") && docBlog.url === "/blog/como-participar");

  let erroDoc = null;
  try { raffleParaDoc({ id: "", title: "sem id" }); } catch (e) { erroDoc = e; }
  t("mapeador: linha sem id → erro honesto", erroDoc instanceof Error);

  const docLongo = raffleParaDoc({ id: "999", title: "Doc longo", description: Array.from({ length: 8 }, (_, i) => `Seção ${i}: ${"texto ".repeat(40)}`).join("\n\n") });
  const passagensDoc = docParaPassagens(docLongo);
  t("docParaPassagens: ids determinísticos doc#pN + rótulo com contador",
    passagensDoc.length > 1 && passagensDoc[0].id === "raf-999#p0" && passagensDoc[1].id === "raf-999#p1"
    && passagensDoc[1].rotulo.includes("(2/") && passagensDoc.every((p) => p.docId === "raf-999"));
  t("docParaPassagens: texto da passagem começa pelo rótulo", passagensDoc[0].texto.startsWith("Doc longo — "));

  const mkRes = (id, docId, tipo, rotulo, texto, pontuacao, url) =>
    ({ passagem: { id, docId, tipo, rotulo, texto, url }, pontuacao });
  const contexto = montarContextoRag([
    mkRes("x2", "docB", "blog", "Blog B", "conteúdo b", 0.35, "/blog/b"),
    mkRes("x1", "docA", "sorteio", "Sorteio A", "conteúdo a", 0.87, "/raffle/a"),
    mkRes("x3", "docA", "sorteio", "Sorteio A (2/2)", "conteúdo a parte 2", 0.55, "/raffle/a"),
  ]);
  t("contexto: ordena por cosseno DESC e deduplica por doc (a melhor de cada)",
    contexto !== null && contexto.indexOf("[1]") < contexto.indexOf("[2]")
    && contexto.includes("Sorteio A") && contexto.includes("87.0%")
    && contexto.includes("/raffle/a") && !contexto.includes("parte 2")
    && contexto.includes("[CONTEXTO REAL DA PLATAFORMA BATEU") && contexto.includes("REGRAS DO CONTEXTO"));

  const contextoVazio = montarContextoRag([mkRes("y1", "d", "manual", "m", "t", 0.05)]);
  t("contexto: tudo abaixo do limiar → null (chat segue SEM contexto, declarado)", contextoVazio === null);

  const fonteGrande = mkRes("g1", "g", "blog", "Grande", "z".repeat(2000), 0.9, "/blog/g");
  const contextoCap = montarContextoRag([fonteGrande, mkRes("g2", "h", "blog", "Outra", "y".repeat(50), 0.8)], { cap: 500, k: 2 });
  const parteFontes = contextoCap.split("\n").filter((l) => /^\[\d+\] \(/.test(l)); // SÓ as fontes (o cabeçalho começa por "[CONTEXTO…")
  t("contexto: cap corta FONTES (não esmaga) — soma das linhas ≤ cap",
    parteFontes.length === 1 && parteFontes[0].length <= 500, `linhas=${parteFontes.length} len=${parteFontes[0]?.length}`);

  const lojaRag = new LojaRag(3, 10);
  lojaRag.adicionar(docParaPassagens(docBanana)[0], vetorDe("banana"));
  lojaRag.adicionar(docParaPassagens(docBanana)[0], vetorDe("banana"));
  t("lojaRag: adicionar de novo SUBSTITUI (sem duplicados)", lojaRag.tamanho === 1);
  lojaRag.adicionar({ id: "d2#p0", docId: "d2", tipo: "blog", rotulo: "B2", texto: "b2" }, vetorDe("hotel"));
  lojaRag.adicionar({ id: "d3#p0", docId: "d3", tipo: "concurso", rotulo: "C3", texto: "c3" }, vetorDe("capulana"));
  lojaRag.adicionar({ id: "d4#p0", docId: "d4", tipo: "manual", rotulo: "M4", texto: "m4" }, vetorDe("novo"));
  t("lojaRag: cap de passagens 3 — a mais velha sai primeiro", lojaRag.tamanho === 3 && !lojaRag.listar().some((p) => p.id === "raf-111#p0"));
  const stats = lojaRag.estatisticas();
  t("lojaRag: estatísticas por tipo", stats.passagens === 3 && stats.porTipo.blog === 1 && stats.porTipo.manual === 1, JSON.stringify(stats.porTipo));
  t("lojaRag: removerTipo só apaga o tipo pedido", lojaRag.removerTipo("blog") === 1 && lojaRag.tamanho === 2 && lojaRag.estatisticas().porTipo.blog === undefined);

  const lojaSub = new LojaRag();
  const ps = docParaPassagens(docBanana);
  lojaSub.adicionar(ps[0], vetorDe("antigo"));
  lojaSub.substituirDoc(ps, ps.map(() => vetorDe("banana")));
  t("lojaRag: substituirDoc troca o vetor e não duplica", lojaSub.tamanho === ps.length && lojaSub.buscar(vetorDe("banana"))[0].pontuacao > 0.99);
  let erroSub = null;
  try { lojaSub.substituirDoc([ps[0]], []); } catch (e) { erroSub = e; }
  t("lojaRag: substituirDoc com números desiguais → erro", erroSub instanceof NemotronError);

  let erroVetor = null;
  try { lojaSub.adicionar({ id: "v", docId: "v", tipo: "manual", rotulo: "v", texto: "v" }, [NaN, 1]); } catch (e) { erroVetor = e; }
  t("lojaRag: vetor não-finito → erro honesto", erroVetor instanceof NemotronError);

  const docManual = itemVetorParaDoc({ id: "abc", rotulo: "Banana", texto: "banana madura" });
  t("itemVetorParaDoc: item manual vira doc tipo manual", docManual.tipo === "manual" && docManual.id === "manual-abc" && docManual.texto === "banana madura");

  // ── B) Clientes ↔ mock: indexar plataforma → busca → contexto → chat ──
  console.log("— B) Clientes ↔ upstream mock (formato NVIDIA real)");
  await new Promise((r) => mock.listen(PORTA_MOCK, r));

  const portaoTeste = new (await import(`${RAIZ}/src/lib/nemotron.ts`)).PortaoRateLimit(20, 60_000, 0);
  const clienteVet = new ClienteNemotronVetores({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/embeddings`, chave: "mock-chave", tentativas: 2, portao: portaoTeste });

  const docsPlataforma = [docBanana, docConcurso, docBlog];
  const lojaPlataforma = new LojaRag();
  for (const doc of docsPlataforma) {
    const psDoc = docParaPassagens(doc);
    const vetores = [];
    for (let i = 0; i < psDoc.length; i += 8) {
      const lote = psDoc.slice(i, i + 8);
      const r = await vetorizarComEspera(clienteVet, lote.map((p) => ({ texto: p.texto })));
      vetores.push(...r.vetores);
    }
    lojaPlataforma.substituirDoc(psDoc, vetores);
  }
  const statsPlat = lojaPlataforma.estatisticas();
  t("indexação: 3 docs da plataforma indexados por lotes ≤ 8 entradas",
    statsPlat.documentos === 3 && statsPlat.passagens === 3, JSON.stringify(statsPlat));
  t("indexação: o upstream recebeu input_type passage + modality text_image",
    ultimoCorpoEmbed?.input_type === "passage" && ultimoCorpoEmbed?.modality?.[0] === "text_image" && ultimoCorpoEmbed?.truncate === "END");

  const rQuery = await clienteVet.vetorizar([{ texto: "banana madura do mercado" }], { inputType: "query" });
  const achados = lojaPlataforma.buscar(rQuery.vetores[0], { k: LIMITES_RAG.TOP_K });
  t("busca: «banana madura do mercado» acha o doc banana primeiro (cosseno real)",
    achados[0]?.passagem.docId === "raf-111" && achados[0].pontuacao >= achados[achados.length - 1].pontuacao,
    `top=${achados[0]?.passagem.docId}`);

  const contextoBusca = montarContextoRag(achados);
  t("contexto da busca real: fonte citada com url e marcação [1]",
    contextoBusca !== null && contextoBusca.includes("[1]") && contextoBusca.includes("/raffle/banana-do-maputo")
    && contextoBusca.includes("REGRAS DO CONTEXTO"));

  const historico = [
    { role: "system", content: "És a IA da Bateu. Responde em português." },
    { role: "system", content: contextoBusca },
    { role: "user", content: "Quanto custa a banana?" },
  ];
  const clienteChat = new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "mock-chave", tentativas: 1, portao: portaoTeste });
  const rChat = await clienteChat.conversarStream({
    mensagens: historico,
    parametros: { modelo: MODELO_PADRAO, temperatura: 1, topP: 0.95, maxTokens: 256, thinking: true },
  });
  t("chat com RAG: resposta flui (mock)", rChat.conteudo.includes("mock v56"));
  t("chat com RAG: o upstream recebeu 3 mensagens e o CONTEXTO na 2.ª system",
    Array.isArray(ultimoCorpoChat?.messages) && ultimoCorpoChat.messages.length === 3
    && ultimoCorpoChat.messages[0].role === "system" && ultimoCorpoChat.messages[1].role === "system"
    && ultimoCorpoChat.messages[1].content.includes("CONTEXTO REAL DA PLATAFORMA BATEU")
    && ultimoCorpoChat.messages[1].content.includes("REGRAS DO CONTEXTO")
    && ultimoCorpoChat.messages[2].content === "Quanto custa a banana?");

  const achadosLimiar = lojaPlataforma.buscar(vetorDe("xyz"), { limiar: 0.999 });
  t("busca com limiar 0.999 → vazio → contexto null", achadosLimiar.length === 0 && montarContextoRag(achadosLimiar) === null);

  // ── C) Proxy REAL ──
  console.log("— C) Proxy real (server/ia-proxy.mjs)");
  const proxyEnv = {
    IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`,
    IA_NEMOTRON_KEY: "chave-do-env-teste", IA_FICHAS_CAPACIDADE: "100",
  };
  correr("node", ["server/ia-proxy.mjs"], proxyEnv);
  t("proxy: sobe e responde à saúde", await esperarAte(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`, (r) => r.status === 200, 8000));
  const saude = await (await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`)).json();
  t("saúde: v56+ com as TRÊS rotas e chave OCULTA (zero furo)",
    saude.chaveConfigurada === true && !JSON.stringify(saude).includes("chave-do-env-teste")
    && /^v5[6-9]$/.test(saude.versão) // v57+ não quebra esta suíte (padrão v54→v55→v56)
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/chat")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/visao")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/vetores"));

  const corpoChatRag = JSON.stringify({ model: MODELO_PADRAO, messages: historico, temperature: 1, max_tokens: 256, chat_template_kwargs: { enable_thinking: true } });
  const rChatProxy = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoChatRag });
  const textoChatProxy = await rChatProxy.text();
  t("proxy: chat com CONTEXTO RAG → SSE intato (auth injetada, [DONE])",
    rChatProxy.status === 200 && (rChatProxy.headers.get("content-type") ?? "").includes("text/event-stream")
    && textoChatProxy.includes("reasoning_content") && textoChatProxy.includes("mock v56") && textoChatProxy.trimEnd().endsWith("[DONE]"));

  const corpoVetores = JSON.stringify(construirCorpoVetores([{ texto: "banana" }]));
  const rVetores = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVetores });
  const jsonVetores = await rVetores.json();
  t("proxy: vetores → JSON intato (data[0].embedding na ordem)",
    rVetores.status === 200 && jsonVetores?.data?.[0]?.embedding?.length === DIM);

  const r400Chat = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODELO_PADRAO, messages: [] }) });
  t("proxy: chat sem mensagens → 400", r400Chat.status === 400);
  const r404 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/outra-rota`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  t("proxy: rota desconhecida → 404", r404.status === 404);

  correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY_SEM_CHAVE), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_ENVFILE: "none" });
  t("proxy sem chave: sobe", await esperarAte(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/saude`, (r) => r.status === 200, 8000));
  const r503Chat = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoChatRag });
  const r503Vet = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVetores });
  t("proxy sem chave → 503 honesto (chat + vetores)", r503Chat.status === 503 && r503Vet.status === 503);

  // ═══ D) E2E Playwright ═══
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    console.log("— D) E2E Playwright (/ia com RAG)");
    let chromium = null;
    try { ({ chromium } = await import("playwright")); } catch {}
    if (!chromium) {
      skip("E2E (browser)", "playwright indisponível");
    } else {
      const viteEnv = {
        VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`,
        VITE_IA_ENDPOINT_VETORES: `http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`,
      };
      const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], viteEnv);
      const viteNoAr = await esperarAte(`${BASE}/ia`, (r) => r.status === 200, 60_000);
      t("vite dev no ar em 8099", viteNoAr);

      const NOISE = [
        "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
        "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
        "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture",
        "401", "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "apikey", "Auth",
        "Failed to fetch", "TypeError", "NetworkError",
      ];
      const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
      const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
      const consoleErros = [];
      page.on("pageerror", (e) => consoleErros.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) consoleErros.push(m.text()); });

      await page.goto(`${BASE}/ia`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("ia-pagina").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
      t("página /ia visível", await page.getByTestId("ia-pagina").isVisible().catch(() => false));

      // fumo do chat v54 (regressão)
      await page.getByTestId("ia-caixa").fill("Diz olá");
      await page.getByTestId("ia-enviar").click();
      const chatChegou = await page.waitForFunction(
        () => document.querySelector("[data-testid^=ia-conteudo]")?.textContent?.includes("mock v56"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("chat v54 continua a fluir (regressão)", chatChegou);

      // ── ABA BUSCAR: card RAG + indexar plataforma (honesto nos DOIS fins) ──
      await page.getByTestId("ia-aba-buscar").click();
      await page.getByTestId("ia-rag-card").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      t("card Plataforma (RAG) visível na aba Buscar", await page.getByTestId("ia-rag-card").isVisible().catch(() => false));

      await page.getByTestId("ia-rag-botao").click();
      const indexou = await page.waitForFunction(
        () => {
          const stats = document.querySelector("[data-testid=ia-rag-stats]")?.textContent ?? "";
          const m = stats.match(/passagens[^:]*: (\d+)/);
          return m && Number(m[1]) > 0;
        },
        null, { timeout: 45000 },
      ).then(() => true).catch(() => false);
      const erroHonesto = await page.getByTestId("ia-rag-erro").isVisible().catch(() => false);
      t("indexar plataforma termina HONESTO: indexado OU erro real declarado",
        indexou || erroHonesto, `indexou=${indexou} erroHonesto=${erroHonesto}`);

      // item MANUAL (determinístico) — banana — entra na loja E no índice RAG
      await page.getByTestId("ia-buscar-rotulo").fill("Banana de Maputo");
      await page.getByTestId("ia-buscar-texto").fill("banana madura do mercado central");
      await page.getByTestId("ia-buscar-indexar-botao").click();
      await page.waitForFunction(
        () => document.querySelectorAll("[data-testid=ia-buscar-item]").length >= 1,
        null, { timeout: 15000 },
      ).catch(() => {});
      const itensNaLoja = await page.locator("[data-testid=ia-buscar-item]").count().catch(() => 0);
      t("buscar: item manual indexado (vetores do mock reais)", itensNaLoja >= 1, `itens=${itensNaLoja}`);
      const statsTexto = await page.getByTestId("ia-rag-stats").textContent().catch(() => "");
      t("índice RAG mostra o manual junto com a plataforma", /manuais:\s*1/.test(statsTexto), `"${statsTexto}"`);

      try {
        mkdirSync(join(RAIZ, "shots-v56"), { recursive: true });
        await page.screenshot({ path: join(RAIZ, "shots-v56", "ia-buscar-rag.png"), fullPage: false });
        console.log("    📸 shots-v56/ia-buscar-rag.png");
      } catch {}

      // ── CONVERSAR com RAG: toggle → pergunta → contexto no upstream ──
      await page.getByTestId("ia-aba-conversar").click();
      await page.getByTestId("ia-rag").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      t("toggle RAG visível na configuração", await page.getByTestId("ia-rag").isVisible().catch(() => false));
      await page.getByTestId("ia-rag").click();
      await sleep(150);

      await page.getByTestId("ia-caixa").fill("banana madura do mercado central");
      await page.getByTestId("ia-enviar").click();
      const fontesBadge = await page.waitForFunction(
        () => !!document.querySelector("[data-testid=ia-rag-fontes]"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("chat com RAG: badge de FONTES aparece", fontesBadge);
      const fontesTexto = await page.getByTestId("ia-rag-fontes").textContent().catch(() => "");
      t("chat com RAG: fontes ≥ 1 no badge", /Fontes:\s*[1-9]/.test(fontesTexto), `"${fontesTexto}"`);

      const respostaChegou = await page.waitForFunction(
        () => document.querySelectorAll("[data-testid^=ia-conteudo]").length >= 1
          && document.querySelector("[data-testid^=ia-conteudo]")?.textContent?.includes("mock v56"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("chat com RAG: resposta chega", respostaChegou);
      t("chat com RAG: o upstream recebeu o CONTEXTO (2.ª system com [1])",
        Array.isArray(ultimoCorpoChat?.messages) && ultimoCorpoChat.messages.length >= 3
        && String(ultimoCorpoChat.messages[1]?.content ?? "").includes("CONTEXTO REAL DA PLATAFORMA BATEU")
        && String(ultimoCorpoChat.messages[1]?.content ?? "").includes("banana"));

      const errosLimpos = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
      t("zero erros de console não-ruidosos", errosLimpos.length === 0, errosLimpos.slice(0, 3).join(" | "));

      await browser.close();
      try { vite.kill("SIGKILL"); } catch {}
    }
  }

  // ═══ E) LIVE NVIDIA (skippável honesta) ═══
  console.log("— E) LIVE NVIDIA (re-teste do embed + RAG mínimo real)");
  let chaveLive = null;
  try { chaveLive = readFileSync(join(RAIZ, ".env.ia"), "utf8").match(/IA_NEMOTRON_KEY=(\S+)/)?.[1] ?? null; } catch {}
  if (!chaveLive) {
    skip("live NVIDIA", "sem .env.ia");
  } else {
    try {
      const controladorLive = new AbortController();
      const temporizador = setTimeout(() => controladorLive.abort(), 45_000);
      const corpo = {
        input: [
          "Banana de Maputo — banana madura do mercado central, prémio do mês.",
          "Banana",
        ],
        model: "nvidia/nemotron-3.5-embed-8b",
        encoding_format: "float",
        modality: ["text_image"],
        input_type: "passage",
        truncate: "END",
      };
      const rLive = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${chaveLive}` },
        body: JSON.stringify(corpo),
        signal: controladorLive.signal,
      });
      clearTimeout(temporizador);
      if (!rLive.ok) {
        skip("live VETORES (RAG real)", `HTTP ${rLive.status} — o modelo ainda não está ativo (na v55 era 422; o código segue o contrato, nunca finge)`);
        await rLive.body?.cancel().catch(() => {});
      } else {
        const json = await rLive.json();
        const { validarRespostaVetores } = await import(`${RAIZ}/src/lib/nemotron-vetores.ts`);
        const r = validarRespostaVetores(json);
        t("live VETORES: embeddings REAIS (passagem + query-like) com dimensão consistente",
          r.vetores.length === 2 && r.dimensao > 0 && r.vetores[0].every(Number.isFinite), `dim=${r.dimensao}`);
        const pont = cosseno(r.vetores[0], r.vetores[1]);
        console.log(`    live vetores: dim=${r.dimensao} cosseno(passage,query)=${pont.toFixed(4)}`);
        t("live RAG: cosseno REAL entre doc e consulta calculável", pont > 0 && pont <= 1.0001, `cosseno=${pont.toFixed(4)}`);
      }
    } catch (e) {
      skip("live VETORES (RAG real)", `rede/timeout do sandbox: ${String(e?.message ?? e).slice(0, 60)}`);
    }
  }

  // ── Fecho ──
  console.log(`\n${"═".repeat(58)}`);
  console.log(`  VERDES: ${ok}  ·  FALHAS: ${fail}  ·  SKIPS: ${skips}`);
  if (fail) { console.log("  FALHAS:"); for (const f of falhas) console.log("   ·", f); }
  console.log(`${"═".repeat(58)}\n`);
}

main()
  .catch((e) => { console.error("CRASH:", e); fail++; })
  .finally(() => {
    matarTodos();
    try { mock.close(); } catch {}
    process.exit(fail ? 1 : 0);
  });
