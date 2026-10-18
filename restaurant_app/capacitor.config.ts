import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crave.restaurant',
  appName: 'Crave Restaurant',
  webDir: 'dist',
  backgroundColor: '#121815',
  appendUserAgent: ' CraveRestaurant/1.2.0',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_crave',
      iconColor: '#D9F447',
    },
    SplashScreen: {
      launchShowDuration: 1500,
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
