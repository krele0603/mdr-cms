-- MDR CMS initial schema
-- This runs once on first postgres startup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template library (global, admin-owned)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tag_code VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template versions
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    example_content JSONB DEFAULT NULL,
    change_note TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document lists (HW, SW, HW+SW, custom)
CREATE TABLE document_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_builtin BOOLEAN DEFAULT FALSE,
    builtin_key VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents within list annexes
CREATE TABLE list_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES document_lists(id) ON DELETE CASCADE,
    annex VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    template_id UUID REFERENCES templates(id),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    description TEXT,
    manufacturer_name VARCHAR(255) NOT NULL,
    manufacturer_country VARCHAR(100),
    manufacturer_contact VARCHAR(255),
    manufacturer_email VARCHAR(255),
    list_id UUID REFERENCES document_lists(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'editor',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project documents (instances created from list_documents + templates)
CREATE TABLE project_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    list_document_id UUID REFERENCES list_documents(id),
    annex VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    template_version_id UUID REFERENCES template_versions(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project variables
CREATE TABLE project_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'undefined',
    suggested_by UUID REFERENCES users(id),
    suggested_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, tag)
);

-- Document comments
CREATE TABLE document_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES document_comments(id),
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    anchor_text TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed builtin lists
INSERT INTO document_lists (name, description, is_builtin, builtin_key) VALUES
    ('Hardware only', 'Pure hardware medical devices', TRUE, 'HW'),
    ('Software only', 'Pure software medical devices (IEC 62304)', TRUE, 'SW'),
    ('Hardware + Software', 'Combined hardware and software devices', TRUE, 'HW+SW');

-- Seed admin user (password: Admin1234! — CHANGE IMMEDIATELY)
-- bcrypt hash of "Admin1234!"
INSERT INTO users (email, name, password_hash, role) VALUES
    ('admin@mdrcms.local', 'Admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUFQcbN5SB3MxEWPH8ZQ4UGMG', 'admin');
