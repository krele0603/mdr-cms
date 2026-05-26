'use client'
import { useState, useEffect } from 'react'

type Role = 'admin' | 'consultant' | 'client-MR' | 'client'

interface Item {
  title: string
  body: string
}

interface Section {
  icon: string
  title: string
  items: Item[]
}

const HELP: Record<string, { headline: string; subtitle: string; sections: Section[] }> = {

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  admin: {
    headline: 'Admin Guide',
    subtitle: 'Full system access — manage users, companies, templates, TF projects and quality documents.',
    sections: [
      {
        icon: '👥',
        title: 'Users',
        items: [
          { title: 'Creating a user', body: 'Go to Users in the sidebar → click "+ New user". Set the email, name, temporary password and role. The user can log in immediately. Roles available at creation: Admin, Consultant. Client and MR roles are assigned per-company.' },
          { title: 'Assigning roles per company', body: 'Open a Company → Members tab → Add member. Choose the user and set their role: Consultant, Client, or MR (Management Representative). A user can have different roles in different companies.' },
          { title: 'Assigning project access to clients', body: 'In the Company member list, click "Projects" next to a Client or MR. Tick the projects they should see and set View or Edit access for each.' },
          { title: 'Deactivating a user', body: 'On the Users page, use the toggle to deactivate. Deactivated users cannot log in but their data and history are preserved. Use Delete only to permanently remove a user with no history.' },
        ],
      },
      {
        icon: '🏢',
        title: 'Companies',
        items: [
          { title: 'Creating a company', body: 'Companies → "+ New company". Each company gets its own eQMS folder tree and can have multiple TF projects. Add a logo and variables (e.g. $$company_name) used across documents.' },
          { title: 'Company variables', body: 'In the company detail page → Variables tab. Define key-value pairs like $$manufacturer_name, $$address. These are shared across all projects in the company and auto-fill in document templates.' },
          { title: 'Deleting a company', body: 'Company detail page → "Delete company" button (top right). This permanently removes all eQMS documents, TF projects and memberships for that company. Cannot be undone.' },
        ],
      },
      {
        icon: '📐',
        title: 'Templates & TF Structures',
        items: [
          { title: 'Template Library', body: 'Templates → each template is a reusable document with a tag code (e.g. IFU, LABELING). Templates have two versions: a blank template and a filled example. Edit both in the TipTap rich-text editor. Templates are assigned to document slots in TF projects.' },
          { title: 'TF Structures (Document Lists)', body: 'Lists → define which Annexes and documents a TF project requires (e.g. HW Only, SW Only, HW+SW). Three built-in structures are provided. Create custom lists for specific device types. Each entry has a code, name, and annex assignment.' },
          { title: 'STED Template', body: 'Templates → STED tab. The STED is a singleton template — one per system — that serves as the Summary of Technical Documentation. It is pinned above annexes in every project. Edit it here; changes affect all future STED approvals.' },
          { title: 'Structured templates', body: 'Structured templates use a question-and-answer format instead of free text. Useful for checklists and structured assessments. Assign them to document slots like regular templates.' },
        ],
      },
      {
        icon: '📁',
        title: 'TF Projects',
        items: [
          { title: 'Creating a project', body: 'Projects → "+ New project". Select the company, device name, manufacturer info, and TF Structure. The structure auto-generates all required document slots in Draft status.' },
          { title: 'Document workflow', body: 'Each document follows: Draft → In Progress → In Review → Approved. Admin and Consultant can change status freely from the editor toolbar dropdown. Clients submit for review; admin/consultant/MR approves.' },
          { title: 'Approving the TF (TF lifecycle)', body: 'All annex documents must be Approved first. Then open the STED, set it to In Review, and click "✓ Approve TF" in the toolbar. A version picker appears — choose X.Y.Z (e.g. 1.0.0). This locks a snapshot of all documents and creates a TF revision record.' },
          { title: 'Revising after TF approval', body: 'Open any approved document → click "↻ Revise" in the toolbar. Only that document reopens as a new draft (rev.2). The old version is preserved as Superseded. The STED auto-opens as a draft too. Once the revised doc is approved, update the STED and re-approve the TF with a new version (e.g. 1.0.1).' },
          { title: 'Reverting a bad draft', body: 'If a revised draft should be discarded, open it and click "⟲ Revert to approved". The draft is marked Obsolete (content preserved, readable) and the previous approved version is restored.' },
          { title: 'Revision history', body: 'Project header → "Revision history" link (appears after first TF approval). Shows all approved TF versions with dates, approver, notes, and the full document snapshot for each version.' },
          { title: 'Document tracker', body: 'Project detail page → scroll down to the Document Status Tracker. Shows annex-by-annex status with color codes. Useful for a quick overview before a TF approval.' },
          { title: 'FMEA & Risk matrix', body: 'Project → FMEA tab. Define risk criteria, add hazards, score severity and probability. The live Risk Matrix can be inserted into TF documents using the Insert menu in the editor.' },
          { title: 'Requirements & Traceability', body: 'Project → Requirements and Traceability tabs. Link regulatory requirements to design outputs and verification evidence. Export as a standalone document.' },
          { title: 'Deleting a project', body: 'Projects list → three-dot menu → Delete. Permanently removes all documents, revisions and files. Cannot be undone.' },
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        items: [
          { title: 'eQMS structure', body: 'Each company has 5 levels: L1 Policies, L2 Procedures, L3 Work Instructions, L4 Forms & Templates, L5 Records. Documents are organized in folders within each level.' },
          { title: 'Creating documents', body: 'Navigate to a level → open or create a folder → click "+ New document". Documents start as Draft. Use the rich-text editor with font controls, tables, images and table of contents.' },
          { title: 'Approval workflow', body: 'Draft → submit for approval → Approved (Active). Once active, the document is read-only for clients. To update: click "↻ New revision" — this creates a new draft while the approved version stays active.' },
          { title: 'QMS Templates', body: 'QMS Templates (sidebar) provides pre-built document templates for common QMS documents. Apply a template when creating a new eQMS document to pre-fill structure and content.' },
          { title: 'Records (L5)', body: 'L5 Records are filled instances of L4 forms. Create from the Records tab, link to the parent form, and fill in the record data. Records follow the same approval workflow.' },
          { title: 'Document list view', body: 'Companies → eQMS → Document list. Shows Active and Draft versions side by side for all documents in the company. Filter by level, status or search by name.' },
        ],
      },
      {
        icon: '🔍',
        title: 'Audit Trail',
        items: [
          { title: 'Viewing the audit trail', body: 'Sidebar → Audit Trail. Every significant action (login, document approval, TF revision, status change, user creation) is logged with timestamp, user and entity. Use filters to narrow by action type or date range.' },
        ],
      },
    ],
  },

  // ─── CONSULTANT ───────────────────────────────────────────────────────────
  consultant: {
    headline: 'Consultant Guide',
    subtitle: 'Manage TF projects and eQMS documents for your assigned client companies.',
    sections: [
      {
        icon: '🏢',
        title: 'Your Companies',
        items: [
          { title: 'Switching companies', body: 'If you are assigned to multiple companies, a dropdown appears at the top of the sidebar. Click it to switch. Your selection is remembered as you navigate between projects and eQMS levels.' },
          { title: 'What you can see', body: 'You see all TF projects and eQMS documents for every company you belong to. Clients only see what they are explicitly assigned to — you see everything.' },
        ],
      },
      {
        icon: '📁',
        title: 'TF Projects',
        items: [
          { title: 'Opening a project', body: 'Projects list or sidebar → click any project. The project detail shows Annexes on the left, documents on the right, and the STED pinned above. The badge in the header shows TF status.' },
          { title: 'Document status', body: 'Each document row shows its current status (Draft, In progress, In review, Approved) and revision number. When a document has both an approved and a draft version, both appear in the row — use "Approved" or "Edit" buttons to open either.' },
          { title: 'Editing documents', body: 'Open a document → edit in the TipTap editor. Use the toolbar for formatting, variables ($$tags), table insertion, and the reference panel (Show example) to view the filled example alongside the template.' },
          { title: 'Approving documents', body: 'Documents in "In Review" status show an "✓ Approve" button in the editor toolbar. You can also request changes with a reason note — this sends the document back to the client.' },
          { title: 'TF approval', body: 'Once all annex documents are approved, open the STED, set it to In Review, and click "✓ Approve TF". Pick the version number (X.Y.Z). The TF snapshot is created and the project is locked at that version.' },
          { title: 'Revising documents', body: 'On any approved document, click "↻ Revise" to reopen it as a new draft. The STED auto-opens as a draft too. Other approved documents stay locked. Once the revision is re-approved, update the STED and issue a new TF version.' },
          { title: 'Reverting a draft', body: 'If a draft revision should be abandoned, open it and click "⟲ Revert to approved". The draft is marked Obsolete and the previous approved version is restored.' },
          { title: 'Revision pill', body: 'The "rev.X of Y" pill in the document toolbar shows which revision you are on and how many exist. Click it for a dropdown listing all revisions with status badges — click any to navigate directly.' },
          { title: 'TF revision history', body: 'Project header → "Revision history" link. Shows all approved TF versions with document snapshots.' },
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        items: [
          { title: 'Navigating levels', body: 'Sidebar → company eQMS section → L1 through L4 (Policies, Procedures, Work Instructions, Forms & Templates). Records are in L5. Click any level to open the folder tree.' },
          { title: 'Creating and editing', body: 'Open a folder → "+ New document". Edit in the rich-text editor. Submit for approval when ready. Once approved, use "↻ New revision" to update.' },
          { title: 'Approving eQMS documents', body: 'Documents submitted for approval appear with a Pending badge. Open the document → "✓ Approve" to activate, or "Reject" to send back with a note.' },
          { title: 'Document list', body: 'Companies → eQMS → Document list. Filter by level or status. Active and Draft columns make it easy to see what needs attention.' },
        ],
      },
      {
        icon: '✅',
        title: 'Approvals & Review',
        items: [
          { title: 'What needs your attention', body: 'Check the Dashboard for pending items. Documents in "In Review" status across all your projects need approval or a change request. STED documents in review are ready for TF approval.' },
          { title: 'Requesting changes', body: 'On any document in review, click "Request changes" and enter a reason. This returns the document to Draft and notifies the client. The reason is stored in document history.' },
          { title: 'Document history', body: 'In any document, open the Comments panel → History tab. Shows all status changes, approvals, revisions and requests with timestamps and user names.' },
        ],
      },
    ],
  },

  // ─── CLIENT-MR ────────────────────────────────────────────────────────────
  'client-MR': {
    headline: 'Management Representative Guide',
    subtitle: 'Approve quality documents and technical files on behalf of your company.',
    sections: [
      {
        icon: '🧭',
        title: 'Your Workspace',
        items: [
          { title: 'Sidebar navigation', body: 'The sidebar shows your company\'s eQMS levels (L1–L5) and your assigned TF projects. If you belong to multiple companies, use the company dropdown at the top of the sidebar to switch.' },
          { title: 'Your role vs. Client', body: 'As MR you have the same access as a Client plus approval rights — you can approve both eQMS documents and TF documents, revise approved documents, and approve TF versions.' },
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        items: [
          { title: 'Document levels', body: 'L1 Policies, L2 Procedures, L3 Work Instructions, L4 Forms & Templates, L5 Records. Each level has a folder tree. Click any folder to see its documents.' },
          { title: 'Viewing documents', body: 'The document list shows two columns: Active (current approved version) on the left and Draft/Pending on the right. Green = Active, grey = Draft, amber = Pending approval.' },
          { title: 'Approving eQMS documents', body: 'Documents submitted for your approval show a Pending badge. Open the document → click "✓ Approve" to make it Active, or "Reject" to return it with a note.' },
          { title: 'Creating new revisions', body: 'On any Active document, click "↻ New revision" to create a new Draft. The Active version stays in use until the new revision is approved.' },
        ],
      },
      {
        icon: '📁',
        title: 'TF Projects',
        items: [
          { title: 'Accessing projects', body: 'Your assigned TF projects appear in the sidebar and on the main Dashboard. The project header badge shows TF status: green = approved vX.Y.Z, yellow = revision in progress.' },
          { title: 'Document list in a project', body: 'Each annex shows document rows. If a document has both an approved and a draft version, both appear: an "Approved" outline button and a blue "Edit" button. Click either to open that version.' },
          { title: 'STED', body: 'The STED (Summary of Technical Documentation) is pinned above the annex list. When both approved and draft exist, two buttons appear: "✓ Approved" and "✎ Edit draft". The STED must be approved to issue a new TF version.' },
          { title: 'Approving TF documents', body: 'Documents in "In Review" status show an "✓ Approve" button in the editor toolbar. You can also request changes with a reason.' },
          { title: 'Approving a TF version', body: 'When all annex documents are approved and the STED is in review, click "✓ Approve TF" in the STED toolbar. A version picker appears — enter X.Y.Z (e.g. 1.0.1 for a minor update, 2.0.0 for a major change). This creates a locked snapshot.' },
          { title: 'Revising an approved document', body: 'Open any approved document → "↻ Revise". This opens just that document as a new draft (other approved docs stay locked). The STED also auto-opens as a draft. Once the revision is approved, re-approve the STED and issue a new TF version.' },
          { title: 'Reverting a draft', body: 'If a draft revision should be abandoned, click "⟲ Revert to approved" in the toolbar. The draft is marked Obsolete (still readable) and the approved version is restored.' },
          { title: 'Knowing which revision you\'re on', body: 'The "rev.X of Y · Status" pill in the document toolbar shows the current revision number and status. Click it for a dropdown showing all revisions — click any to navigate to it.' },
          { title: 'TF revision history', body: 'Project header → "Revision history". Shows every approved TF version with the date, approver, notes, and a full document snapshot listing.' },
        ],
      },
      {
        icon: '💬',
        title: 'Communication',
        items: [
          { title: 'Comments on documents', body: 'In the document editor, click "Comments" in the toolbar to open the side panel. Add comments, reply to threads, and resolve them when addressed. You can highlight text in the document and add a comment attached to that selection.' },
          { title: 'Document history', body: 'Comments panel → History tab. Shows all status changes, approvals, revision events and change requests with timestamps.' },
          { title: 'Messages', body: 'Messages button at the bottom of the sidebar. Direct communication with your consultant, organized by project.' },
        ],
      },
    ],
  },

  // ─── CLIENT ───────────────────────────────────────────────────────────────
  client: {
    headline: 'Client Guide',
    subtitle: 'Access your company\'s quality documents and technical file projects.',
    sections: [
      {
        icon: '🧭',
        title: 'Getting Around',
        items: [
          { title: 'Sidebar', body: 'The sidebar on the left is your main navigation. It shows your eQMS levels (Policies, Procedures, Work Instructions, Forms, Records) and your assigned TF projects. If you belong to multiple companies, a dropdown at the top lets you switch.' },
          { title: 'Dashboard', body: 'The home icon (top of sidebar) goes to the Dashboard — a summary of recent activity, pending items and project statuses.' },
          { title: 'Help', body: 'The ? icon at the bottom of the sidebar opens this help page.' },
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        items: [
          { title: 'What is the eQMS?', body: 'Your company\'s Quality Management System, organized in levels: L1 Policies (company-wide rules), L2 Procedures (how processes work), L3 Work Instructions (step-by-step), L4 Forms & Templates (standard forms), L5 Records (completed forms).' },
          { title: 'Document list', body: 'Each level shows documents in two columns: Active (approved, currently in use) on the left, and Draft/Pending (being worked on) on the right. A green dot means Active; grey means Draft; amber means Pending approval.' },
          { title: 'Opening documents', body: '"View" opens a read-only approved document. "Open" opens a draft you can edit.' },
          { title: 'Editing a draft', body: 'Open a draft document — the editor allows full rich-text editing: bold, italic, tables, lists, images. Changes save automatically (look for "✓ Saved" in the toolbar). When done, click "Submit for approval".' },
          { title: 'Submitting for approval', body: 'In the document editor toolbar, click "Submit for approval". Your consultant or MR will review and either approve it (making it Active) or request changes with a note explaining what needs fixing.' },
          { title: 'After approval', body: 'Once approved, a document is Active and read-only. Your consultant will create a new revision if updates are needed later — you\'ll see a new Draft appear next to the Active version.' },
        ],
      },
      {
        icon: '📁',
        title: 'Technical File Projects',
        items: [
          { title: 'What is a TF project?', body: 'A Technical File is the regulatory documentation package for your medical device. It is organized by Annexes (I through X) as required under MDR. Your consultant creates and manages the structure; you contribute content to assigned documents.' },
          { title: 'Opening a project', body: 'Sidebar → click a project name, or go to the Dashboard and click the project. The project page shows the Annexes list on the left and documents on the right.' },
          { title: 'Document rows', body: 'Each document row shows the document name, code, and status badge. If a document has both an approved version and an open draft, two buttons appear: "Approved" (to read the locked version) and "Edit" (to open the working draft).' },
          { title: 'Editing your documents', body: 'You can edit documents that are in Draft or In Progress status and assigned to you. The editor auto-saves. When ready, click "Submit for review" — your consultant or MR will approve or send it back.' },
          { title: 'Read-only approved docs', body: 'Approved documents are locked and read-only. You can read them anytime using the "Open" or "Approved" button. If your consultant reopens one for revision, it will appear as editable again.' },
          { title: 'TF status badge', body: 'The project header shows the TF status. Green "✓ TF v1.0.0" means the Technical File is formally approved at that version. Yellow "revision in progress" means an update is underway.' },
          { title: 'STED', body: 'The Summary of Technical Documentation (STED) is pinned at the top of the project, above the annexes. It summarizes the whole TF. Your consultant manages STED approval — you may be asked to contribute content to the STED draft.' },
          { title: 'Document revision number', body: 'The "rev.X of Y" pill in the document toolbar shows which revision you are viewing. Click it to see a list of all revisions with their statuses and navigate between them.' },
        ],
      },
      {
        icon: '💬',
        title: 'Comments & Communication',
        items: [
          { title: 'Adding comments', body: 'In any document editor, click "Comments" in the toolbar to open the side panel. Type a comment and press Send. You can also highlight text in the document and add a comment attached to that specific passage.' },
          { title: 'Replying and resolving', body: 'Reply to existing comment threads. When an issue is addressed, click "Resolve" to close the thread — it moves to the resolved list but is not deleted.' },
          { title: 'Document history', body: 'Comments panel → History tab. Shows all status changes, approvals and revision events for this document.' },
          { title: 'Messages', body: 'Messages button at the bottom of the sidebar. Use this to communicate with your consultant directly, organized by project.' },
          { title: 'Notifications', body: 'The bell icon in the sidebar shows notifications for document status changes affecting you. Click a notification to go directly to the document.' },
        ],
      },
    ],
  },
}

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  admin:      { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC', label: 'Admin' },
  consultant: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Consultant' },
  'client-MR':{ bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A', label: 'Management Rep.' },
  client:     { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Client' },
}

const ROLE_ORDER: Role[] = ['admin', 'consultant', 'client-MR', 'client']

export default function HelpPage() {
  const [role, setRole] = useState<Role>('client')
  const [viewingRole, setViewingRole] = useState<Role>('client')
  const [loading, setLoading] = useState(true)
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      const r = (d?.user?.role || 'client') as Role
      setRole(r)
      setViewingRole(r)
      setLoading(false)
    })
  }, [])

  function switchRole(r: Role) {
    setViewingRole(r)
    setOpenSection(0)
    setOpenItems({})
  }

  function toggleItem(key: string) {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const content = HELP[viewingRole] || HELP.client
  const rc = ROLE_COLORS[viewingRole] || ROLE_COLORS.client

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Role switcher — admin can browse all role guides */}
      {role === 'admin' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' as const }}>
          {ROLE_ORDER.map(r => {
            const c = ROLE_COLORS[r]
            const active = viewingRole === r
            return (
              <button key={r} onClick={() => switchRole(r)}
                style={{ height: 28, padding: '0 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', fontWeight: active ? 600 : 400,
                  background: active ? c.bg : 'transparent',
                  color: active ? c.color : '#8a96a2',
                  border: active ? `1px solid ${c.border}` : '0.5px solid rgba(0,0,0,0.15)' }}>
                {c.label}
              </button>
            )
          })}
          {viewingRole !== role && (
            <span style={{ fontSize: 11, color: '#9b9991', alignSelf: 'center', marginLeft: 4 }}>
              Viewing guide as {ROLE_COLORS[viewingRole]?.label}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', margin: 0 }}>{content.headline}</h1>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: rc.bg, color: rc.color, border: `0.5px solid ${rc.border}`, fontWeight: 500 }}>{rc.label}</span>
        </div>
        <p style={{ fontSize: 13, color: '#5a6472', margin: 0, lineHeight: 1.6 }}>{content.subtitle}</p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {content.sections.map((section, si) => {
          const isOpen = openSection === si
          return (
            <div key={si} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Section header */}
              <button onClick={() => { setOpenSection(isOpen ? null : si); setOpenItems({}) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', background: isOpen ? '#fafaf8' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{section.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', flex: 1 }}>{section.title}</span>
                <span style={{ fontSize: 11, color: '#9b9991', marginRight: 6 }}>{section.items.length} topics</span>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#9b9991' strokeWidth='2' strokeLinecap='round'
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points='6 9 12 15 18 9'/>
                </svg>
              </button>

              {/* Items */}
              {isOpen && (
                <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}`
                    const itemOpen = !!openItems[key]
                    return (
                      <div key={ii} style={{ borderBottom: ii < section.items.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <button onClick={() => toggleItem(key)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 10px 44px', background: itemOpen ? '#fdfcfb' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: itemOpen ? rc.color : '#c8c4bc', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 13, fontWeight: itemOpen ? 500 : 400, color: '#2e3640', flex: 1 }}>{item.title}</span>
                          <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#9b9991' strokeWidth='2' strokeLinecap='round'
                            style={{ transform: itemOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
                            <polyline points='6 9 12 15 18 9'/>
                          </svg>
                        </button>
                        {itemOpen && (
                          <div style={{ padding: '0 18px 12px 60px' }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#3a3a38', lineHeight: 1.75 }}>{item.body}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 28, padding: '14px 18px', background: 'rgba(78,140,140,0.06)', border: '0.5px solid rgba(78,140,140,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#4e8c8c' strokeWidth='1.5' strokeLinecap='round'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>
        <p style={{ margin: 0, fontSize: 12, color: '#5a6472', lineHeight: 1.6 }}>
          Need more help? Use the <strong>Messages</strong> button at the bottom of the sidebar to contact your consultant or team.
        </p>
      </div>
    </div>
  )
}
