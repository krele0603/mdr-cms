-- Migration: fix missing ON DELETE CASCADE for project deletion
-- Tables created after init.sql that reference projects(id) without CASCADE

-- tf_revisions
ALTER TABLE tf_revisions
  DROP CONSTRAINT IF EXISTS tf_revisions_project_id_fkey,
  ADD CONSTRAINT tf_revisions_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- tf_revision_documents (references tf_revisions, which cascades from projects)
ALTER TABLE tf_revision_documents
  DROP CONSTRAINT IF EXISTS tf_revision_documents_revision_id_fkey,
  ADD CONSTRAINT tf_revision_documents_revision_id_fkey
    FOREIGN KEY (revision_id) REFERENCES tf_revisions(id) ON DELETE CASCADE;

-- document_history (references project_documents, which already cascades)
ALTER TABLE document_history
  DROP CONSTRAINT IF EXISTS document_history_document_id_fkey,
  ADD CONSTRAINT document_history_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES project_documents(id) ON DELETE CASCADE;

-- project_files
ALTER TABLE project_files
  DROP CONSTRAINT IF EXISTS project_files_project_id_fkey,
  ADD CONSTRAINT project_files_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- eqms_approvals (if referencing project docs)
ALTER TABLE eqms_approvals
  DROP CONSTRAINT IF EXISTS eqms_approvals_document_id_fkey,
  ADD CONSTRAINT eqms_approvals_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES eqms_documents(id) ON DELETE CASCADE;

-- audit_log: no FK needed (stores entity_id as text, not constrained)
