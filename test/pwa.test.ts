import fs from 'fs'
import path from 'path'

describe('Progressive Web App (PWA) Configuration', () => {
  const rootDir = path.resolve(__dirname, '..')

  test('public/manifest.json is valid and meets Chrome install criteria', () => {
    const manifestPath = path.join(rootDir, 'public', 'manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)

    const raw = fs.readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)

    expect(manifest.name).toBe('Crave - Multi-Vendor Food & CraveXP 10 Store Delivery')
    expect(manifest.short_name).toBe('Crave')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.background_color).toBe('#18201c')
    expect(manifest.theme_color).toBe('#18201c')

    expect(Array.isArray(manifest.icons)).toBe(true)
    const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192' && i.purpose === 'any')
    const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512' && i.purpose === 'any')
    const maskable512 = manifest.icons.find(
      (i: any) => i.sizes === '512x512' && i.purpose === 'maskable'
    )

    expect(icon192).toBeDefined()
    expect(icon512).toBeDefined()
    expect(maskable512).toBeDefined()
  })

  test('public/sw.js exists and implements fetch and offline fallback', () => {
    const swPath = path.join(rootDir, 'public', 'sw.js')
    expect(fs.existsSync(swPath)).toBe(true)

    const swContent = fs.readFileSync(swPath, 'utf8')
    expect(swContent).toContain("self.addEventListener('install'")
    expect(swContent).toContain("self.addEventListener('activate'")
    expect(swContent).toContain("self.addEventListener('fetch'")
    expect(swContent).toContain('/offline.html')
  })

  test('public/offline.html exists and contains offline content', () => {
    const offlinePath = path.join(rootDir, 'public', 'offline.html')
    expect(fs.existsSync(offlinePath)).toBe(true)

    const htmlContent = fs.readFileSync(offlinePath, 'utf8')
    expect(htmlContent).toContain('No Internet Connection')
    expect(htmlContent).toContain('crave')
  })

  test('PWA icon assets exist with non-zero size in public/icons', () => {
    const requiredIcons = [
      'icon-72x72.png',
      'icon-96x96.png',
      'icon-128x128.png',
      'icon-144x144.png',
      'icon-152x152.png',
      'icon-180x180.png',
      'icon-192x192.png',
      'icon-384x384.png',
      'icon-512x512.png',
      'icon-maskable-192x192.png',
      'icon-maskable-512x512.png',
      'apple-touch-icon.png',
    ]

    for (const icon of requiredIcons) {
      const iconPath = path.join(rootDir, 'public', 'icons', icon)
      expect(fs.existsSync(iconPath)).toBe(true)
      const stats = fs.statSync(iconPath)
      expect(stats.size).toBeGreaterThan(0)
    }

    // Root apple touch icon
    const rootAppleIcon = path.join(rootDir, 'public', 'apple-touch-icon.png')
    expect(fs.existsSync(rootAppleIcon)).toBe(true)
    expect(fs.statSync(rootAppleIcon).size).toBeGreaterThan(0)
  })
})
