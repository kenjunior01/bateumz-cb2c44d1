// ============================================================
// CIDADE BATEU — Progressão (v38)
// Padrões estudados do Veloren (clone real, docs/REA-progressao-v38.md):
//  · Grupos de competências independentes → common/src/comp/skillset/mod.rs:89-90
//    (SkillGroupKind: General | Weapon) — aqui: 4 ramos urbanos.
//  · Curva de custo por nível → mod.rs:101-113 (grupo General: EXP_INCREMENT=10,
//    STARTING_EXP=70, EXP_CEILING=1000, SCALING_FACTOR=0.125) — usamos a MESMA
//    forma logística, escalada ×10 (fórmula matemática, nunca código GPL).
//  · XP acumulado → skill points (add_experience → earn_skill_point,
//    mod.rs:185-230) — aqui: XP de atividade real → níveis → 1 ponto/nível.
//  · Dificuldade: o Veloren NÃO tem seletor de dificuldade — só o marcador
//    Hardcore (common/src/comp/hardcore.rs:5, permadeath). Os nossos 3 níveis
//    com efeitos medíveis são um diferenciador próprio.
// Honestidade: tudo local (localStorage + espelho IndexedDB do armazem.ts
// desde a v39 — sobrevive a limpezas de LS), tudo derivado de atividade REAL.
// Puro TS — sem DOM além de localStorage guardado (o servidor pode importar).
// ============================================================

import { idbDefinir, restaurarLSdeIDB } from "../armazem";

// ── Dificuldade ───────────────────────────────────────────────
export type Dificuldade = "passeio" | "cidadao" | "desafiador";

export interface RegrasDificuldade {
  id: Dificuldade;
  /** Nº de distritos distintos exigidos na missão diária de circuito. */
  alvoVisitas: number;
  /** Multiplicador de XP ganho. */
  multXP: number;
  /** Multiplicador de créditos de missões. */
  multCred: number;
  /** Alcance (blocos) para o prompt de portal/destino aparecer. */
  raioPortal: number;
  /** Alcance (blocos) para descobrir um marco. */
  raioMarco: number;
}

// O Veloren não tem nada disto (só Hardcore=permadeath, hardcore.rs:5).
export const DIFICULDADES: Record<Dificuldade, RegrasDificuldade> = {
  passeio:    { id: "passeio",    alvoVisitas: 3, multXP: 0.9,  multCred: 1.0,  raioPortal: 12, raioMarco: 12 },
  cidadao:    { id: "cidadao",    alvoVisitas: 4, multXP: 1.0,  multCred: 1.0,  raioPortal: 8,  raioMarco: 10 },
  desafiador: { id: "desafiador", alvoVisitas: 5, multXP: 1.3,  multCred: 1.25, raioPortal: 5,  raioMarco: 8 },
};

// ── Ramos de competências (padrão SkillGroupKind, mod.rs:89) ──
export type Ramo = "explorador" | "atleta" | "sabio" | "cidadao";
export const RAMOS: Ramo[] = ["explorador", "atleta", "sabio", "cidadao"];
/** Cada ramo aceita 3 competências (como total_skill_point_cost do Veloren). */
export const NIVEL_MAX_RAMO = 3;

// ── Curva de XP (logística do grupo General, skillset/mod.rs:101-113) ──
const EXP_INCREMENT = 10, STARTING_EXP = 70, EXP_CEILING = 1000, SCALING_FACTOR = 0.125;

/** XP necessário para passar do nível `n` para `n+1` (n ≥ 1).
 *  MESMA forma logística do grupo General do Veloren (mod.rs:101-113):
 *  10·floor((1000/10)/(1+e^(−0.125·lvl)·(1000/70−1))) — nível 1→2 custa 70,
 *  cresce suavemente até ~760. Verificado: lvl 0 → 70 (10·floor(7.0)). */
export function custoProximoNivel(n: number): number {
  const lvl = Math.max(0, n - 1); // 0-based, como earned_sp no Veloren
  return EXP_INCREMENT * Math.floor(
    (EXP_CEILING / EXP_INCREMENT) /
    (1 + Math.exp(-SCALING_FACTOR * lvl) * (EXP_CEILING / STARTING_EXP - 1)),
  );
}

// ── Perfil ────────────────────────────────────────────────────
export interface Perfil {
  versao: 38;
  xp: number;                    // XP total acumulado (nunca desce)
  pontos: number;                // pontos não gastos (1 por nível)
  skills: Record<Ramo, number>;  // 0..3 por ramo
  marcos: string[];              // ids de marcos descobertos
  dificuldade: Dificuldade;
  cadeia: number;                // índice do próximo capítulo (0..ROTEIRO.length)
  cadeiaQuiz: number;            // acertos acumulados para o capítulo do quiz
  cadeiaVisitados: string[];     // portais já visitados (persistente, p/ cap. 6)
  cadeiaNoite: boolean;          // viveu o anoitecer na praça?
}

export function perfilNovo(): Perfil {
  return {
    versao: 38, xp: 0, pontos: 0,
    skills: { explorador: 0, atleta: 0, sabio: 0, cidadao: 0 },
    marcos: [], dificuldade: "cidadao",
    cadeia: 0, cadeiaQuiz: 0, cadeiaVisitados: [], cadeiaNoite: false,
  };
}

const K_PERFIL = "bateu_cidade_perfil";

export function lerPerfil(): Perfil {
  try {
    const raw = localStorage.getItem(K_PERFIL);
    if (raw) {
      const p = JSON.parse(raw) as Perfil;
      if (p && p.versao === 38) {
        return {
          ...perfilNovo(),
          ...p,
          skills: { ...perfilNovo().skills, ...(p.skills ?? {}) },
        };
      }
    }
  } catch { /* estado novo */ }
  return perfilNovo();
}

export function guardarPerfil(p: Perfil): boolean {
  let ok = false;
  try { localStorage.setItem(K_PERFIL, JSON.stringify(p)); ok = true; }
  catch { /* quota — o espelho IDB (abaixo) é o armazém resiliente desde a v39 */ }
  // v39 — espelho IndexedDB: o progresso (agora com XP/marcos/cadeia)
  // sobrevive a limpezas de localStorage. Fire-and-forget; falha nunca é
  // silenciosa para quem pedir (restaurarPerfilDeIDB devolve o estado real).
  void idbDefinir(K_PERFIL, p);
  return ok;
}

/** v39 — repõe o perfil do IDB quando o localStorage o perdeu (limpeza
 *  do browser, modo privado). true = reposto; false = LS são ou nada válido. */
export function restaurarPerfilDeIDB(): Promise<boolean> {
  return restaurarLSdeIDB(K_PERFIL, K_PERFIL,
    (v) => !!v && v.versao === 38 && typeof v.xp === "number");
}

/** Nível atual dado o XP total (soma dos custos 1..n). */
export function nivelDeXP(xp: number): number {
  let nivel = 1, resta = Math.max(0, Math.floor(xp));
  while (resta >= custoProximoNivel(nivel) && nivel < 99) { resta -= custoProximoNivel(nivel); nivel++; }
  return nivel;
}

/** XP já gasto nos níveis alcançados (para barra de progresso). */
export function xpNoNivel(xp: number): { noNivel: number; custo: number } {
  let nivel = 1, resta = Math.max(0, Math.floor(xp));
  while (resta >= custoProximoNivel(nivel) && nivel < 99) { resta -= custoProximoNivel(nivel); nivel++; }
  return { noNivel: resta, custo: custoProximoNivel(nivel) };
}

export interface EventoXP {
  perfil: Perfil;
  subiuDe?: number;   // nível anterior, se subiu
  subiuPara?: number;
  pontosGanhos: number;
}

/** Ganha XP real (só chamar após atividade verificada). Aplica multXP da
 *  dificuldade. Subida de nível = +1 ponto (padrão add_experience→SP). */
export function ganharXP(p: Perfil, quantidade: number, dif?: Dificuldade): EventoXP {
  const q = Number.isFinite(quantidade) ? Math.max(0, Math.floor(quantidade)) : 0;
  const mult = DIFICULDADES[dif ?? p.dificuldade].multXP;
  const antes = nivelDeXP(p.xp);
  p.xp += Math.max(0, Math.round(q * mult));
  const depois = nivelDeXP(p.xp);
  const ganhos = depois - antes;
  let pontosGanhos = 0;
  if (ganhos > 0) { p.pontos += ganhos; pontosGanhos = ganhos; }
  guardarPerfil(p);
  return {
    perfil: p, pontosGanhos,
    ...(ganhos > 0 ? { subiuDe: antes, subiuPara: depois } : {}),
  };
}

/** Gasta 1 ponto para subir uma competência (devolve null se impossível). */
export function gastarPonto(p: Perfil, ramo: Ramo): Perfil | null {
  if (p.pontos < 1) return null;
  if (p.skills[ramo] >= NIVEL_MAX_RAMO) return null;
  p.pontos -= 1;
  p.skills[ramo] += 1;
  guardarPerfil(p);
  return p;
}

// ── Efeitos REAIS das competências (nada cosmético) ──────────
/** Atleta: velocidade real do jogador (motor escalaVel). Máx 1.18 →
 *  5.9×1.18 ≈ 6.96 b/s, abaixo do orçamento MAX_VEL=12 do servidor v37. */
export function escalaVelocidade(p: Perfil): number {
  return 1 + 0.06 * p.skills.atleta;
}
/** Sábio: +1 crédito por acerto de quiz por nível (além dos 2 base). */
export function bonusQuizCreditos(p: Perfil): number {
  return p.skills.sabio;
}
/** Cidadão: +2 créditos por missão diária por nível. */
export function bonusCreditoMissao(p: Perfil): number {
  return 2 * p.skills.cidadao;
}
/** Explorador: multiplicador de XP de descobertas e visitas. */
export function multXPExploracao(p: Perfil): number {
  return 1 + 0.10 * p.skills.explorador;
}
