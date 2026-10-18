'use client'

import { Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { ChangeEvent, useRef, useState } from 'react'

type BulkMenuImportModalProps = {
  open: boolean
  restaurantId: string
  restaurantName: string
  onClose: () => void
  onImported: () => void | Promise<void>
}

export const CSV_HEADERS = [
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
] as const

function escapeCsv(value: string | number | boolean) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') quoted = true
    else if (character === ',') {
      row.push(field.trim())
      field = ''
    } else if (character === '\n') {
      row.push(field.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else if (character !== '\r') {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  if (quoted) throw new Error('The CSV contains an unclosed quoted value.')
  return rows
}

function booleanValue(value: string, fallback: boolean) {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1', 'y'].includes(normalized)) return true
  if (['false', 'no', '0', 'n'].includes(normalized)) return false
  throw new Error(`Invalid boolean value "${value}". Use true or false.`)
}

function optionalNumber(value: string) {
  if (!value.trim()) return null
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Invalid number "${value}".`)
  return number
}

function splitList(value: string) {
  return value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function rowsToItems(rows: string[][]) {
  if (rows.length < 2) throw new Error('The CSV does not contain any menu item rows.')
  const headers = rows[0].map((header) =>
    header
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
  )
  const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing template columns: ${missingHeaders.join(', ')}`)
  }

  return rows.slice(1).map((values, rowIndex) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
    const line = rowIndex + 2
    const name = record.name.trim()
    const category = record.category.trim()
    const restaurantPrice = optionalNumber(record.restaurant_price)
    const appPrice = optionalNumber(record.app_price)
    if (!name) throw new Error(`Row ${line}: name is required.`)
    if (!category) throw new Error(`Row ${line}: category is required.`)
    if (restaurantPrice == null || appPrice == null) {
      throw new Error(`Row ${line}: restaurant_price and app_price are required.`)
    }

    const variantNames = splitList(record.variant_names)
    const variantRestaurantPrices = splitList(record.variant_restaurant_prices)
    const variantAppPrices = splitList(record.variant_app_prices)
    if (
      variantNames.length !== variantRestaurantPrices.length ||
      variantNames.length !== variantAppPrices.length
    ) {
      throw new Error(
        `Row ${line}: variant names and both variant price lists must contain the same number of values.`
      )
    }

    const defaultVariant = record.default_variant.trim().toLowerCase()
    const priceTaxMode = record.price_tax_mode.trim().toUpperCase() || 'TAX_INCLUSIVE'
    if (!['TAX_INCLUSIVE', 'TAX_EXCLUSIVE'].includes(priceTaxMode)) {
      throw new Error(`Row ${line}: price_tax_mode must be TAX_INCLUSIVE or TAX_EXCLUSIVE.`)
    }
    const expiryDate = record.expiry_date.trim()
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      throw new Error(`Row ${line}: expiry_date must use YYYY-MM-DD format.`)
    }

    return {
      name,
      category,
      description: record.description.trim() || null,
      restaurant_price: restaurantPrice,
      price: appPrice,
      in_stock: booleanValue(record.in_stock, true),
      is_veg: booleanValue(record.is_veg, true),
      unit: record.unit.trim() || null,
      stock_count: optionalNumber(record.stock_count) ?? 0,
      sku_code: record.sku_code.trim() || null,
      image: record.image_url.trim() || null,
      hsn_sac_code: record.hsn_sac_code.trim() || '996331',
      price_tax_mode: priceTaxMode as 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE',
      expiry_date: expiryDate || null,
      variants: variantNames.map((variantName, index) => ({
        name: variantName,
        restaurant_price: Number(variantRestaurantPrices[index]),
        price: Number(variantAppPrices[index]),
        in_stock: true,
        is_default:
          defaultVariant.length > 0 ? variantName.toLowerCase() === defaultVariant : index === 0,
      })),
    }
  })
}

export default function BulkMenuImportModal({
  open,
  restaurantId,
  restaurantName,
  onClose,
  onImported,
}: BulkMenuImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [items, setItems] = useState<ReturnType<typeof rowsToItems>>([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  if (!open) return null

  function closeModal() {
    if (importing) return
    resetModal()
    onClose()
  }

  function resetModal() {
    setFileName('')
    setItems([])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function downloadTemplate() {
    const rows: Array<Array<string | number | boolean>> = [
      [...CSV_HEADERS],
      [
        'Paneer Tikka',
        'Starters & Appetizers',
        'Smoky paneer tikka served with mint chutney',
        100,
        110,
        true,
        true,
        '1 Plate',
        50,
        'PANEER-TIKKA-01',
        'https://example.com/paneer-tikka.jpg',
        '996331',
        'TAX_INCLUSIVE',
        '2026-12-31',
        '',
        '',
        '',
        '',
      ],
      [
        'Veg Pizza',
        'Pizzas & Pasta',
        'Fresh vegetable pizza with three sizes',
        120,
        135,
        true,
        true,
        '1 Pizza',
        30,
        'VEG-PIZZA-01',
        'https://example.com/veg-pizza.jpg',
        '996331',
        'TAX_INCLUSIVE',
        '2026-12-31',
        'Small|Medium|Large',
        '120|170|220',
        '135|190|245',
        'Medium',
      ],
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'crave-menu-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setItems([])
    setError('')
    setFileName(file?.name || '')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('The CSV file must be smaller than 2 MB.')
      return
    }
    try {
      const parsedItems = rowsToItems(parseCsv(await file.text()))
      if (parsedItems.length > 500)
        throw new Error('A single import can contain at most 500 items.')
      setItems(parsedItems)
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Unable to read this CSV file.')
    }
  }

  async function importItems() {
    if (items.length === 0) return
    setImporting(true)
    setError('')
    try {
      const response = await fetch('/api/menu-items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ restaurant_id: restaurantId, items }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to import the menu.')
      await onImported()
      resetModal()
      onClose()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import the menu.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-menu-import-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-[#18201c] shadow-2xl dark:border-[#27342d] dark:bg-[#18201c] dark:text-white">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4 dark:border-[#27342d]">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447]">
              Bulk menu import
            </span>
            <h2 id="bulk-menu-import-title" className="mt-1 text-xl font-black">
              Import dishes for {restaurantName}
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">
              Upload up to 500 dishes. The whole file is validated before anything is saved.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={importing}
            aria-label="Close bulk import"
            className="grid size-9 place-items-center rounded-full bg-stone-100 text-stone-500 dark:bg-[#121815] dark:text-gray-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-[#86a018]/50 bg-[#d9f447]/10 p-5 text-center">
          <FileSpreadsheet className="mx-auto size-9 text-[#6f840f] dark:text-[#d9f447]" />
          <p className="mt-2 text-sm font-extrabold">Start with the official CSV template</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-gray-400">
            Restaurant price is the MRP/restaurant amount. Keep column names unchanged; variant
            lists use the | separator.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-[#86a018] bg-white px-4 py-2 text-xs font-bold text-[#65780d] dark:bg-[#121815] dark:text-[#d9f447]"
            >
              <Download className="size-4" /> Download template
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#18201c] px-4 py-2 text-xs font-bold text-white dark:bg-[#d9f447] dark:text-[#18201c]"
            >
              <Upload className="size-4" /> Choose CSV file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => void handleFile(event)}
              className="hidden"
            />
          </div>
        </div>

        {fileName && (
          <div className="mt-4 rounded-xl border border-stone-200 p-3 text-xs dark:border-[#27342d]">
            <p className="font-bold">{fileName}</p>
            {items.length > 0 && (
              <p className="mt-1 text-emerald-600 dark:text-emerald-400">
                Ready to import {items.length} menu item{items.length === 1 ? '' : 's'}.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-stone-200 pt-4 dark:border-[#27342d]">
          <button
            type="button"
            onClick={closeModal}
            disabled={importing}
            className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold dark:border-[#27342d]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importItems()}
            disabled={items.length === 0 || importing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d9f447] px-5 py-2 text-xs font-black text-[#18201c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="size-4" />
            {importing ? 'Importing…' : `Import ${items.length || ''} items`}
          </button>
        </div>
      </div>
    </div>
  )
}
