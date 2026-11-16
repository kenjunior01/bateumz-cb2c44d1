# REA — v56 · IA LÊ A PLATAFORMA (RAG real — a memória cheia e ligada ao chat)

## O que entrou

A v54 deu a FALA, a v55 deu o OLHO e a MEMÓRIA. A v56 ENCHE a memória com os
dados REAIS da plataforma e liga-a ao chat: **pergunta → vetor query
(input_type "query", o EXACTO do snippet v55) → busca por cosseno na loja →
as melhores fontes entram como CONTEXTO no system do chat → o modelo responde
apoiado no que é REAL, com citações [1][2]** — e com a regra honesta: se o
contexto não responder, DIZ (nunca inventa sorteios, vencedores, preços ou
licenças).

## Onde vive

| Camada | Ficheiro | Papel |
| --- | --- | --- |
| Núcleo isomórfico | `src/lib/nemotron-rag.ts` | `dividirEmPassagens`, `docParaPassagens`, `montarContextoRag`, `LojaRag` — browser E Node, zero DOM |
| Mapeadores puros | `src/lib/ia-docs.ts` | linhas `raffles`/`contests`/`blog_posts` → `DocPlataforma` (testáveis no Node) |
| Consultas reais | `src/lib/ia-plataforma.ts` | supabase no browser; cada fonte independente, falhas reais em `erros` |
| UI | `src/pages/IaBateu.tsx` | card «Plataforma no índice (RAG)» na aba Buscar · toggle + badge Fontes no Conversar |
| Proxy | `server/ia-proxy.mjs` | sem rotas novas (reusa chat + vetores); saúde v56 |
| Testes | `test-ia-v56.mjs` | A núcleo · B mock · C proxy · D E2E Playwright · E live |
| Probe | `scripts/probe-group-kill-v56.mjs` | repro/prova do fix do zumbi do vite |

## Regras honestas declaradas

- **O RAG nunca mostra mais do que a UI**: `prize_value` NUNCA entra no doc
  (o sorteador pode esconder o valor); campos nulos são omitidos — nunca
  há «null» no texto que vai ao embedding.
- **Contexto só com fontes reais**: limiar de cosseno 0.15, TOP_K 3, dedupe
  por documento (a melhor passagem de cada fonte — diversidade); sem fontes
  → contexto NULL e o chat segue SEM contexto (o chamador declara, nunca
  finge que leu).
- **Citações honestas**: cada fonte entra como `[N] (tipo · pontuação%)`
  com o caminho interno (`/raffle/…`, `/concursos/…`, `/blog/…`); a pontuação
  é o cosseno REAL e as regras do contexto mandam não a citar como facto.
- **Cap honesto**: o cap do contexto aplica-se só à parte das FONTES
  (cabeçalho e regras são fixos); fontes a mais são CORTADAS, não esmagadas.
- **Com o RAG ativo, embeddings que falham BLOQUEIAM o envio** com o erro
  real — o chat nunca responde «como se» tivesse lido a plataforma.
- **A indexação respeita os caps do snippet**: lotes ≤ 8 entradas, portão
  20/min com ESPERA honesta (aguarda o tempo real e tenta UMA vez — nunca
  dispara mais do que o declarado).
- **A chave continua NUNCA no browser** — o RAG não criou rotas novas;
  proxy v56 / edges v55 continuam a injetar a Autorização.

## FUROS REAIS fechados nesta versão

1. **Doc perdido do índice** (apanhado no teste A): um doc só com título
   (todos os campos nulos) ficava com texto vazio → `docParaPassagens`
   recusava-o e o RAG perdia o doc INTEIRO. Fix: fallback ao título nos
   três mapeadores.
2. **Contabilidade mentirosa do cap**: `montarContextoRag` somava o
   comprimento NÃO truncado da linha ao total — fontes entravam acima do
   cap declarado. Fix: a soma conta a linha final truncada.
3. **Zumbi do vite (lição v49/v53 EXTENDIDA)** — o mais grave: matar o
   «npx» não mata o NETO («sh -c vite» → «node vite»); o vite zumbi ficava
   no 8099 a servir código/env VELHOS e a regressão v55 testava contra um
   servidor STALE (a visão ia para o edge sem o `VITE_IA_ENDPOINT_VISAO`
   e os 3 testes da aba Ver falhavam MESMO com o modelo real vivo).
   Repro + prova: `scripts/probe-group-kill-v56.mjs` (spawn detached → a
   árvore do grupo morre inteira, porta livre). Fix aplicado nas TRÊS
   suítes (v54/v55/v56): `detached: true` + `kill(-pgid)` + pré-voo
   `limparZumbis()` antes de subir servidores.

## Evidência

- `test-ia-v56.mjs` — **54 verdes · 0 falhas · 1 skip honesto** ×2 corridas.
- **E2E com dados REAIS da plataforma**: no sandbox, o supabase devolveu
  8 docs publicados (1 concurso + 7 blog) e a indexação terminou com o
  toast «Plataforma indexada (8)» e o chip `passagens: 9 · docs: 9` (com o
  item manual da banana) — `shots-v56/ia-buscar-rag.png`. O chat com o RAG
  ativo mandou o CONTEXTO ao upstream (2.ª mensagem system com `[1]` e a
  fonte banana) e o badge Fontes: 1 apareceu.
- Regressão `test-ia-v55.mjs` — **78/78 · 0 falhas** (live visão REAL
  descreveu de novo a imagem do snippet, reasoning ~715 chars, usage prompt
  469) · `test-ia-v54.mjs` — **50/50 · 0 falhas** (live «BATEU V54»).
- tsc 0 erros · build OK · portas livres no fim das corridas (sem zumbis).
- SKIP honesto: `nvidia/nemotron-3.5-embed-8b` continua 422 no catálogo
  (na v55 também estava) — o RAG segue o contrato do snippet; quando o
  modelo abrir, tudo funciona sem mudanças (mesma chave, mesma forma).
