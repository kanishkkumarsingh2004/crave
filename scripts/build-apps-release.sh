#!/usr/bin/env bash

set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
output_directory="${repository_root}/android-builds"

# shellcheck source=scripts/app-version.sh
source "${repository_root}/scripts/app-version.sh"

app_directories=(admin_app driver_app restaurant_app customer_app)
apk_names=(crave-admin-release.apk crave-driver-release.apk crave-restaurant-release.apk crave-customer-release.apk)

keystore="${CRAVE_KEYSTORE:-${repository_root}/crave-release.keystore}"
if [[ ! -f "${keystore}" ]]; then
  echo "Release keystore not found: ${keystore}" >&2
  echo "The release workflow requires a signing keystore at the repository root." >&2
  exit 1
fi

for required_variable in CRAVE_KEYSTORE_PASS CRAVE_KEY_ALIAS CRAVE_KEY_PASS; do
  if [[ -z "${!required_variable:-}" ]]; then
    echo "Required signing variable is missing: ${required_variable}" >&2
    exit 1
  fi
done
if ! command -v apksigner >/dev/null 2>&1; then
  echo "apksigner is required to verify release artifacts" >&2
  exit 1
fi
export CRAVE_KEYSTORE="${keystore}"

mkdir -p "${output_directory}"
release_signer_digest=""

for index in "${!app_directories[@]}"; do
  app_name="${app_directories[$index]}"
  apk_name="${apk_names[$index]}"
  app_directory="${repository_root}/${app_name}"
  android_directory="${app_directory}/android"
  generated_apk="${android_directory}/app/build/outputs/apk/release/app-release.apk"
  published_apk="${output_directory}/${apk_name}"

  echo
  echo "==> Building release ${app_name}"

  # Bump versionCode so the in-app updater offers this release to installed devices.
  if [[ "${KEEP_VERSION:-0}" != "1" ]]; then
    bump_android_version "${android_directory}/app/build.gradle"
  fi

  pnpm --dir "${app_directory}" build
  pnpm --dir "${app_directory}" exec cap sync android

  # Assemble the release variant. build.gradle's release signingConfig signs the APK
  # using crave-release.keystore (or $CRAVE_KEYSTORE). Signing secrets must be supplied
  # via CRAVE_KEYSTORE_PASS / CRAVE_KEY_ALIAS / CRAVE_KEY_PASS; the build fails if any
  # is missing — there are no fallback passwords.
  (
    cd "${android_directory}"
    ./gradlew --stop
    ./gradlew assembleRelease
  )

  if [[ ! -f "${generated_apk}" ]]; then
    echo "Expected release APK was not created: ${generated_apk}" >&2
    exit 1
  fi

  echo "==> Verifying release signature: ${apk_name}"
  if ! verification_output="$(apksigner verify --verbose --print-certs "${generated_apk}")"; then
    echo "${verification_output}" >&2
    exit 1
  fi
  echo "${verification_output}"

  signer_dn="$(sed -n 's/^Signer #1 certificate DN: //p' <<<"${verification_output}" | head -1)"
  signer_digest="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' <<<"${verification_output}" | head -1)"
  if [[ -z "${signer_dn}" || -z "${signer_digest}" ]]; then
    echo "Could not read the signing certificate from ${apk_name}" >&2
    exit 1
  fi
  if [[ "${signer_dn}" == *"CN=Android Debug"* ]]; then
    echo "Refusing to publish ${apk_name}: it is signed with the Android debug certificate" >&2
    exit 1
  fi
  if [[ -z "${release_signer_digest}" ]]; then
    release_signer_digest="${signer_digest}"
  elif [[ "${signer_digest}" != "${release_signer_digest}" ]]; then
    echo "Release APKs were not signed by the same certificate" >&2
    exit 1
  fi

  cp -- "${generated_apk}" "${published_apk}"
  echo "==> Saved ${published_apk}"
done

(
  cd "${output_directory}"
  sha256sum "${apk_names[@]}" > SHA256SUMS.txt
)
node "${repository_root}/scripts/update-app-version-manifest.mjs" --flavor release

echo
echo "All release apps built successfully:"
ls -lh "${output_directory}"/*-release.apk
echo "Checksums: ${output_directory}/SHA256SUMS.txt"
echo "Release manifest: ${output_directory}/version.json"
echo "Release signer SHA-256: ${release_signer_digest}"
