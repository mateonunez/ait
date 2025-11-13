#!/bin/bash

# Script to generate self-signed SSL certificates for local HTTPS development
# This is needed for OAuth2 flows that require HTTPS
# 
# Note: This script can generate certificates locally, or you can use the shared
# certificates from @ait/gateway by running: cd ../gateway && npm run cert:generate

set -e

CERT_DIR="./certs"
KEY_FILE="$CERT_DIR/server.key"
CERT_FILE="$CERT_DIR/server.crt"

# Check if gateway certificates exist (preferred - shared certificates)
GATEWAY_CERT_DIR="../gateway/certs"
GATEWAY_KEY_FILE="$GATEWAY_CERT_DIR/server.key"
GATEWAY_CERT_FILE="$GATEWAY_CERT_DIR/server.crt"

if [ -f "$GATEWAY_KEY_FILE" ] && [ -f "$GATEWAY_CERT_FILE" ]; then
  echo "✅ Gateway certificates found at $GATEWAY_CERT_DIR"
  echo "UIT will automatically use these certificates."
  echo ""
  echo "If you want to generate local certificates instead, delete the gateway certificates first:"
  echo "  rm -rf $GATEWAY_CERT_DIR"
  exit 0
fi

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist locally
if [ -f "$KEY_FILE" ] && [ -f "$CERT_FILE" ]; then
  echo "Certificates already exist at $CERT_DIR"
  echo "To regenerate, delete the existing certificates first:"
  echo "  rm -rf $CERT_DIR"
  exit 0
fi

echo "Generating self-signed SSL certificate..."
echo "This will create certificates valid for 365 days"
echo ""
echo "💡 Tip: Consider using shared certificates from @ait/gateway instead:"
echo "   cd ../gateway && npm run cert:generate"

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

echo ""
echo "✅ Certificates generated successfully!"
echo ""
echo "Certificate location:"
echo "  Key:  $KEY_FILE"
echo "  Cert: $CERT_FILE"
echo ""
echo "⚠️  Note: You'll need to trust this certificate in your browser:"
echo "   1. Open $CERT_FILE"
echo "   2. Add it to your system's trusted certificates"
echo "   macOS: Keychain Access -> Add -> Trust -> Always Trust"
echo ""

