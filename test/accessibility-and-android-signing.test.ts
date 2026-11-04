process.env.NODE_ENV = 'test'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { GET as authMeGet } from '../app/api/auth/me/route'

const ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8')

test('the closed mobile drawer is inert and its trigger exposes dialog state', () => {
  const drawer = read('components/navbar/MobileMenuDrawer.tsx')
  const navbar = read('components/Navbar.tsx')

  assert.match(drawer, /role="dialog"/)
  assert.match(drawer, /aria-modal=\{isOpen\}/)
  assert.match(drawer, /inert=\{!isOpen\}/)
  assert.match(drawer, /pointer-events-none translate-x-full/)
  assert.match(navbar, /aria-controls="mobile-menu-drawer"/)
  assert.match(navbar, /aria-expanded=\{showMobileMenu\}/)
})

test('the public homepage has a main landmark and a sequential heading outline', () => {
  const homepage = read('app/page.tsx')
  const footer = read('components/Footer.tsx')
  const installPrompt = read('components/PwaInstallPrompt.tsx')

  assert.match(homepage, /<main id="main-content">/)
  assert.ok(homepage.indexOf('<h1') < homepage.indexOf('Choose your Crave experience'))
  assert.ok(homepage.indexOf('Choose your Crave experience') < homepage.indexOf('<h3'))
  assert.doesNotMatch(footer, /<h4/)
  assert.match(installPrompt, /<h2 id="pwa-install-title"/)
})

test('homepage and language controls use contrast-safe foreground colors', () => {
  const homepage = read('app/page.tsx')
  const languageSwitcher = read('components/LanguageSwitcher.tsx')

  assert.match(homepage, /placeholder:text-gray-600 dark:placeholder:text-gray-300/)
  assert.match(homepage, /text-\[#4b6b0b\]/)
  assert.doesNotMatch(languageSwitcher, /text-\[#78827c\]/)
  assert.match(languageSwitcher, /text-\[#5f6963\]/)
})

test('normal guest session discovery succeeds without weakening invalid-token rejection', async () => {
  const guestResponse = await authMeGet(new Request('http://localhost/api/auth/me'))
  assert.equal(guestResponse.status, 200)
  assert.deepEqual(await guestResponse.json(), { authenticated: false, user: null })

  const invalidResponse = await authMeGet(
    new Request('http://localhost/api/auth/me', {
      headers: { authorization: 'Bearer invalid-token' },
    })
  )
  assert.equal(invalidResponse.status, 401)
  assert.equal((await invalidResponse.json()).authenticated, false)

  const { createToken } = await import('../lib/jwt')
  const validToken = await createToken({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  })
  const validResponse = await authMeGet(
    new Request('http://localhost/api/auth/me', {
      headers: {
        authorization: `Bearer ${validToken}`,
        'x-test-auth': 'true',
        'x-test-role': 'user',
        'x-test-user-id': 'test-user-id',
      },
    })
  )
  assert.equal(validResponse.status, 200)
  assert.equal((await validResponse.json()).authenticated, true)
})

test('default Android builds use the verified release-signing workflow', () => {
  const packageJson = JSON.parse(read('package.json'))
  const releaseScript = read('scripts/build-apps-release.sh')
  const legacySigner = read('sign-apks.sh')

  assert.equal(packageJson.scripts['build:android'], 'bash scripts/build-apps-release.sh')
  assert.equal(packageJson.scripts['build:android:debug'], 'bash scripts/build-apps.sh')
  assert.match(releaseScript, /exec cap sync android/)
  assert.match(releaseScript, /assembleRelease/)
  assert.match(releaseScript, /apksigner verify --verbose --print-certs/)
  assert.match(releaseScript, /CN=Android Debug/)
  assert.match(releaseScript, /Release APKs were not signed by the same certificate/)
  assert.doesNotMatch(legacySigner, /-storepass.*CRAVE_KEYSTORE_PASS/)
  assert.match(legacySigner, /exec bash .*build-apps-release\.sh/)
})
