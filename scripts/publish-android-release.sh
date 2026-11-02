#!/usr/bin/env bash

set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
release_tag="${ANDROID_RELEASE_TAG:?ANDROID_RELEASE_TAG is required}"
github_repository="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (owner/repository)}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required to publish Android releases" >&2
  exit 1
fi
gh auth status >/dev/null

export ANDROID_RELEASE_BASE_URL="https://github.com/${github_repository}/releases/download/${release_tag}"
bash "${repository_root}/scripts/build-apps-release.sh"

artifacts=(
  "${repository_root}/android-builds/crave-admin-release.apk"
  "${repository_root}/android-builds/crave-driver-release.apk"
  "${repository_root}/android-builds/crave-restaurant-release.apk"
  "${repository_root}/android-builds/crave-customer-release.apk"
  "${repository_root}/android-builds/SHA256SUMS.txt"
  "${repository_root}/android-builds/version.json"
)

if ! gh release view "${release_tag}" --repo "${github_repository}" >/dev/null 2>&1; then
  gh release create "${release_tag}" --repo "${github_repository}" \
    --title "Crave Android ${release_tag}" \
    --notes "Signed Crave Android applications with checksums and update manifest."
fi
gh release upload "${release_tag}" "${artifacts[@]}" \
  --repo "${github_repository}" --clobber

verification_directory="$(mktemp -d)"
trap 'rm -rf -- "${verification_directory}"' EXIT
for artifact in "${artifacts[@]:0:4}"; do
  filename="$(basename -- "${artifact}")"
  curl -fsSL --retry 3 "${ANDROID_RELEASE_BASE_URL}/${filename}" \
    --output "${verification_directory}/${filename}"
done
cp -- "${repository_root}/android-builds/SHA256SUMS.txt" "${verification_directory}/SHA256SUMS.txt"
(cd "${verification_directory}" && sha256sum --check SHA256SUMS.txt)

echo "Published and verified Android release ${release_tag}"
