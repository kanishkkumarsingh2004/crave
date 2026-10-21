import { Capacitor, registerPlugin } from '@capacitor/core'

interface UpiLauncherPlugin {
  open(options: { url: string }): Promise<{ opened: boolean }>
}

const UpiLauncher = registerPlugin<UpiLauncherPlugin>('UpiLauncher')

/** Builds the standard UPI intent for a payment. */
export function buildUpiPaymentUrl(input: {
  vpa: string
  merchant: string
  amount: number
  note: string
}) {
  const params = new URLSearchParams({
    pa: input.vpa,
    pn: input.merchant,
    am: input.amount.toFixed(2),
    cu: 'INR',
    tn: input.note,
  })
  return `upi://pay?${params.toString()}`
}

/**
 * Hands the payment to the device. The customer picks the UPI app from the
 * system chooser, so every installed UPI app is available without us listing
 * them ourselves.
 */
export async function openUpiPayment(input: {
  vpa: string
  merchant: string
  amount: number
  note: string
}) {
  const url = buildUpiPaymentUrl(input)
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await UpiLauncher.open({ url })
    return
  }
  window.location.href = url
}
