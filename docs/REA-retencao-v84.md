# REA v84 — «O PROGRESSO SEGUE A CONTA» (binding jogadorId + servidor)

Data: 2026-11-24 · Estado à entrada: `main` limpo em 611a5f3 (v83 + Stage Summary)

## 1. A fatia anotada

A v83 fechou «A RETENÇÃO À VISTA» mas declarou honestamente no UI do bloco registado: **«Progresso contado neste aparelho»** — porque o comentário da store PROMETIA «ao iniciar sessão o jogadorId passa a ser o da conta» e **nada o implementava**. A v84 fecha a promessa: o progresso do jogador segue a CONTA entre dispositivos.

## 2. Migração `supabase/migrations/20261124_progressao_conta.sql`

`progressao_conta` — UMA linha por conta (`PRIMARY KEY user_id REFERENCES auth.users ON DELETE CASCADE`):
- `jogador_id` — o BINDING: id do jogador do aparelho que enviou o estado (trace do vínculo convidado → conta; o servidor não confia nele para nada além do registo);
- `pontos` (CHECK 0..2 000 000) · `missoes_concluidas_total` (CHECK 0..100 000) · `missoes` (JSONB array ≤ 12);
- `atualizado_em TIMESTAMPTZ DEFAULT now()`;
- **RLS**: SELECT/INSERT/UPDATE/DELETE só do dono (`auth.uid() = user_id`); sem SELECT/INSERT público — o convidado NUNCA toca na tabela (perímetro provado no E2E com contador de rotas);
- **as 4 CARTEIRAS continuam separadas por regra do produto**: a tabela NÃO tem bilhetes, prémios nem saldo — só a progressão de PONTOS.
- Aplicação pelo utilizador (Dashboard → SQL Editor, padrão do repo) — o cliente DETECTA a ausência (PGRST205) e declara «migração pendente» em vez de fingir.

## 3. Núcleo isomórfico `src/lib/progressaoConta.ts` (browser E Node, zero supabase/DOM/React)

- **MERGE por MÁXIMO** (`mesclarEstados`): `pontos = max(a,b)`, `missoesConcluidasTotal = max` — os pontos NUNCA descem e NUNCA dupla-contam. **Limitação declarada** (no código e no REA): jogadas paralelas em dois aparelhos contam o maior, nunca a soma — honesto e à prova de rollback.
- **Missões unidas por MODELO** (o id muda com a semente jogador): vence `reclamada` → maior `progresso` → `terminaEm` maior; cap 12; nunca muta (estado NOVO).
- **Contadores DO DIA** pela atividade de hoje: os dois de hoje → máximos + união de `jogosHoje` (cap 60); um de hoje → esse; nenhum → contadores do dia nascem vazios (o tick re-agenda).
- **`absorverConvidado`**: o estado de convidado entra na conta pelo MESMO merge por máximo, `jogadorId` FORÇADO à conta.
- **Linha do servidor** (`estadoParaLinha`/`linhaParaEstado`): validação dura — `user_id` da linha tem de bater CERTO com a conta (RLS provado no núcleo: linha de outra conta → null); linha podre → hidratada sem lançar (missões podres descartadas com contagem); caps do cliente = caps do SQL.
- **`impressaoEstado`/`deveEnviar`** — o ANTI-SPAM: a impressão cobre SÓ os campos sincronizáveis (pontos, total, jogador, missões id:progresso:reclamada). Os contadores DO DIA não contam — **o tick de 30 s da UI regrava o estado a cada passagem e nunca paga um pedido** (provado no núcleo e no E2E B1/B6).

## 4. Store `progressaoStore.ts` — gestor da conta (singleton do módulo, dedupe entre instâncias)

- **Cache POR CONTA** `bateu_progressao_v78:u:<userId>` (sanitizado, cap 84); o ficheiro de convidado `bateu_progressao_v78` mantém-se para compatibilidade v78.
- **`vincular(userId)`** (uma vez por conta por carga de página): (1) ABSORÇÃO convidado → merge máximo → gravar cache por conta → limpar o ficheiro de convidado **DEPOIS de absorvido** (nada é apagado sem ter sido somado) → notificar contexto; (2) PULL da linha do servidor → merge máximo → gravar; (3) PUSH do resultado unido (upsert `onConflict: "user_id"`). A conta fica IGUAL em todo o lado.
- **`desligar()`** no logout: o aparelho volta à chave de convidado; o estado da conta permanece no cache por conta e no servidor — nada apagado.
- **Push por gravação com dedupe** (`agendarEnvio`): só envia quando a impressão mudou; debounce 1,2 s; erro → estado «erro» com o motivo real, o aparelho segue como fonte.
- **Cliente mínimo injetável** (padrão `ClientePostgrestLike` da v58): a tabela ainda não está nos types gerados — o cast por chamada mantém os gates `tsc` limpos sem tocar o cliente real.
- **Estados honestos** (`useProgressaoSinc`, `useSyncExternalStore` — padrão iaContexto v82): `convidado` (ZERO pedidos) · `aSincronizar` · `sincronizado` · `migracao` (PGRST205 declarado) · `erro` (motivo real).

## 5. UI — chip + linha honesta (`ChipSincProgressao.tsx`, montado em BoasVindasRetencao + PainelProgressao)

- Registado: chip `reten-sinc` com `data-sinc` (Na conta ✓ emerald / A guardar pulso / Migração pendente CloudOff / No aparelho TriangleAlert) + linha `reten-sinc-linha` por estado («Progresso guardado na conta · segue-te em qualquer dispositivo» … «Não foi possível sincronizar ({motivo}) — o progresso fica seguro neste aparelho»).
- Convidado: o chip não rende NADA (as mensagens honestas de convidado já vivem nos painéis) — nenhum estado finge.
- i18n: 8 chaves `reten.sinc.*` ×6 idiomas (scripts/insere_i18n_v84.py, âncora `reten.missao.aparelho`, inserção baixo→cima, idempotente).

## 6. FURO REAL caçado pelo probe (com repro)

**O commit do vínculo**: o efeito-tick de missões corria no MESMO commit em que o vínculo (síncrono) tinha já absorvido+limpo o ficheiro de convidado — com o closure STALE (estado/chave pré-vínculo) ele REESCREVIA o ficheiro de convidado DEPOIS da limpeza e podia clobber o estado fundido. Repro no probe (scripts/probe-v84-b2.mjs: `setItem bateu_progressao_v78 … missoes=3` a seguir ao `removeItem`). Correção: **todas as ações e o tick leem o estado FRESCO de `chaveAtiva()` no momento da chamada** (`lerFresco`) e gravam na chave ATIVA (o singleton é a fonte de verdade de «para onde se escreve agora») — zero janelas de staleness.

## 7. FURO real de robustez fechado de passagem

`getActiveTournament` (tournaments.ts): `.single()` com um corpo que não é objeto (ex.: array de um servidor fora do padrão) devolvia um valor TRUTHY → a UI rende «Invalid Date» em vez do estado vazio honesto. Guarda nova: `!data || typeof !== "object" || Array.isArray(data) → null`. Nota: a tabela `tournaments` real NEM EXISTE neste projeto (PGRST205 real — «Perhaps you meant 'public.contests'») — por isso, SEM a migração de torneios aplicada, o cartão mostra «Sem torneios activos agora» (honesto).

## 8. Prova

- **test-retencao-v84.mjs NOVO — 67/67 ×2**:
  - **A núcleo Node (esbuild, padrão v60/v80)**: chave por conta sanitizada · merge máximo nos dois sentidos · missões por modelo (progresso máximo, reclamada vence, id da escolhida, cap 12) · contadores do dia (união/contaminação do outro dia/vazio honesto) · absorção (jogadorId forçado, nunca muta) · linha do servidor (user_id exacto, linha de outra conta → null, podre → hidratada, caps) · round-trip · impressão anti-spam (só contadores do dia → NÃO envia).
  - **B E2E (sessão fake no localStorage + rotas REST mockadas)**: B1 convidado ZERO pedidos a progressao_conta + chip ausente · B2 login: absorção dos 120 pontos para a conta, ficheiro de convidado LIMPO, cache por conta criado, upsert com `jogador_id` = binding e as missões do convidado dentro, chip «sincronizado» + linha «guardado na conta» · B3 servidor>aparelho: os 500 do servidor vencem os 100 locais e VOLTA ao servidor no upsert · B4 migração: PGRST205 declarado no chip e na linha, ZERO upsert · B5 erro: motivo real, ZERO upsert · B6 partida no bus → UM upsert novo com os 120 pontos (o ciclo Joga→Ganha→**Conta** fecha no servidor) · zero erros reais de consola em todos.
- **Regressão**: retencacao-v78 **38/0** (painel alterado) · retencao-v83 **39/0** · nav-v79 **83/0** · desbloqueios-v80 **38/0** · ciclo-v79 **45/0** · home-dinamica **24/0** · desktop-v74 **42/0**.
- **Gates**: `tsc -b` 0 · `tsc app` 0 · `vite build` OK (48,7 s).
- **Capturas**: shots-v84/v84-home-sincronizado.png (chip «Na conta» + linha) · v84-home-migracao.png (chip CloudOff + «Sem torneios activos agora» — furo §7 visívelmente fechado).

## 9. O que fica

- **Aplicar a migração** `20261124_progressao_conta.sql` (Dashboard → SQL Editor) — enquanto não for aplicada, a UI declara «Migração pendente» e o aparelho é a fonte (honesto).
- A sincronização cobre PONTOS/MISSÕES da progressão — bilhetes, prémios e saldo continuam nas suas camadas próprias (regra das 4 carteiras).
- Próxima fatia natural: o mesmo binding para os desbloqueios/cosméticos v80 (hoje vivem no aparelho) — o merge máximo já existe no padrão.
