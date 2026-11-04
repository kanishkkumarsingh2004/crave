import { PullToRefresh } from '../../components/PullToRefresh'
import { Icon } from '../../navigation/tabs'
import { money, label as titleCase } from '@crave/mobile-core'
import type { AdminStats, OrderRecord, RestaurantRecord } from '../../types'

interface OverviewProps {
  stats: AdminStats
  orders: OrderRecord[]
  restaurants: RestaurantRecord[]
  activeOrders: OrderRecord[]
  onRefresh: () => void
  refreshing: boolean
}

export function Overview({
  stats,
  orders,
  restaurants,
  activeOrders,
  onRefresh,
  refreshing,
}: OverviewProps) {
  const openRestaurants = restaurants.filter((r) => r.is_open !== false)
  const suspended = restaurants.filter((r) => r.is_open === false)

  return (
    <section className="page">
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
        <article className="hero-card">
          <span className="eyebrow">Live platform</span>
          <h1>Everything is in view.</h1>
          <p>
            Track every order, partner and driver from one dashboard.
          </p>
        </article>

        <div className="metric-grid">
          <article className="metric">
            <span className="eyebrow">Platform gross</span>
            <h2>{money(stats.weeklyGross || 0)}</h2>
            <small>Week to date</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Platform revenue</span>
            <h2>{money(stats.weeklyRevenue || 0)}</h2>
            <small>Week to date</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Orders</span>
            <h2>{stats.orderCount || 0}</h2>
            <small>Week to date</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Commission earned</span>
            <h2>{money(stats.totalCommission || 0)}</h2>
            <small>Week to date</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Customers</span>
            <h2>{stats.customerCount || 0}</h2>
            <small>Total users</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Active partners</span>
            <h2>{openRestaurants.length}</h2>
            <small>{restaurants.length} total</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Active drivers</span>
            <h2>{stats.driverCount || 0}</h2>
            <small>Online</small>
          </article>
          <article className="metric">
            <span className="eyebrow">Live devices</span>
            <h2>{stats.liveDevices || 0}</h2>
            <small>Connected now</small>
          </article>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Live orders ({activeOrders.length})</h2>
          </div>
          {activeOrders.length ? (
            <div className="order-list">
              {activeOrders.slice(0, 5).map((order) => (
                <article key={order.id} className="order-row">
                  <div className="order-info">
                    <span className="order-id">#{order.id.slice(-6)}</span>
                    <h3>{order.restaurant_name || 'Unknown restaurant'}</h3>
                    <p>{order.customer_name || 'Unknown customer'}</p>
                  </div>
                  <div className="order-status">
                    <span className={`badge ${order.status}`}>{titleCase(order.status || 'new')}</span>
                    <strong>{money(order.total_amount)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No active orders right now.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Partner health</h2>
            <small>
              {openRestaurants.length} accepting orders · {suspended.length} suspended
            </small>
          </div>
          <div className="partner-grid">
            {openRestaurants.slice(0, 4).map((restaurant) => (
              <article key={restaurant.id} className="partner-card">
                <h3>{restaurant.name}</h3>
                <p>{restaurant.cuisine || 'Multi-cuisine'}</p>
                <span className="partner-commission">{commercialSummary(restaurant)}</span>
              </article>
            ))}
          </div>
        </div>
      </PullToRefresh>
    </section>
  )
}

function commercialSummary(restaurant: RestaurantRecord) {
  const model = restaurant.commercial_model || 'commission'
  const commission = `${Number(restaurant.commission_rate || 0)}% + ₹${Number(
    restaurant.fixed_commission || 0
  )}`
  const markup = `${Number(restaurant.markup_rate || 0)}% + ₹${Number(
    restaurant.fixed_markup || 0
  )}`
  if (model === 'hybrid') return `Hybrid · commission ${commission} · markup ${markup}`
  if (model === 'markup') return `Markup · ${markup}`
  return `Commission · ${commission}`
}