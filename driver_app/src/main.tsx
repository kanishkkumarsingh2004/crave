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
        <span className="driver-pill">Driver</span>
        <h1 id="app-title">Native app is ready</h1>
        <p>
          Set <code>CAPACITOR_SERVER_URL</code> to your deployed Crave URL, then run the native sync
          command. The app will open the existing React driver cockpit with native services enabled.
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
