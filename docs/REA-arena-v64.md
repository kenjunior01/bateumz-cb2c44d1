# REA v64 — PvP DA ARENA: dano AUTORITATIVO, todos contra todos, fonte como zona segura

> Continuação direta do v63 («Honesto (o que fica): PvP NÃO existe nesta versão — passo
> futuro declarado»). O mundo continuou exatamente o mesmo — o que mudou é que os HERÓIS
> passaram a poder ferir-se ENTRE SI, com cada ponto de dano calculado pelo SERVIDOR.
> Referências de comportamento: League of Legends (alvo-herói, pursuit, fonte protegida,
> recompensa por abate escala com a vítima) · hordes.io (mundo partilhado com risco PvP).
> **Nada é copiado** — só padrões de comportamento, reconstruídos do zero.

## 1. A mudança de autoridade (o coração da versão)

O v63 dizia: «a vida do herói é do dono». Isso era honesto PARA PvE cooperativo, mas
impossível para PvP (um cliente podia ignorar o dano recebido). O v64 INVERTE a
autoridade — o SERVIDOR passa a ser a fonte de verdade de TUDO o que é combatível:

| Antes (v63) | Agora (v64) |
|---|---|
| Cliente reportava hp/mp/essencia/nível/itens no `pos` | `pos` aceita SÓ posição/animação — o resto é PREVISÃO que o servidor ignora |
| Dano PvE aplicado pelo cliente (evento `fere` informativo) | Servidor APLICA o dano dos mobs ao hp (`ev.golpesMob`) e declara a morte |
| Cliente declarava a própria morte (`morte`) e renascia quando queria (`renasce`) | Servidor declara `morteheroi` quando hp ≤ 0 e RENASCE após `TEMPO_RESPAWN` (`renasceu`) |
| Dano PvE/PvP era um número do cliente dentro de um teto | PvP: o cliente SÓ declara «ferí o herói Y com a habilidade X» — o VALOR é `danoAtaqueBasico`/`danoHabilidade` × `reduzArmadura` calculado no servidor |
| Essência/XP viviam no cliente (podia forjar 999999) | Recompensas (mob + abate) entram pelo servidor; compra valida a essência REAL |

Estado novo por jogador no servidor: `escudo`/`escudoAte` (Kaimu W autoritativo),
`respawnEm` (auto-renascimento), `ultimoCastMs` por slot (anti-spam de habilidade),
`castAlvos` por slot (um cast fere cada alvo UMA vez), `ultimoGolpePvpMs` (cadência
do básico). Regeneração (fonte 60/40 e natural do campeão) é calculada no tick de 30 TPS.

## 2. O fio novo (cliente → servidor)

- **`cast {slot}`** — «lancei a habilidade X». Servidor valida cd (`cadenciaPermitida` com
  tolerância de rede `TOL_REDE_S`) e mana (a SUA mana), deduz, aplica efeitos próprios
  (escudo/cura com `curaHabilidade`) e abre a janela de claims para esse slot
  (`JANELA_CAST_MS` 2,5 s). `corrigido cast-cd` / `cast-mana`.
- **`golpepvp {alvoId, hab}`** — «o meu golpe X acertou o herói Y». SEM campo dano —
  `validaGolpePvp` nem o lê (provado no teste A). O servidor recusa com motivo honesto:
  `zona-segura` (a fonte protege AMBOS os lados — regra LoL), `golpepvp-rapido` (cadência
  do básico: 1/ataquePS com tolerância), `golpepvp-sem-cast` (claim fora da janela do
  cast), `cast-usado` (o mesmo cast já feriu este alvo — mata o «um cast, dois hits»),
  `golpepvp-fora-de-alcance` (posições do SERVIDOR + 2,5 u), `dano-acima-do-teto`
  (o MESMO orçamento `dpsTeto` do PvE).
- **Broadcasts novos**: `fere` (vítima — mesmo fio do PvE), `golpeheroi {alvoId, dano, de}`
  (a todos os interessados — o ATACANTE recebe o número real; o cliente salta o visual
  do próprio golpe previsto para não duplicar), `morteheroi {id, vitima, assassino,
  nomeAssassino}` (kill feed), `abate-pvp {vitima, essencia, xp, abates}` (só ao
  assassino), `renasceu {id, x, z}` (a todos).
- **`eu` na snapshot** — estado autoritativo do próprio herói a 10 Hz (hp/mp/escudo/
  essencia/abates/nivel/xpNoNivel/xpParaSubir). O cliente reconcilia a previsão;
  `xpTotal` é reconstruído com o inverso exato `xpTotalAteNivel` (provado no teste A).

## 3. Cliente — `mp.ts` + `motor.ts` + `BateuRPG.tsx`

- `mp.ts`: `castar(slot)` e `golpearHeroi(alvoId, hab)` (throttle 120 ms); escutas novas
  `aoEu/aoMorteHeroi/aoRenasceuHeroi/aoAbatePvp/aoGolpeHeroi`; `euDe` sanitiza (campos
  podres nunca derrubam o cliente).
- `motor.ts`: **alvo-herói** com prioridade de clique (estilo LoL — herói > mob > mover),
  pursuit + auto-attack no herói-alvo (`passoLocal`), habilidades/projéteis/cones/áreas
  DETECTAM heróis (`danificarNoCaminho/EmArea/EmFrente/atualizarProjeteis` — todos com
  slot), `danificarHeroi` manda o claim e mostra o número PREVISTO (o autoritativo
  chega por `golpeheroi`), morte/renascimento passam a ser reconciliados pelo servidor
  (SOLO continua local — zero mudanças no jogo sem servidor), `mortePor` guarda o
  assassino para o overlay.
- `BateuRPG.tsx`: kill feed no chat da arena (`arena-killfeed`, fúcsia), overlay de morte
  com «Abatido por X» (`arena-morte-por`), toast de abate com essência, nota PvP no menu
  (`arena-pvp-nota`). Ganchos E2E novos: `targetHeroi/alvoHeroi/heroiMaisPerto/mortePor/
  eu/golpearHeroiDirecto`.

## 4. Anti-batota provado (secção B da suíte — servidor REAL)

1. O pacote com `dano: 99999` é IGNORADO — o fere continua com o valor do servidor (140).
2. Sem cast não há claim de habilidade (`golpepvp-sem-cast`); com cast, o mesmo alvo
   só uma vez (`cast-usado`).
3. Cadência do básico recusada (`golpepvp-rapido`); cast repetido recusado (`cast-cd`).
4. A fonte protege os DOIS lados (`zona-segura` nos dois testes — atacar de dentro e
   atacar quem está dentro).
5. Progresso não é forjável: B afirma essência 999999 e não compra; A (555 REAIS após
   o abate) não compra anel de 800.
6. O servidor declara morte/renascimento — o cliente já não se mata nem se revive
   (compat v63 do `morte`/`renasce` mantida, mas o servidor manda).

## 5. Testes — `test-pvp-v64.mjs` **53 verdes ×2 corridas consecutivas, 0 skips**

- **A) Núcleo (14)**: RAIO_ZONA_SEGURA · validaGolpePvp (básico/QWER/ausente/podres/
  **dano ignorado**) · validaCast · danoAtaqueBasico (= statsDe.ataque, escala, itens) ·
  recursosAbate (base + escala com a VÍTIMA) · zonaSegura (dentro/limite/fora) ·
  cadenciaPermitida (spam/tolerância) · xpTotalAteNivel inverso exato.
- **B) Servidor real (26)**: `eu` autoritativo no bemvindo (hpMax do nível 18) · ataque
  básico → fere **exatamente 140** (A não mandou dano) · atacante recebe `golpeheroi` ·
  cadência · sem-cast · cast Q → fere **exatamente 356** · cast-usado · dano falso
  ignorado · **morte autoritativa** (morteheroi a A e B com assassino) · abate-pvp com
  recompensa (55/45 do nível 1) · vítima morta no `eu` e na snapshot do mundo ·
  auto-renascimento após 8 s (para B e para A, junto à fonte, vivo e cheio) · fonte
  protege a vítima · escudo do W autoritativo e EXPIRA · compras recusadas com essência
  REAL (a do cliente é ignorada) · lixo de protocolo.
- **C) E2E ×2 browsers (13)**: nota PvP no menu · A e B online no mesmo mundo · B sai da
  zona segura · A mira o herói (`targetHeroi`) · **hp de B cai com golpes de A** (dano do
  servidor por fere+eu) · **abate** (overlay com «Slain by Kaimu-PvP») · **kill feed no
  chat de A** · renascimento na fonte vivo e cheio · ZERO pageerror · shots-v64/
  (`arena-pvp-combate.png`, `arena-pvp-respawn.png`).

REGRESSÃO: **test-arena-rpg-v63 77/0** (o mundo PvE continua exatamente igual — o PvP
é uma CAMADA, não uma reescrita) · **test-web-v262 11/0** · GATES: **tsc -b 0** ·
**tsc app 0** · **build OK**.

## 6. Lições desta versão

1. **A ordem DENTRO do handler é a correção anti-race** — o servidor aplica o dano,
   envia `fere` e declara a morte NO MESMO tick; o `morte` do cliente (compat) chega
   sempre DEPOIS e é no-op (`if (!jogador.morto)`). Zero janela para «o cliente declara
   a morte antes do assassino ser creditado».
2. **Um cast = um alvo** — sem `castAlvos`, o mesmo cast podia ser re-claimado contra
   o mesmo alvo dentro dos 2,5 s (dano dobrado de graça). O teste prova a recusa.
3. **Recompensa por abate escala com a VÍTIMA** (LoL) — nunca com o assassino, senão
   um herói de nível alto farmava alvos fracos.
4. **A suíte descobriu a própria matemática**: 140+356 = 496 de 510 hp — o golpe do
   teste «dano falso» ERA o golpe mortal; o kill-loop redundante ficou para trás e as
   asserts de morte subiram para o sítio certo (reestruturação honesta, não ajuste de
   números).
5. **`eu` na snapshot** em vez de um canal separado — 10 Hz chega para barras suaves
   e evita UM fio novo por evento de estado.

## 7. Honestidade (o que fica)

- PvP é **todos contra todos (FFA)** — equipas/lanes ficam para um passo futuro
  (declarado); auto-attack adquire só MOBS (heróis só por target explícito — decisão
  de jogabilidade, declarada).
- O progresso importado do APARELHO no `ola` (xp/essência/itens do save) continua a ser
  o ponto de confiança inicial — é o save do convidado; TUDO o que acontece depois é do
  servidor. Sem contas não há forma de provar a proveniência do save (declarado desde a v63).
- O VISUAL dos efeitos dos outros (escudo do inimigo, cura alheia) não tem fio próprio
  — o escudo aparece na BARRA do `eu` próprio e nas snapshots dos outros (hp), mas o
  bubble do inimigo não renderiza (passo futuro, sem nada fingido).
- SOLO continua 100% local com as MESMAS fórmulas (nada de PvP solo — não há heróis).
- Torres decorativas e sem som — mantidos do v63 (declarados).
