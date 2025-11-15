# UIT

## Overview

UIT is the web interface for AIt, providing a user-friendly way to interact with connectors, view data, and manage integrations.

## Quick Start

```bash
# Install dependencies (from root)
pnpm install

# Start development server
cd packages/uit
pnpm dev
```

The UI will be available at `http://localhost:5173` (or the port shown in terminal).

## Development

### Development Mode

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### API Integration

The UI connects to the [Gateway](../gateway/README.md) API for authentication and data access. Ensure the gateway is running before starting the UI.

## Configuration

The UI reads configuration from environment variables or connects to the gateway API endpoints. See the [Gateway documentation](../gateway/README.md) for API details.

## License

[MIT](../../LICENSE)
