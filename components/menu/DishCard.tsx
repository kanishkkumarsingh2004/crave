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
      className={`group rounded-3xl border p-4 sm:p-4.5 bg-white dark:bg-[#161617] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        item.in_stock
          ? 'border-black/[0.08] dark:border-white/[0.08]'
          : 'border-rose-500/30 bg-rose-500/[0.02]'
      }`}
    >
      <div>
        {/* Media Frame */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl mb-3.5 bg-stone-100 dark:bg-white/5">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className={`size-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                !item.in_stock ? 'grayscale opacity-60' : ''
              }`}
            />
          ) : (
            <div className="grid size-full place-items-center bg-stone-100 dark:bg-white/5 text-stone-400 dark:text-stone-500">
              <Utensils className="size-8 stroke-[1.5]" aria-hidden="true" />
            </div>
          )}

          {/* Floating Category Pill */}
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white shadow-xs uppercase tracking-wider">
            {item.category}
          </span>

          {/* Floating Dietary Indicator */}
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white shadow-xs">
            <span
              className={`size-2 rounded-full ${
                item.veg !== false ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span>{item.veg !== false ? 'Veg' : 'Non-Veg'}</span>
          </span>

          {!item.in_stock && (
            <span className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-xs text-white text-xs font-semibold uppercase tracking-wider">
              Out of Stock
            </span>
          )}
        </div>

        {/* Title & Pricing Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-white leading-snug truncate group-hover:text-[#86a018] transition-colors">
              {item.name}
            </h3>
            {item.unit && (
              <span className="inline-block text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                {item.unit}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-lg text-[#1D1D1F] dark:text-white block">
              {item.variants.length > 0 ? 'From ' : ''}₹{item.price}
            </span>
          </div>
        </div>

        {/* Margin Pill */}
        <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 dark:bg-white/5 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-1">
          <span>Restaurant ₹{item.restaurant_price}</span>
          <span className="opacity-50">·</span>
          <span>Margin ₹{item.price - item.restaurant_price}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed font-normal">
          {item.description || 'No description provided.'}
        </p>

        {/* Tag Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {item.variants.map((variant) => (
            <span
              key={variant.id}
              className="inline-flex items-center rounded-md bg-stone-100 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 px-2 py-0.5 font-medium text-stone-700 dark:text-stone-300 text-xs"
            >
              {variant.name}: ₹{variant.price}
            </span>
          ))}
          {item.stock_count != null && (
            <span className="inline-flex items-center rounded-md bg-stone-100 dark:bg-white/5 px-2 py-0.5 font-medium text-stone-600 dark:text-stone-400 text-xs">
              Stock: {item.stock_count} units
            </span>
          )}
          {item.sku_code && (
            <span className="inline-flex items-center rounded-md bg-stone-100 dark:bg-white/5 px-2 py-0.5 font-mono font-medium text-stone-500 dark:text-stone-400 text-xs">
              SKU: {item.sku_code}
            </span>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
        <button
          type="button"
          onClick={() => onToggleStock(item.id, item.in_stock)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            item.in_stock
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15'
              : 'bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/10 hover:bg-stone-200'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              item.in_stock ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
            }`}
          />
          <span>{item.in_stock ? 'In Stock' : 'Out of Stock'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(item)}
            className="size-8 rounded-full bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/20 transition grid place-items-center cursor-pointer shadow-2xs"
            title="Edit Dish"
          >
            <Edit className="size-3.5 stroke-[2]" />
          </button>
          <button
            onClick={() => onDelete(item.id, item.name)}
            className="size-8 rounded-full bg-stone-100 dark:bg-white/10 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition grid place-items-center cursor-pointer shadow-2xs"
            title="Delete Dish"
          >
            <Trash2 className="size-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  )
}
