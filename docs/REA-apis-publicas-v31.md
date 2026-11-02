# REA — APIs Públicas v31: Xadrez Real (Lichess) + Clima Real no BateuCraft (Open-Meteo)

**Data:** 2026-11-02 · **Método:** validação ao vivo ANTES do código, zero dados inventados, erros honestos, atribuição explícita.

---

## 1. O que entrou nesta versão

| Integração | Fonte | Papel na plataforma |
| --- | --- | --- |
| **Puzzle de Xadrez do Dia** | `lichess.org/api/puzzle/daily` (sem chave, CORS `*`) | Novo jogo no LiveHub (`/lives?game=chesspuzzle`): o puzzle diário REAL — o mesmo para o mundo inteiro — com regras aplicadas pelo `chess.js`, jogadores e ratings reais do jogo de origem |
| **Clima Real** | `api.open-meteo.com` + `geocoding-api.open-meteo.com` (sem chave, CORS aberto) | Novo sistema do BateuCraft: o tempo do mundo real dentro do jogo — céu, chuva e trovoada seguem a meteorologia da cidade escolhida |

---

## 2. Validação ao vivo (2026-11-02, registada com provas)

| API / endpoint | Resultado medido | Veredicto |
| --- | --- | --- |
| `lichess.org/api/puzzle/daily` | **HTTP 200** + `access-control-allow-origin: *` + puzzle completo (fen, solution, rating, players) | ✅ Integrado |
| `geocoding-api.open-meteo.com/v1/search?name=Luanda` | **HTTP 200** + 3 resultados reais (Angola) | ✅ Integrado |
| `archive-api.open-meteo.com/v1/archive` (host da MESMA família de resposta) | **HTTP 200** + `weather_code` WMO reais (53, 61) — valida a forma da resposta | ✅ Prova de forma |
| `api.open-meteo.com/v1/forecast` | **HTTP 429** — limite diário do IP **partilhado** deste ambiente | ⚠️ Smoke real pendente; a forma da resposta foi validada no host-irmão acima; se falhar no browser, o jogo mostra o erro real e mantém o clima simulado (nada finge) |
| `api.chess.com/pub/puzzle/daily` | **HTTP 403** (Cloudflare "Just a moment...") | ❌ Descartada com prova |
| `wttr.in/Luanda?format=j1` | Sem resposta utilizável neste ambiente | ❌ Descartado |
| `restcountries.com/v3.1/all` | **HTTP 301** → dump estático "legacy.json" (API em descontinuação) | ❌ Descartada |

---

## 3. Formato da Lichess — confirmado empiricamente

Confirmado com script próprio (`scripts/lichess-format-probe2.mjs`) + `chess.js` sobre a resposta real:

- `puzzle.fen` = posição **DEPOIS** da última jogada do adversário (somos nós a mover);
- `puzzle.lastMove` = informativo (destaque no tabuleiro, não é para aplicar);
- `puzzle.solution` = linha completa em UCI começando na NOSSA jogada; repete-se legalmente de ponta a ponta a partir de `fen` (verificado: replay legal end-to-end).

O endpoint **daily** usa `solution` (singular) + `lastMove`; o endpoint por-id usa `solutions` (plural) — a lib consome o daily.

---

## 4. Decisões de engenharia

**Xadrez (`src/lib/lichessPuzzle.ts` + `src/components/livegames/ChessPuzzle.tsx`)**
- Cache em `localStorage` com a chave do **dia UTC**: 1 pedido real por dia por navegador; dedupe em voo; **stale-on-error honesto** (puzzle de ontem serve com aviso "cache honesta" se a rede cair).
- `fetch(..., { cache: "no-store" })` — descoberto em E2E: o HTTP-cache do browser servia o puzzle de uma sessão anterior e contornava a nossa cache/erros. A política de reuso é NOSSA (localStorage), nunca a do browser.
- Regras por `chess.js` 1.4: só a jogada da solução é aceita; jogadas legais mas erradas NUNCA tocam no tabuleiro (bug real apanhado pelo E2E: aplicava e ficava sujo) — contam como tentativa errada.
- Promoção: se a solução pede peça específica, só essa variante é tentada.
- Tabuleiro virado 180° quando jogam as negras; resposta do adversário reproduzida automaticamente (480 ms); "Ver a solução" só depois de 2 erros e vale 1 ponto (aprendizagem honesta).
- Peças = símbolos Unicode de xadrez (U+2654–265F) — os glifos padrão, não imitações.

**Clima Real (`src/lib/openMeteo.ts` + BateuCraft)**
- Cache 30 min por cidade + dedupe + stale-on-error (<6 h); refetch a cada 10 min; `definirMeteo(meteo, 660)` fixa o pin do motor 1 min acima do intervalo.
- **Bug real apanhado pelo E2E:** com clima persistido, o efeito corria no MENU e `definirMeteo → emitirEstado → setCap` forçava a UI para "jogando" contra um motor sem mundo (`mundo.getBloco` crash). Correção: tocar no motor só com `fase !== "menu"` + re-aplicar o último clima conhecido quando o jogo começa.
- Mapeamento WMO→jogo: ≥95 → TEMPESTADE; 51–67 e 80–82 → CHUVA; restantes → LIMPO. **Neve (71–77, 85–86) → LIMPO com nota honesta** "neve não simulada no jogo" — o jogo não tem neve e nunca finge que chove.

**Bugs de plataforma corrigidos no caminho**
1. `MobileDiscoveryHeader` sangrava `-mx-4` sobre pais com `px-3` → **4 px de scroll horizontal em todo o telemóvel** nas 7 páginas que usam o header (medido a 375 px). Igualado a `-mx-3 px-3` (header + fila de chips).
2. Modal da pausa do BateuCraft cresceu (v28+v29+v31) e **não cabia em ecrãs pequenos** — adicionado `max-h-[88dvh] overflow-y-auto` (padrão dos outros modais).

---

## 5. E2E — `test-v31-xadrez-clima.mjs` (45 asserts + smokes reais)

- **Xadrez:** mate em 1 (Re8#), mate em 2 com resposta automática do adversário (Ra7! Kg8 Rb8# — linhas verificadas com `chess.js`; o FEN original da escada era **ilegal** — Rh1 já atacava Kh8 — e foi redesenhado), jogada legal errada não suja o tabuleiro, orientação das negras (bounding boxes), cache do dia, stale honesto, erro honesto + retry, mobile 375 px sem overflow.
- **Clima:** geocoding 4 cidades, WMO 95→TEMPESTADE no motor + HUD real 27°C, WMO 61→CHUVA, neve 73→LIMPO com nota honesta, persistência após recarregar, forecast em baixo → erro honesto com motor em ciclo simulado, desativar → OFF persistido.
- **Smokes reais:** Lichess 200 ✅ · geocoding 200 ✅ · forecast **429 → SKIP honesto** (IP partilhado; pendente).
- Estabilidade: o `waitForSelector` do Playwright falha intermitentemente sob o loop a 60 fps do jogo (starvation de rAF — "resolved to visible" sem commit); todas as esperas passaram a `waitForFunction` (predicado JS sobre o DOM real) — **3 corridas seguidas 45/45**.

**Regressões:** craft-v29 63 · craft-camaras 64 · blocos 101 · desporto 14 · plataforma 33 · home 22 · APIs-v25 30 · v30 31 · web-excellence 13 — **0 falhas**. `tsc` 0 · `vite build` OK.

---

## 6. Pendências honestas

1. **Smoke real do forecast Open-Meteo** — bloqueado pelo 429 do IP partilhado do ambiente (limite diário). A forma da resposta foi validada no host-irmão (archive). Re-tentar noutro dia/rede.
2. `chess.js` é uma dependência nova (~180 kB min+gzip zero-dep) — carregada por lazy import no chunk do jogo.
3. O puzzle é o **diário** (1/dia). Puzzles infinitos exigiriam OAuth da Lichess — fora de âmbito por agora.
