import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Megaphone, Globe, Crown, Eye, MousePointerClick, Percent, Trash2,
  PauseCircle, PlayCircle, ShieldCheck, Search, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  PAISES_COFUNDADOR, PAIS_INFO, panoramaPaises, listarTodosAnuncios,
  agirAnuncio, type PaisCoFundador, type AnuncioRegional,
} from "@/lib/regionalBranding";
import { cn } from "@/lib/utils";

// ═══ ADMIN · ANÚNCIOS REGIONAIS — v72 ═════════════════════════
// O ÚNICO painel que atravessa países: vê os QUATRO países do
// lançamento (MZ · AO · BR · PT), as identidades visuais que os
// co-fundadores aplicaram e TODOS os anúncios publicados — com
// poder de pausar/reativar/remover EM QUALQUER país (o
// co-fundador só mexe no SEU).
// Fonte honesta: a mesma do aparelho (bateu_regional_v72) —
// nada finge backend.

type FiltroPais = "todos" | PaisCoFundador;

export default function AdminAds() {
  const { role, loading: authLoading } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [panorama, setPanorama] = useState<ReturnType<typeof panoramaPaises>>([]);
  const [anuncios, setAnuncios] = useState<AnuncioRegional[]>([]);
  const [filtro, setFiltro] = useState<FiltroPais>("todos");
  const [busca, setBusca] = useState("");

  const recarregar = useCallback(() => {
    setPanorama(panoramaPaises());
    setAnuncios(listarTodosAnuncios());
    setCarregando(false);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const filtrados = useMemo(() => anuncios.filter((a) =>
    (filtro === "todos" || a.pais === filtro) &&
    (busca.trim() === "" || (a.titulo + a.texto + a.criadoPor).toLowerCase().includes(busca.toLowerCase()))
  ), [anuncios, filtro, busca]);

  const agir = (a: AnuncioRegional, acao: "pausar" | "reativar" | "remover") => {
    const r = agirAnuncio(a.id, acao, "TODOS");
    if (!r) { toast.error("Não foi possível agir sobre o anúncio."); return; }
    toast.success(acao === "remover" ? "Anúncio removido." : acao === "pausar" ? "Anúncio pausado." : "Anúncio reativado.");
    recarregar();
  };

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (role && role !== "admin" && role !== "superadmin") return <Navigate to="/admin" replace />;

  const totais = panorama.reduce((s, p) => ({
    anuncios: s.anuncios + p.stats.anuncios,
    impressoes: s.impressoes + p.stats.impressoes,
    cliques: s.cliques + p.stats.cliques,
    ativos: s.ativos + p.stats.ativos,
  }), { anuncios: 0, impressoes: 0, cliques: 0, ativos: 0 });

  return (
    <motion.div className="space-y-6 max-w-6xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Anúncios Regionais · Visão Total</h1>
          <p className="text-sm text-muted-foreground">
            Os co-fundadores gerem MZ · AO · BR · PT de forma independente — <strong className="text-foreground">tu vês e controlas TUDO</strong>.
          </p>
        </div>
      </div>

      {/* KPIs globais dos 4 países */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Anúncios totais", value: totais.anuncios, icon: Megaphone },
          { label: "Ativos agora", value: totais.ativos, icon: ShieldCheck },
          { label: "Impressões", value: totais.impressoes, icon: Eye },
          { label: "Cliques", value: totais.cliques, icon: MousePointerClick },
        ].map((k) => (
          <Card key={k.label} className="shadow-[0_0_15px_hsl(var(--primary)/0.12)]">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground"><k.icon className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase tracking-wide">{k.label}</span></div>
              <p className="text-2xl font-bold mt-1" data-testid={`admin-kpi-${k.label.toLowerCase().replace(/[^a-z]/g, "")}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Panorama dos QUATRO países de lançamento */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4" /> Co-fundadores de lançamento · identidade visual</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            {panorama.map((p) => (
              <div key={p.pais} className="rounded-xl border border-border bg-card/40 p-3 space-y-2" data-testid={`panorama-${p.pais}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{PAIS_INFO[p.pais].bandeira}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{p.identidade.nomeTema}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.identidade.slogan}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[p.identidade.corPrimaria, p.identidade.corSecundaria, p.identidade.corAcento].map((c, i) => (
                    <span key={i} className="h-5 w-8 rounded-md border border-border" style={{ background: c }} title={c} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{p.stats.anuncios} anúncios · {p.stats.ativos} ativos</span>
                  <span>{p.stats.impressoes > 0 ? `${((p.stats.cliques / p.stats.impressoes) * 100).toFixed(1)}% CTR` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(["todos", ...PAISES_COFUNDADOR] as FiltroPais[]).map((p) => (
            <button
              key={p}
              onClick={() => setFiltro(p)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold border transition-colors",
                filtro === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
              )}
              data-testid={`filtro-${p}`}
            >
              {p === "todos" ? "🌍 Todos" : `${PAIS_INFO[p].bandeira} ${p}`}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar anúncio…" className="pl-8 h-9 text-xs" />
        </div>
      </div>

      {/* Tabela de TODOS os anúncios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Todos os anúncios ({filtrados.length})</span>
            <Badge variant="secondary" className="text-[10px]"><Percent className="h-3 w-3 mr-1" /> {totais.impressoes > 0 ? `${((totais.cliques / totais.impressoes) * 100).toFixed(1)}% CTR global` : "CTR —"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum anúncio {filtro !== "todos" ? `de ${PAIS_INFO[filtro as PaisCoFundador].nome}` : "em nenhum país"} ainda.
              Os co-fundadores publicam a partir do painel regional (aba «Anúncios»).
            </p>
          ) : (
            <div className="space-y-2">
              {filtrados.map((a) => (
                <div key={a.id} className="grid gap-3 md:grid-cols-[auto_1fr_auto_auto] items-center p-3 rounded-lg border border-border bg-card/40" data-testid={`admin-anuncio-${a.id}`}>
                  <span className={`inline-block h-9 w-9 rounded-lg bg-gradient-to-br ${a.gradiente} shrink-0`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{a.titulo}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{PAIS_INFO[a.pais].bandeira} {a.pais}</Badge>
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0", a.estado === "ativo" ? "bg-emerald-500/15 text-emerald-600" : "")}>{a.estado}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{a.texto}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {a.tipo} · {a.ctaUrl} · por {a.criadoPor} · {new Date(a.criadoEm).toLocaleDateString("pt-MZ")} ·
                      <Eye className="h-3 w-3 inline mx-1" />{a.impressoes}
                      <MousePointerClick className="h-3 w-3 inline mx-1" />{a.cliques}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold">{a.impressoes > 0 ? `${((a.cliques / a.impressoes) * 100).toFixed(1)}%` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">CTR</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => agir(a, a.estado === "ativo" ? "pausar" : "reativar")} title={a.estado === "ativo" ? "Pausar" : "Reativar"}>
                      {a.estado === "ativo" ? <PauseCircle className="h-4 w-4 text-amber-500" /> : <PlayCircle className="h-4 w-4 text-emerald-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => agir(a, "remover")} title="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
