import { Icon } from '../../Icon'
import type { Restaurant } from '../../types'
import { RESTAURANT_FALLBACK_COUNT } from '../../utils/format'

interface RestaurantCardProps {
  restaurant: Restaurant
  onOpen: () => void
  distanceKm?: number
}

export function RestaurantCard({ restaurant, onOpen, distanceKm }: RestaurantCardProps) {
  return (
    <article className="restaurant-card" onClick={onOpen}>
      <div
        className={`restaurant-image${
          restaurant.image
            ? ''
            : ` restaurant-image-fallback-${restaurant.name.length % RESTAURANT_FALLBACK_COUNT}`
        }`}
        style={
          restaurant.image
            ? {
                background: `linear-gradient(0deg,rgba(0,0,0,.38),transparent),url(${restaurant.image}) center/cover`,
              }
            : undefined
        }
      >
        {restaurant.offer && <span className="offer">{restaurant.offer}</span>}
        {!restaurant.is_open && <span className="closed">Currently closed</span>}
      </div>
      <div className="restaurant-info">
        <div>
          <h3>{restaurant.name}</h3>
          <p>{restaurant.cuisine || 'Fresh local food'}</p>
        </div>
        <span className="card-eta">
          <span>
            <Icon name="clock" /> {restaurant.eta || '25–35 min'}
          </span>
          <span>{distanceKm != null ? `${distanceKm} km` : restaurant.distance || 'Nearby'}</span>
        </span>
      </div>
    </article>
  )
}