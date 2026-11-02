// ============================================================
// E2E — BATEUCRAFT v29: SISTEMAS AVANÇADOS
// Agricultura (enxada·sementes·trigo·pão) · TNT (fusível+explosão)
// · Baú (18 posições + save) · Armadura (absorção de dano)
// · Vaca/Galinha (mobs passivos) · Meteorologia (chuva·tempestade
// · relâmpagos) · save v3 · regressões rápidas
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: PW_CHROME=<chromium> node test-craft-v29.mjs
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
  console.log(`\n🌾 BATEUCRAFT v29 — SISTEMAS AVANÇADOS — ${BASE}\n`);
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
  // + sem mobs espontâneos (um Estourador a explodir durante os pumps longos
  //   arremessa o jogador e invalida as coordenadas — zero spawns em teste)
  const arena = () => page.evaluate(() => {
    const m = (window).__blocos.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
    m.gestor.mobs = m.gestor.mobs.filter((mo) => mo.vivo);
    m.gestor.cdSpawn = 99999; // sem spawns naturais durante os testes
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
      m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3);
      m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
      for (let dy = 0; dy <= 9; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0);
    }
    (window).__blocos.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    (window).__blocos.olhar(0, 0);
    (window).__blocos.pump(3);
    return { fx, fy, fz };
  });

  // Mirar num ponto do mundo (convenção dir = -sin(yaw)·cos(pitch), sin(pitch), -cos(yaw)·cos(pitch))
  const mirar = (bx, by, bz) => page.evaluate(([bx2, by2, bz2]) => {
    const m = (window).__blocos.motor;
    const dx = bx2 + 0.5 - m.px, dy = by2 + 0.5 - (m.py + 1.62), dz = bz2 + 0.5 - m.pz;
    const d = Math.hypot(dx, dy, dz);
    m.yaw = Math.atan2(-dx, -dz);
    m.pitch = Math.asin(Math.max(-1, Math.min(1, dy / d)));
    m.entrada.minerando = false;
    (window).__blocos.pump(2);
    return m.mira ? { x: m.mira.x, y: m.mira.y, z: m.mira.z, id: m.mira.id } : null;
  }, [bx, by, bz]);

  await page.addInitScript(() => {
    try {
      localStorage.removeItem("bateu_blocos_save");
      localStorage.removeItem("bateu_blocos_avatar");
      localStorage.removeItem("bateu_blocos_camara");
    } catch { /* ignore */ }
  });

  // ═══ 1. ARRANQUE ═══
  console.log("\n── 1. Arranque ──");
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("ganchos __blocos registados", await aguardar(blocos, 60, "ganchos"));
  await page.getByTestId("bc-jogar").click();
  ok("jogo fica a jogando", await aguardar(async () => (await cap())?.fase === "jogando", 80, "fase jogando"));
  const A = await arena();
  let { fx, fy, fz } = A;

  // ═══ 2. AGRICULTURA ═══
  console.log("\n── 2. Agricultura: enxada → sementes → trigo → pão ──");
  // relva em frente do jogador (a arena é de pedra — põe uma faixa de relva)
  await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    m.mundo.setBloco(fx2, fy2 - 1, fz2 + 1, 1); // relva
    m.mundo.setBloco(fx2, fy2, fz2 + 1, 0);
    m.mundo.setBloco(fx2, fy2, fz2 + 2, 0);
    (window).__blocos.pump(2);
  }, [fx, fy, fz]);
  await page.evaluate(() => { (window).__blocos.limparInv(); (window).__blocos.dar(119, 1); (window).__blocos.selecionar(0); }); // enxada madeira
  const miraRelva = await mirar(fx, fy - 1, fz + 1);
  ok("mira acerta na relva preparada", miraRelva && miraRelva.id === 1);
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); }); // enxada = usar
  ok("enxada transforma relva em terra arada (25)", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2 - 1, fz2 + 1) === 25;
  }, [fx, fy, fz]));
  // sementes
  await page.evaluate(() => { (window).__blocos.dar(117, 4); (window).__blocos.selecionar(1); }); // sementes
  await mirar(fx, fy - 1, fz + 1);
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); });
  ok("sementes plantam trigo jovem (26) sobre a arada", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 26;
  }, [fx, fy, fz]));
  ok("plantação registada para crescer", (await cap()).plantacoes === 1);
  ok("consumiu 1 semente (sobrevivência)", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const s = m.inv.slots[1];
    return s ? s.qtd === 3 : false;
  }));
  // crescimento: 26 s sol → trigo maduro; pump acelera o tempo do motor
  await pump(560, 0.05);
  ok("trigo amadureceu (27) após 26 s de sol", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 27;
  }, [fx, fy, fz]));
  ok("fila de plantações vazia após amadurecer", (await cap()).plantacoes === 0);
  // colher: minerar o trigo maduro
  await mirar(fx, fy, fz + 1);
  await page.evaluate(() => { (window).__blocos.minerarHold(true); (window).__blocos.pump(6); (window).__blocos.minerarHold(false); });
  const colheita = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return { trigo: m.inv.contar(118), sementes: m.inv.contar(117), bloco: m.mundo.getBloco(Math.floor(m.px), Math.floor(m.py), Math.floor(m.pz) + 1) };
  });
  ok("colheita dá trigo + sementes", colheita.trigo >= 1 && colheita.sementes >= 1);
  ok("conquista Agricultor desbloqueada", (await cap()).conquistas.includes("agricultor"));
  // pão
  await page.evaluate(() => { (window).__blocos.dar(118, 2); }); // +2 = 3 trigos
  const pao = await page.evaluate(() => (window).__blocos.criar("pao"));
  ok("receita de pão (3 trigos) cria com sucesso", pao.ok === true);
  ok("pão no inventário e comestível", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.inv.contar(121) === 1;
  }));
  ok("conquista Padeiro desbloqueada", (await cap()).conquistas.includes("padeiro"));
  // enxada em bloco errado mostra recusa honesta
  await page.evaluate(() => { (window).__blocos.selecionar(0); });
  await mirar(fx, fy - 1, fz - 1); // pedra da arena
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); });
  ok("enxada recusa pedra com aviso honesto", (await cap()).avisos.some((a) => a.texto.includes("enxada")));

  // ═══ 3. BAÚ ═══
  console.log("\n── 3. Baú: 18 posições · depositar · retirar · save ──");
  ({ fx, fy, fz } = await arena());
  await page.evaluate(() => { (window).__blocos.limparInv(); (window).__blocos.dar(29, 1); (window).__blocos.selecionar(0); }); // baú
  await mirar(fx, fy - 1, fz + 1);
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); });
  ok("baú colocado no mundo", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 29;
  }, [fx, fy, fz]));
  // abrir: atacar o baú
  await mirar(fx, fy, fz + 1);
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(2); });
  ok("atacar o baú abre o modal (bauAberto)", (await cap()).bauAberto !== null);
  ok("modal de baú visível na UI", await page.getByTestId("bc-modal-bau").isVisible().catch(() => false));
  ok("18 posições no modal", await page.evaluate(() => document.querySelectorAll('[data-testid^="bc-bau-slot-"]').length) === 18);
  // depositar maçã (dar enche a 1.ª vaga = slot 0, pois o baú foi consumido)
  await page.evaluate(() => { (window).__blocos.dar(107, 5); (window).__blocos.selecionar(0); (window).__blocos.bauDepositar(0); (window).__blocos.pump(2); });
  const noBau = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const b = [...m.baus.values()][0];
    return { total: b.filter(Boolean).length, macas: b.filter(Boolean).reduce((n, s) => n + (s.id === 107 ? s.qtd : 0), 0), mochila: m.inv.contar(107) };
  });
  ok("5 maçãs guardadas no baú", noBau.macas === 5 && noBau.total === 1);
  ok("maçãs saíram da mochila", noBau.mochila === 0);
  ok("conquista Cofre Seguro desbloqueada", (await cap()).conquistas.includes("cofre"));
  // retirar
  await page.evaluate(() => { (window).__blocos.bauRetirar(0); (window).__blocos.pump(2); });
  ok("retirar devolve as maçãs à mochila", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.inv.contar(107) === 5 && [...m.baus.values()][0].filter(Boolean).length === 0;
  }));
  // fechar modal
  await page.getByTestId("bc-bau-fechar").click();
  ok("fechar o baú limpa bauAberto", (await cap()).bauAberto === null);

  // ═══ 4. ARMADURA ═══
  console.log("\n── 4. Armadura: equipar · absorção · despir ──");
  await page.evaluate(() => { (window).__blocos.limparInv(); (window).__blocos.dar(124, 1); (window).__blocos.selecionar(0); }); // peitoral ferro
  ok("equipar peitoral de ferro", await page.evaluate(() => (window).__blocos.equipar()));
  const arm = await cap();
  ok("redução de 30% visível na captura", arm.armadura && Math.abs(arm.armadura.reducao - 0.3) < 0.001);
  ok("HUD mostra a armadura", await page.evaluate(() => !!document.querySelector('[data-testid="bc-armadura-hud"]')));
  ok("conquista Blindado desbloqueada", arm.conquistas.includes("blindado"));
  // dano com armadura: 10 → 7
  await page.evaluate(() => { (window).__blocos.definirVida(20); (window).__blocos.motor.receberDano(10, "teste"); });
  ok("dano 10 com armadura vira 7 (vida 13)", await page.evaluate(() => (window).__blocos.motor.vida === 13));
  // despir
  await page.evaluate(() => { (window).__blocos.despir(); (window).__blocos.pump(2); });
  ok("despir devolve o peitoral à mochila", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.inv.armadura === null && m.inv.contar(124) === 1 && m.inv.reducaoArmadura === 0;
  }));
  // dano sem armadura volta ao normal
  await page.evaluate(() => { (window).__blocos.definirVida(20); (window).__blocos.motor.receberDano(10, "teste"); });
  ok("sem armadura, dano 10 tira 10", await page.evaluate(() => (window).__blocos.motor.vida === 10));
  await page.evaluate(() => { (window).__blocos.definirVida(20); });

  // ═══ 5. VACA E GALINHA ═══
  console.log("\n── 5. Vaca e galinha: passivas · fuga · drops ──");
  const vaca = await page.evaluate(() => {
    const v = (window).__blocos.spawnarMob("vaca", 0, -2); // à frente do jogador (yaw 0 olha para -z)
    return { tipo: v.tipo, hp: v.hp, hpMax: v.hpMax };
  });
  ok("vaca spawna com 12 hp", vaca.tipo === "vaca" && vaca.hp === 12 && vaca.hpMax === 12);
  const galinha = await page.evaluate(() => {
    const g = (window).__blocos.spawnarMob("galinha", 2, 0);
    return { tipo: g.tipo, hp: g.hp };
  });
  ok("galinha spawna com 6 hp", galinha.tipo === "galinha" && galinha.hp === 6);
  const fuga = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    // determinístico: só a vaca no mundo, 2 m à frente
    for (const mo of m.gestor.mobs) if (mo.vivo && mo.tipo !== "vaca") m.gestor.matar(mo, false);
    const vacaM = m.gestor.mobs.find((mo) => mo.tipo === "vaca" && mo.vivo);
    if (!vacaM) return "desapareceu";
    vacaM.x = m.px; vacaM.z = m.pz - 2; vacaM.y = m.py + 0.1; vacaM.vx = vacaM.vz = 0;
    m.yaw = 0; m.pitch = 0;
    const atingido = m.gestor.atacar(m.px, m.py + 1.2, m.pz, m.yaw, 3.4, 5);
    return atingido ? vacaM.estado : "sem hit";
  });
  ok("vaca foge quando atacada (estado fugir)", fuga === "fugir");
  const dropsVaca = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const g = m.gestor;
    let temCarne = false, temCouro = false;
    for (let i = 0; i < 30; i++) {
      const d = g.dropDoMob("vaca", m.rnd);
      if (d.some((x) => x.id === 105)) temCarne = true;
      if (d.some((x) => x.id === 122)) temCouro = true;
    }
    return { temCarne, temCouro };
  });
  ok("vaca dropa carne crua e couro", dropsVaca.temCarne && dropsVaca.temCouro);
  await page.evaluate(() => {
    const m = (window).__blocos.motor;
    for (const mo of m.gestor.mobs) if (mo.vivo) m.gestor.matar(mo, false);
  });

  // ═══ 6. METEOROLOGIA ═══
  console.log("\n── 6. Meteorologia: chuva · crescimento ×2,4 · tempestade ──");
  await page.evaluate(() => { (window).__blocos.definirMeteo("chuva", 30); });
  ok("definirMeteo('chuva') muda o estado", (await cap()).meteo === "chuva");
  ok("HUD mostra o indicador de meteo", await page.evaluate(() => !!document.querySelector('[data-testid="bc-meteo"]')));
  await pump(60, 0.05);
  ok("chuvaNivel sobe (partículas/som ativos)", await page.evaluate(() => (window).__blocos.chuvaNivel() > 0.3));
  // crescimento na chuva: planta nova fica com 26 × 0.42 ≈ 10,9 s
  ({ fx, fy, fz } = await arena());
  await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    m.mundo.setBloco(fx2, fy2 - 1, fz2 + 1, 25); // terra arada direta (atalho do teste)
    (window).__blocos.pump(2);
  }, [fx, fy, fz]);
  await page.evaluate(() => { (window).__blocos.limparInv(); (window).__blocos.dar(117, 4); (window).__blocos.selecionar(0); });
  await mirar(fx, fy - 1, fz + 1);
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); });
  const plantaNaChuva = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return [...m.plantas.values()][0] ?? -1;
  });
  ok("na chuva a planta amadurece em ~10,9 s (×2,4 mais rápido)", Math.abs(plantaNaChuva - 26 * 0.42) < 0.3);
  await pump(260, 0.05);
  ok("trigo madurou na chuva", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 27;
  }, [fx, fy, fz]));
  // tempestade: relâmpagos e trovoada (verificar DURANTE o pump — o flash dura 0,14 s)
  const viuRelampago = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    (window).__blocos.definirMeteo("tempestade", 90);
    let viu = false;
    for (let i = 0; i < 800; i++) { m.passo(0.05); if (m.relampagoT > 0) viu = true; }
    return viu;
  });
  ok("tempestade dispara relâmpagos", viuRelampago);
  ok("meteo volta a limpo quando forçado", await page.evaluate(() => {
    (window).__blocos.definirMeteo("limpo", 60);
    (window).__blocos.pump(40);
    return (window).__blocos.meteo() === "limpo";
  }));

  // ═══ 7. TNT ═══
  console.log("\n── 7. TNT: acender · fusível · explosão ──");
  ({ fx, fy, fz } = await arena());
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv(); b.dar(28, 1); b.selecionar(0);
    b.definirVida(20);
  });
  await mirar(fx, fy - 1, fz + 1);
  await page.evaluate(() => { (window).__blocos.colocar(); (window).__blocos.pump(2); });
  ok("TNT colocada no mundo", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 28;
  }, [fx, fy, fz]));
  // bloco de prova que a explosão vai destruir (2 blocos atrás da TNT)
  await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    m.mundo.setBloco(fx2 + 2, fy2, fz2 + 1, 3); // pedra de prova
    (window).__blocos.pump(1);
  }, [fx, fy, fz]);
  // recuar 3 blocos antes de acender (distância 4,5 m < alcance 5)
  await page.evaluate(([fx2, fy2, fz2]) => {
    const b = (window).__blocos;
    b.teleportar(fx2 + 0.5, fy2 + 0.02, fz2 - 3);
    b.pump(2);
  }, [fx, fy, fz]);
  await mirar(fx, fy, fz + 1); // mirar a TNT
  await page.evaluate(() => { (window).__blocos.atacar(); (window).__blocos.pump(2); });
  ok("atacar a TNT acende o fusível (1 ativa)", (await cap()).tntAtivos === 1);
  ok("bloco TNT saiu do mundo (virou entidade)", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2, fy2, fz2 + 1) === 0;
  }, [fx, fy, fz]));
  // fusível + explosão: rastrear tremor DURANTE o pump (decai em ~0,45 s reais)
  const explodiu = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    let tremeu = false, estourou = false;
    for (let i = 0; i < 70; i++) {
      m.passo(0.05);
      if (m.tremerT > 0) tremeu = true;
      if (i > 10 && m.tntAcesas.length === 0) estourou = true;
    }
    return { tremeu, estourou };
  });
  ok("fusível explodiu (0 ativas)", explodiu.estourou);
  ok("explosão destruiu a pedra de prova (raio TNT > raio estourador)", await page.evaluate(([fx2, fy2, fz2]) => {
    const m = (window).__blocos.motor;
    return m.mundo.getBloco(fx2 + 2, fy2, fz2 + 1) === 0;
  }, [fx, fy, fz]));
  ok("conquista Demolidor desbloqueada", (await cap()).conquistas.includes("demolidor"));
  ok("tremor de câmara na explosão", explodiu.tremeu);

  // ═══ 8. SAVE v3 ═══
  console.log("\n── 8. Save v3: baús · armadura · plantas · meteo ──");
  ({ fx, fy, fz } = await arena());
  await page.evaluate(() => {
    const b = (window).__blocos;
    b.limparInv();
    b.dar(124, 1); b.selecionar(0); b.equipar(); // armadura de ferro
    b.definirMeteo("chuva", 120);
    b.guardar();
  });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem("bateu_blocos_save") || "null"));
  ok("save na versão 3", save && save.v === 3);
  ok("save guarda a armadura equipada", save && save.armadura && save.armadura.id === 124);
  ok("save guarda o meteo", save && save.meteo === "chuva");
  ok("save guarda os baús (estrutura presente)", save && typeof save.baus === "object");
  // recarregar o mundo pelo mesmo caminho do botão CONTINUAR (o addInitScript limpa o storage a cada navegação)
  await page.evaluate(() => { (window).__blocos.iniciar("sobrevivencia", true); });
  ok("mundo continua a jogar (load do save)", await aguardar(async () => (await cap())?.fase === "jogando", 80, "fase após continuar"));
  ok("armadura restaurada do save", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.inv.armadura && m.inv.armadura.id === 124;
  }));
  ok("redução de armadura ativa após load", await page.evaluate(() => Math.abs((window).__blocos.reducao() - 0.3) < 0.001));
  ok("meteo restaurado do save", await page.evaluate(() => (window).__blocos.meteo() === "chuva"));
  const bauRestaurado = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const ks = [...m.baus.keys()];
    return { n: ks.length, slotsOk: ks.every((k) => Array.isArray(m.baus.get(k)) && m.baus.get(k).length === 18) };
  });
  ok(`baús restaurados do save (${bauRestaurado.n})`, bauRestaurado.n >= 1 && bauRestaurado.slotsOk);

  // ═══ 9. REGRESSÕES RÁPIDAS ═══
  console.log("\n── 9. Regressões rápidas ──");
  ok("selector criativo inclui TNT e baú", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const l = m.listaBlocosCriativos();
    return l.includes(28) && l.includes(29) && l.length === 20;
  }));
  ok("5 câmaras continuam a ciclar", await page.evaluate(() => {
    const b = (window).__blocos;
    b.definirCamara("cinema");
    return b.ciclarCamara() === "primeira";
  }));
  const mm = await page.evaluate(() => (window).__blocos.miniMapa());
  ok("minimapa continua a amostrar células reais", mm && mm.celulas.length === 48 * 48);
  // mobs clássicos continuam
  const zumbi = await page.evaluate(() => {
    const z = (window).__blocos.spawnarMob("zumbi", 2, 0);
    return { tipo: z.tipo, hp: z.hp };
  });
  ok("zumbi intacto (20 hp)", zumbi.tipo === "zumbi" && zumbi.hp === 20);
  // console limpo (só erros reais)
  const errosReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("sem erros de consola relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   ", errosReais.slice(0, 5).join("\n    "));

  // resumo
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULTADO: ${passed} ✅ · ${failed} ❌`);
  if (fails.length) { console.log(`  Falhas:\n  - ${fails.join("\n  - ")}`); }
  console.log(`════════════════════════════════════════\n`);
  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
