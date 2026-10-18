import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crave.customer',
  appName: 'CRAVE.',
  webDir: 'dist',
  backgroundColor: '#08110C',
  appendUserAgent: ' CraveCustomer/1.1.0',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_crave', iconColor: '#F4FF52' },
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: '#08110C',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: { style: 'DARK', backgroundColor: '#F7F7F2', overlaysWebView: true },
  },
}
export default config
