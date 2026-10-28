import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { LanguageProvider } from '@/lib/language-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/lib/toast-context'
import { Toaster } from '@/components/ui/Toaster'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import WebPushPrompt from '@/components/WebPushPrompt'
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
  applicationName: 'crave.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'crave.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c100e' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={cn('font-sans', geist.variable, 'light')}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="crave." />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#121815" />
        <meta name="application-name" content="crave." />
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('crave_theme_preference');if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
        <script
          id="client-security-guard"
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {

                if (typeof console !== 'undefined' && console.log) {
                  setTimeout(function() {
                    console.log('%cSTOP! SECURITY WARNING', 'color: #ef4444; font-size: 24px; font-weight: 900;');
                    console.log('%cThis browser feature is intended for developers. Running or pasting commands here can expose your account or sensitive session keys.', 'font-size: 13px; color: #888;');
                  }, 150);
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body
        className="antialiased bg-background text-foreground transition-colors duration-200"
        suppressHydrationWarning
      >
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <ThemeProvider>
                <ToastProvider>
                  {children}
                  <Toaster />
                  <PwaInstallPrompt />
                  <WebPushPrompt />
                </ToastProvider>
              </ThemeProvider>
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
