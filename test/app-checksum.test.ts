import assert from 'node:assert/strict'
import test from 'node:test'

import { checksumsDiffer, readStoredChecksum, storeChecksum } from '../lib/native/app-checksum'

// The app stores the checksum in localStorage; Node has none, so a tiny stub
// stands in for the browser.
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
}

const SHA_A = 'a'.repeat(64)
const SHA_B = 'b'.repeat(64)

test('the stored checksum survives on the device', () => {
  storeChecksum(SHA_A)
  assert.equal(readStoredChecksum(), SHA_A)

  storeChecksum(SHA_B)
  assert.equal(readStoredChecksum(), SHA_B)
})

test('the same checksum means there is no update', () => {
  assert.equal(checksumsDiffer(SHA_A, SHA_A), false)
  assert.equal(checksumsDiffer(SHA_B, SHA_B), false)
})

test('a different checksum means a new build was published', () => {
  assert.equal(checksumsDiffer(SHA_A, SHA_B), true)
  assert.equal(checksumsDiffer(SHA_B, SHA_A), true)
})

test('the comparison ignores the case of the hash', () => {
  assert.equal(checksumsDiffer(SHA_A.toUpperCase(), SHA_A), false)
})

test('an unusable checksum is never treated as a difference', () => {
  // Nothing stored and nothing published: fall back to the version number.
  assert.equal(checksumsDiffer('', ''), false)
  assert.equal(checksumsDiffer('', SHA_A), false)
  assert.equal(checksumsDiffer(SHA_A, ''), false)
  // A value that is not a SHA-256 is ignored rather than reported.
  assert.equal(checksumsDiffer('not-a-hash', SHA_A), false)
  assert.equal(checksumsDiffer(SHA_A, 'not-a-hash'), false)
})
