# 🌍 Funcionalidades do Mundial 2026 - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
3. [Funcionalidades do Mundial](#funcionalidades-do-mundial)
4. [Sistema de Pontos de Engajamento](#sistema-de-pontos-de-engajamento)
5. [Painéis Administrativos](#painéis-administrativos)
6. [Rotas e Endpoints](#rotas-e-endpoints)

---

## 🎯 Visão Geral

A plataforma **bateu.online** foi expandida com um conjunto completo de funcionalidades relacionadas à **Copa do Mundo 2026**, incluindo:

- **Bolão do Mundial**: Sistema de previsões de jogos com pontos
- **Fantasy Football**: Monta tua equipa de jogadores
- **Central do Mundial**: Calendário, equipes e notícias
- **Fórum de Discussão**: Comunidade temática por região
- **Sistema de Pontos**: Engajamento gamificado
- **Arquitetura Multi-Tenant**: Suporte a múltiplas regiões com CEOs regionais

---

## 🏗️ Arquitetura Multi-Tenant

### Conceito
A plataforma utiliza uma arquitetura **multi-tenant** onde:
- **Você (Super Admin)**: Controla todas as regiões e configurações globais
- **CEOs Regionais (Admins)**: Gerenciam sorteios, usuários e configurações da sua região
- **Usuários Finais**: Participam em sorteios, fazem previsões e acumulam pontos

### Tabelas Principais

#### `regions`
Armazena informações de cada região/país:
```sql
- id (UUID)
- country_code (TEXT, UNIQUE) - Ex: "BR", "US", "PT"
- label (TEXT) - Nome da região
- flag (TEXT) - Emoji da bandeira
- currency (TEXT) - Moeda (BRL, USD, EUR)
- name (TEXT) - Nome amigável
- primary_color (TEXT) - Cor primária em hex
- secondary_color (TEXT) - Cor secundária
- accent_color (TEXT) - Cor de destaque
- default_language (TEXT) - Idioma padrão (pt-BR, en, es)
- logo_url (TEXT) - URL do logótipo regional
- banner_url (TEXT) - URL do banner
- is_active (BOOLEAN)
```

#### `admin_regions`
Atribui CEOs Regionais a regiões:
```sql
- id (UUID)
- user_id (UUID) - Referência ao utilizador
- country_code (TEXT) - País gerenciado
- assigned_by (UUID) - Super Admin que atribuiu
- created_at (TIMESTAMP)
```

#### `translations`
Dicionário de traduções por região:
```sql
- id (UUID)
- key (TEXT) - Ex: "hero.welcome_message"
- language_code (TEXT) - Ex: "pt-BR"
- value (TEXT) - Valor traduzido
- region_id (UUID) - Região específica
```

### Row Level Security (RLS)

Todas as tabelas têm políticas de segurança:

**Super Admin**: Acesso total a tudo
```sql
USING (public.is_superadmin(auth.uid()))
```

**CEO Regional**: Apenas dados da sua região
```sql
USING (public.can_admin_country(auth.uid(), country_code))
```

**Utilizadores Finais**: Apenas dados públicos ou seus próprios dados
```sql
USING (auth.uid() = user_id OR status = 'published')
```

---

## ⚽ Funcionalidades do Mundial

### 1. Central do Mundial (`/mundial`)

**Página pública** com informações do torneio:

#### Abas Disponíveis:
- **Jogos**: Calendário completo com resultados
- **Equipes**: Perfis das 32 seleções
- **Notícias**: Artigos e análises publicadas
- **Bolão**: Acesso ao sistema de previsões

#### Tabelas Relacionadas:
```sql
world_cup_teams
- id, country_code, team_name, flag_emoji
- group_letter, coach_name, star_players[], logo_url

world_cup_matches
- id, match_date, team_a_id, team_b_id
- stage (group, round16, quarterfinal, semifinal, final)
- status (scheduled, live, completed, cancelled)
- team_a_goals, team_b_goals, team_a_penalties, team_b_penalties
- winner_team_id, stadium, city, country

world_cup_news
- id, title, content, summary, image_url
- author_id, region_id, category
- published (BOOLEAN)
```

### 2. Bolão do Mundial (`/bolao`)

**Sistema de previsões** com competição entre utilizadores:

#### Funcionalidades:
- ✅ Fazer previsões de placar para cada jogo
- ✅ Visualizar resultados e pontos conquistados
- ✅ Participar em ligas regionais
- ✅ Competir com amigos

#### Lógica de Pontos:
```
- Previsão correta (placar exato): 25 pontos
- Vencedor correto (sem placar exato): 10 pontos
- Participação: 5 pontos
```

#### Tabelas Relacionadas:
```sql
world_cup_predictions
- id, user_id, match_id, region_id
- predicted_team_a_goals, predicted_team_b_goals
- predicted_winner_id, points

prediction_leagues
- id, name, description, region_id
- league_type (public, private, invite_only)
- created_by, max_participants

league_participants
- id, league_id, user_id
- points, rank, joined_at
```

### 3. Fantasy Football (`/fantasy`)

**Monta tua equipa** com jogadores do Mundial:

#### Funcionalidades:
- ✅ Criar múltiplos times
- ✅ Selecionar 11 jogadores (1 GR, 4 DF, 4 MC, 2 AT)
- ✅ Ganhar pontos com desempenho real dos jogadores
- ✅ Competir em ligas públicas ou privadas

#### Tabelas Relacionadas:
```sql
fantasy_teams
- id, user_id, region_id
- team_name, description
- league_type (public, private)
- points, created_at

fantasy_team_players
- id, fantasy_team_id
- player_name, player_position
- world_cup_team_id, points
```

### 4. Fórum do Mundial (`/forum-mundial`)

**Comunidade de discussão** temática por região:

#### Categorias:
- 💬 **Geral**: Conversas gerais sobre o Mundial
- ⚽ **Discussão de Jogos**: Análise de partidas
- 👤 **Análise de Jogadores**: Perfis e desempenho
- 🎯 **Estratégia de Times**: Tática e formações
- 🎉 **Off-Topic**: Outros assuntos

#### Funcionalidades:
- ✅ Criar tópicos em categorias
- ✅ Responder a tópicos
- ✅ Dar "likes" em posts
- ✅ Fixar tópicos importantes (Admin)
- ✅ Bloquear tópicos (Admin)

#### Tabelas Relacionadas:
```sql
forum_topics
- id, title, description, region_id
- category, created_by
- pinned, locked, created_at

forum_posts
- id, topic_id, user_id
- content, likes, created_at
```

---

## 🎮 Sistema de Pontos de Engajamento

### Conceito
Utilizadores ganham **Pontos de Engajamento (Luck Points)** por ações na plataforma, que podem ser usados para:
- Participar em sorteios exclusivos
- Desbloquear prêmios especiais
- Competir em rankings

### Formas de Ganhar Pontos

| Ação | Pontos | Descrição |
|------|--------|-----------|
| 🎰 Participação em Sorteio | +10 | Comprar ingresso em sorteio |
| 🎯 Fazer Previsão | +5 | Fazer previsão no bolão |
| ✅ Previsão Correta | +25 | Acertar placar exato |
| 👥 Convidar Amigo | +50 | Amigo se registra via link |
| 📱 Compartilhar Social | +15 | Compartilhar em redes sociais |
| 🏆 Entrada em Concurso | +20 | Participar em concurso |
| 📅 Login Diário | +2 | Fazer login todos os dias |
| ⭐ Conquista | +100 | Desbloquear conquista especial |

### Tabelas Relacionadas

```sql
engagement_points
- id, user_id, region_id
- points (saldo atual)
- total_lifetime_points (histórico)
- updated_at

engagement_points_log
- id, user_id, region_id
- points_change, reason
- related_id (ID do sorteio, previsão, etc)
- created_at
```

### Leaderboard (`/pontos`)

**Ranking global** de pontos:
- Top 100 utilizadores por pontos
- Posição do utilizador
- Histórico de como ganhou pontos
- Guia de pontos para novas ações

---

## 👨‍💼 Painéis Administrativos

### 1. Super Admin Dashboard (`/admin/super-dashboard`)

**Painel global** para você (criador da plataforma):

#### Funcionalidades:
- ✅ Criar novas regiões
- ✅ Atribuir CEOs Regionais
- ✅ Ver estatísticas globais
- ✅ Gerenciar comissões
- ✅ Visualizar logs de auditoria

#### Estatísticas Globais:
- Total de regiões ativas
- Total de admins regionais
- Total de sorteios criados
- Receita global

#### Ações:
```
1. Criar Região
   - Código (BR, US, PT)
   - Nome (Brasil, Estados Unidos)
   - Moeda (BRL, USD, EUR)

2. Atribuir Admin Regional
   - Email do utilizador
   - País/Região
   - Permissões automáticas

3. Gerenciar Comissões
   - Definir % de comissão por região
   - Visualizar pagamentos pendentes
```

### 2. CEO Regional Dashboard (`/admin/regional-dashboard`)

**Painel regional** para cada CEO:

#### Funcionalidades:
- ✅ Ver sorteios da região
- ✅ Monitorar participantes
- ✅ Visualizar receita regional
- ✅ Gerenciar usuários
- ✅ Editar configurações regionais

#### Estatísticas Regionais:
- Sorteios totais
- Sorteios ativos
- Participantes
- Receita
- Pagamentos pendentes

### 3. Branding Regional (`/admin/regional-branding`)

**Personalização visual e linguística** por região:

#### Funcionalidades:
- ✅ Editar cores (primária, secundária, accent)
- ✅ Upload de logo e banner
- ✅ Definir idioma padrão
- ✅ Adicionar tagline/slogan
- ✅ Gerenciar traduções

#### Traduções:
```
Exemplo: hero.welcome_message
- EN: "Welcome to the best raffles!"
- PT-BR: "Bem-vindo aos melhores sorteios!"
- ES: "¡Bienvenido a los mejores sorteos!"
```

---

## 🔗 Rotas e Endpoints

### Públicas (Sem Autenticação)
```
GET  /mundial              - Central do Mundial
GET  /mundial/matches      - Calendário de jogos
GET  /mundial/teams        - Equipes
GET  /mundial/news         - Notícias
GET  /forum-mundial        - Fórum (leitura)
```

### Autenticadas (Utilizadores)
```
GET  /bolao                - Bolão do Mundial
POST /bolao/predictions    - Fazer previsão
GET  /fantasy              - Fantasy Football
POST /fantasy/teams        - Criar time
POST /fantasy/teams/:id/players - Adicionar jogador
GET  /pontos               - Leaderboard de pontos
GET  /pontos/breakdown     - Histórico de pontos
POST /forum-mundial/topics - Criar tópico
POST /forum-mundial/posts  - Responder tópico
```

### Admin Regional
```
GET  /admin/regional-dashboard    - Dashboard regional
GET  /admin/regional-branding     - Editar branding
POST /admin/regional-branding     - Salvar branding
GET  /admin/regional-branding/translations - Traduções
POST /admin/regional-branding/translations - Adicionar tradução
```

### Super Admin
```
GET  /admin/super-dashboard       - Dashboard global
POST /admin/super-dashboard/regions - Criar região
POST /admin/super-dashboard/admins  - Atribuir admin
GET  /admin/super-dashboard/stats   - Estatísticas globais
```

---

## 🗄️ Migrações Supabase

### Arquivo: `20260612_world_cup_and_engagement.sql`

Contém todas as tabelas necessárias:
1. `world_cup_teams`
2. `world_cup_matches`
3. `world_cup_predictions`
4. `fantasy_teams`
5. `fantasy_team_players`
6. `world_cup_news`
7. `engagement_points`
8. `engagement_points_log`
9. `prediction_leagues`
10. `league_participants`
11. `forum_topics`
12. `forum_posts`

**Para aplicar:**
```bash
supabase migration up
```

---

## 🔐 Segurança e Permissões

### Hierarquia de Acesso

```
Super Admin (Você)
├── Acesso total a tudo
├── Criar/editar regiões
├── Atribuir CEOs regionais
└── Ver estatísticas globais

CEO Regional
├── Acesso apenas à sua região
├── Gerenciar sorteios
├── Gerenciar usuários
├── Editar branding/idiomas
└── Ver estatísticas regionais

Utilizador Final
├── Participar em sorteios
├── Fazer previsões
├── Criar times de fantasy
├── Participar em fórum
└── Ver ranking de pontos
```

### Políticas RLS

Todas as tabelas têm RLS ativado:
- **Leitura**: Qualquer um pode ler dados públicos
- **Inserção**: Apenas autenticados podem criar
- **Atualização**: Apenas proprietários/admins podem editar
- **Deleção**: Apenas admins podem deletar

---

## 📱 Componentes React

### Páginas Criadas

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `WorldCupCentral.tsx` | `/mundial` | Central do Mundial |
| `WorldCupPredictions.tsx` | `/bolao` | Bolão do Mundial |
| `FantasyFootball.tsx` | `/fantasy` | Fantasy Football |
| `EngagementLeaderboard.tsx` | `/pontos` | Ranking de Pontos |
| `WorldCupForum.tsx` | `/forum-mundial` | Fórum de Discussão |
| `AdminRegionalDashboard.tsx` | `/admin/regional-dashboard` | Dashboard Regional |
| `AdminSuperDashboard.tsx` | `/admin/super-dashboard` | Dashboard Super Admin |

### Contextos Utilizados

- `AuthContext`: Autenticação do utilizador
- `RegionalThemeContext`: Temas dinâmicos por região
- `LanguageContext`: Idioma selecionado
- `CurrencyContext`: Moeda da região

---

## 🚀 Próximos Passos

### Implementações Futuras
1. **Notificações em Tempo Real**: WebSocket para atualizações ao vivo
2. **Integração com Blockchain**: Verificação de transparência
3. **API Pública**: Para integrações de terceiros
4. **Mobile App**: Aplicativo nativo iOS/Android
5. **Streaming de Jogos**: Integração com plataformas de streaming
6. **Análise de IA**: Previsões automáticas baseadas em IA

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulta a documentação Supabase
2. Verifica os logs de erro no console
3. Contacta o time de desenvolvimento

---

**Versão**: 1.0  
**Última Atualização**: Junho 2026  
**Status**: Produção ✅
