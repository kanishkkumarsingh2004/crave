export interface MenuItemVariantRecord {
  id: string
  name: string
  restaurant_price: number
  in_stock: boolean
  is_default: boolean
}

export interface MenuItemRecord {
  id: string
  restaurant_id: string
  name: string
  category: string
  restaurant_price: number
  description: string
  in_stock: boolean
  availability_status?: 'AVAILABLE' | 'PAUSED_BY_VENDOR' | 'SOLD_OUT'
  is_orderable?: boolean
  image: string
  veg?: boolean
  unit?: string | null
  sku_code?: string | null
  hsn_sac_code?: string | null
  price_tax_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  expiry_date?: string | null
  variants: MenuItemVariantRecord[]
}
