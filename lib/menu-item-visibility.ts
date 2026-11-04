import { withMenuItemAvailability } from '@/lib/menu-availability'

type MenuItemLike = Record<string, any> & {
  price?: number | null
  restaurant_price?: number | null
  stock_count?: number | null
  variants?: Array<Record<string, any>> | null
}

function withoutField<T extends Record<string, any>>(value: T, field: string) {
  const { [field]: _removed, ...rest } = value
  return rest
}

export function toVendorMenuItem(item: MenuItemLike) {
  const dto: any = withMenuItemAvailability({ ...item, stock_count: null } as any)
  const withoutAppPrice = withoutField(withoutField(dto, 'price'), 'stock_count')

  return {
    ...withoutAppPrice,
    variants: Array.isArray(dto.variants)
      ? dto.variants.map((variant: Record<string, any>) => withoutField(variant, 'price'))
      : dto.variants,
  }
}

export function toCustomerMenuItem(
  item: MenuItemLike,
  calculatePrice: (restaurantPrice: number) => number
) {
  const customerItem: any = {
    ...item,
    price: calculatePrice(Number(item.restaurant_price ?? item.price ?? 0)),
    stock_count: null,
    variants: Array.isArray(item.variants)
      ? item.variants.map((variant: any) => ({
          ...variant,
          price: calculatePrice(Number(variant.restaurant_price ?? variant.price ?? 0)),
        }))
      : item.variants,
  }
  const dto: any = withMenuItemAvailability(customerItem)
  const withoutRestaurantPrice = withoutField(dto, 'restaurant_price')

  return {
    ...withoutRestaurantPrice,
    variants: Array.isArray(dto.variants)
      ? dto.variants.map((variant: Record<string, any>) =>
          withoutField(variant, 'restaurant_price')
        )
      : dto.variants,
  }
}

export function toAdminMenuItem(item: MenuItemLike) {
  return withMenuItemAvailability(item as any)
}

export function toMenuItemRealtimeEvent(item: MenuItemLike) {
  const dto: any = withMenuItemAvailability({ ...item, stock_count: null } as any)
  return {
    id: dto.id,
    restaurant_id: dto.restaurant_id,
    name: dto.name,
    description: dto.description,
    in_stock: dto.in_stock,
    availability_status: dto.availability_status,
    is_orderable: dto.is_orderable,
    inventory_mode: dto.inventory_mode,
    variants: Array.isArray(dto.variants)
      ? dto.variants.map((variant: Record<string, any>) => ({
          id: variant.id,
          in_stock: variant.in_stock,
          is_orderable: variant.is_orderable,
        }))
      : [],
  }
}
