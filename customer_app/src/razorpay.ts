/**
 * customer_app/src/razorpay.ts
 *
 * Razorpay Checkout integration for the Crave customer app.
 *
 * Loads Razorpay Checkout only when the customer selects Razorpay at checkout.
 * The client calls the server create-order endpoint, then the Checkout callback
 * asks the server to verify — it never sets the order to paid locally.
 */

export type RazorpayCheckoutResult = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Start Razorpay Checkout for a Crave order.
 *
 * 1. Loads Razorpay Checkout script
 * 2. Calls POST /api/payments/razorpay/order to create a Razorpay order
 * 3. Opens Checkout with the server-provided order ID and amount
 * 4. On success, calls POST /api/payments/razorpay/verify to verify the payment
 * 5. Never sets the order to paid locally — only server verification does that
 */
export async function startRazorpayCheckout({
  orderId,
  apiRequest,
}: {
  orderId: string
  apiRequest: (path: string, options: { method?: string; body?: unknown }) => Promise<any>
}) {
  const loaded = await loadRazorpayScript()
  const Razorpay = window.Razorpay
  if (!loaded || !Razorpay) {
    throw new Error('Razorpay Checkout failed to load')
  }

  // Step 1: Ask the server to create a Razorpay order (amount comes from canonical snapshot)
  const paymentOrder = await apiRequest('/api/payments/razorpay/order', {
    method: 'POST',
    body: { orderId },
  })
  if (!paymentOrder || !paymentOrder.razorpayOrderId) {
    throw new Error(paymentOrder?.error ?? 'Unable to start payment')
  }

  // Step 2: Open Razorpay Checkout
  return new Promise<void>((resolve, reject) => {
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window as any).Capacitor != null)

    const checkout = new Razorpay({
      key: paymentOrder.keyId,
      order_id: paymentOrder.razorpayOrderId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: 'crave.',
      description: `Order #${orderId.slice(-6).toUpperCase()} • Fresh Delivery`,
      image: appOrigin ? `${appOrigin}/icons/icon-192x192.png` : undefined,
      theme: {
        color: '#18241c',
        backdrop_color: 'rgba(18, 24, 21, 0.85)',
      },
      ...(isMobile ? { upi: { flow: 'intent' } } : {}),
      config: {
        display: {
          blocks: {
            upi: {
              name: isMobile ? 'Instant UPI App' : 'Pay via UPI / QR',
              instruments: [
                {
                  method: 'upi',
                  flows: isMobile ? ['intent'] : ['intent', 'qr'],
                  apps: ['google_pay', 'phonepe', 'paytm', 'cred', 'bhim'],
                },
              ],
            },
            cards: {
              name: 'Cards & Net Banking',
              instruments: [
                {
                  method: 'card',
                },
                {
                  method: 'netbanking',
                },
              ],
            },
          },
          sequence: ['block.upi', 'block.cards'],
          preferences: {
            show_default_blocks: false,
          },
          hide: [
            {
              method: 'upi',
              flow: 'collect',
            },
          ],
        },
      },
      notes: { crave_order_id: orderId },
      handler: async (result: RazorpayCheckoutResult) => {
        try {
          // Step 3: Ask the server to verify (never set paid locally)
          const verify = await apiRequest('/api/payments/razorpay/verify', {
            method: 'POST',
            body: { orderId, ...result },
          })
          if (!verify || !verify.success) {
            reject(new Error(verify?.error ?? 'Verification failed'))
            return
          }
          resolve()
        } catch (err: any) {
          reject(new Error(err?.message ?? 'Verification failed'))
        }
      },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          reject(new Error('Checkout was dismissed'))
        },
      },
    })
    checkout.open()
  })
}
