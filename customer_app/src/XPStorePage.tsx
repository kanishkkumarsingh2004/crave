import { useLanguage } from '../../dictionary/react'
import appLogo from '../assets/logo.svg'
import { Icon } from './Icon'

export function XPStorePage({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useLanguage()
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.nav.xp}</p>
          <h1>craveXP Instamart</h1>
        </div>
        <img className="brand-mark" src={appLogo} alt="craveXP" />
      </header>
      <div className="welcome">
        <p>10-minute grocery delivery</p>
        <h1>
          Fresh essentials. <em>No waiting.</em>
        </h1>
      </div>
      <button className="search-launch" onClick={onBrowse}>
        <Icon name="search" />
        Browse groceries
      </button>
      <div className="promo">
        <div>
          <span>DAILY ESSENTIALS</span>
          <h2>Milk, eggs, bread &amp; more</h2>
          <p>Dispatched instantly from our local dark store.</p>
        </div>
        <div className="promo-food">🛒</div>
      </div>
    </section>
  )
}
