import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'

const MANIFEST =
  'https://raw.githubusercontent.com/kanishkkumarsingh2004/crave/main/android-builds/version.json'
interface UpdatePlugin {
  downloadAndInstall(options: {
    url: string
    sha256: string
  }): Promise<{ permissionRequired?: boolean }>
}
const AppUpdate = registerPlugin<UpdatePlugin>('AppUpdate')
export interface CustomerUpdate {
  versionCode: number
  versionName: string
  androidUrl: string
  sha256: string
  releaseNotes: string
}

/** The build of the app that is currently installed on the device. */
export async function getInstalledVersion(): Promise<{
  versionCode: number
  versionName: string
}> {
  const info = await CapacitorApp.getInfo()
  return {
    versionCode: Number.parseInt(info.build, 10) || 0,
    versionName: String(info.version || ''),
  }
}

export async function checkForCustomerUpdate(): Promise<CustomerUpdate | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null
  const current = Number.parseInt((await CapacitorApp.getInfo()).build, 10)
  const response = await CapacitorHttp.get({
    url: `${import.meta.env.VITE_UPDATE_MANIFEST_URL || MANIFEST}?check=${Date.now()}`,
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    connectTimeout: 10000,
    readTimeout: 15000,
  })
  if (response.status < 200 || response.status >= 300)
    throw new Error(`Version check failed (${response.status}).`)
  const raw = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
  const update = raw?.apps?.customer
  if (!update || Number(update.versionCode) <= current) return null
  const url = new URL(update.androidUrl)
  const sha = String(update.sha256 || '').toLowerCase()
  if (
    !/^[a-f0-9]{64}$/.test(sha) ||
    url.protocol !== 'https:' ||
    url.hostname !== 'raw.githubusercontent.com' ||
    url.pathname !== '/kanishkkumarsingh2004/crave/main/android-builds/crave-customer-debug.apk' ||
    url.searchParams.get('sha256') !== sha
  )
    throw new Error('The update file is not trusted.')
  return {
    versionCode: Number(update.versionCode),
    versionName: String(update.versionName),
    androidUrl: update.androidUrl,
    sha256: sha,
    releaseNotes: String(update.releaseNotes || 'A newer CRAVE version is available.'),
  }
}
export async function installCustomerUpdate(update: CustomerUpdate) {
  const result = await AppUpdate.downloadAndInstall({
    url: update.androidUrl,
    sha256: update.sha256,
  })
  if (result.permissionRequired)
    throw new Error('Allow “Install unknown apps” for CRAVE, then tap Update again.')
}
