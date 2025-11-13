#!/bin/bash

# Script to generate self-signed SSL certificates for local HTTPS development
# This is needed for OAuth2 flows that require HTTPS

set -e

CERT_DIR="./certs"
KEY_FILE="$CERT_DIR/server.key"
CERT_FILE="$CERT_DIR/server.crt"

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$KEY_FILE" ] && [ -f "$CERT_FILE" ]; then
  echo "Certificates already exist at $CERT_DIR"
  echo "To regenerate, delete the existing certificates first:"
  echo "  rm -rf $CERT_DIR"
  exit 0
fi

echo "Generating self-signed SSL certificate..."
echo "This will create certificates valid for 365 days"

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

