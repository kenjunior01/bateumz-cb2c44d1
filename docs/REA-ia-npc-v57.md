# REA — v57 · NPC IA NA PRAÇA (a BATEU IA vive na Cidade Bateu)

## O que entrou

O passo anotado desde a v54 («a IA dentro da Cidade Bateu — NPC com
Nemotron»): **a BATEU IA é agora uma presença física da plataforma** — um
holograma violeta que flutua na Praça do Imbondeiro, ao lado do grande
baobá, no mundo voxel partilhado. O jogador chega (nasce a ≈4,3 blocos —
DENTRO do raio de fala), clica «Falar com a Bateu IA» (ou tecla **E**) e
conversa com o chat REAL da NVIDIA (`nvidia/nemotron-3-ultra-550b-a55b`)
pela MESMA via do resto da plataforma: **proxy em dev/testes, edge
function em produção — a chave NUNCA chega ao browser**.

O NPC tem persona própria (núcleo puro, determinístico) com as regras
honestas da casa (v54): nunca inventar resultados de sorteios/vencedores/
licenças, só falar da cidade o que estiver nos factos medidos, respostas
CURTAS de HUD, jogo responsável, responder na língua do utilizador. A cada
envio, o jogo recolhe factos MEDIDOS frescos (distrito/estrutura próxima,
noite/dia, clima REAL do Open-Meteo, nome do jogador) e envia-os como
segunda mensagem `system` — o MESMO padrão do contexto RAG da v56. O que
não está medido é OMITIDO (zero «null» no prompt) e a persona proíbe
inventar o resto.

## Onde vive

| Camada | Ficheiro | Papel |
| --- | --- | --- |
| Núcleo isomórfico | `src/game/cidade/npcIa.ts` | posição medida, `npcIaPerto`, `LIMITES_NPC`, `contextoCidade`, `promptSistemaNpc`, `validarHistoricoNpc` — browser E Node, zero DOM/THREE |
| Endpoint (fonte única) | `src/lib/iaEndpoint.ts` | `resolverEndpointChat` + `cabecalhosEdge` extraídos da /ia (v54) — a /ia e o NPC partilham A MESMA regra |
| UI do painel | `src/components/cidade/NpcIa.tsx` | chat com streaming, STOP, thinking opcional, sugestões, usage real, histórico local cap 12 |
| Cidade | `src/pages/CidadeBateu.tsx` | holograma THREE gerido pela PÁGINA (o Motor não muda), rótulo `__npcia__`, prompt «E», tecla E, ganchos E2E `npcIa`/`npcAbrir` |
| Proxy | `server/ia-proxy.mjs` | sem rotas novas (o NPC usa `/api/ia/chat`); saúde **v57** |
| i18n | `scripts/add-ia-i18n-v57.py` | 19 chaves `cidade.npc.*` × 6 idiomas |
| Testes | `test-ia-v57.mjs` | A núcleo · B mock · C proxy · D E2E /cidade · E live |
| Probe | `scripts/probe-npc-stop-v57.mjs` | repro/diagnóstico do clique no STOP com o raster do sandbox |

## Regras honestas declaradas

- **A posição é FACTO MEDIDO do gerador** (SEED_CIDADE=20251103): (3,3) é
  pavimento da praça (PEDRA/PEDREGULHO a y=34), coluna acima VAZIA até
  y=+6, tronco do imbondeiro em (0,0) — o NPC fica ao LADO, não dentro.
  Provado no teste A com o módulo puro `carimbosCidade.ts` (o MESMO que o
  servidor usa para a física — padrão v52).
- **O holograma não toca no Motor**: é um grupo THREE gerido pela página
  (esfera + olhos + anel + luz violeta, flutuação + pulso + virar-se ao
  jogador), criado quando a fase é «jogando», disposto com
  `geometry.dispose()`/`material.dispose()` no unmount. Zero risco de
  regressão nos outros jogos.
- **A saudação inicial é cópia LOCAL (i18n)** — não é IA a fingir uma
  conversa que não existiu. A IA só fala quando o jogador pergunta.
- **Contexto só com factos medidos**: distrito (via `portalPerto` real),
  noite/dia (Motor), clima (Open-Meteo real, com atribuição), nome (MP).
  O rodapé do contexto proíbe a IA de inventar o que não está aí.
- **Caps próprios do NPC, mais apertados que os da /ia** (LIMITES_NPC):
  histórico 12 (6 pares), pergunta ≤ 500 chars, resposta ≤ 4000 chars,
  max_tokens 1024, portão de rate do cliente 10/min com intervalo 1,2 s
  (`NemotronRateLimitError` com ms reais — o UI mostra a espera).
- **STOP honesto**: abort REAL propagado ao upstream (não há tokens pagos
  escondidos); a nota «Parado por ti» fica guardada NA mensagem parcial.
- **Histórico local honesto**: `bateu.cidade.npc.v57` no localStorage, cap
  12, validado por `validarHistoricoNpc` (dados podres → descartados, a
  conversa não morre).
- **Sem RAG nesta versão**: o `nvidia/nemotron-3.5-embed-8b` continua 422
  no catálogo NVIDIA (SKIP honesto desde a v55) — quando abrir, o NPC pode
  ler a plataforma com o MESMO índice da v56. Passo anotado, não fingido.
- **A chave continua NUNCA no browser** — o NPC não criou rotas novas;
  proxy v57 / edge v54 continuam a injetar a Autorização.

## FUROS REAIS fechados nesta versão

1. **`cidade?.name` não existe** (apanhado no E2E): o contexto do NPC lia
   `clima.cidade?.name`, mas `CidadeEncontrada` tem `nome` — o clima nunca
   chegava ao system (ficava «26°C em —»). Fix: `nome`.
2. **Nota do STOP perdida com parcial**: o corpo da resposta só mostrava
   «Parado por ti» quando o conteúdo era VAZIO; com parcial, a nota sumia.
   Fix (padrão v54): a nota entra SEMPRE na mensagem parada.
3. **Assertion com a contagem errada** (teste): o E2E exigia
   `messages.length === 2`, mas o NPC envia 3 (persona + contexto + user).
   Fix: 3, com prova do conteúdo de cada.
4. **Clique no STOP com o raster do sandbox a ~2 fps** (lição v53/v54
   EXTENDIDA): o Playwright nunca vê 2 frames seguidos com a mesma caixa
   («not stable») e o pipeline de input perde a janela. Repro +
   diagnóstico no probe `scripts/probe-npc-stop-v57.mjs` (o botão está
   activo, não coberto, caixa estável — o problema é o rAF do ambiente).
   Fix no teste: clique forçado com fallback por DOM (`el.click()` — o
   handler REAL corre); a HONESTIDADE fica na asserção: a nota «Parado por
   ti» só aparece com o abort REAL propagado ao upstream.
5. **RAIZ do probe** (ferramenta): probes em `scripts/` precisam de
   `dirname(.., "..")` — o `RAIZ` do test-*.mjs (raiz do repo) não serve;
   o vite subia com cwd `scripts/` e servia 404. Anotado para os próximos.

## Evidência

- `test-ia-v57.mjs` — **54 verdes · 0 falhas · 0 skips ×2 corridas**.
- **E2E com dados REAIS do jogo**: holograma NA CENA (`npcIa().noCena`),
  spawn DENTRO do raio (dist 4,24 < 6), prompt visível ao nascer, painel
  com 4 sugestões, resposta em streaming, upstream PROVA persona + contexto
  com o clima mockado do Open-Meteo («26°C em Maputo»), STOP a meio com a
  nota honesta, erro real com o mock morto (502→banner), limpar/fechar,
  zero erros de console — `shots-v57/npc-praca.png` (1360×900, painel
  violeta presente, 1358 píxeis violeta medidos).
- **LIVE NVIDIA ×2 corridas**: a BATEU IA REAL respondeu na persona, CURTA,
  com o contexto medido — «Olá! A Praça do Imbondeiro tem 26°C agora mesmo,
  segundo o Open-Meteo de Maputo.» — com usage real do upstream. O modelo
  usa os factos medidos em vez de inventar: exactamente a regra da persona.
- Regressão: `test-ia-v54` **50/50** (live «BATEU V54») · `test-ia-v55`
  **78/78 + 1 skip honesto** (live visão REAL descreveu a imagem do
  snippet; embeddings continuam 422 no catálogo) · `test-ia-v56` **54/54 +
  1 skip honesto** · `test-cidade` **37/37** (a página da cidade foi
  tocada — holograma, rótulo, prompt, tecla E) · tsc 0 · build OK com o
  painel NPC no bundle de produção.
