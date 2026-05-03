'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Role = 'admin' | 'consultant' | 'client' | 'client-MR'

interface Section {
  icon: string
  title: string
  content: string[]
}

const HELP_CONTENT: Record<string, { headline: string; subtitle: string; sections: Section[] }> = {
  admin: {
    headline: 'Admin Guide',
    subtitle: 'Full system control — manage users, companies, projects and quality documents.',
    sections: [
      {
        icon: '👥',
        title: 'Managing Users',
        content: [
          'Create new users from the Users page (sidebar → Users). New users start without a company — you assign them in the Companies section.',
          'To assign a role, open a Company page and add the user as a member. Use the radio buttons to set their role: Consultant, Client, or MR (Management Representative).',
          'Users can have different roles in different companies — a person can be a Consultant in one company and an MR in another.',
          'To remove a user from the system, use the Delete button on the Users page. This removes all their memberships and project assignments.',
        ],
      },
      {
        icon: '🏢',
        title: 'Managing Companies',
        content: [
          'Create companies from the Companies page. Each company has its own eQMS (quality management system) and Technical File projects.',
          'In the company detail page, you can add members and assign their roles. The "Projects" button next to each client member lets you assign specific TF projects and set view/edit access.',
          'Consultants automatically see all projects in companies they belong to.',
          'To delete a company, use the "Delete company" button at the top right of the company page. This removes all associated documents and memberships.',
        ],
      },
      {
        icon: '📁',
        title: 'TF Builder Projects',
        content: [
          'Projects are Technical File (TF) containers for medical device documentation. Create them from the Projects page.',
          'Each project uses a TF Structure (document list) that defines which Annexes and documents are required.',
          'Documents inside projects go through a workflow: Draft → In Progress → Review → Approved.',
          'The Document Status Tracker at the bottom of each project gives an overview of all document statuses.',
          'You can assign risk analysis (FMEA) and generate a live Risk Matrix that can be inserted into TF documents.',
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        content: [
          'Each company has an eQMS organized in 5 levels: Policies (L1), Procedures (L2), Work Instructions (L3), Forms & Templates (L4), and Records (L5).',
          'Documents are organized in folders. Create folders with the "+ New" button, then create documents inside them.',
          'Documents follow an approval workflow: Draft → Submit for approval → Approved (Active).',
          'When a document needs updating after approval, use "New revision" to create a new draft version. The approved version remains accessible until the new revision is approved.',
          'The document list shows Active and Draft versions side by side in two columns.',
        ],
      },
      {
        icon: '📐',
        title: 'Templates & TF Structures',
        content: [
          'Template Library: reusable document templates that can be assigned to TF document slots.',
          'TF Structures: define which Annexes and documents a project requires. Assign a structure when creating a project.',
          'Both are accessible from the TFBuilder section in the sidebar.',
        ],
      },
    ],
  },
  consultant: {
    headline: 'Consultant Guide',
    subtitle: 'Work with client companies — manage eQMS documents, TF projects and approvals.',
    sections: [
      {
        icon: '🏢',
        title: 'Your Companies',
        content: [
          'The sidebar shows all companies you are assigned to. If you have multiple, use the dropdown to switch between them.',
          'Your selection persists as you navigate — switching to a different project or eQMS level stays within the selected company.',
          'Click "Companies" in the sidebar to see the full company page with members and project access.',
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        content: [
          'Access eQMS levels from the sidebar: Policies, Procedures, Work Instructions, Forms & Templates.',
          'You can create, edit and submit documents for approval. Use the full-featured editor with font controls, tables, images and table of contents.',
          'To submit a document for client MR approval: open the document → click "Submit for approval" → optionally add a change note.',
          'Once a document is approved (Active), create a new revision with the "↻ New revision" button when updates are needed.',
          'The document list shows Active and Draft versions side by side so the current state is always visible.',
        ],
      },
      {
        icon: '📁',
        title: 'TF Projects',
        content: [
          'All projects belonging to your assigned companies appear in the sidebar under "Technical Files" and on the Projects page.',
          'Open a project to see its Annexes, documents, team members and Document Status Tracker.',
          'Edit documents directly — the editor supports variables, risk matrix insertion, comments, and file attachments.',
          'Documents follow the workflow: Draft → In Progress → Review → Approved. Change document status from the status dropdown in the editor toolbar.',
        ],
      },
      {
        icon: '✅',
        title: 'Approvals',
        content: [
          'For eQMS: documents submitted for approval by clients appear with a "Pending" badge. Open the document and click "✓ Approve" to approve.',
          'For TF documents: documents in "Review" status can be approved from the document editor using the approve button.',
          'Version history is always accessible via the "History" button in the document editor.',
        ],
      },
    ],
  },
  client: {
    headline: 'Client Guide',
    subtitle: 'Access your company\'s quality documents and technical file projects.',
    sections: [
      {
        icon: '🧭',
        title: 'Navigating the Sidebar',
        content: [
          'If you are assigned to multiple companies, use the dropdown at the top of the sidebar to switch between them. Your selection is remembered.',
          'Below the company selector you will find your eQMS levels: Policies, Procedures, Work Instructions, and Forms & Templates.',
          'Below that are your Technical File projects — click any project to open it directly.',
        ],
      },
      {
        icon: '📋',
        title: 'eQMS Documents',
        content: [
          'The eQMS contains your company\'s quality management documents organized in levels.',
          'The document list shows two columns: Active (approved) documents on the left, and Draft/Pending versions on the right.',
          'Green dot = Active (approved and in use). Grey dot = Draft (being worked on). Amber dot = Pending approval.',
          'Click "View" to open an approved document. Click "Open" to open a draft document.',
          'You can read and edit draft documents. Once ready, submit them for approval using the "Submit for approval" button.',
        ],
      },
      {
        icon: '📁',
        title: 'Technical File Projects',
        content: [
          'Your assigned TF projects appear in the sidebar and on the main Companies page.',
          'Each project contains technical documentation organized by Annex (I through X).',
          'The Document Status Tracker at the bottom of each project gives a quick overview of which documents are done, in progress, or not started.',
          'Your access level (View or Edit) is shown in the sidebar. View access lets you read documents; Edit access lets you make changes.',
        ],
      },
      {
        icon: '💬',
        title: 'Communication',
        content: [
          'Use the Messages button (bottom of sidebar) to communicate with your consultant or team members.',
          'Messages are organized by project and person.',
          'Notifications appear as a badge on the bell icon — click to see updates about document status changes.',
        ],
      },
    ],
  },
}

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  admin:      { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC', label: 'Admin' },
  consultant: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Consultant' },
  client:     { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Client' },
  'client-MR':{ bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A', label: 'Management Rep.' },
}

export default function HelpPage() {
  const [role, setRole] = useState<Role>('client')
  const [loading, setLoading] = useState(true)
  const [openSection, setOpenSection] = useState<number | null>(0)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      const r = d?.user?.role || 'client'
      setRole(r as Role)
      setLoading(false)
    })
  }, [])

  const contentKey = role === 'client-MR' ? 'client' : role
  const content = HELP_CONTENT[contentKey] || HELP_CONTENT.client
  const rc = ROLE_COLORS[role] || ROLE_COLORS.client

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a18', margin: 0 }}>{content.headline}</h1>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: rc.bg, color: rc.color, border: `0.5px solid ${rc.border}`, fontWeight: 500 }}>{rc.label}</span>
        </div>
        <p style={{ fontSize: 14, color: '#5a6472', margin: 0, lineHeight: 1.6 }}>{content.subtitle}</p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {content.sections.map((section, idx) => {
          const isOpen = openSection === idx
          return (
            <div key={idx} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenSection(isOpen ? null : idx)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: isOpen ? '#fafaf8' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{section.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a18', flex: 1 }}>{section.title}</span>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#9b9991' strokeWidth='2' strokeLinecap='round'
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points='6 9 12 15 18 9'/>
                </svg>
              </button>
              {isOpen && (
                <div style={{ padding: '4px 20px 20px 52px', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  {section.content.map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4e8c8c', marginTop: 7, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#3a3a38', lineHeight: 1.7 }}>{item}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(78,140,140,0.06)', border: '0.5px solid rgba(78,140,140,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#4e8c8c' strokeWidth='1.5' strokeLinecap='round'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>
        <p style={{ margin: 0, fontSize: 12, color: '#5a6472', lineHeight: 1.6 }}>
          Need more help? Use the <strong>Messages</strong> button in the sidebar to contact your team.
        </p>
      </div>
    </div>
  )
}
