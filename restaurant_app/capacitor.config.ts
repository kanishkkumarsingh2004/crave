import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crave.restaurant',
  appName: 'Crave Restaurant',
  webDir: 'dist',
  backgroundColor: '#121815',
  appendUserAgent: ' CraveRestaurant/1.0.0',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_crave',
      iconColor: '#D9F447',
    },
    SplashScreen: {
      // Let the web app own its loading state. A native Android-12 launch gate can
      // remain over the WebView when the bridge is slow, making the app look frozen.
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#121815',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#121815',
      overlaysWebView: true,
    },
  },
}

export default config
