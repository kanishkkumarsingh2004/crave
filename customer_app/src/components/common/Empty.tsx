/**
 * Shared Empty state component.
 */

import { Icon } from '../../Icon'
import { useLanguage } from '../../../../dictionary/react'

export function Empty({
  icon,
  title,
  text,
}: {
  icon: 'search' | 'orders' | 'cart'
  title?: string
  text?: string
}) {
  const { t } = useLanguage()
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} />
      </div>
      <h3>{title ?? t.customer.noOrdersYet}</h3>
      <p>{text ?? t.customer.noOrdersYetHint}</p>
    </div>
  )
}
