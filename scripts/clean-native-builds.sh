#!/usr/bin/env bash

set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

app_directories=(admin_app driver_app restaurant_app customer_app)

echo "==> Removing web build output"
for app_name in "${app_directories[@]}"; do
  rm -rf "${repository_root}/${app_name}/dist"
  rm -rf "${repository_root}/${app_name}/.turbo"
done
rm -rf "${repository_root}/.turbo"

echo "==> Removing native build output and copied web assets"
for app_name in "${app_directories[@]}"; do
  app_directory="${repository_root}/${app_name}"
  rm -rf "${app_directory}/android/app/build"
  rm -rf "${app_directory}/android/build"
  rm -rf "${app_directory}/android/.gradle"
  rm -rf "${app_directory}/android/app/src/main/assets/public"
  rm -rf "${app_directory}/ios/build"
  rm -rf "${app_directory}/ios/App/build"
done

echo "==> Stopping Gradle daemons"
for app_name in "${app_directories[@]}"; do
  android_directory="${repository_root}/${app_name}/android"
  if [[ -x "${android_directory}/gradlew" ]]; then
    (cd "${android_directory}" && ./gradlew --stop >/dev/null 2>&1) || true
  fi
done

echo "==> Removing published APKs and manifests"
rm -f "${repository_root}"/android-builds/*.apk
rm -f "${repository_root}/android-builds/SHA256SUMS.txt"
rm -f "${repository_root}/android-builds/version.json"

echo
echo "Clean. Run 'pnpm build:android' to produce fresh APKs."
