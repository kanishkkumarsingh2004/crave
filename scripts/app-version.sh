#!/usr/bin/env bash

# Shared helpers for keeping the native build numbers in sync with the
# published APKs / IPAs.
#
# The in-app update check only offers a new build when the published build
# number is strictly greater than the one installed on the device
# (`Number(update.versionCode) <= current` → "no update"). Rebuilding an app
# without raising that number therefore leaves every installed app on the
# previously published binary, even though a newer APK was pushed — which looks
# exactly like "the APK still contains the old UI".
#
# The build number is bumped automatically on every build. The marketing
# version (`versionName` / `MARKETING_VERSION`) stays hand-written, so a release
# can be labelled "1.0.0" while its build number keeps counting up.

# Bumps `versionCode` in an Android app's build.gradle.
bump_android_version() {
  local gradle_file="$1"
  local current next

  current="$(sed -n -E 's/^[[:space:]]*versionCode[[:space:]]+([0-9]+).*$/\1/p' "${gradle_file}" | head -1)"
  if [[ -z "${current}" ]]; then
    echo "Could not read versionCode from ${gradle_file}" >&2
    return 1
  fi
  next=$((current + 1))

  awk -v code="${next}" '
    /^[[:space:]]*versionCode[[:space:]]+/ { sub(/[0-9]+/, code) }
    { print }
  ' "${gradle_file}" > "${gradle_file}.tmp"

  mv "${gradle_file}.tmp" "${gradle_file}"
  echo "    android build ${current} -> ${next}"
}

# Bumps CURRENT_PROJECT_VERSION in an iOS app's project.
bump_ios_version() {
  local project_file="$1"
  local current next

  current="$(sed -n -E 's/^[[:space:]]*CURRENT_PROJECT_VERSION = ([0-9]+);?.*$/\1/p' "${project_file}" | head -1)"
  if [[ -z "${current}" ]]; then
    echo "Could not read CURRENT_PROJECT_VERSION from ${project_file}" >&2
    return 1
  fi
  next=$((current + 1))

  awk -v code="${next}" '
    /^[[:space:]]*CURRENT_PROJECT_VERSION = / { sub(/[0-9]+/, code) }
    { print }
  ' "${project_file}" > "${project_file}.tmp"

  mv "${project_file}.tmp" "${project_file}"
  echo "    ios build ${current} -> ${next}"
}
