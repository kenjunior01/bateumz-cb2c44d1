# REA v20 — BATEU HORDES: o hordes.io oficial, dentro da plataforma

> Benchmark: **hordes.io** (Dek, 2016) — MMORPG 3D de mundo aberto no navegador.
> Fontes oficiais usadas nesta conversão: `hordesio.wiki.gg/wiki/Monster_List`,
> `hordes.io/info/skills`, `hordesio.wiki.gg/wiki/User_Interface`,
> `hordesio.miraheze.org/wiki/Vanguard` + presskit oficial.

## 1. O que foi copiado EXACTAMENTE do hordes.io

| Pilar do hordes.io | Antes (v18/v19 ficcional) | Agora (v20 oficial) |
|---|---|---|
| Entrada | Nome → classe → facção | **Classe → Facção → Nome (com 🎲 aleatorizador) → ENTRAR NO MUNDO**, navegação decorativa (Classificativas · Clãs · Clips · PvP · Itens · Habilidades · Loja) e versão `0.51.9102 · Bateu Live` no canto |
| Facções | VANGUARDA 🛡️ / TEMPESTADE ⚡ | **VANGUARD 🛡️ (#458BD9, azul) vs BLOODLUST 💀 (vermelho)** — nomes, cores e lemas oficiais |
| Classes | 4 classes ficcionais | **Guerreiro, Mago (gelo), Arqueiro, Xamã** — as 4 classes oficiais |
| Habilidades | 48 fictícias | **48 OFICIAIS** com nomes PT, custo de mana e cooldowns reais: Golpe, Golpe Crescente, Redemoinho, Baluarte, Provocar, Investida, Enfurecer… Raio de Gelo, Estilhaço Gélido, Orbe de Sarcículas, Bloco de Gelo… Tiro Rápido, Tiro Preciso, Salva, Tiro de Osso, Flecha Vampírica… Decadência, Revitalizar, Poço de Mimir, Totem de Cura, Uivo Canino, Convocar |
| Criaturas | 19 tipos ficcionais | **83 espécies OFICIAIS nv.1-45** com HP e XP exactos da wiki: Larva Jovem, Raposa, Javali Selvagem, Lobo, Abelha, Golem de Carvão, Verme das Areias, Hiena, Crocodilo do Rio, Guerreiro/Arqueiro/Mago Morto-Vivo, Múmia, Necromante, Piratas, Leão, Ursos de Faivel, Tarântulas, Orcs, Alces, esqueletos Sombrios… |
| Comportamento | todos agressivos | **Neutros** (larvas, raposas, mariposas, tartarugas) só reagem quando atacados — como no original; agressivos em matilha |
| Espécies raras | 8 chefes ficcionais | 8 **RARAS oficiais** com estrela: Líder Bandido, Javali Ancião, Golem de Carvão, Necromante Morto-Vivo, Capitão Pirata, Mãe-Osso, Carvalho-juba, Fantasma Errante |
| Chefe mundial | Nyx / Ignarok | **GLOOMFURY 🗡️** (Ruínas de Gloomfury, nv.45, ~750k+ HP via multiplicador — escala do boss oficial de 1.5M) + **Hellspawn 🔥** em ciclos com anúncio global |
| Mundo | 11 regiões genéricas | Geografia oficial: **Guardstone** (capital, nv.1-20: Campina + Floresta + Mina de Carvão), **Deserto Headless** (nv.21-34), **Oásis dos Mortos**, **Terras Marrowlands**, **Faivel** (Dell Alviverde + Pinhal Lunar, nv.35-45) e **Ruínas de Gloomfury** no fim do mundo |
| XP | curva genérica | **Tabela oficial**: 100 XP no nv.1, +18.7 por nível (nv.45 = 925), com penalidade de grind |
| Placas de vida | cinza | **Laranja para monstros** (padrão visual oficial), vermelha ☠ para chefes |

## 2. O que a plataforma MANTÉM (superação — não existe no hordes.io)

- **Loop real da plataforma Bateu**: Banco de Pontos → créditos, cupões roubáveis
  → leilões/loja reais, prémio **1GB → WhatsApp +258848547887**, conquistas → Stories.
- **Vilões da plataforma** (Barão dos Cupões, O Colecionador, Fantasma do Leilão,
  General Tempestade) que invadem o mundo e roubam cupões reais.
- Campanha 12 capítulos, diárias, Passe das Lendas, streak de 7 dias, miradouros
  (viagem rápida), baús escondidos, frutos ancestrais, emotes, auras, clãs,
  grupo, duelos, masmorras, torres de território, habitação, oficina +1..+12,
  montarias, editor de avatar, música — sem registo obrigatório.

## 3. Fidelidade de jogabilidade (motor)

- Level da criatura = nível oficial da wiki (`mobLevelForTier` devolve o nível exacto).
- XP por kill lê a tabela oficial e aplica penalidade quando o herói está acima do nível da presa.
- Ouro escalado por nível do monstro; elites ×3, chefes ×8-10, mundiais ×30-40.
- IA de matilha: matar um atrai os vizinhos; neutros entram em fuga/reação só sob ataque.
- HUD MMO intacto: alvo, barra de chefe, minimapa ao vivo, hotbar 6 + cooldown,
  chat, tracker de missões, XP laranja — igual ao layout in-game do hordes.io.

## 4. Verificação

- `test-world.mjs`: **156/156 asserts** (desktop + mobile) — inclui novos asserts:
  fluxo de entrada 1:1, facções oficiais, versão, 83 criaturas, regiões oficiais.
- Restantes suites: web-excellence 23/0 · visual 28/0 · arena 25/0 · gamekit 10/0 ·
  craft 47/0 · home 22/0 · ecosystem 33/0 · leilões 59/0 · stories 14/0.
- APK **v2.27** (versionCode 27) reconstruído a partir deste código testado.
