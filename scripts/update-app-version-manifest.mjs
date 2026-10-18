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
    releaseNotes: 'Administration stability and backend connectivity updates.',
  },
  driver: {
    directory: 'driver_app',
    apk: 'crave-driver-debug.apk',
    releaseNotes: 'Live delivery, background location and notification stability updates.',
  },
  restaurant: {
    directory: 'restaurant_app',
    apk: 'crave-restaurant-debug.apk',
    releaseNotes: 'Native sign-in compatibility and secure in-app updates from GitHub.',
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
