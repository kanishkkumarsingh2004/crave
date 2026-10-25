'use client'

import CraveLogo from '@/components/CraveLogo'
import CraveXPDeliveryIllustration from '@/components/illustrations/CraveXPDeliveryIllustration'
import InvoiceModal, { InvoiceOrderData } from '@/components/InvoiceModal'
import NotificationSettingsCard from '@/components/NotificationSettingsCard'
import ThemeSelector from '@/components/ThemeSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { CraveButtonLoader, CraveSpinner } from '@/components/ui/ModernPreloader'
import { apiFetch } from '@/lib/client/api-fetch'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { getCachedLocation } from '@/lib/client-location'
import { useToast } from '@/lib/toast-context'
import { useApprovalUpdates, useDriverLocation, useOrderUpdates } from '@/lib/websocket'
import {
  getOrderStatusNotification,
  showBrowserNotification,
} from '@/lib/notifications/web-notification'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  HelpCircle,
  History,
  Home,
  KeyRound,
  Leaf,
  Loader2,
  LocateFixed,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Minus,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Sun,
  Tag,
  Trash2,
  User,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
const AddressModal = dynamic(() => import('@/components/AddressModal'), {
  ssr: false,
})

import { Coupon, fetchCoupons, validateCoupon } from '@/lib/coupons'
import { calculateCheckoutPricing, calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { loadPaymentConfig } from '@/lib/payment-config'

const LiveDriverMap = dynamic(() => import('@/components/LiveDriverMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-72 w-full rounded-2xl bg-[#121815] border border-[#27342d] flex flex-col items-center justify-center gap-3 text-xs text-[#9eb3a4] font-bold">
      <CraveSpinner size="lg" variant="crave" />
      <span className="tracking-wider uppercase text-[11px] text-white">
        Connecting Live Rider GPS Map...
      </span>
    </div>
  ),
})

type Restaurant = {
  id: string
  name: string
  cuisine: string
  rating: string
  ratingCount: string
  eta: string
  distance: string
  costForTwo: string
  image: string
  tag: string
  address: string
  offer?: string
  isPureVeg?: boolean
  latitude?: number | string | null
  longitude?: number | string | null
  isOpen?: boolean
}

type MenuItemVariant = {
  id: string
  name: string
  price: number
  inStock: boolean
  isDefault: boolean
}

type MenuItem = {
  id: string
  menuItemId?: string
  name: string
  detail: string
  price: number
  image: string
  veg: boolean
  restaurantName?: string
  restaurantId?: string
  vendorId?: string
  restaurantLat?: number
  restaurantLng?: number
  variantId?: string
  variantName?: string
  variants?: MenuItemVariant[]
}

type CartItem = MenuItem & {
  qty: number
}

type CustomerAddress = {
  id: string
  label: string
  address: string
  tag: string
  lat: number | null
  lng: number | null
}

interface LatLngCoords {
  lat: number
  lng: number
}

interface ConflictModalState {
  open: boolean
  currentRest: string
  newRest: string
  newItem: MenuItem | null
}

interface VerifyingModalState {
  open: boolean
  timer: number
  orderId: string
  status: 'verifying' | 'verified' | 'rejected'
}

type PastOrder = {
  id: string
  restaurantName: string
  restaurantImage: string
  items: Array<{ name: string; qty: number; price: number; variantName?: string }>
  subtotal: number
  discount: number
  total: number
  couponCode?: string
  date: string
  time: string
  status: 'Delivered' | 'Cancelled' | 'In Progress'
  deliveryTime: string
  trackStep?: number
  otp?: string
  driverName?: string
  driverPhone?: string
}

type CheckoutConfig = {
  merchantVpa: string
  deliveryFee: number
  handlingFee: number
  freeDeliveryThreshold: number
  gstRate: number
}

const categoryList = [
  {
    id: 'All',
    label: 'All Cravings',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Biryani',
    label: 'Dum Biryani',
    image:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Pizza',
    label: 'Artisanal Pizza',
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'North Indian',
    label: 'North Indian',
    image:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Burgers',
    label: 'Gourmet Burgers',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Starters',
    label: 'Asian Momos',
    image:
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Chinese',
    label: 'Wok & Chinese',
    image:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Pasta',
    label: 'Italian Pasta',
    image:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'South Indian',
    label: 'South Indian',
    image:
      'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Healthy',
    label: 'Healthy Bowls',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Wraps',
    label: 'Wraps & Rolls',
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Kebabs',
    label: 'Tandoor & Kebabs',
    image:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Chaat',
    label: 'Street Chaat',
    image:
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Chicken',
    label: 'Crispy Chicken',
    image:
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Sandwich',
    label: 'Gourmet Subs',
    image:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Desserts',
    label: 'Cakes & Treats',
    image:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Ice Cream',
    label: 'Ice Creams',
    image:
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Beverages',
    label: 'Brews & Shakes',
    image:
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Coffee',
    label: 'Specialty Coffee',
    image:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Thali',
    label: 'Royal Thalis',
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80',
  },
]

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  All: [],
  Biryani: ['biryani', 'hyderabadi', 'mughlai', 'rice'],
  Pizza: ['pizza', 'italian', 'crust', 'woodfired'],
  'North Indian': ['north indian', 'punjabi', 'curry', 'roti', 'dal'],
  Burgers: ['burger', 'burgers', 'american', 'fast food', 'slider'],
  Starters: ['momo', 'momos', 'dimsum', 'starter', 'starters', 'appetizer', 'asian'],
  Chinese: ['chinese', 'noodle', 'noodles', 'manchurian', 'wok', 'asian', 'fried rice'],
  Pasta: ['pasta', 'italian', 'spaghetti', 'lasagna', 'penne'],
  'South Indian': ['south indian', 'dosa', 'idli', 'vada', 'filter coffee', 'udupi'],
  Healthy: ['healthy', 'salad', 'bowl', 'diet', 'fit', 'organic', 'vegan'],
  Wraps: ['wrap', 'wraps', 'roll', 'rolls', 'shawarma', 'frankie'],
  Kebabs: ['kebab', 'kebabs', 'tandoor', 'tandoori', 'grill', 'bbq', 'tikka'],
  Chaat: ['chaat', 'street', 'pani puri', 'samosa', 'bhel', 'snack'],
  Chicken: ['chicken', 'crispy', 'wings', 'fried chicken', 'poultry'],
  Sandwich: ['sandwich', 'sandwiches', 'sub', 'subs', 'toast', 'panini', 'cafe'],
  Desserts: ['dessert', 'desserts', 'cake', 'sweet', 'bakery', 'pastry', 'waffle'],
  'Ice Cream': ['ice cream', 'gelato', 'sundae', 'kulfi', 'dessert'],
  Beverages: ['beverage', 'beverages', 'drink', 'drinks', 'shake', 'smoothie', 'juice', 'soda'],
  Coffee: ['coffee', 'cafe', 'latte', 'espresso', 'cappuccino', 'cold brew'],
  Thali: ['thali', 'combo', 'meal', 'meals', 'platter', 'indian'],
}

export default function CustomerDashboard({
  initialTab = 'explore',
  initialOrderId,
}: {
  initialTab?: 'explore' | 'live-order' | 'orders' | 'profile' | 'help'
  initialOrderId?: string
}) {
  const { user, logout, updateUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const currentTabFromPath = useMemo(() => {
    if (pathname.includes('/user/help')) return 'help'
    if (pathname.includes('/user/track')) return 'live-order'
    if (initialOrderId || pathname.match(/\/user\/orders\/[^\/]+/)) return 'live-order'
    if (pathname.includes('/user/orders')) return 'orders'
    if (pathname.includes('/user/profile')) return 'profile'
    if (pathname.includes('/user/explore')) return 'explore'
    return initialTab
  }, [pathname, initialTab, initialOrderId])

  const [activeTab, setActiveTab] = useState(currentTabFromPath)

  useEffect(() => {
    setActiveTab(currentTabFromPath)
  }, [currentTabFromPath])

  const navigateToTab = (tab: 'explore' | 'live-order' | 'orders' | 'profile' | 'help') => {
    setActiveTab(tab)
    if (tab === 'explore') router.push('/user/explore')
    else if (tab === 'live-order') router.push('/user/track')
    else if (tab === 'orders') router.push('/user/orders')
    else if (tab === 'profile') router.push('/user/profile')
    else if (tab === 'help') router.push('/user/help')
  }

  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollYRef = useRef(0)

  // Auto-hide top header banner on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY
          if (currentY < 30) {
            setHeaderVisible(true)
          } else if (currentY > lastScrollYRef.current + 10) {
            setHeaderVisible(false)
          } else if (currentY < lastScrollYRef.current - 10) {
            setHeaderVisible(true)
          }
          lastScrollYRef.current = currentY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Filter Toggles
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)

  // Help & Support Section State
  const [helpSearchQuery, setHelpSearchQuery] = useState('')
  const [openFaqId, setOpenFaqId] = useState<string | null>('cancellation-policy')

  // Cart & Menu State
  const [cart, setCart] = useState<Array<CartItem>>([])
  const [menuItemsList, setMenuItemsList] = useState<Array<MenuItem>>([])
  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null)
  const [variantPickerSelection, setVariantPickerSelection] = useState('')
  const [restaurantsList, setRestaurantsList] = useState<Array<Restaurant>>([])
  const [showMobileSideMenu, setShowMobileSideMenu] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [pastOrders, setPastOrders] = useState<Array<PastOrder>>([])
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false)
  const isSubmittingCheckoutRef = useRef(false)
  const checkoutIdempotencyKeyRef = useRef<string | null>(null)

  // Creative Hero Carousel State
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [heroAutoplayPaused, setHeroAutoplayPaused] = useState(false)
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null)

  useEffect(() => {
    if (heroAutoplayPaused) return
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % 3)
    }, 5500)
    return () => clearInterval(timer)
  }, [heroAutoplayPaused])

  useEffect(() => {
    if (showMobileSideMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMobileSideMenu])

  useEffect(() => {
    const handleToggleSidebar = () => {
      setShowMobileSideMenu((prev) => !prev)
    }
    window.addEventListener('toggle-mobile-sidebar', handleToggleSidebar)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggleSidebar)
  }, [])

  const { items: globalCartItems, setItems: setGlobalItems, isLoaded: globalCartLoaded } = useCart()
  const [isCartInitialized, setIsCartInitialized] = useState(false)

  // Sync initial cart state from CartProvider / localStorage on mount
  useEffect(() => {
    if (!isCartInitialized) {
      if (globalCartItems.length > 0) {
        setCart(globalCartItems as CartItem[])
        setIsCartInitialized(true)
      } else if (globalCartLoaded) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('crave_cart') : null
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCart(parsed)
            }
          } catch {}
        }
        setIsCartInitialized(true)
      }
    }
  }, [globalCartItems, globalCartLoaded, isCartInitialized])

  // Sync local cart updates to CartContext once initialized
  useEffect(() => {
    if (isCartInitialized) {
      setGlobalItems(
        cart.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
          detail: item.detail,
          image: item.image,
          veg: item.veg,
          restaurantName: item.restaurantName,
          restaurantId: item.restaurantId,
          vendorId: item.vendorId,
          restaurantLat: item.restaurantLat,
          restaurantLng: item.restaurantLng,
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          variantName: item.variantName,
          variants: item.variants,
        }))
      )
    }
  }, [cart, isCartInitialized, setGlobalItems])

  // Fetch Live Restaurants / Vendors from local DB
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        let parsed: Array<Restaurant> = []
        const res = await fetch('/api/restaurants', { cache: 'no-store' })
        const json = await res.json()
        const restData = json.restaurants || []

        if (restData.length > 0) {
          parsed = restData
            .filter((r: any) => r.id !== 'cravexp_dark_store_01' && !r.is_dark_store)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              cuisine: r.cuisine ?? '',
              rating: r.rating != null ? String(r.rating) : '4.5',
              ratingCount: r.rating_count != null ? Number(r.rating_count).toLocaleString() : '',
              eta: r.delivery_minutes != null ? `${r.delivery_minutes} min` : '25 min',
              distance: r.distance ? String(r.distance) : '',
              costForTwo: r.cost_for_two != null ? `₹${r.cost_for_two} for two` : '',
              image:
                r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
              tag: r.cuisine?.split(' ')[0] ?? '',
              address: r.address ?? '',
              offer: r.offer ? String(r.offer) : undefined,
              isPureVeg: r.is_pure_veg ?? false,
              isOpen: r.is_open ?? true,
              latitude: r.latitude != null ? Number(r.latitude) : undefined,
              longitude: r.longitude != null ? Number(r.longitude) : undefined,
            }))
        }
        setRestaurantsList(parsed)
      } catch (err) {
        setRestaurantsList([])
      }
    }
    fetchRestaurants()
  }, [])

  // Fetch Live Menu Items from local DB
  useEffect(() => {
    async function fetchLiveMenuItems() {
      try {
        if (!selectedRestaurant) {
          setMenuItemsList([])
          return
        }
        const res = await fetch(`/api/menu-items?restaurantId=${selectedRestaurant.id}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        const menuData = json.items || []

        if (menuData.length > 0) {
          const parsed: Array<MenuItem> = menuData.map((item: any) => ({
            id: item.id,
            name: item.name,
            detail: item.description || '',
            price: Number(item.price) || 0,
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            veg: Boolean(item.is_veg ?? true),
            restaurantName: selectedRestaurant?.name || 'Partner Kitchen',
            restaurantId: selectedRestaurant?.id || item.restaurant_id || item.restaurantId,
            vendorId: selectedRestaurant?.id || item.restaurant_id || item.restaurantId,
            variants: Array.isArray(item.variants)
              ? item.variants
                  .filter((variant: any) => variant.in_stock !== false)
                  .map((variant: any) => ({
                    id: variant.id,
                    name: variant.name,
                    price: Number(variant.price) || 0,
                    inStock: variant.in_stock !== false,
                    isDefault: variant.is_default === true,
                  }))
              : [],
          }))
          setMenuItemsList(parsed)
        } else {
          setMenuItemsList([])
        }
      } catch (err) {
        console.error('Error fetching live menu items:', err)
        setMenuItemsList([])
      }
    }

    fetchLiveMenuItems()
  }, [selectedRestaurant?.id, selectedRestaurant?.name, restaurantsList])

  const [ordersData, setOrdersData] = useState<Array<any>>([])

  // WebSocket provides live updates; initial fetch on mount
  useEffect(() => {
    if (!user?.id) return
    async function fetchInitialOrders() {
      try {
        const res = await fetch(`/api/orders?customerId=${user!.id}`)
        const json = await res.json()
        if (json.success && Array.isArray(json.orders)) {
          json.orders.forEach((o: any) => {
            if (o?.id && o?.status) {
              prevStatusesRef.current.set(o.id, o.status)
            }
          })
          setOrdersData(json.orders)
        }
      } catch (e) {}
    }
    fetchInitialOrders()
  }, [user?.id])

  // Live order updates via WebSocket with notifications
  const prevStatusesRef = useRef<Map<string, string>>(new Map())

  useOrderUpdates(user?.id, (orders) => {
    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        if (!o || !o.id) return
        const prevStatus = prevStatusesRef.current.get(o.id)
        if (prevStatus && prevStatus !== o.status) {
          const notif = getOrderStatusNotification(o)
          if (notif) {
            void showBrowserNotification({
              title: notif.title,
              body: notif.body,
              tag: `order-${o.id}`,
              sound: true,
            })
            triggerToast(`${notif.title} — ${notif.body}`)
          }
        }
        if (o.status) {
          prevStatusesRef.current.set(o.id, o.status)
        }
      })
    }
    setOrdersData(orders)
  })

  // Parse ordersData into PastOrder[] whenever it changes
  useEffect(() => {
    const statusMap: Record<string, PastOrder['status']> = {
      completed: 'Delivered',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      new: 'In Progress',
      preparing: 'In Progress',
      ready: 'In Progress',
      accepted: 'In Progress',
      out_for_delivery: 'In Progress',
    }

    const parsed: Array<PastOrder> = ordersData.map((o: any) => {
      let itemsArr: { name: string; qty: number; price: number }[] = []
      try {
        const raw = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        if (Array.isArray(raw))
          itemsArr = raw.map((i: any) => ({
            name: i.name,
            qty: i.qty ?? 1,
            price: i.price ?? 0,
          }))
      } catch {}

      const rawDate = o.createdAt || o.created_at
      return {
        id: o.id,
        restaurantName: o.restaurant_name ?? o.restaurantName ?? 'Crave Kitchen Store',
        restaurantImage: '',
        items: itemsArr,
        subtotal: Number(o.subtotal ?? 0),
        discount: Number(o.discount_amount ?? 0),
        total: Number(o.total_amount ?? 0),
        date: rawDate
          ? new Date(rawDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '',
        time: rawDate
          ? new Date(rawDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        status: statusMap[o.status] ?? 'In Progress',
        deliveryTime: '',
        driverName: o.driver_name || undefined,
        driverPhone: o.driver_phone || undefined,
      }
    })
    setPastOrders(parsed)
  }, [ordersData])

  // Saved Addresses State & GPS Map Picker
  const [savedAddresses, setSavedAddresses] = useState<Array<CustomerAddress>>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedMapPin, setSelectedMapPin] = useState<LatLngCoords | null>(null)

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setSavedAddresses([])
      return
    }
    try {
      const res = await fetch('/api/user/addresses')
      if (res.ok) {
        const json = await res.json()
        if (json.addresses && Array.isArray(json.addresses) && json.addresses.length > 0) {
          const mapped = json.addresses.map((row: any) => ({
            id: row.id,
            label: row.label,
            address: row.address,
            tag: row.is_default ? 'Primary' : row.label,
            lat: row.latitude == null ? null : Number(row.latitude),
            lng: row.longitude == null ? null : Number(row.longitude),
            isDefault: Boolean(row.is_default),
          }))
          setSavedAddresses(mapped)

          const primary = mapped.find((a: any) => a.isDefault) || mapped[0]
          const stored =
            typeof window !== 'undefined' ? localStorage.getItem('crave_selected_address') : null
          const chosen = stored || primary?.address || user?.address || ''

          if (chosen) {
            setDeliveryAddress(chosen)
            const matchedObj = mapped.find((a: any) => a.address === chosen) || primary
            if (matchedObj?.lat != null && matchedObj?.lng != null) {
              setSelectedMapPin({ lat: matchedObj.lat, lng: matchedObj.lng })
            } else {
              const cached = getCachedLocation()
              if (cached?.lat && cached?.lng) {
                setSelectedMapPin({ lat: cached.lat, lng: cached.lng })
              }
            }
          }
          return
        }
      }
    } catch (err) {}

    if (user?.address) {
      const cached = getCachedLocation()
      const fallbackLat = cached?.lat ?? 12.9716
      const fallbackLng = cached?.lng ?? 77.5946
      setSavedAddresses([
        {
          id: 'addr_default',
          label: 'Home',
          address: user.address,
          tag: 'Primary',
          lat: fallbackLat,
          lng: fallbackLng,
        },
      ])
      setDeliveryAddress((prev) => prev || user.address || '')
      setSelectedMapPin({ lat: fallbackLat, lng: fallbackLng })
    } else {
      const cached = getCachedLocation()
      if (cached?.lat && cached?.lng) {
        setSelectedMapPin({ lat: cached.lat, lng: cached.lng })
      } else {
        setSavedAddresses([])
      }
    }
  }, [user?.id, user?.address])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  // Profile editing
  const [editAddress, setEditAddress] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [profileNameInput, setProfileNameInput] = useState(user?.name || '')
  const [profilePhoneInput, setProfilePhoneInput] = useState(user?.phone || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  useEffect(() => {
    if (user?.name) setProfileNameInput(user.name)
    if (user?.phone) setProfilePhoneInput(user.phone)
  }, [user?.name, user?.phone])

  const updateDeliveryAddress = (addr: string) => {
    const trimmed = (addr || '').trim()
    setDeliveryAddress(trimmed)
    if (typeof window !== 'undefined' && trimmed) {
      try {
        localStorage.setItem('crave_selected_address', trimmed)
      } catch {}
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileNameInput.trim() || undefined,
          phone: profilePhoneInput.trim() || undefined,
          address: deliveryAddress.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update profile')
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('crave_user')
          if (raw) {
            const current = JSON.parse(raw)
            const updated = {
              ...current,
              name: profileNameInput.trim() || current.name,
              phone: profilePhoneInput.trim() || current.phone,
              address: deliveryAddress.trim() || current.address,
            }
            localStorage.setItem('crave_user', JSON.stringify(updated))
          }
        } catch {}
      }

      if (updateUser) {
        updateUser({
          name: profileNameInput.trim() || user?.name,
          phone: profilePhoneInput.trim() || user?.phone,
          address: deliveryAddress.trim() || user?.address,
        })
      }

      await loadAddresses()

      setEditAddress(false)
      triggerToast('Profile & contact details updated!')
    } catch (err: any) {
      triggerToast(err?.message || 'Could not save profile changes')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Password Management State & Handlers
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  async function handleChangePassword(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setPasswordFeedback(null)

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' })
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password cannot be the same as your current password.',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password')
      }

      setPasswordFeedback({
        type: 'success',
        message: 'Password updated successfully in database!',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      triggerToast('Password changed successfully!')
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err?.message || 'Failed to update password' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleDeleteSavedAddress(id: string, label: string) {
    try {
      const res = await fetch(`/api/user/addresses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSavedAddresses((prev) => prev.filter((a) => a.id !== id))
        triggerToast(`Address "${label}" deleted`)
      } else {
        triggerToast('Could not delete address')
      }
    } catch {
      triggerToast('Could not delete address')
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crave_selected_address')
      if (stored) {
        setDeliveryAddress(stored)
      } else if (user?.address) {
        setDeliveryAddress(user.address)
      }
    }
  }, [user?.address])

  // Coupon Engine State
  const [availableCoupons, setAvailableCoupons] = useState<Array<Coupon>>([])
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)

  // Payment State & Company UPI ID
  const [companyUpiId, setCompanyUpiId] = useState('')
  const [companyMerchantName, setCompanyMerchantName] = useState('')
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null)
  const [utrRef, setUtrRef] = useState('')
  const [utrError, setUtrError] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [liveDriverPos, setLiveDriverPos] = useState<LatLngCoords | null>(null)
  const [isDriverGpsStale, setIsDriverGpsStale] = useState<boolean>(false)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<InvoiceOrderData | null>(null)

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId)
    } else if (pathname === '/user/track' || pathname === '/user/dashboard') {
      setSelectedOrderId(undefined)
    }
  }, [initialOrderId, pathname])

  // Single order direct sync when navigating with selected/initial order ID
  useEffect(() => {
    if (!selectedOrderId || !user?.id) return
    const exists = ordersData.some((o: any) => String(o.id) === String(selectedOrderId))
    if (!exists) {
      fetch(`/api/orders?orderId=${encodeURIComponent(selectedOrderId)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.order) {
            setOrdersData((prev) => {
              if (prev.some((o: any) => String(o.id) === String(json.order.id))) return prev
              return [json.order, ...prev]
            })
          }
        })
        .catch(() => {})
    }
  }, [selectedOrderId, user?.id, ordersData])

  const inProgressOrders = useMemo(() => {
    if (!user?.id || !ordersData.length) return []
    return ordersData.filter(
      (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    )
  }, [user?.id, ordersData])

  // Subscribe to live driver location updates via WebSocket
  useDriverLocation(activeOrder?.id, (data: any) => {
    setLiveDriverPos({ lat: data.lat, lng: data.lng })
    setIsDriverGpsStale(Boolean(data.isStale))
  })

  // Set active order from WebSocket stream
  useEffect(() => {
    if (!user?.id || !ordersData.length) {
      setActiveOrder(null)
      setLiveDriverPos(null)
      setIsDriverGpsStale(false)
      return
    }

    const activeList = ordersData.filter(
      (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    )

    let active = null
    if (selectedOrderId) {
      active = ordersData.find((o: any) => String(o.id) === String(selectedOrderId))
    }
    if (!active && activeList.length > 0) {
      active = activeList[0]
    }

    if (active) {
      let statusStep = 1
      if (active.status === 'delivered' || active.status === 'completed') {
        statusStep = 4
      } else if (
        active.status === 'out_for_delivery' ||
        active.status === 'picked_up' ||
        active.status === 'arrived_customer'
      ) {
        statusStep = 3
      } else if (
        active.status === 'sent_to_vendor' ||
        active.status === 'accepted' ||
        active.status === 'preparing' ||
        active.status === 'cooking' ||
        active.status === 'packing' ||
        active.status === 'ready' ||
        active.status === 'ready_for_pickup' ||
        active.status === 'rider_assigned' ||
        active.status === 'at_restaurant' ||
        active.payment_status === 'verified'
      ) {
        statusStep = 2
      } else {
        statusStep = 1
      }

      const statusTextMap: Record<string, string> = {
        payment_submitted: 'Order Confirmed',
        payment_verified: 'Payment Verified',
        sent_to_vendor: 'Order Sent to Kitchen',
        accepted: 'Vendor Accepted Order',
        preparing: 'Kitchen Preparing Food',
        cooking: 'Chef Cooking Order',
        packing: 'Order Being Packed',
        ready: 'Food Ready for Pickup',
        ready_for_pickup: 'Food Ready for Pickup',
        rider_assigned: 'Rider Assigned & Ready for Pickup',
        at_restaurant: 'Rider Arrived at Kitchen',
        picked_up: 'Food Picked Up by Rider',
        out_for_delivery: 'Rider Out for Delivery',
        arrived_customer: 'Rider Arrived at Doorstep',
        delivered: 'Delivered to Doorstep',
        completed: 'Order Completed',
        cancelled: 'Order Cancelled',
      }
      const rawStatusStr = typeof active.status === 'string' ? active.status : ''
      const statusText =
        statusTextMap[rawStatusStr] || rawStatusStr.replace(/_/g, ' ') || 'Order Confirmed'

      let itemsArr: Array<CartItem> = []
      try {
        itemsArr = typeof active.items === 'string' ? JSON.parse(active.items) : active.items || []
      } catch (e) {}

      const rawDateVal =
        active.created_at || active.createdAt || active.timestamp || active.created_time
      let formattedTime = ''
      if (rawDateVal) {
        const d = new Date(rawDateVal)
        if (!isNaN(d.getTime())) {
          const timeStr = d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          const now = new Date()
          const isToday = d.toDateString() === now.toDateString()
          formattedTime = isToday
            ? timeStr
            : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`
        }
      }
      if (!formattedTime) {
        formattedTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      }

      setActiveOrder({
        id: active.id,
        restaurantName: active.restaurant_name || active.restaurantName || 'Crave Kitchen Store',
        items: itemsArr,
        subtotal: Number(active.subtotal || 0),
        total: Number(active.total_amount || 0),
        statusStep,
        statusText,
        rawStatus: active.status,
        // The code is only useful while the order is still on the way.
        otp: ['delivered', 'completed', 'cancelled'].includes(String(active.status))
          ? undefined
          : active.delivery_otp || active.deliveryOtp || undefined,
        otpConsumed: Boolean(active.otp_consumed_at),
        driverName: active.driver_name || null,
        driverPhone: active.driver_phone || null,
        driverLat: liveDriverPos?.lat ?? active.driver_lat ?? active.driver_latitude ?? null,
        driverLng: liveDriverPos?.lng ?? active.driver_lng ?? active.driver_longitude ?? null,
        restaurantLat: active.restaurant_lat ?? active.restaurant_latitude ?? null,
        restaurantLng: active.restaurant_lng ?? active.restaurant_longitude ?? null,
        customerLat: active.customer_lat ?? active.delivery_lat ?? active.latitude ?? null,
        customerLng: active.customer_lng ?? active.delivery_lng ?? active.longitude ?? null,
        timestamp: formattedTime,
        rawDate: rawDateVal || active.created_at || active.createdAt || new Date().toISOString(),
        paymentStatus: active.payment_status || 'pending',
      })
    } else {
      setActiveOrder(null)
    }
  }, [user?.id, ordersData, selectedOrderId, liveDriverPos])

  // Fetch Company UPI Config dynamically & listen for admin updates
  useEffect(() => {
    async function refreshPaymentConfig() {
      const cfg = await loadPaymentConfig()
      setCheckoutConfig({
        merchantVpa: cfg.upiVpa,
        deliveryFee: cfg.baseDeliveryFee,
        handlingFee: cfg.handlingFee,
        freeDeliveryThreshold: cfg.freeDeliveryThreshold,
        gstRate: cfg.gstRatePercent,
      })
      setCompanyUpiId(cfg.upiVpa)
      setCompanyMerchantName(cfg.merchantName)
    }
    refreshPaymentConfig()

    window.addEventListener('crave_payment_config_updated', refreshPaymentConfig)
    window.addEventListener('storage', refreshPaymentConfig)
    return () => {
      window.removeEventListener('crave_payment_config_updated', refreshPaymentConfig)
      window.removeEventListener('storage', refreshPaymentConfig)
    }
  }, [])

  // Notification Toast
  const { toast } = useToast()

  useEffect(() => {
    fetchCoupons().then((coupons) => {
      setAvailableCoupons(coupons.filter((c) => c.isActive))
    })
  }, [])

  function triggerToast(msg: string) {
    // Strip leading emoji/special chars for cleaner display; variant is auto-detected below.
    const clean = msg.replace(/^[^\w\s₹]+\s*/, '')
    const isError = /could not|failed|error|unable|invalid/i.test(clean)
    toast(clean, isError ? 'error' : 'success')
  }

  // 15-second cancellation window countdown
  const [cancelTimeRemaining, setCancelTimeRemaining] = useState<number>(0)

  useEffect(() => {
    if (!activeOrder?.rawDate) {
      setCancelTimeRemaining(0)
      return
    }

    const checkRemaining = () => {
      const orderCreatedTime = new Date(activeOrder.rawDate).getTime()
      if (isNaN(orderCreatedTime)) return 0
      const elapsedSeconds = Math.floor((Date.now() - orderCreatedTime) / 1000)
      return Math.max(0, 15 - elapsedSeconds)
    }

    setCancelTimeRemaining(checkRemaining())

    const interval = setInterval(() => {
      const rem = checkRemaining()
      setCancelTimeRemaining(rem)
      if (rem <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeOrder?.rawDate, activeOrder?.id])

  const [otpCopied, setOtpCopied] = useState<boolean>(false)

  const handleCopyOtp = (otp: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(otp)
      setOtpCopied(true)
      triggerToast('Delivery OTP copied to clipboard!')
      setTimeout(() => setOtpCopied(false), 2500)
    }
  }

  const handleCancelOrRemoveOrder = async (orderId: string) => {
    if (cancelTimeRemaining <= 0) {
      triggerToast('Cancellation window expired. Orders can only be cancelled within 15 seconds.')
      return
    }
    if (
      !window.confirm(
        `Are you sure you want to cancel this order? (${cancelTimeRemaining}s remaining to cancel)`
      )
    )
      return
    try {
      const res = await fetch(`/api/orders?orderId=${orderId}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setOrdersData((prev) => prev.filter((o) => o.id !== orderId))
        setActiveOrder(null)
        if (data.refundQueued) {
          triggerToast('Order cancelled! Refund submitted to the admin review queue.')
        } else {
          triggerToast('Order cancelled successfully.')
        }
      } else {
        triggerToast(data.error || 'Failed to cancel order')
      }
    } catch {
      triggerToast('Network error cancelling order')
    }
  }

  function handleCopyCompanyUpi() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(companyUpiId)
      triggerToast(`Copied UPI ID: ${companyUpiId}`)
    }
  }

  // Re-validate applied coupon whenever cart subtotal changes
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.qty, 0)
  }, [cart])

  const totalCartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0)
  }, [cart])

  useEffect(() => {
    if (!appliedCoupon) return
    const currentRestId = (cart[0] as any)?.restaurantId || (selectedRestaurant as any)?.id
    const res = validateCoupon(appliedCoupon.code, cartSubtotal, availableCoupons, currentRestId)
    if (res.valid) {
      setCouponDiscount(res.discountAmount)
    } else {
      setAppliedCoupon(null)
      setCouponDiscount(0)
    }
  }, [cartSubtotal, appliedCoupon, cart, selectedRestaurant])

  // State for Single-Restaurant Cart Conflict Modal
  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    open: false,
    currentRest: '',
    newRest: '',
    newItem: null,
  })

  // State for 3-Minute Payment Verification Window
  const [verifyingModal, setVerifyingModal] = useState<VerifyingModalState>({
    open: false,
    timer: 180,
    orderId: '',
    status: 'verifying',
  })

  // Cart Handlers
  function defaultVariantFor(item: MenuItem) {
    return (
      item.variants?.find((variant) => variant.isDefault && variant.inStock) ||
      item.variants?.find((variant) => variant.inStock)
    )
  }

  function menuItemDisplayPrice(item: MenuItem) {
    if (!item.variants?.length) return item.price
    const availablePrices = item.variants
      .filter((variant) => variant.inStock)
      .map((variant) => variant.price)
    return availablePrices.length > 0 ? Math.min(...availablePrices) : item.price
  }

  function openVariantPicker(item: MenuItem) {
    const defaultVariant = defaultVariantFor(item)
    setVariantPickerItem(item)
    setVariantPickerSelection(defaultVariant?.id || '')
  }

  function closeVariantPicker() {
    setVariantPickerItem(null)
    setVariantPickerSelection('')
  }

  function confirmVariantSelection() {
    if (!variantPickerItem) return
    const selectedVariant = variantPickerItem.variants?.find(
      (variant) => variant.id === variantPickerSelection
    )
    if (!selectedVariant?.inStock) {
      triggerToast('Please select a size before adding this item.')
      return
    }
    const item = variantPickerItem
    closeVariantPicker()
    addToCart(item, selectedVariant)
  }

  function addToCart(item: MenuItem, chosenVariant?: MenuItemVariant) {
    if (item.variants?.length && !chosenVariant) {
      openVariantPicker(item)
      return
    }
    const variant = chosenVariant
    const cartItem: MenuItem = {
      ...item,
      id: variant ? `${item.id}::${variant.id}` : item.id,
      menuItemId: item.menuItemId || item.id,
      price: variant?.price ?? item.price,
      variantId: variant?.id,
      variantName: variant?.name,
    }
    const itemRest = cartItem.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    const itemRestId = cartItem.restaurantId || cartItem.vendorId || selectedRestaurant?.id
    const itemRestLat =
      selectedRestaurant?.latitude != null
        ? Number(selectedRestaurant.latitude)
        : (cartItem as any)?.restaurantLat != null
          ? Number((cartItem as any).restaurantLat)
          : undefined
    const itemRestLng =
      selectedRestaurant?.longitude != null
        ? Number(selectedRestaurant.longitude)
        : (cartItem as any)?.restaurantLng != null
          ? Number((cartItem as any).restaurantLng)
          : undefined

    if (cart.length > 0) {
      const currentRest = cart[0].restaurantName || selectedRestaurant?.name || 'Kitchen Store'
      if (
        currentRest !== itemRest &&
        currentRest !== 'Kitchen Store' &&
        itemRest !== 'Kitchen Store'
      ) {
        setConflictModal({
          open: true,
          currentRest,
          newRest: itemRest,
          newItem: cartItem,
        })
        return
      }
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartItem.id)
      if (existing) {
        return prev.map((i) => (i.id === cartItem.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [
        ...prev,
        {
          ...cartItem,
          qty: 1,
          restaurantName: itemRest,
          restaurantId: itemRestId,
          vendorId: itemRestId,
          restaurantLat: itemRestLat,
          restaurantLng: itemRestLng,
        },
      ]
    })
    triggerToast(`Added ${item.name}${variant ? ` (${variant.name})` : ''} to cart!`)
  }

  function handleResolveConflictClear() {
    if (!conflictModal.newItem) return
    const item = conflictModal.newItem
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    const itemRestId = item.restaurantId || item.vendorId || selectedRestaurant?.id
    const itemRestLat =
      selectedRestaurant?.latitude != null
        ? Number(selectedRestaurant.latitude)
        : (item as any)?.restaurantLat != null
          ? Number((item as any).restaurantLat)
          : undefined
    const itemRestLng =
      selectedRestaurant?.longitude != null
        ? Number(selectedRestaurant.longitude)
        : (item as any)?.restaurantLng != null
          ? Number((item as any).restaurantLng)
          : undefined

    setCart([
      {
        ...item,
        qty: 1,
        restaurantName: itemRest,
        restaurantId: itemRestId,
        vendorId: itemRestId,
        restaurantLat: itemRestLat,
        restaurantLng: itemRestLng,
      },
    ])
    setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
    triggerToast(`Cart reset. Added ${item.name}!`)
  }

  function updateItemQty(id: string, delta: number) {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const newQty = item.qty + delta
              return newQty > 0 ? { ...item, qty: newQty } : null
            }
            return item
          })
          .filter(Boolean) as CartItem[]
    )
  }

  // Dynamic Road Distance & Admin Payment Config Pricing Engine
  const currentCartRestaurantId =
    selectedRestaurant?.id ||
    cart[0]?.restaurantId ||
    cart[0]?.vendorId ||
    (cart[0] as any)?.restaurant_id ||
    null

  const currentCartRestaurant = useMemo(() => {
    if (selectedRestaurant) return selectedRestaurant
    if (!currentCartRestaurantId) return null
    return restaurantsList.find((r) => r.id === currentCartRestaurantId) || null
  }, [selectedRestaurant, currentCartRestaurantId, restaurantsList])

  const activeRestaurantLat =
    currentCartRestaurant?.latitude != null
      ? Number(currentCartRestaurant.latitude)
      : (cart[0] as any)?.restaurantLat != null
        ? Number((cart[0] as any).restaurantLat)
        : null
  const activeRestaurantLng =
    currentCartRestaurant?.longitude != null
      ? Number(currentCartRestaurant.longitude)
      : (cart[0] as any)?.restaurantLng != null
        ? Number((cart[0] as any).restaurantLng)
        : null
  const activeDestLat = selectedMapPin?.lat ?? null
  const activeDestLng = selectedMapPin?.lng ?? null

  const calculatedRoadDistanceKm = useMemo(() => {
    return calculateRoadTravelDistanceKm(
      activeRestaurantLat,
      activeRestaurantLng,
      activeDestLat,
      activeDestLng
    )
  }, [activeRestaurantLat, activeRestaurantLng, activeDestLat, activeDestLng])

  const [calculatorApiBreakdown, setCalculatorApiBreakdown] = useState<any>(null)

  useEffect(() => {
    if (cart.length === 0) {
      setCalculatorApiBreakdown(null)
      return
    }
    let isMounted = true
    const restId =
      selectedRestaurant?.id ||
      cart[0]?.restaurantId ||
      cart[0]?.vendorId ||
      (cart[0] as any)?.restaurant_id ||
      undefined

    fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: cartSubtotal,
        distanceKm: calculatedRoadDistanceKm,
        restaurantId: restId,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.breakdown?.customerBilling) {
          setCalculatorApiBreakdown(data.breakdown.customerBilling)
        }
      })
      .catch((err) => {
        console.warn('Calculator API fetch failed in CustomerDashboard:', err)
      })

    return () => {
      isMounted = false
    }
  }, [
    cartSubtotal,
    calculatedRoadDistanceKm,
    selectedRestaurant,
    cart,
    appliedCoupon,
    couponDiscount,
  ])

  const pricingBreakdown = useMemo(() => {
    const localBreakdown = calculateCheckoutPricing({
      cartSubtotal,
      roadDistanceKm: calculatedRoadDistanceKm,
      config: checkoutConfig,
      couponDiscount,
    })

    if (calculatorApiBreakdown) {
      return {
        ...localBreakdown,
        deliveryFee: calculatorApiBreakdown.deliveryFee ?? localBreakdown.deliveryFee,
        handlingFee: calculatorApiBreakdown.handlingFee ?? localBreakdown.handlingFee,
        platformFee: calculatorApiBreakdown.platformFee ?? localBreakdown.platformFee,
        gstAmount: calculatorApiBreakdown.gstAmount ?? 0,
        grandTotal: calculatorApiBreakdown.grandTotal ?? localBreakdown.grandTotal,
      }
    }

    return {
      ...localBreakdown,
      gstAmount: 0,
    }
  }, [
    cartSubtotal,
    calculatedRoadDistanceKm,
    checkoutConfig,
    couponDiscount,
    calculatorApiBreakdown,
  ])

  const grandTotal = pricingBreakdown.grandTotal

  // Filtered Restaurants Logic
  const filteredRestaurants = useMemo(() => {
    return restaurantsList.filter((rest) => {
      const matchesSearch =
        rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.address.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTag = (() => {
        if (selectedTag === 'All') return true
        const tagLower = selectedTag.toLowerCase()
        if (
          rest.tag.toLowerCase().includes(tagLower) ||
          rest.cuisine.toLowerCase().includes(tagLower) ||
          rest.name.toLowerCase().includes(tagLower)
        ) {
          return true
        }
        const synonyms = CATEGORY_SYNONYMS[selectedTag]
        if (synonyms && synonyms.length > 0) {
          return synonyms.some(
            (syn) =>
              rest.cuisine.toLowerCase().includes(syn) ||
              rest.name.toLowerCase().includes(syn) ||
              rest.tag.toLowerCase().includes(syn)
          )
        }
        return false
      })()
      const matchesPureVeg = pureVegOnly ? rest.isPureVeg : true
      const matchesOffers = offersOnly ? Boolean(rest.offer) : true
      const matchesFast = fastDeliveryOnly ? parseInt(rest.eta) <= 25 : true
      return matchesSearch && matchesTag && matchesPureVeg && matchesOffers && matchesFast
    })
  }, [restaurantsList, searchQuery, selectedTag, pureVegOnly, offersOnly, fastDeliveryOnly])

  // 3-Minute Payment Verification Countdown Effect & Realtime Sync
  useApprovalUpdates(
    verifyingModal.orderId && verifyingModal.open && verifyingModal.status === 'verifying'
      ? verifyingModal.orderId
      : undefined,
    (status) => {
      if (status === 'verified') {
        setVerifyingModal((prev) => ({ ...prev, status: 'verified' }))
        triggerToast('Payment Approved by Admin! Order sent to kitchen.')
        setTimeout(() => {
          setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })
          setCart([])
          setShowCheckoutModal(false)
          setPaymentDone(true)
          navigateToTab('live-order')
        }, 2000)
      } else if (status === 'rejected') {
        setVerifyingModal((prev) => ({ ...prev, status: 'rejected' }))
      }
    }
  )

  useEffect(() => {
    if (!verifyingModal.open || verifyingModal.status !== 'verifying') return

    const countdownTimer = setInterval(() => {
      setVerifyingModal((prev) => {
        if (prev.timer <= 1) {
          clearInterval(countdownTimer)
          return { ...prev, timer: 0 }
        }
        return { ...prev, timer: prev.timer - 1 }
      })
    }, 1000)

    return () => {
      clearInterval(countdownTimer)
    }
  }, [verifyingModal.open, verifyingModal.status, verifyingModal.orderId])

  async function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    // Immediate synchronous lock against double clicks
    if (isSubmittingCheckoutRef.current || isSubmittingCheckout) {
      return
    }

    setUtrError('')

    const cleanUtr = utrRef.trim()

    const targetAddress = (deliveryAddress || user?.address || '').trim()
    const targetRestaurantId =
      selectedRestaurant?.id ||
      (cart[0] as any)?.restaurantId ||
      (cart[0] as any)?.vendorId ||
      restaurantsList[0]?.id ||
      ''
    const targetRestaurantName =
      selectedRestaurant?.name || cart[0]?.restaurantName || restaurantsList[0]?.name || ''

    if (!user?.id) {
      setUtrError('Please sign in with a customer account to place an order.')
      return
    }

    if (!targetAddress) {
      setUtrError('Please enter or select a delivery address.')
      return
    }

    if (cart.length === 0 || !targetRestaurantId || !targetRestaurantName) {
      setUtrError('Your cart does not contain a valid restaurant item.')
      return
    }

    if (!checkoutConfig || !companyUpiId) {
      setUtrError('Online payment is not configured for this store.')
      return
    }

    // Synchronously lock
    isSubmittingCheckoutRef.current = true
    setIsSubmittingCheckout(true)

    // Always generate a fresh unique order ID per checkout attempt
    const orderId = crypto.randomUUID()
    checkoutIdempotencyKeyRef.current = null

    const restName = targetRestaurantName

    // The delivery code is generated server-side when the order is created —
    // it is the single source of truth and is never sent from the browser.
    const cartWithOtp = cart.map((item) => ({
      ...item,
      menu_item_id: item.menuItemId || item.id,
      variant_id: item.variantId,
    }))

    let finalOrderId = orderId

    try {
      const orderPayload = {
        id: orderId,
        idempotency_key: orderId,
        customer_id: user.id,
        customer_name: user.name,
        customer_phone: user?.phone || null,
        customer_address: targetAddress,
        restaurant_id: targetRestaurantId,
        restaurant_name: restName,
        items: cartWithOtp,
        subtotal: cartSubtotal,
        packaging_fee: pricingBreakdown.handlingFee,
        delivery_fee: pricingBreakdown.deliveryFee,
        platform_fee: pricingBreakdown.platformFee,
        distance: `${pricingBreakdown.roadDistanceKm} km`,
        discount_amount: couponDiscount,
        coupon_code: appliedCoupon?.code,
        gst: pricingBreakdown.gstAmount ?? 0,
        total_amount: grandTotal,
        status: 'new',
        payment_method: 'UPI Online',
        delivery_latitude: 12.9716,
        delivery_longitude: 77.5946,
        utr_ref: cleanUtr,
        customer_vpa: user.email ? `${user.email.split('@')[0]}@upi` : 'customer@upi',
      }

      const authToken = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': orderId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      })

      const resData = await res.json()
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to submit order.')
      }

      const savedOrder = resData.order
      finalOrderId = savedOrder?.id || orderId

      // 1. Immediately inject the new order into ordersData
      if (savedOrder) {
        setOrdersData((prev) => [savedOrder, ...prev.filter((o: any) => o.id !== savedOrder.id)])
      }

      // 2. Select this new order
      setSelectedOrderId(finalOrderId)

      const rawDateVal = savedOrder?.created_at || savedOrder?.createdAt || savedOrder?.timestamp
      const nowTime =
        rawDateVal && !isNaN(new Date(rawDateVal).getTime())
          ? new Date(rawDateVal).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

      setActiveOrder({
        id: finalOrderId,
        restaurantName: savedOrder?.restaurant_name || restName,
        items: cartWithOtp,
        subtotal: Number(savedOrder?.subtotal || cartSubtotal),
        total: Number(savedOrder?.total_amount || grandTotal),
        statusStep: 1,
        driverName: null,
        driverPhone: null,
        timestamp: nowTime,
      })

      setShowCheckoutModal(false)
      setPaymentDone(true)
      setVerifyingModal({
        open: true,
        timer: 180,
        orderId: finalOrderId,
        status: 'verifying',
      })
      navigateToTab('live-order')
    } catch (err: any) {
      const errorMsg = err?.message || (typeof err === 'string' ? err : 'Failed to submit order.')
      console.error('Order submission failed:', errorMsg)
      setUtrError(errorMsg)
      toast(errorMsg, 'error')
    } finally {
      checkoutIdempotencyKeyRef.current = null
      setIsSubmittingCheckout(false)
      isSubmittingCheckoutRef.current = false
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbf9] dark:bg-[#0c100e] pb-32 sm:pb-36 lg:pb-12 text-[#18201c] dark:text-white transition-colors duration-200">
      {/* Top Header Navigation Banner */}
      <div
        className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] border-b border-gray-200/70 dark:border-white/10 bg-white/85 dark:bg-[#0c100e]/85 backdrop-blur-xl px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xs transition-all duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-1.5 sm:gap-4">
          {/* Left Block: Logo */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-xl sm:text-2xl lg:text-3xl tracking-tighter text-[#18201c] dark:text-white shrink-0 hover:opacity-90 transition"
            >
              crave<span className="text-[#86a018]">.</span>
            </Link>
          </div>

          {/* Center Block: Desktop Page Navigation Tabs (Apple Segmented Glass Control) */}
          <div className="hidden lg:flex items-center gap-1 text-sm font-bold justify-center bg-gray-100/80 dark:bg-white/[0.06] p-1 rounded-full border border-gray-200/60 dark:border-white/10 backdrop-blur-xl">
            <button
              onClick={() => navigateToTab('explore')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <Compass
                className={`size-4 ${
                  activeTab === 'explore' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'
                }`}
              />
              <span>Explore</span>
            </button>

            <button
              onClick={() => navigateToTab('live-order')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'live-order'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <Bike className="size-4" />
              <span>Track Drop</span>
            </button>

            <button
              onClick={() => navigateToTab('orders')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <History className="size-4" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => navigateToTab('profile')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <User className="size-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => navigateToTab('help')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <HelpCircle className="size-4" />
              <span>Help</span>
            </button>
          </div>

          {/* Right Block: Address + Cart + ThemeToggle + Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {user && (
              <button
                onClick={() => setShowLocationModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 text-left group min-w-0 max-w-[150px] xs:max-w-[190px] sm:max-w-[240px] lg:max-w-[280px] rounded-2xl p-1 sm:p-1.5 hover:bg-gray-100/80 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="grid size-7 xs:size-8 sm:size-9 lg:size-10 place-items-center rounded-xl bg-[#18201c] dark:bg-white/10 text-[#d9f447] shrink-0 shadow-xs">
                  <MapPin className="size-3.5 sm:size-4 lg:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] lg:text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                      DELIVER TO
                    </span>
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-[#86a018] group-hover:underline">
                      (Change)
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold text-[#18201c] dark:text-white truncate mt-0.5">
                    <span className="truncate">
                      {deliveryAddress || user?.address || 'Select Delivery Location'}
                    </span>
                    <ChevronDown className="size-3.5 text-gray-500 shrink-0 group-hover:translate-y-0.5 transition" />
                  </div>
                </div>
              </button>
            )}

            <div className="hidden sm:flex items-center">
              <ThemeToggle />
            </div>

            <button
              onClick={() => router.push('/user/cart')}
              className="hidden lg:flex relative items-center gap-2.5 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-5 py-2.5 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <ShoppingCart className="size-4 text-[#d9f447] dark:text-[#18201c]" />
              <span>Cart ({totalCartItemCount})</span>
              {cartSubtotal > 0 && (
                <span className="text-[#d9f447] dark:text-[#18201c] font-black">
                  &bull; ₹{cartSubtotal}
                </span>
              )}
            </button>

            {/* Quick Mobile Cart Button */}
            <button
              onClick={() => router.push('/user/cart')}
              className="lg:hidden relative grid size-8 xs:size-9 sm:size-10 place-items-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-xs hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shrink-0 cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingCart className="size-4 text-[#18201c] dark:text-white" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-[#86a018] text-[9px] font-black text-white shadow-sm">
                  {totalCartItemCount}
                </span>
              )}
            </button>

            {/* 3-Line Hamburger Side Menu Trigger Button on Mobile */}
            <button
              onClick={() => setShowMobileSideMenu(true)}
              className="lg:hidden grid size-8 xs:size-9 sm:size-10 place-items-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-xs hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shrink-0 cursor-pointer"
              aria-label="Open side menu"
            >
              <Menu className="size-4 xs:size-5 text-[#18201c] dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Side Menu Bar Drawer Backdrop & Aside */}
      <div
        onClick={() => setShowMobileSideMenu(false)}
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          showMobileSideMenu ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        aria-label="Side menu options"
        className={`fixed inset-y-0 right-0 z-[90] flex w-80 max-w-[85vw] flex-col bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          showMobileSideMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Side Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] px-5 py-4 bg-[#f9faf7] dark:bg-[#121815]">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="size-10 rounded-full object-cover border border-[#d9f447]"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-2xl bg-[#18201c] dark:bg-[#27342d] text-[#d9f447] text-sm font-black shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#18201c] dark:text-white truncate">
                {user?.name || 'Customer'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                {user?.email || 'Logged in'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileSideMenu(false)}
            className="grid size-9 place-items-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27342d] transition"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Side Drawer Navigation Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="px-1 pb-2">
            <ThemeToggle variant="pill" className="w-full justify-between" />
          </div>

          <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Navigation
          </p>

          <button
            onClick={() => {
              navigateToTab('explore')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'explore'
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Compass
                className={`size-5 ${
                  activeTab === 'explore'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Explore Kitchens
            </span>
          </button>

          <button
            onClick={() => {
              navigateToTab('live-order')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'live-order'
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bike
                className={`size-5 ${
                  activeTab === 'live-order'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Track Drop
            </span>
            {activeOrder && activeOrder.statusStep < 4 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Live
              </span>
            )}
          </button>

          <button
            onClick={() => {
              navigateToTab('orders')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <History
                className={`size-5 ${
                  activeTab === 'orders'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Orders History
            </span>
            {pastOrders.length > 0 && (
              <span className="rounded-full bg-gray-100 dark:bg-[#27342d] px-2 py-0.5 text-xs font-extrabold text-gray-700 dark:text-gray-200">
                {pastOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              navigateToTab('profile')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'profile'
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <User
                className={`size-5 ${
                  activeTab === 'profile'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Profile &amp; Account
            </span>
          </button>

          <button
            onClick={() => {
              navigateToTab('help')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'help'
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <HelpCircle
                className={`size-5 ${
                  activeTab === 'help'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Help &amp; Support (-9625694673)
            </span>
          </button>

          <button
            onClick={() => {
              setShowMobileSideMenu(false)
              router.push('/user/cart')
            }}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] transition"
          >
            <span className="flex items-center gap-3">
              <ShoppingCart className="size-5 text-[#b5de28] dark:text-[#d9f447]" />
              My Cart
            </span>
            {totalCartItemCount > 0 && (
              <span className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-2.5 py-0.5 text-xs font-bold text-[#d9f447] dark:text-[#18201c]">
                {totalCartItemCount} items
              </span>
            )}
          </button>

          <div className="my-3 border-t border-gray-100 dark:border-[#27342d]" />
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Quick Access
          </p>

          <Link
            href="/user/cravexp"
            onClick={() => setShowMobileSideMenu(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
          >
            <Zap className="size-5 text-emerald-600 fill-emerald-600" />
            <span>craveXP Instamart</span>
          </Link>
        </div>

        {/* Side Drawer Footer / Sign Out */}
        <div className="border-t border-gray-100 dark:border-[#27342d] p-4 bg-[#f9faf7] dark:bg-[#121815]">
          <button
            onClick={async () => {
              setShowMobileSideMenu(false)
              await logout()
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <LogOut className="size-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-[1600px] px-3.5 pt-4 sm:px-6 sm:pt-6 lg:px-8 2xl:px-10">
        {activeTab === 'explore' && (
          <div className="flex flex-col gap-6 sm:gap-8">
            {/* Creative Dynamic Hero Showcase Banner Carousel */}
            <div
              onMouseEnter={() => setHeroAutoplayPaused(true)}
              onMouseLeave={() => setHeroAutoplayPaused(false)}
              className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/[0.12] bg-[#0d120f] transition-all duration-500 group/hero"
            >
              {/* Slides Container */}
              <div className="relative min-h-[420px] sm:min-h-[440px] md:min-h-[460px] lg:min-h-[480px] w-full flex items-center">
                {/* Slide 0: Gourmet Cloud Kitchens Feasts */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
                    heroSlideIndex === 0
                      ? 'opacity-100 z-10 pointer-events-auto'
                      : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background Gradient & Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#170e0a] via-[#24140d]/95 to-[#150c08] -z-10" />
                  <div className="absolute -left-20 -top-20 size-80 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />
                  <div className="absolute right-0 top-0 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                  {/* Left Text & Action Column */}
                  <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md shadow-orange-950/40">
                        <Sparkles className="size-3" />
                        50% OFF UP TO ₹120
                      </span>

                      {/* Clickable Coupon Code Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText('CRAVEFEAST')
                            setCopiedPromoCode('CRAVEFEAST')
                            triggerToast('Promo code CRAVEFEAST copied!')
                            setTimeout(() => setCopiedPromoCode(null), 3000)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-orange-200 text-[11px] font-mono font-black transition cursor-pointer backdrop-blur-md active:scale-95"
                        title="Click to copy coupon code"
                      >
                        {copiedPromoCode === 'CRAVEFEAST' ? (
                          <>
                            <Check className="size-3 text-emerald-400 stroke-[3]" />
                            <span className="text-emerald-300">COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3 text-orange-300" />
                            <span>CODE: CRAVEFEAST</span>
                          </>
                        )}
                      </button>

                      <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-orange-400/80">
                        • GOURMET EXPRESS
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                      Savor Gourmet Feasts Delivered Fresh In 25 Mins
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                      Steaming dum biryani in copper handis, woodfired pizzas with bubbling mozzarella, smash burgers &amp; sizzling fries cooked fresh on order.
                    </p>

                    {/* Action Button & Badges */}
                    <div className="pt-2 flex flex-wrap items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('dishes-section')
                          if (el) el.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl shadow-orange-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Explore Signature Dishes</span>
                        <ArrowRight className="size-4 text-stone-950" />
                      </button>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-orange-200/90 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                        <span>⭐ 4.9 Master Chef Rated</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Visual Image with Seamless Artistic Gradient Blend */}
                  <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
                    <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                      <img
                        src="/banners/gourmet-feast.jpg"
                        alt="Gourmet Dum Biryani, Woodfired Pizza & Burgers"
                        className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl transform transition-transform duration-700 group-hover/hero:scale-105"
                      />
                      {/* Left Gradient Mask for Seamless Integration */}
                      <div className="absolute inset-y-0 left-0 w-24 md:w-44 bg-gradient-to-r from-[#170e0a] via-[#170e0a]/80 to-transparent hidden md:block pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#170e0a] via-[#170e0a]/80 to-transparent md:hidden pointer-events-none" />

                      {/* Floating Glassmorphic Badges */}
                      <div className="absolute top-4 right-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-amber-300 shadow-xl flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        <span>20-25 Mins</span>
                      </div>
                      <div className="absolute bottom-4 left-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                        <Award className="size-3.5 text-orange-400" />
                        <span>Woodfired &amp; Dum</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 1: craveXP 10-Min Dark Store Grocery */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
                    heroSlideIndex === 1
                      ? 'opacity-100 z-10 pointer-events-auto'
                      : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background Gradient & Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#07140e] via-[#0d2217]/95 to-[#050f0a] -z-10" />
                  <div className="absolute -left-20 -top-20 size-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
                  <div className="absolute right-0 top-0 size-96 rounded-full bg-[#d9f447]/12 blur-3xl pointer-events-none" />

                  {/* Left Text Column */}
                  <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <CraveLogo variant="cravexp" size="lg" theme="light" />
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d9f447] text-[#0d1410] text-[11px] font-black uppercase tracking-wider shadow-md shadow-[#d9f447]/20">
                        <span className="size-2 rounded-full bg-[#0d1410] animate-ping" />
                        10-Min Flash Drop
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                      Ultra-Fast Grocery &amp; Daily Essentials
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                      Farm eggs, chilled milk, organic avocados, fresh berries, sourdough bread &amp; pantry snacks delivered to your doorstep in 10 minutes flat.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => router.push('/user/cravexp')}
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-[#d9f447] hover:bg-[#cbf026] text-[#0d1410] font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl shadow-[#d9f447]/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Open CraveXP Store</span>
                        <ArrowRight className="size-4 text-[#0d1410]" />
                      </button>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                        <span>⚡ Zero Delay Guarantee</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Visual Image */}
                  <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
                    <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                      <img
                        src="/banners/cravexp-grocery.jpg"
                        alt="10-Minute Grocery Delivery Items"
                        className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl transform transition-transform duration-700 group-hover/hero:scale-105"
                      />
                      <div className="absolute inset-y-0 left-0 w-24 md:w-44 bg-gradient-to-r from-[#07140e] via-[#07140e]/80 to-transparent hidden md:block pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#07140e] via-[#07140e]/80 to-transparent md:hidden pointer-events-none" />

                      <div className="absolute top-4 right-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-[#d9f447] shadow-xl flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        <span>&lt; 10 Mins</span>
                      </div>
                      <div className="absolute bottom-4 left-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                        <Leaf className="size-3.5 text-emerald-400" />
                        <span>100% Farm Fresh</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Midnight Cravings Fest */}
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
                    heroSlideIndex === 2
                      ? 'opacity-100 z-10 pointer-events-auto'
                      : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Background Gradient & Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0f081c] via-[#1a0e2e]/95 to-[#0b0514] -z-10" />
                  <div className="absolute -left-20 -top-20 size-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
                  <div className="absolute right-0 top-0 size-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

                  {/* Left Text Column */}
                  <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md shadow-purple-950/40">
                        🌙 OPEN TILL 4 AM
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-[11px] font-extrabold backdrop-blur-md">
                        Zero Surge Fees
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                      Satisfy Your Late-Night Cravings
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                      Crispy glazed buffalo wings, loaded cheesy nachos, warm chocolate lava cakes &amp; iced boba teas delivered throughout the night.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('Wings')
                          const el = document.getElementById('dishes-section')
                          if (el) el.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl shadow-purple-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Order Late Night Munchies</span>
                        <ArrowRight className="size-4 text-white" />
                      </button>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-purple-200 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                        <span>🚀 Free Late Delivery 11PM-4AM</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Visual Image */}
                  <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
                    <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                      <img
                        src="/banners/midnight-feast.jpg"
                        alt="Midnight Wings, Boba & Nachos"
                        className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl transform transition-transform duration-700 group-hover/hero:scale-105"
                      />
                      <div className="absolute inset-y-0 left-0 w-24 md:w-44 bg-gradient-to-r from-[#0f081c] via-[#0f081c]/80 to-transparent hidden md:block pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0f081c] via-[#0f081c]/80 to-transparent md:hidden pointer-events-none" />

                      <div className="absolute top-4 right-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-cyan-300 shadow-xl flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-cyan-300" />
                        <span>Hot &amp; Crispy</span>
                      </div>
                      <div className="absolute bottom-4 left-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                        <span>🍫 Molten Desserts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prev / Next Navigation Arrows */}
              <button
                type="button"
                onClick={() => setHeroSlideIndex((prev) => (prev === 0 ? 2 : prev - 1))}
                aria-label="Previous Slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid size-9 sm:size-10 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition hover:scale-110 active:scale-90 cursor-pointer opacity-70 group-hover/hero:opacity-100"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setHeroSlideIndex((prev) => (prev === 2 ? 0 : prev + 1))}
                aria-label="Next Slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid size-9 sm:size-10 place-items-center rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition hover:scale-110 active:scale-90 cursor-pointer opacity-70 group-hover/hero:opacity-100"
              >
                <ChevronRight className="size-5" />
              </button>

              {/* Sleek Floated Carousel Indicator Dock */}
              <div className="absolute bottom-4 sm:bottom-5 left-6 sm:left-12 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-xl pointer-events-auto">
                {[
                  { label: 'Gourmet Feasts', activeColor: 'bg-gradient-to-r from-orange-500 to-amber-400' },
                  { label: 'CraveXP 10m', activeColor: 'bg-[#d9f447]' },
                  { label: 'Midnight Fest', activeColor: 'bg-gradient-to-r from-purple-500 to-pink-500' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHeroSlideIndex(idx)}
                    style={{
                      width: heroSlideIndex === idx ? '28px' : '8px',
                      height: '6px',
                      minWidth: '8px',
                      minHeight: '6px',
                      padding: 0,
                    }}
                    className={`rounded-full transition-all duration-300 cursor-pointer block border-none outline-none ${
                      heroSlideIndex === idx
                        ? `${item.activeColor} shadow-md ring-1 ring-white/50`
                        : 'bg-white/35 hover:bg-white/70'
                    }`}
                    title={item.label}
                    aria-label={`Jump to slide ${idx + 1}: ${item.label}`}
                  />
                ))}
              </div>
            </div>

            {/* Search, Food Categories & Interactive Filter Chips */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-[#86a018] transition" />
                  <input
                    type="text"
                    placeholder="Search dishes, gourmet kitchens, or cuisines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18201c]/90 text-[#18201c] dark:text-white placeholder:text-gray-400 py-3.5 pl-11 pr-10 text-xs sm:text-sm shadow-xs outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/20 font-medium backdrop-blur-md"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition text-[10px]"
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Quick Toggle Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setPureVegOnly(!pureVegOnly)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                      pureVegOnly
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-emerald-500'
                    }`}
                  >
                    <Leaf className="size-3.5 text-emerald-500" />
                    <span>Pure Veg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                      fastDeliveryOnly
                        ? 'bg-[#18201c] dark:bg-[#d9f447] border-[#18201c] dark:border-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                        : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-[#86a018]'
                    }`}
                  >
                    <Zap className="size-3.5 text-amber-500" />
                    <span>Fast Delivery (≤25m)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOffersOnly(!offersOnly)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                      offersOnly
                        ? 'bg-amber-500 border-amber-500 text-[#18201c] shadow-xs font-extrabold'
                        : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                    }`}
                  >
                    <Tag className="size-3.5 text-amber-500" />
                    <span>Offers</span>
                  </button>
                </div>
              </div>

              {/* What's on your mind? Food Categories Carousel */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white tracking-tight flex items-center gap-2">
                        <span>What&apos;s on your mind?</span>
                        <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-extrabold text-gray-500 dark:text-gray-300">
                          {categoryList.length} Cuisines
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Explore handpicked cravings by authentic culinary style
                      </p>
                    </div>

                    {selectedTag !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setSelectedTag('All')}
                        className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] px-2.5 py-1 text-[10px] font-bold shadow-xs hover:opacity-90 transition cursor-pointer"
                      >
                        <span>Reset</span>
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Scroll navigation arrows for desktop */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollCategories('left')}
                      className="grid size-8 place-items-center rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shadow-xs cursor-pointer"
                      aria-label="Scroll categories left"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCategories('right')}
                      className="grid size-8 place-items-center rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shadow-xs cursor-pointer"
                      aria-label="Scroll categories right"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={categoryScrollRef}
                  className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth"
                >
                  {categoryList.map((cat) => {
                    const isSelected = selectedTag === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedTag(cat.id)}
                        className="flex flex-col items-center gap-2 group shrink-0 transition cursor-pointer"
                      >
                        <div
                          className={`relative size-16 sm:size-20 rounded-full overflow-hidden border-2 transition duration-300 p-0.5 ${
                            isSelected
                              ? 'border-[#18201c] dark:border-[#d9f447] ring-4 ring-[#18201c]/10 dark:ring-[#d9f447]/20 scale-105 shadow-md'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:scale-102'
                          }`}
                        >
                          <img
                            src={cat.image}
                            alt={cat.label}
                            loading="eager"
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80'
                            }}
                            className="size-full rounded-full object-cover group-hover:scale-110 transition duration-500"
                          />
                          {isSelected && (
                            <span className="absolute inset-0 bg-[#d9f447]/15 rounded-full pointer-events-none" />
                          )}
                        </div>
                        <span
                          className={`text-xs tracking-tight transition max-w-[84px] text-center line-clamp-1 ${
                            isSelected
                              ? 'text-[#18201c] dark:text-[#d9f447] font-extrabold'
                              : 'text-gray-600 dark:text-gray-400 font-medium group-hover:text-[#18201c] dark:group-hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Trending Quick-Add Dishes */}
            {(menuItemsList.length > 0 || selectedRestaurant) && (
              <div id="dishes-section">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] dark:text-white flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[#86a018]/10 text-[#86a018]">
                        <Sparkles className="size-3.5 text-[#86a018]" />
                      </span>
                      <span>Signature Dishes</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {selectedRestaurant?.name
                        ? `Chef recommendations from ${selectedRestaurant.name}.`
                        : 'Master chef specials from available partner kitchens.'}
                    </p>
                  </div>
                  {selectedRestaurant && (
                    <button
                      onClick={() => setSelectedRestaurant(null)}
                      className="text-xs font-bold text-[#86a018] hover:underline cursor-pointer"
                    >
                      View all kitchens
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {menuItemsList.length === 0 ? (
                    <p className="col-span-full rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] p-8 text-center text-xs text-gray-500 dark:text-gray-400">
                      No signature dishes listed for {selectedRestaurant?.name}.
                    </p>
                  ) : (
                    menuItemsList.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] p-4 flex flex-col justify-between shadow-xs hover:border-gray-300 dark:hover:border-white/20 hover:shadow-lg transition duration-300"
                      >
                        <div>
                          <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                                <ShoppingBag className="size-8" />
                              </div>
                            )}

                            {/* Veg / Non-Veg culinary indicator dot badge */}
                            <div className="absolute top-2.5 left-2.5 rounded-lg bg-white/95 dark:bg-[#121815]/95 backdrop-blur-md p-1 shadow-xs border border-black/5 flex items-center gap-1">
                              <div
                                className={`size-3 rounded-sm border flex items-center justify-center ${
                                  item.veg ? 'border-emerald-600' : 'border-rose-600'
                                }`}
                              >
                                <div
                                  className={`size-1.5 rounded-full ${
                                    item.veg ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 pr-1">
                                {item.veg ? 'Veg' : 'Non-Veg'}
                              </span>
                            </div>

                            {/* Restaurant tag */}
                            <div className="absolute bottom-2.5 left-2.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-white/90">
                              {item.restaurantName || 'Partner Kitchen'}
                            </div>
                          </div>

                          <div className="mt-3.5">
                            <p className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white group-hover:text-[#86a018] transition line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.detail}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              Price
                            </span>
                            <span className="font-black text-base text-[#18201c] dark:text-white">
                              {item.variants?.length ? 'From ' : ''}₹{menuItemDisplayPrice(item)}
                            </span>
                          </div>
                          {(() => {
                            const hasVariants = Boolean(item.variants?.length)
                            const inCart = hasVariants ? undefined : cart.find((i) => i.id === item.id)
                            if (hasVariants) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => openVariantPicker(item)}
                                  className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#18201c] hover:scale-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="size-3.5 stroke-[3]" />
                                  <span>Options</span>
                                </button>
                              )
                            }
                            if (inCart) {
                              return (
                                <div className="flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-2.5 py-1 text-xs font-bold text-white dark:text-[#18201c] shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQty(item.id, -1)}
                                    className="p-1 hover:opacity-80 active:scale-90 transition cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="size-3.5 stroke-[3]" />
                                  </button>
                                  <span className="font-black px-1">{inCart.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateItemQty(item.id, 1)}
                                    className="p-1 hover:opacity-80 active:scale-90 transition cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    <Plus className="size-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              )
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#18201c] hover:scale-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="size-3.5 stroke-[3]" />
                                <span>Add to Cart</span>
                              </button>
                            )
                          })()}
                        </div>
                        {item.variants && item.variants.length > 0 && (
                          <p className="mt-2 text-[10px] font-bold text-[#86a018] dark:text-[#d9f447]">
                            Choose Small, Medium or Large in the next step
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Featured Restaurant Card Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] dark:text-white">
                    Restaurants ({filteredRestaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Available restaurants from the database.
                  </p>
                </div>
                {(searchQuery ||
                  selectedTag !== 'All' ||
                  pureVegOnly ||
                  offersOnly ||
                  fastDeliveryOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedTag('All')
                      setPureVegOnly(false)
                      setOffersOnly(false)
                      setFastDeliveryOnly(false)
                    }}
                    className="text-xs font-bold text-[#86a018] hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRestaurants.length === 0 ? (
                  <div className="col-span-full rounded-3xl border border-dashed border-gray-200 dark:border-[#27342d] bg-white/60 dark:bg-[#18201c]/60 p-12 text-center flex flex-col items-center justify-center">
                    <div className="size-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
                      <UtensilsCrossed className="size-6 text-gray-400" />
                    </div>
                    <p className="col-span-full rounded-2xl p-2 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                      No restaurants match these filters.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                      Try broadening your search query or clear selected cuisine filters to view all
                      available kitchens.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedTag('All')
                        setPureVegOnly(false)
                        setOffersOnly(false)
                        setFastDeliveryOnly(false)
                      }}
                      className="mt-4 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] px-5 py-2 text-xs font-bold hover:scale-105 active:scale-95 transition shadow-xs cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  filteredRestaurants.map((rest) => (
                    <div
                      key={rest.id}
                      onClick={() => setSelectedRestaurant(rest)}
                      className="group cursor-pointer overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 dark:hover:border-white/20 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-48 sm:h-52 w-full overflow-hidden">
                          {rest.image ? (
                            <img
                              src={rest.image}
                              alt={rest.name}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-108"
                            />
                          ) : (
                            <div className="grid size-full place-items-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                              <MapPin className="size-8" />
                            </div>
                          )}

                          {/* Gradient Overlay for badges */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                          {rest.isOpen === false && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                                Currently Closed
                              </span>
                            </div>
                          )}

                          <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
                            {rest.tag && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-200 bg-black/60 px-2 py-0.5">
                                {rest.tag}
                              </span>
                            )}
                            {rest.isPureVeg && (
                              <span className="text-[10px] font-bold uppercase text-emerald-400 bg-black/60 px-2 py-0.5">
                                Pure Veg
                              </span>
                            )}
                          </div>

                          {rest.rating && (
                            <div className="absolute right-3 top-3 text-[10px] font-bold text-emerald-400 bg-black/60 px-2 py-0.5 flex items-center gap-1">
                              <Award className="size-3" />
                              <span>{rest.rating}</span>
                            </div>
                          )}

                          {rest.eta && (
                            <span className="absolute bottom-3 right-3 text-[10px] font-medium text-white bg-black/60 px-2 py-0.5 flex items-center gap-1">
                              <Clock className="size-3 text-[#d9f447]" />
                              {rest.eta}
                            </span>
                          )}

                          {rest.offer && (
                            <span className="absolute bottom-3 left-3 text-[10px] font-bold text-amber-300 bg-black/75 px-2 py-0.5 flex items-center gap-1">
                              <Tag className="size-3" /> {rest.offer}
                            </span>
                          )}
                        </div>

                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-extrabold text-base tracking-tight text-[#18201c] dark:text-white group-hover:text-[#86a018] transition">
                                {rest.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {rest.cuisine}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {rest.address && (
                              <span className="flex min-w-0 items-center gap-1 truncate">
                                <MapPin className="size-3.5 shrink-0 text-[#86a018]" />
                                <span className="truncate">{rest.address}</span>
                              </span>
                            )}
                            {rest.costForTwo && (
                              <span className="shrink-0 font-bold text-gray-700 dark:text-gray-300">
                                {rest.costForTwo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 pt-0">
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 text-xs">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {rest.eta ? `Delivery · ${rest.eta}` : 'Delivery time unavailable'}
                          </span>
                          <span className="font-bold text-[#86a018] group-hover:translate-x-0.5 transition flex items-center gap-1">
                            View Menu <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Secondary craveXP Dark Store Quick-Switch Prompt */}
            <div
              onClick={() => router.push('/user/cravexp')}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#141b17] via-[#1b2720] to-[#121915] p-5 sm:p-6 border border-emerald-500/20 hover:border-[#d9f447]/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group transition duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#d9f447]/15 border border-[#d9f447]/30 text-[#d9f447] shrink-0 group-hover:scale-105 transition">
                  <Zap className="size-6 fill-current text-[#d9f447]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-sm sm:text-base text-white group-hover:text-[#d9f447] transition">
                      Need Groceries or Midnight Snacks Fast?
                    </p>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 max-w-xl">
                    Daily essentials, fresh milk, chilled beverages, farm eggs, chips &amp; munchies
                    dispatched instantly from our local dark store.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                <span className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 group-hover:bg-[#d9f447] text-white group-hover:text-[#121815] px-4 py-2.5 text-xs font-black transition duration-200">
                  <span>Visit craveXP Store</span>
                  <ArrowRight className="size-3.5 group-hover:translate-x-1 transition duration-200" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Orders History Tab */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-[#18201c] dark:text-white">Your Orders</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {pastOrders.length} orders placed
              </p>
            </div>

            {pastOrders.length === 0 ? (
              <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-16 text-center">
                <ShoppingBag className="mx-auto size-14 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="font-bold text-[#18201c] dark:text-white">No Orders Yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your order history will appear here after placing an order.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
                  className="mt-5 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-2.5 text-xs font-bold text-white dark:text-[#18201c]"
                >
                  Explore Kitchens
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pastOrders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] shadow-xs"
                  >
                    <div className="flex items-center gap-4 border-b border-[#f0f3ec] dark:border-[#27342d] p-5">
                      {order.restaurantImage ? (
                        <img
                          src={order.restaurantImage}
                          alt={order.restaurantName}
                          className="size-14 rounded-2xl object-cover shrink-0"
                        />
                      ) : (
                        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400">
                          <Store className="size-5" />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase ${
                              order.status === 'Delivered'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : order.status === 'In Progress'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {order.status === 'Delivered'
                              ? 'Delivered'
                              : order.status === 'In Progress'
                                ? 'Out for Delivery'
                                : 'Cancelled'}
                          </span>
                          <span className="text-[10px] text-gray-400">#{order.id}</span>
                        </div>
                        <h3 className="mt-1 font-bold text-sm text-[#18201c] dark:text-white truncate">
                          {order.restaurantName}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {order.date} · {order.time}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="font-bold text-base text-[#18201c] dark:text-white">
                          ₹{order.total}
                        </p>
                        {order.status === 'In Progress' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(String(order.id))
                              router.push(`/user/track/${order.id}`)
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                          >
                            <Bike className="size-3" /> Track Live Order
                          </button>
                        )}
                        {(order.status === 'Delivered' ||
                          (order.status as string) === 'completed') && (
                          <button
                            type="button"
                            onClick={() =>
                              setInvoiceModalOrder({
                                id: order.id,
                                restaurantName: order.restaurantName,
                                customerName: user?.name || 'Customer',
                                customerAddress: user?.address || 'Bengaluru',
                                timestamp: `${order.date}, ${order.time}`,
                                items: order.items,
                                total: order.total,
                                status: order.status,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-black dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                          >
                            <FileText className="size-3" /> View Invoice
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 border-b border-[#f5f6f3] dark:border-[#27342d]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Items Ordered
                      </p>
                      <div className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.qty}× {item.name}
                              {item.variantName ? ` (${item.variantName})` : ''}
                            </span>
                            <span className="font-semibold text-[#18201c] dark:text-white">
                              ₹{item.price * item.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
            {/* 1. Profile Hero Card */}
            <div className="relative overflow-hidden rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-linear-to-br from-white via-[#fbfcf9] to-[#f4f7ed] dark:from-[#18201c] dark:via-[#1c2621] dark:to-[#141b17] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative">
                    <div className="grid size-16 sm:size-20 place-items-center rounded-2xl bg-linear-to-tr from-[#b5de28] to-[#d9f447] text-[#18201c] font-black text-2xl sm:text-3xl shadow-md ring-4 ring-[#b5de28]/20">
                      {(user?.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#18201c] shadow-xs">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Verified Customer Account
                      </span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Crave Member
                      </span>
                    </div>

                    <h2 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#18201c] dark:text-white">
                      {user?.name || 'Customer Account'}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#55635a] dark:text-gray-300 font-medium">
                      {user?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3.5 text-[#b5de28]" />
                          {user.email}
                        </span>
                      )}
                      {user?.email && user?.phone && <span>&bull;</span>}
                      {user?.phone ? (
                        <span className="flex items-center gap-1">
                          <PhoneCall className="size-3.5 text-[#b5de28]" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          No phone added
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => {
                      setEditAddress(!editAddress)
                      if (!editAddress) setShowPasswordSection(false)
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                      editAddress
                        ? 'border-[#b5de28] bg-[#b5de28]/10 text-[#18201c] dark:text-[#d9f447]'
                        : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f4f7ed] dark:hover:bg-[#27342d]'
                    }`}
                  >
                    <User className="size-3.5" />
                    {editAddress ? 'Close Edit' : 'Edit Profile'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordSection(!showPasswordSection)
                      if (!showPasswordSection) setEditAddress(false)
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                      showPasswordSection
                        ? 'border-[#b5de28] bg-[#b5de28]/15 text-[#18201c] dark:text-[#d9f447]'
                        : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f4f7ed] dark:hover:bg-[#27342d]'
                    }`}
                  >
                    <KeyRound className="size-3.5 text-[#b5de28]" />
                    {showPasswordSection ? 'Hide Security' : 'Change Password'}
                  </button>
                  <button
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-xs"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Real Account Stats Only */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#e5e9e0] dark:border-[#27342d] pt-6 relative z-10">
                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShoppingBag className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#18201c] dark:text-white">
                      {pastOrders.length}
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                      Total Orders Placed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#18201c] dark:text-white">
                      {savedAddresses.length}
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                      Saved Addresses
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-[#d9f447]/20 text-[#18201c] dark:text-[#d9f447] shrink-0">
                    <Home className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#18201c] dark:text-white truncate">
                      {deliveryAddress ? deliveryAddress.split(',')[0] : 'None Selected'}
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">
                      Active Delivery Destination
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Edit Profile Details Drawer */}
            {editAddress && (
              <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-md animate-in slide-in-from-top-4 duration-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27342d]">
                  <h3 className="text-sm font-bold text-[#18201c] dark:text-white flex items-center gap-2">
                    <User className="size-4 text-[#b5de28]" /> Edit Profile &amp; Contact Details
                  </h3>
                  <span className="text-[11px] text-gray-400">Synced directly to your account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profilePhoneInput}
                      onChange={(e) => setProfilePhoneInput(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1 text-xs">
                    Primary Doorstep Address
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter building, street, area, city..."
                    className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 text-xs font-medium outline-none focus:border-[#b5de28]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#27342d]">
                  <button
                    type="button"
                    onClick={() => setEditAddress(false)}
                    className="rounded-xl border border-gray-200 dark:border-[#27342d] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27342d]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingProfile}
                    onClick={handleSaveProfile}
                    className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] transition shadow-xs disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Dedicated Security & Change Password Section */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] gap-3 mb-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-[#d9f447]/20 text-[#18201c] dark:text-[#d9f447] shrink-0 mt-0.5">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                      <span>Password &amp; Security</span>
                    </h3>
                    <p className="text-xs text-[#55635a] dark:text-gray-400 mt-0.5 font-medium">
                      Update your account password securely. Changes are encrypted and saved
                      directly to the database.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Scrypt Encrypted
                  </span>
                </div>
              </div>

              {/* Feedback Alert */}
              {passwordFeedback && (
                <div
                  className={`mb-5 flex items-start gap-3 rounded-2xl p-4 text-xs font-semibold transition ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/80'
                  }`}
                >
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p>{passwordFeedback.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasswordFeedback(null)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Current Password */}
                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="size-3.5" />
                      </div>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        autoComplete="current-password"
                        className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <KeyRound className="size-3.5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-300 block mb-1.5 text-xs">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <CheckCircle2 className="size-3.5" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white pl-9 pr-10 py-2.5 text-xs font-medium outline-none focus:border-[#b5de28] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password guidelines & action bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-[#27342d]">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#66756c] dark:text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <span
                        className={`inline-block size-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      />
                      At least 8 characters
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`inline-block size-1.5 rounded-full ${newPassword && confirmPassword && newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      />
                      Passwords match
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {(currentPassword || newPassword || confirmPassword) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPassword('')
                          setNewPassword('')
                          setConfirmPassword('')
                          setPasswordFeedback(null)
                        }}
                        className="rounded-xl border border-gray-200 dark:border-[#27342d] px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#27342d] transition"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={
                        isChangingPassword || !currentPassword || !newPassword || !confirmPassword
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] dark:hover:bg-[#e4fc62] transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Updating DB...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="size-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* 4. Appearance & Theme Settings */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] gap-2 mb-5">
                <div>
                  <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <Sun className="size-4 text-[#b5de28]" />
                    <span>App Theme &amp; Visual Appearance</span>
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 mt-1 font-medium">
                    Crave defaults to fresh <strong className="text-[#b5de28]">Light Theme</strong>.
                    If you prefer low-light viewing, select{' '}
                    <strong className="text-[#18201c] dark:text-white">Dark Mode</strong> below
                    anytime.
                  </p>
                </div>
                <span className="self-start sm:self-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Live Switching
                </span>
              </div>
              <ThemeSelector />
            </div>

            {/* 5. Notification Permission and Device Subscription */}
            <NotificationSettingsCard />

            {/* 6. Saved Delivery Locations Quick Selector */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] mb-4">
                <div>
                  <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <MapPin className="size-4 text-[#b5de28]" />
                    <span>Saved Delivery Addresses</span>
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 mt-0.5 font-medium">
                    Manage your doorstep drop-off destinations ({savedAddresses.length} saved)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#b5de28] hover:bg-[#728812] px-3.5 py-1.5 text-xs font-black text-white transition shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {savedAddresses.length === 0 ? (
                  <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#dfe4dc] dark:border-[#27342d] p-6 text-center">
                    <MapPin className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs font-bold text-[#18201c] dark:text-white">
                      No saved addresses yet
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Tap Add New to drop a pin or save your home/work address.
                    </p>
                  </div>
                ) : (
                  savedAddresses.map((addr) => {
                    const isSelected = deliveryAddress === addr.address
                    const hasCoords = addr.lat != null && addr.lng != null
                    return (
                      <div
                        key={addr.id}
                        className={`flex flex-col justify-between rounded-2xl p-4 border transition-all ${
                          isSelected
                            ? 'border-[#b5de28] dark:border-[#d9f447] bg-[#f8fbf4] dark:bg-[#151f19] shadow-xs'
                            : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="grid size-7 place-items-center rounded-lg bg-[#f0f3eb] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] text-xs font-bold">
                                {addr.label.toLowerCase().includes('work') ? (
                                  <Building2 className="size-3.5" />
                                ) : addr.label.toLowerCase().includes('home') ? (
                                  <Home className="size-3.5" />
                                ) : (
                                  <MapPin className="size-3.5" />
                                )}
                              </span>
                              <span className="font-extrabold text-xs text-[#18201c] dark:text-white capitalize">
                                {addr.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                  Active
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSavedAddress(addr.id, addr.label)
                                }}
                                title="Delete address"
                                className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[#55635a] dark:text-gray-300 font-medium my-2.5 line-clamp-2 leading-relaxed">
                            {addr.address}
                          </p>

                          {hasCoords && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-3 flex items-center gap-1">
                              <LocateFixed className="size-2.5 text-[#b5de28]" />
                              <span>
                                {addr.lat!.toFixed(4)}°, {addr.lng!.toFixed(4)}°
                              </span>
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            updateDeliveryAddress(addr.address)
                            setSelectedMapPin(hasCoords ? { lat: addr.lat!, lng: addr.lng! } : null)
                            triggerToast(`Switched active delivery location to ${addr.label}!`)
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition ${
                            isSelected
                              ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c]'
                              : 'bg-[#f4f7ed] dark:bg-[#27342d] text-[#18201c] dark:text-white hover:bg-[#e2e7dc] dark:hover:bg-[#34463d]'
                          }`}
                        >
                          {isSelected ? 'Delivering Here' : 'Deliver Here'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 6. Help, Support & Trust Policies Footer Bar */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white">
                    Need help with an ongoing order?
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    Call priority helpline at{' '}
                    <a
                      href="tel:+919625694673"
                      className="font-bold text-[#18201c] dark:text-[#d9f447] underline"
                    >
                      -9625694673
                    </a>{' '}
                    (24/7).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateToTab('help')}
                  className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] dark:hover:bg-[#c8e434] transition shadow-xs flex items-center gap-1.5"
                >
                  <HelpCircle className="size-3.5" />
                  <span>Help Center &amp; FAQs</span>
                </button>
                <Link
                  href="/policies"
                  className="rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition shadow-2xs"
                >
                  Policies
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Help & Support View */}
        {activeTab === 'help' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 px-1 sm:px-0 animate-in fade-in duration-200">
            {/* Top 24/7 Priority Helpline Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-[#18201c] via-[#232f28] to-[#18201c] p-6 sm:p-8 text-white relative overflow-hidden border border-[#27342d] shadow-2xl">
              <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#d9f447]/15 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 text-[#d9f447] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#d9f447] animate-ping" />
                    24/7 Priority Support Helpline
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  Need Help with an Order? Reach Out Directly
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
                  Have an urgent question about a live order, cancellation window, refund queue, or
                  delivery partner? Reach our dedicated customer desk directly.
                </p>

                {/* Primary Contact CTA Buttons */}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="tel:+919625694673"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#d9f447] hover:bg-[#c8e434] px-6 py-3 text-xs sm:text-sm font-black text-[#18201c] shadow-lg transition hover:scale-105 active:scale-95"
                  >
                    <PhoneCall className="size-4 text-[#18201c]" />
                    <span>Call Helpline: -9625694673</span>
                  </a>

                  <a
                    href="https://wa.me/919625694673?text=Hi%20Crave%20Support,%20I%20need%20help%20with%20my%20order"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg transition hover:scale-105 active:scale-95"
                  >
                    <MessageSquare className="size-4" />
                    <span>WhatsApp: -9625694673</span>
                  </a>

                  <button
                    onClick={() => navigateToTab('live-order')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 px-5 py-3 text-xs font-bold text-white transition"
                  >
                    <Bike className="size-4 text-[#d9f447]" />
                    <span>View Active Order</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Policies Highlight Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-xs">
                  <Clock className="size-4" />
                  <span>15-Second Cancellation</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Cancel anytime within the first 15 seconds after placement with 1 tap.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                  <ShieldCheck className="size-4" />
                  <span>Admin Refund Review Queue</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Cancelled payments are safely queued and verified for rapid reversal.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
                <div className="flex items-center gap-2 text-[#7f9815] dark:text-[#d9f447] font-extrabold text-xs">
                  <KeyRound className="size-4" />
                  <span>Secure 6-Digit Delivery OTP</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Only disclose your OTP to the driver at your door upon receiving your food.
                </p>
              </div>
            </div>

            {/* Search Pre-questions */}
            <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 shadow-xs">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search frequently asked questions (e.g. cancellation, refund, otp, payment)..."
                  value={helpSearchQuery}
                  onChange={(e) => setHelpSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] pl-10 pr-4 py-2.5 text-xs text-[#18201c] dark:text-white placeholder-gray-400 outline-none focus:border-[#d9f447] transition"
                />
                {helpSearchQuery && (
                  <button
                    onClick={() => setHelpSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pre-Loaded Questions (Accordion List) */}
            <div className="rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs space-y-3">
              <div className="border-b border-gray-100 dark:border-[#27342d] pb-3 mb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Instant answers to common customer queries
                  </p>
                </div>
                <span className="text-xs font-bold text-[#7f9815] dark:text-[#d9f447]">
                  7 Help Topics
                </span>
              </div>

              {[
                {
                  id: 'cancellation-policy',
                  category: 'Order Cancellations',
                  question: 'Can I cancel my order, and what is the cancellation window?',
                  answer:
                    'Yes, orders can be cancelled strictly within the first 15 seconds after placement directly from your active order screen. Once 15 seconds have passed, our restaurant partners immediately begin food preparation and packaging. Cancellations are locked after 15 seconds to prevent food wastage and protect kitchen staff.',
                },
                {
                  id: 'refund-timeline',
                  category: 'Refund Queue & Reversals',
                  question: 'I cancelled within 15 seconds. When and how will I receive my refund?',
                  answer:
                    'When an order is cancelled within the 15-second window, it is automatically added to our Admin Refund Review Queue. Our team verifies the transaction and releases the refund directly to your original payment method (UPI, Debit/Credit Card, or NetBanking). The reversal typically reflects within 2 to 4 business days.',
                },
                {
                  id: 'direct-support',
                  category: 'Customer Support Hotline',
                  question: 'How do I speak to someone if I need urgent help?',
                  answer:
                    'You can reach our dedicated customer support team directly at -9625694673 anytime, 24 hours a day, 7 days a week. You can also chat with us on WhatsApp at the same number (-9625694673).',
                },
                {
                  id: 'delivery-otp',
                  category: 'Delivery OTP Security',
                  question: 'Where can I find my 6-digit Delivery OTP?',
                  answer:
                    'Your 6-digit delivery OTP is displayed securely on your Live Order Tracking screen once a delivery partner accepts and picks up your parcel from the kitchen. Share this OTP only with the delivery partner at your doorstep when they hand you your order.',
                },
                {
                  id: 'tracking-partner',
                  category: 'Live Tracking & ETA',
                  question: 'How do I track my delivery partner or call them?',
                  answer:
                    'Live road GPS tracking activates as soon as a delivery partner accepts and picks up your parcel. Their vehicle icon will move on the live road map toward your doorstep. You will also see their verified name and a direct "Call Partner" button.',
                },
                {
                  id: 'damaged-missing',
                  category: 'Food Quality & Disputes',
                  question: 'What if an item is missing, incorrect, or food arrived damaged?',
                  answer:
                    'We sincerely apologize! Please keep the packaging intact, take a photo, and call our priority customer care immediately at -9625694673 within 30 minutes of delivery with your Order ID. Our team will promptly issue a replacement or refund.',
                },
                {
                  id: 'payment-deducted-order-failed',
                  category: 'Payment Delays',
                  question: 'Money was deducted from my bank/UPI app, but the order failed?',
                  answer:
                    'If your bank debited money without order creation, your bank typically reverses the amount within 24-48 hours. If it does not reflect, please call us at -9625694673 with your 12-digit UTR reference number.',
                },
              ]
                .filter((faq) => {
                  if (!helpSearchQuery.trim()) return true
                  const q = helpSearchQuery.toLowerCase()
                  return (
                    faq.question.toLowerCase().includes(q) ||
                    faq.answer.toLowerCase().includes(q) ||
                    faq.category.toLowerCase().includes(q)
                  )
                })
                .map((faq) => {
                  const isOpen = openFaqId === faq.id
                  return (
                    <div
                      key={faq.id}
                      className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50/60 dark:bg-[#121815] overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full flex items-center justify-between p-4 text-left font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#d9f447]/20 text-[#718b0f] dark:text-[#d9f447] text-[10px] font-black uppercase tracking-wider shrink-0">
                            {faq.category}
                          </span>
                          <span className="truncate">{faq.question}</span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="size-4 shrink-0 text-[#718b0f] dark:text-[#d9f447]" />
                        ) : (
                          <ChevronDown className="size-4 shrink-0 text-gray-400" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-[#1e2722] leading-relaxed animate-in fade-in duration-150">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {/* Bottom Direct Contact Footer */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0">
                  <Headphones className="size-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white">
                    Still need help?
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Call our customer assistance team directly at{' '}
                    <strong className="text-[#18201c] dark:text-white font-mono">
                      -9625694673
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="tel:+919625694673"
                  className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2.5 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] dark:hover:bg-[#c8e434] transition shadow-xs flex items-center gap-2"
                >
                  <PhoneCall className="size-3.5" />
                  <span>Call -9625694673</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Live Order Tracking View */}
        {activeTab === 'live-order' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6 px-1 sm:px-0">
            {activeOrder ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => {
                      setSelectedOrderId(undefined)
                      router.push('/user/track')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white transition"
                  >
                    <ArrowLeft className="size-4" />
                    <span>All Active Orders</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrderId(undefined)
                      navigateToTab('explore')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline transition"
                  >
                    <UtensilsCrossed className="size-3.5" />
                    <span>Browse Kitchens</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#dfe5db] bg-white shadow-xl">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-br from-[#18201c] via-[#222c27] to-[#18201c] p-4 sm:p-7 text-white relative overflow-hidden">
                    {/* Subtle Background Glow */}
                    <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#d9f447]/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
                      <div className="space-y-2.5 sm:space-y-3 min-w-0">
                        {/* Status Indicators */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold text-white/80 uppercase">
                            Order #
                            {typeof activeOrder.id === 'string' && activeOrder.id.length > 10
                              ? activeOrder.id.slice(0, 8).toUpperCase()
                              : activeOrder.id}
                          </span>
                          <span className="text-xs font-bold text-emerald-400">
                            {activeOrder.statusText || 'Order Confirmed'}
                          </span>
                          {activeOrder.otp && (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              Delivery OTP: {activeOrder.otp}
                            </span>
                          )}
                          {activeOrder.paymentStatus === 'pending' && (
                            <span className="text-xs font-bold text-amber-400">
                              Payment Pending
                            </span>
                          )}
                          {cancelTimeRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrRemoveOrder(activeOrder.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-black text-rose-300 hover:bg-rose-500/30 transition cursor-pointer shrink-0"
                              title={`Order can be cancelled within 15 seconds of placement (${cancelTimeRemaining}s remaining)`}
                            >
                              <Trash2 className="size-3 text-rose-300" /> Cancel Order ({cancelTimeRemaining}s)
                            </button>
                          )}
                          {(activeOrder.statusStep === 4 ||
                            activeOrder.rawStatus === 'delivered' ||
                            activeOrder.rawStatus === 'completed') && (
                            <button
                              type="button"
                              onClick={() =>
                                setInvoiceModalOrder({
                                  id: activeOrder.id,
                                  restaurantName: activeOrder.restaurantName,
                                  customerName: user?.name || 'Customer',
                                  customerAddress: deliveryAddress,
                                  customerPhone: user?.phone,
                                  timestamp: activeOrder.timestamp,
                                  items: activeOrder.items,
                                  subtotal: activeOrder.subtotal,
                                  total: activeOrder.total,
                                  paymentMethod:
                                    activeOrder.paymentStatus === 'verified' ? 'UPI Online' : 'UPI',
                                  otp: activeOrder.otp,
                                  status: activeOrder.statusText,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] hover:bg-[#b8d629] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black text-[#18201c] shadow-md transition cursor-pointer shrink-0"
                            >
                              <FileText className="size-3 sm:size-3.5 text-[#18201c]" /> View Tax
                              Invoice
                            </button>
                          )}
                        </div>

                        <div>
                          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                            {activeOrder.restaurantName}
                          </h2>
                          <p className="mt-1 text-[11px] sm:text-xs text-white/70 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span>Placed at {activeOrder.timestamp}</span>
                            <span>•</span>
                            <span className="font-semibold text-white">
                              Total ₹{activeOrder.total}
                            </span>
                            {activeOrder.items && activeOrder.items.length > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  {activeOrder.items.length}{' '}
                                  {activeOrder.items.length === 1 ? 'item' : 'items'}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md p-3 sm:px-5 sm:py-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shadow-inner">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                          Estimated Delivery
                        </p>
                        <p className="text-lg sm:text-2xl font-black text-white sm:mt-0.5 tracking-tight">
                          {activeOrder.statusStep === 4
                            ? 'Delivered'
                            : `${Math.max(
                                10,
                                Math.round(
                                  calculateRoadTravelDistanceKm(
                                    activeOrder.restaurantLat
                                      ? Number(activeOrder.restaurantLat)
                                      : 12.9716,
                                    activeOrder.restaurantLng
                                      ? Number(activeOrder.restaurantLng)
                                      : 77.5946,
                                    activeOrder.customerLat
                                      ? Number(activeOrder.customerLat)
                                      : (selectedMapPin?.lat ?? 12.9716),
                                    activeOrder.customerLng
                                      ? Number(activeOrder.customerLng)
                                      : (selectedMapPin?.lng ?? 77.5946)
                                  ) *
                                    3 +
                                    10
                                )
                              )} - ${Math.max(
                                15,
                                Math.round(
                                  calculateRoadTravelDistanceKm(
                                    activeOrder.restaurantLat
                                      ? Number(activeOrder.restaurantLat)
                                      : 12.9716,
                                    activeOrder.restaurantLng
                                      ? Number(activeOrder.restaurantLng)
                                      : 77.5946,
                                    activeOrder.customerLat
                                      ? Number(activeOrder.customerLat)
                                      : (selectedMapPin?.lat ?? 12.9716),
                                    activeOrder.customerLng
                                      ? Number(activeOrder.customerLng)
                                      : (selectedMapPin?.lng ?? 77.5946)
                                  ) *
                                    3 +
                                    15
                                )
                              )} mins`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 15-Second Instant Cancellation Grace Window Widget */}
                  {cancelTimeRemaining > 0 ? (
                    <div className="bg-gradient-to-r from-rose-950/90 via-zinc-900 to-rose-950/90 border-b border-rose-500/30 p-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white backdrop-blur-md">
                      <div className="flex items-center gap-3.5">
                        {/* Animated SVG Circular Countdown Ring */}
                        <div className="relative size-12 sm:size-14 shrink-0 grid place-items-center">
                          <svg className="size-full -rotate-90 transform" viewBox="0 0 44 44">
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              className="stroke-white/15 fill-none"
                              strokeWidth="3.5"
                            />
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              className="stroke-rose-400 fill-none transition-all duration-1000 ease-linear"
                              strokeWidth="3.5"
                              strokeDasharray={113.1}
                              strokeDashoffset={113.1 * (1 - cancelTimeRemaining / 15)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute font-mono font-black text-xs sm:text-sm text-rose-300">
                            {cancelTimeRemaining}s
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-rose-400 animate-ping" />
                            <p className="text-xs sm:text-sm font-black text-rose-200 tracking-tight">
                              15-Second Cancellation Window Active
                            </p>
                          </div>
                          <p className="text-[11px] text-white/70 mt-0.5 max-w-lg leading-relaxed">
                            Change of mind? Cancel now for an immediate 100% refund routed directly to our admin settlement queue.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelOrRemoveOrder(activeOrder.id)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 sm:py-2.5 text-xs font-black text-white shadow-lg shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="size-3.5 text-white" />
                        <span>Cancel Order &amp; Refund</span>
                      </button>
                    </div>
                  ) : activeOrder.statusStep < 4 ? (
                    <div className="bg-[#121815] border-b border-[#27342d] px-4 py-2 sm:px-6 flex items-center justify-between gap-2 text-white">
                      <div className="flex items-center gap-2 text-[11px] text-gray-300">
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          Kitchen Locked
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>Food is actively being prepared fresh. 15-second grace window concluded.</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline font-mono">
                        Freshness Guaranteed
                      </span>
                    </div>
                  ) : null}

                  {/* Progress Stepper Section */}
                  <div className="p-4 sm:p-8 border-b border-gray-100 dark:border-[#27342d] bg-white dark:bg-[#18201c]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
                      <div>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-[#d9f447]">
                          Live Order Progress
                        </p>
                        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                          <span>{activeOrder.statusText}</span>
                          {activeOrder.paymentStatus === 'verified' && (
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Payment Verified
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="self-start sm:self-center text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5 shadow-xs">
                        <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                        Step {activeOrder.statusStep} of 4
                      </span>
                    </div>

                    {/* Connected Horizontal Timeline */}
                    <div className="relative max-w-3xl mx-auto px-2 py-4">
                      {/* Connecting Track Line (Background & Filled Animated Progress) */}
                      <div className="absolute top-[26px] sm:top-[30px] left-8 right-8 sm:left-12 sm:right-12 h-1.5 bg-gray-100 dark:bg-[#253229] rounded-full z-0 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{
                            width: `${((Math.max(1, Math.min(activeOrder.statusStep, 4)) - 1) / 3) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Step Nodes */}
                      <div className="grid grid-cols-4 gap-2 text-center relative z-10">
                        {[
                          {
                            num: 1,
                            title: 'Confirmed',
                            desc:
                              activeOrder.paymentStatus === 'verified' ||
                              activeOrder.rawStatus === 'sent_to_vendor'
                                ? 'Payment Verified'
                                : 'Order Placed',
                          },
                          {
                            num: 2,
                            title: 'Cooking',
                            desc:
                              activeOrder.rawStatus === 'sent_to_vendor'
                                ? 'Sent to Kitchen'
                                : activeOrder.rawStatus === 'packing'
                                  ? 'Packing Order'
                                  : 'Preparing Food',
                          },
                          {
                            num: 3,
                            title:
                              activeOrder.rawStatus === 'ready' ||
                              activeOrder.rawStatus === 'ready_for_pickup' ||
                              activeOrder.rawStatus === 'rider_assigned' ||
                              activeOrder.rawStatus === 'at_restaurant'
                                ? 'Ready / Assigned'
                                : 'On the Way',
                            desc:
                              activeOrder.rawStatus === 'ready' ||
                              activeOrder.rawStatus === 'ready_for_pickup' ||
                              activeOrder.rawStatus === 'rider_assigned' ||
                              activeOrder.rawStatus === 'at_restaurant'
                                ? 'Food Prepared'
                                : 'Out for Delivery',
                          },
                          { num: 4, title: 'Delivered', desc: 'At Doorstep' },
                        ].map((step) => {
                          const isDone = activeOrder.statusStep > step.num
                          const isCurrent = activeOrder.statusStep === step.num
                          const isPassedOrCurrent = activeOrder.statusStep >= step.num

                          return (
                            <div key={step.num} className="flex flex-col items-center group">
                              {/* Circle Indicator */}
                              <div
                                className={`grid size-9 sm:size-12 place-items-center rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md ${
                                  isDone
                                    ? 'bg-emerald-500 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/20 dark:ring-[#d9f447]/30 scale-105'
                                    : isCurrent
                                      ? 'bg-emerald-600 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/30 dark:ring-[#d9f447]/40 scale-110 font-black shadow-lg animate-pulse'
                                      : 'bg-white dark:bg-[#121815] border-2 border-gray-200 dark:border-[#28372e] text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="size-4 sm:size-6 stroke-[3]" />
                                ) : (
                                  <span>{step.num}</span>
                                )}
                              </div>

                              {/* Step Label & Subtitle */}
                              <div className="mt-2.5 sm:mt-3.5 space-y-0.5">
                                <p
                                  className={`text-xs sm:text-sm font-extrabold transition-colors leading-tight ${
                                    isPassedOrCurrent
                                      ? 'text-gray-900 dark:text-white'
                                      : 'text-gray-400 dark:text-gray-500'
                                  }`}
                                >
                                  {step.title}
                                </p>
                                <p
                                  className={`text-[10px] sm:text-xs leading-tight transition-colors hidden sm:block ${
                                    isCurrent
                                      ? 'text-emerald-600 dark:text-[#d9f447] font-semibold'
                                      : isPassedOrCurrent
                                        ? 'text-gray-500 dark:text-gray-400 font-medium'
                                        : 'text-gray-400 dark:text-gray-600'
                                  }`}
                                >
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Live Rider Delivery Route View */}
                  <div className="p-4 sm:p-6 bg-[#f8f9f6] dark:bg-[#151c18] border-b border-gray-200 dark:border-[#27342d] flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white flex items-center gap-2">
                          <Compass
                            className="size-4 sm:size-5 text-emerald-600 dark:text-[#d9f447] animate-spin"
                            style={{ animationDuration: '8s' }}
                          />
                          Live Rider Delivery Route
                        </h4>
                        <p className="text-[11px] sm:text-xs text-[#737e77] dark:text-gray-400 mt-0.5">
                          {activeOrder.driverName && activeOrder.driverName !== 'Unassigned'
                            ? `Tracking rider moving live on road from kitchen counter to ${deliveryAddress}.`
                            : 'Live GPS route mapping will activate once a driver accepts your pickup.'}
                        </p>
                      </div>
                    </div>

                    {activeOrder.driverName && activeOrder.driverName !== 'Unassigned' ? (
                      <LiveDriverMap
                        restaurantName={activeOrder.restaurantName}
                        driverName={activeOrder.driverName}
                        statusStep={activeOrder.statusStep}
                        driverLat={
                          liveDriverPos?.lat ??
                          (activeOrder.driverLat ? Number(activeOrder.driverLat) : null)
                        }
                        driverLng={
                          liveDriverPos?.lng ??
                          (activeOrder.driverLng ? Number(activeOrder.driverLng) : null)
                        }
                        restaurantLat={
                          activeOrder.restaurantLat ? Number(activeOrder.restaurantLat) : undefined
                        }
                        restaurantLng={
                          activeOrder.restaurantLng ? Number(activeOrder.restaurantLng) : undefined
                        }
                        customerLat={
                          activeOrder.customerLat
                            ? Number(activeOrder.customerLat)
                            : (selectedMapPin?.lat ?? undefined)
                        }
                        customerLng={
                          activeOrder.customerLng
                            ? Number(activeOrder.customerLng)
                            : (selectedMapPin?.lng ?? undefined)
                        }
                        isStale={isDriverGpsStale}
                      />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-[#28372e] bg-white dark:bg-[#121815] p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-2.5 sm:gap-3 shadow-xs">
                        <div className="size-11 sm:size-12 rounded-2xl bg-[#f0f5db] dark:bg-[#d9f447]/10 text-[#7f9815] dark:text-[#d9f447] flex items-center justify-center shadow-xs">
                          <Bike className="size-5 sm:size-6 animate-pulse" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white">
                            Awaiting Driver Acceptance
                          </h5>
                          <p className="text-[11px] sm:text-xs text-[#737e77] dark:text-gray-400 max-w-md mt-1 leading-relaxed">
                            Your order is confirmed and being prepared. The live GPS map will be
                            displayed here as soon as a delivery partner accepts the pickup request.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Delivery Partner Card */}
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#18201c]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 sm:size-12 place-items-center rounded-xl sm:rounded-2xl bg-[#18201c] dark:bg-[#27342d] text-white shrink-0 shadow-md">
                        <Bike className="size-5 sm:size-6 text-[#d9f447]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-[#737e77] dark:text-gray-400">
                          Assigned Delivery Partner
                        </p>
                        <p className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white mt-0.5 truncate">
                          {activeOrder.driverName || 'Awaiting driver assignment'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      {activeOrder.driverPhone ? (
                        <a
                          href={`tel:${activeOrder.driverPhone}`}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ded4] dark:border-[#27342d] bg-[#18201c] dark:bg-[#d9f447] px-4 sm:px-5 py-2.5 text-xs font-bold text-white dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] transition shadow-sm"
                        >
                          <PhoneCall className="size-3.5 text-[#d9f447] dark:text-[#18201c]" />
                          Call Partner
                        </a>
                      ) : (
                        <span className="text-[11px] sm:text-xs text-gray-400 italic">
                          Contact details available upon pickup
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Delivery OTP Card (High-End 6-Digit Monospace Security Card) */}
                  {activeOrder.otp && (
                    <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-[#27342d] bg-gradient-to-r from-[#f7faef] via-white to-[#f7faef] dark:from-[#1b251e] dark:via-[#161f19] dark:to-[#1b251e] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-b-3xl">
                      <div className="flex items-center gap-3.5">
                        <div className="grid size-11 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shrink-0 shadow-md">
                          <KeyRound className="size-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase text-[#5e8210] dark:text-[#d9f447] tracking-wider">
                              Delivery Verification OTP
                            </span>
                            <span className="rounded-full bg-emerald-500/10 dark:bg-[#d9f447]/10 text-emerald-700 dark:text-[#d9f447] text-[9px] font-extrabold px-2 py-0.5 border border-emerald-500/20 dark:border-[#d9f447]/30">
                              CONFIDENTIAL
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#18201c] dark:text-gray-200 mt-0.5 leading-relaxed">
                            Share this 6-digit code only upon driver arrival with your food
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                        <div className="flex items-center gap-1 sm:gap-1.5" aria-label="Delivery OTP digits">
                          {String(activeOrder.otp).padStart(6, '0').split('').map((digit, i) => (
                            <span
                              key={i}
                              className="grid size-8 sm:size-9 place-items-center rounded-xl bg-white dark:bg-[#101713] border-2 border-emerald-500/30 dark:border-[#d9f447]/40 font-mono font-black text-sm sm:text-base text-emerald-700 dark:text-[#d9f447] shadow-sm select-all"
                            >
                              {digit}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyOtp(activeOrder.otp)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#18201c] border border-gray-200 dark:border-[#27342d] px-3 py-2 text-xs font-black text-[#18201c] dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f28] active:scale-95 transition shadow-xs cursor-pointer ml-1"
                          title="Copy OTP to clipboard"
                        >
                          {otpCopied ? (
                            <>
                              <Check className="size-3.5 text-emerald-500 stroke-[3]" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5 text-gray-500" />
                              <span>Copy OTP</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Handover confirmed — the code was entered by the driver */}
                  {!activeOrder.otp && activeOrder.otpConsumed && (
                    <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-[#27342d] bg-[#f7faef] dark:bg-[#1f2822] flex items-center gap-3 rounded-b-3xl">
                      <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <ShieldCheck className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                          Delivery Verified
                        </p>
                        <p className="text-xs font-bold text-[#18201c] dark:text-gray-200 mt-0.5">
                          Your delivery code was verified — the order was handed over successfully
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Delivered Action Card: Prompt customer to easily order again */}
                  {(activeOrder.statusStep >= 4 ||
                    activeOrder.status === 'delivered' ||
                    activeOrder.status === 'completed') && (
                    <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-[#27342d] bg-[#f8f9f6] dark:bg-[#151c18] flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-b-3xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <h4 className="text-sm font-black text-[#18201c] dark:text-white">
                            Order Delivered Successfully
                          </h4>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          Hope you enjoyed your meal! Craving something else?
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(undefined)
                            navigateToTab('explore')
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <UtensilsCrossed className="size-3.5" />
                          <span>Explore Kitchens & Order Again</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(undefined)
                            navigateToTab('orders')
                          }}
                          className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 backdrop-blur-sm active:scale-95 transition-all"
                        >
                          <span>All Orders</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : inProgressOrders.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-[#dfe5db] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white">
                    Active Orders Under Process ({inProgressOrders.length})
                  </h3>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:inline">
                    Click an order to view live map &amp; status
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inProgressOrders.map((ord: any) => {
                    const isCurrentSelected =
                      activeOrder && String(activeOrder.id) === String(ord.id)
                    let itemsArr: any[] = []
                    try {
                      itemsArr =
                        typeof ord.items === 'string'
                          ? JSON.parse(ord.items || '[]')
                          : ord.items || []
                    } catch (e) {}

                    const statusTextMap: Record<string, string> = {
                      payment_submitted: 'Order Confirmed',
                      payment_verified: 'Payment Verified',
                      sent_to_vendor: 'Sent to Kitchen',
                      accepted: 'Accepted',
                      preparing: 'Preparing Food',
                      cooking: 'Cooking',
                      packing: 'Packing Food',
                      ready: 'Ready for Pickup',
                      at_restaurant: 'Rider at Kitchen',
                      picked_up: 'Food Picked Up',
                      out_for_delivery: 'Out for Delivery',
                      arrived_customer: 'Rider Arrived',
                    }
                    const ordStatusText =
                      statusTextMap[ord.status] || ord.status?.replace(/_/g, ' ') || 'In Progress'

                    const rawDateVal = ord.created_at || ord.createdAt || ord.timestamp
                    const timeStr =
                      rawDateVal && !isNaN(new Date(rawDateVal).getTime())
                        ? new Date(rawDateVal).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : ''

                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrderId(String(ord.id))
                          router.push(`/user/track/${ord.id}`)
                        }}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                          isCurrentSelected
                            ? 'bg-[#18201c] text-white border-[#18201c] shadow-lg ring-2 ring-[#d9f447]'
                            : 'bg-[#f8f9f6] text-[#18201c] border-[#e1e6df] hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p
                              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isCurrentSelected ? 'text-[#d9f447]' : 'text-gray-400'}`}
                            >
                              Order #{String(ord.id).slice(0, 8).toUpperCase()}
                            </p>
                            <h4 className="font-extrabold text-xs sm:text-sm truncate mt-0.5">
                              {ord.restaurant_name || ord.restaurantName || 'Crave Kitchen Store'}
                            </h4>
                          </div>
                          <span
                            className={`text-xs font-bold shrink-0 ${
                              isCurrentSelected
                                ? 'text-emerald-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {ordStatusText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                          <div className="min-w-0 flex flex-col">
                            <span className={isCurrentSelected ? 'text-gray-300' : 'text-gray-500'}>
                              {itemsArr.length} {itemsArr.length === 1 ? 'item' : 'items'} &bull; ₹
                              {ord.total_amount || ord.subtotal || 0}
                            </span>
                            {timeStr && (
                              <span
                                className={`text-[10px] ${isCurrentSelected ? 'text-gray-400' : 'text-gray-400'}`}
                              >
                                Placed at {timeStr}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrderId(String(ord.id))
                              router.push(`/user/track/${ord.id}`)
                            }}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition shadow-xs shrink-0 ${
                              isCurrentSelected
                                ? 'bg-[#d9f447] text-[#18201c] hover:bg-[#c8e434]'
                                : 'bg-[#18201c] text-[#ffffff] hover:bg-[#2e3b34]'
                            }`}
                          >
                            <Bike className="size-3" />
                            <span>{isCurrentSelected ? 'Live' : 'Track Order'}</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-12 text-center text-[#18201c] dark:text-white">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5db] dark:bg-[#27342d] text-[#7f9815] dark:text-[#d9f447]">
                  <ShoppingBag className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">
                  No Active Order Right Now
                </h3>
                <p className="mt-1 text-xs text-[#747e78] dark:text-gray-300 max-w-sm mx-auto">
                  Browse your favourite dishes and place an order to see live delivery tracking
                  here.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
                  className="mt-6 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c8e434] transition"
                >
                  Explore Kitchens
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Menu Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-t-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-[#25332a] pb-4">
              <div>
                <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90">
                  {selectedRestaurant.tag}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">{selectedRestaurant.name}</h2>
                <p className="text-xs text-[#9eb3a4]">
                  {selectedRestaurant.cuisine} · {selectedRestaurant.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="grid size-8 place-items-center rounded-full bg-[#121815] border border-[#25332a] text-[#9eb3a4] hover:text-white hover:border-[#2d3b32] transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {menuItemsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9eb3a4] border border-dashed border-[#25332a] bg-[#121815] rounded-2xl">
                  No dishes currently listed for this restaurant menu.
                </div>
              ) : (
                menuItemsList.map((item) => {
                  const hasVariants = Boolean(item.variants?.length)
                  const inCart = hasVariants ? undefined : cart.find((i) => i.id === item.id)
                  const variantCartQuantity = hasVariants
                    ? cart
                        .filter(
                          (cartItem) =>
                            cartItem.menuItemId === item.id ||
                            cartItem.id.startsWith(`${item.id}::`)
                        )
                        .reduce((quantity, cartItem) => quantity + cartItem.qty, 0)
                    : 0
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-2xl border border-[#25332a] bg-[#121815] p-3 text-white transition hover:border-[#d9f447]/50"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-20 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-20 rounded-xl bg-[#1c2620] border border-[#25332a] shrink-0 flex items-center justify-center text-[10px] text-[#9eb3a4]">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white">{item.name}</h4>
                        {item.detail && (
                          <p className="text-xs text-[#9eb3a4] line-clamp-2 mt-0.5">
                            {item.detail}
                          </p>
                        )}
                        {hasVariants && (
                          <p className="mt-1.5 text-[11px] font-semibold text-white/60">
                            {item.variants?.length} sizes available
                            {variantCartQuantity > 0 && ` · ${variantCartQuantity} in cart`}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-bold text-[#d9f447]">
                          {hasVariants ? 'From ' : ''}₹{menuItemDisplayPrice(item)}
                        </p>
                      </div>

                      {hasVariants ? (
                        <button
                          type="button"
                          onClick={() => openVariantPicker(item)}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#d9f447] px-4 py-2 text-xs font-extrabold text-[#121815] transition hover:scale-105 hover:bg-[#c2dc3a]"
                        >
                          <Plus className="size-3.5" />
                          Choose size
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-2 rounded-full bg-[#1c2620] border border-[#25332a] px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                          <button
                            onClick={() => updateItemQty(item.id, -1)}
                            className="hover:text-[#d9f447]"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span>{inCart.qty}</span>
                          <button
                            onClick={() => updateItemQty(item.id, 1)}
                            className="hover:text-[#d9f447]"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1.5 rounded-full bg-[#d9f447] px-4 py-2 text-xs font-extrabold text-[#121815] transition hover:scale-105 hover:bg-[#c2dc3a]"
                        >
                          <Plus className="size-3.5" />
                          Add
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="sticky bottom-0 mb-safe mt-6 rounded-2xl bg-[#121815] p-4 text-white flex items-center justify-between shadow-2xl border border-[#25332a]">
                <div>
                  <p className="text-xs text-[#9eb3a4]">{totalCartItemCount} items in cart</p>
                  <p className="text-lg font-bold text-[#d9f447]">₹{cartSubtotal}</p>
                </div>
                <button
                  onClick={() => router.push('/user/cart')}
                  className="flex items-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-extrabold text-[#121815] shadow-md hover:scale-105 transition hover:bg-[#c2dc3a]"
                >
                  View Cart <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Size and Price Selection Modal */}
      {variantPickerItem && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variant-picker-title"
          onClick={closeVariantPicker}
        >
          <div
            className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border border-[#2d3b32] bg-[#1c2620] text-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#2d3b32] p-5 sm:p-6">
              <div className="min-w-0 pr-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d9f447]">
                  Select a variant
                </p>
                <h3 id="variant-picker-title" className="mt-1 truncate text-xl font-black">
                  {variantPickerItem.name}
                </h3>
                <p className="mt-1 text-xs text-[#9eb3a4]">
                  Choose Small, Medium or Large and review its price before adding it.
                </p>
              </div>
              <button
                type="button"
                onClick={closeVariantPicker}
                aria-label="Close size selection"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-[#2d3b32] bg-[#121815] text-[#9eb3a4] transition hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="overflow-hidden rounded-2xl border border-[#2d3b32]">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#121815] text-[10px] font-black uppercase tracking-wider text-[#9eb3a4]">
                    <tr>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3b32]">
                    {variantPickerItem.variants?.map((variant) => {
                      const selected = variantPickerSelection === variant.id
                      return (
                        <tr
                          key={variant.id}
                          className={`${
                            selected ? 'bg-[#d9f447]/10' : 'bg-[#18201c] hover:bg-[#202c25]'
                          } ${variant.inStock ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                          onClick={() => {
                            if (variant.inStock) setVariantPickerSelection(variant.id)
                          }}
                        >
                          <td className="px-4 py-4">
                            <label className="flex cursor-pointer items-center gap-3 font-bold">
                              <input
                                type="radio"
                                name={`variant-${variantPickerItem.id}`}
                                value={variant.id}
                                checked={selected}
                                disabled={!variant.inStock}
                                onChange={() => setVariantPickerSelection(variant.id)}
                                className="size-4 accent-[#d9f447]"
                              />
                              <span>{variant.name}</span>
                              {!variant.inStock && (
                                <span className="text-[10px] font-bold uppercase text-rose-400">
                                  Unavailable
                                </span>
                              )}
                            </label>
                          </td>
                          <td className="px-4 py-4 text-right text-base font-black text-[#d9f447]">
                            ₹{variant.price}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={closeVariantPicker}
                  className="flex-1 rounded-2xl border border-[#2d3b32] px-4 py-3 text-xs font-extrabold text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmVariantSelection}
                  disabled={!variantPickerSelection}
                  className="flex-[1.5] rounded-2xl bg-[#d9f447] px-4 py-3 text-xs font-black text-[#121815] transition hover:bg-[#c8e434] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add selected size
                  {variantPickerItem.variants?.find(
                    (variant) => variant.id === variantPickerSelection
                  ) &&
                    ` · ₹${
                      variantPickerItem.variants.find(
                        (variant) => variant.id === variantPickerSelection
                      )?.price
                    }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout & Real UPI Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-[500px] rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white">
            <div className="flex items-start justify-between border-b border-[#25332a] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                  Direct Company UPI Payment
                </p>
                <h3 className="text-xl font-bold text-white">Complete Payment</h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="grid size-8 place-items-center rounded-full bg-[#121815] border border-[#25332a] text-[#9eb3a4] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {paymentDone ? (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#d9f447] text-[#121815]">
                  <Check className="size-8" />
                </div>
                <h4 className="mt-4 text-xl font-bold text-white">Payment Received!</h4>
                <p className="mt-1 text-xs text-[#9eb3a4]">
                  Your payment has been received and your order is being prepared.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 flex flex-col gap-4">
                {/* Company UPI Box */}
                {checkoutConfig && companyUpiId ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {companyMerchantName || 'Merchant UPI'}
                        </p>
                        <p className="font-mono text-base font-bold text-white mt-0.5">
                          {companyUpiId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCompanyUpi}
                        className="flex items-center gap-1 rounded-xl bg-[#121815] border border-emerald-500/40 px-3 py-1.5 font-bold text-emerald-300 shadow-xs hover:bg-emerald-500/20 transition"
                      >
                        <Copy className="size-3.5" /> Copy
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-emerald-500/30 flex items-center justify-between">
                      <span className="text-[11px] text-[#9eb3a4]">
                        Amount to pay: <strong className="text-[#d9f447]">₹{grandTotal}</strong>
                      </span>
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(companyUpiId)}&pn=${encodeURIComponent(companyMerchantName)}&am=${grandTotal}&cu=INR`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 underline hover:text-emerald-200"
                      >
                        Open UPI App <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p
                    role="alert"
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300"
                  >
                    Online payment settings are not configured. Contact the platform administrator.
                  </p>
                )}

                <div className="rounded-2xl bg-[#121815] p-4 text-xs space-y-2 border border-[#25332a]">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-[#9eb3a4]" />
                      Items Subtotal ({totalCartItemCount} items)
                    </span>
                    <span>₹{cartSubtotal}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span className="flex items-center gap-1.5">
                      <Bike className="size-3.5 text-[#9eb3a4]" />
                      Delivery Partner Fee
                    </span>
                    {pricingBreakdown.isFreeDelivery ? (
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px]">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-white">₹{pricingBreakdown.deliveryFee}</span>
                    )}
                  </div>

                  {(pricingBreakdown.surgeFee > 0 ||
                    pricingBreakdown.rainFee > 0 ||
                    pricingBreakdown.nightSurgeFee > 0) && (
                    <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                      <span>Demand &amp; Weather Surge</span>
                      <span className="font-bold">
                        +₹
                        {pricingBreakdown.surgeFee +
                          pricingBreakdown.rainFee +
                          pricingBreakdown.nightSurgeFee}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span>Packaging &amp; Handling</span>
                    <span className="font-bold text-white">₹{pricingBreakdown.handlingFee}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span>Platform Service Fee</span>
                    <span className="font-bold text-white">₹{pricingBreakdown.platformFee}</span>
                  </div>

                  {(pricingBreakdown.gstAmount ?? 0) >= 0 && (
                    <div className="flex items-center justify-between text-[#9eb3a4]">
                      <span>GST &amp; Taxes</span>
                      <span className="font-bold text-white">
                        ₹{pricingBreakdown.gstAmount ?? 0}
                      </span>
                    </div>
                  )}

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex items-center justify-between font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span className="flex items-center gap-1">
                        <Tag className="size-3.5 text-emerald-400" />
                        Coupon ({appliedCoupon.code})
                      </span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2.5 border-t border-[#25332a] font-black text-sm text-white">
                    <span>Final Customer Total</span>
                    <span className="text-[#d9f447] text-base">₹{grandTotal}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white">
                    12-Digit UTR Payment Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    placeholder="Enter the bank UTR reference"
                    value={utrRef}
                    onChange={(e) => {
                      setUtrRef(e.target.value.replace(/\D/g, ''))
                      setUtrError('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#25332a] bg-[#121815] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#d9f447] font-mono font-bold"
                  />
                  {utrError && (
                    <p className="mt-1 text-[11px] font-bold text-rose-400">{utrError}</p>
                  )}
                  {utrRef.length > 0 && utrRef.length < 10 && (
                    <p className="mt-1 text-[11px] font-bold text-amber-400">
                      Enter at least 10 digits to enable confirmation ({utrRef.length}/10)
                    </p>
                  )}
                  {utrRef.length >= 10 && (
                    <p className="mt-1 text-[11px] font-bold text-[#d9f447] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Valid UTR Reference length (
                      {utrRef.length} digits)
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmittingCheckout ||
                    !checkoutConfig ||
                    !companyUpiId ||
                    utrRef.replace(/\D/g, '').length < 10
                  }
                  className="mt-2 w-full rounded-full bg-[#d9f447] py-3.5 text-xs font-extrabold text-[#121815] transition hover:bg-[#c2dc3a] shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-gray-600 relative overflow-hidden flex items-center justify-center"
                >
                  {isSubmittingCheckout ? (
                    <CraveButtonLoader
                      label="Securing & Placing Order..."
                      sublabel="Verifying payment details with kitchen"
                      variant="dark"
                      size="md"
                    />
                  ) : (
                    <>Submit Order &amp; Start Verification (₹{grandTotal})</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3-Minute Payment Verification Modal */}
      {verifyingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white text-center animate-in zoom-in-95 duration-200">
            <div className="relative mx-auto flex items-center justify-center size-16 mb-2">
              <div className="relative size-16 grid place-items-center rounded-2xl bg-[#d9f447] text-[#121815]">
                <Sparkles className="size-8 fill-current" />
              </div>
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">Verifying Payment Details</h3>
            <p className="mt-1 text-xs text-[#9eb3a4]">
              Order ID: <strong className="font-mono text-white">{verifyingModal.orderId}</strong>
            </p>

            {verifyingModal.status === 'verifying' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[#121815] p-4 border border-[#25332a]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9eb3a4]">
                    Verification Window Remaining
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-[#d9f447]">
                    {Math.floor(verifyingModal.timer / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(verifyingModal.timer % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="mt-2 text-[11px] text-[#9eb3a4]">
                    Confirming transaction details with payment gateway records.
                  </p>
                </div>

                <p className="text-center text-xs text-[#9eb3a4]">
                  Payment status updates automatically as soon as the transaction is confirmed.
                </p>
              </div>
            )}

            {verifyingModal.status === 'verified' && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <p className="text-sm font-bold text-emerald-900">Payment Approved!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your order has been accepted and dispatched to the kitchen. Redirecting to live
                  tracking...
                </p>
              </div>
            )}

            {verifyingModal.status === 'rejected' && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200">
                  <p className="text-sm font-bold text-rose-900">Payment Verification Failed</p>
                  <p className="text-xs text-rose-700 mt-1">
                    The UTR reference entered could not be verified. Please verify your UTR number.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })
                  }
                  className="w-full rounded-full bg-[#18201c] py-2.5 text-xs font-bold text-white"
                >
                  Close &amp; Retry UTR
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Production-Grade Swiggy/Zomato Add & Manage Address Modal */}
      <AddressModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectAddress={(addr) => {
          updateDeliveryAddress(addr.address)
          if (addr.latitude != null && addr.longitude != null) {
            setSelectedMapPin({ lat: Number(addr.latitude), lng: Number(addr.longitude) })
          }
          loadAddresses()
          setShowLocationModal(false)
          triggerToast(`Switched delivery address to ${addr.label}!`)
        }}
      />

      {/* Cart Store Conflict Modal */}
      {conflictModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-100 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#18201c]">Replace cart items?</h3>
                <p className="text-xs text-gray-500">
                  Your cart contains items from a different store.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-600 leading-relaxed">
              Your cart currently has items from{' '}
              <strong className="text-[#18201c]">{conflictModal.currentRest}</strong>. Do you want
              to discard them and add{' '}
              <strong className="text-[#18201c]">{conflictModal.newItem?.name}</strong> from{' '}
              <strong className="text-[#18201c]">{conflictModal.newRest}</strong>?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() =>
                  setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
                }
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveConflictClear}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition"
              >
                Yes, Start New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalOrder && (
        <InvoiceModal order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121815]/95 border-t border-gray-200 dark:border-[#27342d] backdrop-blur-md lg:hidden px-2 py-1.5 shadow-lg pb-safe-nav"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => navigateToTab('explore')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'explore'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <Compass
              className={`size-5 ${
                activeTab === 'explore'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Explore</span>
          </button>

          <button
            onClick={() => navigateToTab('live-order')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative ${
              activeTab === 'live-order'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <div className="relative">
              <Bike
                className={`size-5 ${
                  activeTab === 'live-order'
                    ? 'text-[#b5de28] dark:text-[#d9f447]'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              {activeOrder && activeOrder.statusStep < 4 && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#d9f447] animate-ping" />
              )}
            </div>
            <span className="text-[10px]">Track</span>
          </button>

          <button
            onClick={() => navigateToTab('orders')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'orders'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <History
              className={`size-5 ${
                activeTab === 'orders'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Orders</span>
          </button>

          <button
            onClick={() => router.push('/user/cart')}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative text-gray-400 dark:text-gray-500 font-bold"
          >
            <div className="relative">
              <ShoppingCart className="size-5 text-gray-400 dark:text-gray-500" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {totalCartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Cart</span>
          </button>

          <button
            onClick={() => navigateToTab('profile')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'profile'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <User
              className={`size-5 ${
                activeTab === 'profile'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
