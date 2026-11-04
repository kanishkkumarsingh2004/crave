/**
 * Shared currency formatting utilities.
 * Consolidates duplicate INR money formatting that was previously
 * inlined as `toLocaleString('en-IN')` across server and client code.
 */

export function money(
  value: unknown,
  options?: {
    maximumFractionDigits?: number
    minimumFractionDigits?: number
  }
): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(Number(value || 0))
}

export function moneyRaw(
  value: unknown,
  options?: {
    maximumFractionDigits?: number
    minimumFractionDigits?: number
  }
): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
  }).format(Number(value || 0))
}
