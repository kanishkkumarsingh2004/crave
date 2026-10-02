import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'crave. | Next-Gen Multi-Role Food Delivery Platform',
  description: 'Instant food delivery platform connecting Customers, Kitchen Vendors, Delivery Drivers, and System Admins in real-time.',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#d9f447',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#f8f9f7] text-[#18201c]" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
