# REA — v86 «E-SPORT VIVO» (torneios/ligas/empresas que funcionam + forma de jogar do kart)

**Data:** 2026-11-24 · **Base:** bc6ba03 (v85) · **Suíte:** test-esport-v86.mjs — 44/44 · **Commit:** 9fab3b3

## 1. O pedido (resumo)

«Melhore a forma de jogar o kart, mas quero que as funcionalidades de e-sport estejam a
funcionar muito, tipo criação de torneios, ligas para diferentes jogos e as empresas possam
também [criar].» Três entregas:

1. **Forma de jogar do BATEU KART** — controlo/física ajustáveis ao piloto (dificuldade,
   assistência, auto-aceleração), não apenas aparência do banner.
2. **E-sport que FUNCIONA** — criar torneios de verdade (com inscrição, arranque, rondas,
   classificação e prémio), ligas para DIFERENTES jogos (não só kart), tudo alimentado por
   resultados reais — «funcionar muito» significa ciclo completo, não páginas decorativas.
3. **Empresas como organizadoras de primeira classe** — criar torneios/ligas patrocinados
   com marca própria.

Regras de base mantidas: números SÓ reais (nada de «N torneios já realizados» inventado),
nav «poucas opções principais», data-testid + i18n ×6 + suíte PW nova + regressão verde.

## 2. O que foi implementado

### 2.1 Núcleo isomórfico — `src/lib/esport.ts` NOVO

Zero React, Node-safe com ls guardado (padrão desafios v70 / iaHistorico v58 /
progressaoConta v84). A store do aparelho é `bateu_esport_v1` `{torneios, ligas, ts}`.

- **Torneios**: formato «campeonato» (pontos acumulados na janela) e «eliminatória»
  (rondas reais: r1 corta top tamanho/2 → final exige 1.º; tamanhos 4/8), tamanhos 4/8/12,
  prémio 100-5000 Pontos Bateu, janela 1-30 dias. `validaTorneio` recusa nome curto, jogo
  desconhecido, prémio fora do teto, eliminatória com tamanho 12.
- **Ligas**: por jogo (temporada gerada automaticamente por contagem do mesmo jogo) com
  classificação alimentada por partidas reais.
- **Empresa**: `organizadorDe` transforma nome+sector numa marca com cor/iniciais
  (mesmo mecanismo dos desafios v70) — a empresa é organizadora de primeira classe.
- **Pipeline de resultados REAIS**: `partidaParaTorneios`/`partidaParaLigas` consomem o
  evento `bateu:partida` `{jogoId, pontos, vitoria, posicao, campo}`:
  - **KART** (tem campo): cada corrida dá posições reais a TODOS os 12 pilotos — tabela F1
    `PONTOS_POSICAO` 25/18/15/12/10/8/6/4/2/1/0/0; os bots do torneio são casados POR NOME
    com o campo (`participanteDoCampo`) e o jogador é o id «eu».
  - **Outros jogos** (sem campo): só o JOGADOR acumula OS TEUS pontos reais com teto
    honesto de 25/partida (`TETO_PONTOS_PARTIDA_SEM_CAMPO`) — declarado na UI («≤25»).
- **Janela a fechar**: `expirarPendentes` coroa o líder como campeão; partidas fora da
  janela não contam. Claim de prémio 1× (`clamarPremioTorneio/Liga`), pago pela store da
  progressão via `pontosDeJogo("esport-premio", n, n)` — sem evento de jogo falso.
- **Tetos honestos do aparelho**: 12 torneios · 8 ligas (`TETO_TORNEIOS/TETO_LIGAS`).
- **Rivais IA**: os MESMOS 11 pilotos do circuito (`RIVAIS_IA`), SEMPRE etiquetados «IA»
  (`eBot: true`) na grelha e classificação.
- `ouvirPartidasEsport()` instala o bus de forma idempotente — chamada 1× no App.

### 2.2 Forma de jogar do kart — `src/game/kart/core.ts` + `motor.ts`

- **DIFICULDADE** `facil|normal|dificil` (`novaCorrida` opts + `EstadoCorrida.dificuldade`):
  - «normal» é o comportamento EXATO de sempre — a suíte PROVA skills idênticas na mesma
    seed byte-a-byte (LEQUE_SKILL 0,70+rng·0,27);
  - fácil 0,62+0,20 com reflexo +0,08 s e rubber-banding 90 u (1,09-0,91);
  - difícil 0,78+0,19 com reflexo −0,05 s e rubber 240 u (1,04-0,96).
- **ASSISTÊNCIA de condução** (`EstadoCorrida.assistencia`, só o jogador): corrige a
  viragem para a linha de corrida com peso que decai quando o piloto já vira com força e
  NUNCA age em derrapagem. Prova física da suíte: entrada «direita presa» 600 passos →
  média |lateral| MENOR com assistência na mesma seed.
- **AUTO-ACELERAÇÃO** no motor (`OptsMotor.autoAcelerar`): o acelerador nunca larga em
  `sincronizarTeclas/largarTudo/setEntrada` — pensada para o móvel.
- **O ONLINE não muda**: `novaCorridaOnline` mantém o campo padrão (normal, sem assistência).

### 2.3 UI do kart + superfícies e-sport

- Menu do kart: linha «Forma de jogar» (`kart-forma`) com dificuldade ×3 (`kart-dif-*`) +
  toggles assistência (`kart-assist`) e auto-aceleração (`kart-auto`), persistidos no
  aparelho (`bateu_kart_dif/assist/auto`) e passados ao MotorKart.
- O payout do bus `bateu:partida` leva agora também `posicao/total/campo` (posições reais
  dos 12 pilotos) — compatível com o painel v78 (campos extra ignorados).
- **`/tournaments/criar` NOVO** (rota registada ANTES de /:id — senão «criar» virava id):
  form completo (`torneio-form-*`) com jogo ×10, formato (eliminatória SÓ no kart —
  «posições reais», honesto), tamanho, pista/voltas, prémio, janela e organizador Eu/Empresa.
- **`/tournaments`**: secção «Torneios que funcionam agora» (`torneios-local-section`) com
  cartões reais (marca da empresa visível) + botão «Criar Torneio» a levar à criação REAL.
- **`/tournaments/:id`**: ids «local-*» renderizam `TorneioLocalDetalhe` NOVO (inscrição →
  arranque com grelha IA → ronda/corte → classificação ao vivo → «Jogar partida de {jogo}»
  → /lives?game=X → campeão + CLAIM). Wrapper `TorneioRemoto` para NUNCA trocar a ordem
  dos hooks entre superfícies remota e local.
- **`/ligas`**: secção «Ligas do aparelho» (`ligas-local-section`) + MODAL de criação
  (`ligas-modal-criar`) — o link morto ao dashboard Supabase saiu do CTA principal.
- **`/ligas/:slug`**: slugs «local-liga-*» renderizam `LigaLocalDetalhe` NOVO (lazy +
  Suspense, wrapper `LigaRemota`): temporada, pontos/partida declarado (kart «Por posição»,
  outros «≤25»), inscrição, classificação real, campeão + claim.
- **Bus global no App**: `ouvirPartidasEsport()` instalado 1× — QUALQUER partida reportada
  alimenta torneios/ligas ativos do mesmo jogo, mesmo fora das páginas de e-sport.

### 2.4 i18n ×6

~75 chaves novas (pt·en·pt-BR·es·fr·hi): `kart.forma.*`, `kart.dif.*`, `kart.assist`,
`kart.auto`, `esport.estado.*`, `esport.nota.aparelho`, `esport.lista*`, `esport.local.*`
×20, `esport.criar.*` ×25, `esport.liga.criar.*`, `ligas.voltarLista`, `liga.local.*` —
via scripts/add-i18n-v86.py (âncora na abertura de cada dicionário). FURO fechado: a
assinatura de `t()` tem 2.º parâmetro `Record<string,string>` — os fallbacks em string da
LigaLocalDetalhe saíram (o tsc apanhou).

## 3. Provas (test-esport-v86.mjs — 44/44)

### A) Núcleo (24)

Validação dura (nome/jogo/prémio/eliminatória-tamanho) · criação jogador + empresa (marca
com iniciais/cor/sector) · teto 12 torneios · inscrição + arranque (grelha 8 com 7 IA) ·
campeonato com campo REAL F1 e casamento por nome (Eu 1.º → 25, Kudisso 2.º → 18…) ·
isolamento por jogo (partida de damas não alimenta torneio de kart) · janela a fechar com
campeão líder e partida FORA da janela a não contar · claim 1× · sem campo = teto 25/ ·
eliminatória corte→final→campeão com eliminado honesto · liga de damas com temporada e
claim · dificuldade «normal» == baseline EXATO (mesma seed) · leques fácil/difícil ·
assistência física (|lateral| menor) · tabela F1 completa.

### B) E2E (20)

Criar campeonato pelo form → inscrição → INICIAR (grelha IA) → «Jogar ronda» →
/lives?game=kart → bus REAL com campo (15/25 F1) → vitória 40>25 → janela fecha → CAMPEÃO
«Eu» → CLAIM 1× → EMPRESA cria o SEU torneio patrocinado (nome no detalhe) → liga de
xadrez pelo modal alimenta por partida real → 1280 px sem overflow ×3 rotas → i18n EN sem
chaves cruas → menu com Forma de jogar + dificuldade persiste → ZERO pageerror.

### Regressão completa (mesma sessão do commit e re-prova v86.1 em sandbox reciclado)

kart-v65 **65/0** · kart-ia-v77 **26/0** · kart-batalha-v68 **30/0** · kart-online-v66
**61/0** · retencao-v83 **39/0** · retencao-v84 **67/0** · nav-v79 **83/0** ·
retencacao-v78 **38/0** · web-v262 **11/0** · som-v67 **58/0** · `tsc -b` **0** ·
`tsc app` **0** · build OK (4518 módulos).

## 4. Honestidade (o que fica)

- Os torneios/ligas vivem NO APARELHO e a UI DECLARA («E-sport do aparelho: resultados SÓ
  de partidas reais… Nada finge servidor — o progresso vive neste dispositivo»,
  `esport.nota.aparelho` ×6 idiomas, visível no fundo dos detalhes).
- Rivais IA sempre etiquetados «IA»; nenhum número inventado — pontos só de partidas que
  o jogo REPORTOU de verdade (no kart, tabela F1 sobre o campo; nos outros, os pontos
  reais do jogador com teto declarado).
- Os cartões REMOTOS de torneios/ligas continuam no seu estado honesto (a tabela
  `tournaments`/`leagues` não existe no projeto — PGRST205 real desde a v84 — e a lista
  remota mostra o seu erro com «Tentar novamente» enquanto isso).
- Sincronização para o servidor quando a migração existir é a fatia seguinte (anotada no
  worklog v86, junto dos brackets visuais e troféus de campeão).

## 5. v86.1 — endurecimento do harness + shots + este doc (2026-11-24)

- **FURO de flake apanhado pós-commit**: o passo «i18n EN» da suíte falhou 1× (44→43) em
  arranque FRIO do vite — o `waitForSelector` do formulário resolvia no 1.º paint e a
  captura do HTML/`h1` chegava a chegar ANTES da hidratação da i18n. FIX:
  `dormir(800)` antes da captura (comentado no local) — a ASSENTAÇÃO é a mesma; re-provas
  ×2 verdes, incluindo 44/44 com vite re-iniciado a frio imediatamente antes.
- **shots-v86** NOVO (scripts/shots-v86.mjs, padrão v84/v85): 6 capturas da UI atual com
  dados REAIS criados pelo próprio núcleo (mesmo caminho da UI — sem JSON inventado):
  lista de torneios (2, com marca TropiCola), detalhe com classificação F1 viva
  (Kudisso 43 · Eu 40), form de criação, lista de ligas, detalhe da liga de xadrez
  (≤25/partida declarado) e menu do kart com «Forma de jogar». FURO do próprio script
  caçado: stringify duplo da store (a shim já guarda string) fazia o `lerEsport` recusar
  a seed; e o campo das corridas de demo passou a PERMUTAÇÃO honesta 1-12 (posições
  únicas, como o jogo real produz).
- **docs/REA-esport-v86.md** (este ficheiro).
