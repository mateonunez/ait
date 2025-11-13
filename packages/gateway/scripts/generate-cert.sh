#!/bin/bash

# Script to generate self-signed SSL certificates for local HTTPS development
# This is needed for OAuth2 flows that require HTTPS
# Usage: ./generate-cert.sh [--silent]

set -e

SILENT=false
if [[ "$1" == "--silent" ]]; then
  SILENT=true
fi

CERT_DIR="./certs"
KEY_FILE="$CERT_DIR/server.key"
CERT_FILE="$CERT_DIR/server.crt"

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$KEY_FILE" ] && [ -f "$CERT_FILE" ]; then
  [ "$SILENT" = false ] && echo "✅ Certificates already exist at $CERT_DIR"
  exit 0
fi

[ "$SILENT" = false ] && echo "Generating self-signed SSL certificate..."
[ "$SILENT" = false ] && echo "This will create certificates valid for 365 days"

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

if [ "$SILENT" = false ]; then
  echo ""
  echo "✅ Certificates generated successfully!"
  echo ""
  echo "Certificate location:"
  echo "  Key:  $KEY_FILE"
  echo "  Cert: $CERT_FILE"
  echo ""
  echo "⚠️  IMPORTANT: You MUST trust this certificate for OAuth callbacks to work!"
  echo ""
  echo "📋 To trust the certificate on macOS:"
  echo "   npm run cert:trust"
  echo ""
  echo "   Or manually:"
  echo "   1. Open Keychain Access (Applications > Utilities)"
  echo "   2. Drag $CERT_FILE into the 'login' keychain"
  echo "   3. Double-click the certificate"
  echo "   4. Expand 'Trust' section"
  echo "   5. Set 'When using this certificate' to 'Always Trust'"
  echo ""
  echo "📋 For other platforms, see packages/gateway/HTTPS_SETUP.md"
  echo ""
fi

