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
