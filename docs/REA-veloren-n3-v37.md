# REA v37 — N3 completo: núcleo isomórfico, orçamento de movimento, chat da Praça

Data: 2026-11-04 · Regra permanente: **zero dados inventados, erros honestos, fontes atribuídas**
Base: estudo real do Veloren (`docs/REA-veloren-estudo-v36.md`, afirmações com ficheiro:linha do clone
em `/home/z/my-project/veloren-study/veloren`) — a v36 provou o conceito (presença partilhada opt-in);
a v37 fecha o N3: **cliente e servidor correm AS MESMAS regras** e o E2E apanhou 2 furos reais que o
PoC mascarava.

---

## 1. Núcleo isomórfico — o padrão do crate `common`, agora real

O Veloren partilha simulação entre `client` e `server` através do crate `common`. A v37 recria o
padrão em TypeScript num único ficheiro, `src/game/cidade/core.ts`, importado pelas DUAS pontas:

| Consumidor | Como importa | Prova |
|---|---|---|
| Browser (vite) | `import … from "./core"` normal | bundle do cliente |
| Servidor (Node) | `import { … } from "../src/game/cidade/core.ts"` | Node 24 **type stripping nativo** — probe executado na v37 (`TS-IMPORT OK`), zero deps novas, zero build |
| E2E (Node) | idem servidor | mesmo comportamento testado |

Fonte única da verdade: `SEED_CIDADE` · `ALTURA_PLATEAU` · `SPAWN_PRACA` · `TPS 30` (Veloren
`server-cli/src/main.rs:49`) · `SNAPSHOT_HZ 10` · `MAX_VEL 12` · `RAIO_INTERESSE 40` ·
`MAX_JOGADORES 64` (deles 100, `settings/mod.rs:226` — cidade menor) · `FALA_MAX 140` ·
`FALA_RATE_MS 1500` · `proximoOrcamento()` · `limpaFala()`. `cidade.ts` re-exporta as constantes de
mundo para nenhum import existente partir.

## 2. Os dois furos reais que o E2E apanhou (e a prova)

### Furo #1 — o clamp progressivo deixava "andar" a 52 b/s
O servidor v36 avançava a posição autoritativa para o limite do clamp a cada mensagem ilegal:
`12 b/s × dt(0,2 s tecto) × tolerância 2,2 = 5,28 blocos por mensagem`. A 10 Hz isso são
**52,8 b/s de deriva para um spammer**. O E2E v37 mediu o salto de 100 blocos a converter-se em
30,56 (3 mensagens ilegais em voo). Fix — **orçamento de movimento** (a regra partilhada no core):
- cada mensagem recarrega `MAX_VEL × dt` (dt com tecto 0,5 s — padrão `MAX_GAME_DT` do
  `common/src/clock.rs:53`, nunca integrar saltos longos);
- tecto `ORCAMENTO_CAP = 6` blocos → **velocidade sustentada nunca passa de 12 b/s, nem com spam**;
- lag honesto (pausa ≤0,5 s) é absorvido — o jogador é punido pela velocidade real, não pela taxa
  de envio;
- movimento impossível → o servidor **NÃO avança**: mantém a posição autoritativa e envia
  `corrigido` (reconciliação honesta; o cliente teleporta o motor e mostra aviso traduzido).

### Furo #2 — spawn diferente nas duas pontas = jogador rejeitado para sempre
O servidor assumia spawn `(0,0)`; o cliente nasce em `(0,5 · 6,5)` → a 1ª mensagem tinha
`d = hypot(1 · 6,5) ≈ 6,58 > orçamento` e era **rejeitada perpetuamente** (o B via a Ana em x=0).
O clamp antigo mascarava o furo ao rastejar para o cliente. Fix: `SPAWN_PRACA = [0.5, 6.5]` no core,
usado pelo `spawnFixo` da página, pelo `bemvindo` do servidor e pelos E2E — fonte única.

## 3. Chat da Praça (o Veloren tem chat, mas não integrado com a plataforma)

- Sanitização `limpaFala` **no cliente e no servidor** (caracteres de controlo, trim, corte a 140) —
  React escapa o texto (sem innerHTML); a bolha desenha em canvas (sem HTML).
- Rate-limit honesto 1 fala/1,5 s nas duas pontas: o cliente devolve `false` (e avisa traduzido),
  o servidor larga silenciosamente — a fala limitada **nunca circula** (prova no E2E).
- Bolha de fala canvas-sprite sobre o avatar (4 s, dispose completo) + caixa HUD com as 4 últimas
  linhas — **só quando o mundo partilhado está ligado**; sem servidor não há chat (nunca finge MP).
- Teclado sem furos (dupla proteção): `stopPropagation` React no input (para no portal antes do
  `window`) **e** guarda no handler de teclas (`target INPUT/TEXTAREA` ignora). Prova E2E: escrever
  "wasd" no input deixa `Δpx < 0,001`.

## 4. Verificação (tudo corrido nesta sessão)

| Suíte | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `test-mp-v37.mjs` (novo) | **26/26** |
| `test-mp-v36.mjs` (regressão) | **14/14** (harness realinhado: 2 blocos/140 ms = 14,3 b/s era ilegal; agora 8,3 b/s honestos) |
| `test-cidade.mjs` (solo intocado) | **31/31** |
| `test-apis-v34.mjs` | **35/35** (Frankfurter com nota honesta — ver §5) |

## 5. Descoberta de fonte ao vivo: Frankfurter sem CORS para browsers (2026-11-04)

Prova medida: `node fetch → 200 + rates.USD=1.1179` e `curl → 200`, mas o **mesmo fetch dentro do
browser falha** (`Access-Control-Allow-Origin` ausente da resposta; edge Cloudflare HKG,
`cf-cache-status: HIT`). Conclusão: a fonte está viva mas hoje não aceita browsers — o conversor
mostra erro honesto (comportamento v34 mantém-se correto). O smoke do E2E passou a dizer exatamente
isso: "fonte viva (node 200+USD); CORS de browser em falta na fonte". Se persistir, alternativas
anotadas: proxy próprio no deploy (única via sem violar a fonte) ou trocar por exchangerate.host.

## 6. Honestidade — o que o Veloren tem e ainda não temos

- **Física re-simulada no servidor** (`common/systems/src/phys/`): o orçamento valida velocidade,
  não colisão — é o passo N2 (re-simular com `alturaTerreno` determinística é viável: a cidade é
  igual dos dois lados pelo SEED_CIDADE).
- **Reconciliação completa** com buffer de inputs e predição total (hoje: predição local + correção
  por salto impossível — a sensação fica CoD Mobile, como decidido).
- **Protocolo binário** com prioridades (`network` crate): o nosso é JSON pequeno sobre WebSocket —
  honesto para a escala atual (browsers não têm UDP; DataChannel WebRTC continua como upgrade
  documentado).
- **rtsim** (NPCs com vida): N2.

## 7. Passo seguinte

1. N2: re-simular colisão no servidor com `alturaTerreno` + eventos da plataforma na Praça
   (chegada de leilão/ao-vivo vira painel — integração que o Veloren não tem).
2. Deploy do servidor (`node server/cidade-servidor.mjs`) + `?mp=wss://…` em produção; Supabase
   assume identidade (papel do veloren-auth) quando houver contas.
3. 50 bots de carga (o E2E valida 8 + 2 humanos hoje) e métricas de CPU antes de abrir o mundo.
