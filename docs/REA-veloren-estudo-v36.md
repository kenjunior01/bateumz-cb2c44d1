# REA v36 — Estudo do código Veloren → aplicação na Cidade Bateu

Data: 2026-11-04 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Método: clone esparso real do repo (`git clone --depth 1 --filter=blob:none --sparse`, crates `common, server, client, network, world, server-cli` — assets excluídos) para `/home/z/my-project/veloren-study/veloren` (16 MB). Todas as afirmações abaixo têm ficheiro:linha do clone. Zero código copiado — só padrões estudados.

---

## 1. Factos medidos no código (com fonte)

| Padrão | Valor real no Veloren | Onde |
|---|---|---|
| Tick do servidor | **TPS = 30** (`const TPS: u64 = 30`, `Clock::new(1.0/30)`) | server-cli/src/main.rs:49,299 |
| Limite de jogadores | **max_players: 100** (default) | server/src/settings/mod.rs:226 |
| Interest management | Regiões de **512 blocos** (`REGION_LOG2 = 9` → `REGION_SIZE = 1 << 9`), subscrição por região com margem (`CHUNK_FUZZ=2`, `REGION_FUZZ=16`) | common/src/region.rs:62-64 · server/src/presence.rs:5-8 |
| Sincronização de entidades | Itera regiões → subscritores → entidades, com **throttle por distância** ("Throttle update rate base on distance to each client") | server/src/sys/entity_sync.rs:109-130 |
| Relógio do jogo | `MAX_GAME_DT = 1/5 s` (nunca simula saltos >200 ms) | common/src/clock.rs:53 |
| Rede | Crate próprio: `Network` → `Participant` → `Stream`, multiprotocolo **TCP, UDP, QUIC, MPSC**, streams com prioridade e garantias diferentes | network/src/lib.rs:6-25 |
| Mensagens | `ServerMsg` = Info · Init · RegisterAnswer · General · Ping + canais dedicados; `ServerGeneral` = EntitySync · CreateEntity · DeleteEntity · TerrainChunkUpdate · InventoryUpdate · SetViewDistance · Knockback · Outcomes | common/net/src/msg/server.rs:38-194 · client/src/lib.rs:2750-2765 |
| Chunks pela rede | Comprimidos (`DeflatedChonk`) e até codificados como **imagens PNG (Quad/Tri)** prontas para a GPU | common/net/src/msg/server.rs:90-92 |
| Física | Sistema separado: `common/systems/src/phys/mod.rs` + `collision.rs` (colisão isolada da integração) | common/systems/src/phys/ |
| Meteo | **Servidor-simulado** (server/src/weather/tick.rs, sim.rs) — não usa dados reais | server/src/weather/ |
| NPCs com vida | `rtsim` — simulação de NPCs fora do tick (comer, trabalhar, viajar) | server/src/rtsim/ |

## 2. O que copiamos como PADRÃO (nunca código) para a v36

1. **Protocolo com enum de mensagens nomeadas** (estilo `ClientMsg`/`ServerMsg`): JSON pequeno e tipado sobre WebSocket, um tipo por intenção (`ola`, `pos`, `entrou`, `saiu`, `estado`).
2. **Servidor com tick fixo 30 TPS** e relógio com dt máximo (nunca integrar dt>200 ms).
3. **Interest management**: o PoC usa raio de 40 blocos (a cidade tem 116 de diâmetro) mas implementado com grelha de regiões pronta para crescer — o padrão do `entity_sync.rs`.
4. **Throttle por distância**: jogadores longe recebem updates com menos frequência.
5. **Cap de jogadores por instância** (default 64 — o deles é 100; a nossa cidade é menor).
6. **Snapshot 10 Hz** para posições (o jogo deles manda EntitySync a cada tick; nós throttleamos já de raiz por serem browsers).
7. **Limites honestos**: rechazar mensagens malformadas, cap de taxa por cliente, log de eventos.

## 3. O que NÃO copiamos e porquê (honesto)

- **UDP/QUIC multiprotocolo**: browsers não expõem UDP; WebSocket é o único transporte fiável razoável. O DataChannel WebRTC (não-fiável) fica como upgrade se o lag justificar.
- **Chunks comprimidos/PNG**: a nossa cidade já é determinística dos dois lados (SEED_CIDADE=20251103) — não há chunks a voar pela rede no PoC. Padrão anotado para mundos N2+.
- **Reconciliação completa do jogador local**: no PoC o movimento próprio continua local (sensação CoD Mobile); o servidor valida velocidade e salto de posição e corrige-o. Autoridade total = passo seguinte.
- **rtsim** (NPCs com vida própria): futuro N2 — hoje a cidade tem GestorMobs pacífico.

## 4. Diferenciadores que o Veloren NÃO tem (os nossos)

1. **Cidade-portal da plataforma**: 10 distritos navegam a secções REAIS da plataforma (marketplace, leiloes, desporto, esports, lives, negócios, community, jogos-gratis, concursos, jogos) — o Veloren é um mundo fechado.
2. **Dados reais do mundo dentro do jogo**: clima REAL openMeteo, rádios PALOP reais (Radio Browser) no Quiosque da Praça, Quiz com perguntas reais (Open Trivia DB), ar REAL (EAQI Maputo), factos Wikipédia PT — o meteo deles é simulado.
3. **Web-first zero-instalação**: corre no browser/PWA/APK — o Veloren exige download de cliente nativo.
4. **6 idiomas pt-first** com foco Moçambique/Angola/Cabo Verde.
5. **Economia integrada**: créditos/missões ligados à plataforma real.

## 5. Arquitetura do PoC «Cidade Partilhada» (v36)

```
Browser A (Motor + Three.js)  Browser B  ──ws──►  Node: server/cidade-servidor.mjs
  - movimento local (predição)                    - tick 30 TPS · snapshots 10 Hz
  - envia {t:'pos', x,z, ry} ~10 Hz               - grelha de regiões + raio 40 blocos
  - recebe {t:'estado', jogadores[...]}           - valida velocidade (>12 b/s = clamp)
                                                  - cap 64 · throttle por distância
```
- Mensagens JSON: `ola {nome}` → `bemvindo {id, jogadores}` · `pos` → `estado` (só vizinhos) · `saiu`.
- Cliente: avatares voxel simples (caixas) + rótulo com nome, interpolados 100 ms; desconexão → volta ao modo solo honesto.
- Env: só liga se existir URL (localStorage `bateu_cidade_mp_url` ou `?mp=`) — sem servidor, jogo fica 100% local como hoje.
- E2E novo `test-mp-v36.mjs`: 2 contextos → B vê A mover-se; 20 bots locais 60 s sem fuga de memória óbvia; regressões cidade 31/31.

## 6. Passo seguinte (N3 completo)

1. `cidade-core` isomórfico: servidor re-simula movimento com colisão (common/systems/src/phys como modelo) e corrige o cliente (reconciliação).
2. Chat e eventos da plataforma dentro da cidade (Supabase Realtime para texto, ws para posições).
3. Eventos ao vivo: chegada de novo leilão/ao-vivo vira painel na Praça (integração que o Veloren não tem).
