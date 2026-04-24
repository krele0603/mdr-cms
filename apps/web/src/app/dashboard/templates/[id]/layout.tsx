export default function TemplateEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: '-24px', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
