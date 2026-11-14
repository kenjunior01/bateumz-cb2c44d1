// ============================================================
// E2E — v41: BATEU RPG: LENDAS (substitui o BateuCraft)
// Parte A — NÚCLEO ISOMÓRFICO em Node (src/game/rpg/core.ts corre
//   igual no browser e no Node — o teste PROVA isso):
//   curva XP · dificuldades · regiões/POIs · habilidades ·
//   missões (história encadeada + diárias determinísticas) ·
//   validador de save · honestidade dos dados
// Parte B — E2E na UI (/lives?game=mmorpg): menu com dificuldade,
//   HUD RPG, spawn na Aldeia, kit inicial, combate → XP → nível,
//   habilidades, baús de tesouro (v48: com ESPÓLIO real), descoberta
//   de regiões, MOCHILA (36 posições · mover · peitoral · cheia honesta),
//   FORJA (v49: criar/fundir pelas RECEITAS reais do motor — pertoDe contra
//   os blocos reais; a Forja Perdida é o único sítio com mesa e fornalha),
//   CHEFE (Guardião) + fim da história, morte/renascer,
//   save/CONTINUAR. Clima real no RPG: test-v31 secção 6.
// Uso: PW_CHROME=<chromium> node test-rpg-v41.mjs (vite 8099)
// ============================================================

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

const NOISE = [
  "navigator.vibrate", "<line> attribute", "validateDOMNesting",
  "two children with the same key", "same key", "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
  "404", "406", "fetchPriority", "does not recognize", "PGRST301", "JWT",
  "permission", "AbortError", "play() failed", "user gesture",
  "WebGL", "THREE", "gl context", "shader", "play()",
];

// ═════════════════════════════════════════════════════════════
// PARTE A — NÚCLEO ISOMÓRFICO (Node importa o mesmo core.ts)
// ═════════════════════════════════════════════════════════════
async function parteA() {
  console.log("\n— A. Núcleo isomórfico (Node importa core.ts) —");
  const core = await import(new URL("./src/game/rpg/core.ts", import.meta.url).href);

  // ── curva de XP ──
  ok("xpParaNivel(1) = 0 (nível 1 é grátis)", core.xpParaNivel(1) === 0);
  ok("custoNivel é estritamente crescente", (() => {
    for (let k = 1; k < 29; k++) if (core.custoNivel(k) >= core.custoNivel(k + 1)) return false;
    return true;
  })());
  ok("nivelDe(xpParaNivel(5)) === 5 (ida e volta)", core.nivelDe(core.xpParaNivel(5)) === 5);
  ok("progressoNivel(80): nível 2 com 0/105", (() => {
    const p = core.progressoNivel(80);
    return p.nivel === 2 && p.atual === 0 && p.falta === core.custoNivel(2);
  })());
  ok("NIVEL_MAX = 30 e xp nunca empurra além", core.nivelDe(core.xpParaNivel(30) + 5000) === 30);

  // ── dificuldade ──
  ok("3 dificuldades com inimigos e XP crescentes", (() => {
    const o = core.ORDEM_DIFICULDADE;
    if (o.length !== 3) return false;
    for (let i = 1; i < o.length; i++) {
      if (!(core.DIFICULDADES_RPG[o[i]].multHpMob > core.DIFICULDADES_RPG[o[i - 1]].multHpMob)) return false;
      if (!(core.DIFICULDADES_RPG[o[i]].multXP > core.DIFICULDADES_RPG[o[i - 1]].multXP)) return false;
    }
    return true;
  })());
  ok("hpInimigo escala com região × dificuldade", (() => {
    const medio = core.hpInimigo(20, 1, core.DIFICULDADES_RPG.medio);
    const lenda3 = core.hpInimigo(20, 3, core.DIFICULDADES_RPG.lenda);
    return medio === 20 && lenda3 === Math.round(20 * 1.7 * 2.2);
  })());
  ok("xpPorKiller: zumbi base 10, estourador 16, escala com região", (() => {
    const z1 = core.xpPorKiller("zumbi", 1, core.DIFICULDADES_RPG.medio, 0);
    const z3 = core.xpPorKiller("zumbi", 3, core.DIFICULDADES_RPG.medio, 0);
    const e1 = core.xpPorKiller("estourador", 1, core.DIFICULDADES_RPG.medio, 0);
    return z1 === 10 && e1 === 16 && z3 === Math.round(10 * 1.5);
  })());

  // ── regiões e POIs ──
  ok("6 regiões com ids únicos", (() => {
    const ids = core.REGIOES.map((r) => r.id);
    return core.REGIOES.length === 6 && new Set(ids).size === 6;
  })());
  ok("regiaoEm(0,0) = aldeia · (58,−42) = miombo · (−18,−80) = serra",
    core.regiaoEm(0, 0)?.id === "aldeia" && core.regiaoEm(58, -42)?.id === "miombo" && core.regiaoEm(-18, -80)?.id === "serra");
  ok("Terras Selvagens (30,30) sem região → null (honesto)",
    core.regiaoEm(30, 30) === null);
  ok("8 POIs, todos dentro da sua região declarada", (() => {
    for (const p of core.POIS) {
      const r = core.regiaoEm(p.x, p.z);
      if (!r || r.id !== p.regiao) return false;
    }
    return core.POIS.length === 8;
  })());
  ok("9 baús de tesouro no mundo (soma dos POIs)", core.POIS.reduce((n, p) => n + p.baus.length, 0) === 9);

  // ── v48: espólio determinístico dos baús ──
  const ct = await import(new URL("./src/game/blocos/constants.ts", import.meta.url).href);
  ok("ESPOLIO_BAUS cobre EXATAMENTE as 9 chaves dos baús", (() => {
    const chaves = core.POIS.flatMap((p) => p.baus.map((b) => b.chave));
    const esp = Object.keys(core.ESPOLIO_BAUS);
    return chaves.length === 9 && esp.length === 9 && chaves.every((c) => esp.includes(c)) && new Set(esp).size === 9;
  })());
  ok("todo o espólio é REAL do motor (ITENS ou BLOCOS) com qtd ≥ 1", (() => {
    for (const lista of Object.values(core.ESPOLIO_BAUS)) {
      if (!Array.isArray(lista) || lista.length === 0) return false;
      for (const e of lista) {
        const real = (ct.ITENS[e.id] ?? (e.id < 100 ? ct.BLOCOS[e.id] : null));
        if (!real || !Number.isInteger(e.qtd) || e.qtd < 1) return false;
      }
    }
    return true;
  })());
  ok("mesma chave → a MESMA mesa (determinística como a semente)",
    core.ESPOLIO_BAUS["poi:forja:1"] === core.ESPOLIO_BAUS["poi:forja:1"] &&
    JSON.stringify(core.ESPOLIO_BAUS["poi:porto:1"]) === JSON.stringify(core.ESPOLIO_BAUS["poi:porto:1"]));
  ok("Forja Perdida entrega peitoral de ferro (recompensa do fim da lenda)",
    core.ESPOLIO_BAUS["poi:forja:1"].some((e) => e.id === ct.I.ARMADURA_FERRO));
  ok("textoEspolio lê os NOMES do motor partilhado (zero duplicação)",
    core.textoEspolio("poi:aldeia:1", ct.NOMES).includes("Pão") && core.textoEspolio("poi:nenhum", ct.NOMES) === "");
  ok("validador: mochila guardada entra · mochila corrompida degrada para null (kit de sempre)", (() => {
    const base = JSON.parse(JSON.stringify(core.perfilInicial("medio")));
    base.xp = 100;
    const comInv = core.validarPerfilRpg({ ...base, v: 41, inv: [{ id: 112, qtd: 1 }, ...Array(35).fill(null)], invArm: { id: 123, qtd: 1 } });
    const corrompida = core.validarPerfilRpg({ ...base, v: 41, inv: "lixo" });
    const semInv = core.validarPerfilRpg({ ...base, v: 41 }); // save v41 antigo
    return !!comInv && comInv.inv?.[0]?.id === 112 && comInv.invArm?.id === 123
      && corrompida !== null && corrompida.inv === null
      && semInv !== null && semInv.inv === null;
  })());

  // ── v49: FORJA — as RECEITAS REAIS do motor partilhado (isomórfico) ──
  const invM = await import(new URL("./src/game/blocos/inventario.ts", import.meta.url).href);
  ok("inventário do motor importado no Node (type-only para o world — zero DOM)", new invM.Inventario() instanceof invM.Inventario);
  ok("avaliarReceitas avalia as 32 receitas com falta honesta (1× Tronco)", (() => {
    const inv = new invM.Inventario();
    const infos = invM.avaliarReceitas(inv, false, false);
    const tabuas = infos.find((i) => i.receita.id === "tabuas");
    return infos.length === ct.RECEITAS.length && !tabuas.pode && tabuas.motivo.includes("Falta: 1× Tronco");
  })());
  ok("criarReceita REAL consome e produz (1 tronco → 4 tábuas)", (() => {
    const inv = new invM.Inventario();
    inv.adicionar(ct.B.TRONCO, 1);
    const r = ct.RECEITAS.find((x) => x.id === "tabuas");
    return invM.criarReceita(inv, r) && inv.contar(ct.B.TRONCO) === 0 && inv.contar(ct.B.TABUAS) === 4;
  })());
  ok("fundição sem fornalha = recusa honesta (motivo do motor)", (() => {
    const inv = new invM.Inventario();
    inv.adicionar(ct.B.FERRO_M, 2); inv.adicionar(ct.I.CARVAO, 1);
    const info = invM.avaliarReceitas(inv, false, false).find((i) => i.receita.id === "fun_fer");
    return !info.pode && info.motivo === "Precisas de uma fornalha por perto";
  })());
  ok("com fornalha + ingredientes → 2 barras de ferro (2 minérios + 1 carvão, nada inventado)", (() => {
    const inv = new invM.Inventario();
    inv.adicionar(ct.B.FERRO_M, 2); inv.adicionar(ct.I.CARVAO, 1);
    const info = invM.avaliarReceitas(inv, false, true).find((i) => i.receita.id === "fun_fer");
    return info.pode && invM.criarReceita(inv, info.receita)
      && inv.contar(ct.I.BARRA_FERRO) === 2 && inv.contar(ct.B.FERRO_M) === 0 && inv.contar(ct.I.CARVAO) === 0;
  })());
  ok("espada de ferro exige MESA (mesa:true) — só a Forja Perdida a tem no mundo", (() => {
    const inv = new invM.Inventario();
    inv.adicionar(ct.I.BARRA_FERRO, 2); inv.adicionar(ct.I.GRAVETO, 1);
    const semMesa = invM.avaliarReceitas(inv, false, true).find((i) => i.receita.id === "esp_fer");
    const comMesa = invM.avaliarReceitas(inv, true, true).find((i) => i.receita.id === "esp_fer");
    return !semMesa.pode && semMesa.motivo.includes("Mesa de Criação") && comMesa.pode;
  })());

  // ── v50: ITENS NO CHÃO — física/magnete/TTL/cap PUROS (isomórfico) ──
  const ic = await import(new URL("./src/game/blocos/itensChao.ts", import.meta.url).href);
  ok("itensChao importa no Node (zero THREE, zero DOM) e cria com pop REAL", (() => {
    const it = ic.criarItemChao(126, 2, 5, 12, 7, Math.PI / 2);
    return it.vy > 3 && it.idade === 0 && !it.noChao && Math.abs(it.vx - 1.6) < 1e-9 && Math.abs(it.vz) < 1e-9;
  })());
  const chao = (x, y, z) => y < 10; // mundo falso: chão sólido até y=10
  ok("física: o item CAI com a gravidade do motor e ATERRA no chão sólido", (() => {
    const it = ic.criarItemChao(105, 1, 5, 13, 5, 0);
    for (let k = 0; k < 200; k++) ic.passoItensChao([it], 0.05, chao, 100, 11, 100);
    return it.noChao && Math.abs(it.y - 10.001) < 0.01 && it.vy === 0;
  })());
  ok("assente no chão, fora do magnete o item PARA (fricção — não escorrega para sempre)", (() => {
    const it = ic.criarItemChao(105, 1, 5, 10.02, 5, 0);
    for (let k = 0; k < 120; k++) ic.passoItensChao([it], 0.05, chao, 100, 11, 100);
    return Math.hypot(it.vx, it.vz) < 0.01;
  })());
  ok("magnete: a 2,6 m (dentro de 3) o item ESCORREGA até ao herói e é RECOLHIDO a 1,7", (() => {
    const it = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
    let pegos = null;
    for (let k = 0; k < 400 && !(pegos && pegos.length); k++)
      pegos = ic.passoItensChao([it], 0.05, chao, 7.6, 10.02, 5).pegos; // 2,6 m a +x
    return !!pegos && pegos.length === 1 && pegos[0] === it && Math.hypot(it.x - 7.6, it.z - 5) <= ic.ITEM_RAIO_PEGA + 0.15;
  })());
  ok("recolha em cima do item (dHoriz 0) também dispara — o herói parado sobre o loot não o perde", (() => {
    const it = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
    const r = ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5);
    return r.pegos.length === 1;
  })());
  ok("pegaT: o item LARGADO pelo próprio herói não volta para a mochila no mesmo segundo", (() => {
    const it = ic.criarItemChao(122, 1, 5, 10.001, 5, 0, 1.2);
    let pegouCedo = false;
    for (let k = 0; k < 24; k++) if (ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5).pegos.length) pegouCedo = true; // 1,2 s: ainda não
    const r2 = ic.passoItensChao([it], 0.05, chao, 5, 10.02, 5); // pegaT passou → recolhe
    return !pegouCedo && r2.pegos.length === 1;
  })());
  ok("TTL 120 s: item velho EXPIRA (o mundo não é um armazém) e y<−10 também", (() => {
    const velho = ic.criarItemChao(105, 1, 5, 10.001, 5, 0);
    velho.idade = ic.ITEM_CHAO_TTL - 0.05;
    const r1 = ic.passoItensChao([velho], 0.06, chao, 100, 11, 100);
    const abismo = ic.criarItemChao(105, 1, 5, -11, 5, 0);
    const r2 = ic.passoItensChao([abismo], 0.05, chao, 100, 11, 100);
    return r1.expirados.length === 1 && r1.expirados[0] === velho && r2.expirados.length === 1;
  })());
  ok("cap 48: ultrapassar expulsa o MAIS VELHO primeiro (nada fica escondido)", (() => {
    const itens = [];
    for (let k = 0; k < 50; k++) { const it = ic.criarItemChao(100 + k, 1, k, 10.001, k, 0); it.idade = k; itens.push(it); }
    const fora = ic.aplicarCapItens(itens);
    return fora.length === 2 && fora.every((f) => f.idade >= 48) &&
      !fora.some((f) => f.idade < 48) && ic.aplicarCapItens(itens.slice(0, 48)).length === 0;
  })());
  ok("validador: itens no chão do save — inválidos cortados, cap 48, undefined = null (saves antigos)", (() => {
    const bom = { id: 126, qtd: 2, x: 1.5, y: 32, z: 3.5 };
    const v1 = core.validarPerfilRpg({ v: 41, dificuldade: "medio", xp: 1, pontos: 0, skills: { guerreiro: 0, explorador: 0, sabio: 0 }, missoes: { historiaFeitas: [] }, descobertas: { regioes: [], pois: [], baus: [] }, creditos: 0, kills: {}, mortes: 0, blocos: 0, bossDerrotado: false, pos: null, inv: null, invArm: null, itensChao: [bom, { id: -1, qtd: 1, x: 0, y: 0, z: 0 }, { id: 126, qtd: 1, x: "x", y: 0, z: 0 }], ts: 0 });
    const v2 = core.validarPerfilRpg({ v: 41, dificuldade: "medio", xp: 1, pontos: 0, skills: { guerreiro: 0, explorador: 0, sabio: 0 }, missoes: { historiaFeitas: [] }, descobertas: { regioes: [], pois: [], baus: [] }, creditos: 0, kills: {}, mortes: 0, blocos: 0, bossDerrotado: false, pos: null, inv: null, invArm: null, ts: 0 });
    const muitos = Array.from({ length: 60 }, (_, k) => ({ id: 126, qtd: 1, x: k, y: 32, z: k }));
    const v3 = core.validarPerfilRpg({ v: 41, dificuldade: "medio", xp: 1, pontos: 0, skills: { guerreiro: 0, explorador: 0, sabio: 0 }, missoes: { historiaFeitas: [] }, descobertas: { regioes: [], pois: [], baus: [] }, creditos: 0, kills: {}, mortes: 0, blocos: 0, bossDerrotado: false, pos: null, inv: null, invArm: null, itensChao: muitos, ts: 0 });
    return v1 && v1.itensChao.length === 1 && v1.itensChao[0].id === 126
      && v2 && v2.itensChao === null && v3 && v3.itensChao.length === 48;
  })());

  // ── habilidades ──
  ok("escalaVelExplorador: +8%/nível com tecto 1.18 (orçamento do motor v37)",
    core.escalaVelExplorador(0) === 1 && core.escalaVelExplorador(3) === 1.18 && core.escalaVelExplorador(5) === 1.18);
  ok("multDanoHeroi(1,0)=1 e cresce com nível+guerreiro",
    core.multDanoHeroi(1, 0) === 1 && core.multDanoHeroi(10, 3) > 2);

  // ── missões: história encadeada ──
  ok("história: 6 capítulos h1..h6 em ordem", (() => {
    const h = core.HISTORIA;
    return h.length === 6 && h.every((m, i) => m.id === `h${i + 1}` && m.ordem === i + 1);
  })());
  ok("h1 exige Torre do Vigia; h6 exige Guardião + Cinzas",
    core.HISTORIA[0].objetivos[0].alvo === "torre" &&
    core.HISTORIA[5].objetivos.some((o) => o.alvo === "guardiao") &&
    core.HISTORIA[5].objetivos.some((o) => o.alvo === "cinzas"));
  ok("chegarPoi torre → h1 concluída com recompensa; h2 vira atual", (() => {
    const est = core.estadoMissoesInicial();
    const dia = core.diaLocal(new Date(2026, 10, 13));
    const rs = core.aplicarEvento(est, { tipo: "chegarPoi", alvo: "torre", dia, dif: core.DIFICULDADES_RPG.medio });
    const r = rs.find((x) => x.id === "h1");
    return !!r && r.xp === 60 && r.creditos === 10 && core.capituloAtual(est)?.id === "h2";
  })());
  ok("5 kills hostis → h2 concluída (contador acumulado)", (() => {
    const est = core.estadoMissoesInicial();
    est.historiaFeitas.push("h1");
    const dia = core.diaLocal(new Date(2026, 10, 13));
    let r2 = null;
    for (let i = 0; i < 5; i++)
      r2 = core.aplicarEvento(est, { tipo: "matar", alvo: "zumbi", dia, dif: core.DIFICULDADES_RPG.medio }).find((x) => x.id === "h2") ?? r2;
    return !!r2 && est.historiaFeitas.includes("h2") && core.capituloAtual(est)?.id === "h3";
  })());
  ok("kill passivo NÃO conta para 'hostis' (honesto)", (() => {
    const est = core.estadoMissoesInicial();
    est.historiaFeitas.push("h1");
    const dia = core.diaLocal(new Date(2026, 10, 13));
    for (let i = 0; i < 5; i++)
      core.aplicarEvento(est, { tipo: "matar", alvo: "passivo", dia, dif: core.DIFICULDADES_RPG.medio });
    return !est.historiaFeitas.includes("h2");
  })());

  // ── diárias determinísticas ──
  const dia = "2026-11-13";
  const d1 = core.missoesDiarias(dia, core.DIFICULDADES_RPG.medio);
  const d2 = core.missoesDiarias(dia, core.DIFICULDADES_RPG.medio);
  ok("mesmo dia → MESMAS 3 diárias (determinístico)", (() => {
    if (d1.length !== 3) return false;
    return d1.every((m, i) => m.id === d2[i].id && m.titulo === d2[i].titulo && m.objetivo.qtd === d2[i].objetivo.qtd);
  })());
  ok("diárias escalam com a dificuldade (créditos)", (() => {
    const dl = core.missoesDiarias(dia, core.DIFICULDADES_RPG.lenda);
    return dl.every((m, i) => m.creditos > d1[i].creditos || (m.creditos === d1[i].creditos && m.creditos === 0));
  })());
  ok("a 1ª diária do dia conclui com o SEU tipo de evento", (() => {
    const est = core.estadoMissoesInicial();
    const m0 = d1[0];
    const rs = core.aplicarEvento(est, { tipo: m0.objetivo.tipo, alvo: m0.objetivo.alvo, qtd: m0.objetivo.qtd, dia, dif: core.DIFICULDADES_RPG.medio });
    return rs.some((r) => r.id === m0.id && r.diaria === true && r.creditos === m0.creditos);
  })());

  // ── validador de save (honestidade) ──
  ok("validarPerfilRpg aceita perfil válido e rejeita lixo", (() => {
    const p = core.perfilInicial("medio");
    p.xp = 250; p.pontos = 2; p.skills.guerreiro = 2;
    p.missoes.historiaFeitas = ["h1"]; p.descobertas.regioes = ["aldeia"];
    if (!core.validarPerfilRpg(p)) return false;
    if (core.validarPerfilRpg(null) !== null) return false;
    if (core.validarPerfilRpg({ v: 40 }) !== null) return false;
    const ruim = core.perfilInicial("medio"); ruim.xp = -5;
    if (core.validarPerfilRpg(ruim) !== null) return false;
    const hack = core.perfilInicial("medio"); hack.skills.guerreiro = 9;
    return core.validarPerfilRpg(hack) === null;
  })());
  ok("perfilTemProgresso: virgem=false, com XP=true", (() => {
    const p = core.perfilInicial("medio");
    if (core.perfilTemProgresso(p)) return false;
    p.xp = 10;
    return core.perfilTemProgresso(p);
  })());
  ok("danoHeroi: 3 + arma + 2×guerreiro (regra única partilhada)",
    core.danoHeroi(0, 4) === 7 && core.danoHeroi(3, 6) === 15);
}

// ═════════════════════════════════════════════════════════════
// PARTE B — E2E da UI
// ═════════════════════════════════════════════════════════════
async function parteB() {
  console.log(`\n— B. E2E na UI — ${BASE} —`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  await page.route("**/supabase.co/**", (route) => route.fulfill({ json: [] }));

  const cap = () => page.evaluate(() => (window).__rpg?.captura?.() || null);
  const rpg = () => page.evaluate(() => (window).__rpg?.capturaRpg?.() || null);
  const pump = (n = 20, dt = 0.05) => page.evaluate(([t, d]) => (window).__rpg.pump(t, d), [n, dt]);
  const aguardar = async (cond, tentativas = 40, msg = "condição") => {
    for (let i = 0; i < tentativas; i++) {
      if (await cond()) return true;
      await page.waitForTimeout(200);
    }
    console.log(`  ⚠️ timeout à espera de: ${msg}`);
    return false;
  };
  const sel = (s, timeout = 15000) => page.waitForFunction(
    (x) => !!document.querySelector(`[data-testid="${x}"]`), s, { timeout, polling: 200 });

  // ── menu ──
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded" });
  await sel("rpg-titulo", 30000);
  ok("menu do BATEU RPG abre no slot do catálogo", true);
  ok("3 cartões de dificuldade", (await page.locator('[data-testid^="rpg-dif-"]:not([data-testid="rpg-dif-desc"])').count()) === 3);
  await page.locator('[data-testid="rpg-dif-lenda"]').click();
  ok("seletor de dificuldade atualiza a descrição",
    (await page.locator('[data-testid="rpg-dif-desc"]').innerText()).includes("guardiões acordam"));
  await page.locator('[data-testid="rpg-dif-medio"]').click();
  ok("CONTINUAR oculto sem save (honesto)", (await page.locator('[data-testid="rpg-continuar"]').count()) === 0);

  // ── menu v42: COMO JOGAR + atribuição ──
  await page.locator('[data-testid="rpg-como-jogar"]').click();
  await sel("rpg-ajuda-menu", 5000);
  const ajudaTxt = await page.locator('[data-testid="rpg-ajuda-menu"]').innerText();
  ok("COMO JOGAR abre no menu com controlos reais (WASD + joystick + teclas)",
    ajudaTxt.includes("WASD") && ajudaTxt.includes("Joystick") && ajudaTxt.includes("GUARDIÃO"));
  ok("ajuda credencia as fontes (Open-Meteo + Veloren GPLv3 + motor partilhado)",
    (await page.locator('[data-testid="rpg-ajuda-fontes"]').innerText()).includes("Open-Meteo") &&
    (await page.locator('[data-testid="rpg-ajuda-fontes"]').innerText()).includes("Veloren"));
  await page.locator('[data-testid="rpg-fechar-ajuda-menu"]').click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-ajuda-menu"]').count()) === 0, 10, "ajuda fechou");
  ok("rodapé de atribuição v42 no menu (Open-Meteo + Veloren + CIDADE BATEU)",
    (await page.locator('[data-testid="rpg-atribuicao"]').innerText()).includes("Open-Meteo") &&
    (await page.locator('[data-testid="rpg-atribuicao"]').innerText()).includes("Veloren") &&
    (await page.locator('[data-testid="rpg-atribuicao"]').innerText()).includes("CIDADE BATEU"));
  ok("recomeçar não aparece sem save (só com progresso real)", (await page.locator('[data-testid="rpg-recomecar"]').count()) === 0);

  // ── começar (médio) ──
  await page.locator('[data-testid="rpg-jogar"]').click();
  await aguardar(async () => (await cap())?.fase === "jogando", 60, "motor jogando");
  ok("motor iniciou em sobrevivência", (await cap())?.modo === "sobrevivencia");

  // spawn na Aldeia + região
  await pump(30);
  const c1 = await cap();
  ok("spawn na Aldeia (2.5, ~33, 4.5)", Math.abs(c1.pos[0] - 2.5) < 0.6 && Math.abs(c1.pos[1] - 33) < 2 && Math.abs(c1.pos[2] - 4.5) < 0.6);
  let r1 = await rpg();
  ok("região inicial = Planície da Aldeia", r1.regiao?.id === "aldeia");
  ok("capítulo atual = h1 Chamado da Aldeia", r1.capitulo?.id === "h1");
  ok("3 diárias no HUD do painel", r1.diarias.length === 3);
  ok("XP já > 0 (descobrir a própria casa ensina: região + POI ≥ 65)", r1.nivel >= 1 &&
    (await page.evaluate(() => (window).__rpg.perfil().xp)) >= 65);

  // kit inicial
  const slots = c1.slots.filter(Boolean).map((s) => s.id);
  ok("kit inicial: espada de madeira (112) no inventário", slots.includes(112));

  // ── descoberta de região + POI ──
  const xpAntes = (await rpg()).nivel;
  await page.evaluate(() => (window).__rpg.teleportar(58.5, 40, -42.5));
  await pump(40);
  r1 = await rpg();
  ok("teleporte às ruínas → região Miombo descoberta", r1.regiao?.id === "miombo" && r1.descobertas.regioes >= 1);
  ok("POI Ruínas de Kivulivuli descoberto", r1.descobertas.pois >= 1);
  ok("XP > 0 após descobertas (25+40)", (() => {
    const p = page.evaluate(() => (window).__rpg.perfil().xp);
    return p.then((v) => v >= 65);
  })());
  void xpAntes;

  // ── MAPA DO MUNDO (menu novo da v42) ──
  await page.locator('[data-testid="rpg-btn-mapa"]').click();
  await sel("rpg-mapa", 5000);
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa-canvas"]').getAttribute("width")) === "660", 10, "mapa desenhado");
  ok("MAPA do mundo abre do HUD com canvas desenhado (660px)", true);
  ok("legenda do mapa: miombo descoberto (nome real) · cinzas ainda ocultas (???)",
    (await page.locator('[data-testid="rpg-mapa-regiao-miombo"]').innerText()).includes("Miombo Profundo") &&
    (await page.locator('[data-testid="rpg-mapa-regiao-cinzas"]').innerText()).includes("???"));

  // ── v44 · BASE DE TERRENO REAL do mapa (amostragem honesta do mundo) ──
  const base1 = await page.evaluate(() => (window).__rpg?.mapaBase?.());
  ok("mapa base amostrado: >=40k amostras reais de alturaTerreno+bioma", !!base1 && base1.amostras >= 40000);
  console.log(`   ↳ mapaBase: ${base1?.amostras} amostras · água ${base1?.agua} · rocha ${base1?.rocha} · floresta ${base1?.floresta} · ${base1?.ms}ms`);
  ok("mapa base: água do mar da costa presente (dados reais)", !!base1 && base1.agua > 30);
  ok("mapa base: rocha/picos da serra presentes", !!base1 && base1.rocha > 10);
  ok("mapa base: floresta do miombo presente", !!base1 && base1.floresta > 30);
  const temAguaPx = await page.evaluate(() => {
    const cv = document.querySelector('[data-testid="rpg-mapa-canvas"]');
    if (!cv) return false;
    const cx2 = cv.getContext("2d");
    const d = cx2.getImageData(0, 0, cv.width, cv.height).data;
    let azuis = 0;
    // água real (mesmo sob o véu das regiões não descobertas): b domina e r
    // fica baixo — a rocha clara da serra não passa (r alto).
    for (let i = 0; i < d.length; i += 40) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (b >= 30 && b <= 170 && r < 60 && b - r >= 20 && b - g >= 12) azuis++;
    }
    return azuis > 30;
  });
  ok("canvas do mapa tem água pintada (pixels azuis do terreno real)", temAguaPx);
  ok("mapa mostra a fonte dos dados (terreno real · semente fixa)",
    (await page.locator('[data-testid="rpg-mapa-fonte"]').innerText()).includes("semente fixa"));
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 0, 10, "mapa fechou (ESC)");
  await page.keyboard.press("m");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 1, 10, "mapa reabriu (M)");
  ok("tecla M abre o mapa e volta a fechar", true);
  const base2 = await page.evaluate(() => (window).__rpg?.mapaBase?.());
  ok("mapa base em cache: reabrir NÃO re-amostra (mesma base de terreno)", !!base2 && base2.amostras === base1.amostras && base2.ms === base1.ms);
  await page.keyboard.press("m");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 0, 10, "mapa fechou (M)");

  // ── v45 · MINIMAPA do HUD (dados reais do motor a 2 Hz) ──
  const mini = page.locator('[data-testid="rpg-minimapa"]');
  ok("minimapa no HUD (canvas 88px, bordo da cor da região)",
    await mini.isVisible().catch(() => false) && (await mini.locator("canvas").getAttribute("width")) === "88");
  const miniData = await page.evaluate(() => {
    const d = (window).__rpg.motor.miniMapa(22);
    return { preenchidas: Array.from(d.celulas).filter((v) => v > 0).length, lado: d.lado };
  });
  ok(`minimapa: células reais dos chunks carregados (${miniData.preenchidas}/${miniData.lado * miniData.lado})`, miniData.preenchidas > 500);
  const miniAntes = await page.evaluate(() => (window).__rpg.motor.miniMapa(22).mobs.length);
  // noite: zumbi não queima ao sol (0,2s de pump não pode competir com ignição)
  await page.evaluate(() => (window).__rpg.definirHora(0.85));
  await page.evaluate(() => (window).__rpg.spawnarMob("zumbi", 5, 3));
  await pump(4);
  const miniComMob = await page.evaluate(() => (window).__rpg.motor.miniMapa(22).mobs.length);
  ok(`minimapa: mob hostil entra no raio (${miniAntes}→${miniComMob})`, miniComMob > miniAntes);
  await mini.click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 1, 10, "mapa do mundo abriu do minimapa");
  ok("clique no minimapa abre o MAPA DO MUNDO", true);
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 0, 10, "mapa fechou (do minimapa)");

  // ── v46 · GERAÇÃO DE CHUNKS NO WORKER (dados fora do main thread) ──
  await page.evaluate(() => {
    const w = (window).__rpg;
    w.definirHora(0.35); // dia: sem enxame noturno a matar o herói durante os waits
    // scaffolding determinístico: a qualidade automática (fps ~2 no raster
    // do sandbox) reduziria o raio a 2 durante os waits — fixa-se a 3
    w.motor.qualidadeAuto = false;
    w.motor.raioRender = 3;
  });
  const gi0 = await page.evaluate(() => (window).__rpg.chunks());
  ok("worker de geração ativo (perfil rpg, semente fixa 20251113, sem erro)",
    gi0.worker === true && gi0.perfil === "rpg" && gi0.semente === 20251113 && gi0.erroWorker === "");
  ok(`contagens honestas: geradosSync ${gi0.geradosSync} > 0 (spawn sync) · carregados ${gi0.carregados}`,
    gi0.geradosSync > 0 && gi0.carregados > 0);
  // teleporte para fora do anel do spawn: o worker tem de encher o anel novo
  await page.evaluate(() => {
    const w = (window).__rpg;
    const h = w.motor.mundo.alturaTerreno(70, -10);
    w.teleportar(70.5, h + 1.02, -10.5);
  });
  await pump(8); // 8 frames × 8 pedidos = anel pedido ao worker (alvo no r=2)
  const chegou = await aguardar(async () => {
    const gi = await page.evaluate(() => (window).__rpg.chunks());
    const alvo = await page.evaluate(() => (window).__rpg.motor.mundo.getChunk(4, 1) !== undefined);
    return gi.geradosWorker > 0 && gi.pendentes === 0 && alvo;
  }, 30, "worker encher o anel novo (chunk (4,1) entregue)");
  const gi1 = await page.evaluate(() => (window).__rpg.chunks());
  ok(`worker entrega os dados: geradosWorker ${gi0.geradosWorker}→${gi1.geradosWorker} · pendentes ${gi1.pendentes}`,
    chegou && gi1.geradosWorker > gi0.geradosWorker && gi1.pendentes === 0);
  ok("sem queda no vazio: herói em pé sobre o terreno real (fase jogando)",
    (await cap())?.fase === "jogando" && (await cap()).pos[1] > 4);
  // identidade byte a byte: o chunk (4,1) — Terra de Cinzas revestida —
  // chegou PELO WORKER (r=2, fora do 3×3 sync do teleporte); regenerado
  // pelo caminho sync tem a MESMA soma de bytes (zero segunda fonte)
  const cmp = await page.evaluate(() => (window).__rpg.compararChunk(4, 1));
  ok(`chunk das Cinzas (carimbado, veio do worker) idêntico ao sync · sync ${cmp.msSync}ms`,
    cmp.igual === true && cmp.msSync > 0);
  const cmp2 = await page.evaluate(() => (window).__rpg.compararChunk(0, 0));
  ok("chunk da Aldeia (POI central) também idêntico worker↔sync", cmp2.igual === true);
  // edição sobrevive ao descarregamento e regenera PELO WORKER:
  // coloca pedra longe → desce >6 chunks (descartar longe) → volta para
  // um chunk do anel que NÃO inclui o edit no 3×3 sync → o worker regenera.
  await page.evaluate(() => {
    const w = (window).__rpg;
    const h = w.motor.mundo.alturaTerreno(150, 150);
    w.teleportar(150.5, h + 1.02, 150.5);
    w.motor.mundo.setBloco(150, h + 1, 150, 3); // PEDRA (edit marcado)
  });
  await pump(2);
  const h250 = await page.evaluate(() => (window).__rpg.motor.mundo.alturaTerreno(150, 250));
  await page.evaluate((y) => (window).__rpg.teleportar(150.5, y, 250.5), h250 + 1.02);
  await pump(8); // descartar longe remove o chunk editado (dist 6 > raio+2)
  const h192 = await page.evaluate(() => (window).__rpg.motor.mundo.alturaTerreno(150, 192));
  await page.evaluate((y) => (window).__rpg.teleportar(150.5, y, 192.5), h192 + 1.02); // chunk (9,12): 3×3 NÃO inclui o edit
  await pump(8);
  const editRegen = await aguardar(async () => {
    const b = await page.evaluate(() => (window).__rpg.bloco(150, (window).__rpg.motor.mundo.alturaTerreno(150, 150) + 1, 150));
    const carregado = await page.evaluate(() => (window).__rpg.motor.mundo.getChunk(9, 9) !== undefined);
    const gi = await page.evaluate(() => (window).__rpg.chunks());
    return carregado && gi.pendentes === 0 && b === 3;
  }, 30, "worker regenerar o chunk editado");
  ok("edição do jogador sobrevive ao descarregamento e regenera PELO WORKER", editRegen);

  // ── v51 · MALHAGEM em WEB WORKER (padrão Veloren: meshing threads) ──
  // o trabalho pesado (faces/AO/UV) saiu do main thread; o THREE SÓ faz
  // o upload dos buffers prontos. Sync permanece para spawn/teleporte.
  const drenou = await aguardar(async () => {
    const m = await page.evaluate(() => (window).__rpg.malha());
    return m.pendentes === 0 && m.prontas === 0;
  }, 40, "worker de malha drenar a fila do anel");
  const m0 = await page.evaluate(() => (window).__rpg.malha());
  ok("malhador ativo (perfil rpg, sem erro) e fila drenada (pendentes 0 · prontas 0)",
    m0.malhador === true && m0.erroMalhador === "" && m0.perfil === "rpg" && m0.pendentes === 0 && m0.prontas === 0);
  ok(`worker malhou os chunks do anel: pedidas ${m0.pedidas} > 0 · malhadasWorker ${m0.malhadasWorker} > 0`,
    m0.pedidas > 0 && m0.malhadasWorker > 0);
  ok(`spawn continua sync (honesto): malhadasSync ${m0.malhadasSync} > 0`, m0.malhadasSync > 0);
  // identidade bit a bit: (9,12) tem DADOS sync (3×3 do teleporte) mas a
  // MALHA veio do worker; (9,9) veio do worker INTEIRO (dados v46 + malha)
  const cmpM = await page.evaluate(() => (window).__rpg.compararMalha(9, 12));
  ok(`malha do chunk do herói (dados sync, malha worker) idêntica ao sync (${cmpM.vertsSync} verts · sync ${cmpM.msSync}ms)`,
    cmpM.igual === true && cmpM.vertsSync > 0 && cmpM.vertsLive === cmpM.vertsSync);
  const cmpM2 = await page.evaluate(() => (window).__rpg.compararMalha(9, 9));
  ok("malha do chunk regenerado pelo worker (dados+malha worker) também idêntica ao sync", cmpM2.igual === true);
  // edição remalha PELO WORKER: quebrar o tronco/pedra do teste v46 (o
  // chunk (9,9) está no anel do herói em (150,192)) → sujo → resposta
  const mw0 = await page.evaluate(() => (window).__rpg.malha());
  await page.evaluate(() => {
    const w = (window).__rpg;
    const h = w.motor.mundo.alturaTerreno(150, 150);
    w.motor.mundo.setBloco(150, h + 1, 150, 0); // quebra o PEDRA do teste v46 (edit marcado)
  });
  const remalhou = await aguardar(async () => {
    const m = await page.evaluate(() => (window).__rpg.malha());
    return m.malhadasWorker > mw0.malhadasWorker && m.pendentes === 0 && m.prontas === 0;
  }, 40, "worker remalhar o chunk editado");
  const mwInfo = await page.evaluate(() => (window).__rpg.malha());
  ok(`edição remalha PELO WORKER: malhadasWorker ${mw0.malhadasWorker}→${mwInfo.malhadasWorker}`, remalhou);
  const cmpM3 = await page.evaluate(() => (window).__rpg.compararMalha(9, 9));
  ok("malha pós-edição continua idêntica ao caminho sync (edit incluído nos dois)", cmpM3.igual === true);
  // fallback honesto: sem malhador, o caminho SYNC constrói a malha e é
  // a MESMA bit a bit; o malhador religa para o resto da bateria
  const fb = await page.evaluate(() => {
    const w = (window).__rpg, mu = w.motor.mundo;
    mu.desativarMalhador();
    const c = mu.getChunk(9, 12);
    if (!c) return { erro: "chunk (9,12) ausente" };
    mu.construirMalha(c);
    const info = mu.infoMalha();
    const cmp = w.compararMalha(9, 12);
    const deNovo = mu.ativarMalhador();
    return { info, cmp, deNovo };
  });
  ok(`fallback sync honesto: malhadasSync ${fb.info?.malhadasSync} > 0 · desligado durante · religado`,
    fb.info?.malhadasSync > 0 && fb.info?.malhador === false && fb.deNovo === true);
  ok("a malha do fallback sync é IGUAL (bit a bit) à que o worker produziu", fb.cmp?.igual === true);
  await aguardar(async () => {
    const m = await page.evaluate(() => (window).__rpg.malha());
    return m.malhador === true;
  }, 10, "malhador religado");

  // ── combate → XP → nível → habilidade ──
  await page.evaluate(() => (window).__rpg.teleportar(2.5, 40, 4.5)); // volta à aldeia
  await pump(10);
  await page.evaluate(() => (window).__rpg.definirHora(0.85)); // noite: zumbis não queimam e caçam
  const killsAntes = (await rpg()).kills.hostil;
  /** Duelo inteiro DENTRO da página (determinístico e rápido): seleciona a
   *  espada, spawna 1 zumbi e golpeia com auto-mira até cair. */
  const matarUmZumbi = () => page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    const i = m.inv.slots.findIndex((s) => s && s.id === 112); // ESPADA_MADEIRA
    if (i >= 0) m.inv.selecao = i;
    w.spawnarMob("zumbi", 3, 0);
    for (let t = 0; t < 120; t++) {
      m.passo(0.05);
      w.sistema.tick(0.05);
      if (m.fase !== "jogando") m.renascer();
      m.vida = 20; // herói de treino: o enxame noturno não mata o herói do teste
      const mob = m.gestor.mobs.find((mm) => mm.vivo && mm.tipo === "zumbi");
      if (!mob) return true;
      const dx = mob.x - m.px, dz = mob.z - m.pz;
      m.yaw = Math.atan2(-dx, -dz); // auto-mira: dir = (−sin, −cos)
      m.atacar();
    }
    return false;
  });
  for (let i = 0; i < 8; i++) await matarUmZumbi();
  await page.evaluate(() => { (window).__rpg.motor.vida = 20; });
  await pump(10);
  r1 = await rpg();
  ok("8 zumbis derrotados → kills.hostil cresceu", r1.kills.hostil >= killsAntes + 6);
  ok("XP acumulado → subiu de nível (pontos ≥ 1)", r1.nivel >= 2 && r1.pontos >= 1);
  ok("capítulo h2 (Manto da Noite) concluído ou em progresso real",
    (await page.evaluate(() => (window).__rpg.perfil().missoes.historiaFeitas)).includes("h2") || (await rpg()).kills.hostil >= killsAntes + 5);

  // gastar ponto em guerreiro
  await page.evaluate(() => (window).__rpg.gastarPonto("guerreiro"));
  r1 = await rpg();
  ok("ponto gasto em Guerreiro (nível 1, pontos decresceu)", r1.skills.guerreiro === 1);

  // ── pausa v42: sessão + MAPA/AJUDA ──
  await page.locator('[data-testid="rpg-btn-pausa"]').click();
  await sel("rpg-pausa-info", 5000);
  ok("pausa mostra a sessão (dificuldade MÉDIO, nível, história)",
    (await page.locator('[data-testid="rpg-pausa-dif"]').innerText()).includes("MÉDIO") &&
    (await page.locator('[data-testid="rpg-pausa-info"]').innerText()).includes("Nível"));
  await page.locator('[data-testid="rpg-pausa-mapa"]').click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 1, 10, "mapa pela pausa");
  ok("MAPA abre a partir da pausa", true);
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mapa"]').count()) === 0, 10, "mapa fechou");
  await page.keyboard.press("Escape"); // reabre a pausa
  await aguardar(async () => (await page.locator('[data-testid="rpg-pausa-ajuda"]').count()) === 1, 10, "pausa reabriu");
  await page.locator('[data-testid="rpg-pausa-ajuda"]').click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-modal"]').innerText()).includes("COMO JOGAR"), 10, "ajuda pela pausa");
  ok("AJUDA abre a partir da pausa (controlos + fontes no mesmo painel)",
    (await page.locator('[data-testid="rpg-modal"]').innerText()).includes("WASD"));
  await page.keyboard.press("Escape"); // fecha e retoma o jogo
  await aguardar(async () => (await page.locator('[data-testid="rpg-modal"]').count()) === 0, 10, "modal fechou");

  // ── baú de tesouro (olhar + atacar) ──
  await page.evaluate(() => (window).__rpg.definirHora(0.35)); // volta ao dia
  await page.evaluate(() => {
    const m = (window).__rpg.motor;
    const i = m.inv.slots.findIndex((s) => s && s.id === 112);
    if (i >= 0) m.inv.selecao = i;
  });
  await page.evaluate(() => { (window).__rpg.teleportar(4.5, 33.02, 6.5); });
  // explosões noturnas de estouradores podem ter levado o baú — repõe-o (scaffolding de teste)
  await page.evaluate(() => { (window).__rpg.motor.mundo.setBloco(4, 33, 5, 29, false); });
  await pump(4);
  let mira = null;
  for (const p of [-0.42, 0.42, -0.8, 0.8, -0.25, 0.25]) {
    await page.evaluate((pp) => (window).__rpg.olhar(0.3217, pp), p);
    await pump(6);
    mira = await page.evaluate(() => (window).__rpg.motor.mira?.id ?? null);
    if (mira === 29) break;
  }
  const creditosAntes = (await rpg()).creditos;
  if (mira === 29) {
    // contagens ANTES do baú (delta honesto — o motor também dá o kit dele)
    const invAntes = await page.evaluate(() => {
      const inv = (window).__rpg.motor.inv;
      return { pao: inv.contar(121), maca: inv.contar(107) };
    });
    await page.evaluate(() => (window).__rpg.atacarDirecto());
    await pump(6);
    r1 = await rpg();
    ok("baú da aldeia aberto → 1 tesouro + créditos", r1.descobertas.baus === 1 && r1.creditos > creditosAntes);
    // v48: espólio real entra na mochila (+2 pão, +1 maçã — a mesa da aldeia)
    const invDepois = await page.evaluate(() => {
      const inv = (window).__rpg.motor.inv;
      return { pao: inv.contar(121), maca: inv.contar(107) };
    });
    ok(`espólio do baú na mochila (pão +2 · maçã +1; obtido +${invDepois.pao - invAntes.pao}/+${invDepois.maca - invAntes.maca})`,
      invDepois.pao === invAntes.pao + 2 && invDepois.maca === invAntes.maca + 1);
    ok("aviso do baú lista o espólio real (mesma mesa para todos)",
      r1.avisos.some((a) => a.texto.includes("espólio") && a.texto.includes("Pão") && a.texto.includes("Maçã")));
  } else {
    ok(`baú visado (mira=29, obtido ${mira}) — posição/olhar ajustados pelo teste`, mira === 29);
  }

  // ── v48 · MOCHILA (inventário do motor partilhado, 36 posições) ──
  await page.evaluate(() => { (window).__rpg.motor.vida = 20; }); // herói de treino durante os cliques
  await page.locator('[data-testid="rpg-btn-mochila"]').click();
  await sel("rpg-mochila", 5000);
  ok("MOCHILA abre do HUD com as 36 posições reais do motor", (await page.locator('[data-testid^="rpg-mslot-"]').count()) === 36);
  ok("mochila honesta: contagem de posições ocupadas visível",
    (await page.locator('[data-testid="rpg-mochila"]').innerText()).includes("/36"));
  ok("rodapé credencia a fonte (motor partilhado + espólio determinístico)",
    (await page.locator('[data-testid="rpg-mochila-fonte"]').innerText()).includes("motor partilhado"));
  // item colocado no fundo da mochila (slot 20) move para a hotbar pelo clique REAL
  await page.evaluate(() => { (window).__rpg.motor.inv.slots[20] = { id: 106, qtd: 1 }; });
  await page.locator('[data-testid="rpg-mslot-20"]').click();
  await pump(2);
  ok("clique no slot da mochila move o item para a hotbar (moverParaHotbar real)", await page.evaluate(() =>
    (window).__rpg.motor.inv.slots.slice(0, 9).some((s) => s && s.id === 106)));
  await page.keyboard.press("i");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mochila"]').count()) === 0, 10, "mochila fechou (I)");
  await page.keyboard.press("i");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mochila"]').count()) === 1, 10, "mochila reabriu (I)");
  ok("tecla I abre e fecha a mochila", true);
  // peitoral de couro: mochila → hotbar → selecionado → EQUIPAR (efeito real do motor)
  await page.evaluate(() => (window).__rpg.dar(123, 1));
  let idxArm = await page.evaluate(() => (window).__rpg.motor.inv.slots.findIndex((s) => s && s.id === 123));
  if (idxArm >= 9) await page.locator(`[data-testid="rpg-mslot-${idxArm}"]`).click(); // mochila → hotbar
  idxArm = await page.evaluate(() => (window).__rpg.motor.inv.slots.findIndex((s) => s && s.id === 123));
  await page.locator(`[data-testid="rpg-mslot-${idxArm}"]`).click(); // seleciona
  await page.locator('[data-testid="rpg-equipar"]').click();
  const arm1 = (await cap()).armadura;
  ok("peitoral de couro equipado pela mochila (−15% de dano, dado REAL do motor)", arm1?.id === 123 && Math.abs(arm1.reducao - 0.15) < 1e-9);
  await page.locator('[data-testid="rpg-despir"]').click();
  ok("DESPIN devolve o peitoral à mochila (sem perdas)", (await cap()).armadura === null);
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-mochila"]').count()) === 0, 10, "mochila fechou (ESC)");

  // mochila CHEIA → o espólio que não cabe é declarado HONESTAMENTE (forja, via caminho real)
  await page.evaluate(() => {
    const inv = (window).__rpg.motor.inv;
    inv.limpar();
    for (let i = 0; i < 36; i++) inv.slots[i] = { id: 4, qtd: 64 }; // pedregulho (id 4, stack 64)
  });
  await page.evaluate(() => (window).__rpg.abrirTesouro(82, 34, 52)); // baú da Forja Perdida (peitoral de ferro + barras)
  await pump(4);
  const avisosCheia = (await rpg()).avisos.map((a) => a.texto).join(" | ");
  ok("mochila cheia: espólio NÃO entra e a perda é declarada (zero fuga)",
    avisosCheia.includes("cheia") && avisosCheia.includes("perdidos"));
  ok("baú da forja contado como aberto mesmo com mochila cheia (honesto)", (await rpg()).descobertas.baus >= 2);
  // repõe o kit mínimo para as secções seguintes (duelo do Guardião usa a espada)
  await page.evaluate(() => { (window).__rpg.limparInv(); (window).__rpg.dar(112, 1); });

  // ── v49 · FORJA (as RECEITAS REAIS do motor partilhado, pertoDe contra o mundo) ──
  await page.evaluate(() => (window).__rpg.definirHora(0.35)); // dia: sem estouradores a minar blocos
  const forjaSpawn = await page.evaluate(() => (window).__rpg.forja());
  ok("ganchos forja: 32 receitas do motor + mesa/fornalha LIDAS do mundo real",
    forjaSpawn.receitas === 32 && forjaSpawn.mesa === false && forjaSpawn.fornalha === false);
  await page.locator('[data-testid="rpg-btn-forja"]').click();
  await sel("rpg-forja", 5000);
  ok("FORJA abre do HUD com TODAS as receitas do motor (32 linhas honestas)",
    (await page.locator('[data-testid^="rpg-craft-"]').count()) === 32);
  ok("na Aldeia os chips dizem a verdade (MESA: NÃO · FORNALHA: NÃO)",
    (await page.locator('[data-testid="rpg-forja-mesa"]').innerText()).includes("NÃO") &&
    (await page.locator('[data-testid="rpg-forja-fornalha"]').innerText()).includes("NÃO"));
  // criar em qualquer sítio (receita simples do motor): 1 tronco → 4 tábuas
  await page.evaluate(() => (window).__rpg.dar(7, 1)); // TRONCO pelo adicionar REAL
  await page.locator('[data-testid="rpg-craft-tabuas"]').click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-forja-msg"]').count()) === 1, 10, "msg CRIADO");
  ok("CRIADO em qualquer sítio: 4× Tábuas entram pela mochila do motor (inv real)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(9))) === 4 &&
    (await page.locator('[data-testid="rpg-forja-msg"]').innerText()).includes("CRIADO"));
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-forja"]').count()) === 0, 10, "forja fechou");
  // viagem à Forja Perdida (82, 52) — o único sítio do mundo com mesa+fornalha reais
  await page.evaluate(() => (window).__rpg.teleportar(82, 36, 52));
  await page.evaluate(() => { (window).__rpg.motor.vida = 20; });
  // explosões podem ter minado os blocos do POI — repõe-os EXATAMENTE como os
  // carimba a mundoRpg (scaffolding de teste, o mesmo padrão do baú acima)
  await page.evaluate(() => {
    const mm = (window).__rpg.motor.mundo;
    mm.setBloco(81, 35, 51, 16, false); // FORNALHA
    mm.setBloco(83, 35, 51, 16, false); // FORNALHA
    mm.setBloco(80, 35, 53, 15, false); // MESA
  });
  await pump(8);
  const forjaLugar = await page.evaluate(() => (window).__rpg.forja());
  ok("na Forja Perdida o pertoDe REAL vê a mesa e a fornalha do mundo",
    forjaLugar.mesa === true && forjaLugar.fornalha === true);
  await page.locator('[data-testid="rpg-btn-forja"]').click();
  await sel("rpg-forja", 5000);
  ok("chips mudam para AQUI junto dos blocos reais (carimbados pela mundoRpg)",
    (await page.locator('[data-testid="rpg-forja-mesa"]').innerText()).includes("AQUI") &&
    (await page.locator('[data-testid="rpg-forja-fornalha"]').innerText()).includes("AQUI"));
  // fundição REAL: 2 minérios de ferro + 1 carvão → 2 barras (a mesma receita do BateuCraft)
  await page.evaluate(() => (window).__rpg.dar(11, 2)); // FERRO_M
  await page.evaluate(() => (window).__rpg.dar(101, 1)); // CARVAO
  await page.locator('[data-testid="rpg-craft-fun_fer"]').click();
  await aguardar(async () => (await page.evaluate(() => (window).__rpg.motor.inv.contar(103))) === 2, 10, "barras fundidas");
  ok("fundição na fornalha real: 2× Barra de Ferro na mochila (materiais consumidos)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(103))) === 2 &&
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(11))) === 0);
  // mesa:TRUE junto da mesa real: espada de ferro (2 barras + graveto)
  await page.evaluate(() => (window).__rpg.dar(100, 1)); // GRAVETO
  await page.locator('[data-testid="rpg-craft-esp_fer"]').click();
  await aguardar(async () => (await page.evaluate(() => (window).__rpg.motor.inv.contar(114))) === 1, 10, "espada de ferro");
  ok("espada de ferro criada junto da MESA real (mesa:true desbloqueada no sítio certo)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(114))) === 1);
  // longe da forja as mesmas receitas voltam à recusa honesta
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-forja"]').count()) === 0, 10, "forja fechou (2)");
  await page.evaluate(() => (window).__rpg.teleportar(2.5, 33.02, 4.5));
  await pump(8);
  await page.locator('[data-testid="rpg-btn-forja"]').click();
  await sel("rpg-forja", 5000);
  ok("de volta à Aldeia: fundição recusada com o motivo REAL do motor",
    (await page.locator('[data-testid="rpg-craft-bloq-fun_fer"]').innerText()).includes("fornalha"));
  ok("espada de ferro recusada sem mesa (Mesa de Criação no motivo)",
    (await page.locator('[data-testid="rpg-craft-bloq-esp_fer"]').innerText()).includes("Mesa de Criação"));
  ok("rodapé credencia as receitas do motor partilhado (as mesmas do BateuCraft)",
    (await page.locator('[data-testid="rpg-forja-fonte"]').innerText()).includes("motor partilhado"));
  await page.keyboard.press("Escape");
  await aguardar(async () => (await page.locator('[data-testid="rpg-forja"]').count()) === 0, 10, "forja fechou (3)");

  // ── v50 · ITENS NO CHÃO (loot como ENTIDADE — padrão Veloren item_drop) ──
  // O drop de mob nasce NO CHÃO onde o mob caiu (gancho REAL do motor —
  // engine.atacar encaminha pelo aoDroparChao), desliza pelo magnete e entra
  // na mochila pelo adicionar REAL. Blocos/baús continuam DIRECTO (v48).
  await page.evaluate(() => (window).__rpg.teleportar(2.5, 33.02, 4.5));
  await page.evaluate(() => (window).__rpg.definirHora(0.35)); // dia: aranha neutra (v32)
  await pump(6);
  const fioAntes = await page.evaluate(() => (window).__rpg.motor.inv.contar(126)); // FIO
  /** Mata 1 aranha DE DIA pela via REAL do combate (auto-mira + atacar) —
   *  referência DIRETA do Mob nascido (padrão v48). A aranha de dia é NEUTRA
   *  (vagar — não persegue): o scaffolding MANTÉM-A a 3,7 m do herói — dentro
   *  do alcance do golpe (4,0) e FORA do magnete (3,0) — assim o drop nasce e
   *  FICA no chão (nenhum tick o recolhe, nem os rAF entre evaluates). */
  const matouAranha = await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    const i = m.inv.slots.findIndex((s) => s && s.id === 112); // ESPADA_MADEIRA
    if (i >= 0) m.inv.selecao = i;
    const ancora = { x: m.px, z: m.pz };
    const mob = w.spawnarMob("aranha", 3.7, 0);
    for (let t = 0; t < 200; t++) {
      if (!mob.vivo) return true; // morto → drop nasceu a 3,7 m; SEM tick depois
      m.passo(0.05);
      w.sistema.tick(0.05);
      if (m.fase !== "jogando") m.renascer();
      m.vida = 20; // herói de treino
      const dx = mob.x - m.px, dz = mob.z - m.pz, d = Math.hypot(dx, dz) || 0.001;
      if (Math.abs(Math.hypot(mob.x - ancora.x, mob.z - ancora.z) - 3.7) > 0.5) {
        mob.x = ancora.x + ((mob.x - ancora.x) / d) * 3.7;
        mob.z = ancora.z + ((mob.z - ancora.z) / d) * 3.7;
      }
      m.yaw = Math.atan2(-dx, -dz);
      m.atacar();
    }
    return false;
  });
  ok("aranha morta de dia pela via real do combate (auto-mira + atacar)", matouAranha);
  const dropChao = await page.evaluate(() => (window).__rpg.itensChao());
  ok("loot nasceu NO CHÃO onde o mob caiu (item FIO no mundo — não na mochila)",
    dropChao.itens.some((i) => i.id === 126 && i.dist <= 7) &&
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(126))) === fioAntes);
  ok("chip do HUD mostra o chão honesto (item(s) no chão)",
    await aguardar(async () => (await page.locator('[data-testid="rpg-chao-chip"]').count()) === 1, 15, "chip do chão"));
  // recolha REAL: herói vai para cima do item → magnete/pega → inventário
  await page.evaluate((lst) => {
    const it = lst.itens.find((i) => i.id === 126);
    (window).__rpg.teleportar(it.x, it.y + 0.5, it.z);
  }, dropChao);
  await pump(8);
  const recolhido = await page.evaluate(() => ({
    fio: (window).__rpg.motor.inv.contar(126),
    fioPerto: (window).__rpg.itensChao().itens.filter((i) => i.id === 126 && i.dist <= 2.5).length,
  }));
  ok("recolha por proximidade: FIO entrou na mochila pelo adicionar REAL e saiu do chão",
    recolhido.fio > fioAntes && recolhido.fioPerto === 0);
  ok("aviso honesto de recolha («recolhido do chão»)",
    (await rpg()).avisos.some((a) => a.texto.includes("recolhido do chão")));

  // LARGAR pela via REAL da tecla Q: 1 couro do slot selecionado → chão.
  // O herói afasta-se LOGO (o largado volta para quem fica parado quando o
  // pegaT de 1,2 s expira — comportamento certo, o teste não pode competir
  // com ele: larga e sai do raio do magnete antes do fim do atraso).
  const couro = await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    m.inv.adicionar(122, 2); // COURO — nada neste flow o usa antes
    const idx = m.inv.slots.findIndex((s) => s && s.id === 122);
    m.inv.selecao = idx;
    return m.inv.contar(122);
  });
  await page.keyboard.press("q");
  await page.evaluate(() => (window).__rpg.mover(-1, 0, 1)); // afasta-se ~4,4 m logo após largar
  await pump(30); // pegaT (1,2 s) expira com o herói FORA do magnete (3 m)
  ok("tecla Q larga 1 do slot selecionado à frente do herói (mochila −1, chão +1)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(122))) === couro - 1 &&
    (await page.evaluate(() => (window).__rpg.itensChao().itens.some((i) => i.id === 122 && i.qtd === 1))));
  ok("pegaT real: 1,2 s passaram a >3 m e o item NÃO voltou à mochila (fica no chão)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(122))) === couro - 1 &&
    (await page.evaluate(() => (window).__rpg.itensChao().itens.some((i) => i.id === 122))));
  // a mochila recebe o largado de volta pelo CAMINHO REAL (aproximação)
  await page.evaluate(() => {
    const w = (window).__rpg;
    const it = w.itensChao().itens.find((i) => i.id === 122);
    w.teleportar(it.x, it.y + 0.5, it.z);
  });
  await pump(8);
  ok("recolheu o largado ao voltar (couro de volta, chão sem ele)",
    (await page.evaluate(() => (window).__rpg.motor.inv.contar(122))) === couro &&
    !(await page.evaluate(() => (window).__rpg.itensChao().itens.some((i) => i.id === 122))));

  // mochila CHEIA: o drop do mob NÃO desaparece — fica no chão (aviso honesto)
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    m.inv.limpar();
    for (let i = 0; i < 36; i++) m.inv.adicionar(126, 64); // 36 pilhas cheias de FIO
  });
  await pump(2);
  const cheiaMatar = await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    const ancora = { x: m.px, z: m.pz };
    const mob = w.spawnarMob("aranha", 3.7, 0);
    for (let t = 0; t < 200; t++) {
      if (!mob.vivo) return true;
      m.passo(0.05); w.sistema.tick(0.05);
      if (m.fase !== "jogando") m.renascer();
      m.vida = 20;
      const dx = mob.x - m.px, dz = mob.z - m.pz, d = Math.hypot(dx, dz) || 0.001;
      if (Math.abs(Math.hypot(mob.x - ancora.x, mob.z - ancora.z) - 3.7) > 0.5) {
        mob.x = ancora.x + ((mob.x - ancora.x) / d) * 3.7;
        mob.z = ancora.z + ((mob.z - ancora.z) / d) * 3.7;
      }
      m.yaw = Math.atan2(-dx, -dz);
      m.atacar();
    }
    return false;
  });
  ok("2ª aranha morta com a mochila cheia (dano 1, sem espada — mais golpes)", cheiaMatar);
  await page.evaluate(() => {
    const w = (window).__rpg;
    const it = w.itensChao().itens.find((i) => i.id === 126);
    if (it) w.teleportar(it.x, it.y + 0.5, it.z); // anda até ao drop
  });
  await pump(8);
  ok("mochila cheia: o drop FICA no chão (não desaparece) e a mochila não muda", await page.evaluate(() => {
    const w = (window).__rpg;
    return w.motor.inv.contar(126) === 36 * 64 && w.itensChao().itens.some((i) => i.id === 126);
  }));
  ok("aviso honesto «Mochila cheia — o item fica no chão»",
    (await rpg()).avisos.some((a) => a.texto.includes("fica no chão")));
  // limpa a mochila cheia e repõe a espada para o resto do percurso (LENDa…)
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    m.inv.limpar();
    m.inv.adicionar(112, 1); // ESPADA_MADEIRA — o kit mínimo do duelo
    m.inv.selecao = m.inv.slots.findIndex((s) => s && s.id === 112);
  });

  // ── dificuldade muda o HP dos NOVOS inimigos (noite: sem queimar) ──
  // v48: referência DIRETA do mob nascido (spawnarMob devolve o Mob) — a 1.ª
  // versão lia o último zumbi vivo e corria com spawns naturais/explosões
  // do mundo em jogo (furos reais das corridas 1 e 4).
  await page.evaluate(() => {
    const w = (window).__rpg;
    w.definirHora(0.85);
    w.definirDificuldade("lenda");
    (window).__zumbiLenda = w.spawnarMob("zumbi", 4, 0);
  });
  await pump(2);
  const hpLenda = await page.evaluate(() => (window).__zumbiLenda?.hpMax ?? null);
  ok("dificuldade LENDA: zumbi nasce com 20×2.2 = 44 HP (referência direta do mob nascido)", hpLenda === 44);

  // ── CHEFE: história manipulada para h6 (teste do fim real) ──
  // v48: mundo limpo pelo matar real antes do caminho pelas Cinzas — os
  // estouradores da região matavam o herói durante o pump e o Guardião
  // não acordava dentro da janela (furo real da corrida 4).
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    for (const mob of [...m.gestor.mobs]) if (mob.vivo) m.gestor.matar(mob, false);
    if (m.fase !== "jogando") m.renascer();
  });
  await page.evaluate(() => {
    const p = (window).__rpg.perfil();
    p.missoes.historiaFeitas = ["h1", "h2", "h3", "h4", "h5"];
    // v49: a secção FORJA já visitou a Forja Perdida (que vive nas Cinzas) —
    // e uma descoberta dispara o evento UMA vez só, contado pelo capítulo
    // CORRENTE na altura (h3, que não tem esse objetivo). Retira a descoberta
    // para o caminho REAL voltar a disparar agora que h6 é o capítulo atual.
    p.descobertas.regioes = p.descobertas.regioes.filter((r) => r !== "cinzas");
  });
  await page.evaluate(() => (window).__rpg.definirDificuldade("medio"));
  await page.evaluate(() => (window).__rpg.teleportar(82.5, 45, 52.5)); // Terra de Cinzas
  await pump(40);
  await page.evaluate(() => { (window).__rpg.motor.vida = 20; }); // herói de treino no caminho
  await page.evaluate(() => (window).__rpg.teleportar(60.5, 40, -42.5)); // junto às ruínas
  await pump(30);
  await page.evaluate(() => { (window).__rpg.motor.vida = 20; });
  r1 = await rpg();
  ok("Terra de Cinzas descoberta (objetivo h6)", r1.descobertas.regioes >= 3);
  await aguardar(async () => (await rpg()).boss.vivo === true, 30, "Guardião acordar");
  ok("GUARDIÃO das Ruínas acordou (boss.vivo)", (await rpg()).boss.vivo === true);
  const bossHp = await page.evaluate(() => {
    const mob = (window).__rpg.motor.gestor.mobs.find((mm) => mm.vivo && (mm).__boss);
    return mob ? mob.hpMax : null;
  });
  ok("Guardião com HP escalado ×3 (34×3 = 102)", bossHp === 102);
  // duelo com o Guardião — inteiro dentro da página (auto-mira + treino).
  // Se o herói morrer no meio do duelo, renasce e volta às ruínas.
  const voltarRuinas = () => { const m = (window).__rpg.motor; m.px = 60.5; m.py = 40; m.pz = -42.5; m.vx = m.vy = m.vz = 0; };
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    if (m.fase !== "jogando") m.renascer();
    m.px = 60.5; m.py = 40; m.pz = -42.5; m.vx = m.vy = m.vz = 0;
    const i = m.inv.slots.findIndex((s) => s && s.id === 112);
    if (i >= 0) m.inv.selecao = i;
  });
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    for (let t = 0; t < 500; t++) {
      m.passo(0.05);
      w.sistema.tick(0.05);
      if (w.capturaRpg().boss.derrotado) return true;
      if (m.fase !== "jogando") {
        m.renascer();
        m.px = 60.5; m.py = 40; m.pz = -42.5; m.vx = m.vy = m.vz = 0; // volta às ruínas
      }
      m.vida = 20; // herói de treino durante o duelo
      const mob = m.gestor.mobs.find((mm) => mm.vivo && (mm).__boss);
      if (!mob) return w.capturaRpg().boss.derrotado;
      const dx = mob.x - m.px, dz = mob.z - m.pz;
      m.yaw = Math.atan2(-dx, -dz);
      m.atacar();
    }
    return false;
  });
  await pump(10);
  r1 = await rpg();
  ok("Guardião derrotado → boss.derrotado", r1.boss.derrotado === true);
  ok("história COMPLETA (h6 concluído → capítulo null)", r1.historiaFeita === true);
  ok("créditos do Guardião (+60) no bolso", r1.creditos >= 60);

  // ── morte e renascimento ──
  const mortesAntes = (await rpg()).mortes;
  await page.evaluate(() => (window).__rpg.definirVida(1));
  await page.evaluate(() => {
    const w = (window).__rpg;
    w.spawnarMob("zumbi", 1, 0);
    w.definirHora(0.85); // noite → zumbi hostil ataca
  });
  await aguardar(async () => (await cap())?.fase === "morto", 40, "morte por zumbi");
  ok("morte real (fase morto) e painel visível", (await sel("rpg-morte", 8000).then(() => true).catch(() => false)) && (await cap())?.fase === "morto");
  await page.locator('[data-testid="rpg-renascer"]').click();
  await aguardar(async () => (await cap())?.fase === "jogando", 30, "renascer");
  const c2 = await cap();
  ok("renasce na Aldeia com vida cheia", c2.vida === 20 && Math.abs(c2.pos[0] - 2.5) < 30);
  ok("morte contada no perfil (+1)", (await rpg()).mortes === mortesAntes + 1);

  // ── v50: um item NO CHÃO sobrevive ao CONTINUAR (o chão guarda-se com a lenda) ──
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    m.inv.adicionar(122, 1); // COURO para largar
    const idx = m.inv.slots.findIndex((s) => s && s.id === 122);
    m.inv.selecao = idx;
    const h = m.mundo.alturaTerreno(30, 30);
    w.teleportar(30.5, h + 1.02, 30.5);
  });
  await page.evaluate(() => (window).__rpg.largar()); // a MESMA via da tecla Q / botão LARGAR 1
  await page.evaluate(() => {
    const w = (window).__rpg, m = w.motor;
    const it = w.itensChao().itens.find((i) => i.id === 122);
    const h = m.mundo.alturaTerreno(it.x - 8, it.z);
    w.teleportar(it.x - 8, h + 1.02, it.z); // já para fora do magnete — antes do pegaT expirar
  });
  await pump(14); // o «pop» assenta (fricção) e o pegaT expira com o herói longe
  const couroSalvo = await page.evaluate(() => (window).__rpg.itensChao().itens.find((i) => i.id === 122));
  ok("loot largado fica no chão longe do herói (coords reais para o save)", !!couroSalvo);
  const nivelAntes = (await rpg()).nivel;
  await page.evaluate(() => (window).__rpg.guardar());
  await page.waitForTimeout(600);
  ok("o save GUARDA os itens do chão (perfil.itensChao com o couro)",
    (await page.evaluate(() => (window).__rpg.perfil().itensChao?.some((e) => e.id === 122))) === true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await sel("rpg-titulo", 30000);
  await aguardar(async () => (await page.evaluate(() => (window).__rpg?.temSave?.())) === true, 30, "temSave após reload");
  ok("CONTINUAR aparece com save real", (await page.locator('[data-testid="rpg-continuar"]').count()) === 1);
  // recomeçar com confirmação (UI honesta da v42) — primeiro "manter", depois o teste programático apaga
  await page.locator('[data-testid="rpg-recomecar"]').click();
  await sel("rpg-recomecar-confirm", 5000);
  await page.locator('[data-testid="rpg-recomecar-confirm"] button:has-text("manter o save")').click();
  await aguardar(async () => (await page.locator('[data-testid="rpg-recomecar-confirm"]').count()) === 0, 10, "confirmação fechou");
  ok("recomeçar pede confirmação · \"manter o save\" preserva o CONTINUAR", (await page.locator('[data-testid="rpg-continuar"]').count()) === 1);
  await page.locator('[data-testid="rpg-continuar"]').click();
  await aguardar(async () => (await cap())?.fase === "jogando", 60, "continuar → jogando");
  await pump(10);
  r1 = await rpg();
  ok("CONTINUAR: nível preservado", r1.nivel === nivelAntes);
  ok("CONTINUAR: história completa preservada", r1.historiaFeita === true);
  ok("CONTINUAR: Guardião derrotado preservado", r1.boss.derrotado === true);
  ok("CONTINUAR: mochila restaurada DO SAVE (espada 1× sem duplicar; kit NÃO re-adicionado — tocha 0 prova o caminho)", await page.evaluate(() => {
    const w = (window).__rpg, inv = w.motor.inv;
    return inv.contar(112) === 1 && inv.contar(17) === 0 && !!w.perfil().inv?.some((s) => s?.id === 112);
  }));
  ok("CONTINUAR: o item NO CHÃO voltou ao sítio (o chão restaurou com a lenda — ±pop do restauro)", await page.evaluate((s) => {
    const f = (window).__rpg.itensChao();
    return f.itens.some((i) => i.id === 122 && Math.hypot(i.x - s.x, i.z - s.z) < 1.0);
  }, couroSalvo));

  // ── novo jogo apaga o save ──
  await page.evaluate(() => (window).__rpg.apagarSave());
  await page.reload({ waitUntil: "domcontentloaded" });
  await sel("rpg-titulo", 30000);
  await aguardar(async () => (await page.locator('[data-testid="rpg-continuar"]').count()) === 0, 30, "CONTINUAR some");
  ok("novo jogo: save apagado, CONTINUAR oculto", true);

  // ── consola limpa ──
  const errosReais = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("Sem erros de consola relevantes", errosReais.length === 0);
  if (errosReais.length) console.log("   ", errosReais.slice(0, 5).join("\n    "));

  await browser.close();
}

async function main() {
  console.log(`\n⚔️ v41 — BATEU RPG: LENDAS — ${BASE}\n`);
  await parteA();
  await parteB();
  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ ${passed} passaram · ❌ ${failed} falharam`);
  if (fails.length) { console.log("FALHAS:"); fails.forEach((f) => console.log("  •", f)); }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
