import { Capacitor, registerPlugin } from '@capacitor/core'

interface UpiLauncherPlugin {
  open(options: { url: string; app: UpiPaymentApp }): Promise<{ opened: boolean }>
}

export type UpiPaymentApp = 'gpay' | 'phonepe' | 'paytm' | 'other'

const UpiLauncher = registerPlugin<UpiLauncherPlugin>('UpiLauncher')

export async function openUpiPayment(input: {
  vpa: string
  merchant: string
  amount: number
  note: string
  app: UpiPaymentApp
}) {
  const params = new URLSearchParams({
    pa: input.vpa,
    pn: input.merchant,
    am: input.amount.toFixed(2),
    cu: 'INR',
    tn: input.note,
  })
  const url = `upi://pay?${params.toString()}`
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await UpiLauncher.open({ url, app: input.app })
    return
  }
  const schemes: Record<UpiPaymentApp, string> = {
    gpay: 'gpay://upi/pay',
    phonepe: 'phonepe://pay',
    paytm: 'paytmmp://pay',
    other: 'upi://pay',
  }
  window.location.href = `${schemes[input.app]}?${params.toString()}`
}
