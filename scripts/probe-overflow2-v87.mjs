// probe 2: identificar os elementos exatos que transbordam (com caminho de ancestrais)
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const SB = (readFileSync("/home/z/my-project/bateumz-cb2c44d1/.env", "utf-8").split("\n").find((x) => x.startsWith("VITE_SUPABASE_URL=")) || "").split("=")[1]?.replace(/["']/g, "").trim() || "https://ngxrdpplyghlugoowjqj.supabase.co";
const REF = new URL(SB).hostname.split(".")[0];
const UID = "87e2e000-0000-4000-8000-00000000e287";
const sessao = { access_token: "x", token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "r", user: { id: UID, aud: "authenticated", role: "authenticated", email: "ester87@bateu.test", app_metadata: { provider: "email" }, user_metadata: { display_name: "Ester" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(`**${new URL(SB).host}/**`, (route) => {
  if (route.request().url().includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessao) });
  return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
});
await ctx.addInitScript(([ref, uid, sessaoArg]) => {
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessaoArg));
  localStorage.setItem("bateu_esport_v1", JSON.stringify({ torneios: [], ligas: [], ts: 0 }));
}, [REF, UID, sessao]);
const pg = await ctx.newPage();
await pg.goto("http://localhost:8099/profile", { waitUntil: "domcontentloaded" });
await pg.waitForSelector('[data-testid="perfil-trofeus"]', { timeout: 45_000 });
await pg.waitForTimeout(1500);
const info = await pg.evaluate(() => {
  const cw = document.documentElement.clientWidth;
  const caminho = (el) => {
    const partes = [];
    let x = el;
    for (let i = 0; i < 4 && x && x !== document.body; i++) {
      const dt = x.getAttribute && x.getAttribute("data-testid");
      partes.push(`${x.tagName}${dt ? `[${dt}]` : ""}.${String(x.className).slice(0, 50)}`);
      x = x.parentElement;
    }
    return partes.join(" ← ");
  };
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > cw + 1 && r.width > 0) out.push({ desc: caminho(el), right: Math.round(r.right), w: Math.round(r.width) });
  }
  return { cw, sw: document.documentElement.scrollWidth, out: out.slice(0, 8) };
});
for (const o of info.out) console.log(`right=${o.right} w=${o.w} | ${o.desc}`);
console.log("sw =", info.sw, "· cw =", info.cw);
await browser.close();
