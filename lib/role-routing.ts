/**
 * Centralized role-based routing helpers to ensure consistent navigation
 * across customer views, vendor consoles, rider cockpit, and admin dashboard.
 */

export function getRoleDashboardPath(role?: string | null): string {
  const normalized = (role || '').toString().toLowerCase().trim()
  switch (normalized) {
    case 'customer':
    case 'user':
      return '/user/dashboard'
    case 'restaurant_vendor':
    case 'vendor':
      return '/vendor/dashboard'
    case 'cravexp_store_vendor':
      return '/vendor/crave-ep'
    case 'rider':
    case 'driver':
      return '/driver/dashboard'
    case 'admin':
      return '/admin/dashboard'
    default:
      return '/'
  }
}

export function isCustomerRole(role?: string | null): boolean {
  const normalized = (role || '').toString().toLowerCase().trim()
  return normalized === 'customer' || normalized === 'user'
}
