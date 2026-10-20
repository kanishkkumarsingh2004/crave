# Crave Android builds

This folder contains the latest debug APKs for all four Crave native applications. They connect
to the production backend at `https://crave.apexonestudio.com` by default.

Each app provides a manual update check in Settings. If its entry in `version.json` has a newer
`versionCode`, the Update button is enabled. Downloads are restricted to this repository's raw
GitHub URLs and each APK's SHA-256 must match the manifest before Android's installer is opened.

| Application | Android package        | APK (direct download)                                                                   |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Admin       | `com.crave.admin`      | <a href="./crave-admin-debug.apk?raw=true" download>crave-admin-debug.apk</a>           |
| Driver      | `com.crave.driver`     | <a href="./crave-driver-debug.apk?raw=true" download>crave-driver-debug.apk</a>         |
| Restaurant  | `com.crave.restaurant` | <a href="./crave-restaurant-debug.apk?raw=true" download>crave-restaurant-debug.apk</a> |
| CRAVE.      | `com.crave.customer`   | <a href="./crave-customer-debug.apk?raw=true" download>crave-customer-debug.apk</a>     |

Click any APK filename above to download it directly.

The current versions are Admin `1.0.5` (code 13), Driver `1.0.0` (code 7), Restaurant `1.0.4`
(code 12), and Customer `1.0.0` (code 7). The machine-readable update metadata and release
notes are in [`version.json`](./version.json).

These are development builds signed with the Android debug key. They are suitable for direct
testing but not for Google Play production distribution.

## iOS builds

All four apps now have iOS projects generated via Capacitor (`admin_app/ios`, `driver_app/ios`,
`restaurant_app/ios`, `customer_app/ios`). Compiling a native iOS app requires macOS and a compatible Xcode version.
Once built on a Mac, the resulting `.ipa` files can be distributed for TestFlight or Ad Hoc
testing. From Kali Linux you can only prepare the iOS project; the actual build must happen on a
cloud Mac or local macOS machine with Xcode. The iOS builder mirrors the Android builder and
outputs to a separate `ios-builds/` folder:

```bash
pnpm build:ios          # prepares all four iOS projects; builds IPAs on macOS
pnpm exec cap open ios  # from each app directory on macOS with Xcode
# In Xcode: select a team, build the iPhone scheme, then export as Ad Hoc / Development IPA
```

## Build all apps

From the repository root, run:

```bash
pnpm build:android
```

This runs `scripts/build-apps.sh`, which builds each Vite shell, synchronizes Capacitor for both
Android and iOS, runs Gradle `assembleDebug`, copies the four APKs into this folder, and refreshes
`SHA256SUMS.txt` and `version.json`. Commit and push the APK and manifest together so installed
apps never see a version whose binary is not yet available. iOS IPA compilation still requires
macOS/Xcode.

Requirements: Node.js 22+, pnpm 12.3.4, a compatible JDK, and Android SDK 36.

## Install on a connected Android device

```bash
adb install -r android-builds/crave-admin-debug.apk
adb install -r android-builds/crave-driver-debug.apk
adb install -r android-builds/crave-restaurant-debug.apk
adb install -r android-builds/crave-customer-debug.apk
```

Verify downloaded or copied files with:

```bash
cd android-builds
sha256sum --check SHA256SUMS.txt
```

The checksum file must be updated whenever an APK is replaced. Do not publish an APK without its
matching `version.json` hash and URL query parameter.
