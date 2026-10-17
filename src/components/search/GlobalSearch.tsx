// ═══════════════════════════════════════════════════════════════
//  BUSCA GLOBAL ⌘K — um só atalho encontra TUDO da plataforma:
//  jogos clássicos, MMO, leilões ao vivo, esports, sorteios,
//  concursos, negócios e páginas.
//
//  Padrão REA (Reverse Engineer Anything): comportamento dos
//  líderes do nicho (busca instantânea de plataformas de jogos +
//  paleta de comandos estilo Discord) reconstruído do zero sobre
//  cmdk — sem copiar código nem assets de ninguém.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import { ALL_GAMES, normalize } from "@/lib/gamesCatalog";
import { listLeiloes, subscribeLeiloes, tempoRestante } from "@/lib/leiloes";
import {
  Gamepad2, Gavel, Trophy, Ticket, Store, Globe, Home, Swords, Radio,
  History, HandCoins, KeyRound, Newspaper, HelpCircle, Wallet, User,
  Sparkles, Users, Crown, Play,
} from "lucide-react";

const EVENT_ABRIR = "bateu:abrir-busca";
const KEY_RECENTE = "bateu:busca-recente-v1";

/** Abre a paleta de busca global a partir de qualquer canto da app. */
export function abrirBuscaGlobal() {
  window.dispatchEvent(new CustomEvent(EVENT_ABRIR));
}

interface SearchEntry {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: any;
  route: string;
  keywords?: string;
  badge?: string;
}

const PAGINAS: SearchEntry[] = [
  { id: "pg-home", label: "Página Inicial", group: "Páginas", icon: Home, route: "/", keywords: "home inicio principal" },
  { id: "pg-jogos", label: "Todos os Jogos", group: "Páginas", icon: Gamepad2, route: "/jogos", keywords: "jogos catalogo classicos arcade" },
  { id: "pg-world", label: "Bateu World 3D — Mundo Aberto", group: "Páginas", icon: Globe, route: "/lives?game=mmorpg", keywords: "mmo mundo aberto 3d world mmorpg" },
  { id: "pg-leiloes", label: "Leilões ao Vivo", group: "Páginas", icon: Gavel, route: "/leiloes", keywords: "leiloes leilao lances arrematar" },
  { id: "pg-marketplace", label: "Marketplace — Vendas", group: "Páginas", icon: Store, route: "/marketplace", keywords: "loja vendas marketplace comprar produtos" },
  { id: "pg-esports", label: "Central de Esports", group: "Páginas", icon: Trophy, route: "/esports", keywords: "esports campeonatos torneios ligas" },
  { id: "pg-esports-b", label: "Grelhas & Brackets", group: "Páginas", icon: Swords, route: "/esports/brackets", keywords: "brackets grelhas chaves mata mata" },
  { id: "pg-esports-f", label: "Fantasy Esports", group: "Páginas", icon: Sparkles, route: "/esports/fantasy", keywords: "fantasy escalacao equipos" },
  { id: "pg-esports-l", label: "Ranking Global", group: "Páginas", icon: Crown, route: "/esports/leaderboard", keywords: "ranking leaderboard classificacao" },
  { id: "pg-torneios", label: "Torneios", group: "Páginas", icon: Trophy, route: "/tournaments", keywords: "torneios tournaments copas" },
  { id: "pg-lives", label: "Lives ao Vivo", group: "Páginas", icon: Radio, route: "/lives-agora", keywords: "lives agora directo streaming" },
  { id: "pg-batalhas", label: "Batalhas P2P", group: "Páginas", icon: Swords, route: "/batalhas", keywords: "batalhas pvp duelos desafios 1v1" },
  { id: "pg-sorteios", label: "Sorteios Verificados", group: "Páginas", icon: Ticket, route: "/marketplace", keywords: "sorteios rifas bilhetes premios" },
  { id: "pg-concursos", label: "Concursos", group: "Páginas", icon: Users, route: "/concursos", keywords: "concursos competicoes" },
  { id: "pg-negocios", label: "Ganhe Dinheiro — Negócios", group: "Páginas", icon: HandCoins, route: "/negocios", keywords: "negocios dinheiro ganhar rendimento embaixador" },
  { id: "pg-empresas", label: "Para Empresas", group: "Páginas", icon: Store, route: "/empresas", keywords: "empresas mensalidade plano business" },
  { id: "pg-alienacao", label: "Alienação de Bens", group: "Páginas", icon: KeyRound, route: "/alienacao", keywords: "alienacao bens leilao proprietario" },
  { id: "pg-wallet", label: "Carteira", group: "Páginas", icon: Wallet, route: "/wallet", keywords: "carteira wallet saldo creditos mzn" },
  { id: "pg-profile", label: "O Meu Perfil", group: "Páginas", icon: User, route: "/profile", keywords: "perfil profile conta" },
  { id: "pg-blog", label: "Blog & Notícias", group: "Páginas", icon: Newspaper, route: "/blog", keywords: "blog noticias artigos" },
  { id: "pg-como", label: "Como Funciona", group: "Páginas", icon: HelpCircle, route: "/como-funciona", keywords: "como funciona ajuda tutorial faq" },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY_RECENTE) || "[]"); } catch { return []; }
  });

  /* ⌘K / Ctrl+K global + evento da navbar */
  useEffect(() => {
    const onAbrir = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(EVENT_ABRIR, onAbrir);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(EVENT_ABRIR, onAbrir);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  /* Leilões ao vivo entram na busca em tempo real */
  useEffect(() => subscribeLeiloes(() => setTick((t) => t + 1)), []);

  const entries: SearchEntry[] = useMemo(() => {
    const jogos: SearchEntry[] = ALL_GAMES.map((g) => ({
      id: `jogo-${g.id}`,
      label: `${g.emoji} ${g.label}`,
      sub: `${g.category} · ${g.players}${g.hasBot ? " · Bot IA" : ""}`,
      group: "Jogos",
      icon: Gamepad2,
      route: `/lives?game=${g.id}`,
      keywords: `${g.id} ${g.desc} ${g.category}`,
      badge: g.id === "mmorpg" ? "MMO" : undefined,
    }));
    const leiloes: SearchEntry[] = listLeiloes()
      .filter((l: any) => l.status === "ao_vivo" || l.status === "terminando" || l.status === "agendado")
      .slice(0, 8)
      .map((l: any) => ({
        id: `leilao-${l.id}`,
        label: `${l.imagem_emoji || "🔨"} ${l.titulo}`,
        sub: l.ends_at ? `Termina em ${tempoRestante(l.ends_at)}` : "Leilão",
        group: "Leilões ao Vivo",
        icon: Gavel,
        route: `/leiloes/${l.id}`,
        keywords: `leilao ${l.categoria || ""} lance arrematar`,
        badge: l.status === "terminando" ? "ACABANDO" : l.status === "ao_vivo" ? "AO VIVO" : undefined,
      }));
    return [...jogos, ...leiloes, ...PAGINAS];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const q = normalize(query.trim());
  const results = useMemo(() => {
    if (!q) return entries;
    return entries.filter((e) => normalize(`${e.label} ${e.sub || ""} ${e.keywords || ""}`).includes(q));
  }, [entries, q]);

  const recentes = useMemo(
    () => recent.map((id) => entries.find((e) => e.id === id)).filter(Boolean).slice(0, 4) as SearchEntry[],
    [recent, entries]
  );

  const select = (entry: SearchEntry) => {
    const next = [entry.id, ...recent.filter((r) => r !== entry.id)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(KEY_RECENTE, JSON.stringify(next)); } catch { /* privado */ }
    setOpen(false);
    setQuery("");
    navigate(entry.route);
  };

  const groupsOrder = ["Jogos", "Leilões ao Vivo", "Páginas"];
  const iconFor = (e: SearchEntry) => e.icon ?? Globe;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}
    >
      <div data-testid="busca-global-dialog">
        <CommandInput
          placeholder="Procurar jogos, leilões, esports, sorteios..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          {results.length === 0 && (
            <CommandEmpty>Nada encontrado para "{query}". Tenta "xadrez", "leilão" ou "esports".</CommandEmpty>
          )}
          {!query && recentes.length > 0 && (
            <>
              <CommandGroup heading="Recentes">
                {recentes.map((e) => {
                  const Icon = iconFor(e);
                  return (
                    <CommandItem key={`r-${e.id}`} value={`recente-${e.label}`} onSelect={() => select(e)}>
                      <History className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{e.label}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{e.group}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {groupsOrder.map((g) => {
            const list = results.filter((e) => e.group === g);
            if (list.length === 0) return null;
            return (
              <CommandGroup
                key={g}
                heading={g === "Jogos" ? "🎮 Jogos" : g === "Leilões ao Vivo" ? "🔨 Leilões ao Vivo" : "Páginas & Secções"}
              >
                {list.slice(0, g === "Jogos" ? 10 : 12).map((e) => {
                  const Icon = iconFor(e);
                  return (
                    <CommandItem key={e.id} value={`${e.label} ${e.sub || ""} ${e.keywords || ""}`} onSelect={() => select(e)} data-testid={`busca-item-${e.id}`}>
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {e.label}
                        {e.sub && <span className="ml-2 text-[10px] text-muted-foreground">{e.sub}</span>}
                      </span>
                      {e.badge && (
                        <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: "rgba(46,160,67,0.15)", color: "#2ea043" }}>
                          {e.badge}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </div>
    </CommandDialog>
  );
}
