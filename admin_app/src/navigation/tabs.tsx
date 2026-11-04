/**
 * Admin app navigation: tab types, icon registry, and the shared Icon component.
 */

import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Download,
  Home,
  IndianRupee,
  Languages,
  ListOrdered,
  Lock,
  LogOut,
  Package,
  RefreshCw,
  Settings,
  Store,
  Truck,
  Users,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'

export type Tab =
  'overview' | 'orders' | 'payments' | 'drivers' | 'partners' | 'xp-store' | 'settings'

export type IconName =
  | 'home'
  | 'orders'
  | 'store'
  | 'settings'
  | 'refresh'
  | 'wifi'
  | 'offline'
  | 'download'
  | 'logout'
  | 'users'
  | 'money'
  | 'bell'
  | 'package'
  | 'camera'
  | 'lock'
  | 'chevron'
  | 'language'
  | 'truck'
  | 'close'
  | 'check'

/** Every icon in the app comes from Lucide, so the set stays consistent. */
export const icons: Record<IconName, LucideIcon> = {
  home: Home,
  orders: ListOrdered,
  store: Store,
  settings: Settings,
  refresh: RefreshCw,
  wifi: Wifi,
  offline: WifiOff,
  download: Download,
  logout: LogOut,
  users: Users,
  money: IndianRupee,
  bell: Bell,
  package: Package,
  camera: Camera,
  lock: Lock,
  chevron: ChevronRight,
  language: Languages,
  close: X,
  check: Check,
  truck: Truck,
}

export function Icon({ name }: { name: IconName }) {
  const Glyph = icons[name]
  return <Glyph strokeWidth={1.8} aria-hidden="true" />
}
