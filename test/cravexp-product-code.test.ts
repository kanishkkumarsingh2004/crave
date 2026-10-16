import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCraveXPSku, normalizeCraveXPBarcode } from '../lib/cravexp-product-code'

test('CraveXP SKU generation is deterministic and derived from product details', () => {
  const product = {
    name: 'Organic Eggs',
    category: 'Dairy & Eggs',
    unit: '6 Pieces',
    barcode: '8901058852314',
  }

  const sku = generateCraveXPSku(product)

  assert.equal(sku, generateCraveXPSku(product))
  assert.match(sku, /^XP-DAIRY--ORGANIC-EGGS-6-PIEC-[A-Z0-9]{5}$/)
  assert.notEqual(sku, generateCraveXPSku({ ...product, barcode: '8901058852315' }))
})

test('CraveXP barcode normalization removes surrounding and embedded whitespace', () => {
  assert.equal(normalizeCraveXPBarcode(' 8901 0588 52314 '), '8901058852314')
  assert.equal(normalizeCraveXPBarcode(null), '')
})
