# REA v70 — DESAFIOS DE EMPRESAS: prémios patrocinados na plataforma

Data: 2026-11-19 · Âmbito: `src/lib/desafios.ts` NOVO, `PainelDesafios.tsx` NOVO,
`BateuKart.tsx`, `LiveHub.tsx`, `LanguageContext.tsx`, limpeza RPG final (Ligas)

## 1. Pedido

«Podes relacionar tudo isso com a plataforma, tipo empresas podem lançar um
desafio ou uma espécie de prémios para o jogo» — o mecanismo de PATROCÍNIOS:
empresas lançam desafios com prémios em moedas, os pilotos cumprem e clamam.

## 2. Núcleo isomórfico (`src/lib/desafios.ts`)

- **EmpresaPatro** (nome/setor/cor/iniciais/tagline) + **MetaDesafio** união
  discriminada com 7 tipos alimentados por dados que o jogo JÁ produz
  honestamente: `podio` (pista+top+modo), `corridasCompletas`, `vitorias`,
  `moedasCorrida` (melhor MARCA numa corrida, não acumula), `caixas`,
  `baloes` (só batalha), `onlineCorridas`.
- **CATALOGO_DESAFIOS**: 8 desafios de empresas FICTÍCIAS do lançamento
  (TropiCola, TurboTec Peças, AeroAmazónica, Casca & Cia., BalloonBank
  Seguros, Pneus Mumbo, Banco das Lendas, Energético Zimbo) — zero marcas
  reais inventadas.
- **Estado no aparelho** (`bateu_desafios_v1`): prog/reclamado por desafio;
  `registarResultado(res)` aplica o resultado a TODOS os desafios e devolve
  os ids que ficaram concluídos (toast); `clamar(id)` paga 1× e CONGELA
  (reclamado não volta a acumular); tetos honestos `TETO_META`.
- **Sala de Patrocínios**: `validaInputDesafio` (nome 2-24, título 4-60,
  desc 8-220, prémio 50-10000, nível 1-30, metas dentro dos tetos, pista
  válida) + `criarDesafio` gera a marca (cor hash, iniciais do nome, id
  `custom-*`) e guarda em `bateu_desafios_custom_v1` (teto 24).
- **HONESTO declarado**: o mecanismo é real (metas, progresso, prémio 1×)
  mas vive NO APARELHO até existirem contas de empresa — nada finge backend
  (nota visível na UI ×2 idiomas).
- SEGURO EM NODE: todo o localStorage é guardado; as suítes usam um shim.

## 3. Integração no BATEU KART

- O fim de corrida/batalha/online monta um `ResultadoKart` REAL: modo
  (online/corrida/batalha), pista, posição, moedas da corrida, caixas «?»
  abertas (contador do motor v69 `caixasAbertas`), mini-turbos de fase 2
  (contador novo nos avisos), balões estourados por mim (golpes do HUD) e
  venceu — `registarResultado` alimenta tudo; toasts de conclusão + som.
- Menu do kart: secção «DESAFIOS DE EMPRESAS» com cartões (marca colorida,
  prémio, barra de progresso, CLAMAR → moedas diretas no `bateu_kart_save`).

## 4. Plataforma (LiveHub)

- **PainelDesafios** novo: secção «DESAFIOS DE EMPRESAS · PRÉMIOS
  PATROCINADOS» no hub (4 colunas) com o MESMO estado do aparelho, botão
  CLAMAR com as moedas a cairem no save do kart, CTA «Correr no Kart» e a
  **SALA DE PATROCÍNIOS** (modal com formulário completo de criação).
- **FURO REAL fechado com repro**: o modal `fixed inset-0` vivia dentro de
  um ancestral com `transform` (framer-motion do hub) — `position: fixed`
  ancora-se AO ANCESTRAL transformado, e o botão ficava a y≈2351 px fora do
  ecrã (elementFromPoint → null; o 1.º clique morria, o 2.º funcionava
  depois do scroll assentar). FIX da casa (v62): `createPortal(document.body)`
  — fixed volta a ser VIEWPORT. Prova: o teste antes falhava o clique de
  validação, depois passa ×2.

## 5. Limpeza RPG final (continuação da v68a)

O sistema de LIGAS ainda criava torneios «Campeonato RPG» para um jogo que
já não existe: `rpg_championship` fora da união LeagueFormat, dos FORMATOS,
das opções de criação e do bloco de configuração RPG completo do dashboard;
género `rpg` fora de GameCategory/labels/filtro de listagem; colunas/classes
RPG das standings fora (interface + LeagueDetailPage); "RPG Arena" fora da
lista de jogos do dashboard; `rpg_config` fora dos payloads; "Jogos e RPG
3D" → "Corridas 3D" na monetização; `rpg_characters` fora da tabela
conta-apenas do convidado. ZERO referências RPG funcionais no src/.

## 6. Prova

- `test-desafios-v70.mjs` NOVO **36 verdes ×2, 0 skips** — A núcleo 27
  (catálogo honesto, metaAlvo+TETO, pódio por pista/topo/modo, acumuladores
  caixas/balões-batalha/online, moedasCorrida como melhor marca, claim 1× +
  congelamento + null em não-concluído, validação da Sala com 3 recusas +
  criação com marca gerada + teto de meta, persistência no aparelho) ·
  B E2E 9 (hub com cartões, sala recusa com MOTIVO, sala cria REAL que
  aparece no hub, menu do kart com a mesma secção, CORRIDA REAL de 3 voltas
  que alimenta o progresso no aparelho (1/5 + caixa), CLAMAR paga +380
  moedas ao save e marca reclamado, ZERO pageerror).
- REGRESSÃO: test-kart-v65 **65/0** · test-kart-online-v66 **61/0 ×2** (com
  o gancho `alvoCaixa()` + piloto de caça no browser — fim do flaky de
  pickup, lição v65.1) · test-kart-batalha-v68 **30/0** · test-gfx-v69
  **26/0** · test-som-v67 **58/0** · test-web-v262 **11/0**.
- GATES: `tsc -b` 0 · `tsc app` 0 · build OK. Capturas: shots-v70/ (hub com
  a secção, menu do kart com cartões/prémios/CLAMAR).
