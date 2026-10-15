# Crave Admin app

This folder is the Capacitor Android/iOS shell for the existing React admin experience in
`app/admin`. It reuses the current dashboard and components instead of maintaining a second UI.
The WebView opens the deployed admin route with its own native app identity and deep-link scheme.
Links such as `craveadmin://admin/dashboard` open directly in the admin app.

## Configure and sync

Use Node 22+, JDK 21, and an installed Android SDK (or Xcode on macOS). From the repository root:

```bash
pnpm install
cd admin_app
CAPACITOR_SERVER_URL=https://your-crave-host.example pnpm sync
```

Open the projects with `pnpm android` or, on macOS, `pnpm ios`. For an Android emulator, use
`CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm sync` while the Next.js development server runs.
