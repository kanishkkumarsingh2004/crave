import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface AccessibleDialogProps {
  children: ReactNode
  className: string
  labelledBy: string
  onClose: () => void
  describedBy?: string
  backdropClassName?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

/** Accessible modal/bottom-sheet primitive shared by every mobile app. */
export function AccessibleDialog({
  children,
  className,
  labelledBy,
  onClose,
  describedBy,
  backdropClassName = 'modal-backdrop',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable()[0] ?? dialog
    const focusFrame = window.requestAnimationFrame(() => first.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus()
    }
  }, [closeOnEscape])

  const onBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) closeRef.current()
  }

  return (
    <div className={backdropClassName} onClick={onBackdropClick}>
      <section
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  )
}
