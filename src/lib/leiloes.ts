// =============================================================
// SISTEMA DE LEILÕES — BATEU
// Casa de leilões ao vivo da plataforma: itens raros do mundo,
// créditos, pacotes de dados (Vodacom/TMcel/Movitel), bens de
// empresas e exclusivos. Lances em tempo real, auto-bid,
// anti-snipe, compra imediata e histórico completo.
//
// Arquitetura: motor ao vivo local (ticks de 1s, bots, timers
// reais persistidos) com sincronização opcional por Supabase
// quando as tabelas `leiloes` / `leilao_lances` existirem.
// Convidados podem licitar com saldo demo — como nos jogos.
// =============================================================

import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";

const sb: any = supabase;

// ------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------

export type LeilaoStatus = "agendado" | "ao_vivo" | "terminando" | "terminado" | "cancelado";

export type LeilaoCategoria =
  | "itens_raros"
  | "creditos"
  | "dados"
  | "bens"
  | "exclusivos"
  | "experiencias";

export interface LeilaoLance {
  id: string;
  leilao_id: string;
  bidder: string;
  bidder_avatar?: string | null;
  valor: number;
  is_bot: boolean;
  is_minha?: boolean;
  created_at: string;
}

export interface Leilao {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  categoria: LeilaoCategoria;
  imagem_emoji: string;
  imagem_url: string | null;
  estado_item: "novo" | "seminovo" | "usado" | "digital";
  vendedor: string;
  vendedor_verificado: boolean;
  localizacao: string;
  lance_inicial: number;
  lance_atual: number;
  incremento: number;
  comprar_agora: number | null;
  ends_at: number; // epoch ms
  starts_at: number; // epoch ms
  status: LeilaoStatus;
  lances: LeilaoLance[];
  visualizacoes: number;
  favoritos: number;
  destaque: boolean;
  maior_licitador: string | null;
  extensao_snipe: number; // vezes que o anti-snipe estendeu
  tags: string[];
}

export interface MeuLanceEstado {
  lances: LeilaoLance[];
  autobid_max: Record<string, number>; // leilao_id -> valor máximo
  vitorias: string[];
}

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------

export const LEILAO_CATEGORIAS: { id: LeilaoCategoria; label: string; emoji: string }[] = [
  { id: "itens_raros", label: "Itens Raros do Mundo", emoji: "⚔️" },
  { id: "creditos", label: "Créditos", emoji: "💰" },
  { id: "dados", label: "Pacotes de Dados", emoji: "📶" },
  { id: "bens", label: "Bens de Empresas", emoji: "🏢" },
  { id: "exclusivos", label: "Exclusivos", emoji: "👑" },
  { id: "experiencias", label: "Experiências", emoji: "🎟️" },
];

export const LEILAO_STATUS_LABEL: Record<LeilaoStatus, string> = {
  agendado: "Agendado",
  ao_vivo: "AO VIVO",
  terminando: "TERMINA JÁ",
  terminado: "Terminado",
  cancelado: "Cancelado",
};

export const ANTI_SNIPE_JANELA_MS = 30_000; // lance nos últimos 30s
export const ANTI_SNIPE_EXTENSAO_MS = 15_000; // estende 15s
export const ANTI_SNIPE_MAX = 10; // no máximo 10 extensões
export const COMISSAO_VENDEDOR = 0.05; // 5% para a plataforma

const STORAGE_KEY = "bateu_leiloes_v2";
const BALANCE_KEY = "bateu_leiloes_saldo_v2";
const MEU_NOME_KEY = "bateu_leiloes_nome_v2";

// ------------------------------------------------------------
// DADOS DEMO — catálogo inicial
// ------------------------------------------------------------

interface DemoSeed {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  categoria: LeilaoCategoria;
  emoji: string;
  estado: Leilao["estado_item"];
  vendedor: string;
  localizacao: string;
  lanceInicial: number;
  comprarAgora: number | null;
  fimEmMs: number; // relativo ao arranque (ms)
  destaque?: boolean;
  tags: string[];
}

const DEMO_SEEDS: DemoSeed[] = [
  {
    id: "leilao-manto-ki",
    slug: "manto-do-guerreiro-ki",
    titulo: "Manto do Guerreiro KI — Skin Lendária (Edição Limitada)",
    descricao:
      "Skin lendária do Bateu World com aura dourada permanente, +15% de KI regenerado por minuto e efeito de voo exclusivo. Apenas 50 unidades existem no servidor. Transferência instantânea para a tua conta após pagamento.",
    categoria: "itens_raros",
    emoji: "🎽",
    estado: "digital",
    vendedor: "Bateu Store Oficial",
    localizacao: "Digital — todo o país",
    lanceInicial: 450,
    comprarAgora: 4200,
    fimEmMs: 4.5 * 60_000,
    destaque: true,
    tags: ["lendário", "ki", "open world", "edição limitada"],
  },
  {
    id: "leilao-dados-5gb",
    slug: "5gb-qualquer-operadora",
    titulo: "5GB de Dados — Qualquer Operadora (Vodacom, TMcel, Movitel)",
    descricao:
      "Pacote de 5GB carregado diretamente no teu número em menos de 10 minutos após o leilão. Escolhe a operadora na entrega: Vodacom, TMcel ou Movitel. Válido por 30 dias. Sem taxas escondidas.",
    categoria: "dados",
    emoji: "📶",
    estado: "digital",
    vendedor: "Bateu Prémios",
    localizacao: "Digital — recarga nacional",
    lanceInicial: 120,
    comprarAgora: 690,
    fimEmMs: 2.2 * 60_000,
    destaque: true,
    tags: ["1GB+", "vodacom", "tmcel", "movitel", "recarga rápida"],
  },
  {
    id: "leilao-lamina-dragao",
    slug: "lamina-do-dragao",
    titulo: "Lâmina do Dragão — Arma Mítica do Open World",
    descricao:
      "Arma corpo-a-corpo mais rara do Bateu World: dano de fogo em área, causa +40% contra monstros dos Territórios Vulcânicos e brilha quando Power Level sobe. Drop único do Boss Dragão Ancião.",
    categoria: "itens_raros",
    emoji: "🗡️",
    estado: "digital",
    vendedor: "CaçadorZambeze",
    localizacao: "Digital — servidor MZ-1",
    lanceInicial: 800,
    comprarAgora: null,
    fimEmMs: 38 * 60_000,
    tags: ["mítico", "arma", "boss", "fogo"],
  },
  {
    id: "leilao-creditos-2500",
    slug: "2500-creditos-bateu",
    titulo: "2.500 Créditos da Plataforma — Pacote Mega",
    descricao:
      "Créditos para usar em sorteios, desafios 1v1, campeonatos e na loja. Creditação imediata na carteira após fecho do leilão. Sem prazo de validade.",
    categoria: "creditos",
    emoji: "💰",
    estado: "digital",
    vendedor: "Bateu Store Oficial",
    localizacao: "Digital — carteira",
    lanceInicial: 200,
    comprarAgora: 1650,
    fimEmMs: 11 * 60_000,
    tags: ["créditos", "carteira", "sorteios"],
  },
  {
    id: "leilao-hilux",
    slug: "toyota-hilux-2019",
    titulo: "Toyota Hilux 2.4 GD6 2019 — 98.000 km, Livro de Bordos Completo",
    descricao:
      "Viatura de empresa em excelente estado, revisões na marca, pneus novos, interior impecável. Documentação pronta para transferência. Inspecção feita. Levantamento em Maputo ou entrega negociada.",
    categoria: "bens",
    emoji: "🚙",
    estado: "usado",
    vendedor: "TransLog Sul, Lda",
    localizacao: "Maputo",
    lanceInicial: 850_000,
    comprarAgora: null,
    fimEmMs: 2 * 3_600_000,
    destaque: true,
    tags: ["viatura", "4x4", "empresa", "documentos prontos"],
  },
  {
    id: "leilao-smart-tv",
    slug: "smart-tv-43-polegadas",
    titulo: 'Smart TV 43" Full HD — Nova na Caixa',
    descricao:
      "Televisor 43 polegadas Full HD com Android TV, Wi-Fi e 2 anos de garantia da loja. Produto novo, na caixa, com nota fiscal. Levantamento na loja ou entrega em Maputo e Matola.",
    categoria: "bens",
    emoji: "📺",
    estado: "novo",
    vendedor: "Casa dos Electrónicos",
    localizacao: "Matola",
    lanceInicial: 3_200,
    comprarAgora: 12_500,
    fimEmMs: 55 * 60_000,
    tags: ["tv", "novo", "garantia"],
  },
  {
    id: "leilao-booster-ki",
    slug: "booster-pack-ki-x50",
    titulo: "Booster Pack KI x50 — Multiplicador de Power Level",
    descricao:
      "Pacote com 50 boosts de treino: cada boost adiciona treino KI instantâneo à tua personagem no Open World. Sobe de classificação mais rápido — mas a subida de nível continua rara e merecida, sem atalhos para ranks máximos.",
    categoria: "itens_raros",
    emoji: "⚡",
    estado: "digital",
    vendedor: "MestreKI_Oficial",
    localizacao: "Digital — servidor MZ-1",
    lanceInicial: 300,
    comprarAgora: 2_400,
    fimEmMs: 26 * 60_000,
    tags: ["ki", "power level", "treino"],
  },
  {
    id: "leilao-vip-sorteio",
    slug: "passaporte-vip-sorteio-ao-vivo",
    titulo: "Passaporte VIP — Frente de Fila nos Sorteios ao Vivo (30 dias)",
    descricao:
      "Acesso VIP durante 30 dias: entrada prioritária em todos os sorteios ao vivo, distintivo dourado no perfil, 2x créditos de bónus semanais e sala exclusiva com os apresentadores.",
    categoria: "exclusivos",
    emoji: "👑",
    estado: "digital",
    vendedor: "Bateu Oficial",
    localizacao: "Digital — conta",
    lanceInicial: 500,
    comprarAgora: 3_800,
    fimEmMs: 1.6 * 3_600_000,
    tags: ["vip", "sorteios", "distintivo"],
  },
  {
    id: "leilao-generador",
    slug: "gerador-solar-3kva",
    titulo: "Kit Solar 3kVA com Bateria — Novo, Instalação Incluída",
    descricao:
      "Kit solar completo: 6 painéis de 550W, inversor 3kVA, bateria de lítio 100Ah e instalação incluída em Maputo e Matola. Ideal para evitar cortes de energia. Garantia de 5 anos nos painéis.",
    categoria: "bens",
    emoji: "🔆",
    estado: "novo",
    vendedor: "SolarMoz Energia",
    localizacao: "Maputo",
    lanceInicial: 22_000,
    comprarAgora: null,
    fimEmMs: 4 * 3_600_000,
    tags: ["energia", "solar", "instalação"],
  },
  {
    id: "leilao-jantar-chef",
    slug: "jantar-de-chef-para-2",
    titulo: "Jantar de Chef 5 Pratos para 2 Pessoas — Restaurante Premium",
    descricao:
      "Experiência gastronómica completa: menu de 5 pratos preparado pelo chef, com vista para a baía. Marcações de terça a sábado. Válido por 90 dias. Bebidas não incluídas.",
    categoria: "experiencias",
    emoji: "🍽️",
    estado: "novo",
    vendedor: "Sabores da Baía",
    localizacao: "Maputo",
    lanceInicial: 900,
    comprarAgora: 4_500,
    fimEmMs: 3.2 * 3_600_000,
    tags: ["experiência", "restaurante", "casal"],
  },
  {
    id: "leilao-bicicleta-eletrica",
    slug: "bicicleta-eletrica-xrider",
    titulo: "Bicicleta Elétrica X-Rider 500W — Seminova, 300 km",
    descricao:
      "Bicicleta elétrica com autonomia de 60 km, velocidade máxima 32 km/h, travões de disco e farol LED. Seminova com apenas 300 km. Carregador original incluído.",
    categoria: "bens",
    emoji: "🚲",
    estado: "seminovo",
    vendedor: "MobilidadeMaputo",
    localizacao: "Maputo",
    lanceInicial: 8_000,
    comprarAgora: 26_000,
    fimEmMs: 88 * 60_000,
    tags: ["elétrica", "mobilidade"],
  },
  {
    id: "leilao-terminado-auriculares",
    slug: "auriculares-gamer-rgb",
    titulo: "Auriculares Gamer RGB 7.1 — Vencido",
    descricao:
      "Leilão terminado. Auriculares com surround 7.1, microfone com redução de ruído e iluminação RGB. Fica aqui para consulta do histórico de lances.",
    categoria: "bens",
    emoji: "🎧",
    estado: "novo",
    vendedor: "Casa dos Electrónicos",
    localizacao: "Matola",
    lanceInicial: 850,
    comprarAgora: null,
    fimEmMs: -45 * 60_000,
    tags: ["áudio", "gamer"],
  },
  {
    id: "leilao-agendado-ps5",
    slug: "consola-next-gen",
    titulo: "Consola Next-Gen 1TB + 2 Comandos — Leilão Especial de Sexta",
    descricao:
      "Leilão especial de sexta-feira às 19h. Consola nova com 1TB, dois comandos e o jogo de lançamento incluído. Prepara os teus créditos — a batalha vai ser dura!",
    categoria: "bens",
    emoji: "🎮",
    estado: "novo",
    vendedor: "Bateu Store Oficial",
    localizacao: "Maputo",
    lanceInicial: 18_000,
    comprarAgora: 48_000,
    fimEmMs: 26 * 3_600_000,
    tags: ["consola", "especial", "sexta"],
  },
];

const BOTS = [
  "TofoMaster", "Guerreiro_MZN", "KIDaBora", "ZambezeKing", "MapitoPro",
  "XitiqueFC", "NiassaBeast", "PontoZero258", "RainhaDoSul", "BoraBora77",
  "ChapaQuente", "LicitaTudo", "MozPlayer1", "ReiDaBacia",
];

const AVATAR_COLORS = ["#00d4ff", "#7b2ff7", "#ff4655", "#fbbf24", "#2ea043", "#ff7b00"];

// ------------------------------------------------------------
// MOTOR AO VIVO (estado global em memória + persistência)
// ------------------------------------------------------------

interface MotorEstado {
  seedsAt: number; // momento em que os offsets foram gerados
  leiloes: Leilao[];
  meuNome: string;
  saldoDemo: number;
  meusLances: Record<string, LeilaoLance[]>; // leilao_id -> lances meus
  autobid: Record<string, number>;
  vitorias: string[];
}

let estado: MotorEstado | null = null;
let tickId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage cheio/indisponível */ }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function agora(): number {
  return Date.now();
}

/** Incremento mínimo dinâmico conforme o valor em curso. */
export function incrementoPara(valor: number): number {
  if (valor < 500) return 25;
  if (valor < 5_000) return 100;
  if (valor < 100_000) return 500;
  if (valor < 1_000_000) return 5_000;
  return 25_000;
}

function statusDe(leilao: Leilao, agoraMs: number): LeilaoStatus {
  if (leilao.status === "cancelado") return "cancelado";
  if (agoraMs < leilao.starts_at) return "agendado";
  const restante = leilao.ends_at - agoraMs;
  if (restante <= 0) return "terminado";
  if (restante <= 2 * 60_000) return "terminando";
  return "ao_vivo";
}

function criarLanceBot(leilao: Leilao, bot?: string): LeilaoLance {
  const inc = incrementoPara(leilao.lance_atual);
  // bots às vezes saltam 2x o incremento para pressionar
  const salto = Math.random() < 0.18 ? inc * 2 : inc;
  const valor = leilao.lance_atual + salto;
  return {
    id: uid(),
    leilao_id: leilao.id,
    bidder: bot || BOTS[Math.floor(Math.random() * BOTS.length)],
    valor,
    is_bot: true,
    created_at: new Date().toISOString(),
  };
}

function aplicarLanceInterno(leilao: Leilao, lance: LeilaoLance) {
  leilao.lance_atual = lance.valor;
  leilao.maior_licitador = lance.bidder;
  leilao.lances.unshift(lance);
  if (leilao.lances.length > 60) leilao.lances.length = 60;
  // anti-snipe: lance nos últimos segundos estende o leilão
  const restante = leilao.ends_at - agora();
  if (restante > 0 && restante < ANTI_SNIPE_JANELA_MS && leilao.extensao_snipe < ANTI_SNIPE_MAX) {
    leilao.ends_at += ANTI_SNIPE_EXTENSAO_MS;
    leilao.extensao_snipe += 1;
  }
}

function estadoInicial(): MotorEstado {
  const salvo = lsGet<MotorEstado | null>(STORAGE_KEY, null);
  const agoraMs = agora();
  // re-semeia se nunca houve estado, ou se todos os leilões terminaram há mais de 10 min
  const tudoAntigo = salvo && salvo.leiloes?.length > 0 && salvo.leiloes.every((l) => l.ends_at < agoraMs - 10 * 60_000);
  if (salvo && !tudoAntigo) {
    // reanima: garante que pelo menos os "terminando/ao_vivo" continuam coerentes
    for (const l of salvo.leiloes) {
      l.status = statusDe(l, agoraMs);
    }
    return salvo;
  }

  const leiloes: Leilao[] = DEMO_SEEDS.map((s) => {
    const ends_at = agoraMs + s.fimEmMs;
    const lances: LeilaoLance[] = [];
    let lanceAtual = s.lanceInicial;
    const terminado = s.fimEmMs < 0;
    // histórico pré-gerado para dar vida
    const nHistorico = terminado ? 7 : Math.min(9, Math.max(2, Math.floor(Math.abs(s.fimEmMs) / 90_000)));
    let t = terminado ? agoraMs + s.fimEmMs - 30 * 60_000 : agoraMs - Math.min(20 * 60_000, Math.abs(s.fimEmMs) * 0.6);
    let maior = "Guerreiro_MZN";
    for (let i = 0; i < nHistorico; i++) {
      const nome = BOTS[(i * 5 + s.id.length) % BOTS.length];
      lances.push({
        id: uid(),
        leilao_id: s.id,
        bidder: nome,
        valor: lanceAtual,
        is_bot: true,
        created_at: new Date(t).toISOString(),
      });
      maior = nome;
      t += 45_000 + Math.random() * 60_000;
      lanceAtual += incrementoPara(lanceAtual) * (Math.random() < 0.3 ? 2 : 1);
    }
    if (!terminado) lanceAtual = Math.max(lanceAtual, s.lanceInicial);
    return {
      id: s.id,
      slug: s.slug,
      titulo: s.titulo,
      descricao: s.descricao,
      categoria: s.categoria,
      imagem_emoji: s.emoji,
      imagem_url: null,
      estado_item: s.estado,
      vendedor: s.vendedor,
      vendedor_verificado: s.vendedor.includes("Oficial") || s.vendedor.includes("Bateu"),
      localizacao: s.localizacao,
      lance_inicial: s.lanceInicial,
      lance_atual: terminado ? lanceAtual : lanceAtual,
      incremento: incrementoPara(lanceAtual),
      comprar_agora: s.comprarAgora,
      ends_at,
      starts_at: s.fimEmMs > 24 * 3_600_000 ? agoraMs + 20 * 3_600_000 : agoraMs - 3_600_000,
      status: terminado ? "terminado" : "ao_vivo",
      lances: terminado ? lances.slice().reverse() : lances,
      visualizacoes: 120 + Math.floor(Math.random() * 3400),
      favoritos: 5 + Math.floor(Math.random() * 260),
      destaque: !!s.destaque,
      maior_licitador: maior,
      extensao_snipe: 0,
      tags: s.tags,
    } satisfies Leilao;
  });

  const est: MotorEstado = {
    seedsAt: agoraMs,
    leiloes,
    meuNome: lsGet<string>(MEU_NOME_KEY, ""),
    saldoDemo: lsGet<number>(BALANCE_KEY, 12_500),
    meusLances: {},
    autobid: {},
    vitorias: [],
  };
  return est;
}

function persistir() {
  if (!estado) return;
  lsSet(STORAGE_KEY, {
    seedsAt: estado.seedsAt,
    leiloes: estado.leiloes,
    meuNome: estado.meuNome,
    saldoDemo: estado.saldoDemo,
    meusLances: estado.meusLances,
    autobid: estado.autobid,
    vitorias: estado.vitorias,
  });
  lsSet(BALANCE_KEY, estado.saldoDemo);
}

/** Tick de 1s: bots licitam, timers correm, autobid do utilizador atua. */
function tick() {
  if (!estado) return;
  const agoraMs = agora();
  let mudou = false;

  for (const l of estado.leiloes) {
    const st = statusDe(l, agoraMs);
    if (st !== l.status) {
      l.status = st;
      if (st === "terminado") {
        // vitória do utilizador: debita o valor final e regista a vitória
        const meuLanceVencedor = estado.meusLances[l.id]?.[0];
        if (l.maior_licitador === estado.meuNome && meuLanceVencedor) {
          estado.saldoDemo = Math.max(0, estado.saldoDemo - l.lance_atual);
          if (!estado.vitorias.includes(l.id)) estado.vitorias.push(l.id);
        }
      }
      mudou = true;
    }
    if (st !== "ao_vivo" && st !== "terminando") continue;

    // probabilidade de bot licitar (mais agressivo perto do fim)
    const restante = l.ends_at - agoraMs;
    let chance = 0.02;
    if (restante < 60_000) chance = 0.16;
    else if (restante < 3 * 60_000) chance = 0.07;

    if (Math.random() < chance) {
      const bot = criarLanceBot(l);
      // não deixar bots ultrapassar o comprar_agora
      if (l.comprar_agora == null || bot.valor < l.comprar_agora) {
        aplicarLanceInterno(l, bot);
        mudou = true;
      }
    }

    // AUTO-BID do utilizador
    const maxAuto = estado.autobid[l.id];
    if (maxAuto && l.maior_licitador !== nomeUsuario() && l.lance_atual + incrementoPara(l.lance_atual) <= maxAuto) {
      const inc = incrementoPara(l.lance_atual);
      const novo = Math.min(l.lance_atual + inc, maxAuto);
      const valor = novo;
      const lance: LeilaoLance = {
        id: uid(),
        leilao_id: l.id,
        bidder: nomeUsuario(),
        valor,
        is_bot: false,
        is_minha: true,
        created_at: new Date().toISOString(),
      };
      aplicarLanceInterno(l, lance);
      estado.meusLances[l.id] = estado.meusLances[l.id] || [];
      estado.meusLances[l.id].unshift(lance);
      mudou = true;
    }
  }

  if (mudou) {
    persistir();
    listeners.forEach((fn) => fn());
  }
}

function garantirMotor() {
  if (typeof window === "undefined") return;
  if (!estado) {
    estado = estadoInicial();
    if (!estado.meuNome) {
      estado.meuNome = "Tu_" + Math.floor(1000 + Math.random() * 9000);
      lsSet(MEU_NOME_KEY, estado.meuNome);
    }
    persistir();
  }
  if (!tickId) {
    tickId = setInterval(tick, 1000);
  }
}

function nomeUsuario(): string {
  garantirMotor();
  return estado?.meuNome || "Tu";
}

function notificar() {
  listeners.forEach((fn) => fn());
}

// ------------------------------------------------------------
// API PÚBLICA
// ------------------------------------------------------------

export function subscribeLeiloes(cb: () => void): () => void {
  garantirMotor();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function listLeiloes(): Leilao[] {
  garantirMotor();
  if (!estado) return [];
  const agoraMs = agora();
  return estado.leiloes
    .map((l) => ({ ...l, status: statusDe(l, agoraMs), incremento: incrementoPara(l.lance_atual) }))
    .sort((a, b) => {
      const rank = (s: LeilaoStatus) => (s === "terminando" ? 0 : s === "ao_vivo" ? 1 : s === "agendado" ? 2 : 3);
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
      return a.ends_at - b.ends_at;
    });
}

export function getLeilao(idOrSlug: string): Leilao | null {
  garantirMotor();
  if (!estado) return null;
  const agoraMs = agora();
  const l = estado.leiloes.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
  if (!l) return null;
  return { ...l, status: statusDe(l, agoraMs), incremento: incrementoPara(l.lance_atual) };
}

export function getMeuSaldo(): number {
  garantirMotor();
  return estado?.saldoDemo ?? 0;
}

export function getMeuNome(): string {
  return nomeUsuario();
}

export function getMeusLances(leilaoId: string): LeilaoLance[] {
  garantirMotor();
  return estado?.meusLances[leilaoId] ?? [];
}

export function getAutobid(leilaoId: string): number | null {
  garantirMotor();
  return estado?.autobid[leilaoId] ?? null;
}

export function getVitorias(): string[] {
  garantirMotor();
  return estado?.vitorias ?? [];
}

export type LanceResultado =
  | { ok: true; leilao: Leilao; saldo: number; erro?: undefined }
  | { ok: false; erro: string; leilao?: undefined; saldo?: undefined };

/** Coloca um lance. Valida saldo, valor mínimo e estado do leilão. */
export function colocarLance(leilaoId: string, valor?: number): LanceResultado {
  garantirMotor();
  if (!estado) return { ok: false, erro: "Motor de leilões indisponível." };
  const l = estado.leiloes.find((x) => x.id === leilaoId || x.slug === leilaoId);
  if (!l) return { ok: false, erro: "Leilão não encontrado." };
  const st = statusDe(l, agora());
  if (st === "terminado" || st === "cancelado") return { ok: false, erro: "Este leilão já terminou." };
  if (st === "agendado") return { ok: false, erro: "Este leilão ainda não começou." };

  const minimo = l.lance_atual + incrementoPara(l.lance_atual);
  const valorFinal = valor ?? minimo;
  if (valorFinal < minimo) {
    return { ok: false, erro: `O lance mínimo é ${formatMZN(minimo)}.` };
  }
  if (l.comprar_agora != null && valorFinal >= l.comprar_agora) {
    return { ok: false, erro: `Esse valor atinge o preço de Compra Imediata (${formatMZN(l.comprar_agora)}). Usa a opção "Comprar Agora".` };
  }
  if (valorFinal > estado.saldoDemo) {
    return { ok: false, erro: `Saldo insuficiente. Tens ${formatMZN(estado.saldoDemo)} disponível.` };
  }

  const lance: LeilaoLance = {
    id: uid(),
    leilao_id: l.id,
    bidder: nomeUsuario(),
    valor: valorFinal,
    is_bot: false,
    is_minha: true,
    created_at: new Date().toISOString(),
  };
  aplicarLanceInterno(l, lance);
  estado.meusLances[l.id] = estado.meusLances[l.id] || [];
  estado.meusLances[l.id].unshift(lance);
  persistir();
  notificar();
  return { ok: true, leilao: getLeilao(l.id)!, saldo: estado.saldoDemo };
}

/** Define o auto-bid máximo para um leilão (e lança já ao nível atual se possível). */
export function definirAutobid(leilaoId: string, maximo: number): LanceResultado {
  garantirMotor();
  if (!estado) return { ok: false, erro: "Motor de leilões indisponível." };
  const l = estado.leiloes.find((x) => x.id === leilaoId || x.slug === leilaoId);
  if (!l) return { ok: false, erro: "Leilão não encontrado." };
  const st = statusDe(l, agora());
  if (st !== "ao_vivo" && st !== "terminando") return { ok: false, erro: "Leilão não está ativo." };
  if (maximo < l.lance_atual + incrementoPara(l.lance_atual)) {
    return { ok: false, erro: "O máximo do auto-bid tem de ser superior ao lance atual." };
  }
  if (maximo > estado.saldoDemo) {
    return { ok: false, erro: `Saldo insuficiente para esse máximo. Tens ${formatMZN(estado.saldoDemo)}.` };
  }
  estado.autobid[l.id] = maximo;
  // se não somos o maior licitador, licita já o mínimo
  if (l.maior_licitador !== nomeUsuario()) {
    return colocarLance(l.id);
  }
  persistir();
  notificar();
  return { ok: true, leilao: getLeilao(l.id)!, saldo: estado.saldoDemo };
}

export function cancelarAutobid(leilaoId: string) {
  garantirMotor();
  if (!estado) return;
  delete estado.autobid[leilaoId];
  persistir();
  notificar();
}

/** Compra imediata: paga o preço fixo e termina o leilão como vencedor. */
export function comprarAgora(leilaoId: string): LanceResultado {
  garantirMotor();
  if (!estado) return { ok: false, erro: "Motor de leilões indisponível." };
  const l = estado.leiloes.find((x) => x.id === leilaoId || x.slug === leilaoId);
  if (!l) return { ok: false, erro: "Leilão não encontrado." };
  const st = statusDe(l, agora());
  if (st === "terminado" || st === "cancelado") return { ok: false, erro: "Este leilão já terminou." };
  if (l.comprar_agora == null) return { ok: false, erro: "Este leilão não tem Compra Imediata." };
  if (estado.saldoDemo < l.comprar_agora) {
    return { ok: false, erro: `Saldo insuficiente. A compra custa ${formatMZN(l.comprar_agora)} e tens ${formatMZN(estado.saldoDemo)}.` };
  }
  estado.saldoDemo -= l.comprar_agora;
  const lance: LeilaoLance = {
    id: uid(),
    leilao_id: l.id,
    bidder: nomeUsuario(),
    valor: l.comprar_agora,
    is_bot: false,
    is_minha: true,
    created_at: new Date().toISOString(),
  };
  aplicarLanceInterno(l, lance);
  l.ends_at = agora() - 1;
  l.status = "terminado";
  l.maior_licitador = nomeUsuario();
  estado.meusLances[l.id] = estado.meusLances[l.id] || [];
  estado.meusLances[l.id].unshift(lance);
  if (!estado.vitorias.includes(l.id)) estado.vitorias.push(l.id);
  persistir();
  notificar();
  return { ok: true, leilao: getLeilao(l.id)!, saldo: estado.saldoDemo };
}

// ------------------------------------------------------------
// FORMATADORES
// ------------------------------------------------------------

export function tempoRestante(endsAt: number): string {
  const diff = endsAt - agora();
  if (diff <= 0) return "Terminado";
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function tempoRestanteSegundos(endsAt: number): number {
  return Math.max(0, Math.floor((endsAt - agora()) / 1000));
}

export function corStatus(status: LeilaoStatus): string {
  switch (status) {
    case "terminando": return "#ff4655";
    case "ao_vivo": return "#2ea043";
    case "agendado": return "#fbbf24";
    default: return "#71717a";
  }
}

export function categoriaLabel(c: LeilaoCategoria): string {
  return LEILAO_CATEGORIAS.find((x) => x.id === c)?.label ?? c;
}

export function categoriaEmoji(c: LeilaoCategoria): string {
  return LEILAO_CATEGORIAS.find((x) => x.id === c)?.emoji ?? "🏷️";
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO SUPABASE (opcional — enriquece quando existe)
// Tabelas esperadas: leiloes(id, titulo, ..., ends_at, lance_atual)
//                    leilao_lances(id, leilao_id, bidder, valor, created_at)
// Qualquer falha é silenciosa: o motor local continua a funcionar.
// ------------------------------------------------------------

export async function sincronizarLanceSupabase(leilaoId: string, valor: number): Promise<boolean> {
  try {
    const { error } = await sb.from("leilao_lances").insert({
      leilao_id: leilaoId,
      bidder: nomeUsuario(),
      valor,
      is_bot: false,
    });
    if (error) return false;
    await sb.from("leiloes").update({ lance_atual: valor }).eq("id", leilaoId);
    return true;
  } catch {
    return false;
  }
}
