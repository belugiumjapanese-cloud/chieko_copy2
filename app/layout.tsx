import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spot Folder Map',
  description: 'A map for official places, private notes, and public folders.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
