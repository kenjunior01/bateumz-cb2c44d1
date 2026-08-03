import re, sys

FILE = '/home/z/my-project/bateumz-cb2c44d1/src/pages/dashboard/CompanyLiveManager.tsx'

with open(FILE, 'rb') as f:
    content = f.read()

# 1. Fix ChallengeCreator integration
old_cc = b'<ChallengeCreator liveCode={undefined} />'
new_cc = (b'<ChallengeCreator\n'
           b'                liveCode={undefined}\n'
           b'                externalChallenges={current?.challenges || []}\n'
           b'                onChallengesChange={(chs) => { if (current) updateTemplateFieldDirect(\'challenges\', chs); }}\n'
           b'              />')

if old_cc in content:
    content = content.replace(old_cc, new_cc)
    print('OK: fixed ChallengeCreator integration')
else:
    print('FAIL: ChallengeCreator not found')

# 2. Add updateTemplateFieldDirect
old_utf = b'  const updateTemplateField = (field: string, value: string) => {\n    if (!current) return;\n    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, [field]: value } : t)));\n  };'

new_utf = (b'  const updateTemplateField = (field: string, value: string) => {\n'
           b'    if (!current) return;\n'
           b'    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, [field]: value } : t)));\n'
           b'  };\n'
           b'\n'
           b'  const updateTemplateFieldDirect = (field: string, value: any) => {\n'
           b'    if (!current) return;\n'
           b'    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, [field]: value } : t)));\n'
           b'  };')

if old_utf in content:
    content = content.replace(old_utf, new_utf)
    print('OK: added updateTemplateFieldDirect')
else:
    print('FAIL: updateTemplateField not found')

# 3. Add import for useNavigate
if b'useNavigate' not in content and b'react-router-dom' not in content:
    old_import = b"import { useAuth } from '@/contexts/AuthContext';"
    new_import = b"import { useAuth } from '@/contexts/AuthContext';\nimport { useNavigate } from 'react-router-dom';"
    content = content.replace(old_import, new_import)
    print('OK: added useNavigate import')
elif b'useNavigate' not in content:
    old_import = b"from 'react-router-dom';"
    if old_import in content:
        pass  # already imported somewhere
    old_import2 = b"import { useAuth } from '@/contexts/AuthContext';"
    new_import2 = b"import { useAuth } from '@/contexts/AuthContext';\nimport { useNavigate } from 'react-router-dom';"
    if old_import2 in content and b'useNavigate' not in content:
        content = content.replace(old_import2, new_import2)
        print('OK: added useNavigate import')
    else:
        print('SKIP: useNavigate already present or no target')
else:
    print('SKIP: useNavigate already present')

with open(FILE, 'wb') as f:
    f.write(content)

print('Done')
