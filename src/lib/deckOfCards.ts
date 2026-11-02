// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v30 — Cliente Deck of Cards API (baralho real)
//
// Fonte: deckofcardsapi.com (public-apis → Games & Comics) — pública,
// sem chave, CORS aberto (Access-Control-Allow-Origin: *, validado ao
// vivo no dia da integração). Devolve baralhos EMBARALHADOS no servidor
// e cartas com imagem PNG oficial — usamos as imagens reais da API,
// nunca desenhos imitados.
//
// Estratégia: baralho de 6 decks (312 cartas, padrão de casino real)
// criado numa só chamada /new/shuffle/ e consumido com /draw/ — só
// pedimos cartas quando o jogador age, nunca em polling. Quando o
// baralho fica baixo (<60), pedimos um novo (reserva honesta: o
// Blackjack real também reembaralha).
//
// Princípios da plataforma: ZERO dados inventados (cartas vêm da API),
// estados de erro honestos (sem simulação local disfarçada) e atribuição
// explícita: "Baralho & imagens © Deck of Cards API".
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://deckofcardsapi.com/api/deck";

export const DECK_ATTRIBUTION = "Baralho e imagens de cartas © Deck of Cards API (deckofcardsapi.com)";

export interface ApiCard {
  code: string; // "AS", "0C", "KH"…
  image: string; // PNG oficial da API
  value: string; // "ACE" | "2"… | "KING"
  suit: string; // "SPADES" | "HEARTS" | "DIAMONDS" | "CLUBS"
}

export interface Deck {
  deckId: string;
  remaining: number;
}

export class DeckApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckApiError";
  }
}

async function req<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new DeckApiError(`Deck of Cards HTTP ${res.status}`);
    const data = (await res.json()) as T & { success?: boolean };
    if (data && data.success === false) throw new DeckApiError("Deck of Cards recusou o pedido");
    return data;
  } catch (err) {
    if (err instanceof DeckApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new DeckApiError("A API do baralho demorou demasiado (timeout)");
    }
    throw new DeckApiError("Sem ligação à API do baralho");
  } finally {
    clearTimeout(timer);
  }
}

/** Cria um baralho real de `count` decks embaralhado no servidor (312 = 6 decks). */
export async function shuffleDeck(count = 6): Promise<Deck> {
  const data = await req<{ deck_id: string; remaining: number; shuffled: boolean }>(
    `${API_BASE}/new/shuffle/?deck_count=${count}`,
  );
  if (!data.shuffled) throw new DeckApiError("O baralho chegou sem embaralhar");
  return { deckId: data.deck_id, remaining: data.remaining };
}

/** Tira `n` cartas REAIS do baralho do servidor. */
export async function drawCards(deckId: string, n: number): Promise<{ cards: ApiCard[]; remaining: number }> {
  const data = await req<{ cards: ApiCard[]; remaining: number }>(
    `${API_BASE}/${deckId}/draw/?count=${n}`,
  );
  if (!Array.isArray(data.cards) || data.cards.length !== n) {
    throw new DeckApiError("A API devolveu menos cartas do que o pedido");
  }
  return { cards: data.cards, remaining: data.remaining };
}

/** Reembaralha TODAS as cartas de volta ao baralho (mesmo deck_id). */
export async function reshuffle(deckId: string): Promise<number> {
  const data = await req<{ remaining: number }>(`${API_BASE}/${deckId}/shuffle/`);
  return data.remaining;
}

// ── Regras de Blackjack (cálculo 100% cliente sobre cartas REAIS) ────────

/** Valor de uma carta para Blackjack: A=11 flexível, figuras=10. */
export function cardValue(card: ApiCard): number {
  switch (card.value) {
    case "ACE": return 11;
    case "KING":
    case "QUEEN":
    case "JACK":
    case "10": return 10;
    default: return parseInt(card.value, 10);
  }
}

/** Pontuação de Blackjack com ases flexíveis (o melhor valor ≤21). */
export function handScore(cards: ApiCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = cardValue(c);
    total += v;
    if (v === 11) aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10; // Ás passa de 11 para 1
    aces -= 1;
  }
  return total;
}

export function isBlackjack(cards: ApiCard[]): boolean {
  return cards.length === 2 && handScore(cards) === 21;
}

/** Tradução de naipe/valor para leitura em voz da plataforma (pt). */
export function cardNamePt(card: ApiCard): string {
  const suits: Record<string, string> = { SPADES: "espadas", HEARTS: "copas", DIAMONDS: "ouros", CLUBS: "paus" };
  const values: Record<string, string> = {
    ACE: "Ás", KING: "Rei", QUEEN: "Dama", JACK: "Valete",
  };
  const v = values[card.value] ?? card.value;
  return `${v} de ${suits[card.suit] ?? card.suit}`;
}
