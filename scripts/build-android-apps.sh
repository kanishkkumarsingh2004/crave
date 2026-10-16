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
  generated_apk="${android_directory}/app/build/outputs/apk/debug/app-debug.apk"
  published_apk="${output_directory}/${apk_name}"

  echo
  echo "==> Building ${app_name}"
  pnpm --dir "${app_directory}" build
  pnpm --dir "${app_directory}" exec cap sync android

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
done

(
  cd "${output_directory}"
  sha256sum "${apk_names[@]}" > SHA256SUMS.txt
)

echo
echo "All Android apps built successfully:"
ls -lh "${output_directory}"/*.apk
echo "Checksums: ${output_directory}/SHA256SUMS.txt"
