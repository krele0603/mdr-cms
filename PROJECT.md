# EasyQMS — Project State

## Stack
- Next.js 14 (App Router, TypeScript), PostgreSQL 16, Redis, Hocuspocus, TipTap
- Docker, Cloudflare Tunnel, Raspberry Pi 5
- Repo: https://github.com/krele0603/mdr-cms.git (branch: main)
- Domain: mdr.easymedconsulting.com
- Deploy: `~/stacks/mdr-cms/` — `sudo docker-compose build web && sudo docker-compose up -d`

## DB Tables
users, companies, company_members, company_variables
projects, project_members, project_documents, project_variables, project_files
eqms_folders, eqms_documents, eqms_document_versions, eqms_approvals
eqms_records, eqms_record_versions, eqms_files
qms_templates, audit_log
tf_revisions, tf_revision_documents, sted_template
document_lists, list_documents, templates, template_versions
structured_templates, structured_template_questions

### Key columns added
- project_documents: is_sted BOOL, approved_content JSONB
- tf_revisions: id, project_id, version, version_x/y/z, sted_document_id, approved_by, notes
- tf_revision_documents: revision_id, document_id, content_snapshot, annex, etc.
- sted_template: single-row table, content JSONB

## Build Quirks
- query() returns any[] directly, not { rows: [] }
- Long code changes via Python patch scripts (escaping issues with ! and $ in heredoc)
- ON CONFLICT DO NOTHING needs a unique constraint first
- useSearchParams() needs Suspense — avoid, use auto-detection instead
- Interface named 'Record' conflicts with TS built-in — use EqmsRecord
- Map.entries()/keys() needs Array.from() wrapper (tsconfig target)
- Function declarations inside blocks not allowed — use const arrow functions
- mammoth not available directly in container — use dynamic import() in API routes
- docker-compose build --no-cache when changes don't take effect
- After build: sudo docker-compose up -d --force-recreate web if needed
- Python patches: always print repr() of content slice if string not found
- nginx config test "host not found" for upstream is normal/expected
- Cloudflare tunnel points to nginx:80 (not localhost:3000)
- Redis password has special chars — never parse REDIS_URL with new URL(), use REDIS_PASSWORD env var directly
- File uploads in named Docker volume 'uploads_data' at /data/uploads
- All UUID params need ::uuid cast in postgres queries
- No subqueries with repeated $1 params — use literal 0 for position

## Environment (.env)
POSTGRES_PASSWORD, REDIS_PASSWORD, NEXTAUTH_SECRET, CLOUDFLARE_TUNNEL_TOKEN, DOMAIN

## Security
- Headers: CSP, HSTS, COOP, CORP, Permissions-Policy (nginx + next.config.js)
- Rate limiting: login 5/min, API 60/min, uploads 10/min
- Session: httpOnly, secure, sameSite:lax, 8h expiry, jti set
- Redis password protected
- no-new-privileges + resource limits on all containers

## What's Built
### TFBuilder
Auth, users, roles, projects, document lists, templates, TipTap editor,
DOCX export, FMEA, requirements, traceability, structured templates,
file uploads, company/project variables, TF Template Library with STED tab

### eQMS
Companies, members, folder tree (L1-5), documents (L1-4) with full editor,
submit/approve/revise flow, version history, company variables,
L5 records, file uploads, QMS document list with tabs/filters/Excel export,
QMS template library with DOCX import (preserves alignment + color)

### STED + TF Lifecycle
- STED template singleton editor at /dashboard/templates/sted
- STED pinned above annexes in every project detail page
- STED included in all 3 TF structures (HW only, SW only, HW+SW)
- "Approve TF" button with X.Y.Z version picker modal
- Hard block if any annex docs not approved
- tf_revision record + document snapshot created on approval
- Project header shows TF status (light green = ready, bright green = approved vX.Y.Z)

### Other
Audit trail, dashboard, module license toggle per company,
nav with EQMS/TFBuilder/Tools sections, notifications, messages

## User Roles
- admin: everything
- consultant: all projects, edit assigned, add clients
- client-MR: eQMS access, can approve STED
- client: assigned documents only

## Admin Credentials
Email: admin@mdrcms.local — password set via bcrypt in postgres

## Todo (v1)
- [ ] PDF export (TFBuilder)
- [ ] TF lock + versioning UI (soft lock, "Start new revision", revision history)
- [ ] Annex-by-annex zip export (approved docs only)
- [ ] eQMS DOCX/PDF export
- [ ] Dashboard fix — project status filters (active/under review/approved useless currently)
- [ ] Dashboard eQMS stats wired to real data
- [ ] Search across documents
- [ ] UI polish pass
- [ ] User documentation
- [ ] Editor consolidation (4 TipTap implementations → 1 shared)
- [ ] DOCX import formatting (table bg + font size need raw XML parsing)
- [ ] QMS/TF template fonts — add Calibri, Roboto, Open Sans, Garamond, Lato
- [ ] Notifications system (in-app, actionable)
- [ ] Hyperlinks in editor (insert/edit URL links in rich text)
- [ ] Cross-document linking (reference another doc, opens read-only)
- [ ] Finalize STED (auto-fill from project data, advanced controls)
- [ ] Calendar (project deadlines, review/approval dates)
- [ ] Kanban/task board (Jira-like — tasks, tickets, assignees, status columns)
- [ ] Task assignment (assign to team members, notifications)

## Future Roadmap
- v2: TF lifecycle — lock, versioning, change requests, annex export
- v3: AI drafting — RAG on certified examples, draft requirements/risks
- v4: AI decision support — MDCG guidance, substantial change assessment
- v5: Regulatory intelligence platform
