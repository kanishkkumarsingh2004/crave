import { useState, useEffect } from 'react'
import { apiRequest } from '../../api'
import { Icon } from '../../Icon'
import { Empty } from '../../components/common/Empty'
import { Spinner } from '../../components/common/Spinner'
import { Suspense, lazy } from 'react'
import type { Address } from '../../types'
import type { AddressMapPoint } from '../../AddressMap'

const AddressMap = lazy(() => import('../../AddressMap'))

interface AddressesProps {
  items: Address[]
  onClose: () => void
  onChanged: () => void
}

export function Addresses({ items, onClose, onChanged }: AddressesProps) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: 'Home', address: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState<AddressMapPoint | null>(null)
  const [suggestions, setSuggestions] = useState<
    Array<{
      placeId: string
      formattedAddress: string
      secondaryAddress: string
      lat: number
      lng: number
    }>
  >([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [mapBusy, setMapBusy] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    if (!adding || form.address.trim().length < 3 || location) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await apiRequest<{ results: typeof suggestions }>(
          `/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`
        )
        setSuggestions(response.results || [])
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [adding, form.address, location])

  const chooseMapLocation = async (point: AddressMapPoint) => {
    setLocation(point)
    setSuggestions([])
    setMapBusy(true)
    setError('')
    try {
      const response = await apiRequest<{ formattedAddress: string }>(
        `/api/geocode/reverse?lat=${point.lat}&lng=${point.lng}`
      )
      setForm((current) => ({ ...current, address: response.formattedAddress }))
    } catch (mapError) {
      setError(mapError instanceof Error ? mapError.message : 'Could not identify this location.')
    } finally {
      setMapBusy(false)
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not available on this device.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        void chooseMapLocation({ lat: coords.latitude, lng: coords.longitude })
      },
      (locationError) => {
        setLocating(false)
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? 'Allow location access to use your current position.'
            : 'Could not get your current location. Try selecting the pin on the map.'
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      let resolvedLocation = location
      if (!resolvedLocation) {
        const geocode = await apiRequest<{
          results: Array<{ formattedAddress: string; lat: number; lng: number }>
        }>(`/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`)
        const match = geocode.results?.[0]
        if (!match) throw new Error('Choose a complete address so CRAVE can calculate delivery.')
        resolvedLocation = { lat: match.lat, lng: match.lng }
      }
      await apiRequest('/api/user/addresses', {
        method: 'POST',
        body: {
          ...form,
          latitude: resolvedLocation.lat,
          longitude: resolvedLocation.lng,
          is_default: !items.length,
        },
      })
      setAdding(false)
      setForm({ label: 'Home', address: '' })
      setLocation(null)
      setSuggestions([])
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save address')
    } finally {
      setBusy(false)
    }
  }

  const setDefault = async (id: string) => {
    await apiRequest('/api/user/addresses', { method: 'PUT', body: { id, action: 'set_default' } })
    onChanged()
  }

  return (
    <div className="subpage">
      <header>
        <button className="round pale" onClick={onClose}>
          <Icon name="back" />
        </button>
        <h1>Saved addresses</h1>
        <button className="round lime" onClick={() => setAdding(true)}>
          <Icon name="plus" />
        </button>
      </header>
      <main>
        {items.map((a) => (
          <article className="saved-address" key={a.id}>
            <Icon name="pin" />
            <span>
              <h3>{a.label}</h3>
              <p>{a.address}</p>
            </span>
            {a.is_default ? (
              <b>DEFAULT</b>
            ) : (
              <button onClick={() => setDefault(a.id)}>Set default</button>
            )}
          </article>
        ))}
        {!items.length && !adding && (
          <Empty
            icon="search"
            title="No address saved"
            text="Add a delivery address to place an order."
          />
        )}
        {adding && (
          <div className="address-form">
            <p className="eyebrow">NEW ADDRESS</p>
            <label>
              Label
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Home, Work…"
              />
            </label>
            <label>
              Full address
              <textarea
                value={form.address}
                onChange={(e) => {
                  setLocation(null)
                  setForm({ ...form, address: e.target.value })
                }}
                placeholder="House, street, landmark and city"
              />
            </label>
            {searching && (
              <p className="address-searching">
                <Spinner /> Finding addresses…
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="address-suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    onClick={() => {
                      setForm({ ...form, address: suggestion.formattedAddress })
                      setLocation({ lat: suggestion.lat, lng: suggestion.lng })
                      setSuggestions([])
                    }}
                  >
                    <Icon name="pin" />
                    <span>
                      <b>{suggestion.formattedAddress.split(',')[0]}</b>
                      <small>{suggestion.secondaryAddress}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="partner-map-wrap">
              <div className="partner-map-head">
                <span>Delivery location</span>
                <small>Tap the map to drop the pin or use your current location.</small>
              </div>
              <Suspense
                fallback={<div className="address-map-canvas map-loading">Loading map…</div>}
              >
                <AddressMap
                  key={mapKey}
                  location={location}
                  onPick={(point) => void chooseMapLocation(point)}
                  onRetry={() => setMapKey((k) => k + 1)}
                />
              </Suspense>
              <div className="address-map-toolbar">
                <span>
                  <b>{mapBusy ? 'Finding this address…' : 'Pin your delivery entrance'}</b>
                  <small>Tap the map for a precise location.</small>
                </span>
                <button type="button" onClick={useCurrentLocation} disabled={locating || mapBusy}>
                  {locating ? <Spinner /> : <Icon name="pin" />}
                  {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>
            </div>
            {location && (
              <p className="address-confirmed">
                <Icon name="check" /> Location confirmed
              </p>
            )}
            {error && <div className="error-box">{error}</div>}
            <div>
              <button className="secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy || !form.address.trim()} onClick={save}>
                {busy ? <Spinner /> : 'Save address'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}