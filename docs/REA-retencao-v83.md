# REA v83 — «A RETENÇÃO À VISTA» (fatia 4 da visão de retenção)

**Pedido:** «continue para deixar a plataforma incrível» sobre a visão de retenção
(«Jogos geram pontos. Pontos geram progressão. Progressão desbloqueia prémios.»).
A v78 construiu o ciclo (núcleo), a v79 tornou-o VISÍVEL (hub + página Prémios),
a v80 tornou os desbloqueios REAIS, a v81/v82 organizaram o produto e fecharam o
passo NVIDIA. Faltava o ciclo nas SUPERFÍCIES DE ENTRADA — é esta fatia.

## 1 · Navegação fecha o ciclo

**Barra inferior mobile** (BottomTabBar.tsx): `Início · Jogos · [AO VIVO central] · PRÉMIOS · Perfil`
— o separador Desporto dá lugar a **Prémios** (`mob-tab-premios`, i18n `tab.premios`).
A visão: «a página Prémios deve ser uma das áreas principais» — é onde o ciclo se
fecha e as 4 carteiras ficam à vista.

**Cabeçalho desktop** (Navbar.tsx): principais = Jogos · Ao vivo · Desporto · **Prémios**
(`nav79-desktop-premios`, i18n `nav79.premios`). O **Mercado** passa a secundário
no menu «Mais» (primeiro item do grupo de negócios, `nav79.mercado`) — secundário
organizado, nunca eliminado. A entrada `/premios` no «Mais» foi REMOVIDA (agora é
principal — dedupe, regra v81).

**Menu «Mais» mobile** (MobileMenuDrawer.tsx): ganha a entrada Prémios; o Desporto
e o Mercado continuam lá — exatamente o que a visão pede («O Desporto e o Mercado
podem ficar dentro de "Mais" no mobile, se a barra ficar demasiado cheia»).

## 2 · A homepage mostra a PROGRESSÃO (BoasVindasRetencao.tsx NOVO)

Montado logo a seguir ao HeroPrincipal na homepage **desktop (Index.tsx)** e
**mobile (MobileHomeApp.tsx)** — um componente, duas variantes por conta:

- **VISITANTE** (`reten-bv-visitante`): o que muda com a conta, sem pressão nem
  bloqueio — «Sem conta: jogas grátis — o progresso fica neste aparelho» /
  «Com conta: missões do dia, níveis e prémios no teu perfil» + CTA
  [Criar conta grátis] → `/register` (`reten-cta-registo`). O que já é possível
  sem conta continua possível (o herói e os 3 cartões de descoberta ficam intactos).
- **REGISTADO** (`reten-bv-registado`): exatamente o bloco da visão —
  «Olá, {nome}» (`reten-ola`) · chip «Nível {n} · {nome}» (`reten-nivel`) ·
  «{pontos} pontos» (`reten-pontos`) · «Faltam {faltam} pontos para {proximo}»
  (`reten-faltam`, limiares REAIS do núcleo: 0 → 500 Explorador → 2000 Competidor
  → 6000 Campeão → 15000 Lenda) · [Continuar a jogar] → `/jogos`
  (`reten-continuar`) + três cartões do ciclo:
  - **Missão do dia** (`reten-missao`, progresso real `n/alvo` em
    `reten-missao-prog`, botão Reclamar só quando completa — o núcleo v78 valida
    falta/expirada/já);
  - **Torneio** (`reten-torneio`) — `getActiveTournament()` da tabela
    `tournaments`; sem torneio activo DIZ-SE (`reten-torneio-vazio`) com atalho
    para `/tournaments`;
  - **A seguir desbloqueias** (`reten-desbloqueios`) — os desbloqueios do nível
    seguinte (só aparência/acesso, regra anti-vantagem-injusta do núcleo).

## 3 · Perfil: as 4 carteiras à vista

Cartão «Progressão no Bateu» (Profile.tsx) ganha a linha `perfil-carteiras`:
`Pontos: {real}` · `Bilhetes: {stats.total real}` · ligações «Prémios e bilhetes →»
(`/my-tickets`) e «Saldo na carteira →» (`/wallet`). Só números com FONTE própria —
nada de «Prémios: 0» inventado nem saldo falso; o valor real do saldo vive na
carteira financeira, que fica ligada em vez de copiado.

## 4 · i18n ×6

22 chaves novas (`tab.premios`, `nav79.premios`, `reten.*` — visitante/olá/nível/
pontos/faltam/nívelMax/continuar/missão×6/torneio×3/desbloqueios×2) nos SEIS
dicionários (en, pt, pt-BR, es, fr, hi) via `scripts/insere_i18n_v83.py`
(inserção determinística por fronteiras de dicionário — âncoras pt/pt-BR são
idênticas, o script processa de baixo para cima). Placeholders `{nome}/{n}/
{pontos}/{faltam}/{proximo}` uniformes em todas as línguas (as chaves das vars
são identificadores de código).

## 5 · Honestidade — o que esta fatia NÃO faz (dito claramente)

- A progressão continua **do aparelho** (`bateu_progressao_v78`); o comentário da
  store declara «ao iniciar sessão o jogadorId passa a ser o da conta» mas NADA
  o implementa — em vez de o fingir, o bloco registado DECLARA «Progresso
  contado neste aparelho» e a sincronização real com a conta (servidor/migração)
  fica documentada como a fatia seguinte da visão («Com registo: guardar pontos
  na conta; continuar o progresso noutro dispositivo»).
- O painel v78 e a página Prémios mantêm as regras anti-dark-pattern: pontos
  nunca expiram, nunca viram dinheiro automaticamente, alvos sempre alcançáveis,
  nada de contadores falsos (prova: «estado novo mostra 0 pontos» na suíte).

## 6 · Provas

- `test-retencao-v83.mjs` NOVO **39/0**: barra mobile fecha o ciclo (Prémios
  separador; Desporto ausente; drawer fonte com Desporto+Mercado+Prémios;
  clique → `/premios` com 4 carteiras e 5 níveis) · visitante honesto (bloco
  visitante; registado ausente a convidados; CTA → /register; herói+3 cartões
  intactos) · desktop (Prémios nos principais; Mercado fora; sem overflow 1280;
  clique → /premios; Mais com Mercado Bateu/Bateu IA/Transparência) · núcleo no
  hub (painel, missões n/alvo, 0 pontos em estado novo, 4 carteiras com MZN,
  mensagem de convidado) · Perfil convidado → /login + /protecao pública.
- Regressão: **nav-v79 83/0** (actualizada: barra/premios/Mais→Mercado/destinos)
  · **desktop-v74 42/0** (principais actualizados) · **retenção-v78 38/0** ·
  **home-dinamica 24/0** · **web-v262 11/0** · **marketplace 57/0** ·
  **ia-v82 72/0** · **web-excellence 13/0** (1.ª passagem 12/1 = flake de
  performance do sandbox já provado ambiental na v82) · `tsc -b 0` · build OK.
