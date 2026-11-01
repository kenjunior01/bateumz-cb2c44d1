# REA — APIs Públicas (public-apis) · v25

> Pedido: "adicione https://github.com/public-apis/public-apis que combine com a plataforma".
> Método: candidatas validadas **ao vivo** (payload + CORS + limites) antes de qualquer código.
> Princípio da v23/v24 mantido: dados 100% reais, atribuição visível, zero teatro.

## 1. Seleção (candidatas avaliadas)

| API (public-apis) | Veredicto | Motivo (validado ao vivo) |
| --- | --- | --- |
| **FreeToGame** (`freetogame.com/api`) | ✅ INTEGRADA | HTTP 200 + `Access-Control-Allow-Origin: *`, sem chave. Catálogo real de jogos F2P — fit direto com uma plataforma de jogos. |
| **Open Trivia DB** (`opentdb.com`) | ✅ REA do cliente | Já era usada no Milionário de forma frágil (sem token → perguntas repetidas; sem rate-limit → code 5 silencioso; shuffle enviesado). Reescrita. |
| **TheSportsDB** (v24) | ✅ EXPANDIDA | Mesma fonte já homologada; acrescentada a **Primeira Liga de Portugal (id 4429)** — fit direto com o público lusófono. 8 ligas no total. |
| CheapShark (deals Steam) | ❌ DESCARTADA | Passou a exigir User-Agent descritivo → **impossível no browser** (fetch proíbe definir UA). Validado: HTTP 400 "Missing or generic User-Agent". |
| CoinGecko (cripto) | ❌ DESCARTADA | Não combina com carteira de moedas de jogo em MZN (risco de confusão monetária/regulatória). |
| PandaScore (e-sports) | ❌ DESCARTADA | Requer chave paga; plano gratuito sem CORS aberto. |
| APIs de dados falsos (RandomUser, placeholder…) | ❌ DESCARTADAS | Contradizem a honestidade implementada na v23/v24. |
| Deck of Cards / QR server | ⏸️ Fora de escopo | Fit menor; manter foco no que agrega valor comprovado nesta ronda. |

## 2. O que foi integrado

### 2.1 Hub "Jogos Grátis" — `/jogos-gratis` (novo)
- **Fonte:** FreeToGame, catálogo completo (~420 jogos) obtido em **UM pedido** (`?sort-by=popularity`) + cache 60 min + filtragem/ordenação 100% no cliente — nunca martelamos a API com um pedido por filtro.
- **UI** (padrão DesportoHub, mobile-first): busca por título/editor/estúdio/género (normalizada sem acentos — pt misto com inglês), chips de plataforma (Todas/PC/Browser), géneros derivados dos dados com contagens (MMORPG 159, Shooter 105…), ordenação Populares/A–Z/Recentes, dialog de detalhe com CTA **"Jogar no site oficial"** (nova aba, `rel="noopener"`).
- **Estados honestos:** skeleton, erro com retry (recupera ao rearmar a rede), vazio com instrução, atribuição "Catálogo de jogos © FreeToGame (freetogame.com)" no cabeçalho e rodapé.
- **Integração:** rota lazy no App.tsx, item desktop no mega-menu "Entretenimento", ação rápida e item no drawer mobile, chave i18n `games.free` nos 5 idiomas (en/pt/pt-BR/es/fr/hi), SEO canónico.
- **Perf:** cache localStorage + dedupe de pedidos em voo + stale-on-error (offline serve o último catálogo válido).

### 2.2 Open Trivia DB — REA completo (`src/lib/openTriviaDB.ts`)
Problemas reais corrigidos:
1. **Session token** (`api_token.php`) persistido — acabou a repetição de perguntas entre jogos; codes 3/4 → reset automático e retry.
2. **Fila serializada (1,2 s)** + retry com backoff no code 5 (rate limit) — antes era silencioso e devolvia `[]`.
3. **Fisher-Yates com `crypto.getRandomValues`** — o `sort(() => Math.random() - 0.5)` enviesava as posições das respostas.
4. **`decodeHTMLEntities` via DOMParser** — sem `<textarea>.innerHTML` no DOM vivo.
5. **Cache curto (5 min) + dedupe em voo** — protege contra duplo mount (StrictMode) e marteladas.
- **Novo:** `TRIVIA_CATEGORIES` (12 categorias oficiais com rótulos PT), `getReadyQuestions()` (busca+decode+shuffle), `getLadderQuestions()` — escada de dificuldade **easy→medium→hard**.
- **Quiz Milionário** (`MillionairePage`): agora usa a escada real estilo WWTBAM (5 fáceis → 5 médias → 5 difíceis); fallback em cascata (escada → busca única → perguntas locais com aviso honesto).
- Compat preservada: `fetchTriviaQuestions` / `decodeHTMLEntities` / `shuffleAnswers` mantidos para os 2 consumidores existentes.

### 2.3 Desporto — 8.ª liga
- **Primeira Liga (Portugal, id 4429)** adicionada a `SPORT_LEAGUES` — jornadas, resultados e Top 5 com o mesmo pipeline v24 (cache/fila/status honestos).

### 2.4 REA de qualidade no caminho (bugs reais encontrados)
- **`menu.liveHub` aparecia CRUA no drawer mobile** (chave inexistente em TODOS os dicionários) → criada nos 5 idiomas.
- **`desporto.real` e `games.free` não existiam em es/fr/hi** (mostrariam chave crua) → criadas nos 3.

## 3. Validação

- **E2E novo `test-apis-publicas.mjs`: 30/30 ✅** — hub com mock determinístico (regex, não glob): render, filtros PC/Browser/género, busca, ordenação A–Z/Recentes, dialog com link real, erro→retry, cliente trivia testado **in-page** via módulo vite (escada 15 perguntas easy→medium→hard, decode seguro, shuffle sem perda), token persistido, Milionário carrega, navbar desktop + drawer mobile navegam até `/jogos-gratis`, mobile 390×844 sem overflow horizontal, **smoke real FreeToGame (>100 jogos)**.
- **Regressões: test-desporto 14/14 (agora "8 ligas", smoke real TheSportsDB ✅) · test-rea-plataforma 33/33 · test-home-dinamica 22/22 · test-web-excellence 23/23 ✅**
- **tsc 0 erros · vite build OK**
- **Visual com dados REAIS (sem mocks):** 421 jogos carregados; desktop 4 colunas com géneros/contagens reais; mobile 2 colunas com tab bar nativa; screenshots verificados.

## 4. Limites honestos (documentados na UI)

- FreeToGame não serve stats de popularidade granulares — a ordenação "Populares" é a ordem editorial da fonte.
- Os jogos abrem **no site oficial** — não fazemos proxy/iframe de terceiros.
- Open Trivia DB: sem garanta de perguntas em português (catálogo maioritariamente EN) — o Milionário mantém fallback local PT e a categoria é escolhida pelo anfitrião.
- TheSportsDB gratuito: Top 5 (não tabela completa) e sem minuto-a-minuto — igual à v24.
