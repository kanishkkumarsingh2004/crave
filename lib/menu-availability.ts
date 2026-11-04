export type InventoryMode = 'TRACKED' | 'UNTRACKED'

export type AvailabilityStatus = 'AVAILABLE' | 'PAUSED_BY_VENDOR' | 'SOLD_OUT'

type VariantAvailabilityInput = {
  id?: string | null
  in_stock?: boolean | null
  inStock?: boolean | null
}

export type MenuAvailabilityInput = {
  in_stock?: boolean | null
  stock_count?: number | null
  variants?: readonly VariantAvailabilityInput[] | null
}

export type MenuAvailability = {
  inventoryMode: InventoryMode
  status: AvailabilityStatus
  stockCount: number | null
  isOrderable: boolean
}

function variantIsEnabled(variant: VariantAvailabilityInput): boolean {
  return variant.in_stock !== false && variant.inStock !== false
}

export function getMenuItemAvailability(
  item: MenuAvailabilityInput,
  selectedVariantId?: string | null
): MenuAvailability {
  const stockCount =
    typeof item.stock_count === 'number' && Number.isFinite(item.stock_count)
      ? item.stock_count
      : null
  const inventoryMode: InventoryMode = stockCount == null ? 'UNTRACKED' : 'TRACKED'

  if (item.in_stock === false) {
    return { inventoryMode, status: 'PAUSED_BY_VENDOR', stockCount, isOrderable: false }
  }

  if (inventoryMode === 'TRACKED' && (stockCount == null || stockCount <= 0)) {
    return { inventoryMode, status: 'SOLD_OUT', stockCount, isOrderable: false }
  }

  const variants = Array.isArray(item.variants) ? item.variants : []
  if (selectedVariantId) {
    const selectedVariant = variants.find((variant) => variant.id === selectedVariantId)
    if (!selectedVariant || !variantIsEnabled(selectedVariant)) {
      return { inventoryMode, status: 'SOLD_OUT', stockCount, isOrderable: false }
    }
  } else if (variants.length > 0 && !variants.some(variantIsEnabled)) {
    return { inventoryMode, status: 'SOLD_OUT', stockCount, isOrderable: false }
  }

  return { inventoryMode, status: 'AVAILABLE', stockCount, isOrderable: true }
}

export function validateMenuItemAvailability(item: MenuAvailabilityInput): string | null {
  const availability = getMenuItemAvailability(item)
  if (item.in_stock !== false && availability.status === 'SOLD_OUT') {
    if (availability.inventoryMode === 'TRACKED' && (availability.stockCount ?? 0) <= 0) {
      return 'An available menu item must have at least one unit in stock.'
    }
    return 'An available menu item must have at least one available variant.'
  }
  return null
}

export function withMenuItemAvailability<T extends MenuAvailabilityInput>(item: T) {
  const availability = getMenuItemAvailability(item)
  const variants = Array.isArray(item.variants)
    ? item.variants.map((variant) => ({
        ...variant,
        is_orderable: availability.status === 'AVAILABLE' && variantIsEnabled(variant),
      }))
    : item.variants

  return {
    ...item,
    variants,
    inventory_mode: availability.inventoryMode,
    availability_status: availability.status,
    is_orderable: availability.isOrderable,
    is_available: availability.isOrderable,
  }
}
