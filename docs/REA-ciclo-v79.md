# REA — v79 «O CICLO À VISTA» (fatia 2 da visão de retenção)

> «Jogos geram pontos. Pontos geram progressão. Progressão desbloqueia prémios.»
> A v78 construiu o ciclo (núcleo + painel no hub). A v79 torna-o **VISÍVEL na navegação**:
> quem chega ao Bateu já vê, no primeiro ecrã de Jogos e na nova página Prémios, o caminho
> completo do jogo ao prémio — com regras à vista e sem letras pequenas.

## 1. A visão → o que esta fatia entrega

| Pedido do produto (visão) | Implementação v79 |
| --- | --- |
| «Navegação: Início / Jogos / Ao vivo / Desporto / **Prémios** / Perfil» | Grupo de topo «Prémios» (era «Sorteios») e «Jogos» (era «Entretenimento») no navbar desktop ×6 idiomas; chip «Prémios» nas ações rápidas do drawer; «Prémios» na navegação própria da área de jogos; Início=logo, Ao vivo=orb+menu, Desporto=item de grupo, Perfil=ação autenticada |
| «KART continua o jogo principal, mas dentro de Jogos» | O destaque PERMANENTE do kart continua no topo de /jogos (prova na suíte); o grupo «Jogos» de topo inclui o kart |
| «Mostrar o BENEFÍCIO, não só "Jogar"» | Chips nos cartões do catálogo: «Até X pontos» (teto REAL), «~X min» e dificuldade — só com dados declarados, nunca inventados |
| «Continuar a jogar» (padrão Steam) | Rail novo em /jogos com o histórico REAL do aparelho (kit v1), validado pelo núcleo — sem histórico o rail não aparece |
| «Página Prémios» | /premios NOVA: ciclo em 4 passos, 4 carteiras separadas, caminhos reais, 5 níveis, nota honesta, CTA para /jogos |

## 2. Núcleo puro (`src/lib/ciclo.ts`, padrão progressao.ts v78 / regionalCore v73)

Sem React, sem localStorage, sem DOM — browser e Node no MESMO código.

- **`jogoDoDia(catalogo, agoraMs)`** — escolha **determinística GLOBAL por dia**:
  FNV-1a da data → xorshift32 → Fisher-Yates sobre os índices. O mesmo dia mostra o
  MESMO jogo a todos (a conversa «jogaste o do dia?» passa a ser possível); os dias
  rodam (provado numa janela de 14 dias). Catálogo vazio/só-ids-podres → `null`
  (não há jogo, não há promessa).
- **`seccoesJogos(catalogo, idsRecentes, agoraMs)`** — monta as secções: recentes
  validados contra o catálogo (desconhecido/duplicado/não-string NUNCA entra — padrão
  `jogoValido` v60), dedupe, teto 8, ordem preservada; e o «doDia».
- **`labelBeneficio/labelDuracao/labelDificuldade`** — rótulos só com dados reais
  (`0/undefined/negativo/NaN/string` → `null`). O chip «Até X pontos» é o MESMO teto
  que `registrarPontosDeJogo` aplica — a promessa do cartão é a regra do motor.

## 3. Página Jogos (`/jogos`) — o ciclo no primeiro ecrã

- **Jogo do dia** — banner sob o destaque do kart, com rótulo honesto
  («muda à meia-noite · hoje para todos»): é rotação do catálogo, não sorteio nem
  patrocínio. O E2E compara o banner com o núcleo executado em Node (mesmo pick) e
  prova determinismo entre reloads.
- **Continuar a jogar** — rail padrão Steam/Roblox; semeado pelo E2E com
  `bateu:kit-progress-v1` real (tetris 3× + chess 1× + idFantasma): tetris/chess
  entram, o fantasma é recusado pelo núcleo. Sem histórico → rail ausente.
- **Chips de benefício** em todos os cartões do catálogo (17 jogos v78).

## 4. Página Prémios (`/premios`) — o mapa do ciclo

- **Hero + 4 passos**: Jogas → Ganhas pontos → Subes de nível → Desbloqueias prémios.
- **Faixa de progressão REAL** do núcleo v78 (pontos do aparelho, nível, quanto falta;
  convidado declara «neste aparelho»).
- **As 4 carteiras** (Pontos ≠ Bilhetes ≠ Prémios ≠ Saldo) explicadas com o caminho real
  de cada uma — bilhetes «nunca convertidos de pontos» (regra do produto; o núcleo não
  tem API de conversão — provado por ausência na v78 e reafirmado aqui).
- **Caminhos reais**: Sorteios & Marketplace, Concursos, Instant Win, Os meus pontos.
- **5 níveis** com desbloqueios COSMÉTICOS/estruturais (nenhuma vantagem competitiva —
  guardrail v78 reafirmado).
- **Nota honesta**: pontos nunca expiram · nunca viram dinheiro automaticamente ·
  missões com aviso antes de terminar · probabilidades públicas na transparência.
- **CTA** para /jogos (o motor do ciclo). Rotas: `/premios` + alias `/meus-premios`.

## 5. Navegação (navbar ×6 idiomas)

- `nav.group.premios` (Prémios/Prizes/Prêmios/Premios/Prix/पुरस्कार) substitui o rótulo
  «Sorteios» do grupo 1 — os itens ganham o ciclo + «Os meus pontos».
- `nav.group.jogos` (Jogos/Games/Juegos/Jeux/गेम्स) substitui «Entretenimento».
- Drawer mobile: chip «Prémios» → /premios entre Jogos e Desporto.
- Fallback per-key cobre qualquer idioma sem chave nova.

## 6. FURO REAL caçado pela própria suíte

`OptimizedImage` passava `fetchPriority` camelCase ao DOM — React 18 não reconhece e
**avisa em cada render** de todas as imagens otimizadas (raffles, marketplace, jogos).
O atributo HTML real é `fetchpriority` minúsculo: passa-se como atributo nativo
(`{ fetchpriority }` cast honesto) — zero aviso, mesmo comportamento (Chrome 71+).
A suíte v79 recusava-se a fechar com esse aviso vivo.

## 7. Prova

- **`test-ciclo-v79.mjs` NOVO — 45/45 ×2** (A núcleo 20: determinismo global do Jogo
  do dia, variação honesta em 14 dias, podres → null, validação dos recentes com teto 8,
  rótulos nunca inventados · B E2E 25: banner = núcleo, reload determinístico, kart
  permanente, chips, rail honesto com semeadura real, /premios completo, navbar
  «Prémios»/«Jogos» de topo, mega do ciclo, layout, ZERO pageerror).
- **Regressão**: retencacao-v78 38/0 · desktop-v74 35/0 · gfx-v69 28/0 · som-v67 58/0 ·
  desafios-v70 36/0 · web-v262 11/0.
- **GATES**: `tsc -b` 0 · `tsc app` 0 · `build` OK.
