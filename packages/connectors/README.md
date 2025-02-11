# Connectors README

## Overview

The **Connectors** module provides a reusable framework for integrating platforms into AIt with modular design, shared utilities, and OAuth 2.0 support.

## Setup

### Install Dependencies

```bash
corepack enable
pnpm install
```

### Generate OpenAPI Types

This will generate the OpenAPI types for the connectors.

```bash
pnpm generate:openapi
```

> [!NOTE]
> The generated types are not committed to the repository to avoid bloating the codebase.

### License

[MIT](../../LICENSE)
