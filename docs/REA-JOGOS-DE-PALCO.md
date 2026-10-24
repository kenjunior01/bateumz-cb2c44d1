# REA — Jogos de Palco para Empresas (Roleta · Quiz Milionário · Sorteio de Comentários)

**Reverse Engineer Anything** — cada jogo foi modelado a partir dos melhores do mundo na
categoria, com a lista de lacunas convertida em funcionalidades reais na plataforma Bateu.

## 1. Roleta de Prémios — benchmark: wheelofnames.com + Uplup

| O que os melhores fazem | Estado no Bateu |
|---|---|
| Roda canvas com segmentos proporcionais aos pesos | ✅ `StageWheel` — ângulos cumulativos `peso/total × 360°` |
| Sorteio justo e auditável | ✅ `pickWeightedIndex` com `crypto.getRandomValues` (fallback Math.random) |
| Odds visíveis e honestas | ✅ Painel `Probabilidades` com % por segmento (`stage-odds`) |
| Auto-remover vencedor (modos de sorteio) | ✅ opção `autoRemoveWinner` + botão "Remover da roda" |
| Modo roleta de nomes (participantes) | ✅ alternância Prémios ⇄ Participantes no palco |
| Histórico de rodadas + exportação | ✅ log auditável (hora, participantes, prob.) + export CSV (`stage-export`) |
| Modo OBS / browser source | ✅ `?clean=1` esconde a barra de jogos e mantém o disclaimer |
| Barra de espaço gira | ✅ atalho `Space` (igual ao wheelofnames) |

## 2. Quiz Milionário — benchmark: WWTBAM + Kahoot (modo apresentador)

| O que os melhores fazem | Estado no Bateu |
|---|---|
| Escada de prémios com níveis seguros | ✅ `stage-ladder`, níveis seguros a cada 5 (`isSafeHaven`) |
| Ajudas: 50:50, plateia, saltar | ✅ `stage-quiz-5050` (desativa 2 erradas), sondagem visual da plateia, saltar |
| Controlo total do apresentador | ✅ revelar resposta, julgar certo/errado, avançar, pausar, reiniciar |
| Prémio integrado ao orçamento | ✅ prémio garantido/ Campeão registam `registerDraw` no orçamento da empresa |
| Cronómetro por pergunta | ✅ 30s configurável por pergunta, pausa do apresentador |

## 3. Sorteio de Comentários — benchmark: commentpicker.com + Woorise

| O que os melhores fazem | Estado no Bateu |
|---|---|
| Colar lista de comentários | ✅ parser `user: texto` (uma linha por comentário) |
| Eliminar duplicados | ✅ `dedupeEntries` por utilizador (mostra "N participantes válidos") |
| Filtro por palavra-chave | ✅ filtra o pool ao vivo |
| Multi-vencedores | ✅ sorteia N vencedores em sequência, cada um sai do pool |
| Auditoria | ✅ cada sorteio registra hora + pool + probabilidade (1/N) |

## 4. Controlo total da empresa (pré e durante a live)

- **Estúdio de Jogos de Palco** (`/estudio-jogos/:liveId`): seleção de jogo, editor de
  prémios (nome, cor, peso, custo), editor de perguntas, personalização da marca
  (nome, slogan, logo, cor primária), opções (tempo de giro, auto-remover, odds, som).
- **Controlo de gastos**: orçamento total em MZN, medidor ao vivo no palco,
  **bloqueio de giro quando o teto é atingido**, log de cada prémio com custo.
- **Integração no dashboard**: secção "Jogos de Palco" no LiveStudio (pré-live),
  com atalhos para configurar e abrir o palco por jogo.
- **Palco** (`/palco/:liveId?game=…`): ecrã inteiro (100dvh + fullscreen), modo OBS
  (`clean=1`), arranque instantâneo (sem ecrã de loading — a empresa abre a meio da live).

## 5. Conformidade com as diretrizes das redes sociais

- **Disclaimers oficiais** por plataforma (Instagram/Facebook/Meta, TikTok, YouTube, Kwai)
  gerados automaticamente e visíveis no rodapé do palco (`stage-disclaimer`).
- **Gerador de regulamento** completo: organização, período, participação gratuita
  (sem taxa de entrada — obrigatório nas diretrizes de promoções), mecânica, prémios
  com probabilidades, transparência auditável, entrega e diretrizes das plataformas.
- **Checklist de conformidade** com score: conteúdo definido, plataformas marcadas,
  participação gratuita confirmada, regulamento publicado, idade mínima.
- **Zero aposta com dinheiro real**: todos os jogos são de entretenimento com prémios
  da marca (vouchers/produtos/descontos) — compatível com as políticas de promoções
  do Instagram/Facebook/TikTok/YouTube.

## 6. Decisões técnicas

- Local-first (localStorage por sessão de live) — funciona num único dispositivo
  (o típico de quem faz live com OBS/celular) sem depender de base de dados.
- Sessão compartilhada por `liveId`: o estúdio e o palco leem a mesma configuração.
- E2E dedicado: `test-stage-games.mjs` — **38 verificações** (estúdio, roleta, quiz,
  sorteio, bloqueio de orçamento, modo OBS, integração e mobile).
