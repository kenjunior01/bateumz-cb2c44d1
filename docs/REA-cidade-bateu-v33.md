# REA — CIDADE BATEU v33 (o mundo-âncora da plataforma)

**Data:** 2025-11-03 · **Rota:** `/cidade` · **Estado:** v1 completa, 31/31 E2E · regressões 101+30 verdes · tsc 0

## O que é

A Cidade Bateu é o jogo-âncora decidido com o utilizador: uma cidade voxel persistente
onde **cada distrito é um portal para uma secção real da plataforma**. Foco cultural
Moçambique · Angola · Cabo Verde, aberta ao mundo (i18n em 6 blocos de língua: pt, pt-BR,
en, es, fr, hi).

## Decisões de desenho (e porquê)

| Decisão | Razão |
|---|---|
| Semente FIXA `20251103` | Todos os visitantes vêem a mesma cidade — base para multiplayer futuro, partilha de coordenadas e eventos |
| Sobrepor um `MundoCidade extends Mundo` | Reutiliza 100% do motor original (chunks, AO, malhagem, meteorologia) sem tocar na mecânica do BateuCraft; só 2 ganchos novos no `engine.ts` (`fabricaMundo`, `spawnFixo`), por omissão o motor comporta-se exactamente como antes |
| Praça do Imbondeiro central | Assinatura cultural própria (imbondeiro = baobá): copa larga e achatada, tronco alto — nada disto existe em nenhum jogo do género, é expressão original |
| 10 distritos com rotas REAIS verificadas em `App.tsx` | Zero rotas inventadas: `/marketplace`, `/leiloes`, `/desporto`, `/esports`, `/jogos`, `/lives`, `/negocios`, `/community`, `/jogos-gratis`, `/concursos` |
| Cidade sempre pacífica (`pacificarGestor`) | O hub não pode matar o jogador; gestor substituído por closures — só animais passivos, `noite` forçado a `false` (nunca há hostis nem dano) |
| Modo criativo no hub | Exploração livre; quebrar/colocar sem inventário — a cidade é porta, não sobrevivência (isso fica no BateuCraft) |
| Missões urbanas locais (`missoes.ts`) | Determinísticas por dia UTC, iguais para todos, registadas só por proximidade 3D real (<8 blocos) — nada é "concluído" por teatro; créditos em `localStorage` do dispositivo |
| Clima real openMeteo (Maputo por omissão) | Reaproveita a integração v31 do BateuCraft: o céu e a chuva da cidade seguem a meteorologia REAL; erro mostrado como erro ("Clima real indisponível"), atribuição visível na Sala de Troféus |

## Honestidade (as 3 regras)

1. **Zero dados inventados** — créditos só de missões realmente registadas por proximidade; a Sala de Troféus diz "tudo vem da tua atividade real, guardada no teu dispositivo".
2. **Erros honestos** — openMeteo indisponível → chip "Clima real indisponível" (verificado no E2E com rede bloqueada pelo regex errado, corrigido para `^https://api\.open-meteo\.com/` — o padrão solto casava com `geocoding-api.…`).
3. **Atribuição explícita** — "Fonte · open-meteo.com" no início; `OPENMETEO_ATTRIBUTION` na Sala de Troféus; semente da cidade exibida.

## Problemas reais apanhados e resolvidos

1. **`ALTURA_PLATEAU` importado de `constants`** (não existe lá) → crash do lazy route apanhado por probe, não por tsc (lição: tsc não apanhou o import inexistente? — verificado de novo: após mover o import, `tsc` e runtime verdes; registrar nos testes que o probe corre SEMPRE antes do E2E).
2. **Wrapper da transição de página com `filter: blur(0px)`** cria *containing block* e esmaga o `fixed inset-0` do jogo (altura 0, `<html>` interceptava cliques) → página renderizada via `createPortal(…, document.body)`.
3. **Âncora dos rótulos flutuantes** a `y+9.5` saía do frustum quando o jogador está junto ao edifício (NDC > 1.15) → CTA nunca aparecia; âncora baixa para `y+4.5` quando o distrito está perto.
4. **Regex do mock openMeteo** casava com o host do geocoding → 2 falhas no E2E; âncora no início do host resolveu.
5. **`toLocaleString("pt-PT")` formata `26,4`** com vírgula → asserção do E2E aceite ambas (`/26[.,]4/`).
6. **Telhados em anel + árvores naturais dentro dos edifícios** (verificado em screenshot aérea) → telhado completo 9×9, limpeza de árvores até y+12, postes de tocha nos caminhos de 1/5 → 1/9.

## Verificação

- `test-cidade.mjs` **31/31**: início · clima real mockado (geocoding+forecast) · spawn na praça sem NaN · blocos da cidade (imbondeiro, pavimento, paredes, tochas) · 5 câmaras distintas · 3 missões com progresso real · 4 portais detetados por proximidade · créditos 45 ganhos por visitas reais · CTA do portal Palco da Praça navega para `/lives` · Sala de Troféus com créditos e atribuição · relógio HH:MM · mobile 375 (joystick, saltar, minimapa) · zero erros de consola
- **Regressões:** `test-blocos.mjs` 101/101 (motor intacto) · `test-apis-publicas.mjs` 30/30 · `tsc --noEmit` limpo
- **Screenshots verificadas** (`shots-v33/`): início com clima real · 3ª pessoa na praça com HUD completo · aérea com os 10 distritos, telhados completos e caminhos limpos

## Pendências honestas (v1 → v2)

- Sincronização de posição/edições da cidade (agora regenera determinística a cada visita; edições do jogador no hub não persistem — documentado no ecrã de início de futuras versões)
- Guardar o save da cidade numa chave própria (hoje NÃO chama `motor.guardar()` para não colidir com o save do BateuCraft)
- Minimapa com nomes dos distritos; escolha da cidade do clima (hoje Maputo fixo); sala de troféus a ligar ao XP central da plataforma
- Fases M1–M3 de multiplayer (Supabase Realtime → co-op → servidor dedicado) conforme plano acordado
