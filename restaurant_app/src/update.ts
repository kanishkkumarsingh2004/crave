import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'
import { checksumsDiffer, getInstalledChecksum } from '../../lib/native/app-checksum'

const DEFAULT_MANIFEST_URL =
  'https://raw.githubusercontent.com/kanishkkumarsingh2004/crave/main/android-builds/version.json'

interface AppUpdatePlugin {
  downloadAndInstall(options: { url: string; sha256: string }): Promise<{
    installerOpened?: boolean
    permissionRequired?: boolean
  }>
}

const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate')

export interface RestaurantUpdate {
  versionCode: number
  versionName: string
  androidUrl: string
  sha256: string
  releaseNotes: string
}

function isTrustedApkUrl(value: string, sha256: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'raw.githubusercontent.com' &&
      url.pathname ===
        '/kanishkkumarsingh2004/crave/main/android-builds/crave-restaurant-debug.apk' &&
      url.searchParams.size === 1 &&
      url.searchParams.get('sha256') === sha256.toLowerCase()
    )
  } catch {
    return false
  }
}

function parseManifestData(value: unknown): any {
  if (typeof value !== 'string') return value
  return JSON.parse(value)
}

export async function checkForRestaurantUpdate(): Promise<RestaurantUpdate | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null

  const current = await CapacitorApp.getInfo()
  const currentVersionCode = Number.parseInt(current.build, 10)
  if (!Number.isFinite(currentVersionCode)) return null

  const manifestUrl = import.meta.env.VITE_UPDATE_MANIFEST_URL || DEFAULT_MANIFEST_URL
  const separator = manifestUrl.includes('?') ? '&' : '?'
  const response = await CapacitorHttp.get({
    url: `${manifestUrl}${separator}check=${Date.now()}`,
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    connectTimeout: 10_000,
    readTimeout: 15_000,
  })
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Version check failed (${response.status}).`)
  }

  const update = parseManifestData(response.data)?.apps?.restaurant
  if (!update) return null
  if (
    !Number.isInteger(Number(update.versionCode)) ||
    typeof update.versionName !== 'string' ||
    typeof update.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(update.sha256) ||
    !isTrustedApkUrl(update.androidUrl, update.sha256)
  ) {
    throw new Error('The update manifest is invalid or points to an untrusted file.')
  }

  // The checksum of the build on the device decides: the same checksum means
  // the device already runs the published build, a different one means a new
  // build has been published.
  const publishedChecksum = String(update.sha256).toLowerCase()
  const installedChecksum = await getInstalledChecksum()
  if (installedChecksum && !checksumsDiffer(installedChecksum, publishedChecksum)) return null
  if (Number(update.versionCode) <= currentVersionCode) return null

  return {
    versionCode: Number(update.versionCode),
    versionName: update.versionName,
    androidUrl: update.androidUrl,
    sha256: update.sha256.toLowerCase(),
    releaseNotes:
      typeof update.releaseNotes === 'string'
        ? update.releaseNotes
        : 'A newer Crave Restaurant version is available.',
  }
}

export async function installRestaurantUpdate(update: RestaurantUpdate): Promise<void> {
  const result = await AppUpdate.downloadAndInstall({
    url: update.androidUrl,
    sha256: update.sha256,
  })
  if (result.permissionRequired) {
    throw new Error('Allow “Install unknown apps” for Crave Restaurant, then tap Update now again.')
  }
}
