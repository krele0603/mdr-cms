import subprocess

sql = """
CREATE TABLE IF NOT EXISTS eqms_files (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  folder_id     uuid NOT NULL REFERENCES eqms_folders(id) ON DELETE CASCADE,
  record_id     uuid REFERENCES eqms_records(id) ON DELETE CASCADE,
  uploaded_by   uuid REFERENCES users(id),
  original_name varchar(255) NOT NULL,
  stored_name   varchar(255) NOT NULL,
  file_size     bigint NOT NULL,
  mime_type     varchar(100),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eqms_files_folder ON eqms_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_eqms_files_record ON eqms_files(record_id);
CREATE INDEX IF NOT EXISTS idx_eqms_files_company ON eqms_files(company_id);
"""

result = subprocess.run(
    ['sudo', 'docker', 'exec', '-i', 'mdr_postgres', 'psql', '-U', 'mdrcms', '-d', 'mdrcms'],
    input=sql, capture_output=True, text=True
)
print("DB:", result.stdout.strip())
if result.stderr.strip():
    print("ERR:", result.stderr.strip())
