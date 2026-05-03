path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'

with open(path, 'rb') as f:
    data = f.read()

lines = data.split(b'\n')
line = lines[241]
print('Raw bytes:', line)
print('Hex:', line.hex())
print('Length:', len(line))

# Find all ] occurrences
for i, b in enumerate(line):
    if b == ord(']'):
        print(f'  ] at position {i}, context: {line[max(0,i-5):i+10]}')
