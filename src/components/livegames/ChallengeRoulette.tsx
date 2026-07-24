import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Plus, Trash2, Save, Sparkles, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "cantar", label: "Cantar", emoji: "🎤" },
  { id: "dancar", label: "Dançar", emoji: "💃" },
  { id: "imitar", label: "Imitar", emoji: "🎭" },
  { id: "falar", label: "Falar", emoji: "🗣️" },
  { id: "fisico", label: "Físico", emoji: "💪" },
  { id: "engracado", label: "Engraçado", emoji: "😂" },
  { id: "verdade", label: "Verdade", emoji: "🤫" },
  { id: "ousado", label: "Ousado", emoji: "😈" },
];

const COLORS = [
  "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#ef4444", "#06b6d4", "#f97316",
  "#a855f7", "#14b8a6", "#e11d48", "#84cc16",
];

interface Segment {
  id: string;
  challenge_text: string;
  category: string;
  color: string;
  segment_number: number;
}

const ChallengeRoulette = () => {
  const { user } = useAuth();
  const [roulettes, setRoulettes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [newChallenge, setNewChallenge] = useState({ text: "", category: "engracado" });
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load saved roulettes
  useEffect(() => {
    if (!user) return;
    supabase
      .from("challenge_roulettes")
      .select("*")
      .eq("business_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRoulettes(data || []));
  }, [user]);

  // Load segments for selected roulette
  useEffect(() => {
    if (!selectedId) return;
    supabase
      .from("challenge_roulette_segments")
      .select("*")
      .eq("roulette_id", selectedId)
      .order("segment_number")
      .then(({ data }) => setSegments((data || []) as Segment[]));
  }, [selectedId]);

  // Draw wheel
  useEffect(() => {
    if (!canvasRef.current || segments.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;
    const segCount = segments.length;
    const arc = (2 * Math.PI) / segCount;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    segments.forEach((seg, i) => {
      const startAngle = i * arc - Math.PI / 2;
      const endAngle = startAngle + arc;

n      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.min(14, 200 / segCount)}px sans-serif`;
      const maxLen = 20;
      const txt = seg.challenge_text.length > maxLen ? seg.challenge_text.slice(0, maxLen) + "..." : seg.challenge_text;
      ctx.fillText(txt, r - 12, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 12, 0);
    ctx.lineTo(cx + 12, 0);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.restore();
  }, [segments, rotation]);

  const handleAddSegment = async () => {
    if (!selectedId || !newChallenge.text.trim()) return;
    const seg: Partial<Segment> = {
      roulette_id: selectedId,
      challenge_text: newChallenge.text.trim(),
      category: newChallenge.category,
      color: COLORS[segments.length % COLORS.length],
      segment_number: segments.length,
    };
    const { data } = await supabase.from("challenge_roulette_segments").insert(seg).select().single();
    if (data) {
      setSegments((prev) => [...prev, data as Segment]);
      setNewChallenge({ text: "", category: "engracado" });
    }
  };

  const handleRemoveSegment = async (seg: Segment) => {
    await supabase.from("challenge_roulette_segments").delete().eq("id", seg.id);
    setSegments((prev) => prev.filter((s) => s.id !== seg.id).map((s, i) => ({ ...s, segment_number: i })));
  };

  const handleCreate = async () => {
    if (!user) return;
    const { data } = await supabase.from("challenge_roulettes").insert({ business_user_id: user.id }).select().single();
    if (data) {
      setRoulettes((prev) => [data, ...prev]);
      setSelectedId(data.id);
      toast.success("Roleta criada! Adicione desafios.");
    }
  };

  const handlePublish = async () => {
    if (!selectedId) return;
    await supabase.from("challenge_roulettes").update({ is_published: true }).eq("id", selectedId);
    setRoulettes((prev) => prev.map((r) => (r.id === selectedId ? { ...r, is_published: true } : r)));
    toast.success("Roleta publicada!");
  };

  const spin = () => {
    if (spinning || segments.length < 2) return;
    setSpinning(true);
    setResult(null);
    const totalRotation = 360 * 5 + Math.random() * 360;
    const duration = 5000;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(eased * totalRotation);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const segAngle = 360 / segments.length;
        const normalizedAngle = ((360 - (totalRotation % 360)) % 360 + 360) % 360;
        const idx = Math.floor(normalizedAngle / segAngle) % segments.length;
        setResult(segments[idx]);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        toast.success(`🎯 Desafio: ${segments[idx].challenge_text}`);
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="space-y-4">
      {!selectedId && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <RotateCcw className="h-12 w-12 mx-auto text-primary/30 mb-3" />
            <h3 className="font-bold text-lg mb-1">Roleta de Desafios</h3>
            <p className="text-xs text-muted-foreground mb-4">Adicione desafios engraçados e gire a roleta ao vivo!</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button onClick={handleCreate} className="rounded-full gap-1.5">
                <Plus className="h-4 w-4" /> Nova Roleta
              </Button>
              {roulettes.length > 0 && (
                <div className="flex gap-1.5">
                  {roulettes.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        r.is_published ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {r.is_published ? "✓" : ""} {r.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedId && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Wheel */}
          <Card>
            <CardContent className="flex flex-col items-center py-6">
              <canvas ref={canvasRef} width={320} height={320} className="max-w-full" />
              <Button
n                onClick={spin}
                disabled={spinning || segments.length < 2}
                className="mt-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-1.5 px-6"
              >
                {spinning ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Play className="h-4 w-4" />}
                {spinning ? "Girando..." : "Girar Roleta!"}
              </Button>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center p-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30"
                >
                  <p className="text-[10px] text-muted-foreground uppercase">Desafio sorteado</p>
                  <p className="text-base font-extrabold">🎯 {result.challenge_text}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Manage segments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">Desafios ({segments.length})</h4>
              <Button variant="outline" size="sm" onClick={() => setSelectedId(null)} className="text-[10px] rounded-full">
                Voltar
              </Button>
            </div>

            {/* Add challenge */
            <div className="flex gap-1.5">
              <Input
                value={newChallenge.text}
                onChange={(e) => setNewChallenge({ ...newChallenge, text: e.target.value })}
                placeholder="Desafio..."
                className="flex-1 h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddSegment()}
              />
              <select
                value={newChallenge.category}
                onChange={(e) => setNewChallenge({ ...newChallenge, category: e.target.value })}
                className="h-9 text-xs rounded-lg border border-border bg-background px-2"
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <Button onClick={handleAddSegment} size="sm" className="h-9 rounded-lg gap-0.5">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Segment list */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {segments.map((seg) => (
                <div key={seg.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border group">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="flex-1 text-xs truncate">{seg.challenge_text}</span>
                  <button onClick={() => handleRemoveSegment(seg)} className="opacity-0 group-hover:opacity-100 p-0.5">
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            {segments.length >= 2 && (
              <Button onClick={handlePublish} className="w-full rounded-xl gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Save className="h-4 w-4" /> Publicar Roleta
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeRoulette;
