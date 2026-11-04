import { useState, FormEvent } from 'react'
import { apiRequest, saveAuthToken, COOKIE_SESSION_TOKEN } from '../../api'
import { Icon } from '../../Icon'
import { Logo } from '../../components/common/Logo'
import { Spinner } from '../../components/common/Spinner'
import type { User } from '../../types'

interface AuthProps {
  onDone: (u: User) => void
}

export function Auth({ onDone }: AuthProps) {
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      let signupCoordinates: { latitude?: number; longitude?: number } = {}
      if (signup && form.address.trim()) {
        try {
          const geocode = await apiRequest<{
            results: Array<{ lat: number; lng: number }>
          }>(`/api/geocode/search?q=${encodeURIComponent(form.address.trim())}`)
          const match = geocode.results?.[0]
          if (match) signupCoordinates = { latitude: match.lat, longitude: match.lng }
        } catch {}
      }
      const data = signup
        ? await apiRequest<{ token?: string; user: User }>('/api/auth/signup', {
            method: 'POST',
            body: { ...form, ...signupCoordinates, role: 'user' },
          })
        : await apiRequest<{ token?: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: { email: form.email, password: form.password },
          })
      let sessionUser = data.user
      if (data.token) {
        await saveAuthToken(data.token)
      } else {
        const cookieSession = await apiRequest<{ authenticated: boolean; user?: User }>(
          '/api/auth/me',
          { token: '' }
        )
        if (!cookieSession.authenticated || !cookieSession.user) {
          throw new Error('Sign-in succeeded, but the secure app session could not be restored.')
        }
        sessionUser = cookieSession.user
        await saveAuthToken(COOKIE_SESSION_TOKEN)
      }
      onDone(sessionUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-art">
        <div className="floating-card card-one">
          Hot meals
          <br />
          <b>delivered.</b>
        </div>
        <div className="food-orb">🍜</div>
        <div className="floating-card card-two">
          <span>4.9 ★</span>
          <small>local favourites</small>
        </div>
      </div>
      <section className="auth-sheet">
        <Logo />
        <p className="eyebrow">FOOD, RIGHT NOW</p>
        <h1>{signup ? 'Your next favourite meal starts here.' : 'What are you craving today?'}</h1>
        <p className="auth-copy">
          Discover local kitchens, pay securely with UPI and follow every order live.
        </p>
        <form onSubmit={submit}>
          {signup && (
            <>
              <label>
                Full name
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  inputMode="tel"
                  placeholder="Mobile number"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoCapitalize="none"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                required
                minLength={8}
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {signup && (
            <label>
              Delivery address
              <textarea
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House, street, landmark, city"
              />
            </label>
          )}
          {error && <div className="error-box">{error}</div>}
          <button className="primary wide" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Please wait
              </>
            ) : signup ? (
              'Create my account'
            ) : (
              'Open CRAVE.'
            )}
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setSignup(!signup)
            setError('')
          }}
        >
          {signup ? 'Already have an account? Sign in' : 'New to CRAVE? Create an account'}
        </button>
      </section>
    </main>
  )
}