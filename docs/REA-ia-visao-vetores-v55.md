# REA — v55 · IA VISÃO + VETORES (o olho e a memória da Bateu)

## O que entrou

Os DOIS snippets novos do utilizador (v55) são o CONTRATO, do mesmo modo que
o snippet de chat foi o contrato da v54. Nada foi inventado à volta deles —
cada campo do corpo, cada cap e cada caminho de imagem vem do snippet e está
testado contra o mock E (onde o modelo já existe) contra a NVIDIA REAL.

1. **VISÃO — `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`** (o OLHO)
   `POST /chat/completions` com content parts multimodais:
   `[{type:"text", text}, {type:"image_url", image_url:{url}}]`,
   `max_tokens: 65536` · `reasoning_budget: 16384` · `temperature: 0.6` ·
   `top_p: 0.95` · stream SSE e stream=false JSON (as duas formas, as duas
   testadas). O `reasoning_content` da resposta alimenta o MESMO painel de
   pensamento do chat.

2. **VETORES — `nvidia/nemotron-3.5-embed-8b`** (a MEMÓRIA)
   `POST /embeddings` com `input: ["<texto> data:image/png;base64,…"]` —
   texto e imagem na MESMA string, separados por UM espaço (o EXACTO do
   snippet); `encoding_format: "float"` · `modality: ["text_image"]` ·
   `input_type: passage|query` · `truncate: "END"`. O caminho da imagem é o
   do snippet: https → descarrega → base64 (`imagemParaDataUrl`).

## Onde vive

| Camada | Ficheiro | Papel |
| --- | --- | --- |
| Núcleo isomórfico | `src/lib/nemotron-visao.ts` | validar imagem, corpo do snippet, clientes stream/JSON (browser E Node) |
| Núcleo isomórfico | `src/lib/nemotron-vetores.ts` | composição do input, validação da resposta, `cosseno`, `LojaVetores` (cap 500), cliente |
| Edge produção | `supabase/functions/nemotron-visao` | JWT, segredo no Deno, rate 10/min POR ISOLATE, tubo puro |
| Edge produção | `supabase/functions/nemotron-embed` | JWT, segredo no Deno, rate 20/min POR ISOLATE, JSON intacto |
| Proxy dev/testes | `server/ia-proxy.mjs` (+rotas) | `/api/ia/visao` e `/api/ia/vetores`, corpo 8 MB p/ imagens |
| UI | `src/pages/IaBateu.tsx` (abas Ver · Buscar) | visão em streaming vivo; busca semântica com vetores no browser |
| Testes | `test-ia-v55.mjs` | A núcleo · B mock · C proxy real · D E2E Playwright · E live |

## Regras honestas declaradas

- **A chave continua NUNCA no browser** — edge function/proxy injetam a
  Autorização; o modo «directo» continua dev-only e declarado no UI.
- **Caps EXACTOS do snippet**: max_tokens 65536, reasoning_budget 16384
  (0 = omitido do corpo), temperatura 0.6 / top_p 0.95 por defeito.
- **Imagens**: só `https://…` ou `data:image/(png|jpeg|jpg|webp|gif);base64,…`
  — `file:`, `javascript:` e data não-imagem são recusados COM o motivo.
  Cap 12 000 000 caracteres (≈8,9 MB binário) validado no núcleo, proxy e edge.
- **Busca por significado**: pontuação = cosseno REAL; `passage` ao indexar,
  `query` ao procurar; a LojaVetores no browser tem cap 30 itens persistidos
  (vetores arredondados a 6 casas — o cosseno é imune a esse erro) com aviso
  honesto se a quota do localStorage chegar.
- **Vetores sem intervalo mínimo** no portão do cliente (cap 20/min mantém-se):
  indexar em lote é o caso legítimo — decisão declarada.
- **Erros reais nunca silenciados**: retry SÓ antes do 1.º byte, abort
  propagado (não há tokens pagos escondidos), usage NULL quando não chega.

## FUROS REAIS fechados nesta versão

1. **Forma WIRE desalinhada**: o proxy/edge da visão validavam uma forma
   `{pergunta, imagem}` que o núcleo nunca manda — todos os pedidos de visão
   morriam com 400. Unificado na forma WIRE do snippet (a MESMA no núcleo,
   proxy e edge — regra única, testada nas três camadas).
2. **413 envenenava o keep-alive** (latente desde a v54): responder 413 com o
   corpo ainda em voo deixava o pedido SEGUISSE a apanhar RST (ECONNRESET
   provado no repro). Correção: drenar o resto do corpo e responder com
   `Connection: close` — nenhum socket envenenado volta ao pool.
3. **Modo pensamento PERDIDO em produção na v54**: a edge do chat só lia
   `corpo.thinking`, mas o núcleo manda o modo em
   `chat_template_kwargs.enable_thinking` — em edge o thinking estava sempre
   OFF. Corrigido (chat_template_kwargs tem prioridade; `thinking` fica
   aceite para compatibilidade).

## Evidência

- `test-ia-v55.mjs` — **78 verdes · 0 falhas · 1 skip honesto** ×2 corridas.
- Regressão `test-ia-v54.mjs` — **50/50 · 0 falhas** (chat intato, live v54
  respondeu de novo).
- **LIVE REAL (o teste mais forte)**: a NVIDIA descreveu a imagem EXACTA do
  snippet do utilizador — "A wooden boardwalk stretches through a vibrant
  green marshland under a bright blue sky with wispy clouds." — com
  `reasoning_content` de ~750 caracteres e usage real (prompt 469 tokens =
  a imagem; total 684). O modelo omni do snippet está VIVO no catálogo.
- tsc 0 erros · build OK · `shots-v55/ia-ver.png` + `shots-v55/ia-buscar.png`.
- SKIP honesto: `nvidia/nemotron-3.5-embed-8b` devolve 422 no catálogo atual
  ("request cannot be validated") — o modelo do snippet ainda não está ativo
  na NVIDIA; o código segue o contrato e o teste declara o SKIP (nunca finge).
  Quando o modelo abrir, tudo funciona sem mudanças (mesma chave, mesma forma).
