/**
 * Customer-specific formatting helpers (not shared across apps).
 */

export const rupees = (value: number) => {
  const amount = Number(value) || 0
  return `₹${amount % 1 === 0 ? amount : amount.toFixed(2)}`
}

export const RESTAURANT_FALLBACK_COUNT = 5
