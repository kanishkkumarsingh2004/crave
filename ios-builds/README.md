# Crave iOS builds

This folder contains the latest debug IPA files for all three Crave native applications. They
connect to the production backend at `https://crave.apexonestudio.com` by default.

| Application | iOS bundle             | IPA (direct download)                                                                               |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Admin       | `com.crave.admin`      | [crave-admin-debug.ipa](./crave-admin-debug.ipa) [Download](./crave-admin-debug.ipa)                |
| Driver      | `com.crave.driver`     | [crave-driver-debug.ipa](./crave-driver-debug.ipa) [Download](./crave-driver-debug.ipa)             |
| Restaurant  | `com.crave.restaurant` | [crave-restaurant-debug.ipa](./crave-restaurant-debug.ipa) [Download](./crave-restaurant-debug.ipa) |

Click any IPA filename above to download it directly.

These are development builds signed with an Apple development provisioning profile. They are
suitable for direct testing on a registered device but not for App Store distribution.

## Build all three apps (iOS)

From the repository root, run:

```bash
pnpm build:ios
```

This runs `scripts/build-ios.sh`, which builds each Vite shell, synchronizes Capacitor for iOS,
and on macOS runs `xcodebuild` to archive and export each IPA into this folder, refreshing
`SHA256SUMS.txt`. On Linux it only prepares the iOS projects and prints the macOS/Xcode steps.

Requirements: macOS with Xcode and an Apple Developer team for IPA compilation.

## Install on a connected iOS device

Side-load the IPA with a tool such as `ideviceinstaller` or Apple Configurator:

```bash
ideviceinstaller -i ios-builds/crave-admin-debug.ipa
ideviceinstaller -i ios-builds/crave-driver-debug.ipa
ideviceinstaller -i ios-builds/crave-restaurant-debug.ipa
```

Verify downloaded or copied files with:

```bash
cd ios-builds
sha256sum --check SHA256SUMS.txt
```
