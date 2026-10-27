export interface MenuItemVariantRecord {
  id: string
  name: string
  restaurant_price: number
  price: number
  in_stock: boolean
  is_default: boolean
}

export interface MenuItemRecord {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  restaurant_price: number
  description: string
  in_stock: boolean
  image: string
  veg?: boolean
  unit?: string | null
  stock_count?: number
  sku_code?: string | null
  hsn_sac_code?: string | null
  price_tax_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  expiry_date?: string | null
  variants: MenuItemVariantRecord[]
}
