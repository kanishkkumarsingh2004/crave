import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.crave.admin',
  appName: 'Crave Admin',
  webDir: 'dist',
  backgroundColor: '#121815',
  appendUserAgent: ' CraveAdmin/1.2.0',
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
      overlaysWebView: true,
    },
  },
}

export default config
