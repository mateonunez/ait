# PostgreSQL Client

## Overview

PostgreSQL client package for AIt, handling database migrations, type generation, and database operations. Stores structured data including OAuth tokens, connector data, and application state.

## Quick Start

PostgreSQL is automatically started with other services:

```bash
pnpm start:services  # From root directory
```

## Configuration

Set the database connection URL:

```bash
POSTGRES_URL=postgresql://root:toor@localhost:5432/ait
```

## Usage

### Generate Database Types

Generate TypeScript types from your database schema:

```bash
pnpm db:generate
```

### Run Migrations

Apply database migrations:

```bash
pnpm db:migrate
```

### Database Studio

Open Prisma Studio for visual database management:

```bash
pnpm db:studio
```

### Fix Collation Version Mismatch

If you encounter collation version mismatch warnings:

```bash
pnpm db:fix-collation
```

## Development

The database client is used throughout AIt for:
- OAuth token storage
- Connector data persistence
- Application state management

## License

[MIT](../../LICENSE)
