'use client'

import { Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  target: { id: string; name: string; email?: string } | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmModal({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!target) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 animate-in fade-in zoom-in-95 duration-150">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
          <Trash2 className="size-6" />
        </div>
        <h3 className="mt-4 text-center text-lg font-bold text-[#18201c] dark:text-white">
          Delete Store / Restaurant?
        </h3>
        <p className="mt-2 text-center text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          Are you sure you want to permanently delete store{' '}
          <strong className="text-gray-900 dark:text-white">{target.name}</strong>
          {target.email ? ` (${target.email})` : ''}? This action will erase the store, owner
          account, and all associated menu items from database.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-gray-300 dark:border-[#27342d] py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-rose-600 dark:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 dark:hover:bg-rose-600 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Store'}
          </button>
        </div>
      </div>
    </div>
  )
}
