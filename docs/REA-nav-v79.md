# REA v79 — «POUCAS OPÇÕES PRINCIPAIS»: a reorganização do produto

> Briefing do utilizador (tradução do produto): «neste momento o Bateu está a tentar ser
> jogo, sorteio, apostas, desporto, marketplace, rede social, loja e assistente de IA ao
> mesmo tempo. O problema não é ter muitas funcionalidades; é mostrar todas ao mesmo
> tempo.» A regra: **Poucas opções principais. Muitas funcionalidades secundárias bem
> organizadas.** A ordem prática do briefing (1→10) foi seguida exactamente; o item 11
> (moderação/recomendações/comentador NVIDIA) fica para uma fase posterior.

## 1. A visão mapeada em código

| Briefing | Antes (v74-v78) | Depois (v79) |
| --- | --- | --- |
| Navegação principal = 5 áreas | barra inferior `Início · Mercado · [KART] · Arena · Perfil` | `Início · Jogos · [AO VIVO] · Desporto · Perfil` (BottomTabBar.tsx reescrito) |
| Cabeçalho desktop simples | 5 mega-menus de ícones-só + 3 atalhos directos + switchers soltos (overflow a 1280px) | `Logo · Jogos · Ao vivo · Desporto · Mercado Bateu · Mais · Pesquisar · Entrar/Participar` (Navbar.tsx reescrito: 994→~570 linhas, SEM NavigationMenu) |
| 5 círculos duplicados (Ao Vivo/Mercado/Games/VIP Hub/Mais) | `QUICK_LINKS` na homepage mobile | REMOVIDOS — a barra inferior é o único sistema de navegação |
| «Seu Status» e «Bateu Oficial» | StoriesCarousel no topo da homepage (mobile+desktop) | Saem da homepage → **Comunidade → Bateu Oficial** (Community.tsx acolhe o rail) |
| Carteira/histórico/protecção espalhados | várias superfícies | Perfil: aba renomeada «Jogo responsável» · /protecao concentra Limites+Pausa+Auto-exclusão |
| «Alienação de Bens» como nome | categoria própria + link no navbar | **Mercado Bateu** com 4 categorias: Sorteios · Concursos · Leilões e bens · Comprar e vender (Marketplace.tsx: o filtro «Leilões e bens» inclui os itens de alienação; renames em Footer/GlobalSearch/AlienacaoCatalogo/story) |
| Bateu IA chatbot universal | 6 personas (Programador/Tradutor/Criativo/Modo Profundo…) + painel de parâmetros (modelo/temperatura/top_p/max_tokens/thinking/RAG) | **4 modos: Ajuda Bateu (principal) · Desporto · Jogos · Suporte**; configurações técnicas e abas Ver/Buscar só com `localStorage bateu_ia_dev=1`; nome técnico do modelo e host do endpoint fora do cabeçalho |
| /lives nunca branco | secção de lives só quando existia | estado vazio HONESTO «Não há transmissões…» + [Activar notificações] (permissão push real) + [Ver resultados recentes] |
| KART sem ocupar a barra | FAB central KART | FAB central = AO VIVO; KART promovido DENTRO de Jogos (banner destaque) e na homepage |
| overflow a 1280px | mega-menus empurravam as acções | cabeçalho novo: `scrollWidth ≤ clientWidth` a 1280 E 1600 (provado) |

## 2. A homepage nova — EXATAMENTE cinco blocos

Componentes novos partilhados (mobile e desktop):

- **HeroPrincipal** — UMA chamada: «Joga, acompanha e participa com transparência.» +
  2 botões (Explorar jogos → /jogos · Ver ao vivo → /lives) + garantia mínima
  (verificável · +18 · jogo responsável).
- **DescobertaTres** — três cartões: Jogos populares (Grátis · sem registo, «BATEU KART
  + 17 jogos») · Lives próximas (contagem REAL via lib/liveCount; «Sem transmissões
  neste momento» quando zero) · Desporto em destaque (resultados reais). O BATEU KART
  fica promovido dentro deste bloco (home79-kart-destaque), nunca como secção de navegação.
- **ActividadeReal** — quatro linhas com dados reais e estados honestos:
  Próxima live (contagem real) · Último vencedor verificado (rpc `get_public_winners`) ·
  Destaque da semana (escolha editorial ROTULADA — nunca «mais jogado» inventado) ·
  Partida em destaque (aponta para as jornadas reais). **Se não há dados, diz-se.**
- **ConfiancaFim** — Como funciona · Resultados verificáveis · Jogo responsável · Suporte.

Saiu da homepage (reorganizado, NÃO eliminado): stories (→ Comunidade), banner «Ganhe
dinheiro» (→ menu Mais + /negocios), roll-up de vendas (→ Mercado Bateu), missões soltas
(→ Painel de Progressão do hub /lives), feed social (→ Comunidade), roll-ups v62
(Jogos&Torneios → /jogos; Esports&Ligas → /desporto e /esports).

O `main` da homepage desktop ganhou `pt-20` — a navbar é FIXA e o h1 nascia por baixo
dela (reparado com screenshot). Botão «Participar» ganhou `bg-primary` real (a classe
`btn-premium` nunca teve CSS — texto invisível em tema claro, bug pré-existente).

## 3. O menu «Mais» — as secundárias bem organizadas

- **Desktop** (dropdown no navbar): Vencedores · Histórico (bilhetes) · Comunidade ·
  Bateu IA · Indique e ganhe · Suporte · Transparência · Como funciona · Protecção do
  jogador · Termos · Privacidade + grupo Negócios (Negócios · Leilões e bens ·
  Prestações) + preferências (região/idioma/som/tema). Fecha em clique-fora e Escape.
- **Mobile** (drawer): grupo Mercado ganha «Leilões e bens»; Comunidade ganha «Bateu IA»;
  Mais ganha «Protecção do jogador» e «Privacidade».

## 4. Bateu IA — assistente especializado, não chatbot universal

- PERSONAS reduzidas a 4 (`IaBateu.tsx`): `assistente` (Ajuda Bateu), `desporto`,
  `jogos` (NOVO: explica pontos/missões/níveis/prémios com honestidade — «pontos nunca
  valem dinheiro, nenhum desbloqueio dá vantagem competitiva»), `suporte` (NOVO:
  carteira/levantamentos M-Pesa/pausa/auto-exclusão). Os ids antigos guardados em
  conversas caem no fallback `PERSONAS[0]` (prova: personaPorId).
- Toda a parede técnica (modelo/temperatura/top_p/max_tokens/thinking/pensamento
  visível/RAG + abas Ver/Buscar + chip do endpoint) fica atrás de
  `bateu_ia_dev=1`. O painel público passa a mostrar só o MODO actual + a regra de ouro:
  «A IA nunca decide resultados, prémios ou recompensas — as regras decidem».
- CONTEXTO_PLATAFORMA actualizado ao novo vocabulário (Mercado Bateu, leilões e bens).
- i18n: ia.persona.jogos.* e ia.persona.suporte.* ×6 idiomas; `ia.persona.assistente.nome`
  → «Ajuda Bateu»; `ia.subtitle` sem o nome técnico do modelo; keys nav79.* e home79.*
  ×6 idiomas (scripts/add-i18n-v79.py, idempotente por âncora).

## 5. Prova (E2E + regressão)

- **test-nav-v79.mjs NOVO — 78/78 ×2**: barra inferior 5 áreas com testids (incl. o bug
  pré-existente: os tabs Home/Perfil não tinham data-testid) · botão central AO VIVO ·
  sem mh-quick · sem stories na home · hero 1 chamada + 2 destinos reais · 3 cartões +
  KART-destaque · actividade real honesta · confiança · IA 4 modos e ZERO técnica ·
  Mercado Bateu 4 categorias sem «Alienação» · Comunidade acolhe stories · /lives vazio
  honesto com 2 acções reais · Perfil guarda convidado · /protecao concentra as
  ferramentas · desktop 1280px sem overflow · Mais com o menu secundário completo ·
  5 destinos carregam conteúdo · KART jogável via deep-link.
- Regressão actualizada à realidade v79 (as suítes que exigiam as superfícies REMOVIDAS
  por design foram reescritas para PROVAR a remoção): test-home-dinamica 24/0 (5 blocos +
  ausências), test-marketplace 57/0 (5 chips + descoberta), test-arena 25/0 (sem banner
  de Arena na home), test-ecosystem 29/0 (Negócios no Mais), test-stories-plans 14/0
  (stories na Comunidade), test-web-excellence 13/0 (prefetch no link principal),
  test-web-v262 11/0 (navegação instantânea sem atalhos), test-desktop-v74 42/0
  (navbar nova sem overflow a 1600px), test-auditoria-v40 50/0 (hero v79, i18n EN).
- Bateria intacta: retenção v78 38/0 · desafios v70 36/0 · som v67 58/0 · gfx v69 28/0 ·
  classic v72 53/0 · regional v73 60/0 · kart v65 65/0 · kart-ia v77 26/0 · kart-ia v76
  49/0 · online v66 61/0 · batalha v68 30/0 · tsc -b 0 · build OK.

## 6. O que FICA para depois (item 11 do briefing)

Moderação, recomendações e comentador de desporto com NVIDIA (IA só sugere — nunca
decide resultados ou prémios); contexto contextual do assistente por página (abrir no
sorteio já preparado para aquele sorteio).
