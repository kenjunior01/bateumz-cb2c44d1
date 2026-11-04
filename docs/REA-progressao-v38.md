# REA v38 — Progressão, Missões, Exploração, Ambiente e Dificuldade

Data: 2026-11-04 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Método: clone real do Veloren (`/home/z/my-project/veloren-study/veloren`, esparso: common, server, client, network, world, server-cli) + sonda do próprio worldgen do jogo (`scripts/sonda-marcos-v38.mjs` com esbuild, corre o `MundoCidade` real em Node).

---

## 1. O que foi estudado no Veloren (ficheiro:linha real)

| Sistema | Valor real no código do Veloren | Onde |
|---|---|---|
| Grupos de competências | `SkillGroupKind` = `General \| Weapon(ToolKind)` — grupos independentes com XP/pontos próprios | common/src/comp/skillset/mod.rs:89-90 |
| Curva de custo por ponto | Grupo General: `EXP_INCREMENT=10, STARTING_EXP=70, EXP_CEILING=1000, SCALING_FACTOR=0.125` → logística `10·floor((1000/10)/(1+e^(−0.125·lvl)·(1000/70−1)))` = **70 XP no 1.º ponto, ~760 no fim**; armas: `400·(lvl/(lvl+20))²+5e^(0.025·lvl)` ×25 | mod.rs:95-120 |
| XP → skill points | `SkillGroup { available_exp, earned_exp, available_sp, earned_sp }` (invariantes documentadas) · `add_experience` tenta `earn_skill_point` e devolve o total de SP | mod.rs:139-160, 185-230 |
| Descoberta por área | `Waypoint { pos, last_save }` + `WaypointArea(f32)` com `radius()` — gatilho por proximidade | common/src/comp/location.rs:7,34-40 |
| Clima | `Weather { cloud, rain, wind }` **simulado no servidor** (`Weather::default` = Clear) | common/src/weather.rs:10-33 |
| Dificuldade | **NÃO EXISTE seletor de dificuldade** — só o marcador `Hardcore` (permadeath) | common/src/comp/hardcore.rs:5 |
| Missões/quests | **NÃO EXISTE sistema de quests** no crates esparso (mundo aberto puro; rtsim são NPCs, server/src/rtsim/) | ausência verificada |

## 2. O que aplicamos (padrões, nunca código GPL)

1. **Curva de nível = MESMA fórmula logística do grupo General** (constantes idênticas) — fórmula matemática não é código; citada em `progressao.ts`. Verificado por código: custos L1→2…L10→11 = 70, 70, 80, 90, 110, 120, 130, 150, 160, 180 (L6 ≈ 540 XP acumulado ≈ 1,5 dias ativos de ~357 XP).
2. **4 ramos independentes à la `SkillGroupKind`**: Explorador · Atleta · Sábio · Cidadão (3 competências cada, 1 ponto/nível, como `total_skill_point_cost`).
3. **Marcos com `WaypointArea`** (raio por dificuldade) + diário local.
4. **O que o Veloren não tem e nós temos** (diferenciadores v38):
   - **Missões**: 3 diárias determinísticas + cadeia «Roteiro do Imbondeiro» (6 capítulos verificáveis localmente).
   - **Dificuldade com efeitos medíveis** (Passeio/Cidadão/Desafiador): alvos 3/4/5 distritos, XP ×0,9/1,0/1,3, créditos ×1,0/1,0/1,25, raios de chegada 12/8/5 e 12/10/8.
   - **XP de atividade real**: visita +8, missão +40, marco +25, quiz +5/acerto, capítulo +60 — nada de XP imaginário.
   - **Ambiente sonoro 100% sintetizado** (WebAudio): pássaros de dia, grilos à noite, brisa constante; pássaros silenciam com chuva real (o motor já tem chuva/trovão próprios).
   - **Marcos naturais MEDIDOS** no worldgen real (sonda, 2026-11-04):

| Marco | Coordenada | Medição real (altura/bioma/topo) |
|---|---|---|
| Alto do Leste | (90, 0) | altura 37 · planície · relva (+3 sobre o plateau) |
| Colina das Areias | (0, −90) | altura 42 · deserto · areia (o alto perto da cidade) |
| Miradouro do Sudoeste | (−110, 110) | altura 42 · planície · relva |
| Árvore do Caminho Sul | (60, 100) | topo FOLHAS (copa real do gerador) |
| Areias do Poente | (−90, 0) | altura 33 · deserto · areia (abaixo do plateau) |
| Campos de Sudeste | (120, 60) | altura 37 · planície · relva |

## 3. Furos reais apanhados pelo E2E (corrigidos com prova)

1. **Quiósque nunca registava visita** — `chave = prox.distrito?.id ?? null` dava `null` para especiais; o capítulo 2 da cadeia seria impossível. Corrigido: `"__quiosque__"` (CidadeBateu.tsx rAF).
2. **`marcoPerto` só devolvia o mais próximo** — a Praça (6,5) nunca descobria enquanto a Sala de Troféus (5,5) estivesse em alcance. Corrigido com `marcosPerto()` (todos no raio).
3. **Curva de XP errada na 1.ª implementação** — multipliquei por 10 quando a fórmula do Veloren já devolve 70; verificado por código e corrigido para a curva exata.
4. **rAF a 2 fps no sandbox** (raster por software; provado com `git stash` — v37 corre igual) estrangulava o envio MP → `test-mp-v37/v36` falhavam as asserções de movimento. Precedente v37 («harness realinhado à velocidade honesta»): gancho `mpPasso(dt)` envia pelo relógio do teste, mesmo contrato do rAF. Servidor e protocolo intocados.

## 4. Verificação (tudo corrido, nada assumido)

| Suíte | Resultado |
|---|---|
| `test-progressao-v38.mjs` (novo) | **39/39** |
| `test-cidade.mjs` (31→32: +Roteiro) | **32/32** |
| `test-mp-v37.mjs` | **26/26** |
| `test-mp-v36.mjs` | **14/14** |
| `test-apis-v34.mjs` (4 smokes reais incl.) | **35/35** |
| `test-blocos.mjs` (motor/craft intacto) | **101/101** |
| `tsc --noEmit` | 0 erros |
| `vite build` | OK (50,7 s) |
| Screenshots | início (seletor dificuldade) · HUD (nível/XP/Roteiro/confetti) · Diário ×3 tabs — verificadas visualmente |

## 5. Honestidade

- Progresso é **local** (localStorage `bateu_cidade_perfil`) e a nota «registada só no teu dispositivo, sem servidores» está visível no Diário.
- XP só é pago depois da atividade verificada (proximidade 3D, quiz terminado, anoitecer real do relógio do motor).
- O clone do Veloren é GPL-3: nenhum código ou asset copiado — só padrões e UMA fórmula matemática citada com ficheiro:linha.
- Fontes consultadas (clone local do repo oficial github.com/veloren/veloren): `common/src/comp/skillset/mod.rs`, `common/src/comp/location.rs`, `common/src/weather.rs`, `common/src/comp/hardcore.rs`.
