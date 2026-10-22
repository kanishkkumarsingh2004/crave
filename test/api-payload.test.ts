import assert from 'node:assert/strict'
import test from 'node:test'
import {
  apiErrorMessage,
  HTML_PAYLOAD_MESSAGE,
  isHtmlPayload,
  normalizeApiPayload,
} from '../lib/native/api-payload'

/**
 * A route that is missing on the deployed backend answers with the Next.js HTML
 * shell instead of JSON. The apps must show a short message for that, never the
 * markup of the page, because a raw body floods the layout.
 */

const HTML_BODY = `<!DOCTYPE html><html lang="en"><head><title>Crave App</title></head><body><div id="root"></div></body></html>`

test('an HTML document is recognised as a page rather than API data', () => {
  assert.equal(isHtmlPayload(HTML_BODY), true)
  assert.equal(isHtmlPayload('  <!DOCTYPE html>'), true)
  assert.equal(isHtmlPayload('{"error":"nope"}'), false)
  assert.equal(isHtmlPayload('plain text'), false)
})

test('an HTML body never becomes the message the user sees', () => {
  const payload = normalizeApiPayload(HTML_BODY)
  const message = apiErrorMessage(payload, 404, '/api/admin/driver-payouts')

  assert.equal(payload.error, HTML_PAYLOAD_MESSAGE)
  assert.ok(!message.includes('<!DOCTYPE'))
  assert.ok(!message.includes('<div'))
  assert.ok(message.includes('/api/admin/driver-payouts'))
})

test('a missing endpoint is reported as a deployment problem', () => {
  const payload = normalizeApiPayload(HTML_BODY)
  const message = apiErrorMessage(payload, 404, '/api/admin/driver-payouts')

  assert.match(message, /missing on the deployed backend/)
})

test('valid JSON is still parsed', () => {
  const payload = normalizeApiPayload('{"success":true,"payouts":[]}')

  assert.equal(payload.success, true)
  assert.deepEqual(payload.payouts, [])
})

test('a plain text failure keeps its own message', () => {
  const payload = normalizeApiPayload('Something broke')

  assert.equal(apiErrorMessage(payload, 500, '/api/orders'), 'Something broke')
})

test('a long message is capped so it cannot flood the layout', () => {
  const payload = normalizeApiPayload({ error: 'x'.repeat(5000) })
  const message = apiErrorMessage(payload, 500, '/api/orders')

  assert.ok(message.length <= 240)
  assert.ok(message.endsWith('…'))
})

test('a failure without a message still produces readable text', () => {
  assert.equal(apiErrorMessage({}, 500, '/api/orders'), 'Unable to complete the request.')
})
