/**
 * Shared formatting utilities for all Crave mobile applications.
 * Consolidates duplicate money, short-id, date, and label formatting
 * that previously existed in admin_app, driver_app, restaurant_app,
 * and customer_app.
 */

export function money(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function shortId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function label(value = ''): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function formatStatus(status: string, labels: Record<string, string>): string {
  return labels[status] || status.replaceAll('_', ' ')
}
