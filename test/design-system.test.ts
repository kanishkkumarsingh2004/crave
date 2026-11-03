import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8')

const STYLE_FILES = [
  'app/globals.css',
  'customer_app/src/styles.css',
  'driver_app/src/styles.css',
  'restaurant_app/src/styles.css',
  'admin_app/src/styles.css',
] as const

test('every interface consumes the canonical Crave design tokens', () => {
  for (const path of STYLE_FILES) {
    assert.match(
      read(path),
      /@import ['"]@crave\/design-tokens\/tokens\.css['"];/,
      `${path} must import the shared tokens`
    )
  }
})

test('legacy lime variants do not drift from the canonical brand color', () => {
  const sources = STYLE_FILES.map(read).join('\n')
  assert.doesNotMatch(sources, /#eaff3f|#d9ff38|rgb\(217 255 56/i)
  assert.equal(read('packages/design-tokens/src/index.ts').includes("primary: '#D9F447'"), true)
})

test('operational apps default to dark while the customer app remains light-first', () => {
  for (const path of [
    'driver_app/src/theme.ts',
    'restaurant_app/src/theme.ts',
    'admin_app/src/theme.ts',
  ]) {
    assert.match(read(path), /stored === 'light'.*'system'.*'dark'/s)
  }
  assert.match(read('customer_app/src/theme.ts'), /stored === 'dark'.*'system'.*'light'/s)
})

test('admin shell has a dedicated touch-scroll content owner', () => {
  const styles = read('admin_app/src/styles.css')
  const scrollBlock = styles.slice(styles.indexOf('Pull to refresh'))
  assert.match(scrollBlock, /\.ptr-scroll\s*{[^}]*overflow-y:\s*auto;/s)
  assert.match(scrollBlock, /-webkit-overflow-scrolling:\s*touch;/)
  assert.match(scrollBlock, /\.app-content\s*{[^}]*overflow-y:\s*visible;/s)
  assert.match(scrollBlock, /padding:[^;]*var\(--app-nav-height\)/s)
})

test('shared tokens define accessible controls, role typography, and status semantics', () => {
  const tokens = read('packages/design-tokens/src/tokens.css')
  assert.match(tokens, /--control-height:\s*3rem;/)
  assert.match(tokens, /--touch-target:\s*2\.75rem;/)
  assert.match(tokens, /--font-ui:/)
  assert.match(tokens, /--font-display:/)
  for (const token of ['success', 'warning', 'danger', 'info']) {
    assert.match(tokens, new RegExp(`--semantic-${token}:`))
  }
  for (const token of ['canvas', 'surface', 'raised', 'line', 'ink', 'muted']) {
    assert.match(tokens, new RegExp(`--theme-light-${token}:`))
    assert.match(tokens, new RegExp(`--theme-dark-${token}:`))
  }
  assert.match(tokens, /--commerce-primary:/)
})
