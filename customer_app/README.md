# Crave Customer app

Standalone Capacitor application for Crave customers. The APK packages its own React interface
and talks to the authenticated Crave backend directly; it does not load a website in a remote
WebView.

## Customer features

- Restaurant explore and CraveXP grocery, with a search that spans dishes, cuisines and stores
- A menu screen with variants, availability and live stock
- Cart with quantities per variant, coupon codes and a tip for the delivery partner
- Checkout that shows the whole bill — item total, packaging, delivery, platform & handling and
  GST & Other Charges — with the amount owed pinned to a payment bar at the bottom of the screen
- UPI checkout: scan the QR code or hand off to any installed UPI app, then enter the 12-digit
  transaction reference so the order can be verified
- Live order tracking, and a printed till-slip invoice for a delivered order
- Saved addresses, a language picker and a dark theme

## Caching and offline

The app keeps everything it needs on the device, so it opens instantly and keeps
working when the network does not:

- **Static files** — a service worker (`public/sw.js`) precaches the app shell, serves
  the content-hashed assets cache-first, and keeps the API reads it caches in the
  background.
- **Data** — the last good answer for every read is stored on the device
  (`cachedRequest` in `src/api.ts`). When the network fails the app shows the saved
  copy with a "showing the last saved copy" banner instead of an error.
- The saved copies are **scoped per account**, and they are wiped when the customer
  signs out, so one account never sees another account's orders.

## Permissions

On the first launch the app explains the three permissions it needs and asks for
them:

| Permission    | Why                                                         |
| ------------- | ----------------------------------------------------------- |
| Location      | Find you on the map, set your address, follow your delivery |
| Notifications | Order updates, payment alerts, delivery status              |
| App updates   | Install new builds so you always run the latest app         |

Each one can be asked for on its own, and the sheet can be opened again from
Settings. "Install unknown apps" is a device setting rather than a runtime
dialog, so that row opens the right settings screen.

## Settings

The account tab carries the shared three-row block — _Check for updates_, _Change password_ and
_Language_. The language list comes from `dictionary/`, so the picker follows the registry instead
of a hard-coded list, and the choice is kept on the device.

## Environment

Copy `.env.example` to `.env.local` when the backend origin differs from production:

```env
VITE_API_BASE_URL=https://crave.apexonestudio.com
VITE_WS_BASE_URL=wss://crave.apexonestudio.com/api/ws
```

The dev server proxies `/api` to `VITE_API_BASE_URL` and listens on every interface, so a
phone on the same network can reach it.

## Commands

```bash
pnpm --dir customer_app dev
pnpm --dir customer_app build
pnpm --dir customer_app sync
```

Build the Android APK from the repository root with `pnpm build:android` — that raises the
Android `versionCode` (and the iOS `CURRENT_PROJECT_VERSION`) by one so installed apps recognise
the new build. `KEEP_VERSION=1 pnpm build:android` publishes the version already in
`build.gradle` unchanged, which is what a fresh `1.0.0` release wants. iOS compilation requires
Xcode on macOS after Capacitor synchronization.
