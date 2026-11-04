/**
 * Navigation tab types and helpers for the customer app.
 */

export type Tab = 'home' | 'xp' | 'search' | 'orders' | 'cart' | 'account'

export const SWIPE_TABS: Tab[] = ['home', 'xp', 'orders', 'cart', 'account']

/** Full ordered list used to derive slide direction for any tab change. */
export const TAB_ORDER: Tab[] = ['home', 'search', 'xp', 'orders', 'cart', 'account']

export function getDirection(from: Tab, to: Tab): 'next' | 'prev' | null {
  const fromIdx = TAB_ORDER.indexOf(from)
  const toIdx = TAB_ORDER.indexOf(to)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null
  return toIdx > fromIdx ? 'next' : 'prev'
}
