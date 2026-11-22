# REA — v80 «DESBLOQUEIOS REAIS» (fatia 3 da visão de retenção)

> «Progressão desbloqueia prémios.» — a v78 DECLARAVA os desbloqueios (strings nos
> NIVEIS); a v80 torna-os **REAIS**: catálogo com identidade própria, gating honesto
> por nível e SELEÇÃO de cosméticos (moldura + título) aplicados de verdade na faixa
> de nível do painel e no avatar/nome do perfil.

## 1. A visão → o que esta fatia entrega

| Pedido do produto (visão) | Implementação v80 |
| --- | --- |
| «Desbloqueios apenas de aparência/estruturais, nunca vantagem competitiva» | Tipos FECHADOS: `avatar \| moldura \| tema \| titulo \| estrutural` — não existe tipo «stat» no sistema (impossível por construção); suíte prova por enum + regex |
| «Molduras/títulos/temas desbloqueiam por nível» | 12 itens reais (os mesmos ids das NIVEIS v78): avatar clássico (1), molduras bronze/prata/ouro/lenda (2/3/4/5), tema praia (2), títulos Competidor/Campeão/Lenda Bateu (3/4/5), acesso a torneios/missões especiais/prioridade em campanhas (3/4/5) |
| «Pontos só sobem → desbloqueio é para sempre» | O gating usa o nível REAL (derivado dos pontos, que nunca expiram); a store REVALIDA a cada carga — nada de uso fantasma se o nível mudar |
| «Perfil mostra a progressão» | /profile ganha «Progressão no Bateu»: nível, pontos, quanto falta e a grelha de desbloqueios com seleção; moldura aplicada ao avatar e título junto ao nome |

## 2. Núcleo puro (`src/lib/desbloqueios.ts`, padrão progressao/ciclo)

Sem React, sem localStorage, sem DOM.

- **`CAT_DESBLOQUEIOS`** — 12 defs `{ id, tipo, nome, desc, nivel, cor }`, uma por
  string nas NIVEIS.
- **`catalogoSincronizadoComNiveis()`** — guarda de deriva nos DOIS sentidos (órfão
  em NIVEIS sem catálogo, órfão no catálogo sem NIVEIS, nível divergente). A suíte
  recusa qualquer desalinhamento — quem editar um lado sem o outro parte o build.
- **`nivelMinimoDe` / `desbloqueadosAte` / `desbloqueiosDoNivel` / `podeUsar`** —
  gating honesto (id podre → null/false sempre).
- **`hidratarCosmeticos(cru, nivel)`** — JSON podre à prova de tudo: id desconhecido,
  não-string ou BLOQUEADO → null (a store do aparelho nunca vira atalho de trampa).
- **`escolherCosmetico(estado, tipo, id, nivel)`** — recusa `bloqueado` /
  `inexistente` / `tipo` errado com estado intacto; remove com null; tipos não
  selecionáveis (avatar/estrutural) recusados.
- **`resumoFalta(pontos)`** — mensagem honesta do que falta (ou «nível máximo»).

## 3. Store do aparelho (`cosmeticosStore.ts`, wrapper fino)

`useCosmeticos(nivel)` — lê/escreve `bateu_cosmeticos_v80`, TODA a lógica no núcleo;
revalida quando o nível muda (o que passou a bloqueado sai, auto-limpo — provado no
E2E com semente de trampa).

## 4. UI — aplicados de VERDADE

- **`PainelDesbloqueios`** (presentacional, ZERO hooks de store — o DONO passa tudo
  por props; a regra v78 «um único dono da store por rota» mantém-se: duas instâncias
  de useProgressao com o efeito de re-agendamento podiam REVERTER um claim):
  - prévia com a moldura SELECIONADA (anel com a cor do item + glow) e o título;
  - grelha completa: desbloqueado → «Usar / A usar / Remover» (moldura/título/tema)
    ou «Ativo/Disponível» (avatar/estrutural); bloqueado → «Nv X» + o NOME do nível e
    os pontos EXATOS (Campeão · 6000 pts) — nada de «quase lá» fictício;
  - no hub, dentro do PainelProgressao (a faixa de nível ganha a borda/glow da
    moldura e o chip do título); no perfil, abaixo das estatísticas.
- **PainelProgressao**: `useCosmeticos` no dono; faixa de nível com a moldura aplicada
  + chip «Competidor/Campeão/Lenda Bateu» junto ao nível.
- **Profile**: dono próprio na rota; moldura aplicada ao AVATAR (borda + glow) e
  título junto ao nome; card «Progressão no Bateu» com nível/pontos/falta + grelha.

## 5. FUROS reais fechados pela própria suíte

1. **Harness que se auto-sabotava**: o `addInitScript` da suíte corria em CADA reload
   e fazia `removeItem` dos cosmeticos — matava a persistência que o próprio teste
   queria provar (PERSISTE e TRAMBIQUES falhavam por causa do harness, não do app).
   Fix: a semente só toca na progressão; os cosmeticos vivem no evaluate explícito.
2. **Assert frágil de locale**: «6.000» dependia do separador pt-PT (espaço nbsp no
   ICU) → comparação sem separadores (`6000`).

## 6. Prova

- **`test-desbloqueios-v80.mjs` NOVO — 38/38 ×2** (A núcleo 23: sincronização nos
  dois sentidos + deteção de órfão simulada · enum fechado sem stats · gating por
  nível · hidratar podre · escolher recusa bloqueado/inexistente/tipo · remover ·
  resumoFalta · B E2E 15: grelha 12 itens · bloqueado com pontos exatos · USAR aplica
  a moldura BRONZE de verdade (computed border-color rgb(180,83,9)) · título aplicado
  · prévia «A usar: Moldura Bronze» · persiste após reload · semente de lenda/campeão
  RECUSADA e auto-limpa · ZERO pageerror).
- **Regressão**: retencacao-v78 38/0 (painel alterado — o painel de desbloqueios
  dentro dele não quebra nada) · desktop-v74 35/0 · web-v262 11/0.
- **GATES**: `tsc -b` 0 · `tsc app` 0 · `build` OK.
