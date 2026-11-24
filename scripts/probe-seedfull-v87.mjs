// probe: replicar suíte A + seed B2 e imprimir TODOS os troféus/estados
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
const campoRace = (mp) => {
  const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== mp);
  return ["eu", ...es.RIVAIS_IA].map((id, i) => ({ id, nome: id === "eu" ? "Eu" : es.RIVAIS_IA[i - 1], posicao: id === "eu" ? mp : resto[i - 1] }));
};
// parte A
const r1 = es.criarTorneio({ ...baseT, nome: "Copa A1" }, AGORA);
es.inscreverTorneio(r1.t.id, "Eu", AGORA + 1); es.iniciarTorneio(r1.t.id, AGORA + 2);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 3);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 4);
es.expirarPendentes(AGORA + 8 * 86_400_000);
const l1 = es.criarLiga({ nome: "Liga A", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA + 10);
es.inscreverLiga(l1.l.id, "Eu", AGORA + 11);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 12);
es.expirarPendentes(AGORA + 15 * 86_400_000);
const r2 = es.criarTorneio({ ...baseT, nome: "Copa A2 podio" }, AGORA + 20);
es.inscreverTorneio(r2.t.id, "Eu", AGORA + 21); es.iniciarTorneio(r2.t.id, AGORA + 22);
es.partidaParaTorneios({ jogoId: "kart", pontos: 15, vitoria: false, posicao: 3, total: 12, campo: campoRace(3) }, AGORA + 23);
es.expirarPendentes(AGORA + 9 * 86_400_000);
const e1 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa A3 elim" }, AGORA + 30);
es.inscreverTorneio(e1.t.id, "Eu", AGORA + 31); es.iniciarTorneio(e1.t.id, AGORA + 32);
es.partidaParaTorneios({ jogoId: "kart", pontos: 10, vitoria: false, posicao: 5, total: 12, campo: campoRace(5) }, AGORA + 33);
const e2 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa A4 elim camp" }, AGORA + 40);
es.inscreverTorneio(e2.t.id, "Eu", AGORA + 41); es.iniciarTorneio(e2.t.id, AGORA + 42);
es.partidaParaTorneios({ jogoId: "kart", pontos: 18, vitoria: false, posicao: 2, total: 12, campo: campoRace(2) }, AGORA + 43);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 44);
const e3 = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa A5 em curso" }, AGORA + 50);
es.inscreverTorneio(e3.t.id, "Eu", AGORA + 51); es.iniciarTorneio(e3.t.id, AGORA + 52);
console.log("=== após parte A ===");
const rA = tr2.trofeusDoAparelho();
console.log("trofeus:", rA.trofeus.length, "podios:", rA.podios, "competicoes:", rA.competicoes);
// seed B2 (mesma store!)
const A = Date.now();
const tA = es.criarTorneio({ ...baseT, nome: "Copa B1" }, A);
es.inscreverTorneio(tA.t.id, "Eu", A + 1); es.iniciarTorneio(tA.t.id, A + 2);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, A + 3);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, A + 4);
es.expirarPendentes(A + 8 * 86_400_000);
const tB = es.criarTorneio({ ...baseT, nome: "Copa B2 podio" }, A + 10);
es.inscreverTorneio(tB.t.id, "Eu", A + 11); es.iniciarTorneio(tB.t.id, A + 12);
es.partidaParaTorneios({ jogoId: "kart", pontos: 15, vitoria: false, posicao: 3, total: 12, campo: campoRace(3) }, A + 13);
es.expirarPendentes(A + 9 * 86_400_000);
const lA = es.criarLiga({ nome: "Liga B", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, A + 20);
es.inscreverLiga(lA.l.id, "Eu", A + 21);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, A + 22);
es.expirarPendentes(A + 15 * 86_400_000);
const eA = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa B3 ativa" }, A + 30);
es.inscreverTorneio(eA.t.id, "Eu", A + 31); es.iniciarTorneio(eA.t.id, A + 32);
const eE = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa B4 eliminada" }, A + 40);
es.inscreverTorneio(eE.t.id, "Eu", A + 41); es.iniciarTorneio(eE.t.id, A + 42);
es.partidaParaTorneios({ jogoId: "kart", pontos: 10, vitoria: false, posicao: 5, total: 12, campo: campoRace(5) }, A + 43);
const eC = es.criarTorneio({ ...baseT, formato: "eliminatoria", tamanho: 8, nome: "Copa B5 camp" }, A + 50);
es.inscreverTorneio(eC.t.id, "Eu", A + 51); es.iniciarTorneio(eC.t.id, A + 52);
es.partidaParaTorneios({ jogoId: "kart", pontos: 18, vitoria: false, posicao: 2, total: 12, campo: campoRace(2) }, A + 53);
es.partidaParaTorneios({ jogoId: "kart", pontos: 25, vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, A + 54);
console.log("=== após seed B2 ===");
const rB = tr2.trofeusDoAparelho();
console.log("trofeus:", rB.trofeus.length, rB.trofeus.map((t) => t.nome));
console.log("podios:", rB.podios, "competicoes:", rB.competicoes);
const st = JSON.parse(localStorage.getItem("bateu_esport_v1"));
for (const t of st.torneios) console.log(`T: ${t.nome} | estado=${t.estado} | formato=${t.formato} | ronda=${t.ronda} | venc=${t.vencedorId || "-"} | rondaElim=${t.participantes.find((p) => p.id === "eu")?.rondaEliminado ?? "-"}`);
