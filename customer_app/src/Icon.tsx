import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Languages,
  LogOut,
  MapPin,
  Minus,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  User,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'

export type IconName =
  | 'home'
  | 'search'
  | 'orders'
  | 'cart'
  | 'user'
  | 'pin'
  | 'star'
  | 'clock'
  | 'back'
  | 'plus'
  | 'minus'
  | 'bell'
  | 'settings'
  | 'logout'
  | 'chevron'
  | 'close'
  | 'check'
  | 'download'
  | 'refresh'
  | 'wallet'
  | 'tag'
  | 'utensils'
  | 'truck'
  | 'language'
  | 'help'
  | 'phone'
  | 'store'
  | 'heart'
  | 'share'

/** Every icon in the app comes from Lucide, so the set stays consistent. */
const icons: Record<IconName, LucideIcon> = {
  home: Home,
  search: Search,
  orders: Receipt,
  cart: ShoppingCart,
  user: User,
  pin: MapPin,
  star: Star,
  clock: Clock,
  back: ChevronLeft,
  plus: Plus,
  minus: Minus,
  bell: Bell,
  settings: Settings,
  logout: LogOut,
  chevron: ChevronRight,
  close: X,
  check: Check,
  download: Download,
  refresh: RefreshCw,
  wallet: Wallet,
  tag: Tag,
  utensils: Utensils,
  truck: Truck,
  language: Languages,
  help: HelpCircle,
  phone: Phone,
  store: Store,
  heart: Heart,
  share: Share2,
}

export function Icon({
  name,
  strokeWidth = 1.8,
  ...props
}: { name: IconName } & React.SVGProps<SVGSVGElement>) {
  const Glyph = icons[name]
  return <Glyph strokeWidth={strokeWidth} aria-hidden="true" {...props} />
}

export { Globe }
