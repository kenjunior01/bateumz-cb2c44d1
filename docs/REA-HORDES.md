# REA — Engenharia Reversa do hordes.io (especificação de paridade)

> Metodologia: **REA — Reverse Engineer Anything** (github.com/morluto/rea).
> Alvo: https://hordes.io — bundle `menu/script.js` (430 KB, app Svelte + engine WebGL próprio),
> base de dados `game.bin` (159 KB, codec binário próprio decodificado), localização `loc/en.json`.
> Resultado: **mecânica e números reais extraídos do cliente oficial**; implementação 100% original
> (sem assets, nomes ou código do jogo original).

## 1. Fluxo de entrada (REA do menu)
1. **Aterrissagem**: "Bem-vindo" + clipes de gameplay + botão **"Começar a jogar"**.
2. **Seleção de personagem**: slots salvos → **"Clicar para criar personagem"**.
3. **Criação de personagem** (`ui.charmenu.create` real):
   - "Selecionar uma Classe" — 4 ícones clicáveis com descrição curta (`/data/ui/classes/*`).
   - "Selecionar uma Facção" — **Vanguard** (castelo em zona verde, Guardstone) vs **Bloodlust** (deserto, Headless Landing) + **Neutra**.
   - "Introduzir um nome" — `a-Z 0-9`, **3–16 caracteres**, sem espaços.
4. **"Enter World"** → ecrã **"Loading World"** → mundo 3D.

APIs reais: `/api/user/players`, `/api/player/create`, `/api/player/delete`, `/api/world/recfaction`.

## 2. Classes (dados reais de `game.bin`)
Base comum (todos os IDs de stat do engine): HP=100 (stat6), MP=100 (stat7), atributos 0–4=10,
vel=105 (stat15), atq-speed=10 (stat17). **+8 HP por nível** (`statPerLevel [[6,8]]` em todas).

| Classe | Skills iniciais (reais) | Crescimento por nível |
|---|---|---|
| Warrior | `slash` (1) + `courage/warcry` (21→buff 76) | str +1, agi +2, HP +8 |
| Mage | `icebolt` (4) | int +2, spr +1, HP +8 |
| Ranger | skill 31 (tiro) | agi +2, str +1, HP +8 |
| Cleric | `mend` (12) | spr +2, vit +1, HP +8 |

Engine skills comuns: `0` melee auto, `8` specialization, `40` recall (teleporte à cidade, cd 300s, cast 5s).

## 3. Motor de skills (classe real do bundle)
- `cd` (cooldown), `costMp`, `range` com **graceRange = range + min(range*0.2, 10)**,
  **GCD = 1.5s** (habilidades podem ignorar), `castLen` (tempo de cast), `skilllevels` até 5,
  `minlevel`, `targetMode` (1=inimigo, 16=self, 256=aliado, 4096=hostil/ambiente).
- **Auto-ataque**: `cd = 100 / atqspeed`; dano = `getDamageRoll()` = média (stat10+stat11)/2.
- Fórmulas de dano reais: `dano = base + roll * (coef + nível*incremento)` — ex. slash: `5 + roll*(0.38+nv*0.39)`,
  icebolt: `5 + roll*(0.3+nv*0.32)` (projétil velocidade 25).
- Charge (nv 11): atordoamento `0.7 + nv*0.2 s`; Taunt gera aggro `10000 + nv*10000`.
- Skillbook custa 25 000 ouro (montaria nv 30).

## 4. Bestiário (166 criaturas decodificadas; progressão real)
- **Tipos**: 1=mob, 2=conjurer (teleporte), 4=mercador, 5=stash, 6=ferreiro, 7=boneco de treino,
  8=lojista de classe, 9=sábio (quests), 10=mascote, 12=sacerdote (ressurreição), 13=dador de quests.
- **Fações**: 0=Vanguard, 1=Bloodlust, 2=neutro/hostil. **Raridade**: 0 comum, 1 elite, 2 raro, 3 boss. **Aggro**: 0 passivo, 1 agressivo.
- **Curva real (mundo "main", 100 chunks)**: lv1 Larva jovem → lv2 Larva madura → lv3 Raposa →
  lv5 Mariposa/Bandidos → lv7 Javali → lv8 Aranha da floresta → lv9–12 Lobos → lv13–14 Abelhas/Mineiros →
  lv15 Cogumelo/Boneco → lv16 Golem de carvão → lv18–21 Tartarugas/Beetles → lv22–24 Lagartos/Verme de areia →
  lv25 Múmias/Mortos-vivos/Necromante (deserto) → lv27–29 Abutres/Hienas → lv30–33 Crocodilos/Piratas →
  lv34 Leão → lv35 Urso primordial/Bonemother → lv38–42 Elfos do lago/Orcs → lv43–44 Alces/Trader →
  **lv45 Boss raro (rarity 3)** → **lv50 Bosses de facção (Guardião/Colosso)**.
- Pets lv1 (type 10) seguem o dono; boneco de treino (type 7) lv15/35 não revida.

## 5. Mundos e zonas (14 mundos, 27 áreas reais)
- **Mundo inicial** (12 chunks, música 114) com aldeia de cada facção; **mundo principal** (100 chunks);
  **Headless** nv25+ (deserto) e **Faivel** nv35+ (12 chunks); 5 **arenas** PvP (pântano, gaiola, enseada, lava, ruínas).
- Áreas reais: Aldeia Verde, Floresta da Guarda, Acampamento Bandido, Mina de Carvão, Deserto, Oásis,
  Ruínas, Florestas Alta/Baixa dos Pinheiros-Lua, Lago, Bosque/Terraço do Alce, Canteiro/Lago Dawngreen,
  Pedreira/Bosque de Faivel, Beira do Abismo, Águas Profundas, Fronteiras, O Vazio.

## 6. Quests (22 reais, estrutura extraída)
- Cadeia por facção com `prerequisites`; dador NPC (lv3–8) → **objetivos "mata N de criatura X"** com
  polígono de área no mundo; recompensas reais: **150 xp/50 ouro + arma da classe** (nv1),
  **350 xp/100 ouro + livro de skill** (nv2), **425 xp/125 ouro + botas** (nv3), **500 xp/250 ouro + luvas** (nv4).
- NPCs de quests reais: guarda-túmulo, pescador, estábulo, quartel-mestre, campista, viajante, alquimista, silvicultor.

## 7. Itens (loc real)
Tipos: sword/staff/bow/hammer (armas por classe), shield/orb/quiver/totem (mão off),
armor/boot/glove/amulet/ring/armlet, **book (aprende skill)**, rune, charm, pet, mount, bag, material.
Ex.: "Wooden Sword" → "Rusty Ironsword" → tier com qualidade 0–50.

## 8. HUD (REA do layout in-game)
- **Frame do jogador** (canto sup. esq.): retrato, nome, nível, **barra HP (verde #12F027)**, MP, **barra XP**.
- **Frame do alvo** (centro-topo) ao mirar; **placas de nome** com nível + barra de vida sobre cada entidade.
- **Barra de skills** (centro-baixo) 8 slots + poções; **cast bar** canalizado; **minimapa** sup. dir. com
  zona + coordenadas; **chat** inf. esq. com abas (Geral/Combate); tracker de quests à direita;
  ecrã de morte com ressurreição (sacerdote) e penalidade.

## 9. Paridade implementada (original)
Mecânica por mecânica: entrada (título→classe→facção→nome→carregando→mundo), 4 classes com skills
próprias + GCD 1.5s + cast bar, +8 HP/nível, 50 níveis com curva de XP dura, ~60 mobs com placas de
nome/nível/vida, zonas por faixa de nível (grama→floresta→mina→deserto→ruínas→boss), quests em cadeia
com recompensas por classe, aggro passivo/agressivo, loot com raridades, sacerdote de ressurreição,
boneco de treino, minimapa, chat com abas, grupo com frames, ciclo dia/noite, água e névoa.
**Nomes, textos, modelos e arte: 100% originais em português.**
