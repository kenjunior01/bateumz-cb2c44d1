# REA v69 — GRÁFICOS DE PRÓXIMA GERAÇÃO + MÚSICA POR PISTA

Data: 2026-11-19 · Âmbito: motor visual do BATEU KART (`src/game/kart/motor.ts`,
`src/game/kart/particulas.ts` NOVO, `src/game/som.ts`, `BateuKart.tsx`, i18n)

## 1. Pedido

«Continue e seja o mais incrível em todos os aspetos… quero em termos de
gráficos muito bons o mais avançado que conseguir… adicione músicas e essas
coisas… muito divertido.» — o pedido visual/musical da v69 (a parte de
plataforma/prémios segue na v70).

## 2. Dois caminhos honestos: ALTA e LEVE

O motor passa a ter QUALIDADE declarada e provável por gancho:

- **ALTA** (desktop, default): pós-processamento completo, sombras dinâmicas,
  cúpula de céu, partículas plenas, materiais Phong.
- **LEVE** (`?kart-leve=1`, toque, APK, suítes E2E): o caminho v65 INTACTO —
  Lambert sem mapas, sem composer, sem sombras, sem partículas. Nada finge:
  o gancho `graficos()` devolve `bloom:false, sombras:false, ceuDomo:false,
  particulasVivas:0` e o teste prova.

O jogador alterna com o botão **GFX** no menu (`bateu_gfx` persistido no
aparelho; aplica na PRÓXIMA corrida — o motor nasce por corrida). O parâmetro
`kart-leve` continua a FORÇAR leve por cima de tudo (determinismo das suítes).

## 3. O que a ALTA acrescenta (tudo real, nada pós-fato)

1. **Composer** (`EffectComposer`): RenderPass → **UnrealBloomPass**
   (0.55/0.85/0.80) → **vinheta cinematográfica** (ShaderPass próprio) →
   **OutputPass** com **ACESFilmicToneMapping** (exposição 1.12).
2. **HDR honesto**: cores com componentes >1 alimentam o bloom — sol do céu,
   chamas do turbo, moedas, caixas «?», lava do vulcão (que PULSA).
3. **Sombras dinâmicas**: DirectionalLight 1024² PCFSoft, caixa de sombra
   (±70 u) que SEGUE o jogador por frame; corpo/cabine/alerão dos karts
   lançam sombra; estrada e chão recebem.
4. **Cúpula de céu** por tema com shader próprio (gradiente topo→horizonte +
   disco solar HDR + halo): praia (azul tropical), deserto (areia quente),
   vulcão (vermelho inferno), coliseu (roxo de crepúsculo). Nuvens-sprite
   (praia/deserto) com deriva lenta.
5. **Água da praia**: Phong shininess 110 + textura de caustics própria
   (canvas) com offset animado por frame (o mar RESPIRA).
6. **Asfalto**: a fita da estrada ganha UV ao longo (7 u por repetição) e
   textura própria — grão, tracejado central amarelo e linhas de bordo
   brancas (estilo Mario Kart).
7. **Partículas** (`particulas.ts` NOVO): pool fixo round-robin (460 alta /
   0 leve), física CPU (gravidade, arrasto exponencial, fade quadrático),
   shader de pontos com size attenuation e cores por partícula. Emissores:
   fumo de derrapagem, chamas de escape (HDR), poeira off-road POR TEMA,
   faíscas de golpe (no kart atingido), jorros de mini-turbo (azul/laranja),
   burst de caixa/rampa, **confetti na chegada do jogador** (6 cores) e
   brasas ambiente no vulcão/coliseu.
8. **Riscos de velocidade**: 44 linhas aditivas FILHAS da câmara — opacidade
   sobe acima de metade da vel máx (×1,45 em turbo).
9. **Câmara com corpo**: rolagem bancária em deriva (rotateZ suavizado),
   TREMOR de impacto com decaimento exponencial (golpe/raio), FOV de
   velocidade que já existia mantido.
10. **Materiais**: karts/rodas/cabine/alerão Phong com specular; moedas
    emissivas HDR; caixas Phong com emissivo; chama aditiva.

## 4. Música por pista + pódio (som.ts)

- `TipoMusica` cresce: `praia` (126 bpm tropical maior, onda do mar nos
  passos 6/8), `deserto` (142 bpm frígio, serra seca), `vulcao` (152 bpm
  menor, kick grave + rumble profundo), `batalha` (160 bpm diminuto, hat
  nos contratempos). Timbres por tema no `tocarPasso`.
- O BateuKart escolhe o tema pela PISTA selecionada (e `batalha` no modo
  batalha); o E2E prova `musicaActual() === "praia"` na pista default.
- Efeito novo **`podio`** (31.º da tabela fechada): fanfarra triunfal com
  acorde final aberto — toca 1× no fim quando a posição é 1.º/2.º/3.º.

## 5. Ganchos E2E (honestos)

`window.__kart.graficos()` → `{ qualidade, bloom, sombras, ceuDomo,
particulasVivas, riscosVisiveis, tremorAtivo, confete, caixasAbertas, fov,
tema }` + `tremorForcar(v)` para provar o shake. `caixasAbertas` é o
contador das caixas que o PRÓPRIO jogador abriu na corrida (v70 usa-o nos
desafios de empresas).

## 6. Furos e lições desta versão

- **`MeshLambertMaterial` tipado no mapa de karts**: matCorpo passou a poder
  ser Phong — o TS apanhou (fix: união no tipo do `meshesKart`).
- **O composer precisa da câmara NA CENA** para os riscos (filhos da câmara)
  renderizarem — `cena.add(camara)`.
- **dt da partícula clampeado a 0,25 s** (lição v63) — o teste de expiração
  precisou de 6 passos × 0,25, um só passo de 1,2 s não mata (CAP honesto).
- **Sair da corrida fecha o portal** (v63/v65 correto) — o teste recarrega o
  menu em vez de clicar sair.
- **FLAKY do test-kart-online-v66 REPRO e FIX (só teste)**: o piloto de
  teste seguia o CENTRO da pista e a recolha de caixa dependia do alinhamento
  da faixa dentro do teto de 55 s da sala B (2/3 corridas perdiam o pickup
  sob carga). FIX: `pilotoTeste(pista, c, cacar)` — a caça determinística à
  caixa (<40 amostras ≈ 100 u) é USADA APENAS no teste de pickup; os testes
  de CHEGADA (núcleo 4200 passos) continuam ao centro (a 1.ª tentativa com
  caça global atrasou a meta e quebrou o fim — repado e separado). 61/0 ×2.

## 7. Prova

- `test-gfx-v69.mjs` NOVO **26/26 ×2** — A núcleo 12 (pool: emitir/vivas/
  expiração honesta/teto/limpar/NaN/shader; tabela 31 com PÓDIO; 4 temas) ·
  B E2E ALTA 10 (bloom+ACES+sombras+cúpula+tema, música da PISTA, fumo real
  em campo, riscos, FOV>66, tremor, chegada real com confetti+payout,
  GFX persiste) · C E2E LEVE 4 (caminho v65 intocado, contador de caixas,
  corrida completa com payout, ZERO pageerror nos dois modos).
- REGRESSÃO: test-kart-v65 **65/0** · test-kart-online-v66 **61/0 ×2** (com
  o fix do piloto) · test-kart-batalha-v68 **30/0** · test-som-v67 **58/0**
  (+5 asserções v69) · test-web-v262 **11/0**.
- GATES: `tsc -b` 0 · `tsc app` 0 · build OK. Capturas: shots-v69/ (alta em
  corrida, alta na chegada, leve no fim).
