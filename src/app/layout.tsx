import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YouTube Analytics Dashboard',
  description: 'Multi-channel YouTube analytics dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-yt-bg text-yt-text antialiased">
        {children}
      </body>
    </html>
  )
}
