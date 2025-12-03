# HTTPS Setup for Local Development

This guide explains how to set up HTTPS for local development to support OAuth2 flows that require HTTPS.

## Quick Start (Recommended: ngrok via UIt)

The easiest way to get valid HTTPS for local development is using **ngrok** through the UIt (Vite dev server). It provides a single public URL with valid SSL certificates for both frontend and API.

### How it works

- UIt (Vite) runs on port 5173 and creates an ngrok tunnel
- Vite proxies `/api/*` requests to the Gateway on port 3000
- One ngrok URL serves both frontend and API

### Setup

1. **Get an ngrok authtoken:**
   - Sign up at [ngrok.com](https://ngrok.com)
   - Copy your authtoken from the [dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

2. **Set environment variable:**
   Add to your shell or `.env` file at the monorepo root:
   ```env
   NGROK_AUTH_TOKEN=your_ngrok_authtoken_here
   ```

3. **Start the development servers:**
   ```bash
   pnpm dev
   ```

   Look for the ngrok URL in the UIt logs:
   ```
   🚀 Ngrok tunnel active:
      https://abc123.ngrok-free.app

      Frontend: https://abc123.ngrok-free.app/
      API:      https://abc123.ngrok-free.app/api/*

      Use this URL for OAuth redirect URIs:
      https://abc123.ngrok-free.app/api/spotify/auth/callback
   ```

4. **Update OAuth redirect URIs:**
   Use the ngrok URL for your OAuth redirect URIs in provider settings:
   - Spotify: `https://abc123.ngrok-free.app/api/spotify/auth/callback`
   - GitHub: `https://abc123.ngrok-free.app/api/github/auth/callback`
   - etc.

### ngrok Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NGROK_AUTH_TOKEN` | Your ngrok authentication token | Yes |
| `NGROK_DOMAIN` | Custom domain (paid plans only) | No |

---

## Alternative: Self-Signed Certificates

If you prefer not to use ngrok, you can use self-signed certificates. Note that this requires manually trusting the certificate in your browser/OS.

### Setup

1. **Generate SSL certificates:**
   ```bash
   cd packages/gateway
   pnpm cert:generate
   ```

2. **Trust the certificate (required for OAuth callbacks):**
   ```bash
   # macOS (automatic)
   pnpm cert:trust
   
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
   pnpm dev
   ```

   The gateway will start in HTTPS mode when both `USE_HTTPS=true` AND certificates exist.

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
pnpm cert:trust
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
| `NGROK_AUTH_TOKEN` | ngrok authentication token (enables ngrok tunnel via UIt) | - |
| `NGROK_DOMAIN` | Custom ngrok domain (paid plans only) | - |
| `USE_HTTPS` | Enable HTTPS mode with self-signed certs on gateway | `false` |
| `APP_PORT` | Gateway server port | `3000` |
| `VITE_PORT` | UIt (Vite) server port | `5173` |
| `CORS_ORIGINS` | Comma-separated list of additional CORS origins | - |
| `SESSION_SECRET` | Secret for session encryption | - |
| `NODE_ENV` | Environment (affects cookie security) | `development` |

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │           ngrok tunnel              │
                    │   https://xxx.ngrok-free.app        │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      UIt (Vite Dev Server)          │
                    │         localhost:5173              │
                    │                                     │
                    │   /        → React Frontend         │
                    │   /api/*   → Proxy to Gateway       │
                    └─────────────────┬───────────────────┘
                                      │ proxy
                                      ▼
                    ┌─────────────────────────────────────┐
                    │           Gateway (Fastify)         │
                    │         localhost:3000              │
                    │                                     │
                    │   /api/spotify/*                    │
                    │   /api/github/*                     │
                    │   /api/chat/*                       │
                    │   ...                               │
                    └─────────────────────────────────────┘
```

## Troubleshooting

### ngrok Issues

#### ngrok tunnel not starting
- Verify your `NGROK_AUTH_TOKEN` is correct
- Check if you have an active ngrok session elsewhere (free tier allows one tunnel)
- Ensure you have network connectivity

#### URL changes on every restart
- This is expected with the free tier. Consider upgrading to a paid plan for a static domain, or set `NGROK_DOMAIN` if you have one.

### Self-Signed Certificate Issues

#### Why does the frontend work but the backend doesn't?

The frontend (UIt) runs on Vite's dev server which may handle certificates differently, or you may have already trusted it when first accessing it. However, **OAuth callbacks redirect directly to the gateway** (e.g., `https://localhost:3000/api/slack/auth/callback`), so the browser needs to trust the gateway's certificate separately.

**Solution:** Use ngrok instead (recommended), or run `pnpm cert:trust` to trust the gateway certificate, then restart your browser.

### Certificate not found
- Ensure certificates are in `packages/gateway/certs/`
- Check file permissions
- Regenerate certificates: `pnpm cert:generate`

### Browser security warning on OAuth callbacks
- **This is expected** until you trust the certificate
- Trust the certificate: `pnpm cert:trust` (macOS) or follow manual instructions above
- Restart your browser after trusting
- Some browsers may require you to type "thisisunsafe" on the warning page as a temporary workaround

### Port already in use
- Change `APP_PORT` in `.env` for gateway
- Change `VITE_PORT` in `.env` for UIt
- Or stop the process using that port

### Certificate already trusted but still getting warnings
- Restart your browser completely (close all windows)
- Clear browser cache
- Verify certificate is in Keychain Access (macOS) and set to "Always Trust"
- Try accessing `https://localhost:3000` directly first to trigger the trust dialog

## Notes

- **ngrok via UIt is the recommended approach** - single URL for frontend and API with valid HTTPS
- Self-signed certificates are gitignored and should not be committed
- Self-signed certificates are only for local development when ngrok is not available
- Production should use proper certificates from a CA (Let's Encrypt, etc.)
