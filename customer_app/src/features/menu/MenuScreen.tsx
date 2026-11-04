import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Network } from '@capacitor/network'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { AccessibleDialog } from '@crave/mobile-core'
import { Spinner } from '../../components/common/Spinner'
import { Empty } from '../../components/common/Empty'
import { DishImage } from './DishImage'
import { checkoutDistanceKm, roadDistanceKm } from '../../pricing'
import { money } from '@crave/mobile-core'
import type { Restaurant, MenuItem, CartItem, Variant } from '../../types'

interface MenuScreenProps {
  restaurant: Restaurant
  onBack: () => void
  onAdd: (item: MenuItem, v?: Variant) => void
  cart: CartItem[]
}

export function MenuScreen({ restaurant, onBack, onAdd, cart }: MenuScreenProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [pick, setPick] = useState<MenuItem | null>(null)
  const [deviceLoc, setDeviceLoc] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const cached = localStorage.getItem('crave_device_location')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      if (
        parsed &&
        typeof parsed.lat === 'number' &&
        typeof parsed.lng === 'number' &&
        Number.isFinite(parsed.lat) &&
        Number.isFinite(parsed.lng)
      )
        return { lat: parsed.lat, lng: parsed.lng }
    } catch {}
    return null
  })
  const [roadDistance, setRoadDistance] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    apiRequest<{ items: MenuItem[] }>(
      `/api/menu-items?restaurantId=${encodeURIComponent(restaurant.id)}`
    )
      .then((r) => setItems(r.items || []))
      .catch((menuError) =>
        setLoadError(menuError instanceof Error ? menuError.message : 'Could not load this menu.')
      )
      .finally(() => setLoading(false))
  }, [restaurant.id, retry])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setDeviceLoc(location)
        try {
          localStorage.setItem(
            'crave_device_location',
            JSON.stringify({ ...location, updatedAt: Date.now() })
          )
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [restaurant.id])

  useEffect(() => {
    let cancelled = false
    const compute = async () => {
      if (!deviceLoc) {
        setRoadDistance(null)
        return
      }
      const restLat = Number(restaurant.latitude)
      const restLng = Number(restaurant.longitude)
      if (!Number.isFinite(restLat) || !Number.isFinite(restLng)) {
        setRoadDistance(null)
        return
      }
      const km = await roadDistanceKm(deviceLoc.lat, deviceLoc.lng, restLat, restLng)
      if (!cancelled) setRoadDistance(km)
    }
    compute()
    return () => {
      cancelled = true
    }
  }, [deviceLoc, restaurant.latitude, restaurant.longitude])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((x) => x.category || 'Popular')))],
    [items]
  )

  const filtered = items.filter(
    (x) =>
      (category === 'All' || (x.category || 'Popular') === category) &&
      `${x.name} ${x.description || x.detail || ''}`.toLowerCase().includes(query.toLowerCase())
  )

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MenuItem[]>()
    filtered.forEach((item) => {
      const label = item.category || 'Popular Items'
      groups.set(label, [...(groups.get(label) || []), item])
    })
    return Array.from(groups.entries())
  }, [filtered])

  const count = (id: string) =>
    cart.filter((x) => x.itemId === id).reduce((n, x) => n + x.quantity, 0)

  const facts: Array<{ icon: 'clock' | 'pin'; value: string; label: string }> = [
    { icon: 'clock' as const, value: restaurant.eta || '25–35 min', label: 'Delivery time' },
  ]
  if (roadDistance != null) {
    facts.push({ icon: 'pin' as const, value: `${roadDistance} km`, label: 'Distance' })
  } else if (restaurant.distance) {
    facts.push({ icon: 'pin' as const, value: restaurant.distance, label: 'Distance' })
  } else {
    facts.push({ icon: 'pin' as const, value: 'Nearby', label: 'Distance' })
  }

  const add = (item: MenuItem) => {
    const variants = (item.variants || []).filter((v) => v.in_stock !== false)
    if (
      restaurant.is_open === false ||
      item.in_stock === false ||
      item.is_available === false ||
      ((item.variants?.length || 0) > 0 && variants.length === 0)
    )
      return
    if (variants.length > 1) setPick(item)
    else onAdd(item, variants[0])
  }

  return (
    <div className="detail-screen">
      <header
        className="detail-hero"
        style={{
          background: restaurant.image
            ? `linear-gradient(180deg,rgb(0 0 0 / 18%),transparent 52%),url(${restaurant.image}) center/cover`
            : 'var(--hero-fallback)',
        }}
      >
        <div className="detail-hero-nav">
          <button className="round" onClick={onBack} aria-label="Back">
            <Icon name="back" />
          </button>
        </div>
      </header>
      <div className="detail-body">
        <section className="detail-summary" aria-labelledby="restaurant-name">
          <div className="detail-summary-heading">
            <h1 id="restaurant-name">{restaurant.name}</h1>
            {restaurant.rating != null && (
              <span className="rating-pill">
                <Icon name="star" /> {Number(restaurant.rating).toFixed(1)}
              </span>
            )}
          </div>
          <p>
            {restaurant.cuisine || 'Fresh local food'}
            {restaurant.cost_for_two ? ` · ${money(Number(restaurant.cost_for_two))} for two` : ''}
          </p>
          <div className="detail-facts">
            {facts.map((fact) => (
              <div className="fact" key={fact.label}>
                <Icon name={fact.icon} />
                <span>{fact.value}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="detail-chips" role="group" aria-label="Menu categories">
          {categories.map((c) => (
            <button
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
              key={c}
              aria-pressed={category === c}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="detail-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${restaurant.name}`}
            aria-label={`Search ${restaurant.name} menu`}
          />
          {query && (
            <button
              className="detail-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        {loading ? (
          <div className="loading">
            <Spinner /> Loading fresh dishes
          </div>
        ) : loadError ? (
          <div className="inline-retry">
            <div className="error-box">{loadError}</div>
            <button className="secondary" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <Empty icon="search" title="No dishes found" text="Try a different search or category." />
        ) : (
          <div className="menu-groups">
            {groupedItems.map(([groupName, groupItems], groupIndex) => (
              <section className="menu-group" key={groupName}>
                <div className="menu-group-heading">
                  <h2>{groupName}</h2>
                  {groupIndex === 0 && category === 'All' && <span>Top rated</span>}
                </div>
                <div className="menu-list">
                  {groupItems.map((item) => {
                    const variants = (item.variants || []).filter((v) => v.in_stock !== false)
                    const image = item.image || item.image_url
                    const unavailable =
                      restaurant.is_open === false ||
                      item.in_stock === false ||
                      item.is_available === false ||
                      ((item.variants?.length || 0) > 0 && variants.length === 0)
                    const from = variants.length
                      ? Math.min(...variants.map((v) => Number(v.price)))
                      : Number(item.price)
                    const description = (
                      item.description ||
                      item.detail ||
                      'Freshly prepared with quality ingredients.'
                    ).replace(/[·|]\s*$/, '')
                    return (
                      <article
                        className={`menu-item${unavailable ? ' is-unavailable' : ''}`}
                        key={item.id}
                      >
                        <DishImage src={image} name={item.name} />
                        <div className="menu-copy">
                          <div className="menu-meta">
                            <span className="veg-dot">
                              <i
                                className={(item.is_veg ?? item.veg) !== false ? 'veg' : 'nonveg'}
                              />
                            </span>
                            <small>{item.category || 'Popular'}</small>
                          </div>
                          <h3>{item.name}</h3>
                          <p>{description}</p>
                        </div>
                        <div className="menu-item-controls">
                          <strong className="menu-price">
                            {variants.length > 1 ? 'From ' : ''}
                            {money(from)}
                          </strong>
                          <button
                            className={count(item.id) ? 'added' : ''}
                            disabled={unavailable}
                            onClick={() => add(item)}
                            aria-label={`Add ${item.name} to bag`}
                          >
                            {unavailable ? (
                              restaurant.is_open === false ? (
                                'CLOSED'
                              ) : (
                                'SOLD OUT'
                              )
                            ) : count(item.id) ? (
                              `ADD · ${count(item.id)}`
                            ) : (
                              <>
                                ADD
                                <Icon name="plus" />
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {pick &&
        createPortal(
          <AccessibleDialog
            backdropClassName="modal-backdrop animated-backdrop"
            className="bottom-sheet animated-sheet"
            labelledBy="variant-sheet-title"
            onClose={() => setPick(null)}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">CHOOSE A SIZE</p>
                <h2 id="variant-sheet-title">{pick.name}</h2>
              </div>
              <button className="round pale" onClick={() => setPick(null)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <div className="variant-list">
              {(pick.variants || [])
                .filter((v) => v.in_stock !== false)
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onAdd(pick, v)
                      setPick(null)
                    }}
                  >
                    <span>
                      <b>{v.name}</b>
                      <small>Freshly made</small>
                    </span>
                    <strong>
                      {money(v.price)} <Icon name="plus" />
                    </strong>
                  </button>
                ))}
            </div>
          </AccessibleDialog>,
          document.body
        )}
    </div>
  )
}