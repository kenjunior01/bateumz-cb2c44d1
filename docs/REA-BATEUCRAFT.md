# REA MUITO AVANÇADO — BATEUCRAFT (Mundo de Blocos)

**Metodologia:** REA — Reverse Engineer Anything (github.com/morluto/rea) — análise baseada em
evidências: observar o comportamento real do alvo, decompor em mecânicas verificáveis, concluir
o "porquê" de cada decisão de design e só depois reimplementar em código 100% original.

**Alvo da engenharia reversa:** Minecraft (proposta de gameplay completa).
**Entrega:** BateuCraft — jogo voxel 3D original da plataforma Bateu, com personagens tipo LEGO.
**Regra de ouro:** nenhuma arte, nome, textura ou código do alvo é copiado. Tudo é reconstruído
do zero (texturas procedurais em canvas, modelos geométricos próprios, áudio sintetizado).

---

## 1. Evidências observadas no alvo (decomposição)

| # | Evidência observável | Conclusão de design | Implementação BateuCraft |
|---|----------------------|---------------------|--------------------------|
| 1 | O mundo é feito de blocos cúbicos alinhados a uma grelha; cada bloco tem um tipo com textura por face | O voxel é a unidade mínima de interação; a grelha torna a construção previsível | Mundo 128×128×48 em `Uint8Array`, chunks 16×16, grelha implícita no índice |
| 2 | Quebrar um bloco demora tempo dependente do bloco e da ferramenta; aparecem rachaduras | Mineração é progresso acumulado, não instantâneo; ferramentas são multiplicadores | `breakProgress` por frame; velocidades 1×/2×/4×/6×/8×; overlay de rachadura |
| 3 | Blocos quebrados viram itens no inventário; itens empilham até 64 | Recolha fecha o loop "minar → ter → construir" | Drop direto para inventário (mobile-first) com stack 64 |
| 4 | A hotbar é o acesso rápido; o resto é mochila | 9 acessos rápidos + armazenamento secundário | Hotbar 9 + mochila 27, seleção 1–9/toque |
| 5 | Ferramentas têm tiers (madeira→pedra→ferro→diamante) e desbloqueiam blocos melhores | Progressão de material é a espinha dorsal do jogo | 4 tiers, durabilidade, regra "pedra exige picareta" |
| 6 | Criar (craft) transforma matérias-primas em objetos numa grelha de receitas | Receitas são relações fixas recurso→objeto | Lista de receitas com disponibilidade em tempo real (melhor UX mobile que grelha 3×3) |
| 7 | O ciclo dia/noite altera a luz e traz inimigos à noite | O tempo é um mecanismo de risco/recompensa | Ciclo de 6 min, tint global de luz, zumbis à noite, queimam de dia |
| 8 | Animais passivos dropam comida; comida restaura vida | Sobrevivência = HP + fonte de cura | Porco→Costeleta (+4), Maçã de folhas (+2), regeneração lenta |
| 9 | Quedas altas causam dano | A física vertical tem consequência | Dano de queda acima de 3 blocos |
| 10 | O jogador vê as mãos/ferramenta em 1ª pessoa e o corpo em 3ª | A personagem é identidade | Boneco LEGO original (cabeça com stud, tronco trapezoidal, mãos em C), visível em 3ª pessoa |
| 11 | Avanços (achievements) marcam marcos com recompensa | Metaprogressão orienta o que fazer a seguir | 12 Avanços com créditos/XP |
| 12 | Baús espalhados guardam tesouro; vilas têm mercadores | O mundo tem loot e economia | Baús da Sorte (bilhetes/créditos) + Mercador LEGO (troca recursos→créditos) |

## 2. Diferenças deliberadas (decisões nossas, evidenciadas)

1. **Drop direto para inventário** em vez de entidades- item: menos objetos na cena = fluido em
   telemóveis de gama baixa (o alvo foi feito para desktop em 2009; nós para APK WebView em 2026).
2. **Fabricação por lista** em vez de grelha: elimina atrito de memorizar receitas no toque.
3. **Mundo finito 128×128** com fog: streaming infinito no WebView causa GC spikes; mundo finito
   com biomas completos dá a mesma sensação de exploração a custo estável.
4. **Sem fome**: HP regenera devagar; comida acelera. Fome duplicaria HUD sem adder profundidade
   a sessões médias de 5–10 min.
5. **Sem multiplayer em tempo real** nesta fase: o alvo também é essencialmente single-player;
   a parte social vive na plataforma (lives, sorteios, clãs).

## 3. Personagens LEGO — porque e como

O pedido: "os personagens serão tipo lego". O LEGO minifig é reconhecível por 5 traços:
cabeça cilíndrica com **stud** no topo, tronco **trapezóide**, braços articulados com **mãos em C**,
pernas blocantes e cores sólidas plásticas. Reconstruímos os 5 traços em geometria própria
(`lego.ts`): cilindro+stud, prisma trapezóide, torus parcial para as mãos, caixas e materiais
lambert com cores planas. Mobs seguem a mesma gramática LEGO (porco, ovelha, zumbi, gosma).

## 4. Integração com a plataforma (o que o alvo não tem)

- **Baú da Sorte** no mundo → bilhete de sorteio real da plataforma + créditos + CTA `/sorteios`.
- **Mercador** → troca recursos minados por créditos da conta (`exchangeWorldPoints`).
- **Avanços** → `logWorldActivity`; progresso → `upsertWorldProgress`; pontuação → `onScore`.
- **Jogável sem registo** (guarda em localStorage); sincroniza quando há conta.

## 5. Verificação (E2E determinístico)

`test-world.mjs` valida cada mecânica da tabela acima via hooks `window.__bc` (pump determinístico,
spawn, dar itens, definir hora) — o mesmo espírito REA: afirmações sobre comportamento observável,
não sobre código.

---

## 6. v28 — Câmaras e sistema de jogo (evidências → implementação)

| # | Evidência observável no alvo | Conclusão de design | Implementação BateuCraft |
|---|------------------------------|---------------------|--------------------------|
| 1 | F5 cicla perspectivas (1ª pessoa ↔ 3ª costas ↔ 3ª frente) | A câmara é uma preferência de acessibilidade, não um extra — cada modo serve uma tarefa | 5 modos ciclados por F5/ícone: 1ª pessoa (imersão), 3ª pessoa (identidade da minifig), ombro (mira precisa deslocada 0,85 à direita), top-down (mapear/planear construções), cinema (órbita 0,22 rad/s para filmar a base) |
| 2 | Agachar baixa a câmara e trava o passo | Postura é linguagem de jogo: devagar = cuidado | Tecla C/botão AGX: velocidade ×0,45, olho 1,62→1,32 com lerp |
| 3 | Óculos/telescópio dá zoom com FOV estreito | Observar longe sem mover o jogador | Z (segurar)/ZOOM: FOV 75→28 com lerp 9/s; FOV 82 ao correr (sensação de velocidade) |
| 4 | Dormir na cama salta a noite e redefine o spawn | A noite é risco; a cama é a recompensa por ter abrigo | Cama (3 tábuas+3 folhas): à noite salta para f=0.0 do dia seguinte, cura 4, define renascimento; recusada de dia e com monstros num raio de 9 (avisos honestos) |
| 5 | Escadas escalam sem saltos | Movimento vertical é construção, não só salto | Escada (7 tábuas→3): bloco não sólido; dentro dela vy = ±3,2 controlado, sem dano de queda |
| 6 | Inventário criativo dá todos os blocos | Construção sem grind é um modo à parte, não uma trapaça | Seletor no modal MOCHILA (só criativo): 14 blocos, toque entrega 64 |
| 7 | O mapa é leitura do mundo real | Nada de minimapa inventado | miniMapa() amostra os chunks realmente carregados (topo da coluna inclui edições do jogador); seta do jogador + mobs; M/botão/toque alterna |
| 8 | Feedback físico da câmara (dano sacode, andar balança) | A câmara é parte da percepção do corpo | Bob de passo (sin 6×) + tremor 0,35s no dano e 0,5s na explosão, decaimento determinístico no passo() (testável por pump) |
| 9 | Conquistas orientam marcos | Metaprogressão | +4: Bom Descanso (5cr), Safari (6cr, 1º mob), Mineiro Dedicado (8cr, 200 quebrados), Arquiteto (8cr, 100 colocados); contador mobsDerrotados no save v2 |

**Bug real descoberto pelo E2E v28:** o botão de pausa vivia num contentor `pointer-events-none` — nunca foi clicável (o teste do E2E travou 30s à espera do clique). Corrigido com `pointer-events-auto`; o som de passos existia no motor desde v27 mas nunca era chamado — ligado à acumulação de passos no chão.

**Verificação:** `test-craft-camaras.mjs` — 62 asserts (5 câmaras + persistência + avatar por modo; zoom FOV; agachar medido por distância; tremor por pump; cama: recusas honestas, salto de tempo, spawn, morte→renasce junto à cama; escada eleva; seletor criativo; minimapa com terreno real; 2 conquistas novas por ação real; save v2; HUD/pausa/ajuda). Regressões: test-blocos 91/91.
