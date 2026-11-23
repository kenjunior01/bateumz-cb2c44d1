// shots-v84 — capturas do «O PROGRESSO SEGUE A CONTA»
// 1. registado sincronizado (chip «Na conta» + linha honesta)
// 2. migração pendente (chip CloudOff declarado)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const UID = "84e2e000-0000-4000-8000-00000000e284";
const SB = (() => {
  const l = readFileSync(".env", "utf-8").split("\n").find((x) => x.startsWith("VITE_SUPABASE_URL=")) || "";
  return (l.split("=")[1] || "https://ngxrdpplyghlugoowjqj.supabase.co").replace(/["']/g, "").trim();
})();
const REF = new URL(SB).hostname.split(".")[0];
mkdirSync("shots-v84", { recursive: true });

const sessao = () => ({
  access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "ester84@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
});
const missao = { id: "g-kart", modelo: "joga-kart", titulo: "Joga BATEU KART 1 vez", jogoId: "kart", jogosDistintos: 0, alvo: 1, progresso: 1, pontos: 100, criadaEm: Date.now() - 60e3, terminaEm: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })(), reclamada: false };

async function captura(nome, modo) {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await ctx.route(`**${new URL(SB).host}/**`, (route) => {
    const url = route.request().url();
    if (url.includes("/rest/v1/progressao_conta") && modo === "migracao") {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST205", message: "Could not find the table 'public.progressao_conta' in the schema cache", details: null, hint: null }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await ctx.addInitScript(([ref, s]) => {
    localStorage.setItem("bateu_progressao_v78", JSON.stringify({ versao: 1, jogadorId: "", pontos: 12450, corridas: 0, diaContador: "", jogosHoje: [], vitoriasHoje: 0, missoes: [JSON.parse(s.missao)], missoesConcluidasTotal: 3, ultimaAtividade: Date.now() - 60e3 }));
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s.s));
  }, [REF, { s: sessao(), missao: JSON.stringify(missao) }]);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const chip = await page.locator("[data-testid='reten-sinc']").getAttribute("data-sinc").catch(() => "ausente");
  console.log(`${nome}: chip=${chip}`);
  await page.locator("[data-testid='reten-bv-registado']").scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots-v84/${nome}.png` });
  await browser.close();
}

await captura("v84-home-sincronizado", "ok");
await captura("v84-home-migracao", "migracao");
console.log("shots-v84 OK");
