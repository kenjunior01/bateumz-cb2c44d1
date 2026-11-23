// probe-v84-b2.mjs — porque é que o ficheiro de convidado não fica limpo?
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const UID = "84e2e000-0000-4000-8000-00000000e284";
const SB_REF = (() => {
  const l = readFileSync(".env", "utf-8").split("\n").find((x) => x.startsWith("VITE_SUPABASE_URL=")) || "";
  return (l.split("=")[1] || "https://ngxrdpplyghlugoowjqj.supabase.co").replace(/["']/g, "").trim();
})();
const REF = new URL(SB_REF).hostname.split(".")[0];

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "log" && m.text().includes("PROBE")) console.log("BROWSER:", m.text()); });

const missao = { id: "g-kart", modelo: "joga-kart", titulo: "Joga BATEU KART 1 vez", jogoId: "kart", jogosDistintos: 0, alvo: 1, progresso: 1, pontos: 100, criadaEm: Date.now() - 60e3, terminaEm: (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); })(), reclamada: false };
const guest = JSON.stringify({ versao: 1, jogadorId: "", pontos: 120, corridas: 0, diaContador: "", jogosHoje: [], vitoriasHoje: 0, missoes: [missao], missoesConcluidasTotal: 0, ultimaAtividade: Date.now() - 60e3 });
const sessao = {
  access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake-r",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "e@t.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
};

await ctx.route(`**${new URL(SB_REF).host}/**`, (route) => {
  const url = route.request().url();
  if (url.includes("/rest/v1/progressao_conta")) {
    console.log("PROBE req:", route.request().method(), url.slice(url.indexOf("rest"), url.indexOf("rest") + 70));
    return route.fulfill({ status: route.request().method() === "GET" ? 200 : 201, contentType: "application/json", body: "[]" });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
});

await ctx.addInitScript(([ref, g, s]) => {
  const original = Storage.prototype.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => {
    if (k.startsWith("bateu_progressao")) {
      try {
        const p = JSON.parse(v);
        console.log("PROBE setItem", k, "pontos=" + p.pontos, "missoes=" + (p.missoes || []).length, "stack=" + new Error().stack.split("\n").slice(2, 5).join(" <- "));
      } catch { console.log("PROBE setItem", k, "(podre)"); }
    }
    original(k, v);
  };
  const originalRemove = Storage.prototype.removeItem.bind(localStorage);
  localStorage.removeItem = (k) => {
    if (k.startsWith("bateu_progressao")) console.log("PROBE removeItem", k, "stack=" + new Error().stack.split("\n").slice(2, 4).join(" <- "));
    originalRemove(k);
  };
  localStorage.setItem("bateu_progressao_v78", g);
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
}, [REF, guest, sessao]);

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
for (const t of [500, 1500, 3000, 5000]) {
  await page.waitForTimeout(t === 500 ? 500 : t - (t === 1500 ? 500 : t === 3000 ? 1500 : 3000));
  const dump = await page.evaluate(() => {
    const conv = localStorage.getItem("bateu_progressao_v78");
    const conta = localStorage.getItem("bateu_progressao_v78:u:" + "84e2e000-0000-4000-8000-00000000e284");
    return {
      conv: conv ? { pontos: JSON.parse(conv).pontos, missoes: JSON.parse(conv).missoes?.length, jogadorId: JSON.parse(conv).jogadorId } : null,
      conta: conta ? { pontos: JSON.parse(conta).pontos, missoes: JSON.parse(conta).missoes?.length } : null,
      chip: document.querySelector("[data-testid='reten-sinc']")?.getAttribute("data-sinc") ?? "ausente",
    };
  });
  console.log(`t≈${t}ms`, JSON.stringify(dump));
}
await browser.close();
