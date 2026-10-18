# Crave Android builds

This folder contains the latest debug APKs for all three Crave native applications. They connect
to the production backend at `https://crave.apexonestudio.com` by default.

The Restaurant app checks `version.json` at launch, whenever it returns to the foreground, and
once every minute while it is open. If `apps.restaurant.versionCode` is newer than the installed
build, it offers an in-app download. The APK is restricted to this repository's raw GitHub URL and
its SHA-256 must match the manifest before Android's installer is opened.

| Application | Android package        | APK (direct download)                                                                   |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Admin       | `com.crave.admin`      | <a href="./crave-admin-debug.apk?raw=true" download>crave-admin-debug.apk</a>           |
| Driver      | `com.crave.driver`     | <a href="./crave-driver-debug.apk?raw=true" download>crave-driver-debug.apk</a>         |
| Restaurant  | `com.crave.restaurant` | <a href="./crave-restaurant-debug.apk?raw=true" download>crave-restaurant-debug.apk</a> |

Click any APK filename above to download it directly.

These are development builds signed with the Android debug key. They are suitable for direct
testing but not for Google Play production distribution.

## iOS builds

All three apps now have iOS projects generated via Capacitor (`admin_app/ios`, `driver_app/ios`,
`restaurant_app/ios`). Compiling a native iOS app requires macOS and a compatible Xcode version.
Once built on a Mac, the resulting `.ipa` files can be distributed for TestFlight or Ad Hoc
testing. From Kali Linux you can only prepare the iOS project; the actual build must happen on a
cloud Mac or local macOS machine with Xcode. The iOS builder mirrors the Android builder and
outputs to a separate `ios-builds/` folder:

```bash
pnpm build:ios          # prepares all three iOS projects; builds IPAs on macOS
pnpm exec cap open ios  # from each app directory on macOS with Xcode
# In Xcode: select a team, build the iPhone scheme, then export as Ad Hoc / Development IPA
```

## Build all apps

From the repository root, run:

```bash
pnpm build:android
```

This runs `scripts/build-apps.sh`, which builds each Vite shell, synchronizes Capacitor for both
Android and iOS, runs Gradle `assembleDebug`, copies the three APKs into this folder, and refreshes
`SHA256SUMS.txt` and `version.json`. Commit and push the APK and manifest together so installed
apps never see a version whose binary is not yet available. iOS IPA compilation still requires
macOS/Xcode.

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
