import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { LanguageProvider } from '@/lib/language-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/lib/toast-context'
import { Toaster } from '@/components/ui/Toaster'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import { cn } from '@/lib/utils'
import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'crave. | Crave What You Love • Instant Food & Grocery Delivery',
  description:
    'Order gourmet food, top local kitchen dishes, and 10-minute instant groceries delivered straight to your door.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'crave.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Crave" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem('crave_theme_preference');
                var active = 'light';
                if (stored === 'dark') {
                  active = 'dark';
                } else if (stored === 'light') {
                  active = 'light';
                } else if (stored === 'system' || !stored) {
                  active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                var root = document.documentElement;
                if (active === 'dark') {
                  root.classList.add('dark');
                  root.classList.remove('light');
                  root.setAttribute('data-theme', 'dark');
                  root.style.colorScheme = 'dark';
                } else {
                  root.classList.add('light');
                  root.classList.remove('dark');
                  root.setAttribute('data-theme', 'light');
                  root.style.colorScheme = 'light';
                }
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground transition-colors duration-200" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <ThemeProvider>
                <ToastProvider>
                  {children}
                  <Toaster />
                  <PwaInstallPrompt />
                </ToastProvider>
              </ThemeProvider>
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
