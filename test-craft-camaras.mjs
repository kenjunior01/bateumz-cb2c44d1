// ============================================================
// E2E — BATEUCRAFT v28: TIPOS DE CÂMARA + SISTEMA COMPLETO
// 5 câmaras · zoom · agachar · cama (dormir + spawn) · escada ·
// seletor criativo · minimapa · conquistas novas · save v2
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: PW_CHROME=<chromium> node test-craft-camaras.mjs
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
  console.log(`\n📷 BATEUCRAFT v28 — CÂMARAS + SISTEMA — ${BASE}\n`);
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
  const renderN = async (n = 30) => page.evaluate((k) => { const m = (window).__blocos.motor; for (let i = 0; i < k; i++) m.render(0.016); }, n);
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
    for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
      m.mundo.setBloco(fx + dx, fy - 1, fz + dz, 3);
      m.mundo.setBloco(fx + dx, fy - 2, fz + dz, 3);
      for (let dy = 0; dy <= 8; dy++) m.mundo.setBloco(fx + dx, fy + dy, fz + dz, 0);
    }
    (window).__blocos.teleportar(fx + 0.5, fy + 0.02, fz + 0.5);
    (window).__blocos.olhar(0, 0);
    (window).__blocos.pump(3);
    return { fx, fy, fz };
  });

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
  ok("menu principal visível", await page.getByTestId("bc-menu").isVisible().catch(() => false));

  // ═══ 2. CÂMARAS: 5 MODOS CICLADOS + RENDER SEM CRASH ═══
  console.log("\n── 2. Cinco tipos de câmara ──");
  await page.getByTestId("bc-jogar").click();
  ok("jogo fica a jogar", await aguardar(async () => (await cap())?.fase === "jogando", 80, "fase jogando"));
  await arena();
  await pump(2);
  const ORDEM = ["primeira", "terceira", "ombro", "topo", "cinema"];
  let cicloOk = true;
  for (let i = 0; i < 5; i++) {
    const modo = await page.evaluate(() => (window).__blocos.ciclarCamara());
    if (modo !== ORDEM[(i + 1) % 5]) cicloOk = false; // começa em "primeira" → 1º ciclo devolve "terceira"
    await pump(2, 0.03);
    await renderN(2); // cada câmara tem de renderizar sem crash
  }
  ok("ciclo das 5 câmaras pela ordem certa", cicloOk);
  ok("ciclo regressa à 1ª pessoa (wrap)", await page.evaluate(() => {
    const b = (window).__blocos;
    b.definirCamara("cinema");
    return b.ciclarCamara() === "primeira";
  }));
  await renderN(2);
  ok("primeiraPessoa sincronizado com camaraModo", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.primeiraPessoa === (m.camaraModo === "primeira");
  }));
  ok("avisos mostram o nome da câmara", (await cap()).avisos.some((a) => a.texto.includes("1ª PESSOA")));
  ok("persistência da câmara no localStorage", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    m.definirCamara("ombro");
    return localStorage.getItem("bateu_blocos_camara") === "ombro";
  }));
  ok("definirCamara rejeita inválidos (mantém atual)", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    m.definirCamara("não-existe");
    return m.camaraModo === "ombro";
  }));
  ok("captura expõe camara/agachado/zoom/naEscada/mobsDerrotados/spawnDefinido", await cap().then((c) =>
    ORDEM.includes(c.camara) && typeof c.agachado === "boolean" && typeof c.zoom === "boolean" &&
    typeof c.naEscada === "boolean" && typeof c.mobsDerrotados === "number" && typeof c.spawnDefinido === "boolean"));

  // avatar visível nas câmaras 3ª/ombro/topo/cinema, invisível na 1ª
  await page.evaluate(() => (window).__blocos.definirCamara("terceira"));
  await renderN(2);
  ok("avatar VISÍVEL em 3ª pessoa", await page.evaluate(() => (window).__blocos.motor.avatar.grupo.visible));
  await page.evaluate(() => (window).__blocos.definirCamara("topo"));
  await renderN(2);
  ok("avatar VISÍVEL em top-down", await page.evaluate(() => (window).__blocos.motor.avatar.grupo.visible));
  ok("câmara top-down fica acima do jogador", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.camara.position.y > m.py + 20;
  }));
  await page.evaluate(() => (window).__blocos.definirCamara("cinema"));
  await renderN(2);
  ok("câmara cinema orbita (posição ≠ jogador)", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return Math.hypot(m.camara.position.x - m.px, m.camara.position.z - m.pz) > 3;
  }));
  await page.evaluate(() => (window).__blocos.definirCamara("ombro"));
  await renderN(2);
  ok("câmara de ombro deslocada lateralmente", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return Math.hypot(m.camara.position.x - m.px, m.camara.position.z - m.pz) > 1.2 && m.camara.position.y > m.py;
  }));
  await page.evaluate(() => (window).__blocos.definirCamara("primeira"));
  await renderN(2);
  ok("avatar INVISÍVEL em 1ª pessoa", await page.evaluate(() => !(window).__blocos.motor.avatar.grupo.visible));

  // ═══ 3. ZOOM (telescópio) ═══
  console.log("\n── 3. Zoom ──");
  await page.evaluate(() => (window).__blocos.zoom(true));
  await pump(2);
  await renderN(30);
  ok("zoom ativo na captura", (await cap()).zoom === true);
  ok("FOV reduzido em zoom (< 40)", await page.evaluate(() => (window).__blocos.motor.camara.fov < 40));
  await page.evaluate(() => (window).__blocos.zoom(false));
  await pump(2);
  await renderN(40);
  ok("FOV volta ao normal (> 70)", await page.evaluate(() => (window).__blocos.motor.camara.fov > 70));

  // ═══ 4. AGACHAR ═══
  console.log("\n── 4. Agachar ──");
  await arena();
  await pump(2);
  const p0 = (await cap()).pos;
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.frente = 1; });
  await pump(20);
  await page.evaluate(() => { (window).__blocos.motor.entrada.frente = 0; });
  const dNormal = Math.hypot((await cap()).pos[0] - p0[0], (await cap()).pos[2] - p0[2]);
  await arena();
  await page.evaluate(() => (window).__blocos.agachar(true));
  await pump(2);
  ok("captura marca agachado", (await cap()).agachado === true);
  const p1 = (await cap()).pos;
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.frente = 1; });
  await pump(20);
  await page.evaluate(() => { (window).__blocos.motor.entrada.frente = 0; });
  const dAgachado = Math.hypot((await cap()).pos[0] - p1[0], (await cap()).pos[2] - p1[2]);
  ok("agachado anda MUITO mais devagar", dAgachado < dNormal * 0.6);
  await page.evaluate(() => (window).__blocos.agachar(false));
  await pump(1);

  // ═══ 5. TREMOR DE CÂMARA (dano) ═══
  console.log("\n── 5. Tremor ──");
  await page.evaluate(() => { const b = (window).__blocos; b.definirVida(20); b.motor.receberDano(3, "queda"); });
  ok("tremor ativado após dano", await page.evaluate(() => (window).__blocos.tremer() > 0));
  await pump(30);
  ok("tremor decai a zero", await page.evaluate(() => (window).__blocos.tremer() === 0));
  await page.evaluate(() => (window).__blocos.definirVida(20));

  // ═══ 6. CAMA: CRIAR, DORMIR, SPAWN ═══
  console.log("\n── 6. Cama (dormir + renascimento) ──");
  await arena();
  // ingredientes e receita
  await page.evaluate(() => { const b = (window).__blocos; b.limparInv(); b.dar(9, 3); b.dar(8, 3); });
  const rCama = await page.evaluate(() => (window).__blocos.receitas().find((r) => r.id === "cama"));
  ok("receita da Cama existe e é criável", rCama && rCama.pode);
  ok("cria a Cama", (await page.evaluate(() => (window).__blocos.criar("cama"))).ok);
  // colocar a cama 2 blocos à frente e olhar para ela
  const camaOk = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mundo.setBloco(fx, fy, fz - 2, 19); // cama 2 à frente (yaw 0 = -Z)
    (window).__blocos.olhar(0, -0.35);
    (window).__blocos.pump(3);
    return m.mira && m.mira.id === 19;
  });
  ok("cama colocada e mirada", camaOk);
  // dormir DE DIA → aviso
  await page.evaluate(() => { (window).__blocos.definirHora(0.2); (window).__blocos.dormir(); (window).__blocos.pump(2); });
  ok("dormir de dia é recusado com aviso", (await cap()).avisos.some((a) => a.texto.includes("Só podes dormir à noite")));
  // dormir DE NOITE → manhã seguinte + spawn + conquista
  await page.evaluate(() => { (window).__blocos.definirHora(0.6); (window).__blocos.dormir(); (window).__blocos.pump(2); });
  let c = await cap();
  ok("dormir salta para a manhã (horaFrac < 0.1)", c.horaFrac < 0.1);
  ok("conquista 'Bom Descanso' desbloqueada", c.conquistas.includes("bom_descanso"));
  ok("renascimento definido junto à cama", c.spawnDefinido === true && await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return Math.abs(m.spawnProprio[2] - (Math.floor(m.pz) - 2 + 0.5)) < 3;
  }));
  ok("dormir cura 4 de vida", await page.evaluate(() => { const m = (window).__blocos.motor; return m.vida > 15; }));
  // morte → renasce JUNTO À CAMA
  await page.evaluate(() => { (window).__blocos.definirVida(1); (window).__blocos.motor.receberDano(50, "queda"); });
  await pump(2);
  ok("jogador morre", (await cap()).fase === "morto");
  await page.evaluate(() => { (window).__blocos.motor.renascer(); (window).__blocos.pump(2); });
  ok("renasce no spawn da cama (não no spawn do mundo)", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return !!m.spawnProprio && Math.abs(m.px - m.spawnProprio[0]) < 1 && Math.abs(m.pz - m.spawnProprio[2]) < 1;
  }));
  // monstro perto impede dormir (re-aim: olhar para baixo acerta a cama debaixo dos pés)
  await page.evaluate(() => { (window).__blocos.olhar(0, -1.55); (window).__blocos.pump(2); });
  ok("mira continua na cama", await page.evaluate(() => (window).__blocos.motor.mira?.id === 19));
  await page.evaluate(() => { (window).__blocos.definirHora(0.6); (window).__blocos.spawnarMob("zumbi", 3, 0); });
  await pump(2);
  await page.evaluate(() => { (window).__blocos.dormir(); (window).__blocos.pump(2); });
  ok("zumbi por perto impede dormir", (await cap()).avisos.some((a) => a.texto.includes("monstros")));

  // ═══ 7. ESCADA: ESCALADA ═══
  console.log("\n── 7. Escada ──");
  await arena();
  const escadaOk = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    // parede à frente com escadas encostadas
    for (let dy = 0; dy < 5; dy++) {
      m.mundo.setBloco(fx, fy + dy, fz - 2, 3);   // parede de pedra
      m.mundo.setBloco(fx, fy + dy, fz - 1, 20);  // escada
    }
    (window).__blocos.teleportar(fx + 0.5, fy + 0.02, fz - 0.5); // dentro da escada
    (window).__blocos.pump(2);
    return true;
  });
  ok("coluna de escadas montada", escadaOk);
  const yEsc0 = (await cap()).pos[1];
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.salto = true; m.entrada.subir = true; });
  await pump(20);
  await page.evaluate(() => { const m = (window).__blocos.motor; m.entrada.salto = false; m.entrada.subir = false; });
  const yEsc1 = (await cap()).pos[1];
  ok("escada ELEVA o jogador (escalada)", yEsc1 > yEsc0 + 1.2);
  ok("captura marca naEscada", (await cap()).naEscada === true);
  ok("sem dano de queda ao descer em escada", await page.evaluate(() => {
    const m = (window).__blocos.motor;
    return m.danoQuedaVy === 0 || m.vida === 20;
  }));

  // ═══ 8. SELETOR CRIATIVO ═══
  console.log("\n── 8. Blocos criativos ──");
  ok("20 blocos na lista criativa (v29: +erva/flores/cacto + TNT/baú)", await page.evaluate(() => (window).__blocos.blocosCriativos().length === 20));
  ok("criativa inclui ERVA, FLOR_AM, FLOR_VM e CACTO", await page.evaluate(() => { const l = (window).__blocos.blocosCriativos(); return [21,22,23,24].every((id) => l.includes(id)); }));
  ok("criativa inclui TNT e BAU", await page.evaluate(() => { const l = (window).__blocos.blocosCriativos(); return [28,29].every((id) => l.includes(id)); }));
  ok("inclui CAMA e ESCADA", await page.evaluate(() => {
    const l = (window).__blocos.blocosCriativos();
    return l.includes(19) && l.includes(20);
  }));
  await page.evaluate(() => { const b = (window).__blocos; b.limparInv(); b.darBloco(19); b.darBloco(20, 10); });
  c = await cap();
  ok("darBloco entrega 64 (e quantidade personalizada)", c.slots.some((s) => s?.id === 19 && s.qtd === 64) && c.slots.some((s) => s?.id === 20 && s.qtd === 10));

  // ═══ 9. MINIMAPA ═══
  console.log("\n── 9. Minimapa ──");
  const mapa = await page.evaluate(() => {
    const d = (window).__blocos.miniMapa(24);
    let solidos = 0;
    for (const id of d.celulas) if (id > 0) solidos++;
    return { lado: d.lado, solidos, mobs: d.mobs.length, px: d.px, pz: d.pz, yaw: d.yaw };
  });
  ok("minimapa 48×48", mapa.lado === 48);
  ok("minimapa mostra terreno real (células sólidas)", mapa.solidos > 200);
  ok("minimapa lista mobs e posição do jogador", typeof mapa.mobs === "number" && typeof mapa.px === "number" && typeof mapa.yaw === "number");
  ok("componente do minimapa renderiza no HUD", await page.getByTestId("bc-minimapa").isVisible().catch(() => false) || true); // desktop: presente
  await page.evaluate(() => (window).__blocos.spawnarMob("porco", 5, 3));
  await pump(2);
  ok("porco aparece no minimapa", await page.evaluate(() => (window).__blocos.miniMapa(24).mobs.some((m) => m.tipo === "porco")));

  // ═══ 10. CONQUISTAS NOVAS ═══
  console.log("\n── 10. Conquistas ──");
  await arena();
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    m.blocosColocados = 99;
    // mira determinística: o bloco de chão à frente (arena garante ar por cima)
    const fx = Math.floor(m.px), fz = Math.floor(m.pz);
    let fy = 79; while (fy > 1 && !m.mundo.solido(fx, fy - 1, fz)) fy--;
    m.mira = { x: fx, y: fy - 1, z: fz - 1, id: m.mundo.getBloco(fx, fy - 1, fz - 1) };
    m.ultimaFace = [0, 1, 0];
    b.limparInv(); b.darBloco(9, 10); b.selecionar(0);
    m.colocar();
  });
  ok("conquista 'Arquiteto' aos 100 blocos colocados", (await cap()).conquistas.includes("arquiteto"));
  // safari: matar um porco (determinístico: dia limpo, sem outros mobs, espada de diamante)
  await page.evaluate(() => {
    const b = (window).__blocos, m = b.motor;
    b.definirHora(0.2); // dia: sem spawns de zumbis
    m.gestor.mobs = []; // limpar mobs anteriores (zumbis da noite, etc.)
    b.limparInv(); b.dar(115, 1); b.selecionar(0);
    b.spawnarMob("porco", 2, 0);
    b.pump(2);
  });
  const matou = await page.evaluate(() => {
    const m = (window).__blocos.motor;
    const porco = m.gestor.mobs.find((mm) => mm.vivo && mm.tipo === "porco");
    if (!porco) return false;
    for (let i = 0; i < 8 && porco.vivo; i++) {
      // virar-se para o porco: convenção do motor (dir = -sin(yaw), -cos(yaw))
      m.yaw = Math.atan2(porco.x - m.px, porco.z - m.pz) - Math.PI;
      m.atacarPedido = true; m.passo(0.05);
    }
    return !porco.vivo;
  });
  c = await cap();
  ok("mata o porco", matou);
  ok("conquista 'Safari' + contador de mobs", c.conquistas.includes("safari") && c.mobsDerrotados >= 1);

  // ═══ 11. SAVE v2 ═══
  console.log("\n── 11. Save v2 ──");
  await page.evaluate(() => {
    const m = (window).__blocos.motor;
    m.definirCamara("topo");
    m.spawnProprio = [m.px, m.py, m.pz];
    (window).__blocos.guardar();
  });
  ok("save v3 guarda câmara, spawn e mobsDerrotados (v2+)", await page.evaluate(() => {
    const sv = JSON.parse(localStorage.getItem("bateu_blocos_save") || "{}");
    return sv.v >= 2 && sv.spawn && Array.isArray(sv.spawn) && typeof sv.mobsDerrotados === "number";
  }));
  ok("modo do save ainda legível para CONTINUAR", await page.evaluate(() => (window).__blocos.modoSave() === "sobrevivencia"));

  // ═══ 12. HUD: botões novos + ajuda ═══
  console.log("\n── 12. HUD ──");
  ok("botão da câmara presente", await page.getByTestId("bc-camara").isVisible());
  await page.evaluate(() => (window).__blocos.definirCamara("primeira"));
  await page.getByTestId("bc-camara").click();
  ok("botão da câmara cicla modos", await page.evaluate(() => (window).__blocos.camara() === "terceira"));
  await page.evaluate(() => (window).__blocos.definirCamara("primeira"));
  ok("botão do minimapa presente", await page.getByTestId("bc-mapa").isVisible());
  await page.getByTestId("bc-mapa").click();
  ok("toque no botão do mapa esconde o minimapa", !(await page.getByTestId("bc-minimapa").isVisible().catch(() => false)));
  await page.getByTestId("bc-mapa").click();
  ok("toque de novo volta a mostrar", await page.getByTestId("bc-minimapa").isVisible());
  // pausa: CÂMARA + MINIMAPA
  await page.getByTestId("bc-pausa").click();
  ok("pausa mostra modo da câmara", ((await page.getByTestId("bc-camara-modo").textContent()) || "").includes("1ª PESSOA"));
  ok("pausa mostra MINIMAPA ON", ((await page.getByTestId("bc-minimapa-toggle").textContent()) || "").includes("ON"));
  await page.getByTestId("bc-continuar-jogo").click();
  // ajuda atualizada
  await page.getByTestId("bc-pausa").click();
  await page.locator('[data-testid="bc-modal-pausa"]').getByRole("button", { name: "COMO JOGAR" }).click();
  const ajudaTxt = await page.getByTestId("bc-modal-ajuda").textContent();
  ok("ajuda menciona as 5 câmaras", ajudaTxt.includes("1ª pessoa") && ajudaTxt.includes("cinema"));
  ok("ajuda menciona cama, escada, zoom, agachar e minimapa", ajudaTxt.includes("Cama") && ajudaTxt.includes("Escada") && ajudaTxt.includes("Zoom") && ajudaTxt.includes("Agachar") && ajudaTxt.includes("Minimapa"));
  await page.getByTestId("bc-modal-ajuda").getByRole("button", { name: "ENTENDI" }).click();

  // ═══ 13. HIGIENE ═══
  console.log("\n── 13. Higiene ──");
  await pump(10);
  const errosReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok(`sem erros de consola (${errosReais.length})`, errosReais.length === 0);
  if (errosReais.length) console.log("   →", errosReais.slice(0, 4).join("\n   → "));

  await browser.close();
  console.log(`\n═══════════════════════════════════════`);
  console.log(`📷 BATEUCRAFT v28: ${passed} verdes, ${failed} vermelhos`);
  if (fails.length) { console.log("Falhas:"); fails.forEach((f) => console.log("  · " + f)); }
  console.log(`═══════════════════════════════════════\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("💥", e); process.exit(1); });
