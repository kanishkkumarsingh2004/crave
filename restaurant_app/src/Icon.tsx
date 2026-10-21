import {
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Download,
  Home,
  Languages,
  ListOrdered,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Store,
  Trash2,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'orders'
  | 'menu'
  | 'sales'
  | 'settings'
  | 'bell'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'close'
  | 'logout'
  | 'store'
  | 'clock'
  | 'check'
  | 'edit'
  | 'trash'
  | 'wifi'
  | 'offline'
  | 'download'
  | 'chevron'
  | 'language'

/** Every icon in the app comes from Lucide, so the set stays consistent. */
const icons: Record<IconName, LucideIcon> = {
  home: Home,
  orders: ListOrdered,
  menu: Menu,
  sales: BarChart3,
  settings: Settings,
  bell: Bell,
  plus: Plus,
  refresh: RefreshCw,
  search: Search,
  close: X,
  logout: LogOut,
  store: Store,
  clock: Clock,
  check: Check,
  edit: Pencil,
  trash: Trash2,
  wifi: Wifi,
  offline: WifiOff,
  download: Download,
  chevron: ChevronRight,
  language: Languages,
}

export function Icon({
  name,
  strokeWidth = 1.8,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const Glyph = icons[name]
  return <Glyph strokeWidth={strokeWidth} aria-hidden="true" {...props} />
}
