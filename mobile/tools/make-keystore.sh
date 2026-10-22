#!/usr/bin/env bash
# One-time: creates the key that signs every GgnHome APK, and prints what to put where.
#
#   bash mobile/tools/make-keystore.sh
#
# Keep ggnhome-release.keystore and the passwords private (never commit them). Every APK must be
# signed with the same key, otherwise phones refuse to update the app in place and Android cannot
# verify that ggnhome.com links belong to the app.
set -euo pipefail
OUT="${1:-ggnhome-release.keystore}"
ALIAS="ggnhome"
read -r -s -p "Choose a keystore password (min 6 characters): " PASS; echo
keytool -genkeypair -v -keystore "$OUT" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=GgnHome, O=GgnHome, L=Gurugram, C=IN"
echo
echo "1) Add these four GitHub repository secrets (Settings > Secrets and variables > Actions):"
echo "   ANDROID_KEYSTORE_BASE64   = $(base64 -w0 "$OUT" 2>/dev/null | cut -c1-24)...  (run: base64 -w0 $OUT)"
echo "   ANDROID_KEYSTORE_PASSWORD = the password you typed"
echo "   ANDROID_KEY_ALIAS         = $ALIAS"
echo "   ANDROID_KEY_PASSWORD      = the same password"
echo
echo "2) Put this fingerprint in client/public/.well-known/assetlinks.json (sha256_cert_fingerprints):"
keytool -list -v -keystore "$OUT" -alias "$ALIAS" -storepass "$PASS" | grep "SHA256:" | sed 's/.*SHA256: //'
