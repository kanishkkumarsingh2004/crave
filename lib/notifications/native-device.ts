export type NativeAppRole = 'customer' | 'restaurant' | 'driver' | 'admin'

export function appRoleForUser(role: string): NativeAppRole | null {
  if (role === 'user' || role === 'customer') return 'customer'
  if (role === 'restaurant_vendor' || role === 'cravexp_store_vendor' || role === 'vendor') {
    return 'restaurant'
  }
  if (role === 'rider' || role === 'driver') return 'driver'
  if (role === 'admin') return 'admin'
  return null
}
