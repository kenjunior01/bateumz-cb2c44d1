
# Plano de correções e melhorias

O pedido cobre 5 frentes distintas. Proponho executar por fases para poder validar cada uma antes de avançar. Confirme se quer tudo de uma vez ou fase a fase.

## Fase 1 — Erros de segurança
- Correr `security--run_security_scan` e o linter da BD.
- Corrigir findings críticos: políticas RLS em falta, `GRANT`s em falta em tabelas públicas, funções sem `search_path`, views sem `security_invoker`.
- Adicionar validação `zod` nas edge functions que hoje aceitam input sem schema (`spin-wheel-spin`, `check-ticket-threshold`, `auto-draw`, `admin-cron-jobs`).
- Ativar "Leaked Password Protection" (HIBP) na auth.

## Fase 2 — Roda da Sorte: personalização por empresa
Problema: o admin não consegue guardar personalização por empresa (logo, cores, slogan, imagem de fundo, som, segmentos personalizados) — hoje há campos no ecrã mas gravação/edição falha.

- Verificar colunas em `spin_wheel_games` (`company_logo_url`, `company_slogan`, `wheel_background_color`, `wheel_border_color`, `background_image_url`, `background_color`, `sound_enabled`, `particle_effects`, `default_effect`) e criar migração para as que faltarem.
- Adicionar `owner_user_id` / `business_user_id` em `spin_wheel_games` para associar uma roda à empresa (multi-tenant).
- Corrigir RLS: cada empresa vê/edita as suas rodas; superadmin vê todas; visitantes só rodas `is_published=true`.
- Corrigir o formulário `AdminSpinWheelManager.tsx`:
  - Upload de logo e background para bucket `game-images`.
  - Guardar/editar segmentos (label, cor, peso, prémio, imagem, limites) sem perder dados ao re-abrir.
  - Pré-visualização em tempo real.
- Espelhar tudo no dashboard do parceiro B2B (não só admin), para que cada empresa personalize a sua própria roda.

## Fase 3 — Roda da Sorte: experiência (visual + suspense + som)
- Nova animação de rotação com easing `cubic-bezier(0.17, 0.67, 0.12, 0.99)`, 6–8 segundos, ponteiro que oscila em cada segmento (tick-tack).
- Segmentos com gradientes, contorno dourado, luzes a piscar (framer-motion).
- Som procedural: tick por segmento durante o giro, fanfarra ao vencer, som "aww" ao perder (Web Audio API já existe em `src/lib/sounds.ts`).
- Fase de suspense: desaceleração dramática nos últimos 800 ms, flash e revelação animada do prémio com confetti/fireworks/stars conforme `effect_type` do segmento.
- Feedback: contador de giros restantes, últimos prémios ganhos, botão partilhar.

## Fase 4 — OBS / Overlay
- Diagnosticar `LiveOverlay.tsx` / `OverlayLive.tsx`: identificar por que o overlay do OBS não está a funcionar (rota, permissões, canal realtime, CSP de iframe).
- Garantir URL pública sem auth, transparente, com parâmetros `?live=<code>` e reconexão automática.
- Testar com `browser` headless para confirmar renderização.

## Fase 5 — Quem Quer Ser Milionário
- Ajudas (lifelines) 100% funcionais: 50:50, telefone (dica IA via `mascot-chat`), plateia (gráfico de votos simulados ponderados pela dificuldade), trocar pergunta.
- Cenário estilo TV: fundo escuro com holofotes animados, música de tensão em loop, sons de "final answer", "correct", "wrong".
- Pirâmide de prémios interativa lateral (mobile: drawer): destaca nível atual, marca checkpoints (1k, 32k) como garantidos.
- Animação da resposta: seleção → confirmação com suspense (1.5–3 s consoante nível) → verde a pulsar + confetti (correta) / vermelho com shake + som (errada).
- Tudo em Português (PT-PT) via `LanguageContext`.
- Corrigir bugs actuais do timer, do reset de ajudas entre partidas e do carregamento de perguntas por dificuldade.

## Fase 6 — Tradução para Português
- Auditar strings hard-coded em: jogos (roda, milionário, batalhas), páginas admin, dashboard.
- Mover para chaves `LanguageContext` com fallback EN e traduzir para PT-PT.
- Definir PT como default apenas se o utilizador confirmar (hoje default é EN).

## Notas técnicas
- Nenhum dado mock: usar dados reais existentes.
- Sem alterações a `src/integrations/supabase/client.ts`, `types.ts`, `.env`.
- Migrações com `GRANT` + `ENABLE RLS` + policies conforme regras do projeto.

## Confirmações necessárias
1. Executar em **todas as fases de uma vez** ou **fase a fase** com aprovação entre cada?
2. PT-PT é o idioma padrão do site inteiro, ou continua EN default e só os jogos ficam PT?
3. A personalização da roda deve estar disponível para **qualquer empresa B2B** (dashboard) ou apenas gerida pelo **superadmin**?
4. Para o OBS, tem um erro específico (URL não carrega, ecrã preto, sem realtime)?
