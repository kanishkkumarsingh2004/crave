'use strict'

const USER_CHANNELS = new Set(['user_profile', 'user_addresses'])
const VENDOR_ROLES = new Set(['restaurant_vendor', 'cravexp_store_vendor', 'vendor'])

function subscriptionKeyForChannel(channel, clientInfo, subscriptionData = {}) {
  if (USER_CHANNELS.has(channel)) return clientInfo.userId || null
  if (channel === 'admin_settlements') {
    if (clientInfo.role === 'admin') return 'global'
    if (VENDOR_ROLES.has(clientInfo.role)) return clientInfo.restaurantId || null
    return null
  }
  if (channel === 'vendor_orders') return clientInfo.restaurantId || null
  if (['order_update', 'approval_update', 'driver_location'].includes(channel)) {
    return subscriptionData.orderId || null
  }
  return 'global'
}

function broadcastKeysForChannel(channel, data) {
  if (USER_CHANNELS.has(channel)) {
    return typeof data?.userId === 'string' && data.userId ? [data.userId] : []
  }
  if (channel === 'admin_settlements') {
    const restaurantId =
      data?.restaurantId || data?.restaurant_id || data?.settlement?.restaurant_id
    return restaurantId ? ['global', restaurantId] : ['global']
  }
  if (channel === 'vendor_orders') {
    const restaurantId = data?.restaurantId || data?.order?.restaurant_id
    return restaurantId ? [restaurantId] : []
  }
  if (['order_update', 'approval_update', 'driver_location'].includes(channel)) {
    return typeof data?.orderId === 'string' && data.orderId ? [data.orderId] : []
  }
  return ['global']
}

module.exports = {
  USER_CHANNELS,
  VENDOR_ROLES,
  broadcastKeysForChannel,
  subscriptionKeyForChannel,
}
