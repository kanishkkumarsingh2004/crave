import { useState, useEffect, FormEvent } from 'react'
import { apiRequest, cachedRequest } from '../../api'
import { Icon } from '../../Icon'
import { AccessibleDialog } from '@crave/mobile-core'
import { PullToRefresh } from '../../components/PullToRefresh'
import { Empty } from '../../components/common/Empty'
import { Spinner } from '../../components/common/Spinner'
import { Toggle } from '../../components/common/Toggle'
import { Logo } from '../../components/common/Logo'
import { enableNotifications, notificationEnabled, notifyAppUpdate } from '../../native'
import {
  checkForCustomerUpdate,
  getInstalledVersion,
  installCustomerUpdate,
  type CustomerUpdate,
} from '../../update'
import { money, label as titleCase } from '@crave/mobile-core'
import { useLanguage, type SupportedLocale } from '../../../../dictionary/react'
import type { User, Address } from '../../types'
import type { ThemeMode } from '../../theme'

interface AccountProps {
  user: User
  addresses: Address[]
  onAddresses: () => void
  onLogout: () => void
  onRefresh: () => void
  theme: ThemeMode
  onTheme: (theme: ThemeMode) => void
  refreshing: boolean
  onNotificationStateChange?: (enabled: boolean) => void
}

export function Account({
  user,
  addresses,
  onAddresses,
  onLogout,
  onRefresh,
  theme,
  onTheme,
  refreshing,
  onNotificationStateChange,
}: AccountProps) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [passwordSheet, setPasswordSheet] = useState(false)
  const [languageSheet, setLanguageSheet] = useState(false)
  const { t, locale, setLocale, languages } = useLanguage()
  const language = locale
  const setLanguage = (code: SupportedLocale) => void setLocale(code)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [notifications, setNotifications] = useState(false)
  const [checking, setChecking] = useState(false)
  const [update, setUpdate] = useState<CustomerUpdate | null>(null)
  const [message, setMessage] = useState('Tap to check for a newer version')
  const [helpSheet, setHelpSheet] = useState(false)

  useEffect(() => {
    notificationEnabled().then((enabled) => {
      setNotifications(enabled)
      onNotificationStateChange?.(enabled)
    })
    void check()
  }, [onNotificationStateChange])

  const check = async () => {
    setChecking(true)
    try {
      const installed = await getInstalledVersion()
      const u = await checkForCustomerUpdate()
      setUpdate(u)
      setMessage(
        u
          ? `CRAVE ${u.versionName} (build ${u.versionCode}) is ready`
          : `You're on build ${installed.versionCode} — the latest version`
      )
      if (u) await notifyAppUpdate(`CRAVE ${u.versionName} available`, u.releaseNotes)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not check for updates')
    } finally {
      setChecking(false)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordFeedback(null)
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Enter your current password.' })
      return
    }
    if (currentPassword.length < 8 || currentPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your current password must be between 8 and 256 characters.',
      })
      return
    }
    if (!newPassword) {
      setPasswordFeedback({ type: 'error', message: 'Enter a new password.' })
      return
    }
    if (newPassword.length < 8 || newPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your new password must be between 8 and 256 characters.',
      })
      return
    }
    if (!confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Confirm your new password.' })
      return
    }
    if (confirmPassword.length < 8 || confirmPassword.length > 256) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your confirmed password must be between 8 and 256 characters.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Your new password must be different from your current password.',
      })
      return
    }
    setChangingPassword(true)
    try {
      const response = await apiRequest<{ success?: boolean; message?: string }>(
        '/api/user/change-password',
        {
          method: 'POST',
          body: { currentPassword, newPassword, confirmPassword },
        }
      )
      setPasswordFeedback({
        type: 'success',
        message: response.message || 'Password changed successfully.',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (passwordError) {
      setPasswordFeedback({
        type: 'error',
        message:
          passwordError instanceof Error
            ? passwordError.message
            : 'Could not change your password.',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <section className="page account">
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
        <header className="page-header">
          <div>
            <p className="eyebrow">YOUR CRAVE</p>
            <h1>Account</h1>
          </div>
          <div className="avatar">{user.name?.[0]?.toUpperCase() || 'C'}</div>
        </header>
        <div className="profile-card">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          {user.phone && <small>{user.phone}</small>}
        </div>
        <h2 className="section-title">Preferences</h2>
        <div className="settings-list">
          <div>
            <span className="setting-icon">
              <Icon name="bell" />
            </span>
            <span>
              <b>Order notifications</b>
              <small>Payment, kitchen and delivery alerts</small>
            </span>
            <Toggle
              checked={notifications}
              onChange={async (v) => {
                const enabled = await enableNotifications(v)
                setNotifications(enabled)
                onNotificationStateChange?.(enabled)
              }}
            />
          </div>
          <button onClick={onAddresses}>
            <span className="setting-icon">
              <Icon name="pin" />
            </span>
            <span>
              <b>Saved addresses</b>
              <small>
                {addresses.length} delivery {addresses.length === 1 ? 'address' : 'addresses'}
              </small>
            </span>
            <Icon name="chevron" />
          </button>
        </div>
        <h2 className="section-title">Appearance</h2>
        <div className="theme-control" role="group" aria-label="App theme">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              className={theme === mode ? 'active' : ''}
              onClick={() => onTheme(mode)}
            >
              {titleCase(mode)}
            </button>
          ))}
        </div>
        <h2 className="section-title">App</h2>
        <div className="settings-list">
          <button
            onClick={
              update
                ? () => installCustomerUpdate(update).catch((e) => setMessage(e.message))
                : check
            }
            disabled={checking}
          >
            <span className="setting-icon">
              <Icon name={update ? 'download' : 'refresh'} />
            </span>
            <span>
              <b>{update ? 'Update CRAVE now' : t.customer.checkForUpdates}</b>
              <small>{checking ? 'Checking…' : message}</small>
            </span>
            {checking ? <Spinner /> : <Icon name="chevron" />}
          </button>
          <button onClick={() => setPasswordSheet(true)}>
            <span className="setting-icon">
              <Icon name="settings" />
            </span>
            <span>
              <b>{t.customer.changePassword}</b>
              <small>{t.customer.changePasswordHint}</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button onClick={() => setLanguageSheet(true)}>
            <span className="setting-icon">
              <Icon name="language" />
            </span>
            <span>
              <b>Language</b>
              <small>{language}</small>
            </span>
            <Icon name="chevron" />
          </button>
          <button onClick={() => setHelpSheet(true)}>
            <span className="setting-icon">
              <Icon name="help" />
            </span>
            <span>
              <b>Help & Support (24/7)</b>
              <small>FAQs, cancellation policy, reach +91 96256 94673</small>
            </span>
            <Icon name="chevron" />
          </button>
        </div>
        <button className="logout-button" onClick={() => setConfirmLogout(true)}>
          <Icon name="logout" /> Sign out
        </button>
        {passwordSheet && (
          <AccessibleDialog
            backdropClassName="modal-backdrop animated-backdrop"
            className="bottom-sheet animated-sheet password-sheet"
            labelledBy="change-password-title"
            describedBy="change-password-description"
            onClose={() => setPasswordSheet(false)}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">ACCOUNT SECURITY</p>
                <h2 id="change-password-title">{t.customer.changePassword}</h2>
              </div>
              <button
                className="round pale"
                onClick={() => setPasswordSheet(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="confirm-note" id="change-password-description">
              Choose a password you do not use anywhere else.
            </p>
            <form className="password-form" onSubmit={changePassword} noValidate>
              <div className="password-card">
                <div className="password-fields">
                  <label>
                    Current password
                    <div className="password">
                      <input
                        required
                        minLength={8}
                        maxLength={256}
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(event) => {
                          setCurrentPassword(event.target.value)
                          setPasswordFeedback(null)
                        }}
                        autoComplete="current-password"
                        placeholder="Current password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPassword ? 'Hide current password' : 'Show current password'
                        }
                        aria-pressed={showCurrentPassword}
                        onClick={() => setShowCurrentPassword((visible) => !visible)}
                      >
                        {showCurrentPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>
                  <label>
                    New password
                    <div className="password">
                      <input
                        required
                        minLength={8}
                        maxLength={256}
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value)
                          setPasswordFeedback(null)
                        }}
                        autoComplete="new-password"
                        placeholder="8–256 characters"
                      />
                      <button
                        type="button"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                        aria-pressed={showNewPassword}
                        onClick={() => setShowNewPassword((visible) => !visible)}
                      >
                        {showNewPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>
                  <label>
                    Confirm new password
                    <div className="password">
                      <input
                        required
                        minLength={8}
                        maxLength={256}
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value)
                          setPasswordFeedback(null)
                        }}
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirmed password'
                            : 'Show confirmed password'
                        }
                        aria-pressed={showConfirmPassword}
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </label>
                </div>
                <p className="password-guidance">New passwords must be 8–256 characters long.</p>
                {passwordFeedback && (
                  <div
                    className={passwordFeedback.type === 'success' ? 'success-box' : 'error-box'}
                    role={passwordFeedback.type === 'success' ? 'status' : 'alert'}
                    aria-live="polite"
                  >
                    {passwordFeedback.message}
                  </div>
                )}
                <button className="primary wide" type="submit" disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Spinner /> Updating password
                    </>
                  ) : (
                    'Change password'
                  )}
                </button>
              </div>
            </form>
          </AccessibleDialog>
        )}
        {languageSheet && (
          <AccessibleDialog
            backdropClassName="modal-backdrop animated-backdrop"
            className="bottom-sheet animated-sheet language-sheet"
            labelledBy="language-sheet-title"
            onClose={() => setLanguageSheet(false)}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">{t.customer.accountSecurity}</p>
                <h2 id="language-sheet-title">{t.customer.chooseLanguage}</h2>
              </div>
              <button
                className="round pale"
                onClick={() => setLanguageSheet(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="language-list">
              {languages.map((option) => (
                <button
                  key={option.code}
                  className={locale === option.code ? 'selected' : ''}
                  onClick={() => {
                    setLanguage(option.code)
                    setLanguageSheet(false)
                  }}
                >
                  <span>{option.nativeName}</span>
                  {locale === option.code && <Icon name="check" />}
                </button>
              ))}
            </div>
          </AccessibleDialog>
        )}
        {confirmLogout && (
          <AccessibleDialog
            backdropClassName="modal-backdrop animated-backdrop"
            className="bottom-sheet animated-sheet"
            labelledBy="customer-logout-title"
            describedBy="customer-logout-description"
            onClose={() => setConfirmLogout(false)}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">Confirm sign out</p>
                <h2 id="customer-logout-title">Really sign out?</h2>
              </div>
              <button
                className="round pale"
                onClick={() => setConfirmLogout(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="confirm-note" id="customer-logout-description">
              You will be signed out of the CRAVE app. You can sign back in anytime.
            </p>
            <div className="confirm-grid">
              <button onClick={() => setConfirmLogout(false)}>
                <span className="confirm-icon cancel">
                  <Icon name="close" />
                </span>
                <b>Cancel</b>
                <small>Stay signed in</small>
              </button>
              <button onClick={onLogout}>
                <span className="confirm-icon signout">
                  <Icon name="logout" />
                </span>
                <b>Sign out</b>
                <small>Leave the app</small>
              </button>
            </div>
          </AccessibleDialog>
        )}
        {helpSheet && (
          <AccessibleDialog
            backdropClassName="modal-backdrop animated-backdrop"
            className="bottom-sheet animated-sheet help-sheet"
            labelledBy="help-sheet-title"
            onClose={() => setHelpSheet(false)}
          >
            <div className="sheet-handle" />
            <div className="sheet-title">
              <div>
                <p className="eyebrow">24/7 CUSTOMER CARE</p>
                <h2 id="help-sheet-title">Help & Support</h2>
              </div>
              <button className="round pale" onClick={() => setHelpSheet(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>

            <div
              style={{
                padding: '16px',
                background: 'var(--green)',
                color: 'var(--profile-text)',
                borderRadius: '18px',
                margin: '8px 16px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--lime)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Priority Assistance Desk
              </p>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  margin: '6px 0',
                  color: 'var(--profile-text)',
                }}
              >
                Reach out to: +91 96256 94673
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  margin: '4px 0 14px 0',
                  lineHeight: 1.5,
                }}
              >
                Our Bengaluru support team is online 24/7 to resolve cancellations, refund status,
                or delivery partner tracking queries.
              </p>
              <a
                href="tel:+919625694673"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  fontWeight: 900,
                  fontSize: '13px',
                }}
              >
                <Icon name="phone" /> Call +91 96256 94673
              </a>
            </div>

            <div style={{ padding: '12px 16px 32px 16px' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: '12px',
                  letterSpacing: '0.04em',
                }}
              >
                Pre-Questions & Policy FAQs
              </h4>

              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '14px',
                  marginBottom: '10px',
                }}
              >
                <b
                  style={{
                    fontSize: '13px',
                    display: 'block',
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  Can I cancel my order? What is the cancellation window?
                </b>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Orders can be cancelled strictly within the first 15 seconds after placement.
                  After 15 seconds, the restaurant kitchen immediately begins food preparation and
                  cancellation is locked.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '14px',
                  marginBottom: '10px',
                }}
              >
                <b
                  style={{
                    fontSize: '13px',
                    display: 'block',
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  I cancelled within 15 seconds. Where is my refund?
                </b>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Cancelled orders enter our Admin Review Queue. Once approved, refunds are credited
                  back to your original payment method (UPI / Card / NetBanking) within 2-4 business
                  days.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '14px',
                  marginBottom: '10px',
                }}
              >
                <b
                  style={{
                    fontSize: '13px',
                    display: 'block',
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  Where is my 6-digit Delivery OTP?
                </b>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Your delivery OTP is revealed on your order screen once the rider picks up your
                  package. Share this 6-digit code only at your doorstep when receiving the food.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '14px',
                  borderRadius: '14px',
                  marginBottom: '10px',
                }}
              >
                <b
                  style={{
                    fontSize: '13px',
                    display: 'block',
                    color: 'var(--ink)',
                    marginBottom: '4px',
                  }}
                >
                  What if an item is missing or spoiled?
                </b>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Please call our direct support line at +91 96256 94673 within 30 minutes of
                  delivery with your Order ID for instant assistance and resolution.
                </p>
              </div>
            </div>
          </AccessibleDialog>
        )}
        <p className="version">CRAVE. Customer · 1.0.0</p>
      </PullToRefresh>
    </section>
  )
}