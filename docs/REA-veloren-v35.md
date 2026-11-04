# REA v35 — Veloren × Bateumz: análise e recomendação de linguagem

Data: 2026-11-04 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Pedido: "com o repositório veloren/veloren e tudo, terias como criar algo similar, usando a linguagem mais adaptável e melhor recomendada para a minha plataforma?"

---

## 1. O que é o Veloren — factos verificados

- RPG voxel **multijogador open-source escrito em Rust**, inspirado em Cube World, Zelda: Breath of the Wild, Dwarf Fortress e Minecraft; licença **GPL-3**; gráficos/música/assets originais da comunidade. — Fonte: book.veloren.net/introduction/what-is-veloren.html
- Repo `github.com/veloren/veloren`: **7,7k estrelas · 370 contribuidores**; linguagens: **Rust 74,9% · Fluent 23,5% · GLSL 1,6%** (Fluent = traduções; GLSL = shaders). — Fonte: página do repo (consultada 2026-11-04)
- Estrutura de crates: `client` · `server` · `server-cli` · `common` · `network` · `world` · `voxygen` (cliente gráfico) · `plugin` · `rtsim` · `assets`. — Fonte: repo
- O cliente renderiza com **wgpu**; **cliente e servidor partilham o mesmo ECS** (crate `specs`, armazenamento SoA — dados em buffers contíguos para eficiência de cache). — Fontes: book.veloren.net/contributors/developers/ecs.html · news.ycombinator.com/item?id=43517337
- Plataformas oficiais: **Windows, macOS, Linux** (foco x86_64). **Não existe build oficial para browser/WASM.** — Fontes: README do repo + book
- Servidor dedicado `veloren-server-cli` com guias oficiais para **PC, Docker e Raspberry Pi**; o multiplayer usa um servidor de autenticação próprio (`veloren-auth`). — Fonte: book.veloren.net/players/hosting-a-server.html

## 2. Resposta direta ao pedido

**Sim, criar algo similar é viável — e já estamos a caminho — mas NUNCA por cópia.** Duas razões duras:

1. **Legal (GPLv3):** copiar código do Veloren obrigaria a bateumz a libertar o código do jogo sob GPL (copyleft forte — gnu.org/licenses/gpl-3.0.en.html). A plataforma é proprietária → o repositório serve para **estudar arquitetura, não para colar código nem assets**. Ideias e padrões não têm copyright; código tem.
2. **Plataforma:** o Veloren é um jogo desktop autónomo — **não corre no browser oficialmente**. A bateumz é web-first: o jogo-âncora tem de viver DENTRO da SPA para integrar marketplace, lives, desporto, esports, etc. (os 10 portais da Cidade Bateu). Reescrever em Rust+wgpu destruiria essa integração e deitaria fora um motor próprio que já passa 31/31 E2E.

## 3. Linguagem recomendada: **TypeScript** (Rust como reserva cirúrgica)

O truque de engenharia do Veloren é partilhar **um crate `common` entre cliente e servidor** — simulação idêntica dos dois lados. Em TypeScript fazemos exatamente o mesmo:

- **`cidade-core` isomórfico**: um módulo TS puro (sem Three.js) com worldgen + física + simulação, que corre no **browser** (o Three.js só renderiza) e no **Node** (servidor autoritativo simula o mesmo mundo).
- Já temos a base: **SEED_CIDADE=20251103 gera a MESMA cidade para todos os jogadores** — exatamente o que um servidor autoritativo precisa.
- Opções comparadas de forma honesta:
  - **Rust + WebGPU (estilo Veloren):** potência máxima, mas fora do ecossistema da plataforma (React/Supabase/PWA), sem aproveitamento possível do motor deles (não compila para browser oficialmente), e reescrever ~3.400 linhas de motor TS a funcionar = risco sem ganho visível para o jogador.
  - **Go/Colyseus puro:** ótimo para servidor, mas não corre no browser — a simulação ficaria duplicada ou divergente.
  - **TypeScript full-stack: única opção com UM código a correr nos DOIS lados** → vencedora para a plataforma.
- **Rust entra só se a profilagem provar necessidade (N4):** módulos WASM (`wasm-bindgen`) para meshing/worldgen quente, ou servidor dedicado em Rust se o Node não aguentar o tick. Decisão por evidência, não por modismo.

## 4. O que JÁ temos do modelo Veloren (sem saber)

| Veloren | Bateumz hoje |
|---|---|
| Mundo procedural determinístico por seed | SEED_CIDADE=20251103 — cidade igual para todos |
| `common` partilhado cliente/servidor | `engine.ts` + `cidade.ts`/`MundoCidade` (núcleo separado do render) |
| ECS `specs` partilhado | GestorMobs + entidades leves (suficiente à escala da cidade) |
| Servidor dedicado `server-cli` | **N3/N4 do roadmap aprovado** |
| `veloren-auth` | Supabase Auth (já na plataforma) |
| Build mode in-game | BateuCraft (um jogo inteiro!) |
| Launcher Airshipper | PWA offline-first + APK Capacitor |
| Devblogs semanais da comunidade | worklog.md por versão |

## 5. O que adotar do Veloren (arquitetura, não código) — mapa N3/N4

1. **Servidor autoritativo com tick fixo** (ex.: 20 Hz): o servidor simula movimento e interações; o cliente só envia inputs. Hoje a cidade é single-player local.
2. **Predição no cliente + reconciliação**: o input local aplica-se já (sensação tipo CoD Mobile); o servidor corrige quando diverge.
3. **Interest management**: cada jogador só recebe chunks/entidades num raio — já só carregamos chunks vizinhos no cliente; o conceito estende-se à rede.
4. **`cidade-core` isomórfico**: extrair de `cidade.ts` a parte pura (worldgen já é; falta movimento+colisão) para módulo sem Three.js que corre em Node.
5. **Transporte honesto**: **browsers não têm UDP bruto** → WebSocket (fiável, tipo TCP) para tudo no N3; WebRTC DataChannel (não-fiável) só se o lag do movimento justificar. O protocolo UDP nativo do Veloren não é transportável para web — constraint real da plataforma web.
6. **Supabase no papel do `veloren-auth`**: identidade/sessão no Supabase; canais Realtime para chat e eventos; o canal de ALTA frequência (posições) fica no nosso servidor ws próprio.

## 6. Limitações honestas

- **Escala**: Node + TS num VPS pequeno deve aguentar dezenas de jogadores por instância com tick 20 Hz + interest management (a confirmar com PoC de 50 bots); centenas exigiria sharding por distrito ou servidor Rust (N4).
- **Profundidade RPG** do Veloren = ~6 anos e 370 contribuidores de comunidade. O nosso foco é retenção por integração com a plataforma, não mundo infinito — escolha de design assumida.
- **Sem build browser oficial do Veloren** → não há caminho de "aproveitar o motor deles"; só o padrão arquitetural é transferível.

## 7. Plano concreto — N3-PoC "Cidade partilhada" (próximo passo, aprovável)

1. `src/game/cidade/core.ts`: mover worldgen/movimento/colisão para módulo puro (cidade.ts passa a importar) — zero mudança visual; E2E 31/31 deve manter-se.
2. `server/` Node + ws: tick 20 Hz, valida posições (anti-teleport), broadcast 10 Hz dos vizinhos, autenticação por token Supabase.
3. Cliente: predição própria + interpolação dos outros jogadores (buffer ~100 ms).
4. E2E: 2 tabs sincronizadas (ver outro jogador a mover-se) + 50 bots locais.
5. Métrica de aprovação: drift <1 bloco/s em 2 min; CPU do servidor <50% com 50 bots.

## 8. Fontes (consultadas 2026-11-04)

- book.veloren.net/introduction/what-is-veloren.html — identidade, licença GPL 3, assets comunitários
- github.com/veloren/veloren — linguagens (Rust 74,9%), licença, crates, 7,7k★, 370 contribuidores, plataformas
- book.veloren.net/contributors/developers/ecs.html — ECS `specs`, SoA
- book.veloren.net/players/hosting-a-server.html — voxygen/server-cli/veloren-auth, Docker, Raspberry Pi
- news.ycombinator.com/item?id=43517337 — wgpu, modelos MagicaVoxel, ECS partilhado cliente+servidor
- gnu.org/licenses/gpl-3.0.en.html — termos GPLv3 (copyleft)

Nada do Veloren foi copiado; nada deste documento depende de dados inventados.
