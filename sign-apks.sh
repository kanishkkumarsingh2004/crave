#!/usr/bin/env bash
# ==============================================================================
# crave. APK Signing Script
# Signs all four Android apps (admin, customer, driver, restaurant) with the
# shared crave-release.keystore using a deterministic SHA256withRSA signature.
#
# Usage:
#   ./sign-apks.sh
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

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Keep one fail-closed release path so signing, asset synchronization, artifact
# naming, checksum generation, and certificate verification cannot drift apart.
exec bash "${SCRIPT_DIR}/scripts/build-apps-release.sh" "$@"
