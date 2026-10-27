export interface XPStore {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  owner_id?: string | null
  is_open: boolean
  delivery_minutes?: number | null
  image?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface XPProduct {
  id: string
  name: string
  unit: string
  price: number
  mrp: number
  image: string
  category: string
  inStock: boolean
  stockCount: number
  skuCode: string
  barcode?: string
}

export const emptyStoreForm = {
  ownerName: '',
  email: '',
  password: '',
  storeName: '',
  address: '',
  phone: '',
  latitude: 12.971599,
  longitude: 77.594566,
}

export const emptyProductForm = {
  name: '',
  category: 'Grocery Essentials',
  unit: '1 Pack',
  price: '',
  mrp: '',
  stockCount: '50',
  barcode: '',
  image: '',
  inStock: true,
}
