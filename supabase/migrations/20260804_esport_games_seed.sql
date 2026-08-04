-- =============================================================
-- SEED DATA: Popular eSports Games
-- These are the games users can create championships for
-- =============================================================

INSERT INTO esport_games (name, slug, icon_url, cover_url, developer, publisher, genre, platform, is_active, is_featured, max_team_size, has_solo, has_duo, has_squad, default_scoring, verification_methods, region_servers, rules_template, sort_order) VALUES
('Free Fire', 'free-fire', NULL, NULL, 'Garena', 'Garena', 'Battle Royale', 'mobile', true, true, 4, true, true, true, 'placement_points', '{"screenshot","stream"}', '{"br","na","eu","asia","latam"}', 'Cada equipa joga até 4 jogadores. O objetivo é ser a última equipa viva. Os pontos são baseados na colocação final e kills. Cada ronda é jogada num mapa diferente do pool de mapas.', 1),

('Call of Duty Mobile', 'codm', NULL, NULL, 'Activision', 'Activision', 'FPS', 'mobile', true, true, 5, true, true, false, 'score_based', '{"screenshot","replay"}', '{"br","na","eu","asia"}', 'Formato 5v5 em modo Search & Destroy ou Domination. Melhor de 3 mapas. Cada mapa é escolhido por banimento alternado.', 2),

('PUBG Mobile', 'pubgm', NULL, NULL, 'Krafton', 'Tencent', 'Battle Royale', 'mobile', true, true, 4, true, true, true, 'placement_points', '{"screenshot","stream"}', '{"br","na","eu","asia"}', 'Battle Royale com 100 jogadores. Equipas de 4. Sistema de pontos por colocação e kills. Erangel, Miramar, Sanhok, Vikendi.', 3),

('Valorant', 'valorant', NULL, NULL, 'Riot Games', 'Riot Games', 'FPS', 'pc', true, true, 5, false, false, false, 'score_based', '{"replay","stream"}', '{"br","na","eu","latam"}', 'Formato 5v5 competitivo. Modos: Spike Rush, Competitive. Melhor de 13 ou 24 rondas. Mapas: Ascent, Bind, Haven, Icebox, etc.', 4),

('League of Legends', 'league', NULL, NULL, 'Riot Games', 'Riot Games', 'MOBA', 'pc', true, true, 5, false, false, false, 'score_based', '{"replay","stream"}', '{"br","na","eu","latam"}', 'Formato 5v5 Summoner\'s Rift. Melhor de 3 ou 5. Banimento de campeões por fases. Draft pick.', 5),

('Fortnite', 'fortnite', NULL, NULL, 'Epic Games', 'Epic Games', 'Battle Royale', 'crossplay', true, true, 4, true, true, true, 'placement_points', '{"screenshot","stream"}', '{"na","eu","br","asia"}', 'Battle Royale crossplay. Equipas de 4. Construção e combate. Pontuação por colocação e eliminações.', 6),

('Counter-Strike 2', 'cs2', NULL, NULL, 'Valve', 'Valve', 'FPS', 'pc', true, true, 5, false, false, false, 'score_based', '{"replay","stream"}', '{"br","na","eu"}', 'Formato 5v5. Modo Competitive. Melhor de 30 rondas (MR15). Mapas: Dust2, Mirage, Inferno, Nuke, Overpass, Ancient, Anubis.', 7),

('Mobile Legends: Bang Bang', 'mlbb', NULL, NULL, 'Moonton', 'Moonton', 'MOBA', 'mobile', true, true, 5, true, false, false, 'score_based', '{"screenshot","replay"}', '{"br","asia"}', 'Formato 5v5. Draft pick de heróis. Melhor de 3 ou 5 jogos. Banimento por fases.', 8),

('Apex Legends Mobile', 'apex', NULL, NULL, 'Respawn', 'EA', 'Battle Royale', 'mobile', true, false, 3, true, true, false, 'placement_points', '{"screenshot","stream"}', '{"na","eu","br"}', 'Battle Royale com 60 jogadores. Equipas de 3 (trios). Legends com habilidades únicas. Sistema de pontos por colocação e kills.', 9),

('Wild Rift', 'wild_rift', NULL, NULL, 'Riot Games', 'Riot Games', 'MOBA', 'mobile', true, true, 5, false, false, false, 'score_based', '{"replay","stream"}', '{"br","na","eu","asia"}', 'Versão mobile de League of Legends. Formato 5v5. Draft pick. Melhor de 3 ou 5.', 10),

('Clash Royale', 'clash_royale', NULL, NULL, 'Supercell', 'Supercell', 'Strategy', 'mobile', true, false, 1, true, false, false, 'score_based', '{"screenshot","replay"}', '{"br","na","eu","asia","latam"}', 'Duelo 1v1. Melhor de 3. Cada jogador usa 8 cartas. 3 minutos por duelo + tempo extra se empate.', 11),

('EA Sports FC', 'fifa', NULL, NULL, 'EA', 'EA', 'Sports', 'console', true, false, 1, true, false, false, 'score_based', '{"screenshot","replay"}', '{"eu","na","br"}', 'Partidas 1v1 Ultimate Team. Melhor de 2. 6 minutos por partida. Divisões e ranking por pontos.', 12),

('Rocket League', 'rocket_league', NULL, NULL, 'Psyonix', 'Epic Games', 'Sports', 'crossplay', true, true, 3, false, true, false, 'score_based', '{"replay","stream"}', '{"na","eu"}', 'Futebol com carros. Equipas de 3 (3v3). Melhor de 5. Mapas: DFH Stadium, Mannfield, etc.', 13),

('Dota 2', 'dota2', NULL, NULL, 'Valve', 'Valve', 'MOBA', 'pc', true, true, 5, false, false, false, 'score_based', '{"replay","stream"}', '{"br","na","eu","sea"}', 'Formato 5v5. Captain\'s Mode draft. Melhor de 3 ou 5. Banimento por fases.', 14)
ON CONFLICT (slug) DO NOTHING;
