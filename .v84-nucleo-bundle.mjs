// src/lib/progressao.ts
var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
var NIVEIS = [
  { nivel: 1, nome: "Novo jogador", pontos: 0, desbloqueia: ["avatar-classico"] },
  { nivel: 2, nome: "Explorador", pontos: 500, desbloqueia: ["moldura-bronze", "tema-praia"] },
  { nivel: 3, nome: "Competidor", pontos: 2e3, desbloqueia: ["moldura-prata", "acesso-torneios", "titulo-competidor"] },
  { nivel: 4, nome: "Campe\xE3o", pontos: 6e3, desbloqueia: ["moldura-ouro", "missoes-especiais", "titulo-campeao"] },
  { nivel: 5, nome: "Lenda Bateu", pontos: 15e3, desbloqueia: ["moldura-lenda", "titulo-lenda", "prioridade-campanhas"] }
];
var NIVEL_MAX = NIVEIS[NIVEIS.length - 1].nivel;
var VERSAO_PROGRESSAO = 1;
function estadoPadrao(jogadorId = "") {
  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId,
    pontos: 0,
    corridas: 0,
    diaContador: "",
    jogosHoje: [],
    vitoriasHoje: 0,
    missoes: [],
    missoesConcluidasTotal: 0,
    ultimaAtividade: 0
  };
}
function hidratarProgressao(cru, jogadorIdAgora = "") {
  const base = estadoPadrao(jogadorIdAgora);
  if (typeof cru !== "object" || cru === null) return base;
  const o = cru;
  const num = (v, min = 0) => typeof v === "number" && Number.isFinite(v) && v >= min ? Math.floor(v) : null;
  const dia = typeof o.diaContador === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.diaContador) ? o.diaContador : "";
  const jogos = Array.isArray(o.jogosHoje) ? o.jogosHoje.filter((x) => typeof x === "string" && x.length > 0 && x.length <= 40).slice(0, 60) : [];
  const missoes = Array.isArray(o.missoes) ? o.missoes.slice(0, 12).flatMap((mm) => {
    if (typeof mm !== "object" || mm === null) return [];
    const id = typeof mm.id === "string" ? mm.id.slice(0, 60) : "";
    const modelo = typeof mm.modelo === "string" ? mm.modelo.slice(0, 40) : "";
    const titulo = typeof mm.titulo === "string" ? mm.titulo.slice(0, 120) : "";
    const alvo = num(mm.alvo, 1);
    const pontos = num(mm.pontos, 1);
    if (!id || !modelo || !titulo || !alvo || !pontos) return [];
    return [{
      id,
      modelo,
      titulo,
      jogoId: typeof mm.jogoId === "string" ? mm.jogoId.slice(0, 40) : null,
      jogosDistintos: num(mm.jogosDistintos) ?? 0,
      alvo,
      progresso: clamp(num(mm.progresso) ?? 0, 0, alvo),
      pontos,
      criadaEm: num(mm.criadaEm) ?? 0,
      terminaEm: num(mm.terminaEm) ?? 0,
      reclamada: mm.reclamada === true
    }];
  }) : [];
  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId: typeof o.jogadorId === "string" ? o.jogadorId.slice(0, 60) : jogadorIdAgora,
    pontos: num(o.pontos) ?? 0,
    corridas: num(o.corridas) ?? 0,
    diaContador: dia,
    jogosHoje: jogos,
    vitoriasHoje: num(o.vitoriasHoje) ?? 0,
    missoes,
    missoesConcluidasTotal: num(o.missoesConcluidasTotal) ?? 0,
    ultimaAtividade: num(o.ultimaAtividade) ?? 0
  };
}

// src/lib/progressaoConta.ts
var LIMITES_PROGRESSAO_CONTA = {
  USER_ID_CAP: 60,
  JOGADOR_ID_CAP: 60,
  PONTOS_CAP: 2e6,
  MISSOES_CONCLUIDAS_CAP: 1e5,
  MISSOES_CAP: 12,
  JOGOS_HOJE_CAP: 60
};
var CODIGO_MIGRACAO_PENDENTE = "PGRST205";
function chaveCacheConta(userId) {
  const id = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, LIMITES_PROGRESSAO_CONTA.USER_ID_CAP);
  return `bateu_progressao_v78:u:${id}`;
}
function mesclarMissoes(a, b) {
  const porModelo = /* @__PURE__ */ new Map();
  for (const mm of [...a, ...b]) {
    if (!mm || typeof mm.modelo !== "string" || !mm.modelo) continue;
    const atual = porModelo.get(mm.modelo);
    if (!atual) {
      porModelo.set(mm.modelo, mm);
      continue;
    }
    porModelo.set(mm.modelo, escolherMissao(atual, mm));
  }
  const lista = [...porModelo.values()].slice(0, LIMITES_PROGRESSAO_CONTA.MISSOES_CAP);
  return lista;
}
function escolherMissao(a, b) {
  if (a.reclamada !== b.reclamada) return a.reclamada ? a : b;
  if (a.progresso !== b.progresso) return a.progresso > b.progresso ? a : b;
  return a.terminaEm >= b.terminaEm ? a : b;
}
function mesclarEstados(a, b, agoraMs) {
  const dia = (() => {
    const d = new Date(agoraMs);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  })();
  const aHoje = a.diaContador === dia;
  const bHoje = b.diaContador === dia;
  let corridas = 0, vitoriasHoje = 0, jogosHoje = [], diaContador = "";
  if (aHoje && bHoje) {
    corridas = Math.max(a.corridas, b.corridas);
    vitoriasHoje = Math.max(a.vitoriasHoje, b.vitoriasHoje);
    jogosHoje = [.../* @__PURE__ */ new Set([...a.jogosHoje, ...b.jogosHoje])].slice(0, LIMITES_PROGRESSAO_CONTA.JOGOS_HOJE_CAP);
    diaContador = dia;
  } else if (aHoje) {
    corridas = a.corridas;
    vitoriasHoje = a.vitoriasHoje;
    jogosHoje = [...a.jogosHoje];
    diaContador = dia;
  } else if (bHoje) {
    corridas = b.corridas;
    vitoriasHoje = b.vitoriasHoje;
    jogosHoje = [...b.jogosHoje];
    diaContador = dia;
  }
  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId: a.jogadorId || b.jogadorId,
    pontos: Math.max(a.pontos, b.pontos),
    corridas,
    diaContador,
    jogosHoje,
    vitoriasHoje,
    missoes: mesclarMissoes(a.missoes, b.missoes),
    missoesConcluidasTotal: Math.max(a.missoesConcluidasTotal, b.missoesConcluidasTotal),
    ultimaAtividade: Math.max(a.ultimaAtividade, b.ultimaAtividade)
  };
}
function absorverConvidado(estadoConta, estadoConvidado, userId, agoraMs) {
  const unido = mesclarEstados(estadoConta, estadoConvidado, agoraMs);
  return { ...unido, jogadorId: userId };
}
function userIdValido(userId) {
  return typeof userId === "string" && userId.length > 0 && userId.length <= LIMITES_PROGRESSAO_CONTA.USER_ID_CAP;
}
function estadoParaLinha(e, userId) {
  if (!userIdValido(userId)) return null;
  const limpo = hidratarProgressao({ pontos: e.pontos, missoes: e.missoes, missoesConcluidasTotal: e.missoesConcluidasTotal }, userId);
  return {
    user_id: userId,
    jogador_id: (e.jogadorId || userId).slice(0, LIMITES_PROGRESSAO_CONTA.JOGADOR_ID_CAP),
    pontos: Math.min(Math.max(0, Math.floor(limpo.pontos) || 0), LIMITES_PROGRESSAO_CONTA.PONTOS_CAP),
    missoes_concluidas_total: Math.min(Math.max(0, Math.floor(limpo.missoesConcluidasTotal) || 0), LIMITES_PROGRESSAO_CONTA.MISSOES_CONCLUIDAS_CAP),
    missoes: limpo.missoes.slice(0, LIMITES_PROGRESSAO_CONTA.MISSOES_CAP)
  };
}
function linhaParaEstado(linha, userId) {
  if (!userIdValido(userId)) return null;
  if (typeof linha !== "object" || linha === null) return null;
  const o = linha;
  if (typeof o.user_id !== "string" || o.user_id !== userId) return null;
  const hidratado = hidratarProgressao(
    { pontos: o.pontos, missoes: o.missoes, missoesConcluidasTotal: o.missoes_concluidas_total },
    userId
  );
  return { ...hidratado, jogadorId: userId };
}
function impressaoEstado(e) {
  return [
    e.pontos,
    e.missoesConcluidasTotal,
    e.jogadorId,
    ...e.missoes.map((mm) => `${mm.id}:${mm.progresso}:${mm.reclamada ? 1 : 0}`)
  ].join("|");
}
function deveEnviar(ultimoEnviado, estado) {
  return ultimoEnviado !== impressaoEstado(estado);
}
function estadoContaPadrao(userId) {
  return { ...estadoPadrao(userId) };
}
export {
  CODIGO_MIGRACAO_PENDENTE,
  LIMITES_PROGRESSAO_CONTA,
  absorverConvidado,
  chaveCacheConta,
  deveEnviar,
  estadoContaPadrao,
  estadoParaLinha,
  impressaoEstado,
  linhaParaEstado,
  mesclarEstados
};
