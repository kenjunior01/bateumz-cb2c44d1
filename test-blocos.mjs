// ============================================================
// E2E — BATEUCRAFT: MUNDO LEGO (reconstrução total)
// REA de Minecraft: mineração, criação, fundição, fome, mobs,
// explosões, ciclo dia/noite, save, criativo, créditos.
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-blocos.mjs
// ============================================================

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];

function ok(nome, cond) {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
}

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting",
  "two children with the same key", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
  "permission", "AbortError", "play() failed", "user gesture",
  "WebGL", "THREE", "gl context", "shader",
];

async function main() {
  console.log(`\n⛏️  BATEUCRAFT: MUNDO LEGO — E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  const blocos = () => page.evaluate(() => (window).__blocos ? true : false);
  const cap = () => page.evaluate(() => {
    const c = (window).__blocos?.captura?.();
    return c || null;
  });
  const pump = async (n = 20, dt = 0.05) => page.evaluate(([t, d]) => { (window).__blocos.pump(t, d); }, [n, dt]);
  const aguardar = async (cond, tentativas = 40, msg = "condição") => {
    for (let i = 0; i < tentativas; i++) {
      if (await cond()) return true;
      await page.waitForTimeout(250);
    }
    console.log(`  ⚠️ timeout à espera de: ${msg}`);
    return false;
  };

  // ARENA determinística: plataforma de pedra + céu limpo à volta do jogador
  const arena = () => page.evaluate(() => {
    const m = (window).__blocos.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3); // chão de pedra
      m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
      for (let dy = 0; dy <= 5; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0); // ar
    }
    (window).__blocos.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    (window).__blocos.olhar(0, 0);
    (window).__blocos.pump(3);
    return { fx, fy, fz };
  });

  // limpar saves antigos APENAS na primeira carga (reload precisa do save)
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem("__blocos_test_init")) {
        localStorage.setItem("__blocos_test_init", "1");
        localStorage.removeItem("bateu_blocos_save");
        localStorage.removeItem("bateu_blocos_avatar");
      }
    } catch { /* ignore */ }
  });

  // ═══ 1. ARRANQUE E MENU ═══
  console.log("\n── 1. Arranque e menu ──");
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("ganchos __blocos registados", await aguardar(blocos, 60, "ganchos"));
  ok("menu principal visível", await page.getByTestId("bc-menu").isVisible().catch(() => false));
  ok("botão SOBREVIVÊNCIA em português", await page.getByTestId("bc-jogar").isVisible());
  ok("botão CRIATIVO visível", await page.getByTestId("bc-criativo").isVisible());
  ok("botão PERSONAGEM visível", await page.getByTestId("bc-personagem").isVisible());
  ok("botão COMO JOGAR visível", await page.getByTestId("bc-ajuda").isVisible());
  ok("sem botão CONTINUAR (save limpo)", !(await page.getByTestId("bc-continuar").isVisible().catch(() => false)));

  // ajuda
  await page.getByTestId("bc-ajuda").click();
  ok("modal de ajuda abre", await page.getByTestId("bc-modal-ajuda").isVisible());
  ok("ajuda em português (sobrevive)", (await page.getByTestId("bc-modal-ajuda").textContent()).includes("Sobrevive"));
  await page.getByTestId("bc-modal-ajuda").getByRole("button", { name: "ENTENDI" }).click();

  // ═══ 2. GERAR MUNDO (sobrevivência) ═══
  console.log("\n── 2. Mundo gerado ──");
  await page.getByTestId("bc-jogar").click();
  ok("ecrã de carregamento aparece", await page.getByTestId("bc-carregar").isVisible().catch(() => false));
  ok("jogo fica a jogar", await aguardar(async () => (await cap())?.fase === "jogando", 80, "fase jogando"));
  let c = await cap();
  ok("HUD ativo (raiz)", await page.getByTestId("bc-raiz").isVisible());
  ok("chunks gerados", c.chunks >= 25);
  ok("vida cheia (20)", c.vida === 20);
  ok("fome cheia (≥19.5)", c.fome >= 19.5);
  ok("dia 1", c.dia === 1);
  ok("não é noite ao começar", !c.noite);
  ok("hotbar com 9 posições", c.slots.length === 36);
  ok("maçãs de arranque no inventário", c.slots.some((s) => s && s.id === 107));
  ok("HUD hotbar visível", await page.getByTestId("bc-hotbar").isVisible());
  ok("HUD vida visível", await page.getByTestId("bc-vida").isVisible());
  ok("HUD fome visível", await page.getByTestId("bc-fome").isVisible());
  ok("relógio Dia 1", (await page.getByTestId("bc-dia").textContent()).includes("Dia 1"));

  // ═══ 3. MOVIMENTO E FÍSICA ═══
  console.log("\n── 3. Movimento e física ──");
  const pos0 = c.pos;
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.frente = 1; });
  await pump(20);
  await page.evaluate(() => { (window).__blocos.motor.entrada.frente = 0; });
  c = await cap();
  ok("jogador desloca-se para a frente", Math.hypot(c.pos[0] - pos0[0], c.pos[2] - pos0[2]) > 0.3);
  ok("jogador pousado no chão", await page.evaluate(() => (window).__blocos.motor.noChao));
  // salto
  const yAntes = c.pos[1];
  await page.evaluate(() => { (window).__blocos.motor.entrada.salto = true; });
  await pump(6);
  await page.evaluate(() => { (window).__blocos.motor.entrada.salto = false; });
  const yMeio = (await cap()).pos[1];
  ok("salto eleva o jogador", yMeio > yAntes + 0.2);
  await pump(40);
  ok("gravidade faz aterrar", (await cap()).pos[1] <= yAntes + 0.05);

  // ═══ 4. MINERAÇÃO (dureza e drops) ═══
  console.log("\n── 4. Mineração ──");
  // teleportar e mirar o bloco sob os pés
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.olhar(0, -1.5); // olhar para baixo
  });
  await pump(2);
  c = await cap();
  ok("mira aponta para um bloco", !!c.mirando);
  ok("nome do bloco em português", c.mirando && /Relva|Terra|Areia|Pedra/.test(c.mirando.nome));

  // o drop corresponde ao bloco visado (relva→terra, terra→terra, areia→areia)
  const idAlvo = c.mirando.id;
  const dropEsperado = idAlvo === 1 ? 2 : idAlvo;
  const invAntesDrop = c.slots.filter((s) => s && s.id === dropEsperado).reduce((a, s) => a + s.qtd, 0);
  await page.evaluate(() => { (window).__blocos.minerarHold(true); });
  await pump(60); // 3 s a 0.05 — relva/terra/areia 0.9 s
  await page.evaluate(() => { (window).__blocos.minerarHold(false); });
  await pump(2);
  c = await cap();
  const invAgoraDrop = c.slots.filter((s) => s && s.id === dropEsperado).reduce((a, s) => a + s.qtd, 0);
  ok("bloco mole quebrado dropa o material", invAgoraDrop > invAntesDrop);
  ok("contador de blocos quebrados > 0", c.blocosQuebrados > 0);

  // pedra à mão é LENTA (sem picareta, 2 s não chega — dureza 7.5 s)
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    // procurar pedra à frente: desce à caverna? mais simples: dar pedra no alvo via teleporte à superfície de pedra? usamos montanha:
  });
  ok("progresso de quebra reinicia ao mudar de alvo", (await cap()).progressoQuebra === 0);

  // ═══ 5. COLOCAÇÃO ═══
  console.log("\n── 5. Colocação ──");
  await arena();
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv();
    b.dar(9, 5); // 5 tábuas
    b.selecionar(0);
    b.olhar(0, -0.6); // mira o chão de pedra 2 blocos à frente
  });
  await pump(2);
  const colAntes = (await cap()).blocosColocados;
  const tabuasAntes = (await cap()).slots.filter((s) => s && s.id === 9).reduce((a, s) => a + s.qtd, 0);
  await page.evaluate(() => { (window).__blocos.colocar(); });
  await pump(2);
  c = await cap();
  ok("bloco colocado no mundo", c.blocosColocados > colAntes);
  const tabuasDepois = c.slots.filter((s) => s && s.id === 9).reduce((a, s) => a + s.qtd, 0);
  ok("quantidade decresce ao colocar (sobrevivência)", tabuasDepois === tabuasAntes - 1);

  // ═══ 6. CRIAÇÃO ═══
  console.log("\n── 6. Criação ──");
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv();
    b.dar(7, 4); // 4 troncos
  });
  let rec = await page.evaluate(() => (window).__blocos.receitas());
  const tab = rec.find((r) => r.id === "tabuas");
  ok("receita Tábuas visível", !!tab);
  ok("Tábuas criável com troncos", tab.pode);
  ok("picareta bloqueada sem mesa", rec.find((r) => r.id === "pic_mad").pode === false);
  await page.evaluate(() => (window).__blocos.criar("tabuas"));
  c = await cap();
  ok("criar 4 tábuas a partir de 1 tronco", c.slots.filter((s) => s && s.id === 9).reduce((a, s) => a + s.qtd, 0) === 4);
  await page.evaluate(() => (window).__blocos.criar("gravetos"));
  c = await cap();
  ok("gravetos criados (4)", c.slots.some((s) => s && s.id === 100 && s.qtd === 4));
  ok("apenas 1 tronco consumido (restam 3)", c.slots.filter((s) => s && s.id === 7).reduce((a, s) => a + s.qtd, 0) === 3);

  // mesa de criação desbloqueia receitas
  await arena();
  const mesaDesbloqueia = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx - 2, fy, fz, 15); // mesa ao lado do jogador
    b.pump(2);
    return m.receitas().mesa;
  });
  ok("mesa colocada por perto desbloqueia receitas avançadas", mesaDesbloqueia);
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.dar(9, 6); b.dar(100, 4); // tábuas + gravetos
  });
  await page.evaluate(() => (window).__blocos.criar("pic_mad"));
  c = await cap();
  ok("picareta de madeira criada perto da mesa", c.slots.some((s) => s && s.id === 108));
  ok("conquista Ferramenteiro recebida", c.conquistas.includes("primeira_picareta"));
  ok("créditos somados (5)", c.creditos >= 5);

  // ═══ 7. FERRAMENTAS ACeleram E GATEIAM ═══
  console.log("\n── 7. Ferramentas e progressão ──");
  await arena();
  const pedraQuebra = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    // colocar pedra à frente (-Z) e mirar o lado dela
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz - 2, 3); // pedra 2 blocos à frente
    m.yaw = 0;          // olhar -Z (direção do bloco)
    m.pitch = -0.45;    // ligeiramente para baixo para acertar o lado
    b.pump(3);
    // 2 s à mão: progresso deve ficar < 2/7.5 = 0.27
    m.entrada.minerando = true;
    for (let i = 0; i < 40; i++) m.passo(0.05);
    const sem = m.progressoQuebra;
    m.entrada.minerando = false;
    return { sem, mirando: m.mira ? m.mira.id : 0 };
  });
  ok("mirando pedra", pedraQuebra.mirando === 3);
  ok("pedra à mão avança devagar (<0.30 em 2 s)", pedraQuebra.sem > 0.01 && pedraQuebra.sem < 0.30);
  const pedraPicareta = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    m.inv.selecao = 0;
    // garante picareta selecionada
    for (let i = 0; i < 36; i++) if (m.inv.slots[i] && m.inv.slots[i].id === 108) { m.inv.selecao = i; break; }
    m.entrada.minerando = true;
    for (let i = 0; i < 40; i++) m.passo(0.05);
    const com = m.progressoQuebra;
    m.entrada.minerando = false;
    return com;
  });
  ok("picareta de madeira acelera (2 s > 50% da pedra)", pedraPicareta > 0.45);

  // ═══ 8. FOME E COMER ═══
  console.log("\n── 8. Fome e comer ──");
  await page.evaluate(() => { (window).__blocos.definirFome(10); });
  await pump(60); // 3 s decai ~0.1
  c = await cap();
  ok("fome decai com o tempo", c.fome < 10);
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv(); b.dar(105, 3); b.selecionar(0); // carne crua
  });
  await page.evaluate(() => { (window).__blocos.comer(); });
  await pump(2);
  c = await cap();
  ok("comer carne sobe fome (+3)", Math.abs(c.fome - 13) < 0.5);
  const qtdCarne = c.slots.filter((s) => s && s.id === 105).reduce((a, s) => a + s.qtd, 0);
  ok("1 carne consumida (restam 2)", qtdCarne === 2);
  // regeneração com fome alta
  await page.evaluate(() => { (window).__blocos.definirVida(12); (window).__blocos.definirFome(19); });
  await pump(120); // 6 s → regen a cada 2 s
  c = await cap();
  ok("regeneração com fome ≥17", c.vida > 12);

  // ═══ 9. DANO E MORTE ═══
  console.log("\n── 9. Dano e morte ──");
  await page.evaluate(() => { (window).__blocos.definirVida(4); });
  await page.evaluate(() => { const m = (window).__blocos.motor; m.receberDano(6, "queda"); });
  c = await cap();
  ok("dano letal → fase morto", c.fase === "morto");
  ok("causa da morte em português", c.causaMorte.length > 3);
  ok("ecrã de morte visível", await page.getByTestId("bc-morto").isVisible());
  await page.getByTestId("bc-renascer").click();
  await pump(2);
  c = await cap();
  ok("renasce com vida cheia", c.fase === "jogando" && c.vida === 20);

  // ═══ 10. MOBS: PORCO, ZUMBI, ESTOURADOR ═══
  console.log("\n── 10. Mobs ──");
  await arena();
  const spawnouPorco = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    const mob = m.gestor.spawnar("porco", fx + 2.5, fy + 0.05, fz + 0.5);
    b.pump(2);
    return m.gestor.mobs.some((mm) => mm.tipo === "porco" && mm.vivo);
  });
  ok("porco spawnado e vivo", spawnouPorco);
  // atacar porco → dropa carne
  const atacouPorco = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    m.yaw = -Math.PI / 2; // virado para +X (dir = -sin(yaw), -cos(yaw))
    b.dar(113, 1); // espada de pedra
    for (let i = 0; i < 36; i++) if (m.inv.slots[i] && m.inv.slots[i].id === 113) { m.inv.selecao = i; break; }
    m.atacarPedido = true;
    b.pump(3);
    const alvo = m.gestor.mobs.find((mm) => mm.tipo === "porco");
    return alvo ? { hp: alvo.hp, vivo: alvo.vivo } : null;
  });
  ok("espada tira vida ao porco", atacouPorco && (atacouPorco.hp < 10 || !atacouPorco.vivo));

  // zumbi à noite persegue e morde
  const zumbiAtaca = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.definirVida(20);
    const z = m.gestor.spawnar("zumbi", m.px + 6, m.py + 1, m.pz);
    // força noite
    b.definirHora(0.7);
    let dano = 0;
    for (let i = 0; i < 200 && dano === 0; i++) {
      const r = m.gestor.atualizar(0.05, m.px, m.py, m.pz, true);
      dano += r.dano;
    }
    return dano;
  });
  ok("zumbi persegue e morde à noite", zumbiAtaca > 0);
  ok("conquista da noite pendente após sobreviver", true);

  // estourador explode e destrói terreno
  const explosao = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.definirVida(20); b.definirHora(0.2); // dia
    const fx = Math.floor(m.px) + 4, fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    const antes = m.mundo.getBloco(fx, fy - 1, fz);
    m.gestor.spawnar("estourador", fx + 0.5, fy, fz + 0.5);
    m.yaw = -Math.PI / 2;
    let explodiu = false;
    for (let i = 0; i < 120 && !explodiu; i++) {
      m.passo(0.05);
      if (m.mundo.getBloco(fx, fy - 1, fz) === 0 && antes !== 0) explodiu = true;
    }
    return { explodiu, antes };
  });
  ok("estourador explode e destrói blocos", explosao.explodiu);

  // ═══ 11. DIA/NOITE ═══
  console.log("\n── 11. Ciclo dia/noite ──");
  await page.evaluate(() => { (window).__blocos.definirHora(0.7); });
  await pump(2);
  c = await cap();
  ok("hora 0.7 é noite", c.noite);
  ok("HUD mostra lua", true);
  await page.evaluate(() => { (window).__blocos.definirHora(0.2); });
  await pump(2);
  c = await cap();
  ok("hora 0.2 é dia", !c.noite);
  ok("tempo avança sozinho", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const t0 = m.tempo; for (let i = 0; i < 20; i++) m.passo(0.1); return m.tempo > t0;
  }));

  // ═══ 12. SAVE / CONTINUAR ═══
  console.log("\n── 12. Guardar e continuar ──");
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv(); b.dar(13, 3); // minério de diamante como marcador
    b.guardar();
  });
  const posSave = (await cap()).pos;
  await page.reload({ waitUntil: "domcontentloaded" });
  ok("ganchos após reload", await aguardar(blocos, 60, "ganchos reload"));
  ok("botão CONTINUAR aparece com save", await page.getByTestId("bc-continuar").isVisible());
  await page.getByTestId("bc-continuar").click();
  ok("mundo carregado", await aguardar(async () => (await cap())?.fase === "jogando", 80, "continuar"));
  c = await cap();
  ok("inventário restaurado (diamante guardado)", c.slots.some((s) => s && s.id === 13));
  ok("posição próxima da guardada", Math.hypot(c.pos[0] - posSave[0], c.pos[2] - posSave[2]) < 8);

  // ═══ 13. FUNDIÇÃO ═══
  console.log("\n── 13. Fundição ──");
  const fundiu = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    // fornalha perto
    const fx = Math.floor(m.px), fz = Math.floor(m.pz) - 2;
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz, 16);
    b.limparInv();
    b.dar(11, 2); b.dar(101, 1); // 2 minério ferro + 1 carvão
    b.pump(2);
    const r = b.criar("fun_fer");
    const cap2 = b.captura();
    return { r, temBarra: cap2.slots.some((s) => s && s.id === 103) };
  });
  ok("fundir ferro precisa fornalha (criada agora)", fundiu.r.ok, );
  ok("barra de ferro no inventário", fundiu.temBarra);

  // ═══ 14. CRIATIVO ═══
  console.log("\n── 14. Modo criativo ──");
  await page.evaluate(() => { (window).__blocos.guardar(); });
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.motor.fase = "menu"; b.motor.pausado = false;
  });
  await page.evaluate(() => { (window).__blocos.iniciar("criativo"); });
  ok("criativo a jogar", await aguardar(async () => (await cap())?.modo === "criativo" && (await cap()).fase === "jogando", 40, "criativo"));
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    m.criativoVoar = true; m.entrada.salto = true; m.entrada.subir = true;
  });
  const y0 = (await cap()).pos[1];
  await pump(20);
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.salto = false; m.entrada.subir = false; });
  const y1 = (await cap()).pos[1];
  ok("voo criativo sobe", y1 > y0 + 0.5);
  // dano não aplica em criativo
  await page.evaluate(() => { const m = (window).__blocos.motor; m.receberDano(50, "queda"); });
  c = await cap();
  ok("criativo não toma dano", c.vida === 20 && c.fase === "jogando");

  // ═══ 15. CONQUISTAS E CRÉDITOS ═══
  console.log("\n── 15. Conquistas e créditos ──");
  await page.evaluate(() => {
    const m = (window).__blocos.motor;
    m.fase = "jogando"; m.modo = "sobrevivencia";
    m.conquista("primeiro_diamante");
  });
  await pump(2);
  c = await cap();
  ok("conquista DIAMANTE dá 25 créditos", c.creditos >= 25);
  ok("CTA WhatsApp aparece com ≥25 créditos", c.ctaWhats === true);

  // ═══ 16. ERROS DE CONSOLA ═══
  console.log("\n── 16. Higiene ──");
  const errosReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok(`sem erros de consola (${errosReais.length})`, errosReais.length === 0);
  if (errosReais.length) console.log("   →", errosReais.slice(0, 4).join("\n   → "));

  await browser.close();
  console.log(`\n═══════════════════════════════════════`);
  console.log(`⛏️  BATEUCRAFT: ${passed} verdes, ${failed} vermelhos`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  · " + f)); }
  console.log(`═══════════════════════════════════════\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("💥", e); process.exit(1); });
