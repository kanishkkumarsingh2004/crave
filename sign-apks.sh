#!/usr/bin/env bash
# ==============================================================================
# crave. APK Signing Script
# Signs all four Android apps (admin, customer, driver, restaurant) with the
# shared crave-release.keystore using a deterministic SHA256withRSA signature.
#
# Usage:
#   ./sign-apks.sh [--clean]
#
# Environment overrides:
#   CRAVE_KEYSTORE       Path to keystore (default: ./crave-release.keystore)
#   CRAVE_KEYSTORE_PASS  Keystore password (required)
#   CRAVE_KEY_ALIAS      Key alias (required)
#   CRAVE_KEY_PASS       Key password (required)
#
# The keystore and its password are read from environment variables at build
# time — they are never hardcoded in build.gradle or committed to the repo.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export CRAVE_KEYSTORE="${CRAVE_KEYSTORE:-$SCRIPT_DIR/crave-release.keystore}"

if [[ -z "${CRAVE_KEYSTORE_PASS:-}" ]]; then
  echo -e "${RED}[ERROR] CRAVE_KEYSTORE_PASS must be set${NC}" >&2
  exit 1
fi
if [[ -z "${CRAVE_KEY_ALIAS:-}" ]]; then
  echo -e "${RED}[ERROR] CRAVE_KEY_ALIAS must be set${NC}" >&2
  exit 1
fi
if [[ -z "${CRAVE_KEY_PASS:-}" ]]; then
  echo -e "${RED}[ERROR] CRAVE_KEY_PASS must be set${NC}" >&2
  exit 1
fi

# Text formatters
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APPS=(admin customer driver restaurant)

echo -e "${CYAN}Signing Crave Android APKs${NC}"
echo "Keystore: $CRAVE_KEYSTORE"
echo ""

# 1. Verify keystore exists
if [ ! -f "$CRAVE_KEYSTORE" ]; then
  echo -e "${RED}[ERROR] Keystore not found: $CRAVE_KEYSTORE${NC}"
  echo "Create it with:"
  echo "  keytool -genkey -v -keystore crave-release.keystore -alias crave-release \\"
  echo "    -keyalg RSA -keysize 2048 -validity 10000 \\"
  echo "    -dname 'CN=Crave Food Delivery, OU=Crave Engineering, O=Crave, L=Bengaluru, ST=Karnataka, C=IN' \\"
  echo "    -storepass \"$CRAVE_KEYSTORE_PASS\" -keypass \"$CRAVE_KEY_PASS\" -deststoretype pkcs12"
  exit 1
fi

# 2. Verify keystore is valid
if ! keytool -list -keystore "$CRAVE_KEYSTORE" -alias "$CRAVE_KEY_ALIAS" -storepass "$CRAVE_KEYSTORE_PASS" >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Cannot read keystore alias '$CRAVE_KEY_ALIAS' from $CRAVE_KEYSTORE${NC}"
  exit 1
fi

# 3. Sign each app
for app in "${APPS[@]}"; do
  app_dir="${app}_app/android"
  if [ ! -d "$app_dir" ]; then
    echo -e "${YELLOW}[SKIP] $app: directory not found${NC}"
    continue
  fi

  echo -e "${CYAN}[SIGN] $app${NC}"

  # Build the release APK with signing. Capture exit code before tail masks it.
  build_log="$(cd "$app_dir" && ./gradlew assembleRelease --no-daemon 2>&1)"
  build_rc=$?
  echo "$build_log" | tail -5

  if [ $build_rc -ne 0 ]; then
    echo -e "${RED}[FAIL] $app: build failed${NC}"
    exit 1
  fi

  # Copy signed APK to android-builds
  signed_apk="${app_dir}/app/build/outputs/apk/release/app-release.apk"
  if [ -f "$signed_apk" ]; then
    dest="android-builds/crave-${app}-release.apk"
    cp "$signed_apk" "$dest"
    echo -e "${GREEN}[OK] $app → $dest${NC}"
  else
    echo -e "${RED}[FAIL] $app: signed APK not found at $signed_apk${NC}"
    exit 1
  fi
done

echo ""
echo -e "${GREEN}All APKs signed successfully${NC}"