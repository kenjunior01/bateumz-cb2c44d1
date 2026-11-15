# REA v52 — N4 completo: o servidor pisa os MESMOS voxels

Data: 2026-11-15 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Base: o N3 fechou na v37 (núcleo isomórfico, orçamento de movimento, chat da Praça) e o N2 na v47
(física do TERRENO re-simulada + «Praça em direto» + carga de 50 bots). A v47 deixou anotado: «a
re-simulação cobre O TERRENO (alturaCidade) — paredes de EDIFÍCIOS continuam fora (a função pura não
sabe de estruturas carimbadas; anotado para N4 com voxels do chunk no servidor)». A v52 fecha o N4.

---

## 1. O que faltava (o buraco real)

O servidor de presença partilhada validava o movimento contra `alturaCidade` — o terreno puro.
Os carimbos da cidade (a Praça do Imbondeiro, o quiosque, a casa do jogador, a Sala de Troféus e
os 10 edifícios-portal dos distritos) eram INVISÍVEIS ao servidor: um cliente podia andar através
da parede da Galeria do Martelo no mundo partilhado e o servidor aceitava. No jogo solo a física
do motor bloqueava; no multiplayer, não.

## 2. Núcleo puro isomórfico — os carimbos numa só fonte

`src/game/cidade/carimbosCidade.ts` (NOVO — padrão v46/v47/v49/v50/v51: extensão `.ts` explícita,
zero THREE/DOM, corre no Node): os carimbos da cidade saíram de `MundoCidade` VERBATIM (mesmos
loops, mesmos raios, o mesmo `Aleatorio(SEED_CIDADE + 1)` por chamada — os intervalos dos loops são
fixos, por isso a sequência do PRNG é idêntica em qualquer chunk). `MundoCidade.posGerar` delega.
`DISTRITOS`, `posDistrito`, `POS_CASA`, `POS_TROFEUS`, `POS_QUIOSQUE` mudaram para o módulo puro
(re-exportados de `cidade.ts` — zero import partido). `alvoParaDados` é o adaptador para
`Uint8Array` (o caminho do servidor e das probes); `chunkTemCarimbos` exporta o guarda de limites.
Prova: o E2E compara o chunk (1,0) do CLIENTE com o campo construído no Node BYTE A BYTE (o padrão
v46 do terreno, estendido aos carimbos).

## 3. O servidor constrói o campo completo

`server/cidade-servidor.mjs`: cache de chunks (gerarDadosTerreno + perfilCidade + carimbarCidade,
LRU cap 256 ≈ 5 MB) + o OVERLAY das edições (`Map` "x,y,z" → id, cap 100 000) + `solidoEm(x,y,z)`
com a MESMA tabela de solidez (`solidoId` em constants.ts — a semântica vive numa só fonte,
`Mundo.solido` delega). O y inicial de cada jogador é derivado DO CAMPO (`superficieAndavel` no
spawn — nunca do cliente); as msgs do protocolo ANTIGO (sem y) refrescam `eu.y` pela superfície do
terreno — o y do servidor nunca fica STALE (furo real: o reencaixe y punha o cliente DENTRO do
terreno e o rAF era recusado para sempre).

## 4. Protocolo v52 — o eixo vertical entra na validação

`pos` ganha `y` (os pés reais do motor) e `voando` (a tecla F — voo criativo). Sem `y`, a msg é do
protocolo v37 e mantém EXACTAMENTE as regras do terreno da v47 (compatibilidade honesta — os bots
de carga antigos e os E2E regressões seguem verdes). Com `y`, cada msg passa por:

1. orçamento horizontal (v37, intacto);
2. orçamento de SUBIDA do terreno (v47, intacto);
3. orçamento VERTICAL sobre o y real: `proximoOrcamentoSubida` (o salto real do motor: ganho
   `SALTO²/2·GRAVIDADE ≈ 1,42`, recarga 2,6 b/s) ou, em voo, `proximoOrcamentoVoo` (o F real:
   `VEL_CORRER × 1.18 × 1.2 ≈ 8,36 b/s` → tecto 9 b/s — derivado do motor, não inventado);
4. o CAMINHO DO CORPO: `caminhoLivre` (core.ts) amostra o segmento a cada 0,25 blocos com a caixa
   de colisão do motor (0,6×0,6×1,8 — `LARGURA_JOGADOR`/`ALTURA_JOGADOR`/`CORPO_Y_INF`/`CORPO_Y_SUP`
   em constants.ts, fonte única que o `colideEm` do engine também usa) contra o campo completo.
   Parede de edifício, tronco de árvore, mobiliário — tudo o que o motor do cliente também bloqueia.
   A recusa responde `corrigido` com o motivo honesto «parede» + o y autoritativo do servidor (o
   cliente reencaixa TAMBÉM o eixo vertical — nunca fica preso no ar).

As constantes do corpo e o `solidoId` mudaram para `constants.ts`; o `engine.ts` passa a usá-los
(mesmos valores, uma só fonte) e ganha o gancho opcional `aoEditar`.

## 5. Edições do mundo — a verdade da colisão segue o que o jogador vê

A cidade é CRIATIVO: quebrar/colocar é legítimo. O motor ganha `Motor.aoEditar` (padrão do
`aoDroparChao` da v50 — `quebrar`/`colocar` chamam-no após cada `setBloco` real); o cliente
reporta via `reportarEdit` (o MESMO rate-limit nas duas pontas: `EDIT_RATE_MS` 50 ms) e o servidor
aplica ao overlay que a re-simulação consulta — quem PARTIU a parede legitimamente passa por lá.
Limites honestos: rate 20 edições/s nas duas pontas + cap do overlay (100 000) + contadores reais
nos stats (`editsAceites`/`editsRecusados`). Anotação: as edições são aceites para a VERDADE da
colisão — a partilha VISUAL das edições entre jogadores (o mundo partilhado editável) é o passo
seguinte anotado.

## 6. O y entra nos snapshots — fim do «remoto enterrado»

`estado`/`bemvindo`/`entrou` carregam o y real; os avatares remotos interpolam o y do servidor e
só caem para `alturaEm` (o fallback v36) quando o peer é do protocolo antigo. Quem está no telhado
APARECE no telhado. Screenshot: `shots-v52/telhado-remoto.png` (o Bruno vê a Ana no telhado da
Casa da Sorte — o hook de E2E prova y=41.0).

## 7. Furos reais das corridas (todos apanhados pelo E2E/probe, todos fechados)

1. A linha reta z=6.5 atravessa a parede oeste da casa do jogador (x=10, z=1..7) — o 1.º teste de
   movimento ficava preso em x=9 com o servidor a recusar correctamente. Os caminhos dos testes
   passam a ser computados por A* contra o campo puro (§8).
2. O drive v47 directo esbarra em árvores naturais (10 muros medidos) e cruzamentos íngremes do
   anel de fusão — o degrau do ensaio foi REESCOLHIDO por busca de caixa limpa:
   A=(-58.02,33.5) → B=(-59.76,34.5) → C=(-61.49,35.5), superfícies 37→39→40 (+2,0 legal, +1,0
   recusado com o orçamento gasto — a MESMA matemática do ensaio v47).
3. O stepper guloso validava o candidato cru e o teste enviava o ARREDONDADO (±0,005 — o
   veredicto virava num canto rente a um tronco). Fix: arredondar ANTES de validar, em todos os
   steppers (testes, probe, carga).
4. O `passoImediato` não marcava o ritmo — o rAF (2 fps no raster do sandbox) reenviava posições
   4-8 blocos à frente do servidor e a cascata de «alcance» travava tudo. Fix: o envio imediato
   também conta para o ritmo de 10 Hz.
5. Os degraus do anel cruzados com UMA msg por passo faziam a caixa interpolada raspar no riser
   (RECUSA parede autoritativa=(62 36.02 −17) em cascata). Fix: os degraus cruzam como o cliente
   REAL — o salto em duas fases (a msg intermédia no ar, o pouso ~0,55 s depois) e a borda de
   descida (o passo horizontal primeiro, a queda depois).
6. O y do servidor ficava STALE com msgs do protocolo antigo → o reencaixe y punha o cliente
   DENTRO do terreno → o rAF recusado para sempre. Fix: o servidor deriva o y da superfície do
   campo (nunca do cliente).
7. O stepper guloso vagueia (361 passos para ~90 blocos — minutos do teste). Fix: A* na grelha de
   1 bloco partilhado (`test-rotas-cidade.mjs`) — 24/88/84 passos, calculado em <130 ms.
8. Os envios REFUSADOS não podem teleportar o cliente para o destino ilegal — o rAF luta e gera
   correções extra. Fix: só os envios ACEITES teleportam.
9. O A* da 1.ª versão corria a 40 ms/msg com diagonais de 1,41 = 35 b/s > MAX_VEL — o orçamento
   drena. Fix: o ritmo das caminhadas = distância/MAX_VEL por mensagem (+ o arco do salto real
   ~0,55 s entre a msg intermédia e o pouso).

## 8. A* — as rotas dos testes são LEGAIS por construção

`test-rotas-cidade.mjs` (partilhado por test-mp-v37 e test-mp-v36): o campo puro + A* na grelha
de 1 bloco com os passos validados pela caixa do corpo, pelo salto real e pela borda de descida.
As linhas retas atravessavam a casa do jogador (x=10, z=1..7), o quiosque (4..6,−6..−4) e os
troncos — medido na 1.ª corrida do probe. Os alvos dos bots de carga mudaram para a PRAÇA
CARIMBADA (a 1.ª corrida punha 16 bots DENTRO da casa do jogador — ilegais com a re-simulação N4,
como a física do cliente).

## 9. Verificação (tudo corrido nesta sessão)

| Suíte | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `vite build` | OK |
| `scripts/probe-paredes-v52.mjs` (novo) | **41/41** |
| `test-mp-v37.mjs` (o E2E da cidade, com a secção v52) | **63/63 ×2 corridas** |
| `test-mp-carga.mjs` (50 bots no protocolo novo) | **7/7** — CPU 3,7%, RSS 99,8 MB, ZERO correções |
| `test-cidade.mjs` (solo, intocado) | **37/37** |
| `test-mp-v36.mjs` (regressão, drive pela rota A*) | **14/14 ×2** |
| `test-rpg-v41.mjs` (regressão — o engine foi tocado) | **157/157 ×2** |
| `test-v31-xadrez-clima.mjs` | **39/39** |

Secção v52 do E2E (13 novas): identidade byte a byte do chunk (1,0) cliente↔campo do servidor ·
caminhada legal do anel à porta (54 passos, protocolo novo, ZERO correções) · o MURO recusado
«parede» com o y autoritativo · a PORTA aceite · a JANELA recusada · edit-then-walk (quem partiu a
parede legitimamente passa) · o teleporte vertical recusado com o reencaixe y · o voo gradual por
cima da parede com o pouso no telhado (ZERO correções) · o remoto com y real (o Bruno vê a Ana no
telhado) · a rajada síncrona de edições cortada pelo rate-limit · os contadores de edições nos
stats.

## 10. Honestidade — o que fica

- O servidor aceita as edições reportadas para a VERDADE da colisão (rate-limited a 20/s nas duas
  pontas, cap do overlay 100 000, contadores nos stats) — mas NÃO as difunde: o mundo VISUAL
  continua local (o que o jogador A partiu, o jogador B não vê). A partilha visual das edições é o
  passo seguinte anotado (o mundo partilhado editável).
- O voo criativo é DECLARADO pelo cliente (a tecla F é uma capacidade real do modo criativo) e tem
  o orçamento do F real (9 b/s — derivado de VEL_CORRER × Atleta 1.18 × 1.2); a caixa do corpo
  continua a valer em voo (voar POR CIMA da parede é livre, ATRAVÉS dela é recusado, como no
  cliente).
- O protocolo ANTIGO (sem y) mantém as regras v47 EXACTAS e o y do servidor deriva da superfície
  do campo — os peers sem y são ground-walkers por definição.
- As EDIÇÕES do multiplayer da cidade do RPG (mundoRpg) continuam anotadas — o N4 fecha a CIDADE
  (o multiplayer do RPG é outro passo).
- A parede de EDIFÍCIO no servidor usa os carimbos da GÉNESE — as edições legítimas (§5) e as
  explosões (não existem na cidade — o gestor é pacífico) são o resto da verdade.
