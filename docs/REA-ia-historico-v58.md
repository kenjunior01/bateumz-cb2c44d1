# REA — v58 · HISTÓRICO DA IA NO SERVIDOR (sincronização entre dispositivos)

## O que entrou

O segundo passo anotado desde a v54 («a persistência do histórico no
servidor» — o primeiro, o NPC, foi a v57): **o histórico do chat da IA
segue agora o utilizador ENTRE DISPOSITIVOS**. As conversas da página
`/ia` e da Bateu IA na Praça vivem numa tabela nova do Supabase
(`ia_historico`) protegida por RLS com o JWT do utilizador — o browser
fala directamente com o PostgREST (o padrão do resto da plataforma:
stories, palpites, sorteios), a chave de serviço nunca sai do servidor,
o proxy não ganha rotas novas.

O modelo é honesto por desenho: **o servidor é a fonte de verdade, o
localStorage é cache e fila**. Cada mensagem recebe uma **CHAVE
DETERMINÍSTICA** (`sessao:criadoEm:papel:hash8(conteúdo)`, FNV-1a puro no
núcleo) — dois dispositivos que carimbam a mesma conversa derivam as
MESMAS chaves, o merge por chave elimina duplicados e o push é
IDEMPOTENTE (`UNIQUE (user_id, chave)` + upsert `ignoreDuplicates`):
reenviar o mesmo histórico não cria linhas. Mensagens pré-v58 são
carimbadas UMA vez com timestamp sintético (`baseEm + índice`) que serve
só para ordenar o merge — nunca é mostrado como hora real. A persona
(mensagem `system`) NUNCA é guardada: é reconstruída a cada envio; só o
`personaId` viaja na linha da pergunta para reconstruir a conversa
importada noutro dispositivo.

## Onde vive

| Camada | Ficheiro | Papel |
| --- | --- | --- |
| Migração | `supabase/migrations/20261117_ia_historico.sql` | tabela + CHECKs (superfície ia/npc, papel, caps de conteúdo) + RLS (SELECT/INSERT/DELETE próprios, **sem UPDATE** — histórico imutável) + UNIQUE(user_id,chave) + janela deslizante server-side (60 por sessão) |
| Núcleo isomórfico | `src/lib/iaHistorico.ts` | `chaveDe`/`hashFnv1a`, `validarMensagemHistorico`, `carimbarMensagens`, `mesclarMensagens`, `linhaParaMensagem`/`mensagemParaLinha`, `agruparPorSessao`, `capSessoes` **+ o gestor PostgREST** (`criarGestorHistoricoIa`) — browser E Node no MESMO módulo (o supabase real é carregado por preguiça; os testes injetam mock) |
| Página /ia | `src/pages/IaBateu.tsx` | pull no montar (importa conversas de outros dispositivos, merge por chave), push depois de cada troca (pergunta+resposta, e também a parcial do abort), apagar conversa → apagar no servidor, badge de estado no cabeçalho |
| NPC da Praça | `src/components/cidade/NpcIa.tsx` | pull no montar (janela única `SESSAO_NPC="praca"`), push por troca, `limpar` → `apagarTudo`, chip de estado no painel |
| Meta nos tipos | `src/lib/nemotron.ts` (`MsgIa`) · `src/game/cidade/npcIa.ts` (`MsgNpc`) | `chave?/criadoEm?/tokens?` opcionais — **FIO SEGURO**: `validarMensagens` corta para `{role, content}`, a meta nunca chega ao modelo |
| Proxy | `server/ia-proxy.mjs` | sem rotas novas; saúde **v58** |
| i18n | `scripts/add-ia-i18n-v58.py` | 5 chaves `ia.sinc.*` × 6 idiomas (partilhadas pela /ia e pelo NPC) |
| Testes | `test-ia-v58.mjs` | A núcleo · B PostgREST mockado · C Supabase real (skippável honesta) · D E2E /ia + /cidade |

## Estados honestos (nunca um estado falso)

- **`convidado`** — sem sessão: o servidor NUNCA é tocado (zero pedidos —
  provado no teste B e no E2E com contador de rotas). O badge/chip diz
  «Só neste dispositivo — entra para sincronizar».
- **`migracao`** — a tabela ainda não existe (PGRST205): a migração está
  no repo mas ainda não foi aplicada ao projecto. O UI declara
  «Sincronização pendente da migração» e o chat segue 100% local — nunca
  finge que sincronizou.
- **`erro`** — o motivo REAL do servidor no tooltip (mensagem truncada,
  sem invenção). O push não bloqueia nem rebenta o chat.
- **`sincronizado`** — correu de verdade, com contagens reais.
- **`aSincronizar`** — transitório no montar; desaparece assim que a
  realidade chega.

## Regras honestas declaradas

- **Sem UPDATE no servidor**: o histórico é imutável — insere no fim,
  apaga sessão inteira quando o utilizador pede (`apagarSessao`/
  `apagarTudo` com os filtros do PostgREST; o RLS limita ao próprio
  utilizador). Limpar o NPC apaga TAMBÉM no servidor quando há sessão.
- **Caps coerentes nos dois lados**: conteúdo ≤ 8000 chars (CHECK na
  tabela + truncagem no núcleo), raciocínio ≤ 8000, tokens ≥ 0 (inválido
  → NULL, nunca inventado), janela deslizante 60 por sessão (trigger
  server-side) e cap de 20 sessões importadas (igual ao CONVERSAS_CAP da
  /ia).
- **Linhas podres NUNCA matam a sincronização**: `linhaParaMensagem`
  devolve null com contagem honesta (`descartadas`) — uma linha corrompida
  no servidor não apaga a conversa do utilizador.
- **Conflito de chave → o SERVIDOR ganha** (fonte de verdade); o local só
  entra com chave nova. `deServidor`/`duplicadas` contados no merge.
- **A meta não vai ao modelo**: provado no teste A (FIO SEGURO) e no E2E
  (o corpo capturado pelo upstream mock não tem `chave`/`criadoEm`).
- **Aplicar a migração é passo do utilizador** (Dashboard → SQL Editor ou
  `supabase db push`); enquanto isso, a plataforma funciona em modo local
  declarado — o teste C real faz SKIP com a migração apontada, nunca finge.

## Furos reais fechados (com repro)

1. **`insert().onConflict().ignoreDuplicates()` não existe no
   postgrest-js v2** — a forma encadeada rebenta em runtime; a API real é
   `upsert(rows, { onConflict, ignoreDuplicates })`. Apanhado ao escrever
   o teste B (contrato conferido no dist do pacote).
2. **Import estático do supabase partia o Node** — `import.meta.env` no
   topo do cliente (e o alias `@/`) não existem fora do Vite. O gestor
   passou a carregar o cliente real POR PREGUIÇA (só quando usado) no
   MESMO módulo puro — o teste Node prova o fio com cliente injetado.
3. **Chave por índice perdia perguntas repetidas** — duas perguntas
   IGUAIS na mesma sessão teriam a mesma chave e o merge colapsaria a
   segunda. A chave passou a usar o `criadoEm` (único por evento); o
   índice é só fallback. Provado no teste A («pergunta IGUAL em momento
   diferente NÃO se perde»).
4. **`carimbarMensagens` descartava o histórico pré-v58** — mensagens sem
   `criadoEm` falhavam na validação estrita e viravam «descartadas». O
   carimbo agora injeta o timestamp sintético ANTES de validar (e nunca
   muta os objectos de entrada — provado).
5. **on_conflict chega URL-encoded** (`user_id%2Cchave`) — a asserção do
   teste compara com `decodeURIComponent` (furo de teste, mas o fio real
   ficou documentado).
6. **`.env` com valores entre aspas** — o parse do teste C criava o
   cliente com `"https://…"` (aspas incluídas) e o supabase-js recusava.
   Strip de aspas no parser.
7. **`test-ia-v57` fixava a saúde em `=== "v57"`** — relaxado para
   `v5[7-9]` (padrão v54→v55→v56: gerações novas não quebram suítes
   antigas).

## Testes (test-ia-v58.mjs — 70 verdes ×2 corridas, 1 skip honesto)

- **A) Núcleo ×41** (Node): caps, determinismo da chave (e diferenciação
  por criadoEm/papel/sessão/conteúdo), validação (papel/conteúdo/
  criadoEm → `ErroHistoricoIa`; truncagem ao cap; tokens absurdos → NULL),
  carimbo pré-v58 (sintético, determinismo entre dispositivos, chave
  existente mantida, entrada não mutada), merge (dedupe por chave, o
  servidor ganha, ordem, cap «mais recentes»), round-trip linha↔mensagem
  (7 linhas podres → null com contagem), agrupar sessões (ordem, persona,
  cap), FIO SEGURO (`validarMensagens` corta a meta) e NPC com meta
  validada.
- **B) PostgREST mockado ×18**: CONVIDADO → modo «convidado» com ZERO
  pedidos; GET com `superficie=eq.ia&order=criada_em.asc`; POST com
  `on_conflict=user_id,chave` (URL-encoded) + `Prefer:
  resolution=ignore-duplicates`; linhas completas com persona só na
  pergunta; push vazio → sem pedido; DELETE com os dois filtros;
  apagarTudo por superfície; PGRST205 → «migracao»; 500 → «erro» com o
  motivo real.
- **C) Supabase real (skippável honesta)**: anon select → a migração ainda
  não aplicada (PGRST205) → SKIP com o caminho do SQL apontado. Quando
  aplicada, prova o RLS a bloquear o anónimo e, se o signUp devolver
  sessão (projecto sem confirmação de email), o ciclo COMPLETO corre de
  verdade: push 2 linhas → pull igual → re-push idempotente (sem
  duplicar) → apagarTudo → pull vazio.
- **D) E2E ×10** (/ia + /cidade): badge `/ia` honesto de convidado, chat
  regredido (streaming pelo proxy v58), meta NUNCA no corpo capturado
  pelo upstream, NPC na cidade com chip honesto, resposta em streaming,
  e **CONVIDADO faz ZERO pedidos a `rest/v1/ia_historico`** (contador de
  rotas na página — a honestidade é medida). Zero erros de console.
  `shots-v58/ia-sinc-convidado.png` · `shots-v58/npc-praca-v58.png`.

## Regressão (tudo verde)

`test-ia-v54` 37/0 · `test-ia-v55` 62/0 · `test-ia-v56` 54/0 ·
`test-ia-v57` 54/0 (live NVIDIA na persona, com o E2E da praça intacto) ·
`test-cidade` 37/0 · tsc 0 · build OK (badge e chip no bundle).

## O que fica (honesto)

- A migração `20261117_ia_historico.sql` precisa de ser aplicada ao
  projecto (Dashboard → SQL Editor); até lá o UI declara «migração
  pendente» e tudo corre local — sem fingimento.
- O ciclo REAL com utilizador (push/pull entre dois dispositivos) foi
  provado contra PostgREST mockado (fio byte a byte) e, na C, contra o
  Supabase vivo assim que a tabela existir + o projecto permitir signUp
  com sessão imediata; se exigir confirmação de email, o teste declara e
  salta — nunca finge.
- O histórico sincronizado não transporta os parâmetros
  (modelo/temperatura/max_tokens) nem o índice RAG de cada conversa —
  importa-se o fio (personaId + mensagens), declarado.
- O cap de sessões (20) e a janela (60/sessão) são os mesmos do lado do
  cliente e do trigger SQL — conversas mais antigas que isso saem
  primeiro no lado do servidor (janela deslizante declarada).
- Próximos passos anotados: RAG do NPC quando o `nemotron-3.5-embed-8b`
  sair do 422 (o MESMO índice da v56 leria a plataforma na praça);
  presença própria do NPC no servidor MP (posição partilhada em tempo
  real).
