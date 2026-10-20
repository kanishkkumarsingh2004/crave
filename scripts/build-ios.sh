#!/usr/bin/env bash

set -Eeuo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
output_directory="${repository_root}/ios-builds"

# shellcheck source=scripts/app-version.sh
source "${repository_root}/scripts/app-version.sh"

app_directories=(admin_app driver_app restaurant_app customer_app)
ipa_names=(crave-admin-debug.ipa crave-driver-debug.ipa crave-restaurant-debug.ipa crave-customer-debug.ipa)

mkdir -p "${output_directory}"

for index in "${!app_directories[@]}"; do
  app_name="${app_directories[$index]}"
  ipa_name="${ipa_names[$index]}"
  app_directory="${repository_root}/${app_name}"
  ios_directory="${app_directory}/ios"
  published_ipa="${output_directory}/${ipa_name}"

  echo
  echo "==> Building ${app_name}"

  # Keep the iOS build number in step with the Android one.
  if [[ -f "${ios_directory}/App/App.xcodeproj/project.pbxproj" ]]; then
    bump_ios_version "${ios_directory}/App/App.xcodeproj/project.pbxproj"
  fi

  pnpm --dir "${app_directory}" build
  pnpm --dir "${app_directory}" exec cap sync ios

  if [[ ! -d "${ios_directory}" ]]; then
    echo "Expected iOS project directory was not created: ${ios_directory}" >&2
    exit 1
  fi

  if command -v xcodebuild >/dev/null 2>&1; then
    echo "==> Building iOS IPA with xcodebuild"
    export_options_plist="${ios_directory}/ExportOptions.plist"
    if [[ ! -f "${export_options_plist}" ]]; then
      cat > "${export_options_plist}" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string></string>
    <key>provisioningProfiles</key>
    <dict/>
    <key>manageAppVersionAndBuildNumber</key>
    <false/>
</dict>
</plist>
PLIST
    fi

    archive_path="${ios_directory}/build/${app_name}.xcarchive"
    export_path="${ios_directory}/build/Release-iphoneos"

    (
      cd "${ios_directory}"
      xcodebuild -project App.xcodeproj -scheme "App" -configuration Release -destination "generic/platform=iOS" -archivePath "${archive_path}" archive
      xcodebuild -exportArchive -archivePath "${archive_path}" -exportOptionsPlist "${export_options_plist}" -exportPath "${export_path}"
    )

    # The exported IPA is named after the target's PRODUCT_NAME (App). Find it.
    generated_ipa=$(find "${export_path}" -maxdepth 1 -name "*.ipa" | head -n1 || true)
    if [[ -z "${generated_ipa}" ]]; then
      echo "==> No IPA was produced by xcodebuild for ${app_name}" >&2
      exit 1
    fi
  else
    echo "==> xcodebuild not found (macOS/Xcode required). Skipping IPA compilation."
    echo "==> To build the IPA, run this on a Mac with Xcode:"
    echo "==>   cd ${app_directory} && pnpm exec cap open ios"
    echo "==> Then in Xcode: sign with a team, build the iPhone scheme, and export an Ad Hoc / Development IPA."
    generated_ipa=""
  fi

  if [[ -n "${generated_ipa}" && -f "${generated_ipa}" ]]; then
    cp -- "${generated_ipa}" "${published_ipa}"
    echo "==> Saved ${published_ipa}"
  else
    echo "==> IPA not produced for ${app_name}"
  fi
done

(
  cd "${output_directory}"
  sha256sum "${ipa_names[@]}" > SHA256SUMS.txt 2>/dev/null || true
)

echo
echo "All iOS builds completed:"
ls -lh "${output_directory}"/*.ipa 2>/dev/null || echo "(no IPA files produced)"
echo "Checksums: ${output_directory}/SHA256SUMS.txt"
