import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on("console", (m) => { if (m.type() === "error" && m.text().includes("429")) errs.push(m.text().slice(0, 120)); });
await p.goto("http://localhost:8099/negocios", { waitUntil: "domcontentloaded" });
for (const t of [5, 10, 15, 20]) {
  await p.waitForTimeout(5000);
  const txt = await p.locator("body").textContent().catch(() => "");
  console.log(`${t}s: len=${(txt || "").length} hero=${/Transforme a sua audiência/i.test(txt || "")} loading=${/Iniciando o motor/i.test(txt || "")}`);
}
console.log("429s:", errs.length);
await b.close();
