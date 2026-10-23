import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import App from './App'
import './styles.css'
import { loadTheme } from './theme'

void loadTheme()
// Dismiss any native launch overlay before React starts bootstrapping. This call is
// intentionally fire-and-forget so a stalled native bridge cannot block first paint.
void SplashScreen.hide().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
