// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v25 — Hub de Jogos Grátis (/jogos-gratis)
//
// Benchmark: Epic Games Store (descoberta F2P), Steam (filtros/ordenação),
// Mobbin (cartões de catálogo limpos). Fonte 100% real: FreeToGame
// (public-apis) — sem dados inventados; o jogo abre sempre no site oficial
// em nova aba, com atribuição visível.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Search,
  WifiOff,
  RefreshCw,
  ExternalLink,
  Monitor,
  Globe,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import {
  FREE_GAMES_ATTRIBUTION,
  availableGenres,
  filterFreeGames,
  getFreeGames,
  releaseYear,
  type FreeGame,
  type FreePlatformFilter,
  type FreeSort,
} from "@/lib/freeGames";

const PLATFORMS: Array<{ id: FreePlatformFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "pc", label: "PC" },
  { id: "browser", label: "Browser" },
];

const SORTS: Array<{ id: FreeSort; label: string }> = [
  { id: "popularity", label: "Populares" },
  { id: "alpha", label: "A–Z" },
  { id: "release", label: "Recentes" },
];

export default function FreeGamesHub() {
  useSEO({
    title: "Jogos Grátis — Bateu",
    description:
      "Catálogo real de jogos free-to-play para PC e browser: filtra por género e plataforma, descobre e joga na hora. Dados © FreeToGame.",
    canonicalPath: "/jogos-gratis",
    keywords: ["jogos grátis", "free to play", "PC", "browser", "Bateu"],
  });

  const [games, setGames] = useState<FreeGame[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<FreePlatformFilter>("all");
  const [genre, setGenre] = useState<string>("");
  const [sort, setSort] = useState<FreeSort>("popularity");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<FreeGame | null>(null);

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFreeGames({ fresh });
      setGames(data);
      if (data.length === 0) setError("A fonte não devolveu jogos agora. Tenta novamente em instantes.");
    } catch {
      setError("Não foi possível carregar o catálogo. Verifica a ligação e tenta de novo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const genres = useMemo(() => (games ? availableGenres(games).slice(0, 10) : []), [games]);
  const visible = useMemo(
    () => (games ? filterFreeGames(games, { platform, genre, query, sort }) : []),
    [games, platform, genre, query, sort],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pt-24 lg:pt-32 pb-16">
        {/* Cabeçalho */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Jogos Grátis</h1>
              <p className="text-xs text-muted-foreground">
                Catálogo real de jogos free-to-play · {FREE_GAMES_ATTRIBUTION}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Busca + atualizar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, editor ou género…"
              className="pl-9"
              data-testid="freegames-search"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={() => load(true)} data-testid="freegames-refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        {/* Plataforma + ordenação */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="freegames-platform">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border " +
                  (p.id === platform
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 ml-auto" data-testid="freegames-sort">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors " +
                  (s.id === sort ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Géneros (derivados do catálogo real) */}
        {!loading && genres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none" data-testid="freegames-genres">
            <button
              onClick={() => setGenre("")}
              className={
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors " +
                (genre === ""
                  ? "bg-secondary text-foreground border-secondary"
                  : "text-muted-foreground border-transparent hover:bg-secondary/60")
              }
            >
              Todos os géneros
            </button>
            {genres.map((g) => (
              <button
                key={g.genre}
                onClick={() => setGenre(g.genre === genre ? "" : g.genre)}
                className={
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors " +
                  (g.genre === genre
                    ? "bg-secondary text-foreground border-secondary"
                    : "text-muted-foreground border-transparent hover:bg-secondary/60")
                }
              >
                {g.genre} <span className="opacity-50">({g.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Conteúdo */}
        {error ? (
          <ErrorState message={error} onRetry={() => load(true)} />
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border overflow-hidden">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState message="Nenhum jogo corresponde à busca ou filtros. Limpa um filtro e tenta de novo." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="freegames-grid">
            {visible.map((g) => (
              <GameCard key={g.id} game={g} onOpen={() => setDetail(g)} />
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-8">
          {FREE_GAMES_ATTRIBUTION} · Os jogos abrem no site oficial em nova aba.
        </p>
      </div>

      {/* Detalhes do jogo */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden" data-testid="freegames-detail">
          {detail && (
            <>
              <img src={detail.thumbnail} alt={detail.title} className="aspect-video w-full object-cover" loading="lazy" />
              <div className="p-4 pt-3">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-lg">{detail.title}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {detail.genre} · {detail.platform} · {releaseYear(detail)}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mt-2">{detail.short_description}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5">
                    <span className="block text-muted-foreground">Editor</span>
                    <span className="font-medium truncate block">{detail.publisher}</span>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-2.5 py-1.5">
                    <span className="block text-muted-foreground">Estúdio</span>
                    <span className="font-medium truncate block">{detail.developer}</span>
                  </div>
                </div>
                <a href={detail.game_url} target="_blank" rel="noopener noreferrer" className="block" data-testid="freegames-play">
                  <Button className="w-full mt-4 gap-2">
                    <ExternalLink className="h-4 w-4" /> Jogar no site oficial
                  </Button>
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function GameCard({ game, onOpen }: { game: FreeGame; onOpen: () => void }) {
  const isBrowser = /browser/i.test(game.platform);
  return (
    <button
      onClick={onOpen}
      className="group rounded-xl border overflow-hidden text-left bg-card hover:bg-secondary/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={`game-card-${game.id}`}
    >
      <div className="relative">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
        <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1">
          {isBrowser ? <Globe className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
          {isBrowser ? "Browser" : "PC"}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold leading-snug line-clamp-1 group-hover:underline underline-offset-2">
          {game.title}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
          <span className="truncate">{game.genre}</span>
          <span className="tabular-nums">{releaseYear(game)}</span>
        </p>
      </div>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} data-testid="freegames-retry">
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </Button>
    </div>
  );
}
