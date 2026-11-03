# REA — APIs Públicas (public-apis) · v34

> Pedido: "acrescenta tudo que for necessário dessas apis para estar tudo bem enquadrado na plataforma e o jogo esteja também muito bem" (github.com/public-apis/public-apis).
> Método mantido desde a v25: candidatas validadas **ao vivo** (payload + CORS + limites) antes de qualquer código, com prova guardada.
> Princípio permanente: dados 100% reais, erros honestos, atribuição visível, zero teatro.

## 1. Estado da plataforma (acumulado v25→v34)

Já integradas em rondas anteriores (todas com REA própria): FreeToGame v25 · Open Trivia DB v25 · TheSportsDB v24 · Deck of Cards v30 · PokéAPI v30 · ExchangeRate-API v30 · Lichess v31 · Open-Meteo (clima) v31/v33 · TheMealDB v32.

## 2. Candidatas desta ronda (provas em `scripts/probe-apis-v34.sh` e `scripts/probe-apis-v34b.sh`)

| API (public-apis) | Veredicto | Prova ao vivo (2026-11-03) |
| --- | --- | --- |
| **Radio Browser** (`radio-browser.info`) | ✅ INTEGRADA | HTTP 200 + `Access-Control-Allow-Origin: *`. 1.ª de MZ: "Rádio Moçambique Antena Nacional" com stream HTTPS real. |
| **Wikipédia REST PT** (`pt.wikipedia.org/api/rest_v1`) | ✅ INTEGRADA | HTTP 200 + CORS `*` (summary de "História de Moçambique"). 17 títulos PALOP verificados 1 a 1 (os 429 transitórios eram rate-limit do IP partilhado — Luanda/Maputo/Cabo Verde reconfirmados no smoke real do E2E). |
| **Frankfurter** (`api.frankfurter.dev`) | ✅ INTEGRADA | HTTP 200 + CORS em `/v1/latest` e `/v1/{dias}..` (série real EUR→USD). NOTA: o domínio antigo `.app` responde 301 — usar `.dev`. |
| **Open-Meteo Air Quality** (`air-quality-api.open-meteo.com`) | ✅ INTEGRADA | HTTP 200 + CORS com `european_aqi,pm2_5` para Maputo (timezone Africa/Maputo). |
| TheAudioDB | ❌ DESCARTADA | HTTP 404 com as chaves públicas 1 e 2 (`{"Message":"Not found"}`) — plano free mudou. |
| Quotable | ❌ DESCARTADA | TLS handshake pendurado (curl sem resposta; ligação morre após Client Hello). |
| Open Library | ❌ DESCARTADA | Connection timeout ×2 (12 s) a partir do sandbox — sem validação ao vivo não se integra (mesmo critério do jikan na v32). |

## 3. O que foi integrado

### 3.1 Rádios PALOP ao vivo — `/lives` + Quiosque da Praça no jogo
- **Fonte:** Radio Browser por código ISO EXACTO (MZ/AO/CV), `hidebroken=true`, ordenação por votos da comunidade, limite 12; 3 espelhos (de1/nl1/fi1) tentados em ordem.
- **UI (`src/components/lives/RadiosPALOP.tsx`):** tabs 🇲🇿/🇦🇴/🇨🇻, um único `<audio>` partilhado, estados honestos (`A ligar à emissão…` → `● A emitir ao vivo` → **erro do stream visível** quando o emissor está offline — nunca fingimos que toca), codec/bitrate/tags reais, link para a homepage do emissor, atribuição "© Radio Browser · estações da comunidade".
- **No jogo:** o **Quiosque da Praça** (novo, a NE do imbondeiro em `[5,-5]`) abre o mesmo widget em modal com tabs **Rádio da Cidade | Quiz** — "sempre algo para fazer" dentro do mundo.
- Streams HTTP puros são filtrados fora da lista (uma página HTTPS não os toca — não prometemos o que não funciona).

### 3.2 "Sabias que?" — `/community`
- **Fonte:** resumo oficial da Wikipédia PT (REST summary), **17 artigos PALOP verificados** em rotação diária determinística (UTC): Moçambique/Angola/Cabo Verde + histórias + cidades (Maputo, Luanda, Praia, Mindelo, Ilha de Moçambique) + cultura (Marrabenta, Morna, Kizomba, Semba, Funaná, Imbondeiro).
- Texto real (não reescrevemos), thumbnail com fallback, link para o artigo oficial, cache 24 h, erro (429/rede) honesto com retry, atribuição "Resumo © Wikipédia (CC BY-SA)".

### 3.3 Tendência de câmbio 30 dias — `/wallet`
- **Fonte:** Frankfurter (BCE) — série real dos últimos 30 dias em sparkline SVG com variação % real (1.º→último dia), min–max e período da fonte.
- **Honestidade monetária:** o BCE **não publica MZN/AOA/CVE** — para esses pares o card mostra "histórico indisponível (BCE não publica esta moeda)" e mantém só a taxa atual real da ExchangeRate-API. Nunca inventamos série.

### 3.4 Qualidade do ar real — Cidade Bateu
- **Fonte:** Open-Meteo Air Quality (EAQI europeu + PM2.5) para a cidade do clima (Maputo por omissão).
- Painel de clima na Sala de Troféus mostra "Qualidade do ar: {rótulo} (EAQI {n}) · PM2.5 …" com as bandas oficiais do índice europeu (traduzidas) e atribuição CC BY 4.0.

### 3.5 Quiz da Praça — perguntas reais dentro do jogo
- **Fonte:** Open Trivia DB (mesma base do Milionário v25, token de sessão + fila + Fisher-Yates já endurecidos) via `getReadyQuestions` (decodificada + opções embaralhadas com crypto).
- 6 perguntas em escada real **2 fáceis → 2 médias → 2 difíceis** ("moderado → difícil"); +2 créditos de cidade por acerto, creditados SÓ no fim (`adicionarCreditosCidade`).
- **Nota honesta visível:** o catálogo da fonte é em inglês; mostramos como está, sem traduções feitas por conta própria.

## 4. BUGS REais apanhados pelo E2E (prova do valor do método)

1. **Erro do stream de rádio invisível:** a mensagem de erro estava condicionada a `ativo`, que volta a `false` no próprio erro — a mensagem apagava-se a si mesma. Corrigido (erro fica na linha da estação).
2. **Quiz crashava a página inteira:** `getLadderQuestions` devolve o formato **BRUTO** da API (consumidor real: Milionário) — o quiz assumia `{text, options}` e o `options.map` lançou `TypeError` que o ErrorBoundary engoliu (modal desaparecia). Corrigido: o quiz constrói a escada com `getReadyQuestions` (formato decodificado), sem tocar no contrato do Milionário.
3. **Flake rAF (lição v31 reincidente):** cliques do Playwright penduraram-se em "waiting for scheduled navigations" sob o loop 60 fps — interações do quiz migradas para `dispatchEvent` + `waitForFunction`.

## 5. Validação

- **E2E novo `test-apis-v34.mjs`: 35/35 ✅** — rádios no LiveHub (mock regex) com troca de país e erro honesto de stream; Sabias que? com erro→retry em contexto limpo; conversor com nota honesta MZN + sparkline USD→EUR (variação 2,22% do mock, período real exibido); cidade com quiosque carimbado (balcão 15/folhas 8/tocha 17), portal por proximidade, rádio no modal, quiz 6/6 com +12 créditos reais em `localStorage`, AQI "Razoável (EAQI 22)" nos troféus; mobile 390 sem overflow; sem erros de consola fatais.
- **Smokes reais no próprio E2E:** Radio Browser MZ real (≥1 estação) · Wikipédia real (extracto de "Moçambique") · Frankfurter real (EUR→USD) · Air Quality real (EAQI Maputo) — 4/4 ✅.
- **Regressões:** test-cidade **31/31** · test-apis-publicas (v25) **30/30** · test-v30-apis-design **31/31** ✅ · `tsc` 0 erros · `vite build` OK.
- **Visual:** 8 screenshots em `shots-v34/` verificadas (rádios, sabias que, trend, praça com quiosque, modal rádio, modal quiz, troféus com AQI, mobile).

## 6. Limites honestos (documentados na UI)

- Rádios: streams de emissores reais caem e voltam — o erro é mostrado; lista filtrada a HTTPS; ordenação "votos" é a da comunidade Radio Browser.
- Wikipédia: resumos são o texto da enciclopédia (CC BY-SA) — rotação diária de 17 artigos verificados; 429s são rate-limit legítimo e aparecem como erro com retry.
- Frankfurter: só moedas BCE (EUR/USD/BRL/ZAR entre as nossas); MZN/AOA/CVE ficam SEM histórico, com nota — a taxa atual continua a vir da ExchangeRate-API (v30).
- Quiz: perguntas em inglês (fonte sem catálogo PT) — nota visível na intro; créditos só de atividade real.
- AQI: modelo europeu (EAQI) aplicado a cidades PALOP — o rótulo é a banda oficial, a medição é a da fonte.
