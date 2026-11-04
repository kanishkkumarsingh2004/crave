process.env.NODE_ENV = 'test'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { NextRequest } from 'next/server'
import {
  buildContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from '../lib/security/content-security-policy'
import { proxy } from '../proxy'

const ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8')

test('production CSP authorizes inline scripts by nonce without unsafe-inline', () => {
  const nonce = createContentSecurityPolicyNonce()
  const policy = buildContentSecurityPolicy(nonce, false)
  const scriptDirective = policy.split(';').find((directive) => directive.includes('script-src'))

  assert.match(nonce, /^[a-f0-9]{32}$/)
  assert.match(scriptDirective || '', new RegExp(`'nonce-${nonce}'`))
  assert.match(scriptDirective || '', /'strict-dynamic'/)
  assert.doesNotMatch(scriptDirective || '', /'unsafe-inline'/)
  assert.doesNotMatch(scriptDirective || '', /'unsafe-eval'/)
})

test('development CSP permits React debugging eval but still requires inline nonces', () => {
  const policy = buildContentSecurityPolicy('0123456789abcdef0123456789abcdef', true)
  const scriptDirective = policy.split(';').find((directive) => directive.includes('script-src'))

  assert.match(scriptDirective || '', /'unsafe-eval'/)
  assert.doesNotMatch(scriptDirective || '', /'unsafe-inline'/)
  assert.doesNotMatch(policy, /upgrade-insecure-requests/)
})

test('proxy emits a fresh CSP nonce and forwards it to Next rendering', async () => {
  const response = await proxy(new NextRequest('http://localhost/'))
  const policy = response.headers.get('content-security-policy') || ''
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1]

  assert.ok(nonce)
  assert.equal(response.headers.get('x-middleware-request-x-nonce'), nonce)
  assert.equal(response.headers.get('x-middleware-request-content-security-policy'), policy)
})

test('root layout applies the request nonce and static config no longer overrides CSP', () => {
  const layout = read('app/layout.tsx')
  const nextConfig = read('next.config.mjs')

  assert.match(layout, /await connection\(\)/)
  assert.match(layout, /const nonce = \(await headers\(\)\)\.get\('x-nonce'\)/)
  assert.equal(layout.match(/nonce=\{nonce\}/g)?.length, 2)
  assert.doesNotMatch(nextConfig, /Content-Security-Policy/)
})
