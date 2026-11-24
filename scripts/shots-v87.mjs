// shots-v87 — capturas do «TROFÉUS QUE SE MOSTRAM» (dados REAIS criados pelo núcleo)
// Padrão v84-v86: o torneio/liga/troféu existem NO APARELHO porque o núcleo
// esport.ts os criou (partidas de campo F1 verdadeiras, janelas fechadas por
// TEMPO manipulado — resultados nunca). Ordem importa: a eliminatória ATIVA
// nasce por ÚLTIMO (uma partida alimenta TODOS os ativos do mesmo jogo).
// Uso: PW_CHROME=… node scripts/shots-v87.mjs  (vite no 8099)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
mkdirSync("shots-v87", { recursive: true });

// ── shim de localStorage ──
const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};
const { execFileSync } = await import("node:child_process");
execFileSync("npx", ["esbuild", "src/lib/esport.ts", "--bundle", "--format=esm", "--platform=neutral", "--outfile=.shots-v87-esport.mjs"], { stdio: "pipe" });
execFileSync("npx", ["esbuild", "src/lib/trofeus.ts", "--bundle", "--format=esm", "--platform=neutral", "--outfile=.shots-v87-trofeus.mjs"], { stdio: "pipe" });
const es = await import(new URL("../.shots-v87-esport.mjs", import.meta.url).href);
const tr = await import(new URL("../.shots-v87-trofeus.mjs", import.meta.url).href);

const b = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const campo = (mp) => {
  const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== mp);
  return ["eu", ...es.RIVAIS_IA].map((id, i) => ({ id, nome: id === "eu" ? "Eu" : es.RIVAIS_IA[i - 1], posicao: id === "eu" ? mp : resto[i - 1] }));
};
const A = Date.now();

// 1. campeonato com DUAS vitórias reais → eu CAMPEÃO
const tA = es.criarTorneio({ ...b, nome: "Copa das Lendas de Sexta" }, A);
es.inscreverTorneio(tA.t.id, "Eu", A + 1); es.iniciarTorneio(tA.t.id, A + 2);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 3);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 4);
es.expirarPendentes(A + 8 * 86_400_000);

// 2. campeonato da EMPRESA com eu em 2.º → pódio honesto (sem troféu)
const tB = es.criarTorneio({ ...b, nome: "Torneio TropiCola Grand Prix", organizadorEmpresa: true, empresaNome: "TropiCola MZ", empresaSector: "Bebidas" }, A + 10);
es.inscreverTorneio(tB.t.id, "Eu", A + 11); es.iniciarTorneio(tB.t.id, A + 12);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(3), vitoria: false, posicao: 3, total: 12, campo: campo(3) }, A + 13);
es.expirarPendentes(A + 9 * 86_400_000);

// 3. liga de xadrez → eu CAMPEÃO
const lA = es.criarLiga({ nome: "Liga de Xadrez do Bairro", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, A + 20);
es.inscreverLiga(lA.l.id, "Eu", A + 21);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, A + 22);
es.expirarPendentes(A + 15 * 86_400_000);

// 4. eliminatória ELIMINADA (partida antes de criar as outras ativas)
const eE = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa Eliminatória de Sexta" }, A + 40);
es.inscreverTorneio(eE.t.id, "Eu", A + 41); es.iniciarTorneio(eE.t.id, A + 42);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(5), vitoria: false, posicao: 5, total: 12, campo: campo(5) }, A + 43);

// 5. eliminatória CAMPEÃ (r1 2.º passa o corte → final 1.º)
const eC = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa Relâmpago do Sábado" }, A + 50);
es.inscreverTorneio(eC.t.id, "Eu", A + 51); es.iniciarTorneio(eC.t.id, A + 52);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(2), vitoria: false, posicao: 2, total: 12, campo: campo(2) }, A + 53);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campo(1) }, A + 54);

// 6. eliminatória ATIVA por ÚLTIMO (nenhuma partida depois dela)
const eA = es.criarTorneio({ ...b, formato: "eliminatoria", tamanho: 8, nome: "Copa Eliminatória em Curso" }, A + 60);
es.inscreverTorneio(eA.t.id, "Eu", A + 61); es.iniciarTorneio(eA.t.id, A + 62);

const resumo = tr.trofeusDoAparelho();
console.log(`núcleo: ${resumo.trofeus.length} troféus · ${resumo.podios} pódios · ${resumo.competicoes} competições`);
const ESTADO = MEMORIA.get("bateu_esport_v1");
const ids = { campeonato: tA.t.id, ativo: eA.t.id, eliminado: eE.t.id, campeao: eC.t.id };

// ── browser: capturas (desktop + mobile) ──
const SB = "https://ngxrdpplyghlugoowjqj.supabase.co";
const REF = new URL(SB).hostname.split(".")[0];
const UID = "87e2e000-0000-4000-8000-00000000e287";
const sessao = () => ({
  access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "ester87@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
});

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
async function capturar(url, espera, nome, largura = 1280, rolarAte = null) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: largura === 390 ? 844 : 900 }, locale: "pt-PT" });
  await ctx.route(`**${new URL(SB).host}/**`, (route) => {
    if (route.request().url().includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessao()) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await ctx.addInitScript(([ref, estado, uid, s]) => {
    if (estado) localStorage.setItem("bateu_esport_v1", estado);
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ ...s, user: { ...s.user, id: uid } }));
  }, [REF, ESTADO, UID, sessao()]);
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector(espera, { timeout: 45_000 });
  await pg.waitForTimeout(1200); // settle i18n
  if (rolarAte) {
    await pg.locator(rolarAte).scrollIntoViewIfNeeded();
    await pg.waitForTimeout(500);
  }
  await pg.screenshot({ path: `shots-v87/${nome}.png` });
  console.log(`✓ ${nome} ← ${url}`);
  await ctx.close();
}

await capturar("/profile", '[data-testid="perfil-trofeus-lista"]', "v87-perfil-trofeus", 1280, '[data-testid="perfil-trofeus"]');
await capturar(`/tournaments/${ids.campeao}`, '[data-testid="torneio-local-bracket"]', "v87-bracket-campeao");
await capturar(`/tournaments/${ids.ativo}`, '[data-testid="torneio-local-bracket"]', "v87-bracket-ativo");
await capturar(`/tournaments/${ids.eliminado}`, '[data-testid="torneio-local-bracket"]', "v87-bracket-eliminado");
await capturar("/profile", '[data-testid="perfil-trofeus-lista"]', "v87-perfil-trofeus-mobile", 390, '[data-testid="perfil-trofeus"]');

await browser.close();
console.log("shots-v87 OK");
