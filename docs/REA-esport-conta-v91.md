# REA — v91 «E-SPORT SEGUE A CONTA»: torneios/ligas no servidor (binding + sync, padrão v84)

Data: 2026-11-26 · Pedido: fatia anotada desde a v86/v87 («o que fica» da v86: «os torneios/ligas vivem NO APARELHO… a sincronização para o servidor continua na fatia da migração tournaments/leagues» e da v87 troféus: «Tudo no aparelho (mesma limitação honesta do v86)»). O remoto já tinha a v90 «DESKTOP AO TOQUE» (as fatias de design do pedido «Quero no design da versao desktop melhore bastante» estavam fechadas pela v85/v88/v89/v90) — a v91 fecha o MAIOR buraco honesto declarado: o e-sport passa a seguir a CONTA entre dispositivos.

## 1. O pedido (as fatias anotadas)

- v86 §4: «Os torneios/ligas vivem NO APARELHO e a UI DECLARA («E-sport do aparelho… Nada finge servidor — o progresso vive neste dispositivo»)» — a nota era HONESTA, mas o produto pedia a conta.
- v87 §4: troféus «Tudo no aparelho (mesma limitação honesta do v86 — a sincronização para o servidor continua na fatia da migração tournaments/leagues, PGRST205 real)».
- Padrão a seguir: v84 «O PROGRESSO SEGUE A CONTA» (migração UMA linha por conta · núcleo isomórfico · absorção do convidado · pull → merge → push · chip honesto ×6 idiomas · PGRST205 declarado).

## 2. Migração `supabase/migrations/20261126_esport_conta.sql` (NOVA)

`esport_conta` — UMA linha por conta (`PRIMARY KEY user_id REFERENCES auth.users ON DELETE CASCADE`):
- `jogador_id TEXT NOT NULL` — o BINDING (id da conta que enviou o estado; CHECK `<> ''` e `length ≤ 60`);
- `torneios JSONB NOT NULL DEFAULT '[]'` com CHECK `jsonb_array_length ≤ 12` — o MESMO teto do núcleo v86 (`TETO_TORNEIOS`);
- `ligas JSONB NOT NULL DEFAULT '[]'` com CHECK `≤ 8` — o MESMO teto (`TETO_LIGAS`);
- `atualizado_em TIMESTAMPTZ DEFAULT now()`;
- **RLS**: SELECT/INSERT/UPDATE/DELETE só do dono (`auth.uid() = user_id`); sem SELECT/INSERT público — o convidado NUNCA toca na tabela (perímetro provado no E2E B1/B7 com contador de rotas);
- as 4 CARTEIRAS continuam SEPARADAS por regra do produto: a tabela NÃO tem bilhetes/prémios/saldo — os prémios de e-sport são Pontos Bateu pagos pela store da progressão (como na v86).
- Aplicação pelo utilizador (Dashboard → SQL Editor, padrão do repo) — o cliente DETECTA a ausência (PGRST205) e declara «Migração pendente» em vez de fingir (B4 provado).

## 3. Núcleo isomórfico `src/lib/esportConta.ts` (NOVO — browser E Node, zero supabase/DOM/React)

- **HIDRATAÇÃO dura** (`hidratarTorneioEsport`/`hidratarLigaEsport`/`hidratarEstadoEsport`): linha podre → descartada com honestidade (nunca lança). Jogo tem de estar no catálogo `JOGOS_ESPORT`; formato/estado/pista nos enums; prémio clampado 100..5000 (os MESMOS limites do produto); organizador exige nome (cor podre → laranja da casa); **rivais IA SEMPRE etiquetados** — `eBot` não é negociável: só o `id "eu"` pode ficar humano, tudo o resto volta a `eBot: true` (uma linha podre NUNCA apaga a etiqueta «IA»); histórico capado às ÚLTIMAS 24 (as recentes contam); participantes dedupados por id (cap 12).
- **MERGE por UNIÃO DE IDS** (`mesclarEstadosEsport`): torneios de aparelhos DIFERENTES coexistem; o MESMO id vence o estado MAIS AVANÇADO — `premioReclamado` (o mesmo prémio NUNCA é pago duas vezes) → estado (`terminado > ativo > inscricao`) → mais histórico (mais partidas reais consumidas) → atividade mais recente. **Limitação declarada**: o mesmo torneio em dois aparelhos NUNCA mistura participantes (mostra o mais avançado dos dois, nunca soma).
- **`absorverConvidadoEsport`**: a união convidado + conta (mesma regra).
- **Linha do servidor** (`estadoParaLinhaEsport`/`linhaParaEstadoEsport`): validação dura — `user_id` da linha tem de bater CERTO com a conta (RLS provado no núcleo: linha de outra conta → null); linha podre → null; round-trip provado.
- **`impressaoEstadoEsport`/`deveEnviarEsport`** — o ANTI-SPAM: a impressão é determinística (ordenada por id) e cobre o que VALE envio (estado, claim, ronda, vencedor, nº de históricos e progresso de CADA participante `id:pontos:vitórias:partidas:eliminado`). A ORDEM dos arrays NÃO paga envio; CLAIM e partida real pagam (provado no núcleo A10).

## 4. Núcleo v86 — cirurgia mínima (`src/lib/esport.ts`)

- **CHAVE ATIVA injetável**: `definirChaveEsportAtiva(chave | null)` — sem store (Node, suítes v86/v87), o comportamento é BYTE-A-BYTE o de sempre; `lerEsport`/`guardarEsport` passam a usar a chave ativa (lida UMA vez por escrita — o vínculo pode trocar a meio).
- **GATILHO pós-escrita**: `definirAoGuardarEsport(fn)` — a store da conta ouve CADA gravação do núcleo (criar/inscrever/iniciar/claim/expiração/partida no bus) para agendar o push. Ouvinte podre nunca quebra o núcleo (try/catch).
- ZERO mudanças nas regras do jogo: teto/claim/coroamento/rivais intactos (esport-v86 44/0 e trofeus-v87 39/0 verdes sem tocar nos testes).

## 5. Store `src/lib/esportStore.ts` (NOVA) — gestor da conta (singleton do módulo)

- **INSTALAÇÃO ÚNICA** no carregamento do módulo (importado estaticamente pelo App): `definirChaveEsportAtiva(chaveAtiva())` + `definirAoGuardarEsport(agendarEnvio)` — a chave ativa é real ANTES de qualquer página renderizar.
- **`vincular(userId)`** (uma vez por conta por carga): (1) ABSORÇÃO — cache da conta ← união com o estado de convidado → limpar o ficheiro de convidado DEPOIS de absorvido (nada é apagado sem ter sido somado) → evento `bateu:esport` (as superfícies re-leem FRESCO); (2) PULL da linha do servidor → união → gravar; (3) PUSH do resultado unido (upsert `onConflict: "user_id"`). A conta fica IGUAL em todo o lado.
- **Push por gravação com dedupe** (`agendarEnvio`): só envia quando a impressão mudou; debounce 1,2 s; erro → estado «erro» com o motivo real, o aparelho segue como fonte. O re-bind de cada carga paga um push honesto (pull → merge → push — upsert idempotente, padrão v84).
- **`desligar()`** no logout: o aparelho volta à chave de convidado; o estado da conta permanece no cache por conta e no servidor — nada apagado.
- **Cliente mínimo injetável** (padrão `ClientePostgrestLike` da v58/v84): a tabela ainda não está nos types gerados — o cast por chamada mantém os gates `tsc` limpos sem tocar o cliente real.
- **Estados honestos** (`useEsportSinc`, `useSyncExternalStore`): `convidado` (ZERO pedidos) · `aSincronizar` · `sincronizado` · `migracao` (PGRST205 declarado) · `erro` (motivo real).

## 6. Integração

- **`App.tsx` (AppShell)**: efeito que liga/desliga o gestor quando a sessão muda (`trocarUsuarioEsport(user?.id ?? null)`, padrão v84 do `useProgressao`) — ZERO pedidos enquanto a auth resolve.
- **Superfícies re-leem FRESCO**: `TournamentsList`, `LeaguesListPage`, `TorneioLocalDetalhe`, `LigaLocalDetalhe` ouvem `bateu:esport` (absorção/pull) e re-carregam da chave ativa — nenhum snapshot velho sobrevive ao vínculo.
- **`ChipSincEsport.tsx` (NOVO)**: chip na secção «Torneios que funcionam agora» (`torneios-local-section`) e «Ligas do aparelho» (`ligas-local-section`); variante «linha» junto à nota honesta nos dois DETALHES. Convidado NUNCA finge (não rende nada); registado vê exatamente o estado. i18n `esport.sinc.chip.*` + `esport.sinc.linha.*` ×6 dicionários (en/pt/pt-BR/es/fr/hi) via `scripts/insere_i18n_v91.py` (âncora `esport.nota.aparelho`, 48 chaves inseridas, idempotente).

## 7. Provas

- **test-esport-conta-v91.mjs NOVO — 63 verdes / 0 falhas ×2** (2 corridas consecutivas):
  - **A. Núcleo (28)** — chave por conta sanitizada · hidratar dura ×9 (torneio real passa intacto, sem nome/jogo fora do catálogo/formato podre/organizador podre → null, prémio clampado nos dois lados, liga podre, estado podre → vazio) · **rivais IA sempre etiquetados** (linha podre com `eBot:false` fora do «eu» volta a IA) · histórico últimas 24 · merge ×6 (união de aparelhos, claim vence, estado avança, mais histórico, NUNCA mistura participantes) · caps 12/8 · absorção · linha ×6 (binding, user_id errado → null, podre → null, round-trip) · impressão ×4 (ordem não paga, igual → false, claim paga, partida paga).
  - **B. E2E (29, sessão fake `sb-ref` + rotas REST mockadas, dados REAIS do núcleo via `criarTorneio`)** — B1 convidado: torneio visível, SEM chip, ZERO pedidos a `rest/v1/esport_conta` · B2 login: chip «sincronizado», torneio absorvido visível, **ficheiro de convidado limpo DEPOIS de absorvido**, cache por conta tem o torneio, pull (GET) + push (upsert) com `jogador_id = conta` e ligas vazias honestas · B3 servidor une: OS DOIS torneios coexistem e a união volta no push · B4 PGRST205: chip «Migração pendente» declarado, aparelho segue fonte, ZERO upserts fingidos · B5 erro 500: chip «erro» honesto · B6 **claim → push**: prémio reclamado no detalhe → NOVO push (debounce 1,2 s) com `premioReclamado=true` no servidor (a espera é pelo POST COM o claim — o recarregar da página paga um push honesto do re-bind antes) · B7 mobile 390: perímetro do convidado intato (ZERO pedidos) · ZERO pageerror em todos.
- **Regressão (15 suítes, todas verdes)**: nav-v79 **83/0** · desktop-v85 **46/0** · desktop-v88 **30/0** · desktop-v89 **37/0** · desktop-v90 **38/0** · trofeus-v87 **39/0** · esport-v86 **44/0** · retencacao-v78 **38/0** · retencao-v83 **39/0** (solo) · retencao-v84 **67/0** (solo) · desktop-v74 **42/0** (solo) · home-dinamica **24/0** · web-v262 **11/0** · auditoria-v40 **50/0** · kart-v65 **65/0**.
- **GATES**: `tsc -b` 0 · `tsc -p tsconfig.app.json --noEmit` 0 · `npm run build` OK (**4525 módulos**, +3: esportConta/esportStore/ChipSincEsport).
- **Shots** (`shots-v91/`, dados REAIS do núcleo, padrão v84-v90): `torneios-conta-sincronizado.png` (chip «Na conta» + Copa Galão Telecom empresa + Copa Maputo) · `torneios-migracao.png` (chip CloudOff declarado) · `detalhe-claim-linha.png` (Prémio já clamado + linha «Torneios e ligas guardados na conta · seguem-te em qualquer dispositivo») · `ligas-conta.png` (chip na página de ligas).

## 8. Honestidade (o que fica)

- Sem a migração aplicada, o chip declara «Migração pendente» e o aparelho segue a fonte (B4) — nada finge servidor.
- O MESMO torneio em dois aparelhos mostra o estado MAIS AVANÇADO e nunca soma o progresso dos dois (declarado no núcleo e neste REA §3) — honesto como o «merge por máximo» da v84.
- Os rivais IA continuam sempre etiquetados (hidratar não negociável); nenhum número inventado — o merge nunca cria pontos, só escolhe entre estados que o núcleo v86 escreveu.
- Os cartões REMOTOS de torneios/ligas (`tournaments`/`leagues` do Supabase) continuam no seu estado honesto de sempre — esta fatia sincroniza o E-SPORT DO APARELHO (que funciona) com a conta; não liga o catálogo remoto que não existe (PGRST205 real).
- Troféus (v87) continuam derivados do estado do aparelho — com a conta sincronizada, seguem o mesmo estado unido numa próxima fatia se o produto pedir.
- Impressão por página: cada carga paga um push honesto do re-bind (pull → merge → push), idempotente no servidor — o custo é 1 GET + ≤1 POST por carga de página com conta, nunca por tick.
