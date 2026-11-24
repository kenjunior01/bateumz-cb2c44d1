// probe v87: replicar passos 3-4 da suíte e imprimir o estado da liga
const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};
const { execFileSync } = await import("node:child_process");
execFileSync("npx", ["esbuild", "src/lib/esport.ts", "--bundle", "--format=esm", "--platform=neutral", "--outfile=.probe-v87-esport.mjs"], { stdio: "pipe" });
execFileSync("npx", ["esbuild", "src/lib/trofeus.ts", "--bundle", "--format=esm", "--platform=neutral", "--outfile=.probe-v87-trofeus.mjs"], { stdio: "pipe" });
const es = await import("/home/z/my-project/bateumz-cb2c44d1/.probe-v87-esport.mjs");
const tr2 = await import("/home/z/my-project/bateumz-cb2c44d1/.probe-v87-trofeus.mjs");
const AGORA = Date.now();

const baseT = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const campoRace = (minhaPos) => {
  const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== minhaPos);
  return ["eu", ...es.RIVAIS_IA].map((id, i) => ({
    id,
    nome: id === "eu" ? "Eu" : es.RIVAIS_IA[i - 1],
    posicao: id === "eu" ? minhaPos : resto[i - 1],
  }));
};
const r1 = es.criarTorneio({ ...baseT, nome: "Copa das Lendas de Sexta" }, AGORA);
es.inscreverTorneio(r1.t.id, "Eu", AGORA + 1);
es.iniciarTorneio(r1.t.id, AGORA + 2);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 3);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 4);
es.expirarPendentes(AGORA + 8 * 86_400_000);

const l1 = es.criarLiga({ nome: "Liga de Xadrez do Bairro", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA + 10);
console.log("liga criada:", l1.l?.id ?? l1.motivo);
console.log("inscrição liga:", JSON.stringify(es.inscreverLiga(l1.l.id, "Eu", AGORA + 11)));
console.log("partida liga → terminadas:", JSON.stringify(es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 12)));
const exp = es.expirarPendentes(AGORA + 15 * 86_400_000);
console.log("expirar → ligasFechadas:", exp.ligasFechadas.map((l) => `${l.nome} campeao=${l.campeaoId} estado=${l.estado}`));
const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
console.log("ligas na store:", st.ligas.map((l) => `${l.nome} | estado=${l.estado} | campeaoId=${l.campeaoId} | pontuacao=${JSON.stringify(l.pontuacao.map((p) => `${p.id}:${p.pontos}`))}`));
const r = tr2.trofeusDoAparelho();
console.log("troféus:", r.trofeus.map((t) => `${t.tipo}:${t.nome}:fechadoEm=${t.fechadoEm}`));
console.log("terminaEm liga =", l1.l.terminaEm, "· AGORA+10+14d =", AGORA + 10 + 14 * 86_400_000, "· expirar em", AGORA + 15 * 86_400_000);
