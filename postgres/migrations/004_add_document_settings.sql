-- Add header/footer configuration to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS header_logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS footer_show_version BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS footer_show_date BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS footer_show_page_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS footer_confidentiality TEXT DEFAULT 'Confidential';

-- Global document settings table
CREATE TABLE IF NOT EXISTS document_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO document_settings (key, value) VALUES
  ('footer_confidentiality', 'Confidential'),
  ('footer_show_version', 'true'),
  ('footer_show_date', 'true'),
  ('footer_show_page_numbers', 'true')
ON CONFLICT (key) DO NOTHING;
