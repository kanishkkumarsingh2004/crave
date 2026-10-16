#!/usr/bin/env bash

set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
output_directory="${repository_root}/android-builds"

app_directories=(admin_app driver_app restaurant_app)
apk_names=(crave-admin-debug.apk crave-driver-debug.apk crave-restaurant-debug.apk)

mkdir -p "${output_directory}"

for index in "${!app_directories[@]}"; do
  app_name="${app_directories[$index]}"
  apk_name="${apk_names[$index]}"
  app_directory="${repository_root}/${app_name}"
  android_directory="${app_directory}/android"
  ios_directory="${app_directory}/ios"
  generated_apk="${android_directory}/app/build/outputs/apk/debug/app-debug.apk"
  published_apk="${output_directory}/${apk_name}"

  echo
  echo "==> Building ${app_name}"
  pnpm --dir "${app_directory}" build

  # Prepare native projects. cap sync android also runs Gradle via the CLI; we run
  # assembleDebug explicitly below for full control over APK output location.
  pnpm --dir "${app_directory}" exec cap sync android
  pnpm --dir "${app_directory}" exec cap sync ios

  (
    cd "${android_directory}"
    ./gradlew --stop
    ./gradlew assembleDebug
  )

  if [[ ! -f "${generated_apk}" ]]; then
    echo "Expected APK was not created: ${generated_apk}" >&2
    exit 1
  fi

  cp -- "${generated_apk}" "${published_apk}"
  echo "==> Saved ${published_apk}"
  echo "==> iOS project prepared at ${ios_directory}"
done

# iOS IPA compilation requires macOS/Xcode and cannot run on Linux. To produce the
# .ipa files, transfer each app's ios directory to a Mac and run:
#   cd <app_directory>
#   pnpm exec cap open ios
# then in Xcode: sign with a team, build the iPhone scheme, and export an
# Ad Hoc / Development IPA for distribution.

(
  cd "${output_directory}"
  sha256sum "${apk_names[@]}" > SHA256SUMS.txt
)

echo
echo "All apps built successfully:"
ls -lh "${output_directory}"/*.apk
echo "Checksums: ${output_directory}/SHA256SUMS.txt"