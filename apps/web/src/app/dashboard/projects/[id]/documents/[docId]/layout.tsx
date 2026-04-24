// This layout overrides the dashboard content padding
// so the editor can fill the full viewport height cleanly.
export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: '-24px', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
