export interface MenuPricingSettings {
  commercialModel?: string | null
  commissionRate?: number | string | null
  markupRate?: number | string | null
  fixedCommission?: number | string | null
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
  const commissionRate = nonNegativeNumber(settings.commissionRate)
  const markupRate = nonNegativeNumber(settings.markupRate)
  const fixedCommission = nonNegativeNumber(settings.fixedCommission)
  const fixedMarkup = nonNegativeNumber(settings.fixedMarkup)
  const rate =
    commercialModel === 'commission'
      ? commissionRate
      : commercialModel === 'markup'
        ? markupRate
        : commissionRate + markupRate
  const fixed =
    commercialModel === 'commission'
      ? fixedCommission
      : commercialModel === 'markup'
        ? fixedMarkup
        : fixedCommission + fixedMarkup

  return Math.ceil(basePrice + (basePrice * rate) / 100 + fixed)
}
