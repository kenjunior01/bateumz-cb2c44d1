// Probe do quiz da praça — porque é que getLadderQuestions(2) falhou no E2E?
import { chromium } from "playwright";

const BASE = "http://localhost:8099";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage();
  const reqs = [];
  page.on("request", (r) => { if (r.url().includes("opentdb")) reqs.push("REQ " + r.url()); });
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 200)); });
  page.on("pageerror", (e) => console.log("PAGE-ERR:", String(e).slice(0, 300)));

  await page.route(/opentdb\.com\//, (route) => {
    const url = route.request().url();
    console.log("MOCK HIT:", url);
    if (url.includes("api_token.php")) return route.fulfill({ json: { response_code: 0, token: "tok-v34" } });
    if (url.includes("api.php")) {
      const u = new URL(url);
      const diff = u.searchParams.get("difficulty") ?? "easy";
      const n = parseInt(u.searchParams.get("amount") ?? "0", 10);
      return route.fulfill({ json: { response_code: 0, results: Array.from({ length: n || 2 }, (_, i) => ({
        category: "General Knowledge", type: "multiple", difficulty: diff,
        question: `Pergunta ${diff} ${i + 1}?`,
        correct_answer: `Correta ${diff} ${i + 1}`,
        incorrect_answers: [`Errada A${i + 1}`, `Errada B${i + 1}`, `Errada C${i + 1}`],
      })) } });
    }
    return route.fulfill({ json: { response_code: 1, results: [] } });
  });

  await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
  const r = await page.evaluate(async () => {
    const m = await import("/src/lib/openTriviaDB.ts");
    try {
      const ladder = await m.getLadderQuestions(2);
      return { ok: true, n: ladder.length, ordem: ladder.map((q) => q.difficulty).join(","), amostra: ladder[0]?.text ?? "" };
    } catch (e) {
      return { ok: false, erro: String(e) };
    }
  });
  console.log("RESULTADO:", JSON.stringify(r, null, 2));
  console.log("PEDIDOS:", reqs.length ? reqs.join("\n  ") : "(nenhum)");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
