# HTTPS Setup for Local Development

This guide explains how to set up HTTPS for the Gateway server to support OAuth2 flows that require HTTPS.

## Quick Start

1. **Generate SSL certificates:**
   ```bash
   cd packages/gateway
   npm run cert:generate
   ```

2. **Trust the certificate (required for OAuth callbacks):**
   ```bash
   # macOS (automatic)
   npm run cert:trust
   
   # Or manually follow the instructions in the certificate generation output
   ```

3. **Set environment variables:**
   Create a `.env` file in `packages/gateway/` with:
   ```env
   USE_HTTPS=true
   APP_PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

   The server will automatically detect the certificates and start in HTTPS mode.

   **Important:** After trusting the certificate, restart your browser to ensure OAuth callbacks work without warnings.

## Certificate Generation

The `cert:generate` script creates self-signed SSL certificates in the `certs/` directory:
- `server.key` - Private key
- `server.crt` - Certificate

These certificates are valid for 365 days and include:
- `localhost`
- `*.localhost`
- `127.0.0.1`
- `::1` (IPv6 localhost)

## Trusting the Certificate

**⚠️ IMPORTANT:** You MUST trust the certificate for OAuth callbacks to work! OAuth providers redirect directly to your gateway (e.g., `https://localhost:3000/api/slack/auth/callback`), so the browser needs to trust the gateway's certificate.

### macOS (Automatic - Recommended)
```bash
npm run cert:trust
```

### macOS (Manual)
1. Open Keychain Access (Applications > Utilities)
2. Drag `certs/server.crt` into the "login" keychain
3. Double-click the certificate
4. Expand "Trust" section
5. Set "When using this certificate" to "Always Trust"
6. Close and enter your password when prompted

**Or use the command line:**
```bash
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db certs/server.crt
```

### Linux
```bash
# For Chrome/Chromium
certutil -d sql:$HOME/.pki/nssdb -A -t "P,," -n "localhost" -i certs/server.crt

# For Firefox, import via Preferences > Privacy & Security > Certificates > View Certificates > Import
```

### Windows
1. Double-click `server.crt`
2. Click "Install Certificate"
3. Choose "Current User" or "Local Machine"
4. Select "Place all certificates in the following store"
5. Click "Browse" and select "Trusted Root Certification Authorities"
6. Click "Next" and "Finish"

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_HTTPS` | Enable HTTPS mode (auto-detected if certificates exist) | `false` |
| `APP_PORT` | Server port | `3000` |
| `CORS_ORIGINS` | Comma-separated list of additional CORS origins | - |
| `SESSION_SECRET` | Secret for session encryption | - |
| `NODE_ENV` | Environment (affects cookie security) | `development` |

## Automatic Detection

The server automatically enables HTTPS if:
1. `USE_HTTPS=true` is set, OR
2. Certificates exist in `packages/gateway/certs/`

This means you can generate certificates once and they'll be used automatically.

## Troubleshooting

### Why does the frontend work but the backend doesn't?

The frontend (UIT) runs on Vite's dev server which may handle certificates differently, or you may have already trusted it when first accessing it. However, **OAuth callbacks redirect directly to the gateway** (e.g., `https://localhost:3000/api/slack/auth/callback`), so the browser needs to trust the gateway's certificate separately.

**Solution:** Run `npm run cert:trust` to trust the gateway certificate, then restart your browser.

### Certificate not found
- Ensure certificates are in `packages/gateway/certs/`
- Check file permissions
- Regenerate certificates: `npm run cert:generate`

### Browser security warning on OAuth callbacks
- **This is expected** until you trust the certificate
- Trust the certificate: `npm run cert:trust` (macOS) or follow manual instructions above
- Restart your browser after trusting
- Some browsers may require you to type "thisisunsafe" on the warning page as a temporary workaround

### Port already in use
- Change `APP_PORT` in `.env`
- Or stop the process using port 3000

### Certificate already trusted but still getting warnings
- Restart your browser completely (close all windows)
- Clear browser cache
- Verify certificate is in Keychain Access (macOS) and set to "Always Trust"
- Try accessing `https://localhost:3000` directly first to trigger the trust dialog

## Notes

- Certificates are gitignored and should not be committed
- Self-signed certificates are only for local development
- Production should use proper certificates from a CA (Let's Encrypt, etc.)

