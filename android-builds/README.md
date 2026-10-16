# Crave Android builds

This folder contains the latest debug APKs for all three Crave native applications. They connect
to the production backend at `https://crave.apexonestudio.com` by default.

| Application | Android package        | APK                                                        |
| ----------- | ---------------------- | ---------------------------------------------------------- |
| Admin       | `com.crave.admin`      | [crave-admin-debug.apk](./crave-admin-debug.apk)           |
| Driver      | `com.crave.driver`     | [crave-driver-debug.apk](./crave-driver-debug.apk)         |
| Restaurant  | `com.crave.restaurant` | [crave-restaurant-debug.apk](./crave-restaurant-debug.apk) |

These are development builds signed with the Android debug key. They are suitable for direct
testing but not for Google Play production distribution.

## Build all three apps

From the repository root, run:

```bash
pnpm build:android
```

The script builds each Vite shell, synchronizes Capacitor, runs Gradle `assembleDebug`, copies the
three APKs into this folder, and refreshes `SHA256SUMS.txt`.

Requirements: Node.js 22+, pnpm 12.3.4, a compatible JDK, and Android SDK 36.

## Install on a connected Android device

```bash
adb install -r android-builds/crave-admin-debug.apk
adb install -r android-builds/crave-driver-debug.apk
adb install -r android-builds/crave-restaurant-debug.apk
```

Verify downloaded or copied files with:

```bash
cd android-builds
sha256sum --check SHA256SUMS.txt
```
