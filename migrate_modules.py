import subprocess

# 1. Add modules column to DB
sql = """
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '{"tfbuilder": true, "eqms": true}'::jsonb;
"""

result = subprocess.run(
    ['sudo', 'docker', 'exec', '-i', 'mdr_postgres', 'psql', '-U', 'mdrcms', '-d', 'mdrcms'],
    input=sql, capture_output=True, text=True
)
print("DB:", result.stdout.strip(), result.stderr.strip())
