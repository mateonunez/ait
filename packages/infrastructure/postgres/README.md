# Postgres client

## Overview

### Generate the database schema

```bash
pnpm db:generate
```

### Run the database migrations

```bash
pnpm db:migrate
```

### Fix collation version mismatch

If you encounter collation version mismatch warnings, run:

```bash
pnpm db:fix-collation
```

### Studio

```bash
pnpm db:studio
```

### License

[MIT](../../LICENSE)
