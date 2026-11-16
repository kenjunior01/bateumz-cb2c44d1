// Experimento controlado: spawn DETACHED de «npx vite» → esperar 200 →
// matar o GRUPO → a porta tem de ficar livre. Prova (ou refuta) o group-kill.
import { spawn, spawnSync } from "node:child_process";

const filhos = [];
function correr(cmd, args) {
  const p = spawn(cmd, args, { cwd: "/home/z/my-project/bateumz-cb2c44d1", env: process.env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  filhos.push(p);
  return p;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function livre(porta) {
  try { const r = await fetch(`http://127.0.0.1:${porta}/`); return r.status >= 200 && r.status < 500 ? "OCUPADA" : "livre"; }
  catch { return "livre"; }
}

const p = correr("npx", ["vite", "--port", "8098", "--strictPort"]);
let noAr = false;
for (let i = 0; i < 60; i++) {
  const r = await livre(8098).catch(() => "livre");
  if (r === "OCUPADA") { noAr = true; break; }
  await sleep(500);
}
console.log("vite no ar:", noAr);
console.log("ps árvore do grupo", p.pid, ":");
spawnSync("sh", ["-c", `ps -o pid,pgid,cmd --ppid -1 | rg "8098|${p.pid}" | head -8`], { stdio: "inherit" });

// matar o GRUPO inteiro
try { process.kill(-p.pid, "SIGKILL"); console.log("kill(-pgid) OK"); } catch (e) { console.log("kill(-pgid) falhou:", e.message); }
try { p.kill("SIGKILL"); } catch {}
await sleep(1500);
console.log("porta 8098 depois:", await livre(8098));
const resta = spawnSync("sh", ["-c", `ps aux | rg "8098" | rg -v rg | head -5`], { stdio: "inherit" });
process.exit(resta.stdout && String(resta.stdout).includes("vite") ? 1 : 0);
