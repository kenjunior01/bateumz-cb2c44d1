// src/lib/esport.ts
var CHAVE_ESPORT = "bateu_esport_v1";
function lsLer(chave) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(chave) : null;
  } catch {
    return null;
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

// src/lib/trofeus.ts
var EU = "eu";
function fechadoEmDe(f) {
  const hs = Array.isArray(f.historico) ? f.historico : [];
  let melhor = -1;
  for (const h of hs) {
    if (h && Number.isFinite(h.em) && h.em >= f.terminaEm && (melhor === -1 || h.em < melhor)) melhor = h.em;
  }
  return melhor !== -1 ? melhor : f.terminaEm;
}
function organizadorPodre(o) {
  if (!o || typeof o !== "object") return true;
  const x = o;
  return typeof x.nome !== "string" || typeof x.cor !== "string" || typeof x.iniciais !== "string";
}
function ordemDe(linhas) {
  return [...linhas].filter((p) => p && typeof p.id === "string" && Number.isFinite(p.pontos)).sort((a, b) => b.pontos - a.pontos || (b.vitorias ?? 0) - (a.vitorias ?? 0));
}
function trofeusDoAparelho(_agoraMs = Date.now()) {
  const e = lerEsport();
  const trofeus = [];
  let podios = 0;
  let competicoes = 0;
  for (const t of e.torneios) {
    if (!t || typeof t.id !== "string" || typeof t.nome !== "string" || !Array.isArray(t.participantes)) continue;
    if (organizadorPodre(t.organizador)) continue;
    const eu = t.participantes.find((p) => p && p.id === EU);
    if (eu) competicoes += 1;
    if (t.estado !== "terminado") continue;
    const ordem = ordemDe(t.participantes);
    const posEu = ordem.findIndex((p) => p.id === EU);
    const eCampeao = t.vencedorId === EU && posEu === 0;
    if (eCampeao) {
      trofeus.push({
        id: `torneio-${t.id}`,
        tipo: "torneio",
        nome: t.nome,
        jogoId: t.jogo,
        jogoLabel: jogoEsport(t.jogo)?.label ?? t.jogo,
        organizador: t.organizador,
        premioPontos: t.premioPontos,
        formato: t.formato,
        fechadoEm: fechadoEmDe(t)
      });
    } else if (t.formato === "campeonato" && (posEu === 1 || posEu === 2)) {
      podios += 1;
    }
  }
  for (const l of e.ligas) {
    if (!l || typeof l.id !== "string" || typeof l.nome !== "string" || !Array.isArray(l.pontuacao)) continue;
    if (organizadorPodre(l.organizador)) continue;
    const eu = l.pontuacao.find((p) => p && p.id === EU);
    if (eu) competicoes += 1;
    if (l.estado !== "terminado") continue;
    const ordem = ordemDe(l.pontuacao);
    const posEu = ordem.findIndex((p) => p.id === EU);
    if (l.campeaoId === EU && posEu === 0) {
      trofeus.push({
        id: `liga-${l.id}`,
        tipo: "liga",
        nome: l.nome,
        jogoId: l.jogo,
        jogoLabel: jogoEsport(l.jogo)?.label ?? l.jogo,
        organizador: l.organizador,
        premioPontos: l.premioPontos,
        formato: "liga",
        fechadoEm: fechadoEmDe(l)
      });
    } else if (posEu === 1 || posEu === 2) {
      podios += 1;
    }
  }
  trofeus.sort((a, b) => b.fechadoEm - a.fechadoEm);
  return { trofeus, podios, competicoes };
}
export {
  trofeusDoAparelho
};
