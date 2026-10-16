# Crave Driver app

This folder is the Capacitor Android/iOS shell for the existing React driver experience in
`app/driver`. It intentionally does not duplicate dashboard components: the native WebView loads
the deployed Next.js driver route, while the shared code in `lib/native-driver.ts` activates native
GPS, local and push notifications, haptics, app links, network state, Android back-button handling,
the splash screen, and the status bar.

## Configure and sync

Use Node 22+, JDK 21, and an installed Android SDK (or Xcode on macOS). Then install and sync the
project:

```bash
pnpm install
cd driver_app
pnpm sync
```

The production server defaults to `https://crave.apexonestudio.com`. Open the native projects with
`pnpm android` or, on macOS, `pnpm ios`. For local Android emulator development,
`CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm sync` enables cleartext automatically.

## Push notification credentials

- Android: add your Firebase `google-services.json` to `android/app/` and follow the Capacitor Push
  Notifications Firebase setup.
- iOS: enable the Push Notifications capability, add the APNs entitlement, and upload the APNs key
  to the push provider.
- Apply the Prisma schema with `pnpm db:push` from the repository root. Device tokens are stored in
  `driver_push_tokens` by `/api/driver/push-token`.

The app still works without provider credentials; local new-order notifications and native GPS are
available, while remote pushes will begin registering after Firebase/APNs is configured.
