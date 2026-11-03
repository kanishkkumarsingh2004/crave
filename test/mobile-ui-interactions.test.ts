import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { calculatePullOffset } from '../packages/mobile-core/src/PullToRefresh'

const read = (path: string) => readFileSync(path, 'utf8')

test('pull-to-refresh only claims a downward vertical gesture and caps resistance', () => {
  assert.equal(calculatePullOffset(10, 100, 10, 200), 50)
  assert.equal(calculatePullOffset(10, 100, 10, 90), 0)
  assert.equal(calculatePullOffset(10, 100, 100, 125), 0)
  assert.equal(calculatePullOffset(10, 100, 10, 1000), 140)
})

test('pull-to-refresh guards cancellation and is shared by every mobile app', () => {
  const implementation = read('packages/mobile-core/src/PullToRefresh.tsx')
  assert.match(implementation, /event\.cancelable\) event\.preventDefault\(\)/)
  assert.match(implementation, /touchstart', onTouchStart, \{ passive: true \}/)
  assert.match(implementation, /touchmove', onTouchMove, \{ passive: false \}/)
  assert.match(implementation, /touchcancel/)

  for (const app of ['customer_app', 'admin_app', 'driver_app', 'restaurant_app']) {
    assert.equal(
      read(`${app}/src/components/PullToRefresh.tsx`).trim(),
      "export { PullToRefresh } from '@crave/mobile-core'"
    )
  }
  assert.doesNotMatch(read('customer_app/src/App.tsx'), /function PullToRefresh\(/)
})

test('shared dialog handles focus entry, focus trapping, Escape, and focus return', () => {
  const dialog = read('packages/mobile-core/src/AccessibleDialog.tsx')
  assert.match(dialog, /first\.focus\(\)/)
  assert.match(dialog, /event\.key === 'Escape'/)
  assert.match(dialog, /event\.key !== 'Tab'/)
  assert.match(dialog, /lastItem\.focus\(\)/)
  assert.match(dialog, /returnFocusRef\.current\?\.focus\(\)/)
  assert.match(dialog, /document\.body\.style\.overflow = 'hidden'/)

  for (const app of ['customer_app', 'admin_app', 'driver_app', 'restaurant_app']) {
    const sources = [read(`${app}/src/App.tsx`), read(`${app}/src/PermissionSheet.tsx`)].join('\n')
    assert.match(sources, /AccessibleDialog/)
    assert.doesNotMatch(sources, /aria-modal=/)
  }
})

test('web viewport permits zoom and admin/customer use one vertical scroll owner', () => {
  const layout = read('app/layout.tsx')
  assert.doesNotMatch(layout, /maximumScale/)
  assert.doesNotMatch(layout, /userScalable/)

  const adminCss = read('admin_app/src/styles.css')
  assert.match(adminCss, /\.ptr-scroll\s*\{[\s\S]*?overflow-y: auto;/)
  assert.match(adminCss, /\.app-content\s*\{[\s\S]*?overflow-y: visible;/)

  const customerCss = read('customer_app/src/styles.css')
  assert.match(customerCss, /\.app-shell\s*\{[\s\S]*?height: 100dvh;[\s\S]*?overflow: hidden;/)
  assert.match(customerCss, /\.ptr-scroll\s*\{[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;/)
  assert.doesNotMatch(read('customer_app/src/App.tsx'), /overflowY: 'auto'/)
})

test('customer discovery does not steal focus and restaurant menus follow the commerce hierarchy', () => {
  const app = read('customer_app/src/App.tsx')
  const styles = read('customer_app/src/styles.css')

  assert.doesNotMatch(app, /autoFocus/)
  assert.match(app, /className="detail-summary"/)
  assert.match(app, /className="detail-hero-actions"/)
  assert.match(app, /className="menu-group-heading"/)
  assert.match(app, /groupedItems\.map/)
  assert.match(app, /<DishImage src=\{image\} name=\{item\.name\} \/>/)
  assert.match(styles, /\.detail-summary\s*\{[\s\S]*?margin-top: -72px;/)
  assert.match(styles, /\.menu-item\s*\{[\s\S]*?grid-template-columns: 94px minmax\(0, 1fr\) 76px;/)
})
