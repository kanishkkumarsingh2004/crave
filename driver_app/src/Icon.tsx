import {
  Bell,
  Bike,
  Check,
  ChevronRight,
  Clock,
  Contrast,
  CreditCard,
  Download,
  Home,
  Languages,
  ListChecks,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  User,
  Wallet,
  Wifi,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'trips'
  | 'wallet'
  | 'user'
  | 'bell'
  | 'bike'
  | 'pin'
  | 'navigation'
  | 'phone'
  | 'clock'
  | 'check'
  | 'refresh'
  | 'download'
  | 'logout'
  | 'wifi'
  | 'offline'
  | 'chevron'
  | 'shield'
  | 'card'
  | 'close'
  | 'theme'
  | 'language'

/** Every icon in the app comes from Lucide, so the set stays consistent. */
const icons: Record<IconName, LucideIcon> = {
  home: Home,
  trips: ListChecks,
  wallet: Wallet,
  user: User,
  bell: Bell,
  bike: Bike,
  pin: MapPin,
  navigation: Navigation,
  phone: Phone,
  clock: Clock,
  check: Check,
  refresh: RefreshCw,
  download: Download,
  logout: LogOut,
  wifi: Wifi,
  offline: WifiOff,
  chevron: ChevronRight,
  shield: Shield,
  card: CreditCard,
  close: X,
  theme: Contrast,
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
