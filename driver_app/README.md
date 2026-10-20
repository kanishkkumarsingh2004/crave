# Crave Driver App

Standalone Capacitor application for Crave delivery partners. The APK packages its own responsive React interface and connects directly to the authenticated Crave backend; it does not load the driver website in a remote WebView.

## Driver features

- Rider-only native JWT login with persistent app session
- Online/offline duty control and precise native background GPS streaming
- Authenticated live delivery offers with atomic acceptance
- Active trip workflow: pickup, out for delivery, and OTP handoff
- Google Maps navigation and customer calling shortcuts
- Trip history, earnings, payouts, incentives, profile, vehicle and UPI settings
- Background offer polling, native push/local notifications, haptics and responsive bottom navigation
- Android immersive fullscreen and iOS status/home-indicator hiding

## Environment

Copy `.env.example` to `.env.local` when backend origins differ from production:

```env
VITE_API_BASE_URL=https://crave.apexonestudio.com
VITE_WS_BASE_URL=wss://crave.apexonestudio.com/api/ws
```

## Commands

```bash
pnpm --dir driver_app dev
pnpm --dir driver_app build
pnpm --dir driver_app sync
```

Build the Android APK from the repository root with `pnpm build:android`. iOS compilation requires Xcode on macOS after Capacitor synchronization.

While a driver is online, Android uses a foreground location service and iOS uses the background
location mode. Both native services upload GPS directly to the authenticated production API and
check for new offers even when the web view is suspended. Android shows the required persistent
"Crave Driver is live" notification while this service is running.

Remote push delivery requires the server credentials documented in the root `.env.example`.
Android additionally needs the matching `driver_app/android/app/google-services.json` and iOS
needs Push Notifications/Background Modes enabled for the `com.crave.driver` signing profile.
The checked-in debug iOS entitlement uses the APNs development environment; set
`APNS_PRODUCTION=false` for debug-device tokens and `true` for TestFlight/App Store tokens.

The operating systems intentionally stop background work if a user force-stops the Android app or
force-quits the iOS app. Tracking resumes after the driver opens the app and returns online.

The current Android navigation is focused on delivery operations: Home, Orders, Wallet and
Settings. Rewards/incentive promotional flows are not part of the driver app startup or primary
navigation.
