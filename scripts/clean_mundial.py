import re

with open('src/contexts/LanguageContext.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
result = []
for line in lines:
    stripped = line.strip().lower()
    skip = False
    keywords = ['world cup', 'worldcup', 'mundial', 'penalty_shootout', 'penalty shootout', 'football_api', 'api_football']
    for kw in keywords:
        if kw in stripped:
            if stripped.startswith('//') or stripped.startswith('*'):
                skip = True
                break
            if ':' in stripped and ('"' in stripped or "'" in stripped):
                skip = True
                break
    if not skip:
        result.append(line)

with open('src/contexts/LanguageContext.tsx', 'w') as f:
    f.write('\n'.join(result))
print('Cleaned LanguageContext.tsx')
