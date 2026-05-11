import { useMemo, useState } from "react";
import { Download, Trash2, Users, Trophy, Sliders, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import { LeaderEntry } from "./LiveLeaderboard";
import { buildOverlayUrl, getPublicBaseUrl, isOnPublicDomain } from "@/lib/publicUrl";

interface Props {
  liveCode: string;
  entries: LeaderEntry[];
  onClear: () => void;
  onResetConfig: () => void;
}

const LiveControlPanel = ({ liveCode, entries, onClear, onResetConfig }: Props) => {
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const players = new Set(entries.map((e) => e.name));
    const games = new Set(entries.map((e) => e.game));
    const top = [...entries].sort((a, b) => b.score - a.score)[0];
    return { players: players.size, games: games.size, plays: entries.length, top };
  }, [entries]);

  const exportCSV = () => {
    const header = "name,score,game,timestamp\n";
    const rows = entries.map((e) => `"${e.name}",${e.score},"${e.game}",${new Date(e.at).toISOString()}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `live-${liveCode}-participants.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const copyOverlay = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/lives/overlay?code=${liveCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/5 border-b border-border flex items-center gap-2">
        <Sliders className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold">Painel de Controle da Live</h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Users, label: "Jogadores", value: stats.players },
            { icon: Trophy, label: "Jogadas", value: stats.plays },
            { icon: Sliders, label: "Jogos", value: stats.games },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/50 p-3 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {stats.top && (
          <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 p-3 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Líder atual</p>
              <p className="text-sm font-bold truncate">{stats.top.name} — {stats.top.score} pts</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <a
            href={`/lives/overlay?code=${liveCode}`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
          >
            <span className="inline-flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Abrir Overlay (OBS)</span>
          </a>
          <button onClick={copyOverlay} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-full bg-secondary text-foreground text-xs font-medium">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar URL do overlay
          </button>
          <button onClick={exportCSV} disabled={!entries.length} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-full bg-secondary text-foreground text-xs font-medium disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Exportar participantes (CSV)
          </button>
          <div className="flex gap-2">
            <button onClick={onClear} className="flex-1 px-3 py-2 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium inline-flex items-center justify-center gap-1.5">
              <Trash2 className="h-3 w-3" /> Limpar leaderboard
            </button>
            <button onClick={onResetConfig} className="flex-1 px-3 py-2 rounded-full bg-secondary text-foreground text-[11px] font-medium">
              Repor configurações
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Cole o URL do overlay como <strong>Browser Source</strong> no OBS / Streamlabs (1280×720, transparente).
        </p>
      </div>
    </div>
  );
};

export default LiveControlPanel;
