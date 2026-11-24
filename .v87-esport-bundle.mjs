// src/lib/esport.ts
var CHAVE_ESPORT = "bateu_esport_v1";
var TETO_TORNEIOS = 12;
var TETO_LIGAS = 8;
function lsLer(chave) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(chave) : null;
  } catch {
    return null;
  }
}
function lsGuardar(chave, valor) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(chave, valor);
  } catch {
  }
}
function lerEsport() {
  try {
    const raw = lsLer(CHAVE_ESPORT);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.torneios) && Array.isArray(p.ligas)) return p;
    }
  } catch {
  }
  return { torneios: [], ligas: [], ts: 0 };
}
function guardarEsport(e) {
  e.ts = Date.now();
  lsGuardar(CHAVE_ESPORT, JSON.stringify(e));
}
var JOGOS_ESPORT = [
  { id: "kart", label: "BATEU KART: Circuito das Lendas", temCampo: true },
  { id: "tetris", label: "Tetris", temCampo: false },
  { id: "chess", label: "Xadrez", temCampo: false },
  { id: "checkers", label: "Damas", temCampo: false },
  { id: "connect4", label: "Ligar 4", temCampo: false },
  { id: "snakebattle", label: "Batalha de Cobras", temCampo: false },
  { id: "spaceshooter", label: "Guerra Espacial", temCampo: false },
  { id: "dominoes", label: "Domin\xF3", temCampo: false },
  { id: "urusse", label: "Urusse", temCampo: false },
  { id: "tictactoepro", label: "Galo PRO", temCampo: false }
];
function jogoEsport(id) {
  return JOGOS_ESPORT.find((j) => j.id === id) ?? null;
}
var RIVAIS_IA = ["Kudisso", "Zapata", "Makuti", "Ndove", "Turbo Tia", "Capalanga", "Xitique", "Djakba", "Maningue", "Bu\xE9 R\xE1pido", "Marimba"];
var PONTOS_POSICAO = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];
function pontosPorPosicao(posicao) {
  const i = Math.round(posicao) - 1;
  if (!Number.isFinite(i) || i < 0 || i >= PONTOS_POSICAO.length) return 0;
  return PONTOS_POSICAO[i];
}
var TETO_PONTOS_PARTIDA_SEM_CAMPO = 25;
var PREMIO_MIN = 100;
var PREMIO_MAX = 5e3;
var JANELA_MIN_DIAS = 1;
var JANELA_MAX_DIAS = 30;
var CORES_MARCA = ["#e0453a", "#31c46c", "#2ea043", "#9b3de0", "#ff5a2a", "#e6b31e", "#3ddc55", "#40c4ff", "#ff4081", "#e0b31e"];
function validaTorneio(i) {
  const nome = (i.nome ?? "").trim();
  if (nome.length < 4 || nome.length > 40) return { sim: false, motivo: "nome 4-40" };
  if (!jogoEsport(i.jogo)) return { sim: false, motivo: "jogo desconhecido" };
  if (i.formato !== "campeonato" && i.formato !== "eliminatoria") return { sim: false, motivo: "formato inv\xE1lido" };
  if (i.formato === "eliminatoria" && i.tamanho !== 4 && i.tamanho !== 8) return { sim: false, motivo: "eliminat\xF3ria 4 ou 8" };
  if (i.tamanho !== 4 && i.tamanho !== 8 && i.tamanho !== 12) return { sim: false, motivo: "tamanho 4/8/12" };
  if (!Number.isFinite(i.premioPontos) || i.premioPontos < PREMIO_MIN || i.premioPontos > PREMIO_MAX) return { sim: false, motivo: `pr\xE9mio ${PREMIO_MIN}-${PREMIO_MAX}` };
  if (i.jogo === "kart" && !["praia", "deserto", "vulcao", "qualquer"].includes(i.pista)) return { sim: false, motivo: "pista inv\xE1lida" };
  if (i.jogo === "kart" && ![3, 4, 5].includes(i.voltas)) return { sim: false, motivo: "voltas 3-5" };
  if (!Number.isFinite(i.janelaDias) || i.janelaDias < JANELA_MIN_DIAS || i.janelaDias > JANELA_MAX_DIAS) return { sim: false, motivo: `janela ${JANELA_MIN_DIAS}-${JANELA_MAX_DIAS} dias` };
  if (i.organizadorEmpresa) {
    const emp = (i.empresaNome ?? "").trim();
    if (emp.length < 2 || emp.length > 24) return { sim: false, motivo: "nome da empresa 2-24" };
    if ((i.empresaSector ?? "").trim().length < 2) return { sim: false, motivo: "sector 2-24" };
  }
  return { sim: true, motivo: "" };
}
function validaLiga(i) {
  const nome = (i.nome ?? "").trim();
  if (nome.length < 4 || nome.length > 40) return { sim: false, motivo: "nome 4-40" };
  if (!jogoEsport(i.jogo)) return { sim: false, motivo: "jogo desconhecido" };
  if (!Number.isFinite(i.premioPontos) || i.premioPontos < PREMIO_MIN || i.premioPontos > PREMIO_MAX) return { sim: false, motivo: `pr\xE9mio ${PREMIO_MIN}-${PREMIO_MAX}` };
  if (!Number.isFinite(i.janelaDias) || i.janelaDias < JANELA_MIN_DIAS || i.janelaDias > JANELA_MAX_DIAS) return { sim: false, motivo: `janela ${JANELA_MIN_DIAS}-${JANELA_MAX_DIAS} dias` };
  if (i.organizadorEmpresa) {
    const emp = (i.empresaNome ?? "").trim();
    if (emp.length < 2 || emp.length > 24) return { sim: false, motivo: "nome da empresa 2-24" };
    if ((i.empresaSector ?? "").trim().length < 2) return { sim: false, motivo: "sector 2-24" };
  }
  return { sim: true, motivo: "" };
}
function organizadorDe(i) {
  if (!i.organizadorEmpresa) {
    return { tipo: "jogador", nome: "Eu", sector: "Piloto", cor: "#f97316", iniciais: "EU" };
  }
  const nome = i.empresaNome.trim();
  const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "empresa";
  const iniciais = nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "EM";
  return {
    tipo: "empresa",
    nome,
    sector: (i.empresaSector || "Patroc\xEDnio").trim().slice(0, 24),
    cor: CORES_MARCA[Math.abs(hashSlug(slug)) % CORES_MARCA.length],
    iniciais: iniciais.slice(0, 3)
  };
}
function hashSlug(s) {
  let h = 0;
  for (let k = 0; k < s.length; k++) h = h * 31 + s.charCodeAt(k) | 0;
  return h;
}
function criarTorneio(input, agoraMs = Date.now()) {
  const v = validaTorneio(input);
  if (!v.sim) return { t: null, motivo: v.motivo };
  const estado = lerEsport();
  if (estado.torneios.length >= TETO_TORNEIOS) return { t: null, motivo: `teto de ${TETO_TORNEIOS} torneios no aparelho` };
  const elim = input.formato === "eliminatoria";
  const t = {
    id: `local-${input.jogo}-${agoraMs.toString(36)}-${(hashSlug(input.nome) >>> 0).toString(36)}`,
    nome: input.nome.trim(),
    jogo: input.jogo,
    formato: input.formato,
    tamanho: input.tamanho,
    organizador: organizadorDe(input),
    premioPontos: Math.round(input.premioPontos),
    pista: input.jogo === "kart" ? input.pista : "qualquer",
    voltas: input.jogo === "kart" ? Math.round(input.voltas) : 4,
    estado: "inscricao",
    criadoEm: agoraMs,
    terminaEm: agoraMs + Math.round(input.janelaDias) * 864e5,
    participantes: [],
    ronda: 0,
    rondasTotal: elim ? input.tamanho === 8 ? 2 : 2 : 0,
    vencedorId: "",
    premioReclamado: false,
    historico: [{ em: agoraMs, texto: `Torneio criado por ${input.organizadorEmpresa ? input.empresaNome.trim() : "jogador"}` }]
  };
  estado.torneios.push(t);
  guardarEsport(estado);
  return { t, motivo: "" };
}
var EU_ID = "eu";
function inscreverTorneio(id, meuNome = "Eu", agoraMs = Date.now()) {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t) return { ok: false, motivo: "torneio n\xE3o encontrado" };
  if (t.estado !== "inscricao") return { ok: false, motivo: "inscri\xE7\xF5es fechadas" };
  if (t.participantes.some((p) => p.id === EU_ID)) return { ok: false, motivo: "j\xE1 inscrito" };
  t.participantes.push({ id: EU_ID, nome: meuNome.trim() || "Eu", pontos: 0, vitorias: 0, partidas: 0, eBot: false });
  t.historico.push({ em: agoraMs, texto: "Inscri\xE7\xE3o confirmada" });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}
function iniciarTorneio(id, agoraMs = Date.now()) {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t) return { ok: false, motivo: "torneio n\xE3o encontrado" };
  if (t.estado !== "inscricao") return { ok: false, motivo: "j\xE1 iniciado" };
  if (!t.participantes.some((p) => p.id === EU_ID)) return { ok: false, motivo: "inscreve-te primeiro" };
  const faltam = t.tamanho - t.participantes.length;
  for (let k = 0; k < faltam; k++) {
    const nome = RIVAIS_IA[k % RIVAIS_IA.length];
    t.participantes.push({ id: `ia-${k}`, nome, pontos: 0, vitorias: 0, partidas: 0, eBot: true });
  }
  t.estado = "ativo";
  t.ronda = t.formato === "eliminatoria" ? 1 : 0;
  t.historico.push({ em: agoraMs, texto: `Arranque \u2014 ${t.participantes.length} competidores (${t.participantes.filter((p) => p.eBot).length} rivais IA)` });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}
function expirarPendentes(agoraMs = Date.now()) {
  const estado = lerEsport();
  const torneiosFechados = [];
  const ligasFechadas = [];
  for (const t of estado.torneios) {
    if (t.estado === "terminado") continue;
    if (agoraMs < t.terminaEm) continue;
    if (t.formato === "campeonato") {
      t.estado = "terminado";
      const ordem = [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
      t.vencedorId = ordem[0]?.id ?? "";
      t.historico.push({ em: agoraMs, texto: `Janela fechada \u2014 campe\xE3o: ${ordem[0]?.nome ?? "\u2014"}` });
      torneiosFechados.push(t);
    } else if (t.estado === "inscricao") {
      t.estado = "terminado";
      t.historico.push({ em: agoraMs, texto: "Janela fechada sem arranque \u2014 ningu\xE9m competiu" });
      torneiosFechados.push(t);
    }
  }
  for (const l of estado.ligas) {
    if (l.estado === "terminado") continue;
    if (agoraMs < l.terminaEm) continue;
    l.estado = "terminado";
    const ordem = [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
    l.campeaoId = ordem[0]?.id ?? "";
    l.historico.push({ em: agoraMs, texto: `Temporada fechada \u2014 campe\xE3o: ${ordem[0]?.nome ?? "\u2014"}` });
    ligasFechadas.push(l);
  }
  if (torneiosFechados.length || ligasFechadas.length) guardarEsport(estado);
  return { torneiosFechados, ligasFechadas };
}
function partidaParaTorneios(partida, agoraMs = Date.now()) {
  if (!partida || typeof partida.jogoId !== "string") return [];
  expirarPendentes(agoraMs);
  const estado = lerEsport();
  const terminados = [];
  for (const t of estado.torneios) {
    if (t.estado !== "ativo" || t.jogo !== partida.jogoId) continue;
    if (t.formato === "campeonato") {
      aplicarPartidaCampeonato(t, partida, agoraMs);
      if (agoraMs >= t.terminaEm) {
        t.estado = "terminado";
        const ordem = [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
        t.vencedorId = ordem[0]?.id ?? "";
        t.historico.push({ em: agoraMs, texto: `Campeonato fechado \u2014 campe\xE3o: ${ordem[0]?.nome ?? "\u2014"}` });
        terminados.push(t.id);
      }
    } else {
      const res = avancarEliminatoria(t, partida, agoraMs);
      if (res === "terminado-campeao" || res === "terminado-eliminado") terminados.push(t.id);
    }
  }
  guardarEsport(estado);
  return terminados;
}
function participanteDoCampo(t, r) {
  if (r.id === EU_ID) return t.participantes.find((p) => !p.eBot) ?? null;
  return t.participantes.find((p) => p.eBot && p.nome === r.nome) ?? null;
}
function aplicarPartidaCampeonato(t, partida, agoraMs) {
  if (partida.campo && partida.campo.length > 0) {
    for (const r of partida.campo) {
      const p = participanteDoCampo(t, r);
      if (!p) continue;
      const pts = pontosPorPosicao(r.posicao);
      p.pontos += pts;
      p.partidas += 1;
      if (r.posicao === 1) p.vitorias += 1;
    }
  } else {
    const eu = t.participantes.find((x) => x.id === EU_ID);
    if (eu) {
      eu.pontos += Math.min(TETO_PONTOS_PARTIDA_SEM_CAMPO, Math.max(0, Math.round(partida.pontos)));
      eu.partidas += 1;
      if (partida.vitoria) eu.vitorias += 1;
    }
  }
  t.historico.push({ em: agoraMs, texto: `Partida de ${partida.jogoId} contabilizada` });
  if (t.historico.length > 40) t.historico = t.historico.slice(-40);
}
function corteRonda(t) {
  if (t.formato !== "eliminatoria") return 0;
  return corteDeRonda(t.tamanho, t.ronda, t.rondasTotal);
}
function corteDeRonda(tamanho, ronda, rondasTotal) {
  if (ronda >= rondasTotal) return 1;
  return Math.max(1, Math.round(tamanho / Math.pow(2, ronda)));
}
function estadosBracket(t) {
  if (t.formato !== "eliminatoria") return [];
  const n = Math.max(1, t.rondasTotal);
  const eu = t.participantes.find((p) => p && p.id === EU_ID);
  const rondaElim = t.estado === "terminado" && eu && typeof eu.rondaEliminado === "number" ? eu.rondaEliminado : null;
  const campeao = t.estado === "terminado" && t.vencedorId === EU_ID;
  const inscrito = Boolean(eu);
  if (t.estado === "inscricao" || t.estado === "terminado" && !campeao && rondaElim == null && !inscrito) {
    return Array.from({ length: n }, () => "pendente");
  }
  const out = [];
  for (let r = 1; r <= n; r++) {
    if (campeao) {
      out.push(r === n ? "campeao" : "passou");
      continue;
    }
    if (rondaElim != null) {
      out.push(r < rondaElim ? "passou" : r === rondaElim ? "eliminado" : "pendente");
      continue;
    }
    if (t.estado === "terminado") {
      out.push("pendente");
      continue;
    }
    if (r < t.ronda) out.push("passou");
    else if (r === t.ronda) out.push("emCurso");
    else out.push("pendente");
  }
  return out;
}
function avancarEliminatoria(t, partida, agoraMs) {
  if (!partida.campo || partida.campo.length === 0) return "ok";
  const corte = corteRonda(t);
  const minha = partida.campo.find((r) => r.id === EU_ID);
  if (!minha) return "ok";
  const eu = t.participantes.find((x) => x.id === EU_ID);
  if (!eu) return "ok";
  eu.partidas += 1;
  if (minha.posicao === 1) eu.vitorias += 1;
  const avanca = minha.posicao <= corte;
  if (!avanca) {
    eu.rondaEliminado = t.ronda;
    t.estado = "terminado";
    t.historico.push({ em: agoraMs, texto: `Eliminado na ronda ${t.ronda} (corte top ${corte}, chegou ${minha.posicao}\xBA)` });
    return "terminado-eliminado";
  }
  if (t.ronda >= t.rondasTotal) {
    t.estado = "terminado";
    t.vencedorId = EU_ID;
    t.historico.push({ em: agoraMs, texto: "CAMPE\xC3O \u2014 venceu a final (1.\xBA no corte)" });
    return "terminado-campeao";
  }
  t.historico.push({ em: agoraMs, texto: `Ronda ${t.ronda} ultrapassada (corte top ${corte}, chegou ${minha.posicao}\xBA) \u2192 ronda ${t.ronda + 1}` });
  t.ronda += 1;
  return "ok";
}
function criarLiga(input, agoraMs = Date.now()) {
  const v = validaLiga(input);
  if (!v.sim) return { l: null, motivo: v.motivo };
  const estado = lerEsport();
  if (estado.ligas.length >= TETO_LIGAS) return { l: null, motivo: `teto de ${TETO_LIGAS} ligas no aparelho` };
  const temporadaN = estado.ligas.filter((l2) => l2.jogo === input.jogo).length + 1;
  const l = {
    id: `local-liga-${input.jogo}-${agoraMs.toString(36)}-${(hashSlug(input.nome) >>> 0).toString(36)}`,
    nome: input.nome.trim(),
    jogo: input.jogo,
    temporada: `Temporada ${temporadaN}`,
    organizador: organizadorDe(input),
    premioPontos: Math.round(input.premioPontos),
    criadoEm: agoraMs,
    terminaEm: agoraMs + Math.round(input.janelaDias) * 864e5,
    estado: "ativo",
    pontuacao: [],
    campeaoId: "",
    premioReclamado: false,
    historico: [{ em: agoraMs, texto: `Liga criada por ${input.organizadorEmpresa ? input.empresaNome.trim() : "jogador"}` }]
  };
  estado.ligas.push(l);
  guardarEsport(estado);
  return { l, motivo: "" };
}
function inscreverLiga(id, meuNome = "Eu", agoraMs = Date.now()) {
  const estado = lerEsport();
  const l = estado.ligas.find((x) => x.id === id);
  if (!l) return { ok: false, motivo: "liga n\xE3o encontrada" };
  if (l.estado !== "ativo") return { ok: false, motivo: "temporada fechada" };
  if (agoraMs >= l.terminaEm) return { ok: false, motivo: "temporada expirada" };
  if (l.pontuacao.some((p) => p.id === EU_ID)) return { ok: false, motivo: "j\xE1 inscrito" };
  l.pontuacao.push({ id: EU_ID, nome: meuNome.trim() || "Eu", pontos: 0, vitorias: 0, partidas: 0, eBot: false });
  l.historico.push({ em: agoraMs, texto: "Inscri\xE7\xE3o confirmada" });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}
function partidaParaLigas(partida, agoraMs = Date.now()) {
  if (!partida || typeof partida.jogoId !== "string") return [];
  expirarPendentes(agoraMs);
  const estado = lerEsport();
  const terminadas = [];
  for (const l of estado.ligas) {
    if (l.estado !== "ativo" || l.jogo !== partida.jogoId) continue;
    if (agoraMs >= l.terminaEm) continue;
    const eu = l.pontuacao.find((p) => p.id === EU_ID);
    if (eu) {
      if (partida.campo && partida.campo.length > 0) {
        const minha = partida.campo.find((r) => r.id === EU_ID);
        if (minha) {
          eu.pontos += pontosPorPosicao(minha.posicao);
          eu.partidas += 1;
          if (minha.posicao === 1) eu.vitorias += 1;
        }
      } else {
        eu.pontos += Math.min(TETO_PONTOS_PARTIDA_SEM_CAMPO, Math.max(0, Math.round(partida.pontos)));
        eu.partidas += 1;
        if (partida.vitoria) eu.vitorias += 1;
      }
      l.historico.push({ em: agoraMs, texto: `Partida de ${partida.jogoId} contabilizada` });
      if (l.historico.length > 40) l.historico = l.historico.slice(-40);
    }
    if (agoraMs >= l.terminaEm) {
      l.estado = "terminado";
      const ordem = [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
      l.campeaoId = ordem[0]?.id ?? "";
      l.historico.push({ em: agoraMs, texto: `Temporada fechada \u2014 campe\xE3o: ${ordem[0]?.nome ?? "\u2014"}` });
      terminadas.push(l.id);
    }
  }
  guardarEsport(estado);
  return terminadas;
}
function podeClamarTorneio(id) {
  const { torneios } = lerEsport();
  const t = torneios.find((x) => x.id === id);
  return !!t && t.estado === "terminado" && t.vencedorId === EU_ID && !t.premioReclamado;
}
function clamarPremioTorneio(id, agoraMs = Date.now()) {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t || !podeClamarTorneio(id)) return null;
  t.premioReclamado = true;
  t.historico.push({ em: agoraMs, texto: `Pr\xE9mio clamado: ${t.premioPontos} Pontos Bateu` });
  guardarEsport(estado);
  return { pontos: t.premioPontos };
}
function podeClamarLiga(id) {
  const { ligas } = lerEsport();
  const l = ligas.find((x) => x.id === id);
  return !!l && l.estado === "terminado" && l.campeaoId === EU_ID && !l.premioReclamado;
}
function clamarPremioLiga(id, agoraMs = Date.now()) {
  const estado = lerEsport();
  const l = estado.ligas.find((x) => x.id === id);
  if (!l || !podeClamarLiga(id)) return null;
  l.premioReclamado = true;
  l.historico.push({ em: agoraMs, texto: `Pr\xE9mio clamado: ${l.premioPontos} Pontos Bateu` });
  guardarEsport(estado);
  return { pontos: l.premioPontos };
}
var busInstalado = false;
function ouvirPartidasEsport() {
  if (busInstalado || typeof window === "undefined") return;
  busInstalado = true;
  const onPartida = (ev) => {
    const d = ev.detail;
    if (!d || typeof d.jogoId !== "string") return;
    const partida = {
      jogoId: d.jogoId,
      pontos: typeof d.pontos === "number" && Number.isFinite(d.pontos) ? d.pontos : 0,
      vitoria: d.vitoria === true,
      posicao: typeof d.posicao === "number" ? d.posicao : void 0,
      total: typeof d.total === "number" ? d.total : void 0,
      campo: Array.isArray(d.campo) ? d.campo.filter((r) => r && typeof r.id === "string" && Number.isFinite(r.posicao)) : void 0
    };
    try {
      partidaParaTorneios(partida);
    } catch {
    }
    try {
      partidaParaLigas(partida);
    } catch {
    }
  };
  window.addEventListener("bateu:partida", onPartida);
}
function torneiosDoAparelho() {
  expirarPendentes();
  return lerEsport().torneios.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}
function ligasDoAparelho() {
  expirarPendentes();
  return lerEsport().ligas.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}
function torneioPorId(id) {
  expirarPendentes();
  return lerEsport().torneios.find((x) => x.id === id) ?? null;
}
function ligaPorId(id) {
  expirarPendentes();
  return lerEsport().ligas.find((x) => x.id === id) ?? null;
}
function classificacaoTorneio(t) {
  return [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));
}
function classificacaoLiga(l) {
  return [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));
}
export {
  CHAVE_ESPORT,
  JANELA_MAX_DIAS,
  JANELA_MIN_DIAS,
  JOGOS_ESPORT,
  PONTOS_POSICAO,
  PREMIO_MAX,
  PREMIO_MIN,
  RIVAIS_IA,
  TETO_LIGAS,
  TETO_PONTOS_PARTIDA_SEM_CAMPO,
  TETO_TORNEIOS,
  clamarPremioLiga,
  clamarPremioTorneio,
  classificacaoLiga,
  classificacaoTorneio,
  corteDeRonda,
  corteRonda,
  criarLiga,
  criarTorneio,
  estadosBracket,
  expirarPendentes,
  iniciarTorneio,
  inscreverLiga,
  inscreverTorneio,
  jogoEsport,
  lerEsport,
  ligaPorId,
  ligasDoAparelho,
  ouvirPartidasEsport,
  partidaParaLigas,
  partidaParaTorneios,
  podeClamarLiga,
  podeClamarTorneio,
  pontosPorPosicao,
  torneioPorId,
  torneiosDoAparelho,
  validaLiga,
  validaTorneio
};
