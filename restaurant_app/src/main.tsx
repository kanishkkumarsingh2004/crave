import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function NativeBootstrap() {
  useEffect(() => {
    void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide())
  }, [])

  return (
    <main className="bootstrap-shell">
      <section className="bootstrap-card" aria-labelledby="app-title">
        <img className="brand-logo" src="/cravexp-logo.svg" alt="Crave" />
        <span className="app-pill">Restaurant Partner</span>
        <h1 id="app-title">Restaurant app is ready</h1>
        <p>
          The app connects to <code>crave.apexonestudio.com</code> and opens the existing restaurant
          console with native services enabled. Set <code>CAPACITOR_SERVER_URL</code> only to
          override the production server.
        </p>
        <div className="status-row">
          <span /> React + Capacitor shell installed
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NativeBootstrap />
  </StrictMode>
)
