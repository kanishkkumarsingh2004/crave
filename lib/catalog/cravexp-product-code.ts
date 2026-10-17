export interface CraveXPSkuInput {
  name: string
  category: string
  unit: string
  barcode?: string | null
}

function skuToken(value: string, fallback: string, length: number) {
  const token = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, length)

  return token || fallback
}

function stableCode(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(5, '0').slice(-5)
}

/** Generates the same human-readable, deterministic SKU in the UI and API. */
export function generateCraveXPSku({ name, category, unit, barcode }: CraveXPSkuInput) {
  const normalizedBarcode = barcode?.trim().replace(/\s+/g, '') || ''
  const fingerprint = [name.trim(), category.trim(), unit.trim(), normalizedBarcode].join('|')

  return [
    'XP',
    skuToken(category, 'GEN', 6),
    skuToken(name, 'ITEM', 12),
    skuToken(unit, 'UNIT', 6),
    stableCode(fingerprint),
  ].join('-')
}

export function normalizeCraveXPBarcode(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
}
