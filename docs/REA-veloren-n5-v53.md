# REA v53 — N5: a partilha VISUAL das edições (o mundo editável partilhado)

Data: 2026-11-16 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Base: o N4 fechou na v52 (o servidor pisa os MESMOS voxels — carimbos + edições + caixa do corpo).
A v52 deixou anotado: «as edições são aceites para a VERDADE da colisão — a partilha VISUAL entre
jogadores (o mundo editável partilhado) é o passo seguinte anotado». A v53 fecha o N5.

---

## 1. O que faltava (o buraco real)

Na v52, o servidor aplicava cada edit reportada ao SEU overlay (`editsOverlay`) e a re-simulação da
colisão passava a respeitar o mundo que o autor vê — mas a edit morria no servidor: **não era
difundida**. O jogador B continuava a ver a parede inteira da Casa da Sorte enquanto o A já tinha
um buraco dela. A colisão do SERVIDOR seguia o A, mas o mundo VISUAL do B (e a física LOCAL do B,
que decide o que o cliente envia) ficava atrás — o B não conseguia passar pelo buraco que o
servidor já conhecia, porque o motor dele bloqueava antes de enviar.

## 2. A regra de validação numa só fonte (`validaEdit` em constants.ts)

Padrão v52 (`solidoId`): a semântica vive no constants.ts e é usada pelas TRÊS pontas —

- o **servidor** valida cada msg `edit` (inteiros, `y < ALTURA`, guarda de coordenada
  `EDIT_ALCANCE = 100 000`, id real `0` ou `ehBloco(id)`; inválida = strike → kique com 5);
- o **cliente** sanitiza TAMBÉM o que chega do servidor, no handler das `edicoes` (o padrão da
  `limpaFala` da v37: sanitiza MESMO vindo da fonte);
- a **probe** (`scripts/probe-edicoes-v53.mjs`) prova a regra no Node (8 casos: aceita quebra/
  colocação, recusa y negativo, `y ≥ ALTURA`, id desconhecido, id negativo, não-inteiro,
  `|x| ≥ EDIT_ALCANCE`).

## 3. Difusão 10 Hz (o tick de snapshot leva as edições)

`server/cidade-servidor.mjs`: cada edit aceite entra em

1. `editsIndex` — índice por região (`"rx,rz"` → Map `"x,y,z"` → `{x,y,z,id,por}`), a MESMA grelha
   `REGIAO_TAM` que a presença usa (o padrão region.rs);
2. `editsPendentes` — os aceites deste tick.

No tick de snapshot (10 Hz), o servidor difunde `{t:"edicoes", lista:[{x,y,z,id,por}]}` a cada
receptor: dentro do `RAIO_INTERESSE` da posição DELE e `por !== receptor.id` — **zero eco** (o
autor já tem a edição no seu mundo). A gestão de interesse é individual por receptor, como a dos
snapshots de presença (`estado`). Contador honesto: `editsDifundidos` (por entrega).

## 4. Lotes de sincronização (quem chega e quem se aproxima recebe o mundo editado)

A difusão só cobre quem estava perto NO momento da edição. Para o resto:

- `bemvindo` → lote das edições dentro do raio do spawn (`sinc: true`) — o chegante nasce num
  mundo JÁ editado;
- cruzamento de célula da grelha OU `SINC_A_CADA` (24 blocos andados desde o último ponto) →
  lote das edições dentro do raio da posição nova (`cruzaRegiao`, chamado nos dois caminhos
  aceites do `pos` — protocolo antigo e novo);
- cap honesto do lote (`EDIT_SYNC_CAP = 3000`) e zero eco também nos lotes (as edições do próprio
  autor ficam de fora).
- **Afrouxamento DECLARADO**: um jogador parado perto do limite do raio pode precisar de um passo
  para receber edições antigas — a reconciliação `corrigido` mantém o mundo honesto entretanto;
  o delta-ACK completo (o Veloren sincroniza blocos por chunk com ACK) é overkill para a presença
  da cidade. O probe provou o caminho crítico: a edit a −40 (40,5 blocos do spawn, nunca difundida)
  chega ao D quando este cruza para a célula −1,0 (passo de 1 bloco provado livre pelo campo real).

## 5. O cliente aplica pelo motor (zero eco, zero loop)

`Motor.aplicarEdicaoRemota(x,y,z,id)` (engine.ts):

- valida pela MESMA `validaEdit`;
- chunk ausente → registra em `mundo.edits` (a génese aplica quando o chunk voltar — contagem
  `semChunk`); o chegante nasce com o mundo editado mesmo sem chunks;
- `getBloco(x,y,z) === id` → IGNORADA (dup/lote repetido — zero remalha; contagem `ignoradas`);
- caso contrário `mundo.setBloco(...)` — o MESMO caminho das edições locais: `sujo` → remalha do
  worker (v51), `mundo.edits` → génese futura, tochas mantidas. SEM `aoEditar` (o autor já tem a
  edição — o gancho não dispara, a edição não volta ao servidor) e SEM som/partículas (não é
  acção local).

A página (`CidadeBateu.tsx`) liga o callback `onEdicao` ao `aplicarEdicaoRemota`; o feed
«Praça em direto» ganha o tipo `edicao` («Ana-MZ · editou o mundo ×3») com a chave i18n
`cidade.mpEvEdicao` nas 6 línguas.

## 6. Protocolo v53 (resumo)

- nova msg servidor→cliente: `{t:"edicoes", lista:[{x,y,z,id,por}], sinc?}` — a difusão (sem
  `sinc`) e os lotes (com `sinc:true`); o cliente valida cada item com `validaEdit` antes de
  aplicar;
- stats ganham `editsDifundidos` e `editsSincronizados` (contadores REAIS do processo);
- nada muda nas msgs cliente→servidor (o `edit` da v52 é o mesmo; a difusão é exclusivamente
  servidor→cliente).

## 7. FUROS REAIS das corridas (todos fechados)

1. **Estado entre corridas**: o servidor persistia o overlay/índice na memória — a 2.ª corrida
   nascia num mundo já editado (chunk (1,0) divergente do campo puro por 4 bytes; muro/porta/
   janela/voo em cascata). Servidor FRESCO por corrida (a lição v49 do vite, agora também do MP).
2. **O drive e o rAF a 2 fps**: o rAF do raster por software injeta envios com o y da física de
   passos de 0,5 s ENTRE os envios do teste — o servidor ficava com o y do rAF e o arco do salto
   raspava o riser (`LOG_RECUSAS=1` apanhou: RECUSA parede de −56.5 34.98 25.5 para −56.5 36.02
   27.5, em cascata). O MESMO drive em NODE PURO sem rAF é limpo (`scripts/diag-drive-v53.mjs`:
   0 correções nos 88 pontos) — artefacto do sandbox, não do jogo real. Fix: o gancho `mpCalado`
   (as secções conduzidas declaram-se caladas — as emissões ficam 100% pelo relógio do teste, o
   MESMO contrato do mpPasso v38).
3. **Painel SOLO sem espera** (refresca a 1 Hz) — espera honesta pelo feed real (o assert não
   muda).
4. **O shot do buraco**: o teleporte direto do B era ILEGAL (o anti-teleport reencaixava-o ao
   spawn — d≈20 > orçamento) e a abertura ficava a 23 m com 9 px escondidos pelos confetti.
   B caminha pela rota A* (23 passos no ritmo do orçamento) e a remalha espera pelo `sujo=false`
   do chunk — o pixel só muda quando a malha nova está na GPU.

## 8. Provas (testes, fontes reais)

- `scripts/probe-edicoes-v53.mjs` **31/31** — a regra partilhada ×8; o servidor REAL (child
  process): difusão + zero eco ×5; interesse ×1; malformadas → kique; lote do chegante ×5;
  cruzamento de região ×5; stats ×5.
- `test-mp-v37.mjs` 63→**79** ×3 corridas 79/79 (servidor fresco em cada) — a partilha NO
  BROWSER: B vê o mundo mudar, a colisão local do B segue, o autor não recebe eco, o dup é
  ignorado, o chegante nasce editado, os contadores nos stats.
- `scripts/shots-v53.mjs` → `shots-v53/buraco-antes.png` vs `shots-v53/buraco-partilhado.png`
  (o MESMO enquadramento): ANTES voxel35 = 9 / recebidas = 0; DEPOIS voxel35/37 = 0 / recebidas
  = 9 / `solido=false` — 69 430 pixeis mudados (diff PIL > 24).
- Regressões: probe-paredes-v52 **41/41** · probe-malha-v51 **10/10** · mp-v36 **14/14 ×2** ·
  carga **7/7** (CPU 3,7% · RSS 101,3 MB · ZERO correções) · cidade **37/37** · rpg-v41
  **157/157 ×2** · v31 **39/39** · tsc 0 · build OK.

## 9. Fontes (ficheiro:linha, nesta árvore)

- `src/game/blocos/constants.ts` — `validaEdit`, `EDIT_ALCANCE` (fim do ficheiro, após WHATSAPP).
- `server/cidade-servidor.mjs` — `editsIndex`/`editsPendentes`/`editarNaRegiao`/`sincEdits`/
  `cruzaRegiao`/`SINC_A_CADA`/`EDIT_SYNC_CAP` (após `editsOverlay`); a difusão no tick
  (`editsPendentes.length` → send por receptor); `bemvindo` → `sincEdits(eu)`; o handler `edit`
  → `validaEdit` + índice + pendentes; stats → `editsDifundidos`/`editsSincronizados`;
  `recusar(eu, motivo, alvo)` com diagnóstico sob `LOG_RECUSAS=1`.
- `src/game/blocos/engine.ts` — `aplicarEdicaoRemota` + `edicoesRemotasAplicadas/Ignoradas/
  SemChunk` (após `colocar()`).
- `src/game/cidade/multijogador.ts` — o handler `edicoes` (validaEdit + onEdicao + evento);
  `edicoesRemotasInfo`/`nEdicoesRemotas`; `EventoPraca.tipo === "edicao"`.
- `src/pages/CidadeBateu.tsx` — `onEdicao` → `aplicarEdicaoRemota`; o painel «Praça em direto»;
  o gancho `mpCalado`; `mpEdicoesRemotas`/`mpEdicoesAplicadas`.
- `test-mp-v37.mjs` (secções v53) · `scripts/probe-edicoes-v53.mjs` · `scripts/diag-drive-v53.mjs`
  · `scripts/shots-v53.mjs`.
