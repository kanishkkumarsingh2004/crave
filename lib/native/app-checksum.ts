import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * The checksum of the build that is running on the device.
 *
 * Every native app keeps its own SHA-256 on the device. When the app checks
 * for updates it compares that stored checksum with the one published on GitHub:
 *
 *   • the checksums match  → the device already runs that build, no update;
 *   • the checksums differ → a different build has been published.
 *
 * The checksum of the installed build is read from the native side (the hash of
 * the installed APK). The stored copy is the fallback for platforms where the
 * native side cannot answer, and it is written the first time the app sees a
 * published manifest.
 */

interface AppChecksumPlugin {
  /** The SHA-256 of the installed APK. */
  getInstalledChecksum(): Promise<{ sha256: string }>
}

const AppChecksum = registerPlugin<AppChecksumPlugin>('AppChecksum')

const STORAGE_KEY = 'crave_installed_checksum'

/** The checksum remembered on the device. */
export function readStoredChecksum(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/** Remembers the checksum of the build running on the device. */
export function storeChecksum(sha256: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, sha256)
  } catch {
    // A full or blocked storage must never break an update check.
  }
}

/**
 * The checksum of the installed build.
 *
 * The native side is authoritative. The stored copy is used when it cannot
 * answer, and is refreshed whenever the native side does.
 */
export async function getInstalledChecksum(): Promise<string> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const result = await AppChecksum.getInstalledChecksum()
      const sha = String(result?.sha256 || '').toLowerCase()
      if (/^[a-f0-9]{64}$/.test(sha)) {
        storeChecksum(sha)
        return sha
      }
    } catch {
      // Fall through to the stored copy.
    }
  }
  return readStoredChecksum()
}

/**
 * Whether the published build differs from the one on the device.
 *
 * With no checksum on either side there is nothing to compare, so the caller
 * falls back to the version number.
 */
export function checksumsDiffer(installed: string, published: string): boolean {
  const left = String(installed || '').toLowerCase()
  const right = String(published || '').toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false
  return left !== right
}
