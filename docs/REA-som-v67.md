# REA — v67: SOM E MÚSICA + furo real de física de colisões (2026-11-19)

## 1. Pedido e objetivo

O gap mais repetido dos «Honesto (o que fica)» de TODAS as versões desde a v63 era
«sem som (nada finge som)». Um kart racer de referência sem motor, derrapagem, itens
e música não é «a melhor versão para se inspirar». A v67 dá voz aos DOIS mundos 3D
(Circuito das Lendas + Arena das Lendas) com **zero assets externos** — tudo
sintetizado com Web Audio (osciladores + ruído + envelopes). Nada para descarregar,
nada para licenciar, funciona offline e no APK.

## 2. `src/game/som.ts` NOVO — MotorSom (Web Audio 100% sintetizado)

- **Seguro em Node**: nada de `window`/`AudioContext` no topo do módulo — as suítes
  importam-no sem browser e tudo é no-op HONESTO que continua a REGISTAR o que
  tocaria (`ultimos` anel de 24, `ultimoVelNorm`, `ultimoDerrapa`) — instrumentação
  que o E2E usa para provar os loops sem ouvir nada.
- **Política de autoplay respeitada**: o `AudioContext` só nasce em `despertar()`,
  chamado dentro de um GESTO (pointerdown/keydown + o botão «entrar» da arena).
  Idempotente. O E2E prova que `vivo() === false` ANTES do primeiro gesto.
- **Mudo persistido no aparelho** (`bateu_som` = "1"/"0" via localStorage com
  try/catch); ao desilenciar, a música pedida retoma sozinha.
- **Singleton `somGlobal()`** partilhado pelos dois jogos (um contexto por página).
- **Tabela fechada `IDS_SOM` (30 efeitos)**: ui, moeda, item (caixa «?» rebenta +
  revelação), usos por tipo (casca/cascaAlvo/míssil/óleo/raio/escudo/cogumelo),
  turbo1/turbo2 (mini-turbo), rampa, golpe, acerto, contrario, contagem, já,
  chegada (fanfarra), recorde, arenaGolpe/arenaAcerto/arenaCast/arenaMorte/
  arenaAbate/arenaNivel/arenaCura/arenaRespawn/arenaChat, erro. A suíte prova que
  TODOS sintetizam sem crash.
- **Loops**: MOTOR do kart (2 serras desafinadas → passa-baixo; freq 56 + velNorm·196,
  ganho por acelerar; `setTargetAtTime` τ 0,07), DERRAPAGEM (ruído → passa-banda,
  ganho por força), e **MÚSICA PROCEDURAL** (sequenciador com look-ahead 0,35 s,
  tick 110 ms): tema do MENU (132 BPM), tema de CORRIDA (148 BPM, batería + chapéus),
  ambiente da ARENA (72 BPM, acordes longos + plucks pentatónicos).
- **`adaptadorSomKart(som)`**: o adaptador fino que o MotorKart recebe — mapeia os
  eventos do core (moeda/item/uso/golpe/raio/escudo/deriva/rampa/contrario) para
  sons, distinguindo MINE dos dos outros (golpe recebido vs o meu acerto; raio
  lançado por mim vs raio dos outros).

## 3. Integração KART (motor.ts + BateuKart.tsx)

- `motor.ts`: `som?: SomKart` nos opts (o motor NUNCA importa Web Audio). O
  `atualizarSom()` corre por FRAME em solo E rede (lê APENAS o espelho — em rede o
  estado vem das snapshots a 10 Hz): alimenta motor/derrapagem, cruza os beeps da
  contagem 3·2·1 (descendentes, robusto a 10 Hz), toca o «JÁ!» na transição
  contagem→corrida, fanfarra de chegada 1×. `drenarEventos()` encaminha cada evento
  ao adaptador. `pausar(true)` e `destruir()` silenciam os loops — e o
  `atualizarSom()` corta cedo em pausa (senão re-alimentaria o pitch por frame).
- `BateuKart.tsx`: `despertar()` em pointerdown/keydown (effect de montagem),
  `window.__som` tipado, música segue a fase (menu→tema do menu, corrida→tema de
  corrida, sair→para — o hub fica silencioso, honesto), `som: adaptadorSomKart()`
  no motor (solo E rede), botão SOM no menu (`kart-som`) + no overlay de pausa
  (`kart-som-pausa`), estado `mudo` sincronizado com o singleton.
- i18n `som.ligar`/`som.desligar` pt+en.

## 4. Integração ARENA (BateuRPG.tsx — zero mudanças no motor da arena)

- Os efeitos disparam dos AVISOS do motor (danoRecebido→arenaGolpe, subiuNivel→
  arenaNivel, matou→arenaAbate, cura→arenaCura, erroHabilidade→erro) e das escutas
  da rede (o MEU golpe num mob→arenaAcerto via aoGolpeMob, mensagem dos OUTROS no
  chat→arenaChat, a MINHA morte por nome→arenaMorte, o MEU renascimento por
  `rede.meuId()`→arenaRespawn, abate PvP→arenaAbate).
- Música ambiente `arena` no jogo; menu silencioso; botão SOM no menu (`arena-som`);
  `despertar()` no clique «entrar» (gesto) + pointerdown/keydown.

## 5. FUROS REAIS fechados com repro (descobertos PELAS SUÍTES a meio da v67)

1. **RASTEJO do kart ONLINE (2 furos num só sintoma)** — a suíte v66 começou a falhar
   deterministicamente as asserções da caixa de itens (`temItem=null` após 45 s).
   Diagnóstico com sondas (server real + core direto):
   - **5a) A entrada era consumida ONE-SHOT por tick** (`j.ent = null` no
     `server/kart-servidor.mjs`): cliente a ~30 Hz contra ticks de 33 ms ALIASEIA —
     em fases más do beat só ~1/3 dos ticks tinha acelerador. **FIX: LATCH** — a
     última intenção de MOVIMENTO persiste até chegar outra (`entMov`); o uso de
     item continua EDGE (pendente até processável, nunca se repete). O cliente
     honesto não perde nada; o batoteiro não ganha nada (mantém a MESMA intenção).
   - **5b) Colisão kart-kart drenava por STEP de contacto contínuo** (`vel *= 0.92`
     a cada passo de sobreposição): num cotovelo do deserto a pilha de karts ficava
     CONGELADA a ~4 u/s com acelerar preso (equilíbrio aceleração × dreno). As
     sondas provaram que o solo com a MESMA linha se prendia — não era rede.
     **FIX no CORE: só perde velocidade quem se APROXIMA** (fecho = (va−vb)·n > 0,5;
     primeiro commit tinha o sinal invertido — apanhado pela asserção do choque
     frontal, que não drenava). Batida continua a custar; rastejar lado a lado /
     pilha temporária mantém o motor a funcionar e a pilha desfaz-se. PROVA no core:
     rastejar 30 passos → 22,6/20,3 (mantém); choque frontal → 10,5/10.5 (perde).
   - A sonda da suíte (`pilotoTeste`) não mudou: era a FÍSICA, não o teste.
2. **Variante `caixa` morta no tipo** — o core NUNCA emite `{t:"caixa"}` (a recolha
   emite só `{t:"item"}`). O som da recolha passou a ser um efeito único
   «caixa rebenta + revelação» e a variante morta saiu da tabela fechada (30 ids).
3. **`addInitScript` apagava o estado que o teste queria provar** (lição v65
   reconfirmada): o init script de limpeza do `bateu_som` corria em TODA a
   navegação, incluindo no RELOAD do próprio teste de persistência. FIX: limpar
   1× via `evaluate` após o primeiro menu.
4. **`sair()` fecha o PORTAL** (comportamento v63/v65 correto) — a asserção
   «voltar ao menu» foi corrigida para «o portal fecha e a música PARA (hub
   silencioso)».
5. **Pausa re-alimentava o pitch** — `atualizarSom()` corre fora do guard de pausa;
   o zero do `pausar()` seria sobrescrito no frame seguinte. FIX: corte cedo em
   pausa (o E2E prova: pausa → loops a 0 POR FRAME; retomar → voltam).

## 6. Provas

- **`test-som-v67.mjs` NOVO — 59 verdes ×2 corridas consecutivas, 0 skips**:
  - A núcleo 26: import em Node sem AudioContext; singleton preguiçoso; `vivo()`
    false; tocar regista sem contexto; tabela fechada 30 ids; mudo + registo em
    mudo; música (menu/corrida/arena/null); loops + instrumentação; adaptador
    completo (beeps, caixa/alheio, moeda, item, uso por tipo incl. cogumelo3→
    cogumelo, golpe recebido vs acerto, raio dono vs vítima, escudo, deriva 1/2,
    rampa, contrario, volta/fimSala sem som, chegada); colisão corrigida
    (rastejar mantém / choque perde).
  - B E2E kart 24: autoplay honesto (contexto só no gesto), botão de som nasce o
    contexto + muda + persiste (`bateu_som`), RELOAD mantém o mudo, música segue a
    fase, beeps da contagem + «JÁ!», loop do MOTOR por frame com velocidade real
    (velNorm > 0,05), DERRAPAGEM alimentada (> 0,3 — com `dirigirAuto(false)`: o
    auto sobrescreve a entrada a cada frame), pausa silencia POR FRAME e retomar
    devolve, caixa→item→uso com som do tipo real, sair fecha o portal e a música
    PARA, ZERO pageerror.
  - C E2E arena 6: singleton partilhado, música ambiente no jogo, Q cast 1ª aceita/
    2ª recusada (v63 intato) + erro de cd com som, ZERO pageerror.
- **REGRESSÃO**: test-kart-online-v66 **61/0 ×2** (com o latch + colisão: a suíte
  que expôs os furos volta a ser determinística) · test-kart-v65 **65/0 ×2** ·
  test-arena-rpg-v63 **77/0** · test-pvp-v64 **53/0** · test-web-v262 **11/0**.
- **GATES**: tsc -b 0 · tsc app 0 · build OK.

## 7. Honesto (o que fica)

- Sem cast-som de HABILIDADE da arena (o motor da arena não expõe sucesso de cast
  nos avisos — o erro de cd/mana tem som, o acerto/morte/abate/nível têm; passo
  futuro ligar o castar ao motor).
- Música sintetizada é minimalista por design (sequenciador, não produção) — zero
  assets continua a ser a regra da casa.
- O hub (/lives) fica silencioso — som só DENTRO dos jogos (declarado).
- Sala ÚNICA do kart online mantém-se (matchmaking continua passo futuro); o latch
  não introduz novas superfícies de batota (a intenção é a MESMA que o cliente já
  mandava).
- O volume geral é fixo (sem slider) — mudo/ligar é o controlo honesto desta versão.
