# REA — Design Excellence + Novas APIs Públicas · v30

> Pedido: "aplica os skills de design (taste-skill, ui-ux-pro-max, design-motion-principles) para deixar a plataforma mais incrível na aparência e em tudo; e do public-apis acrescenta tudo que faça sentido para o que estamos a criar".
> Método: skills estudados na fonte + candidatas validadas **ao vivo** (payload + CORS) antes de qualquer código.
> Princípio mantido: dados 100% reais, atribuição visível, zero teatro.

## 1. Skills de design aplicados (fonte: os 3 repositórios)

### 1.1 design-motion-principles (motion com propósito)
- **Filosofias ponderadas pelo contexto:** Emil Kowalski (retrição/velocidade — "isto devia animar-se?") para toda a UI; Jakub Krehel (polimento de produção — subtil, consistente) nos novos componentes; Jhey Tompkins (lúdico) APENAS no momento de recompensa (confetti de vitória, revelação do Pokémon).
- **Tokens de motion no `:root`** (`src/index.css`, bloco v30): `--dur-instant 100ms` (toque), `--dur-fast 160ms` (hover/focus), `--dur-base 240ms` (entradas/saídas), `--dur-slow 400ms` (página), `--dur-deliberate 600ms` (revelações) + curvas `--ease-standard`, `--ease-emphasized`, `--ease-exit`, `--ease-spring` (spring SÓ em recompensa).
- **Anti-slop auditado:** as regras do skill (sem pulsos decorativos, sem hover-scale em tudo, sem stagger-spam) aplicadas nos 3 novos componentes — zero `animate-pulse` decorativo; os pulsos existentes no hub são indicadores de estado AO VIVO (legítimos). Dívida registada: **325 `whileHover={{scale}}`** mapeados para uma passada futura por componente (não varridos às cegas — risco de regressão visual).

### 1.2 ui-ux-pro-max (acessibilidade + sistema)
- **Foco visível universal:** `:where(a, button, summary, [tabindex]):focus-visible` com outline `--ring` e especificidade ZERO (estilos de componente ganham sempre; nada fica sem indicador — grelhas de jogos, chips, cartões clicáveis).
- **Contraste e estados:** todos os textos novos passam em 4.5:1 nos dois temas; estados completos (loading skeleton → pronto → erro com retry → vazio) nos 3 componentes.
- **Números de dados:** utilitário `.numeric-data` (tabular-nums) para colunas alinhadas (sapateiro do baralho, conversor).

### 1.3 taste-skill (direção de arte real)
- **Assets REAIS em vez de imitação:** cartas com PNG oficial da API; Pokémon com arte oficial da PokéAPI (silhueta = a própria arte com filtro CSS — nada redesenhado por nós).
- **Primeiro ecrã claro, margens iguais, painéis calmos** nos 3 novos componentes; verificação real a **3 larguras (375/768/1440)** com screenshots.
- Veredicto do skill aplicado à plataforma: fundação Space Grotesk/Inter + navy/red/gold mantida (identidade consistente); o upgrade vem de assets e movimento com propósito, não de mais brilho.

## 2. Novas APIs integradas (validadas ao vivo: HTTP 200 + `Access-Control-Allow-Origin: *`)

| API (public-apis) | Veredicto | Motivo |
| --- | --- | --- |
| **Deck of Cards API** (`deckofcardsapi.com`) | ✅ INTEGRADA | Baralho embaralhado no servidor + imagens PNG oficiais. Fit direto com o vertical casino (Mines, Crash, Hi-Lo, Keno, Limbo). |
| **PokéAPI** (`pokeapi.co`) | ✅ INTEGRADA | Jogo de adivinhação com arte oficial + dados reais. Fit com o vertical quiz (Milionário, Trivia Flash). |
| **ExchangeRate-API** (`open.er-api.com`) | ✅ INTEGRADA | Taxas reais diárias para a plataforma multi-região (AOA/MZN/BRL/EUR/ZAR/USD). Fit com carteira e prémios. |
| date.nager.at (feriados) | ❌ DESCARTADA | Sem cabeçalho CORS (validado ao vivo) → fetch do browser bloqueado. |
| PunkAPI | ❌ DESCARTADA | Sem resposta no dia da validação + fit nulo. |

### 2.1 Blackjack 21 — `BlackjackGame.tsx` + `src/lib/deckOfCards.ts`
- **Sapateiro real:** 6 decks (312 cartas) embaralhados NO SERVIDOR; `/draw/` só quando o jogador age; reembaralho honesto abaixo de 60 cartas.
- **Regras reais:** Ás flexível (11→1), banca para em 17, blackjack natural paga **3:2** (2,5×), empate devolve a aposta; aposta via CasinoBetPanel + carteira de moedas partilhada.
- **Estados honestos:** API em baixo → cartaz de erro com retry e, quando havia aposta em jogo, devolução explícita ("A aposta desta ronda foi devolvida") — **sem simulação local disfarçada**. Erro de boot (sem aposta) não promete devolução que não aconteceu.
- **Atribuição:** "Baralho e imagens de cartas © Deck of Cards API (deckofcardsapi.com)" visível no rodapé do jogo.
- **Missões/XP:** integrado no kit PRO existente (MissionsBar) automaticamente.

### 2.2 Quem é esse Pokémon? — `PokemonGuess.tsx` + `src/lib/pokeapi.ts`
- **Ronda:** 1 Pokémon real (ids 1–1025, gerações 1–9) + 3 distratores com nomes REAIS; silhueta = arte oficial com `brightness(0)`; revelação com tipos (etiquetas pt), altura/peso reais e número da Pokédex.
- **Respeito à API partilhada:** 1 pedido para TODOS os 1025 nomes (`/pokemon?limit=1025`, cache 7 dias) + 1 pedido por alvo (cache 7 dias) — nunca um pedido por opção.
- **Honestidade:** a PokéAPI não tem nomes/descrições em pt — usamos o **nome canónico em inglês** (real) com interface em português, e a nota está no código. Erro honesto com retry.
- **Atribuição:** "Dados e arte oficial de Pokémon © PokéAPI (pokeapi.co)".
- **Sorteio:** `crypto.getRandomValues` (padrão da plataforma).

### 2.3 Conversor de Moedas — `CurrencyConverter.tsx` + `src/lib/exchangeRates.ts`
- **Onde:** Carteira (`/wallet`), entre o saldo e as transações.
- **Moedas da realidade da plataforma:** USD · EUR · **AOA** · **MZN** · **BRL** · ZAR.
- **Honestidade:** 1 pedido à base USD (todas as moedas juntas), cache 6 h, data REAL do fornecedor exibida ("Taxa de Mon, 02 Nov 2026"), e aviso explícito quando offline serve a última taxa válida guardada no dispositivo.
- **Atribuição:** "Taxas de câmbio © ExchangeRate-API (open.er-api.com)".

## 3. Fundação de design (`src/index.css`, bloco v30)
Tokens de motion + foco universal + utilitários tipográficos — detalhes na secção 1.

## 4. Validação (números reais)
- `tsc` **0 erros**.
- E2E novo `test-v30-apis-design.mjs`: **31 ✅ / 0 ❌** (Blackjack 11, Pokémon 7, Conversor 5, fundação 4, console 1, screenshots 1) + **3 smokes REAIS** das 3 APIs (200 + shape validado) — as 3 respondem deste ambiente.
- Screenshots verificadas: Blackjack a 375/768/1440, Pokémon 1280, carteira 1280 — painéis calmos, alinhados, atribuições visíveis.
- Regressões: **craft-v29 63/63 · craft-camaras 64/64 · blocos 101/101 · desporto 14/14 · rea-plataforma 33/33 · home-dinamica 22/22 · apis-publicas-v25 30/30** = **327 verdes + 31 novos = 358**.
- Bugs reais encontrados e corrigidos durante o desenvolvimento:
  1. **Loop infinito de render** no Blackjack (boot→setDeck→recriar boot→useEffect…): baralho movido para `useRef` (identidade estável), contagem em estado só de display.
  2. **"Aposta devolvida" desonesta** no erro de boot (não havia aposta): flag `refunded` só nos erros com aposta em jogo.
  3. **`toFixed` em EN** ("0.4 m") na Pokédex pt: `toLocaleString("pt-PT")` → "0,4 m".

## 5. Não foi feito (honestidade)
- Varredura dos **325 hover-scale** existentes: exige verificação visual por componente; registada como passada futura (anti-slop), não feita às cegas.
- date.nager.at/punkapi descartadas com motivo medido (secção 2).
- i18n dos 2 jogos novos: seguida a convenção existente do LiveHub (en/pt/pt-BR completos; es/fr/hi herdam do en por fallback — igual aos restantes 19 jogos do hub).
