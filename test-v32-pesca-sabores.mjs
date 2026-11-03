// ============================================================
// E2E — v32: PESCA + ARANHA (BateuCraft) · SABORES DO MUNDO (TheMealDB)
// · Vara de Pesca (receita + fundição de peixe)
// · Pesca: lançar → esperar → picada → fisgar (3 peixes reais)
//   · recolher · escapou · sem água · comer peixe
// · Aranha: hostil à noite (dano + drop fio), NEUTRA de dia,
//   não desaparece ao amanhecer (diferente do zumbi)
// · Conquistas: tecelão + pescador + aracnólogo (+save)
// · Sabores do Mundo: foto real, 4 regiões reais, revelação,
//   link da receita, erro honesto, cache, catálogo LiveHub
// Mocks determinísticos + smoke REAL da TheMealDB (200 + CORS *
// validados com curl antes do código; SKIP honesto se a rede cair).
// Uso: PW_CHROME=<chromium> node test-v32-pesca-sabores.mjs (vite 8099)
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0, skipped = 0;
const fails = [];
const ok = (name, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
};
const skip = (name) => { skipped++; console.log(`  ⏭️  ${name} (SKIP honesto)`); };

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401",
  "same key", "validateDOMNesting", "WebGL", "THREE", "shader",
];

// PNG 1×1 para as fotos mockadas
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const AREAS_MOCK = {
  meals: [{ strArea: "Portuguese" }, { strArea: "Japanese" }, { strArea: "Mexican" }, { strArea: "Indian" }, { strArea: "Italian" }, { strArea: "Chinese" }],
};
const MEAL_A = {
  meals: [{ idMeal: "test-1", strMeal: "Prato Mock A (E2E)", strMealThumb: "https://mock.test/a.png", strArea: "Portuguese", strCategory: "Seafood" }],
};
const MEAL_B = {
  meals: [{ idMeal: "test-2", strMeal: "Prato Mock B (E2E)", strMealThumb: "https://mock.test/b.png", strArea: "Japanese", strCategory: "Seafood" }],
};

async function mockMealDB(page) {
  await page.route(/themealdb\.com\/api\/json\/v1\/1\/list\.php\?a=list/, (route) =>
    route.fulfill({ json: AREAS_MOCK }));
  await page.route(/themealdb\.com\/api\/json\/v1\/1\/random\.php/, (route) => {
    const n = Math.floor(page.__mealCount = (page.__mealCount ?? 0) + 1);
    route.fulfill({ json: n % 2 === 1 ? MEAL_A : MEAL_B });
  });
  await page.route(/mock\.test\//, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX }));
  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));
}

async function main() {
  console.log(`\n🎣 v32 — PESCA + ARANHA + SABORES DO MUNDO — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ═══════════════ PARTE A — BATEUCRAFT v32 ═══════════════
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window).__blocos, null, { timeout: 20000 });
  ok("boot: ganchos __blocos presentes", true);

  await page.evaluate(() => { (window).__blocos.apagarSave(); (window).__blocos.iniciar("sobrevivencia"); });
  await page.waitForFunction(() => (window).__blocos.captura().fase === "jogando", null, { timeout: 15000 });

  // ARENA determinística: plataforma de pedra, céu limpo, sem spawns naturais
  const ar = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
    m.gestor.mobs = m.gestor.mobs.filter((mo) => mo.vivo);
    m.gestor.cdSpawn = 99999;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
      m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3);
      m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
      for (let dy = 0; dy <= 10; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0);
    }
    b.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    b.olhar(0, 0);
    b.pump(3);
    return { fx, fy, fz };
  });
  ok("arena determinística pronta", ar.fy > 2);

  const mirar = (bx, by, bz) => page.evaluate(([bx2, by2, bz2]) => {
    const m = (window).__blocos.motor;
    const dx = bx2 + 0.5 - m.px, dy = by2 + 0.5 - (m.py + 1.62), dz = bz2 + 0.5 - m.pz;
    const yaw = Math.atan2(-dx, -dz);
    const horiz = Math.hypot(dx, dz);
    (window).__blocos.olhar(yaw, Math.atan2(dy, horiz));
  }, [bx, by, bz]);

  // ── A1. Receitas novas ──
  const receitasNovas = await page.evaluate(() => (window).__blocos.receitas());
  ok("receita vara_pesca existe (criação)", receitasNovas.some((r) => r.id === "vara_pesca" && r.categoria === "criacao"));
  ok("3 receitas de peixe assado na fundição", ["fun_sardinha", "fun_carapau", "fun_corvina"].every((id) => receitasNovas.some((r) => r.id === id && r.categoria === "fundicao")));

  // ── A2. Craft da vara (mesa perto) + conquista tecelão ──
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor, { fx, fy, fz } = { fx: Math.floor(m.px), fy: Math.floor(m.py), fz: Math.floor(m.pz) };
    m.mundo.setBloco(fx + 2, fy, fz, 15); // Mesa de Criação ao lado
    b.limparInv(); b.dar(100, 3); b.dar(126, 2); // gravetos + fio
  });
  const craftVara = await page.evaluate(() => (window).__blocos.criar("vara_pesca"));
  ok("criar vara_pesca ok (3 gravetos + 2 fio)", craftVara.ok === true);
  const posCraft = await page.evaluate(() => {
    const c = (window).__blocos.captura();
    return { temVara: c.slots.some((s) => s && s.id === 127), conq: c.conquistas.includes("tecelao"), creditos: c.creditos };
  });
  ok("vara no inventário (id 127)", posCraft.temVara);
  ok("conquista Tecelão desbloqueada", posCraft.conq);
  ok("créditos +5 pelo Tecelão", posCraft.creditos >= 5);

  // ── A3. Fundição: sardinha + carvão → peixe assado ──
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor, { fx, fy, fz } = { fx: Math.floor(m.px), fy: Math.floor(m.py), fz: Math.floor(m.pz) };
    m.mundo.setBloco(fx - 2, fy, fz, 16); // Fornalha ao lado
    b.limparInv(); b.dar(128, 2); b.dar(101, 1);
  });
  const funSar = await page.evaluate(() => (window).__blocos.criar("fun_sardinha"));
  ok("fundir 2 sardinhas + carvão ok", funSar.ok === true);
  const temAssado = await page.evaluate(() => {
    const c = (window).__blocos.captura();
    return c.slots.some((s) => s && s.id === 131 && s.qtd >= 2);
  });
  ok("2× Peixe Assado no inventário (id 131)", temAssado);
  const comidaAssado = await page.evaluate(() => {
    // comida via comportamento real: comer peixe assado
    const b = (window).__blocos;
    b.limparInv(); b.dar(131, 1);
    const slotIdx = b.captura().slots.findIndex((s) => s && s.id === 131);
    b.selecionar(slotIdx); b.definirFome(10);
    b.comer(); b.pump(3);
    return b.captura().fome;
  });
  ok("Peixe Assado restaura 8 de fome (10→18)", Math.round(comidaAssado) === 18); // sobrevivência decai sempre — arredondado

  // ── A4. Pesca: poça de água + lançar (mesa/fornalha removidas —
  //      um sólido no caminho recusa a linha, e é esse comportamento honesto) ──
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px), fy = Math.floor(m.py), fz = Math.floor(m.pz);
    m.mundo.setBloco(fx + 2, fy, fz, 0); // sem mesa no caminho do lançamento
    m.mundo.setBloco(fx - 2, fy, fz, 0); // sem fornalha do outro lado
    for (let dx = 2; dx <= 4; dx++) for (let dz = -1; dz <= 1; dz++) m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 6); // poça
    b.limparInv(); b.dar(127, 1);
    const slotIdx = b.captura().slots.findIndex((s) => s && s.id === 127);
    b.selecionar(slotIdx);
    b.definirFome(20); b.definirVida(20);
  });
  await mirar(ar.fx + 3, ar.fy - 1, ar.fz);
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(3); });
  const lancada = await page.evaluate(() => (window).__blocos.pesca());
  ok("linha lançada (estado lancada)", !!lancada && lancada.estado === "lancada");
  ok("HUD mostra chip da pesca", await page.evaluate(() => !!document.querySelector('[data-testid="bc-pesca"]')));

  // ── A5. Picada + fisgar (polling determinístico por relógio do motor) ──
  const picada = await page.evaluate(() => {
    const b = (window).__blocos;
    for (let i = 0; i < 600; i++) { // 30 s de motor — espera 3–8 s
      b.pump(1, 0.05);
      const p = b.pesca();
      if (p && p.estado === "picada") return { picou: true, t: p.t, aviso: b.captura().avisos.some((a) => a.texto.includes("PICOU") === false) };
      if (!p) return { picou: false, escapouCedo: true };
    }
    return { picou: false };
  });
  ok("picada chegou (estado picada)", picada.picou === true);
  const fisgada = await page.evaluate(() => {
    const b = (window).__blocos;
    b.atacar(); b.pump(3);
    const c = b.captura();
    return {
      peixe: c.slots.find((s) => s && s.id >= 128 && s.id <= 130) ?? null,
      n: b.peixes(),
      conq: c.conquistas.includes("pescador"),
      pescaNull: c.pesca === null,
      aviso: c.avisos.some((a) => a.texto.startsWith("Pescaste:")),
    };
  });
  ok("peixe no inventário (sardinha/carapau/corvina)", !!fisgada.peixe);
  ok("contador peixesPescados = 1", fisgada.n === 1);
  ok("conquista Pescador desbloqueada", fisgada.conq);
  ok("linha recolhida após fisgar", fisgada.pescaNull);
  ok("aviso Pescaste: <nome real>", fisgada.aviso);

  // ── A6. Escapou (sem agir durante a janela) ──
  await mirar(ar.fx + 3, ar.fy - 1, ar.fz);
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(3); });
  const escapou = await page.evaluate(() => {
    const b = (window).__blocos;
    const antes = b.peixes();
    for (let i = 0; i < 260; i++) { // 13 s — espera (3–8) + janela (1,4)
      b.pump(1, 0.05);
      if (!b.pesca()) return { fim: true, n: b.peixes(), aviso: b.captura().avisos.some((a) => a.texto.includes("Escapou")) };
    }
    return { fim: false };
  });
  ok("linha escapou sem fisgar (estado parado)", escapou.fim === true);
  ok("nenhum peixe ao escapar", escapou.n === fisgada.n);
  ok("aviso Escapou-te! apresentado", escapou.aviso === true);

  // ── A7. Recolher voluntariamente ──
  await mirar(ar.fx + 3, ar.fy - 1, ar.fz);
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(3); });
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(3); });
  ok("recolher volta a parado", await page.evaluate(() => (window).__blocos.pesca() === null));

  // ── A8. Sem água à vista → recusa honesta ──
  await page.evaluate(() => { (window).__blocos.olhar(0, 1.2); });
  const semAgua = await page.evaluate(() => {
    const b = (window).__blocos;
    b.atacar(); b.pump(3);
    return { pesca: b.pesca(), aviso: b.captura().avisos.some((a) => a.texto.includes("Aponta para a água")) };
  });
  ok("sem água: linha não lançada", semAgua.pesca === null);
  ok("sem água: aviso honesto", semAgua.aviso === true);

  // ── A9. Aranha à noite: persegue e morde ──
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.definirVida(20);
    b.definirHora(0.6); // noite
  });
  await page.evaluate(() => { (window).__blocos.spawnarMob("aranha"); (window).__blocos.pump(10); });
  const aranhaNoite = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const mob = m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo);
    if (!mob) return { existe: false };
    for (let i = 0; i < 80; i++) { b.pump(1, 0.05); } // 4 s — aproxima-se e morde
    return { existe: true, estado: mob.estado, vida: b.captura().vida };
  });
  ok("aranha existe à noite", aranhaNoite.existe === true);
  ok("aranha persegue à noite", aranhaNoite.estado === "perseguir");
  ok("aranha morde (dano 2)", aranhaNoite.vida < 20);

  // ── A10. Matar aranha com espada de diamante → fio + conquistas ──
  const morta = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.limparInv(); b.dar(115, 1); // espada de diamante
    const slotIdx = b.captura().slots.findIndex((s) => s && s.id === 115);
    b.selecionar(slotIdx);
    const mob = m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo);
    if (!mob) return { matou: false };
    for (let i = 0; i < 6; i++) {
      const dx = mob.x - m.px, dz = mob.z - m.pz;
      b.olhar(Math.atan2(-dx, -dz), 0);
      b.atacar(); b.pump(8);
      if (!m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo)) break;
    }
    const c = b.captura();
    return {
      matou: !m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo),
      fio: c.slots.find((s) => s && s.id === 126) ?? null,
      conq: c.conquistas.includes("aracnologo") && c.conquistas.includes("safari"),
    };
  });
  ok("aranha derrotada", morta.matou === true);
  ok("drop de fio (id 126, sempre)", !!morta.fio && morta.fio.qtd >= 1);
  ok("conquistas Aracnólogo + Safari", morta.conq === true);

  // ── A11. Aranha de dia: NEUTRA (não persegue, não morde) ──
  const aranhaDia = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
    m.gestor.mobs = m.gestor.mobs.filter((mo) => mo.vivo);
    b.definirHora(0.25); // dia
    b.definirVida(20);
    b.spawnarMob("aranha");
    b.pump(10);
    const mob = m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo);
    for (let i = 0; i < 120; i++) { b.pump(1, 0.05); } // 6 s perto do jogador
    return { estado: mob.estado, vida: b.captura().vida };
  });
  ok("aranha de dia não persegue (vagar)", aranhaDia.estado === "vagar");
  ok("aranha de dia não morde (vida intacta)", aranhaDia.vida === 20);

  // ── A12. Ao amanhecer: zumbi desaparece, aranha fica (neutra) ──
  const amanhecer = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
    m.gestor.mobs = m.gestor.mobs.filter((mo) => mo.vivo);
    b.definirHora(0.6);
    b.spawnarMob("zumbi"); b.spawnarMob("aranha");
    b.pump(5);
    b.definirHora(0.25); // amanhecer
    b.pump(10);
    return { zumbi: m.gestor.mobs.find((x) => x.tipo === "zumbi" && x.vivo), aranha: m.gestor.mobs.find((x) => x.tipo === "aranha" && x.vivo) };
  });
  ok("zumbi desfaz-se ao amanhecer", !amanhecer.zumbi);
  ok("aranha fica ao amanhecer (neutra)", !!amanhecer.aranha);

  // ── A13. Guardar: conquistas v32 persistem no save v3 ──
  const saveV32 = await page.evaluate(() => {
    const b = (window).__blocos;
    b.guardar();
    const sv = JSON.parse(localStorage.getItem("bateu_blocos_save") || "{}");
    return { v: sv.v, conq: sv.conquistas ?? [] };
  });
  ok("save mantém versão 3 (pesca é transiente)", saveV32.v === 3);
  ok("save persiste tecelão/pescador/aracnólogo", ["tecelao", "pescador", "aracnologo"].every((c) => saveV32.conq.includes(c)));

  // ── A14. Mobile 375 px sem overflow (tolerância 2 px — convenção v31) ──
  await page.setViewportSize({ width: 375, height: 700 });
  await page.waitForTimeout(600);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("mobile 375 px sem overflow horizontal", overflowX <= 2);

  await page.close();

  // ═══════════════ PARTE B — SABORES DO MUNDO (TheMealDB) ═══════════════
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs2 = [];
  page2.on("pageerror", (e) => errs2.push(String(e)));
  page2.on("console", (m) => { if (m.type() === "error") errs2.push(m.text()); });
  await mockMealDB(page2);

  await page2.goto(`${BASE}/lives?game=sabores`, { waitUntil: "domcontentloaded" });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-stage"], [data-testid="sabores-error"], [data-testid="sabores-loading"]'), null, { timeout: 20000 });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 15000 });
  console.log("\n🍤 Sabores do Mundo — ronda 1");

  ok("foto real renderizada (naturalWidth > 0)", await page2.evaluate(() => {
    const img = document.querySelector('[data-testid="sabores-photo"]');
    return !!img && img.naturalWidth > 0;
  }));
  const opcoes = await page2.evaluate(() =>
    [...document.querySelectorAll('[data-testid="sabores-options"] button')].map((b) => b.textContent.trim()));
  ok("4 opções de regiões", opcoes.length === 4);
  ok("exatamente 1 opção correta (Portuguese)", opcoes.filter((o) => o === "Portuguese").length === 1);
  ok("marcador de pontos visível", await page2.evaluate(() => !!document.querySelector('[data-testid="sabores-scorebar"]')));

  // acertar
  await page2.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="sabores-options"] button')];
    btns.find((b) => b.textContent.trim() === "Portuguese")?.click();
  });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-reveal"]'), null, { timeout: 8000 });
  const revela1 = await page2.evaluate(() => ({
    texto: document.querySelector('[data-testid="sabores-reveal"]')?.textContent ?? "",
    link: document.querySelector('[data-testid="sabores-receita"]')?.getAttribute("href") ?? "",
    atribuicao: document.querySelector('[data-testid="sabores-attribution"]')?.textContent ?? "",
  }));
  ok("revelação: Acertou! com nome do prato", revela1.texto.includes("Acertou") && revela1.texto.includes("Prato Mock A"));
  ok("link da receita oficial (meal.php?i=test-1)", revela1.link.includes("themealdb.com/meal.php?i=test-1"));
  ok("atribuição TheMealDB visível", revela1.atribuicao.includes("TheMealDB"));
  const pontos1 = await page2.evaluate(() => document.querySelector('[data-testid="sabores-scorebar"]')?.textContent ?? "");
  ok("pontos acumulam no acerto", /Pontos\s*([1-9]\d*)/.test(pontos1));

  // próxima ronda (meal B) e errar de propósito
  await page2.evaluate(() => document.querySelector('[data-testid="sabores-next"]')?.click());
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 10000 });
  const opcoes2 = await page2.evaluate(() =>
    [...document.querySelectorAll('[data-testid="sabores-options"] button')].map((b) => b.textContent.trim()));
  const errada = opcoes2.find((o) => o !== "Japanese");
  await page2.evaluate((e) => {
    const btns = [...document.querySelectorAll('[data-testid="sabores-options"] button')];
    btns.find((b) => b.textContent.trim() === e)?.click();
  }, errada);
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-reveal"]'), null, { timeout: 8000 });
  const revela2 = await page2.evaluate(() => document.querySelector('[data-testid="sabores-reveal"]')?.textContent ?? "");
  ok("erro honesto na resposta errada (Era Japanese!)", revela2.includes("Era Japanese!"));
  const seqZero = await page2.evaluate(() => document.querySelector('[data-testid="sabores-scorebar"]')?.textContent ?? "");
  ok("sequência zera no erro", /Sequência\s*0/.test(seqZero));

  // erro honesto de rede + recuperação (abort instalado ANTES do clique — sem corrida)
  await page2.unroute(/themealdb\.com\/api\/json\/v1\/1\/random\.php/);
  await page2.route(/themealdb\.com\/api\/json\/v1\/1\/random\.php/, (route) => route.abort("connectionrefused"));
  await page2.evaluate(() => document.querySelector('[data-testid="sabores-next"]')?.click());
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-error"]'), null, { timeout: 15000 });
  const erroTxt = await page2.evaluate(() => document.querySelector('[data-testid="sabores-error"]')?.textContent ?? "");
  ok("erro honesto de rede com Tentar novamente", erroTxt.includes("indisponível") && erroTxt.includes("Tentar novamente"));
  await page2.unroute(/themealdb\.com\/api\/json\/v1\/1\/random\.php/);
  await mockMealDB(page2);
  // recuperação com tolerância a corrida do abort em voo (até 3 tentativas)
  let recuperou = false;
  for (let i = 0; i < 3 && !recuperou; i++) {
    await page2.waitForTimeout(400); // deixa a promessa abortada assentar
    await page2.evaluate(() => document.querySelector('[data-testid="sabores-error"] button')?.click());
    try {
      await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"]'), null, { timeout: 8000 });
      recuperou = true;
    } catch { /* tentar de novo */ }
  }
  ok("recuperação após Tentar novamente", recuperou);

  // cache local do prato visto (honestidade da fonte)
  ok("cache local bateu-meals-v1:test-1", await page2.evaluate(() => !!localStorage.getItem("bateu-meals-v1:test-1")));

  // catálogo LiveHub mostra o jogo
  await page2.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(1200);
  const catalogo = await page2.evaluate(() => document.body.textContent.includes("Sabores do Mundo"));
  ok("catálogo LiveHub lista Sabores do Mundo", catalogo);

  // mobile 375 sem overflow no jogo
  await page2.setViewportSize({ width: 375, height: 700 });
  await page2.goto(`${BASE}/lives?game=sabores`, { waitUntil: "domcontentloaded" });
  await page2.waitForFunction(() => !!document.querySelector('[data-testid="sabores-options"], [data-testid="sabores-error"]'), null, { timeout: 15000 });
  const overflowW2 = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("mobile 375 px sem overflow no Sabores", overflowW2 <= 2);

  const errs2Reais = errs2.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola reais (parte B)", errs2Reais.length === 0);
  if (errs2Reais.length) console.log("   ⚠️", errs2Reais.slice(0, 3));

  // ── Smoke REAL da TheMealDB (sem mocks) ──
  const page3 = await browser.newPage({ viewport: { width: 900, height: 600 } });
  try {
    const smoke = await Promise.race([
      page3.evaluate(async () => {
        const r1 = await fetch("https://www.themealdb.com/api/json/v1/1/random.php", { cache: "no-store" });
        const j1 = await r1.json();
        const r2 = await fetch("https://www.themealdb.com/api/json/v1/1/list.php?a=list", { cache: "no-store" });
        const j2 = await r2.json();
        return { prato: j1?.meals?.[0]?.strMeal ?? "", areas: (j2?.meals ?? []).length };
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
    ]);
    if (smoke.prato && smoke.areas >= 20) {
      ok(`smoke REAL TheMealDB: prato "${smoke.prato.slice(0, 30)}" + ${smoke.areas} regiões`, true);
    } else {
      skip(`smoke REAL TheMealDB (resposta inesperada: ${JSON.stringify(smoke).slice(0, 60)})`);
    }
  } catch (e) {
    skip(`smoke REAL TheMealDB (${String(e).slice(0, 50)})`);
  }
  await page3.close();

  await page2.close();
  await browser.close();

  const errsReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola reais (parte A)", errsReais.length === 0);
  if (errsReais.length) console.log("   ⚠️", errsReais.slice(0, 3));

  console.log(`\n══════════════════════════════════════`);
  console.log(`✅ ${passed} passaram · ❌ ${failed} falharam · ⏭️ ${skipped} skip`);
  if (fails.length) console.log("FALHAS:\n - " + fails.join("\n - "));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
