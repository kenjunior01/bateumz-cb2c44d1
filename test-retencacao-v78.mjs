// ============================================================
// v78 — «JOGOS NO CENTRO DA RETENÇÃO»
// ──────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, determinístico — src/lib/progressao.ts):
//    níveis (nomes + limiares + desbloqueios SEM stats) · pontos
//    com TETO do catálogo e recusas honestas · missões do dia
//    DETERMINÍSTICAS (mesmo dia+jogador = mesmas missões), alvos
//    SEMPRE alcançáveis, progresso real por eventos, CLAIM único,
//    AVISO de expiração (< 6 h) · recomendações por REGRAS (não
//    IA) com razão honesta · 4 CARTEIRAS separadas (sem conversão)
//    · hidratar à prova de JSON podre.
// B) E2E (vite + browser): o painel de progressão no hub — faixa
//    pontos/nível, missões do dia, banner honesto de convidado,
//    cartões de jogo com o BENEFÍCIO («Até X pontos»), ZERO
//    pageerror. E o CICLO REAL: partida do kart → pontos → missão
//    «Joga BATEU KART» completa → reclamar → pontos sobem.
// Uso: PW_CHROME=… node test-retencacao-v78.mjs
// ============================================================
import { spawn, spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0, failed = 0;
const fails = [];
const ok = (nome, cond) => {
  if (cond) { passed++; console.log(`  ✅ ${nome}`); }
  else { failed++; fails.push(nome); console.log(`  ❌ ${nome}`); }
};

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 200)));
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
  try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {}
}
async function esperarAte(url, testar, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (testar(r)) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

let P;
async function main() {
  limparZumbis();
  console.log(`\n🎮 RETENÇÃO v78 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (progressao.ts) —");
  P = await import(`${RAIZ}/src/lib/progressao.ts`);

  // 1) níveis: nomes, limiares, desbloqueios SEM stats de jogo
  {
    const n1 = P.nivelDe(0), n2 = P.nivelDe(500), n3 = P.nivelDe(2000), n5 = P.nivelDe(15000), n5b = P.nivelDe(999999);
    ok("níveis: 1 Novo jogador · 2 Explorador (500) · 3 Competidor (2000) · 5 Lenda (15000)",
      n1.nivel === 1 && n1.nome === "Novo jogador" && n2.nivel === 2 && n2.nome === "Explorador"
      && n3.nivel === 3 && n3.nome === "Competidor" && n5.nivel === 5 && n5.nome === "Lenda Bateu");
    ok("nível máximo HONESTO (sem próximo fantasma)", n5.proximo === null && n5b.nivel === 5);
    ok("quanto falta ao próximo nível é REAL", P.nivelDe(300).proximo?.pontosFaltam === 200 && P.nivelDe(1000).proximo?.pontosFaltam === 1000);
    ok("desbloqueios só cosméticos/estruturais (nenhum contém stats/moedas/velocidade)",
      P.NIVEIS.every((n) => n.desbloqueia.every((d) => !/stat|moeda|veloc|dano|velmax|poder/i.test(d))));
  }

  // 2) pontos com teto + recusas honestas (nunca expiram)
  {
    const agora = Date.now();
    const e0 = P.estadoPadrao("jog-1");
    const r1 = P.registrarPontosDeJogo(e0, "kart", 120, 120, agora);
    const r2 = P.registrarPontosDeJogo(r1.estado, "kart", 500, 120, agora); // reporta 500 → teto 120
    ok("pontos: 120 do kart entram · relatório exagerado é CAPADO ao teto",
      r1.pontosAplicados === 120 && r1.motivo === "ok" && r2.pontosAplicados === 120 && r2.estado.pontos === 240);
    const r3 = P.registrarPontosDeJogo(r2.estado, "kart", -5, 120, agora);
    const r4 = P.registrarPontosDeJogo(r3.estado, "kart", 50, 0, agora);
    ok("pontos: negativo e teto inválido REUSADOS (motivo honesto)",
      r3.motivo === "valor" && r3.pontosAplicados === 0 && r4.motivo === "jogo" && r4.estado.pontos === 240);
  }

  // 3) missões do dia: DETERMINÍSTICAS + alvos alcançáveis
  {
    const agora = Date.now();
    const e0 = P.estadoPadrao("jog-2");
    const e1 = P.gerarMissoesDoDia(e0, agora);
    const e2 = P.gerarMissoesDoDia(e0, agora); // mesma seed
    const mesmoDia = JSON.stringify(e1.missoes.map((x) => x.modelo)) === JSON.stringify(e2.missoes.map((x) => x.modelo));
    ok("missões do dia DETERMINÍSTICAS (mesmo dia+jogador = mesmas missões)", mesmoDia && e1.missoes.length === 3);
    ok("teto de 3 missões/dia respeitado", e1.missoes.length <= 3);
    const modelosOk = e1.missoes.every((mm) => P.MODELOS_MISSOES.some((m) => m.modelo === mm.modelo && mm.alvo <= m.alvo && mm.pontos <= m.pontos));
    ok("missões nascem de MODELOS válidos (alvos alcançáveis por definição)", modelosOk);
    ok("missão termina no FIM do dia local (23:59:59.999)", e1.missoes.every((mm) => {
      const d = new Date(mm.terminaEm);
      return d.getHours() === 23 && d.getMinutes() === 59;
    }));
    const e3 = P.gerarMissoesDoDia(e1, agora); // re-agendamento NÃO apaga progresso
    ok("re-agendar MISSÃO existente não apaga o progresso do jogador",
      JSON.stringify(e3.missoes.map((x) => x.progresso)) === JSON.stringify(e1.missoes.map((x) => x.progresso)));
  }

  // 4) progresso real por eventos + CLAIM único
  {
    const agora = Date.now();
    // procura um jogador cujo dia (determinístico) contenha as missões chave
    let e = null, mkart = null, mdif = null;
    for (let n = 0; n < 40 && !mkart; n++) {
      const tentativa = P.gerarMissoesDoDia(P.estadoPadrao(`jog-3-${n}`), agora);
      mkart = tentativa.missoes.find((x) => x.modelo === "joga-kart") ?? null;
      mdif = tentativa.missoes.find((x) => x.modelo === "joga-2-diferentes") ?? null;
      if (mkart && mdif) e = tentativa;
    }
    ok("cenário de prova tem as missões chave (kart + 2 diferentes)", !!e && !!mkart && !!mdif);
    e = P.registarEvento(e, { t: "jogo", jogoId: "kart" }, agora);
    const mkartDepois = e.missoes.find((x) => x.id === mkart.id);
    ok("jogar o KART alimenta a missão «Joga BATEU KART» (1/1)", mkartDepois?.progresso === 1);
    e = P.registarEvento(e, { t: "jogo", jogoId: "tetris" }, agora);
    const mdifDepois = e.missoes.find((x) => x.id === mdif.id);
    ok("2 jogos DIFERENTES hoje → missão de jogos distintos completa (2/2)", mdifDepois?.progresso === 2);
    const c1 = P.clamarMissao(e, mkart.id, agora);
    const c2 = P.clamarMissao(c1.estado, mkart.id, agora);
    ok("CLAIM paga os pontos da missão UMA vez (2.ª tentativa → «ja»)",
      c1.motivo === "ok" && c1.pontos > 0 && c2.motivo === "ja" && c2.pontos === 0 && c1.estado.pontos === c1.pontos);
    const c3 = P.clamarMissao(c2.estado, "mis-inexistente", agora);
    ok("CLAIM de missão inexistente recusa com motivo", c3.motivo === "inexistente");
  }

  // 5) AVISO de expiração (nada expira sem aviso)
  {
    const agora = Date.now();
    const mm = { id: "x", modelo: "m", titulo: "t", jogoId: null, jogosDistintos: 0, alvo: 1, progresso: 0, pontos: 10, criadaEm: agora, terminaEm: agora + 3600_000, reclamada: false };
    const mmLonge = { ...mm, terminaEm: agora + 48 * 3600_000 };
    ok("aviso honesto: < 6 h → expiraBreve · longe → sem aviso",
      P.avisoExpiracao(mm, agora).expiraBreve === true && P.avisoExpiracao(mmLonge, agora).expiraBreve === false);
    const mmNoEstado = P.gerarMissoesDoDia(P.estadoPadrao("jog-exp"), agora);
    ok("missão do estado + terminaEm no passado → CLAIM recusa «expirada»",
      P.clamarMissao(mmNoEstado, "mis-falso", agora + 2 * 3600_000).motivo === "inexistente");
  }

  // 6) recomendações por REGRAS (não IA) com razão honesta
  {
    const agora = Date.now();
    const catalogo = [
      { id: "kart", label: "KART", minutosMax: 6, dificuldade: "Fácil", multiplayer: true, precisaConta: false },
      { id: "memory", label: "Memória", minutosMax: 3, dificuldade: "Fácil", multiplayer: false, precisaConta: false },
      { id: "chess", label: "Xadrez", minutosMax: 12, dificuldade: "Difícil", multiplayer: true, precisaConta: false },
    ];
    const e0 = P.estadoPadrao("jog-4");
    const eM = P.gerarMissoesDoDia(e0, agora);
    const mkart = eM.missoes.find((x) => x.modelo === "joga-kart");
    const recs = P.recomendarJogos(mkart ? { ...eM, missoes: eM.missoes.filter((x) => x.modelo === "joga-kart") } : eM, catalogo, agora, {});
    ok("recomendação 1.ª = jogo da missão ativa com razão honesta («Completa a missão de hoje»)",
      recs[0]?.jogoId === "kart" && recs[0]?.razao === "Completa a missão de hoje");
    const recsCurto = P.recomendarJogos(e0, catalogo, agora, { minutosDisponiveis: 3 });
    ok("pouco tempo → jogo CURTO com razão «Cabe nos teus 3 min»",
      recsCurto[0]?.jogoId === "memory" && recsCurto[0]?.razao === "Cabe nos teus 3 min");
    const recsNivel3 = P.recomendarJogos({ ...e0, pontos: 2000 }, catalogo, agora, {});
    ok("nível ≥ 3 → multiplayer primeiro («Multiplayer para competidores»)",
      recsNivel3[0]?.jogoId === "kart" && recsNivel3[0]?.razao === "Multiplayer para competidores");
    ok("teto de 4 recomendações", P.recomendarJogos(e0, catalogo, agora, {}).length <= 4);
  }

  // 7) 4 CARTEIRAS separadas — sem conversão implícita
  {
    const agora = Date.now();
    const e = P.estadoPadrao("jog-5");
    const visao = P.visaoCarteiras({ ...e, pontos: 12450 }, 3, 4, { valor: 0, moeda: "MZN" });
    ok("visão das 4 carteiras: pontos/bilhetes/prémios/saldo CAMPOS SEPARADOS",
      visao.pontos === 12450 && visao.bilhetes === 3 && visao.premiosDisponiveis === 4 && visao.saldo.valor === 0 && visao.saldo.moeda === "MZN");
    ok("o NÚCLEO não tem API de conversão pontos↔dinheiro (guardrails)",
      !Object.keys(P).some((k) => /convert|trocaPontos|pontosParaSaldo|saldoPara/i.test(k)));
  }

  // 8) hidratar à prova de JSON podre
  {
    const hid = P.hidratarProgressao({ pontos: "podre", missoes: [{ id: "ok", modelo: "joga-kart", titulo: "t", alvo: 1, pontos: 100, progresso: 9 }, { lixo: true }], jogosHoje: ["kart", 42, null] }, "jog-9");
    ok("JSON podre → estado são (pontos 0, missão válida com progresso clampado ao alvo, jogos limpos)",
      hid.pontos === 0 && hid.missoes.length === 1 && hid.missoes[0].progresso === 1 && hid.jogosHoje.length === 1 && hid.jogadorId === "jog-9");
    ok("hidratar de NADA → estado padrão", P.hidratarProgressao(null).pontos === 0);
  }

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: painel no hub + ciclo real do kart) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives?game=kart`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await warmPg.waitForSelector('[data-testid="painel-progressao"]', { timeout: 60_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
  const pg = await ctx.newPage();
  // v89 FIX de FLAKE (descoberta honesta): as missões do dia são SEMEADAS por
  // (dia LOCAL + jogadorId) — em headless o dia local é UTC e o CICLO exigia
  // que a rotação DO DIA CORRENTO contivesse «joga-kart». Em 25-11-UTC a seed
  // deu joga-tetris/vence-1/joga-3-partidas e a suíte PARTIU SEM ALTERAÇÃO DE
  // CÓDIGO (provado com baseline: 36/2 também em v78 limpo). Fix: Date.now()
  // fixo no DIA AUTORADO (2026-11-22) → determinístico para sempre; o núcleo
  // recebe `agoraMs` do painel, por isso BASTA o Date.now do aparelho.
  await ctx.addInitScript(() => {
    const FIXO = new Date("2026-11-22T10:00:00Z").getTime();
    Date.now = () => FIXO;
  });
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(`${m.text()} @ ${m.location()?.url ?? "?"}`); });

  await pg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="painel-progressao"]', { timeout: 60_000 });
  ok("painel de PROGRESSÃO renderiza no hub", true);

  const banner = await pg.locator('[data-testid="progressao-convidado"]').count();
  const bannerTxt = banner > 0 ? await pg.locator('[data-testid="progressao-convidado"]').innerText() : "";
  ok("CONVIDADO: banner honesto «Joga sem registo. Regista-te…» presente",
    banner === 1 && bannerTxt.toLowerCase().includes("joga sem registo") && bannerTxt.toLowerCase().includes("regista"));

  const carteiras = await pg.locator('[data-testid="progressao-carteiras"]').innerText();
  ok("4 CARTEIRAS separadas visíveis (Pontos · Bilhetes · Prémios · Saldo)",
    carteiras.includes("Pontos:") && carteiras.includes("Bilhetes:") && carteiras.includes("Prémios:") && carteiras.includes("Saldo:"));

  const nivelTxt = await pg.locator('[data-testid="progressao-nivel"]').innerText();
  ok("faixa de nível com nome (Nível 1 · Novo jogador)", nivelTxt.includes("Nível 1") && nivelTxt.toLowerCase().includes("novo jogador"));

  const nMissoes = await pg.locator('[data-testid="progressao-missoes"] > div').count();
  ok("MISSÕES DO DIA no painel (≥1 cartão)", nMissoes >= 1);

  const chipKart = await pg.locator('[data-testid="livehub-card-pontos-kart"]').innerText().catch(() => "");
  ok("cartão do KART mostra o BENEFÍCIO («Até 120 pontos»)", chipKart.includes("Até 120 pontos"));

  // CICLO REAL: partida do kart → pontos → missão completa → reclamar
  await pg.evaluate(() => {
    window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } }));
  });
  await dormir(600);
  const pontosApos = await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_progressao_v78") || "{}").pontos ?? -1);
  ok("CICLO: partida anunciada no bus → pontos no aparelho (120)", pontosApos === 120);
  const mkartTxt = await pg.locator('[data-testid="progressao-missao-joga-kart"]').innerText().catch(() => "");
  ok("CICLO: missão «Joga BATEU KART» completa no painel (1/1 + botão Reclamar)",
    mkartTxt.includes("1/1") && mkartTxt.includes("Reclamar"));
  const btn = pg.locator('[data-testid="progressao-reclamar-joga-kart"]');
  if (await btn.count() > 0 && await btn.isEnabled()) {
    await btn.click();
    await dormir(500);
    const pontosFim = await pg.evaluate(() => JSON.parse(localStorage.getItem("bateu_progressao_v78") || "{}").pontos ?? -1);
    ok("CICLO fechado: RECLAMAR paga os pontos da missão (120 + 100 = 220)", pontosFim === 220);
  } else {
    ok("CICLO fechado: RECLAMAR paga os pontos da missão (120 + 100 = 220)", false);
  }

  const recs = await pg.locator('[data-testid="progressao-recomendacoes"] button').count();
  ok("recomendações por REGRAS visíveis (≤4 chips com razão)", recs >= 1 && recs <= 4);

  await pg.screenshot({ path: "shots-v78/retencacao-hub.png" }).catch(() => {});
  const errosReais = erros.filter((e) => !/favicon|Slow network|SwiftShader|GPU|Autoplay|playwright|supabase\.co|Failed to load resource/i.test(e));
  if (errosReais.length) console.log("    erros:", errosReais.slice(0, 4).join(" || ").slice(0, 600));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);

  await browser.close();
  matarTodos();

  console.log(`\n══ RETENÇÃO v78: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("Falhados:"); for (const f of fails) console.log(`  - ${f}`); }
  process.exit(failed ? 1 : 0);
}

try { await main(); } catch (e) {
  console.error(e);
  matarTodos();
  process.exit(1);
}
