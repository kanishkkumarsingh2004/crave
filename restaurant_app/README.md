# Crave Restaurant app

This folder is the Capacitor Android/iOS shell for the existing restaurant experience in
`app/vendor`. It reuses the current dashboard and components instead of maintaining a second UI.
The WebView opens the deployed restaurant route with its own native app identity and deep-link
scheme. Links such as `craverestaurant://vendor/dashboard` open directly in the restaurant app.

## Configure and sync

Use Node 22+, JDK 21, and an installed Android SDK (or Xcode on macOS). From the repository root:

```bash
pnpm install
cd restaurant_app
pnpm sync
```

The production server defaults to `https://crave.apexonestudio.com`. Open the projects with
`pnpm android` or, on macOS, `pnpm ios`. For an Android emulator, override the server with
`CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm sync` while the Next.js development server runs.
