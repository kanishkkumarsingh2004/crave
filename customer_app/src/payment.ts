import { Capacitor, registerPlugin } from '@capacitor/core'

interface UpiLauncherPlugin {
  open(options: { url: string }): Promise<{ opened: boolean }>
}

const UpiLauncher = registerPlugin<UpiLauncherPlugin>('UpiLauncher')

export async function openUpiPayment(input: {
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
  const url = `upi://pay?${params.toString()}`
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    await UpiLauncher.open({ url })
    return
  }
  window.location.href = url
}
