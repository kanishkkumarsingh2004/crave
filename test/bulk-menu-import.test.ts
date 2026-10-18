import assert from 'node:assert/strict'
import test from 'node:test'
import { CSV_HEADERS, parseCsv, rowsToItems } from '../components/menu/BulkMenuImportModal'

const headers = [
  'name',
  'category',
  'description',
  'restaurant_price',
  'app_price',
  'in_stock',
  'is_veg',
  'unit',
  'stock_count',
  'sku_code',
  'image_url',
  'hsn_sac_code',
  'price_tax_mode',
  'expiry_date',
  'variant_names',
  'variant_restaurant_prices',
  'variant_app_prices',
  'default_variant',
]

test('bulk menu template has one restaurant MRP column', () => {
  assert.deepEqual([...CSV_HEADERS], headers)
  assert.equal(CSV_HEADERS.includes('restaurant_price'), true)
  assert.equal((CSV_HEADERS as readonly string[]).includes('mrp'), false)
})

test('bulk menu CSV uses restaurant_price as the only MRP value', () => {
  const csv = [
    headers.join(','),
    [
      'Veg Pizza',
      'Pizzas',
      'Fresh pizza',
      '120',
      '135',
      'true',
      'true',
      '1 Pizza',
      '30',
      'PIZZA-1',
      '',
      '996331',
      'TAX_EXCLUSIVE',
      '2027-12-31',
      'Small|Large',
      '120|200',
      '135|225',
      'Large',
    ].join(','),
  ].join('\n')

  const [item] = rowsToItems(parseCsv(csv))

  assert.equal(item.restaurant_price, 120)
  assert.equal(item.price, 135)
  assert.equal('mrp' in item, false)
  assert.equal(item.price_tax_mode, 'TAX_EXCLUSIVE')
  assert.equal(item.expiry_date, '2027-12-31')
  assert.deepEqual(
    item.variants.map((variant) => ({ name: variant.name, isDefault: variant.is_default })),
    [
      { name: 'Small', isDefault: false },
      { name: 'Large', isDefault: true },
    ]
  )
})

test('bulk menu CSV rejects unsupported tax modes', () => {
  const values = [
    'Tea',
    'Beverages',
    '',
    '20',
    '25',
    'true',
    'true',
    '1 cup',
    '10',
    '',
    '',
    '996331',
    'INVALID',
    '',
    '',
    '',
    '',
    '',
  ]

  assert.throws(
    () => rowsToItems(parseCsv([headers.join(','), values.join(',')].join('\n'))),
    /price_tax_mode must be TAX_INCLUSIVE or TAX_EXCLUSIVE/
  )
})
