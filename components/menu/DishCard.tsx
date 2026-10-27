'use client'

import { Edit, Trash2, Utensils } from 'lucide-react'
import { MenuItemRecord } from './types'

interface DishCardProps {
  item: MenuItemRecord
  onToggleStock: (id: string, inStock: boolean) => void
  onEdit: (item: MenuItemRecord) => void
  onDelete: (id: string, name: string) => void
}

export default function DishCard({ item, onToggleStock, onEdit, onDelete }: DishCardProps) {
  return (
    <div
      className={`rounded-3xl border p-4 bg-white dark:bg-[#121815] shadow-sm dark:shadow-xl flex flex-col justify-between transition ${
        item.in_stock
          ? 'border-stone-200 dark:border-[#233027] hover:border-[#86a018]/40 dark:hover:border-[#d9f447]/40'
          : 'border-rose-500/30 bg-rose-500/5'
      }`}
    >
      <div>
        <div className="relative h-44 w-full overflow-hidden rounded-2xl mb-3 bg-stone-100 dark:bg-[#171f1b]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className={`size-full object-cover transition ${!item.in_stock ? 'grayscale opacity-60' : ''}`}
            />
          ) : (
            <div className="grid size-full place-items-center bg-stone-100 dark:bg-[#171f1b] text-stone-400 dark:text-gray-500">
              <Utensils className="size-8" aria-hidden="true" />
            </div>
          )}

          {/* Category Tag */}
          <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold uppercase text-[#121815] dark:text-white">
            {item.category}
          </span>

          {/* Veg / Non-Veg Indicator Badge */}
          <span className="absolute top-2.5 right-2.5 text-[10px] font-extrabold uppercase tracking-wide">
            {item.veg !== false ? (
              <span className="text-emerald-600 dark:text-emerald-400">VEG</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400">NON-VEG</span>
            )}
          </span>

          {!item.in_stock && (
            <span className="absolute inset-0 grid place-items-center bg-black/75 text-white text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
              Out of Stock
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-[#121815] dark:text-white leading-snug">
              {item.name}
            </h3>
            {item.unit && (
              <span className="inline-block text-[11px] font-bold text-stone-500 dark:text-gray-400">
                {item.unit}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="font-black text-lg text-[#5e700a] dark:text-[#d9f447]">
              {item.variants.length > 0 ? 'From ' : ''}₹{item.price}
            </span>
            <span className="block text-[10px] font-bold text-stone-500 dark:text-gray-400">
              Restaurant ₹{item.restaurant_price} · Margin ₹{item.price - item.restaurant_price}
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-500 dark:text-gray-400 mt-1 line-clamp-2">
          {item.description || 'No description provided.'}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px]">
          {item.variants.map((variant) => (
            <span key={variant.id} className="font-bold text-[#65780d] dark:text-[#d9f447] text-xs">
              {variant.name}: ₹{variant.price}
            </span>
          ))}
          {item.stock_count != null && (
            <span className="font-bold text-stone-600 dark:text-gray-300 text-xs">
              Stock: {item.stock_count} units
            </span>
          )}
          {item.sku_code && (
            <span className="font-mono font-bold text-stone-500 dark:text-gray-400 text-xs">
              SKU: {item.sku_code}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#202b24] flex items-center justify-between">
        <button
          type="button"
          onClick={() => onToggleStock(item.id, item.in_stock)}
          className={`text-xs font-bold uppercase transition hover:underline cursor-pointer ${
            item.in_stock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {item.in_stock ? 'In Stock' : 'Out of Stock'}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(item)}
            className="grid size-8 place-items-center rounded-xl bg-stone-100 dark:bg-[#1c2620] text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-[#25332a] transition border border-stone-200 dark:border-[#28372e] cursor-pointer"
            title="Edit Dish"
          >
            <Edit className="size-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id, item.name)}
            className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20 cursor-pointer"
            title="Delete Dish"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
