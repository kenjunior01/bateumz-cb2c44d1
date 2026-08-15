import re

with open('src/pages/LiveHub.tsx', 'r') as f:
    c = f.read()

# Fix typo first
c = c.replace('import("@/components/livegames/TypingRager")', 'import("@/components/livegames/TypingRacer")')

# Check if already done
if 'campaignrpg' in c:
    print('Already registered, skipping')
else:
    print('Applying edits...')

# 1. Add lazy import (already done above, verify)
if 'CampaignRPGGame' not in c:
    c = c.replace(
        'const TypingRacer = lazy(() => import("@/components/livegames/TypingRacer"));',
        'const TypingRacer = lazy(() => import("@/components/livegames/TypingRacer"));\nconst CampaignRPGGame = lazy(() => import("@/components/livegames/CampaignRPGGame"));'
    )

# 2. Add to GameId type
if '"campaignrpg"' not in c:
    c = c.replace('| "typingracer";', '| "typingracer" | "campaignrpg";')

# 3. Add GAME_DEFS entry
if 'id: "campaignrpg"' not in c:
    # Find the line with typingracer in GAME_DEFS and add after it
    lines = c.split('\n')
    for i, line in enumerate(lines):
        if 'id: "typingracer"' in line and 'GAME_DEFS' not in line:
            lines.insert(i + 1, '  { id: "campaignrpg", icon: Swords, emoji: "\u2694\uFE0F", grad: "from-yellow-600 to-red-700" },')
            break
    c = '\n'.join(lines)

# 4. Add render switch before </Suspense>
if 'active === "campaignrpg"' not in c:
    render_block = '''              {active === "campaignrpg" && (
                <motion.div key="campaignrpg" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <GameErrorBoundary gameName="Campanha RPG">
                  <CampaignRPGGame onScore={recordScore("Campanha RPG")} liveCode={liveCode} />
                  </GameErrorBoundary>
                </motion.div>              )}
'''
    c = c.replace('              </Suspense>', render_block + '              </Suspense>')

with open('src/pages/LiveHub.tsx', 'w') as f:
    f.write(c)

print('All edits applied!')
