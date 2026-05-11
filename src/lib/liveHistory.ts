import type { LeaderEntry } from "@/components/livegames/LiveLeaderboard";

export type LiveSession = {
  code: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  activeGame?: string;
  winners: { name: string; meta?: string; at: number }[];
  leaderboard: LeaderEntry[];
};

const KEY = "liveHistory";

export const readHistory = (): LiveSession[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const writeHistory = (list: LiveSession[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); } catch { /* noop */ }
};

export const appendHistory = (s: LiveSession) => {
  const all = readHistory();
  writeHistory([s, ...all]);
};

export const clearHistory = () => {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
};

export const exportSessionsCSV = (sessions: LiveSession[]): string => {
  const header = "live_code,started_at,ended_at,duration_sec,active_game,player,score,game,played_at\n";
  const rows: string[] = [];
  sessions.forEach((s) => {
    if (s.leaderboard.length === 0) {
      rows.push([
        s.code, new Date(s.startedAt).toISOString(), new Date(s.endedAt).toISOString(),
        s.durationSec, s.activeGame || "", "", "", "", "",
      ].join(","));
    } else {
      s.leaderboard.forEach((e) => {
        rows.push([
          s.code,
          new Date(s.startedAt).toISOString(),
          new Date(s.endedAt).toISOString(),
          s.durationSec,
          s.activeGame || "",
          `"${(e.name || "").replace(/"/g, '""')}"`,
          e.score,
          `"${(e.game || "").replace(/"/g, '""')}"`,
          new Date(e.at).toISOString(),
        ].join(","));
      });
    }
  });
  return header + rows.join("\n");
};

export const downloadCSV = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/** Open a print-optimized window the user can save as PDF. */
export const printSessionsPDF = (sessions: LiveSession[]) => {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  const fmt = (n: number) => new Date(n).toLocaleString("pt-PT");
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Histórico de Lives — Bateu</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Inter,sans-serif;color:#0f172a;margin:32px;}
  h1{font-size:22px;margin:0 0 4px;}
  h2{font-size:15px;margin:24px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
  .meta{font-size:11px;color:#64748b;margin-bottom:12px;}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}
  th{background:#f1f5f9;}
  .badge{display:inline-block;padding:2px 8px;border-radius:9999px;background:#10b98120;color:#059669;font-size:10px;font-weight:600;}
  .winner{background:#fef9c3;}
  @media print{ button{display:none;} }
</style></head><body>
<h1>Histórico de Lives — Bateu</h1>
<div class="meta">Gerado em ${fmt(Date.now())} · ${sessions.length} live(s)</div>
<button onclick="window.print()" style="padding:8px 14px;border-radius:9999px;border:none;background:#10b981;color:white;font-weight:600;cursor:pointer;margin-bottom:16px;">Imprimir / Guardar como PDF</button>
${sessions.map((s) => `
  <h2>Live ${s.code} <span class="badge">${s.activeGame || "—"}</span></h2>
  <div class="meta">Início: ${fmt(s.startedAt)} · Fim: ${fmt(s.endedAt)} · Duração: ${Math.round(s.durationSec/60)} min</div>
  ${s.winners.length ? `<div class="meta"><strong>Vencedores:</strong> ${s.winners.map((w) => `${w.name}${w.meta ? ` (${w.meta})` : ""}`).join(" · ")}</div>` : ""}
  <table><thead><tr><th>#</th><th>Jogador</th><th>Jogo</th><th>Pontos</th><th>Hora</th></tr></thead>
  <tbody>${[...s.leaderboard].sort((a,b)=>b.score-a.score).map((e,i)=>`
    <tr class="${i===0?"winner":""}"><td>${i+1}</td><td>${e.name}</td><td>${e.game}</td><td>${e.score}</td><td>${fmt(e.at)}</td></tr>`).join("")}
  ${s.leaderboard.length===0?'<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Sem participantes</td></tr>':''}</tbody></table>
`).join("")}
</body></html>`;
  w.document.write(html);
  w.document.close();
};
