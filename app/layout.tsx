import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { LanguageProvider } from '@/lib/language-context'
import { ToastProvider } from '@/lib/toast-context'
import { Toaster } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'crave. | Next-Gen Multi-Role Food Delivery Platform',
  description:
    'Instant food delivery platform connecting Customers, Kitchen Vendors, Delivery Drivers, and System Admins in real-time.',
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
    <html lang="en" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <body className="antialiased bg-[#f8f9f7] text-[#18201c]" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <ToastProvider>
                {children}
                <Toaster />
              </ToastProvider>
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
