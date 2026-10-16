import type { CapacitorConfig } from '@capacitor/cli'

const configuredServerUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'https://crave.apexonestudio.com'
const driverUrl = new URL('/driver/dashboard', configuredServerUrl).toString()

const config: CapacitorConfig = {
  appId: 'com.crave.driver',
  appName: 'Crave Driver',
  webDir: 'dist',
  backgroundColor: '#121815',
  appendUserAgent: ' CraveDriver/1.0',
  server: {
    url: driverUrl,
    cleartext: driverUrl.startsWith('http://'),
    errorPath: 'index.html',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_crave',
      iconColor: '#D9F447',
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
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
      overlaysWebView: false,
    },
  },
}

export default config
