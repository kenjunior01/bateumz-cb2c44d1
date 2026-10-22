// ═══════════════════════════════════════════════════════════════
// marketplace — camada unificada de comércio da Bateu.
//
// Um só modelo (MarketItem) para TODAS as vertentes:
//   produtos (prestações) · leilões · alienação · sorteios premium
// Com flash deals calculados (o que termina primeiro / melhor desconto),
// busca instantânea e ordenações. Sem dados falsos: o que não existir
// na base, não aparece.
// ═══════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { listLeiloes, subscribeLeiloes, tempoRestante } from "@/lib/leiloes";

const sb: any = supabase;

export type MarketKind = "produto" | "leilao" | "alienacao" | "sorteio" | "jogo" | "concurso";

export interface MarketItem {
  id: string;
  kind: MarketKind;
  title: string;
  subtitle: string | null;
  /** preço de aquisição imediata (MZN) */
  price: number;
  /** preço "de" para mostrar desconto (ex.: comprar agora do leilão) */
  oldPrice?: number | null;
  image: string | null;
  emoji: string;
  href: string;
  category: string;
  location: string | null;
  /** prova social */
  views?: number;
  favoritos?: number;
  sold?: number;
  /** confiança */
  verified?: boolean;
  /** urgência */
  endsAt?: number | null; // epoch ms
  countdown?: string | null;
  featured?: boolean;
  /** % de desconto sobre oldPrice (0–100) */
  discountPct?: number | null;
  /** extra por vertente (ex.: mensalidade das prestações) */
  meta?: string | null;
  createdAt?: string | null;
}

const KIND_META: Record<MarketKind, { emoji: string; label: string; href: string }> = {
  produto: { emoji: "🛍️", label: "Produto", href: "/prestacoes" },
  leilao: { emoji: "🔨", label: "Leilão", href: "/leiloes" },
  alienacao: { emoji: "🔑", label: "Alienação", href: "/alienacao" },
  sorteio: { emoji: "🎁", label: "Sorteio", href: "/marketplace?tab=raffles" },
  jogo: { emoji: "🎮", label: "Jogo", href: "/jogos" },
  concurso: { emoji: "🏆", label: "Concurso", href: "/concursos" },
};

export function kindLabel(k: MarketKind): string {
  return KIND_META[k].label;
}

// ---- normalizadores -------------------------------------------------------

function pct(price: number, oldPrice?: number | null): number | null {
  if (!oldPrice || oldPrice <= price || price <= 0) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

async function fetchProdutos(limit = 12): Promise<MarketItem[]> {
  try {
    const { data, error } = await sb
      .from("prestacao_products_public")
      .select("id, title, category, total_price, images, province, city, featured, views_count, brand")
      .eq("status", "ativo")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as any[]).map((p) => ({
      id: `prod-${p.id}`,
      kind: "produto" as const,
      title: p.title,
      subtitle: p.brand ? `${p.brand} · em prestações` : "Produto em prestações",
      price: Number(p.total_price) || 0,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      emoji: "🛍️",
      href: `/prestacoes/${p.id}`,
      category: p.category || "outros",
      location: [p.city, p.province].filter(Boolean).join(", ") || null,
      views: p.views_count ?? 0,
      verified: true,
      featured: !!p.featured,
      meta: "Prestações mensais disponíveis",
    }));
  } catch {
    return [];
  }
}

async function fetchAlienacao(limit = 8): Promise<MarketItem[]> {
  try {
    const { data, error } = await sb
      .from("alienacao_assets")
      .select("id, title, category, asset_value, images, province, city, featured, condition, documents_ready")
      .eq("status", "ativo")
      .order("featured", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as any[]).map((a) => ({
      id: `alien-${a.id}`,
      kind: "alienacao" as const,
      title: a.title,
      subtitle: a.documents_ready ? "Documentos prontos · alienação" : "Alienação com entrada reduzida",
      price: Number(a.asset_value) || 0,
      image: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
      emoji: "🔑",
      href: `/alienacao/${a.id}`,
      category: a.category || "outros",
      location: [a.city, a.province].filter(Boolean).join(", ") || null,
      verified: true,
      featured: !!a.featured,
      meta: "Torne-se proprietário por passos",
    }));
  } catch {
    return [];
  }
}

function fromLeilao(l: any): MarketItem {
  const buyNow = l.comprar_agora ?? null;
  const endsAt = l.ends_at ?? null;
  return {
    id: `leilao-${l.id}`,
    kind: "leilao",
    title: l.titulo,
    subtitle: l.vendedor_verificado ? `Vendedor verificado · ${l.estado_item}` : `Vendedor: ${l.vendedor}`,
    price: l.lance_atual ?? l.lance_inicial ?? 0,
    oldPrice: buyNow,
    image: l.imagem_url ?? null,
    emoji: l.imagem_emoji || "🔨",
    href: `/leiloes/${l.id}`,
    category: l.categoria || "outros",
    location: l.localizacao ?? null,
    views: l.visualizacoes ?? 0,
    favoritos: l.favoritos ?? 0,
    verified: !!l.vendedor_verificado,
    endsAt,
    countdown: endsAt ? tempoRestante(endsAt) : null,
    featured: !!l.destaque,
    discountPct: pct(l.lance_atual ?? 0, buyNow),
    meta: buyNow ? `Comprar já por MZN ${buyNow.toLocaleString("pt-PT")}` : "Vai ao lance ao vivo",
  };
}

async function fetchSorteios(limit = 8): Promise<MarketItem[]> {
  try {
    const { data, error } = await sb
      .from("raffles")
      .select("id, title, slug, prize_title, prize_value, ticket_price, total_tickets, sold_tickets, end_date, image_url")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as any[]).map((r) => {
      const sold = r.total_tickets > 0 ? Math.round(((r.sold_tickets ?? 0) / r.total_tickets) * 100) : 0;
      const endsAt = r.end_date ? new Date(r.end_date).getTime() : null;
      return {
        id: `sorteio-${r.id}`,
        kind: "sorteio" as const,
        title: r.prize_title || r.title,
        subtitle: `Bilhete MZN ${(r.ticket_price ?? 0).toLocaleString("pt-PT")} · ${sold}% vendido`,
        price: r.ticket_price ?? 0,
        oldPrice: r.prize_value ?? null,
        image: r.image_url ?? null,
        emoji: "🎁",
        href: `/raffle/${r.slug || r.id}`,
        category: "sorteio",
        location: null,
        sold,
        verified: true,
        endsAt,
        countdown: endsAt ? tempoRestante(endsAt) : null,
        featured: sold >= 70,
        meta: `Prémio MZN ${(r.prize_value ?? 0).toLocaleString("pt-PT")}`,
      };
    });
  } catch {
    return [];
  }
}

// ---- API pública ----------------------------------------------------------

async function fetchJogos(): Promise<MarketItem[]> {
  try {
    const [spinRes, millRes] = await Promise.all([
      sb.from("spin_wheel_games").select("id, title, is_published").eq("is_published", true),
      sb.from("millionaire_games").select("id, title, is_published").eq("is_published", true),
    ]);
    const jogos: MarketItem[] = [
      ...(spinRes.data ?? []).map((g: any) => ({
        id: `jogo-spin-${g.id}`,
        kind: "jogo" as const,
        title: g.title || "Roleta de Prémios",
        subtitle: "Gira e ganha ao vivo",
        price: 0,
        image: null as string | null,
        emoji: "🎡",
        href: `/games/spin-wheel/${g.id}`,
        category: "jogo",
        location: null as string | null,
        verified: true,
        meta: "Joga grátis",
      })),
      ...(millRes.data ?? []).map((g: any) => ({
        id: `jogo-mill-${g.id}`,
        kind: "jogo" as const,
        title: g.title || "Millionário ao Vivo",
        subtitle: "Quiz milionário em direto",
        price: 0,
        image: null as string | null,
        emoji: "🧠",
        href: `/games/millionaire/${g.id}`,
        category: "jogo",
        location: null as string | null,
        verified: true,
        meta: "Joga grátis",
      })),
    ];
    return jogos;
  } catch {
    return [];
  }
}

async function fetchConcursos(limit = 8): Promise<MarketItem[]> {
  try {
    const { data, error } = await sb
      .from("contests")
      .select("id, title, description, prize_description, image_url, status, end_date, created_at")
      .in("status", ["active", "voting", "completed"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as any[]).map((c) => {
      const endsAt = c.end_date ? new Date(c.end_date).getTime() : null;
      return {
        id: `concurso-${c.id}`,
        kind: "concurso" as const,
        title: c.title,
        subtitle: c.prize_description || "Participa e mostra o teu talento",
        price: 0,
        image: c.image_url ?? null,
        emoji: "🏆",
        href: `/concursos/${c.id}`,
        category: "concurso",
        location: null as string | null,
        verified: true,
        endsAt,
        countdown: endsAt ? tempoRestante(endsAt) : null,
        meta: c.status === "voting" ? "Votação em curso" : "Participação aberta",
        createdAt: c.created_at ?? null,
      };
    });
  } catch {
    return [];
  }
}

export interface MarketData {
  items: MarketItem[];
  flashDeals: MarketItem[];
  leiloesDestaque: MarketItem[];
  counts: Record<MarketKind, number>;
}

export async function getMarketplaceData(): Promise<MarketData> {
  const [produtos, alienacao, sorteios, jogos, concursos] = await Promise.all([
    fetchProdutos(14),
    fetchAlienacao(10),
    fetchSorteios(10),
    fetchJogos(),
    fetchConcursos(8),
  ]);
  const leiloes = listLeiloes().map(fromLeilao);
  const items = [...leiloes, ...produtos, ...alienacao, ...sorteios, ...jogos, ...concursos];

  // flash deals: o que está a acabar (leilões + sorteios + concursos) com urgência real
  const now = Date.now();
  const flashDeals = items
    .filter((i) => i.endsAt && i.endsAt > now)
    .sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0))
    .slice(0, 8);

  const leiloesDestaque = leiloes.slice(0, 6);

  const counts: Record<MarketKind, number> = {
    leilao: leiloes.length,
    produto: produtos.length,
    alienacao: alienacao.length,
    sorteio: sorteios.length,
    jogo: jogos.length,
    concurso: concursos.length,
  };

  return { items, flashDeals, leiloesDestaque, counts };
}

/** Re-subscreve a mudanças nos leilões (lances ao vivo entre tabs). */
export function subscribeMarketChanges(cb: () => void): () => void {
  return subscribeLeiloes(cb);
}

/** Busca instantânea no conjunto carregado. */
export function searchMarket(items: MarketItem[], q: string): MarketItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter((i) =>
    `${i.title} ${i.subtitle ?? ""} ${i.category} ${i.location ?? ""}`.toLowerCase().includes(s),
  );
}

export type MarketSort = "urgente" | "barato" | "caro" | "popular" | "desconto" | "recente";

export function sortMarket(items: MarketItem[], sort: MarketSort): MarketItem[] {
  const arr = [...items];
  switch (sort) {
    case "urgente":
      return arr.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity));
    case "barato":
      return arr.sort((a, b) => a.price - b.price);
    case "caro":
      return arr.sort((a, b) => b.price - a.price);
    case "popular":
      return arr.sort((a, b) => (b.views ?? 0) + (b.favoritos ?? 0) * 3 - ((a.views ?? 0) + (a.favoritos ?? 0) * 3));
    case "desconto":
      return arr.sort((a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0));
    case "recente":
      return arr.sort((a, b) => (a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1);
  }
}
