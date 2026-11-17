# REA — v59 · PRESENÇA DO NPC NO SERVIDOR MP (a praça vê a conversa acontecer)

## O que entrou

O passo anotado desde a v57/v58 («presença própria do NPC no servidor
MP»): até aqui o holograma da Bateu IA era 100% client-local — cada
jogador via o SEU holograma e ninguém sabia quem estava a conversar.
Agora o estado «quem está a falar com a Bateu IA» vive no servidor de
presença (`cidade-servidor.mjs`) e chega a TODOS os jogadores do mundo
partilhado: abrir o painel do NPC ANUNCIA a conversa, fechar
DESANUNCIA, e a Praça vê no rótulo do holograma QUEM fala
(«Bateu IA · Diana · …») e no painel «Praça em direto» os eventos
«está a falar com a Bateu IA» / «parou a conversa».

## Honestidade por desenho

- **O CONTEÚDO da conversa continua PRIVADO** — o que viaja é só a
  presença (`id` + `nome`), nunca a pergunta nem a resposta. O chat do
  NPC segue pela via proxy/edge como na v57; o servidor MP nunca o vê.
- **A conversa NÃO é exclusiva** — duas pessoas podem falar com o NPC
  ao MESMO tempo (cada uma tem o seu painel e a sua resposta); a lista
  reflete a realidade, não inventa fila.
- **Sem MP tudo continua como na v57** — `npcFala()` devolve `false`
  (no-op honesto, zero pedidos) e o holograma segue local.
- **O próprio não se vê** — o display filtra o `meuId` (recebido do
  `bemvindo`): quem conversa não entra na sua própria lista.

## Núcleo isomórfico `npcMp.ts` (browser E Node NO MESMO módulo)

- `NPC_CONVERSA_TIMEOUT_MS` 15 s (3 sinais perdidos — o cliente
  re-signala a 5 s) · `NPC_FALA_GATE_MS` 3 s (só corta SPAM, nunca o
  heartbeat normal) · `NPC_CONVERSAS_CAP` 8.
- `juntarConversa` (claim/heartbeat) **sem mutar a entrada** (padrão
  `carimbarMensagens` v58) e devolve `mudou` = true SÓ quando o
  CONJUNTO de ids muda — o heartbeat puro (sinal refrescado) NÃO paga
  broadcast. Cap cheio: o sinal MAIS ANTIGO sai (self-healing — o
  próximo heartbeat de quem foi despejado re-adiciona); o recém-chegado
  nunca se auto-despeja.
- `sairConversa` (`npcfim` sem claim anterior = no-op honesto sem
  broadcast) · `limparConversasExpiradas` (contadas em `sairam`) ·
  `pacoteConversas` (fio: só `{id, nome}`, expiração aplicada) ·
  `nomesConversa` (cap 2 + «+N» para o rótulo) · `validarPacoteNpc`
  (o MESMO padrão da `validaEdit`: sanitiza MESMO vindo do servidor —
  id finito > 0, nome string não vazio cortado a 24, cap na chegada,
  linhas podres descartadas sem derrubar a ligação).

## Fio (servidor `cidade-servidor.mjs` v59)

- `npcfala` = claim + heartbeat (gate 3 s; SPAM recusado no contador
  `npcRecusados`) · `npcfim` = desanúncio · broadcast `npc` a TODOS
  (o autor também recebe — o estado converge e o display exclui o
  próprio) SÓ quando o conjunto muda.
- `bemvindo` ganha `npc.conversas` — o chegante nasce a ver quem já
  conversa.
- `ws.on("close")` limpa a conversa (aba fechada sem adeus não deixa a
  presença presa para sempre) + interval de 3 s de expiração
  (≪ timeout — o mundo fica a saber ≤ 3 s depois do último sinal).
- `NPC_CONVERSA_TIMEOUT_MS` por env é override HONESTO para testes
  (mínimo 1 s, declarado no log de boot).
- Stats ganham contadores reais: `npcConversas/npcAvisos/npcRecusados/
  npcExpirados`.
- Zero rotas novas e zero mudanças no Motor: a presença é estado do
  servidor de presença (o MESMO ws do MP v37–v53); o holograma THREE
  continua gerido pela página (v57), agora com pulso/anel acelerados
  quando há conversa ativa partilhada.

## Cliente (`multijogador.ts` + `CidadeBateu.tsx`)

- `CidadeMP.npcFala()/npcFim()/npcConversasInfo()/idNoMundo` — o MESMO
  gate do servidor no lado do cliente (o SPAM nem viaja).
- Pacote `npc` sanitizado por `validarPacoteNpc`; eventos REAIS do
  «Praça em direto» por dif (nomes que entraram/saíram da lista) —
  nada gerado para encher a lista.
- A página anuncia no `useEffect` do modal (`npcia`): claim no abrir +
  heartbeat a 5 s + `npcfim` no fechar/limpar. O rótulo do holograma
  mostra `Bateu IA · nome1, nome2 +N` (cap 2, os outros ficam na
  lista); `conversaNpcAtiva` acelera o pulso do núcleo.
- Ganchos E2E honestos: `npcMp()` (conversas difundidas + meuId +
  outros), `npcMpSinal()/npcMpFim()`.
- i18n +2 chaves `cidade.mpEvNpc`/`mpEvNpcFim` ×6
  (`scripts/add-ia-i18n-v59.py`).

## Testes (`test-ia-v59.mjs` NOVO — 52 verdes ×2 corridas, 0 skips)

- **A) Núcleo ×19** — constantes na ordem certa (15 s > 5 s > 3 s);
  claim/heartbeat/cap/despejo do mais antigo; não-mutação; no-op
  honesto do `npcfim`; expiração com timeout parâmetro; fio só
  `{id, nome}`; `nomesConversa` 2 + «+N»; `validarPacoteNpc` com 8
  linhas podres → 1 viva, cap 20 → 8, nome cortado a 24.
- **B) Servidor REAL ×14** — `bemvindo.npc` vazio; claim de A difunde
  a B E a A; dois a falar (não exclusivo); `npcfim` mantém o outro;
  no-op sem broadcast; **heartbeat puro com ZERO difusões** (probe
  `scripts/probe-npc-v59.mjs` rastreia a sequência); gate com SPAM de
  6 recusado nos stats; queda de ligação limpa; cap 8 com 9 clientes;
  servidor de pé no fim.
- **B2) Expiração ×4** — servidor PRÓPRIO com
  `NPC_CONVERSA_TIMEOUT_MS=1200`: sem heartbeat o próprio recebe a
  lista VAZIA difundida e `npcExpirados` sobe nos stats.
- **C) E2E browser ×15** — `/cidade?mp=…` REAL (vite + servidor v59):
  hook `npcMp` nasce vazio; cliente ws Node (Diana) fala → a página
  recebe o nome; rótulo «Bateu IA · Diana»; eventos «está a falar…» e
  «parou…» no Praça em direto pelo MESMO fio; abrir o painel ANUNCIA
  o id real da página ao Node; o AUTOR não se vê a si próprio; fechar
  DESANUNCIA; zero erros de consola; `shots-v59/npc-mp-praca.png`.

## Regressão

test-ia-v54 **37/0 + 1 skip** (--sem-e2e) · test-ia-v55 **62/0 +
2 skips** (--sem-e2e) · test-ia-v56 **54/0 + 1 skip** · test-ia-v57
**54/0** (live NVIDIA + E2E da praça intatos) · test-ia-v58 **70/0 +
1 skip** (migração ainda não aplicada — C honesto) · test-cidade
**37/37** · tsc 0 · build OK (`npcMp`/`mpEvNpc` no bundle).

## O que fica (honesto)

- A presença é do SERVIDOR de presença do MP — sem `?mp=`, ninguém vê
  quem conversa (o NPC funciona igual à v57, declarado).
- O conteúdo continua privado por desenho; se um dia a praça tiver
  «balões públicos de conversa», é outro passo (com consentimento do
  autor, nunca por omissão).
- O heartbeat é da página (setInterval 5 s enquanto o painel está
  aberto) — um mínimo de 3 sinais perdidos expira; se a aba dormir
  (background throttle), a conversa pode sair da lista e re-entrar no
  próximo sinal — honesto e self-healing.
- RAG do NPC continua anotado enquanto o `nemotron-3.5-embed-8b`
  estiver 422 (o MESMO índice da v56 leria a plataforma na praça).
- A migração `20261117_ia_historico.sql` (v58) continua à espera de
  aplicação pelo utilizador (Dashboard → SQL Editor).
