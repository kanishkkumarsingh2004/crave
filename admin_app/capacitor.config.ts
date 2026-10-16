import type { CapacitorConfig } from '@capacitor/cli'

const configuredServerUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'https://crave.apexonestudio.com'
const adminUrl = new URL('/admin/dashboard', configuredServerUrl).toString()

const config: CapacitorConfig = {
  appId: 'com.crave.admin',
  appName: 'Crave Admin',
  webDir: 'dist',
  backgroundColor: '#121815',
  appendUserAgent: ' CraveAdmin/1.0',
  server: {
    url: adminUrl,
    cleartext: adminUrl.startsWith('http://'),
    errorPath: 'index.html',
  },
  plugins: {
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
