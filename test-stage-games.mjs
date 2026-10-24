// ============================================================
// E2E — JOGOS DE PALCO para empresas (v27)
// REA dos melhores do mundo: roleta de prémios (wheelofnames),
// quiz Milionário (modo apresentador), sorteio de comentários
// (commentpicker), orçamento com teto e conformidade social.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-stage-games.mjs
// ============================================================

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting", "same key",
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "ERR_", "net::", "404", "403", "429", "favicon", "vite", "React DevTools",
  "Download the React DevTools", "sourcemap", "Sourcemap", "auto_reconnect",
  "will be deprecated", "aria-hidden", "third-party cookie", "Third-party cookie",
  "AudioContext", "audio", "autoplay", "user gesture",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitText(page, pattern, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      // texto vem para o Node e o regex corre AQUI — imune a anomalias de
      // RegExp/serialização dentro da página (fazia o quiz falhar intermitente)
      const txt = await page.evaluate(() => document.body.innerText);
      if (pattern.test(txt)) return true;
    } catch {}
    await page.waitForTimeout(500);
  }
  return false;
}

// ── configuração determinística semeada no localStorage ──────
// NOTA: addInitScript serializa a função SEM closures — os dados
// têm de passar como argumento (JSON-serializável).
const seedFn = (list) => {
  for (const c of list || []) {
    try { localStorage.setItem(`bw_stage_cfg_v1_${c.liveId}`, JSON.stringify(c)); } catch {}
  }
};
const mkCfg = (over = {}) => ({
  liveId: "test-live",
  title: "Live da Empresa Teste",
  game: "roleta",
  brand: { name: "Empresa Teste", slogan: "Prémios ao vivo", primaryColor: "#f59e0b" },
  segments: [
    { id: "s1", label: "Voucher Teste", color: "#ef4444", weight: 3, cost: 500, active: true },
    { id: "s2", label: "Produto Teste", color: "#22c55e", weight: 2, cost: 800, active: true },
    { id: "s3", label: "Desconto Teste", color: "#3b82f6", weight: 3, cost: 150, active: true },
    { id: "s4", label: "Tente outra vez", color: "#3f3f46", weight: 2, cost: 0, active: true },
  ],
  entries: [
    { user: "ana_silva", text: "quero" }, { user: "joao_m", text: "vou" },
    { user: "fatima_k", text: "amo" }, { user: "tarcisio_z", text: "boa" },
    { user: "linda_a", text: "terceira" },
  ],
  questions: [
    { id: "q1", question: "Capital de Moçambique?", options: ["Maputo", "Matola", "Beira", "Nampula"], correct: 0 },
    { id: "q2", question: "Quantos dias tem a semana?", options: ["5", "6", "7", "8"], correct: 2 },
    { id: "q3", question: "Teste final?", options: ["A", "B", "C", "D"], correct: 1 },
  ],
  ladder: [100, 200, 300, 500, 1000, 2000],
  budget: { enabled: true, total: 5000, spent: 0, currency: "MZN" },
  compliance: { platforms: ["instagram", "facebook"], minAge: "18", noEntryFee: true, rules: "" },
  options: { spinSeconds: 3, autoRemoveWinner: false, showOdds: true, sound: false, showDisclaimer: true },
  draws: [],
  updatedAt: Date.now(),
  ...over,
});

async function main() {
  console.log(`\n🎪 JOGOS DE PALCO E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"], executablePath: process.env.PW_CHROME || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => {
    const msg = String(e?.message || e);
    if (!NOISE.some((n) => msg.includes(n))) pageErrors.push(msg);
  });

  // ═══════════ 1. ESTÚDIO DE JOGOS ═══════════
  console.log("▶ Estúdio de Jogos (controlo total antes da live)");
  await page.addInitScript(seedFn, [mkCfg()]);
  await page.goto(`${BASE}/estudio-jogos/test-live`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const studio = await waitText(page, /Estúdio de Jogos de Palco/i);
  ok("página do estúdio carrega", studio);

  ok("seleção dos 3 jogos (roleta/quiz/comentários)",
    (await page.locator('[data-testid="studio-game-roleta"]').count()) === 1 &&
    (await page.locator('[data-testid="studio-game-quiz"]').count()) === 1 &&
    (await page.locator('[data-testid="studio-game-comentarios"]').count()) === 1);

  ok("editor de prémios da roleta com 4 segmentos",
    (await page.locator('[data-testid="studio-segments"] li').count()) === 4);

  await page.locator('[data-testid="studio-add-segment"]').click();
  ok("adicionar prémio funciona (5 segmentos)",
    (await page.locator('[data-testid="studio-segments"] li').count()) === 5);

  // quiz
  await page.locator('[data-testid="studio-game-quiz"]').click();
  await sleep(400);
  ok("editor de perguntas do quiz abre",
    (await page.locator('[data-testid="studio-questions"]').count()) === 1);

  // personalização
  await page.getByRole("button", { name: /Personalização/i }).click();
  await sleep(300);
  const brandInput = page.locator('[data-testid="studio-brand-name"]');
  await brandInput.fill("Loja da Ana & Filhos");
  const savedBrand = await page.evaluate(() => JSON.parse(localStorage.getItem("bw_stage_cfg_v1_test-live")).brand.name);
  ok("personalização da marca persiste", savedBrand === "Loja da Ana & Filhos");

  // orçamento
  await page.getByRole("button", { name: /Orçamento/i }).click();
  await sleep(300);
  ok("painel de controlo de gastos visível",
    (await page.locator('[data-testid="studio-budget"]').count()) === 1);
  ok("log de prémios (auditável) presente",
    (await page.locator('[data-testid="studio-drawlog"]').count()) === 1);

  // conformidade
  await page.getByRole("button", { name: /Conformidade/i }).click();
  await sleep(300);
  await page.locator('[data-testid="studio-platform-tiktok"]').click();
  await sleep(300);
  const disc = await page.locator('[data-testid="studio-disclaimer-preview"]').innerText().catch(() => "");
  ok("disclaimer oficial do TikTok gerado ao marcar a plataforma", /TikTok/i.test(disc));
  await page.locator('[data-testid="studio-generate-rules"]').click();
  await sleep(400);
  const rules = await page.locator('[data-testid="studio-rules-text"]').inputValue().catch(() => "");
  ok("regulamento gerado contém regras + disclaimer Meta", /REGULAMENTO/i.test(rules) && /não é patrocinada/i.test(rules) && /Meta Platforms/i.test(rules));
  const score = await page.locator('[data-testid="studio-compliance-score"]').innerText();
  ok("checklist de conformidade chega a CONFORME", /CONFORME/.test(score));

  // ═══════════ 2. PALCO — ROLETA ═══════════
  console.log("▶ Palco — Roleta de Prémios (REA wheelofnames)");
  await page.goto(`${BASE}/palco/test-live?game=roleta`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const wheelReady = await waitText(page, /ESPAÇO para girar/i);
  ok("palco da roleta carrega com canvas", wheelReady && (await page.locator('[data-testid="stage-wheel-canvas"]').count()) === 1);
  await page.waitForTimeout(1200); // deixa a transição de página terminar (filter limpa)

  // odds visíveis
  await page.locator('button[aria-label="Probabilidades"]').click();
  await sleep(300);
  const oddsTxt = await page.locator('[data-testid="stage-odds"]').innerText().catch(() => "");
  ok("painel de probabilidades mostra % honesto", /%/.test(oddsTxt) && /Voucher Teste/.test(oddsTxt));

  // girar
  await page.locator('[data-testid="stage-spin"]').click();
  const hasWinner = await page.waitForSelector('[data-testid="stage-winner"]', { timeout: 15000 }).then(() => true).catch(() => false);
  ok("giro termina com banner de vencedor", hasWinner);
  const winnerTxt = hasWinner ? await page.locator('[data-testid="stage-winner"]').innerText() : "";
  ok("banner mostra participantes + probabilidade", /participantes/.test(winnerTxt) && /probabilidade/.test(winnerTxt));

  // histórico auditável
  await sleep(300);
  const hist = await page.locator('[data-testid="stage-history"]').innerText().catch(() => "");
  ok("histórico registra a rodada", /histórico \(\d+\)/i.test(hist) && !/histórico \(0\)/i.test(hist));

  // orçamento descontou (se saiu prémio) e persistiu
  const spentAfter = await page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem("bw_stage_cfg_v1_test-live"));
    return { spent: c.budget.spent, draws: c.draws.length };
  });
  ok("log persistido com custo no orçamento", spentAfter.draws >= 1 && spentAfter.spent >= 0);

  // modo participantes
  await page.getByRole("button", { name: /Participantes/i }).click();
  await sleep(400);
  ok("modo Participantes (roleta de nomes) disponível",
    (await page.locator('button:has-text("Participantes")').count()) >= 1);

  // ═══════════ 3. PALCO — QUIZ MILIONÁRIO ═══════════
  console.log("▶ Palco — Quiz Milionário (modo apresentador)");
  await page.goto(`${BASE}/palco/test-live?game=quiz`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("escada de prémios renderiza", await waitText(page, /escada de pr/i, 45000));
  ok("escada tem nível por pergunta (3)", (await page.locator('[data-testid="stage-ladder"] li').count()) === 3);
  await page.locator('[data-testid="stage-quiz-start"]').click();
  ok("pergunta 1 no palco", await waitText(page, /Capital de Moçambique/i, 8000));

  // 50:50 desativa 2 erradas
  await page.locator('[data-testid="stage-quiz-5050"]').click();
  await sleep(400);
  const disabledOpts = await page.locator('[data-testid="stage-quiz-opt-0"][disabled], [data-testid="stage-quiz-opt-1"][disabled], [data-testid="stage-quiz-opt-2"][disabled], [data-testid="stage-quiz-opt-3"][disabled]').count();
  ok("ajuda 50:50 desativa exatamente 2 opções", disabledOpts === 2);

  // plateia
  await page.locator('[data-testid="stage-quiz-audience-btn"]').click();
  await sleep(400);
  ok("sondagem da plateia aparece", (await page.locator('[data-testid="stage-quiz-audience"]').count()) === 1);

  // escolher a certa, revelar, julgar certo → nível 2
  await page.locator('[data-testid="stage-quiz-opt-0"]').click();
  await page.locator('[data-testid="stage-quiz-reveal"]').click();
  await sleep(400);
  await page.locator('[data-testid="stage-quiz-right"]').click();
  await sleep(600);
  const lvl2 = await page.locator('[data-testid="stage-ladder-current"]').innerText().catch(() => "");
  ok("julgar certo avança para o nível 2", /N ?2|2/.test(lvl2) && /200/.test(lvl2));

  // errar de propósito → fim com prémio garantido (nível seguro N2 não é seguro; garantido = 0)
  await page.locator('[data-testid="stage-quiz-opt-1"]').click(); // errada (certa = 2)
  await page.locator('[data-testid="stage-quiz-reveal"]').click();
  await sleep(300);
  await page.locator('[data-testid="stage-quiz-wrong"]').click();
  await sleep(500);
  ok("julgar errado termina o jogo (fim do jogo)", await waitText(page, /Fim do jogo/i, 30000));
  await page.locator('[data-testid="stage-quiz-reveal"]').count(); // noop

  // ═══════════ 4. PALCO — SORTEIO DE COMENTÁRIOS ═══════════
  console.log("▶ Palco — Sorteio de Comentários (REA commentpicker)");
  await page.goto(`${BASE}/palco/test-live?game=comentarios`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const pickerReady = await waitText(page, /participantes válidos|Sorteio de Comentários/i, 20000);
  await page.waitForTimeout(800);
  ok("palco do sorteio mostra o pool", pickerReady);

  // dedupe: colar lista com duplicados
  await page.locator('[data-testid="stage-picker-input"]').fill("ana_silva: oi\nana_silva: de novo\njoao_m: vou\ncarla_x: novato");
  await sleep(500);
  const poolTxt = await page.locator('[data-testid="stage-picker-stage"]').innerText();
  ok("dedupe remove duplicados (3 participantes)", /3 participantes válidos/.test(poolTxt));

  // filtro por palavra
  await page.locator('[data-testid="stage-picker-filter"]').fill("vou");
  await sleep(400);
  const poolTxt2 = await page.locator('[data-testid="stage-picker-stage"]').innerText();
  ok("filtro por palavra reduz o pool (1)", /1 participantes? válidos?/.test(poolTxt2));
  await page.locator('[data-testid="stage-picker-filter"]').fill("");
  await sleep(400);

  // sortear
  await page.locator('[data-testid="stage-picker-draw"]').click();
  const pickWin = await page.waitForSelector('[data-testid="stage-picker-winner"]', { timeout: 12000 }).then(() => true).catch(() => false);
  ok("sorteio animado elege um vencedor", pickWin);
  await sleep(1500);
  const sessTxt = await page.locator('[data-testid="stage-picker-stage"]').innerText().catch(() => "");
  ok("vencedor sai do pool (3 → 2)", /2 participantes válidos/.test(sessTxt));

  // ═══════════ 5. ORÇAMENTO BLOQUEIA (teto de gastos) ═══════════
  console.log("▶ Controlo de gastos — bloqueio ao esgotar");
  await page.addInitScript(seedFn, [
    mkCfg({ liveId: "test-broke", budget: { enabled: true, total: 500, spent: 500, currency: "MZN" } }),
  ]);
  await page.goto(`${BASE}/palco/test-broke?game=roleta`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitText(page, /ESPAÇO para girar/i, 20000);
  await page.waitForTimeout(1200);
  const spinDisabled = await page.locator('[data-testid="stage-spin"]').isDisabled().catch(() => false);
  ok("GIRAR desativado com orçamento esgotado", spinDisabled);
  const budgetTxt = await page.locator('[data-testid="stage-budget"]').innerText().catch(() => "");
  ok("medidor mostra 0 MZN restante", /0 MZN/.test(budgetTxt));

  // ═══════════ 6. MODO OBS (clean) ═══════════
  console.log("▶ Modo OBS (clean=1)");
  await page.goto(`${BASE}/palco/test-live?game=roleta&clean=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitText(page, /ESPAÇO para girar/i, 20000);
  ok("clean esconde a barra de jogos",
    (await page.locator('[data-testid="stage-tab-quiz"]').count()) === 0);
  ok("clean mantém o disclaimer social no rodapé",
    (await page.locator('[data-testid="stage-disclaimer"]').count()) === 1);

  // ═══════════ 7. INTEGRAÇÃO: estúdio de live do dashboard ═══════════
  console.log("▶ Integração no LiveStudio do dashboard");
  await page.goto(`${BASE}/estudio-jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("estúdio standalone sem id também funciona (sessão demo)", await waitText(page, /Estúdio de Jogos de Palco/i));

  // ═══════════ 8. MOBILE ═══════════
  console.log("▶ Mobile (390×844)");
  const mpage = await ctx.newPage();
  await mpage.setViewportSize({ width: 390, height: 844 });
  await mpage.addInitScript(seedFn, [mkCfg()]);
  await mpage.goto(`${BASE}/palco/test-live?game=roleta`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mpage.waitForTimeout(3500);
  const wheelVisible = await mpage.locator('[data-testid="stage-wheel-canvas"]').isVisible().catch(() => false);
  ok("roleta visível no celular", wheelVisible);
  const spinBtn = await mpage.locator('[data-testid="stage-spin"]').isVisible().catch(() => false);
  ok("botão GIRAR acessível no celular", spinBtn);
  await mpage.close();

  // ── erros de página ──
  ok("0 erros JavaScript não filtrados", pageErrors.length === 0);
  if (pageErrors.length) console.log("  erros:", pageErrors.slice(0, 5));

  await browser.close();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) { console.log("Falhas:", fails.join(" | ")); process.exit(1); }
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
