# REA — IA NEMOTRON (NVIDIA) — BATEU IA /ia — v54

> REA = Registo E Arquitectura. O que ficou, como funciona, o que é honesto.

## 1. O que é

O utilizador pediu: «Acrescenta essa IA para a minha plataforma e adiciona todas as
funcionalidades extras para tornar a plataforma muito ultra avançada» — com o snippet
oficial da NVIDIA (`integrate.api.nvidia.com`, modelo `nvidia/nemotron-3-ultra-550b-a55b`,
`enable_thinking`, streaming, `reasoning_content`). A v54 integra EXACTAMENTE esse contrato
na plataforma, com a cultura de casa: núcleo isomórfico, testes reais, zero fingimento.

## 2. Arquitectura (o browser NUNCA conhece a chave)

```
browser (página /ia, src/lib/nemotron.ts)
   │  POST {messages, model, temperature, top_p, max_tokens, stream:true,
   │        stream_options.include_usage, chat_template_kwargs.enable_thinking}
   ▼
[dev/testes] server/ia-proxy.mjs  — porta 8788 · rate-limit por IP · SSE tubo puro
[produção]   supabase/functions/nemotron-chat — JWT obrigatório · segredo NVIDIA_API_KEY no Deno
   ▼
https://integrate.api.nvidia.com/v1/chat/completions   (nvidia/nemotron-3-ultra-550b-a55b)
```

Três modos de endpoint (resolvidos em `IaBateu.tsx → resolverEndpoint()`):
1. **edge** (por omissão em produção): `VITE_SUPABASE_URL/functions/v1/nemotron-chat` com o JWT do utilizador;
2. **proxy** (dev/testes): `VITE_IA_ENDPOINT` — o proxy local injeta a chave do `.env.ia` (gitignored);
3. **directo** (SÓ dev, declarado no UI): `VITE_NEMOTRON_DIRECTO=1` + `VITE_NVIDIA_API_KEY` — a chave fica no bundle, risco assumido e visível no chip do cabeçalho.

## 3. Núcleo puro isomórfico — `src/lib/nemotron.ts`

O MESMO módulo corre no browser e no Node (padrão v46–v53, zero DOM/imports):
- `construirCorpo` — o contrato EXACTO do snippet do utilizador (incl. `extra_body` do SDK =
  `chat_template_kwargs.enable_thinking` no corpo cru; `stream_options.include_usage`).
- `drenarSse` / `analisarEventoSse` — parser SSE byte a byte: `\n\n` e `\r\n\r\n`, buffers
  parciais, linhas corruptas ignoradas, `reasoning_content` separado de `content`, `usage`
  do chunk final (os chunks SEM choices são legítimos — o snippet salta-os), `[DONE]`.
- `ClienteNemotron.conversarStream` — retry com backoff SÓ antes do 1.º byte (nada de
  duplicar respostas a meio), timeout de ligação, AbortSignal propagado ao upstream
  (o STOP cancela a geração a sério), rate-limit do cliente (janela deslizante,
  20/min + intervalo 250 ms), `usage` NULL quando o upstream não envia (nunca inventado).
- `htmlDeMarkdown` — ESCAPA sempre primeiro; depois só marcações seguras (negrito,
  itálico, código, blocos ```…```, títulos, listas, ligações https). XSS provado no teste.
- Conversas: `novaConversa/tituloDe/conversaParaMarkdown/validarMensagens` — dados puros,
  persistência é do chamador.

## 4. Proxy local — `server/ia-proxy.mjs` (zero dependências)

- `POST /api/ia/chat` → validação (mesmas regras do núcleo: papéis, caps 40 msgs /
  32 000 caracteres / max_tokens 16 384) → forward com `Authorization: Bearer $IA_NEMOTRON_KEY`
  → SSE do upstream TUBO byte a byte (zero re-escrita).
- `GET /api/ia/saude` — estado real SEM furo de chave (só `chaveConfigurada: true/false`).
- Rate-limit por IP: balde de fichas (6 de rajada, 12/min) → 429 com `Retry-After`.
- Corpo cap 256 KB (413), desconexão do cliente PROPAGADA ao upstream (não há tokens
  pagos escondidos), CORS declarado, `IA_ENVFILE` para testes (503 sem chave é provado).

## 5. Edge function de produção — `supabase/functions/nemotron-chat`

Padrão `mascot-chat`: CORS, JWT verificado (obrigatório — computação paga), rate-limit
por utilizador POR ISOLATE (declarado — é o máximo de uma função sem estado partilhado),
validação + clamp idênticos ao núcleo, tubo SSE puro de volta ao browser.
Deploy: `supabase secrets set NVIDIA_API_KEY=... && supabase functions deploy nemotron-chat`.

## 6. UI — `src/pages/IaBateu.tsx` (/ia)

- Chat com streaming real token a token + cursor de escrita; **painel de PENSAMENTO**
  separado (o `reasoning_content` do Nemotron) com mostrar/ocultar global.
- **6 personas** (Guia da Bateu · Comentador · Criativo · Tradutor · Programador · Modo
  profundo) — prompts de sistema com contexto REAL da plataforma, regras honestas (nunca
  inventar sorteios/vencedores/licenças, jogo responsável) e «responde na língua do utilizador».
- **Multi-conversa persistente** (localStorage `bateu.ia.v54`, cap honesto de 20), apagar,
  exportar .md.
- **Parâmetros completos**: modelo (catálogo + id personalizado), temperatura, top_p,
  max_tokens, modo pensamento — sliders com caps do núcleo.
- **STOP** a meio (AbortController → upstream cancelado); nota honesta «Geração parada
  por ti» na mensagem parcial.
- **Estatísticas REAIS** do usage do servidor (tokens, tok/s, 1.º token) — nunca estimadas.
- **Erros honestos**: banner `ia-erro` com o estado HTTP real; parcial guardado com ⚠️.
- Renderização markdown segura (`htmlDeMarkdown` + escape primeiro).
- i18n **6 idiomas** (en · pt · pt-BR · es · fr · hi — 67 chaves `ia.*` cada + nav/footer).
- Entradas: rota `/ia` (App.tsx), item no mega-menu «Mais» da Navbar (badge NOVO),
  ligação no Footer (`footer-ia`).

## 7. Testes — `test-ia-v54.mjs` (50/50 ×2 corridas)

- **A) Núcleo no Node** (14): contrato do corpo + clamps; parser SSE (CRLF, buffer
  parcial, resto+continuação, linhas corruptas, usage); rate-limit (janela + intervalo);
  markdown (marcações, XSS impossível, bloco de código escapado); conversas; validação.
- **B) Cliente ↔ mock NVIDIA** (8): streaming completo com eco de auth; raciocínio
  separado; usage real + tok/s; ordem dos eventos; retry 500→200 antes do 1.º byte;
  429 do upstream; abort a meio (parado honesto + parcial).
- **C) Proxy real** (15): saúde sem furo; preflight CORS; SSE ÍNTEGRO byte a byte
  (comparação exacta com o esperado, incluindo o eco de auth na ordem certa do mock);
  400 ×3 (papel/JSON/cap); 404; 413; 429 com Retry-After; sem chave → 503 honesto ×2.
- **D) E2E Playwright** (13): página, personas, thinking por defeito do «Modo profundo»,
  streaming vivo pelo proxy+mock, painel de pensamento, stats, STOP A MEIO (com espera
  explícita pelo botão — o raster do sandbox é ~2 fps, lição v53), persistência após
  reload, erro REAL (proxy morto), zero erros de console não-ruidosos, screenshot
  `shots-v54/ia-chat.png` (1360×900, 19,8% de pixeis activos).
- **E) LIVE NVIDIA** (1): chamada REAL com a chave do `.env.ia` — o stream respondeu
  (`uso = {prompt 26, completion 24, total 50}`, conteúdo "BATEU V54", raciocínio ~52
  caracteres) nas TRÊS corridas. Skippável honesta se a rede/chave falharem (nunca finge).

FUROS REAIS das corridas (todos fechados): (1) o `node --experimental-strip-types` não
aceita *parameter properties* TS — as duas classes do núcleo passaram a campos explícitos;
(2) o corte do buffer parcial no teste partiu «content» ao meio (conte|ntent) — o corte
certo é conte|nt; (3) o esperado do tubo do proxy não incluía o eco de auth do mock —
função partilhada `corpoSseEsperado(marker, corpo, comAuth)`; (4) o teste do erro não
MATAVA o proxy (agora `proxyProc.kill("SIGKILL")` + espera); (5) o check instantâneo do
STOP a 900 ms era frágil no raster por software — espera explícita de 3,5 s + stream
LENTO alargado (12 × 400 ms); (6) zombies do vite de corridas interrompidas serviam
a porta 8099 com 404 (a lição v49/v53 «servidor FRESCO por corrida» estende-se ao E2E:
a suíte agora exige HTTP 200 no boot do vite).

## 8. Honestos (o que fica)

- A chave NVIDIA vive em `.env.ia` (gitignored) para dev/local; o `.env` do repo continua
  TRACKED — decisão do utilizador; a v54 adicionou `.env.ia`/`.env.local`/`server/.env`
  ao `.gitignore` e NUNCA escreveu a chave em ficheiro rastreado. Recomendação: rodar a
  chave no painel NVIDIA (foi colada numa conversa) e manter-se só edge function em produção.
- O rate-limit da edge function é POR ISOLATE (declarado dentro do ficheiro) — o limite
  duro real é o do próprio upstream; o portão do cliente e o proxy cobrem dev e abuse básico.
- A conversa fica no localStorage do dispositivo (cap 20) — não há sincronização
  entre dispositivos nem servidor de histórico (passo anotado).
- `MODELOS_CONHECIDOS` tem só o modelo VERIFICADO; ids outros são aceites no campo
  personalizado (o erro real do upstream aparece — sem catálogo fingido).
- O `mcpPlugin` do Lovable e o `mascot-chat` (Gemini) continuam intocados — a Nemotron
  é um canal NOVO ao lado, sem segunda fonte.

## 9. Verificação

tsc 0 · build OK (chunk lazy `IaBateu` emitido) · test-ia-v54 **50/50 ×2 corridas** ·
regressão test-web-v262 **11/11** · screenshot `shots-v54/ia-chat.png` ·
live NVIDIA real ×3 (usage completo).
