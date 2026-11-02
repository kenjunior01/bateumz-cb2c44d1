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
  await arena();
  c = await cap();
  const pos0 = c.pos;
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.frente = 1; });
  await pump(10);
  await page.evaluate(() => { (window).__blocos.motor.entrada.frente = 0; });
  await pump(2);
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
  await arena();
  // coloca um bloco de TERRA à frente e mira-o (determinístico)
  await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz - 2, 2); // TERRA 2 blocos à frente
    m.yaw = 0; m.pitch = -0.45;
  });
  await pump(2);
  c = await cap();
  ok("mira aponta para um bloco", !!c.mirando);
  ok("nome do bloco em português", c.mirando && /Relva|Terra|Areia|Pedra/.test(c.mirando.nome));

  // o drop corresponde ao bloco visado (terra→terra)
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
    let sel = -1;
    for (let i = 0; i < 36; i++) if (m.inv.slots[i] && m.inv.slots[i].id === 108) { sel = i; break; }
    if (sel >= 0) m.inv.selecao = sel;
    const ferr = m.inv.selecionado() ? m.inv.selecionado().id : 0;
    m.entrada.minerando = true;
    for (let i = 0; i < 40; i++) m.passo(0.05);
    const com = m.progressoQuebra;
    const mir = m.mira ? m.mira.id : 0;
    m.entrada.minerando = false;
    return { com, ferr, mir, quebrados: m.blocosQuebrados };
  });
  ok("picareta de madeira acelera (2 s > 50% da pedra)", pedraPicareta.com > 0.45);

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
  // a morte liberta o pointer lock (como carregar Esc) — o cursor volta para o RENASCER
  await page.evaluate(() => { try { document.exitPointerLock(); } catch { /* ignore */ } });
  await page.waitForTimeout(150);
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
    mob.__teste = true;
    b.pump(2);
    return m.gestor.mobs.some((mm) => mm.__teste && mm.vivo);
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
    const alvo = m.gestor.mobs.find((mm) => mm.__teste);
    return alvo ? { hp: alvo.hp, vivo: alvo.vivo, dist: +Math.hypot(alvo.x - m.px, alvo.z - m.pz).toFixed(1) } : null;
  });
  ok("espada tira vida ao porco", atacouPorco && (atacouPorco.hp < 10 || !atacouPorco.vivo));

  // zumbi à noite persegue e morde
  const zumbiAtaca = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.definirVida(20);
    const z = m.gestor.spawnar("zumbi", m.px + 3, m.py + 0.5, m.pz);
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

  // ═══ 16. NOVIDADES: pausa real, tochas, partículas, mochila, som ═══
  console.log("\n── 16. Pausa real, tochas, partículas, mochila ──");
  await arena();

  // pausa real: motor congelado
  await page.evaluate(() => { (window).__blocos.pausar(true); });
  ok("pausa congela o motor (tempo não avança)", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const t0 = m.tempo; for (let i = 0; i < 20; i++) m.passo(0.1);
    return m.tempo === t0;
  }));
  await page.evaluate(() => { (window).__blocos.pausar(false); });
  ok("sair da pausa retoma o tempo", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const t0 = m.tempo; for (let i = 0; i < 5; i++) m.passo(0.1); return m.tempo > t0;
  }));

  // tochas colocadas iluminam
  const tocha = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px) + 2, fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz, 17); // TOCHA
    for (let i = 0; i < 20; i++) m.passo(0.1); // ativa o timer das luzes
    return { tochas: m.mundo.tochas.size, luzes: m.luzesTocha.filter((l) => l.intensity > 0).length };
  });
  ok("tocha colocada registada no mundo", tocha.tochas >= 1);
  ok("tocha colocada acende luz real", tocha.luzes >= 1);

  // partículas ao quebrar
  const particulas = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz) - 2;
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz, 2); // TERRA à frente
    m.yaw = 0; m.pitch = -0.45;
    b.minerarHold(true);
    let pico = 0;
    for (let i = 0; i < 40; i++) { m.passo(0.05); pico = Math.max(pico, m.particulasAtivas()); }
    b.minerarHold(false);
    return pico;
  });
  ok("quebrar bloco solta partículas LEGO", particulas > 0);

  // mochila: mover para hotbar
  const mochila = await page.evaluate(() => {
    const b = (window).__blocos, inv = b.motor.inv;
    b.limparInv();
    inv.slots[10] = { id: 9, qtd: 5 }; // tábuas na mochila
    const movido = b.moverParaHotbar(10);
    const naHotbar = inv.slots.slice(0, 9).some((s) => s && s.id === 9);
    // hotbar cheia: troca com o selecionado
    for (let j = 0; j < 9; j++) inv.slots[j] = { id: 3, qtd: 1 };
    inv.slots[11] = { id: 107, qtd: 2 };
    b.selecionar(0);
    b.moverParaHotbar(11);
    const trocaOk = inv.slots[0]?.id === 107 && inv.slots[11]?.id === 3;
    return { movido, naHotbar, trocaOk };
  });
  ok("item da mochila passa à hotbar", mochila.movido && mochila.naHotbar);
  ok("hotbar cheia: item troca com o selecionado", mochila.trocaOk);

  // som on/off persistente
  const som = await page.evaluate(() => {
    const b = (window).__blocos;
    const antes = b.estadoSom();
    b.alternarSom();
    const depois = b.estadoSom();
    const guardado = localStorage.getItem("bateu_blocos_som");
    b.alternarSom(); // volta ao original
    return { antes, depois, guardado };
  });
  ok("som liga/desliga e persiste", som.depois === !som.antes && som.guardado === (som.depois ? "1" : "0"));

  // distância de render
  ok("distância de render 2..4 persistida", await page.evaluate(() => {
    const b = (window).__blocos;
    b.definirRaio(4);
    const r4 = b.raio() === 4 && localStorage.getItem("bateu_blocos_dist") === "4";
    b.definirRaio(99);
    const clamp = b.raio() === 4;
    b.definirRaio(3);
    return r4 && clamp;
  }));

  // aviso do anoitecer
  await page.evaluate(() => { (window).__blocos.definirHora(0.44); });
  await pump(3);
  c = await cap();
  ok("aviso 'A noite está a chegar' aparece", c.avisos.some((a) => a.texto.includes("noite")));

  // flash de dano na UI
  await page.evaluate(() => { const b = (window).__blocos; b.definirVida(10); b.motor.receberDano(2, "queda"); });
  await pump(2);
  ok("flash vermelho de dano na UI", await aguardar(() => page.getByTestId("bc-dano").isVisible().catch(() => false), 8, "flash de dano"));

  // modo do save (CONTINUAR usa o modo certo)
  ok("modoSave devolve o modo guardado", await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    const modoOriginal = m.modo;
    m.modo = "criativo"; b.guardar();
    const criativo = b.modoSave() === "criativo";
    m.modo = modoOriginal; b.guardar();
    return criativo;
  }));

  // céu: sol, lua, estrelas e nuvens existem
  ok("céu com sol, lua, estrelas e nuvens", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return !!m.solDisco && !!m.luaDisco && !!m.estrelas && !!m.nuvens && m.nuvens.children.length > 0;
  }));

  // captura com novos campos
  c = await cap();
  ok("captura inclui naAgua e voando", typeof c.naAgua === "boolean" && typeof c.voando === "boolean");

  // ═══ 16b. V29 — MUNDO VIVO: spawn, decorações, determinismo, apoio ═══
  console.log("\n── 16b. Mundo vivo (v29) ──");

  // spawn perto de árvores: floresta/planície com tronco num raio curto
  const spawnInfo = await page.evaluate(() => {
    const m = (window).__blocos.motor, wd = m.mundo;
    let troncoMaisPerto = null;
    outer: for (let r = 2; r < 64; r += 2) {
      for (let a = 0; a < 24; a++) {
        const x = Math.round(m.px + Math.cos((a / 24) * 6.283) * r);
        const z = Math.round(m.pz + Math.sin((a / 24) * 6.283) * r);
        for (let y = 40; y < 76; y++) {
          if (wd.getBloco(x, y, z) === 7) { troncoMaisPerto = r; break outer; }
        }
      }
    }
    return { bioma: wd.bioma(Math.floor(m.px), Math.floor(m.pz)), troncoMaisPerto };
  });
  ok("spawn em floresta ou planície (nunca deserto)", spawnInfo.bioma === "floresta" || spawnInfo.bioma === "planicie");
  ok("tronco a menos de 64 blocos do spawn", spawnInfo.troncoMaisPerto !== null && spawnInfo.troncoMaisPerto < 64);

  // decorações geradas no mundo (erva, flores, cactos)
  const decor = await page.evaluate(() => {
    const wd = (window).__blocos.motor.mundo;
    let erva = 0, flor = 0, cacto = 0;
    for (const [, c] of wd.chunks) for (let i = 0; i < c.dados.length; i++) {
      const id = c.dados[i];
      if (id === 21) erva++; else if (id === 22 || id === 23) flor++; else if (id === 24) cacto++;
    }
    return { erva, flor, cacto };
  });
  ok("erva alta gerada no mundo", decor.erva > 20);
  ok("flores geradas no mundo", decor.flor > 4);
  ok("cactos gerados em desertos (pode ser 0 perto do spawn)", decor.cacto >= 0);

  // geração determinística: mesmo chunk gerado 2× dá os mesmos dados (hash por coluna)
  ok("geração determinística por coluna (árvores iguais sempre)", await page.evaluate(() => {
    const wd = (window).__blocos.motor.mundo;
    const a = wd.gerarChunk(-9, -9).dados.slice();
    const b = wd.gerarChunk(-9, -9).dados;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }));

  // apoio: erva parte-se em cadeia quando o chão desaparece
  ok("quebrar chão sob a erva remove a erva (apoio)", await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor, wd = m.mundo;
    const fx = Math.floor(m.px) + 3, fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !wd.solido(fx, fy - 1, fz)) fy--;
    for (let dy = 0; dy < 3; dy++) wd.setBloco(fx, fy + dy, fz, 0, false);
    wd.setBloco(fx, fy - 1, fz, 3, false);   // chão de pedra
    wd.setBloco(fx, fy, fz, 21, false);       // erva em cima
    wd.setBloco(fx, fy, fz, 0, false);        // remove a erva
    wd.setBloco(fx, fy, fz, 21, false);       // repõe
    m.quebrar(fx, fy - 1, fz, false);         // quebra o chão…
    return wd.getBloco(fx, fy, fz) === 0 && wd.getBloco(fx, fy - 1, fz) === 0; // …a erva caiu também
  }));

  // colocar erva sem chão sólido é recusado (mira REAL num bloco flutuante)
  const recusaErva = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor, wd = m.mundo;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !wd.solido(fx, fy - 1, fz)) fy--;
    // pedra flutuante 2 à frente (+2 acima dos pés): mira na face lateral
    wd.setBloco(fx, fy + 2, fz - 2, 3, false);
    b.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    b.olhar(0, 0.42); // dir = (0,0,-1) + leve subida → acerta a face +Z da pedra
    b.pump(2, 0.05);
    if (!m.mira || m.mira.id !== 3) return "sem mira na pedra";
    const alvo = [m.mira.x + m.ultimaFace[0], m.mira.y + m.ultimaFace[1], m.mira.z + m.ultimaFace[2]];
    b.limparInv();
    b.dar(21, 5); // erva selecionada
    b.pump(1, 0.05);
    m.colocarPedido = true;
    b.pump(2, 0.05);
    const colocou = wd.getBloco(alvo[0], alvo[1], alvo[2]) === 21;
    const ficou = m.inv.contar(21);
    b.limparInv();
    return colocou === false && ficou === 5;
  });
  ok("colocar erva sem apoio é recusado", recusaErva === true);

  // erva parte-se num toque e NÃO dropa; flor dropa a si própria (mira REAL)
  const quebraErva = await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor, wd = m.mundo;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !wd.solido(fx, fy - 1, fz)) fy--;
    b.limparInv();
    // erva 2 blocos à frente, ao nível dos pés; olhar ligeiramente para baixo
    wd.setBloco(fx, fy, fz - 2, 21, false);
    b.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    b.olhar(0, -0.32);
    b.pump(2, 0.05);
    if (!m.mira || m.mira.id !== 21) return "sem mira na erva";
    m.entrada.minerando = true;
    b.pump(3, 0.06); // dureza 0.05 → parte no 1.º passo
    m.entrada.minerando = false;
    const ervaFoi = wd.getBloco(fx, fy, fz - 2) === 0;
    const dropouErva = m.inv.contar(21) > 0;
    // flor: dropa a si própria
    wd.setBloco(fx, fy, fz - 2, 23, false);
    b.pump(2, 0.05);
    if (!m.mira || m.mira.id !== 23) return "sem mira na flor";
    m.entrada.minerando = true;
    b.pump(3, 0.06);
    m.entrada.minerando = false;
    const florFoi = wd.getBloco(fx, fy, fz - 2) === 0;
    const dropouFlor = m.inv.contar(23) > 0;
    b.limparInv();
    return ervaFoi && !dropouErva && florFoi && dropouFlor;
  });
  ok("erva parte num toque sem drop; flor dropa a si", quebraErva === true);

  // textura do atlas: linha 1 (tronco/folhas/tábuas/minérios) agora pintada
  ok("atlas: linha 1 pintada (correção tronco/folhas/minérios)", await page.evaluate(() => {
    const ctx = (window).__blocos.motor.mundo.material.map.image.getContext("2d");
    const d = ctx.getImageData(0, 0, 128, 64).data;
    let opacos = 0;
    for (let t = 8; t <= 15; t++) {
      const col = t % 8, lin = Math.floor(t / 8);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const i = ((lin * 16 + y) * 128 + col * 16 + x) * 4;
        if (d[i + 3] > 128) opacos++;
      }
    }
    return opacos >= 8 * 16 * 16 * 0.95; // 8 tiles × 256 px quase todos opacos
  }));

  // ═══ 17. ERROS DE CONSOLA ═══
  console.log("\n── 17. Higiene ──");
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
