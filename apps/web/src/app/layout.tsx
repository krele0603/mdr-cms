import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MDR CMS',
  description: 'MDR Technical File Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
