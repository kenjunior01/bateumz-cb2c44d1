# REA — BateuCraft v32: Pesca Real + Aranha · Sabores do Mundo (TheMealDB)

**Data:** 2026-11-03 · **Método:** validação ao vivo ANTES do código, zero dados inventados, erros honestos, atribuição explícita.

---

## 1. O que entrou nesta versão

| Incremento | Fonte | Papel |
| --- | --- | --- |
| **Pesca completa** (BateuCraft) | — (sistema do jogo, sem API) | Vara de Pesca (3 gravetos + 2 fio, na mesa), lançar → esperar 3–8 s → picada com janela de 1,4 s → fisgar; 3 peixes reais da costa lusófona (sardinha 60% · carapau 30% · corvina 10%) com valores de fome honestos (3/4/5) e fundição → Peixe Assado (8) |
| **Aranha** (BateuCraft) | — (mob com IA) | Hostil à noite (persegue a 14 blocos, morde 2 de dano), NEUTRA de dia (não persegue, não morde), NÃO desaparece ao amanhecer (contrário do zumbi); dropa 1–2 fio sempre |
| **Fio** (item 126) | — | Novo material (drop da aranha) — fecha o ciclo aranha → fio → vara |
| **Sabores do Mundo** | `themealdb.com/api/json/v1/1` (chave de testes pública "1" oficial do site, CORS `*`) | Novo jogo no LiveHub (`/lives?game=sabores`): foto REAL de um prato, adivinha a região entre 4 opções reais; revelação com nome original, categoria e link para a receita oficial |

---

## 2. Validação ao vivo (2026-11-03, registada com provas)

| API / endpoint | Resultado medido | Veredicto |
| --- | --- | --- |
| `themealdb.com/api/json/v1/1/random.php` | **HTTP 200** + `access-control-allow-origin: *` + prato real ("Barbecue pork buns", Área "Vietnamese") | ✅ Integrado |
| `themealdb.com/api/json/v1/1/list.php?a=list` | **HTTP 200** + CORS `*` + lista real de regiões (o E2E smoke mediu **195 regiões** e um prato real "Beef Brisket Pot Roast") | ✅ Integrado (distratores vêm desta lista REAL, nunca de lista escrita à mão) |
| `api.datamuse.com/words?ml=…` | **HTTP 200** + `access-control-allow-origin` a refletir o Origin | ❌ **Descartada COM CORS OK** — dados só em inglês; um jogo de palavras monolingue não faz sentido numa plataforma de 5 idiomas (pt/en/es/fr/hi) |
| `api.artic.edu/api/v1/artworks` | **HTTP 403** (challenge) | ❌ Descartada com prova |
| `api.jikan.moe/v4/…` | Timeout ×3 neste ambiente | ❌ Descartada — não se integra o que não se consegue validar ao vivo |
| `api.coingecko.com/api/v3/simple/price` | **HTTP 429** persistente (IP partilhado do sandbox, `retry-after`) | ⚠️ Não integrada — forma não confirmada ao vivo; pendência honesta documentada |
| `ipapi.co/json/` | **HTTP 403** (Cloudflare challenge) | ❌ Descartada (geo-IP para pré-preencher o clima) |
| `api.dictionaryapi.dev/…` | **HTTP 403** (Cloudflare challenge) | ❌ Descartada |
| `dicionario-aberto.net` | **HTTPS → 301 → HTTP** (mixed content bloqueado no browser) | ❌ Descartada com prova |

---

## 3. Decisões de engenharia — Pesca

- **Raycast próprio para água** (`miraAgua`): o raycast normal do motor IGNORA água; o da pesca procura-a (para no primeiro `AGUA`, recusa se houver sólido no caminho — recusa honesta com aviso "Aponta para a água"). Alcance 8 blocos (mais que o braço: é uma vara).
- **Espera honesta**: 3–8 s sorteados pelo `Aleatorio` do motor; **janela de picada de 1,4 s** — falhar a janela = "Escapou-te!" (a linha não premia quem não está atento); recolher voluntário a qualquer momento; afastar-se > 10 blocos recolhe com aviso.
- **Raridade real no momento da fisga** (não no lançamento): sardinha 60%, carapau 30%, corvina 10% — "raro é raro de verdade".
- **Boia física**: esfera vermelha que flutua (seno) enquanto espera e AFUNDA 0,3 na picada + partículas de salpicar + som novo `salpicar` (WebAudio). Linha (THREE.Line) da mão à boia atualizada por frame.
- **HUD honesto**: chip `bc-pesca` — "A esperar a picada…" (calmo, preto/azul) → "PICOU! Puxa já!" (vermelho, urgente) — estados legíveis do motor (`captura().pesca`).
- **Fundição**: 2× peixe (qualquer) + 1 carvão → 2× Peixe Assado (8 de fome — a melhor comida do jogo lado a lado com a Carne Assada).
- **Pesca é transiente**: o save mantém a versão 3 — estado da linha não persiste (morre com a sessão, como um jogo a decorrer).

## 4. Decisões de engenharia — Aranha

- **Modelo LEGO próprio**: corpo preto + abdómen + cabeça, 2 olhos vermelhos grandes + 3 pequenos, 8 patas animáveis (o loop de animação de pernas >2 já suportava o padrão).
- **IA por luz do dia**: noite → persegue a 14 blocos e morde (2 dano/1,2 s); dia → volta a "vagar" (neutra); **sobrevive ao amanhecer** (o zumbi desfaz-se — decisão de design coerente: aranha é neutra, não maldita).
- **Drop sempre 1–2 fio** — determinístico, fecha a progressão aranha → fio → vara → pesca.
- Spawn natural só à noite (máx 3 vivas, 30% por tentativa).

## 5. Sabores do Mundo (TheMealDB)

- **Foto = strMealThumb oficial** (nada desenhado por nós); pergunta "De onde é este prato?" com **4 regiões reais** — a certa (strArea) + 3 distratores da lista REAL `list.php?a=list`.
- **Respeito à API partilhada**: 1 pedido por ronda (random.php) + 1 pedido total de regiões; cache localStorage 24 h (pratos) / 7 dias (regiões); dedupe em voo.
- **Revelação honesta**: nome ORIGINAL do prato (a API não tem pt — inventar tradução seria fabricar dados, mesma nota da PokéAPI em v30), categoria real, link para `themealdb.com/meal.php?i=<id>`.
- **Erro honesto**: API abaixo → "Cozinha indisponível" + Tentar novamente (testado com abort determinístico no E2E).
- Atribuição visível: "Dados e imagens de pratos © TheMealDB".

## 6. Bugs reais apanhados pelo E2E (e corrigidos)

1. **A2 colocava a Mesa de Criação exatamente no caminho do lançamento da A4** — o `miraAgua` recusou a linha (comportamento correto do jogo!) e 8 asserts caíram em cascata; o teste agora limpa mesa/fornalha antes de pescar (e a recusa com sólido à frente ficou coberta pela A8).
2. **`fome === 18` exato** — a sobrevivência decai sempre; assert passou a `Math.round(fome) === 18` (a decaída é comportamento real, não bug).
3. **Corrida mock/abort no E2E web** — o abort tinha de ser instalado ANTES do clique (o mock antigo respondia primeiro).

## 7. Verificação

- `tsc --noEmit` **0 erros** · `vite build` **OK**
- **E2E novo `test-v32-pesca-sabores.mjs`: 56/56** (3 corridas na sessão de desenvolvimento) + smoke REAL TheMealDB (prato real + 195 regiões)
- Regressões: craft-v29 **63** · camaras **64** · blocos **101** · desporto **14** · plataforma **33** · home **22** · APIs-v25 **30** · v30 **31** · v31 **46** · web-excellence **13** = **473 verdes, 0 falhas**
- Mobile 375 px sem overflow nos dois novos ecrãs (tolerância 2 px — convenção v31)
