// ============================================================
// PROBE v52 — N4: PAREDES DE EDIFÍCIOS NO SERVIDOR
// (padrão probe-penhasco-v47 / probe-itens-chao-v50 / probe-malha-v51:
//  as coordenadas e os caminhos do E2E são calculados pelos MÓSMOS
//  módulos puros que o servidor executa, ANTES de o teste existir)
//
// 1. o campo de voxels constrói no Node (geração + carimbos puros);
// 2. as paredes/portas/janelas/mobiliário da Casa da Sorte estão
//    ONDE os carimbos dizem;
// 3. a caixa de colisão (core.caixaColide) recusa o muro e aceita a
//    porta — o MESMO veredicto que a física do motor;
// 4. orçamentos y (salto) e voo re-simulados com a física REAL;
// 5. DRY-RUN dos caminhos: o drive v37, a lane do E2E v52 e os 50
//    bots de carga — quantos muros atravessam (decide o desenho dos
//    testes com dados medidos, não com sorte).
// Uso: node scripts/probe-paredes-v52.mjs
// ============================================================
import { Ruido } from "../src/game/blocos/noise.ts";
import { gerarDadosTerreno, somaBytes } from "../src/game/blocos/geracao.ts";
import { solidoId, CHUNK, ALTURA, B } from "../src/game/blocos/constants.ts";
import { alturaCidade } from "../src/game/cidade/terrenoCidade.ts";
import { perfilCidade } from "../src/game/cidade/terrenoCidade.ts";
import {
  carimbarCidade, alvoParaDados, chunkTemCarimbos,
  DISTRITOS, posDistrito, POS_CASA, POS_QUIOSQUE, POS_TROFEUS,
} from "../src/game/cidade/carimbosCidade.ts";
import {
  SEED_CIDADE, ALTURA_PLATEAU,
  caixaColide, caminhoLivre, CAIXA_PASSO,
  proximoOrcamentoSubida, proximoOrcamentoVoo, SUBIDA_CAP, VOO_TAXA, VOO_CAP,
  GANHO_SALTO,
} from "../src/game/cidade/core.ts";

let passed = 0, failed = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ""}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
};

// ── o campo de voxels do servidor (o MESMO caminho que cidade-servidor.mjs usa) ──
const ruido = new Ruido(SEED_CIDADE);
const perfil = perfilCidade(ruido);
const cache = new Map();
function chunkDados(cx, cz) {
  const k = `${cx},${cz}`;
  if (!cache.has(k)) {
    const dados = gerarDadosTerreno(ruido, cx, cz, perfil);
    if (chunkTemCarimbos(cx, cz)) carimbarCidade(alvoParaDados(dados, cx, cz));
    cache.set(k, dados);
  }
  return cache.get(k);
}
const voxel = (x, y, z) => {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (y < 0 || y >= ALTURA) return B.AR;
  const dados = chunkDados(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
  return dados[(y * CHUNK + lz) * CHUNK + lx];
};
const solido = (x, y, z) => solidoId(voxel(x, y, z));
const idEm = (x, y, z) => voxel(x, y, z);
const nomeId = (id) => Object.entries(B).find(([, v]) => v === id)?.[0] ?? String(id);

console.log("\n— 1. O campo de voxels constrói no Node (geração + carimbos puros)");
ok("chunk (1,0) construído (20 KB)", chunkDados(1, 0) instanceof Uint8Array && chunkDados(1, 0).length === CHUNK * CHUNK * ALTURA);
ok("chunk fora dos carimbos não recebe carimbos (guarda)", chunkTemCarimbos(1, 0) === true && chunkTemCarimbos(40, 40) === false);

console.log("\n— 2. A Casa da Sorte (distrito sorteios, ang 0) está ONDE os carimbos dizem");
const diSorteios = DISTRITOS.find((d) => d.id === "sorteios");
const [bx, bz] = posDistrito(diSorteios);
ok("posDistrito sorteios = (27,0)", bx === 27 && bz === 0, `(${bx},${bz})`);
const P = ALTURA_PLATEAU; // 34
ok("ring frontal x=23: parede TABUAS em +1..+5", [1, 2, 4, 5].every((dy) => idEm(23, P + dy, 3) === B.TABUAS), `+1=${nomeId(idEm(23, P + 1, 3))} +5=${nomeId(idEm(23, P + 5, 3))}`);
ok("janela VIDRO em (23,+3) e em z=±2", idEm(23, P + 3, 0) === B.VIDRO && idEm(23, P + 3, 2) === B.VIDRO && idEm(23, P + 3, -2) === B.VIDRO);
ok("porta dupla AR em (23,0) e (23,1) a +1/+2", idEm(23, P + 1, 0) === B.AR && idEm(23, P + 2, 0) === B.AR && idEm(23, P + 1, 1) === B.AR && idEm(23, P + 2, 1) === B.AR);
ok("telhado completo a +6 (H+1)", idEm(23, P + 6, 3) === B.TABUAS && idEm(27, P + 6, 0) === B.TABUAS);
ok("pavimento interior PEDRA", idEm(27, P, 0) === B.PEDRA && idEm(25, P, 2) === B.PEDRA);
ok("interior: baú + tocha", idEm(27, P + 1, 0) === B.BAU && idEm(27, P + 4, 0) === B.TOCHA);
ok("cantos TRONCO", idEm(23, P + 1, -4) === B.TRONCO && idEm(23, P + 1, 4) === B.TRONCO);
ok("ar livre sobre o telhado (limpa árvores +6..+12)", idEm(27, P + 7, 0) === B.AR && idEm(27, P + 9, 2) === B.AR);

console.log("\n— 3. A caixa de colisão (core.caixaColide) dá o MESMO veredicto que o motor");
const PE = 35.001; // pés no plateau (superfície 34 do voxel + 1.001)
ok("caixa no plateau livre", caixaColide(solido, 20.5, PE, 1.5) === false);
ok("caixa DENTRO da parede (23,3) colide", caixaColide(solido, 23.5, PE, 3) === true);
ok("caixa na PORTA (23,1) passa", caixaColide(solido, 23.5, PE, 1) === false);
ok("caixa no JANELA (23,2) colide (parede +1/+2)", caixaColide(solido, 23.5, PE, 2) === true);
ok("caixa no tronco do imbondeiro colide", caixaColide(solido, 0.5, PE, 0.5) === true);
ok("tronco imbondeiro sólido +1..+6", [1, 3, 6].every((dy) => solidoId(idEm(0, P + dy, 0))));
ok("cama/baú/mesa da casa do jogador sólidos", solidoId(idEm(POS_CASA[0] - 1, P + 1, POS_CASA[1] - 1)) && solidoId(idEm(POS_CASA[0] + 1, P + 1, POS_CASA[1] - 1)) && solidoId(idEm(POS_CASA[0] + 1, P + 1, POS_CASA[1] + 1)));
ok("balcão do quiosque (MESA) sólido", solidoId(idEm(POS_QUIOSQUE[0], P + 1, POS_QUIOSQUE[1])));
ok("baú dos troféus sólido", solidoId(idEm(POS_TROFEUS[0], P + 1, POS_TROFEUS[1])));
ok("caminho livre: através da porta", caminhoLivre(solido, 22.5, PE, 1, 24.5, PE, 1) === true);
ok("caminho BLOQUEADO: através da parede (z=3)", caminhoLivre(solido, 22.5, PE, 3, 24.5, PE, 3) === false);
ok("caminho livre: voo criativo POR CIMA da parede (y=42)", caminhoLivre(solido, 22.5, 42, 1.5, 24.5, 42, 1.5) === true);
ok("andar SOBRE o telhado é caminho livre", caminhoLivre(solido, 26, 41.001, 0, 28, 41.001, 0) === true);
ok("caixa no telhado (41.001) livre — 41..46 limpos", caixaColide(solido, 27, 41.001, 0) === false);

console.log("\n— 4. Orçamentos y (salto) e voo re-simulados com a física REAL");
{
  // salto REAL do motor: vy = SALTO, gravidade GRAVIDADE, msgs a 10 Hz
  let orc = SUBIDA_CAP, y = P + 1.001, vy = 8.6, aceites = 0, recusados = 0;
  const dt = 0.1;
  for (let i = 0; i < 40; i++) {
    orc = proximoOrcamentoSubida(orc, dt);
    const ny = y + vy * dt;
    vy = Math.max(-40, vy - 26 * dt);
    const subida = ny - y;
    if (subida > 0 && subida > orc) recusados++;
    else { if (subida > 0) orc -= subida; y = ny; aceites++; }
    if (y <= P + 1.001 && vy < 0) break; // aterrou
  }
  ok("arco de salto REAL (ganho 1.42) 100% aceite", recusados === 0 && aceites >= 4, `aceites=${aceites} recusados=${recusados} ganho=${(y - (P + 1.001)).toFixed(2)} ≈ ${GANHO_SALTO.toFixed(2)}`);
  // teleporte y
  let orc2 = SUBIDA_CAP;
  orc2 = proximoOrcamentoSubida(orc2, 0.1);
  ok("teleporte y (+8) recusado pelo orçamento", 8 > orc2, `orçamento=${orc2.toFixed(2)}`);
  // voo: subida sustentada a VOO_TAXA aceites; a 14 b/s recusada
  let orcV = VOO_CAP, sobeAceite = true;
  for (let i = 0; i < 10; i++) { orcV = proximoOrcamentoVoo(orcV, 0.1); const s = VOO_TAXA * 0.1; if (s > orcV) sobeAceite = false; else orcV -= s; }
  ok(`voo sustentado (${VOO_TAXA} b/s = tecto real do F) aceite`, sobeAceite, `VOO_TAXA=${VOO_TAXA} CAP=${VOO_CAP}`);
  // 14 b/s SUSTENTADOS (além da física do F) — o orçamento acumula e recusa
  let orcV2 = VOO_CAP, recusadosVoo = 0;
  for (let i = 0; i < 12; i++) { orcV2 = proximoOrcamentoVoo(orcV2, 0.1); const s = 1.4; if (s > orcV2) recusadosVoo++; else orcV2 -= s; }
  ok("voo SUSTENTADO a 14 b/s (além da física) recusado", recusadosVoo > 0, `recusados=${recusadosVoo}/12`);
}

console.log("\n— 5. DRY-RUN dos caminhos dos testes (dados medidos, não sorte)");

// 5a-bis. o 1.º teste de movimento v37 (20 passos de x=1 a x=20 em z=6.5)
let muros1o = 0, primeiroMuro1o = null;
{
  let px = 1, pz = 6.5;
  for (let i = 2; i <= 20; i++) {
    const py = alturaCidade(ruido, i, 6.5) + 1.02;
    if (!caminhoLivre(solido, px, alturaCidade(ruido, px, 6.5) + 1.02, pz, i, py, 6.5)) {
      muros1o++;
      if (!primeiroMuro1o) primeiroMuro1o = `passo ${i}: (${px},6.5)→(${i},6.5)`;
    }
    px = i;
  }
}
console.log(`    (medido) 1.º movimento v37 (z=6.5): muros=${muros1o}${primeiroMuro1o ? ` 1º=${primeiroMuro1o}` : ""} → usa protocolo antigo (v47) ou rota limpa`);

// 5a. o drive v37 (44 passos de (20,6.5) a (60,-16), y = altura+1.02)
let murosDrive = 0, primeiroMuroDrive = null;
{
  let px = 20, pz = 6.5;
  const py = () => alturaCidade(ruido, Math.floor(px), Math.floor(pz)) + 1.02;
  for (let i = 1; i <= 44; i++) {
    const t = i / 44;
    const nx = Math.round((20 + 40 * t) * 100) / 100;
    const nz = Math.round((6.5 - 22.5 * t) * 100) / 100;
    if (!caminhoLivre(solido, px, py(), pz, nx, alturaCidade(ruido, nx, nz) + 1.02, nz)) {
      murosDrive++;
      if (!primeiroMuroDrive) primeiroMuroDrive = `passo ${i}: (${px},${pz})→(${nx},${nz})`;
    }
    px = nx; pz = nz;
  }
}
console.log(`    (medido) drive v37 (44 passos): muros=${murosDrive}${primeiroMuroDrive ? ` 1º=${primeiroMuroDrive}` : ""} → mantém-se protocolo ANTIGO (valida a regra v47 do terreno; árvores não pertencem a essa regra)`);

// 5b. a rota do E2E v52 até à porta da Casa da Sorte — computada pelo
// PASSO CONSCIENTE DE OBSTÁCULOS (o stepper determinístico): a 1.ª corrida
// do probe mediu árvores naturais na lane z=-1 entre x=16 e x=22.5 e a
// parede oeste da casa do jogador em x=10 z=1..7 — a rota contorna como o
// jogador real. Os WAYPOINTS impressos são os que o E2E usa (mundo de
// semente fixa → determinístico).
const GIROS = [0, 0.5236, -0.5236, 1.0472, -1.0472, 1.5708, -1.5708, 2.0944, -2.0944, 2.618, -2.618, Math.PI];
function passoConsciente(x, z, alvoX, alvoZ, dist, y) {
  const d = Math.hypot(alvoX - x, alvoZ - z);
  const base = Math.atan2(alvoZ - z, alvoX - x);
  const passo = Math.min(dist, d);
  // o candidato é ARREDONDADO a 2 casas ANTES da checagem — o que o stepper
  // valida tem de ser EXACTAMENTE o que o teste envia (a msg pos vai a 2
  // casas; validar o cru e enviar o arredondado desloca a caixa ±0,005 e
  // vira o veredicto num canto rente — furo real da corrida v52)
  const R = (v) => Math.round(v * 100) / 100;
  // 1.ª passada: o primeiro giro LIVRE que APROXIMA do alvo
  for (const giro of GIROS) {
    const nx = R(x + Math.cos(base + giro) * passo), nz = R(z + Math.sin(base + giro) * passo);
    if (caminhoLivre(solido, x, y, z, nx, y, nz) && Math.hypot(alvoX - nx, alvoZ - nz) < d) return [nx, nz];
  }
  // 2.ª passada: qualquer giro livre (desliza ao longo do obstáculo — como
  // a física do cliente faz; é o que contorna a parede da casa)
  for (const giro of GIROS) {
    const nx = R(x + Math.cos(base + giro) * passo), nz = R(z + Math.sin(base + giro) * passo);
    if (caminhoLivre(solido, x, y, z, nx, y, nz)) return [nx, nz];
  }
  return [x, z]; // preso: fica (msg pos d=0 é legal)
}
{
  // do spawn à porta da Casa da Sorte (a porta em si é o último segmento)
  const waypoints = [[0.5, 6.5]];
  let x = 0.5, z = 6.5, presos = 0;
  for (let i = 0; i < 60 && Math.hypot(22.5 - x, 0.5 - z) > 0.6; i++) {
    const [nx, nz] = passoConsciente(x, z, 22.5, 0.5, 1.0, PE);
    if (nx === x && nz === z) presos++;
    waypoints.push([nx, nz]);
    x = nx; z = nz;
  }
  ok("stepper chega à porta da Casa da Sorte", Math.hypot(22.5 - x, 0.5 - z) <= 0.6 && presos < 5, `passos=${waypoints.length - 1} presos=${presos}`);
  ok("todos os waypoints do stepper são caminho livre", waypoints.slice(1).every(([wx, wz], i) => caminhoLivre(solido, waypoints[i][0], PE, waypoints[i][1], wx, PE, wz)));
  console.log("    WAYPOINTS E2E v52 (porta): " + JSON.stringify(waypoints));
  // o último segmento: através da porta (23,0) — o stepper não o dá porque
  // o alvo (24.5) fica a 2.0; o E2E cruza a porta EXPLICITamente:
  ok("cruzamento da porta z=0.5 LIVRE", caminhoLivre(solido, 22.5, PE, 0.5, 24.5, PE, 0.5) === true);
  // o desvio do MURO: sobe paralelo (fora do edifício) e cruza o anel → BLOQUEADO
  ok("aproximação ao muro (22.5,0.5→3.5) livre", caminhoLivre(solido, 22.5, PE, 0.5, 22.5, PE, 3.5) === true, "paralela ao muro, fora");
  ok("cruzamento da parede z=3.5 BLOQUEADO", caminhoLivre(solido, 22.5, PE, 3.5, 24.5, PE, 3.5) === false);
  ok("cruzamento da janela z=2 BLOQUEADO (parede +1/+2 sob o vidro)", caminhoLivre(solido, 22.5, PE, 2, 24.5, PE, 2) === false);
  ok("spot do teleporte-y (22.5,0.5) é caixa livre", caixaColide(solido, 22.5, PE, 0.5) === false);
}

// 5c. os 50 bots de carga com o PASSO CONSCIENTE DE OBSTÁCULOS (o mesmo
// stepper que test-mp-carga.mjs usa): fase 1 = passo rotado até livre;
// fase 2 = círculo pequeno com guarda (bloqueado → fica parado, msg d=0
// legal). A asserção honesta: NENHUM passo ENVIADO viola o campo, e os
// bots PROGUEMEM (a cidade não os prende na origem).
let botsComMuro = 0, botsChegados = 0;
{
  const N_BOTS = 50;
  for (let i = 0; i < N_BOTS; i++) {
    // alvo NA PRAÇA CARIMBADA (anel r=5..7 em volta do imbondeiro): a 1.ª
    // corrida do probe mediu que os alvos v47 [8+(i%6)*2, -6+…] punham 16
    // bots DENTRO da casa do jogador (x≤16, z≤7) e outros junto ao quiosque
    // — alvos ilegais com a re-simulação N4 (a física do cliente também os
    // impediria). Na praça não há obstáculos (pedra carimbada, sem árvores);
    // o tronco (0,0) e os 4 postes (r=8 cardinal) ficam fora do anel.
    const aI = (i / N_BOTS) * Math.PI * 2, rI = 5 + (i % 3);
    const alvo = [Math.round(Math.cos(aI) * rI * 10) / 10, Math.round(Math.sin(aI) * rI * 10) / 10];
    let x = 0.5, z = 6.5;
    let ang = (i / N_BOTS) * Math.PI * 2;
    let ilegaisEnviados = 0;
    for (let t = 0; t < 220; t++) { // 22 s a 100 ms
      const d = Math.hypot(alvo[0] - x, alvo[1] - z);
      let nx, nz;
      if (d > 0.8) {
        [nx, nz] = passoConsciente(x, z, alvo[0], alvo[1], 0.8, 35.02);
        if (nx !== x && !caminhoLivre(solido, x, 35.02, z, nx, 35.02, nz)) ilegaisEnviados++; // por construção: 0
      } else {
        ang += 0.06;
        nx = alvo[0] + Math.cos(ang) * 0.8; nz = alvo[1] + Math.sin(ang) * 0.8;
        if (!caminhoLivre(solido, x, 35.02, z, nx, 35.02, nz)) [nx, nz] = [x, z]; // fica (d=0 legal)
      }
      x = nx; z = nz;
    }
    if (ilegaisEnviados > 0) botsComMuro++;
    if (Math.hypot(alvo[0] - x, alvo[1] - z) <= 2.0) botsChegados++;
  }
}
ok("50 bots de carga (alvos na praça, stepper consciente): ZERO passos ilegais enviados", botsComMuro === 0, `${botsComMuro} bots com envio ilegal`);
ok("bots PROGUEMEM: ≥48/50 chegam a ≤2.0 do alvo", botsChegados >= 48, `chegados=${botsChegados}/50`);

// nota v52: o stepper de 1.ª passada (só pequenos giros) prendia 16 bots na
// parede oeste da casa do jogador (x=10, z=1..7) — medido no probe: os bots
// deslizavam ao longo da parede sem a contornar. A 2.ª passada (qualquer
// giro livre) contorna como o jogador real desliza na física do cliente.

// nota v52: o stepper ANTIGO (em linha reta, sem contornar) tem muros —
// medido na 1.ª corrida do probe: árvores no anel de relva + o quiosque
// (4,−6)..(6,−4) + a parede oeste da casa do jogador (x=10, z=1..7). Os
// bots de carga usam o passo consciente acima, como o jogador real faz
// (a física do cliente desliza à volta do obstáculo).

// 5c-ter. o resto dos 50 bots: subida ao TELHADO por VOO GRADUAL (o F real
// sobe ≤ 8,36 b/s) — 7 msgs × ~1,0 a 125 ms, cada uma dentro do orçamento
{
  let orcV = VOO_CAP, y = 35.02, aceiteTudo = true;
  for (let i = 0; i < 7; i++) {
    orcV = proximoOrcamentoVoo(orcV, 0.125);
    const alvoY = 42, subida = Math.min(1.0, alvoY - y);
    if (subida > 0 && subida > orcV) aceiteTudo = false; else { if (subida > 0) orcV -= subida; y += subida; }
  }
  ok("subida gradual de voo (F real, ~8 b/s) 100% aceite", aceiteTudo && Math.abs(y - 42) < 0.01, `y=${y.toFixed(2)}`);
}
{
  const s1 = somaBytes(chunkDados(1, 0));
  const s2 = somaBytes(chunkDados(0, 0));
  const ruido2 = new Ruido(SEED_CIDADE);
  const d2 = gerarDadosTerreno(ruido2, 1, 0, perfilCidade(ruido2));
  carimbarCidade(alvoParaDados(d2, 1, 0));
  ok("campo determinístico (2 construções = mesma soma)", s1 === somaBytes(d2), `chunk (1,0) soma=${s1} · chunk (0,0) soma=${s2}`);
}

console.log("\n— 6. CAIXA_PASSO cobre o caminho sem saltar voxels");
ok("CAIXA_PASSO ≤ diâmetro da caixa (0,6)", CAIXA_PASSO <= 0.6, `passo=${CAIXA_PASSO}`);

console.log(`\n📊 PROBE v52: ${passed} passaram · ${failed} falharam`);
process.exit(failed ? 1 : 0);
