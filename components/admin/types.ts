import { UserRole } from '@/lib/auth-context'

export interface AccountRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: 'active' | 'pending' | 'suspended'
  joinedDate: string
  detail: string
  phone?: string
  address?: string
  restaurantName?: string
  cuisine?: string
  commissionRate?: number
  paymentModel?: 'commission' | 'markup'
  vendorType?: 'Restaurant Vendor' | 'XP Store'
  totalSpent?: number
  totalOrders?: number
  latitude?: number
  longitude?: number
  bannerUrl?: string
}

export interface PaymentReference {
  id: string
  orderId: string
  customerUpi: string
  utrRef: string
  amount: number
  submittedAt: string
  status: 'pending' | 'verified' | 'rejected'
}

export interface ProductVariant {
  id: string
  name: string
  restaurantPrice: number
  price: number
  inStock: boolean
  isDefault: boolean
}

export interface ProductItem {
  id: string
  vendorId: string
  categoryId?: string
  name: string
  description?: string
  sku?: string
  price: number
  restaurantPrice: number
  currency: string
  imageUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
  categoryName?: string
  isVeg: boolean
  unit?: string
  stockCount: number
  hsnSacCode: string
  priceTaxMode: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  expiryDate?: string
  variants: ProductVariant[]
}

export interface VendorStore {
  id: string
  userId: string
  storeName: string
  description?: string
  address?: string
  status: string
  isOpen: boolean
  commissionRate?: number
  commissionType?: string
  bannerUrl?: string
  latitude?: number
  longitude?: number
  phone?: string
}

export interface VendorFormData {
  ownerName: string
  email: string
  password: string
  storeName: string
  vendorType: 'Restaurant Vendor' | 'XP Store'
  cuisine: string
  phone: string
  address: string
  commercialModel: 'commission' | 'markup' | 'hybrid'
  commissionRate: number
  markupRate: number
  fixedCommission: number
  fixedMarkup: number
  paymentModel: 'commission' | 'markup'
  bannerUrl: string
  latitude: number
  longitude: number
  fssaiLicense: string
  gstin: string
  gstStatus: string
  gstRatePercent: number
  supplierState: string
  priceTaxMode: string
  bankAccountName: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  payoutVpa: string
}

export interface DriverFormData {
  name: string
  email: string
  password: string
  phone: string
  vehicleType: string
  licensePlate: string
  address: string
}

export interface EditAccountFormData {
  name: string
  email: string
  phone: string
  address: string
  password: string
  storeName: string
  cuisine: string
  commissionRate: number
  paymentModel: 'commission' | 'markup'
  vehicleType: string
  licensePlate: string
  bannerUrl: string
  latitude: number
  longitude: number
}
