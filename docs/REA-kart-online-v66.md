# REA — v66: BATEU KART ONLINE (sala de corridas partilhada)

**Data:** 2026-11-19 · **Commit:** v66 · **Pedido:** continuar o passo seguinte declarado no v65 — «corridas ONLINE são o passo seguinte DECLARADO (o núcleo é isomórfico e um futuro server/kart-servidor.mjs reutilizaria novaCorrida/passoCorrida como a arena faz)».

## 1. O que é

O Circuito das Lendas passa a ter **salas de corridas partilhadas**: pilotos REAIS + bots IA na MESMA grelha de 12, com rondas automáticas (lobby com contagem → corrida → resultados → lobby de novo). O padrão de honestidade da plataforma mantém-se: **sem servidor, o jogo fica 100% SOLO como sempre — nada finge multiplayer**.

## 2. Arquitetura — anti-batota por DESIGN

A MESMA filosofia da Arena (v63/v64) aplicada ao kart:

- **O cliente manda APENAS INTENÇÃO**: `ent {a, t2, v, d}` (acelerar/travar/virar/derrapar) a ~30 Hz + `uso` de item EDGE-triggered (1 mensagem por clique). **Nunca manda posição** — não há posição para validar: ninguém pode teleportar porque ninguém envia posição.
- **O SERVIDOR simula com o MESMO núcleo do solo**: `server/kart-servidor.mjs` (JS puro com type-stripping) importa `src/game/kart/core.ts` e corre `novaCorridaOnline` + `passoCorridaMulti` a **30 TPS**; snapshots a **10 Hz** para todos (12 corredores é pouco — sem raio de interesse).
- **Refactor isomórfico seguro**: o corpo comum da física (`passoCorpo`) foi extraído de `passoCorrida` (solo) sem mudar comportamento — o solo usa `passoCorpo(e, { [6]: entrada }, dtC)`; o multi usa `passoCorpo(e, entradasPorId, dtC)`. Os 35 testes do núcleo solo continuam verdes sem uma única alteração.
- `validaOlaKart` no CORE: nome limpo 1-16 chars (sem caracteres de controlo), kart ∈ IDS_KARTS, melhorias 0..5 clampadas — o servidor nunca confia no cliente.
- **Uso de item pendente**: se o piloto está a girar (stun), o uso fica pendente até ser processável (nada se perde num golpe).
- **Quem desliga vira piloto-IA**: o corredor continua a corrida (a sala não para por quem sai) — broadcast `saiu-corredor` para os outros. IDs de corredor NÃO são índices do array (SLOTS_REDE) — o bug `corredores[corredorId]` foi fechado com repro (o close handler convertia o corredor ERRADO em bot).
- **Countdown do lobby só com gente na sala**: ninguém espera rondas vazias (a 1.ª corrida é agendada quando o 1.º piloto entra).
- Configuração honesta do operador: `PORT=8767 · KART_ESPERA_S=45 · KART_TEMPO_MAX_S=300 · KART_PISTA=praia|deserto|vulcao · KART_VOLTAS=4`. Ping do servidor a 15 s (o `isAlive` da limpeza passa a significar algo — sem ping, todos os sockets morriam aos 60 s).

## 3. Slots de grelha e humanidade

`SLOTS_REDE = [6, 8, 10, 0, 2, 4, 1, 3, 5, 7, 9, 11]` — o 1.º humano fica no slot **6** (igual ao solo: luta do meio da grelha), os restantes nos pares alternados; bots preenchem o resto com os MESMOS nomes/cores/IA do solo. As melhorias de garagem do ola entram nos stats do corredor (motor → velMax real).

## 4. Cliente (`src/game/kart/mp.ts` + motor + UI)

- `RedeKart` (padrão `RedeArena` v63/v64): `?mp=` > localStorage `bateu_kart_mp_url` > `ws://host:8767`; reconexão com backoff (800→12 000 ms); estados HONESTOS (`a_ligar | lobby | corrida | solo | fechado`); publica a entrada do motor a ~30 Hz via `definirFonteEntrada`; `mandarUso()` EDGE.
- **Mirror no motor** (`motor.ts`): o `MotorKart` ganha `idJogador` (o solo continua 6), `corredoresRede` (descritores reais do servidor reescritos ANTES das meshes existirem) e `aplicarSnap` — escreve estados/caixas/moedas/projéteis/óleo/eventos/resultados no mirror visual; `interpolarRede` suaviza 10 Hz → 60 fps (`k = 1 − exp(−dt·12)`). Em rede o motor NÃO chama `passoCorrida`: a entrada (incluindo `dirigirAuto`) vai para o SERVIDOR, o pulso do item vira mensagem (`aoPulsarItemRede`).
- **UI** (`BateuKart.tsx`): painel «CORRER ONLINE» no menu (ligar/sair + status do lobby); ao `inicio` a corrida monta com a pista/voltas DO SERVIDOR; badge «ONLINE · N pilotos reais» no HUD (abaixo do botão de pausa — a 1.ª versão colidia com ele); **payout do aparelho**: a recompensa online é calculada LOCALMENTE pela posição final (`recompensaCorrida`) + recorde do aparelho — o servidor nunca manda moedas (nada de economia partilhada sem contas).
- i18n `kart.mp.*` ×13 pt+en.

## 5. Provas (test-kart-online-v66.mjs — 61 verdes ×2 corridas consecutivas, 0 skips)

**A) Núcleo (22)** — validaOlaKart podre/vazio/19-chars/kart-falso/melhorias-99→5/nome-limpo; novaCorridaOnline: 3 humanos nos slots 6,8,10 com nomes/karts/stats REAIS, 9 bots preenchem, grelha atrás da linha, contagem 3,9 s; passoCorridaMulti: humano com entrada anda (física real), humano SEM entrada DECELERA (nunca IA disfarçada), bot anda por IA; **DETERMINISMO por semente** (900 passos → estados idênticos); **sala fecha quando TODOS os humanos chegam** (fase fim + fimSala + 12 resultados sem repetidos + payout null); corredor sem humanos ligados continua como piloto-IA.

**B) Servidor real (17)** — ola com kart inválido → corrigido (sem registo); bemvindo com sala/pista/comprimento; lobby com contagem; JSON podre não mata o socket; 2 clientes bem-vindos e no lobby; **corrida começa: 1.º humano no slot 6, 2.º no 8**, 12 corredores com nomes reais; snaps a 10 Hz com fase corrida; **A anda com entradas contínuas (intenção → física do SERVIDOR)**; movimento real acumulado > 5 u; B vê o corredor de A (ej=1, em movimento); **caixa «?» recolhida na corrida online**; **uso de item com efeito real (casca-alvo → projétil visível na snap)**; fecho do socket → `saiu-corredor` + corredor vira piloto-IA (ej=0); 3.º cliente bem-vindo a MEIO da corrida (sem corredor); **teto de tempo fecha a corrida com resultados completos**; **a sala RODA: 2.ª corrida começa e o que esperava ENTRA**.

**C) E2E (22)** — 2 browsers + servidor real + vite: painel ONLINE no menu; A liga e vê o LOBBY (screenshot com «Próxima corrida em 14s · 1 pilotos na sala»); B no MESMO lobby (2 pilotos anunciados); corrida abre nos DOIS browsers; **badge «ONLINE · 2 pilotos reais» sem colisão**; A vê B como humano remoto (`remotosRede`); A anda (física do SERVIDOR chega pela snapshot); **o kart de A MOVE-SE no browser de B** (snapshot real do remoto > 5 u); B anda na mesma corrida; A recolhe item de caixa real; uso com efeito REAL; **ZERO pageerror**; shots-v66/.

## 6. Furos reais fechados com repro (lições)

1. **Índice ≠ id** — o close/sair usava `corrida.corredores[corredorId]` (array): convertia em bot o corredor ERRADO (o id 8 é o índice 3). Fix: `find(x => x.id === corredorId)` — apanhado pela asserção «corredor vira PILOTO-IA».
2. **isAlive sem ping mata tudo** — a limpeza terminava TODOS os sockets aos 60 s porque ninguém respondia pong (o servidor nunca mandava ping). O fim das corridas nunca chegava aos clientes de teste. Fix: ping do servidor a 15 s.
3. **Duty-cycle das entradas de teste** — mandar `ent` a 70 ms deixa 2/3 dos ticks do servidor sem entrada (kart a ~1/3 da velocidade): a caixa nunca chegava em 30 s. Fix: ~40 ms + look dinâmico (12 + vel·0,35).
4. **cogumelo3 consome por cargas** — o teste esperava `it` esvaziar após 1 uso; o pacote de 3 precisa de 3 usos (padrão Mario Kart). Fix: o teste «clica» como o jogador real (clique a cada 350 ms).
5. **Lobby esgotado antes do 1.º piloto** — o countdown corria desde o ARRANQUE do servidor: o browser do E2E chegava tarde e a corrida começava no instante do ola (lobby nunca visível). Fix de design: countdown só corre com gente na sala.
6. **Badge colidia com o botão de pausa** (ambos em top-2 center) — captura E2E mostrou o «00» do pause sobre o badge. Fix: badge em top-14 (prova visual > código passa — lição v65 re-aplicada).
7. **contagem clampada** — `passoCorridaMulti(e, {}, 4.0)` avança só 0,25 s (catch-up honesto): o teste avança a contagem em 16 passos de 0,25.

## 7. Honestidade (o que fica)

- Corridas online são SOLO-vs-sala: sem matchmaking por habilidade, sem ligas, sem contas — o progresso/garagem continua DO APARELHO (o ola manda as melhorias; o servidor não as valida contra uma base de dados porque não existe).
- O payout online é calculado no aparelho de cada piloto pela posição final (o servidor manda resultados com tempos/posições — nada de moedas de rede).
- Bots são BOTS (nomes do solo); os corredores de quem desliga continuam como piloto-IA — declarado por broadcast «{nome} saiu».
- Uma sala por processo (o operador pode levantar várias em portas diferentes); cap 20 ligações (12 corredores + 8 espectadores).
- Sem som; sem colisão-destrutiva battle mode (passos futuros declarados).

## 8. Como correr

```bash
npm run server:kart            # PORT=8767 · KART_ESPERA_S=45 · KART_TEMPO_MAX_S=300
# no app: /lives?game=kart → «CORRER ONLINE» (ou ?mp=ws://host:8767 para outra sala)
PW_CHROME=… node test-kart-online-v66.mjs   # 61 verdes ×2
```
