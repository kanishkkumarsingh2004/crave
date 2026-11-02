'use client'

function adminRouteFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const route =
      parsed.protocol === 'craveadmin:'
        ? `/${[parsed.hostname, parsed.pathname].filter(Boolean).join('/')}`.replace(/\/+/g, '/')
        : parsed.pathname
    return route === '/admin' || route.startsWith('/admin/') ? route : '/admin/dashboard'
  } catch {
    return '/admin/dashboard'
  }
}

export async function initializeNativeAdminBridge(): Promise<() => void> {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return () => undefined

  document.documentElement.dataset.nativeApp = 'admin'

  const [{ App }, { Network }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/network'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ])
  const listenerHandles: Array<{ remove: () => Promise<void> }> = []

  const navigate = (route: string) => {
    if (window.location.pathname !== route) window.location.assign(route)
  }

  try {
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#121815' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {}

  listenerHandles.push(
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else void App.minimizeApp()
    })
  )
  listenerHandles.push(
    await App.addListener('appUrlOpen', ({ url }) => navigate(adminRouteFromUrl(url)))
  )
  listenerHandles.push(
    await Network.addListener('networkStatusChange', ({ connected }) => {
      document.documentElement.dataset.network = connected ? 'online' : 'offline'
    })
  )

  const status = await Network.getStatus()
  document.documentElement.dataset.network = status.connected ? 'online' : 'offline'
  await SplashScreen.hide().catch(() => undefined)

  return () => {
    delete document.documentElement.dataset.nativeApp
    delete document.documentElement.dataset.network
    for (const handle of listenerHandles) void handle.remove()
  }
}
