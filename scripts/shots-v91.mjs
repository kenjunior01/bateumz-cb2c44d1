// shots-v91 — capturas do «E-SPORT SEGUE A CONTA» (padrão v84-v90)
// 1. torneios-conta-sincronizado.png — lista com chip «Na conta» (dados REAIS do núcleo)
// 2. torneios-migracao.png — chip «Migração pendente» declarado (PGRST205)
// 3. detalhe-claim-linha.png — detalhe com linha honesta + prémio reclamado
// 4. ligas-conta.png — ligas com o chip (desktop)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const RAIZ = process.cwd();
const UID = "91e2e000-0000-4000-8000-00000000e291";
const SB = (() => {
  const l = readFileSync(".env", "utf-8").split("\n").find((x) => x.startsWith("VITE_SUPABASE_URL=")) || "";
  return (l.split("=")[1] || "https://ngxrdpplyghlugoowjqj.supabase.co").replace(/["']/g, "").trim();
})();
const REF = new URL(SB).hostname.split(".")[0];
mkdirSync("shots-v91", { recursive: true });

// NÚCLEO em Node — torneios com a FORMA REAL (mesma ordem segura da suíte)
const bundle = `${RAIZ}/.v91-shots-bundle.mjs`;
execFileSync("npx", ["esbuild", `${RAIZ}/src/lib/esportConta.ts`, "--bundle", "--format=esm", "--platform=neutral", `--outfile=${bundle}`], { stdio: "pipe" });
const E = await import(`${RAIZ}/src/lib/esport.ts`);
const AGORA = Date.now();
const INPUT_A = { nome: "Copa Maputo de Outono", jogo: "kart", formato: "campeonato", tamanho: 12, premioPontos: 500, pista: "praia", voltas: 3, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const INPUT_EMP = { nome: "Copa Galão Telecom", jogo: "kart", formato: "eliminatoria", tamanho: 8, premioPontos: 1200, pista: "deserto", voltas: 4, janelaDias: 5, organizadorEmpresa: true, empresaNome: "Galão Telecom", empresaSector: "Telecomunicações" };
const INPUT_LIGA = { nome: "Liga Tetris de Moçambique", jogo: "tetris", premioPontos: 400, janelaDias: 10, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };

const mkT = (input, ms, estado = "inscricao") => {
  const { t } = E.criarTorneio(input, ms);
  if (estado === "terminado") {
    t.estado = "terminado"; t.vencedorId = "eu";
    t.participantes = [{ id: "eu", nome: "Eu", pontos: 18, vitorias: 0, partidas: 1, eBot: false }];
    t.historico.push({ em: ms + 1000, texto: "Janela fechada — campeão: Eu" });
  }
  return t;
};
const tAtivo = mkT(INPUT_A, AGORA - 3600e3, "inscricao");
const tEmp = mkT(INPUT_EMP, AGORA - 1800e3, "inscricao");
const tFim = mkT(INPUT_A, AGORA - 86_400_000, "terminado");
const { l: liga } = E.criarLiga(INPUT_LIGA, AGORA - 7200e3);
const estadoConvidado = { torneios: [tAtivo, tEmp], ligas: [liga], ts: AGORA };
const estadoFim = { torneios: [tFim], ligas: [], ts: AGORA };

const sessao = () => ({
  access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "ester91@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
});

async function captura(nome, modo, { semente, pagina, largura = 1280, clicarClamar = false } = {}) {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 } });
  const page = await ctx.newPage();
  await ctx.route(`**${new URL(SB).host}/**`, (route) => {
    const url = route.request().url();
    if (url.includes("/rest/v1/esport_conta")) {
      const metodo = route.request().method();
      if (metodo === "GET" || metodo === "HEAD") {
        if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.esport_conta' in the schema cache", details: null, hint: null }) });
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      if (modo === "migracao") return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.esport_conta' in the schema cache", details: null, hint: null }) });
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessao()) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await ctx.addInitScript(([ref, sementeArg, comSessao]) => {
    for (const [k, v] of sementeArg) localStorage.setItem(k, v);
    if (comSessao) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
      user: { id: "91e2e000-0000-4000-8000-00000000e291", aud: "authenticated", role: "authenticated", email: "ester91@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    }));
  }, [REF, semente, modo !== "convidado"]);
  await page.goto(BASE + pagina, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (clicarClamar) {
    const botao = page.locator("[data-testid='torneio-local-clamar']");
    if (await botao.count()) {
      await botao.click();
      await page.waitForTimeout(1800);
    }
  }
  await page.screenshot({ path: `shots-v91/${nome}.png` });
  console.log(`📸 shots-v91/${nome}.png`);
  await browser.close();
}

await captura("torneios-conta-sincronizado", "ok", { semente: [["bateu_esport_v1", JSON.stringify(estadoConvidado)]], pagina: "/tournaments" });
await captura("torneios-migracao", "migracao", { semente: [["bateu_esport_v1", JSON.stringify(estadoConvidado)]], pagina: "/tournaments" });
await captura("detalhe-claim-linha", "ok", { semente: [["bateu_esport_v1", JSON.stringify(estadoFim)]], pagina: `/tournaments/${tFim.id}`, clicarClamar: true });
await captura("ligas-conta", "ok", { semente: [["bateu_esport_v1", JSON.stringify({ torneios: [], ligas: [liga], ts: AGORA })]], pagina: "/ligas" });
console.log("OK — 4 capturas");
