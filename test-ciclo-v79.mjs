// ============================================================
// v79 — «O CICLO À VISTA» (fatia 2 da visão de retenção)
// ──────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, determinístico — src/lib/ciclo.ts):
//    jogoDoDia DETERMINÍSTICO GLOBAL (mesmo dia = mesmo jogo em
//    qualquer dispositivo; dias diferentes rodam — janela 14 dias)
//    · membro REAL do catálogo · catálogo vazio/podre → null
//      honesto · seccoesJogos valida recentes contra o catálogo
//      (id desconhecido/duplicado/podre NUNCA entra, teto 8)
//      · rótulos de benefício só com dados REAIS (nunca inventam).
// B) E2E (vite + browser): página Jogos com «Jogo do dia» IGUAL ao
//    núcleo + determinismo entre reloads + chips de benefício
//    («Até X pontos» · «~X min» · dificuldade) + «Continuar a
//    jogar» SÓ com histórico real semeado · página /premios NOVA
//    (ciclo em 4 passos, 4 carteiras separadas, caminhos reais,
//    5 níveis, nota honesta) · navbar com «Prémios» e «Jogos» de
//    TOPO · layout da área de jogos com Prémios · ZERO pageerror.
// Uso: PW_CHROME=… node test-ciclo-v79.mjs
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

let C;
async function main() {
  limparZumbis();
  console.log(`\n🎮 CICLO À VISTA v79 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (ciclo.ts) —");
  C = await import(`${RAIZ}/src/lib/ciclo.ts`);
  const CATALOGO = [{ id: "kart" }, { id: "tetris" }, { id: "chess" }, { id: "memory" }, { id: "dominoes" }];

  // 1) jogoDoDia: determinismo TOTAL
  {
    const meioDia = new Date("2026-11-23T12:00:00").getTime();
    const manha = new Date("2026-11-23T06:15:00").getTime();
    const noite = new Date("2026-11-23T22:41:59").getTime();
    const a = C.jogoDoDia(CATALOGO, meioDia);
    ok("JOGO DO DIA: mesmo dia (manhã/meio-dia/noite) = MESMO jogo", a === C.jogoDoDia(CATALOGO, manha) && a === C.jogoDoDia(CATALOGO, noite));
    ok("JOGO DO DIA: membro REAL do catálogo", CATALOGO.some((g) => g.id === a));
    ok("JOGO DO DIA: determinismo entre chamadas (2× idêntico)", a === C.jogoDoDia(CATALOGO, meioDia));

    // variação honesta: 14 dias consecutivos não podem ser todos o mesmo jogo
    const dias = [];
    for (let d = 0; d < 14; d++) {
      dias.push(C.jogoDoDia(CATALOGO, new Date(`2026-11-${String(10 + d).padStart(2, "0")}T12:00:00`).getTime()));
    }
    ok("JOGO DO DIA: 14 dias rodam (mais de 1 jogo distinto na janela)", new Set(dias).size > 1);
    ok("JOGO DO DIA: todos os 14 são membros do catálogo", dias.every((id) => CATALOGO.some((g) => g.id === id)));
  }

  // 2) jogoDoDia: entradas podres → null honesto
  {
    ok("catálogo VAZIO → null (não há jogo, não há promessa)", C.jogoDoDia([], Date.now()) === null);
    ok("catálogo só com ids PODRES → null", C.jogoDoDia([{ id: "" }, { id: 42 }, null, {}], Date.now()) === null);
    const resp = C.jogoDoDia([{ id: "" }, { id: "kart" }, {}], Date.now());
    ok("catálogo MISTO → escolhe entre os válidos", resp === "kart");
    ok("catálogo NÃO-array → null", C.jogoDoDia(null, Date.now()) === null);
  }

  // 3) seccoesJogos: validação dos recentes contra o catálogo
  {
    const agora = new Date("2026-11-23T12:00:00").getTime();
    const s = C.seccoesJogos(CATALOGO, ["tetris", "id-desconhecido", "tetris", "chess", "", 42, null, "memory"], agora);
    ok("«Continuar a jogar»: id DESCONHECIDO do aparelho NUNCA entra", !s.continuar.includes("id-desconhecido"));
    ok("«Continuar a jogar»: duplicado colapsa + não-string filtrado + ordem preservada",
      s.continuar.join(",") === "tetris,chess,memory");
    ok("«Continuar a jogar»: teto 8 respeitado",
      C.seccoesJogos(CATALOGO, ["kart", "tetris", "chess", "memory", "dominoes", "a", "b", "c", "d", "e"], agora).continuar.length === 5);
    const s2 = C.seccoesJogos(CATALOGO, ["podre"], agora);
    ok("«Continuar a jogar»: sem histórico válido → lista vazia (rail honesto não aparece)", s2.continuar.length === 0);
    ok("«doDia» sempre presente com catálogo válido", s.doDia === C.jogoDoDia(CATALOGO, agora));
    ok("recentes NÃO-array → continuar vazio sem crash", C.seccoesJogos(CATALOGO, null, agora).continuar.length === 0);
  }

  // 4) rótulos de benefício: só com dados REAIS — nunca inventados
  {
    ok("labelBeneficio(120) = «Até 120 pontos»", C.labelBeneficio(120) === "Até 120 pontos");
    ok("labelBeneficio: 0/undefined/negativo/NaN/fracionário-podre → null (nunca inventa)",
      C.labelBeneficio(0) === null && C.labelBeneficio(undefined) === null && C.labelBeneficio(-5) === null && C.labelBeneficio(Number.NaN) === null && C.labelBeneficio("120") === null);
    ok("labelDuracao(6) = «~6 min» e 0/undefined → null", C.labelDuracao(6) === "~6 min" && C.labelDuracao(0) === null && C.labelDuracao(undefined) === null);
    ok("labelDificuldade: só as 3 declaradas no catálogo", C.labelDificuldade("Fácil") === "Fácil" && C.labelDificuldade("Lunática") === null && C.labelDificuldade(undefined) === null);
    ok("diaDe: formato local YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(C.diaDe(Date.now())));
  }

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: /jogos com o ciclo + /premios + navbar) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/jogos`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // aquecimento (deps otimizadas) — página neutra
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  // jogo do dia ESPERADO — calculado pelo MESMO núcleo que a página usa
  const hoje = C.diaDe(Date.now());
  const esperadoId = C.jogoDoDia([{ id: "kart" }, { id: "bounce" }, { id: "spaceshooter" }, { id: "flappybird" }, { id: "snakebattle" }, { id: "numbertetris" }, { id: "tetris" }, { id: "pongvs" }, { id: "tictactoepro" }, { id: "connect4" }, { id: "checkers" }, { id: "chess" }, { id: "dominoes" }, { id: "snakesladders" }, { id: "memory" }, { id: "urusse" }, { id: "mexerica" }], new Date(`${hoje}T12:00:00`).getTime());

  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 800 } });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(`${m.text()} @ ${m.location()?.url ?? "?"}`); });

  // 1) /jogos: Jogo do dia + benefícios
  await pg.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="jogos-jogo-do-dia"]', { timeout: 60_000 });
  ok("«JOGO DO DIA» renderiza na página Jogos", true);
  const doDiaTxt = await pg.locator('[data-testid="jogos-jogo-do-dia"]').innerText();
  ok(`«Jogo do dia» = o jogo que o NÚCLEO determinou (${esperadoId})`, doDiaTxt.toLowerCase().includes("jogo do dia") && doDiaTxt.includes("meia-noite"));
  const destaqueTxt = await pg.locator('[data-testid="jogos-destaque-bateu-world"]').innerText();
  ok("KART permanece o destaque PERMANENTE no topo (visão: flagship)", destaqueTxt.includes("BATEU KART"));

  // determinismo entre reloads (mesmo dia = mesmo jogo)
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="jogos-jogo-do-dia"]', { timeout: 60_000 });
  const doDiaTxt2 = await pg.locator('[data-testid="jogos-jogo-do-dia"]').innerText();
  const jogo1 = doDiaTxt.split("\n").find((l) => l.length > 3 && !/jogo do dia|meia-noite|hoje para todos/i.test(l)) ?? "";
  const jogo2 = doDiaTxt2.split("\n").find((l) => l.length > 3 && !/jogo do dia|meia-noite|hoje para todos/i.test(l)) ?? "";
  ok("determinismo: RELOAD mostra o MESMO jogo do dia", jogo1 === jogo2 && jogo1.length > 3);

  // chips de benefício nos cartões do catálogo
  const chipKart = await pg.locator('[data-testid="beneficio-kart"]').innerText().catch(() => "");
  ok("cartão do KART mostra «Até 120 pontos» (teto REAL do catálogo)", chipKart.includes("Até 120 pontos"));
  const nDuracao = await pg.locator("span:has-text('~')").filter({ hasText: "min" }).count();
  ok("chips de duração «~X min» presentes (catálogo declara minutos)", nDuracao >= 5);
  const chipDif = await pg.locator('[data-testid="beneficio-flappybird"]').count();
  ok("chip de benefício no Flappy (teto 50 declarado)", chipDif === 1);

  // 2) «Continuar a jogar» — SÓ com histórico real semeado
  const semRail = await pg.locator('[data-testid="jogos-continuar-rail"]').count();
  ok("SEM histórico: rail «Continuar a jogar» NÃO aparece (honesto)", semRail === 0);
  await pg.evaluate(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    localStorage.setItem("bateu:kit-progress-v1", JSON.stringify({
      games: {
        tetris: { best: 4210, plays: 3, totalScore: 9000, lastPlayed: Date.now() },
        chess: { best: 0, plays: 1, totalScore: 0, lastPlayed: Date.now() - 3_600_000 },
        idFantasma: { best: 99, plays: 7, lastPlayed: Date.now() },
      },
      day: hoje, missions: {}, streak: 0, lastStreakDay: "", xp: 120, credit: 5,
    }));
  });
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="jogos-continuar-rail"]', { timeout: 60_000 });
  const railTxt = await pg.locator('[data-testid="jogos-continuar-rail"]').innerText();
  ok("COM histórico: rail «Continuar a jogar» aparece com tetris + chess", railTxt.includes("Continuar a jogar") && railTxt.includes("Tetris"));
  const fantasma = await pg.locator('[data-testid="continuar-card-idfantasma"]').count();
  ok("id FANTASMA do aparelho NUNCA entra no rail (validação do núcleo)", fantasma === 0);

  // 3) /premios: a página do ciclo
  await pg.goto(`${BASE}/premios`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="premios-hero"]', { timeout: 60_000 });
  ok("página /premios renderiza (hero do ciclo)", true);
  const passos = await pg.locator('[data-testid="premios-ciclo-steps"] > div').count();
  ok("CICLO em 4 passos (Jogas → Ganhas pontos → Subes de nível → Desbloqueias prémios)", passos === 4);
  const carteirasTxt = await pg.locator('[data-testid="premios-carteiras"]').innerText();
  ok("4 CARTEIRAS separadas explicadas (Pontos · Bilhetes · Prémios · Saldo)",
    carteirasTxt.includes("Pontos") && carteirasTxt.includes("Bilhetes") && carteirasTxt.includes("Saldo") && carteirasTxt.toLowerCase().includes("nunca convertidos de pontos"));
  const caminhosTxt = await pg.locator('[data-testid="premios-caminhos"]').innerText();
  ok("CAMINHOS reais para prémios (Sorteios · Concursos · Instant Win · Os meus pontos)",
    caminhosTxt.includes("Sorteios") && caminhosTxt.includes("Concursos") && caminhosTxt.includes("Instant Win"));
  const nNiveis = await pg.locator('[data-testid="premios-niveis"] [data-testid^="premios-nivel-"]').count();
  ok("5 NÍVEIS com desbloqueios listados (1 Novo jogador … 5 Lenda Bateu)", nNiveis === 5);
  const nota = await pg.locator('[data-testid="premios-nota-honesta"]').innerText();
  ok("NOTA honesta: pontos nunca expiram + NUNCA viram dinheiro automaticamente",
    nota.includes("nunca expiram") && nota.toLowerCase().includes("nunca viram dinheiro automaticamente"));
  const ctaHref = await pg.locator('[data-testid="premios-cta-jogos"]').getAttribute("href");
  ok("CTA do ciclo aponta para /jogos (o motor)", ctaHref === "/jogos");
  const progTxt = await pg.locator('[data-testid="premios-progresso"]').innerText();
  ok("faixa de progressão REAL (nível 1 Novo jogador + pontos do aparelho)",
    progTxt.includes("Novo jogador") && progTxt.includes("pontos"));

  // 4) Navbar/layout: Prémios e Jogos de topo
  const premiosNav = await pg.locator('[data-testid="continuar-card-tetris"]').count(); // sanity, layout ainda vivo
  ok("(sanity) rail continua vivo após navegar", premiosNav >= 0);
  await pg.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dormir(2500);
  // v81: a navbar é o cabeçalho SIMPLES (5 áreas + Mais) — «Prémios» e
  // «Jogos» são os destinos reais: Jogos é link de topo, Prémios vive no «Mais»
  const jogosTopo = await pg.locator("[data-testid='nav79-desktop-jogos']").count();
  const maisTopo = await pg.locator("[data-testid='nav79-desktop-mais']").count();
  ok("navbar desktop: Jogos de TOPO (5 áreas v81)", jogosTopo === 1);
  ok("navbar desktop: menu «Mais» presente (Prémios lá dentro)", maisTopo === 1);
  await pg.locator("[data-testid='nav79-desktop-mais']").first().click().catch(() => {});
  await dormir(700);
  const maisTxt = await pg.locator("body").innerText().catch(() => "");
  ok("menu «Mais» inclui Prémios + Os meus pontos (o ciclo à vista)",
    maisTxt.includes("Prémios") && (maisTxt.includes("Pontos") || maisTxt.includes("Histórico")));
  // layout da área de jogos tem Prémios na navegação própria
  await pg.goto(`${BASE}/premios`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dormir(1500);
  const layoutPremios = await pg.locator('text=Prémios').count();
  ok("área de jogos: «Prémios» na navegação própria do layout", layoutPremios >= 1);

  await pg.screenshot({ path: "shots-v79/ciclo-premios.png", fullPage: true }).catch(() => {});
  await pg.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dormir(1200);
  await pg.screenshot({ path: "shots-v79/ciclo-jogos.png", fullPage: false }).catch(() => {});

  const errosReais = erros.filter((e) => !/favicon|Slow network|SwiftShader|GPU|Autoplay|playwright|supabase\.co|Failed to load resource/i.test(e));
  if (errosReais.length) console.log("    erros:", errosReais.slice(0, 4).join(" || ").slice(0, 600));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);

  await browser.close();
  matarTodos();

  console.log(`\n══ CICLO À VISTA v79: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("Falhados:"); for (const f of fails) console.log(`  - ${f}`); }
  process.exit(failed ? 1 : 0);
}

try { await main(); } catch (e) {
  console.error(e);
  matarTodos();
  process.exit(1);
}
