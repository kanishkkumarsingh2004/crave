# Crave Restaurant app

This is the bundled Capacitor Android/iOS application for restaurant partners. It does not load
the `/vendor` website in a remote WebView. The APK contains its own responsive React interface,
native authentication session, restaurant-scoped live order connection, local notifications and
full-screen mobile navigation.

The app contains five bottom-tab areas: Home, Orders, Menu, Sales and Settings. All data is read
from and written to the existing Next.js backend APIs with bearer authentication.

The standalone Profile tab has been removed. Restaurant account and business details remain
editable from Settings, while live order updates and native kitchen notifications continue to
work independently of the selected tab.

## Settings

The Settings tab carries the shared three-row block — _Check for updates_, _Change password_ and
_Language_ — and the language list comes from `dictionary/`, so the picker follows the registry
instead of a hard-coded list. The kitchen queue, the menu editor and the settlement history all
read from the same Next.js APIs as the web portal.

## Configure and sync

Use Node 22+, JDK 21, and an installed Android SDK (or Xcode on macOS). From the repository root:

```bash
pnpm install
cd restaurant_app
pnpm sync
```

The backend defaults to `https://crave.apexonestudio.com`. Override `VITE_API_BASE_URL` and
`VITE_WS_BASE_URL` at build time for another environment. Open the projects with `pnpm android`
or, on macOS, `pnpm ios`.

Android uses immersive sticky mode to hide the status and navigation bars. iOS hides the status
bar and automatically hides the home indicator. Users can reveal system navigation temporarily
with the operating system gesture.

Build the Android APK from the repository root with `pnpm build:android` — that raises the
Android `versionCode` by one so installed apps recognise the new build. `KEEP_VERSION=1 pnpm
build:android` publishes the version already in `build.gradle` unchanged, which is what a fresh
`1.0.0` release wants.
