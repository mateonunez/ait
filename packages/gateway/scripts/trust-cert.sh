#!/bin/bash

# Script to automatically trust the self-signed certificate on macOS
# This is needed for OAuth callbacks to work without browser warnings

set -e

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/server.crt"

if [ ! -f "$CERT_FILE" ]; then
  echo "❌ Certificate not found at $CERT_FILE"
  echo "Please generate certificates first: npm run cert:generate"
  exit 1
fi

# Detect OS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "⚠️  This script is for macOS only."
  echo ""
  echo "For Linux (Chrome/Chromium), run:"
  echo "  certutil -d sql:\$HOME/.pki/nssdb -A -t \"P,,\" -n \"localhost\" -i $CERT_FILE"
  echo ""
  echo "For Windows, double-click $CERT_FILE and follow the wizard."
  exit 1
fi

echo "🔐 Trusting certificate for macOS..."
echo ""

# Get the absolute path to the certificate
CERT_ABS_PATH=$(cd "$(dirname "$CERT_FILE")" && pwd)/$(basename "$CERT_FILE")

# Add to login keychain and trust it
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db "$CERT_ABS_PATH" 2>/dev/null || {
  echo "⚠️  Certificate might already be trusted, or you may need to:"
  echo "   1. Open Keychain Access"
  echo "   2. Drag $CERT_FILE into the 'login' keychain"
  echo "   3. Double-click the certificate"
  echo "   4. Expand 'Trust' section"
  echo "   5. Set 'When using this certificate' to 'Always Trust'"
  exit 1
}

echo "✅ Certificate trusted successfully!"
echo ""
echo "💡 You may need to restart your browser for the changes to take effect."
echo "   Try accessing: https://localhost:3000"

