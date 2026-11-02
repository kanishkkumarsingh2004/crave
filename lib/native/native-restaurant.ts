'use client'

const RESTAURANT_ROUTES = new Set([
  '/vendor',
  '/vendor/dashboard',
  '/vendor/menu',
  '/vendor/sales',
  '/vendor/settings',
])

function restaurantRouteFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const route =
      parsed.protocol === 'craverestaurant:'
        ? `/${[parsed.hostname, parsed.pathname].filter(Boolean).join('/')}`.replace(/\/+/g, '/')
        : parsed.pathname
    return RESTAURANT_ROUTES.has(route) ? route : '/vendor/dashboard'
  } catch {
    return '/vendor/dashboard'
  }
}

export async function initializeNativeRestaurantBridge(): Promise<() => void> {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform() || !navigator.userAgent.includes('CraveRestaurant/')) {
    return () => undefined
  }

  document.documentElement.dataset.nativeApp = 'restaurant'

  const [{ App }, { Network }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/network'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar'),
  ])
  const listenerHandles: Array<{ remove: () => Promise<void> }> = []

  const navigate = (url: string) => {
    const route = restaurantRouteFromUrl(url)
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
  listenerHandles.push(await App.addListener('appUrlOpen', ({ url }) => navigate(url)))
  listenerHandles.push(
    await Network.addListener('networkStatusChange', ({ connected }) => {
      document.documentElement.dataset.network = connected ? 'online' : 'offline'
    })
  )

  const [networkStatus, launchUrl] = await Promise.all([Network.getStatus(), App.getLaunchUrl()])
  document.documentElement.dataset.network = networkStatus.connected ? 'online' : 'offline'
  if (launchUrl?.url) navigate(launchUrl.url)
  await SplashScreen.hide().catch(() => undefined)

  return () => {
    delete document.documentElement.dataset.nativeApp
    delete document.documentElement.dataset.network
    for (const handle of listenerHandles) void handle.remove()
  }
}
