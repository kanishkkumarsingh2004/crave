export interface MenuPricingSettings {
  commercialModel?: string | null
  markupRate?: number | string | null
  fixedMarkup?: number | string | null
}

function nonNegativeNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function calculateMenuAppPrice(
  restaurantPrice: number,
  settings: MenuPricingSettings
): number {
  const basePrice = Math.max(0, Math.round(restaurantPrice))
  const commercialModel = String(settings.commercialModel || 'commission').toLowerCase()
  if (commercialModel !== 'markup' && commercialModel !== 'hybrid') return basePrice

  const markupRate = nonNegativeNumber(settings.markupRate)
  const fixedMarkup = nonNegativeNumber(settings.fixedMarkup)
  return Math.ceil(basePrice + (basePrice * markupRate) / 100 + fixedMarkup)
}
