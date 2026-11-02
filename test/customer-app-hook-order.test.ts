import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sourcePath = new URL('../customer_app/src/App.tsx', import.meta.url)
const sourceText = readFileSync(sourcePath, 'utf8')

test('customer App declares every hook before its first conditional return', () => {
  const appStart = sourceText.indexOf('export default function App()')
  const firstConditionalReturn = sourceText.indexOf('if (!ready)', appStart)
  assert.ok(appStart >= 0, 'Expected to find the customer App function')
  assert.ok(firstConditionalReturn > appStart, 'Expected to find the authenticated early returns')

  const lateHooks = sourceText.slice(firstConditionalReturn).match(/\buse[A-Z][A-Za-z0-9]*\s*\(/g)

  assert.deepEqual(
    lateHooks || [],
    [],
    `Hooks after a conditional return change hook order after login: ${(lateHooks || []).join(', ')}`
  )
})
