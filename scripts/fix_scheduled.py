FILE = '/home/z/my-project/bateumz-cb2c44d1/src/lib/scheduledLives.ts'

with open(FILE, 'rb') as f:
    content = f.read()

# 1. Add template_id to the type
old_type = b'  slug: string;\n};'
new_type = b'  slug: string;\n  template_id: string | null;\n};'

if old_type in content:
    content = content.replace(old_type, new_type, 1)
    print('OK: added template_id to type')
else:
    print('FAIL: type not found')

# 2. Add template_id to createScheduledLive input
old_input = b'  ends_at?: string;\n}): Promise<ScheduledLive>'
new_input = b'  ends_at?: string;\n  template_id?: string;\n}): Promise<ScheduledLive>'

if old_input in content:
    content = content.replace(old_input, new_input)
    print('OK: added template_id to input')
else:
    print('FAIL: input not found')

# 3. Add template_id to the insert
old_insert = b'ends_at: input.ends_at || null,\n      status: "scheduled",'
new_insert = b'ends_at: input.ends_at || null,\n      template_id: input.template_id || null,\n      status: "scheduled",'

if old_insert in content:
    content = content.replace(old_insert, new_insert)
    print('OK: added template_id to insert')
else:
    print('FAIL: insert not found')

with open(FILE, 'wb') as f:
    f.write(content)

print('Done')
