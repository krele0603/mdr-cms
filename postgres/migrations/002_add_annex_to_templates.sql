-- Add annex column to templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS annex VARCHAR(50) DEFAULT NULL;
