-- Multiple examples per template
CREATE TABLE IF NOT EXISTS template_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS template_examples_template_id_idx ON template_examples(template_id);

-- Examples assigned to a project record (consultant picks which ones client sees)
CREATE TABLE IF NOT EXISTS project_document_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  template_example_id UUID NOT NULL REFERENCES template_examples(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_document_id, template_example_id)
);

CREATE INDEX IF NOT EXISTS pde_document_idx ON project_document_examples(project_document_id);
