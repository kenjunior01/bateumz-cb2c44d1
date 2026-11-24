// probe-v85-mobile-registado — visual: variante BLOCO no MobileHomeApp (390px)
// com sessão fake (mesmo padrão do harness v84/v85). Só captura e reporta.
import { spawn } from "node:child_process";
import fs from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const SB_URL = process.env.VITE_SUPABASE_URL || "https://ngxrdpplyghlugoowjqj.supabase.co";
const SB_REF = new URL(SB_URL).hostname.split(".")[0];
const UID = "85e5e000-0000-4000-8000-00000000e285";
fs.mkdirSync("shots-v85", { recursive: true });

const sessaoFake = () => ({
  access_token: "e2e-fake", token_type: "bearer", expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: "e2e-fake",
  user: {
    id: UID, aud: "authenticated", role: "authenticated", email: "ester85@bateu.test",
    email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Ester" },
    identities: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
});

(async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: EXE || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await ctx.route(`**${new URL(SB_URL).host}/**`, async (route) => {
    const url = route.request().url();
    const metodo = route.request().method();
    if (url.includes("/rest/v1/progressao_conta")) {
      if (metodo === "GET" || metodo === "HEAD") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ user_id: UID, jogador_id: UID, pontos: 700, missoes_concluidas_total: 0, missoes: [] }]) });
      return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    }
    if (url.includes("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessaoFake()) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await ctx.addInitScript(([ref, sessao]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessao));
  }, [SB_REF, sessaoFake()]);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4500);
  const visivel = await page.locator("[data-testid='reten-bv-registado']").isVisible().catch(() => false);
  const barra = await page.locator("[data-testid='reten-barra']").isVisible().catch(() => false);
  console.log("registado bloco visível:", visivel, "· barra visível:", barra);
  if (visivel) await page.locator("[data-testid='reten-bv']").screenshot({ path: "shots-v85/mobile-bloco-registado.png" }).catch(() => {});
  await browser.close();
  process.exit(visivel ? 0 : 1);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
