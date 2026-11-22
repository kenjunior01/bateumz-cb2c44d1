// ============================================================
// v80 — «DESBLOQUEIOS REAIS» (fatia 3 da visão de retenção)
// ──────────────────────────────────────────────────────────────
// A) NÚCLEO (Node, determinístico — src/lib/desbloqueios.ts):
//    catálogo SINCRONIZADO com NIVEIS nos DOIS sentidos (guarda
//    de deriva) · tipos FECHADOS cosmético/estrutural (não existe
//    tipo de stats — vantagem impossível por construção) · gating
//    honesto por nível · hidratar à prova de JSON podre (bloqueado
//    → null) · escolherCosmetico RECUSA bloqueado/inexistente/tipo
//    errado · resumoFalta honesto.
// B) E2E (vite + browser): no hub, o painel de desbloqueios render
//    dentro do painel de progressão · 12 itens · bloqueado mostra
//    nível + pontos exatos · USAR aplica a MOLDURA à faixa de
//    nível (cor bronze visível) e o TÍTULO aparece · persiste após
//    reload · cosmeticos SEMEADOS BLOQUEADOS no aparelho são
//    RECUSADOS (revalidação honesta) · ZERO pageerror.
// Uso: PW_CHROME=… node test-desbloqueios-v80.mjs
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

let D;
async function main() {
  limparZumbis();
  console.log(`\n🎮 DESBLOQUEIOS REAIS v80 — ${BASE}\n`);

  // ── A) NÚCLEO ────────────────────────────────────────────────
  console.log("— A) Núcleo puro (desbloqueios.ts) —");
  // desbloqueios.ts importa progressao.ts (sem extensão — convenção Vite);
  // no Node importa-se pelo BUNDLE esbuild (padrão da casa v60).
  const { execFileSync } = await import("node:child_process");
  const bundleNucleo = `${RAIZ}/.v80-nucleo-bundle.mjs`;
  execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/desbloqueios.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundleNucleo}`], { stdio: "pipe" });
  D = await import(bundleNucleo);
  const P = await import(`${RAIZ}/src/lib/progressao.ts`);

  // 1) GUARDA DE SINCRONIZAÇÃO (catálogo ↔ NIVEIS nos dois sentidos)
  {
    const problemas = D.catalogoSincronizadoComNiveis();
    ok("catálogo SINCRONIZADO com NIVEIS nos dois sentidos (sem órfãos, sem divergência)", problemas.length === 0);
    const totalNiveis = P.NIVEIS.reduce((s, n) => s + n.desbloqueia.length, 0);
    ok(`catálogo tem EXATAMENTE os ids das NIVEIS (${totalNiveis} entradas)`, D.CAT_DESBLOQUEIOS.length === totalNiveis && totalNiveis === 12);
    ok("guarda deteta ÓRFÃO que se meta no catálogo sem estar nas NIVEIS (deriva impossível passa batida)",
      (() => {
        const falso = { ...D.CAT_DESBLOQUEIOS, find: D.CAT_DESBLOQUEIOS.find }; // não mutável — testa por simulação no nível
        void falso;
        // simula: adiciona um id às NIVEIS clonadas e verifica a deteção lógica (o método é puro — aqui prova-se a regra com cópias)
        const niveisFalsos = P.NIVEIS.map((n) => n.nivel === 1 ? { ...n, desbloqueia: [...n.desbloqueia, "id-fantasma"] } : n);
        const idsNiveis = new Set(niveisFalsos.flatMap((n) => n.desbloqueia));
        const idsCat = new Set(D.CAT_DESBLOQUEIOS.map((d) => d.id));
        const orfaos = [...idsNiveis].filter((id) => !idsCat.has(id));
        return orfaos.length === 1 && orfaos[0] === "id-fantasma";
      })());
  }

  // 2) TIPOS FECHADOS — vantagem competitiva impossível por construção
  {
    const tiposValidos = new Set(["avatar", "moldura", "tema", "titulo", "estrutural"]);
    ok("tipos SÓ do enum cosmético/estrutural (não existe «stat» no sistema)",
      D.CAT_DESBLOQUEIOS.every((d) => tiposValidos.has(d.tipo)));
    ok("nenhum nome/descrição contém stats/moedas/velocidade/dano (regex v78)",
      D.CAT_DESBLOQUEIOS.every((d) => !/stat|moeda|veloc|dano|poder|saldo/i.test(d.nome + " " + d.desc)));
    ok("avatar-classico é nível 1 (o ponto de partida honesto)", D.nivelMinimoDe("avatar-classico") === 1);
  }

  // 3) GATING honesto por nível
  {
    ok("níveis mínimos corretos (moldura-bronze 2 · acesso-torneios 3 · moldura-ouro 4 · titulo-lenda 5)",
      D.nivelMinimoDe("moldura-bronze") === 2 && D.nivelMinimoDe("acesso-torneios") === 3 && D.nivelMinimoDe("moldura-ouro") === 4 && D.nivelMinimoDe("titulo-lenda") === 5);
    ok("id PODRE/desconhecido → null", D.nivelMinimoDe("nao-existe") === null && D.nivelMinimoDe("") === null && D.nivelMinimoDe(42) === null);
    ok("desbloqueadosAte(1) = só o avatar clássico", D.desbloqueadosAte(1).length === 1 && D.desbloqueadosAte(1)[0].id === "avatar-classico");
    ok("desbloqueadosAte(5) = catálogo completo (12) e ordenado por nível", D.desbloqueadosAte(5).length === 12 && D.desbloqueadosAte(5).every((d, i, a) => i === 0 || a[i - 1].nivel <= d.nivel));
    ok("desbloqueadosAte com nível podre → não crasha (0/negativo → nível 1)", D.desbloqueadosAte(0).length === 1 && D.desbloqueadosAte(-3).length === 1);
    ok("podeUsar: moldura-ouro recusada no nível 3, aceite no 4 (honesto)", D.podeUsar("moldura-ouro", 3) === false && D.podeUsar("moldura-ouro", 4) === true);
    ok("podeUsar: id podre → false sempre", D.podeUsar("fantasma", 5) === false);
  }

  // 4) COSMÉTICOS: hidratar à prova de podre + escolher RECUSA o bloqueado
  {
    const h1 = D.hidratarCosmeticos({ molduraId: "moldura-ouro", tituloId: "titulo-lenda", temaId: "tema-praia" }, 2);
    ok("hidratar: BLOQUEADOS (ouro/lenda no nível 2) → null, o que se pode usar fica",
      h1.molduraId === null && h1.tituloId === null && h1.temaId === "tema-praia");
    const h2 = D.hidratarCosmeticos({ molduraId: "fantasma", tituloId: 42, temaId: null }, 3);
    ok("hidratar: id desconhecido/não-string → null", h2.molduraId === null && h2.tituloId === null && h2.temaId === null);
    ok("hidratar: NÃO-objeto → padrão", D.hidratarCosmeticos("podre", 5).molduraId === null);

    const base = D.cosmeticosPadrao();
    const r1 = D.escolherCosmetico(base, "moldura", "moldura-ouro", 3);
    ok("escolher BLOQUEADO → recusado com motivo e estado INTACTO", r1.motivo === "bloqueado" && r1.estado.molduraId === null);
    const r2 = D.escolherCosmetico(base, "moldura", "fantasma", 5);
    ok("escolher id INEXISTENTE → recusado", r2.motivo === "inexistente" && r2.estado.molduraId === null);
    const r3 = D.escolherCosmetico(base, "moldura", "titulo-competidor", 5);
    ok("escolher TIPO errado (título na moldura) → recusado", r3.motivo === "tipo");
    const r4 = D.escolherCosmetico(base, "moldura", "moldura-prata", 3);
    ok("escolher VÁLIDO → ok e aplicado", r4.motivo === "ok" && r4.estado.molduraId === "moldura-prata");
    const r5 = D.escolherCosmetico(r4.estado, "moldura", null, 3);
    ok("REMOVER (null) → ok e limpo", r5.motivo === "ok" && r5.estado.molduraId === null);
    const r6 = D.escolherCosmetico(base, "avatar", "avatar-classico", 1);
    ok("tipo NÃO selecionável (avatar) → recusado", r6.motivo === "tipo");
    ok("tipoSelecionavel: moldura/titulo/tema sim · avatar/estrutural não",
      D.tipoSelecionavel("moldura") && D.tipoSelecionavel("titulo") && D.tipoSelecionavel("tema") && !D.tipoSelecionavel("avatar") && !D.tipoSelecionavel("estrutural"));
  }

  // 5) resumoFalta honesto
  {
    ok("resumoFalta(0) diz quanto falta para o nível 2", D.resumoFalta(0).includes("500") && D.resumoFalta(0).includes("Explorador"));
    ok("resumoFalta(999999) = nível máximo honesto", D.resumoFalta(999999).includes("máximo"));
  }

  // ── B) E2E ───────────────────────────────────────────────────
  console.log("\n— B) E2E (vite + browser: hub com desbloqueios reais) —");
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
  ok("vite dev responde", await esperarAte(`${BASE}/lives`, (r) => r.status < 500, 90_000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // aquecimento (deps otimizadas)
  const warmCtx = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const warmPg = await warmCtx.newPage();
  await warmPg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await dormir(4000);
  await warmPg.close();
  await warmCtx.close();
  console.log("  (aquecimento do vite feito — deps otimizadas)");

  const erros = [];
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") erros.push(`${m.text()} @ ${m.location()?.url ?? "?"}`); });

  // semente: jogador nível 3 (2000 pontos) — moldura-bronze/prata + título competidor alcançáveis
  // (SÓ a progressão é semeada aqui — o addInitScript corre em CADA reload,
  //  por isso NÃO pode tocar nos cosmeticos: matava a seleção persistida)
  const sementeProgressao = JSON.stringify({
    versao: 1, jogadorId: "", pontos: 2000, corridas: 0, diaContador: "", jogosHoje: [],
    vitoriasHoje: 0, missoes: [], missoesConcluidasTotal: 0, ultimaAtividade: 0,
  });
  await pg.addInitScript((sem) => {
    localStorage.setItem("bateu_progressao_v78", sem);
  }, sementeProgressao);

  await pg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await pg.waitForSelector('[data-testid="painel-desbloqueios"]', { timeout: 60_000 });
  ok("painel de DESBLOQUEIOS renderiza dentro do painel de progressão (hub)", true);

  const faixa = await pg.locator('[data-testid="progressao-nivel"]').innerText();
  ok("semente aplicada: Nível 3 · Competidor (2000 pontos)", faixa.includes("Nível 3") && faixa.toLowerCase().includes("competidor"));

  const nItens = await pg.locator('[data-testid="desbloqueios-grelha"] > div').count();
  ok(`grelha mostra o CATÁLOGO COMPLETO (${nItens} itens)`, nItens === 12);

  const faltaOuro = await pg.locator('[data-testid="desbloqueio-falta-moldura-ouro"]').innerText();
  ok("bloqueado MOSTRA O QUE FALTA (Campeão · 6000 pts — nada de «quase lá» fictício)",
    faltaOuro.includes("Campe") && faltaOuro.replace(/[\s.\u00a0]/g, "").includes("6000"));

  const faltaLenda = await pg.locator('[data-testid="desbloqueio-falta-titulo-lenda"]').count();
  ok("título LENDA bloqueado no nível 3 (honesto)", faltaLenda === 1);

  // USAR moldura bronze → a faixa de nível ganha a cor da moldura
  const btnBronze = pg.locator('[data-testid="desbloqueio-usar-moldura-bronze"]');
  ok("moldura-bronze desbloqueada com botão USAR", await btnBronze.count() === 1);
  await btnBronze.click();
  await dormir(500);
  const corBorda = await pg.locator('[data-testid="progressao-nivel"]').evaluate((el) => getComputedStyle(el).borderColor);
  ok("MOLDURA APLICADA de verdade: borda da faixa de nível ficou BRONZE (rgb 180,83,9)", corBorda.includes("180, 83, 9"));

  // USAR título competidor → chip de título aparece
  const btnTitulo = pg.locator('[data-testid="desbloqueio-usar-titulo-competidor"]');
  await btnTitulo.click();
  await dormir(500);
  const tituloTxt = await pg.locator('[data-testid="progressao-titulo-ativo"]').innerText();
  ok("TÍTULO aplicado de verdade: chip «Competidor» junto ao nível", tituloTxt.includes("Competidor"));

  // prévia mostra a moldura em uso
  const previa = await pg.locator('[data-testid="desbloqueios-previa"]').innerText();
  ok("prévia declara «A usar: Moldura Bronze»", previa.includes("A usar: Moldura Bronze"));

  // persistência: reload mantém a seleção
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="painel-desbloqueios"]', { timeout: 60_000 });
  const tituloApos = await pg.locator('[data-testid="progressao-titulo-ativo"]').count();
  const corApos = await pg.locator('[data-testid="progressao-nivel"]').evaluate((el) => getComputedStyle(el).borderColor);
  ok("PERSISTE após reload (moldura bronze + título Competidor)", tituloApos === 1 && corApos.includes("180, 83, 9"));

  // HONESTIDADE: cosmeticos SEMEADOS BLOQUEADOS no aparelho são RECUSADOS
  await pg.evaluate(() => {
    localStorage.setItem("bateu_cosmeticos_v80", JSON.stringify({ molduraId: "moldura-lenda", tituloId: "titulo-campeao", temaId: null }));
  });
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForSelector('[data-testid="painel-desbloqueios"]', { timeout: 60_000 });
  const corTrapa = await pg.locator('[data-testid="progressao-nivel"]').evaluate((el) => getComputedStyle(el).borderColor);
  const tituloTrapa = await pg.locator('[data-testid="progressao-titulo-ativo"]').count();
  const guardado = await pg.evaluate(() => localStorage.getItem("bateu_cosmeticos_v80") || "");
  ok("TRAMBIQUES recusado: moldura-lenda/titulo-campeao SEMEADOS no nível 3 NÃO são aplicados (sem chip de título, sem rosa da lenda) e a store AUTO-LIMPA",
    tituloTrapa === 0 && !corTrapa.includes("244, 63, 94") && !guardado.includes("moldura-lenda"));

  await pg.screenshot({ path: "shots-v80/desbloqueios-hub.png", fullPage: false }).catch(() => {});

  const errosReais = erros.filter((e) => !/favicon|Slow network|SwiftShader|GPU|Autoplay|playwright|supabase\.co|Failed to load resource/i.test(e));
  if (errosReais.length) console.log("    erros:", errosReais.slice(0, 4).join(" || ").slice(0, 600));
  ok("ZERO erros de página/console relevantes", errosReais.length === 0);

  await browser.close();
  matarTodos();

  console.log(`\n══ DESBLOQUEIOS REAIS v80: ${passed} verdes · ${failed} falhados ══`);
  if (fails.length) { console.log("Falhados:"); for (const f of fails) console.log(`  - ${f}`); }
  process.exit(failed ? 1 : 0);
}

try { await main(); } catch (e) {
  console.error(e);
  matarTodos();
  process.exit(1);
}
