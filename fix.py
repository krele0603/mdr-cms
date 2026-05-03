import re

path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'

with open(path, 'rb') as f:
    data = f.read()

fixed = re.sub(rb'\[([a-z]+\.[a-z]+)\]\(https?://[^)]+\)', rb'\1', data)

print('Changes:', len(data) - len(fixed))
print('Line 242:', fixed.split(b'\n')[241])

with open(path, 'wb') as f:
    f.write(fixed)

print('Done')
