import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const githubRawBase =
  'https://raw.githubusercontent.com/kanishkkumarsingh2004/crave/main/android-builds'

const apps = {
  admin: {
    directory: 'admin_app',
    apk: 'crave-admin-debug.apk',
    releaseNotes:
      'XP Store barcode scanning with the device camera, durable rider live-map telemetry and the exact website Mapcn location experience.',
  },
  driver: {
    directory: 'driver_app',
    apk: 'crave-driver-debug.apk',
    releaseNotes:
      'Rewards removed from the Driver app, with a cleaner four-item navigation bar and no incentives request during startup.',
  },
  restaurant: {
    directory: 'restaurant_app',
    apk: 'crave-restaurant-debug.apk',
    releaseNotes:
      'Complete light, dark and system themes with consistent text, icons, forms, menu cards, modals and restaurant controls.',
  },
  customer: {
    directory: 'customer_app',
    apk: 'crave-customer-debug.apk',
    releaseNotes:
      'The exact website Mapcn address picker with its custom palette, draggable marker, theme lifecycle and complete CARTO tile access.',
  },
}

async function appManifest({ directory, apk, releaseNotes }) {
  const gradle = await readFile(join(repositoryRoot, directory, 'android/app/build.gradle'), 'utf8')
  const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1])
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1]
  if (!Number.isInteger(versionCode) || !versionName) {
    throw new Error(`Could not read Android version from ${directory}/android/app/build.gradle`)
  }

  const apkBytes = await readFile(join(repositoryRoot, 'android-builds', apk))
  const sha256 = createHash('sha256').update(apkBytes).digest('hex')
  return {
    versionCode,
    versionName,
    androidUrl: `${githubRawBase}/${apk}?sha256=${sha256}`,
    sha256,
    releaseNotes,
  }
}

const manifest = { schemaVersion: 1, apps: {} }
for (const [name, app] of Object.entries(apps)) {
  manifest.apps[name] = await appManifest(app)
}

await writeFile(
  join(repositoryRoot, 'android-builds/version.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
)
